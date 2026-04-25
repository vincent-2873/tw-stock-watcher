"""
NEXT_TASK_008b 階段 5:商業級錯誤處理 middleware

任何 /api/* 的 unhandled exception:
  1. 寫進 errors 表(graceful: 表不存在不阻擋回應)
  2. 回 200 帶 structured error JSON,讓前端能優雅顯示
  3. log 完整 stacktrace 給工程除錯
  4. trace_id 回給前端便於追蹤
"""
from __future__ import annotations

import traceback
import uuid
from typing import Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.utils.logger import get_logger

log = get_logger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """商業級錯誤處理:
    - HTTPException 維持原本狀態(401/403/404 等業務錯誤照舊)
    - 500 / 未捕捉 exception → 寫 errors 表 + 回 structured 200 JSON
    """

    async def dispatch(self, request: Request, call_next: Callable):
        path = request.url.path
        # 非 /api 路徑(例如 /docs)不接管
        if not path.startswith("/api"):
            try:
                return await call_next(request)
            except Exception:
                return await call_next(request)

        try:
            response = await call_next(request)
            return response
        except Exception as e:
            trace_id = str(uuid.uuid4())
            tb = traceback.format_exc()
            log.error(f"[{trace_id}] {path} unhandled: {type(e).__name__}: {e}\n{tb}")

            # 寫 errors 表(失敗不阻擋)
            try:
                from backend.utils.supabase_client import get_service_client

                sb = get_service_client()
                sb.table("errors").insert(
                    {
                        "trace_id": trace_id,
                        "severity": "error",
                        "source": "backend",
                        "service": _guess_service(path),
                        "endpoint": path,
                        "message": f"{type(e).__name__}: {str(e)[:1500]}",
                        "stacktrace": tb[:7000],
                        "context": {
                            "method": request.method,
                            "query": dict(request.query_params),
                        },
                    }
                ).execute()
            except Exception as inner:
                log.warning(f"errors insert during middleware failed: {inner}")

            # 回 200 + structured error,讓前端 fallback UI 接手
            return JSONResponse(
                status_code=200,
                content={
                    "data": None,
                    "error": _user_friendly_message(e),
                    "trace_id": trace_id,
                    "endpoint": path,
                },
            )


def _guess_service(path: str) -> str:
    parts = [p for p in path.split("/") if p]
    if len(parts) >= 2 and parts[0] == "api":
        return parts[1]
    return "unknown"


def _user_friendly_message(e: Exception) -> str:
    name = type(e).__name__
    if "timeout" in str(e).lower():
        return "資料源回應較慢,30 秒後刷新看看"
    if "connection" in str(e).lower():
        return "資料源連線中斷,呱呱正在重試"
    if "json" in str(e).lower() and "decode" in str(e).lower():
        return "資料源回應格式異常,呱呱已記下,稍後重試"
    if name in ("ValidationError", "ValueError"):
        return "資料格式問題,呱呱整理中"
    return "呱呱遇到一點小狀況,正在修復中"
