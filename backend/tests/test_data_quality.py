"""STAGE1-T3a Defense 2 unit tests.

執行:
  python -m pytest backend/tests/test_data_quality.py -v
  python backend/tests/test_data_quality.py   (純 stdlib)

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


# ---------- compute_basis_quality ----------

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


# ---------- validate_prediction_entry_price ----------

def test_validate_passed_within_5pct():
    _patch_close(2185.0)
    passed, reason, ev = data_quality.validate_prediction_entry_price(
        "2330", 2200.0, date(2026, 4, 25),
    )
    assert passed is True
    assert reason == "ok"
    assert ev["real_close"] == 2185.0
    assert ev["deviation_pct"] is not None
    assert ev["deviation_pct"] < 5.0
    assert ev["basis_quality"] in {"precise", "acceptable"}


def test_validate_rejected_deviation_too_large():
    """模擬 LLM 寫 entry_price=1050、symbol=2330、predicted_at=今天:
    real_close=2185、deviation~51.9% → reject。"""
    _patch_close(2185.0)
    passed, reason, ev = data_quality.validate_prediction_entry_price(
        "2330", 1050.0, date(2026, 4, 25),
    )
    assert passed is False
    assert reason == "deviation_too_large"
    assert 51.0 < ev["deviation_pct"] < 53.0  # ≈ 51.9%
    assert ev["basis_quality"] == "invalid"


def test_validate_no_real_close():
    _patch_close(None)
    passed, reason, ev = data_quality.validate_prediction_entry_price(
        "9999", 100.0, date(2026, 4, 25),
    )
    assert passed is False
    assert reason == "no_real_close_available"
    assert ev["real_close"] is None


def test_validate_invalid_input():
    passed, reason, _ = data_quality.validate_prediction_entry_price(
        "", None, date(2026, 4, 25),
    )
    assert passed is False
    assert reason == "invalid_input"


# ---------- enrich_evidence_with_quality ----------

def test_enrich_rejected_marks_status():
    _patch_close(2185.0)
    passed, reason, ev = data_quality.validate_prediction_entry_price(
        "2330", 1050.0, date(2026, 4, 25),
    )
    base = {"school": "技術派"}
    out = data_quality.enrich_evidence_with_quality(
        base, "llm_holdings", passed, reason, ev,
    )
    assert out["source"] == "llm_holdings"
    assert out["data_quality_status"] == "rejected_by_sanity"
    assert out["basis_quality"] == "invalid"
    assert out["basis_accuracy_pct"] > 50.0
    assert out["school"] == "技術派"  # original keys preserved


def test_enrich_passed_marks_verified_clean():
    _patch_close(100.0)
    passed, reason, ev = data_quality.validate_prediction_entry_price(
        "1234", 100.5, date(2026, 4, 25),
    )
    out = data_quality.enrich_evidence_with_quality(
        None, "llm_backfill", passed, reason, ev,
    )
    assert out["data_quality_status"] == "verified_clean"
    assert out["source"] == "llm_backfill"


def test_enrich_no_close_unverified():
    _patch_close(None)
    passed, reason, ev = data_quality.validate_prediction_entry_price(
        "X", 100.0, date(2026, 4, 25),
    )
    out = data_quality.enrich_evidence_with_quality(
        {}, "llm_test", passed, reason, ev,
    )
    assert out["data_quality_status"] == "unverified"
    assert out["basis_accuracy_pct"] is None


# ---------- runner ----------

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
