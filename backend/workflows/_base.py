"""
Workflow 共用工具

- 取得 Vincent 的 watchlist
- 把結果寫入 Supabase(reports / recommendations / alerts)
- LINE 推播包裝(失敗不中斷流程)
- drift 紀錄(zero-lag scheduling)
"""

from __future__ import annotations

import os
from datetime import date, datetime
from typing import Any, Optional

from backend.services.notification_service import get_line_notifier
from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)


# ==========================================
# Watchlist
# ==========================================
def get_watchlist() -> list[str]:
    """
    取 Vincent 的自選股(user_id 由 env VINCENT_USER_ID 指定;若空則抓所有 watchlist)。
    Phase 3 先做個人,未來可延伸多使用者。
    """
    try:
        sb = get_service_client()
        uid = os.getenv("VINCENT_USER_ID", "")
        q = sb.table("watchlist").select("stock_id")
        if uid:
            q = q.eq("user_id", uid)
        res = q.execute()
        stocks = [r["stock_id"] for r in (res.data or [])]
        if stocks:
            return stocks
    except Exception as e:
        log.warning(f"讀 watchlist 失敗 ({e}),改用預設清單")

    # 預設觀察池(Phase 1-2 MVP)
    return ["2330", "2317", "2454", "2303", "2412", "3231", "2882", "0050"]


# ==========================================
# 儲存
# ==========================================
def save_report(
    report_type: str,
    report_date: date,
    content: dict,
    summary: Optional[str] = None,
) -> Optional[int]:
    """
    寫入 reports 表。回傳 inserted id(失敗時 None)。
    report_type: morning / day_trade / intraday / closing / us_market
    """
    try:
        sb = get_service_client()
        row = {
            "report_type": report_type,
            "report_date": report_date.isoformat(),
            "content": content,
            "summary": summary,
            "generated_at": now_tpe().isoformat(),
        }
        res = sb.table("reports").upsert(row, on_conflict="report_type,report_date").execute()
        rid = (res.data or [{}])[0].get("id")
        log.info(f"報告已存 {report_type} {report_date} id={rid}")
        return rid
    except Exception as e:
        log.error(f"save_report 失敗: {e}")
        return None


def save_recommendation(rec: dict) -> Optional[int]:
    """
    寫入 recommendations 表(每次產生建議)。
    rec 應含:stock_id, recommendation, confidence, total_score, evidence, data_snapshot
    """
    try:
        sb = get_service_client()
        row = {
            **rec,
            "created_at": now_tpe().isoformat(),
        }
        res = sb.table("recommendations").insert(row).execute()
        return (res.data or [{}])[0].get("id")
    except Exception as e:
        log.error(f"save_recommendation 失敗: {e}")
        return None


def save_alert(alert: dict) -> Optional[int]:
    """寫入 alerts 表(盤中警報)。"""
    try:
        sb = get_service_client()
        row = {
            **alert,
            "triggered_at": now_tpe().isoformat(),
        }
        res = sb.table("alerts").insert(row).execute()
        return (res.data or [{}])[0].get("id")
    except Exception as e:
        log.error(f"save_alert 失敗: {e}")
        return None


# ==========================================
# 推播
# ==========================================
def send_line(text: str) -> bool:
    """送 LINE,失敗不拋錯。"""
    notifier = get_line_notifier()
    r = notifier.push_text(text)
    return r.ok


# ==========================================
# Drift 紀錄
# ==========================================
def log_drift(
    workflow_name: str,
    scheduled_at: datetime,
    actual_at: Optional[datetime] = None,
    metadata: Optional[dict] = None,
) -> float:
    """
    記錄排程 drift 到 system_health(同步版;time_utils 的是 async)。
    """
    actual = actual_at or now_tpe()
    drift_s = (actual - scheduled_at).total_seconds()
    if abs(drift_s) < 1:
        status = "healthy"
    elif abs(drift_s) < 5:
        status = "degraded"
    else:
        status = "down"
    try:
        sb = get_service_client()
        sb.table("system_health").insert({
            "checked_at": actual.isoformat(),
            "service_name": f"scheduler_{workflow_name}",
            "status": status,
            "response_time_ms": int(drift_s * 1000),
            "error_message": None if status == "healthy" else f"drift {drift_s:.2f}s",
            "metadata": {
                "workflow": workflow_name,
                "scheduled": scheduled_at.isoformat(),
                "actual": actual.isoformat(),
                "drift_seconds": drift_s,
                **(metadata or {}),
            },
        }).execute()
    except Exception as e:
        log.warning(f"log_drift 寫入失敗: {e}")

    if status != "healthy":
        log.warning(f"{workflow_name} drift {drift_s:.2f}s ({status})")
    return drift_s


# ==========================================
# Workflow 狀態
# ==========================================
class WorkflowContext:
    """workflow 執行紀錄,便於 debug 與驗收。"""

    def __init__(self, name: str, scheduled_at: Optional[datetime] = None, dry_run: bool = False):
        self.name = name
        self.scheduled_at = scheduled_at or now_tpe()
        self.started_at = now_tpe()
        self.dry_run = dry_run
        self.errors: list[str] = []
        log.info(f"🚀 {name} 啟動 (dry_run={dry_run}) scheduled={self.scheduled_at.isoformat()}")

    def error(self, msg: str) -> None:
        self.errors.append(msg)
        log.error(f"[{self.name}] {msg}")

    def finish(self, metadata: Optional[dict] = None) -> dict:
        end = now_tpe()
        dur = (end - self.started_at).total_seconds()
        drift = (self.started_at - self.scheduled_at).total_seconds()
        log.info(
            f"✅ {self.name} 完成 duration={dur:.2f}s drift={drift:+.2f}s errors={len(self.errors)}"
        )
        if not self.dry_run:
            log_drift(self.name, self.scheduled_at, self.started_at, metadata)
        return {
            "workflow": self.name,
            "started_at": self.started_at.isoformat(),
            "ended_at": end.isoformat(),
            "duration_seconds": dur,
            "drift_seconds": drift,
            "errors": self.errors,
            "metadata": metadata or {},
        }
