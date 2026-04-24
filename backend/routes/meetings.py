"""
/api/meetings — 會議記錄(辦公室頁用)

從 Supabase meetings 表拉最近 N 場會議。
依據憲法 Section 7(排程) + Section 8(記錄格式) + Migration 0006。
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from backend.utils.supabase_client import get_service_client

router = APIRouter()


@router.get("/meetings")
async def list_meetings(limit: int = Query(30, ge=1, le=200)):
    """最近 N 場會議 (按 scheduled_at DESC)"""
    sb = get_service_client()
    try:
        r = (
            sb.table("meetings")
            .select("*")
            .order("scheduled_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = r.data or []
    except Exception as e:
        # meetings 表不存在(migration 未 apply)降級回空
        msg = str(e)
        if "meetings" in msg and ("not found" in msg.lower() or "does not exist" in msg.lower() or "42P01" in msg):
            return {"count": 0, "meetings": [], "note": "meetings 表尚未建立"}
        raise HTTPException(500, f"db error: {msg[:200]}")

    return {
        "count": len(rows),
        "meetings": rows,
    }


@router.get("/meetings/{meeting_id}")
async def get_meeting(meeting_id: str):
    """取得單一會議記錄"""
    sb = get_service_client()
    try:
        r = (
            sb.table("meetings")
            .select("*")
            .eq("meeting_id", meeting_id)
            .single()
            .execute()
        )
        return r.data
    except Exception as e:
        raise HTTPException(404, f"meeting not found: {meeting_id}")
