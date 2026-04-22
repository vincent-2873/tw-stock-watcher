"""
技術面分析器 — 0-20 分

評分項(依 spec 01):
- 均線多頭排列 5
- 量價關係(價漲量增)4
- 相對強弱 RS(vs 大盤) 4
- 技術型態 4
- 支撐/壓力位置 3

輸入:FinMind 日線 dict list
    [{date, open, max, min, close, Trading_Volume}, ...]
輸出:DimScore
"""

from __future__ import annotations

from typing import Optional

from backend.core.scorer import DimScore, cap, linear_map


def _closes(data: list[dict]) -> list[float]:
    return [float(r.get("close") or 0) for r in data if r.get("close")]


def _sma(values: list[float], period: int) -> Optional[float]:
    """回傳最近 period 日的簡單均線。"""
    if len(values) < period:
        return None
    return sum(values[-period:]) / period


def _rsi(values: list[float], period: int = 14) -> Optional[float]:
    if len(values) < period + 1:
        return None
    gains = 0.0
    losses = 0.0
    for i in range(-period, 0):
        delta = values[i] - values[i - 1]
        if delta > 0:
            gains += delta
        else:
            losses += -delta
    avg_gain = gains / period
    avg_loss = losses / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


# ==========================================
# 5 個子評分
# ==========================================
def score_ma_alignment(closes: list[float]) -> tuple[int, dict]:
    """均線多頭排列 0-5 分。MA5 > MA20 > MA60 > MA120。"""
    ma5 = _sma(closes, 5)
    ma20 = _sma(closes, 20)
    ma60 = _sma(closes, 60)
    ma120 = _sma(closes, 120) if len(closes) >= 120 else None

    if not ma5 or not ma20 or not ma60:
        return 0, {"reason": "資料不足 60 日"}

    last = closes[-1]
    score = 0
    # 基本:收盤在 MA5 上
    if last > ma5:
        score += 1
    if ma5 > ma20:
        score += 2
    if ma20 > ma60:
        score += 1
    if ma120 and ma60 > ma120:
        score += 1
    return cap(score, 0, 5), {
        "last_close": last,
        "ma5": round(ma5, 2),
        "ma20": round(ma20, 2),
        "ma60": round(ma60, 2),
        "ma120": round(ma120, 2) if ma120 else None,
    }


def score_volume_price(data: list[dict]) -> tuple[int, dict]:
    """量價關係 0-4。近 5 日「價漲 & 量增」次數越多越好。"""
    if len(data) < 6:
        return 0, {"reason": "資料不足 6 日"}
    good = 0
    for i in range(-5, 0):
        prev = data[i - 1]
        cur = data[i]
        price_up = float(cur.get("close", 0)) > float(prev.get("close", 0))
        vol_up = float(cur.get("Trading_Volume", 0)) > float(prev.get("Trading_Volume", 0))
        if price_up and vol_up:
            good += 1
    return cap(good, 0, 4), {"price_volume_up_days": good}


def score_relative_strength(
    closes: list[float], benchmark_closes: Optional[list[float]] = None
) -> tuple[int, dict]:
    """RS:與大盤 20 日報酬比較。"""
    if len(closes) < 21:
        return 0, {"reason": "不足 20 日"}
    ret = (closes[-1] - closes[-21]) / closes[-21] * 100
    if benchmark_closes and len(benchmark_closes) >= 21:
        bench_ret = (benchmark_closes[-1] - benchmark_closes[-21]) / benchmark_closes[-21] * 100
        excess = ret - bench_ret
        # excess 10% → 4 分,0 → 2 分,-5% → 0
        score = int(linear_map(excess, -5, 10, 0, 4))
        return cap(score, 0, 4), {"return_20d": round(ret, 2), "excess": round(excess, 2)}
    # 無 benchmark → 只看個股絕對報酬
    score = int(linear_map(ret, -5, 15, 0, 4))
    return cap(score, 0, 4), {"return_20d": round(ret, 2)}


def score_pattern(closes: list[float]) -> tuple[int, dict]:
    """簡單型態:突破 20 日高 = 4;盤整 = 2;破底 = 0。"""
    if len(closes) < 21:
        return 0, {"reason": "不足 20 日"}
    recent_high_20 = max(closes[-21:-1])
    recent_low_20 = min(closes[-21:-1])
    last = closes[-1]
    breakout = last > recent_high_20
    breakdown = last < recent_low_20
    if breakout:
        return 4, {"pattern": "20 日高突破", "high": recent_high_20, "last": last}
    if breakdown:
        return 0, {"pattern": "20 日低跌破", "low": recent_low_20, "last": last}
    # 盤整:與中位數比,越高越好
    mid = (recent_high_20 + recent_low_20) / 2
    ratio = (last - recent_low_20) / (recent_high_20 - recent_low_20 + 1e-9)
    score = int(linear_map(ratio, 0, 1, 1, 3))
    return cap(score, 0, 4), {"pattern": "盤整", "position_in_range": round(ratio, 2)}


def score_support_resistance(closes: list[float]) -> tuple[int, dict]:
    """與 60 日均線距離(過熱扣分,接近均線加分)。"""
    ma60 = _sma(closes, 60)
    if not ma60:
        return 0, {"reason": "不足 60 日"}
    last = closes[-1]
    diff_pct = (last - ma60) / ma60 * 100
    # 在 MA60 到 MA60+8% 之間最好(3 分)
    # 超過 +15% 過熱(1 分)
    # 低於 -10% 弱勢(1 分)
    if -2 <= diff_pct <= 8:
        score = 3
    elif -5 <= diff_pct < -2 or 8 < diff_pct <= 12:
        score = 2
    elif 12 < diff_pct <= 20 or -10 <= diff_pct < -5:
        score = 1
    else:
        score = 0
    return cap(score, 0, 3), {"deviation_from_ma60_pct": round(diff_pct, 2)}


# ==========================================
# 主入口
# ==========================================
def analyze(
    price_data: list[dict],
    benchmark_data: Optional[list[dict]] = None,
) -> DimScore:
    """
    回傳 DimScore(name='technical', score 0-20)
    """
    if not price_data or len(price_data) < 20:
        return DimScore(
            name="technical",
            score=0,
            details={"error": f"資料不足(僅 {len(price_data)} 筆)"},
            warnings=["資料過少,無法做技術分析"],
        )

    closes = _closes(price_data)
    bench_closes = _closes(benchmark_data) if benchmark_data else None

    s1, d1 = score_ma_alignment(closes)
    s2, d2 = score_volume_price(price_data)
    s3, d3 = score_relative_strength(closes, bench_closes)
    s4, d4 = score_pattern(closes)
    s5, d5 = score_support_resistance(closes)
    rsi = _rsi(closes)

    total = s1 + s2 + s3 + s4 + s5
    warnings = []
    if rsi is not None and rsi > 80:
        warnings.append(f"RSI {rsi:.0f} 超買,短線拉回風險")
    if rsi is not None and rsi < 20:
        warnings.append(f"RSI {rsi:.0f} 超賣,反彈待確認")

    return DimScore(
        name="technical",
        score=cap(total, 0, 20),
        details={
            "ma_alignment": {"score": s1, **d1},
            "volume_price": {"score": s2, **d2},
            "relative_strength": {"score": s3, **d3},
            "pattern": {"score": s4, **d4},
            "support_resistance": {"score": s5, **d5},
            "rsi14": round(rsi, 1) if rsi else None,
            "last_close": closes[-1] if closes else None,
        },
        warnings=warnings,
    )
