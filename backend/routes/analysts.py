"""
NEXT_TASK_008c 分析師個人頁所需 API

公開 GET:
  GET /api/analysts                    -> 5 位投資分析師列表(含 active 持倉數 + 最新觀點摘要)
  GET /api/analysts/{slug}             -> 單一分析師完整資料(profile + stats + holdings + market_view + picks)
  GET /api/analysts/{slug}/holdings    -> 該分析師 active 持倉(quack_predictions where status=active)
  GET /api/analysts/{slug}/market_view -> 最新一則大盤觀點
  GET /api/analysts/{slug}/daily_picks -> 今日推薦(若無則回最近一日)
  GET /api/analysts/{slug}/meetings    -> 該分析師出席的會議記錄(最近 N 場)

Admin POST(觸發 AI 產出,給 cron 用):
  POST /api/analysts/simulate_meeting          -> 產出 5 × 25 持倉 + 1 場會議
  POST /api/analysts/refresh_market_views      -> 5 位大盤觀點刷新
  POST /api/analysts/refresh_daily_picks       -> 5 位每日推薦刷新

slug 對應(frontend → backend):
  chenxu     -> analyst_a
  jingyuan   -> analyst_b
  guanqi     -> analyst_c
  shouzhuo   -> analyst_d
  mingchuan  -> analyst_e
"""
from __future__ import annotations

import os
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, Query

from backend.services import analyst_brain
from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)
router = APIRouter()

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")

# slug -> agent_id 對應
SLUG_TO_AGENT: dict[str, str] = {
    "chenxu": "analyst_a",
    "jingyuan": "analyst_b",
    "guanqi": "analyst_c",
    "shouzhuo": "analyst_d",
    "mingchuan": "analyst_e",
}
AGENT_TO_SLUG: dict[str, str] = {v: k for k, v in SLUG_TO_AGENT.items()}


def _resolve(slug: str) -> str:
    """slug -> agent_id,允許直接用 agent_id"""
    if slug in SLUG_TO_AGENT:
        return SLUG_TO_AGENT[slug]
    if slug in SLUG_TO_AGENT.values():
        return slug
    raise HTTPException(404, f"unknown analyst: {slug}")


def _require_admin(token: Optional[str]) -> None:
    if not ADMIN_TOKEN:
        raise HTTPException(503, "ADMIN_TOKEN not configured")
    if not token or token != ADMIN_TOKEN:
        raise HTTPException(401, "bad admin token")


def _sb():
    return get_service_client()


def _profile_summary(agent_id: str) -> dict:
    """從 analyst_brain.ANALYSTS 拉摘要(展示給前端用)"""
    p = analyst_brain.ANALYSTS.get(agent_id, {})
    return {
        "agent_id": agent_id,
        "slug": AGENT_TO_SLUG.get(agent_id),
        "display_name": p.get("display_name"),
        "frontend_name": p.get("frontend_name"),
        "school": p.get("school"),
        "weights": p.get("weights"),
        "personality": p.get("personality"),
        "catchphrase": p.get("catchphrase"),
        "timeframe_short_days": p.get("timeframe_short_days"),
        "timeframe_long_days": p.get("timeframe_long_days"),
        "stop_loss_pct": p.get("stop_loss_pct"),
        "max_position_pct": p.get("max_position_pct"),
        "success_criteria_style": p.get("success_criteria_style"),
    }


def _agent_stats(agent_id: str) -> dict:
    sb = _sb()
    try:
        r = sb.table("agent_stats").select("*").eq("agent_id", agent_id).limit(1).execute()
        return (r.data or [{}])[0]
    except Exception:
        return {}


# ===========================================================================
# GET /api/analysts
# ===========================================================================
@router.get("/analysts")
def list_analysts() -> dict[str, Any]:
    """5 位投資分析師列表。含 active 持倉數 + 最新大盤觀點摘要。"""
    sb = _sb()
    items = []
    today = now_tpe().date().isoformat()

    for agent_id in analyst_brain.ANALYSTS_ORDER:
        profile = _profile_summary(agent_id)
        stats = _agent_stats(agent_id)
        try:
            holdings_r = (
                sb.table("quack_predictions")
                .select("id", count="exact")
                .eq("agent_id", agent_id)
                .eq("status", "active")
                .execute()
            )
            holdings_count = len(holdings_r.data or [])
        except Exception:
            holdings_count = 0

        try:
            mv = (
                sb.table("analyst_market_views")
                .select("market_view,bias,confidence,view_date,generated_at")
                .eq("agent_id", agent_id)
                .order("view_date", desc=True)
                .limit(1)
                .execute()
            )
            latest_view = (mv.data or [None])[0]
        except Exception:
            latest_view = None

        items.append({
            **profile,
            "stats": {
                "total_predictions": stats.get("total_predictions", 0),
                "hits": stats.get("hits", 0),
                "misses": stats.get("misses", 0),
                "win_rate": stats.get("win_rate"),
                "last_30d_predictions": stats.get("last_30d_predictions", 0),
                "last_30d_win_rate": stats.get("last_30d_win_rate"),
            },
            "holdings_count": holdings_count,
            "latest_market_view": latest_view,
        })

    return {"count": len(items), "tpe_now": now_tpe().isoformat(), "today": today, "analysts": items}


# ===========================================================================
# GET /api/analysts/{slug}
# ===========================================================================
@router.get("/analysts/{slug}")
def get_analyst(slug: str) -> dict[str, Any]:
    agent_id = _resolve(slug)
    sb = _sb()
    profile = _profile_summary(agent_id)
    stats = _agent_stats(agent_id)

    # active holdings(回前 25 筆)— 008c-cleanup 後 reasoning 欄位獨立(migration 0012)
    try:
        h = (
            sb.table("quack_predictions")
            .select("id,target_symbol,target_name,direction,target_price,current_price_at_prediction,deadline,confidence,reasoning,success_criteria,status,supporting_departments,meeting_id,created_at,prediction,evidence")
            .eq("agent_id", agent_id)
            .eq("status", "active")
            .order("confidence", desc=True)
            .limit(30)
            .execute()
        )
        holdings = h.data or []
        # 對於 reasoning 是 NULL 的舊紀錄(008a seed)從 prediction 文字嘗試拉
        for hd in holdings:
            if not hd.get("reasoning"):
                pred = hd.get("prediction") or ""
                if "理由:" in pred:
                    hd["reasoning"] = pred.split("理由:", 1)[-1].strip()
    except Exception as e:
        log.exception(f"holdings fetch {agent_id}: {e}")
        holdings = []

    # latest market view
    try:
        mv = (
            sb.table("analyst_market_views")
            .select("*")
            .eq("agent_id", agent_id)
            .order("view_date", desc=True)
            .limit(1)
            .execute()
        )
        latest_view = (mv.data or [None])[0]
    except Exception:
        latest_view = None

    # today's daily picks
    today = now_tpe().date().isoformat()
    try:
        dp = (
            sb.table("analyst_daily_picks")
            .select("*")
            .eq("agent_id", agent_id)
            .order("pick_date", desc=True)
            .limit(10)
            .execute()
        )
        all_picks = dp.data or []
        # 找今日的;若沒有取最近一日的全部
        today_picks = [p for p in all_picks if p.get("pick_date") == today]
        if not today_picks and all_picks:
            latest_date = all_picks[0]["pick_date"]
            today_picks = [p for p in all_picks if p.get("pick_date") == latest_date]
    except Exception:
        today_picks = []

    # 最近 5 場出席會議
    try:
        meetings = (
            sb.table("meetings")
            .select("meeting_id,meeting_type,scheduled_at,started_at,ended_at,attendees,predictions_created")
            .order("scheduled_at", desc=True)
            .limit(20)
            .execute()
        )
        meetings_attended = [
            {
                "meeting_id": m["meeting_id"],
                "meeting_type": m.get("meeting_type"),
                "started_at": m.get("started_at"),
                "predictions_count": len(m.get("predictions_created") or []),
            }
            for m in (meetings.data or [])
            if agent_id in (m.get("attendees") or [])
        ][:5]
    except Exception:
        meetings_attended = []

    # 學習筆記(若 agent_learning_notes 表有資料)
    try:
        ln = (
            sb.table("agent_learning_notes")
            .select("note_id,date,context,mistake,lesson,correction_plan")
            .eq("agent_id", agent_id)
            .order("date", desc=True)
            .limit(10)
            .execute()
        )
        learning_notes = ln.data or []
    except Exception:
        learning_notes = []

    return {
        "tpe_now": now_tpe().isoformat(),
        **profile,
        "stats": stats,
        "holdings": holdings,
        "holdings_count": len(holdings),
        "latest_market_view": latest_view,
        "daily_picks": today_picks,
        "meetings_attended": meetings_attended,
        "learning_notes": learning_notes,
    }


@router.get("/analysts/{slug}/holdings")
def get_analyst_holdings(slug: str, status: str = Query("active"), limit: int = Query(50, ge=1, le=200)) -> dict[str, Any]:
    agent_id = _resolve(slug)
    sb = _sb()
    q = sb.table("quack_predictions").select("*").eq("agent_id", agent_id)
    if status != "all":
        q = q.eq("status", status)
    rows = q.order("confidence", desc=True).limit(limit).execute().data or []
    return {"agent_id": agent_id, "slug": slug, "count": len(rows), "holdings": rows}


@router.get("/analysts/{slug}/market_view")
def get_analyst_market_view(slug: str) -> dict[str, Any]:
    agent_id = _resolve(slug)
    sb = _sb()
    rows = (
        sb.table("analyst_market_views")
        .select("*")
        .eq("agent_id", agent_id)
        .order("view_date", desc=True)
        .limit(7)
        .execute()
        .data
    ) or []
    return {"agent_id": agent_id, "slug": slug, "count": len(rows), "views": rows}


@router.get("/analysts/{slug}/daily_picks")
def get_analyst_daily_picks(slug: str, days: int = Query(7, ge=1, le=30)) -> dict[str, Any]:
    agent_id = _resolve(slug)
    sb = _sb()
    rows = (
        sb.table("analyst_daily_picks")
        .select("*")
        .eq("agent_id", agent_id)
        .order("pick_date", desc=True)
        .limit(days * 5)
        .execute()
        .data
    ) or []
    return {"agent_id": agent_id, "slug": slug, "count": len(rows), "picks": rows}


@router.get("/analysts/{slug}/winrate_timeline")
def get_analyst_winrate_timeline(slug: str, days: int = Query(90, ge=7, le=365)) -> dict[str, Any]:
    """008d-1: 該分析師滾動勝率走勢(給前台勝率走勢圖用)。
    回傳:
      {
        "agent_id": "...",
        "timeline": [
          {"date": "...", "rolling_30d": 0.62, "rolling_30d_n": 8, "cumulative": 0.62, "cumulative_n": 8},
          ...
        ]
      }
    """
    agent_id = _resolve(slug)
    sb = _sb()
    rows = (
        sb.table("analyst_winrate_timeline")
        .select("timeline_date,rolling_30d_winrate,rolling_30d_predictions,cumulative_winrate,cumulative_predictions,cumulative_hits,cumulative_misses")
        .eq("agent_id", agent_id)
        .order("timeline_date", desc=False)
        .limit(days)
        .execute()
        .data
    ) or []
    timeline = [
        {
            "date": r["timeline_date"],
            "rolling_30d": float(r["rolling_30d_winrate"]) if r.get("rolling_30d_winrate") is not None else None,
            "rolling_30d_n": r.get("rolling_30d_predictions") or 0,
            "cumulative": float(r["cumulative_winrate"]) if r.get("cumulative_winrate") is not None else None,
            "cumulative_n": r.get("cumulative_predictions") or 0,
            "cumulative_hits": r.get("cumulative_hits") or 0,
            "cumulative_misses": r.get("cumulative_misses") or 0,
        }
        for r in rows
    ]
    return {
        "agent_id": agent_id,
        "slug": slug,
        "count": len(timeline),
        "timeline": timeline,
    }


@router.get("/analysts/{slug}/meetings")
def get_analyst_meetings(slug: str, limit: int = Query(10, ge=1, le=30)) -> dict[str, Any]:
    """該分析師出席的會議記錄。"""
    agent_id = _resolve(slug)
    sb = _sb()
    meetings = (
        sb.table("meetings")
        .select("meeting_id,meeting_type,scheduled_at,started_at,ended_at,chair_agent_id,attendees,content_markdown,predictions_created,created_at")
        .order("scheduled_at", desc=True)
        .limit(50)
        .execute()
        .data
    ) or []
    attended = [m for m in meetings if agent_id in (m.get("attendees") or [])][:limit]
    return {"agent_id": agent_id, "slug": slug, "count": len(attended), "meetings": attended}


# ===========================================================================
# Admin POST 觸發
# ===========================================================================
@router.post("/analysts/simulate_meeting")
def simulate_meeting(x_admin_token: Optional[str] = Header(default=None)) -> dict[str, Any]:
    """產出 5 × 25 持倉 + 1 場會議(大型 AI call,耗時 ~ 60-180 秒)"""
    _require_admin(x_admin_token)
    today = now_tpe().date()
    return analyst_brain.simulate_holdings_meeting(today)


@router.post("/analysts/refresh_market_views")
def refresh_market_views(x_admin_token: Optional[str] = Header(default=None)) -> dict[str, Any]:
    _require_admin(x_admin_token)
    today = now_tpe().date()
    return {"date": today.isoformat(), "result": analyst_brain.refresh_all_market_views(today)}


@router.post("/analysts/refresh_daily_picks")
def refresh_daily_picks(x_admin_token: Optional[str] = Header(default=None)) -> dict[str, Any]:
    _require_admin(x_admin_token)
    today = now_tpe().date()
    return {"date": today.isoformat(), "result": analyst_brain.refresh_all_daily_picks(today)}
