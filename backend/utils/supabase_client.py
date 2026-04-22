"""
Supabase 客戶端封裝

設計原則:
1. Singleton — 整個 app 共用一個 client
2. 兩種 client:
   - anon client (前端用,有 RLS)
   - service client (後端排程用,繞過 RLS)
3. 所有 DB 操作從這裡 import,不要直接呼 supabase-py
4. 失敗時會記到 logger,不噴例外到上層(除非明確拋出)
5. 有 health_check() 可驗證連線

使用:
    from backend.utils.supabase_client import get_client, get_service_client

    sb = get_client()  # 一般查詢
    svc = get_service_client()  # 排程/寫入
    svc.table("stocks").upsert({"stock_id": "2330", ...}).execute()
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

from supabase import Client, create_client

from .logger import get_logger

log = get_logger(__name__)


# ============================================
# 環境變數
# ============================================
def _env(name: str, required: bool = True) -> Optional[str]:
    v = os.getenv(name)
    if required and not v:
        log.warning(f"環境變數 {name} 未設定")
    return v


@lru_cache(maxsize=1)
def get_client() -> Client:
    """
    取得 anon key client(受 RLS 限制,適合前端或讀取 public 資料)。
    """
    url = _env("SUPABASE_URL")
    key = _env("SUPABASE_ANON_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_ANON_KEY 必須設定。請先 cp .env.example .env"
        )
    log.debug("建立 Supabase anon client")
    return create_client(url, key)


@lru_cache(maxsize=1)
def get_service_client() -> Client:
    """
    取得 service role client(繞過 RLS,只能在後端排程中使用,絕不可暴露給前端)。
    """
    url = _env("SUPABASE_URL")
    key = _env("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_SERVICE_KEY 必須設定(後端寫入用)"
        )
    log.debug("建立 Supabase service client")
    return create_client(url, key)


def health_check(timeout: float = 5.0) -> bool:
    """
    快速驗證 Supabase 是否可連線。

    做法:用 service client 打一個極輕的查詢(stocks 表前 1 筆)。
    回傳 True/False,不拋例外。
    """
    try:
        sb = get_service_client()
        # stocks 可能還是空的,用 limit(1) 看能不能執行查詢
        res = sb.table("stocks").select("stock_id").limit(1).execute()
        log.info(f"Supabase health OK (stocks rows sample: {len(res.data)})")
        return True
    except Exception as e:
        log.error(f"Supabase health 失敗: {e}")
        return False


def reset_clients() -> None:
    """測試用:清掉快取的 client。"""
    get_client.cache_clear()
    get_service_client.cache_clear()
