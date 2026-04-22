"""
股票解析器 — 把中文名 / 代號都能解析為 (stock_id, stock_name)

關鍵用途:
  使用者在 chat 打「華邦電」,系統要能自動認出 = 2344,然後去抓即時資料。
  絕不能讓 AI 用它訓練資料裡的舊股價。

設計:
  1. 啟動時一次性從 FinMind TaiwanStockInfo 載入全台股清單
  2. 記憶體快取 24h(stock_id / stock_name 雙向 map)
  3. 支援部分符合(「華邦電子」「華邦」都要能找到 2344)
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Optional

from backend.services.finmind_service import FinMindService
from backend.utils.logger import get_logger

log = get_logger(__name__)

# 24 小時重載一次
_RELOAD_SECONDS = 86400


@dataclass
class StockRef:
    stock_id: str
    stock_name: str
    industry: str = ""
    market: str = "TW"  # TW / TPEX


_lock = threading.Lock()
_by_id: dict[str, StockRef] = {}
_by_name: dict[str, StockRef] = {}
_loaded_at: float = 0


def _load() -> None:
    global _loaded_at
    svc = FinMindService()
    rows, _ = svc.get_stock_info()
    if not rows:
        log.warning("TaiwanStockInfo 回空,保留上次快取")
        return
    new_by_id: dict[str, StockRef] = {}
    new_by_name: dict[str, StockRef] = {}
    for r in rows:
        sid = str(r.get("stock_id", "")).strip()
        name = str(r.get("stock_name", "")).strip()
        if not sid or not name:
            continue
        # 只收 4 位數純數字代號(過濾掉權證、ETF 之類)— ETF 也是 4 碼所以保留
        if not (len(sid) == 4 and sid.isdigit()):
            continue
        ref = StockRef(
            stock_id=sid,
            stock_name=name,
            industry=str(r.get("industry_category", "")).strip(),
            market=str(r.get("type", "")).strip() or "TW",
        )
        new_by_id[sid] = ref
        new_by_name[name] = ref
    with _lock:
        _by_id.clear()
        _by_id.update(new_by_id)
        _by_name.clear()
        _by_name.update(new_by_name)
        _loaded_at = time.time()
    log.info(f"股票清單載入完成: {len(new_by_id)} 檔")


def _ensure_loaded() -> None:
    if not _by_id or (time.time() - _loaded_at) > _RELOAD_SECONDS:
        _load()


def resolve(query: str) -> Optional[StockRef]:
    """
    解析查詢字串為 StockRef。支援:
      - 4 碼代號:"2330" / "2344"
      - 中文全名:"台積電" / "華邦電子"
      - 中文部分名:"華邦電" / "華邦" / "台積"(會模糊比對)
    """
    _ensure_loaded()
    if not query:
        return None
    q = query.strip()

    # 1. 代號直接命中
    if q.isdigit() and len(q) == 4 and q in _by_id:
        return _by_id[q]

    # 2. 名稱完全匹配
    if q in _by_name:
        return _by_name[q]

    # 3. 模糊匹配(名稱包含 query,或 query 包含名稱) — 取最短名字優先
    candidates = [
        ref for name, ref in _by_name.items() if q in name or name in q
    ]
    if candidates:
        candidates.sort(key=lambda r: len(r.stock_name))
        return candidates[0]

    return None


def extract_stocks(text: str, limit: int = 3) -> list[StockRef]:
    """
    從一段自由文字抓出提到的股票(代號或中文名)。
    回傳順序為出現順序,去重。
    """
    _ensure_loaded()
    found: list[StockRef] = []
    seen: set[str] = set()

    # 1. 掃 4 碼數字
    import re
    for m in re.finditer(r"\b(\d{4})\b", text):
        sid = m.group(1)
        if sid in _by_id and sid not in seen:
            found.append(_by_id[sid])
            seen.add(sid)
            if len(found) >= limit:
                return found

    # 2. 掃中文股票名(照名稱長度降序避免「華邦電子」被「華邦電」截斷)
    names = sorted(_by_name.keys(), key=len, reverse=True)
    for name in names:
        if len(name) < 2:
            continue
        if name in text:
            ref = _by_name[name]
            if ref.stock_id not in seen:
                found.append(ref)
                seen.add(ref.stock_id)
                if len(found) >= limit:
                    return found
    return found


def stats() -> dict:
    _ensure_loaded()
    return {
        "count": len(_by_id),
        "loaded_at": _loaded_at,
        "age_seconds": time.time() - _loaded_at if _loaded_at else None,
    }
