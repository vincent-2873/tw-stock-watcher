"""
Vincent Stock Intelligence System — FastAPI 入口

啟動方式:
    uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

或本機直接跑:
    python -m backend.main
"""

from __future__ import annotations

import os

# 載入 .env(必須在其他 import 前)
from backend import load_env  # noqa: F401

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.services.finmind_service import FinMindService
from backend.services.fmp_service import FMPService
from backend.utils.logger import get_logger
from backend.utils.supabase_client import health_check
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

app = FastAPI(
    title="Vincent Stock Intelligence System",
    version="0.1.0",
    description="個人金融情報系統 — 夥伴 + 教練",
)

# CORS:前端本機 localhost:3000 要能打後端
_cors_origins = ["http://localhost:3000", "https://localhost:3000"]
_cors_extra = os.getenv("CORS_ORIGINS", "").strip()
if _cors_extra:
    _cors_origins.extend([o.strip() for o in _cors_extra.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 掛載分析 API 路由(Phase 4 給前端用)
from backend.routes import analysis as _analysis_routes  # noqa: E402
from backend.routes import chat as _chat_routes  # noqa: E402

app.include_router(_analysis_routes.router, prefix="/api", tags=["analysis"])
app.include_router(_chat_routes.router, prefix="/api", tags=["chat"])


@app.get("/")
async def root():
    return {
        "service": "Vincent Stock Intelligence System",
        "version": "0.1.0",
        "tpe_now": now_tpe().isoformat(),
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    """健康檢查 — 驗證外部依賴"""
    supabase_ok = health_check()
    return {
        "status": "ok" if supabase_ok else "degraded",
        "supabase": "ok" if supabase_ok else "fail",
        "tpe_now": now_tpe().isoformat(),
    }


@app.get("/api/stocks/tw/{stock_id}")
async def get_tw_stock(stock_id: str, days: int = 30):
    """查台股個股(Phase 1 驗收端點 — spec 要求能查 2317 鴻海)"""
    from datetime import timedelta

    svc = FinMindService()
    start = (now_tpe().date() - timedelta(days=days)).isoformat()
    data, meta = svc.get_stock_price(stock_id, start)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"查無 {stock_id} 的資料(可能 token 未設或代號錯誤)",
        )
    return {
        "stock_id": stock_id,
        "count": len(data),
        "data": data,
        "meta": {
            "source": meta.source,
            "fetched_at": meta.fetched_at.isoformat(),
            "dataset": meta.dataset,
        },
    }


@app.get("/api/stocks/us/{symbol}")
async def get_us_stock(symbol: str):
    """查美股個股報價"""
    svc = FMPService()
    data, meta = svc.get_quote(symbol)
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"查無 {symbol} 的報價(可能 FMP_API_KEY 未設)",
        )
    return {
        "symbol": symbol,
        "data": data[0] if isinstance(data, list) else data,
        "meta": {
            "source": meta.source,
            "fetched_at": meta.fetched_at.isoformat(),
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
