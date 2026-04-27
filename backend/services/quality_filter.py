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


# 統計面隱藏的 statuses(T3a-cleanup 後加上 flagged_minor 進警示但仍顯示)
HIDDEN_STATUSES = ("pre_upgrade_2026_04_25", "rejected_by_sanity")
# 帶警示標但仍顯示的 statuses
WARNING_STATUSES = ("flagged_minor",)


def apply_quality_filter(query: Any, *, hide_flagged: bool = False) -> Any:
    """在 supabase-py 的 select query 上加 quality filter。

    T3a-cleanup 收尾 2:migration 0018 套用後,改用正規 column `data_quality_status`
    取代 `evidence->>'data_quality_status'`(後者 1) 沒 index、慢、2) 寫法囉嗦)。

    Args:
        query: supabase-py query builder(已 .from_().select() 之後)
        hide_flagged: 若 True 把 flagged_minor 也排除(預設 False — 顯示但警示)

    Returns:
        加了 quality filter 的 query。
    """
    hidden = list(HIDDEN_STATUSES)
    if hide_flagged:
        hidden = hidden + list(WARNING_STATUSES)
    hidden_str = ",".join(hidden)
    return query.or_(
        f"data_quality_status.is.null,"
        f"data_quality_status.not.in.({hidden_str})"
    )


def is_hidden_row(row: dict[str, Any], *, hide_flagged: bool = False) -> bool:
    """In-memory 用:判斷單筆 row 是否該被統計面隱藏。

    T3a-cleanup 後優先讀 row['data_quality_status']column,fallback 到 evidence JSONB
    (向下相容沒套 0018 migration 的環境)。
    """
    status = row.get("data_quality_status")
    if status is None:
        ev = row.get("evidence") or {}
        status = ev.get("data_quality_status")
    if status in HIDDEN_STATUSES:
        return True
    if hide_flagged and status in WARNING_STATUSES:
        return True
    return False


def filter_rows(
    rows: list[dict[str, Any]], *, hide_flagged: bool = False,
) -> list[dict[str, Any]]:
    """In-memory 用:對 list of rows 做 quality filter。"""
    return [r for r in rows if not is_hidden_row(r, hide_flagged=hide_flagged)]


def annotate_row(row: dict[str, Any]) -> dict[str, Any]:
    """詳情頁 + 統計面 flagged 警示用:在 row 加上 _quality_annotation 欄位。

    T3a-cleanup 後支援 4 種 status:
      pre_upgrade_2026_04_25 → warn
      rejected_by_sanity     → error
      flagged_minor          → warn(列表也會帶,給前台畫橘色警示框)
      unverified             → 無 annotation(撈不到 close 不算品質問題)

    優先讀正規 column,fallback 到 evidence JSONB(向下相容)。
    """
    status = row.get("data_quality_status")
    deviation = row.get("basis_accuracy_pct")
    if status is None:
        ev = row.get("evidence") or {}
        status = ev.get("data_quality_status")
        deviation = deviation if deviation is not None else ev.get("basis_accuracy_pct")
    if status == "pre_upgrade_2026_04_25":
        row["_quality_annotation"] = {
            "label": "系統升級前紀錄",
            "detail": "此筆為 2026-04-26 防線升級前產生的預測、entry_price 基準偏差、僅供演進史參考",
            "level": "warn",
        }
    elif status == "rejected_by_sanity":
        row["_quality_annotation"] = {
            "label": "Sanity check 拒絕",
            "detail": (
                f"此筆 entry_price 偏差 {deviation}% (≥25%),被防線判定為訓練記憶污染、不可信"
                if deviation is not None
                else "此筆 entry_price 嚴重偏離當日真實 close,被防線判定為訓練記憶污染、不可信"
            ),
            "level": "error",
        }
    elif status == "flagged_minor":
        row["_quality_annotation"] = {
            "label": "中度偏差警示",
            "detail": (
                f"此筆 entry_price 偏差 {deviation}% (5-25%),仍可參考但建議人工複核"
                if deviation is not None
                else "此筆 entry_price 偏差 5-25%,仍可參考但建議人工複核"
            ),
            "level": "warn",
        }
    return row
