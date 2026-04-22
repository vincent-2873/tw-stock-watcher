"""
模擬交易 API(Phase 6)

端點:
  GET  /api/paper/account           查帳戶 + 持倉 + 績效
  GET  /api/paper/trades            查歷史交易
  POST /api/paper/order             下單(buy/sell)
  POST /api/paper/reset             重設帳戶(歸零回到初始現金)
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from backend.services.paper_trading_service import PaperTradingService
from backend.utils.logger import get_logger
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

router = APIRouter()

DEFAULT_USER_ID = "vincent"


class OrderRequest(BaseModel):
    stock_id: str
    action: str  # buy / sell
    shares: int
    price: Optional[float] = None
    user_id: str = DEFAULT_USER_ID
    notes: str = ""


@router.get("/paper/account")
async def get_paper_account(user_id: str = Query(DEFAULT_USER_ID)):
    svc = PaperTradingService()
    return svc.performance(user_id)


@router.get("/paper/trades")
async def get_paper_trades(
    user_id: str = Query(DEFAULT_USER_ID), limit: int = Query(50, ge=1, le=500)
):
    svc = PaperTradingService()
    return {"items": svc.get_trades(user_id, limit), "tpe_now": now_tpe().isoformat()}


@router.post("/paper/order")
async def place_paper_order(req: OrderRequest):
    svc = PaperTradingService()
    r = svc.place_order(
        user_id=req.user_id,
        stock_id=req.stock_id,
        action=req.action,
        shares=req.shares,
        price=req.price,
        notes=req.notes,
    )
    if not r.ok:
        raise HTTPException(400, detail=r.message)
    return {
        "ok": r.ok,
        "message": r.message,
        "trade": r.trade,
        "cash_after": r.cash_after,
    }


@router.post("/paper/reset")
async def reset_paper_account(user_id: str = Query(DEFAULT_USER_ID)):
    """重設帳戶(刪持倉 + 刪交易,現金回到初始)。"""
    svc = PaperTradingService()
    try:
        sb = svc.sb
        # 取得帳戶 id
        acc = svc._ensure_account(user_id)
        account_id = acc.get("id")
        if account_id:
            sb.table("paper_trades").delete().eq("account_id", account_id).execute()
        from backend.services.paper_trading_service import DEFAULT_INITIAL_CASH
        sb.table("paper_accounts").update(
            {
                "current_cash": DEFAULT_INITIAL_CASH,
                "total_trades": 0,
                "winning_trades": 0,
                "total_pnl": 0,
            }
        ).eq("user_id", user_id).execute()
        return {"ok": True, "user_id": user_id, "cash": DEFAULT_INITIAL_CASH}
    except Exception as e:
        log.exception("reset 失敗")
        raise HTTPException(500, detail=str(e))
