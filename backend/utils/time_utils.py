"""
時間工具模組 - 分秒不差的核心實作

負責:
1. wait_until() - 精準等待到指定時間(毫秒級)
2. log_drift() - 記錄排程偏差
3. is_trading_hours() - 判斷盤中時段
4. 台灣時區處理

所有排程工作都必須使用這個模組的 wait_until()。
"""

import asyncio
import logging
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from typing import Optional

logger = logging.getLogger(__name__)

# 台北時區(所有排程都以此為準)
TPE = ZoneInfo("Asia/Taipei")

# 台股交易時段
MARKET_OPEN = time(9, 0, 0)
MARKET_CLOSE = time(13, 30, 0)
PRE_MARKET_START = time(8, 30, 0)


def now_tpe() -> datetime:
    """取得台北時區的當前時間"""
    return datetime.now(TPE)


def parse_time_str(time_str: str) -> tuple[int, int, int]:
    """解析 HH:MM:SS 格式"""
    parts = time_str.split(':')
    if len(parts) == 2:
        hour, minute = int(parts[0]), int(parts[1])
        second = 0
    elif len(parts) == 3:
        hour, minute, second = map(int, parts)
    else:
        raise ValueError(f"無效的時間格式: {time_str}(應為 HH:MM 或 HH:MM:SS)")
    return hour, minute, second


async def wait_until(
    target_time_str: str,
    max_past_tolerance_seconds: int = 300,
    precision_ms: int = 10,
) -> float:
    """
    精準等待到指定時間。
    
    關鍵:
    - 遠距離用 asyncio.sleep(省 CPU)
    - 最後 1 秒用 busy-wait(確保毫秒級精準)
    
    Args:
        target_time_str: 目標時間,格式 "HH:MM:SS" 或 "HH:MM"
        max_past_tolerance_seconds: 若目標已過這麼多秒,仍然執行(只記錄警告)
        precision_ms: busy-wait 的檢查間隔(毫秒)
    
    Returns:
        實際 drift(秒)。正數=延遲,負數=提早
    
    Examples:
        >>> await wait_until("08:30:00")  # 等到 08:30:00.000
        >>> await wait_until("09:05")     # 等到 09:05:00.000
    """
    hour, minute, second = parse_time_str(target_time_str)
    
    start = now_tpe()
    target = start.replace(hour=hour, minute=minute, second=second, microsecond=0)
    
    # Case 1: 目標時間已大幅過去(> 容忍度)→ 警告但仍執行
    if start > target + timedelta(seconds=max_past_tolerance_seconds):
        late_seconds = (start - target).total_seconds()
        logger.error(
            f"🚨 目標時間 {target_time_str} 已過 {late_seconds:.1f} 秒,"
            f"超出容忍範圍 {max_past_tolerance_seconds}s。立即執行但此次視為異常。"
        )
        return late_seconds
    
    # Case 2: 目標時間已稍過(在容忍度內)→ 立即執行
    if start > target:
        late_seconds = (start - target).total_seconds()
        logger.warning(
            f"⚠️ 已超過目標 {target_time_str} 約 {late_seconds:.1f} 秒,立即執行"
        )
        return late_seconds
    
    # Case 3: 還沒到 → 精準等待
    wait_total = (target - start).total_seconds()
    logger.info(
        f"⏱ 等待 {wait_total:.2f} 秒到 {target_time_str} "
        f"(當前 {start.strftime('%H:%M:%S.%f')[:-3]})"
    )
    
    # 分兩段:粗等 + 精等
    if wait_total > 1.5:
        # 粗等:睡到剩 1 秒
        await asyncio.sleep(wait_total - 1.0)
    
    # 精等:busy-wait 確保毫秒級精準
    precision_seconds = precision_ms / 1000.0
    while now_tpe() < target:
        await asyncio.sleep(precision_seconds)
    
    actual = now_tpe()
    drift_ms = (actual - target).total_seconds() * 1000
    
    logger.info(
        f"✅ 精準觸發於 {actual.strftime('%H:%M:%S.%f')[:-3]} "
        f"(drift {drift_ms:+.0f}ms)"
    )
    
    return drift_ms / 1000.0


def is_trading_hours(check_time: Optional[datetime] = None) -> bool:
    """
    判斷是否為台股交易時段(09:00-13:30,週一到週五)
    """
    t = check_time or now_tpe()
    
    # 週六週日不是
    if t.weekday() >= 5:
        return False
    
    # 時段
    return MARKET_OPEN <= t.time() <= MARKET_CLOSE


def is_weekday(check_time: Optional[datetime] = None) -> bool:
    """是否為工作日"""
    t = check_time or now_tpe()
    return t.weekday() < 5


def minutes_until(target_time_str: str) -> float:
    """
    計算還有幾分鐘到目標時間。
    若目標已過,回傳負數。
    """
    hour, minute, second = parse_time_str(target_time_str)
    now = now_tpe()
    target = now.replace(hour=hour, minute=minute, second=second, microsecond=0)
    return (target - now).total_seconds() / 60.0


async def log_execution_drift(
    supabase_client,
    workflow_name: str,
    scheduled_time: datetime,
    actual_time: datetime,
    metadata: dict = None,
):
    """
    記錄排程偏差到 system_health 表
    """
    drift_seconds = (actual_time - scheduled_time).total_seconds()
    drift_ms = drift_seconds * 1000
    
    # 狀態判定
    if abs(drift_seconds) < 1:
        status = "healthy"
    elif abs(drift_seconds) < 5:
        status = "degraded"
    else:
        status = "down"
    
    record = {
        "checked_at": actual_time.isoformat(),
        "service_name": f"scheduler_{workflow_name}",
        "status": status,
        "response_time_ms": int(drift_ms),
        "error_message": None if status == "healthy" else f"Drift {drift_seconds:.2f}s",
        "metadata": {
            "workflow": workflow_name,
            "scheduled": scheduled_time.isoformat(),
            "actual": actual_time.isoformat(),
            "drift_seconds": drift_seconds,
            **(metadata or {}),
        },
    }
    
    try:
        await supabase_client.table("system_health").insert(record).execute()
    except Exception as e:
        logger.error(f"記錄 drift 失敗: {e}")
    
    # 嚴重 drift 警報
    if abs(drift_seconds) > 5:
        logger.error(
            f"🚨 {workflow_name} drift 過大: {drift_seconds:.2f}s"
            f"(scheduled: {scheduled_time}, actual: {actual_time})"
        )
    
    return drift_seconds


# ============================================
# 使用範例
# ============================================
if __name__ == "__main__":
    async def demo():
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s.%(msecs)03d | %(levelname)s | %(message)s",
            datefmt="%H:%M:%S",
        )
        
        # 測試:等到下一個 10 秒整點
        now = now_tpe()
        next_10sec = now.replace(
            second=(now.second // 10 + 1) * 10 % 60,
            microsecond=0
        )
        if next_10sec <= now:
            next_10sec += timedelta(minutes=1)
        
        target_str = next_10sec.strftime("%H:%M:%S")
        print(f"現在 {now.strftime('%H:%M:%S.%f')[:-3]},測試等到 {target_str}")
        
        drift = await wait_until(target_str)
        print(f"Drift: {drift*1000:+.1f}ms")
    
    asyncio.run(demo())
