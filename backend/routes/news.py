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
    days: int = Query(2, ge=1, le=7), limit: int = Query(30, ge=1, le=100)
):
    svc = FinMindService()
    start = (now_tpe().date() - timedelta(days=days)).isoformat()
    rows, meta = _safe_news(svc, None, start)
    rows_sorted = sorted(rows, key=lambda r: r.get("date", ""), reverse=True)
    return {
        "count": len(rows_sorted),
        "items": [
            {
                "date": r.get("date"),
                "stock_id": r.get("stock_id"),
                "title": r.get("title"),
                "link": r.get("link"),
                "source": r.get("source"),
            }
            for r in rows_sorted[:limit]
        ],
        "meta": meta,
    }
