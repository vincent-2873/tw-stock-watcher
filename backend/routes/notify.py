"""
通知測試 / 手動觸發 API(管理用)。

端點:
  POST /api/notify/test    發測試訊息到所有配置好的通道
  GET  /api/notify/status  顯示各通道是否有設定(不洩漏 token)
"""

from __future__ import annotations

import os

from fastapi import APIRouter
from pydantic import BaseModel

from backend.services.notification_service import (
    DiscordNotifier,
    EmailNotifier,
    broadcast_all,
    get_line_notifier,
)
from backend.utils.time_utils import now_tpe

router = APIRouter()


class TestRequest(BaseModel):
    subject: str = "VSIS 測試"
    message: str = "這是一則測試訊息,確認通知通道通暢。"
    channels: list[str] = ["line", "discord", "email"]


@router.get("/notify/status")
async def notify_status():
    """顯示各通道 env 是否有設定(不回傳實際值)"""
    return {
        "line": {
            "token_set": bool(os.getenv("LINE_CHANNEL_ACCESS_TOKEN")),
            "user_id_set": bool(os.getenv("LINE_USER_ID")),
        },
        "discord": {
            "webhook_set": bool(os.getenv("DISCORD_WEBHOOK_URL")),
        },
        "email": {
            "smtp_user_set": bool(os.getenv("SMTP_USER")),
            "smtp_pass_set": bool(os.getenv("SMTP_PASS")),
            "email_to_set": bool(os.getenv("EMAIL_TO")),
            "smtp_host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        },
        "tpe_now": now_tpe().isoformat(),
    }


@router.post("/notify/test")
async def notify_test(req: TestRequest):
    results: dict = {}
    if "line" in req.channels:
        r = get_line_notifier().push_text(f"{req.subject}\n\n{req.message}")
        results["line"] = {"ok": r.ok, "status": r.status, "detail": r.detail[:200]}
    if "discord" in req.channels:
        r = DiscordNotifier().push_text(f"**{req.subject}**\n{req.message}")
        results["discord"] = {"ok": r.ok, "status": r.status, "detail": r.detail[:200]}
    if "email" in req.channels:
        r = EmailNotifier().push(req.subject, req.message)
        results["email"] = {"ok": r.ok, "status": r.status, "detail": r.detail[:200]}
    return {"results": results, "tpe_now": now_tpe().isoformat()}


@router.post("/notify/broadcast")
async def notify_broadcast(req: TestRequest):
    """同時發到 LINE + Discord + Email"""
    results = broadcast_all(req.subject, req.message)
    return {
        "results": {
            k: {"ok": v.ok, "status": v.status, "detail": v.detail[:200]}
            for k, v in results.items()
        },
        "tpe_now": now_tpe().isoformat(),
    }
