"""
題材面分析器 — 0-20 分

依 spec 01:
- 屬於主流題材 5
- 題材仍在早期(非尾聲)5
- 公司為題材龍頭 4
- 訂單/營收實質受惠 3
- 題材期至少 6 個月 3

做法:用 AIService.analyze_catalyst() 取得 5 個布林,累計分數。
輸入:stock_id、stock_name、industry、news_summary(字串)
"""

from __future__ import annotations

from backend.core.scorer import DimScore, cap
from backend.services.ai_service import get_ai_service


def analyze(
    stock_id: str,
    stock_name: str,
    industry: str,
    news_summary: str,
) -> DimScore:
    """根據 AI 的題材判讀打分。"""
    if not news_summary:
        return DimScore(
            name="catalyst",
            score=0,
            details={"note": "無近期新聞可分析"},
            warnings=["題材面缺資料,無法評分"],
        )

    ai = get_ai_service()
    result = ai.analyze_catalyst(stock_id, stock_name, news_summary, industry)

    weights = {
        "is_mainstream": 5,
        "is_early_stage": 5,
        "is_leader": 4,
        "has_real_benefit": 3,
        "sustainable_6m": 3,
    }
    total = 0
    breakdown: dict = {}
    for k, w in weights.items():
        v = bool(result.get(k))
        s = w if v else 0
        total += s
        breakdown[k] = {"score": s, "hit": v}

    warnings = []
    if not result.get("is_mainstream"):
        warnings.append("不屬於主流題材,短線動能有限")
    if not result.get("is_early_stage") and result.get("is_mainstream"):
        warnings.append("題材已進入尾聲,謹防追高")

    return DimScore(
        name="catalyst",
        score=cap(total, 0, 20),
        details={
            **breakdown,
            "theme": result.get("theme"),
            "reasoning": result.get("reasoning"),
            "ai_cost_usd": result.get("cost_usd", 0),
        },
        warnings=warnings,
    )
