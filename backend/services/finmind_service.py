"""
FinMind Service — 台股資料源主要提供者

FinMind: https://finmindtrade.com
- 免費版:500 req/hr
- 付費版 NT$390/月:無限制

本 service 封裝常用的資料集,所有方法:
1. 自動帶 token(從 env 取)
2. 回傳 Python dict / pandas DataFrame 兼顧
3. 失敗時回傳空結果 + log(不拋例外,上層自行判斷)
4. 每筆資料附 fetched_at(遵守「資料新鮮度」規則)
5. 有 retry(網路短暫失敗時)

規格參考:
- spec 08:API 申請教學
- spec 17:資料新鮮度鐵律
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Optional

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from backend.utils.logger import get_logger
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

FINMIND_BASE = "https://api.finmindtrade.com/api/v4/data"
DEFAULT_TIMEOUT = 15.0

# 快取:某些 dataset 免費版 400,快取 3600s 避免反覆打浪費時間
import time as _time

_DATASET_BLACKLIST: dict[str, float] = {}
_BLACKLIST_TTL = 3600  # 1 小時


@dataclass
class FetchMeta:
    """資料來源 metadata(給 spec 17 新鮮度檢查用)"""
    source: str
    fetched_at: datetime
    dataset: str
    params: dict[str, Any]


class FinMindService:
    """
    FinMind API 封裝。所有方法都是 instance method 方便注入 mock 於測試。
    """

    def __init__(self, token: Optional[str] = None, timeout: float = DEFAULT_TIMEOUT):
        self.token = token or os.getenv("FINMIND_TOKEN", "")
        self.timeout = timeout
        if not self.token:
            log.warning("FINMIND_TOKEN 未設定,只能用有限的免費呼叫(每小時 500 次)")

    # ==========================================
    # 內部:通用 fetch
    # ==========================================
    @retry(
        retry=retry_if_exception_type(httpx.RequestError),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        reraise=False,
    )
    def _fetch(self, dataset: str, params: dict[str, Any]) -> list[dict]:
        """
        取 FinMind 資料。錯誤處理:
          - network error -> retry(tenacity)
          - 4xx (400/401/402 需付費/403) -> 不 retry,加黑名單 1hr
          - 5xx -> retry 一次後回 []
          - status != 200 in JSON -> 回 [] + log warn
        """
        # 黑名單短路:免費版不支援的 dataset 直接回空,不再打 API
        blacklisted_until = _DATASET_BLACKLIST.get(dataset)
        if blacklisted_until and _time.time() < blacklisted_until:
            return []

        query = {
            "dataset": dataset,
            **params,
            **({"token": self.token} if self.token else {}),
        }
        try:
            r = httpx.get(FINMIND_BASE, params=query, timeout=self.timeout)
            if 400 <= r.status_code < 500:
                snippet = r.text[:200] if r.text else ""
                # 加黑名單避免 1hr 內反覆打
                _DATASET_BLACKLIST[dataset] = _time.time() + _BLACKLIST_TTL
                log.warning(
                    f"FinMind {dataset} HTTP {r.status_code} → 黑名單 1hr — "
                    f"可能免費版不支援: {snippet}"
                )
                return []
            r.raise_for_status()
            j = r.json()
            if j.get("status") != 200:
                log.warning(f"FinMind {dataset} 非成功: {j.get('msg')}")
                return []
            return j.get("data", []) or []
        except httpx.RequestError:
            raise
        except Exception as e:
            log.error(f"FinMind {dataset} 例外: {e}")
            return []

    # ==========================================
    # 公開 API:個股資料
    # ==========================================
    def get_stock_price(
        self,
        stock_id: str,
        start_date: str | date,
        end_date: str | date | None = None,
    ) -> tuple[list[dict], FetchMeta]:
        """
        取得股票日線資料(開高低收量)。

        Args:
            stock_id: 股票代號(例 "2330")
            start_date: 起始日 "YYYY-MM-DD" 或 date
            end_date: 結束日,None = 今天

        Returns:
            (data, meta) — data 是 dict list,meta 帶 fetched_at
        """
        s = start_date.isoformat() if isinstance(start_date, date) else start_date
        e = end_date.isoformat() if isinstance(end_date, date) else end_date
        params = {"data_id": stock_id, "start_date": s}
        if e:
            params["end_date"] = e
        data = self._fetch("TaiwanStockPrice", params)
        meta = FetchMeta("finmind", now_tpe(), "TaiwanStockPrice", params)
        return data, meta

    def get_institutional_investors(
        self,
        stock_id: str,
        start_date: str | date,
        end_date: str | date | None = None,
    ) -> tuple[list[dict], FetchMeta]:
        """三大法人買賣超(外資/投信/自營)"""
        s = start_date.isoformat() if isinstance(start_date, date) else start_date
        e = end_date.isoformat() if isinstance(end_date, date) else end_date
        params = {"data_id": stock_id, "start_date": s}
        if e:
            params["end_date"] = e
        data = self._fetch("TaiwanStockInstitutionalInvestorsBuySell", params)
        return data, FetchMeta("finmind", now_tpe(), "TaiwanStockInstitutionalInvestorsBuySell", params)

    def get_margin_short(
        self,
        stock_id: str,
        start_date: str | date,
        end_date: str | date | None = None,
    ) -> tuple[list[dict], FetchMeta]:
        """融資融券"""
        s = start_date.isoformat() if isinstance(start_date, date) else start_date
        e = end_date.isoformat() if isinstance(end_date, date) else end_date
        params = {"data_id": stock_id, "start_date": s}
        if e:
            params["end_date"] = e
        data = self._fetch("TaiwanStockMarginPurchaseShortSale", params)
        return data, FetchMeta("finmind", now_tpe(), "TaiwanStockMarginPurchaseShortSale", params)

    def get_broker_trades(
        self,
        stock_id: str,
        trade_date: str | date,
    ) -> tuple[list[dict], FetchMeta]:
        """分點進出(某日某個股的所有券商明細)"""
        d = trade_date.isoformat() if isinstance(trade_date, date) else trade_date
        params = {"data_id": stock_id, "start_date": d, "end_date": d}
        data = self._fetch("TaiwanStockTradingDailyReport", params)
        return data, FetchMeta("finmind", now_tpe(), "TaiwanStockTradingDailyReport", params)

    def get_financial_statements(
        self,
        stock_id: str,
        start_date: str | date,
    ) -> tuple[list[dict], FetchMeta]:
        """財報(損益表)"""
        s = start_date.isoformat() if isinstance(start_date, date) else start_date
        params = {"data_id": stock_id, "start_date": s}
        data = self._fetch("TaiwanStockFinancialStatements", params)
        return data, FetchMeta("finmind", now_tpe(), "TaiwanStockFinancialStatements", params)

    def get_stock_info(self) -> tuple[list[dict], FetchMeta]:
        """所有台股基本資料(代號 / 名稱 / 產業)— 每日執行一次即可"""
        data = self._fetch("TaiwanStockInfo", {})
        return data, FetchMeta("finmind", now_tpe(), "TaiwanStockInfo", {})

    # ==========================================
    # 期交所(期貨)
    # ==========================================
    def get_futures_daily(
        self,
        contract: str = "TX",
        start_date: str | date | None = None,
    ) -> tuple[list[dict], FetchMeta]:
        """台指期日線"""
        s = (
            (start_date.isoformat() if isinstance(start_date, date) else start_date)
            or (now_tpe().date() - timedelta(days=30)).isoformat()
        )
        params = {"data_id": contract, "start_date": s}
        data = self._fetch("TaiwanFuturesDaily", params)
        return data, FetchMeta("finmind", now_tpe(), "TaiwanFuturesDaily", params)

    # ==========================================
    # 大盤指數
    # ==========================================
    def get_taiex_daily(
        self,
        start_date: str | date | None = None,
    ) -> tuple[list[dict], FetchMeta]:
        """台股加權指數(TAIEX)日線"""
        s = (
            (start_date.isoformat() if isinstance(start_date, date) else start_date)
            or (now_tpe().date() - timedelta(days=60)).isoformat()
        )
        params = {"data_id": "TAIEX", "start_date": s}
        data = self._fetch("TaiwanStockPrice", params)
        return data, FetchMeta("finmind", now_tpe(), "TaiwanStockPrice(TAIEX)", params)

    # ==========================================
    # 新聞(每股票 / 每日)
    # ==========================================
    def get_stock_news(
        self,
        stock_id: str | None = None,
        start_date: str | date | None = None,
    ) -> tuple[list[dict], FetchMeta]:
        """股票新聞(FinMind 聚合多家來源)。stock_id 不給 → 抓全市場。"""
        s = (
            (start_date.isoformat() if isinstance(start_date, date) else start_date)
            or (now_tpe().date() - timedelta(days=7)).isoformat()
        )
        params: dict[str, Any] = {"start_date": s}
        if stock_id:
            params["data_id"] = stock_id
        data = self._fetch("TaiwanStockNews", params)
        return data, FetchMeta("finmind", now_tpe(), "TaiwanStockNews", params)
