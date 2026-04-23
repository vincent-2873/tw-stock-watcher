"""
Intel Hub API(Phase 1 Day 4-7)

端點:
  GET  /api/intel/sources          列出資料源
  POST /api/intel/refresh          手動觸發抓取(或定時 cron 呼叫)
  POST /api/intel/refresh/{source_id}  抓單一來源
  GET  /api/intel/articles         最近 N 篇文章
  GET  /api/intel/articles/{id}    單篇文章
  GET  /api/intel/people           重點人物名單
  GET  /api/intel/people/statements 重點人物最新發言
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, Query

from backend.services.article_analyzer import ArticleAnalyzer
from backend.services.intel_crawler import IntelCrawler
from backend.services.people_extractor import extract_statements as _extract_people
from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe
import os

log = get_logger(__name__)
router = APIRouter()


def _sb():
    return get_service_client()


def _require_admin(token: str | None) -> None:
    configured = os.getenv("ADMIN_TOKEN")
    if not configured:
        raise HTTPException(503, "ADMIN_TOKEN not configured")
    if token != configured:
        raise HTTPException(401, "bad admin token")


@router.get("/intel/sources")
async def list_sources(active_only: bool = Query(True)) -> dict[str, Any]:
    q = _sb().table("intel_sources").select("*").order("tier").order("name")
    if active_only:
        q = q.eq("is_active", True)
    rows = q.execute().data or []
    return {"count": len(rows), "sources": rows}


@router.post("/intel/refresh")
async def refresh_all(x_admin_token: str | None = Header(default=None)) -> dict[str, Any]:
    _require_admin(x_admin_token)
    return IntelCrawler().run_all()


@router.post("/intel/analyze")
async def analyze_pending(
    limit: int = Query(20, ge=1, le=50),
    x_admin_token: str | None = Header(default=None),
) -> dict[str, Any]:
    """批次 AI 分析 pending 文章(Phase 2)"""
    _require_admin(x_admin_token)
    return ArticleAnalyzer().run_batch(limit)


@router.post("/intel/cron")
async def cron_tick(
    x_admin_token: str | None = Header(default=None),
    crawl: bool = Query(True),
    analyze: bool = Query(True),
    extract_people: bool = Query(False),  # 預設 false, 避免 cron 拖掛容器
    analyze_limit: int = Query(15, ge=1, le=30),
) -> dict[str, Any]:
    """一次跑完:抓 RSS + AI 分析 — 給 GitHub Actions 打。
    extract_people 要另外一個 cron 明確呼叫, 避免單次 handler 超 90s。"""
    _require_admin(x_admin_token)
    out: dict[str, Any] = {"tpe_now": now_tpe().isoformat()}
    if crawl:
        out["crawl"] = IntelCrawler().run_all()
    if analyze:
        out["analyze"] = ArticleAnalyzer().run_batch(analyze_limit)
    if extract_people:
        # opt-in 才跑, 限制 days=3 limit=50
        try:
            out["extract_people"] = _extract_people(days=3, limit=50)
        except Exception as e:
            out["extract_people_error"] = str(e)
    return out


@router.post("/intel/people/extract")
async def extract_people_now(
    x_admin_token: str | None = Header(default=None),
    days: int = Query(14, ge=1, le=60),
    limit: int = Query(200, ge=10, le=1000),
) -> dict[str, Any]:
    """手動觸發:掃 intel_articles 萃取重點人物發言(Phase 2.1)"""
    _require_admin(x_admin_token)
    import traceback
    try:
        return _extract_people(days=days, limit=limit)
    except Exception as e:
        log.error(f"people extract 失敗: {e}\n{traceback.format_exc()}")
        raise HTTPException(500, detail=f"{type(e).__name__}: {e}")


@router.post("/intel/refresh/{source_id}")
async def refresh_one(
    source_id: int,
    x_admin_token: str | None = Header(default=None),
) -> dict[str, Any]:
    _require_admin(x_admin_token)
    return IntelCrawler().run_single(source_id)


@router.get("/intel/articles")
async def list_articles(
    limit: int = Query(30, ge=1, le=200),
    sentiment: str | None = Query(None, description="bullish/bearish/neutral/mixed"),
    min_importance: int = Query(0, ge=0, le=10),
    analyzed_only: bool = Query(False),
) -> dict[str, Any]:
    q = (
        _sb()
        .table("intel_articles")
        .select(
            "id,source_id,title,url,author,published_at,language,"
            "ai_summary,ai_sentiment,ai_sentiment_score,ai_confidence,"
            "ai_importance,ai_urgency,ai_affected_stocks,ai_quack_perspective,"
            "ai_analyzed_at,captured_at"
        )
        .order("published_at", desc=True)
        .limit(limit)
    )
    if sentiment:
        q = q.eq("ai_sentiment", sentiment)
    if min_importance > 0:
        q = q.gte("ai_importance", min_importance)
    if analyzed_only:
        q = q.not_.is_("ai_analyzed_at", "null")
    rows = q.execute().data or []

    # 附上 source name
    source_ids = {r["source_id"] for r in rows if r.get("source_id")}
    sources_map: dict[int, str] = {}
    if source_ids:
        sres = (
            _sb()
            .table("intel_sources")
            .select("id,name,type,region")
            .in_("id", list(source_ids))
            .execute()
        )
        for s in sres.data or []:
            sources_map[s["id"]] = s
    for r in rows:
        sid = r.get("source_id")
        if sid and sid in sources_map:
            r["source"] = sources_map[sid]

    return {
        "count": len(rows),
        "articles": rows,
        "tpe_now": now_tpe().isoformat(),
    }


@router.get("/intel/articles/{article_id}")
async def get_article(article_id: int) -> dict[str, Any]:
    rows = (
        _sb()
        .table("intel_articles")
        .select("*")
        .eq("id", article_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(404, "article not found")
    art = rows[0]
    sid = art.get("source_id")
    if sid:
        src = (
            _sb()
            .table("intel_sources")
            .select("id,name,type,region")
            .eq("id", sid)
            .limit(1)
            .execute()
            .data
            or []
        )
        art["source"] = src[0] if src else None
    return art


@router.get("/intel/people")
async def list_people(category: str | None = Query(None)) -> dict[str, Any]:
    q = (
        _sb()
        .table("watched_people")
        .select("*")
        .eq("is_active", True)
        .order("priority", desc=True)
    )
    if category:
        q = q.eq("category", category)
    rows = q.execute().data or []
    return {"count": len(rows), "people": rows}


@router.get("/intel/people/statements")
async def list_statements(
    limit: int = Query(10, ge=1, le=50),
    min_urgency: int = Query(0, ge=0, le=10),
) -> dict[str, Any]:
    q = (
        _sb()
        .table("people_statements")
        .select("*")
        .order("said_at", desc=True)
        .limit(limit)
    )
    if min_urgency > 0:
        q = q.gte("ai_urgency", min_urgency)
    rows = q.execute().data or []

    # attach person name
    pids = {r["person_id"] for r in rows if r.get("person_id")}
    if pids:
        pres = (
            _sb()
            .table("watched_people")
            .select("id,name,name_zh,role,category,priority,x_handle,affected_stocks")
            .in_("id", list(pids))
            .execute()
        )
        pmap = {p["id"]: p for p in (pres.data or [])}
        for r in rows:
            pid = r.get("person_id")
            if pid and pid in pmap:
                r["person"] = pmap[pid]

    return {"count": len(rows), "statements": rows, "tpe_now": now_tpe().isoformat()}
