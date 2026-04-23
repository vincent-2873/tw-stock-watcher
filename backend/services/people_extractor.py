"""
People Extractor — 從 intel_articles 萃取重點人物發言

設計:
  1. 取得 watched_people 名單(40 位)+ 每位的 aliases(中英別名)
  2. 掃近 7 日 intel_articles(尚未萃取過的)
  3. 若 title / ai_summary 命中任一 alias → 建 people_statements 紀錄
  4. upsert by (person_id, source_url) 避免重複

Phase 2.1 的核心 — 讓首頁「今日關鍵發言」自動有貨。

不爬新內容(RSS cron 已經在拉);只做名單匹配 + 轉 statement。
"""

from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)


# 40 位重點人物的中英別名表
# key = name (exact match with watched_people.name)
# value = list of aliases to match in article title / summary
PEOPLE_ALIASES: dict[str, list[str]] = {
    # ===== Tech CEO (美) =====
    "黃仁勳": ["黃仁勳", "Jensen Huang", "Jensen", "NVIDIA CEO"],
    "馬斯克": ["馬斯克", "Elon Musk", "Musk"],
    "庫克": ["庫克", "Tim Cook", "Apple CEO"],
    "蘇姿丰": ["蘇姿丰", "Lisa Su", "AMD CEO"],
    "祖克伯": ["祖克伯", "Mark Zuckerberg", "Zuckerberg", "Meta CEO"],
    "Sam Altman": ["Sam Altman", "Altman", "OpenAI CEO"],
    "Satya Nadella": ["Satya Nadella", "Nadella", "Microsoft CEO"],
    "Sundar Pichai": ["Sundar Pichai", "Pichai", "Google CEO", "Alphabet CEO"],
    "Andy Jassy": ["Andy Jassy", "Jassy", "Amazon CEO"],
    "Pat Gelsinger": ["Gelsinger", "Pat Gelsinger"],
    "Vaibhav Taneja": ["Vaibhav Taneja", "Tesla CFO"],
    # ===== 台灣 CEO =====
    "魏哲家": ["魏哲家", "C.C. Wei", "台積電董事長", "TSMC CEO"],
    "劉揚偉": ["劉揚偉", "Young Liu", "鴻海董事長", "Hon Hai CEO", "Foxconn CEO"],
    "蔡明介": ["蔡明介", "MediaTek CEO", "聯發科董事長"],
    "張忠謀": ["張忠謀", "Morris Chang", "台積電創辦人"],
    "盧希鵬": ["盧希鵬", "華碩董事長", "ASUS chairman"],
    "郭台銘": ["郭台銘", "Terry Gou"],
    "張復鐘": ["張復鐘", "富邦金"],
    # ===== 央行 / 政界 =====
    "Jerome Powell": ["Jerome Powell", "Powell", "Fed chair", "Fed Chair", "聯準會主席"],
    "Janet Yellen": ["Janet Yellen", "Yellen", "Treasury Secretary"],
    "Scott Bessent": ["Scott Bessent", "Bessent"],
    "川普": ["川普", "Trump", "Donald Trump", "特朗普", "President Trump"],
    "楊正誠": ["楊正誠", "央行總裁"],
    # ===== 分析師 =====
    "郭明錤": ["郭明錤", "Ming-Chi Kuo", "TF Securities"],
    "謝金河": ["謝金河", "財信傳媒"],
    "呂宗耀": ["呂宗耀", "呂張投資"],
    "Dan Ives": ["Dan Ives", "Wedbush"],
    "大摩科技組": ["Morgan Stanley", "大摩"],
    "高盛亞洲": ["Goldman Sachs", "高盛"],
    "Gene Munster": ["Gene Munster", "Deepwater"],
    # ===== 投資人 =====
    "巴菲特": ["巴菲特", "Warren Buffett", "Buffett", "Berkshire"],
    "Cathie Wood": ["Cathie Wood", "ARK Invest"],
    "Ray Dalio": ["Ray Dalio", "Dalio", "Bridgewater"],
    "霍華馬克斯": ["霍華馬克斯", "Howard Marks", "Oaktree"],
    "Michael Burry": ["Michael Burry", "Burry", "Scion"],
    "Bill Ackman": ["Bill Ackman", "Ackman", "Pershing Square"],
    "Paul Tudor Jones": ["Paul Tudor Jones", "Tudor Investment"],
    "Druckenmiller": ["Druckenmiller", "Duquesne"],
    "Chamath": ["Chamath", "Social Capital"],
    "David Solomon": ["David Solomon", "Goldman Sachs CEO"],
}


def _build_alias_regex(aliases: list[str]) -> re.Pattern[str]:
    """編譯多別名為單一 regex (case-insensitive for ASCII)"""
    escaped = [re.escape(a) for a in aliases]
    # 用 | 合併,加 word boundary 對英文有效;中文靠 . 匹配即可
    pattern = "|".join(escaped)
    return re.compile(pattern, re.IGNORECASE)


def extract_statements(days: int = 14, limit: int = 100) -> dict[str, Any]:
    """
    主要入口:掃近 N 日 intel_articles 匹配 40 位人物,寫入 people_statements。

    Returns:
        {
          "scanned": 掃的文章數,
          "matched": 匹配的 (article x person) 組數,
          "inserted": 實際新增的 statements(upsert 去重後),
          "by_person": {person_name: count, ...}
        }
    """
    svc = get_service_client()
    if not svc:
        return {"error": "supabase client unavailable"}

    # 1. 拉 watched_people → name → id 映射
    people_res = (
        svc.table("watched_people")
        .select("id,name,name_zh,priority,is_active")
        .eq("is_active", True)
        .execute()
    )
    people_rows = people_res.data or []
    if not people_rows:
        return {"error": "watched_people is empty"}

    name_to_id: dict[str, int] = {}
    for p in people_rows:
        # 主要用 name 欄 (PEOPLE_ALIASES key) 對照
        name_to_id[p["name"]] = p["id"]

    # 2. 編譯每人的 regex
    compiled: dict[int, tuple[str, re.Pattern[str]]] = {}
    for name, aliases in PEOPLE_ALIASES.items():
        pid = name_to_id.get(name)
        if pid is None:
            log.debug(f"PEOPLE_ALIASES 的 '{name}' 在 watched_people 查不到,略過")
            continue
        compiled[pid] = (name, _build_alias_regex(aliases))

    # 3. 拉近 N 日 articles (有 title 或 ai_summary)
    since = (now_tpe() - timedelta(days=days)).isoformat()
    articles_res = (
        svc.table("intel_articles")
        .select(
            "id,title,ai_summary,ai_sentiment,ai_quack_perspective,"
            "ai_affected_stocks,ai_importance,ai_urgency,"
            "url,source_id,published_at"
        )
        .gte("published_at", since)
        .not_.is_("ai_summary", "null")
        .order("published_at", desc=True)
        .limit(limit)
        .execute()
    )
    articles = articles_res.data or []

    scanned = len(articles)
    matched = 0
    by_person: dict[str, int] = {}
    to_insert: list[dict[str, Any]] = []

    for art in articles:
        haystack_parts = [
            art.get("title") or "",
            art.get("ai_summary") or "",
        ]
        haystack = "\n".join(haystack_parts)
        if not haystack.strip():
            continue

        for pid, (pname, pattern) in compiled.items():
            if not pattern.search(haystack):
                continue
            matched += 1
            by_person[pname] = by_person.get(pname, 0) + 1
            to_insert.append(
                {
                    "person_id": pid,
                    "source": _infer_source(art.get("url", "")),
                    "source_url": art.get("url"),
                    "statement_text": art.get("title", ""),
                    "statement_translated": None,
                    "ai_summary": art.get("ai_summary"),
                    "ai_topic": None,
                    "ai_sentiment": art.get("ai_sentiment"),
                    # intel_articles 沒 market_impact, 用呱呱觀點代替
                    "ai_market_impact": art.get("ai_quack_perspective"),
                    "ai_affected_stocks": art.get("ai_affected_stocks"),
                    # ai_urgency: people_statements 用這欄顯示緊急度 (0-10)
                    "ai_urgency": art.get("ai_urgency") or art.get("ai_importance"),
                    "said_at": art.get("published_at"),
                }
            )

    # 4. 去重寫入:先查 (person_id, source_url) 已存在者,只插新的
    #    (people_statements 表無 unique 約束,用應用層去重)
    inserted = 0
    skipped = 0
    if to_insert:
        clean = [s for s in to_insert if s.get("source_url")]
        # 拉所有已存在的 (person_id, source_url) 組合一次 (限制 since 以上)
        existing_res = (
            svc.table("people_statements")
            .select("person_id,source_url")
            .gte("said_at", since)
            .limit(5000)
            .execute()
        )
        existing: set[tuple[int, str]] = {
            (r["person_id"], r["source_url"])
            for r in (existing_res.data or [])
            if r.get("source_url")
        }
        fresh = [
            s for s in clean
            if (s["person_id"], s["source_url"]) not in existing
        ]
        skipped = len(clean) - len(fresh)

        if fresh:
            # 批次插入 (100 筆一批)
            for i in range(0, len(fresh), 100):
                batch = fresh[i : i + 100]
                try:
                    svc.table("people_statements").insert(batch).execute()
                    inserted += len(batch)
                except Exception as e:
                    log.warning(f"批次 insert 失敗 ({e}),改逐筆")
                    for s in batch:
                        try:
                            svc.table("people_statements").insert(s).execute()
                            inserted += 1
                        except Exception:
                            pass

    return {
        "skipped_duplicates": skipped,
        "scanned": scanned,
        "matched": matched,
        "inserted": inserted,
        "by_person": dict(sorted(by_person.items(), key=lambda x: -x[1])),
        "tpe_now": now_tpe().isoformat(),
    }


def _infer_source(url: str) -> str:
    """從 URL 推斷來源名"""
    if not url:
        return "unknown"
    low = url.lower()
    if "reuters" in low:
        return "Reuters"
    if "bloomberg" in low:
        return "Bloomberg"
    if "cnbc" in low:
        return "CNBC"
    if "ft.com" in low:
        return "FT"
    if "wsj.com" in low:
        return "WSJ"
    if "cnyes" in low:
        return "鉅亨網"
    if "seekingalpha" in low:
        return "Seeking Alpha"
    if "marketwatch" in low:
        return "MarketWatch"
    if "yahoo" in low:
        return "Yahoo Finance"
    if "digitimes" in low:
        return "DIGITIMES"
    # 擷取 domain 當 fallback
    m = re.search(r"https?://([^/]+)", url)
    if m:
        return m.group(1).replace("www.", "")
    return "web"
