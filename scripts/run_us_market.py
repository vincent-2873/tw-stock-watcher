#!/usr/bin/env python
"""美股追蹤 — 21:00 / 00:00 / 05:00 TPE"""
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
from backend.workflows.us_market import run  # noqa: E402


async def main() -> int:
    session = os.getenv("US_SESSION", "close")
    target_time = os.getenv("US_TIME", "")
    for arg in sys.argv:
        if arg.startswith("--session="):
            session = arg.split("=", 1)[1]
        if arg.startswith("--time="):
            target_time = arg.split("=", 1)[1]
    dry_run = "--dry-run" in sys.argv or os.getenv("DRY_RUN") == "1"
    skip_wait = "--now" in sys.argv or os.getenv("SKIP_WAIT") == "1" or not target_time

    if not skip_wait and target_time:
        drift = await wait_until(target_time)
        print(f"⏱ drift={drift*1000:+.0f}ms", file=sys.stderr)

    result = run(session=session, dry_run=dry_run)
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
