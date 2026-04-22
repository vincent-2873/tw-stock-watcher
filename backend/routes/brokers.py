"""
分點進出 API — FinMind TaiwanStockTradingDailyReport

用途:
  看某檔個股某日各券商分點的買賣超明細。
  可找出「主力券商」「隔日沖客戶」「地緣券商」(spec 籌碼分析用)。

端點:
  GET /api/brokers/{stock_id}                 某股最新交易日分點
  GET /api/brokers/{stock_id}?date=YYYY-MM-DD  指定日
  GET /api/brokers/{stock_id}/summary          5 日彙總主力分點
"""

from __future__ import annotations

from datetime import date as dt_date, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from backend.services.finmind_service import FinMindService
from backend.utils.logger import get_logger
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

router = APIRouter()


def _aggregate_rows(rows: list[dict]) -> list[dict]:
    """把同一券商多筆合併 + 算買賣超"""
    agg: dict[str, dict] = {}
    for r in rows:
        broker = r.get("securities_trader", "?")
        if broker not in agg:
            agg[broker] = {"broker": broker, "buy": 0, "sell": 0, "buy_price": 0.0, "sell_price": 0.0}
        buy = float(r.get("buy", 0) or 0)
        sell = float(r.get("sell", 0) or 0)
        price = float(r.get("price", 0) or 0)
        agg[broker]["buy"] += buy
        agg[broker]["sell"] += sell
        if buy > 0:
            agg[broker]["buy_price"] += buy * price
        if sell > 0:
            agg[broker]["sell_price"] += sell * price
    result: list[dict] = []
    for b in agg.values():
        buy = b["buy"]
        sell = b["sell"]
        net = buy - sell
        b["net"] = net
        b["avg_buy_price"] = round(b["buy_price"] / buy, 2) if buy > 0 else None
        b["avg_sell_price"] = round(b["sell_price"] / sell, 2) if sell > 0 else None
        b.pop("buy_price", None)
        b.pop("sell_price", None)
        result.append(b)
    return result


@router.get("/brokers/{stock_id}")
async def get_broker_flow(
    stock_id: str,
    date: Optional[str] = Query(None, description="YYYY-MM-DD;不給則用最近交易日"),
    top: int = Query(20, ge=5, le=100),
):
    svc = FinMindService()
    tpe = now_tpe()
    query_date = date or tpe.date().isoformat()
    rows, meta = svc.get_broker_trades(stock_id, query_date)
    if not rows:
        # 往前找最近有資料的日期(最多回推 7 日)
        base = tpe.date()
        for back in range(1, 8):
            d = (base - timedelta(days=back)).isoformat()
            rows, meta = svc.get_broker_trades(stock_id, d)
            if rows:
                query_date = d
                break
    if not rows:
        raise HTTPException(404, detail=f"{stock_id} {query_date} 無分點資料(可能該日未開盤)")

    aggregated = _aggregate_rows(rows)
    buyers = sorted(aggregated, key=lambda x: -x["net"])[:top]
    sellers = sorted(aggregated, key=lambda x: x["net"])[:top]
    return {
        "stock_id": stock_id,
        "date": query_date,
        "total_brokers": len(aggregated),
        "top_buyers": buyers,
        "top_sellers": sellers,
        "meta": {"source": meta.source, "fetched_at": meta.fetched_at.isoformat()},
    }


@router.get("/brokers/{stock_id}/summary")
async def get_broker_summary(
    stock_id: str,
    days: int = Query(5, ge=2, le=20),
):
    """回推 N 個交易日,彙總各分點累計買賣超 — 可以看主力長線進出"""
    svc = FinMindService()
    tpe = now_tpe()
    base = tpe.date()

    all_agg: dict[str, dict] = {}
    found_dates: list[str] = []
    # 往回掃到拿滿 N 個有資料的交易日(最多掃 2*days+5 天避開假日)
    for back in range(0, days * 2 + 5):
        d = (base - timedelta(days=back)).isoformat()
        rows, _ = svc.get_broker_trades(stock_id, d)
        if not rows:
            continue
        agg = _aggregate_rows(rows)
        for b in agg:
            key = b["broker"]
            if key not in all_agg:
                all_agg[key] = {"broker": key, "buy": 0, "sell": 0, "net": 0, "days": 0}
            all_agg[key]["buy"] += b["buy"]
            all_agg[key]["sell"] += b["sell"]
            all_agg[key]["net"] += b["net"]
            all_agg[key]["days"] += 1
        found_dates.append(d)
        if len(found_dates) >= days:
            break

    if not found_dates:
        raise HTTPException(404, detail=f"{stock_id} 近期無分點資料")

    items = list(all_agg.values())
    return {
        "stock_id": stock_id,
        "days": len(found_dates),
        "dates": sorted(found_dates),
        "top_buyers": sorted(items, key=lambda x: -x["net"])[:20],
        "top_sellers": sorted(items, key=lambda x: x["net"])[:20],
    }
