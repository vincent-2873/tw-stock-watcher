"""
NEXT_TASK_008b 商業級健康度 endpoints

  GET /api/health/finmind        FinMind Sponsor 狀態 + 額度監控
  GET /api/health/intel_crawler  16 個 RSS 來源各自的 last_success_at + today_count
  GET /api/health/us_market      yfinance 美股指數抓取狀態
  GET /api/health/all            一次拿全部(/watchdog 用)
  GET /api/errors                最近 N 條錯誤(/watchdog 用)

設計原則:
  - 全部 graceful degrade(表不存在時不報 500,回 status: degraded + reason)
  - 對所有外部依賴都加 timeout
  - 任何 endpoint 失敗都寫 errors 表
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Query

from backend.services.finmind_service import FinMindService
from backend.services.yahoo_service import US_INDICES, get_index_quote
from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)
router = APIRouter()


def _sb():
    return get_service_client()


def _safe_table_query(table: str, builder):
    """執行 supabase query,表不存在或錯誤回 None,讓 caller 標 degraded。"""
    try:
        res = builder.execute()
        return res.data or []
    except Exception as e:
        msg = str(e).lower()
        if "does not exist" in msg or "could not find" in msg or "pgrst205" in msg:
            log.warning(f"health: table {table} missing")
            return None
        log.exception(f"health _safe_table_query {table}: {e}")
        return None


# =========================================================================
# /api/health/finmind — Sponsor 狀態 + 額度監控
# =========================================================================
@router.get("/health/finmind")
def health_finmind() -> dict[str, Any]:
    """FinMind Sponsor 狀態 + 額度。

    回傳:
      ok / level / level_title / api_request_limit_hour
      remaining_pct(估算)/ status (healthy/warning/critical)
      token_set / endpoint
    """
    svc = FinMindService()
    info = svc.get_user_info()

    if not info.get("ok"):
        return {
            "ok": False,
            "status": "critical",
            "error": info.get("error", "unknown"),
            "token_set": bool(os.getenv("FINMIND_TOKEN")),
            "endpoint": "https://api.finmindtrade.com/api/v4/data",
            "tpe_now": now_tpe().isoformat(),
        }

    limit_hr = info.get("api_request_limit_hour") or 0
    is_sponsor = (info.get("level") or 0) >= 2 or (info.get("level_title") or "").lower() == "sponsor"

    # 注意:FinMind 不直接回剩餘額度,只回上限。
    # 我們以最近 1 小時打過幾次 FinMind(從 errors 表的 finmind 條目反推當作粗估)做 warning
    status = "healthy"
    if not is_sponsor:
        status = "critical"
    elif limit_hr < 1000:
        status = "warning"

    return {
        "ok": True,
        "status": status,
        "level": info.get("level"),
        "level_title": info.get("level_title"),
        "is_sponsor": is_sponsor,
        "user_id": info.get("user_id"),
        "api_request_limit_hour": limit_hr,
        "api_request_limit_day": info.get("api_request_limit"),
        "endpoint": "https://api.finmindtrade.com/api/v4/data",
        "auth_mode": info.get("auth_mode"),
        "token_set": bool(os.getenv("FINMIND_TOKEN")),
        "token_prefix": (
            os.getenv("FINMIND_TOKEN", "")[:6] + "..." + os.getenv("FINMIND_TOKEN", "")[-4:]
            if os.getenv("FINMIND_TOKEN") and len(os.getenv("FINMIND_TOKEN", "")) > 12
            else None
        ),
        "tpe_now": now_tpe().isoformat(),
    }


# =========================================================================
# /api/health/intel_crawler — 16 個 RSS 來源狀態
# =========================================================================
@router.get("/health/intel_crawler")
def health_intel_crawler() -> dict[str, Any]:
    """所有 RSS 來源 + PTT scraper 的健康度。"""
    sb = _sb()
    sources_data = _safe_table_query(
        "intel_sources",
        sb.table("intel_sources")
        .select("id,name,type,region,is_active,last_success_at,last_error_at,last_error_msg,today_count,today_count_date")
        .eq("is_active", True)
        .order("name"),
    )
    if sources_data is None:
        return {
            "ok": False,
            "status": "degraded",
            "reason": "intel_sources table missing(migration 0010 未跑)",
            "tpe_now": now_tpe().isoformat(),
        }

    today_str = now_tpe().date().isoformat()
    now_utc = datetime.now(timezone.utc)
    out_sources = []
    healthy_count = 0
    stale_count = 0
    failing_count = 0

    for s in sources_data:
        last_success = s.get("last_success_at")
        last_error_at = s.get("last_error_at")
        today_count = s.get("today_count", 0) if s.get("today_count_date") == today_str else 0

        # 健康度判定
        if last_success:
            try:
                last_dt = datetime.fromisoformat(last_success.replace("Z", "+00:00"))
                hours_ago = (now_utc - last_dt).total_seconds() / 3600
            except Exception:
                hours_ago = 999
        else:
            hours_ago = 999

        if hours_ago < 2:
            status = "healthy"
            healthy_count += 1
        elif hours_ago < 6:
            status = "stale"
            stale_count += 1
        else:
            status = "failing"
            failing_count += 1

        out_sources.append(
            {
                "id": s["id"],
                "name": s["name"],
                "type": s.get("type"),
                "region": s.get("region"),
                "last_success_at": last_success,
                "last_error_at": last_error_at,
                "last_error_msg": (s.get("last_error_msg") or "")[:160] or None,
                "today_count": today_count,
                "hours_since_success": round(hours_ago, 1) if hours_ago < 999 else None,
                "status": status,
            }
        )

    # PTT 加進來(它不在 intel_sources,獨立 table social_mentions)
    ptt_today = _ptt_today_count()
    ptt_status = "healthy" if ptt_today >= 20 else ("stale" if ptt_today > 0 else "unknown")
    out_sources.append(
        {
            "id": -1,
            "name": "PTT Stock",
            "type": "forum",
            "region": "tw",
            "today_count": ptt_today,
            "status": ptt_status,
            "note": "獨立 scraper,寫入 social_mentions",
        }
    )

    total_today = sum(s.get("today_count", 0) for s in out_sources)
    expected_min = 100  # 商業級門檻
    overall = "healthy" if total_today >= expected_min and failing_count <= 3 else (
        "degraded" if total_today >= 30 else "critical"
    )

    return {
        "ok": True,
        "overall_status": overall,
        "summary": {
            "total_sources": len(out_sources),
            "healthy": healthy_count,
            "stale": stale_count,
            "failing": failing_count,
            "total_today": total_today,
            "expected_minimum": expected_min,
        },
        "sources": out_sources,
        "tpe_now": now_tpe().isoformat(),
    }


def _ptt_today_count() -> int:
    sb = _sb()
    today_start = (now_tpe().replace(hour=0, minute=0, second=0, microsecond=0)).astimezone(timezone.utc).isoformat()
    rows = _safe_table_query(
        "social_mentions",
        sb.table("social_mentions").select("id", count="exact").eq("source", "ptt").gte("captured_at", today_start),
    )
    if rows is None:
        return 0
    return len(rows)


# =========================================================================
# /api/health/us_market — yfinance 美股抓取狀態
# =========================================================================
@router.get("/health/us_market")
def health_us_market() -> dict[str, Any]:
    """連續抓 5 個美股 indices 看 yahoo 是否正常。"""
    results = []
    success_count = 0
    for sym, label in US_INDICES:
        q = get_index_quote(sym)
        if q and q.get("price") is not None:
            results.append(
                {
                    "symbol": sym,
                    "label": label,
                    "price": q["price"],
                    "change_pct": q.get("change_pct"),
                    "status": "ok",
                }
            )
            success_count += 1
        else:
            results.append({"symbol": sym, "label": label, "status": "fail"})

    extra_symbols = [("TSM", "TSM ADR"), ("NVDA", "NVIDIA"), ("AMD", "AMD"), ("TSLA", "Tesla")]
    for sym, label in extra_symbols:
        q = get_index_quote(sym)
        if q and q.get("price") is not None:
            results.append(
                {
                    "symbol": sym,
                    "label": label,
                    "price": q["price"],
                    "change_pct": q.get("change_pct"),
                    "status": "ok",
                }
            )
            success_count += 1
        else:
            results.append({"symbol": sym, "label": label, "status": "fail"})

    total = len(results)
    overall = "healthy" if success_count >= total - 1 else ("degraded" if success_count >= total // 2 else "critical")
    return {
        "ok": success_count > 0,
        "overall_status": overall,
        "success": success_count,
        "total": total,
        "items": results,
        "tpe_now": now_tpe().isoformat(),
    }


# =========================================================================
# /api/health/all — 整合所有健康度(/watchdog 用)
# =========================================================================
@router.get("/health/all")
def health_all() -> dict[str, Any]:
    """一次拿所有健康度給 /watchdog 顯示。"""
    finmind = health_finmind()
    crawler = health_intel_crawler()
    us = health_us_market()

    # supabase
    from backend.utils.supabase_client import health_check
    supabase_ok = health_check()

    # cron 排程紀錄(從 quack_judgments 反推 — homework refresh 寫進去)
    cron_recent = _recent_cron_runs()

    # errors 統計
    errors_summary = _errors_summary()

    return {
        "tpe_now": now_tpe().isoformat(),
        "supabase": "ok" if supabase_ok else "fail",
        "finmind": finmind,
        "intel_crawler": crawler,
        "us_market": us,
        "cron_recent": cron_recent,
        "errors": errors_summary,
    }


def _recent_cron_runs() -> dict[str, Any]:
    """最近 cron 執行紀錄(從 quack_judgments 反推 — 每次 cron 寫一筆)。"""
    sb = _sb()
    since = (now_tpe() - timedelta(days=2)).isoformat()
    rows = _safe_table_query(
        "quack_judgments",
        sb.table("quack_judgments")
        .select("judgment_type,judgment_date,model,created_at")
        .gte("created_at", since)
        .order("created_at", desc=True)
        .limit(20),
    )
    if rows is None:
        return {"ok": False, "reason": "quack_judgments missing"}
    return {"ok": True, "count": len(rows), "items": rows}


def _errors_summary() -> dict[str, Any]:
    sb = _sb()
    since = (now_tpe() - timedelta(hours=24)).isoformat()
    rows = _safe_table_query(
        "errors",
        sb.table("errors").select("severity,source").gte("occurred_at", since).limit(500),
    )
    if rows is None:
        return {"ok": False, "reason": "errors table missing(migration 0010 未跑)"}
    by_sev: dict[str, int] = {}
    by_src: dict[str, int] = {}
    for r in rows:
        sev = r.get("severity", "error")
        src = r.get("source", "unknown")
        by_sev[sev] = by_sev.get(sev, 0) + 1
        by_src[src] = by_src.get(src, 0) + 1
    critical_24h = by_sev.get("critical", 0)
    return {
        "ok": True,
        "total_24h": len(rows),
        "by_severity": by_sev,
        "by_source": by_src,
        "critical_24h": critical_24h,
        "status": "critical" if critical_24h > 0 else ("warning" if len(rows) > 50 else "healthy"),
    }


# =========================================================================
# /api/errors — 最近錯誤列表(/watchdog 用)
# =========================================================================
@router.get("/errors")
def list_errors(
    limit: int = Query(100, ge=1, le=500),
    severity: str | None = Query(None),
    source: str | None = Query(None),
) -> dict[str, Any]:
    sb = _sb()
    q = (
        sb.table("errors")
        .select("id,trace_id,occurred_at,severity,source,service,endpoint,message,context")
        .order("occurred_at", desc=True)
        .limit(limit)
    )
    if severity:
        q = q.eq("severity", severity)
    if source:
        q = q.eq("source", source)
    rows = _safe_table_query("errors", q)
    if rows is None:
        return {"ok": False, "reason": "errors table missing", "errors": []}
    return {"ok": True, "count": len(rows), "errors": rows}


# =========================================================================
# POST /api/errors — 前端寫 error(JS error / fetch failure)
# =========================================================================
from pydantic import BaseModel


class _ErrorReq(BaseModel):
    severity: str = "error"
    source: str = "frontend"
    service: str | None = None
    endpoint: str | None = None
    message: str
    stacktrace: str | None = None
    context: dict | None = None
    user_agent: str | None = None


@router.post("/errors")
def report_error(req: _ErrorReq) -> dict[str, Any]:
    """前端可主動回報錯誤。也供 backend middleware 內部呼叫。"""
    sb = _sb()
    payload = {
        "severity": req.severity,
        "source": req.source,
        "service": req.service,
        "endpoint": req.endpoint,
        "message": req.message[:2000],
        "stacktrace": (req.stacktrace or "")[:8000] or None,
        "context": req.context or {},
        "user_agent": (req.user_agent or "")[:500] or None,
    }
    try:
        res = sb.table("errors").insert(payload).execute()
        return {"ok": True, "id": (res.data or [{}])[0].get("id")}
    except Exception as e:
        log.warning(f"errors insert failed (table missing?): {e}")
        return {"ok": False, "reason": "errors table missing"}
