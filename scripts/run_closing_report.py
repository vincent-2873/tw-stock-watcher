#!/usr/bin/env python
"""盤後解析 — 14:30 TPE"""
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
from backend.workflows.closing_report import run  # noqa: E402


async def main() -> int:
    target_time = os.getenv("CLOSING_TIME", "14:30:00")
    dry_run = "--dry-run" in sys.argv or os.getenv("DRY_RUN") == "1"
    force = "--force" in sys.argv or os.getenv("FORCE") == "1"
    use_ai = "--ai" in sys.argv or os.getenv("CLOSING_USE_AI") == "1"
    skip_wait = "--now" in sys.argv or os.getenv("SKIP_WAIT") == "1"

    if not skip_wait:
        drift = await wait_until(target_time)
        print(f"⏱ drift={drift*1000:+.0f}ms", file=sys.stderr)

    result = run(dry_run=dry_run, force=force, use_ai=use_ai)
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
