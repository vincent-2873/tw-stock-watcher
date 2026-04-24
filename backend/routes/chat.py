"""
對話式 AI 路由 — Phase 5 spec 18 + 19

端點:
  POST /api/chat         (SSE streaming)
  GET  /api/chat/health  (端點健康檢查)

關鍵鐵律(2026-04-22 強化):
  1. 收到訊息時,先解析出提到的股票(中文名 / 代號),**打即時 API 抓資料**
     絕不讓 AI 用它訓練資料的舊股價(使用者反映華邦電被說成 20 元而實際更高)
  2. system prompt 加入當下 TPE 時間戳記
  3. 所有資料點都帶 fetched_at,過期的資料要標註「⚠️ 舊資料」
"""

from __future__ import annotations

import json
import os
import time
from datetime import timedelta
from typing import Any, Literal, Optional

import anthropic
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.services.finmind_service import FinMindService
from backend.services.stock_resolver import extract_stocks
from backend.utils.logger import get_logger
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)

router = APIRouter()

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")
MAX_TURNS = 20


BASE_SYSTEM = """你是 Vincent Stock Intelligence System(VSIS)的 AI 分析師,名字是「VSIS Analyst」。

## 角色定位
- 20 年台股產業研究經驗,專精半導體供應鏈(台積電、封測、設備、材料)、AI 供應鏈(NVIDIA/AMD/CSP)、PCB/CCL 產業、化學材料、電子零組件
- 你不是順從的助手,是 Vincent 的資深投資夥伴 — 給他最直接、最專業的分析
- 他做對時肯定,做錯時指正,情緒化時拉回理性

## Vincent 的背景(內化)
- AI GO 企業 AI 自動化銷售(台中)
- 投資週期:1 週短波段 + 2 週~1 個月中期
- 偏好產業面 + 供應鏈思維,不追單一個股
- 討厭模糊建議、喜歡具體操作指引

---

## ⚠️ 鐵律(絕對不得違反)

### 【即時資料鐵律】
- 訓練資料裡的股價**一律過時**,禁止使用
- 所有股價、量、技術指標、法人買賣超,**只引用下方「LIVE 資料」區塊**
- LIVE 沒給 → 回答「需要即時查詢」,不准猜、不准用記憶

### 【時間鐵律】
- 所有時間以下方當前 TPE 時間為準
- 美股事件雙時區:02:00 TPE (14:00 ET)

### 【內容鐵律】
1. 所有判斷附具體數字或事實
2. 強制多空平衡 — 主動給反對論點,即使使用者很看多或看空
3. 信心度最高 95%,永遠保留不確定性
4. 絕不說「一定會漲/跌」
5. 每個推薦都要有**買進區 / 目標價 / 停損**三組數字
6. R:R 比至少 1:2 才推薦
7. 連 3 漲以上的股票 → 警示回檔再進,不鼓勵追
8. 注意股 / 處置股 / 新上市 < 90 天 → 排除
9. 不鼓勵信用交易、當沖、追高殺低
10. 看到「FOMO / 攤平 / 梭哈 / 賭一把 / 跟風 / all in」→ 停下來反問,不照做

---

## 回應風格
- **具體 > 模糊**:不說「可能」「或許」「應該」,要說「建議」「避開」「等回檔」
- **數據 > 感覺**:引用 LIVE 資料數字,不憑印象
- **表格呈現**:有多個比較對象時用表格
- **簡潔有力**:開頭 1-2 句直接結論,再展開

## 回應結構範本

### 「要不要買 X?」類問題
```
## 🎯 [明確結論]:建議 / 觀望 / 避開

### 為什麼(催化劑)
- [事件 + 日期]
- ...

### 💼 操作建議
| 持有期 | 買進區 | 目標 | 停損 |
|---|---|---|---|
| 1 週 | ... | ... (+X%) | ... |
| 1 月 | ... | ... (+X%) | ... |

### ⚠️ 反對論點
- ...

### 最終建議
[下一步具體動作]
```

### 個股查詢
```
## 📊 [股號] [股名]

### 🎯 一句話結論:推薦 / 等回檔 / 避開

### 基本面 / 題材面 / 技術面 / 籌碼面(引用 LIVE 資料)

### 💼 操作建議(買進區 / 目標 / 停損)

### ⚠️ 風險
```

### 題材查詢
- 催化劑時間軸 + 供應鏈分層(上中下游)+ 最佳切入點 + 避開清單 + 風險

---

## 特殊情境

1. **連漲追不追** → 明確警告連 X 漲、給乖離率/RSI 數字、提供「還沒漲的補漲股」
2. **FOMO / 情緒化** → 不附和,用數據拉回理性;提醒紀律「即使進場也要設停損」
3. **問大盤方向** → 不預測方向,轉向「產業輪動比大盤更重要」+ 給當前最強題材
4. **資料庫沒有** → 誠實說「這檔 VSIS 還沒建檔」,不編造數字

使用繁體中文。股票用 4 位數代號。記住:你的目標是讓 Vincent 變成會判斷的投資人,不是讓他開心。"""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=MAX_TURNS)
    stock_context: Optional[dict[str, Any]] = None  # 從個股頁進入時帶資料


def _fetch_live_stock_snapshot(stock_id: str, stock_name: str) -> dict:
    """
    打 FinMind 抓當下可用的關鍵資料。回傳給 AI 用的精簡 dict。
    所有欄位都標 fetched_at。
    """
    svc = FinMindService()
    tpe = now_tpe()
    snap: dict[str, Any] = {
        "stock_id": stock_id,
        "stock_name": stock_name,
        "fetched_at_tpe": tpe.isoformat(),
    }

    # 最近 10 個交易日 OHLCV
    try:
        start = (tpe.date() - timedelta(days=20)).isoformat()
        rows, _ = svc.get_stock_price(stock_id, start)
        if rows:
            last5 = rows[-5:]
            latest = rows[-1]
            snap["latest_date"] = latest.get("date")
            snap["latest_close"] = latest.get("close")
            snap["latest_open"] = latest.get("open")
            snap["latest_high"] = latest.get("max") or latest.get("high")
            snap["latest_low"] = latest.get("min") or latest.get("low")
            snap["latest_volume_shares"] = latest.get("Trading_Volume")
            snap["latest_turnover_twd"] = latest.get("Trading_money")
            snap["prev_close"] = rows[-2].get("close") if len(rows) >= 2 else None
            if snap["prev_close"]:
                chg = float(latest["close"]) - float(snap["prev_close"])
                snap["day_change"] = round(chg, 2)
                snap["day_change_pct"] = round(chg / float(snap["prev_close"]) * 100, 2)
            closes = [float(r["close"]) for r in last5 if r.get("close") is not None]
            if closes:
                snap["ma5"] = round(sum(closes) / len(closes), 2)
            snap["last5_ohlcv"] = [
                {
                    "date": r["date"],
                    "close": r["close"],
                    "volume": r.get("Trading_Volume"),
                }
                for r in last5
            ]
    except Exception as e:
        snap["ohlcv_error"] = str(e)[:120]

    # 近 5 日三大法人
    try:
        start = (tpe.date() - timedelta(days=15)).isoformat()
        rows, _ = svc.get_institutional_investors(stock_id, start)
        if rows:
            # 彙總最近一天
            latest_date = max(r["date"] for r in rows)
            today_rows = [r for r in rows if r["date"] == latest_date]
            inst = {"date": latest_date}
            for r in today_rows:
                name = r.get("name", "")
                inst[f"{name}_buy"] = r.get("buy")
                inst[f"{name}_sell"] = r.get("sell")
            snap["institutional_latest"] = inst
    except Exception as e:
        snap["institutional_error"] = str(e)[:120]

    return snap


def _build_system(stock_context: Optional[dict], live_snapshots: list[dict]) -> str:
    tpe = now_tpe()
    tpe_str = tpe.strftime("%Y-%m-%d %H:%M:%S")
    parts = [
        BASE_SYSTEM,
        "",
        "---",
        f"## 當前時間(TPE)",
        f"{tpe_str} · weekday={tpe.strftime('%A')}",
    ]
    if live_snapshots:
        parts.append("")
        parts.append("## LIVE 即時資料(剛剛打 FinMind/Supabase 抓的,請只用這裡的數字)")
        for snap in live_snapshots:
            parts.append("")
            parts.append(f"### {snap.get('stock_id')} {snap.get('stock_name')}")
            parts.append(f"- 最新交易日: {snap.get('latest_date')}")
            parts.append(f"- 收盤: {snap.get('latest_close')} (前日 {snap.get('prev_close')})")
            if snap.get("day_change") is not None:
                parts.append(
                    f"- 漲跌: {snap.get('day_change'):+} ({snap.get('day_change_pct'):+.2f}%)"
                )
            if snap.get("latest_volume_shares") is not None:
                parts.append(f"- 量(股): {snap.get('latest_volume_shares'):,}")
            if snap.get("ma5") is not None:
                parts.append(f"- 5 日均價: {snap.get('ma5')}")
            if snap.get("institutional_latest"):
                inst = snap["institutional_latest"]
                parts.append(f"- 法人(日 {inst.get('date')}): {inst}")
            if snap.get("ohlcv_error"):
                parts.append(f"- ⚠️ OHLCV 抓取失敗: {snap['ohlcv_error']}")

    if stock_context:
        parts.append("")
        parts.append("## 個股頁 context(VSIS 四象限分析)")
        for k, v in stock_context.items():
            if v is None:
                continue
            if isinstance(v, (dict, list)):
                v = json.dumps(v, ensure_ascii=False)
            parts.append(f"- {k}: {v}")

    return "\n".join(parts)


@router.post("/chat")
async def chat(req: ChatRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(500, detail="ANTHROPIC_API_KEY 未設定")

    # 抓最新一則 user 訊息,解析股票 + 打 LIVE 資料
    latest_user = next(
        (m.content for m in reversed(req.messages) if m.role == "user"),
        "",
    )
    live_snapshots: list[dict] = []
    try:
        refs = extract_stocks(latest_user, limit=3)
        for ref in refs:
            snap = _fetch_live_stock_snapshot(ref.stock_id, ref.stock_name)
            live_snapshots.append(snap)
        if refs:
            log.info(
                f"chat 抓即時 {[r.stock_id for r in refs]} "
                f"for query={latest_user[:40]!r}"
            )
    except Exception as e:
        log.warning(f"stock extract / live fetch 失敗(繼續走): {e}")

    # 若 stock_context 裡有 stock_id 但沒在訊息提到,也補抓
    if req.stock_context and req.stock_context.get("stock_id"):
        sid = str(req.stock_context["stock_id"])
        if not any(s["stock_id"] == sid for s in live_snapshots):
            try:
                snap = _fetch_live_stock_snapshot(
                    sid, str(req.stock_context.get("stock_name", ""))
                )
                live_snapshots.append(snap)
            except Exception as e:
                log.warning(f"stock_context live fetch 失敗: {e}")

    client = anthropic.Anthropic(api_key=api_key)
    system = _build_system(req.stock_context, live_snapshots)
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    def event_stream():
        start = time.time()
        total_in = 0
        total_out = 0
        try:
            with client.messages.stream(
                model=MODEL,
                max_tokens=2500,
                system=system,
                messages=messages,
                temperature=0.5,
            ) as stream:
                # 先送一個 meta event 讓前端知道抓了哪些即時
                meta = {
                    "type": "meta",
                    "live_stocks": [
                        {
                            "stock_id": s.get("stock_id"),
                            "stock_name": s.get("stock_name"),
                            "latest_close": s.get("latest_close"),
                            "latest_date": s.get("latest_date"),
                        }
                        for s in live_snapshots
                    ],
                    "tpe_now": now_tpe().isoformat(),
                }
                yield f"data: {json.dumps(meta, ensure_ascii=False)}\n\n"

                for text in stream.text_stream:
                    if text:
                        yield f"data: {json.dumps({'type': 'delta', 'text': text}, ensure_ascii=False)}\n\n"
                final_msg = stream.get_final_message()
                total_in = final_msg.usage.input_tokens
                total_out = final_msg.usage.output_tokens

            elapsed = time.time() - start
            done_payload = {
                "type": "done",
                "input_tokens": total_in,
                "output_tokens": total_out,
                "elapsed_ms": int(elapsed * 1000),
                "model": MODEL,
            }
            yield f"data: {json.dumps(done_payload, ensure_ascii=False)}\n\n"
            log.info(
                f"chat done in={total_in} out={total_out} "
                f"elapsed={elapsed:.2f}s turns={len(messages)} "
                f"live={len(live_snapshots)}"
            )
        except Exception as e:
            log.exception("chat stream 失敗")
            err_payload = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(err_payload, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-store",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chat/health")
async def chat_health():
    """輕量健康檢查 — 只回 in-memory 即時欄位,不碰任何鎖/IO。

    註:resolver 載入狀態移到 GET /api/diag/resolver(避免 chat_health 跟
    resolver reload 搶 threading.Lock 卡 event loop)。
    詳見 night_audit/2026-04-24_P1_health.md C.2。
    """
    return {
        "ok": bool(os.getenv("ANTHROPIC_API_KEY")),
        "model": MODEL,
        "tpe_now": now_tpe().isoformat(),
    }
