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
    horizon: str = Query("1w", description="1w | 1m"),
) -> dict[str, Any]:
    """呱呱一週(或一個月)推薦清單 — 基於題材熱度 + investment_strategy。

    邏輯:
      1. 取熱度 TOP 5 active topics
      2. 從每題材的 investment_strategy.short_term_1w (或 medium_term_1m) 抽個股
      3. 每檔標上所屬題材 + 熱度分數
      4. 按題材熱度排序,去重後取前 N 檔
    """
    sb = _svc()
    topics = (
        sb.table("topics")
        .select("id, name, heat_score, stage, investment_strategy, supply_chain, ai_summary")
        .eq("status", "active")
        .order("heat_score", desc=True)
        .limit(10)
        .execute()
        .data
        or []
    )

    strategy_key = "short_term_1w" if horizon == "1w" else "medium_term_1m"
    seen: dict[str, dict[str, Any]] = {}
    for t in topics:
        strat = (t.get("investment_strategy") or {}).get(strategy_key) or []
        heat = t.get("heat_score") or 0
        for ticker in strat:
            ticker = str(ticker)
            if not ticker.isdigit() and not (len(ticker) > 3 and ticker[:4].isdigit()):
                continue  # 略過「德宏」這種名字
            existing = seen.get(ticker)
            # 第一次見到就存;若新題材熱度更高也更新歸屬
            if not existing or heat > existing["heat_score"]:
                # 判斷在供應鏈哪一層
                chain_tier = None
                for tier in (t.get("supply_chain") or {}).values():
                    if tier and ticker in (tier.get("stocks") or []):
                        chain_tier = tier.get("name")
                        break
                seen[ticker] = {
                    "ticker": ticker,
                    "topic_id": t["id"],
                    "topic_name": t["name"],
                    "topic_stage": t.get("stage"),
                    "heat_score": heat,
                    "chain_tier": chain_tier,
                    "topic_summary": t.get("ai_summary"),
                }
    picks = sorted(seen.values(), key=lambda x: x["heat_score"], reverse=True)[:limit]
    return {
        "horizon": horizon,
        "count": len(picks),
        "picks": picks,
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
