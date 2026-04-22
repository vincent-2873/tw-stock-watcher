"""
Yahoo Finance 免費 API 封裝(不用 yfinance library,直接打 public endpoint)。

用途: 當 FMP 免費版查不到的 index/ETF 改用這個。
不保證 Yahoo 永遠開放,失敗優雅 fallback。
"""

from __future__ import annotations

from typing import Optional

import httpx

from backend.utils.logger import get_logger

log = get_logger(__name__)

YAHOO_CHART = "https://query1.finance.yahoo.com/v8/finance/chart/{sym}"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
}


def get_index_quote(symbol: str) -> Optional[dict]:
    """
    取單一 index / ETF 報價。回傳統一格式:
      {symbol, price, prev_close, change, change_pct, day_low, day_high, volume}
    失敗回 None。
    """
    try:
        r = httpx.get(
            YAHOO_CHART.format(sym=symbol),
            headers=HEADERS,
            params={"range": "1d", "interval": "1m"},
            timeout=10.0,
        )
        if r.status_code != 200:
            log.warning(f"Yahoo {symbol} HTTP {r.status_code}")
            return None
        j = r.json()
        result = j.get("chart", {}).get("result")
        if not result:
            return None
        meta = result[0].get("meta", {})
        price = meta.get("regularMarketPrice")
        prev = meta.get("previousClose") or meta.get("chartPreviousClose")
        if price is None:
            return None
        change = price - prev if prev else None
        pct = (change / prev * 100) if (change is not None and prev) else None
        return {
            "symbol": symbol,
            "price": round(float(price), 2),
            "prev_close": round(float(prev), 2) if prev else None,
            "change": round(change, 2) if change is not None else None,
            "change_pct": round(pct, 2) if pct is not None else None,
            "day_low": meta.get("regularMarketDayLow"),
            "day_high": meta.get("regularMarketDayHigh"),
            "volume": meta.get("regularMarketVolume"),
            "currency": meta.get("currency"),
        }
    except Exception as e:
        log.warning(f"Yahoo {symbol} 例外: {e}")
        return None


# 預設 index 表
US_INDICES = [
    ("^GSPC", "S&P 500"),
    ("^IXIC", "Nasdaq"),
    ("^DJI", "Dow 30"),
    ("^VIX", "VIX"),
]
