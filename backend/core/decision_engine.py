"""
決策引擎 — VSIS 的大腦

整合四個 analyzers + risk_calculator + position_sizer + AI,
產出完整帶證據的推薦。

外部呼叫:
    engine = DecisionEngine()
    result = engine.analyze("2317")
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import date, timedelta
from typing import Any, Optional

from backend.analyzers import catalyst as catalyst_analyzer
from backend.analyzers import chip as chip_analyzer
from backend.analyzers import fundamental as fundamental_analyzer
from backend.analyzers import technical as technical_analyzer
from backend.core.position_sizer import PositionPlan, size_position
from backend.core.risk_calculator import RiskLevels, calculate_risk_levels
from backend.core.scorer import DimScore, OverallScore, aggregate
from backend.services.ai_service import get_ai_service
from backend.services.finmind_service import FinMindService
from backend.services.fmp_service import FMPService
from backend.utils.logger import get_logger
from backend.utils.time_utils import now_tpe

log = get_logger(__name__)


@dataclass
class AnalysisResult:
    stock_id: str
    stock_name: str
    market: str                  # TW / US
    timestamp: str
    score: OverallScore
    risk: Optional[RiskLevels]
    position: Optional[PositionPlan]
    bull_case: list[str] = field(default_factory=list)
    bear_case: list[str] = field(default_factory=list)
    data_snapshot: dict = field(default_factory=dict)
    disclaimer: str = (
        "本分析為資訊整理與量化評分,非投資建議。"
        "股市有風險,投資需謹慎,請自行負責。"
    )


class DecisionEngine:
    """
    決策引擎 — 負責串起所有 analyzers + AI,產出 AnalysisResult。
    """

    def __init__(
        self,
        finmind: Optional[FinMindService] = None,
        fmp: Optional[FMPService] = None,
    ):
        self.finmind = finmind or FinMindService()
        self.fmp = fmp or FMPService()
        self.ai = get_ai_service()

    # ==========================================
    # 主 API
    # ==========================================
    def analyze(
        self,
        stock_id: str,
        *,
        account_size: float = 1_000_000,
        skip_ai: bool = False,
        price_window_days: int = 180,
        news_summary: Optional[str] = None,
    ) -> AnalysisResult:
        """
        完整分析一檔股票。

        Args:
            stock_id: 股票代號(如 "2317")
            account_size: 帳戶規模(用於 position sizer,預設 100 萬)
            skip_ai: 跳過 AI 分析(節省成本/測試用)
            price_window_days: 拉多少天的歷史資料
            news_summary: 如果已經爬好新聞摘要直接傳入;否則暫用 stock_name

        Returns:
            AnalysisResult
        """
        log.info(f"🧠 開始分析 {stock_id}")
        start_date = (date.today() - timedelta(days=price_window_days)).isoformat()

        # ==========================================
        # 1. 抓資料(所有都可能失敗,失敗給空)
        # ==========================================
        price_data, price_meta = self.finmind.get_stock_price(stock_id, start_date)
        inst_data, _ = self.finmind.get_institutional_investors(stock_id, start_date)
        margin_data, _ = self.finmind.get_margin_short(stock_id, start_date)
        broker_daily: list[dict] = []  # 分點資料日期需最近交易日,略過以免多打一次 API
        fin_data: list[dict] = []
        try:
            fin_data, _ = self.finmind.get_financial_statements(stock_id, start_date)
        except Exception:
            pass

        # 大盤資料(台股加權)
        bench_data, _ = self.finmind.get_stock_price("TAIEX", start_date)

        stock_name = self._guess_stock_name(stock_id, price_data)
        industry = ""  # Phase 7 會補

        log.info(
            f"{stock_id} 資料筆數: 價量={len(price_data)} 三大法人={len(inst_data)} "
            f"融資={len(margin_data)} 財報={len(fin_data)}"
        )

        # ==========================================
        # 2. 四象限評分
        # ==========================================
        tech_score = technical_analyzer.analyze(price_data, benchmark_data=bench_data)
        chip_score = chip_analyzer.analyze(inst_data, broker_daily, margin_data)
        fund_score = fundamental_analyzer.analyze(fin_data)

        # 題材面需要 AI,可跳過
        if skip_ai or not news_summary:
            catalyst_score = DimScore(
                name="catalyst",
                score=0,
                details={"note": "跳過 AI 題材分析(skip_ai=True 或無新聞摘要)"},
            )
        else:
            catalyst_score = catalyst_analyzer.analyze(
                stock_id, stock_name, industry, news_summary
            )

        # ==========================================
        # 3. 市場狀態判斷(簡化版:看大盤 20 日報酬)
        # ==========================================
        regime_states = self._detect_market_regime(bench_data)

        # ==========================================
        # 4. 聚合總分
        # ==========================================
        overall = aggregate(
            fundamental=fund_score,
            chip=chip_score,
            technical=tech_score,
            catalyst=catalyst_score,
            regime_states=regime_states,
        )

        # ==========================================
        # 5. 停損停利 + 部位
        # ==========================================
        risk = calculate_risk_levels(price_data) if price_data else None
        position = None
        if risk:
            position = size_position(
                account_size=account_size,
                entry_price=risk.entry_price,
                stop_loss_price=risk.stop_loss_price,
                risk_pct=2.0,
            )

        # ==========================================
        # 6. 多空論點(AI)
        # ==========================================
        bull_case: list[str] = []
        bear_case: list[str] = []
        if not skip_ai and overall.total_score >= 40:
            summary = self._build_analysis_summary(
                stock_id, stock_name, overall, tech_score, chip_score, fund_score
            )
            bb = self.ai.bull_bear_case(stock_id, summary)
            bull_case = bb.get("bull_case", [])
            bear_case = bb.get("bear_case", [])

        # ==========================================
        # 7. 包裝結果
        # ==========================================
        snapshot: dict = {
            "last_close": price_data[-1].get("close") if price_data else None,
            "last_volume": price_data[-1].get("Trading_Volume") if price_data else None,
            "last_date": price_data[-1].get("date") if price_data else None,
            "price_window_days": price_window_days,
            "fetched_at": price_meta.fetched_at.isoformat() if price_meta else None,
        }

        result = AnalysisResult(
            stock_id=stock_id,
            stock_name=stock_name,
            market="TW",
            timestamp=now_tpe().isoformat(),
            score=overall,
            risk=risk,
            position=position,
            bull_case=bull_case,
            bear_case=bear_case,
            data_snapshot=snapshot,
        )
        log.info(
            f"✅ {stock_id} {stock_name} 分析完成: "
            f"{overall.recommendation_emoji} {overall.recommendation} "
            f"score={overall.total_score} conf={overall.confidence}%"
        )
        return result

    # ==========================================
    # 工具
    # ==========================================
    def _guess_stock_name(self, stock_id: str, price_data: list[dict]) -> str:
        """從 FinMind 結果猜股名;也可之後改為查 TaiwanStockInfo。"""
        known = {
            "2317": "鴻海", "2330": "台積電", "2454": "聯發科",
            "2882": "國泰金", "2881": "富邦金",
            "2303": "聯電", "2412": "中華電", "0050": "元大台灣50",
        }
        if stock_id in known:
            return known[stock_id]
        return stock_id

    def _detect_market_regime(self, bench_data: list[dict]) -> list[str]:
        """簡化市場狀態:看大盤 20 日報酬 + 近期波動"""
        if not bench_data or len(bench_data) < 20:
            return ["sideways"]
        closes = [float(r.get("close") or 0) for r in bench_data]
        last = closes[-1]
        prev20 = closes[-20]
        ret_20d = (last - prev20) / prev20 * 100 if prev20 else 0

        states = []
        if ret_20d > 5:
            states.append("bullish_trend")
        elif ret_20d < -5:
            states.append("bearish_trend")
        else:
            states.append("sideways")

        # 波動:近 20 日標準差 / 平均
        recent = closes[-20:]
        avg = sum(recent) / len(recent)
        var = sum((c - avg) ** 2 for c in recent) / len(recent)
        stdev_pct = (var ** 0.5) / avg * 100 if avg else 0
        if stdev_pct > 3:
            states.append("high_volatility")
        elif stdev_pct < 1:
            states.append("low_volatility")
        return states

    def _build_analysis_summary(
        self,
        stock_id: str,
        stock_name: str,
        overall: OverallScore,
        tech: DimScore,
        chip: DimScore,
        fund: DimScore,
    ) -> str:
        """把量化分析結果轉成給 AI 看的摘要字串"""
        lines = [
            f"股票: {stock_id} {stock_name}",
            f"總分: {overall.total_score}/95 ({overall.recommendation_emoji} {overall.recommendation})",
            f"信心度: {overall.confidence}%",
            f"基本面: {fund.score}/20 — {fund.details}",
            f"籌碼面: {chip.score}/20 — {chip.details}",
            f"技術面: {tech.score}/20 — {tech.details}",
            f"市場狀態調整: {overall.market_adjustment}",
            f"警示: {', '.join(tech.warnings + chip.warnings + fund.warnings) or '無'}",
        ]
        return "\n".join(lines)


# 懶加載實例
_engine: Optional[DecisionEngine] = None


def get_engine() -> DecisionEngine:
    global _engine
    if _engine is None:
        _engine = DecisionEngine()
    return _engine


def result_to_dict(result: AnalysisResult) -> dict[str, Any]:
    """把 AnalysisResult 轉 JSON 可序列化 dict"""
    return {
        "stock_id": result.stock_id,
        "stock_name": result.stock_name,
        "market": result.market,
        "timestamp": result.timestamp,
        "recommendation": result.score.recommendation,
        "recommendation_emoji": result.score.recommendation_emoji,
        "total_score": result.score.total_score,
        "confidence": result.score.confidence,
        "base_score": result.score.base_score,
        "market_adjustment": result.score.market_adjustment,
        "regime": result.score.regime,
        "evidence": {
            "fundamental": {"score": result.score.fundamental.score, "details": result.score.fundamental.details, "warnings": result.score.fundamental.warnings},
            "chip": {"score": result.score.chip.score, "details": result.score.chip.details, "warnings": result.score.chip.warnings},
            "technical": {"score": result.score.technical.score, "details": result.score.technical.details, "warnings": result.score.technical.warnings},
            "catalyst": {"score": result.score.catalyst.score, "details": result.score.catalyst.details, "warnings": result.score.catalyst.warnings},
        },
        "risk": asdict(result.risk) if result.risk else None,
        "position": asdict(result.position) if result.position else None,
        "bull_case": result.bull_case,
        "bear_case": result.bear_case,
        "data_snapshot": result.data_snapshot,
        "disclaimer": result.disclaimer,
    }
