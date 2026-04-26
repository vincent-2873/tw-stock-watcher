"""
STAGE1-T3a Defense 2: 資料品質防線

對 quack_predictions / quack_judgments 寫入前的 sanity check。

公開 API:
  validate_prediction_entry_price(symbol, entry_price, predicted_at)
    → (passed, reason, evidence)

  compute_basis_quality(deviation_pct) → str
    'precise' (<1%) / 'acceptable' (1-5%) / 'biased' (5-25%) / 'invalid' (>25%)

  enrich_evidence_with_quality(evidence, source, passed, reason, basis_evidence)
    → dict  (mutates evidence with 4 quality keys)

設計原則:
  1. 0 LLM 成本(只 query stock_prices_historical 表)
  2. reject 仍寫入 DB,前台 filter 把 reject 隱藏
     → Vincent 鐵律「不藏資料,留紀錄追蹤 LLM 行為」
  3. 5% 偏差閾值來自 T2.5 證實:
     BACKFILL p50=2.89%(低偏差) vs HOLDINGS p50=70%(高偏差)
     5% 是清楚切點

注意:
  目前(2026-04-26)Supabase DDL access 受阻(SUPABASE_DB_PASSWORD 過期),
  4 個 quality 欄位寫進 evidence JSONB 而非獨立 column。
  migration 檔(0018)已備好,DB 通了之後可清遷至 column。
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

log = logging.getLogger(__name__)


SANITY_DEVIATION_THRESHOLD_PCT = 5.0  # 寫入 reject 線
PRECISE_PCT = 1.0
ACCEPTABLE_PCT = 5.0
BIASED_PCT = 25.0


def compute_basis_quality(deviation_pct: float | None) -> str | None:
    """把偏差百分比分四級。

    precise   <1%
    acceptable 1-5%
    biased   5-25%
    invalid  >25%
    """
    if deviation_pct is None:
        return None
    d = abs(deviation_pct)
    if d < PRECISE_PCT:
        return "precise"
    if d < ACCEPTABLE_PCT:
        return "acceptable"
    if d < BIASED_PCT:
        return "biased"
    return "invalid"


def _query_real_close(symbol: str, predicted_at: date) -> float | None:
    """從 stock_prices_historical 撈最近一個 trade_date <= predicted_at 的 close。

    若 predicted_at 是週末/休市,會自動回退最近交易日(±5 日內)。
    """
    try:
        from backend.utils.supabase_client import get_service_client

        sb = get_service_client()
    except Exception as e:  # noqa: BLE001
        log.warning("data_quality: cannot get supabase client: %s", e)
        return None

    # 撈 predicted_at 前後 7 天最接近的 close
    start = (predicted_at - timedelta(days=7)).isoformat()
    end = predicted_at.isoformat()
    try:
        r = (
            sb.table("stock_prices_historical")
            .select("trade_date,close")
            .eq("stock_id", str(symbol))
            .gte("trade_date", start)
            .lte("trade_date", end)
            .order("trade_date", desc=True)
            .limit(1)
            .execute()
        )
        if r.data:
            return float(r.data[0]["close"])
    except Exception as e:  # noqa: BLE001
        log.warning("data_quality: query stock_prices_historical %s @%s failed: %s", symbol, predicted_at, e)
    return None


def validate_prediction_entry_price(
    symbol: str,
    entry_price: float | None,
    predicted_at: datetime | date,
) -> tuple[bool, str, dict[str, Any]]:
    """寫入 quack_predictions 前的 sanity check。

    回傳 (passed, reason, evidence):
      passed   — True 通過 / False 應該標 rejected_by_sanity
      reason   — 'ok' / 'no_real_close_available' / 'deviation_too_large'
                 / 'symbol_unknown' / 'invalid_input'
      evidence — {'real_close': X, 'deviation_pct': Y, 'threshold_pct': 5.0, ...}

    注意:回 False 不阻擋 INSERT,呼叫端應仍寫入但設 data_quality_status='rejected_by_sanity'。
    """
    if not symbol or entry_price is None:
        return False, "invalid_input", {
            "symbol": symbol,
            "entry_price": entry_price,
            "threshold_pct": SANITY_DEVIATION_THRESHOLD_PCT,
        }

    if isinstance(predicted_at, datetime):
        check_date = predicted_at.date()
    else:
        check_date = predicted_at

    real_close = _query_real_close(str(symbol), check_date)
    if real_close is None or real_close <= 0:
        return False, "no_real_close_available", {
            "symbol": str(symbol),
            "entry_price": float(entry_price),
            "real_close": None,
            "predicted_at": check_date.isoformat(),
            "threshold_pct": SANITY_DEVIATION_THRESHOLD_PCT,
        }

    deviation_pct = abs(float(entry_price) - real_close) / real_close * 100.0
    quality = compute_basis_quality(deviation_pct)
    passed = deviation_pct < SANITY_DEVIATION_THRESHOLD_PCT
    reason = "ok" if passed else "deviation_too_large"
    return passed, reason, {
        "symbol": str(symbol),
        "entry_price": float(entry_price),
        "real_close": real_close,
        "deviation_pct": round(deviation_pct, 4),
        "basis_quality": quality,
        "predicted_at": check_date.isoformat(),
        "threshold_pct": SANITY_DEVIATION_THRESHOLD_PCT,
    }


def enrich_evidence_with_quality(
    evidence: dict[str, Any] | None,
    source: str,
    passed: bool,
    reason: str,
    basis_evidence: dict[str, Any],
) -> dict[str, Any]:
    """回傳新的 evidence dict,加上 4 個品質欄位。

    新加的 keys (跟 migration 0018 column 同名):
      - source                 (例: 'llm_holdings')
      - data_quality_status    ('unverified' / 'rejected_by_sanity' / 'verified_clean')
      - basis_accuracy_pct     (numeric, 偏差 %)
      - basis_quality          ('precise' / 'acceptable' / 'biased' / 'invalid' / None)

    日後 0018 migration 套上之後,可從 evidence 把這四個 key 拷貝到欄位。
    """
    new = dict(evidence or {})
    new["source"] = source
    if not passed and reason == "deviation_too_large":
        new["data_quality_status"] = "rejected_by_sanity"
    elif passed and reason == "ok":
        new["data_quality_status"] = "verified_clean"
    else:
        new["data_quality_status"] = "unverified"  # 撈不到 close 等
    new["basis_accuracy_pct"] = basis_evidence.get("deviation_pct")
    new["basis_quality"] = basis_evidence.get("basis_quality")
    new["basis_check_reason"] = reason
    new["basis_check_real_close"] = basis_evidence.get("real_close")
    return new
