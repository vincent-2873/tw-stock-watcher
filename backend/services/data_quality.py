"""
STAGE1-T3a / T3a-cleanup: 資料品質防線

對 quack_predictions / quack_judgments 寫入前的 sanity check。

T3a 原版:單一 5% reject 閾值
T3a-cleanup 升級:三段 grading
  status='clean'    deviation < 5%   → 寫入,標 verified_clean
  status='flagged'  5% ≤ dev < 25%   → 寫入,標 flagged_minor,log warning
  status='rejected' deviation ≥ 25%  → 寫入(留紀錄),標 rejected_by_sanity,log error

公開 API:
  validate_prediction_entry_price_v2(symbol, entry_price, predicted_at)
    → (status: 'clean'/'flagged'/'rejected'/'unverified', reason, evidence)

  compute_basis_quality(deviation_pct) → str
    'precise' (<1%) / 'acceptable' (1-5%) / 'biased' (5-25%) / 'invalid' (>25%)

  enrich_evidence_with_quality(evidence, source, status, reason, basis_evidence)
    → dict  (mutates evidence with 4 quality keys)

舊 API(向下相容、T3a 原版):
  validate_prediction_entry_price(symbol, entry_price, predicted_at)
    → (passed: bool, reason: str, evidence: dict)
    包裝 v2,passed=True 只在 status='clean' 時為 True

設計原則:
  1. 0 LLM 成本(只 query stock_prices_historical 表)
  2. 全部 status 都寫入 DB,前台 filter 隱藏 rejected + flagged 級
     → Vincent 鐵律「不藏資料,留紀錄追蹤 LLM 行為」
  3. 三段切點根據 T2.5 + T3a 實證:
     - <1% precise(BACKFILL 20% 落點)
     - 1-5% acceptable(BACKFILL 39% 落點,p50=2.89% 在這段)
     - 5-25% biased(BACKFILL 21% 落點,但 HOLDINGS 17% 也落這、需警示)
     - ≥25% invalid(HOLDINGS 大宗 80%,堅決 reject)
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

log = logging.getLogger(__name__)


# T3a-cleanup 三段切點
PRECISE_PCT = 1.0
ACCEPTABLE_PCT = 5.0
BIASED_PCT = 25.0
# T3a 原版單一閾值(向下相容用)
SANITY_DEVIATION_THRESHOLD_PCT = ACCEPTABLE_PCT  # = 5.0


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

    若 predicted_at 是週末/休市,會自動回退最近交易日(±7 日內)。
    """
    try:
        from backend.utils.supabase_client import get_service_client

        sb = get_service_client()
    except Exception as e:  # noqa: BLE001
        log.warning("data_quality: cannot get supabase client: %s", e)
        return None

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
        log.warning(
            "data_quality: query stock_prices_historical %s @%s failed: %s",
            symbol, predicted_at, e,
        )
    return None


# ============================================================================
# v2: graded API(T3a-cleanup)
# ============================================================================

def validate_prediction_entry_price_v2(
    symbol: str,
    entry_price: float | None,
    predicted_at: datetime | date,
) -> tuple[str, str, dict[str, Any]]:
    """寫入前的 graded sanity check。

    回傳 (status, reason, evidence):
      status   — 'clean' / 'flagged' / 'rejected' / 'unverified'
      reason   — 'precise' / 'acceptable' / 'minor_deviation' / 'major_deviation'
                 / 'no_real_close_available' / 'invalid_input'
      evidence — {'real_close', 'deviation_pct', 'quality': basis_quality, 'threshold_pcts'}

    切點:
      < 1%   → clean / precise
      < 5%   → clean / acceptable
      < 25%  → flagged / minor_deviation(寫入 + 警示標)
      ≥ 25%  → rejected / major_deviation(寫入 + 統計面隱藏)
      無 close → unverified / no_real_close_available
    """
    if not symbol or entry_price is None:
        return "unverified", "invalid_input", {
            "symbol": symbol,
            "entry_price": entry_price,
            "threshold_pcts": {"precise": PRECISE_PCT, "acceptable": ACCEPTABLE_PCT, "biased": BIASED_PCT},
        }

    if isinstance(predicted_at, datetime):
        check_date = predicted_at.date()
    else:
        check_date = predicted_at

    real_close = _query_real_close(str(symbol), check_date)
    if real_close is None or real_close <= 0:
        return "unverified", "no_real_close_available", {
            "symbol": str(symbol),
            "entry_price": float(entry_price),
            "real_close": None,
            "predicted_at": check_date.isoformat(),
            "threshold_pcts": {"precise": PRECISE_PCT, "acceptable": ACCEPTABLE_PCT, "biased": BIASED_PCT},
        }

    deviation_pct = abs(float(entry_price) - real_close) / real_close * 100.0
    quality = compute_basis_quality(deviation_pct)
    base_ev = {
        "symbol": str(symbol),
        "entry_price": float(entry_price),
        "real_close": real_close,
        "deviation_pct": round(deviation_pct, 4),
        "quality": quality,
        "predicted_at": check_date.isoformat(),
        "threshold_pcts": {"precise": PRECISE_PCT, "acceptable": ACCEPTABLE_PCT, "biased": BIASED_PCT},
    }

    if deviation_pct < PRECISE_PCT:
        return "clean", "precise", base_ev
    if deviation_pct < ACCEPTABLE_PCT:
        return "clean", "acceptable", base_ev
    if deviation_pct < BIASED_PCT:
        return "flagged", "minor_deviation", base_ev
    return "rejected", "major_deviation", base_ev


def enrich_evidence_with_quality(
    evidence: dict[str, Any] | None,
    source: str,
    status: str | bool,
    reason: str,
    basis_evidence: dict[str, Any],
) -> dict[str, Any]:
    """回傳新的 evidence dict,加上 4 個品質欄位。

    新加的 keys (跟 migration 0018 column 同名):
      - source                 (例: 'llm_holdings')
      - data_quality_status    ('verified_clean' / 'flagged_minor' / 'rejected_by_sanity' / 'unverified')
      - basis_accuracy_pct     (numeric, 偏差 %)
      - basis_quality          ('precise' / 'acceptable' / 'biased' / 'invalid' / None)

    `status` 接受 v2 三態('clean'/'flagged'/'rejected'/'unverified')或 v1 bool(True/False)。
    v1 bool 會被映射成 v2 的對應狀態,確保 T3a 原本呼叫端不破壞。
    """
    new = dict(evidence or {})
    new["source"] = source
    if isinstance(status, bool):
        # 舊 API 包裝:passed=True → clean, passed=False & deviation_too_large → rejected
        if status:
            new_status = "verified_clean"
        elif reason == "deviation_too_large":
            new_status = "rejected_by_sanity"
        elif reason in ("no_real_close_available", "invalid_input"):
            new_status = "unverified"
        else:
            new_status = "unverified"
    else:
        if status == "clean":
            new_status = "verified_clean"
        elif status == "flagged":
            new_status = "flagged_minor"
        elif status == "rejected":
            new_status = "rejected_by_sanity"
        else:
            new_status = "unverified"
    new["data_quality_status"] = new_status
    new["basis_accuracy_pct"] = basis_evidence.get("deviation_pct")
    new["basis_quality"] = basis_evidence.get("quality") or basis_evidence.get("basis_quality")
    new["basis_check_reason"] = reason
    new["basis_check_real_close"] = basis_evidence.get("real_close")
    return new


# ============================================================================
# v1: 向下相容(T3a 原版簽名,wraps v2)
# ============================================================================

def validate_prediction_entry_price(
    symbol: str,
    entry_price: float | None,
    predicted_at: datetime | date,
) -> tuple[bool, str, dict[str, Any]]:
    """T3a 原版單一 5% reject API。

    這個函數內部呼叫 v2、把 status 映射回 bool:
      status='clean' → passed=True
      status in ('flagged','rejected','unverified') → passed=False

    新呼叫端應該用 validate_prediction_entry_price_v2() 拿三態 status。
    """
    status, reason, ev = validate_prediction_entry_price_v2(symbol, entry_price, predicted_at)
    passed = status == "clean"
    # 把 v2 reason 對應回 v1 reason 字串,讓 T3a 既有 caller 不破壞
    if reason == "minor_deviation" or reason == "major_deviation":
        v1_reason = "deviation_too_large"
    else:
        v1_reason = "ok" if status == "clean" else reason
    # ev 補一個 v1 風格的 basis_quality key(跟 v2 'quality' 一樣)
    if "quality" in ev and "basis_quality" not in ev:
        ev["basis_quality"] = ev["quality"]
    return passed, v1_reason, ev


# ============================================================================
# logging helper
# ============================================================================

def log_sanity_result(
    status: str,
    reason: str,
    *,
    agent_id: str,
    symbol: str,
    entry_price: float | None,
    real_close: float | None,
    deviation_pct: float | None,
    source: str,
) -> None:
    """T3a-cleanup:對應三態寫不同 log level。

    clean    → debug(噪音少)
    flagged  → warning(要留意但接受)
    rejected → error(高偏差,代表 LLM 可能在抄訓練記憶)
    unverified → info(撈不到 real close)
    """
    payload = (
        f"sanity {status}/{reason} src={source} agent={agent_id} sym={symbol} "
        f"entry={entry_price} real={real_close} dev={deviation_pct}%"
    )
    if status == "clean":
        log.debug(payload)
    elif status == "flagged":
        log.warning(payload)
    elif status == "rejected":
        log.error(payload)
    else:
        log.info(payload)
