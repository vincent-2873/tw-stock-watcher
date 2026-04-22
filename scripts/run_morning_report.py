#!/usr/bin/env python
"""
早報執行腳本 — GitHub Actions 呼叫點

GitHub Actions 提早 5-10 分鐘觸發 (07:50-07:55 TPE),
本 script 用 wait_until() 等到 08:00:00.000 才真正執行。

流程:
1. load .env / GitHub Secrets 環境變數
2. await wait_until("08:00:00")  ← zero-lag
3. 呼叫 backend.workflows.morning_report.run()
4. 印結果供 GitHub Actions log
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

# 讓 script 可以 import backend
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# 載入 .env(若存在)
from backend import load_env  # noqa: F401

from backend.utils.time_utils import wait_until  # noqa: E402
from backend.workflows.morning_report import run  # noqa: E402


async def main() -> int:
    target_time = os.getenv("MORNING_REPORT_TIME", "08:00:00")
    dry_run = "--dry-run" in sys.argv or os.getenv("DRY_RUN") == "1"
    force = "--force" in sys.argv or os.getenv("FORCE") == "1"
    skip_wait = "--now" in sys.argv or os.getenv("SKIP_WAIT") == "1"

    if not skip_wait:
        drift = await wait_until(target_time)
        print(f"⏱ drift={drift*1000:+.0f}ms", file=sys.stderr)

    result = run(dry_run=dry_run, force=force)
    print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    return 0 if not result.get("errors") else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
