"""
/api/agents — 分析師名冊與績效(透明度 = 商業價值)

依據 SYSTEM_CONSTITUTION.md Section 4 (部門架構) + Section 5 (預測系統):
  使用者訂閱的理由之一 = 所有分析師勝率公開。
  本 endpoint 回 12 個 agent 的名冊 + 累計戰績。
  讓前端 /agents 頁直接用。
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from backend.utils.supabase_client import get_service_client

router = APIRouter()


# 12 agent 的「身份核心」(對應 ceo-desk/context/agents/*_MEMORY.md)
# 這裡放「展示給使用者看」的 persona 摘要,詳細人設在 MEMORY.md
AGENT_PROFILES: dict[str, dict[str, Any]] = {
    # 所主
    "guagua": {
        "display_name": "呱呱",
        "role": "所主",
        "emoji": "🦆",
        "department": "投資部門總司令",
        "school": "綜合整合 · 投資部門主持",
        "personality": "穩重、毒舌、溫暖",
        "timeframe": "多週期",
        "risk": "平衡",
        "catchphrase": "吶,這情境我見過三次,兩次賺一次賠。",
        "tracked": True,  # 被追蹤勝率
    },
    # 資訊生產層(4 部門主管,產情報不做預測)
    "owl_fundamentalist": {
        "display_name": "評級師",
        "role": "基本面部門主管",
        "emoji": "🦉",
        "department": "基本面部門",
        "school": "PE / ROE / 毛利率 · 巴菲特信徒",
        "personality": "保守、重長期",
        "timeframe": "長線",
        "risk": "低",
        "catchphrase": "數字不會騙人,但會遲到。",
        "tracked": False,  # 情報部門不被追蹤預測勝率
    },
    "hedgehog_technical": {
        "display_name": "技術分析師",
        "role": "技術面部門主管",
        "emoji": "📊",
        "department": "技術面部門",
        "school": "道氏理論 / 均線 / 型態 / 量能",
        "personality": "毒舌、直接、短中線",
        "timeframe": "短中線",
        "risk": "中",
        "catchphrase": "線圖不會騙人,騙人的是看線圖的人。",
        "tracked": False,
    },
    "squirrel_chip": {
        "display_name": "籌碼觀察家",
        "role": "籌碼面部門主管",
        "emoji": "📡",
        "department": "籌碼面部門",
        "school": "三大法人 / 大戶 / 分點 / 融資券",
        "personality": "眼尖、多疑",
        "timeframe": "短中線",
        "risk": "中",
        "catchphrase": "主力不會騙我太久。",
        "tracked": False,
    },
    "meerkat_quant": {
        "display_name": "量化科學家",
        "role": "量化部門主管",
        "emoji": "🧑‍🔬",
        "department": "量化部門",
        "school": "回測 / 因子模型 / 統計顯著性",
        "personality": "冷靜、克制",
        "timeframe": "依訊號",
        "risk": "依樣本",
        "catchphrase": "沒有回測的主觀判斷 = 猜測。",
        "tracked": False,
    },
    # 監督學習層
    "fox_skeptic": {
        "display_name": "質疑官",
        "role": "逆向部門主管",
        "emoji": "🦊",
        "department": "逆向部門",
        "school": "挑破口 / 壓力測試",
        "personality": "冷酷、犀利",
        "timeframe": "N/A",
        "risk": "N/A",
        "catchphrase": "沒有漏洞的論點 = 還沒被仔細看。",
        "tracked": False,  # 追辯論勝率,另計
    },
    "pangolin_risk": {
        "display_name": "風險管理師",
        "role": "風控部門主管",
        "emoji": "🧘",
        "department": "風控部門",
        "school": "停損 / 壓力測試 / 持倉上限",
        "personality": "溫和、堅決",
        "timeframe": "多週期",
        "risk": "極低",
        "catchphrase": "活下去比賺錢重要。",
        "tracked": False,
    },
    # 決策整合層 — 投資分析師 5 人(會被追蹤勝率)
    "analyst_a": {
        "display_name": "辰旭",
        "role": "投資分析師 · 技術派",
        "emoji": "⚔️",
        "department": "投資部門",
        "school": "55% 技術 + 30% 籌碼 + 15% 基本面",
        "personality": "直接、毒舌、快",
        "timeframe": "短中線 (1 日 ~ 4 週)",
        "risk": "中",
        "catchphrase": "量先行,價在後。",
        "tracked": True,
    },
    "analyst_b": {
        "display_name": "靜遠",
        "role": "投資分析師 · 基本面派",
        "emoji": "📚",
        "department": "投資部門",
        "school": "60% 基本面 + 20% 量化 + 20% 籌碼",
        "personality": "慢、穩、不追熱度",
        "timeframe": "中長線 (2 週 ~ 12 月)",
        "risk": "低",
        "catchphrase": "時間是價值投資最好的朋友。",
        "tracked": True,
    },
    "analyst_c": {
        "display_name": "觀棋",
        "role": "投資分析師 · 籌碼派",
        "emoji": "🔍",
        "department": "投資部門",
        "school": "55% 籌碼 + 25% 技術 + 20% 基本面",
        "personality": "眼尖、多疑、會偷笑",
        "timeframe": "短中線 (3 日 ~ 2 月)",
        "risk": "中高",
        "catchphrase": "價格會騙人,籌碼不會騙人。",
        "tracked": True,
    },
    "analyst_d": {
        "display_name": "守拙",
        "role": "投資分析師 · 量化派",
        "emoji": "🧮",
        "department": "投資部門",
        "school": "60% 量化 + 20% 技術 + 20% 籌碼(不看基本面)",
        "personality": "冷、安靜、計算型",
        "timeframe": "依訊號週期",
        "risk": "極低(N≥100 才信)",
        "catchphrase": "我不相信直覺。",
        "tracked": True,
    },
    "analyst_e": {
        "display_name": "明川",
        "role": "投資分析師 · 綜合派",
        "emoji": "☯️",
        "department": "投資部門",
        "school": "動態四派(依情境調整權重)",
        "personality": "柔軟、善聽、會切換",
        "timeframe": "混合(短/中/長 都做)",
        "risk": "中",
        "catchphrase": "風向對就順勢,風向錯就收手。",
        "tracked": True,
    },
}


@router.get("/agents")
async def list_agents():
    """
    回 12 個 agent 名冊 + 當前績效(從 agent_stats 表)。
    使用者的「透明度」頁面 /agents 用。
    """
    try:
        sb = get_service_client()
        result = sb.table("agent_stats").select("*").execute()
        stats_by_id = {row["agent_id"]: row for row in (result.data or [])}
    except Exception as e:
        # migration 0006 未 apply 或 DB 暫時不通 — 降級回傳,不 fail
        stats_by_id = {}
        db_error = str(e)[:200]
    else:
        db_error = None

    agents = []
    for agent_id, profile in AGENT_PROFILES.items():
        stats = stats_by_id.get(agent_id, {})
        agents.append({
            "agent_id": agent_id,
            **profile,
            "stats": {
                "total_predictions": stats.get("total_predictions", 0),
                "hits": stats.get("hits", 0),
                "misses": stats.get("misses", 0),
                "cancelled": stats.get("cancelled", 0),
                "win_rate": stats.get("win_rate"),  # DECIMAL 0-1 or None
                "best_symbol": stats.get("best_symbol"),
                "best_symbol_win_rate": stats.get("best_symbol_win_rate"),
                "worst_symbol": stats.get("worst_symbol"),
                "last_30d_predictions": stats.get("last_30d_predictions", 0),
                "last_30d_win_rate": stats.get("last_30d_win_rate"),
                "last_updated": stats.get("last_updated"),
            },
        })

    return {
        "count": len(agents),
        "tracked_count": sum(1 for a in agents if a.get("tracked")),
        "agents": agents,
        "db_error": db_error,
    }


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str):
    """取得單一 agent 的完整資訊(未來可加近期預測列表)"""
    if agent_id not in AGENT_PROFILES:
        raise HTTPException(404, f"Unknown agent_id: {agent_id}")

    profile = AGENT_PROFILES[agent_id]

    try:
        sb = get_service_client()
        result = sb.table("agent_stats").select("*").eq("agent_id", agent_id).execute()
        stats = (result.data or [{}])[0]
    except Exception:
        stats = {}

    # 近 30 天預測(若 quack_predictions 有新 schema 資料)
    recent_predictions = []
    try:
        sb = get_service_client()
        pred_result = (
            sb.table("quack_predictions")
            .select("*")
            .eq("agent_id", agent_id)
            .order("created_at", desc=True)
            .limit(30)
            .execute()
        )
        recent_predictions = pred_result.data or []
    except Exception:
        pass

    return {
        "agent_id": agent_id,
        **profile,
        "stats": stats,
        "recent_predictions": recent_predictions,
    }
