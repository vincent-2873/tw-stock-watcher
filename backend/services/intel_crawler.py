"""
Intel Hub — RSS / Reddit / Nitter 通用爬蟲(Phase 1 Day 4-5)

職責:
  - 讀 intel_sources 表(is_active=true)的來源
  - 依 rss_url 抓最新 N 則文章
  - 去重(以 url 為 key)
  - 寫入 intel_articles(ai_analyzed_at=NULL,等批次 AI 分析器處理)

使用:
  from backend.services.intel_crawler import IntelCrawler
  IntelCrawler().run_all()        # 跑全部活躍來源
  IntelCrawler().run_single(id)   # 跑單一 source
"""
from __future__ import annotations

import html
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional

import feedparser  # type: ignore
import httpx
from bs4 import BeautifulSoup

from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)


@dataclass
class Article:
    source_id: int
    title: str
    url: str
    author: Optional[str]
    published_at: Optional[datetime]
    raw_content: str
    language: Optional[str]


def _strip_html(s: str) -> str:
    if not s:
        return ""
    try:
        soup = BeautifulSoup(s, "html.parser")
        text = soup.get_text(separator=" ").strip()
    except Exception:
        text = re.sub(r"<[^>]+>", " ", s)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _parse_dt(struct_time) -> Optional[datetime]:
    if not struct_time:
        return None
    try:
        return datetime(*struct_time[:6], tzinfo=timezone.utc)
    except Exception:
        return None


class IntelCrawler:
    # RSS 最多取多少則
    MAX_ITEMS_PER_SOURCE = 30
    # HTTP timeout
    TIMEOUT = 10.0

    def __init__(self) -> None:
        self.sb = get_service_client()

    # ==========================================
    # 公開入口
    # ==========================================
    def run_all(self) -> dict:
        sources = self._load_sources()
        total_new = 0
        total_scanned = 0
        errors: list[str] = []
        per_source: list[dict] = []
        for s in sources:
            try:
                scanned, new = self._crawl_source(s)
                total_scanned += scanned
                total_new += new
                per_source.append({"name": s["name"], "scanned": scanned, "new": new})
            except Exception as e:
                msg = f"{s.get('name')}: {type(e).__name__}: {e}"
                log.warning(f"crawl fail {msg}")
                errors.append(msg[:200])
                per_source.append({"name": s["name"], "error": str(e)[:120]})
        return {
            "scanned": total_scanned,
            "new": total_new,
            "errors": errors,
            "per_source": per_source,
            "tpe_now": now_tpe().isoformat(),
        }

    def run_single(self, source_id: int) -> dict:
        res = self.sb.table("intel_sources").select("*").eq("id", source_id).limit(1).execute()
        rows = res.data or []
        if not rows:
            return {"error": f"source {source_id} not found"}
        scanned, new = self._crawl_source(rows[0])
        return {"scanned": scanned, "new": new, "name": rows[0]["name"]}

    # ==========================================
    # 內部
    # ==========================================
    def _load_sources(self) -> list[dict]:
        res = (
            self.sb.table("intel_sources")
            .select("*")
            .eq("is_active", True)
            .not_.is_("rss_url", "null")
            .execute()
        )
        return res.data or []

    def _crawl_source(self, source: dict) -> tuple[int, int]:
        rss = (source.get("rss_url") or "").strip()
        if not rss:
            return 0, 0
        source_id = source["id"]
        language = source.get("language")

        # Reddit RSS 需要 user-agent
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; QuackHouseBot/1.0; +https://tw-stock-watcher.zeabur.app)"
        }
        try:
            with httpx.Client(timeout=self.TIMEOUT, follow_redirects=True) as c:
                r = c.get(rss, headers=headers)
                r.raise_for_status()
                feed = feedparser.parse(r.text)
        except Exception as e:
            log.warning(f"fetch {source['name']} failed: {e}")
            raise

        entries = (feed.entries or [])[: self.MAX_ITEMS_PER_SOURCE]
        articles: list[Article] = []
        for ent in entries:
            url = (ent.get("link") or "").strip()
            if not url:
                continue
            title = _strip_html(ent.get("title") or "")[:500]
            author = (ent.get("author") or None)
            if author:
                author = author[:200]
            published = _parse_dt(ent.get("published_parsed")) or _parse_dt(
                ent.get("updated_parsed")
            )
            summary = ent.get("summary") or ent.get("description") or ""
            content_html = ""
            if ent.get("content"):
                try:
                    content_html = ent["content"][0].get("value", "")
                except Exception:
                    content_html = ""
            raw = _strip_html(content_html or summary)[:8000]
            articles.append(
                Article(
                    source_id=source_id,
                    title=title,
                    url=url,
                    author=author,
                    published_at=published,
                    raw_content=raw,
                    language=language,
                )
            )

        scanned = len(articles)
        if scanned == 0:
            return 0, 0

        # 批次 upsert(依 url unique 去重)
        payload = [
            {
                "source_id": a.source_id,
                "title": a.title,
                "url": a.url,
                "author": a.author,
                "published_at": a.published_at.isoformat() if a.published_at else None,
                "raw_content": a.raw_content,
                "language": a.language,
            }
            for a in articles
        ]
        try:
            res = (
                self.sb.table("intel_articles")
                .upsert(payload, on_conflict="url", ignore_duplicates=False)
                .execute()
            )
            new_count = len(res.data or [])
        except Exception as e:
            log.warning(f"upsert {source['name']} failed: {e}")
            # fallback:逐筆嘗試
            new_count = 0
            for p in payload:
                try:
                    self.sb.table("intel_articles").upsert(p, on_conflict="url").execute()
                    new_count += 1
                except Exception:
                    pass
        log.info(f"crawl {source['name']}: scanned={scanned} upserted={new_count}")
        return scanned, new_count


def crawl_all() -> dict:
    return IntelCrawler().run_all()


def crawl_source(source_id: int) -> dict:
    return IntelCrawler().run_single(source_id)
