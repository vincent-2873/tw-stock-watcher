"""
PTT Stock 版爬蟲 — 19_V2_UPGRADE_BRIEF.md B3 社群敏感度

職責:
  - 抓 https://www.ptt.cc/bbs/Stock/index.html 首 N 頁
  - 解析篇名、推噓數、作者
  - 文字中提取股票代號(1000-9999)與題材關鍵字
  - 寫入 social_mentions(去重以 post_url)

注意:
  - PTT 需 cookie `over18=1`
  - 不要太頻繁(避免 IP 被擋)— 每次 15 分鐘跑一次,20 頁以內
  - 表不存在時,只 log,不 crash
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

import httpx
from bs4 import BeautifulSoup

from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client

log = get_logger(__name__)

PTT_BASE = "https://www.ptt.cc"
PTT_BOARD_URL = f"{PTT_BASE}/bbs/Stock/index.html"
COOKIES = {"over18": "1"}
UA = "Mozilla/5.0 (compatible; VSIS/1.0; +https://tw-stock-watcher.zeabur.app)"

STOCK_CODE_RE = re.compile(r"(?<!\d)(\d{4})(?!\d)")
BULLISH_KW = ("看多", "漲", "買", "利多", "突破", "強勢", "轉強", "底部")
BEARISH_KW = ("看空", "跌", "賣", "利空", "破底", "弱勢", "崩", "跳水", "下殺")


@dataclass
class PttPost:
    url: str
    title: str
    author: str | None
    push: int
    boo: int
    reply: int
    stock_codes: list[str]
    sentiment: str  # bullish / bearish / neutral / mixed
    sentiment_score: int  # -100 ~ 100


def _classify_sentiment(title: str, push: int, boo: int) -> tuple[str, int]:
    bull = sum(1 for kw in BULLISH_KW if kw in title)
    bear = sum(1 for kw in BEARISH_KW if kw in title)
    # 推噓也當信號
    if push - boo > 20:
        bull += 1
    elif boo - push > 10:
        bear += 1

    if bull and not bear:
        return "bullish", min(100, bull * 30 + (push - boo))
    if bear and not bull:
        return "bearish", max(-100, -(bear * 30) - (boo - push))
    if bull and bear:
        return "mixed", (bull - bear) * 20
    return "neutral", 0


def _parse_index_page(html: str) -> list[PttPost]:
    soup = BeautifulSoup(html, "html.parser")
    out: list[PttPost] = []
    for entry in soup.select("div.r-ent"):
        title_el = entry.select_one("div.title a")
        if not title_el:
            continue
        href = title_el.get("href", "")
        title = title_el.text.strip()
        url = PTT_BASE + href if href.startswith("/") else href
        author_el = entry.select_one("div.meta div.author")
        author = author_el.text.strip() if author_el else None

        push_el = entry.select_one("div.nrec span")
        raw = push_el.text.strip() if push_el else ""
        push = boo = 0
        if raw == "爆":
            push = 100
        elif raw.startswith("X"):
            # X1 = -10, XX = -100
            boo = 100 if raw == "XX" else int(raw[1:] or 0) * 10
        elif raw.isdigit():
            push = int(raw)

        codes = list(set(STOCK_CODE_RE.findall(title)))
        sentiment, score = _classify_sentiment(title, push, boo)

        out.append(
            PttPost(
                url=url,
                title=title,
                author=author,
                push=push,
                boo=boo,
                reply=push + boo,
                stock_codes=codes,
                sentiment=sentiment,
                sentiment_score=score,
            )
        )
    return out


def fetch_index(pages: int = 3) -> list[PttPost]:
    """抓 PTT Stock 版首 N 頁(第 1 頁 = 最新)"""
    posts: list[PttPost] = []
    with httpx.Client(
        cookies=COOKIES, headers={"User-Agent": UA}, timeout=10.0, follow_redirects=True
    ) as client:
        # 先抓最新頁
        resp = client.get(PTT_BOARD_URL)
        if resp.status_code != 200:
            log.warning("PTT index fetch %d", resp.status_code)
            return posts
        posts.extend(_parse_index_page(resp.text))

        # 前 N-1 頁:從 prev link 追
        html = resp.text
        for _ in range(1, pages):
            soup = BeautifulSoup(html, "html.parser")
            btn = soup.select_one("div.btn-group-paging a.btn.wide:nth-child(2)")
            if not btn:
                break
            href = btn.get("href") or ""
            if not href:
                break
            resp2 = client.get(PTT_BASE + href)
            if resp2.status_code != 200:
                break
            html = resp2.text
            posts.extend(_parse_index_page(html))
    log.info("PTT fetched %d posts across %d pages", len(posts), pages)
    return posts


def write_to_db(posts: Iterable[PttPost]) -> dict:
    """寫入 social_mentions,表不存在時 graceful degrade。"""
    sb = get_service_client()
    rows: list[dict] = []
    for p in posts:
        base = {
            "source": "ptt",
            "post_url": p.url,
            "post_title": p.title,
            "push_count": p.push,
            "boo_count": p.boo,
            "reply_count": p.reply,
            "sentiment": p.sentiment,
            "sentiment_score": p.sentiment_score,
            "hot_keywords": {"codes": p.stock_codes, "title_keywords": []},
        }
        if not p.stock_codes:
            rows.append(base)
            continue
        for code in p.stock_codes:
            rows.append({**base, "stock_code": code})

    if not rows:
        return {"inserted": 0, "posts": 0}

    inserted = 0
    try:
        # 去重靠 DB unique constraint 不存在 → 用 upsert 要加 UNIQUE INDEX
        # 這邊簡單批次 insert,未來可以加 (post_url, stock_code) UNIQUE
        for chunk_start in range(0, len(rows), 500):
            chunk = rows[chunk_start : chunk_start + 500]
            sb.table("social_mentions").insert(chunk).execute()
            inserted += len(chunk)
    except Exception as e:
        msg = str(e)
        if "does not exist" in msg:
            log.warning("social_mentions table missing — migration 0003 未執行")
            return {"inserted": 0, "posts": len(list(posts)), "skipped_reason": "table_missing"}
        log.exception("social_mentions insert failed: %s", e)
        return {"inserted": inserted, "error": str(e)}
    return {"inserted": inserted, "posts": len(rows)}


def run(pages: int = 3) -> dict:
    """排程入口 — 抓 + 寫 + 回報統計"""
    posts = fetch_index(pages=pages)
    if not posts:
        return {"fetched": 0, "inserted": 0}
    result = write_to_db(posts)
    return {
        "fetched": len(posts),
        "with_stocks": sum(1 for p in posts if p.stock_codes),
        "ts": datetime.now(timezone.utc).isoformat(),
        **result,
    }


if __name__ == "__main__":
    from pprint import pprint

    pprint(run(pages=3))
