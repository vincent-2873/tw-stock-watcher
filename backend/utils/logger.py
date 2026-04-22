"""
統一日誌模組

設計原則:
1. 使用 loguru(語法簡潔、顏色好看、可輪轉)
2. 本機開發:寫到 logs/app.log + stdout
3. 生產環境:寫到 stdout 讓 GitHub Actions / Zeabur 收集
4. 所有時間都用台北時區
5. JSON 格式方便後續丟進 Supabase / Sentry

使用範例:
    from backend.utils.logger import get_logger
    log = get_logger(__name__)
    log.info("系統啟動")
    log.error("API 失敗", extra={"stock_id": "2330"})
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Optional

from loguru import logger as _loguru


# ============================================
# 預設設定
# ============================================
_LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
_LOG_DIR = Path(os.getenv("LOG_DIR", "logs"))
_LOG_FORMAT_PRETTY = (
    "<green>{time:YYYY-MM-DD HH:mm:ss.SSS zz}</green> | "
    "<level>{level: <8}</level> | "
    "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
    "<level>{message}</level>"
)
_LOG_FORMAT_JSON = (
    '{{"ts":"{time:YYYY-MM-DDTHH:mm:ss.SSS Z}","level":"{level}",'
    '"logger":"{name}","function":"{function}","line":{line},'
    '"message":"{message}"}}'
)

_configured = False


def configure_logging(
    level: Optional[str] = None,
    json_format: Optional[bool] = None,
    log_file: Optional[Path] = None,
) -> None:
    """
    設定全域日誌。第一次呼叫才會執行,後續呼叫忽略。

    Args:
        level: 最低輸出等級 DEBUG/INFO/WARNING/ERROR/CRITICAL
        json_format: True 輸出 JSON(生產環境);False 輸出彩色(開發)
        log_file: 寫到檔案的路徑(None 則不寫檔)
    """
    global _configured
    if _configured:
        return

    level = (level or _LOG_LEVEL).upper()
    if json_format is None:
        json_format = os.getenv("PYTHON_ENV", "development") == "production"

    # 清掉 loguru 預設 handler
    _loguru.remove()

    # stdout
    _loguru.add(
        sys.stdout,
        level=level,
        format=_LOG_FORMAT_JSON if json_format else _LOG_FORMAT_PRETTY,
        backtrace=True,
        diagnose=True,
        enqueue=False,
    )

    # 檔案 (rotation 每天/10MB)
    if log_file or os.getenv("LOG_TO_FILE", "").lower() in ("1", "true", "yes"):
        log_path = log_file or (_LOG_DIR / "app.log")
        log_path.parent.mkdir(parents=True, exist_ok=True)
        _loguru.add(
            str(log_path),
            level=level,
            format=_LOG_FORMAT_JSON,
            rotation="10 MB",
            retention="14 days",
            compression="zip",
            enqueue=True,
        )

    _configured = True
    _loguru.debug(f"Logger 設定完成 (level={level}, json={json_format})")


def get_logger(name: str = "vsis"):
    """
    取得某個模組的 logger。第一次呼叫會自動設定。

    Args:
        name: 模組名稱(通常傳 __name__)
    """
    if not _configured:
        configure_logging()
    return _loguru.bind(name=name)


# 預設 logger(可直接 from logger import log)
configure_logging()
log = _loguru.bind(name="vsis")
