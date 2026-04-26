"""
STAGE1-T3a-cleanup 收尾 4 manual trigger

不啟用 cron 排程的情況下,手動跑一次結算邏輯(預設 dry_run=True、不寫 DB)。

用法:
  python scripts/t3a_settlement_manual_trigger.py preview
    → dry_run=True、quack_predictions + quack_judgments 都跑一次

  python scripts/t3a_settlement_manual_trigger.py preview-predictions
    → 只跑 quack_predictions

  python scripts/t3a_settlement_manual_trigger.py preview-weekly-picks
    → 只跑 quack_judgments(weekly_picks)

  python scripts/t3a_settlement_manual_trigger.py apply
    → 真寫 DB(會 auto-flip ENABLED=True 來 bypass disabled 檢查 — 僅手動測試用)

⚠️ apply 模式僅供 T3d 啟動前的人工驗證。
   生產環境啟動 cron 必須先把 settlement_cron.ENABLED 改成 True 並 commit。
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# load .env
env = ROOT / ".env"
if env.exists():
    for line in env.read_text(encoding="utf-8").splitlines():
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k, v)

from backend.jobs import settlement_cron  # noqa: E402


def _print(name: str, result: dict) -> None:
    print(f"\n=== {name} ===")
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))


def cmd_preview() -> None:
    print("MODE: dry-run (no DB writes)")
    pred_result = settlement_cron.settle_pending_predictions(dry_run=True, limit=200)
    _print("settle_pending_predictions", pred_result)
    wp_result = settlement_cron.settle_pending_weekly_picks(dry_run=True, limit=20)
    _print("settle_pending_weekly_picks", wp_result)


def cmd_preview_predictions() -> None:
    print("MODE: dry-run (predictions only)")
    pred_result = settlement_cron.settle_pending_predictions(dry_run=True, limit=200)
    _print("settle_pending_predictions", pred_result)


def cmd_preview_weekly() -> None:
    print("MODE: dry-run (weekly_picks only)")
    wp_result = settlement_cron.settle_pending_weekly_picks(dry_run=True, limit=20)
    _print("settle_pending_weekly_picks", wp_result)


def cmd_apply() -> None:
    print("MODE: APPLY (will WRITE to DB)")
    confirmation = os.environ.get("T3A_CONFIRM_APPLY")
    if confirmation != "1":
        raise SystemExit(
            "Refusing to apply without T3A_CONFIRM_APPLY=1 in env.\n"
            "set T3A_CONFIRM_APPLY=1 then re-run."
        )
    # Manual override only — does NOT change committed code
    settlement_cron.ENABLED = True
    pred_result = settlement_cron.settle_pending_predictions(dry_run=False, limit=200)
    _print("settle_pending_predictions (APPLIED)", pred_result)
    wp_result = settlement_cron.settle_pending_weekly_picks(dry_run=False, limit=20)
    _print("settle_pending_weekly_picks (APPLIED)", wp_result)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cmd = sys.argv[1]
    if cmd == "preview":
        cmd_preview()
    elif cmd == "preview-predictions":
        cmd_preview_predictions()
    elif cmd == "preview-weekly-picks":
        cmd_preview_weekly()
    elif cmd == "apply":
        cmd_apply()
    else:
        print(f"unknown command: {cmd}")
        sys.exit(1)
