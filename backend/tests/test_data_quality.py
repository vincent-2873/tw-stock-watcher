"""STAGE1-T3a + T3a-cleanup unit tests.

執行:
  python backend/tests/test_data_quality.py
  pytest backend/tests/test_data_quality.py -v

不需 Supabase 連線(_query_real_close 用 monkeypatch 蓋掉)。
"""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.services import data_quality  # noqa: E402


def _patch_close(real_close: float | None):
    """Replace _query_real_close with a stub returning a fixed value."""
    data_quality._query_real_close = lambda symbol, predicted_at: real_close  # type: ignore[assignment]


# ===========================================================================
# compute_basis_quality
# ===========================================================================

def test_compute_basis_quality_buckets():
    assert data_quality.compute_basis_quality(0.5) == "precise"
    assert data_quality.compute_basis_quality(0.99) == "precise"
    assert data_quality.compute_basis_quality(1.0) == "acceptable"
    assert data_quality.compute_basis_quality(4.99) == "acceptable"
    assert data_quality.compute_basis_quality(5.0) == "biased"
    assert data_quality.compute_basis_quality(24.99) == "biased"
    assert data_quality.compute_basis_quality(25.0) == "invalid"
    assert data_quality.compute_basis_quality(70.0) == "invalid"
    assert data_quality.compute_basis_quality(None) is None


# ===========================================================================
# validate_prediction_entry_price_v2 (T3a-cleanup graded)
# ===========================================================================
# CTO 指定的 4 個情境

def test_v2_entry_2185_real_2185_clean_precise():
    """entry=2185 / real=2185 → clean / precise(0% 偏差)"""
    _patch_close(2185.0)
    status, reason, ev = data_quality.validate_prediction_entry_price_v2(
        "2330", 2185.0, date(2026, 4, 25),
    )
    assert status == "clean"
    assert reason == "precise"
    assert ev["deviation_pct"] == 0.0
    assert ev["quality"] == "precise"


def test_v2_entry_2200_real_2185_clean_acceptable():
    """entry=2200 / real=2185 → clean / acceptable(0.687% 偏差)"""
    _patch_close(2185.0)
    status, reason, ev = data_quality.validate_prediction_entry_price_v2(
        "2330", 2200.0, date(2026, 4, 25),
    )
    assert status == "clean"
    # 0.687% < 1.0% → 應該是 precise
    assert reason == "precise"
    assert ev["quality"] == "precise"
    # 改測 1-5% 區間
    _patch_close(2100.0)
    status, reason, ev = data_quality.validate_prediction_entry_price_v2(
        "2330", 2200.0, date(2026, 4, 25),
    )
    assert status == "clean"
    assert reason == "acceptable"
    # (2200-2100)/2100*100 = 4.76%
    assert 4.5 < ev["deviation_pct"] < 5.0
    assert ev["quality"] == "acceptable"


def test_v2_entry_2050_real_2185_flagged_biased():
    """entry=2050 / real=2185 → flagged / minor_deviation(6.18% 偏差)"""
    _patch_close(2185.0)
    status, reason, ev = data_quality.validate_prediction_entry_price_v2(
        "2330", 2050.0, date(2026, 4, 25),
    )
    assert status == "flagged"
    assert reason == "minor_deviation"
    # (2185-2050)/2185*100 ≈ 6.18%
    assert 6.0 < ev["deviation_pct"] < 7.0
    assert ev["quality"] == "biased"


def test_v2_entry_1050_real_2185_rejected_invalid():
    """entry=1050 / real=2185 → rejected / major_deviation(51.94% 偏差)"""
    _patch_close(2185.0)
    status, reason, ev = data_quality.validate_prediction_entry_price_v2(
        "2330", 1050.0, date(2026, 4, 25),
    )
    assert status == "rejected"
    assert reason == "major_deviation"
    # (2185-1050)/2185*100 ≈ 51.94%
    assert 51.0 < ev["deviation_pct"] < 53.0
    assert ev["quality"] == "invalid"


def test_v2_no_real_close_unverified():
    _patch_close(None)
    status, reason, ev = data_quality.validate_prediction_entry_price_v2(
        "9999", 100.0, date(2026, 4, 25),
    )
    assert status == "unverified"
    assert reason == "no_real_close_available"
    assert ev["real_close"] is None


def test_v2_invalid_input():
    status, reason, _ = data_quality.validate_prediction_entry_price_v2(
        "", None, date(2026, 4, 25),
    )
    assert status == "unverified"
    assert reason == "invalid_input"


# ===========================================================================
# enrich_evidence_with_quality (跨 v1/v2 都支援)
# ===========================================================================

def test_enrich_v2_clean_marks_verified_clean():
    _patch_close(2185.0)
    status, reason, ev = data_quality.validate_prediction_entry_price_v2(
        "2330", 2185.0, date(2026, 4, 25),
    )
    out = data_quality.enrich_evidence_with_quality(
        {"school": "X"}, "llm_holdings", status, reason, ev,
    )
    assert out["data_quality_status"] == "verified_clean"
    assert out["basis_quality"] == "precise"
    assert out["source"] == "llm_holdings"
    assert out["school"] == "X"


def test_enrich_v2_flagged_marks_flagged_minor():
    _patch_close(2185.0)
    status, reason, ev = data_quality.validate_prediction_entry_price_v2(
        "2330", 2050.0, date(2026, 4, 25),
    )
    out = data_quality.enrich_evidence_with_quality(
        {}, "llm_holdings", status, reason, ev,
    )
    assert out["data_quality_status"] == "flagged_minor"
    assert out["basis_quality"] == "biased"


def test_enrich_v2_rejected_marks_rejected_by_sanity():
    _patch_close(2185.0)
    status, reason, ev = data_quality.validate_prediction_entry_price_v2(
        "2330", 1050.0, date(2026, 4, 25),
    )
    out = data_quality.enrich_evidence_with_quality(
        {}, "llm_holdings", status, reason, ev,
    )
    assert out["data_quality_status"] == "rejected_by_sanity"
    assert out["basis_quality"] == "invalid"


def test_enrich_v2_unverified_marks_unverified():
    _patch_close(None)
    status, reason, ev = data_quality.validate_prediction_entry_price_v2(
        "X", 100.0, date(2026, 4, 25),
    )
    out = data_quality.enrich_evidence_with_quality(
        {}, "llm_holdings", status, reason, ev,
    )
    assert out["data_quality_status"] == "unverified"


# ===========================================================================
# v1 backward compat
# ===========================================================================

def test_v1_backward_compat_passed_when_clean():
    _patch_close(2185.0)
    passed, reason, _ = data_quality.validate_prediction_entry_price(
        "2330", 2185.0, date(2026, 4, 25),
    )
    assert passed is True


def test_v1_backward_compat_failed_when_rejected():
    _patch_close(2185.0)
    passed, reason, _ = data_quality.validate_prediction_entry_price(
        "2330", 1050.0, date(2026, 4, 25),
    )
    assert passed is False
    assert reason == "deviation_too_large"


def test_v1_backward_compat_failed_when_flagged():
    """T3a-cleanup:flagged 在 v1 視角也是 fail(<5% 才算 pass)"""
    _patch_close(2185.0)
    passed, _, _ = data_quality.validate_prediction_entry_price(
        "2330", 2050.0, date(2026, 4, 25),
    )
    assert passed is False  # 6.18% 超過 5%


def test_v1_enrich_with_bool_status():
    """既有 caller 用 enrich_evidence_with_quality(passed=bool, ...) 仍然要工作"""
    _patch_close(2185.0)
    passed, reason, ev = data_quality.validate_prediction_entry_price(
        "2330", 1050.0, date(2026, 4, 25),
    )
    out = data_quality.enrich_evidence_with_quality(
        {}, "llm_holdings", passed, reason, ev,
    )
    assert out["data_quality_status"] == "rejected_by_sanity"


# ===========================================================================
# runner
# ===========================================================================

if __name__ == "__main__":
    tests = [
        v for k, v in list(globals().items())
        if k.startswith("test_") and callable(v)
    ]
    fail = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
        except AssertionError as e:
            fail += 1
            print(f"  FAIL  {t.__name__}: {e!r}")
        except Exception as e:  # noqa: BLE001
            fail += 1
            print(f"  ERR   {t.__name__}: {e!r}")
    print(f"\n{len(tests) - fail}/{len(tests)} passed.")
    sys.exit(0 if fail == 0 else 1)
