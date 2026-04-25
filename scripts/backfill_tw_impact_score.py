#!/usr/bin/env python
"""
Backfill people_statements.tw_impact_score(NEXT_TASK_008a Bug #2)

策略:啟發式評分 0-10 分,不呼叫 AI(省成本、可重複跑)。

評分規則(每條規則加分,上限 10):
  +3  ai_affected_stocks 含任何「純數字 4-6 碼」(台股代號格式)
  +2  ai_urgency >= 8
  +1  ai_urgency >= 6 (兩規則互斥取大)
  +2  ai_topic 在 ['rate','ai_capex','semiconductor','tariff','geopolitics','tw_policy','export']
  +2  ai_market_impact 含台灣相關關鍵字('台股','台積','台幣','TSMC','台灣',...)
  +1  watched_people.priority >= 8 (重要人物加分)

跑法:
  python scripts/backfill_tw_impact_score.py [--days 30] [--dry-run]

預期執行時間:< 1 分鐘,純 DB 讀寫無外部 API
"""
from __future__ import annotations

import argparse
import re
import sys
from datetime import timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend import load_env  # noqa: F401, E402
from backend.utils.logger import get_logger  # noqa: E402
from backend.utils.supabase_client import get_service_client  # noqa: E402
from backend.utils.time_utils import now_tpe  # noqa: E402

log = get_logger(__name__)

TICKER_RE = re.compile(r"^\d{4,6}$")
HIGH_IMPACT_TOPICS = {
    "rate", "ai_capex", "semiconductor", "tariff",
    "geopolitics", "tw_policy", "export", "interest_rate",
    "trade_war", "chip_war",
}
TW_KEYWORDS = ["台股", "台積", "台幣", "TSMC", "台灣", "聯發科", "鴻海", "台塑", "金管會"]


def calc_tw_impact(stmt: dict, person_priority: int = 0) -> int:
    score = 0

    # 規則 1:有台股 ticker → +3
    affected = stmt.get("ai_affected_stocks") or []
    if isinstance(affected, list) and any(
        TICKER_RE.match(str(x.get("code") if isinstance(x, dict) else x).strip())
        for x in affected
    ):
        score += 3

    # 規則 2:urgency
    urg = stmt.get("ai_urgency") or 0
    if urg >= 8:
        score += 2
    elif urg >= 6:
        score += 1

    # 規則 3:topic
    topic = (stmt.get("ai_topic") or "").lower()
    if topic in HIGH_IMPACT_TOPICS:
        score += 2

    # 規則 4:market_impact 含台灣關鍵字
    impact_text = (stmt.get("ai_market_impact") or "") + " " + (stmt.get("ai_summary") or "")
    if any(kw in impact_text for kw in TW_KEYWORDS):
        score += 2

    # 規則 5:重要人物
    if person_priority >= 8:
        score += 1

    return min(score, 10)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=30, help="回填過去幾天(預設 30)")
    parser.add_argument("--dry-run", action="store_true", help="只計算不寫 DB")
    parser.add_argument("--limit", type=int, default=2000, help="單次最多處理筆數")
    args = parser.parse_args()

    sb = get_service_client()
    since = (now_tpe().date() - timedelta(days=args.days)).isoformat()

    log.info("Backfill tw_impact_score: since=%s, dry_run=%s", since, args.dry_run)

    # 取人物 priority 字典(用於規則 5)
    people_pri: dict[int, int] = {}
    try:
        r = sb.table("watched_people").select("id,priority").execute()
        for p in r.data or []:
            people_pri[p["id"]] = p.get("priority") or 0
    except Exception as e:
        log.warning("load watched_people priority failed: %s", e)

    # 撈過去 N 天發言
    try:
        r = (
            sb.table("people_statements")
            .select("id,person_id,ai_topic,ai_sentiment,ai_market_impact,"
                    "ai_summary,ai_affected_stocks,ai_urgency,said_at")
            .gte("said_at", since)
            .order("said_at", desc=True)
            .limit(args.limit)
            .execute()
        )
        rows = r.data or []
    except Exception as e:
        log.error("query people_statements failed: %s", e)
        return 1

    log.info("Loaded %d statements to evaluate", len(rows))

    score_dist = {i: 0 for i in range(11)}
    updates = []
    for stmt in rows:
        pri = people_pri.get(stmt.get("person_id"), 0)
        s = calc_tw_impact(stmt, pri)
        score_dist[s] += 1
        updates.append((stmt["id"], s))

    log.info("Score distribution: %s", score_dist)

    if args.dry_run:
        log.info("DRY-RUN: 不寫 DB。前 10 筆樣本:")
        for sid, sc in updates[:10]:
            log.info("  id=%s score=%s", sid, sc)
        return 0

    # 寫回 DB(批次 update)
    written = 0
    failed = 0
    for sid, sc in updates:
        try:
            sb.table("people_statements").update(
                {"tw_impact_score": sc}
            ).eq("id", sid).execute()
            written += 1
        except Exception as e:
            log.warning("update id=%s failed: %s", sid, e)
            failed += 1

    log.info("Done. written=%d failed=%d total=%d", written, failed, len(updates))
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
