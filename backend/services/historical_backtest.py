"""
NEXT_TASK_008d-1 歷史回溯系統

5 位分析師回溯過去 90 天:
  1. fetch_historical_prices(symbols, start_date, end_date) — 從 FinMind 抓股價寫入 stock_prices_historical
  2. generate_predictions_for_day(agent_id, trading_day) — AI 模擬該分析師當日 5-10 筆預測
  3. settle_predictions(only_pending=True) — 對照真實股價判定 hit/miss
  4. generate_learning_notes_batch(agent_id, missed_predictions) — 批次產 learning_note
  5. recompute_agent_stats(agent_id) — 計算累積勝率
  6. compute_winrate_timeline(agent_id) — 計算每日滾動勝率寫入 analyst_winrate_timeline

重要原則:
  - 預測產生時 AI 只看「< 預測日」的資料(避免事後諸葛)
  - hit/miss 判定按照各分析師的 success_criteria_style(嚴格 / 寬鬆 / 分段)
  - 失敗 learning_note 用該分析師口吻產生
"""
from __future__ import annotations

import json
import os
import time
from datetime import date as date_type
from datetime import datetime, timedelta
from typing import Any, Optional

import anthropic
import httpx

from backend.services import analyst_brain
from backend.services.finmind_service import FinMindService
from backend.utils.logger import get_logger
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")
ANALYSTS = analyst_brain.ANALYSTS
ANALYSTS_ORDER = analyst_brain.ANALYSTS_ORDER


def _client():
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


def _sb():
    return get_service_client()


# ============================================================================
# Phase 1 — 抓 90 天歷史股價
# ============================================================================
def fetch_historical_prices(
    symbols: list[str],
    start_date: date_type,
    end_date: date_type,
    sleep_per_call: float = 0.4,
) -> dict[str, Any]:
    """從 FinMind 抓 symbols 在 [start_date, end_date] 的日 K,寫入 stock_prices_historical。

    回傳: {fetched_symbols, total_rows, failed: [...], coverage: {symbol: rows}}
    """
    sb = _sb()
    fm = FinMindService()
    out: dict[str, int] = {}
    failed: list[str] = []
    total_rows = 0

    for i, sym in enumerate(symbols, 1):
        try:
            data, _ = fm.get_stock_price(sym, start_date, end_date)
            if not data:
                log.warning(f"[{i}/{len(symbols)}] {sym} no data")
                failed.append(sym)
                out[sym] = 0
                time.sleep(sleep_per_call)
                continue

            rows = []
            for d in data:
                # FinMind 欄位:date / open / max / min / close / Trading_Volume / spread
                close = d.get("close")
                if close is None:
                    continue
                rows.append({
                    "stock_id": sym,
                    "trade_date": d.get("date"),
                    "open": d.get("open"),
                    "high": d.get("max"),
                    "low": d.get("min"),
                    "close": close,
                    "volume": d.get("Trading_Volume"),
                    "spread": d.get("spread"),
                })

            if rows:
                # upsert by (stock_id, trade_date)
                BATCH = 100
                for j in range(0, len(rows), BATCH):
                    chunk = rows[j:j + BATCH]
                    sb.table("stock_prices_historical").upsert(chunk, on_conflict="stock_id,trade_date").execute()
                out[sym] = len(rows)
                total_rows += len(rows)
                log.info(f"[{i}/{len(symbols)}] {sym} → {len(rows)} rows")
            else:
                out[sym] = 0
                failed.append(sym)
        except Exception as e:
            log.exception(f"[{i}/{len(symbols)}] {sym} failed: {e}")
            failed.append(sym)
            out[sym] = 0
        time.sleep(sleep_per_call)

    return {
        "fetched_symbols": len([s for s in out if out[s] > 0]),
        "total_rows": total_rows,
        "failed": failed,
        "coverage": out,
    }


def get_trading_days(start_date: date_type, end_date: date_type) -> list[date_type]:
    """取期間內的交易日(從 stock_prices_historical 取 distinct trade_date)。
    用 TAIEX 或 2330 之類流動性高的標的的日期作為 truth。
    """
    sb = _sb()
    rows = (
        sb.table("stock_prices_historical")
        .select("trade_date")
        .eq("stock_id", "2330")
        .gte("trade_date", start_date.isoformat())
        .lte("trade_date", end_date.isoformat())
        .order("trade_date", desc=False)
        .limit(200)
        .execute()
    )
    dates = sorted(set(date_type.fromisoformat(r["trade_date"]) for r in (rows.data or [])))
    return dates


def get_price_at(stock_id: str, on_date: date_type) -> Optional[float]:
    """取 stock_id 在 on_date 的收盤價;若該日無資料(休市),取下一個交易日。"""
    sb = _sb()
    rows = (
        sb.table("stock_prices_historical")
        .select("trade_date,close")
        .eq("stock_id", stock_id)
        .gte("trade_date", on_date.isoformat())
        .order("trade_date", desc=False)
        .limit(1)
        .execute()
    )
    data = rows.data or []
    if data:
        return float(data[0]["close"])
    return None


def get_price_history_until(stock_id: str, until_date: date_type, lookback_days: int = 5) -> list[dict]:
    """取 stock_id 在 [until_date - lookback_days, until_date] 的日 K(用於餵給 AI 看「過去」)。"""
    sb = _sb()
    start = (until_date - timedelta(days=lookback_days * 2)).isoformat()
    rows = (
        sb.table("stock_prices_historical")
        .select("trade_date,open,high,low,close,volume")
        .eq("stock_id", stock_id)
        .gte("trade_date", start)
        .lte("trade_date", until_date.isoformat())
        .order("trade_date", desc=False)
        .limit(lookback_days)
        .execute()
    )
    return rows.data or []


def get_max_in_window(stock_id: str, start_date: date_type, end_date: date_type) -> Optional[float]:
    """取 stock_id 在 [start_date, end_date] 期間的最高 high(給靜遠寬鬆判定用)。"""
    sb = _sb()
    rows = (
        sb.table("stock_prices_historical")
        .select("high")
        .eq("stock_id", stock_id)
        .gte("trade_date", start_date.isoformat())
        .lte("trade_date", end_date.isoformat())
        .execute()
    )
    highs = [float(r["high"]) for r in (rows.data or []) if r.get("high") is not None]
    return max(highs) if highs else None


def get_min_in_window(stock_id: str, start_date: date_type, end_date: date_type) -> Optional[float]:
    """取 stock_id 在 [start_date, end_date] 期間的最低 low(給看空判定用)。"""
    sb = _sb()
    rows = (
        sb.table("stock_prices_historical")
        .select("low")
        .eq("stock_id", stock_id)
        .gte("trade_date", start_date.isoformat())
        .lte("trade_date", end_date.isoformat())
        .execute()
    )
    lows = [float(r["low"]) for r in (rows.data or []) if r.get("low") is not None]
    return min(lows) if lows else None


# ============================================================================
# Phase 2 — 產生歷史預測
# ============================================================================
SYSTEM_PROMPT_BACKFILL = """你是「{display_name}」(代號 {frontend_name},個性主軸:**{trait_label}**)。

## 我是誰(全盤分析師,v2 架構)
我**全部都看**:技術面 + 基本面 + 籌碼面 + 量化 + 題材 + 消息——這 6 個面向我都會檢視。
但我有自己的個性偏好,**權重不同**:{weights}
我的個性:{personality}
我的口頭禪:{catchphrase}
我的決策怪癖:
{decision_quirks_str}
我的時間框架:短期 {timeframe_short_days} 天 / 長期 {timeframe_long_days} 天
我的單一持倉上限:{max_position_pct}%,停損:{stop_loss_pct}%
我的成功標準風格:{success_criteria_style}

## 場景
**現在是 {predict_date}**(回溯模擬,你只能用 {predict_date} 之前已知的資訊)。
你正在做當日預測。**不准用未來資訊**(你看不到 {predict_date} 之後的股價)。

## 任務
從給定的台股清單中,挑出 **{n_picks} 筆**你今天最看好或最看空的預測。

## 鐵律(v2 全盤架構)
1. **每筆 reasoning 必須提到至少 2 個面向**(從技術/基本面/籌碼/量化/題材/消息中挑),不能只講單一面向
2. 但**側重要符合你的個性權重** — 你是 {trait_label},reasoning 應該看得出你的偏好
3. 必須包含:symbol、name、direction(bullish/bearish/neutral)、target_price、current_price_at_prediction、deadline_days(<= {max_deadline_days},整數)、confidence(50-90)、reasoning(你的口吻 40-80 字,展現多面向)、success_criteria
4. confidence 分布要合理(不全 80,不全 60)
5. 不准全部看多或全部看空,要有混合(看你的個性傾向哪邊)
6. reasoning 要寫得像當下做的判斷(用當天可見的資料,不要事後諸葛)
7. 不准「以上僅供參考」「投資有風險」「資料不足」這類話術
8. JSON only,不要 markdown 代碼塊包裹
9. **嚴格 {n_picks} 筆**(違反就失敗)

## reasoning 範例(展現多面向)
- 辰旭(激進):「2330 突破月線量增 30%(技術),外資連買 4 日(籌碼),AI 題材熱度延續(題材),雖然估值偏高但我看短線動能」
- 靜遠(保守):「2454 PE 18 低於 5 年中位 22(基本面),股息殖利率 3.2%(基本面),量縮整理蹲底(技術)
,我等財報前再加碼」
- 觀棋(跟隨):「3231 投信連 5 日買超(籌碼),分點主力進場(籌碼),題材落在 AI 伺服器(題材),技術面突破在即」
- 守拙(紀律):「2308 過去 5 年類似訊號 N=23 勝率 71%(量化),目前財務指標符合(基本面),技術上量價結構乾淨(技術)」
- 明川(靈活):「2330 多頭市況下偏向技術+籌碼權重(技術突破+外資買),基本面不弱(基本面),題材有 AI(題材),整合下進」

## 輸出 schema
{{
  "predictions": [
    {{
      "symbol": "2330",
      "name": "台積電",
      "direction": "bullish",
      "target_price": 1050,
      "current_price_at_prediction": 1020,
      "deadline_days": 7,
      "confidence": 75,
      "reasoning": "你個性化的當下理由,提到至少 2 個面向(40-80 字)",
      "success_criteria": "你自己定義的命中標準"
    }}
  ]
}}
"""


def _build_market_context(predict_date: date_type, n_stocks: int = 30) -> dict:
    """建當日的市場 snapshot(只給 AI 看「過去」的資料):
    - 一批熱門股票(取自 stocks 表 by score)
    - 每檔最近 5 個交易日的價格走勢(<= predict_date)
    """
    sb = _sb()
    # 取股票清單
    try:
        r = (
            sb.table("stocks")
            .select("stock_id,stock_name,industry,current_score")
            .eq("is_active", True)
            .order("current_score", desc=True)
            .limit(n_stocks)
            .execute()
        )
        universe = r.data or []
    except Exception:
        universe = []

    # 餵給 AI 的精簡格式
    stocks_info = []
    for s in universe:
        sym = s.get("stock_id")
        if not sym:
            continue
        history = get_price_history_until(sym, predict_date, lookback_days=5)
        if not history:
            continue
        latest_close = history[-1].get("close") if history else None
        first_close = history[0].get("close") if history else None
        change_5d = None
        if latest_close and first_close and first_close > 0:
            change_5d = round((float(latest_close) - float(first_close)) / float(first_close) * 100, 2)
        stocks_info.append({
            "symbol": sym,
            "name": s.get("stock_name"),
            "industry": s.get("industry"),
            "score": s.get("current_score"),
            "current_price": float(latest_close) if latest_close else None,
            "change_5d_pct": change_5d,
            "recent_5d": [
                {
                    "d": h["trade_date"],
                    "o": float(h["open"]) if h.get("open") else None,
                    "h": float(h["high"]) if h.get("high") else None,
                    "l": float(h["low"]) if h.get("low") else None,
                    "c": float(h["close"]) if h.get("close") else None,
                }
                for h in history
            ],
        })

    return {
        "predict_date": predict_date.isoformat(),
        "stocks_with_recent_5d": stocks_info,
    }


def generate_predictions_for_day(
    agent_id: str,
    predict_date: date_type,
    market_context: dict,
    n_picks: int = 7,
    max_deadline_days: int = 14,
    max_retries: int = 5,
) -> list[dict]:
    """單一分析師單日產生 N 筆預測。回傳預測 list(尚未寫 DB)。
    對 RemoteProtocolError / overloaded / json decode 失敗做指數退避重試。
    """
    profile = ANALYSTS[agent_id]
    decision_quirks = profile.get("decision_quirks") or []
    decision_quirks_str = "\n".join(f"  - {q}" for q in decision_quirks) if decision_quirks else "  - (依個性權重判斷)"
    system = SYSTEM_PROMPT_BACKFILL.format(
        display_name=profile["display_name"],
        frontend_name=profile["frontend_name"],
        trait_label=profile.get("trait_label", profile.get("school", "全盤派")),
        school=profile["school"],
        weights=profile["weights"],
        personality=profile["personality"],
        catchphrase="、".join(profile["catchphrase"]),
        decision_quirks_str=decision_quirks_str,
        timeframe_short_days=profile["timeframe_short_days"],
        timeframe_long_days=profile["timeframe_long_days"],
        max_position_pct=profile["max_position_pct"],
        stop_loss_pct=profile["stop_loss_pct"],
        success_criteria_style=profile["success_criteria_style"],
        predict_date=predict_date.isoformat(),
        n_picks=n_picks,
        max_deadline_days=max_deadline_days,
    )

    universe = market_context.get("stocks_with_recent_5d", [])[:n_picks * 4]  # 給 AI 4 倍候選

    user = f"""今天:{predict_date.isoformat()}(週 {['一','二','三','四','五','六','日'][predict_date.weekday()]})

可選的台股(已篩過熱門 + 過去 5 個交易日走勢,**這就是你今天能看到的全部資料**):
{json.dumps(universe, ensure_ascii=False, indent=2)}

請依你的流派與個性,挑 {n_picks} 筆預測。記住:你是 {profile['display_name']},不是其他人。
**deadline_days 不准超過 {max_deadline_days}**(這是回溯期限制)。
"""

    last_err: Optional[Exception] = None
    backoffs = [3, 8, 20, 45, 90]  # exponential with jitter
    actual_max = min(max_retries, len(backoffs))
    for attempt in range(actual_max):
        try:
            msg = _client().messages.create(
                model=MODEL,
                max_tokens=3000,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            raw = msg.content[0].text if msg.content else ""
            raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            data = json.loads(raw)
            preds = data.get("predictions", [])
            if not preds:
                raise ValueError(f"{agent_id} {predict_date} 回 0 筆預測")
            return preds
        except (json.JSONDecodeError, anthropic.APIConnectionError, anthropic.APIStatusError, ValueError,
                httpx.RemoteProtocolError, httpx.ReadTimeout, httpx.ConnectError, httpx.WriteError) as e:
            last_err = e
            wait = backoffs[attempt] if attempt < len(backoffs) else 60
            log.warning(f"{agent_id} {predict_date} attempt {attempt+1}/{actual_max} failed: {type(e).__name__}: {str(e)[:100]} — retry in {wait}s")
            time.sleep(wait)
        except Exception as e:
            log.exception(f"{agent_id} {predict_date} unexpected: {e}")
            raise
    raise last_err if last_err else RuntimeError("unreachable")


def insert_historical_predictions(
    agent_id: str,
    predict_date: date_type,
    predictions: list[dict],
    backfill_marker: str = "BACKFILL_008d1",
    architecture_version: str = "v1",
) -> list[int]:
    """把產生的預測寫入 quack_predictions(status=active,等 settle 階段判定)。回傳 inserted ids。"""
    sb = _sb()
    profile = ANALYSTS[agent_id]
    rows = []
    for h in predictions:
        try:
            deadline_days = max(1, int(h.get("deadline_days", 7)))
        except Exception:
            deadline_days = 7
        deadline_dt = datetime.combine(predict_date, datetime.min.time()) + timedelta(days=deadline_days)
        deadline_dt = deadline_dt.replace(hour=13, minute=30)

        # created_at 用 predict_date(回溯日期)
        created_dt = datetime.combine(predict_date, datetime.min.time()).replace(hour=8, minute=30)

        symbol = str(h.get("symbol", ""))[:20]
        name = str(h.get("name", ""))[:100]
        direction = h.get("direction", "bullish")
        target_price = h.get("target_price")
        cur_price = h.get("current_price_at_prediction")
        confidence = int(h.get("confidence", 60))
        reasoning = (h.get("reasoning") or "")[:1000]
        success_criteria = (h.get("success_criteria") or profile["success_criteria_style"])[:500]

        pred_text = f"{symbol} {name},{direction} 目標 {target_price}"

        row = {
            "date": predict_date.isoformat(),
            "prediction_type": "stock_pick",
            "subject": symbol,
            "prediction": pred_text[:1500],
            "confidence": confidence,
            "timeframe": f"{deadline_days}d",
            "evaluate_after": (predict_date + timedelta(days=deadline_days)).isoformat(),
            "agent_id": agent_id,
            "agent_name": profile["display_name"],
            "target_symbol": symbol,
            "target_name": name,
            "direction": direction,
            "target_price": target_price,
            "current_price_at_prediction": cur_price,
            "deadline": deadline_dt.isoformat(),
            "reasoning": reasoning,
            "success_criteria": success_criteria,
            "supporting_departments": analyst_brain._infer_departments(profile["school"]),
            "evidence": {
                "deadline_days": deadline_days,
                "school": profile["school"],
                "backfill_marker": backfill_marker,
                "architecture_version": architecture_version,
                "trait_label": profile.get("trait_label"),
            },
            "status": "active",
            "created_at": created_dt.isoformat() + "+08:00",
        }
        rows.append(row)

    inserted_ids: list[int] = []
    BATCH = 30
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        r = sb.table("quack_predictions").insert(chunk).execute()
        for d in (r.data or []):
            if "id" in d:
                inserted_ids.append(d["id"])
    return inserted_ids


# ============================================================================
# Phase 3 — 對照真實股價判定 hit / miss
# ============================================================================
def _judge_strict(direction: str, target_price: float, close_at_deadline: float) -> str:
    """嚴格判定(辰旭、靜遠 close-only):
    bullish: close >= target → hit
    bearish: close <= target → hit
    """
    if direction == "bullish":
        return "hit" if close_at_deadline >= target_price else "missed"
    if direction == "bearish":
        return "hit" if close_at_deadline <= target_price else "missed"
    return "hit"  # neutral 視同 hit(極少出現)


def _judge_strict_window(direction: str, target_price: float, max_in_window: float, min_in_window: float) -> str:
    """嚴格分段判定(靜遠):時限內最高 / 最低點達標即 hit。"""
    if direction == "bullish":
        return "hit" if max_in_window >= target_price else "missed"
    if direction == "bearish":
        return "hit" if min_in_window <= target_price else "missed"
    return "hit"


def _judge_loose(direction: str, target_price: float, current_price: float, max_in_window: float, min_in_window: float) -> str:
    """寬鬆判定(觀棋):方向對 + 達 80% 算半 hit,100% 算 hit。
    為了統一 hit/missed,半 hit 視為 hit(寬鬆派的本意)。
    """
    if direction == "bullish":
        # 達 80% 的目標 = current + (target - current) * 0.8
        if current_price is None or target_price is None:
            return "missed"
        partial = current_price + (target_price - current_price) * 0.8
        return "hit" if max_in_window >= partial else "missed"
    if direction == "bearish":
        if current_price is None or target_price is None:
            return "missed"
        partial = current_price + (target_price - current_price) * 0.8
        return "hit" if min_in_window <= partial else "missed"
    return "hit"


def _judge_quant(direction: str, target_price: float, current_price: float, close_at_deadline: float) -> str:
    """守拙嚴格 + 數學:實際達預測 90% 以上(以 close 為準)。"""
    if direction == "bullish":
        if current_price is None or target_price is None:
            return "missed"
        target_return = (target_price - current_price) / current_price
        actual_return = (close_at_deadline - current_price) / current_price
        return "hit" if actual_return >= target_return * 0.9 else "missed"
    if direction == "bearish":
        if current_price is None or target_price is None:
            return "missed"
        target_return = (target_price - current_price) / current_price  # negative
        actual_return = (close_at_deadline - current_price) / current_price
        return "hit" if actual_return <= target_return * 0.9 else "missed"
    return "hit"


def _judge_segmented(direction: str, target_price: float, current_price: float, max_in_window: float, min_in_window: float) -> str:
    """明川分段判定:時限內看時限結尾,只要達 66% 即視為 hit(綜合派比較寬容,但比觀棋嚴)。"""
    if direction == "bullish":
        if current_price is None or target_price is None:
            return "missed"
        partial_66 = current_price + (target_price - current_price) * 0.66
        return "hit" if max_in_window >= partial_66 else "missed"
    if direction == "bearish":
        if current_price is None or target_price is None:
            return "missed"
        partial_66 = current_price + (target_price - current_price) * 0.66
        return "hit" if min_in_window <= partial_66 else "missed"
    return "hit"


JUDGE_BY_AGENT: dict[str, str] = {
    "analyst_a": "strict",       # 辰旭 嚴格 close
    "analyst_b": "strict_window",  # 靜遠 嚴格 + 分段(時限內最高點)
    "analyst_c": "loose",        # 觀棋 寬鬆(80%)
    "analyst_d": "quant",        # 守拙 嚴格 + 數學(90% 報酬)
    "analyst_e": "segmented",    # 明川 分段(66%)
}


def settle_prediction(pred: dict, today: date_type) -> Optional[dict]:
    """結算單筆預測。回傳 update payload(若可結算)。"""
    agent_id = pred["agent_id"]
    target_symbol = pred["target_symbol"]
    direction = pred.get("direction", "bullish")
    target_price = float(pred["target_price"]) if pred.get("target_price") else None
    cur_price = float(pred["current_price_at_prediction"]) if pred.get("current_price_at_prediction") else None
    deadline_str = pred.get("deadline")
    if not deadline_str or not target_price:
        return None
    deadline_date = date_type.fromisoformat(deadline_str[:10])
    if deadline_date > today:
        return None  # 還沒到期,不能結算

    # 取 deadline 當日(或下一個交易日)收盤
    close_at_deadline = get_price_at(target_symbol, deadline_date)
    if close_at_deadline is None:
        return None  # 沒資料,先跳過

    # 取期間內最高/最低
    created_at_str = pred.get("created_at", "")
    if created_at_str:
        try:
            created_date = date_type.fromisoformat(created_at_str[:10])
        except Exception:
            created_date = deadline_date - timedelta(days=7)
    else:
        created_date = deadline_date - timedelta(days=7)

    max_w = get_max_in_window(target_symbol, created_date, deadline_date)
    min_w = get_min_in_window(target_symbol, created_date, deadline_date)
    if max_w is None or min_w is None:
        max_w = close_at_deadline
        min_w = close_at_deadline

    judge_type = JUDGE_BY_AGENT.get(agent_id, "strict")
    if judge_type == "strict":
        result = _judge_strict(direction, target_price, close_at_deadline)
    elif judge_type == "strict_window":
        result = _judge_strict_window(direction, target_price, max_w, min_w)
    elif judge_type == "loose":
        result = _judge_loose(direction, target_price, cur_price, max_w, min_w)
    elif judge_type == "quant":
        result = _judge_quant(direction, target_price, cur_price, close_at_deadline)
    elif judge_type == "segmented":
        result = _judge_segmented(direction, target_price, cur_price, max_w, min_w)
    else:
        result = _judge_strict(direction, target_price, close_at_deadline)

    return {
        "id": pred["id"],
        "status": result,
        "actual_price_at_deadline": close_at_deadline,
        "evaluated_at": now_tpe().isoformat(),  # quack_predictions 用 evaluated_at,不是 settled_at
        "hit_or_miss": result,  # 雙寫舊欄位
    }


def settle_all_pending(today: date_type, backfill_marker: str = "BACKFILL_008d1") -> dict:
    """結算所有 backfill 標記的 active 歷史預測。回傳統計。

    避免 pagination + 結算同時改 status 造成漏掉 — 每次都從 offset=0 重新撈
    (because 結算後 status 從 active 變 hit/missed,該筆不再符合 .eq('status','active'))。
    """
    sb = _sb()
    PAGE = 300
    total = {"settled": 0, "hit": 0, "missed": 0, "skipped": 0}
    iterations = 0
    while iterations < 20:  # 安全上限
        iterations += 1
        rows = (
            sb.table("quack_predictions")
            .select("id,agent_id,target_symbol,direction,target_price,current_price_at_prediction,deadline,created_at,evidence,status")
            .eq("status", "active")
            .filter("evidence->>backfill_marker", "eq", backfill_marker)
            .limit(PAGE)
            .execute()
        )
        batch = rows.data or []
        if not batch:
            break

        updates: list[dict] = []
        skipped_in_batch = 0
        for pred in batch:
            try:
                u = settle_prediction(pred, today)
                if u:
                    updates.append(u)
                    total["settled"] += 1
                    total[u["status"]] = total.get(u["status"], 0) + 1
                else:
                    total["skipped"] += 1
                    skipped_in_batch += 1
            except Exception as e:
                log.exception(f"settle {pred.get('id')} failed: {e}")
                total["skipped"] += 1
                skipped_in_batch += 1

        for u in updates:
            try:
                sb.table("quack_predictions").update({
                    "status": u["status"],
                    "actual_price_at_deadline": u["actual_price_at_deadline"],
                    "evaluated_at": u["evaluated_at"],
                    "hit_or_miss": u["hit_or_miss"],
                }).eq("id", u["id"]).execute()
            except Exception as e:
                log.warning(f"update {u['id']} failed: {e}")

        # 若整批都 skipped(都還沒到 deadline),就停止避免無限迴圈
        if skipped_in_batch == len(batch):
            break

    return total


# ============================================================================
# Phase 4 — 失敗 learning notes(批次)
# ============================================================================
SYSTEM_PROMPT_LEARNING = """你是「{display_name}」({school})。
你的個性:{personality}
你的口頭禪:{catchphrase}

## 任務
我會給你最近一批失敗的預測(同一檔或同一週),請你以**自己的口吻**做事後檢討。
每筆失敗產生一個 learning_note,包含:
  - context(當時情境,1 句話)
  - mistake(我做錯了什麼,1 句話)
  - lesson(學到的教訓,1 句話)
  - correction_plan(下次怎麼修正,1 句話)

## 鐵律
1. 用你個性的話,不要寫成 ChatGPT 口吻
2. **誠實檢討**,不要甩鍋給「市場太亂」「黑天鵝」這類藉口
3. **具體**:不要只寫「下次更小心」,要說「下次看到 X 訊號,我會加上 Y 條件」
4. lesson 必須有可執行的修正,不是抽象口號
5. JSON only,不准 markdown 代碼塊

## 輸出
{{
  "notes": [
    {{
      "prediction_id": <id>,
      "context": "...",
      "mistake": "...",
      "lesson": "...",
      "correction_plan": "..."
    }}
  ]
}}
"""


def _missed_payload_for_ai(missed: list[dict]) -> list[dict]:
    """把 missed 預測整理成 AI 可讀的精簡格式。"""
    out = []
    for m in missed:
        out.append({
            "id": m["id"],
            "date": (m.get("created_at") or "")[:10],
            "symbol": m.get("target_symbol"),
            "name": m.get("target_name"),
            "direction": m.get("direction"),
            "target_price": m.get("target_price"),
            "current_price": m.get("current_price_at_prediction"),
            "actual_close": m.get("actual_price_at_deadline"),
            "confidence": m.get("confidence"),
            "reasoning": (m.get("reasoning") or "")[:200],
        })
    return out


def generate_learning_notes_batch(agent_id: str, missed_chunk: list[dict]) -> list[dict]:
    """單一 AI call 處理 N 筆 missed → 回 N 筆 learning_notes。"""
    profile = ANALYSTS[agent_id]
    system = SYSTEM_PROMPT_LEARNING.format(
        display_name=profile["display_name"],
        school=profile["school"],
        personality=profile["personality"],
        catchphrase="、".join(profile["catchphrase"]),
    )
    payload = _missed_payload_for_ai(missed_chunk)
    user = f"""以下是你最近失敗的 {len(payload)} 筆預測,請逐筆給 learning_note:
{json.dumps(payload, ensure_ascii=False, indent=2)}

每筆都要有對應 prediction_id 的 note。"""

    msg = _client().messages.create(
        model=MODEL,
        max_tokens=2500,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    raw = msg.content[0].text.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
    data = json.loads(raw)
    return data.get("notes", [])


def write_learning_notes_for_agent(agent_id: str, batch_size: int = 8, max_notes: int = 200) -> dict:
    """為某分析師的 missed 預測批次產 learning_notes 並寫入 agent_learning_notes。"""
    sb = _sb()
    # 撈 missed 但還沒有 learning_note 的(透過 evidence 標記)
    rows = (
        sb.table("quack_predictions")
        .select("id,target_symbol,target_name,direction,target_price,current_price_at_prediction,actual_price_at_deadline,confidence,reasoning,created_at,evidence")
        .eq("agent_id", agent_id)
        .eq("status", "missed")
        .order("created_at", desc=True)
        .limit(max_notes)
        .execute()
    )
    missed = rows.data or []
    # 過濾掉「evidence 已標記 learning_note_done」的
    missed = [m for m in missed if not (m.get("evidence") or {}).get("learning_note_done")]

    total = {"missed": len(missed), "notes_written": 0, "batches": 0}
    log.info(f"{agent_id} missed: {len(missed)}, will batch {batch_size} per call")

    for i in range(0, len(missed), batch_size):
        chunk = missed[i:i + batch_size]
        try:
            notes = generate_learning_notes_batch(agent_id, chunk)
            for note in notes:
                pred_id = note.get("prediction_id")
                # 寫 agent_learning_notes
                payload = {
                    "agent_id": agent_id,
                    "prediction_id": pred_id,
                    "context": (note.get("context") or "")[:500],
                    "mistake": (note.get("mistake") or "")[:500],
                    "lesson": (note.get("lesson") or "")[:800],
                    "correction_plan": (note.get("correction_plan") or "")[:500],
                    "applied": False,
                }
                try:
                    sb.table("agent_learning_notes").insert(payload).execute()
                    total["notes_written"] += 1
                except Exception as e:
                    log.warning(f"insert learning_note failed: {e}")
            # 標記原 prediction.evidence.learning_note_done
            for m in chunk:
                try:
                    ev = m.get("evidence") or {}
                    ev["learning_note_done"] = True
                    sb.table("quack_predictions").update({"evidence": ev}).eq("id", m["id"]).execute()
                except Exception:
                    pass
            total["batches"] += 1
            log.info(f"  batch {total['batches']}: {len(notes)} notes written")
            time.sleep(0.5)
        except Exception as e:
            log.exception(f"learning_notes batch failed: {e}")

    return total


# ============================================================================
# Phase 5 — 計算 agent_stats
# ============================================================================
def recompute_agent_stats(agent_id: str, backfill_period_start: date_type, backfill_period_end: date_type) -> dict:
    """從 quack_predictions 計算累積 stats,寫入 agent_stats。"""
    sb = _sb()
    # 全量撈該分析師的所有預測
    rows = (
        sb.table("quack_predictions")
        .select("id,target_symbol,status,created_at")
        .eq("agent_id", agent_id)
        .limit(10000)
        .execute()
    )
    preds = rows.data or []

    total = len(preds)
    hits = sum(1 for p in preds if p.get("status") == "hit")
    missed = sum(1 for p in preds if p.get("status") == "missed")
    cancelled = sum(1 for p in preds if p.get("status") == "cancelled")
    settled = hits + missed
    win_rate = (hits / settled) if settled > 0 else None

    # 90 日內統計(用 backfill_period)
    last_90 = [p for p in preds if p.get("created_at") and p["created_at"][:10] >= backfill_period_start.isoformat()]
    last_90_settled = [p for p in last_90 if p.get("status") in ("hit", "missed")]
    last_90_hits = sum(1 for p in last_90_settled if p.get("status") == "hit")
    last_90_win = (last_90_hits / len(last_90_settled)) if last_90_settled else None

    # 最佳/最差標的(只看 settled 的)
    by_symbol: dict[str, dict] = {}
    for p in preds:
        if p.get("status") not in ("hit", "missed"):
            continue
        sym = p.get("target_symbol")
        if not sym:
            continue
        b = by_symbol.setdefault(sym, {"hits": 0, "total": 0})
        b["total"] += 1
        if p["status"] == "hit":
            b["hits"] += 1
    # 至少要 3 筆樣本才納入考量
    valid_syms = {s: v for s, v in by_symbol.items() if v["total"] >= 3}
    best_sym, best_wr = None, None
    worst_sym, worst_wr = None, None
    if valid_syms:
        sorted_syms = sorted(valid_syms.items(), key=lambda x: x[1]["hits"] / x[1]["total"], reverse=True)
        best_sym = sorted_syms[0][0]
        best_wr = round(sorted_syms[0][1]["hits"] / sorted_syms[0][1]["total"], 4)
        worst_sym = sorted_syms[-1][0]
        worst_wr = round(sorted_syms[-1][1]["hits"] / sorted_syms[-1][1]["total"], 4)

    # 30 日內(以 backfill_period_end 倒推 30 天)
    cutoff_30 = (backfill_period_end - timedelta(days=30)).isoformat()
    last_30 = [p for p in preds if p.get("created_at") and p["created_at"][:10] >= cutoff_30]
    last_30_settled = [p for p in last_30 if p.get("status") in ("hit", "missed")]
    last_30_hits = sum(1 for p in last_30_settled if p.get("status") == "hit")
    last_30_win = (last_30_hits / len(last_30_settled)) if last_30_settled else None

    payload = {
        "agent_id": agent_id,
        "agent_name": ANALYSTS[agent_id]["display_name"],
        "total_predictions": total,
        "hits": hits,
        "misses": missed,
        "cancelled": cancelled,
        "win_rate": round(win_rate, 4) if win_rate is not None else None,
        "best_symbol": best_sym,
        "best_symbol_win_rate": best_wr,
        "worst_symbol": worst_sym,
        "worst_symbol_win_rate": worst_wr,
        "last_30d_predictions": len(last_30),
        "last_30d_win_rate": round(last_30_win, 4) if last_30_win is not None else None,
        "last_90d_predictions": len(last_90),
        "last_90d_win_rate": round(last_90_win, 4) if last_90_win is not None else None,
        "backfill_period_start": backfill_period_start.isoformat(),
        "backfill_period_end": backfill_period_end.isoformat(),
        "last_updated": now_tpe().isoformat(),
    }
    sb.table("agent_stats").update(payload).eq("agent_id", agent_id).execute()
    return payload


# ============================================================================
# Phase 6 — 滾動勝率 timeline
# ============================================================================
def compute_winrate_timeline(agent_id: str, start_date: date_type, end_date: date_type) -> int:
    """計算 [start_date, end_date] 期間每個交易日的滾動勝率,寫入 analyst_winrate_timeline。
    回傳寫入筆數。
    """
    sb = _sb()
    # 撈該分析師所有 settled 預測
    rows = (
        sb.table("quack_predictions")
        .select("id,status,created_at")
        .eq("agent_id", agent_id)
        .in_("status", ["hit", "missed"])
        .order("created_at", desc=False)
        .limit(10000)
        .execute()
    )
    preds = rows.data or []

    # 用「預測產生日(created_at)」作為 timeline 軸
    parsed = []
    for p in preds:
        ca = p.get("created_at")
        if not ca:
            continue
        try:
            d = date_type.fromisoformat(ca[:10])
        except Exception:
            continue
        parsed.append({"date": d, "status": p["status"]})

    parsed.sort(key=lambda x: x["date"])

    # 每日 timeline
    trading_days = get_trading_days(start_date, end_date)
    if not trading_days:
        # fallback: 用日歷日
        trading_days = []
        d = start_date
        while d <= end_date:
            if d.weekday() < 5:
                trading_days.append(d)
            d += timedelta(days=1)

    rows_to_write = []
    cum_hits = 0
    cum_total = 0
    for td in trading_days:
        # 累積:該日(含)以前的所有預測
        cum_preds = [p for p in parsed if p["date"] <= td]
        cum_hits = sum(1 for p in cum_preds if p["status"] == "hit")
        cum_misses = sum(1 for p in cum_preds if p["status"] == "missed")
        cum_total = cum_hits + cum_misses
        cum_wr = round(cum_hits / cum_total, 4) if cum_total > 0 else None

        # 滾動 30 天
        rolling_cutoff = td - timedelta(days=30)
        roll_preds = [p for p in parsed if rolling_cutoff <= p["date"] <= td]
        roll_hits = sum(1 for p in roll_preds if p["status"] == "hit")
        roll_total = len(roll_preds)
        roll_wr = round(roll_hits / roll_total, 4) if roll_total > 0 else None

        rows_to_write.append({
            "agent_id": agent_id,
            "timeline_date": td.isoformat(),
            "rolling_30d_winrate": roll_wr,
            "rolling_30d_predictions": roll_total,
            "cumulative_winrate": cum_wr,
            "cumulative_predictions": cum_total,
            "cumulative_hits": cum_hits,
            "cumulative_misses": cum_misses,
        })

    # upsert
    BATCH = 50
    for i in range(0, len(rows_to_write), BATCH):
        chunk = rows_to_write[i:i + BATCH]
        sb.table("analyst_winrate_timeline").upsert(chunk, on_conflict="agent_id,timeline_date").execute()
    return len(rows_to_write)
