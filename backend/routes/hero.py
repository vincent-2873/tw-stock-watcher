"""
NEXT_TASK_008b 階段 3:跨市場觀點 + Hero 時段切換

  GET /api/quack/cross_market_view  美股盤後 → 台股預測連動
  GET /api/hero/headline            時段判斷自動切換內容(盤前/盤中/盤後/週末)

時段邏輯(Asia/Taipei):
  - 平日 06:00-08:30  → 盤前 → cross_market_view (吃美股盤後)
  - 平日 08:30-13:30  → 盤中 → quack/headline 即時觀點
  - 平日 13:30-22:00  → 盤後 → today_summary(走 quack/headline 用收盤資料)
  - 週六              → weekly_recap(quack/headline 週末模式)
  - 週日              → next_week_preview(quack/headline 週末模式)
  - 平日 22:00-06:00  → 美股交易中 → cross_market_view 預覽
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException

from backend.services.yahoo_service import get_index_quote
from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)
router = APIRouter()


def _sb():
    return get_service_client()


# =========================================================================
# GET /api/quack/cross_market_view
# =========================================================================
@router.get("/quack/cross_market_view")
def cross_market_view() -> dict[str, Any]:
    """美股盤後 → 台股預測連動。

    抓 SPX / SOX / TSM ADR / NVDA 等指標,比對 us_tw_correlation 表觸發條件,
    回傳預期影響的台股族群與標的。
    """
    # 1. 抓美股關鍵指標
    keys = [
        ("^GSPC", "spx"),
        ("^IXIC", "ndx"),
        ("^DJI", "dji"),
        ("^SOX", "sox"),
        ("^VIX", "vix"),
        ("TSM", "tsm_adr"),
        ("NVDA", "nvda"),
        ("AMD", "amd"),
        ("TSLA", "tsla"),
    ]
    overnight: dict[str, Any] = {}
    for sym, key in keys:
        q = get_index_quote(sym)
        if q:
            overnight[key] = {
                "symbol": sym,
                "price": q.get("price"),
                "change_pct": q.get("change_pct"),
                "change": q.get("change"),
            }

    # 2. 比對 us_tw_correlation 表觸發條件
    sb = _sb()
    try:
        rules_data = sb.table("us_tw_correlation").select("*").eq("is_active", True).execute().data or []
    except Exception as e:
        log.warning(f"us_tw_correlation missing: {e}")
        rules_data = []

    triggered: list[dict[str, Any]] = []
    impacted_sectors: dict[str, float] = {}
    impacted_stocks: dict[str, dict[str, Any]] = {}

    def _pct(key: str) -> float | None:
        v = overnight.get(key, {}).get("change_pct")
        return float(v) if v is not None else None

    nvda_pct = _pct("nvda")
    sox_pct = _pct("sox")
    tsm_pct = _pct("tsm_adr")
    spx_pct = _pct("spx")
    vix_pct = _pct("vix")
    vix_price = overnight.get("vix", {}).get("price")

    def _trigger(key: str):
        for r in rules_data:
            if r.get("us_event_key") == key:
                triggered.append(
                    {
                        "event_key": key,
                        "event_zh": r.get("us_event_zh"),
                        "trigger_condition": r.get("trigger_condition"),
                        "correlation_score": float(r.get("correlation_score") or 0.5),
                    }
                )
                for sec in r.get("impact_tw_sectors") or []:
                    impacted_sectors[sec] = max(impacted_sectors.get(sec, 0), float(r.get("correlation_score") or 0.5))
                for st in r.get("impact_tw_stocks") or []:
                    code = st.get("code")
                    if not code:
                        continue
                    cur = impacted_stocks.get(code, {"code": code, "name": st.get("name"), "direction": st.get("direction"), "strength": 0})
                    cur["strength"] = max(cur["strength"], float(st.get("strength") or 0.5))
                    impacted_stocks[code] = cur
                return

    if nvda_pct is not None:
        if nvda_pct > 3:
            _trigger("nvda_up_strong")
        elif nvda_pct < -3:
            _trigger("nvda_down_strong")

    if sox_pct is not None:
        if sox_pct > 2:
            _trigger("sox_up")
        elif sox_pct < -2:
            _trigger("sox_down")

    if tsm_pct is not None:
        if tsm_pct > 2:
            _trigger("tsm_adr_up_strong")
        elif tsm_pct < -2:
            _trigger("tsm_adr_down_strong")

    if spx_pct is not None and spx_pct > 1.5:
        _trigger("spx_up_strong")

    if (vix_pct is not None and vix_pct > 15) or (vix_price is not None and vix_price > 25):
        _trigger("vix_spike")

    # 3. 組合 quack_view(規則式 + 觸發內容)
    if not triggered:
        quack_view = "美股相對平穩,台股今日預期沒有明顯外部衝擊,看自身結構與資金輪動。"
        watch_for = ["留意外資期貨多空", "觀察主流族群輪動是否延續"]
        tw_open_predict = "預期台股開盤平穩,跟隨自身節奏"
    else:
        # 取最強觸發事件當主敘事
        triggered.sort(key=lambda x: x["correlation_score"], reverse=True)
        main = triggered[0]
        sectors_str = "、".join(list(impacted_sectors.keys())[:5])

        # 預測語氣根據觸發事件方向
        up_events = sum(1 for t in triggered if "up" in t["event_key"] or "spike" not in t["event_key"])
        down_events = sum(1 for t in triggered if "down" in t["event_key"] or "spike" in t["event_key"])

        if down_events > up_events:
            quack_view = f"{main['event_zh']}會壓到台股 {sectors_str},開盤跳空跌的機率高,別在開盤追殺。"
            tw_open_predict = "預期台股開盤跳空跌 0.5-1.5%,半導體跟 AI 鏈承壓"
        elif up_events > 0:
            quack_view = f"{main['event_zh']}帶動台股 {sectors_str} 有開高機會,但別追,看 9:30 後是否守得住。"
            tw_open_predict = "預期台股開盤跳空漲 0.5-1.5%,留意資金是否續攻"
        else:
            quack_view = f"{main['event_zh']}訊號矛盾,觀察今日多空角力。"
            tw_open_predict = "預期台股開盤震盪整理"

        watch_for = [
            f"開盤 9:00 量能能否撐得住",
            f"留意外資期貨多空對 {sectors_str.split('、')[0] if sectors_str else '主流族群'} 影響",
            f"觀察 11:30 中場時是否轉弱",
        ]

    return {
        "tpe_now": now_tpe().isoformat(),
        "us_overnight": overnight,
        "triggered_events": triggered,
        "impacted_sectors": [{"name": k, "strength": v} for k, v in impacted_sectors.items()],
        "impacted_stocks": list(impacted_stocks.values()),
        "tw_open_predict": tw_open_predict,
        "quack_view": quack_view,
        "watch_for": watch_for,
    }


# =========================================================================
# GET /api/hero/headline — 時段判斷自動切換
# =========================================================================
@router.get("/hero/headline")
def hero_headline() -> dict[str, Any]:
    """根據台北時間切換 hero 副標來源。

    回傳統一格式:
      {
        "mode": "pre_market" | "intraday" | "after_close" | "weekly_recap" | "next_week_preview" | "us_session",
        "headline": "...",
        "sub_view": "...",
        "watch_for": [...],
        "source": "cross_market_view" | "quack_headline",
      }
    """
    tpe = now_tpe()
    weekday = tpe.weekday()  # 0=Mon, 6=Sun
    hour = tpe.hour
    minute = tpe.minute
    minutes_of_day = hour * 60 + minute

    # 週末
    if weekday == 5:  # Saturday
        mode = "weekly_recap"
        return _adapt_quack_headline(mode)
    if weekday == 6:  # Sunday
        mode = "next_week_preview"
        return _adapt_quack_headline(mode)

    # 平日(Mon-Fri)
    if 6 * 60 <= minutes_of_day < 8 * 60 + 30:
        # 06:00 - 08:30 盤前
        mode = "pre_market"
        cmv = _safe_cross_market()
        if cmv:
            return {
                "mode": mode,
                "tpe_now": tpe.isoformat(),
                "weekday": weekday,
                "headline": cmv.get("tw_open_predict") or cmv.get("quack_view", ""),
                "quack_view": cmv.get("quack_view", ""),
                "watch_for": cmv.get("watch_for", []),
                "us_overnight": cmv.get("us_overnight", {}),
                "triggered_events": cmv.get("triggered_events", []),
                "source": "cross_market_view",
            }
        return _adapt_quack_headline(mode)

    if 8 * 60 + 30 <= minutes_of_day < 13 * 60 + 30:
        mode = "intraday"
        return _adapt_quack_headline(mode)

    if 13 * 60 + 30 <= minutes_of_day < 22 * 60:
        mode = "after_close"
        return _adapt_quack_headline(mode)

    # 22:00-06:00 美股交易中
    mode = "us_session"
    cmv = _safe_cross_market()
    if cmv:
        return {
            "mode": mode,
            "tpe_now": tpe.isoformat(),
            "weekday": weekday,
            "headline": cmv.get("quack_view", ""),
            "quack_view": cmv.get("quack_view", ""),
            "watch_for": cmv.get("watch_for", []),
            "us_overnight": cmv.get("us_overnight", {}),
            "triggered_events": cmv.get("triggered_events", []),
            "source": "cross_market_view",
        }
    return _adapt_quack_headline(mode)


def _safe_cross_market():
    try:
        return cross_market_view()
    except Exception as e:
        log.warning(f"cross_market_view failed: {e}")
        return None


def _adapt_quack_headline(mode: str) -> dict[str, Any]:
    """把 /api/quack/headline 的格式轉成 /api/hero/headline 統一格式。"""
    try:
        from backend.services import quack_brain
        cached = quack_brain.get_cached_judgment("headline", now_tpe().date())
        if cached and cached.get("content_json"):
            j = cached["content_json"]
            return {
                "mode": mode,
                "tpe_now": now_tpe().isoformat(),
                "headline": j.get("quack_view", ""),
                "quack_view": j.get("quack_view", ""),
                "water_status": j.get("water_status"),
                "reason": j.get("reason"),
                "watch_for": [j.get("watch_for")] if isinstance(j.get("watch_for"), str) else (j.get("watch_for") or []),
                "source": "quack_headline",
                "cached": True,
            }
        # 沒快取就直接呼叫
        result = quack_brain.quack_judge_headline(now_tpe().date())
        quack_brain.save_judgment("headline", now_tpe().date(), result)
        return {
            "mode": mode,
            "tpe_now": now_tpe().isoformat(),
            "headline": result.get("quack_view", ""),
            "quack_view": result.get("quack_view", ""),
            "water_status": result.get("water_status"),
            "reason": result.get("reason"),
            "watch_for": [result.get("watch_for")] if isinstance(result.get("watch_for"), str) else (result.get("watch_for") or []),
            "source": "quack_headline",
            "cached": False,
        }
    except Exception as e:
        log.warning(f"_adapt_quack_headline failed: {e}")
        # 最後 fallback:不假完成,但給友善訊息
        return {
            "mode": mode,
            "tpe_now": now_tpe().isoformat(),
            "headline": "呱呱正在思考池塘的變化…",
            "quack_view": "呱呱正在思考池塘的變化…",
            "watch_for": [],
            "source": "fallback",
            "error": str(e)[:160],
        }
