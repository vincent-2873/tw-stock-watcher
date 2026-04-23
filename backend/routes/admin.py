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


def _dsn_candidates() -> list[str]:
    """
    Return a list of psycopg2 DSN strings to try in order.

    Zeabur 的 container 不支援 IPv6 路由到 db.xxx.supabase.co(direct connection),
    因此優先走 pooler(IPv4 + port 6543)。若有 SUPABASE_DB_HOST / SUPABASE_POOLER_HOST
    等 env 覆寫,也支援。
    """
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    ref = url.replace("https://", "").split(".")[0]
    password = os.getenv("SUPABASE_DB_PASSWORD", "")
    if not ref or not password:
        raise HTTPException(500, "SUPABASE_URL or SUPABASE_DB_PASSWORD missing")

    # env 指定的 pooler host(最高優先)
    pooler = os.getenv("SUPABASE_POOLER_HOST", "").strip()
    region = os.getenv("SUPABASE_REGION", "ap-northeast-1").strip() or "ap-northeast-1"

    candidates: list[str] = []
    # 1. pooler — transaction mode(6543)— IPv4,Zeabur 通
    if pooler:
        candidates.append(
            f"host={pooler} port=6543 dbname=postgres "
            f"user=postgres.{ref} password={password} sslmode=require"
        )
    # 2. pooler — 依 region 拼 aws-0-{region}.pooler.supabase.com
    #    用列表輪流試(Supabase Cloud project 會在某一個 region),
    #    主要:ap-southeast-1 / ap-northeast-1 / us-east-1 / eu-west-1 / us-west-1
    regions_to_try = [region] + [
        r for r in (
            "ap-southeast-1",
            "ap-northeast-1",
            "ap-northeast-2",
            "us-east-1",
            "us-east-2",
            "us-west-1",
            "us-west-2",
            "eu-west-1",
            "eu-west-2",
            "eu-central-1",
            "sa-east-1",
        ) if r != region
    ]
    for r in regions_to_try:
        candidates.append(
            f"host=aws-0-{r}.pooler.supabase.com port=6543 dbname=postgres "
            f"user=postgres.{ref} password={password} sslmode=require"
        )
    # 4. direct 最後試 — 多數情況會 IPv6 fail,但本機跑 backend 時可用
    candidates.append(
        f"host=db.{ref}.supabase.co port=5432 dbname=postgres user=postgres "
        f"password={password} sslmode=require"
    )
    return candidates


def _connect():
    """Try DSN candidates in order; raise with the accumulated error trail."""
    errors: list[str] = []
    for dsn in _dsn_candidates():
        try:
            conn = psycopg2.connect(dsn, connect_timeout=4)
            # 連到了 — 把 region(如果是 pooler)記到最後錯誤列表底,方便之後設 env
            host = next((tok for tok in dsn.split() if tok.startswith("host=")), "host=?")
            errors.append(f"OK via {host}")
            return conn
        except Exception as e:
            host = next((tok for tok in dsn.split() if tok.startswith("host=")), "host=?")
            errors.append(f"{host} → {type(e).__name__}: {str(e)[:120]}")
    raise HTTPException(500, "db connect failed, tried all DSNs:\n" + "\n".join(errors))


class ExecSqlReq(BaseModel):
    sql: str


@router.get("/admin/ping")
async def admin_ping(x_admin_token: str | None = Header(default=None)):
    _require_token(x_admin_token)
    return {"ok": True}


@router.post("/admin/exec_sql")
async def admin_exec_sql(req: ExecSqlReq, x_admin_token: str | None = Header(default=None)):
    _require_token(x_admin_token)
    conn = _connect()
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
    conn = _connect()
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
