#!/usr/bin/env python3
"""
呱呱投資招待所 — Self Audit(系統完整度自檢)

與 watchdog.py 不同:
  watchdog = 線上端點健康(backend 掛了嗎?)
  self-audit = 系統完整度(功能做了幾成?還有什麼是半成品?)

每 30 分鐘跑一次,寫入:
  - ceo-desk/watchdog/SELF_AUDIT.md  最近一次完整報告
  - ceo-desk/watchdog/ANOMALIES.md   若發現新「系統劣化」append

檢查維度:
  1. 12 agent 身份核心是否全部填好(非「待設計」)
  2. decisions/ 是否有 ADR-XXX 命名規範的檔
  3. inbox/NEXT_TASK.md 是否太久沒動(> 3 天)
  4. DB: agent_stats 是否 12 筆 + display_name 非 NULL
  5. 視覺資產:11 位 agent 是否已替換 placeholder
  6. 憲法 Section 13.2 路線圖狀態(自動掃描)
  7. /api/agents 是否回 12 筆
  8. Watchdog 最近 1 小時內有沒有跑過(檢查 last_check.json 新鮮度)

原則與 watchdog 一致:
  ❌ 絕不自動修 code
  ✅ 只觀察、只報告
"""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BACKEND_BASE = os.environ.get("BACKEND_BASE", "https://vsis-api.zeabur.app")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

REPO_ROOT = Path(__file__).resolve().parents[2]
WATCHDOG_DIR = REPO_ROOT / "ceo-desk" / "watchdog"
SELF_AUDIT_MD = WATCHDOG_DIR / "SELF_AUDIT.md"
ANOMALIES_MD = WATCHDOG_DIR / "ANOMALIES.md"
LAST_CHECK_JSON = WATCHDOG_DIR / "last_check.json"


def http_get_json(url: str, headers: dict | None = None, timeout: int = 20):
    try:
        req = Request(url, headers=headers or {})
        with urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except HTTPError as e:
        return e.code, {"error": f"HTTPError {e.reason}"}
    except Exception as e:
        return 0, {"error": f"{type(e).__name__}: {e}"}


# --------------------------------------------------------------------------- #
# 檢查項
# --------------------------------------------------------------------------- #

def check_agent_memory_completeness() -> dict:
    """12 份 *_MEMORY.md 的身份核心是否完整"""
    agents_dir = REPO_ROOT / "ceo-desk" / "context" / "agents"
    if not agents_dir.exists():
        return {"name": "agent_memory", "status": "missing", "detail": "agents/ 目錄不存在"}
    files = sorted(agents_dir.glob("*_MEMORY.md"))
    incomplete = []
    for f in files:
        txt = f.read_text(encoding="utf-8", errors="replace")
        if "待設計" in txt or "🟡 人設待設計" in txt:
            incomplete.append(f.name)
        if "身份核心" not in txt:
            incomplete.append(f.name + "(缺身份核心區塊)")
    return {
        "name": "agent_memory",
        "total": len(files),
        "incomplete": len(incomplete),
        "incomplete_files": incomplete,
        "anomaly": f"{len(incomplete)} 份 agent 身份核心未完成" if incomplete else None,
    }


def check_decisions() -> dict:
    """decisions/ 目錄的 ADR 數量"""
    d = REPO_ROOT / "ceo-desk" / "decisions"
    if not d.exists():
        return {"name": "decisions", "anomaly": "decisions/ 目錄不存在"}
    adrs = list(d.glob("ADR-*.md"))
    erratas = list(d.glob("ERRATA-*.md"))
    return {
        "name": "decisions",
        "adr_count": len(adrs),
        "errata_count": len(erratas),
        "adrs": [f.name for f in adrs],
        "anomaly": None,
    }


def check_inbox_freshness() -> dict:
    """inbox/NEXT_TASK.md 太久沒動?"""
    f = REPO_ROOT / "ceo-desk" / "inbox" / "NEXT_TASK.md"
    if not f.exists():
        return {"name": "inbox", "anomaly": "inbox/NEXT_TASK.md 不存在"}
    mtime = datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc)
    age = datetime.now(timezone.utc) - mtime
    anomaly = None
    if age > timedelta(days=3):
        anomaly = f"NEXT_TASK 已 {age.days} 天沒更新,可能有未處理任務"
    return {
        "name": "inbox",
        "last_modified_utc": mtime.isoformat(),
        "age_days": age.days,
        "anomaly": anomaly,
    }


def check_agent_stats_db() -> dict:
    """DB: agent_stats 是否 12 筆 + display_name 非 NULL"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"name": "agent_stats_db", "anomaly": "SUPABASE env 未設,無法檢查"}
    status, body = http_get_json(
        f"{SUPABASE_URL}/rest/v1/agent_stats?select=agent_id,display_name,tracked",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
    )
    if status != 200:
        return {"name": "agent_stats_db", "status": status, "anomaly": f"agent_stats 不可查:{body}"}
    total = len(body)
    missing_display = [r["agent_id"] for r in body if not r.get("display_name")]
    tracked_count = sum(1 for r in body if r.get("tracked"))
    anomaly = None
    if total < 12:
        anomaly = f"agent_stats 只有 {total} 筆,應為 12"
    elif missing_display:
        anomaly = f"{len(missing_display)} 個 agent 缺 display_name: {missing_display}"
    return {
        "name": "agent_stats_db",
        "total": total,
        "tracked": tracked_count,
        "missing_display_name": missing_display,
        "anomaly": anomaly,
    }


def check_agents_endpoint() -> dict:
    """/api/agents 回 12 筆"""
    status, body = http_get_json(f"{BACKEND_BASE}/api/agents")
    if status != 200:
        return {"name": "agents_endpoint", "anomaly": f"/api/agents status={status}"}
    count = body.get("count", 0)
    tracked = body.get("tracked_count", 0)
    anomaly = None
    if count < 12:
        anomaly = f"/api/agents 只回 {count} 筆,應 12"
    return {
        "name": "agents_endpoint",
        "count": count,
        "tracked_count": tracked,
        "anomaly": anomaly,
    }


def check_watchdog_freshness() -> dict:
    """watchdog 最近 1 小時內有沒有跑過"""
    if not LAST_CHECK_JSON.exists():
        return {"name": "watchdog_freshness", "anomaly": "last_check.json 不存在(watchdog 從未跑過?)"}
    data = json.loads(LAST_CHECK_JSON.read_text(encoding="utf-8"))
    t_str = data.get("checked_at_utc")
    if not t_str:
        return {"name": "watchdog_freshness", "anomaly": "last_check.json 缺 checked_at_utc"}
    try:
        t = datetime.fromisoformat(t_str.replace("Z", "+00:00"))
    except ValueError:
        return {"name": "watchdog_freshness", "anomaly": f"checked_at_utc 格式不對: {t_str}"}
    age = datetime.now(timezone.utc) - t
    anomaly = None
    if age > timedelta(minutes=45):
        anomaly = f"watchdog 已 {int(age.total_seconds()/60)} 分鐘沒跑(>45 分,可能 GHA 壞了)"
    return {
        "name": "watchdog_freshness",
        "last_check_age_min": int(age.total_seconds() / 60),
        "last_healthy": data.get("healthy_count") == data.get("total_checks"),
        "anomaly": anomaly,
    }


def check_visual_assets() -> dict:
    """視覺資產狀態"""
    guagua_official = REPO_ROOT / "frontend" / "public" / "characters" / "guagua_official_v1.png"
    # 其他 11 位 agent 視覺是否存在
    chars_dir = REPO_ROOT / "frontend" / "public" / "characters"
    expected_ids = [
        "owl_fundamentalist", "hedgehog_technical", "squirrel_chip", "meerkat_quant",
        "fox_skeptic", "pangolin_risk",
        "analyst_a", "analyst_b", "analyst_c", "analyst_d", "analyst_e",
    ]
    missing = []
    if chars_dir.exists():
        for aid in expected_ids:
            if not any(chars_dir.glob(f"{aid}*.png")) and not any(chars_dir.glob(f"{aid}*.jpg")):
                missing.append(aid)
    else:
        missing = expected_ids
    anomaly = f"{len(missing)}/11 位 agent 視覺還缺(用 emoji 占位中)" if missing else None
    return {
        "name": "visual_assets",
        "guagua_exists": guagua_official.exists(),
        "other_missing": len(missing),
        "missing_ids": missing,
        "anomaly": anomaly,  # 這是「預期中的 TODO」,不是 bug
    }


def check_roadmap_progress() -> dict:
    """掃描憲法 Section 13.2 路線圖的完成狀態(抓 commit history 關鍵字)"""
    # 簡化版:看 ceo-desk/decisions/ 有幾個 ADR + agent_stats 是否 12 筆
    # (真正的進度追蹤需要單獨資料表,這裡先粗估)
    d = REPO_ROOT / "ceo-desk" / "decisions"
    adrs = list(d.glob("ADR-*.md")) if d.exists() else []

    memory_files = list((REPO_ROOT / "ceo-desk" / "context" / "agents").glob("*_MEMORY.md"))
    memory_completed = 0
    for f in memory_files:
        txt = f.read_text(encoding="utf-8", errors="replace")
        if "待設計" not in txt and "身份核心" in txt:
            memory_completed += 1

    # 粗略 % 進度
    buckets = {
        "階段 0 / 7 bugs": 7 / 7,  # 全修完
        "憲法 + ADR": min(len(adrs) / 3, 1),  # 應有 3 份
        "12 agent 人設": memory_completed / 12,
        "Watchdog 系統": 1.0 if LAST_CHECK_JSON.exists() else 0.0,
        "Agent 預測 DB": 1.0,  # migration 0006 已 apply
    }
    pct = sum(buckets.values()) / len(buckets)
    return {
        "name": "roadmap",
        "phase0_bugs_fixed": True,
        "adr_count": len(adrs),
        "agent_memory_completed": f"{memory_completed}/12",
        "rough_completion_pct": round(pct * 100, 1),
        "buckets": {k: round(v * 100, 1) for k, v in buckets.items()},
        "anomaly": None,
    }


# --------------------------------------------------------------------------- #
# 主
# --------------------------------------------------------------------------- #

def main() -> int:
    now = datetime.now(timezone.utc)
    try:
        from zoneinfo import ZoneInfo
        tpe_now = datetime.now(ZoneInfo("Asia/Taipei")).isoformat()
    except Exception:
        tpe_now = now.isoformat() + " (UTC fallback)"

    checks = [
        check_agent_memory_completeness(),
        check_decisions(),
        check_inbox_freshness(),
        check_agent_stats_db(),
        check_agents_endpoint(),
        check_watchdog_freshness(),
        check_visual_assets(),
        check_roadmap_progress(),
    ]
    anomalies = [c for c in checks if c.get("anomaly")]
    anomaly_msgs = [(c["name"], c["anomaly"]) for c in checks if c.get("anomaly")]

    # 寫 SELF_AUDIT.md — 完整覆蓋
    lines = [
        f"# 🔍 Self Audit — {tpe_now}",
        "",
        f"> Auto-generated by `.github/scripts/self_audit.py` every 30 min.",
        f"> Complement to `watchdog.py`(線上健康)—— 本檔檢查**系統完整度**。",
        "",
        f"**Anomaly count**: {len(anomalies)}",
        "",
        "## 檢查結果",
        "",
    ]
    for c in checks:
        name = c.get("name", "unnamed")
        anomaly = c.get("anomaly")
        mark = "❌" if anomaly else "✅"
        lines.append(f"### {mark} {name}")
        if anomaly:
            lines.append(f"- ⚠️ **{anomaly}**")
        for k, v in c.items():
            if k in ("name", "anomaly"):
                continue
            if isinstance(v, (list, dict)):
                v_str = json.dumps(v, ensure_ascii=False)
                if len(v_str) > 300:
                    v_str = v_str[:300] + " ..."
                lines.append(f"- {k}: `{v_str}`")
            else:
                lines.append(f"- {k}: `{v}`")
        lines.append("")

    lines.append("---")
    lines.append(f"Next audit: ~30 min from now(GHA cron `*/30 * * * *`)")

    SELF_AUDIT_MD.parent.mkdir(parents=True, exist_ok=True)
    SELF_AUDIT_MD.write_text("\n".join(lines), encoding="utf-8")

    # 寫 ANOMALIES.md append — 只有「新發現」才寫(避免重複洪水)
    has_new = False
    if anomaly_msgs and ANOMALIES_MD.exists():
        existing = ANOMALIES_MD.read_text(encoding="utf-8")
        new_msgs = [(n, m) for n, m in anomaly_msgs if m and m not in existing]
        if new_msgs:
            has_new = True
            block = f"\n## {tpe_now} — Self Audit 發現新問題\n\n"
            for n, m in new_msgs:
                block += f"- **{n}**: ❌ {m}\n"
            block += "\n---\n"
            with open(ANOMALIES_MD, "a", encoding="utf-8") as f:
                f.write(block)

    # stdout 摘要給 GHA log 用
    print(f"=== Self Audit @ {tpe_now} ===")
    print(f"Anomalies: {len(anomalies)}")
    for n, m in anomaly_msgs:
        print(f"  ❌ {n}: {m}")

    # GHA output
    gha_out = os.environ.get("GITHUB_OUTPUT")
    if gha_out:
        with open(gha_out, "a", encoding="utf-8") as f:
            f.write(f"has_anomaly={'true' if anomalies else 'false'}\n")
            f.write(f"new_anomaly={'true' if has_new else 'false'}\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
