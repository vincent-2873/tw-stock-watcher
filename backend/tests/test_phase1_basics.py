"""
Phase 1 驗收測試 — 確認基礎模組能運作

跑法:
    cd vincent-stock-v2
    pip install -r backend/requirements.txt
    python -m pytest backend/tests/test_phase1_basics.py -v

注意:
- 真實 API 呼叫只在有 env 時才跑(否則 skip)
- 這裡的目標是確認 import 沒問題 + 基礎邏輯正確
"""

import os

import pytest

from backend.services.finmind_service import FinMindService
from backend.services.fmp_service import FMPService
from backend.utils.logger import configure_logging, get_logger
from backend.utils.supabase_client import get_client, get_service_client, health_check


# ==========================================
# 測試 1:Logger 與 imports
# ==========================================
def test_logger_works():
    """Logger 模組可以設定 + 取用"""
    configure_logging(level="DEBUG")
    log = get_logger("test_phase1")
    log.info("Phase 1 logger 測試")
    assert log is not None


def test_finmind_service_instantiate():
    """FinMindService 可以被實例化(沒有 env 也要能建)"""
    svc = FinMindService()
    assert svc is not None
    assert hasattr(svc, "get_stock_price")
    assert hasattr(svc, "get_institutional_investors")
    assert hasattr(svc, "get_broker_trades")


def test_fmp_service_instantiate():
    """FMPService 可以被實例化"""
    svc = FMPService()
    assert svc is not None
    assert hasattr(svc, "get_quote")
    assert hasattr(svc, "get_profile")
    assert hasattr(svc, "get_historical")


# ==========================================
# 測試 2:有 env 時的真實呼叫(自動 skip)
# ==========================================
@pytest.mark.skipif(not os.getenv("FINMIND_TOKEN"), reason="需 FINMIND_TOKEN")
def test_finmind_stock_price_2317():
    """能從 FinMind 抓到鴻海近 7 天股價"""
    from datetime import date, timedelta

    svc = FinMindService()
    start = (date.today() - timedelta(days=14)).isoformat()
    data, meta = svc.get_stock_price("2317", start)

    assert isinstance(data, list)
    assert len(data) > 0, "鴻海過去 14 天應有交易資料"
    assert "close" in data[0]
    assert meta.source == "finmind"
    assert meta.fetched_at is not None


@pytest.mark.skipif(not os.getenv("FMP_API_KEY"), reason="需 FMP_API_KEY")
def test_fmp_quote_aapl():
    """能從 FMP 抓到蘋果報價"""
    svc = FMPService()
    data, meta = svc.get_quote("AAPL")
    assert isinstance(data, list)
    assert len(data) > 0, "AAPL 應有報價"
    assert "price" in data[0]


# ==========================================
# 測試 3:Supabase 連線
# ==========================================
@pytest.mark.skipif(
    not (os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_KEY")),
    reason="需 SUPABASE_URL 與 SUPABASE_SERVICE_KEY",
)
def test_supabase_health():
    """Supabase 能連線"""
    assert health_check() is True


@pytest.mark.skipif(
    not (os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY")),
    reason="需 SUPABASE_URL 與 SUPABASE_ANON_KEY",
)
def test_supabase_anon_client():
    """取得 anon client 不會拋例外"""
    sb = get_client()
    assert sb is not None
