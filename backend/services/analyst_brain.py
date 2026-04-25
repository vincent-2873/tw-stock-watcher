"""
NEXT_TASK_008c 5 位分析師中樞 AI

擴充 quack_brain 的概念,專注於 **5 位投資分析師**(analyst_a..e):
  1. simulate_holdings_meeting(date)      — 模擬戰情室會議產出 5×25 持倉 + 會議記錄
  2. analyst_judge_market(agent_id, date) — 該分析師當日大盤觀點
  3. analyst_pick_daily(agent_id, date)   — 該分析師當日從持倉精選 3-5 檔

設計原則(同 008a):
  - 系統 prompt 強制不准用「降級 / 資料不足」話術
  - JSON 解析失敗 raise(避免假完成)
  - 每位分析師有獨立 system prompt(個性 / 流派 / 用語)

成本注意:
  simulate_holdings_meeting 一次 =~ 5 calls × 4-6k tokens output + 1 meeting summary call
  總共 ~ 30k tokens output(Sonnet 4.5)
"""
from __future__ import annotations

import json
import os
import random
import string
from datetime import date as date_type
from datetime import datetime, timedelta
from typing import Any

import anthropic

from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")

# ===========================================================================
# 5 位分析師人設摘要(給 system prompt 用)
# ===========================================================================
# ===========================================================================
# v2 架構(NEXT_TASK_008d-2):全盤分析 + 個性差異
# 5 位都看「技術 + 基本面 + 籌碼 + 量化 + 題材 + 消息」
# 差異不是「看的東西」,而是個性、權重、風險偏好、時間框架
# ===========================================================================
ANALYSTS: dict[str, dict[str, Any]] = {
    "analyst_a": {
        "display_name": "辰旭",
        "frontend_slug": "chenxu",
        "frontend_name": "辰旭",
        "trait_label": "激進派",
        "school": "激進派(全盤)",
        "weights": "技術 35% / 籌碼 25% / 題材 20% / 基本面 10% / 量化 10%",
        "timeframe_short_days": 5,
        "timeframe_long_days": 14,
        "stop_loss_pct": -9.0,
        "max_position_pct": 30.0,
        "personality": "動能優先,看到突破就敢進、有訊號就動。直接、不囉嗦、有點毒舌。但**會綜合看 6 個面向**(技術/基本面/籌碼/量化/題材/消息),只是權重偏技術跟籌碼。",
        "catchphrase": ["量先行,價在後", "突破當下就是上車", "你別跟外資打架,他買我就跟"],
        "decision_quirks": [
            "看到外資連買 + 突破 → 立刻進(動能優先)",
            "看到法說會 → 在乎短期反應 > 長期影響",
            "信號出現馬上動,不等回測",
        ],
        "success_criteria_style": "嚴格型(收盤達標才算)",
        "strictness_coefficient": 1.0,
    },
    "analyst_b": {
        "display_name": "靜遠",
        "frontend_slug": "jingyuan",
        "frontend_name": "靜遠",
        "trait_label": "保守派",
        "school": "保守派(全盤)",
        "weights": "基本面 40% / 籌碼 15% / 題材 15% / 量化 15% / 技術 15%",
        "timeframe_short_days": 21,
        "timeframe_long_days": 90,
        "stop_loss_pct": -5.0,
        "max_position_pct": 20.0,
        "personality": "估值優先,等便宜才進、貴了寧可不買。慢、穩、不追熱度。**會綜合看 6 個面向**,但權重偏基本面與長期競爭力。停損 -5% 但會等 3 次確認再下。",
        "catchphrase": ["時間是價值投資最好的朋友", "等財報出來再說", "貴了寧可空手"],
        "decision_quirks": [
            "看到外資連買 + 突破 → 先等回測月線(保守)",
            "看到法說會 → 看的是長期競爭力,不在乎當日反應",
            "下決策前要 3 次驗證",
        ],
        "success_criteria_style": "嚴格 + 分段判定(時限內最高點達標)",
        "strictness_coefficient": 0.95,
    },
    "analyst_c": {
        "display_name": "觀棋",
        "frontend_slug": "guanqi",
        "frontend_name": "觀棋",
        "trait_label": "跟隨派",
        "school": "跟隨派(全盤)",
        "weights": "籌碼 35% / 技術 20% / 題材 20% / 基本面 15% / 量化 10%",
        "timeframe_short_days": 14,
        "timeframe_long_days": 60,
        "stop_loss_pct": -7.0,
        "max_position_pct": 25.0,
        "personality": "跟大戶腳印,外資/投信動向是最重要訊號。眼尖、多疑、會偷笑。**會綜合看 6 個面向**,但籌碼權重最高。確認大戶都進場才動。",
        "catchphrase": ["外資連買 5 天我認為有點東西", "投信跟進才動", "墊高的明天分點會有答案"],
        "decision_quirks": [
            "看到外資連買 + 突破 → 確認投信也進場才動(中線)",
            "看到法說會 → 看大戶事前事後動作,不看內容",
            "決策依附「煙霧訊號」",
        ],
        "success_criteria_style": "寬鬆型(方向對 + 達標 80% = 半命中,100% = 完全命中)",
        "strictness_coefficient": 0.8,
    },
    "analyst_d": {
        "display_name": "守拙",
        "frontend_slug": "shouzhuo",
        "frontend_name": "守拙",
        "trait_label": "紀律派",
        "school": "紀律派(全盤)",
        "weights": "量化 35% / 技術 25% / 籌碼 15% / 基本面 15% / 題材 10%",
        "timeframe_short_days": 7,
        "timeframe_long_days": 21,
        "stop_loss_pct": -6.0,
        "max_position_pct": 15.0,
        "personality": "機率思維,沒回測過的不碰。冷、安靜、計算型。**會綜合看 6 個面向**,但每個都要轉成數字才信。嚴格停損 -6%。",
        "catchphrase": ["樣本多少?信賴區間多寬?", "歷史機率 X% 才動", "情緒化判斷 = 放大雜訊"],
        "decision_quirks": [
            "看到外資連買 + 突破 → 跑歷史回測算機率才動",
            "看到法說會 → 看歷史財報季標的反應規律",
            "樣本不足直接拒絕下單",
        ],
        "success_criteria_style": "嚴格 + 數學判定(實際達預測 90% + sharpe 為正)",
        "strictness_coefficient": 0.9,
    },
    "analyst_e": {
        "display_name": "明川",
        "frontend_slug": "mingchuan",
        "frontend_name": "明川",
        "trait_label": "靈活派",
        "school": "靈活派(全盤)",
        "weights": "依市況動態(多頭時技術+籌碼權重高,空頭時基本面+量化權重高,平均約 各 17-20%)",
        "timeframe_short_days": 7,
        "timeframe_long_days": 60,
        "stop_loss_pct": -7.0,
        "max_position_pct": 25.0,
        "personality": "多面向整合,每個面向都看,依市況調整權重。柔軟、善聽、會切換。**真正的 6 面向均衡派**。被質疑時會說『我再聽看看再決定』。",
        "catchphrase": ["辰旭看對了,但靜遠的擔心也有道理", "市況變我就調權重", "等籌碼+基本面 align 再加碼"],
        "decision_quirks": [
            "看到外資連買 + 突破 → 評估當下市況(多/整理/空頭)再動",
            "看到法說會 → 整合短中長期影響",
            "市況不明時主動縮倉 20%",
        ],
        "success_criteria_style": "分段判定(1/3 時限達 33% / 2/3 時限達 66% / 時限達 100%)",
        "strictness_coefficient": 0.7,
    },
}

ANALYSTS_ORDER = ["analyst_a", "analyst_b", "analyst_c", "analyst_d", "analyst_e"]


def _client():
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


def _sb():
    return get_service_client()


def _meeting_id(d: date_type, kind: str = "holdings_setup") -> str:
    """e.g. MEET-2026-0425-HOLDINGS"""
    return f"MEET-{d.strftime('%Y-%m%d')}-{kind.upper()}"


def _pred_id(agent_id: str, d: date_type, idx: int) -> str:
    """e.g. PRED-2026-0425-A-001"""
    suffix = string.ascii_uppercase[ANALYSTS_ORDER.index(agent_id)]
    return f"PRED-{d.strftime('%Y-%m%d')}-{suffix}-{idx:03d}"


# ===========================================================================
# 建持倉用的市場 snapshot(共用)
# ===========================================================================
def _build_market_snapshot(target_count: int = 60) -> dict[str, Any]:
    """組市場 snapshot:抓 stocks 表最新 + topics top + 三大法人(若有)。
    不需要太複雜,Claude 會根據自己流派挑。
    """
    sb = _sb()
    snapshot: dict[str, Any] = {"date": now_tpe().date().isoformat()}

    # stocks top by score(欄位:stock_id / stock_name / current_score / score_breakdown / industry)
    try:
        r = (
            sb.table("stocks")
            .select("stock_id,stock_name,current_score,current_tier,score_breakdown,industry")
            .eq("is_active", True)
            .order("current_score", desc=True)
            .limit(target_count)
            .execute()
        )
        rows = r.data or []
        # 改成 Claude 看得懂的標準欄位名
        snapshot["stock_universe"] = [
            {
                "symbol": s.get("stock_id"),
                "name": s.get("stock_name"),
                "score": s.get("current_score"),
                "tier": s.get("current_tier"),
                "industry": s.get("industry"),
                "score_breakdown": s.get("score_breakdown"),
            }
            for s in rows
        ]
    except Exception as e:
        log.warning(f"stocks fetch fail: {e}")
        snapshot["stock_universe"] = []

    # topics
    try:
        r = (
            sb.table("topics")
            .select("slug,name,heat_score,heat_trend,one_liner")
            .order("heat_score", desc=True)
            .limit(15)
            .execute()
        )
        snapshot["topics"] = r.data or []
    except Exception:
        snapshot["topics"] = []

    # us_tw_correlation 觸發中的事件(若有)
    try:
        r = sb.table("us_tw_correlation").select("us_event_zh,impact_tw_sectors").eq("is_active", True).limit(8).execute()
        snapshot["us_tw_rules"] = r.data or []
    except Exception:
        snapshot["us_tw_rules"] = []

    return snapshot


# ===========================================================================
# 1. 模擬戰情室會議 + 5 × 25 持倉
# ===========================================================================
SYSTEM_PROMPT_HOLDINGS = """你是「{display_name}」({school},代號 {frontend_name})。
你的流派比例:{weights}
你的個性:{personality}
你的時間框架:短期 {timeframe_short_days} 天 / 長期 {timeframe_long_days} 天
你的單一持倉上限:{max_position_pct}%,停損:{stop_loss_pct}%
你的成功標準風格:{success_criteria_style}

**任務**:從給定的台股 universe 中,挑出你**現在最看好的 25 檔**作為當週持倉。

## 鐵律
1. **必須剛好 25 檔**(違反就 raise)
2. 每檔必須包含:symbol(4 碼)、name、direction(bullish/bearish/neutral)、target_price、current_price_at_prediction、deadline_days(整數)、confidence(0-100)、reasoning(你的個性的話,30-60 字)、success_criteria(你自己定義「命中」標準)
3. 25 檔要符合你的流派 — {school} 的人不會挑跟流派矛盾的標的
4. 不准用「以上僅供參考」「投資有風險」「資料不足」這類話術
5. 不准 5 檔都選同類型 — 要分散標的(不同產業 / 不同信心度 / 看多看空可混合)
6. confidence 分布要合理(不是全 80,也不是全 60),範圍 50-90
7. reasoning 要展現你的個性、用你的口頭禪
8. JSON only,不要 markdown 代碼塊包裹

## 輸出 schema
{{
  "holdings": [
    {{
      "symbol": "2330",
      "name": "台積電",
      "direction": "bullish",
      "target_price": 2280,
      "current_price_at_prediction": 2185,
      "deadline_days": 7,
      "confidence": 80,
      "reasoning": "你個性化的理由",
      "success_criteria": "你自己定義的命中標準"
    }},
    ...(剛好 25 個)
  ],
  "self_summary": "1 句話總結你這 25 檔的整體佈局想法(用你的口頭禪)"
}}
"""


def _generate_holdings_for(agent_id: str, snapshot: dict, today: date_type) -> dict:
    """單一分析師產生 25 檔持倉。"""
    profile = ANALYSTS[agent_id]
    system = SYSTEM_PROMPT_HOLDINGS.format(**profile)

    universe = snapshot.get("stock_universe", [])[:60]
    topics = snapshot.get("topics", [])[:15]

    user = f"""今天:{today.isoformat()}

可選的台股 universe(已篩過熱門/有評分的 60 檔,你不一定全用,但盡量從這 60 檔挑):
{json.dumps(universe, ensure_ascii=False, indent=2)}

當前熱門題材(供你流派參考):
{json.dumps(topics, ensure_ascii=False, indent=2)}

請依照你的流派與個性,**剛好挑 25 檔**作為當週持倉。
記住:你是 {profile['display_name']},不是其他人。用你自己的話講理由。"""

    msg = _client().messages.create(
        model=MODEL,
        max_tokens=8000,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    raw = msg.content[0].text if msg.content else ""
    raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    data = json.loads(raw)
    holdings = data.get("holdings", [])
    if len(holdings) != 25:
        raise ValueError(f"{agent_id} returned {len(holdings)} holdings, expected 25")
    return data


def simulate_holdings_meeting(today: date_type) -> dict:
    """模擬戰情室盤前會議,5 位分析師各產出 25 檔持倉,寫入 quack_predictions + meetings。

    流程:
      1. 5 位分析師各自獨立產生 25 檔(5 個 Claude calls)
      2. 統合產出會議記錄文字(1 個 Claude call)
      3. 寫入 meetings 表 + 125 筆 quack_predictions
      4. 更新 agent_stats.total_predictions

    回傳:
      {meeting_id, predictions_created: 125, per_analyst: {analyst_a: {...}, ...}}
    """
    snapshot = _build_market_snapshot(60)

    per_analyst: dict[str, dict] = {}
    log.info("simulate_holdings_meeting start, 5 analysts × 25 holdings")
    for agent_id in ANALYSTS_ORDER:
        log.info(f"  generating holdings for {agent_id} ...")
        try:
            data = _generate_holdings_for(agent_id, snapshot, today)
            per_analyst[agent_id] = data
        except Exception as e:
            log.exception(f"  {agent_id} failed: {e}")
            raise

    # 產出會議記錄文字(包含 5 位的 self_summary + 模擬辯論)
    meeting_md = _generate_meeting_record(today, per_analyst, snapshot)
    meeting_id = _meeting_id(today, "holdings")

    # 寫入 DB
    sb = _sb()
    pred_ids: list[str] = []
    inserted_predictions: list[dict] = []

    for agent_id in ANALYSTS_ORDER:
        profile = ANALYSTS[agent_id]
        holdings = per_analyst[agent_id]["holdings"]
        for idx, h in enumerate(holdings, start=1):
            pid = _pred_id(agent_id, today, idx)
            try:
                deadline_days = int(h.get("deadline_days", 7))
            except Exception:
                deadline_days = 7
            deadline = (datetime.combine(today, datetime.min.time()) + timedelta(days=deadline_days)).replace(hour=13, minute=30)
            reasoning_text = (h.get("reasoning") or "")[:1000]
            # 008c-cleanup: reasoning 欄位獨立(migration 0012 ADD COLUMN)
            # evidence JSONB 保留 reasoning 副本作為附加 metadata
            pred_text = f"{h.get('symbol','')} {h.get('name','')},{h.get('direction','bullish')} 目標 {h.get('target_price')}"
            row = {
                "date": today.isoformat(),
                "prediction_type": "stock_pick",
                "subject": str(h.get("symbol", "")),
                "prediction": pred_text[:1500],
                "confidence": int(h.get("confidence", 60)),
                "timeframe": f"{deadline_days}d",
                "evaluate_after": (today + timedelta(days=deadline_days)).isoformat(),
                "agent_id": agent_id,
                "agent_name": profile["display_name"],
                "target_symbol": str(h.get("symbol", ""))[:20],
                "target_name": str(h.get("name", ""))[:100],
                "direction": h.get("direction", "bullish"),
                "target_price": h.get("target_price"),
                "current_price_at_prediction": h.get("current_price_at_prediction"),
                "deadline": deadline.isoformat(),
                "reasoning": reasoning_text,
                "success_criteria": (h.get("success_criteria") or profile["success_criteria_style"])[:500],
                "supporting_departments": _infer_departments(profile["school"]),
                "evidence": {
                    "deadline_days": deadline_days,
                    "school": profile["school"],
                },
                "status": "active",
                "meeting_id": meeting_id,
            }
            inserted_predictions.append(row)
            pred_ids.append(pid)

    # 先 upsert meetings(因為 quack_predictions 有 FK 指向 meetings)
    started = datetime.combine(today, datetime.min.time()).replace(hour=8)
    ended = started + timedelta(minutes=45)
    meeting_payload = {
        "meeting_id": meeting_id,
        "meeting_type": "pre_market_holdings_setup",
        "scheduled_at": started.isoformat() + "+08:00",
        "started_at": started.isoformat() + "+08:00",
        "ended_at": ended.isoformat() + "+08:00",
        "chair_agent_id": "guagua",
        "attendees": [
            "guagua",
            "owl_fundamentalist", "hedgehog_technical", "squirrel_chip", "meerkat_quant",
            "fox_skeptic", "pangolin_risk",
            "analyst_a", "analyst_b", "analyst_c", "analyst_d", "analyst_e",
        ],
        "content_markdown": meeting_md,
        "predictions_created": pred_ids,
        "predictions_settled": [],
    }
    sb.table("meetings").upsert(meeting_payload, on_conflict="meeting_id").execute()

    # batch insert predictions(分 batch 避免太大)
    BATCH = 30
    for i in range(0, len(inserted_predictions), BATCH):
        chunk = inserted_predictions[i:i + BATCH]
        sb.table("quack_predictions").insert(chunk).execute()

    # 更新 agent_stats.total_predictions(+25 each)
    for agent_id in ANALYSTS_ORDER:
        try:
            sb.rpc("noop_function").execute() if False else None  # noqa
            cur = sb.table("agent_stats").select("total_predictions").eq("agent_id", agent_id).limit(1).execute().data or [{}]
            current = (cur[0].get("total_predictions") or 0)
            sb.table("agent_stats").update(
                {"total_predictions": current + 25, "last_updated": now_tpe().isoformat()}
            ).eq("agent_id", agent_id).execute()
        except Exception as e:
            log.warning(f"agent_stats update {agent_id} failed: {e}")

    return {
        "meeting_id": meeting_id,
        "predictions_created": len(inserted_predictions),
        "per_analyst": {a: len(per_analyst[a]["holdings"]) for a in ANALYSTS_ORDER},
        "meeting_md_chars": len(meeting_md),
    }


def _infer_departments(school: str) -> list[str]:
    if "技術" in school:
        return ["technical", "chip"]
    if "基本面" in school:
        return ["fundamental", "quant"]
    if "籌碼" in school:
        return ["chip", "technical"]
    if "量化" in school:
        return ["quant", "chip", "technical"]
    return ["technical", "fundamental", "chip", "quant"]


# ===========================================================================
# 2. 會議記錄生成(法人說明會風格)
# ===========================================================================
SYSTEM_PROMPT_MEETING = """你是呱呱招待所的會議書記。寫一場「法人說明會風格」的盤前會議記錄。

## 場景
這是 5 位投資分析師建立當週持倉的會議。
出席:呱呱(主席)、4 位資訊部門主管(評級師🦉/技術分析師📊/籌碼觀察家📡/量化科學家🧑‍🔬)、5 位投資分析師(辰旭/靜遠/觀棋/守拙/明川)、質疑官🦊、風險管理師🧘

## 風格
- 法人說明會:結構化、有層次、不囉嗦
- 每位分析師有自己的個性,別寫成一樣的口吻
- 質疑官一定要拷問每位至少 1 個質疑
- 風險管理師收尾風險提示
- 呱呱最後總結帶個性(用「池塘、水位、甩轎、洗浮額、跳進池塘」等意象)
- 不准「以上僅供參考」這類話術

## 輸出
**只輸出會議記錄 markdown 純文字**,不要包 JSON、不要包代碼塊、直接從「═══...」開始。
總長度約 1500-2500 字。"""


def _generate_meeting_record(today: date_type, per_analyst: dict, snapshot: dict) -> str:
    """產生會議記錄文字(法人說明會風格)。"""
    summaries = {
        a: {
            "name": ANALYSTS[a]["display_name"],
            "school": ANALYSTS[a]["school"],
            "self_summary": per_analyst[a].get("self_summary", ""),
            "top_3": per_analyst[a]["holdings"][:3],
        }
        for a in ANALYSTS_ORDER
    }

    user = f"""日期:{today.isoformat()}(週 {['一','二','三','四','五','六','日'][today.weekday()]})

5 位分析師建好 25 檔持倉的摘要(供你引用):
{json.dumps(summaries, ensure_ascii=False, indent=2)}

當前熱門題材:
{json.dumps(snapshot.get("topics", [])[:8], ensure_ascii=False)}

寫一場「持倉建立會議」的完整記錄,約 1500-2500 字,法人說明會風格。"""

    msg = _client().messages.create(
        model=MODEL,
        max_tokens=4000,
        system=SYSTEM_PROMPT_MEETING,
        messages=[{"role": "user", "content": user}],
    )
    raw = msg.content[0].text if msg.content else ""
    return raw.strip()


# ===========================================================================
# 3. 大盤觀點(每日)
# ===========================================================================
SYSTEM_PROMPT_MARKET_VIEW = """你是「{display_name}」({school})。
你的流派:{weights}
你的個性:{personality}
你的口頭禪:{catchphrase}

## 任務
根據今日市場狀態,寫**今日大盤觀點**:1-2 句話 + 3 個 key_focus + bias + confidence。

## 鐵律
- 用你的個性寫,不要寫成 ChatGPT 口吻
- 不准「以上僅供參考」「投資有風險」這類話術
- 1-2 句話要言簡意賅
- key_focus 是「今天你會盯什麼」(3 個)
- bias: bullish / bearish / neutral
- confidence: 50-90 整數
- JSON only,不要包 markdown

## schema
{{
  "market_view": "1-2 句你個性的觀點",
  "key_focus": ["焦點 1", "焦點 2", "焦點 3"],
  "bias": "bullish",
  "confidence": 70
}}
"""


def analyst_judge_market(agent_id: str, today: date_type, market_snapshot: dict | None = None) -> dict:
    """單一分析師的當日大盤觀點。"""
    profile = ANALYSTS[agent_id]
    system = SYSTEM_PROMPT_MARKET_VIEW.format(
        display_name=profile["display_name"],
        school=profile["school"],
        weights=profile["weights"],
        personality=profile["personality"],
        catchphrase="、".join(profile["catchphrase"]),
    )
    if not market_snapshot:
        market_snapshot = _build_market_snapshot(20)

    user = f"""今天:{today.isoformat()}(週 {['一','二','三','四','五','六','日'][today.weekday()]})

當前市場 snapshot:
{json.dumps(market_snapshot, ensure_ascii=False, indent=2)[:4000]}

請依你的流派與個性,寫今日大盤觀點。"""

    msg = _client().messages.create(
        model=MODEL,
        max_tokens=600,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    raw = msg.content[0].text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    data = json.loads(raw)
    return {
        "market_view": str(data.get("market_view", ""))[:1000],
        "key_focus": data.get("key_focus", []) or [],
        "bias": data.get("bias", "neutral"),
        "confidence": int(data.get("confidence", 60)),
        "model": MODEL,
    }


def refresh_all_market_views(today: date_type) -> dict:
    """5 位一次刷新大盤觀點,寫入 analyst_market_views(upsert)。"""
    snapshot = _build_market_snapshot(20)
    out: dict[str, dict] = {}
    sb = _sb()
    for agent_id in ANALYSTS_ORDER:
        try:
            data = analyst_judge_market(agent_id, today, snapshot)
            payload = {
                "agent_id": agent_id,
                "view_date": today.isoformat(),
                "market_view": data["market_view"],
                "key_focus": data["key_focus"],
                "bias": data["bias"],
                "confidence": data["confidence"],
                "model": data["model"],
            }
            sb.table("analyst_market_views").upsert(payload, on_conflict="agent_id,view_date").execute()
            out[agent_id] = {"ok": True, **data}
        except Exception as e:
            log.exception(f"refresh_market_view {agent_id} failed: {e}")
            out[agent_id] = {"ok": False, "error": str(e)[:200]}
    return out


# ===========================================================================
# 4. 每日推薦(從 25 持倉精選 3-5 檔)
# ===========================================================================
SYSTEM_PROMPT_DAILY_PICKS = """你是「{display_name}」({school})。
你的流派:{weights}
你的個性:{personality}

## 任務
從你當前的 active 持倉中,精選**今天最值得進場 / 加碼 / 重點觀察的 3-5 檔**,並給出進場區間 + 推薦強度。

## 鐵律
- 從給定的 active 持倉中挑(不能挑外的)
- 強度 1-10(10 = 今天非進不可)
- 進場區間:用合理價格區間(現價 ± 5%)
- 理由用你個性的話講(不超過 60 字)
- 3-5 檔即可,不要硬湊
- JSON only

## schema
{{
  "picks": [
    {{
      "symbol": "2330",
      "name": "台積電",
      "strength": 8,
      "entry_price_low": 2160,
      "entry_price_high": 2210,
      "reason": "你個性化的理由"
    }},
    ...(3-5 個)
  ]
}}
"""


def analyst_pick_daily(agent_id: str, today: date_type) -> dict:
    """單一分析師從 active 持倉中挑 3-5 檔今日重點。"""
    profile = ANALYSTS[agent_id]
    sb = _sb()

    holdings = (
        sb.table("quack_predictions")
        .select("target_symbol,target_name,direction,target_price,current_price_at_prediction,confidence,reasoning")
        .eq("agent_id", agent_id)
        .eq("status", "active")
        .order("confidence", desc=True)
        .limit(25)
        .execute()
        .data
    ) or []

    if not holdings:
        return {"picks": []}

    system = SYSTEM_PROMPT_DAILY_PICKS.format(
        display_name=profile["display_name"],
        school=profile["school"],
        weights=profile["weights"],
        personality=profile["personality"],
    )

    user = f"""今天:{today.isoformat()}

你的當前 active 持倉:
{json.dumps(holdings, ensure_ascii=False, indent=2)}

從這些當中精選 3-5 檔今天最值得行動的,給出進場區間與強度。"""

    msg = _client().messages.create(
        model=MODEL,
        max_tokens=1500,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    raw = msg.content[0].text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    data = json.loads(raw)
    picks = data.get("picks", []) or []

    # validate
    if not (3 <= len(picks) <= 5):
        # 若 AI 沒守規矩,強切到 3-5
        picks = picks[:5] if len(picks) > 5 else picks
        if len(picks) < 3:
            raise ValueError(f"{agent_id} returned {len(picks)} picks, need 3-5")

    return {"picks": picks}


def refresh_all_daily_picks(today: date_type) -> dict:
    """5 位一次刷新每日推薦,寫入 analyst_daily_picks。"""
    sb = _sb()
    # 先刪當日舊的(重新產生)
    try:
        sb.table("analyst_daily_picks").delete().eq("pick_date", today.isoformat()).execute()
    except Exception:
        pass

    out: dict[str, dict] = {}
    for agent_id in ANALYSTS_ORDER:
        try:
            data = analyst_pick_daily(agent_id, today)
            picks = data["picks"]
            if not picks:
                out[agent_id] = {"ok": False, "reason": "no active holdings"}
                continue
            rows = [
                {
                    "agent_id": agent_id,
                    "pick_date": today.isoformat(),
                    "target_symbol": str(p.get("symbol", ""))[:20],
                    "target_name": str(p.get("name", ""))[:100],
                    "strength": int(p.get("strength", 5)),
                    "entry_price_low": p.get("entry_price_low"),
                    "entry_price_high": p.get("entry_price_high"),
                    "reason": (p.get("reason") or "")[:600],
                }
                for p in picks
            ]
            sb.table("analyst_daily_picks").insert(rows).execute()
            out[agent_id] = {"ok": True, "count": len(rows)}
        except Exception as e:
            log.exception(f"refresh_daily_picks {agent_id} failed: {e}")
            out[agent_id] = {"ok": False, "error": str(e)[:200]}
    return out
