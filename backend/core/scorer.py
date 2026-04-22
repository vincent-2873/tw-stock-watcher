"""
四象限評分器 — Phase 2 核心

依 spec 01:
- 基本面 0-20 (fundamental)
- 籌碼面 0-20 (chip)
- 技術面 0-20 (technical)
- 題材面 0-20 (catalyst)
- 市場狀態調整 ±15 (regime)
- 總分 0-95(保留 5 分不確定性)

不直接接觸資料源,由 analyzers 提供分數,此處只做聚合與驗算。
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass, field
from typing import Literal, Optional

RecommendationType = Literal["strong_buy", "buy", "watch", "hold", "avoid"]


@dataclass
class DimScore:
    """單一維度評分"""
    name: str          # "fundamental" / "chip" / "technical" / "catalyst"
    score: int         # 0-20
    max_score: int = 20
    details: dict = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    @property
    def ratio(self) -> float:
        return self.score / self.max_score if self.max_score else 0.0


@dataclass
class OverallScore:
    """完整評分結果"""
    fundamental: DimScore
    chip: DimScore
    technical: DimScore
    catalyst: DimScore
    market_adjustment: int       # -15 ~ +8
    regime: dict                 # 市場狀態描述
    base_score: int              # 四象限加總 0-80
    total_score: int             # base + adjustment,最多 95
    confidence: int              # 0-95
    recommendation: RecommendationType
    recommendation_emoji: str


# ==========================================
# 推薦對應表(spec 01)
# ==========================================
def score_to_recommendation(score: int) -> tuple[RecommendationType, str]:
    if score >= 85:
        return "strong_buy", "🔥"
    if score >= 70:
        return "buy", "✅"
    if score >= 55:
        return "watch", "⚡"
    if score >= 40:
        return "hold", "⚠️"
    return "avoid", "❌"


# ==========================================
# 信心度計算
# ==========================================
def calculate_confidence(dim_scores: list[DimScore]) -> int:
    """
    信心度 = 平均分 * 80 + 一致性紅利 * 20(最多 95)

    高分平均 + 低標準差 → 高信心
    某一項特高但其他低 → 低信心(不對稱)
    """
    ratios = [d.ratio for d in dim_scores]
    if not ratios:
        return 0
    avg = sum(ratios) / len(ratios)
    stdev = statistics.pstdev(ratios) if len(ratios) > 1 else 0.0

    # 基本信心:平均分
    base = avg * 80

    # 一致性紅利:stdev 越小加越多(最多 +20)
    consistency = max(0.0, 20.0 - stdev * 100.0)

    confidence = base + consistency
    return int(max(0, min(95, round(confidence))))


# ==========================================
# 市場狀態調整
# ==========================================
def market_regime_adjustment(regime_states: list[str]) -> int:
    """
    regime_states 可含:"bullish_trend" / "bearish_trend" / "sideways"
                    / "high_volatility" / "low_volatility" / "systemic_risk"
    """
    mapping = {
        "bullish_trend": +5,
        "sideways": 0,
        "bearish_trend": -10,
        "high_volatility": -5,
        "low_volatility": +3,
        "systemic_risk": -15,
    }
    return sum(mapping.get(s, 0) for s in regime_states)


# ==========================================
# 聚合器
# ==========================================
def aggregate(
    fundamental: DimScore,
    chip: DimScore,
    technical: DimScore,
    catalyst: DimScore,
    regime_states: list[str],
    regime_description: Optional[dict] = None,
) -> OverallScore:
    """把 4 個維度 + 市場狀態 聚合為總分。"""
    dims = [fundamental, chip, technical, catalyst]
    base = sum(d.score for d in dims)  # 0-80
    adj = market_regime_adjustment(regime_states)
    total = max(0, min(95, base + adj))
    rec, emoji = score_to_recommendation(total)
    conf = calculate_confidence(dims)
    return OverallScore(
        fundamental=fundamental,
        chip=chip,
        technical=technical,
        catalyst=catalyst,
        market_adjustment=adj,
        regime={"states": regime_states, "description": regime_description or {}},
        base_score=base,
        total_score=total,
        confidence=conf,
        recommendation=rec,
        recommendation_emoji=emoji,
    )


# ==========================================
# 小工具
# ==========================================
def cap(value: int | float, lo: int | float = 0, hi: int | float = 100) -> int:
    """限制在區間內"""
    return int(max(lo, min(hi, value)))


def linear_map(x: float, x_lo: float, x_hi: float, y_lo: float, y_hi: float) -> float:
    """線性映射 x in [x_lo, x_hi] → y in [y_lo, y_hi],超出範圍 clamp。"""
    if x_hi == x_lo:
        return (y_lo + y_hi) / 2
    t = (x - x_lo) / (x_hi - x_lo)
    t = max(0.0, min(1.0, t))
    return y_lo + t * (y_hi - y_lo)
