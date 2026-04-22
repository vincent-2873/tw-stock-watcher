"""
歷史回測引擎(spec 20)

用法:
    from backend.services.backtest_service import BacktestEngine, STRATEGIES
    engine = BacktestEngine()
    result = engine.run(stock_id="2330", start="2024-01-01", end="2026-04-22",
                        strategy="ma_cross", initial_cash=1_000_000)

策略清單(MVP 版):
  - ma_cross        : 20 日 MA 穿越 60 日 MA 買進,反向賣出(簡易 golden cross)
  - rsi_reversion   : RSI(14) < 30 買 / > 70 賣
  - buy_and_hold    : 開始日買入,結束日賣出(基準線)
  - vsis_score      : 用當天 VSIS 四象限分數 >= 55 買、<= 40 賣(使用當時資料)
                      注意:vsis_score 需要逐日跑 decision_engine,較慢

績效指標:
  - 總報酬率 total_return_pct
  - 年化報酬 cagr_pct
  - 最大回撤 max_drawdown_pct
  - 勝率 win_rate_pct
  - 交易次數 trades
  - 夏普比(年化) sharpe

設計原則:
  - 只用當時或更早的資料(look-ahead bias free)
  - 含交易成本(買賣手續費 0.1425% + 證交稅 0.3%)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Callable, Optional

from backend.services.finmind_service import FinMindService
from backend.utils.logger import get_logger
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

# 交易成本
FEE_BPS = 0.001425  # 手續費(買+賣各一次)
TAX_BPS = 0.003  # 證交稅(賣出時)


@dataclass
class Trade:
    action: str  # "buy" or "sell"
    date: str
    price: float
    shares: int
    cash_after: float
    reason: str = ""


@dataclass
class BacktestResult:
    stock_id: str
    strategy: str
    start_date: str
    end_date: str
    initial_cash: float
    final_value: float
    total_return_pct: float
    cagr_pct: float
    max_drawdown_pct: float
    win_rate_pct: float
    trades_count: int
    sharpe: float
    equity_curve: list[dict] = field(default_factory=list)
    trades: list[Trade] = field(default_factory=list)


# ==============================================
# 指標
# ==============================================
def _sma(values: list[float], n: int) -> list[Optional[float]]:
    out: list[Optional[float]] = [None] * len(values)
    if n <= 0:
        return out
    for i in range(n - 1, len(values)):
        out[i] = sum(values[i - n + 1 : i + 1]) / n
    return out


def _rsi(values: list[float], period: int = 14) -> list[Optional[float]]:
    out: list[Optional[float]] = [None] * len(values)
    if len(values) < period + 1:
        return out
    gains: list[float] = []
    losses: list[float] = []
    for i in range(1, len(values)):
        delta = values[i] - values[i - 1]
        gains.append(max(delta, 0))
        losses.append(max(-delta, 0))
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    out[period] = 100 - 100 / (1 + (avg_gain / avg_loss if avg_loss else 1e-9))
    for i in range(period + 1, len(values)):
        avg_gain = (avg_gain * (period - 1) + gains[i - 1]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i - 1]) / period
        out[i] = 100 - 100 / (1 + (avg_gain / avg_loss if avg_loss else 1e-9))
    return out


# ==============================================
# 策略訊號(回傳 +1 買 / -1 賣 / 0 持平)
# ==============================================
def strat_ma_cross(prices: list[float]) -> list[int]:
    short = _sma(prices, 20)
    long = _sma(prices, 60)
    signals = [0] * len(prices)
    for i in range(1, len(prices)):
        if short[i] is None or long[i] is None or short[i - 1] is None or long[i - 1] is None:
            continue
        prev_cross = short[i - 1] - long[i - 1]
        cur_cross = short[i] - long[i]
        if prev_cross <= 0 and cur_cross > 0:
            signals[i] = 1  # 黃金交叉
        elif prev_cross >= 0 and cur_cross < 0:
            signals[i] = -1  # 死亡交叉
    return signals


def strat_rsi_reversion(prices: list[float]) -> list[int]:
    rsi = _rsi(prices, 14)
    signals = [0] * len(prices)
    for i in range(1, len(prices)):
        if rsi[i] is None:
            continue
        if rsi[i] < 30 and (rsi[i - 1] is None or rsi[i - 1] >= 30):
            signals[i] = 1
        elif rsi[i] > 70 and (rsi[i - 1] is None or rsi[i - 1] <= 70):
            signals[i] = -1
    return signals


def strat_buy_and_hold(prices: list[float]) -> list[int]:
    signals = [0] * len(prices)
    if len(signals) >= 2:
        signals[0] = 1
        signals[-1] = -1
    return signals


STRATEGIES: dict[str, Callable[[list[float]], list[int]]] = {
    "ma_cross": strat_ma_cross,
    "rsi_reversion": strat_rsi_reversion,
    "buy_and_hold": strat_buy_and_hold,
}


# ==============================================
# 引擎
# ==============================================
class BacktestEngine:
    def __init__(self):
        self.finmind = FinMindService()

    def _fetch_prices(self, stock_id: str, start: str, end: str) -> list[dict]:
        rows, _ = self.finmind.get_stock_price(stock_id, start, end)
        # 按日期排序
        return sorted(rows, key=lambda r: r["date"])

    def run(
        self,
        stock_id: str,
        start: str,
        end: Optional[str] = None,
        strategy: str = "ma_cross",
        initial_cash: float = 1_000_000,
    ) -> BacktestResult:
        if strategy not in STRATEGIES:
            raise ValueError(
                f"未知策略: {strategy},可用: {list(STRATEGIES.keys())}"
            )
        end_date = end or now_tpe().date().isoformat()
        rows = self._fetch_prices(stock_id, start, end_date)
        if len(rows) < 5:
            raise ValueError(f"{stock_id} 在 {start} ~ {end_date} 資料不足(<5 天)")

        closes = [float(r["close"]) for r in rows]
        dates = [r["date"] for r in rows]
        signals = STRATEGIES[strategy](closes)

        cash = initial_cash
        shares = 0
        trades: list[Trade] = []
        equity_curve: list[dict] = []
        wins = 0
        total_closed = 0
        last_buy_price: Optional[float] = None

        for i, (d, p, s) in enumerate(zip(dates, closes, signals)):
            # 先執行訊號(用今日收盤作為成交價)
            if s == 1 and shares == 0 and cash > p:
                # 買進,全倉
                buy_shares = int(cash / p / 1000) * 1000  # 按千股買
                if buy_shares > 0:
                    cost = buy_shares * p * (1 + FEE_BPS)
                    if cost <= cash:
                        cash -= cost
                        shares += buy_shares
                        last_buy_price = p
                        trades.append(Trade("buy", d, p, buy_shares, cash, strategy))
            elif s == -1 and shares > 0:
                # 賣出
                proceeds = shares * p * (1 - FEE_BPS - TAX_BPS)
                cash += proceeds
                if last_buy_price and p > last_buy_price:
                    wins += 1
                total_closed += 1
                trades.append(Trade("sell", d, p, shares, cash, strategy))
                shares = 0
                last_buy_price = None

            # 紀錄當日總資產
            total = cash + shares * p
            equity_curve.append({"date": d, "equity": round(total, 2), "close": p})

        # 若最後還持倉,以最後一日收盤結算(不計入 win/loss)
        final_price = closes[-1]
        final_value = cash + shares * final_price

        # 計算績效
        total_return_pct = (final_value / initial_cash - 1) * 100
        days = (
            date.fromisoformat(dates[-1]) - date.fromisoformat(dates[0])
        ).days or 1
        years = days / 365.25
        cagr = (
            ((final_value / initial_cash) ** (1 / years) - 1) * 100 if years > 0 else 0
        )

        # 最大回撤
        equity_vals = [e["equity"] for e in equity_curve]
        peak = equity_vals[0]
        max_dd = 0.0
        for v in equity_vals:
            if v > peak:
                peak = v
            dd = (peak - v) / peak * 100 if peak > 0 else 0
            if dd > max_dd:
                max_dd = dd

        # 夏普(年化,無風險利率假設 0)
        import math
        returns: list[float] = []
        for i in range(1, len(equity_vals)):
            if equity_vals[i - 1] > 0:
                returns.append((equity_vals[i] - equity_vals[i - 1]) / equity_vals[i - 1])
        if returns and len(returns) > 1:
            mean_r = sum(returns) / len(returns)
            var_r = sum((r - mean_r) ** 2 for r in returns) / (len(returns) - 1)
            std_r = math.sqrt(var_r) if var_r > 0 else 1e-9
            sharpe = (mean_r / std_r) * math.sqrt(252) if std_r > 0 else 0.0
        else:
            sharpe = 0.0

        win_rate = (wins / total_closed * 100) if total_closed > 0 else 0.0

        return BacktestResult(
            stock_id=stock_id,
            strategy=strategy,
            start_date=dates[0],
            end_date=dates[-1],
            initial_cash=initial_cash,
            final_value=round(final_value, 2),
            total_return_pct=round(total_return_pct, 2),
            cagr_pct=round(cagr, 2),
            max_drawdown_pct=round(max_dd, 2),
            win_rate_pct=round(win_rate, 2),
            trades_count=len(trades),
            sharpe=round(sharpe, 2),
            equity_curve=equity_curve,
            trades=trades,
        )


def result_to_dict(r: BacktestResult) -> dict:
    return {
        "stock_id": r.stock_id,
        "strategy": r.strategy,
        "start_date": r.start_date,
        "end_date": r.end_date,
        "initial_cash": r.initial_cash,
        "final_value": r.final_value,
        "total_return_pct": r.total_return_pct,
        "cagr_pct": r.cagr_pct,
        "max_drawdown_pct": r.max_drawdown_pct,
        "win_rate_pct": r.win_rate_pct,
        "trades_count": r.trades_count,
        "sharpe": r.sharpe,
        "trades": [
            {
                "action": t.action,
                "date": t.date,
                "price": t.price,
                "shares": t.shares,
                "cash_after": t.cash_after,
            }
            for t in r.trades
        ],
        "equity_curve": r.equity_curve,
    }
