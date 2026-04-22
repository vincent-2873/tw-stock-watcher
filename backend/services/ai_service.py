"""
AI Service — Claude Sonnet 4.5 封裝

原則:
1. 金融分析要求事實 → temperature=0.3
2. 成本保護:每次呼叫記錄 tokens;超過日上限拒絕呼叫(spec 24)
3. 系統 prompt 強制多空平衡(規則 3)
4. 失敗時降級:回傳 fallback 物件,不中斷流程
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from typing import Any, Optional

import anthropic

from backend.utils.logger import get_logger

log = get_logger(__name__)

# 預設模型(可從 env 覆寫)
DEFAULT_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")

# 成本上限(USD/day)— 超過就停呼叫(spec 24)
DAILY_USD_HARD_CAP = float(os.getenv("AI_DAILY_USD_CAP", "5.0"))

# Sonnet 4.5 定價(USD / M tokens)
_MODEL_PRICING = {
    "claude-sonnet-4-5-20250929": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5": {"input": 0.25, "output": 1.25},
}

# 每次呼叫的用量累計(daily)
_daily_cost_usd = 0.0
_daily_reset_epoch = int(time.time() // 86400)


def _reset_daily_if_new_day() -> None:
    global _daily_cost_usd, _daily_reset_epoch
    today = int(time.time() // 86400)
    if today != _daily_reset_epoch:
        _daily_cost_usd = 0.0
        _daily_reset_epoch = today


def _usage_to_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    p = _MODEL_PRICING.get(model, {"input": 3.0, "output": 15.0})
    return (input_tokens * p["input"] + output_tokens * p["output"]) / 1_000_000


@dataclass
class AIResult:
    text: str
    input_tokens: int
    output_tokens: int
    cost_usd: float
    model: str
    parsed: Any = None


class AIService:
    """Claude Messages API 封裝"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        max_output_tokens: int = 1500,
    ):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY", "")
        self.model = model or DEFAULT_MODEL
        self.max_output_tokens = max_output_tokens
        if not self.api_key:
            log.warning("ANTHROPIC_API_KEY 未設定,AI 功能停用")
            self._client = None
        else:
            self._client = anthropic.Anthropic(api_key=self.api_key)

    # ==========================================
    # 核心
    # ==========================================
    def complete(
        self,
        user_prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.3,
        force_json: bool = False,
    ) -> AIResult:
        """
        最基本的呼叫。若 force_json=True 會在 prompt 附 JSON 指示並嘗試解析。
        """
        global _daily_cost_usd
        _reset_daily_if_new_day()
        if _daily_cost_usd >= DAILY_USD_HARD_CAP:
            log.warning(f"AI 每日成本已達上限 ${DAILY_USD_HARD_CAP},拒絕呼叫")
            return AIResult("", 0, 0, 0, self.model, parsed=None)

        if self._client is None:
            return AIResult("", 0, 0, 0, self.model, parsed=None)

        if force_json:
            user_prompt += "\n\n請只回傳 JSON(單一物件,無 markdown code fence)。"

        try:
            msg = self._client.messages.create(
                model=self.model,
                max_tokens=self.max_output_tokens,
                system=system or self._default_system(),
                messages=[{"role": "user", "content": user_prompt}],
                temperature=temperature,
            )
            text = msg.content[0].text if msg.content else ""
            in_tok = msg.usage.input_tokens
            out_tok = msg.usage.output_tokens
            cost = _usage_to_usd(self.model, in_tok, out_tok)
            _daily_cost_usd += cost
            log.info(
                f"AI 呼叫 {self.model} in={in_tok} out={out_tok} "
                f"cost=${cost:.4f} daily=${_daily_cost_usd:.4f}"
            )
            parsed = None
            if force_json:
                parsed = self._try_parse_json(text)
            return AIResult(text, in_tok, out_tok, cost, self.model, parsed)
        except Exception as e:
            log.error(f"AI 呼叫失敗: {e}")
            return AIResult("", 0, 0, 0, self.model, parsed=None)

    # ==========================================
    # 多空論點
    # ==========================================
    def bull_bear_case(self, stock_id: str, analysis_summary: str) -> dict:
        """
        強制產出多空論點(spec 規則 3 鐵律)。
        回傳 {bull_case:[...], bear_case:[...]}
        """
        prompt = f"""針對台股 {stock_id},基於下面的分析摘要,列出:

1. 買進論點(5 點):必須有具體數字或事實支撐,不要空泛的「前景看好」
2. 反對論點(5 點):真實的風險、隱憂,特別是「看似好但實際不妙」的訊號

分析摘要:
{analysis_summary}

回傳格式(JSON):
{{
  "bull_case": ["論點 1", "論點 2", ...],
  "bear_case": ["論點 1", "論點 2", ...]
}}
"""
        r = self.complete(prompt, temperature=0.4, force_json=True)
        if r.parsed and isinstance(r.parsed, dict):
            return {
                "bull_case": list(r.parsed.get("bull_case", []))[:5],
                "bear_case": list(r.parsed.get("bear_case", []))[:5],
                "cost_usd": r.cost_usd,
            }
        return {"bull_case": [], "bear_case": [], "cost_usd": r.cost_usd, "error": "AI 解析失敗"}

    # ==========================================
    # 題材面分析
    # ==========================================
    def analyze_catalyst(
        self, stock_id: str, stock_name: str, news_summary: str, industry: str
    ) -> dict:
        """
        題材面評分輔助。回傳布林旗標 + 評分 0-20。
        """
        prompt = f"""針對台股 {stock_id} {stock_name}({industry}),根據下面的近期新聞摘要,回答:

1. 這檔股票是否屬於目前主流題材?(AI 伺服器 / CPO / 電動車 / 重電 / 綠能 ...)
2. 題材是否仍在早期/發酵階段(而非尾聲)?
3. 這家公司是否為題材龍頭?
4. 訂單/營收實質受惠(具體新聞)?
5. 題材可持續性預估(>= 6 個月)?

新聞摘要:
{news_summary}

回傳 JSON:
{{
  "is_mainstream": true/false,
  "is_early_stage": true/false,
  "is_leader": true/false,
  "has_real_benefit": true/false,
  "sustainable_6m": true/false,
  "theme": "題材名稱",
  "reasoning": "50 字內原因"
}}
"""
        r = self.complete(prompt, temperature=0.3, force_json=True)
        default = {
            "is_mainstream": False,
            "is_early_stage": False,
            "is_leader": False,
            "has_real_benefit": False,
            "sustainable_6m": False,
            "theme": "",
            "reasoning": "無 AI 分析結果",
        }
        if r.parsed and isinstance(r.parsed, dict):
            for k in default:
                default[k] = r.parsed.get(k, default[k])
        default["cost_usd"] = r.cost_usd
        return default

    # ==========================================
    # 內部工具
    # ==========================================
    def _default_system(self) -> str:
        return (
            "你是 Vincent Stock Intelligence System 的 AI 金融分析師。"
            "規則:"
            "(1) 所有判斷必須附具體數字或事實;"
            "(2) 永遠多空平衡,不單邊鼓吹;"
            "(3) 信心度最高給 95,保留不確定性;"
            "(4) 使用繁體中文;"
            "(5) 不給「一定會漲/會跌」這種結論。"
        )

    def _try_parse_json(self, text: str) -> Any:
        text = text.strip()
        # 去除 code fence
        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join(l for l in lines if not l.startswith("```"))
        try:
            return json.loads(text)
        except Exception as e:
            log.warning(f"JSON parse 失敗: {e}; text[:120]={text[:120]!r}")
            return None


# 全域預設實例(懶加載)
_default_service: Optional[AIService] = None


def get_ai_service() -> AIService:
    global _default_service
    if _default_service is None:
        _default_service = AIService()
    return _default_service
