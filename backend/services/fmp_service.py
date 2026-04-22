"""
Financial Modeling Prep (FMP) Service — 美股 + 國際資料源

FMP: https://financialmodelingprep.com
- Basic Free: 250 req/day(上限嚴,只做輕量查詢)
- Starter $19/月:300 req/min
- 付費才有 realtime

設計:
- 盡量抓「一次就夠用」的 batch endpoint(profile/quote)
- 歷史資料走 /historical-price-full
- 失敗時回傳 [] 並 log
- 附 FetchMeta
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Optional

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from backend.utils.logger import get_logger
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

FMP_BASE = "https://financialmodelingprep.com/api/v3"
DEFAULT_TIMEOUT = 15.0


@dataclass
class FetchMeta:
    source: str
    fetched_at: datetime
    endpoint: str
    params: dict[str, Any]


class FMPService:
    """Financial Modeling Prep API 封裝"""

    def __init__(self, api_key: Optional[str] = None, timeout: float = DEFAULT_TIMEOUT):
        self.api_key = api_key or os.getenv("FMP_API_KEY", "")
        self.timeout = timeout
        if not self.api_key:
            log.warning("FMP_API_KEY 未設定,美股相關功能將無法使用")

    # ==========================================
    # 內部:通用 GET
    # ==========================================
    @retry(
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        reraise=False,
    )
    def _get(self, endpoint: str, params: Optional[dict] = None) -> Any:
        if not self.api_key:
            log.warning(f"FMP_API_KEY 未設定,略過 {endpoint}")
            return []
        url = f"{FMP_BASE}/{endpoint}"
        q = {"apikey": self.api_key, **(params or {})}
        try:
            r = httpx.get(url, params=q, timeout=self.timeout)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as e:
            log.error(f"FMP {endpoint} HTTP {e.response.status_code}")
            raise
        except Exception as e:
            log.error(f"FMP {endpoint} 例外: {e}")
            return []

    # ==========================================
    # 公開 API
    # ==========================================
    def get_quote(self, symbol: str) -> tuple[list[dict], FetchMeta]:
        """即時報價(延遲 15 分鐘,免費版)"""
        data = self._get(f"quote/{symbol}") or []
        return data, FetchMeta("fmp", now_tpe(), f"quote/{symbol}", {})

    def get_profile(self, symbol: str) -> tuple[list[dict], FetchMeta]:
        """公司基本資料"""
        data = self._get(f"profile/{symbol}") or []
        return data, FetchMeta("fmp", now_tpe(), f"profile/{symbol}", {})

    def get_historical(
        self,
        symbol: str,
        start_date: str | date | None = None,
        end_date: str | date | None = None,
    ) -> tuple[list[dict], FetchMeta]:
        """歷史股價"""
        params: dict[str, str] = {}
        if start_date:
            params["from"] = start_date.isoformat() if isinstance(start_date, date) else start_date
        if end_date:
            params["to"] = end_date.isoformat() if isinstance(end_date, date) else end_date
        j = self._get(f"historical-price-full/{symbol}", params)
        # FMP 回傳 {symbol, historical: [...]}
        data = (j or {}).get("historical", []) if isinstance(j, dict) else j
        return data, FetchMeta("fmp", now_tpe(), f"historical-price-full/{symbol}", params)

    def get_intraday(
        self, symbol: str, interval: str = "5min"
    ) -> tuple[list[dict], FetchMeta]:
        """盤中資料 1min / 5min / 15min / 30min / 1hour / 4hour"""
        data = self._get(f"historical-chart/{interval}/{symbol}") or []
        return data, FetchMeta("fmp", now_tpe(), f"historical-chart/{interval}/{symbol}", {})

    def get_earnings_calendar(
        self,
        from_date: str | date | None = None,
        to_date: str | date | None = None,
    ) -> tuple[list[dict], FetchMeta]:
        """財報行事曆"""
        params: dict[str, str] = {}
        if from_date:
            params["from"] = from_date.isoformat() if isinstance(from_date, date) else from_date
        if to_date:
            params["to"] = to_date.isoformat() if isinstance(to_date, date) else to_date
        data = self._get("earning_calendar", params) or []
        return data, FetchMeta("fmp", now_tpe(), "earning_calendar", params)

    def get_treasury_rates(self) -> tuple[list[dict], FetchMeta]:
        """美國國債利率"""
        data = self._get("treasury") or []
        return data, FetchMeta("fmp", now_tpe(), "treasury", {})
