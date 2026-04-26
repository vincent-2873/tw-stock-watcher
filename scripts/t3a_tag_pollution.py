"""
STAGE1-T3a Defense 3: 污染資料隔離(標記不刪)

對 quack_predictions 標記三批污染:
  1. MEET-2026-0425-HOLDINGS 那 125 筆 → source='llm_holdings', data_quality_status='pre_upgrade_2026_04_25'
  2. MEET-2026-0425-0800 那 5 筆      → source='llm_morning', data_quality_status='pre_upgrade_2026_04_25'
  3. analyst_daily_picks 那 22 筆     → 加 evidence-like fields(該表沒 evidence,改加 quality_meta jsonb-style 用 generated_at 在 0425 那批)

對 BACKFILL_008d1 不批量標記。改成每筆算 basis_accuracy_pct + basis_quality:
  4. SELECT BACKFILL rows + JOIN stock_prices_historical → 計算 deviation_pct → UPDATE evidence

執行:
  python scripts/t3a_tag_pollution.py preview   (純 SELECT 不寫)
  python scripts/t3a_tag_pollution.py apply     (執行 UPDATE)
  python scripts/t3a_tag_pollution.py verify    (檢查標記結果)
"""
from __future__ import annotations

import os
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# 載 .env 設環境變數
env_file = ROOT / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k, v)

from supabase import Client, create_client  # noqa: E402


def _sb() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])


# 三批污染的辨識條件
HOLDINGS_MEETING_ID = "MEET-2026-0425-HOLDINGS"
MORNING_MEETING_ID = "MEET-2026-0425-0800"
DAILY_PICKS_DATE = "2026-04-25"
BACKFILL_MARKERS = ["BACKFILL_008d1", "BACKFILL_008d2"]


def _from_basis_quality(d: float | None) -> str | None:
    if d is None:
        return None
    a = abs(d)
    if a < 1.0:
        return "precise"
    if a < 5.0:
        return "acceptable"
    if a < 25.0:
        return "biased"
    return "invalid"


# =====================================================================
# Preview (read-only)
# =====================================================================
def preview() -> None:
    sb = _sb()

    # Total count snapshot (零刪除證明用)
    total = sb.table("quack_predictions").select("id", count="exact").limit(1).execute().count
    print(f"BEFORE total quack_predictions: {total}")
    daily_total = sb.table("analyst_daily_picks").select("id", count="exact").limit(1).execute().count
    print(f"BEFORE total analyst_daily_picks: {daily_total}")

    # 1. HOLDINGS 125 筆
    r = sb.table("quack_predictions").select("id,evidence,target_symbol,target_price,current_price_at_prediction,created_at").eq("meeting_id", HOLDINGS_MEETING_ID).execute()
    print(f"\n[1] HOLDINGS rows: {len(r.data)}")
    if r.data:
        statuses = Counter([(row.get("evidence") or {}).get("data_quality_status") for row in r.data])
        print(f"   current data_quality_status: {dict(statuses)}")

    # 2. MORNING 5 筆
    r = sb.table("quack_predictions").select("id,evidence,target_symbol,target_price,current_price_at_prediction").eq("meeting_id", MORNING_MEETING_ID).execute()
    print(f"\n[2] MORNING rows: {len(r.data)}")

    # 3. DAILY PICKS 22 筆
    r = sb.table("analyst_daily_picks").select("id,target_symbol,entry_price_low,entry_price_high,pick_date").eq("pick_date", DAILY_PICKS_DATE).execute()
    print(f"\n[3] DAILY_PICKS rows on {DAILY_PICKS_DATE}: {len(r.data)}")

    # 4. BACKFILL — count by marker
    print("\n[4] BACKFILL pollution scoring (per row basis_accuracy)")
    for marker in BACKFILL_MARKERS:
        r = sb.table("quack_predictions").select("id,evidence,target_symbol,current_price_at_prediction,created_at").filter("evidence->>backfill_marker", "eq", marker).execute()
        print(f"   marker={marker}: {len(r.data)} rows")


# =====================================================================
# Apply
# =====================================================================
def _update_evidence(sb: Client, row_id: int, current_evidence: dict | None, new_keys: dict) -> None:
    merged = dict(current_evidence or {})
    merged.update(new_keys)
    sb.table("quack_predictions").update({"evidence": merged}).eq("id", row_id).execute()


def apply() -> None:
    sb = _sb()

    total_before = sb.table("quack_predictions").select("id", count="exact").limit(1).execute().count
    daily_before = sb.table("analyst_daily_picks").select("id", count="exact").limit(1).execute().count
    print(f"BEFORE quack_predictions={total_before}, analyst_daily_picks={daily_before}")

    # 1. HOLDINGS 125 筆
    r = sb.table("quack_predictions").select("id,evidence,target_symbol,target_price,current_price_at_prediction,created_at").eq("meeting_id", HOLDINGS_MEETING_ID).execute()
    holdings_rows = r.data
    print(f"\n[1] tagging HOLDINGS rows: {len(holdings_rows)}")
    for row in holdings_rows:
        # 嘗試算 basis_accuracy(用 created_at 那天的 close)
        symbol = row.get("target_symbol")
        cur_price = row.get("current_price_at_prediction")
        # 這批已被證實 p50=70% 偏差,但每筆仍應該嘗試算具體偏差
        deviation = None
        real_close = None
        if symbol and cur_price:
            pr = sb.table("stock_prices_historical").select("close,trade_date").eq("stock_id", str(symbol)).lte("trade_date", "2026-04-25").order("trade_date", desc=True).limit(1).execute()
            if pr.data:
                real_close = float(pr.data[0]["close"])
                if real_close > 0:
                    deviation = abs(float(cur_price) - real_close) / real_close * 100.0
        new_keys = {
            "source": "llm_holdings",
            "data_quality_status": "pre_upgrade_2026_04_25",
            "basis_accuracy_pct": round(deviation, 4) if deviation is not None else None,
            "basis_quality": _from_basis_quality(deviation),
            "basis_check_real_close": real_close,
            "basis_check_reason": "tagged_post_hoc_t3a",
        }
        _update_evidence(sb, row["id"], row.get("evidence"), new_keys)
    print(f"   ✓ tagged {len(holdings_rows)} HOLDINGS rows")

    # 2. MORNING 5 筆(早場 0800,中度污染)
    r = sb.table("quack_predictions").select("id,evidence,target_symbol,current_price_at_prediction,created_at").eq("meeting_id", MORNING_MEETING_ID).execute()
    morning_rows = r.data
    print(f"\n[2] tagging MORNING rows: {len(morning_rows)}")
    for row in morning_rows:
        symbol = row.get("target_symbol")
        cur_price = row.get("current_price_at_prediction")
        deviation = None
        real_close = None
        if symbol and cur_price:
            pr = sb.table("stock_prices_historical").select("close").eq("stock_id", str(symbol)).lte("trade_date", "2026-04-25").order("trade_date", desc=True).limit(1).execute()
            if pr.data:
                real_close = float(pr.data[0]["close"])
                if real_close > 0:
                    deviation = abs(float(cur_price) - real_close) / real_close * 100.0
        new_keys = {
            "source": "llm_morning",
            "data_quality_status": "pre_upgrade_2026_04_25",
            "basis_accuracy_pct": round(deviation, 4) if deviation is not None else None,
            "basis_quality": _from_basis_quality(deviation),
            "basis_check_real_close": real_close,
            "basis_check_reason": "tagged_post_hoc_t3a",
        }
        _update_evidence(sb, row["id"], row.get("evidence"), new_keys)
    print(f"   ✓ tagged {len(morning_rows)} MORNING rows")

    # 3. DAILY_PICKS 22 筆 — analyst_daily_picks 沒 evidence column
    #    改成 update reason 欄位後綴標記(該表 reason 是 text)
    r = sb.table("analyst_daily_picks").select("id,reason").eq("pick_date", DAILY_PICKS_DATE).execute()
    daily_rows = r.data
    print(f"\n[3] tagging DAILY_PICKS rows: {len(daily_rows)}")
    tag_str = "[T3A_PRE_UPGRADE_2026_04_25 - 此筆受 HOLDINGS 髒 price 連帶污染、僅供演進史參考]"
    for row in daily_rows:
        existing = row.get("reason") or ""
        if "T3A_PRE_UPGRADE_2026_04_25" not in existing:
            new_reason = f"{tag_str} {existing}"[:1000]
            sb.table("analyst_daily_picks").update({"reason": new_reason}).eq("id", row["id"]).execute()
    print(f"   ✓ tagged {len(daily_rows)} DAILY_PICKS rows (reason prefix added)")

    # 4. BACKFILL — 算每筆 basis_accuracy(不批量標記)
    print("\n[4] computing basis_accuracy for BACKFILL rows (per row)")
    backfill_total = 0
    quality_count = Counter()
    for marker in BACKFILL_MARKERS:
        r = sb.table("quack_predictions").select("id,evidence,target_symbol,current_price_at_prediction,created_at").filter("evidence->>backfill_marker", "eq", marker).execute()
        print(f"   marker={marker}: {len(r.data)} rows")
        for row in r.data:
            symbol = row.get("target_symbol")
            cur_price = row.get("current_price_at_prediction")
            created = row.get("created_at") or ""
            check_date = created[:10] if created else "2026-01-01"
            deviation = None
            real_close = None
            if symbol and cur_price:
                pr = sb.table("stock_prices_historical").select("close").eq("stock_id", str(symbol)).lte("trade_date", check_date).order("trade_date", desc=True).limit(1).execute()
                if pr.data:
                    real_close = float(pr.data[0]["close"])
                    if real_close > 0:
                        deviation = abs(float(cur_price) - real_close) / real_close * 100.0
            quality = _from_basis_quality(deviation)
            new_keys = {
                "source": "llm_backfill",
                "data_quality_status": "unverified",  # 不批量標 pre_upgrade,因為 BACKFILL p50=2.89%
                "basis_accuracy_pct": round(deviation, 4) if deviation is not None else None,
                "basis_quality": quality,
                "basis_check_real_close": real_close,
                "basis_check_reason": "computed_post_hoc_t3a",
            }
            _update_evidence(sb, row["id"], row.get("evidence"), new_keys)
            backfill_total += 1
            quality_count[quality or "no_close"] += 1
    print(f"   ✓ computed for {backfill_total} BACKFILL rows")
    print(f"   quality distribution: {dict(quality_count)}")

    # 零刪除證明
    total_after = sb.table("quack_predictions").select("id", count="exact").limit(1).execute().count
    daily_after = sb.table("analyst_daily_picks").select("id", count="exact").limit(1).execute().count
    print("\n=== zero-deletion proof ===")
    print(f"   quack_predictions:    {total_before} → {total_after} (delta={total_after - total_before})")
    print(f"   analyst_daily_picks:  {daily_before} → {daily_after} (delta={daily_after - daily_before})")
    if total_after != total_before or daily_after != daily_before:
        print("   ✗ ROW COUNT CHANGED — investigate")
        sys.exit(1)
    print("   ✓ row counts preserved")


# =====================================================================
# Verify
# =====================================================================
def verify() -> None:
    sb = _sb()

    # 1. HOLDINGS data_quality_status='pre_upgrade_2026_04_25' 數
    r = sb.table("quack_predictions").select("id").eq("meeting_id", HOLDINGS_MEETING_ID).filter("evidence->>data_quality_status", "eq", "pre_upgrade_2026_04_25").execute()
    print(f"HOLDINGS tagged pre_upgrade: {len(r.data)} (expect 125)")

    # 2. MORNING
    r = sb.table("quack_predictions").select("id").eq("meeting_id", MORNING_MEETING_ID).filter("evidence->>data_quality_status", "eq", "pre_upgrade_2026_04_25").execute()
    print(f"MORNING tagged pre_upgrade: {len(r.data)} (expect 5)")

    # 3. DAILY_PICKS
    r = sb.table("analyst_daily_picks").select("id,reason").eq("pick_date", DAILY_PICKS_DATE).execute()
    tagged = sum(1 for row in r.data if "T3A_PRE_UPGRADE" in (row.get("reason") or ""))
    print(f"DAILY_PICKS tagged: {tagged}/{len(r.data)} (expect 22/22)")

    # 4. BACKFILL basis_quality distribution
    backfill_total = 0
    quality_count = Counter()
    for marker in BACKFILL_MARKERS:
        r = sb.table("quack_predictions").select("evidence").filter("evidence->>backfill_marker", "eq", marker).execute()
        for row in r.data:
            ev = row.get("evidence") or {}
            quality_count[ev.get("basis_quality") or "no_close"] += 1
            backfill_total += 1
    print(f"BACKFILL rows with basis_quality: {backfill_total}")
    print(f"  distribution: {dict(quality_count)}")

    # 5. samples — random 5
    r = sb.table("quack_predictions").select("id,target_symbol,current_price_at_prediction,evidence").eq("meeting_id", HOLDINGS_MEETING_ID).limit(5).execute()
    print("\nrandom 5 HOLDINGS samples:")
    for row in r.data:
        ev = row.get("evidence") or {}
        print(f"  id={row['id']} sym={row['target_symbol']} cur={row['current_price_at_prediction']} status={ev.get('data_quality_status')} dev={ev.get('basis_accuracy_pct')}% quality={ev.get('basis_quality')} real={ev.get('basis_check_real_close')}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "preview":
        preview()
    elif cmd == "apply":
        apply()
    elif cmd == "verify":
        verify()
    else:
        print(f"unknown command: {cmd}")
        sys.exit(1)
