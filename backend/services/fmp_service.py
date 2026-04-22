"""
FMP Service — 美股 + 國際資料源

2025 年 8 月起,FMP 搬到 /stable/ 路徑;舊 /api/v3/ 只供 legacy 用戶。
本 service 採用 /stable/ API。

Docs: https://site.financialmodelingprep.com/developer/docs
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

FMP_BASE = "https://financialmodelingprep.com/stable"
DEFAULT_TIMEOUT = 15.0


@dataclass
class FetchMeta:
    source: str
    fetched_at: datetime
    endpoint: str
    params: dict[str, Any]


class FMPService:
    def __init__(self, api_key: Optional[str] = None, timeout: float = DEFAULT_TIMEOUT):
        self.api_key = api_key or os.getenv("FMP_API_KEY", "")
        self.timeout = timeout
        if not self.api_key:
            log.warning("FMP_API_KEY 未設定,美股相關功能無法使用")

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
            log.error(f"FMP {endpoint} HTTP {e.response.status_code}: {e.response.text[:120]}")
            raise
        except Exception as e:
            log.error(f"FMP {endpoint} 例外: {e}")
            return []

    # 報價 / 公司資料
    def get_quote(self, symbol: str) -> tuple[list[dict], FetchMeta]:
        """即時報價(延遲約 15 分)"""
        data = self._get("quote", {"symbol": symbol}) or []
        return data, FetchMeta("fmp", now_tpe(), "quote", {"symbol": symbol})

    def get_profile(self, symbol: str) -> tuple[list[dict], FetchMeta]:
        """公司基本資料"""
        data = self._get("profile", {"symbol": symbol}) or []
        return data, FetchMeta("fmp", now_tpe(), "profile", {"symbol": symbol})

    # 歷史資料
    def get_historical(
        self,
        symbol: str,
        start_date: str | date | None = None,
        end_date: str | date | None = None,
    ) -> tuple[list[dict], FetchMeta]:
        """歷史日線(完整版)"""
        params: dict[str, str] = {"symbol": symbol}
        if start_date:
            params["from"] = start_date.isoformat() if isinstance(start_date, date) else start_date
        if end_date:
            params["to"] = end_date.isoformat() if isinstance(end_date, date) else end_date
        data = self._get("historical-price-eod/full", params) or []
        return data, FetchMeta("fmp", now_tpe(), "historical-price-eod/full", params)

    def get_intraday(
        self, symbol: str, interval: str = "5min"
    ) -> tuple[list[dict], FetchMeta]:
        """盤中:1min / 5min / 15min / 30min / 1hour / 4hour"""
        data = self._get(f"historical-chart/{interval}", {"symbol": symbol}) or []
        return data, FetchMeta("fmp", now_tpe(), f"historical-chart/{interval}", {"symbol": symbol})

    # 行事曆 / 總體經濟
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
        data = self._get("earnings-calendar", params) or []
        return data, FetchMeta("fmp", now_tpe(), "earnings-calendar", params)

    def get_treasury_rates(self) -> tuple[list[dict], FetchMeta]:
        """美國國債殖利率"""
        data = self._get("treasury-rates") or []
        return data, FetchMeta("fmp", now_tpe(), "treasury-rates", {})

    # 財報
    def get_income_statement(
        self, symbol: str, period: str = "annual", limit: int = 5
    ) -> tuple[list[dict], FetchMeta]:
        """損益表 period: annual / quarter"""
        params = {"symbol": symbol, "period": period, "limit": str(limit)}
        data = self._get("income-statement", params) or []
        return data, FetchMeta("fmp", now_tpe(), "income-statement", params)

    # 經濟指標
    def get_economic_indicator(self, name: str) -> tuple[list[dict], FetchMeta]:
        """name 例:GDP / CPI / unemploymentRate / federalFunds"""
        data = self._get("economics", {"name": name}) or []
        return data, FetchMeta("fmp", now_tpe(), "economics", {"name": name})
