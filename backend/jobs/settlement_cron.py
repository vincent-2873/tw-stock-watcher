"""
STAGE1-T3a-cleanup 收尾 4: 結算 cron 框架(DISABLED)

⚠️ DISABLED until T3d ⚠️
原因:T2.6 觀察 B,quack_judgments(weekly_picks) 結算機制衝突。
T3d 修完 WEEKLY_PICKS prompt 跟 schema 衝突後才啟動 cron。

設計目標:
  1. 對 quack_predictions 中 settled_at IS NULL 且 deadline <= now() 的 row,
     抓 deadline 當日真實 close,套用 agent-specific judge logic,寫 hit_or_miss。
  2. 對 quack_judgments(weekly_picks) 中 settled_at IS NULL 且 judgment_date + 7d <= today 的 row,
     對每檔 pick 算 pick-wise hit,聚合成整批的 hit_or_miss。
  3. 全部 status update 寫 settle_method='auto_cron'。

呼叫方式:
  - 不註冊到 scheduler(T3a-cleanup 範圍只寫框架)
  - 手動測試走 scripts/t3a_settlement_manual_trigger.py
  - T3d 啟動後加進 GitHub Actions 或 backend background scheduler

公開 API:
  settle_pending_predictions(dry_run=True, limit=100, today=None)
    → { processed, hits, misses, errors, sample }
  settle_pending_weekly_picks(dry_run=True, limit=20, today=None)
    → { processed, hits, misses, errors, sample }
  run_all(dry_run=True)
    → { predictions: {...}, weekly_picks: {...} }

判 hit_or_miss 邏輯沿用 historical_backtest.JUDGE_BY_AGENT(strict/loose/quant/segmented...)。
"""
from __future__ import annotations

import logging
from datetime import date as date_type
from datetime import datetime, timedelta
from typing import Any

from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)


# ============================================================================
# DISABLED FLAG
# ============================================================================
# 改 True 之前必須先做完:
#   1. T3b 完成(HOLDINGS prompt 修好、新會議資料品質達標)
#   2. T3d 完成(WEEKLY_PICKS schema 修好、結算機制設計完整)
#   3. 跑過至少 1 輪 manual trigger 確認邏輯對
ENABLED = False


def _ensure_enabled() -> None:
    if not ENABLED:
        raise RuntimeError(
            "settlement_cron is DISABLED. "
            "Use scripts/t3a_settlement_manual_trigger.py for manual testing. "
            "Enable only after T3b + T3d complete."
        )


# ============================================================================
# Helpers
# ============================================================================

def _get_close_on_date(sb, symbol: str, target_date: date_type) -> float | None:
    """從 stock_prices_historical 撈 target_date 那日(或前 5 日內)的 close。"""
    start = (target_date - timedelta(days=5)).isoformat()
    try:
        r = (
            sb.table("stock_prices_historical")
            .select("trade_date,close")
            .eq("stock_id", str(symbol))
            .gte("trade_date", start)
            .lte("trade_date", target_date.isoformat())
            .order("trade_date", desc=True)
            .limit(1)
            .execute()
        )
        if r.data:
            return float(r.data[0]["close"])
    except Exception as e:  # noqa: BLE001
        log.warning("settlement_cron: close lookup %s @%s failed: %s", symbol, target_date, e)
    return None


def _judge_basic(direction: str, target_price: float, close_at_deadline: float, current_price: float | None) -> str:
    """T3a-cleanup 預設判定邏輯(strict + loose 折衷):
    bullish: close >= target_price → hit
    bearish: close <= target_price → hit
    神經中性 / 缺資料 → pending

    這是「只看終點 close」的嚴格判定,T3d 起 quack_judgments(weekly_picks)
    會切換到「整批 picks 的命中率聚合」邏輯。
    """
    if direction == "bullish":
        return "hit" if close_at_deadline >= target_price else "miss"
    if direction == "bearish":
        return "hit" if close_at_deadline <= target_price else "miss"
    # neutral 或方向缺,留 pending 由 T3d / 人工裁決
    return "pending"


# ============================================================================
# Predictions settlement
# ============================================================================

def settle_pending_predictions(
    *, dry_run: bool = True, limit: int = 100, today: date_type | None = None,
) -> dict[str, Any]:
    """結算 quack_predictions 中 evaluated_at IS NULL 且 deadline 已過的預測。

    對齊現存 schema 用 evaluated_at / actual_price_at_deadline / hit_or_miss
    (T3a-cleanup migration 0019 只新增 settle_method 區分結算來源)。

    Args:
        dry_run: True 不寫 DB,只報結果
        limit: 一次處理上限
        today: 視為「今天」的日期(預設 now_tpe().date())

    回傳:
        {processed, hits, misses, pending, errors, sample(前 5 筆)}
    """
    if today is None:
        today = now_tpe().date()
    sb = get_service_client()

    today_iso = today.isoformat()
    r = (
        sb.table("quack_predictions")
        .select("id,target_symbol,direction,target_price,current_price_at_prediction,deadline,evaluated_at")
        .is_("evaluated_at", "null")
        .lte("deadline", today_iso + "T23:59:59")
        .limit(limit)
        .execute()
    )
    rows = r.data or []
    if not rows:
        return {"processed": 0, "hits": 0, "misses": 0, "pending": 0, "errors": 0, "sample": []}

    hits = misses = pending = errors = 0
    sample: list[dict[str, Any]] = []

    for row in rows:
        try:
            target_price = row.get("target_price")
            symbol = row.get("target_symbol")
            direction = row.get("direction") or "bullish"
            cur_price = row.get("current_price_at_prediction")
            deadline_str = row.get("deadline") or today_iso
            deadline_dt = date_type.fromisoformat(deadline_str[:10])

            if target_price is None or not symbol:
                pending += 1
                continue

            close = _get_close_on_date(sb, str(symbol), deadline_dt)
            if close is None:
                pending += 1
                continue

            verdict = _judge_basic(direction, float(target_price), close, cur_price)
            if verdict == "hit":
                hits += 1
            elif verdict == "miss":
                misses += 1
            else:
                pending += 1
                continue

            if not dry_run:
                update_payload = {
                    "evaluated_at": now_tpe().isoformat(),
                    "actual_price_at_deadline": close,
                    "hit_or_miss": verdict,
                }
                # settle_method 是 0019 才加的、若 column 不存在會報錯,
                # try 加上去、失敗就 fallback 不寫
                try:
                    sb.table("quack_predictions").update(
                        {**update_payload, "settle_method": "auto_cron"}
                    ).eq("id", row["id"]).execute()
                except Exception:
                    sb.table("quack_predictions").update(update_payload).eq("id", row["id"]).execute()

            if len(sample) < 5:
                sample.append({
                    "id": row["id"], "symbol": symbol, "direction": direction,
                    "target": target_price, "close": close, "verdict": verdict,
                })
        except Exception as e:  # noqa: BLE001
            errors += 1
            log.exception("settle pred id=%s failed: %s", row.get("id"), e)

    return {
        "processed": len(rows),
        "hits": hits, "misses": misses, "pending": pending, "errors": errors,
        "dry_run": dry_run, "sample": sample,
    }


# ============================================================================
# Weekly picks settlement (T3d 啟動)
# ============================================================================

def settle_pending_weekly_picks(
    *, dry_run: bool = True, limit: int = 20, today: date_type | None = None,
) -> dict[str, Any]:
    """結算 quack_judgments(weekly_picks)。

    每筆 weekly_picks judgment 有 ~10 個 picks,每個 pick 算 pick-wise hit,
    聚合(>=60% hit 算整批 hit)。
    """
    if today is None:
        today = now_tpe().date()
    sb = get_service_client()

    deadline_cutoff = (today - timedelta(days=7)).isoformat()  # weekly_picks 預設 7 天 deadline

    # T3a-cleanup: settled_at column on quack_judgments is added by migration 0019
    # (尚未 apply 因為 DB password 過期).在 column 還沒有的環境,本函數會 raise 一次
    # APIError、由 caller 處理(manual trigger 會 catch 並回 'pending blocked by schema')。
    try:
        r = (
            sb.table("quack_judgments")
            .select("id,judgment_type,judgment_date,content_json,settled_at")
            .eq("judgment_type", "weekly_picks")
            .is_("settled_at", "null")
            .lte("judgment_date", deadline_cutoff)
            .limit(limit)
            .execute()
        )
    except Exception as e:
        msg = str(e)
        if "settled_at" in msg and "does not exist" in msg:
            return {
                "processed": 0, "hits": 0, "misses": 0, "pending": 0, "errors": 0,
                "sample": [],
                "schema_pending": "migration 0019 not yet applied — quack_judgments.settled_at missing",
            }
        raise
    rows = r.data or []
    if not rows:
        return {"processed": 0, "hits": 0, "misses": 0, "pending": 0, "errors": 0, "sample": []}

    hits = misses = pending = errors = 0
    sample: list[dict[str, Any]] = []

    for row in rows:
        try:
            content = row.get("content_json") or {}
            picks = content.get("picks") or []
            if not picks:
                pending += 1
                continue
            judgment_date = date_type.fromisoformat(row["judgment_date"])
            deadline = judgment_date + timedelta(days=7)

            pick_results: list[dict[str, Any]] = []
            for p in picks:
                symbol = str(p.get("symbol", ""))
                target = p.get("target_price")
                direction = p.get("direction", "bullish")
                if not symbol or target is None:
                    continue
                close = _get_close_on_date(sb, symbol, deadline)
                if close is None:
                    pick_results.append({"symbol": symbol, "verdict": "no_data"})
                    continue
                verdict = _judge_basic(direction, float(target), close, None)
                pick_results.append({"symbol": symbol, "verdict": verdict, "close": close})

            settled_picks = [p for p in pick_results if p.get("verdict") in ("hit", "miss")]
            hit_count = sum(1 for p in pick_results if p.get("verdict") == "hit")
            if not settled_picks:
                pending += 1
                continue

            hit_rate = hit_count / len(settled_picks)
            overall = "hit" if hit_rate >= 0.60 else "miss"
            if overall == "hit":
                hits += 1
            else:
                misses += 1

            avg_close = (
                sum(p["close"] for p in pick_results if "close" in p) / max(1, len([p for p in pick_results if "close" in p]))
            )

            if not dry_run:
                sb.table("quack_judgments").update({
                    "settled_at": now_tpe().isoformat(),
                    "settled_close": round(avg_close, 2),
                    "hit_or_miss": overall,
                    "settle_method": "auto_cron",
                }).eq("id", row["id"]).execute()

            if len(sample) < 5:
                sample.append({
                    "id": row["id"], "judgment_date": row["judgment_date"],
                    "n_picks": len(picks), "hit_rate": round(hit_rate, 3),
                    "overall": overall,
                })
        except Exception as e:  # noqa: BLE001
            errors += 1
            log.exception("settle weekly_picks id=%s failed: %s", row.get("id"), e)

    return {
        "processed": len(rows),
        "hits": hits, "misses": misses, "pending": pending, "errors": errors,
        "dry_run": dry_run, "sample": sample,
    }


# ============================================================================
# Entry point
# ============================================================================

def run_all(*, dry_run: bool = True, today: date_type | None = None) -> dict[str, Any]:
    """T3d 啟動後 cron 進入點。預設 dry_run=True。

    啟動前必須:
      1. ENABLED = True
      2. _ensure_enabled() 通過
    """
    if not dry_run:
        _ensure_enabled()  # 寫入 DB 前才檢查
    return {
        "predictions": settle_pending_predictions(dry_run=dry_run, today=today),
        "weekly_picks": settle_pending_weekly_picks(dry_run=dry_run, today=today),
    }
