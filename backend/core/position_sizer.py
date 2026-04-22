"""
部位計算器 — 根據風險金額計算買幾張

Vincent 預設:單筆風險 2% 帳戶。
(台股最小 1 張 = 1000 股)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class PositionPlan:
    account_size: float          # 總資金
    risk_pct: float              # 單筆風險 % (2)
    risk_amount: float           # 可承受損失金額
    entry_price: float
    stop_loss_price: float
    stop_loss_distance: float    # 每股虧損
    shares: int                  # 股數(1000 倍數)
    lots: int                    # 張數
    notional: float              # 買入成本
    notional_pct: float          # 佔帳戶 %
    expected_loss: float         # 若打到停損會虧的錢


def size_position(
    account_size: float,
    entry_price: float,
    stop_loss_price: float,
    risk_pct: float = 2.0,
    min_lots: int = 1,
    max_notional_pct: float = 15.0,  # 單筆最多佔帳戶 15%
) -> Optional[PositionPlan]:
    """
    依風險金額計算張數。

    shares = risk_amount / (entry - stop_loss)
    然後取 1000 倍數。
    若 shares × entry 超過 max_notional_pct,則壓縮。
    """
    if entry_price <= 0 or stop_loss_price <= 0 or entry_price <= stop_loss_price:
        return None
    stop_distance = entry_price - stop_loss_price
    risk_amount = account_size * risk_pct / 100
    raw_shares = risk_amount / stop_distance

    # 向下捨到千股
    lots = max(min_lots, int(raw_shares // 1000))
    shares = lots * 1000

    notional = shares * entry_price
    notional_pct = notional / account_size * 100

    # 若超過 max_notional_pct,壓縮張數
    if notional_pct > max_notional_pct:
        max_notional = account_size * max_notional_pct / 100
        lots = max(min_lots, int(max_notional / entry_price / 1000))
        shares = lots * 1000
        notional = shares * entry_price
        notional_pct = notional / account_size * 100

    expected_loss = shares * stop_distance

    return PositionPlan(
        account_size=account_size,
        risk_pct=risk_pct,
        risk_amount=round(risk_amount, 0),
        entry_price=round(entry_price, 2),
        stop_loss_price=round(stop_loss_price, 2),
        stop_loss_distance=round(stop_distance, 2),
        shares=shares,
        lots=lots,
        notional=round(notional, 0),
        notional_pct=round(notional_pct, 2),
        expected_loss=round(expected_loss, 0),
    )
