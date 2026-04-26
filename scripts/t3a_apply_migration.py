"""
STAGE1-T3a Defense 1: 透過 /api/admin/exec_sql 套用 0018 migration。

用法:
  python scripts/t3a_apply_migration.py up    # 套用
  python scripts/t3a_apply_migration.py verify # 驗證 schema
  python scripts/t3a_apply_migration.py down  # 回滾

ADMIN_TOKEN 從 ceo-desk/handoffs/HANDOFF_2026-04-23_afternoon.md 讀(本機 only)。
不在 log / outbox / commit 印出 token 值。
"""
from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
HANDOFF = PROJECT_ROOT / "ceo-desk/handoffs/HANDOFF_2026-04-23_afternoon.md"
API_BASE = "https://vsis-api.zeabur.app"


def _read_admin_token() -> str:
    text = HANDOFF.read_text(encoding="utf-8")
    m = re.search(r"ADMIN_TOKEN=(\S+)", text)
    if not m:
        raise SystemExit("ADMIN_TOKEN not found in handoff")
    return m.group(1).strip()


def _exec_sql(sql: str) -> dict:
    token = _read_admin_token()
    body = json.dumps({"sql": sql}).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE}/api/admin/exec_sql",
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Admin-Token": token,
        },
    )
    try:
        resp = urllib.request.urlopen(req, timeout=60)
        raw = resp.read().decode()
        return {"status": resp.status, "body": raw}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        return {"status": e.code, "error": raw}


def cmd_up() -> None:
    sql_path = PROJECT_ROOT / "supabase/migrations/0018_quality_status_and_basis.sql"
    sql = sql_path.read_text(encoding="utf-8")
    print(f"Applying 0018 UP — {len(sql)} chars")
    r = _exec_sql(sql)
    print("status:", r.get("status"))
    print("body:", r.get("body") or r.get("error"))


def cmd_verify() -> None:
    sql = """
    SELECT table_name, column_name, data_type, column_default
      FROM information_schema.columns
     WHERE table_name IN ('quack_predictions','quack_judgments')
       AND column_name IN ('source','data_quality_status','basis_accuracy_pct','basis_quality')
     ORDER BY table_name, ordinal_position;
    """
    r = _exec_sql(sql)
    print("status:", r.get("status"))
    print("body:", r.get("body") or r.get("error"))


def cmd_down() -> None:
    sql_path = PROJECT_ROOT / "supabase/migrations/0018_quality_status_and_basis_DOWN.sql"
    sql = sql_path.read_text(encoding="utf-8")
    print(f"Applying 0018 DOWN — {len(sql)} chars")
    r = _exec_sql(sql)
    print("status:", r.get("status"))
    print("body:", r.get("body") or r.get("error"))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "up":
        cmd_up()
    elif cmd == "verify":
        cmd_verify()
    elif cmd == "down":
        cmd_down()
    else:
        print(f"unknown command: {cmd}")
        sys.exit(1)
