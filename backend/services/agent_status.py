"""
Agent 動態 status 規則引擎(NEXT_TASK_009 階段 2)

依「時間 + agent_id」即時推算當前 status。0 LLM 呼叫,純規則 + 模板。

7 個 status:
  thinking / meeting / writing / predicting / debating / learning / resting

時間規則(台北時區):
  平日 07:30-08:00  → meeting    (盤前會議)
  平日 08:00-09:00  → writing    (寫今日預測)
  平日 09:00-13:30  → thinking   (盤中觀察)
  平日 13:30-14:00  → predicting (午盤調整)
  平日 14:00-14:30  → meeting    (盤後會議)
  平日 14:30-15:30  → learning   (檢討今日)
  平日 15:30-18:00  → resting
  平日 18:00-22:00  → debating   (晚間辯論演練)
  平日 22:00-07:30  → resting    (深夜)
  週六              → learning   (週檢討)
  週日              → resting

模板:每個 status 5-10 句,隨機選一句。可含 [symbol] 占位符,由 caller 從該
agent 最近預測的 target_symbol 替換。
"""

from __future__ import annotations

import hashlib
import random
from datetime import datetime
from typing import Optional

from backend.utils.time_utils import now_tpe


VALID_STATUSES = (
    "thinking",
    "meeting",
    "writing",
    "predicting",
    "debating",
    "learning",
    "resting",
)


# ─────────────────────────────────────────────
# 時間規則
# ─────────────────────────────────────────────


def compute_status_by_time(now: Optional[datetime] = None) -> str:
    """純依時間推算 status — 無視 agent_id"""
    t = now or now_tpe()
    weekday = t.weekday()  # 0=Mon ... 6=Sun
    hm = t.hour * 60 + t.minute

    if weekday == 5:  # 週六
        return "learning"
    if weekday == 6:  # 週日
        return "resting"

    # 平日
    if 7 * 60 + 30 <= hm < 8 * 60:
        return "meeting"
    if 8 * 60 <= hm < 9 * 60:
        return "writing"
    if 9 * 60 <= hm < 13 * 60 + 30:
        return "thinking"
    if 13 * 60 + 30 <= hm < 14 * 60:
        return "predicting"
    if 14 * 60 <= hm < 14 * 60 + 30:
        return "meeting"
    if 14 * 60 + 30 <= hm < 15 * 60 + 30:
        return "learning"
    if 18 * 60 <= hm < 22 * 60:
        return "debating"
    return "resting"


# ─────────────────────────────────────────────
# 模板庫
# ─────────────────────────────────────────────


# 通用模板(沒有 agent 個性區分,適用所有 agent)
COMMON_TEMPLATES: dict[str, list[str]] = {
    "thinking": [
        "正在分析 {symbol} 的技術型態",
        "翻閱外資進出統計",
        "查看本週題材熱度",
        "比對近 30 日類似走勢",
        "確認盤中量能變化",
        "檢視大盤指數連動性",
        "等待關鍵價位觸及",
        "對照昨日預測命中與否",
    ],
    "meeting": [
        "在戰情室發言中",
        "聆聽其他分析師意見",
        "與質疑官交鋒中",
        "正在報告今日重點",
        "聽風險管理師複盤",
        "輪到我提出今日看法",
    ],
    "writing": [
        "撰寫 {symbol} 的進場理由",
        "整理今日推薦清單",
        "在預測單寫多空判斷",
        "落筆中,找最關鍵的一句",
        "正在寫信賴區間說明",
        "把 reasoning 整理成 3 點",
    ],
    "predicting": [
        "下單模擬 {symbol} 進場點",
        "確認最後出手的標的",
        "鎖定今日最強訊號",
        "綜合所有面向給出方向",
    ],
    "debating": [
        "與質疑官論戰中",
        "為昨日失敗預測辯護",
        "拆解對手的反駁邏輯",
        "演練明日可能的質疑",
        "覆盤 {symbol} 為何失準",
    ],
    "learning": [
        "檢討昨日失敗的 {symbol}",
        "整理本週學到的教訓",
        "翻閱過去類似情境",
        "更新個人 playbook",
        "記錄新發現的因子",
        "把今日失誤寫進 learning_note",
    ],
    "resting": [
        "今日收盤,沉澱中",
        "閉目養神,讓直覺發酵",
        "讀盤後新聞",
        "暫離戰場",
        "整理桌面,明日再戰",
    ],
}


# 5 位投資分析師的個性化模板覆蓋(若 status 有對應 key 就用,否則 fallback 到 COMMON)
ANALYST_PERSONAL_TEMPLATES: dict[str, dict[str, list[str]]] = {
    "analyst_a": {  # 辰旭 · 激進派
        "thinking": [
            "盯著 {symbol} 的突破缺口",
            "等量能爆出再追",
            "看哪檔今天有強勢動能",
            "找今日當沖標的",
        ],
        "writing": [
            "寫 {symbol} 的攻擊點位",
            "鎖定今日進攻名單",
            "把停損設在 -9% 寫清楚",
        ],
    },
    "analyst_b": {  # 靜遠 · 保守派
        "thinking": [
            "查 {symbol} 的本益比是否合理",
            "看殖利率高不高",
            "比對 5 年 PE 中位數",
            "確認財報沒有地雷",
        ],
        "writing": [
            "把 {symbol} 估值區間寫清楚",
            "整理今日合理價位推薦",
            "在 reasoning 強調安全邊際",
        ],
    },
    "analyst_c": {  # 觀棋 · 跟隨派
        "thinking": [
            "看外資是不是還在連買 {symbol}",
            "翻分點 — 主力券商在進還是在出",
            "比對投信買賣超與股價走勢",
            "找最近三大法人鎖碼的標的",
        ],
        "writing": [
            "寫 {symbol} 的籌碼結構分析",
            "把外資連續性數據放進 reasoning",
        ],
    },
    "analyst_d": {  # 守拙 · 紀律派
        "thinking": [
            "跑 {symbol} 的歷史回測",
            "看樣本數夠不夠下定論",
            "計算信賴區間",
            "驗證因子顯著性",
        ],
        "writing": [
            "把 {symbol} 的 N 與勝率寫進 reasoning",
            "確認停損規則沒被破壞",
        ],
    },
    "analyst_e": {  # 明川 · 靈活派
        "thinking": [
            "依今日市況調整 6 面向權重",
            "看 {symbol} 哪一面向訊號最強",
            "綜合判斷是要進攻還是防守",
        ],
        "writing": [
            "把 {symbol} 的多面向綜評寫清楚",
            "標明今日權重配置變化",
        ],
    },
}


# 部門 agent(評級師、技術分析師等)的特殊化模板
DEPARTMENT_PERSONAL_TEMPLATES: dict[str, dict[str, list[str]]] = {
    "owl_fundamentalist": {
        "thinking": ["翻 {symbol} 最新財報", "比對毛利率變化", "查 ROE 是否還能維持"],
        "writing": ["寫 {symbol} 的基本面評等", "整理本週財報亮點"],
    },
    "hedgehog_technical": {
        "thinking": ["看 {symbol} 的均線排列", "確認量能配合度", "找型態突破點"],
        "writing": ["畫 {symbol} 的關鍵支撐壓力", "標出本週型態警示"],
    },
    "squirrel_chip": {
        "thinking": ["翻分點 {symbol}", "看外資連續買超", "盯主力券商動向"],
        "writing": ["整理今日籌碼異動", "寫主力進出日報"],
    },
    "meerkat_quant": {
        "thinking": ["跑因子顯著性檢定", "回測過去 60 日 {symbol} 樣本"],
        "writing": ["寫量化驗證報告"],
    },
    "fox_skeptic": {
        "thinking": ["挑今日預測的破口", "找邏輯漏洞"],
        "debating": ["拷問投資分析師中", "把對手反駁拆成三段"],
    },
    "pangolin_risk": {
        "thinking": ["盯持倉風險"],
        "learning": ["更新停損手冊"],
    },
}


# ─────────────────────────────────────────────
# 模板渲染
# ─────────────────────────────────────────────


def _seed_for(agent_id: str, status: str, now: datetime) -> int:
    """以 agent_id + status + 5 分鐘區間做 hash seed,
    讓同一 agent 在 5 分鐘內顯示同一句,過 5 分鐘換一句"""
    bucket = now.strftime("%Y%m%d%H") + str(now.minute // 5)
    raw = f"{agent_id}|{status}|{bucket}"
    return int(hashlib.md5(raw.encode()).hexdigest()[:8], 16)


def render_status_detail(
    agent_id: str,
    status: str,
    symbol: Optional[str] = None,
    symbol_name: Optional[str] = None,
    now: Optional[datetime] = None,
) -> str:
    """挑模板並填入 symbol。

    優先序:agent 個性化 > 部門個性化 > 通用。
    """
    t = now or now_tpe()

    # 找模板 pool
    pool: list[str] = []
    if agent_id in ANALYST_PERSONAL_TEMPLATES:
        pool = ANALYST_PERSONAL_TEMPLATES[agent_id].get(status, [])
    elif agent_id in DEPARTMENT_PERSONAL_TEMPLATES:
        pool = DEPARTMENT_PERSONAL_TEMPLATES[agent_id].get(status, [])

    if not pool:
        pool = COMMON_TEMPLATES.get(status, ["靜默觀察中"])

    # 5 分鐘區間穩定挑一句
    rng = random.Random(_seed_for(agent_id, status, t))
    template = rng.choice(pool)

    # 填 symbol(若模板含 {symbol})
    if "{symbol}" in template:
        if symbol_name and symbol:
            display = f"{symbol} {symbol_name}"
        elif symbol:
            display = symbol
        else:
            display = "市場標的"
        template = template.replace("{symbol}", display)

    return template


def get_agent_status(
    agent_id: str,
    recent_symbol: Optional[str] = None,
    recent_symbol_name: Optional[str] = None,
    now: Optional[datetime] = None,
) -> dict:
    """完整的 status 物件 — 給 endpoint 直接回傳"""
    t = now or now_tpe()
    status = compute_status_by_time(t)
    detail = render_status_detail(agent_id, status, recent_symbol, recent_symbol_name, t)
    return {
        "agent_id": agent_id,
        "status": status,
        "status_detail": detail,
        "status_updated_at": t.isoformat(),
    }
