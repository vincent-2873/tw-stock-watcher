"""
呱呱中樞 AI 判斷層 — NEXT_TASK_008a 縮水版

職責:
  接受多種 input(新聞、發言、籌碼、技術、題材熱度、大盤狀態)
  輸出呱呱口吻的判斷(不是摘要、是觀點)

008a 範圍只做兩個函數:
  - quack_judge_headline(date)     → hero 副標的「呱呱觀點」
  - quack_judge_weekly_picks(date) → 10 檔精準推薦

008b 才會擴充:
  - quack_judge_market(date)       → 大盤觀點
  - quack_judge_homework(date)     → 動態功課

Refs: NEXT_TASK_008a
"""
from __future__ import annotations

import json
import os
from datetime import date as _date_t, datetime, timedelta
from typing import Any, Optional

import anthropic

from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")


# =========================================================================
# 共用 helper:取 Anthropic client
# =========================================================================
def _get_client() -> anthropic.Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")
    return anthropic.Anthropic(api_key=api_key)


def _strip_json_fence(raw: str) -> str:
    """Claude 偶爾會包 ```json...``` — 拆掉。"""
    s = raw.strip()
    if s.startswith("```"):
        # 拿掉開頭 ```json 或 ```
        s = s.split("\n", 1)[1] if "\n" in s else s.lstrip("`")
    if s.endswith("```"):
        s = s.rsplit("```", 1)[0]
    return s.strip()


# =========================================================================
# A. quack_judge_headline — 產出 hero 副標的「呱呱觀點」
# =========================================================================

HEADLINE_SYSTEM = """你是「呱呱」,一隻坐鎮日式投資招待所的台股 AI 分析師。
你不是新聞摘要員、不是吉祥物——你是會給觀點、會教思考、會質疑使用者的所主。

任務:給 Vincent 一個 hero 副標用的「**呱呱觀點**」(不是新聞摘要,是判斷)。

## 輸出格式(嚴格 JSON,不要 markdown 代碼塊)

{
  "water_status":  "風平浪靜 / 還算平靜 / 有點混 / 波濤洶湧 / 詭譎",
  "quack_view":    "呱呱觀點:一句話判斷,12-25 字。不是新聞,是看法。",
  "reason":        "為什麼這樣判斷,30-60 字。引用具體事件或籌碼/技術訊號。",
  "watch_for":     "下個關鍵點:30-60 字。具體到事件或時間。"
}

## 風格鐵律
- 用「池塘、水位、甩轎、洗浮額、跳進池塘」等意象,但別句句堆
- 不預言股價百分比、不發明牌
- 永遠有質疑面(挑刺、暗示風險),不是單邊鼓吹
- 質疑 FOMO、梭哈、攤平
- **不准用「降級」「資料不足」「以上僅供參考」這類話術**

## 範例(這只是格式參考,內容請自己生)

{
  "water_status": "詭譎",
  "quack_view": "拉高的別追、跌深的先等。",
  "reason": "外資連 5 賣 + 散戶追高 + 法說會密集週,水面平靜底下有暗流。",
  "watch_for": "週四台積電法說會 + 週五 CPI,雙利雙害都有。"
}

## 週末模式
若日期是週六/週日(台股休市),用「下週要看的事」口吻取代「今天」。
"""


def _safe_select(table: str, *, columns: str = "*", order: tuple[str, bool] | None = None,
                 limit: int = 50, eq: dict | None = None) -> list[dict]:
    sb = get_service_client()
    try:
        q = sb.table(table).select(columns)
        if eq:
            for k, v in eq.items():
                q = q.eq(k, v)
        if order:
            q = q.order(order[0], desc=order[1])
        q = q.limit(limit)
        return q.execute().data or []
    except Exception as e:
        log.warning("quack_brain _safe_select %s failed: %s", table, e)
        return []


def _build_headline_snapshot(target_date: _date_t) -> dict[str, Any]:
    """組市場快照供 quack_judge_headline 使用。"""
    snapshot: dict[str, Any] = {
        "date": target_date.isoformat(),
        "weekday": target_date.strftime("%A"),
        "is_weekend": target_date.weekday() >= 5,
    }

    # Top 5 題材熱度
    topics = _safe_select(
        "topics",
        columns="id,name,heat_score,heat_trend,stage",
        eq={"status": "active"},
        order=("heat_score", True),
        limit=5,
    )
    snapshot["topics_top5"] = topics

    # Top 5 重要新聞(過去 3 天 + AI 已分析)
    sb = get_service_client()
    try:
        since = (target_date - timedelta(days=3)).isoformat()
        r = (
            sb.table("intel_articles")
            .select("title,ai_summary,ai_sentiment,ai_importance,published_at")
            .gte("published_at", since)
            .not_.is_("ai_analyzed_at", "null")
            .order("ai_importance", desc=True)
            .order("published_at", desc=True)
            .limit(5)
            .execute()
        )
        snapshot["news_top5"] = r.data or []
    except Exception as e:
        log.warning("headline snapshot news failed: %s", e)
        snapshot["news_top5"] = []

    # Top 3 高影響力人物發言(已 AI 分析過 + 對台股有影響)
    try:
        r = (
            sb.table("people_statements")
            .select("statement_text,ai_summary,ai_sentiment,ai_market_impact,ai_urgency,said_at")
            .gte("ai_urgency", 6)
            .order("said_at", desc=True)
            .limit(3)
            .execute()
        )
        snapshot["people_top3"] = r.data or []
    except Exception:
        snapshot["people_top3"] = []

    return snapshot


def quack_judge_headline(target_date: Optional[_date_t] = None) -> dict[str, Any]:
    """產出 hero 副標的「呱呱觀點」。

    回傳 dict 含:
      - water_status (str): 5 階水況之一
      - quack_view (str): 12-25 字觀點
      - reason (str): 為什麼
      - watch_for (str): 下個關鍵點
      - generated_at (ISO str)
      - model (str)
      - input_snapshot (dict)
    """
    if target_date is None:
        target_date = now_tpe().date()

    snapshot = _build_headline_snapshot(target_date)

    client = _get_client()
    prompt = (
        f"今天是 {target_date.isoformat()} ({snapshot['weekday']})。\n\n"
        f"市場快照:\n"
        f"{json.dumps(snapshot, ensure_ascii=False, indent=2, default=str)}\n\n"
        "依 system prompt 的格式,給 Vincent 一個呱呱觀點。直接輸出 JSON。"
    )
    msg = client.messages.create(
        model=MODEL,
        max_tokens=600,
        system=HEADLINE_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text if msg.content else ""
    cleaned = _strip_json_fence(raw)

    try:
        data = json.loads(cleaned)
    except Exception as e:
        log.error("quack_judge_headline JSON parse failed: %s\nraw=%r", e, raw)
        # 不准降級話術,但解析失敗時必須誠實 raise
        raise RuntimeError(f"Claude headline JSON 解析失敗: {e}") from e

    return {
        "water_status": str(data.get("water_status", ""))[:20],
        "quack_view": str(data.get("quack_view", ""))[:80],
        "reason": str(data.get("reason", ""))[:200],
        "watch_for": str(data.get("watch_for", ""))[:200],
        "generated_at": now_tpe().isoformat(),
        "model": MODEL,
        "input_snapshot": snapshot,
        "tokens_used": msg.usage.input_tokens + msg.usage.output_tokens if msg.usage else None,
    }


# =========================================================================
# B. quack_judge_weekly_picks — 產出 10 檔精準推薦
# =========================================================================

WEEKLY_PICKS_SYSTEM = """你是「呱呱」,日式投資招待所的所主。

任務:從 Vincent 給你的「四象限評分股池」與題材熱度中,挑出**本週 10 檔重點觀察名單**,依四種風格平衡分配:

- **穩健派 (3 檔)**:大型權值/高股息,基本面厚
- **進攻派 (3 檔)**:技術突破或量能異常,短中線題材
- **逆勢派 (2 檔)**:近期超跌但籌碼有護,反彈機會
- **題材派 (2 檔)**:正在升溫的題材龍頭/受惠股

## 鐵律(違反者直接判定錯誤)

1. **必須剛好 10 檔**,不准 9 檔不准 11 檔
2. **不准回「市場冷清」「資料不足」「建議觀望」**——即使大盤糟,也要挑相對抗跌、逆勢、題材獨立的個股
3. **每一檔都要有呱呱口吻 1 句理由**,不是新聞、是判斷
4. **目標價要合理**(現價的 +5% ~ +20% 區間,看 confidence 決定)
5. **停損價必須 < 現價**

## 輸出(嚴格 JSON,不要 markdown 代碼塊)

{
  "picks": [
    {
      "symbol": "2330",
      "name": "台積電",
      "category": "穩健派",
      "quack_reason": "外資連買 + 法說在即,這檔我這週看著",
      "target_price": 1050,
      "stop_loss": 990,
      "confidence": 0.7
    },
    ...剛好 10 個
  ]
}

## 風格

- 呱呱口吻短而有個性:「這檔我看著」「主力手印還沒消」「跌得這樣不撈嗎」
- 不用「建議買進」「強烈推薦」這類官腔
- 不用 emoji
- 質疑使用者的 FOMO 衝動,話可以毒
"""


def _build_weekly_picks_snapshot(target_date: _date_t) -> dict[str, Any]:
    """組四象限評分 + 題材熱度當作 weekly_picks 輸入。"""
    sb = get_service_client()
    snapshot: dict[str, Any] = {
        "date": target_date.isoformat(),
        "weekday": target_date.strftime("%A"),
        "is_weekend": target_date.weekday() >= 5,
    }

    # 四象限評分 top 30(讓 Claude 有得挑)
    try:
        rows = (
            sb.table("stocks")
            .select(
                "stock_id,stock_name,industry,"
                "current_score,current_tier,score_breakdown,tier_updated_at"
            )
            .eq("is_active", True)
            .in_("current_tier", ["R", "SR", "SSR"])
            .order("current_score", desc=True)
            .limit(30)
            .execute()
        )
        snapshot["scored_pool"] = rows.data or []
    except Exception as e:
        log.warning("weekly_picks scored_pool failed: %s", e)
        snapshot["scored_pool"] = []

    # 補充:即使 R+ 不夠 30,把 N tier 高分也納入(避免「池子太小無法挑 10 檔」)
    if len(snapshot["scored_pool"]) < 30:
        try:
            extra = (
                sb.table("stocks")
                .select(
                    "stock_id,stock_name,industry,"
                    "current_score,current_tier,score_breakdown,tier_updated_at"
                )
                .eq("is_active", True)
                .eq("current_tier", "N")
                .order("current_score", desc=True)
                .limit(30 - len(snapshot["scored_pool"]))
                .execute()
            )
            snapshot["scored_pool"].extend(extra.data or [])
        except Exception:
            pass

    # 題材熱度 top 8
    try:
        topics = (
            sb.table("topics")
            .select("id,name,heat_score,heat_trend,stage,supply_chain")
            .eq("status", "active")
            .order("heat_score", desc=True)
            .limit(8)
            .execute()
        )
        snapshot["topics_top8"] = topics.data or []
    except Exception:
        snapshot["topics_top8"] = []

    return snapshot


def quack_judge_weekly_picks(target_date: Optional[_date_t] = None) -> dict[str, Any]:
    """產出 10 檔精準推薦。

    回傳 dict 含:
      - picks (list[dict]): 10 檔,每檔有 symbol/name/category/quack_reason/target_price/stop_loss/confidence/current_price
      - generated_at (ISO str)
      - model (str)
      - input_snapshot (dict)
      - tokens_used (int)
    """
    if target_date is None:
        target_date = now_tpe().date()

    snapshot = _build_weekly_picks_snapshot(target_date)

    if not snapshot["scored_pool"]:
        # 池子真的空(資料庫沒被 scoring_worker 更新)— 必須誠實 raise
        # 不准回「冷清」話術
        raise RuntimeError(
            "stocks 表沒有 R/SR/SSR/N tier 評分資料。"
            "scoring_worker 可能尚未跑過,或 DB 連線異常。"
        )

    client = _get_client()
    prompt = (
        f"今天是 {target_date.isoformat()} ({snapshot['weekday']})。\n\n"
        f"四象限評分股池(top 30):\n"
        f"{json.dumps(snapshot['scored_pool'], ensure_ascii=False, default=str)}\n\n"
        f"題材熱度 top 8:\n"
        f"{json.dumps(snapshot['topics_top8'], ensure_ascii=False, default=str)}\n\n"
        "依 system prompt 規則挑出 10 檔。不准空、不准降級、不准回『市場冷清』。"
        "直接輸出 JSON。"
    )
    msg = client.messages.create(
        model=MODEL,
        max_tokens=2500,
        system=WEEKLY_PICKS_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text if msg.content else ""
    cleaned = _strip_json_fence(raw)

    try:
        data = json.loads(cleaned)
    except Exception as e:
        log.error("quack_judge_weekly_picks JSON parse failed: %s\nraw=%r", e, raw[:500])
        raise RuntimeError(f"Claude weekly_picks JSON 解析失敗: {e}") from e

    picks = data.get("picks", [])
    if not isinstance(picks, list) or len(picks) != 10:
        log.error("weekly_picks 回應不是 10 檔: got %d", len(picks) if isinstance(picks, list) else 0)
        raise RuntimeError(f"Claude 回 {len(picks) if isinstance(picks, list) else 0} 檔,不是 10 檔")

    return {
        "picks": picks,
        "generated_at": now_tpe().isoformat(),
        "model": MODEL,
        "input_snapshot": snapshot,
        "tokens_used": msg.usage.input_tokens + msg.usage.output_tokens if msg.usage else None,
    }


# =========================================================================
# C. Bug #1 輔助:refresh_topics_freshness
#    Topics 表的 heat_score 過去靠手動/seed,這個函數讓 admin 可以
#    手動觸發,簡單依 AI 重新評估熱度(基於最近 3 天新聞 + 既有熱度)
#    是 008a 為了「手動觸發 cron 後文案有更新」交付而做。
# =========================================================================

TOPIC_REFRESH_SYSTEM = """你是「呱呱」,負責重新評估題材熱度。

給你一批當前題材 + 最近 3 天新聞,請依新聞數量、情緒、影響度,重新給每個題材的:
- heat_score (0-100)
- heat_trend ('rising' / 'flat' / 'falling')
- one_liner (一句呱呱口吻的當前狀態)

## 輸出 JSON(不要 markdown 代碼塊)

{
  "updates": [
    { "topic_id": "...", "heat_score": 78, "heat_trend": "rising", "one_liner": "資金真的轉進來了,別追高" },
    ...
  ]
}

## 鐵律
- 每個輸入題材都要有對應 update(同樣數量)
- heat_score 變化不要超過原本的 ±20(避免劇烈波動)
- one_liner 12-30 字
"""


def quack_refresh_topics(target_date: Optional[_date_t] = None) -> dict[str, Any]:
    """Bug #1 輔助:重評估 topics.heat_score 並更新 DB。

    為了 008a「手動觸發 endpoint 能讓 DB updated_at 更新 + 前台抓得到新資料」
    這個交付條件而存在。
    """
    if target_date is None:
        target_date = now_tpe().date()

    sb = get_service_client()

    # 1. 取現有 active topics
    topics = (
        sb.table("topics")
        .select("id,name,heat_score,heat_trend,stage,status")
        .eq("status", "active")
        .limit(20)
        .execute()
        .data
        or []
    )

    if not topics:
        raise RuntimeError("active topics 為空,無法 refresh")

    # 2. 取最近 3 天 AI 已分析新聞
    since = (target_date - timedelta(days=3)).isoformat()
    try:
        news_resp = (
            sb.table("intel_articles")
            .select("title,ai_summary,ai_sentiment,ai_importance,published_at")
            .gte("published_at", since)
            .not_.is_("ai_analyzed_at", "null")
            .order("ai_importance", desc=True)
            .limit(15)
            .execute()
        )
        news = news_resp.data or []
    except Exception:
        news = []

    # 3. 呼叫 Claude
    client = _get_client()
    prompt = (
        f"日期: {target_date.isoformat()}\n\n"
        f"當前題材 ({len(topics)} 個):\n"
        f"{json.dumps(topics, ensure_ascii=False, default=str)}\n\n"
        f"最近 3 天新聞 ({len(news)} 則):\n"
        f"{json.dumps(news, ensure_ascii=False, default=str)}\n\n"
        "重新給每個題材的 heat_score / heat_trend / one_liner。"
        "輸入幾個題材就要輸出幾個 update。直接輸出 JSON。"
    )
    msg = client.messages.create(
        model=MODEL,
        max_tokens=2000,
        system=TOPIC_REFRESH_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text if msg.content else ""
    cleaned = _strip_json_fence(raw)

    try:
        data = json.loads(cleaned)
    except Exception as e:
        log.error("quack_refresh_topics JSON parse failed: %s\nraw=%r", e, raw[:500])
        raise RuntimeError(f"Claude topic_refresh JSON 解析失敗: {e}") from e

    updates = data.get("updates", [])

    # 4. 寫回 DB
    updated_count = 0
    now_iso = now_tpe().isoformat()
    for u in updates:
        tid = u.get("topic_id")
        if not tid:
            continue
        try:
            sb.table("topics").update(
                {
                    "heat_score": int(u.get("heat_score", 0)),
                    "heat_trend": str(u.get("heat_trend", "flat")),
                    "ai_summary": str(u.get("one_liner", ""))[:300],
                    "updated_at": now_iso,
                }
            ).eq("id", tid).execute()
            updated_count += 1
        except Exception as e:
            log.warning("update topic %s failed: %s", tid, e)

    return {
        "updated_count": updated_count,
        "total_topics": len(topics),
        "generated_at": now_iso,
        "model": MODEL,
        "tokens_used": msg.usage.input_tokens + msg.usage.output_tokens if msg.usage else None,
    }


# =========================================================================
# 共用 helper:讀/寫 quack_judgments cache
# =========================================================================
def get_cached_judgment(judgment_type: str, target_date: _date_t) -> Optional[dict]:
    """讀取 quack_judgments 表的當日快取。沒有回 None。"""
    sb = get_service_client()
    try:
        r = (
            sb.table("quack_judgments")
            .select("*")
            .eq("judgment_type", judgment_type)
            .eq("judgment_date", target_date.isoformat())
            .limit(1)
            .execute()
        )
        return r.data[0] if r.data else None
    except Exception as e:
        log.warning("get_cached_judgment %s/%s failed: %s", judgment_type, target_date, e)
        return None


def save_judgment(judgment_type: str, target_date: _date_t, payload: dict) -> bool:
    """UPSERT 到 quack_judgments。"""
    sb = get_service_client()
    try:
        sb.table("quack_judgments").upsert(
            {
                "judgment_type": judgment_type,
                "judgment_date": target_date.isoformat(),
                "content_json": {
                    k: v for k, v in payload.items()
                    if k not in ("input_snapshot", "model", "tokens_used")
                },
                "model": payload.get("model"),
                "input_snapshot": payload.get("input_snapshot"),
                "tokens_used": payload.get("tokens_used"),
            },
            on_conflict="judgment_type,judgment_date",
        ).execute()
        return True
    except Exception as e:
        log.warning("save_judgment %s/%s failed: %s", judgment_type, target_date, e)
        return False
