"""
大盤 / 市場監測 API

端點:
  GET /api/market/overview   大盤綜合(TAIEX + 台指期 + 道瓊 + 那指 + S&P + 美元指數)
  GET /api/market/taiex      TAIEX 日線
  GET /api/market/futures    台指期日線
  GET /api/market/us         幾個重要美股指數 ETF 報價(FMP)
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from backend.services.finmind_service import FinMindService
from backend.services.fmp_service import FMPService
from backend.services.yahoo_service import US_INDICES, get_index_quote
from backend.utils.logger import get_logger
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

router = APIRouter()

# 常用美股指數(ETF 代理)
US_INDEX_PROXIES = {
    "SPY": "S&P 500",
    "QQQ": "Nasdaq 100",
    "DIA": "Dow Jones 30",
    "IWM": "Russell 2000",
    "VIX": "VIX(恐慌指數)",  # FMP quote 實際用 ^VIX
}


@router.get("/market/taiex")
async def get_taiex(days: int = Query(60, ge=5, le=365)):
    svc = FinMindService()
    tpe = now_tpe()
    start = (tpe.date() - timedelta(days=days)).isoformat()
    rows, meta = svc.get_taiex_daily(start)
    if not rows:
        raise HTTPException(404, detail="TAIEX 抓取失敗(可能 token 或 rate limit)")

    latest = rows[-1]
    prev = rows[-2] if len(rows) >= 2 else {}
    close = float(latest.get("close", 0))
    prev_close = float(prev.get("close", 0)) if prev else 0
    return {
        "index": "TAIEX",
        "latest": {
            "date": latest.get("date"),
            "close": close,
            "open": latest.get("open"),
            "high": latest.get("max") or latest.get("high"),
            "low": latest.get("min") or latest.get("low"),
            "volume": latest.get("Trading_Volume"),
            "turnover_twd": latest.get("Trading_money"),
            "day_change": round(close - prev_close, 2) if prev_close else None,
            "day_change_pct": (
                round((close - prev_close) / prev_close * 100, 2) if prev_close else None
            ),
        },
        "history": [
            {
                "date": r["date"],
                "close": r["close"],
                "volume": r.get("Trading_Volume"),
            }
            for r in rows
        ],
        "meta": {"source": meta.source, "fetched_at": meta.fetched_at.isoformat()},
    }


@router.get("/market/futures")
async def get_futures(
    contract: str = Query("TX", description="TX=台指期 / MTX=小台 / TE=電子期"),
    days: int = Query(30, ge=5, le=180),
):
    svc = FinMindService()
    tpe = now_tpe()
    start = (tpe.date() - timedelta(days=days)).isoformat()
    rows, meta = svc.get_futures_daily(contract, start)
    if not rows:
        raise HTTPException(404, detail=f"期貨 {contract} 抓取失敗")

    # 選取最近的近月合約(FinMind 會回多月合約,取最近月到期者)
    # contract_date 最近的就是近月
    by_date: dict[str, list] = {}
    for r in rows:
        by_date.setdefault(r["date"], []).append(r)
    latest_date = max(by_date.keys())
    # 在最新日取最近月 contract
    today_rows = by_date[latest_date]
    today_rows.sort(key=lambda r: str(r.get("contract_date", "")))
    near = today_rows[0]

    prev_dates = sorted([d for d in by_date.keys() if d < latest_date], reverse=True)
    prev_row = None
    if prev_dates:
        prev_rows = by_date[prev_dates[0]]
        prev_rows.sort(key=lambda r: str(r.get("contract_date", "")))
        prev_row = prev_rows[0]

    close = float(near.get("close", 0))
    prev_close = float(prev_row.get("close", 0)) if prev_row else 0
    return {
        "contract": contract,
        "near_month": near.get("contract_date"),
        "latest": {
            "date": latest_date,
            "close": close,
            "open": near.get("open"),
            "high": near.get("max") or near.get("high"),
            "low": near.get("min") or near.get("low"),
            "volume": near.get("volume"),
            "day_change": round(close - prev_close, 2) if prev_close else None,
            "day_change_pct": (
                round((close - prev_close) / prev_close * 100, 2) if prev_close else None
            ),
        },
        "history": [
            {
                "date": d,
                "close": by_date[d][0].get("close"),
                "volume": by_date[d][0].get("volume"),
            }
            for d in sorted(by_date.keys())
        ],
        "meta": {"source": meta.source, "fetched_at": meta.fetched_at.isoformat()},
    }


@router.get("/market/us")
async def get_us_indices():
    """美股主要指數 — Yahoo Finance ^GSPC / ^IXIC / ^DJI / ^VIX(免費無限制)"""
    results: dict[str, Any] = {}
    for sym, label in US_INDICES:
        q = get_index_quote(sym)
        if q:
            results[sym] = {
                "label": label,
                "price": q["price"],
                "change": q.get("change"),
                "changes_pct": q.get("change_pct"),
                "volume": q.get("volume"),
                "day_low": q.get("day_low"),
                "day_high": q.get("day_high"),
                "prev_close": q.get("prev_close"),
            }
        else:
            results[sym] = {"label": label, "error": "Yahoo fetch 失敗"}
    return {"items": results, "tpe_now": now_tpe().isoformat()}


@router.get("/market/overview")
async def get_market_overview():
    """一次拿 TAIEX + 台指期 + 美股主要指數(前端大盤頁一支 API 解決)"""
    svc = FinMindService()
    fmp = FMPService()
    tpe = now_tpe()
    start = (tpe.date() - timedelta(days=20)).isoformat()

    overview: dict[str, Any] = {"tpe_now": tpe.isoformat()}

    # TAIEX
    try:
        rows, _ = svc.get_taiex_daily(start)
        if rows:
            latest = rows[-1]
            prev = rows[-2] if len(rows) >= 2 else {}
            close = float(latest.get("close", 0))
            prev_close = float(prev.get("close", 0)) if prev else 0
            overview["taiex"] = {
                "date": latest.get("date"),
                "close": close,
                "day_change": round(close - prev_close, 2) if prev_close else None,
                "day_change_pct": (
                    round((close - prev_close) / prev_close * 100, 2)
                    if prev_close
                    else None
                ),
                "volume": latest.get("Trading_Volume"),
                "turnover_twd": latest.get("Trading_money"),
            }
    except Exception as e:
        overview["taiex_error"] = str(e)[:100]

    # 台指期 (TX)
    try:
        rows, _ = svc.get_futures_daily("TX", start)
        if rows:
            by_date: dict[str, list] = {}
            for r in rows:
                by_date.setdefault(r["date"], []).append(r)
            latest_date = max(by_date.keys())
            today = sorted(by_date[latest_date], key=lambda r: str(r.get("contract_date", "")))[0]
            prev_dates = sorted([d for d in by_date.keys() if d < latest_date], reverse=True)
            prev = None
            if prev_dates:
                prev = sorted(by_date[prev_dates[0]], key=lambda r: str(r.get("contract_date", "")))[0]
            close = float(today.get("close", 0))
            prev_close = float(prev.get("close", 0)) if prev else 0
            overview["futures_tx"] = {
                "date": latest_date,
                "contract": today.get("contract_date"),
                "close": close,
                "day_change": round(close - prev_close, 2) if prev_close else None,
                "day_change_pct": (
                    round((close - prev_close) / prev_close * 100, 2)
                    if prev_close
                    else None
                ),
            }
    except Exception as e:
        overview["futures_error"] = str(e)[:100]

    # 美股主要指數 — Yahoo Finance
    try:
        us: dict[str, Any] = {}
        for sym, label in US_INDICES:
            q = get_index_quote(sym)
            if q:
                us[sym] = {
                    "label": label,
                    "price": q["price"],
                    "change": q.get("change"),
                    "changes_pct": q.get("change_pct"),
                }
        overview["us"] = us
    except Exception as e:
        overview["us_error"] = str(e)[:100]

    return overview
