"""
Stocks Scoring Worker — 每日對 stocks 表每檔跑四象限, upsert current_score/tier。

設計重點:
  - 不走 FastAPI endpoint (Zeabur 90s timeout 會斷),直接透過 GitHub Action 跑這腳本
  - 每檔 ~1-2 秒(受 FinMind rate limit 影響),60 檔預估 2-3 分鐘
  - skip_ai=True 跑純數據四象限,不呼叫 Claude (節省成本 + 速度)
  - 失敗一檔不影響其他檔 (try/except 逐檔)
  - 同步寫 stock_tier_history (保留歷史)

執行方式:
    python -m backend.services.scoring_worker
    # 或 from backend.services.scoring_worker import run_all; run_all()
"""

from __future__ import annotations

import time as _time
from typing import Any, Optional

from backend.core.decision_engine import DecisionEngine
from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)


def score_to_tier(score: int, max_score: int = 95) -> str:
    """C/N/R/SR/SSR 對應 SCORING_SYSTEM.md + lib/scoring.ts"""
    pct = (score / max_score) * 100 if max_score else 0
    if pct <= 20:
        return "C"
    if pct <= 40:
        return "N"
    if pct <= 60:
        return "R"
    if pct <= 80:
        return "SR"
    return "SSR"


def _breakdown_from_result(overall) -> dict[str, Any]:
    """抽取 score_breakdown JSON (送 DB 用)"""
    return {
        "fundamental": overall.fundamental.score,
        "chip": overall.chip.score,
        "technical": overall.technical.score,
        "catalyst": overall.catalyst.score,
        "market_adjustment": overall.market_adjustment,
        "base_score": overall.base_score,
        "total_score": overall.total_score,
        "confidence": overall.confidence,
        "recommendation": overall.recommendation,
    }


def score_one(stock_id: str, *, engine: Optional[DecisionEngine] = None) -> dict[str, Any]:
    """對單檔股票跑四象限, upsert 結果。回傳本次計分內容(含 tier)。"""
    engine = engine or DecisionEngine()
    svc = get_service_client()

    t0 = _time.time()
    result = engine.analyze(stock_id, skip_ai=True)
    total = int(result.score.total_score)
    tier = score_to_tier(total)
    breakdown = _breakdown_from_result(result.score)
    tpe_iso = now_tpe().isoformat()

    # 1. upsert 回 stocks 表
    svc.table("stocks").update(
        {
            "current_score": total,
            "current_tier": tier,
            "score_breakdown": breakdown,
            "tier_updated_at": tpe_iso,
        }
    ).eq("stock_id", stock_id).execute()

    # 2. 寫 history (insert, 保留每次快照)
    try:
        svc.table("stock_tier_history").insert(
            {
                "stock_id": stock_id,
                "score": total,
                "tier": tier,
                "breakdown": breakdown,
            }
        ).execute()
    except Exception as e:
        log.warning(f"history insert {stock_id} 失敗 (忽略): {e}")

    dt = _time.time() - t0
    log.info(f"  ✅ {stock_id} {result.stock_name} → {tier} ({total}/95) in {dt:.1f}s")
    return {
        "stock_id": stock_id,
        "stock_name": result.stock_name,
        "score": total,
        "tier": tier,
        "breakdown": breakdown,
        "elapsed": round(dt, 2),
    }


def run_all(only_active: bool = True, limit: Optional[int] = None) -> dict[str, Any]:
    """對 stocks 表所有 (active) 個股跑一遍, upsert 分數。"""
    svc = get_service_client()
    q = svc.table("stocks").select("stock_id,stock_name")
    if only_active:
        q = q.eq("is_active", True)
    if limit:
        q = q.limit(limit)
    rows = q.execute().data or []

    log.info(f"🎯 scoring_worker start: {len(rows)} stocks")
    engine = DecisionEngine()

    ok = 0
    errs: list[dict[str, str]] = []
    by_tier: dict[str, int] = {"C": 0, "N": 0, "R": 0, "SR": 0, "SSR": 0}
    t_all = _time.time()

    for i, r in enumerate(rows, 1):
        sid = r["stock_id"]
        try:
            out = score_one(sid, engine=engine)
            ok += 1
            by_tier[out["tier"]] = by_tier.get(out["tier"], 0) + 1
        except Exception as e:
            log.error(f"  ❌ {sid} 失敗: {type(e).__name__}: {e}")
            errs.append({"stock_id": sid, "error": f"{type(e).__name__}: {e}"})
        # 小小 sleep 避免 FinMind rate limit
        if i % 10 == 0:
            log.info(f"  ⏱  進度 {i}/{len(rows)} — 已完成 {ok}, 分布 {by_tier}")
            _time.sleep(1.0)

    dt_total = _time.time() - t_all
    summary = {
        "tpe_now": now_tpe().isoformat(),
        "total": len(rows),
        "ok": ok,
        "failed": len(errs),
        "by_tier": by_tier,
        "elapsed_sec": round(dt_total, 1),
        "errors": errs[:10],
    }
    log.info(f"🏁 scoring_worker done: {summary}")
    return summary


# ======================================================
# CLI: python -m backend.services.scoring_worker
# ======================================================
if __name__ == "__main__":
    import json
    import sys

    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    out = run_all(limit=limit)
    print(json.dumps(out, indent=2, ensure_ascii=False))
