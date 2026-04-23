"""
管理端點 — 用於 Claude Code 透過 API 維運 DB(DDL / seed)。

安全性:
  - 全部端點要求 header `X-Admin-Token` 等於 env `ADMIN_TOKEN`
  - ADMIN_TOKEN 未設 → 所有端點 503(預設關閉)

端點:
  POST /api/admin/exec_sql    { "sql": "..." }  執行任意 SQL(支援多語句)
  POST /api/admin/upsert_seed { "table": "...", "rows": [...], "conflict": "id" }
  GET  /api/admin/ping
"""
from __future__ import annotations

import os
from typing import Any

import psycopg2
from psycopg2.extras import Json
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter()


def _require_token(x_admin_token: str | None) -> None:
    configured = os.getenv("ADMIN_TOKEN")
    if not configured:
        raise HTTPException(503, "ADMIN_TOKEN not configured")
    if not x_admin_token or x_admin_token != configured:
        raise HTTPException(401, "bad admin token")


def _dsn() -> str:
    # backend 在 Zeabur 上對 db.xxx.supabase.co 的直連 DNS 正常
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    ref = url.replace("https://", "").split(".")[0]
    password = os.getenv("SUPABASE_DB_PASSWORD", "")
    if not ref or not password:
        raise HTTPException(500, "SUPABASE_URL or SUPABASE_DB_PASSWORD missing")
    return f"host=db.{ref}.supabase.co port=5432 dbname=postgres user=postgres password={password} sslmode=require"


class ExecSqlReq(BaseModel):
    sql: str


@router.get("/admin/ping")
async def admin_ping(x_admin_token: str | None = Header(default=None)):
    _require_token(x_admin_token)
    return {"ok": True}


@router.post("/admin/exec_sql")
async def admin_exec_sql(req: ExecSqlReq, x_admin_token: str | None = Header(default=None)):
    _require_token(x_admin_token)
    try:
        conn = psycopg2.connect(_dsn())
    except Exception as e:
        raise HTTPException(500, f"db connect failed: {type(e).__name__}: {e}")
    try:
        with conn.cursor() as cur:
            cur.execute(req.sql)
            try:
                rows = cur.fetchall()
                cols = [d.name for d in cur.description] if cur.description else []
                data = [dict(zip(cols, r)) for r in rows[:200]]
            except psycopg2.ProgrammingError:
                data = None
        conn.commit()
        return {"ok": True, "rowcount": cur.rowcount, "rows": data}
    except Exception as e:
        conn.rollback()
        raise HTTPException(400, f"{type(e).__name__}: {e}")
    finally:
        conn.close()


class UpsertReq(BaseModel):
    table: str
    rows: list[dict[str, Any]]
    conflict: str = "id"  # conflict target column
    jsonb_fields: list[str] = []  # fields to wrap as Json


@router.post("/admin/upsert_seed")
async def admin_upsert_seed(req: UpsertReq, x_admin_token: str | None = Header(default=None)):
    _require_token(x_admin_token)
    if not req.rows:
        return {"ok": True, "inserted": 0}
    cols = list(req.rows[0].keys())
    placeholders = ", ".join(f"%({c})s" for c in cols)
    col_list = ", ".join(cols)
    update_set = ", ".join(
        f"{c} = EXCLUDED.{c}" for c in cols if c != req.conflict
    )
    sql = (
        f"INSERT INTO {req.table} ({col_list}) VALUES ({placeholders}) "
        f"ON CONFLICT ({req.conflict}) DO UPDATE SET {update_set}"
    )
    try:
        conn = psycopg2.connect(_dsn())
    except Exception as e:
        raise HTTPException(500, f"db connect failed: {type(e).__name__}: {e}")
    try:
        with conn.cursor() as cur:
            inserted = 0
            for row in req.rows:
                params = dict(row)
                for jf in req.jsonb_fields:
                    if jf in params:
                        params[jf] = Json(params[jf])
                cur.execute(sql, params)
                inserted += 1
        conn.commit()
        return {"ok": True, "inserted": inserted}
    except Exception as e:
        conn.rollback()
        raise HTTPException(400, f"{type(e).__name__}: {e}")
    finally:
        conn.close()
