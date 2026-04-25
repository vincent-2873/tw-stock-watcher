"""
NEXT_TASK_008c 一次性初始化腳本

跑一次,產出:
  1. 5 × 25 = 125 筆持倉(quack_predictions)
  2. 1 場戰情室會議(meetings)
  3. 5 篇大盤觀點(analyst_market_views)
  4. 5 × 3-5 每日推薦(analyst_daily_picks)

為什麼本機跑而不走 backend admin endpoint:
  simulate_holdings_meeting 涉及 5+1 個 Claude calls(每個 5-15 秒),
  總時間約 60-180 秒會超過 Zeabur edge 90 秒 timeout。
  本機跑可避免 timeout 並有完整 log。

執行:
  cd projects/tw-stock-watcher
  python scripts/init_analyst_data.py

需要的 env(從 backend/.env 自動載入):
  ANTHROPIC_API_KEY
  SUPABASE_URL
  SUPABASE_SERVICE_KEY
"""
from __future__ import annotations

import sys
from pathlib import Path

# 把 repo root 加入 sys.path,讓 `from backend.X` 可以 import
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# 載入 .env
from backend import load_env  # noqa: E402, F401

from datetime import date as date_type  # noqa: E402

from backend.services import analyst_brain  # noqa: E402
from backend.utils.time_utils import now_tpe  # noqa: E402


def main():
    today = now_tpe().date()
    print(f"=== NEXT_TASK_008c init for {today.isoformat()} ===\n")

    # 1. 模擬會議產出 125 持倉 + 1 會議
    print("[Step 1/3] simulate_holdings_meeting (5 × 25 = 125 holdings + 1 meeting)")
    print("  expected duration: 60-180 seconds...")
    try:
        meet_result = analyst_brain.simulate_holdings_meeting(today)
        print(f"  meeting_id: {meet_result['meeting_id']}")
        print(f"  predictions_created: {meet_result['predictions_created']}")
        print(f"  per_analyst: {meet_result['per_analyst']}")
        print(f"  meeting_md_chars: {meet_result['meeting_md_chars']}")
    except Exception as e:
        print(f"  FAILED: {type(e).__name__}: {e}")
        return 1

    # 2. 刷新 5 位大盤觀點
    print("\n[Step 2/3] refresh_all_market_views (5 analysts)")
    try:
        mv_result = analyst_brain.refresh_all_market_views(today)
        for agent_id, r in mv_result.items():
            if r.get("ok"):
                print(f"  {agent_id}: ok ({r.get('bias')}, conf {r.get('confidence')})")
            else:
                print(f"  {agent_id}: FAIL — {r.get('error')}")
    except Exception as e:
        print(f"  FAILED: {type(e).__name__}: {e}")

    # 3. 刷新 5 位每日推薦
    print("\n[Step 3/3] refresh_all_daily_picks (5 analysts)")
    try:
        dp_result = analyst_brain.refresh_all_daily_picks(today)
        for agent_id, r in dp_result.items():
            if r.get("ok"):
                print(f"  {agent_id}: {r.get('count')} picks")
            else:
                print(f"  {agent_id}: FAIL — {r.get('error') or r.get('reason')}")
    except Exception as e:
        print(f"  FAILED: {type(e).__name__}: {e}")

    print("\n=== Done. Verify on:")
    print("  https://vsis-api.zeabur.app/api/analysts")
    print("  https://vsis-api.zeabur.app/api/analysts/chenxu")
    print("  https://tw-stock-watcher.zeabur.app/analysts")
    print("  https://quack-office.zeabur.app/predictions")
    print("  https://quack-office.zeabur.app/meetings")
    return 0


if __name__ == "__main__":
    sys.exit(main())
