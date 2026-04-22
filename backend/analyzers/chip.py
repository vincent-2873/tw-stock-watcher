"""
籌碼面分析器 — 0-20 分

依 spec 01:
- 外資近 5 日買超 5
- 投信近 5 日買超 4
- 主力集中度(健康範圍)4
- 融資變化(不過熱)4
- 無隔日沖主力進場 3

輸入:FinMind TaiwanStockInstitutionalInvestorsBuySell 多筆(至少 10 日)
    [{date, stock_id, name, buy, sell}, ...]
    name 常見值:"Foreign_Investor" / "Investment_Trust" / "Dealer_Self" ...
"""

from __future__ import annotations

from collections import defaultdict
from typing import Optional

from backend.core.scorer import DimScore, cap, linear_map


def _aggregate_by_date(
    institutional: list[dict],
) -> dict[str, dict[str, int]]:
    """
    聚合:{date: {foreign: net, invt: net, dealer: net}}
    net = buy - sell (張 = 股/1000)
    """
    out: dict[str, dict[str, int]] = defaultdict(lambda: {"foreign": 0, "invt": 0, "dealer": 0})
    for r in institutional:
        date = r.get("date")
        if not date:
            continue
        name = (r.get("name") or "").lower()
        net = (int(r.get("buy", 0)) - int(r.get("sell", 0))) // 1000
        if "foreign" in name or "外資" in name or "外陸" in name:
            out[date]["foreign"] += net
        elif "trust" in name or "投信" in name:
            out[date]["invt"] += net
        elif "dealer" in name or "自營" in name:
            out[date]["dealer"] += net
    return dict(out)


def score_foreign_5d(by_date: dict[str, dict[str, int]]) -> tuple[int, dict]:
    """外資近 5 日累積買超。"""
    dates = sorted(by_date.keys())[-5:]
    net_5d = sum(by_date[d]["foreign"] for d in dates)
    # 1000 張 → 1 分;5000 張以上 → 5 分;負則 0 分
    if net_5d <= 0:
        return 0, {"foreign_net_5d": net_5d}
    score = int(linear_map(net_5d, 500, 5000, 1, 5))
    return cap(score, 0, 5), {"foreign_net_5d": net_5d, "days": len(dates)}


def score_invt_5d(by_date: dict[str, dict[str, int]]) -> tuple[int, dict]:
    """投信近 5 日買超。"""
    dates = sorted(by_date.keys())[-5:]
    net_5d = sum(by_date[d]["invt"] for d in dates)
    if net_5d <= 0:
        return 0, {"invt_net_5d": net_5d}
    score = int(linear_map(net_5d, 100, 2000, 1, 4))
    return cap(score, 0, 4), {"invt_net_5d": net_5d}


def score_concentration(broker_daily: Optional[list[dict]]) -> tuple[int, dict]:
    """
    主力集中度:前 5 大券商買超 / 總買超 的比例。
    健康範圍 30-55%(有主力但不過度集中)。

    如果沒有分點資料,給中性 2 分。
    """
    if not broker_daily:
        return 2, {"note": "無分點資料,預設中性"}
    total_buy = sum(int(r.get("buy", 0)) for r in broker_daily)
    if total_buy == 0:
        return 2, {"note": "當日無買量"}
    top5 = sorted(broker_daily, key=lambda r: int(r.get("buy", 0)), reverse=True)[:5]
    top5_buy = sum(int(r.get("buy", 0)) for r in top5)
    ratio = top5_buy / total_buy
    # 30-55% 最佳(4 分);>75% 過度集中(1 分);<20% 散沒主力(1 分)
    if 0.30 <= ratio <= 0.55:
        return 4, {"top5_ratio": round(ratio, 3)}
    if 0.20 <= ratio < 0.30 or 0.55 < ratio <= 0.70:
        return 3, {"top5_ratio": round(ratio, 3)}
    if ratio < 0.20 or 0.70 < ratio <= 0.85:
        return 2, {"top5_ratio": round(ratio, 3)}
    return 1, {"top5_ratio": round(ratio, 3), "warning": "過度集中"}


def score_margin_change(margin_data: Optional[list[dict]]) -> tuple[int, dict]:
    """
    融資變化(不過熱)。
    融資餘額近 5 日增加 > 10% 視為過熱扣分;-5% ~ +5% 最佳。

    FinMind TaiwanStockMarginPurchaseShortSale: MarginPurchaseTodayBalance
    """
    if not margin_data or len(margin_data) < 5:
        return 2, {"note": "資料不足"}
    recent = margin_data[-5:]
    first = int(recent[0].get("MarginPurchaseTodayBalance", 0))
    last = int(recent[-1].get("MarginPurchaseTodayBalance", 0))
    if first == 0:
        return 2, {"note": "無融資資料"}
    change_pct = (last - first) / first * 100
    if -5 <= change_pct <= 5:
        return 4, {"margin_change_5d_pct": round(change_pct, 2)}
    if -10 <= change_pct < -5 or 5 < change_pct <= 10:
        return 3, {"margin_change_5d_pct": round(change_pct, 2)}
    if 10 < change_pct <= 20:
        return 2, {"margin_change_5d_pct": round(change_pct, 2), "warning": "融資增加過快"}
    if -15 <= change_pct < -10:
        return 2, {"margin_change_5d_pct": round(change_pct, 2)}
    return 1, {"margin_change_5d_pct": round(change_pct, 2), "warning": "融資變動劇烈"}


# 常見隔日沖券商代號(未來需動態更新)
OVERNIGHT_BROKERS = {
    "9100",  # 凱基-台北
    "9600",  # 凱基-信義
    "9800",  # 元大-松山
    "9217",  # 凱基-總公司
    "9A9B",  # 光和-大直
    "9A9V",  # 光和-三重
}


def score_no_overnight_trader(broker_daily: Optional[list[dict]]) -> tuple[int, dict]:
    """前 5 大買方是否有隔日沖券商?"""
    if not broker_daily:
        return 3, {"note": "無分點資料,假設無隔日沖"}
    top5 = sorted(broker_daily, key=lambda r: int(r.get("buy", 0)), reverse=True)[:5]
    # FinMind securities_trader 欄位是文字「凱基-松山」,需 code 比對
    hits = [
        r.get("securities_trader", "")
        for r in top5
        if any(kw in (r.get("securities_trader") or "") for kw in ["凱基", "光和", "元大-松山"])
    ]
    if hits:
        return 1, {"overnight_detected": hits, "warning": "前 5 有隔日沖券商"}
    return 3, {"overnight_detected": []}


# ==========================================
# 主入口
# ==========================================
def analyze(
    institutional_data: list[dict],
    broker_daily: Optional[list[dict]] = None,
    margin_data: Optional[list[dict]] = None,
) -> DimScore:
    """
    institutional_data: FinMind TaiwanStockInstitutionalInvestorsBuySell 多日
    broker_daily: FinMind TaiwanStockTradingDailyReport 當日(可選)
    margin_data: FinMind TaiwanStockMarginPurchaseShortSale 多日(可選)
    """
    if not institutional_data:
        return DimScore(
            name="chip",
            score=0,
            details={"error": "無三大法人資料"},
            warnings=["無法取得籌碼資料,無法評分"],
        )

    by_date = _aggregate_by_date(institutional_data)
    s1, d1 = score_foreign_5d(by_date)
    s2, d2 = score_invt_5d(by_date)
    s3, d3 = score_concentration(broker_daily)
    s4, d4 = score_margin_change(margin_data)
    s5, d5 = score_no_overnight_trader(broker_daily)

    total = s1 + s2 + s3 + s4 + s5

    warnings: list[str] = []
    if d3.get("warning"):
        warnings.append(d3["warning"])
    if d4.get("warning"):
        warnings.append(d4["warning"])
    if d5.get("warning"):
        warnings.append(d5["warning"])

    return DimScore(
        name="chip",
        score=cap(total, 0, 20),
        details={
            "foreign_5d": {"score": s1, **d1},
            "invt_5d": {"score": s2, **d2},
            "concentration": {"score": s3, **d3},
            "margin_change": {"score": s4, **d4},
            "overnight_trader": {"score": s5, **d5},
        },
        warnings=warnings,
    )
