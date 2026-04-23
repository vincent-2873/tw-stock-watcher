"""
新聞 API

端點:
  GET /api/news/stock/{stock_id}  個股新聞
  GET /api/news/recent            全市場近期新聞
"""

from __future__ import annotations

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Query

from backend.services.finmind_service import FinMindService
from backend.services.sentiment_service import classify_news_batch
from backend.utils.logger import get_logger
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

router = APIRouter()


def _safe_news(svc: FinMindService, stock_id: Optional[str], start: str) -> tuple[list[dict], dict]:
    """優雅包一層,FinMind 掛掉也不 500。"""
    try:
        rows, meta = svc.get_stock_news(stock_id, start)
        return rows or [], {
            "source": meta.source if meta else "finmind",
            "fetched_at": meta.fetched_at.isoformat() if meta else now_tpe().isoformat(),
        }
    except Exception as e:
        log.warning(f"news 抓取失敗: {e}")
        return [], {
            "source": "finmind",
            "fetched_at": now_tpe().isoformat(),
            "error": "FinMind 新聞端點暫時不可用(可能需付費版)",
        }


@router.get("/news/stock/{stock_id}")
async def get_stock_news(stock_id: str, days: int = Query(7, ge=1, le=30)):
    svc = FinMindService()
    start = (now_tpe().date() - timedelta(days=days)).isoformat()
    rows, meta = _safe_news(svc, stock_id, start)
    rows_sorted = sorted(rows, key=lambda r: r.get("date", ""), reverse=True)
    return {
        "stock_id": stock_id,
        "count": len(rows_sorted),
        "items": [
            {
                "date": r.get("date"),
                "title": r.get("title"),
                "description": r.get("description"),
                "link": r.get("link"),
                "source": r.get("source"),
            }
            for r in rows_sorted[:50]
        ],
        "meta": meta,
    }


@router.get("/news/recent")
async def get_recent_news(
    days: int = Query(2, ge=1, le=7),
    limit: int = Query(30, ge=1, le=100),
    classify: bool = Query(False, description="是否用 Claude 分類 bull/bear/neutral"),
):
    svc = FinMindService()
    start = (now_tpe().date() - timedelta(days=days)).isoformat()
    rows, meta = _safe_news(svc, None, start)
    rows_sorted = sorted(rows, key=lambda r: r.get("date", ""), reverse=True)[:limit]

    items = [
        {
            "date": r.get("date"),
            "stock_id": r.get("stock_id"),
            "title": r.get("title"),
            "description": r.get("description"),
            "link": r.get("link"),
            "source": r.get("source"),
        }
        for r in rows_sorted
    ]

    if classify and items:
        try:
            tags = classify_news_batch(
                [{"title": x["title"], "description": x.get("description")} for x in items]
            )
            for it, tg in zip(items, tags):
                it["sentiment"] = tg.get("sentiment")
                it["importance"] = tg.get("importance")
                it["affected_tickers"] = tg.get("affected_tickers", [])
                it["affected_topics"] = tg.get("affected_topics", [])
                it["one_line"] = tg.get("one_line", "")
        except Exception as e:
            log.warning(f"classify 失敗: {e}")

    return {
        "count": len(items),
        "items": items,
        "classified": classify,
        "meta": meta,
    }


@router.get("/news/headlines")
async def get_headlines(
    days: int = Query(1, ge=1, le=3),
    limit: int = Query(10, ge=1, le=30),
):
    """首頁重點用 — 近 N 日最重要新聞 TOP,已經過 Claude 情緒分類並按重要度排序。"""
    svc = FinMindService()
    start = (now_tpe().date() - timedelta(days=days)).isoformat()
    rows, meta = _safe_news(svc, None, start)
    # 先按日期排,取前 40 則送去分類
    rows_sorted = sorted(rows, key=lambda r: r.get("date", ""), reverse=True)[:40]
    candidates = [
        {
            "date": r.get("date"),
            "stock_id": r.get("stock_id"),
            "title": r.get("title"),
            "description": r.get("description"),
            "link": r.get("link"),
            "source": r.get("source"),
        }
        for r in rows_sorted
    ]
    tags: list[dict] = []
    if candidates:
        try:
            tags = classify_news_batch(
                [{"title": x["title"], "description": x.get("description")} for x in candidates]
            )
        except Exception as e:
            log.warning(f"headlines classify 失敗: {e}")
            tags = [{"sentiment": "neutral", "importance": 0} for _ in candidates]

    merged = []
    for it, tg in zip(candidates, tags):
        merged.append(
            {
                **it,
                "sentiment": tg.get("sentiment", "neutral"),
                "importance": int(tg.get("importance", 0) or 0),
                "affected_tickers": tg.get("affected_tickers", []),
                "affected_topics": tg.get("affected_topics", []),
                "one_line": tg.get("one_line", ""),
            }
        )
    # 按重要度 DESC,同分按日期
    merged.sort(key=lambda x: (x.get("importance", 0), x.get("date", "")), reverse=True)
    return {
        "count": len(merged[:limit]),
        "headlines": merged[:limit],
        "meta": meta,
    }
