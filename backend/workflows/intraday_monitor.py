"""
盤中監控 Workflow — 09:00-13:30 TPE 每 5 分鐘一次(spec 03)

設計:
- 為了 zero-lag:建議用「單一長駐 workflow」內部 loop 方式跑(spec 10)
  本 script 也可被 cron 單次喚起
- 每次 check watchlist 的:
   - 放量突破(成交量 > 前 20 日均量 * 2.0 + 收於 5 日高點)
   - 急跌(單日跌 > 3.5%)
   - 跌破 20MA
   - RSI 超買 / 超賣(>80 or <20)
- 重要變化才 LINE 推播,避免灌爆訊息
- 已推播過的 alert 在同日不重複(deduped by alert_key)

因為 FinMind 盤中資料有約 15 分延遲,這邊用 get_stock_price_realtime(快照)。
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Optional

from backend.services.finmind_service import FinMindService
from backend.services.notification_service import format_alert, get_line_notifier
from backend.utils.logger import get_logger
from backend.utils.time_utils import is_trading_hours, now_tpe
from backend.workflows._base import (
    WorkflowContext,
    get_watchlist,
    save_alert,
)

log = get_logger(__name__)

# 當日 dedup(同一個 alert_key 一天推一次)
_seen_today: set[str] = set()
_seen_date: Optional[str] = None


def _dedup_reset_if_new_day() -> None:
    global _seen_today, _seen_date
    today = date.today().isoformat()
    if _seen_date != today:
        _seen_today = set()
        _seen_date = today


def _snapshot(stock_id: str, fin: FinMindService) -> Optional[dict]:
    """取近 25 日 + 今天的價量快照。"""
    start = (date.today() - timedelta(days=40)).isoformat()
    data, _ = fin.get_stock_price(stock_id, start)
    if len(data) < 21:
        return None
    last = data[-1]
    closes = [float(r.get("close", 0) or 0) for r in data]
    vols = [float(r.get("Trading_Volume", 0) or 0) for r in data]
    highs = [float(r.get("max", r.get("high", 0)) or 0) for r in data]

    prev20_vol_avg = sum(vols[-21:-1]) / 20 if len(vols) >= 21 else 0
    prev5_high = max(highs[-6:-1]) if len(highs) >= 6 else 0
    ma20 = sum(closes[-20:]) / 20
    yesterday_close = closes[-2] if len(closes) > 1 else 0
    today_close = closes[-1]
    change_pct = (today_close - yesterday_close) / yesterday_close * 100 if yesterday_close else 0

    # RSI-14
    rsi = _rsi(closes, 14)

    return {
        "last_close": today_close,
        "change_pct": change_pct,
        "today_volume": vols[-1],
        "avg_vol_20d": prev20_vol_avg,
        "volume_ratio": vols[-1] / prev20_vol_avg if prev20_vol_avg else 0,
        "prev5_high": prev5_high,
        "ma20": ma20,
        "rsi": rsi,
        "today_high": float(last.get("max", last.get("high", 0)) or 0),
        "today_low": float(last.get("min", last.get("low", 0)) or 0),
    }


def _rsi(closes: list[float], period: int = 14) -> Optional[float]:
    if len(closes) <= period:
        return None
    gains, losses = [], []
    for i in range(1, len(closes)):
        d = closes[i] - closes[i - 1]
        gains.append(max(d, 0))
        losses.append(max(-d, 0))
    g = sum(gains[-period:]) / period
    l = sum(losses[-period:]) / period
    if l == 0:
        return 100.0
    return round(100 - 100 / (1 + g / l), 1)


def _scan(stock_id: str, snap: dict) -> list[dict]:
    """依快照產生 alerts。"""
    alerts: list[dict] = []
    key_prefix = f"{stock_id}:{date.today().isoformat()}"

    # 1. 放量突破
    if (
        snap["volume_ratio"] >= 2.0
        and snap["last_close"] > snap["prev5_high"]
        and snap["change_pct"] > 2
    ):
        alerts.append({
            "alert_key": f"{key_prefix}:breakout",
            "severity": "urgent",
            "title": "放量突破",
            "message": (
                f"今日漲 {snap['change_pct']:.2f}%,收 {snap['last_close']},"
                f"突破 5 日高 {snap['prev5_high']},量能 {snap['volume_ratio']:.1f}x"
            ),
        })

    # 2. 急跌
    if snap["change_pct"] <= -3.5:
        alerts.append({
            "alert_key": f"{key_prefix}:crash",
            "severity": "urgent",
            "title": "急跌警示",
            "message": f"跌 {snap['change_pct']:.2f}%,收 {snap['last_close']}",
        })

    # 3. 跌破 20MA
    if snap["last_close"] < snap["ma20"] and snap["change_pct"] < -1:
        alerts.append({
            "alert_key": f"{key_prefix}:below_ma20",
            "severity": "warning",
            "title": "跌破 20MA",
            "message": f"收 {snap['last_close']} < 20MA {snap['ma20']:.2f}",
        })

    # 4. RSI 極值
    if snap["rsi"] and snap["rsi"] > 80:
        alerts.append({
            "alert_key": f"{key_prefix}:rsi_high",
            "severity": "warning",
            "title": "RSI 超買",
            "message": f"RSI {snap['rsi']},短線拉回風險",
        })
    elif snap["rsi"] and snap["rsi"] < 20:
        alerts.append({
            "alert_key": f"{key_prefix}:rsi_low",
            "severity": "warning",
            "title": "RSI 超賣",
            "message": f"RSI {snap['rsi']},留意反彈",
        })

    return alerts


def run_once(*, dry_run: bool = False, force: bool = False) -> dict:
    """跑一輪 scan(每 5 分鐘一次的「一次」)。"""
    ctx = WorkflowContext("intraday_monitor", dry_run=dry_run)
    _dedup_reset_if_new_day()

    if not force and not is_trading_hours():
        return ctx.finish({"skipped": True, "reason": "非盤中時段"})

    fin = FinMindService()
    stocks = get_watchlist()
    all_alerts: list[dict] = []

    for sid in stocks:
        try:
            snap = _snapshot(sid, fin)
            if not snap:
                continue
            for a in _scan(sid, snap):
                if a["alert_key"] in _seen_today:
                    continue
                _seen_today.add(a["alert_key"])
                a.update({
                    "stock_id": sid,
                    "stock_name": _name_of(sid),
                    "time": now_tpe().strftime("%H:%M:%S"),
                    "price": snap["last_close"],
                })
                all_alerts.append(a)
        except Exception as e:
            ctx.error(f"{sid} 監控失敗: {e}")

    # 推播
    if all_alerts and not dry_run:
        notifier = get_line_notifier()
        # 把 urgent 和 warning 分別合併為一則,避免多則訊息
        for sev in ("urgent", "warning"):
            same = [a for a in all_alerts if a["severity"] == sev]
            if same:
                texts = [format_alert(a) for a in same[:5]]
                notifier.push_text("\n\n".join(texts))
        for a in all_alerts:
            save_alert({
                "stock_id": a["stock_id"],
                "alert_type": a["title"],
                "severity": a["severity"],
                "message": a["message"],
                "alert_key": a["alert_key"],
                "metadata": {"price": a.get("price")},
            })

    return ctx.finish({
        "scanned": len(stocks),
        "new_alerts": len(all_alerts),
        "seen_today": len(_seen_today),
        "dry_run": dry_run,
    })


def _name_of(stock_id: str) -> str:
    known = {
        "2317": "鴻海", "2330": "台積電", "2454": "聯發科",
        "2882": "國泰金", "2881": "富邦金", "2303": "聯電",
        "2412": "中華電", "0050": "元大台灣50", "3231": "緯創",
    }
    return known.get(stock_id, "")


# ==========================================
# Loop 模式(spec 10 推薦:GitHub Actions 起一次,內部 loop 到 13:30)
# ==========================================
async def run_loop(*, interval_seconds: int = 300, dry_run: bool = False) -> dict:
    """
    長駐 loop,每 interval 秒跑一次,直到收盤。
    這個 loop 用在 GitHub Actions 單一長 job 以避免 cron drift。
    """
    import asyncio
    runs = 0
    alerts = 0
    started = now_tpe()
    log.info(f"🔄 intraday_monitor loop 開始 interval={interval_seconds}s")

    while is_trading_hours():
        r = run_once(dry_run=dry_run)
        runs += 1
        alerts += r.get("metadata", {}).get("new_alerts", 0)
        # sleep 到下一個 interval 對齊
        now = now_tpe()
        # 對齊到下一個 5 分鐘整點(例如 09:05, 09:10...)
        next_minute = (now.minute // (interval_seconds // 60) + 1) * (interval_seconds // 60)
        if next_minute >= 60:
            next_tick = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        else:
            next_tick = now.replace(minute=next_minute, second=0, microsecond=0)
        wait = max(30, (next_tick - now).total_seconds())
        log.info(f"下次 scan: {next_tick.strftime('%H:%M:%S')} ({wait:.0f}s 後)")
        await asyncio.sleep(wait)

    return {
        "runs": runs,
        "total_alerts": alerts,
        "started_at": started.isoformat(),
        "ended_at": now_tpe().isoformat(),
    }


if __name__ == "__main__":
    import json
    import sys
    dry = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    if "--loop" in sys.argv:
        import asyncio
        r = asyncio.run(run_loop(dry_run=dry))
    else:
        r = run_once(dry_run=dry, force=force)
    print(json.dumps(r, ensure_ascii=False, indent=2, default=str))
