"""
盤後解析 Workflow — 每個交易日 14:30 TPE 觸發(spec 04)

流程:
1. 大盤:TAIEX 收盤、量、三大法人
2. watchlist 每檔做完整分析(啟用 AI catalyst + bull/bear,但成本守日上限)
3. 產出:
   - 大盤總結
   - 大漲大跌 Top 5
   - 推薦清單(total_score >= 70)
4. 推 LINE + 存 reports + 存每檔 recommendation(30/60/90 天後追蹤)
"""

from __future__ import annotations

from datetime import date, timedelta

from backend.core.decision_engine import get_engine, result_to_dict
from backend.services.finmind_service import FinMindService
from backend.services.notification_service import (
    format_closing_report,
    get_line_notifier,
)
from backend.utils.logger import get_logger
from backend.utils.time_utils import is_weekday, now_tpe
from backend.workflows._base import (
    WorkflowContext,
    get_watchlist,
    save_recommendation,
    save_report,
)

log = get_logger(__name__)


def _market_summary(fin: FinMindService) -> dict:
    """加權指數 + 三大法人合計。"""
    start = (date.today() - timedelta(days=10)).isoformat()
    tx, _ = fin.get_stock_price("TAIEX", start)
    out = {
        "taiex_close": None,
        "taiex_change": "",
        "volume": None,
        "inst_net": None,
    }
    if tx and len(tx) >= 2:
        today = float(tx[-1].get("close", 0) or 0)
        prev = float(tx[-2].get("close", 0) or 0)
        vol = float(tx[-1].get("Trading_Volume", 0) or 0)
        ch = today - prev
        ch_pct = (ch / prev * 100) if prev else 0
        out["taiex_close"] = round(today, 2)
        out["taiex_change"] = f"{ch:+.2f} ({ch_pct:+.2f}%)"
        out["volume"] = round(vol / 100_000_000, 0)  # 億

    # 三大法人(今天總和)
    try:
        inst, _ = fin.get_institutional_investors("TAIEX", start)
        if inst:
            latest_date = inst[-1].get("date")
            today_rows = [r for r in inst if r.get("date") == latest_date]
            net = sum(float(r.get("buy", 0) or 0) - float(r.get("sell", 0) or 0) for r in today_rows)
            out["inst_net"] = round(net / 100_000_000, 0)
    except Exception as e:
        log.warning(f"三大法人抓取失敗: {e}")

    return out


def _big_movers(fin: FinMindService, stocks: list[str]) -> tuple[list[dict], list[dict]]:
    """從 watchlist 挑當日大漲大跌。"""
    start = (date.today() - timedelta(days=5)).isoformat()
    winners: list[dict] = []
    losers: list[dict] = []
    for sid in stocks:
        try:
            d, _ = fin.get_stock_price(sid, start)
            if len(d) < 2:
                continue
            today = float(d[-1].get("close", 0) or 0)
            prev = float(d[-2].get("close", 0) or 0)
            if prev == 0:
                continue
            pct = (today - prev) / prev * 100
            item = {"stock_id": sid, "name": _name_of(sid), "change_pct": round(pct, 2), "close": today}
            if pct >= 3:
                winners.append(item)
            elif pct <= -3:
                losers.append(item)
        except Exception as e:
            log.warning(f"{sid} 漲跌計算失敗: {e}")
    winners.sort(key=lambda x: x["change_pct"], reverse=True)
    losers.sort(key=lambda x: x["change_pct"])
    return winners[:5], losers[:5]


def _full_analyses(stocks: list[str], use_ai: bool) -> list[dict]:
    """用 decision_engine 跑完整分析(選用 AI)。"""
    engine = get_engine()
    items: list[dict] = []
    for sid in stocks:
        try:
            r = engine.analyze(
                sid,
                skip_ai=not use_ai,
                news_summary="(Phase 3 暫用 stock_name 代替新聞摘要)" if use_ai else None,
                price_window_days=180,
            )
            items.append(result_to_dict(r))
        except Exception as e:
            log.error(f"{sid} 分析失敗: {e}")
    return items


def run(*, dry_run: bool = False, force: bool = False, use_ai: bool = False) -> dict:
    """
    盤後解析主流程。
    use_ai=False:量化面為主(預設,省 $)。如需啟用 AI,傳 True 或吃 env CLOSING_USE_AI=1
    """
    import os
    if not use_ai and os.getenv("CLOSING_USE_AI", "0") == "1":
        use_ai = True

    ctx = WorkflowContext("closing_report", dry_run=dry_run)
    if not force and not is_weekday():
        return ctx.finish({"skipped": True, "reason": "非交易日"})

    fin = FinMindService()
    summary = _market_summary(fin)
    stocks = get_watchlist()
    winners, losers = _big_movers(fin, stocks)
    analyses = _full_analyses(stocks, use_ai=use_ai)

    # Top picks
    top_picks = [a for a in analyses if a["total_score"] >= 70]
    top_picks.sort(key=lambda x: x["total_score"], reverse=True)

    # LINE 訊息
    text_summary = {
        **summary,
        "big_winners": winners,
        "big_losers": losers,
    }
    line_text = format_closing_report(text_summary)
    if top_picks:
        line_text += "\n\n🎯 高分股:"
        for p in top_picks[:5]:
            line_text += f"\n  {p['recommendation_emoji']} {p['stock_id']} {p['stock_name']}  {p['total_score']}/95"

    line_ok = True
    if not dry_run:
        line_ok = get_line_notifier().push_text(line_text).ok
        for p in top_picks:
            save_recommendation({
                "stock_id": p["stock_id"],
                "recommendation": p["recommendation"],
                "confidence": p["confidence"],
                "total_score": p["total_score"],
                "report_type": "closing",
                "evidence": p["evidence"],
                "data_snapshot": p["data_snapshot"],
            })
        save_report(
            report_type="closing",
            report_date=date.today(),
            content={
                "summary": summary,
                "winners": winners,
                "losers": losers,
                "analyses": analyses,
                "top_picks": top_picks,
            },
            summary=line_text[:500],
        )

    return ctx.finish({
        "analyzed": len(analyses),
        "top_picks": len(top_picks),
        "winners": len(winners),
        "losers": len(losers),
        "line_ok": line_ok,
        "use_ai": use_ai,
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
    ai = "--ai" in sys.argv
    r = run(dry_run=dry, force=force, use_ai=ai)
    print(json.dumps(r, ensure_ascii=False, indent=2, default=str))
