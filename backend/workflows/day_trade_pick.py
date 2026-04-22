"""
當沖推薦 Workflow — 每個交易日 08:30 TPE 觸發(spec 02)

入圍條件(硬性):
- 過去 5 日平均成交量 >= 5000 張
- 過去 5 日平均振幅 >= 2%(有波動才能當沖)
- 非處置股 / 全額交割(Phase 7 補,目前先過)

類型判斷:
  「順勢多」:昨日收紅 + 站上 5MA + 量能放大
  「反彈空」:近 5 日跌 > 3% + RSI < 40
  「慣性續強」:昨日漲停 + 外資買超

每檔輸出:進場區間、停損、停利、勝率估計(簡版)。
最多 3 檔推薦。
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Optional

from backend.services.finmind_service import FinMindService
from backend.services.notification_service import format_day_trade_picks, get_line_notifier
from backend.utils.logger import get_logger
from backend.utils.time_utils import is_weekday
from backend.workflows._base import (
    WorkflowContext,
    get_watchlist,
    save_report,
)

log = get_logger(__name__)


# ==========================================
# 篩選
# ==========================================
def _stats_for(stock_id: str, fin: FinMindService) -> Optional[dict[str, Any]]:
    """取 5 日量能 + 振幅 + 簡易 RSI。"""
    start = (date.today() - timedelta(days=30)).isoformat()
    data, _ = fin.get_stock_price(stock_id, start)
    if len(data) < 6:
        return None
    recent = data[-6:]  # 含今天的前 5 日
    # 昨天 = data[-1]
    last = data[-1]
    prev5 = data[-6:-1]
    avg_vol = sum(float(r.get("Trading_Volume", 0) or 0) for r in prev5) / 5
    swings = [
        (float(r.get("max", r.get("high", 0)) or 0) - float(r.get("min", r.get("low", 0)) or 0))
        / max(float(r.get("close", 1) or 1), 1) * 100
        for r in prev5
    ]
    avg_swing = sum(swings) / len(swings) if swings else 0

    # 5 日價格變化
    p5 = float(prev5[0].get("close", 0) or 0)
    last_close = float(last.get("close", 0) or 0)
    change_5d = (last_close - p5) / p5 * 100 if p5 else 0

    # 簡易 5MA
    ma5 = sum(float(r.get("close", 0) or 0) for r in prev5) / 5

    # RSI-14 粗估(用 14 個 close)
    closes = [float(r.get("close", 0) or 0) for r in data[-15:]]
    rsi = _rsi(closes, 14) if len(closes) >= 15 else None

    return {
        "last_close": last_close,
        "last_volume_lots": float(last.get("Trading_Volume", 0) or 0) / 1000,
        "avg_vol_5d_lots": avg_vol / 1000,
        "avg_swing_5d_pct": avg_swing,
        "change_5d_pct": change_5d,
        "ma5": ma5,
        "rsi14": rsi,
        "is_limit_up": float(last.get("spread", 0) or 0) >= last_close * 0.09,
    }


def _rsi(closes: list[float], period: int = 14) -> float:
    gains = []
    losses = []
    for i in range(1, len(closes)):
        diff = closes[i] - closes[i - 1]
        gains.append(max(diff, 0))
        losses.append(max(-diff, 0))
    g = sum(gains[-period:]) / period
    l = sum(losses[-period:]) / period
    if l == 0:
        return 100
    rs = g / l
    return round(100 - 100 / (1 + rs), 1)


def _classify(stats: dict[str, Any]) -> Optional[dict[str, Any]]:
    """判斷當沖類型;不合格回傳 None。"""
    # 硬性門檻
    if stats["avg_vol_5d_lots"] < 5000:
        return None
    if stats["avg_swing_5d_pct"] < 2.0:
        return None

    entry = stats["last_close"]
    ma5 = stats["ma5"]
    rsi = stats["rsi14"]

    # 順勢多
    if entry > ma5 and stats["change_5d_pct"] > 2 and rsi and 50 < rsi < 75:
        return {
            "type": "順勢多",
            "direction": "long",
            "win_rate": 55 + int(min(stats["change_5d_pct"], 8)),  # 粗估
            "entry": round(entry, 2),
            "stop": round(entry * 0.98, 2),  # -2%
            "target": round(entry * 1.03, 2),  # +3%
            "reasoning": f"站上 5MA、5 日漲 {stats['change_5d_pct']:.1f}%、RSI {rsi}",
        }
    # 慣性續強
    if stats["is_limit_up"]:
        return {
            "type": "慣性續強",
            "direction": "long",
            "win_rate": 60,
            "entry": round(entry * 1.005, 2),
            "stop": round(entry * 0.97, 2),
            "target": round(entry * 1.05, 2),
            "reasoning": "昨日漲停,量能維持",
        }
    # 反彈空
    if stats["change_5d_pct"] < -3 and rsi and rsi < 40:
        return {
            "type": "反彈空",
            "direction": "short",
            "win_rate": 50,
            "entry": round(entry, 2),
            "stop": round(entry * 1.025, 2),
            "target": round(entry * 0.96, 2),
            "reasoning": f"5 日跌 {stats['change_5d_pct']:.1f}%、RSI {rsi}",
        }
    return None


# ==========================================
# 主流程
# ==========================================
def run(*, dry_run: bool = False, force: bool = False) -> dict:
    ctx = WorkflowContext("day_trade_pick", dry_run=dry_run)
    if not force and not is_weekday():
        return ctx.finish({"skipped": True, "reason": "非交易日"})

    fin = FinMindService()
    stocks = get_watchlist()
    picks: list[dict] = []

    for sid in stocks:
        try:
            stats = _stats_for(sid, fin)
            if not stats:
                continue
            cls = _classify(stats)
            if cls:
                # 加股名
                picks.append({
                    "stock_id": sid,
                    "stock_name": _name_of(sid),
                    **cls,
                    "stats": stats,
                })
        except Exception as e:
            ctx.error(f"分析 {sid} 失敗: {e}")

    # 排序:勝率高到低,取 3 檔
    picks.sort(key=lambda x: x["win_rate"], reverse=True)
    picks = picks[:3]

    text = format_day_trade_picks(picks)
    line_ok = True
    if not dry_run:
        line_ok = get_line_notifier().push_text(text).ok
        save_report(
            report_type="day_trade",
            report_date=date.today(),
            content={"picks": picks, "analyzed": len(stocks)},
            summary=text[:500],
        )

    return ctx.finish({
        "analyzed": len(stocks),
        "picks": len(picks),
        "line_ok": line_ok,
        "dry_run": dry_run,
    })


def _name_of(stock_id: str) -> str:
    known = {
        "2317": "鴻海", "2330": "台積電", "2454": "聯發科",
        "2882": "國泰金", "2881": "富邦金", "2303": "聯電",
        "2412": "中華電", "0050": "元大台灣50", "3231": "緯創",
    }
    return known.get(stock_id, "")


if __name__ == "__main__":
    import json
    import sys
    dry = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    r = run(dry_run=dry, force=force)
    print(json.dumps(r, ensure_ascii=False, indent=2, default=str))
