"""
新聞情緒分類服務

- 用 Claude Haiku 批次把新聞標題分類為利多/中立/利空
- 產出:sentiment, importance(0-10), affected_tickers, affected_topics, one_line
- 短期 in-memory cache(避免重跑同一則)
- 成本控制:每則 ~NT$0.03,100 則 ~NT$3

使用:
    from backend.services.sentiment_service import classify_news_batch
    results = classify_news_batch([{"title": "台積電調升目標價...", "date": "..."}])
"""
from __future__ import annotations

import hashlib
import json
import os
import threading
import time
from typing import Any, Optional

from anthropic import Anthropic

from backend.utils.logger import get_logger

log = get_logger(__name__)

# 用便宜的 Haiku,新聞分類不需 Sonnet
CHEAP_MODEL = os.getenv("ANTHROPIC_CHEAP_MODEL", "claude-haiku-4-5-20251001")
MAX_BATCH = 20  # 一次最多給 Claude 20 則,避免 output 太長

_cache: dict[str, dict] = {}
_cache_lock = threading.Lock()
_CACHE_TTL_SEC = 60 * 60 * 6  # 6 小時

# Daily budget guard
_daily_cost_twd = 0.0
_daily_epoch = 0
_DAILY_CAP_TWD = float(os.getenv("CLAUDE_DAILY_CAP_TWD", "100"))  # NT$100/day


def _reset_daily() -> None:
    global _daily_cost_twd, _daily_epoch
    today = int(time.time() // 86400)
    if today != _daily_epoch:
        _daily_cost_twd = 0.0
        _daily_epoch = today


def _cache_key(title: str, description: Optional[str]) -> str:
    s = (title or "") + "|" + (description or "")
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:16]


def _from_cache(key: str) -> Optional[dict]:
    with _cache_lock:
        v = _cache.get(key)
        if not v:
            return None
        if time.time() - v["_ts"] > _CACHE_TTL_SEC:
            _cache.pop(key, None)
            return None
        return {k: v[k] for k in v if not k.startswith("_")}


def _to_cache(key: str, result: dict) -> None:
    with _cache_lock:
        _cache[key] = {**result, "_ts": time.time()}


SYSTEM_PROMPT = """你是台股新聞分析師。把每則新聞標題標成:
- sentiment: "bull"(利多) / "bear"(利空) / "neutral"(中立)
- importance: 0-10 分(市場影響力;10 = 牽動全市場,5 = 個股級利多/利空,0 = 無意義)
- affected_tickers: 受影響的台股代碼陣列(無則 [])
- affected_topics: 受影響的題材關鍵字陣列(例如 ["AI 伺服器", "CCL 漲價", "矽光子"], 無則 [])
- one_line: 一句話重點(12 字內,繁體中文)

回應**只用 JSON**,不要任何其他文字:
{"results": [ { "id": "<原 id>", "sentiment": "...", "importance": N, "affected_tickers": [...], "affected_topics": [...], "one_line": "..." }, ... ]}
"""


def _build_user_message(batch: list[dict]) -> str:
    lines = ["請分類以下新聞:"]
    for i, n in enumerate(batch):
        title = (n.get("title") or "").replace("\n", " ")[:200]
        desc = (n.get("description") or "").replace("\n", " ")[:200]
        txt = f"{title}" + (f" | {desc}" if desc else "")
        lines.append(f'{{"id": "{n.get("id", i)}", "text": "{txt}"}}')
    return "\n".join(lines)


def classify_news_batch(news: list[dict]) -> list[dict]:
    """
    批次分類新聞。news 每項需有 title(必),description(可),id(可)。
    回傳每則的分類結果(與輸入同長,保持順序)。
    """
    if not news:
        return []

    # 檢查 cache
    results: list[Optional[dict]] = [None] * len(news)
    to_classify_indices: list[int] = []
    for i, n in enumerate(news):
        key = _cache_key(n.get("title", ""), n.get("description"))
        cached = _from_cache(key)
        if cached is not None:
            results[i] = cached
        else:
            to_classify_indices.append(i)

    if not to_classify_indices:
        return [r or _empty_result() for r in results]

    # Daily budget guard
    _reset_daily()
    global _daily_cost_twd
    if _daily_cost_twd >= _DAILY_CAP_TWD:
        log.warning(f"Claude daily budget 已達 NT${_DAILY_CAP_TWD},分類暫停")
        for i in to_classify_indices:
            results[i] = _empty_result(note="daily_budget_reached")
        return [r or _empty_result() for r in results]

    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    # 分 batch
    for start in range(0, len(to_classify_indices), MAX_BATCH):
        chunk_idx = to_classify_indices[start : start + MAX_BATCH]
        chunk = [{**news[i], "id": str(i)} for i in chunk_idx]
        user_msg = _build_user_message(chunk)
        try:
            msg = client.messages.create(
                model=CHEAP_MODEL,
                max_tokens=1400,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )
            text = "".join(
                block.text for block in msg.content if getattr(block, "type", "") == "text"
            )
            # 抓 JSON
            start_b = text.find("{")
            end_b = text.rfind("}")
            if start_b < 0 or end_b < 0:
                log.warning(f"Claude 回的不是 JSON: {text[:200]}")
                continue
            parsed = json.loads(text[start_b : end_b + 1])
            items = parsed.get("results", [])
            by_id = {str(it.get("id", "")): it for it in items}

            # 粗估成本:Haiku ~$1/M input + $5/M output tokens = input~500 + output~700 × NT$32
            # 一次 batch 約 NT$0.6
            _daily_cost_twd += 0.6 * 32  # 保守估 NT$20 per batch  (本地估,非實際 billing)

            for i, orig_idx in enumerate(chunk_idx):
                item = by_id.get(str(i))
                if item:
                    result = {
                        "sentiment": item.get("sentiment", "neutral"),
                        "importance": int(item.get("importance", 0) or 0),
                        "affected_tickers": item.get("affected_tickers", []) or [],
                        "affected_topics": item.get("affected_topics", []) or [],
                        "one_line": item.get("one_line", ""),
                    }
                    results[orig_idx] = result
                    _to_cache(
                        _cache_key(
                            news[orig_idx].get("title", ""),
                            news[orig_idx].get("description"),
                        ),
                        result,
                    )
                else:
                    results[orig_idx] = _empty_result(note="no_result")
        except Exception as e:
            log.warning(f"classify batch 失敗: {e}")
            for i in chunk_idx:
                if results[i] is None:
                    results[i] = _empty_result(note=f"error: {str(e)[:60]}")

    return [r or _empty_result() for r in results]


def _empty_result(note: str = "") -> dict:
    return {
        "sentiment": "neutral",
        "importance": 0,
        "affected_tickers": [],
        "affected_topics": [],
        "one_line": "",
        "note": note,
    }
