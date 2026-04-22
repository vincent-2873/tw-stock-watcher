"""
對話式 AI 路由 — Phase 5 spec 18 + 19

端點:
  POST /api/chat  (SSE streaming)

規則:
  - 使用 Claude Sonnet 4.5
  - 系統 prompt 強制多空平衡 + 質疑使用者(spec 19)
  - 繁體中文
  - 每輪呼叫要累積 daily cost (共用 ai_service 的日上限)
"""

from __future__ import annotations

import json
import os
import time
from typing import Any, Literal, Optional

import anthropic
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.utils.logger import get_logger

log = get_logger(__name__)

router = APIRouter()

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")
MAX_TURNS = 20  # 單次對話最多訊息數(保護 token)


SYSTEM_PROMPT = """你是 Vincent Stock Intelligence System(VSIS)的 AI 夥伴 + 教練。

身份定位:
- 你不是「順從的助手」,你是「救使用者不被自己騙」的夥伴
- 平時討論切磋(朋友),危險時攔他一把(教練),他做對時肯定(夥伴),他做錯時指正(老師)

鐵律(不得違反):
1. 所有判斷必須附具體數字或事實,不要空泛敘述
2. 永遠多空平衡,強制給出反對論點 — 即使使用者很 bullish/bearish
3. 信心度最高 95%,永遠保留不確定性
4. 使用繁體中文,股票用 6 位數代號(如 2330 台積電)
5. 絕不說「一定會漲/一定會跌」這種結論
6. 絕不給「買點 / 賣點」的精確價位,只給「情境判斷」
7. 不鼓勵信用交易、當沖、追高殺低
8. 主動質疑使用者的情緒化決策 — 看到「FOMO / 攤平 / 梭哈 / 賭一把 / 跟風」就要停下來反問

回應格式:
- 簡潔,直接切重點,不要過多前言
- 有結論時,必提多空兩面
- 有具體股票時,提供數據點(EPS、毛利、K線位置、籌碼方向)
- 使用者若問「要不要買」→ 反問他的理由 + 給他 5 個反對論點 + 風險控管(停損、部位)

記住:你的目標不是讓他開心,是讓他變成會判斷的投資人。"""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=MAX_TURNS)
    stock_context: Optional[dict[str, Any]] = None  # 若從個股頁進入,帶上該股資料


def _build_system_with_context(stock_context: Optional[dict]) -> str:
    base = SYSTEM_PROMPT
    if not stock_context:
        return base
    parts = ["\n\n---\n當前對話脈絡(使用者正在看這檔股票):"]
    for k, v in stock_context.items():
        if v is None:
            continue
        if isinstance(v, (dict, list)):
            v = json.dumps(v, ensure_ascii=False)
        parts.append(f"- {k}: {v}")
    return base + "\n".join(parts)


@router.post("/chat")
async def chat(req: ChatRequest):
    """對話式 AI(SSE streaming)。每個 event 是一行 data: {...}\\n\\n"""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(500, detail="ANTHROPIC_API_KEY 未設定")

    client = anthropic.Anthropic(api_key=api_key)
    system = _build_system_with_context(req.stock_context)
    messages = [{"role": m.role, "content": m.content} for m in req.messages]

    def event_stream():
        start = time.time()
        total_in = 0
        total_out = 0
        try:
            with client.messages.stream(
                model=MODEL,
                max_tokens=2000,
                system=system,
                messages=messages,
                temperature=0.5,
            ) as stream:
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
                f"elapsed={elapsed:.2f}s turns={len(messages)}"
            )
        except Exception as e:
            log.exception("chat stream 失敗")
            err_payload = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(err_payload, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 關掉 nginx buffer
        },
    )


@router.get("/chat/health")
async def chat_health():
    """確認 AI 端點可用 — 不實際呼叫 Claude,只檢查 key 有設"""
    return {
        "ok": bool(os.getenv("ANTHROPIC_API_KEY")),
        "model": MODEL,
    }
