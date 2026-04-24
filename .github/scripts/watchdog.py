#!/usr/bin/env python3
"""
呱呱投資招待所 — 系統 Watchdog

每 15 分鐘跑一次,檢查 backend + frontend 健康度。
發現異常時寫入 ceo-desk/watchdog/ANOMALIES.md,由下次 Claude Code session 接手。

原則:
  - 只觀察、只記錄
  - 絕不自動改 code / config / .env
  - 異常就寫 ANOMALIES.md,嚴重就建 GitHub Issue
  - 健康時每小時更新一次 last_check.json(避免 commit 洪水)

對應憲法 Section 13.1 優先序 #1「系統穩定度」
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BACKEND_BASE = os.environ.get("BACKEND_BASE", "https://vsis-api.zeabur.app")
FRONTEND_BASE = os.environ.get("FRONTEND_BASE", "https://tw-stock-watcher.zeabur.app")
VERBOSE = os.environ.get("VERBOSE", "false").lower() == "true"

REPO_ROOT = Path(__file__).resolve().parents[2]
WATCHDOG_DIR = REPO_ROOT / "ceo-desk" / "watchdog"
WATCHDOG_DIR.mkdir(parents=True, exist_ok=True)
ANOMALIES_MD = WATCHDOG_DIR / "ANOMALIES.md"
LAST_CHECK_JSON = WATCHDOG_DIR / "last_check.json"


# --------------------------------------------------------------------------- #
# 基礎 HTTP
# --------------------------------------------------------------------------- #

def _http_get_once(url: str, timeout: int) -> tuple[int, dict | str]:
    try:
        req = Request(url, headers={"User-Agent": "vsis-watchdog/1.0"})
        with urlopen(req, timeout=timeout) as r:
            status = r.status
            raw = r.read().decode("utf-8", errors="replace")
            try:
                return status, json.loads(raw)
            except json.JSONDecodeError:
                return status, raw
    except HTTPError as e:
        return e.code, f"HTTPError: {e.reason}"
    except URLError as e:
        return 0, f"URLError: {e.reason}"
    except Exception as e:
        return 0, f"Exception: {type(e).__name__}: {e}"


def http_get(url: str, timeout: int = 30, retries: int = 1) -> tuple[int, dict | str]:
    """
    回 (status_code, body_json_or_text). 網路錯誤回 (0, err_msg).
    Zeabur 冷啟動:首次 timeout 是正常,retry 一次(等 3 秒)通常就熱了。
    """
    last_status, last_body = _http_get_once(url, timeout)
    if last_status in (200, 201, 204, 404):  # 404 也算「回應到」
        return last_status, last_body
    for attempt in range(retries):
        time.sleep(3)
        last_status, last_body = _http_get_once(url, timeout)
        if last_status in (200, 201, 204, 404):
            return last_status, last_body
    return last_status, last_body


def warmup(url: str, timeout: int = 45) -> None:
    """Zeabur 冷啟動喚醒:先打一下,不在乎結果。"""
    try:
        _http_get_once(url, timeout)
    except Exception:
        pass


# --------------------------------------------------------------------------- #
# 個別檢查
# --------------------------------------------------------------------------- #

def check_time() -> dict[str, Any]:
    """/api/time/now — 時鐘權威"""
    t0 = time.perf_counter()
    status, body = http_get(f"{BACKEND_BASE}/api/time/now")
    latency_ms = int((time.perf_counter() - t0) * 1000)
    anomaly = None
    if status != 200:
        anomaly = f"/api/time/now returned {status}: {body!r}"
    elif isinstance(body, dict):
        tz = body.get("timezone")
        if tz != "Asia/Taipei":
            anomaly = f"timezone != Asia/Taipei, got: {tz!r}"
    else:
        anomaly = f"/api/time/now body not JSON"
    return {
        "name": "time",
        "endpoint": "/api/time/now",
        "status": status,
        "latency_ms": latency_ms,
        "anomaly": anomaly,
        "sample": body if isinstance(body, dict) else str(body)[:200],
    }


def check_finmind() -> dict[str, Any]:
    """/api/diag/finmind — Sponsor 等級確認"""
    t0 = time.perf_counter()
    status, body = http_get(f"{BACKEND_BASE}/api/diag/finmind")
    latency_ms = int((time.perf_counter() - t0) * 1000)
    anomaly = None
    if status != 200:
        anomaly = f"status {status}"
    elif isinstance(body, dict):
        if body.get("level") != 3 or body.get("level_title") != "Sponsor":
            anomaly = f"FinMind plan 不是 Sponsor level 3! got level={body.get('level')} title={body.get('level_title')!r}"
    else:
        anomaly = "body not JSON"
    return {
        "name": "finmind",
        "endpoint": "/api/diag/finmind",
        "status": status,
        "latency_ms": latency_ms,
        "anomaly": anomaly,
        "sample": body if isinstance(body, dict) else str(body)[:200],
    }


def check_market_overview() -> dict[str, Any]:
    """/api/market/overview — TAIEX / SOX / VIX 即時資料"""
    t0 = time.perf_counter()
    status, body = http_get(f"{BACKEND_BASE}/api/market/overview")
    latency_ms = int((time.perf_counter() - t0) * 1000)
    anomaly = None
    summary = {}
    if status != 200:
        anomaly = f"status {status}"
    elif isinstance(body, dict):
        taiex = (body.get("taiex") or {}).get("close")
        sox = ((body.get("us") or {}).get("^SOX") or {}).get("price")
        vix = ((body.get("us") or {}).get("^VIX") or {}).get("price")
        summary = {"taiex_close": taiex, "sox_price": sox, "vix_price": vix}
        if taiex in (None, 0):
            anomaly = "TAIEX close missing or 0"
        elif sox in (None, 0):
            anomaly = "SOX price missing or 0 (Bug #3 regression?)"
        elif vix in (None, 0):
            anomaly = "VIX price missing or 0"
    return {
        "name": "market_overview",
        "endpoint": "/api/market/overview",
        "status": status,
        "latency_ms": latency_ms,
        "anomaly": anomaly,
        "sample": summary,
    }


def check_topics() -> dict[str, Any]:
    """/api/topics — 題材資料(Bug #4 regression monitor)"""
    t0 = time.perf_counter()
    status, body = http_get(f"{BACKEND_BASE}/api/topics")
    latency_ms = int((time.perf_counter() - t0) * 1000)
    anomaly = None
    count = None
    if status != 200:
        anomaly = f"status {status}"
    elif isinstance(body, dict):
        topics = body.get("topics", [])
        count = len(topics)
        if count == 0:
            anomaly = "topics 回空陣列(Bug #4 regression?)"
    return {
        "name": "topics",
        "endpoint": "/api/topics",
        "status": status,
        "latency_ms": latency_ms,
        "anomaly": anomaly,
        "sample": {"count": count},
    }


def check_chat_health() -> dict[str, Any]:
    """/api/chat/health — chat AI 是否健康"""
    t0 = time.perf_counter()
    status, body = http_get(f"{BACKEND_BASE}/api/chat/health")
    latency_ms = int((time.perf_counter() - t0) * 1000)
    anomaly = None
    if status != 200:
        anomaly = f"status {status}"
    elif isinstance(body, dict) and body.get("ok") is False:
        anomaly = f"ok=false: {body}"
    return {
        "name": "chat_health",
        "endpoint": "/api/chat/health",
        "status": status,
        "latency_ms": latency_ms,
        "anomaly": anomaly,
        "sample": body if isinstance(body, dict) else str(body)[:200],
    }


def check_frontend() -> dict[str, Any]:
    """前端首頁是否 200 + HTML 包含品牌關鍵字"""
    t0 = time.perf_counter()
    status, body = http_get(FRONTEND_BASE, timeout=20)
    latency_ms = int((time.perf_counter() - t0) * 1000)
    anomaly = None
    if status != 200:
        anomaly = f"frontend status {status}"
    elif isinstance(body, str):
        if "呱呱" not in body and "Quack" not in body:
            anomaly = "前端 HTML 不含品牌關鍵字 (可能 build 壞了)"
    return {
        "name": "frontend",
        "endpoint": FRONTEND_BASE,
        "status": status,
        "latency_ms": latency_ms,
        "anomaly": anomaly,
        "sample": {"html_len": len(body) if isinstance(body, str) else None},
    }


def check_diag_resolver() -> dict[str, Any]:
    """/api/diag/resolver — stock resolver 狀態(端點飢餓修復後新增)"""
    t0 = time.perf_counter()
    status, body = http_get(f"{BACKEND_BASE}/api/diag/resolver")
    latency_ms = int((time.perf_counter() - t0) * 1000)
    anomaly = None
    if status == 404:
        # 端點可能未部署,不算異常
        anomaly = None
    elif status != 200:
        anomaly = f"status {status}"
    return {
        "name": "resolver",
        "endpoint": "/api/diag/resolver",
        "status": status,
        "latency_ms": latency_ms,
        "anomaly": anomaly,
        "sample": body if isinstance(body, dict) else str(body)[:200],
    }


# --------------------------------------------------------------------------- #
# 主流程
# --------------------------------------------------------------------------- #

def main() -> int:
    now_utc = datetime.now(timezone.utc)

    # Zeabur 冷啟動喚醒 — 先打一次 /api/time/now 讓 backend 容器熱起來
    # (不計入結果,只是為了避免後續 check 第 1 次冷啟動 timeout)
    warmup(f"{BACKEND_BASE}/api/time/now")

    checks = [
        check_time(),
        check_finmind(),
        check_market_overview(),
        check_topics(),
        check_chat_health(),
        check_frontend(),
        check_diag_resolver(),
    ]

    anomalies = [c for c in checks if c.get("anomaly")]
    has_anomaly = len(anomalies) > 0

    # 取 TPE 時間(從 check_time 結果)當報告時間
    time_sample = checks[0].get("sample") or {}
    tpe_iso = time_sample.get("iso") if isinstance(time_sample, dict) else None
    if not tpe_iso:
        # backend 時鐘打不到,用 Python zoneinfo 算(比 UTC fallback 精準)
        try:
            from zoneinfo import ZoneInfo
            tpe_iso = datetime.now(ZoneInfo("Asia/Taipei")).isoformat() + " (py-zoneinfo fallback)"
        except Exception:
            tpe_iso = now_utc.isoformat() + " (UTC fallback)"
    report_time = tpe_iso

    summary = {
        "checked_at_utc": now_utc.isoformat(),
        "checked_at_tpe": report_time,
        "total_checks": len(checks),
        "healthy_count": len(checks) - len(anomalies),
        "anomaly_count": len(anomalies),
        "checks": checks,
    }

    # 寫 last_check.json
    LAST_CHECK_JSON.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

    # 輸出給 stdout(GHA 日誌)
    print(f"=== Watchdog @ {report_time} ===")
    for c in checks:
        mark = "❌" if c.get("anomaly") else "✅"
        print(f"  {mark} {c['name']}: status={c['status']} latency={c['latency_ms']}ms"
              f" anomaly={c.get('anomaly') or '—'}")

    # 寫 ANOMALIES.md(只有異常時)
    if has_anomaly:
        header = f"\n## {report_time} — {len(anomalies)} 個異常\n\n"
        lines = [header]
        for a in anomalies:
            lines.append(
                f"- **{a['name']}** (`{a['endpoint']}`) "
                f"status={a['status']} latency={a['latency_ms']}ms\n"
                f"  - ❌ {a['anomaly']}\n"
                f"  - sample: `{json.dumps(a.get('sample'), ensure_ascii=False)[:200]}`\n"
            )
        block = "\n".join(lines) + "\n---\n"

        if ANOMALIES_MD.exists():
            existing = ANOMALIES_MD.read_text(encoding="utf-8")
        else:
            existing = "# 🐺 Watchdog ANOMALIES Log\n\n> 自動累積異常紀錄。Claude Code 每次 session 開始應讀本檔。\n> 來源:`.github/workflows/watchdog.yml` 每 15 分鐘跑一次。\n"
        ANOMALIES_MD.write_text(existing + block, encoding="utf-8")

    # 寫 GHA output
    gha_out = os.environ.get("GITHUB_OUTPUT")
    if gha_out:
        with open(gha_out, "a", encoding="utf-8") as f:
            f.write(f"has_anomaly={'true' if has_anomaly else 'false'}\n")
            f.write(f"anomaly_count={len(anomalies)}\n")

    # exit code: 有異常但不 fail workflow(continue-on-error 語意)
    # 只有網路層級完全掛掉才 fail
    all_dead = all(c["status"] == 0 for c in checks)
    if all_dead:
        print("❌ 所有檢查都網路失敗,fail workflow")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
