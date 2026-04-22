"""
美股追蹤 Workflow — 21:00-05:00 TPE(spec 04, 15)

目的:台股市場收盤後,美股盤中的重大變化會「次日開盤聯動台股」。
因此需要盤前/盤中/盤後三個切點推播 Vincent。

頻率(GitHub Actions 分三個 job):
  A. 21:00 TPE 美股開盤前(台股 AH 概念):抓 pre-market 幅動
  B. 00:00 TPE 美股中段:盤中觀察
  C. 05:00 TPE 美股收盤後:完整總結 + 台股聯動預測

Phase 3 先實作 (C) 收盤後總結,A/B 用同一 function 開關。
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from backend.services.fmp_service import FMPService
from backend.services.notification_service import get_line_notifier
from backend.utils.logger import get_logger
from backend.utils.time_utils import now_tpe
from backend.workflows._base import (
    WorkflowContext,
    save_report,
)

log = get_logger(__name__)


# 美股重點觀察清單(影響台股的主要標的)
US_FOCUS = [
    ("^GSPC", "S&P 500"),
    ("^NDX", "NASDAQ 100"),
    ("^SOX", "費城半導體"),
    ("QQQ", "QQQ"),
    ("SOXX", "半導體 ETF"),
    ("NVDA", "輝達"),
    ("AAPL", "蘋果"),
    ("TSM", "台積電 ADR"),
    ("AMD", "超微"),
    ("AVGO", "博通"),
    ("META", "Meta"),
    ("MSFT", "微軟"),
    ("AMZN", "亞馬遜"),
    ("GOOGL", "Google"),
    ("TSLA", "特斯拉"),
]

# 台美聯動關係(spec 15)
US_TO_TW = {
    "NVDA": ["2330", "2454", "3231", "3596", "6669"],  # AI 供應鏈
    "AAPL": ["2317", "2330", "3008"],
    "TSM": ["2330"],
    "AMD": ["2330", "3033"],
    "AVGO": ["2330", "3037"],
    "^SOX": ["2330", "2303", "2454", "3035"],
}


def _fetch_quotes() -> list[dict]:
    fmp = FMPService()
    out: list[dict] = []
    for sym, name in US_FOCUS:
        try:
            q, _ = fmp.get_quote(sym)
            if q and len(q) > 0:
                qq = q[0]
                out.append({
                    "symbol": sym,
                    "name": name,
                    "price": qq.get("price"),
                    "change": qq.get("change"),
                    "change_pct": qq.get("changesPercentage") or qq.get("changePercentage"),
                    "volume": qq.get("volume"),
                })
        except Exception as e:
            log.warning(f"{sym} quote 失敗: {e}")
    return out


def _format_msg(session: str, quotes: list[dict]) -> str:
    """
    session: 'premarket' / 'midday' / 'close'
    """
    session_name = {
        "premarket": "🇺🇸 美股開盤前",
        "midday": "🇺🇸 美股盤中",
        "close": "🇺🇸 美股收盤",
    }.get(session, "🇺🇸 美股")
    lines = [session_name, "━━━━━━━━━━━━━"]
    if not quotes:
        lines.append("資料取得失敗,稍後再試")
        return "\n".join(lines)

    for q in quotes:
        pct = q.get("change_pct") or 0
        emoji = "🟢" if pct > 0 else ("🔴" if pct < 0 else "⚪")
        lines.append(
            f"{emoji} {q['symbol']:6s} {q['name']}  "
            f"{q.get('price', '?')}  {pct:+.2f}%"
        )

    # 聯動提示
    big_movers = [q for q in quotes if abs(q.get("change_pct") or 0) > 3]
    if big_movers:
        lines.append("")
        lines.append("🔗 台股聯動觀察:")
        for bm in big_movers[:5]:
            linked = US_TO_TW.get(bm["symbol"], [])
            if linked:
                direction = "偏多" if (bm.get("change_pct") or 0) > 0 else "偏空"
                lines.append(
                    f"  {bm['symbol']} {bm.get('change_pct'):+.2f}% → 台股 {direction}: {', '.join(linked)}"
                )

    lines.append("━━━━━━━━━━━━━")
    return "\n".join(lines)


def run(*, session: str = "close", dry_run: bool = False) -> dict:
    """
    session:
      - premarket: 21:00 開盤前
      - midday: 00:00 盤中
      - close: 05:00 收盤後
    """
    ctx = WorkflowContext(f"us_market_{session}", dry_run=dry_run)
    quotes = _fetch_quotes()
    text = _format_msg(session, quotes)

    line_ok = True
    if not dry_run:
        line_ok = get_line_notifier().push_text(text).ok
        save_report(
            report_type=f"us_{session}",
            report_date=date.today(),
            content={"quotes": quotes, "session": session},
            summary=text[:500],
        )

    return ctx.finish({
        "fetched": len(quotes),
        "session": session,
        "line_ok": line_ok,
        "dry_run": dry_run,
    })


if __name__ == "__main__":
    import json
    import sys
    session = "close"
    for arg in sys.argv:
        if arg.startswith("--session="):
            session = arg.split("=", 1)[1]
    dry = "--dry-run" in sys.argv
    r = run(session=session, dry_run=dry)
    print(json.dumps(r, ensure_ascii=False, indent=2, default=str))
