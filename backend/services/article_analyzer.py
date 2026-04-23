"""
Intel Hub — 文章 AI 分析器(Phase 2)

流程:
  1. 撈 intel_articles 還沒分析的(ai_analyzed_at IS NULL)
  2. 呼叫 Claude Sonnet 4.5(結構化 JSON)
  3. 寫回 ai_* 欄位

Prompt:嚴格照 20_INTEL_HUB_UPGRADE.md 3.2 節
預算控制:每篇 ~NT$0.5,一批 20 篇 = NT$10
"""
from __future__ import annotations

import json
import os
import time
from typing import Any, Optional

from anthropic import Anthropic

from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")
DAILY_CAP_TWD = float(os.getenv("CLAUDE_DAILY_CAP_TWD", "100"))

SYSTEM_PROMPT = """你是「呱呱」,台股情報分析師。

我給你一篇文章,請做結構化分析。

風格要求:
- 不預言股價
- 不給明牌
- 說「可能會」「可能使」,不說「一定」
- 反方觀點一定要有(強迫自己找反對意見)
- 呱呱視角要有洞察,不是重述結論
- 全部繁體中文

請用 JSON 格式輸出(**只輸出 JSON,不要其他文字**):

{
  "one_sentence_conclusion": "一句話總結(≤ 40 字)",
  "sentiment": "bullish | bearish | neutral | mixed",
  "confidence": 0-100,
  "sentiment_reasoning": {
    "main_reasons": ["理由 1(≤ 30 字)", "理由 2", "理由 3"],
    "counter_arguments": ["反方觀點 1(如果我看錯了會是哪裡錯)"]
  },
  "key_points": [
    {"type": "positive", "point": "..."},
    {"type": "negative", "point": "..."},
    {"type": "neutral", "point": "..."}
  ],
  "affected_stocks": [
    {
      "code": "1815",
      "name": "富喬",
      "impact": "positive|negative|neutral",
      "strength": "strong|moderate|weak",
      "reasoning": "為什麼受影響(≤ 20 字)"
    }
  ],
  "affected_sectors": ["CCL", "玻纖", "銅箔"],
  "importance": 1-10,
  "urgency": 1-10,
  "quack_perspective": "呱呱的獨家視角(≤ 100 字,要有人味,可帶池塘/水位/甩轎等意象)",
  "related_topics": ["CCL 漲價循環"],
  "time_horizon": "short | medium | long"
}
"""


_daily_cost_twd = 0.0
_daily_epoch = 0


def _reset_daily() -> None:
    global _daily_cost_twd, _daily_epoch
    today = int(time.time() // 86400)
    if today != _daily_epoch:
        _daily_cost_twd = 0.0
        _daily_epoch = today


def _build_user(article: dict) -> str:
    source_name = ""
    if article.get("source"):
        source_name = article["source"].get("name", "")
    title = article.get("title", "")
    content = (article.get("raw_content") or "")[:4000]
    return (
        f"文章來源:{source_name}\n"
        f"文章標題:{title}\n"
        f"文章內容:{content}\n\n"
        "請做結構化分析。"
    )


def _parse_ai_result(text: str) -> Optional[dict]:
    # 抓 JSON(在文字裡找 {...})
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except Exception as e:
        log.warning(f"JSON parse fail: {e}")
        return None


def _map_to_db(r: dict) -> dict:
    sentiment = r.get("sentiment") or "neutral"
    return {
        "ai_summary": (r.get("one_sentence_conclusion") or "").strip(),
        "ai_sentiment": sentiment,
        "ai_sentiment_score": {"bullish": 60, "bearish": -60, "neutral": 0, "mixed": 0}.get(
            sentiment, 0
        ),
        "ai_confidence": int(r.get("confidence") or 0),
        "ai_reasoning": " / ".join(
            (r.get("sentiment_reasoning") or {}).get("main_reasons", [])
        ),
        "ai_counter_arguments": (r.get("sentiment_reasoning") or {}).get(
            "counter_arguments", []
        ),
        "ai_key_points": r.get("key_points") or [],
        "ai_affected_stocks": r.get("affected_stocks") or [],
        "ai_affected_sectors": r.get("affected_sectors") or [],
        "ai_importance": int(r.get("importance") or 0),
        "ai_urgency": int(r.get("urgency") or 0),
        "ai_quack_perspective": (r.get("quack_perspective") or "").strip(),
        "ai_time_horizon": r.get("time_horizon"),
        "ai_related_topics": r.get("related_topics") or [],
        "ai_analyzed_at": now_tpe().isoformat(),
    }


class ArticleAnalyzer:
    def __init__(self) -> None:
        self.sb = get_service_client()
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    def run_batch(self, limit: int = 20) -> dict:
        _reset_daily()
        global _daily_cost_twd
        if _daily_cost_twd >= DAILY_CAP_TWD:
            return {"error": "daily budget reached", "analyzed": 0}

        # 撈 pending 文章(含 source name)
        res = (
            self.sb.table("intel_articles")
            .select("id,source_id,title,raw_content,language")
            .is_("ai_analyzed_at", "null")
            .order("published_at", desc=True)
            .limit(limit)
            .execute()
        )
        pending = res.data or []
        if not pending:
            return {"analyzed": 0, "skipped": 0, "total_pending": 0, "message": "no pending"}

        # attach source name
        source_ids = {p["source_id"] for p in pending if p.get("source_id")}
        source_map: dict[int, dict] = {}
        if source_ids:
            sres = (
                self.sb.table("intel_sources")
                .select("id,name,type,region")
                .in_("id", list(source_ids))
                .execute()
            )
            for s in sres.data or []:
                source_map[s["id"]] = s

        analyzed = 0
        failed = 0
        skipped = 0
        errors: list[str] = []

        for art in pending:
            if _daily_cost_twd >= DAILY_CAP_TWD:
                skipped += 1
                continue
            # 空內容或超短的跳過
            content = art.get("raw_content") or ""
            if len(content) < 50 and not art.get("title"):
                skipped += 1
                continue

            art_for_prompt = {**art, "source": source_map.get(art.get("source_id") or -1)}

            try:
                msg = self.client.messages.create(
                    model=MODEL,
                    max_tokens=1600,
                    system=SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": _build_user(art_for_prompt)}],
                )
                text = "".join(
                    b.text for b in msg.content if getattr(b, "type", "") == "text"
                )
                parsed = _parse_ai_result(text)
                if not parsed:
                    failed += 1
                    errors.append(f"id={art['id']} parse_fail")
                    continue

                update = _map_to_db(parsed)
                self.sb.table("intel_articles").update(update).eq("id", art["id"]).execute()
                analyzed += 1
                # 成本粗估:Sonnet 4.5 input ~$3/M + output ~$15/M token
                # 每篇 input ~1500 + output ~600 = 0.0135 USD = NT$0.43
                _daily_cost_twd += 0.45
            except Exception as e:
                failed += 1
                errors.append(f"id={art['id']}: {type(e).__name__}: {str(e)[:120]}")
                log.warning(f"analyze {art['id']} failed: {e}")

        return {
            "analyzed": analyzed,
            "failed": failed,
            "skipped": skipped,
            "total_pending": len(pending),
            "daily_cost_twd_est": round(_daily_cost_twd, 2),
            "errors": errors[:5],
            "tpe_now": now_tpe().isoformat(),
        }


def run_batch(limit: int = 20) -> dict:
    return ArticleAnalyzer().run_batch(limit)
