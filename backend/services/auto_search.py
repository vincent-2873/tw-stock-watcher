"""
auto_search — Phase 3 C1 自動偵測 + 主動搜尋

觸發條件(19_V2_UPGRADE_BRIEF.md):
  1. 外資單日買/賣超 > 200 億 → 搜尋原因
  2. 單一個股漲跌 > 7%       → 搜尋新聞 + 法人動態
  3. 題材熱度 1 小時內 > +15°→ 搜尋催化劑
  4. 美股科技巨頭盤後 > ±3%  → 搜尋財報/事件
  5. 重要人物發言(intel_articles ai_importance ≥ 8)→ 產生警示
  6. PTT 某股討論度突破歷史  → 查發生什麼事

本版本(v1):只做 #5 — 從 intel_articles 讀 ai_importance ≥ 8 的新文章
複製成 auto_alerts entry。之後接 Claude + web_search tool 擴充。
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client

log = get_logger(__name__)

IMPORTANCE_THRESHOLD = 8  # 1-10 scale


def _safe_insert(rows: list[dict]) -> dict:
    sb = get_service_client()
    try:
        sb.table("auto_alerts").insert(rows).execute()
        return {"inserted": len(rows)}
    except Exception as e:
        if "does not exist" in str(e):
            return {"inserted": 0, "skipped_reason": "table_missing"}
        log.exception("auto_alerts insert failed: %s", e)
        return {"inserted": 0, "error": str(e)}


def check_intel_high_importance(hours: int = 2) -> dict[str, Any]:
    """讀過去 N 小時裡 ai_importance ≥ 8 的 intel 文章,轉成 auto_alert。"""
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    sb = get_service_client()

    try:
        r = (
            sb.table("intel_articles")
            .select(
                "id,title,ai_summary,ai_importance,ai_urgency,ai_sentiment,"
                "ai_affected_stocks,ai_quack_perspective,url,published_at"
            )
            .gte("ai_importance", IMPORTANCE_THRESHOLD)
            .gte("ai_analyzed_at", since)
            .order("ai_importance", desc=True)
            .limit(20)
            .execute()
        )
        articles = r.data or []
    except Exception as e:
        log.error("auto_search intel read failed: %s", e)
        return {"articles_found": 0, "error": str(e)}

    if not articles:
        return {"articles_found": 0, "inserted": 0}

    # 組 auto_alert rows
    rows: list[dict] = []
    for a in articles:
        rows.append(
            {
                "trigger_type": "vip_statement",
                "trigger_detail": {
                    "title": a.get("title"),
                    "url": a.get("url"),
                    "published_at": a.get("published_at"),
                    "sentiment": a.get("ai_sentiment"),
                    "intel_article_id": a.get("id"),
                },
                "ai_analysis": a.get("ai_quack_perspective") or a.get("ai_summary"),
                "affected_stocks": a.get("ai_affected_stocks") or [],
                "urgency": int(a.get("ai_urgency") or 5),
            }
        )

    result = _safe_insert(rows)
    return {"articles_found": len(articles), **result}


def run() -> dict[str, Any]:
    """排程入口 — 跑所有 trigger。v1 只跑 #5。"""
    out: dict[str, Any] = {"ts": datetime.now(timezone.utc).isoformat()}
    out["intel_high_importance"] = check_intel_high_importance(hours=2)
    # TODO: check_foreign_heavy_sell, check_stock_price_surge, check_topic_heat_surge
    return out


if __name__ == "__main__":
    from pprint import pprint

    pprint(run())
