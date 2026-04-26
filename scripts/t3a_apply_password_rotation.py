"""
STAGE1-T3a-cleanup 收尾 1 — DB password 旋轉同步工具

兩種使用模式:

模式 A:全自動(若 ceo-desk/.secrets.local 有 SUPABASE_ACCESS_TOKEN PAT)
  python scripts/t3a_apply_password_rotation.py auto
    → 透過 Management API 重設 password
    → 自動同步進 .env / .env.local
    → 試 pooler 連線,確認新 password 通

模式 B:CEO 手動重設後同步(若沒 PAT)
  1. CEO 進 Supabase Dashboard → Settings → Database → Reset password
  2. 把新 password 填進 ceo-desk/.secrets.local 的 SUPABASE_DB_PASSWORD=
  3. python scripts/t3a_apply_password_rotation.py sync
    → 從 .secrets.local 讀新 password
    → 同步進 .env / .env.local
    → 試 pooler 連線

模式 C:驗證(任何時候都能跑)
  python scripts/t3a_apply_password_rotation.py verify
    → 試 pooler 連線、報告 OK / FAIL

設計原則:
  - .secrets.local 是 gitignored、不進 commit
  - 不在 stdout / log / commit 印 password 原文
  - 只報「連得通」「連不通」、加 region + len 摘要
  - Zeabur env 沒 Zeabur token 就只能口頭告訴 CEO 怎麼更新
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env"
ENV_LOCAL = ROOT / ".env.local"
SECRETS_LOCAL = ROOT / "ceo-desk" / ".secrets.local"


def _read_secrets() -> dict[str, str]:
    if not SECRETS_LOCAL.exists():
        return {}
    out = {}
    for ln in SECRETS_LOCAL.read_text(encoding="utf-8").splitlines():
        if ln.strip() and not ln.strip().startswith("#") and "=" in ln:
            k, _, v = ln.partition("=")
            out[k.strip()] = v.strip()
    return out


def _replace_or_append(path: Path, key: str, value: str) -> None:
    if not path.exists():
        path.write_text(f"{key}={value}\n", encoding="utf-8")
        return
    text = path.read_text(encoding="utf-8")
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    if pattern.search(text):
        new_text = pattern.sub(f"{key}={value}", text)
    else:
        sep = "" if text.endswith("\n") else "\n"
        new_text = f"{text}{sep}{key}={value}\n"
    path.write_text(new_text, encoding="utf-8")


def _project_ref() -> str:
    text = ENV_FILE.read_text(encoding="utf-8") if ENV_FILE.exists() else ""
    m = re.search(r"SUPABASE_URL=https://([^.]+)\.supabase\.co", text)
    if not m:
        raise SystemExit("SUPABASE_URL not found in .env")
    return m.group(1)


def _try_pooler(password: str) -> tuple[bool, str]:
    """Try standard pooler hosts to verify password works. Returns (ok, msg)."""
    try:
        import psycopg2
    except ImportError:
        return False, "psycopg2 not installed"

    ref = _project_ref()
    regions = [
        "ap-northeast-1", "ap-southeast-1", "us-east-1", "us-west-1",
        "eu-west-1", "eu-central-1",
    ]
    for prefix in ("aws-0", "aws-1"):
        for region in regions:
            host = f"{prefix}-{region}.pooler.supabase.com"
            for port in (6543, 5432):
                try:
                    conn = psycopg2.connect(
                        host=host, port=port, dbname="postgres",
                        user=f"postgres.{ref}", password=password,
                        sslmode="require", connect_timeout=4,
                    )
                    conn.close()
                    return True, f"connected via {host}:{port}"
                except Exception as e:  # noqa: BLE001
                    msg = str(e).split("\n")[0]
                    if "authentication" in msg.lower() and "password" in msg.lower():
                        return False, f"password rejected by {host}:{port}"
                    # Tenant not found / ENOTFOUND → keep trying other regions
    return False, "no pooler region accepted credentials (24 combos tried)"


# ---------- mode handlers ----------

def cmd_auto() -> None:
    secrets = _read_secrets()
    pat = secrets.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not pat or not pat.startswith("sbp_"):
        raise SystemExit(
            "Mode 'auto' needs SUPABASE_ACCESS_TOKEN starting with sbp_ in ceo-desk/.secrets.local.\n"
            "Get one at https://supabase.com/dashboard/account/tokens"
        )
    ref = _project_ref()
    # Generate strong password
    import secrets as _secrets, string
    alphabet = string.ascii_letters + string.digits
    new_pw = "".join(_secrets.choice(alphabet) for _ in range(32))

    body = json.dumps({"password": new_pw}).encode("utf-8")
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/database/configuration",
        data=body, method="PATCH",
        headers={
            "Authorization": f"Bearer {pat}",
            "Content-Type": "application/json",
        },
    )
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        print(f"reset response status={resp.status}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:200]
        raise SystemExit(f"PAT reset failed: {e.code} {body}")

    # Sync to local files
    _replace_or_append(ENV_FILE, "SUPABASE_DB_PASSWORD", new_pw)
    _replace_or_append(ENV_LOCAL, "SUPABASE_DB_PASSWORD", new_pw)
    # Persist back to secrets.local
    _replace_or_append(SECRETS_LOCAL, "SUPABASE_DB_PASSWORD", new_pw)
    _replace_or_append(
        SECRETS_LOCAL, "SUPABASE_DB_PASSWORD_ROTATED_AT",
        datetime.now(tz=timezone(timedelta(hours=8))).isoformat(),
    )
    print("password synced to .env / .env.local / .secrets.local (length only logged)")
    print(f"  new password length: {len(new_pw)}")

    ok, msg = _try_pooler(new_pw)
    print(f"pooler check: {'OK' if ok else 'FAIL'} — {msg}")
    if not ok:
        sys.exit(1)
    print("\n⚠️ 還必須做的事:")
    print("  → 把新 password 填進 Zeabur Dashboard → vsis-api → SUPABASE_DB_PASSWORD")
    print(f"  → 新 password 暫存於 ceo-desk/.secrets.local 第一個欄位(local-only,gitignored)")


def cmd_sync() -> None:
    secrets = _read_secrets()
    pw = secrets.get("SUPABASE_DB_PASSWORD", "")
    if not pw:
        raise SystemExit(
            "Mode 'sync' needs SUPABASE_DB_PASSWORD in ceo-desk/.secrets.local.\n"
            "1) CEO resets password in Supabase Dashboard\n"
            "2) Paste new password to ceo-desk/.secrets.local\n"
            "3) Re-run this command"
        )
    print(f"new password length: {len(pw)}")
    _replace_or_append(ENV_FILE, "SUPABASE_DB_PASSWORD", pw)
    _replace_or_append(ENV_LOCAL, "SUPABASE_DB_PASSWORD", pw)
    print("synced to .env / .env.local")
    ok, msg = _try_pooler(pw)
    print(f"pooler check: {'OK' if ok else 'FAIL'} — {msg}")
    if not ok:
        sys.exit(1)


def cmd_verify() -> None:
    pw = ""
    text = ENV_FILE.read_text(encoding="utf-8") if ENV_FILE.exists() else ""
    m = re.search(r"^SUPABASE_DB_PASSWORD=(.+)$", text, re.MULTILINE)
    if m:
        pw = m.group(1).strip()
    if not pw:
        # fallback to .env.local
        if ENV_LOCAL.exists():
            text = ENV_LOCAL.read_text(encoding="utf-8")
            m = re.search(r"^SUPABASE_DB_PASSWORD=(.+)$", text, re.MULTILINE)
            if m:
                pw = m.group(1).strip()
    if not pw:
        raise SystemExit("no SUPABASE_DB_PASSWORD found in .env or .env.local")
    print(f"password length: {len(pw)}")
    ok, msg = _try_pooler(pw)
    print(f"pooler check: {'OK' if ok else 'FAIL'} — {msg}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "auto":
        cmd_auto()
    elif cmd == "sync":
        cmd_sync()
    elif cmd == "verify":
        cmd_verify()
    else:
        print(f"unknown command: {cmd}")
        sys.exit(1)
