"""
STAGE1-T3a Defense 4: 統計面 quality filter

對於前台「統計類」端點(勝率、儀表板、聚合),從 quack_predictions / quack_judgments 撈資料時
排除 data_quality_status IN ('pre_upgrade_2026_04_25', 'rejected_by_sanity')。

詳情類端點(/predictions/[id]、/analysts/[slug]/deep_profile)不過濾,
但前台應顯示「升級前資料 / 僅供演進史參考」標註。

策略(以 evidence JSONB 為實作載體 — migration 0018 套用前的 workaround):
  WHERE evidence->>'data_quality_status' IS NULL
     OR evidence->>'data_quality_status' NOT IN ('pre_upgrade_2026_04_25', 'rejected_by_sanity')

實作:
  apply_quality_filter(query) → 在 supabase-py query builder 上加 .or_() 條件

PostgREST or_() 文法:
  evidence->>data_quality_status.is.null,evidence->>data_quality_status.not.in.(pre_upgrade_2026_04_25,rejected_by_sanity)
"""
from __future__ import annotations

from typing import Any


# 隱藏的 statuses
HIDDEN_STATUSES = ("pre_upgrade_2026_04_25", "rejected_by_sanity")


def apply_quality_filter(query: Any) -> Any:
    """在 supabase-py 的 select query 上加 quality filter。

    Args:
        query: supabase-py query builder(已 .from_().select() 之後)

    Returns:
        加了 quality filter 的 query。

    範例:
        sb = get_service_client()
        q = sb.table("quack_predictions").select("*").eq("agent_id", "analyst_a")
        q = apply_quality_filter(q)
        rows = q.execute().data
    """
    hidden = ",".join(HIDDEN_STATUSES)
    # PostgREST or filter:status NULL 或 status 不在隱藏清單
    return query.or_(
        f"evidence->>data_quality_status.is.null,"
        f"evidence->>data_quality_status.not.in.({hidden})"
    )


def is_hidden_row(row: dict[str, Any]) -> bool:
    """In-memory 用:判斷單筆 row 是否該被統計面隱藏。"""
    ev = row.get("evidence") or {}
    status = ev.get("data_quality_status")
    return status in HIDDEN_STATUSES


def filter_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """In-memory 用:對 list of rows 做 quality filter。"""
    return [r for r in rows if not is_hidden_row(r)]


def annotate_row(row: dict[str, Any]) -> dict[str, Any]:
    """詳情頁用:在 row 加上 _quality_annotation 欄位讓前台顯示標註。"""
    ev = row.get("evidence") or {}
    status = ev.get("data_quality_status")
    if status == "pre_upgrade_2026_04_25":
        row["_quality_annotation"] = {
            "label": "系統升級前紀錄",
            "detail": "此筆為 2026-04-26 系統防線升級前產生的預測,entry_price 基準偏差,僅供演進史參考",
            "level": "warn",
        }
    elif status == "rejected_by_sanity":
        row["_quality_annotation"] = {
            "label": "Sanity check 未通過",
            "detail": "此筆 entry_price 跟同日真實 close 偏差 ≥ 5%,被防線標記為不可信",
            "level": "error",
        }
    return row
