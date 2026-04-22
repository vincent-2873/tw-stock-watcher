#!/usr/bin/env python
"""
盤中監控執行點 — 09:00 啟動 loop 到 13:30

這個 script 用 loop 模式(spec 10 推薦):
- GitHub Actions 一次觸發,內部 loop 直到收盤
- 可省排程 overhead,drift 在 ms 級
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend import load_env  # noqa: F401
from backend.utils.time_utils import wait_until  # noqa: E402
from backend.workflows.intraday_monitor import run_loop, run_once  # noqa: E402


async def main() -> int:
    target_time = os.getenv("INTRADAY_START_TIME", "09:00:00")
    dry_run = "--dry-run" in sys.argv or os.getenv("DRY_RUN") == "1"
    loop_mode = "--loop" in sys.argv or os.getenv("LOOP_MODE") == "1"
    skip_wait = "--now" in sys.argv or os.getenv("SKIP_WAIT") == "1"
    interval = int(os.getenv("INTRADAY_INTERVAL", "300"))

    if not skip_wait:
        drift = await wait_until(target_time)
        print(f"⏱ drift={drift*1000:+.0f}ms", file=sys.stderr)

    if loop_mode:
        result = await run_loop(interval_seconds=interval, dry_run=dry_run)
    else:
        result = run_once(dry_run=dry_run)
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
