"""
分析相關 API — 包 decision_engine 給前端
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query

from backend.core.decision_engine import get_engine, result_to_dict
from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

router = APIRouter()


@router.get("/analyze/{stock_id}")
async def analyze_stock(
    stock_id: str,
    skip_ai: bool = Query(True, description="是否略過 AI(省成本)"),
    account_size: float = Query(1_000_000),
    price_window_days: int = Query(180),
    news_summary: Optional[str] = Query(None),
):
    """完整分析一檔股票(四象限 + 風險 + 部位 + 選用 AI)"""
    engine = get_engine()
    try:
        result = engine.analyze(
            stock_id,
            account_size=account_size,
            skip_ai=skip_ai,
            price_window_days=price_window_days,
            news_summary=news_summary,
        )
        return result_to_dict(result)
    except Exception as e:
        log.exception(f"analyze {stock_id} 失敗")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/latest")
async def get_latest_report(
    report_type: str = Query("closing", description="morning/day_trade/closing/us_close"),
    limit: int = Query(1, ge=1, le=10),
):
    """取最近的報告。"""
    try:
        sb = get_service_client()
        res = (
            sb.table("reports")
            .select("id, report_type, report_date, content, summary, generated_at")
            .eq("report_type", report_type)
            .order("report_date", desc=True)
            .limit(limit)
            .execute()
        )
        return {"reports": res.data or []}
    except Exception as e:
        log.exception("reports 讀取失敗")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/recent")
async def get_recent_alerts(
    days: int = Query(3, ge=1, le=30),
    limit: int = Query(50, ge=1, le=200),
):
    """近 N 日的 alert。"""
    try:
        sb = get_service_client()
        since = (date.today() - timedelta(days=days)).isoformat()
        res = (
            sb.table("alerts")
            .select("*")
            .gte("triggered_at", since)
            .order("triggered_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"alerts": res.data or []}
    except Exception as e:
        log.exception("alerts 讀取失敗")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/watchlist")
async def get_watchlist(
    user_id: Optional[str] = Query(None),
    include_analysis: bool = Query(False),
):
    """取自選股(可選帶即時分析結果)。"""
    try:
        sb = get_service_client()
        q = (
            sb.table("watchlist")
            .select("stock_id, added_at, notes")
            .order("added_at", desc=True)
        )
        if user_id:
            q = q.eq("user_id", user_id)
        res = q.execute()
        items = res.data or []

        if include_analysis:
            engine = get_engine()
            for i in items:
                try:
                    r = engine.analyze(i["stock_id"], skip_ai=True, price_window_days=90)
                    d = result_to_dict(r)
                    i["analysis"] = {
                        "recommendation": d["recommendation"],
                        "recommendation_emoji": d["recommendation_emoji"],
                        "total_score": d["total_score"],
                        "confidence": d["confidence"],
                    }
                except Exception as e:
                    i["analysis"] = {"error": str(e)[:120]}
        return {"items": items, "count": len(items), "tpe_now": now_tpe().isoformat()}
    except Exception as e:
        log.exception("watchlist 讀取失敗")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recommendations/recent")
async def get_recent_recommendations(
    limit: int = Query(20, ge=1, le=100),
    report_type: Optional[str] = Query(None),
):
    """最近的推薦紀錄(供歷史追蹤)。"""
    try:
        sb = get_service_client()
        q = sb.table("recommendations").select("*").order("created_at", desc=True).limit(limit)
        if report_type:
            q = q.eq("report_type", report_type)
        res = q.execute()
        return {"items": res.data or []}
    except Exception as e:
        log.exception("recommendations 讀取失敗")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/system/health")
async def get_system_health(limit: int = Query(20, ge=1, le=100)):
    """最近系統健康紀錄(scheduler drift 等)。"""
    try:
        sb = get_service_client()
        res = (
            sb.table("system_health")
            .select("*")
            .order("checked_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"items": res.data or []}
    except Exception as e:
        log.exception("system_health 讀取失敗")
        raise HTTPException(status_code=500, detail=str(e))
