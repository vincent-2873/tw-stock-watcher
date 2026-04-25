"""
Quack 智慧升級路由 — Phase 2(19_V2_UPGRADE_BRIEF.md)

端點:
  GET  /api/quack/reasoning       取得今日三層推論(快取 24h)
  POST /api/quack/reasoning       強制重算(需 Admin Token)
  GET  /api/quack/predictions     最近 30 天呱呱預測與命中率
  POST /api/quack/predictions     記錄新預測(需 Admin Token)
  GET  /api/quack/social/hot      社群熱度排行(過去 6 小時)
  GET  /api/quack/alerts          自動警示(unread / all)
  GET  /api/quack/headline        呱呱觀點(hero 副標,24h cache,008a)
  GET  /api/quack/weekly_picks    呱呱挑 10 檔(24h cache,008a)
  POST /api/quack/homework/refresh 手動觸發 topics 重評(Bug #1,需 admin)

全部都對資料庫 graceful degrade — 表不存在時 200 但 data=[],
不打斷前端。前提是 migration 0003_quack_phase2.sql 執行過。
"""
from __future__ import annotations

import json
import os
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

import anthropic
from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)
router = APIRouter()

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")


# =========================================================================
# 三層推論 system prompt(來自 19_V2_UPGRADE_BRIEF.md B1)
# =========================================================================
REASONING_SYSTEM = """你是「呱呱」,一隻不給明牌、只教思考的台股分析師。

今天池塘(市場)給你一批資料,請依照以下三層推論格式回覆。**輸出必須是 JSON**(不要有 markdown 代碼塊包裹),符合下面 schema:

{
  "fact_layer":    "≤ 3 句事實陳述,只陳述不解釋",
  "causal_layer":  "因果連鎖:引用具體事件(誰說了什麼、哪個報告、哪個數據),格式『因為 A → 所以 B → 影響 C』,≤ 100 字",
  "meaning_layer": "對 Vincent 的操作意味:等/買/避開/減碼,給具體『為什麼』不只『做什麼』,≤ 100 字",
  "counter_view":  "反方觀點:『如果我錯了,會是哪裡錯?』,≤ 80 字"
}

## 風格鐵律
- 用「池塘、水位、甩轎、洗浮額、跳進池塘」等意象
- 不要預言股價漲跌百分比
- 每層各自獨立,不要重複
- 永遠有反方觀點(必填)
- 質疑 FOMO、梭哈、攤平衝動

## 禁止
- markdown 代碼塊(直接輸出 JSON)
- 「投資有風險」這類免責八股
- 單邊鼓吹,永遠平衡"""


class _ReasoningInput(BaseModel):
    """傳給 Claude 的當下市場快照"""

    date: str
    taiex: Optional[dict] = None          # {"value": 37612, "change_pct": -0.70}
    topics_top5: Optional[list[dict]] = None
    us_events: Optional[list[dict]] = None
    institutional: Optional[dict] = None  # 三大法人
    news_top5: Optional[list[dict]] = None


def _is_missing_table(e: Exception) -> bool:
    """偵測表不存在的多種錯誤訊息(psycopg2 / PostgREST / supabase-py)"""
    msg = str(e).lower()
    return (
        "does not exist" in msg
        or "could not find the table" in msg
        or "pgrst205" in msg
        or "relation" in msg and "does not exist" in msg
    )


def _require_admin(token: Optional[str]) -> None:
    if not ADMIN_TOKEN:
        raise HTTPException(503, "ADMIN_TOKEN not configured")
    if not token or token != ADMIN_TOKEN:
        raise HTTPException(401, "bad admin token")


def _safe_select(table: str, *, columns: str = "*", order: tuple[str, bool] | None = None,
                 limit: int = 50, eq: dict | None = None) -> list[dict]:
    """Wrapper:表不存在回空陣列,其他錯誤 raise。"""
    sb = get_service_client()
    try:
        q = sb.table(table).select(columns)
        if eq:
            for k, v in eq.items():
                q = q.eq(k, v)
        if order:
            q = q.order(order[0], desc=order[1])
        q = q.limit(limit)
        resp = q.execute()
        return resp.data or []
    except Exception as e:
        if _is_missing_table(e):
            log.warning("quack route: table %s not exist — returning []", table)
            return []
        log.exception("quack _safe_select %s: %s", table, e)
        raise HTTPException(500, f"db error: {e}")


# =========================================================================
# GET /api/quack/reasoning — 今日三層推論
# =========================================================================
@router.get("/quack/reasoning")
async def get_reasoning(
    force: bool = Query(False, description="忽略快取重算(需 Admin Token)"),
    x_admin_token: Optional[str] = Header(default=None),
):
    today = now_tpe().date().isoformat()

    # 1. 嘗試讀快取
    if not force:
        rows = _safe_select("quack_reasoning", eq={"date": today}, limit=1)
        if rows:
            return {
                "date": today,
                "cached": True,
                **rows[0],
            }

    # 2. 強制重算需 admin
    if force:
        _require_admin(x_admin_token)

    # 3. 沒快取 → 組輸入 snapshot 呼叫 Claude
    snapshot = await _build_reasoning_snapshot()
    result = await _claude_reasoning(snapshot)

    # 4. 寫回 quack_reasoning(upsert by date)
    sb = get_service_client()
    try:
        sb.table("quack_reasoning").upsert(
            {
                "date": today,
                **result,
                "input_snapshot": snapshot,
                "model": MODEL,
            },
            on_conflict="date",
        ).execute()
    except Exception as e:
        log.warning("write quack_reasoning failed (table missing?): %s", e)
        # 即使寫入失敗,仍回 live 結果

    return {"date": today, "cached": False, **result}


async def _build_reasoning_snapshot() -> dict:
    """組 market overview + topics + institutional 當作 reasoning 輸入。"""
    sb = get_service_client()
    snapshot: dict[str, Any] = {"date": now_tpe().date().isoformat()}

    # topics top 5
    try:
        r = sb.table("topics").select("slug,name,heat,trend").order(
            "heat", desc=True
        ).limit(5).execute()
        snapshot["topics_top5"] = r.data or []
    except Exception:
        snapshot["topics_top5"] = []

    # 最近 5 則 AI 分析過的 intel
    try:
        r = (
            sb.table("intel_articles")
            .select("title,ai_summary,ai_sentiment,ai_importance,published_at")
            .not_.is_("ai_analyzed_at", "null")
            .order("ai_importance", desc=True)
            .order("published_at", desc=True)
            .limit(5)
            .execute()
        )
        snapshot["news_top5"] = r.data or []
    except Exception:
        snapshot["news_top5"] = []

    return snapshot


async def _claude_reasoning(snapshot: dict) -> dict:
    """呼叫 Claude 做三層推論,回 {fact_layer, causal_layer, meaning_layer, counter_view}。"""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(503, "ANTHROPIC_API_KEY not configured")

    client = anthropic.Anthropic(api_key=api_key)
    prompt = (
        "今日市場快照:\n"
        + json.dumps(snapshot, ensure_ascii=False, indent=2)
        + "\n\n請依 system prompt 的三層 + 反方觀點 JSON 格式回覆。"
    )
    msg = client.messages.create(
        model=MODEL,
        max_tokens=1500,
        system=REASONING_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text if msg.content else ""
    # 拆 JSON(Claude 有時會包 ```json ... ```)
    raw_strip = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    try:
        data = json.loads(raw_strip)
    except Exception as e:
        log.error("claude reasoning JSON parse failed: %s\nraw=%r", e, raw)
        # degrade:把整段丟給 fact_layer
        return {
            "fact_layer": raw[:200],
            "causal_layer": "(Claude 回覆解析失敗)",
            "meaning_layer": "(Claude 回覆解析失敗)",
            "counter_view": None,
        }
    # 只取需要欄位,避免把 markdown 雜訊寫進 DB
    return {
        "fact_layer": str(data.get("fact_layer", ""))[:800],
        "causal_layer": str(data.get("causal_layer", ""))[:800],
        "meaning_layer": str(data.get("meaning_layer", ""))[:800],
        "counter_view": str(data.get("counter_view", ""))[:600] or None,
    }


# =========================================================================
# GET /api/quack/predictions — 近 30 天預測與命中率
# =========================================================================
@router.get("/quack/predictions")
async def list_predictions(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(2000, ge=50, le=5000),
):
    since = (now_tpe().date() - timedelta(days=days)).isoformat()
    sb = get_service_client()
    try:
        r = (
            sb.table("quack_predictions")
            .select("*")
            .gte("date", since)
            .order("date", desc=True)
            .limit(limit)
            .execute()
        )
        rows = r.data or []
    except Exception as e:
        if _is_missing_table(e):
            return {"count": 0, "hit_rate": None, "predictions": [], "note": "migration 0003 未執行"}
        raise HTTPException(500, f"db error: {e}")

    evaluated = [p for p in rows if p.get("hit_or_miss")]
    hits = sum(1 for p in evaluated if p["hit_or_miss"] == "hit")
    hit_rate = round(hits / len(evaluated) * 100) if evaluated else None

    return {
        "count": len(rows),
        "evaluated_count": len(evaluated),
        "hit_rate": hit_rate,
        "predictions": rows,
    }


class _PredictionReq(BaseModel):
    date: str
    prediction_type: str
    subject: str
    prediction: str
    confidence: int = 50
    timeframe: str = "1w"  # 1d / 1w / 1m
    evidence: dict | None = None


@router.post("/quack/predictions")
async def create_prediction(
    req: _PredictionReq,
    x_admin_token: Optional[str] = Header(default=None),
):
    _require_admin(x_admin_token)

    tf_days = {"1d": 1, "1w": 7, "1m": 30}.get(req.timeframe, 7)
    eval_after = (date.fromisoformat(req.date) + timedelta(days=tf_days)).isoformat()

    sb = get_service_client()
    try:
        r = (
            sb.table("quack_predictions")
            .insert(
                {
                    "date": req.date,
                    "prediction_type": req.prediction_type,
                    "subject": req.subject,
                    "prediction": req.prediction,
                    "confidence": req.confidence,
                    "timeframe": req.timeframe,
                    "evaluate_after": eval_after,
                    "evidence": req.evidence,
                }
            )
            .execute()
        )
        return {"ok": True, "data": r.data}
    except Exception as e:
        raise HTTPException(400, f"insert failed: {e}")


# =========================================================================
# GET /api/quack/social/hot — 社群熱度排行(過去 6 小時)
# =========================================================================
@router.get("/quack/social/hot")
async def social_hot(hours: int = Query(6, ge=1, le=72)):
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    sb = get_service_client()
    try:
        r = (
            sb.table("social_mentions")
            .select("stock_code,topic_slug,source,sentiment,sentiment_score,push_count,boo_count")
            .gte("captured_at", since)
            .limit(500)
            .execute()
        )
        rows = r.data or []
    except Exception as e:
        if _is_missing_table(e):
            return {"stocks": [], "topics": [], "note": "migration 0003 未執行"}
        raise HTTPException(500, f"db error: {e}")

    # Python 端彙總熱度:提及數 + 推文*2 - 噓文*1.5
    agg: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = row.get("stock_code") or row.get("topic_slug")
        if not key:
            continue
        cur = agg.setdefault(
            key,
            {
                "code_or_topic": key,
                "is_stock": bool(row.get("stock_code")),
                "mentions": 0,
                "push_total": 0,
                "boo_total": 0,
                "score": 0.0,
                "sources": set(),
                "bullish": 0,
                "bearish": 0,
            },
        )
        cur["mentions"] += 1
        cur["push_total"] += row.get("push_count") or 0
        cur["boo_total"] += row.get("boo_count") or 0
        cur["sources"].add(row.get("source"))
        s = row.get("sentiment")
        if s == "bullish":
            cur["bullish"] += 1
        elif s == "bearish":
            cur["bearish"] += 1
    for cur in agg.values():
        cur["score"] = cur["mentions"] + cur["push_total"] * 2 - cur["boo_total"] * 1.5
        cur["sources"] = sorted(cur["sources"])

    items = sorted(agg.values(), key=lambda x: x["score"], reverse=True)[:20]
    return {
        "hours": hours,
        "count": len(items),
        "stocks": [i for i in items if i["is_stock"]][:10],
        "topics": [i for i in items if not i["is_stock"]][:10],
    }


# =========================================================================
# POST /api/quack/social/refresh — 觸發 PTT 爬蟲(需 admin)
# =========================================================================
@router.post("/quack/social/refresh")
async def social_refresh(
    pages: int = Query(3, ge=1, le=10),
    x_admin_token: Optional[str] = Header(default=None),
):
    _require_admin(x_admin_token)
    # 延遲 import,避免啟動 cost(beautifulsoup/httpx 都已在 requirements)
    from backend.services import ptt_scraper

    return ptt_scraper.run(pages=pages)


# =========================================================================
# POST /api/quack/auto_search/run — 手動觸發 auto_search
# =========================================================================
@router.post("/quack/auto_search/run")
async def auto_search_run(x_admin_token: Optional[str] = Header(default=None)):
    _require_admin(x_admin_token)
    from backend.services import auto_search

    return auto_search.run()


# =========================================================================
# GET /api/quack/headline — 呱呱觀點(hero 副標)
# =========================================================================
@router.get("/quack/headline")
async def get_quack_headline(
    force: bool = Query(False, description="忽略快取重算(需 Admin Token)"),
    x_admin_token: Optional[str] = Header(default=None),
):
    """產出 hero 副標的「呱呱觀點」(NEXT_TASK_008a 階段 2 縮水版)。

    24h cache via quack_judgments(judgment_type='headline')。
    沒快取時自動呼 Claude 產生並寫入。
    """
    from backend.services import quack_brain

    today = now_tpe().date()

    # 1. 嘗試讀快取
    if not force:
        cached = quack_brain.get_cached_judgment("headline", today)
        if cached and cached.get("content_json"):
            return {
                "date": today.isoformat(),
                "cached": True,
                **cached["content_json"],
                "generated_at": cached.get("created_at"),
                "model": cached.get("model"),
            }

    if force:
        _require_admin(x_admin_token)

    # 2. 沒快取 → 呼叫 Claude
    try:
        result = quack_brain.quack_judge_headline(today)
    except Exception as e:
        log.exception("quack_judge_headline failed: %s", e)
        raise HTTPException(500, f"headline generation failed: {e}")

    # 3. 寫入 quack_judgments(寫不進不影響回傳)
    quack_brain.save_judgment("headline", today, result)

    return {
        "date": today.isoformat(),
        "cached": False,
        "water_status": result["water_status"],
        "quack_view": result["quack_view"],
        "reason": result["reason"],
        "watch_for": result["watch_for"],
        "generated_at": result["generated_at"],
        "model": result["model"],
    }


# =========================================================================
# GET /api/quack/weekly_picks — 呱呱本週挑的 10 檔
# =========================================================================
@router.get("/quack/weekly_picks")
async def get_quack_weekly_picks(
    force: bool = Query(False, description="忽略快取重算(需 Admin Token)"),
    x_admin_token: Optional[str] = Header(default=None),
):
    """呱呱挑的 10 檔精準推薦(NEXT_TASK_008a 階段 2 縮水版)。

    24h cache via quack_judgments(judgment_type='weekly_picks')。
    """
    from backend.services import quack_brain

    today = now_tpe().date()

    if not force:
        cached = quack_brain.get_cached_judgment("weekly_picks", today)
        if cached and cached.get("content_json"):
            return {
                "date": today.isoformat(),
                "cached": True,
                **cached["content_json"],
                "generated_at": cached.get("created_at"),
                "model": cached.get("model"),
            }

    if force:
        _require_admin(x_admin_token)

    try:
        result = quack_brain.quack_judge_weekly_picks(today)
    except Exception as e:
        log.exception("quack_judge_weekly_picks failed: %s", e)
        raise HTTPException(500, f"weekly_picks generation failed: {e}")

    quack_brain.save_judgment("weekly_picks", today, result)

    return {
        "date": today.isoformat(),
        "cached": False,
        "picks": result["picks"],
        "generated_at": result["generated_at"],
        "model": result["model"],
    }


# =========================================================================
# POST /api/quack/homework/refresh — Bug #1 手動觸發
# =========================================================================
@router.post("/quack/homework/refresh")
async def refresh_quack_homework(
    x_admin_token: Optional[str] = Header(default=None),
):
    """Bug #1 手動觸發:重新評估 topics.heat_score + heat_trend + ai_summary。

    呼叫 quack_refresh_topics 後 topics.updated_at 會更新,
    前端 QuackMorningLive 抓到的「資料更新時間」就是真實的 DB updated_at。

    這個 endpoint 設計給:
      - admin 手動 curl 觸發(週六/週日驗證用)
      - GHA cron 定期呼叫(週一-週五 盤中每 30 分、盤後每 2 小時)
    """
    _require_admin(x_admin_token)

    from backend.services import quack_brain

    try:
        result = quack_brain.quack_refresh_topics(now_tpe().date())
    except Exception as e:
        log.exception("quack_refresh_topics failed: %s", e)
        raise HTTPException(500, f"homework refresh failed: {e}")

    return {"ok": True, **result}


# =========================================================================
# GET /api/quack/alerts — 自動警示(Phase 3 C1)
# =========================================================================
@router.get("/quack/alerts")
async def list_auto_alerts(
    unread_only: bool = Query(True),
    limit: int = Query(20, ge=1, le=100),
):
    sb = get_service_client()
    try:
        q = sb.table("auto_alerts").select("*")
        if unread_only:
            q = q.eq("read_by_user", False)
        q = q.order("created_at", desc=True).limit(limit)
        rows = q.execute().data or []
    except Exception as e:
        if _is_missing_table(e):
            return {"count": 0, "alerts": [], "note": "migration 0003 未執行"}
        raise HTTPException(500, f"db error: {e}")
    return {"count": len(rows), "alerts": rows}
