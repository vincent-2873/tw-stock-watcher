"""快速腳本:單一分析師 backfill(用獨立 process 避免 HTTP/2 連線干擾)。

usage:
    python scripts/run_one_analyst.py analyst_d 25
"""
from __future__ import annotations

import sys
from datetime import date as date_type
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from backend import load_env  # noqa: E402, F401

from backend.services import historical_backtest as hb  # noqa: E402

START_DATE = date_type(2026, 1, 26)
END_DATE = date_type(2026, 4, 25)


def main():
    agent_id = sys.argv[1]
    max_calls = int(sys.argv[2]) if len(sys.argv) > 2 else 25
    picks = 7

    days = hb.get_trading_days(START_DATE, END_DATE)
    print(f"=== {agent_id} ({len(days)} trading days, max_calls={max_calls}) ===", flush=True)

    from scripts.run_historical_backtest import _run_agent_backfill
    r = _run_agent_backfill(agent_id, days, END_DATE, picks, max_calls)
    print(f"DONE {agent_id}: {r}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
