"""
Diagnostic endpoints — 驗證資料源認證狀態

Bug 2 修:Vincent 無法確認 Zeabur 上的 FINMIND_TOKEN 是否真的是 Sponsor。
本路由提供 /api/diag/finmind 直接打 FinMind user_info 確認 plan level。
"""

from __future__ import annotations

import os

import httpx
from fastapi import APIRouter

from backend.services.finmind_service import FinMindService

router = APIRouter(prefix="/diag")


@router.get("/finmind")
def diag_finmind():
    """
    回傳 FinMind token 的 Sponsor 狀態。
    Zeabur 上 level_title 應為 "Sponsor",level 應為 3。
    """
    svc = FinMindService()
    info = svc.get_user_info()
    info["token_env_set"] = bool(os.getenv("FINMIND_TOKEN"))
    info["token_prefix"] = (
        (os.getenv("FINMIND_TOKEN", "")[:20] + "...")
        if os.getenv("FINMIND_TOKEN")
        else None
    )
    return info


@router.get("/fmp")
def diag_fmp():
    """驗證 FMP_API_KEY 是否設定並可呼叫 SOX"""
    key = os.getenv("FMP_API_KEY", "")
    if not key:
        return {"ok": False, "error": "FMP_API_KEY not set"}
    try:
        r = httpx.get(
            "https://financialmodelingprep.com/api/v3/quote/%5ESOX",
            params={"apikey": key},
            timeout=10.0,
        )
        r.raise_for_status()
        data = r.json()
        if not data:
            return {"ok": False, "error": "empty response", "raw": data}
        q = data[0]
        return {
            "ok": True,
            "symbol": q.get("symbol"),
            "price": q.get("price"),
            "change": q.get("change"),
            "changesPercentage": q.get("changesPercentage"),
            "timestamp": q.get("timestamp"),
            "key_prefix": key[:10] + "...",
        }
    except Exception as e:
        return {"ok": False, "error": str(e), "key_prefix": key[:10] + "..."}


@router.get("/env")
def diag_env():
    """快速列出關鍵 env 是否已設(僅回 bool,不回 value)"""
    keys = [
        "FINMIND_TOKEN",
        "FMP_API_KEY",
        "ANTHROPIC_API_KEY",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY",
        "SUPABASE_ANON_KEY",
        "LINE_CHANNEL_ACCESS_TOKEN",
        "LINE_USER_ID",
        "TZ",
    ]
    return {
        k: {"set": bool(os.getenv(k)), "value": os.getenv(k) if k == "TZ" else None}
        for k in keys
    }
