"""
早報 Workflow — 每個交易日 08:00 TPE 觸發

流程:
1. 確認今日是交易日(週一-週五,暫不處理台股特殊休市)
2. 抓取昨夜美股收盤(FMP:SPX / NDX / QQQ / SOXX / NVDA / AAPL / TSM)
3. 跑 watchlist 四象限分析(skip_ai,只靠量化面)
4. 取 total_score >= 70 的清單作為當日觀察
5. 彙整為 LINE 推播 + 存 reports 表

Zero-lag(spec 10):GitHub Actions 07:55 啟動,內部 wait_until("08:00:00")。
但本 script 本身不 sleep,讓 scripts/run_morning_report.py 控制。
"""

from __future__ import annotations

from datetime import date
from typing import Any

from backend.core.decision_engine import get_engine, result_to_dict
from backend.services.fmp_service import FMPService
from backend.services.notification_service import (
    format_morning_report,
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


def _fetch_us_overnight() -> dict[str, Any]:
    """抓美股主要指數與 Vincent 關注股昨夜收盤。"""
    fmp = FMPService()
    symbols = ["^GSPC", "^NDX", "QQQ", "SOXX", "NVDA", "AAPL", "TSM", "AMD", "META"]
    result: dict[str, Any] = {}
    for s in symbols:
        try:
            q, _ = fmp.get_quote(s)
            if q:
                result[s] = {
                    "price": q[0].get("price"),
                    "change": q[0].get("change"),
                    "changes_percentage": q[0].get("changesPercentage") or q[0].get("changePercentage"),
                }
        except Exception as e:
            log.warning(f"FMP quote {s} 失敗: {e}")
    return result


def _analyze_watchlist(skip_ai: bool = True) -> list[dict]:
    """對 watchlist 做快速分析,回傳 dict 陣列(已排序,高分在前)。"""
    engine = get_engine()
    stocks = get_watchlist()
    items: list[dict] = []
    for sid in stocks:
        try:
            # 早報用量化面為主,省 AI 成本
            r = engine.analyze(sid, skip_ai=skip_ai, price_window_days=120)
            d = result_to_dict(r)
            highlight = _make_highlight(d)
            items.append({
                "stock_id": d["stock_id"],
                "stock_name": d["stock_name"],
                "recommendation": d["recommendation"],
                "recommendation_emoji": d["recommendation_emoji"],
                "total_score": d["total_score"],
                "confidence": d["confidence"],
                "highlight": highlight,
                "detail": d,
            })
        except Exception as e:
            log.error(f"早報分析 {sid} 失敗: {e}")

    # 按總分排序
    items.sort(key=lambda x: x["total_score"], reverse=True)
    return items


def _make_highlight(d: dict) -> str:
    """從分析結果萃取一句 highlight。"""
    warns = []
    for key in ["technical", "chip", "fundamental"]:
        warns += d["evidence"][key].get("warnings", [])
    if warns:
        return warns[0]
    # 用最高分構面產生 highlight
    ev = d["evidence"]
    best = max(ev.items(), key=lambda kv: kv[1]["score"])
    return f"{best[0]} 強: {best[1]['score']}/20"


def run(*, dry_run: bool = False, force: bool = False) -> dict:
    """
    執行早報 workflow。

    Args:
        dry_run: True 只產出結果,不 push LINE / 不存 DB
        force: True 即使週末也執行(測試用)
    """
    ctx = WorkflowContext("morning_report", dry_run=dry_run)

    if not force and not is_weekday():
        msg = "今日非交易日,跳過早報"
        log.info(msg)
        return ctx.finish({"skipped": True, "reason": msg})

    today = date.today()

    # 1) 美股昨夜
    try:
        us = _fetch_us_overnight()
    except Exception as e:
        ctx.error(f"美股抓取失敗: {e}")
        us = {}

    # 2) watchlist 分析
    items = _analyze_watchlist(skip_ai=True)
    watch_candidates = [i for i in items if i["total_score"] >= 55]

    # 3) 推播文字
    line_text_items = [
        {
            "stock_id": i["stock_id"],
            "stock_name": i["stock_name"],
            "recommendation_emoji": i["recommendation_emoji"],
            "total_score": i["total_score"],
            "confidence": i["confidence"],
            "highlight": i["highlight"],
        }
        for i in watch_candidates[:5]
    ]
    line_text = format_morning_report(line_text_items)

    # 美股摘要附加
    if us:
        us_lines = ["", "🇺🇸 昨夜美股:"]
        for s, d in us.items():
            ch = d.get("changes_percentage", 0) or 0
            emoji = "🟢" if ch > 0 else ("🔴" if ch < 0 else "⚪")
            us_lines.append(f"  {emoji} {s}: {d.get('price', '?')}  {ch:+.2f}%")
        line_text += "\n" + "\n".join(us_lines)

    # 4) push + 存 DB
    line_ok = True
    if not dry_run:
        line_ok = get_line_notifier().push_text(line_text).ok
        for i in watch_candidates[:10]:
            save_recommendation({
                "stock_id": i["stock_id"],
                "recommendation": i["recommendation"],
                "confidence": i["confidence"],
                "total_score": i["total_score"],
                "report_type": "morning",
                "evidence": i["detail"].get("evidence"),
                "data_snapshot": i["detail"].get("data_snapshot"),
            })
        save_report(
            report_type="morning",
            report_date=today,
            content={
                "items": [dict(i, detail=None) for i in items],
                "us_overnight": us,
                "generated_at": now_tpe().isoformat(),
            },
            summary=line_text[:500],
        )

    return ctx.finish({
        "analyzed": len(items),
        "candidates": len(watch_candidates),
        "line_ok": line_ok,
        "dry_run": dry_run,
    })


if __name__ == "__main__":
    import json
    import sys
    dry = "--dry-run" in sys.argv
    force = "--force" in sys.argv
    r = run(dry_run=dry, force=force)
    print(json.dumps(r, ensure_ascii=False, indent=2, default=str))
