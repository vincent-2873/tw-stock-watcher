"""
精準度測試 - 驗證 wait_until() 是否真的分秒不差

使用:
    python scripts/test_precision.py --iterations 20

輸出:
    平均 drift、最大 drift、最小 drift、準時率
"""

import argparse
import asyncio
import sys
import statistics
from datetime import datetime, timedelta
from pathlib import Path

# 讓腳本能找到 backend 模組
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from utils.time_utils import wait_until, now_tpe


async def run_single_test(offset_seconds: int = 3) -> float:
    """
    執行一次測試:等待 N 秒後的整點,記錄 drift
    
    Returns:
        drift (ms)
    """
    now = now_tpe()
    target = (now + timedelta(seconds=offset_seconds)).replace(microsecond=0)
    target_str = target.strftime("%H:%M:%S")
    
    drift_seconds = await wait_until(target_str)
    return drift_seconds * 1000  # 轉為 ms


async def main(iterations: int):
    print(f"🧪 精準度測試:執行 {iterations} 次 wait_until()")
    print("=" * 60)
    
    drifts_ms = []
    
    for i in range(iterations):
        print(f"\n[{i+1}/{iterations}] ", end="", flush=True)
        drift = await run_single_test(offset_seconds=3)
        drifts_ms.append(drift)
    
    # 統計
    print("\n\n" + "=" * 60)
    print("📊 統計結果")
    print("=" * 60)
    print(f"總測試次數: {iterations}")
    print(f"平均 drift:  {statistics.mean(drifts_ms):+.2f} ms")
    print(f"中位 drift:  {statistics.median(drifts_ms):+.2f} ms")
    print(f"最大 drift:  {max(drifts_ms):+.2f} ms")
    print(f"最小 drift:  {min(drifts_ms):+.2f} ms")
    print(f"標準差:      {statistics.stdev(drifts_ms):.2f} ms")
    
    # 準時率
    on_time = sum(1 for d in drifts_ms if abs(d) < 100)   # < 100ms 視為準時
    good = sum(1 for d in drifts_ms if abs(d) < 500)       # < 500ms 視為良好
    acceptable = sum(1 for d in drifts_ms if abs(d) < 1000) # < 1s 視為可接受
    
    print()
    print(f"  < 100ms (精準): {on_time}/{iterations} ({on_time/iterations*100:.1f}%)")
    print(f"  < 500ms (良好): {good}/{iterations} ({good/iterations*100:.1f}%)")
    print(f"  < 1s   (可接受): {acceptable}/{iterations} ({acceptable/iterations*100:.1f}%)")
    
    # 判定
    print("\n" + "=" * 60)
    if on_time / iterations >= 0.95:
        print("✅ 通過:達到毫秒級精準度(符合『分秒不差』要求)")
    elif good / iterations >= 0.95:
        print("🟡 基本通過:亞秒級精準度")
    else:
        print("❌ 未達標:系統時鐘或 event loop 有問題,請檢查")


if __name__ == "__main__":
    import logging
    # 把 log 降到 WARNING,避免干擾測試輸出
    logging.basicConfig(level=logging.WARNING)
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=10)
    args = parser.parse_args()
    
    asyncio.run(main(args.iterations))
