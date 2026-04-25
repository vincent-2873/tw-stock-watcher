"""快速腳本:單一分析師 008d-2 v2 backfill(獨立 process,避免 HTTP/2 干擾)。

usage:
    python scripts/run_008d2_one.py analyst_a 30
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from backend import load_env  # noqa: E402, F401

from backend.services import historical_backtest as hb  # noqa: E402
from scripts.run_008d2 import START_DATE, END_DATE, BACKFILL_MARKER, ARCH_VERSION  # noqa: E402


def main():
    agent_id = sys.argv[1]
    max_calls = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    picks = 7

    days = hb.get_trading_days(START_DATE, END_DATE)
    print(f"=== {agent_id} 008d-2 v2 ({len(days)} trading days, max_calls={max_calls}) ===", flush=True)

    from scripts.run_historical_backtest import _run_agent_backfill
    r = _run_agent_backfill(agent_id, days, END_DATE, picks, max_calls,
                            backfill_marker=BACKFILL_MARKER,
                            architecture_version=ARCH_VERSION)
    print(f"DONE {agent_id}: {r}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
