"""
VSIS upgrade endpoints — 產業 / 題材 / 龍頭生態系。

前端讀這些端點做 Dashboard 2.0 (首頁題材熱度 TOP 5 / 題材詳情頁 / 生態系頁)。
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from backend.utils.supabase_client import get_service_client

router = APIRouter()


def _svc():
    return get_service_client()


# ==========================================
# 題材(topics)
# ==========================================
@router.get("/topics")
async def list_topics(
    status: str = Query("active", description="active / archived / all"),
    order: str = Query("heat", description="heat | recent"),
    limit: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    sb = _svc()
    q = sb.table("topics").select("*")
    if status != "all":
        q = q.eq("status", status)
    if order == "heat":
        q = q.order("heat_score", desc=True)
    else:
        q = q.order("start_date", desc=True)
    q = q.limit(limit)
    rows = q.execute().data or []
    return {"count": len(rows), "topics": rows}


@router.get("/topics/{topic_id}")
async def get_topic(topic_id: str) -> dict[str, Any]:
    sb = _svc()
    rows = sb.table("topics").select("*").eq("id", topic_id).execute().data or []
    if not rows:
        raise HTTPException(404, f"topic '{topic_id}' not found")
    return rows[0]


# ==========================================
# 產業(industries)
# ==========================================
@router.get("/industries")
async def list_industries(
    level: int | None = Query(None, description="1=大類, 2=子產業"),
    parent: str | None = Query(None, description="限定某 parent 底下"),
) -> dict[str, Any]:
    sb = _svc()
    q = sb.table("industries").select("*").order("level").order("id")
    if level is not None:
        q = q.eq("level", level)
    if parent:
        q = q.eq("parent_id", parent)
    rows = q.execute().data or []
    return {"count": len(rows), "industries": rows}


@router.get("/industries/tree")
async def industries_tree() -> dict[str, Any]:
    """回傳樹狀結構 Level 1 → Level 2。"""
    sb = _svc()
    rows = sb.table("industries").select("*").order("level").order("id").execute().data or []
    lvl1 = [r for r in rows if r["level"] == 1]
    lvl2 = [r for r in rows if r["level"] == 2]
    by_parent: dict[str, list] = {}
    for r in lvl2:
        by_parent.setdefault(r["parent_id"], []).append(r)
    tree = []
    for l1 in lvl1:
        tree.append({**l1, "sub_industries": by_parent.get(l1["id"], [])})
    return {"count": len(tree), "tree": tree}


@router.get("/industries/{industry_id}")
async def get_industry(industry_id: str) -> dict[str, Any]:
    sb = _svc()
    rows = (
        sb.table("industries").select("*").eq("id", industry_id).execute().data or []
    )
    if not rows:
        raise HTTPException(404, f"industry '{industry_id}' not found")
    row = rows[0]
    # 附上子產業
    subs = (
        sb.table("industries")
        .select("*")
        .eq("parent_id", industry_id)
        .order("id")
        .execute()
        .data
        or []
    )
    row["sub_industries"] = subs
    return row


# ==========================================
# 龍頭生態系(ecosystems)
# ==========================================
@router.get("/ecosystems")
async def list_ecosystems() -> dict[str, Any]:
    sb = _svc()
    rows = (
        sb.table("ecosystems").select("*").order("anchor_ticker").execute().data or []
    )
    return {"count": len(rows), "ecosystems": rows}


@router.get("/ecosystems/{anchor}")
async def get_ecosystem(anchor: str) -> dict[str, Any]:
    sb = _svc()
    rows = (
        sb.table("ecosystems")
        .select("*")
        .eq("anchor_ticker", anchor)
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(404, f"ecosystem '{anchor}' not found")
    return rows[0]


# ==========================================
# Dashboard 2.0 一次抓(首頁專用)
# ==========================================
@router.get("/quack/picks")
async def quack_weekly_picks(
    limit: int = Query(6, ge=1, le=15),
    min_tier: str = Query("SR", description="最低 tier: R / SR / SSR"),
) -> dict[str, Any]:
    """呱呱挑股 — Phase 2.3 改版: 走 stocks.current_tier 真四象限評分。

    CLAUDE.md 鐵則: 每個建議都要有根據。
    - SELECT FROM stocks WHERE current_tier IN (min_tier..SSR)
    - 依 current_score DESC 排序
    - 附上所屬題材(從 topics.supply_chain 反查)
    - score_breakdown 可點進個股頁驗證

    Worker: backend/services/scoring_worker.py (GitHub Action 每日 15:30 TPE)
    """
    sb = _svc()

    tier_order = ["C", "N", "R", "SR", "SSR"]
    try:
        start = tier_order.index(min_tier.upper())
    except ValueError:
        start = 3
    allowed_tiers = tier_order[start:]

    rows = (
        sb.table("stocks")
        .select(
            "stock_id, stock_name, industry, "
            "current_score, current_tier, score_breakdown, tier_updated_at"
        )
        .eq("is_active", True)
        .in_("current_tier", allowed_tiers)
        .order("current_score", desc=True)
        .limit(limit)
        .execute()
        .data
        or []
    )

    # 反查題材做字典 (ticker → primary topic)
    topics = (
        sb.table("topics")
        .select("id,name,heat_score,stage,supply_chain")
        .eq("status", "active")
        .order("heat_score", desc=True)
        .limit(15)
        .execute()
        .data
        or []
    )
    stock_to_topic: dict[str, list[dict[str, Any]]] = {}
    for t in topics:
        sc = t.get("supply_chain") or {}
        for chain in sc.values():
            for s in (chain.get("stocks") or []):
                sid = str(s).strip()
                if not sid:
                    continue
                stock_to_topic.setdefault(sid, []).append(
                    {
                        "topic_id": t["id"],
                        "topic_name": t["name"],
                        "topic_heat": t.get("heat_score") or 0,
                        "topic_stage": t.get("stage"),
                        "chain_tier": chain.get("name"),
                    }
                )

    picks: list[dict[str, Any]] = []
    for r in rows:
        sid = r["stock_id"]
        topic_links = sorted(
            stock_to_topic.get(sid, []),
            key=lambda x: x["topic_heat"],
            reverse=True,
        )
        primary = topic_links[0] if topic_links else None
        picks.append(
            {
                "ticker": sid,
                "stock_name": r.get("stock_name"),
                "industry": r.get("industry"),
                "score": r.get("current_score"),
                "tier": r.get("current_tier"),
                "breakdown": r.get("score_breakdown"),
                "tier_updated_at": r.get("tier_updated_at"),
                "topic_id": primary["topic_id"] if primary else None,
                "topic_name": primary["topic_name"] if primary else None,
                "topic_stage": primary["topic_stage"] if primary else None,
                "topic_heat": primary["topic_heat"] if primary else None,
                "chain_tier": primary["chain_tier"] if primary else None,
            }
        )

    return {
        "min_tier": min_tier.upper(),
        "count": len(picks),
        "picks": picks,
        "note": "基於 stocks.current_score 四象限評分 (每日 15:30 TPE 重算)",
    }


@router.get("/dashboard/overview")
async def dashboard_overview(top_topics: int = Query(5, ge=1, le=20)) -> dict[str, Any]:
    """Dashboard 2.0 首頁一次拿齊:TOP N 題材 + 12 龍頭 + 大類產業。"""
    sb = _svc()
    topics = (
        sb.table("topics")
        .select("id,name,heat_score,heat_trend,status,stage,ai_summary,supply_chain,industry_ids")
        .eq("status", "active")
        .order("heat_score", desc=True)
        .limit(top_topics)
        .execute()
        .data
        or []
    )
    industries = (
        sb.table("industries")
        .select("id,name,icon,heat_level,description")
        .eq("level", 1)
        .order("id")
        .execute()
        .data
        or []
    )
    ecosystems = (
        sb.table("ecosystems")
        .select("anchor_ticker,anchor_name,anchor_type,industry,key_description")
        .order("anchor_ticker")
        .execute()
        .data
        or []
    )
    return {
        "topics": topics,
        "industries": industries,
        "ecosystems": ecosystems,
    }
