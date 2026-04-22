"""
風險計算器 — 停損 / 停利 / ATR

依規則:Vincent 風險承受 = 單筆虧損上限 2%。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class RiskLevels:
    entry_price: float
    stop_loss_price: float       # 停損
    take_profit_price: float     # 第一停利
    take_profit_trail: float     # 移動停利價
    atr: float                   # 14 日 ATR
    atr_pct: float               # ATR / price
    risk_pct: float              # entry → stop 百分比
    reward_risk_ratio: float     # 盈虧比(停利/停損)


def calc_atr(price_data: list[dict], period: int = 14) -> Optional[float]:
    """
    計算 14 日 ATR(Average True Range)。
    TR = max(high-low, |high-prev_close|, |low-prev_close|)
    """
    if len(price_data) < period + 1:
        return None
    trs: list[float] = []
    for i in range(-period, 0):
        cur = price_data[i]
        prev = price_data[i - 1]
        high = float(cur.get("max", cur.get("high", 0)))
        low = float(cur.get("min", cur.get("low", 0)))
        prev_close = float(prev.get("close", 0))
        tr = max(high - low, abs(high - prev_close), abs(low - prev_close))
        trs.append(tr)
    return sum(trs) / period


def calculate_risk_levels(
    price_data: list[dict],
    entry_price: Optional[float] = None,
    atr_multiplier_stop: float = 2.0,
    atr_multiplier_target: float = 3.0,
    max_loss_pct: float = 2.0,
) -> Optional[RiskLevels]:
    """
    計算停損停利價位。

    優先以 ATR × 2 當停損距離;但不超過 max_loss_pct(2%)。
    停利:ATR × 3 (盈虧比 1.5:1)
    移動停利:ATR × 2(下跌 2 個 ATR 就出場)
    """
    if not price_data:
        return None
    atr = calc_atr(price_data)
    if not atr:
        return None
    entry = entry_price or float(price_data[-1].get("close", 0))
    if entry <= 0:
        return None

    atr_stop_distance = atr * atr_multiplier_stop
    # 但不能超過 max_loss_pct
    max_stop_distance = entry * (max_loss_pct / 100)
    stop_distance = min(atr_stop_distance, max_stop_distance)

    stop_loss = entry - stop_distance
    target_distance = atr * atr_multiplier_target
    take_profit = entry + target_distance

    risk_pct = stop_distance / entry * 100
    rr_ratio = target_distance / stop_distance if stop_distance > 0 else 0

    return RiskLevels(
        entry_price=round(entry, 2),
        stop_loss_price=round(stop_loss, 2),
        take_profit_price=round(take_profit, 2),
        take_profit_trail=round(entry + atr * 2, 2),
        atr=round(atr, 3),
        atr_pct=round(atr / entry * 100, 2),
        risk_pct=round(risk_pct, 2),
        reward_risk_ratio=round(rr_ratio, 2),
    )
