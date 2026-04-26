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

from backend.services.agent_status import get_agent_status as _compute_agent_status
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
    # 決策整合層 — 投資分析師 5 人(v2 全盤分析架構,會被追蹤勝率)
    "analyst_a": {
        "display_name": "辰旭",
        "role": "投資分析師 · 激進派",
        "emoji": "⚔️",
        "department": "投資部門",
        "school": "全盤分析(技術 35% / 籌碼 25% / 題材 20% / 基本面 10% / 量化 10%)",
        "personality": "動能優先,看到突破就敢進、有訊號就動",
        "timeframe": "短線 (5 日 ~ 2 週)",
        "risk": "高 (-9% 停損)",
        "catchphrase": "突破當下就是上車。",
        "tracked": True,
    },
    "analyst_b": {
        "display_name": "靜遠",
        "role": "投資分析師 · 保守派",
        "emoji": "📚",
        "department": "投資部門",
        "school": "全盤分析(基本面 40% / 籌碼 15% / 題材 15% / 量化 15% / 技術 15%)",
        "personality": "估值優先,等便宜才進、貴了寧可不買",
        "timeframe": "中長線 (3 週 ~ 3 月)",
        "risk": "低 (-5% 嚴格停損)",
        "catchphrase": "時間是價值投資最好的朋友。",
        "tracked": True,
    },
    "analyst_c": {
        "display_name": "觀棋",
        "role": "投資分析師 · 跟隨派",
        "emoji": "🔍",
        "department": "投資部門",
        "school": "全盤分析(籌碼 35% / 技術 20% / 題材 20% / 基本面 15% / 量化 10%)",
        "personality": "跟大戶腳印,外資/投信動向是最重要訊號",
        "timeframe": "中線 (2 週 ~ 2 月)",
        "risk": "中 (-7% 停損)",
        "catchphrase": "外資連買 5 天,我認為有點東西。",
        "tracked": True,
    },
    "analyst_d": {
        "display_name": "守拙",
        "role": "投資分析師 · 紀律派",
        "emoji": "🧮",
        "department": "投資部門",
        "school": "全盤分析(量化 35% / 技術 25% / 籌碼 15% / 基本面 15% / 題材 10%)",
        "personality": "機率思維,沒回測過的不碰",
        "timeframe": "短中線 (1 ~ 3 週)",
        "risk": "中低 (-6% 嚴格停損)",
        "catchphrase": "樣本多少?信賴區間多寬?",
        "tracked": True,
    },
    "analyst_e": {
        "display_name": "明川",
        "role": "投資分析師 · 靈活派",
        "emoji": "☯️",
        "department": "投資部門",
        "school": "全盤分析(動態權重,依市況調整 5 面向比例)",
        "personality": "多面向整合,每個面向都看,依市況調整權重",
        "timeframe": "彈性 (1 週 ~ 2 月)",
        "risk": "中 (-7% 停損)",
        "catchphrase": "市況變我就調權重。",
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


@router.get("/agents/_status_all")
async def get_all_agents_status():
    """
    NEXT_TASK_009 階段 2:一次回所有 12 位 agent 的當前 status
    (辦公室首頁輪詢用,省去 12 次請求)。

    註:此路由必須放在 /agents/{agent_id} 之前,否則會被通用路由攔截。

    T3a Defense 4: 統計面端點 — 排除 pre_upgrade / rejected_by_sanity 資料。
    """
    from backend.services.quality_filter import apply_quality_filter

    sb = get_service_client()
    recent_map: dict[str, dict[str, str]] = {}
    try:
        q = (
            sb.table("quack_predictions")
            .select("agent_id,target_symbol,target_name,created_at,evidence")
            .order("created_at", desc=True)
            .limit(200)
        )
        q = apply_quality_filter(q)
        r = q.execute()
        for row in r.data or []:
            aid = row.get("agent_id")
            if aid and aid not in recent_map:
                recent_map[aid] = {
                    "symbol": row.get("target_symbol"),
                    "name": row.get("target_name"),
                }
    except Exception:
        pass

    out = []
    for agent_id in AGENT_PROFILES.keys():
        info = recent_map.get(agent_id, {})
        out.append(
            _compute_agent_status(
                agent_id=agent_id,
                recent_symbol=info.get("symbol"),
                recent_symbol_name=info.get("name"),
            )
        )
    return {"count": len(out), "statuses": out}


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


@router.get("/agents/{agent_id}/status")
async def get_agent_status(agent_id: str):
    """
    NEXT_TASK_009 階段 2:agent 動態 status(規則式 + 模板,0 LLM 呼叫)

    依台北時間規則推算當前 status(thinking/meeting/writing/predicting/
    debating/learning/resting),並從該 agent 最近預測抽 target_symbol
    填入模板讓 status_detail 帶有具體標的感。
    """
    if agent_id not in AGENT_PROFILES:
        raise HTTPException(404, f"Unknown agent_id: {agent_id}")

    # 抓最近 5 筆預測,隨機抽一檔當 status_detail 的 symbol
    recent_symbol = None
    recent_symbol_name = None
    try:
        sb = get_service_client()
        r = (
            sb.table("quack_predictions")
            .select("target_symbol,target_name")
            .eq("agent_id", agent_id)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        rows = r.data or []
        if rows:
            # 取最新一筆(穩定可預測)
            recent_symbol = rows[0].get("target_symbol")
            recent_symbol_name = rows[0].get("target_name")
    except Exception:
        pass

    return _compute_agent_status(
        agent_id=agent_id,
        recent_symbol=recent_symbol,
        recent_symbol_name=recent_symbol_name,
    )
