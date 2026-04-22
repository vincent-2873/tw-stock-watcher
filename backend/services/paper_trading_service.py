"""
模擬交易(Paper Trading) — spec 20
配合 supabase/schema.sql 的「開-平倉」模型:

paper_accounts(id UUID, user_id, initial_capital, current_cash, total_trades, winning_trades, total_pnl, is_active)
paper_trades(id UUID, account_id FK, stock_id, action, quantity, entry_price, entry_time,
             exit_price, exit_time, stop_loss, take_profit, pnl, pnl_pct, fees, status, created_at)

status: open / closed
- buy  → 新增一筆 status=open (entry_price/entry_time 有值,exit 空)
- sell → 找該 stock 的 open trades,FIFO 依序填 exit 並 status=closed

若要「加碼」(同一股票多次 buy),會建立多筆 open 記錄,各自獨立停損/停利。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from backend.services.finmind_service import FinMindService
from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

FEE_BPS = 0.001425
TAX_BPS = 0.003
DEFAULT_INITIAL_CASH = 1_000_000.0
DEFAULT_USER_ID = "vincent"


@dataclass
class PaperOrderResult:
    ok: bool
    message: str
    trade: Optional[dict] = None
    cash_after: Optional[float] = None


class PaperTradingService:
    def __init__(self):
        self.sb = get_service_client()
        self.finmind = FinMindService()

    # ==========================================
    # Account
    # ==========================================
    def _ensure_account(self, user_id: str) -> dict:
        """取得或建立該 user 的 active 帳戶"""
        try:
            res = (
                self.sb.table("paper_accounts")
                .select("*")
                .eq("user_id", user_id)
                .eq("is_active", True)
                .limit(1)
                .execute()
            )
            if res.data:
                return res.data[0]
            init = {
                "user_id": user_id,
                "account_name": f"{user_id} 模擬帳戶",
                "initial_capital": DEFAULT_INITIAL_CASH,
                "current_cash": DEFAULT_INITIAL_CASH,
                "total_trades": 0,
                "winning_trades": 0,
                "total_pnl": 0,
                "is_active": True,
            }
            created = self.sb.table("paper_accounts").insert(init).execute()
            return created.data[0] if created.data else init
        except Exception as e:
            log.warning(f"_ensure_account 失敗: {e}")
            return {
                "user_id": user_id,
                "current_cash": DEFAULT_INITIAL_CASH,
                "initial_capital": DEFAULT_INITIAL_CASH,
                "_error": str(e)[:200],
            }

    def get_account(self, user_id: str) -> dict:
        return self._ensure_account(user_id)

    def _get_open_trades(self, account_id: str, stock_id: Optional[str] = None) -> list[dict]:
        try:
            q = (
                self.sb.table("paper_trades")
                .select("*")
                .eq("account_id", account_id)
                .eq("status", "open")
                .order("entry_time")
            )
            if stock_id:
                q = q.eq("stock_id", stock_id)
            return q.execute().data or []
        except Exception as e:
            log.warning(f"get_open_trades 失敗: {e}")
            return []

    def get_positions(self, user_id: str) -> list[dict]:
        """把 open trades 依 stock_id 彙總為持倉。"""
        acc = self._ensure_account(user_id)
        if "_error" in acc:
            return []
        opens = self._get_open_trades(acc["id"])
        by_stock: dict[str, dict] = {}
        for t in opens:
            sid = t["stock_id"]
            if sid not in by_stock:
                by_stock[sid] = {
                    "stock_id": sid,
                    "shares": 0,
                    "total_cost": 0.0,
                    "trades": [],
                }
            by_stock[sid]["shares"] += t["quantity"]
            by_stock[sid]["total_cost"] += t["quantity"] * float(t["entry_price"])
            by_stock[sid]["trades"].append(t)
        out: list[dict] = []
        for sid, d in by_stock.items():
            avg = d["total_cost"] / d["shares"] if d["shares"] else 0
            out.append(
                {
                    "stock_id": sid,
                    "shares": d["shares"],
                    "avg_cost": round(avg, 2),
                    "open_trades": len(d["trades"]),
                }
            )
        return out

    def get_trades(self, user_id: str, limit: int = 50) -> list[dict]:
        acc = self._ensure_account(user_id)
        if "_error" in acc:
            return []
        try:
            res = (
                self.sb.table("paper_trades")
                .select("*")
                .eq("account_id", acc["id"])
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception as e:
            log.warning(f"get_trades 失敗: {e}")
            return []

    def _latest_price(self, stock_id: str) -> Optional[float]:
        from datetime import timedelta

        start = (now_tpe().date() - timedelta(days=10)).isoformat()
        rows, _ = self.finmind.get_stock_price(stock_id, start)
        if not rows:
            return None
        return float(rows[-1]["close"])

    # ==========================================
    # Order
    # ==========================================
    def place_order(
        self,
        user_id: str,
        stock_id: str,
        action: str,
        shares: int,
        price: Optional[float] = None,
        notes: str = "",
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None,
    ) -> PaperOrderResult:
        action = action.lower()
        if action not in ("buy", "sell"):
            return PaperOrderResult(False, "action 必須是 buy / sell")
        if shares <= 0 or shares % 1000 != 0:
            return PaperOrderResult(False, "shares 必須 >0 且為 1000 的倍數(整張)")

        exec_price = price or self._latest_price(stock_id)
        if not exec_price:
            return PaperOrderResult(False, f"拿不到 {stock_id} 當下收盤價")

        acc = self._ensure_account(user_id)
        if "_error" in acc:
            return PaperOrderResult(False, f"帳戶異常: {acc['_error']}")

        cash = float(acc["current_cash"])
        account_id = acc["id"]
        tpe = now_tpe().isoformat()

        try:
            if action == "buy":
                fees = shares * exec_price * FEE_BPS
                cost = shares * exec_price + fees
                if cost > cash:
                    return PaperOrderResult(
                        False, f"現金不足: 需 {cost:,.0f} / 現有 {cash:,.0f}"
                    )
                cash -= cost
                trade_row = {
                    "account_id": account_id,
                    "stock_id": stock_id,
                    "action": "buy",
                    "quantity": shares,
                    "entry_price": exec_price,
                    "entry_time": tpe,
                    "stop_loss": stop_loss,
                    "take_profit": take_profit,
                    "fees": fees,
                    "status": "open",
                }
                created = self.sb.table("paper_trades").insert(trade_row).execute()
                self.sb.table("paper_accounts").update(
                    {"current_cash": cash}
                ).eq("id", account_id).execute()
                return PaperOrderResult(
                    True, "買入成交", trade=created.data[0] if created.data else trade_row, cash_after=cash
                )

            # sell: FIFO 找 open trades 平倉
            opens = self._get_open_trades(account_id, stock_id)
            total_open = sum(t["quantity"] for t in opens)
            if total_open < shares:
                return PaperOrderResult(
                    False, f"持倉不足: 現有 {total_open} / 欲賣 {shares}"
                )

            remaining = shares
            realized_pnl = 0.0
            wins = 0
            total_proceeds = 0.0
            total_fees = 0.0
            for t in opens:
                if remaining <= 0:
                    break
                q_avail = t["quantity"]
                q_sell = min(q_avail, remaining)
                proceeds = q_sell * exec_price
                sell_fees = proceeds * FEE_BPS
                tax = proceeds * TAX_BPS
                net_proceeds = proceeds - sell_fees - tax
                entry_fees = (t.get("fees") or 0) * (q_sell / q_avail)
                pnl = net_proceeds - (q_sell * float(t["entry_price"])) - entry_fees
                total_proceeds += net_proceeds
                total_fees += sell_fees + tax
                realized_pnl += pnl
                if pnl > 0:
                    wins += 1

                if q_sell == q_avail:
                    # 整筆平倉
                    self.sb.table("paper_trades").update(
                        {
                            "exit_price": exec_price,
                            "exit_time": tpe,
                            "pnl": round(pnl, 2),
                            "pnl_pct": round(
                                pnl / (q_sell * float(t["entry_price"])) * 100, 2
                            ),
                            "status": "closed",
                        }
                    ).eq("id", t["id"]).execute()
                else:
                    # 部分平倉:原 trade 先關掉(按比例),剩餘新增一筆 open
                    self.sb.table("paper_trades").update(
                        {
                            "quantity": q_sell,
                            "exit_price": exec_price,
                            "exit_time": tpe,
                            "pnl": round(pnl, 2),
                            "pnl_pct": round(
                                pnl / (q_sell * float(t["entry_price"])) * 100, 2
                            ),
                            "status": "closed",
                            "fees": round(entry_fees + sell_fees + tax, 2),
                        }
                    ).eq("id", t["id"]).execute()
                    # 剩餘 open
                    self.sb.table("paper_trades").insert(
                        {
                            "account_id": account_id,
                            "stock_id": stock_id,
                            "action": "buy",
                            "quantity": q_avail - q_sell,
                            "entry_price": float(t["entry_price"]),
                            "entry_time": t.get("entry_time"),
                            "stop_loss": t.get("stop_loss"),
                            "take_profit": t.get("take_profit"),
                            "fees": (t.get("fees") or 0) - entry_fees,
                            "status": "open",
                        }
                    ).execute()
                remaining -= q_sell

            cash += total_proceeds
            # 更新帳戶統計
            acc_stats = self._ensure_account(user_id)
            self.sb.table("paper_accounts").update(
                {
                    "current_cash": cash,
                    "total_trades": (acc_stats.get("total_trades") or 0) + 1,
                    "winning_trades": (acc_stats.get("winning_trades") or 0)
                    + (1 if realized_pnl > 0 else 0),
                    "total_pnl": round(
                        float(acc_stats.get("total_pnl") or 0) + realized_pnl, 2
                    ),
                }
            ).eq("id", account_id).execute()
            return PaperOrderResult(
                True,
                f"賣出成交 PnL={realized_pnl:,.0f}",
                trade={
                    "action": "sell",
                    "stock_id": stock_id,
                    "quantity": shares,
                    "price": exec_price,
                    "realized_pnl": round(realized_pnl, 2),
                    "fees": round(total_fees, 2),
                },
                cash_after=cash,
            )
        except Exception as e:
            log.exception("place_order 失敗")
            return PaperOrderResult(False, f"DB 寫入失敗: {str(e)[:200]}")

    # ==========================================
    # Performance
    # ==========================================
    def performance(self, user_id: str) -> dict:
        acc = self._ensure_account(user_id)
        if "_error" in acc:
            return {"error": acc["_error"], "user_id": user_id}
        positions = self.get_positions(user_id)
        cash = float(acc["current_cash"])
        initial = float(acc["initial_capital"])
        market_value = 0.0
        position_rows: list[dict] = []
        for p in positions:
            cur = self._latest_price(p["stock_id"])
            if cur is None:
                continue
            mv = cur * p["shares"]
            pnl = (cur - p["avg_cost"]) * p["shares"]
            pnl_pct = (cur - p["avg_cost"]) / p["avg_cost"] * 100 if p["avg_cost"] else 0
            market_value += mv
            position_rows.append(
                {
                    "stock_id": p["stock_id"],
                    "shares": p["shares"],
                    "avg_cost": p["avg_cost"],
                    "current_price": cur,
                    "market_value": round(mv, 2),
                    "unrealized_pnl": round(pnl, 2),
                    "unrealized_pnl_pct": round(pnl_pct, 2),
                }
            )
        total = cash + market_value
        ret_pct = (total - initial) / initial * 100 if initial else 0
        return {
            "user_id": user_id,
            "account_id": acc.get("id"),
            "cash": round(cash, 2),
            "market_value": round(market_value, 2),
            "total": round(total, 2),
            "initial_capital": initial,
            "total_return_pct": round(ret_pct, 2),
            "total_pnl": float(acc.get("total_pnl") or 0),
            "closed_trades": acc.get("total_trades", 0),
            "winning_trades": acc.get("winning_trades", 0),
            "positions": position_rows,
            "tpe_now": now_tpe().isoformat(),
        }
