"""
回測 API(Phase 6 — spec 20)

端點:
  GET  /api/backtest/strategies                     列可用策略
  POST /api/backtest                                 執行回測
  GET  /api/backtest/quick?stock_id=2330            快速回測(預設 2024-01-01 至今)
"""

from __future__ import annotations

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.services.backtest_service import (
    BacktestEngine,
    STRATEGIES,
    result_to_dict,
)
from backend.utils.logger import get_logger
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

router = APIRouter()


class BacktestRequest(BaseModel):
    stock_id: str
    strategy: str = "ma_cross"
    start: str
    end: Optional[str] = None
    initial_cash: float = 1_000_000


@router.get("/backtest/strategies")
async def list_strategies():
    return {
        "strategies": list(STRATEGIES.keys()),
        "descriptions": {
            "ma_cross": "20 日均線穿越 60 日均線(黃金/死亡交叉)",
            "rsi_reversion": "RSI(14)<30 買、>70 賣(均值回歸)",
            "buy_and_hold": "首日買入、末日賣出(基準)",
        },
    }


@router.post("/backtest")
async def run_backtest(req: BacktestRequest):
    engine = BacktestEngine()
    try:
        result = engine.run(
            stock_id=req.stock_id,
            start=req.start,
            end=req.end,
            strategy=req.strategy,
            initial_cash=req.initial_cash,
        )
        return result_to_dict(result)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        log.exception("backtest 失敗")
        raise HTTPException(500, detail=str(e))


@router.get("/backtest/quick")
async def quick_backtest(
    stock_id: str = Query(...),
    strategy: str = Query("ma_cross"),
    days: int = Query(365 * 2, ge=30, le=365 * 5),
):
    """快速回測 — 預設近 2 年"""
    start = (now_tpe().date() - timedelta(days=days)).isoformat()
    engine = BacktestEngine()
    try:
        result = engine.run(stock_id=stock_id, start=start, strategy=strategy)
        d = result_to_dict(result)
        # 精簡:省略 equity_curve 細節,只回摘要
        d["equity_curve_sample"] = d["equity_curve"][::10][:60]
        d.pop("equity_curve", None)
        return d
    except ValueError as e:
        raise HTTPException(400, detail=str(e))
    except Exception as e:
        log.exception("quick backtest 失敗")
        raise HTTPException(500, detail=str(e))
