"""
基本面分析器 — 0-20 分

依 spec 01:
- EPS 為正 4
- EPS 連 2 季成長 4
- 近 3 月營收年增 > 10% 4
- 毛利率 > 15% 或改善中 4
- 自由現金流為正 4

輸入:FinMind TaiwanStockFinancialStatements(財報)
     TaiwanStockMonthRevenue(月營收)—可選
"""

from __future__ import annotations

from typing import Optional

from backend.core.scorer import DimScore, cap


def _extract_latest_eps(fin_data: list[dict]) -> Optional[float]:
    """從財報取最新 EPS(元)。FinMind 欄位 type='EPS',value 為 EPS 值。"""
    eps_rows = [r for r in fin_data if r.get("type") == "EPS"]
    if not eps_rows:
        return None
    eps_rows.sort(key=lambda r: r.get("date", ""))
    return float(eps_rows[-1].get("value") or 0)


def _extract_eps_series(fin_data: list[dict]) -> list[float]:
    """取得 EPS 時序(依日期升冪)。"""
    eps_rows = [r for r in fin_data if r.get("type") == "EPS"]
    eps_rows.sort(key=lambda r: r.get("date", ""))
    return [float(r.get("value") or 0) for r in eps_rows]


def _extract_margin(fin_data: list[dict]) -> Optional[float]:
    """毛利率(%):GrossProfit / Revenue × 100 的近季。"""
    rev_rows = [r for r in fin_data if r.get("type") == "Revenue"]
    gp_rows = [r for r in fin_data if r.get("type") == "GrossProfit"]
    if not rev_rows or not gp_rows:
        return None
    # 取同一季的數字
    rev_rows.sort(key=lambda r: r.get("date", ""))
    gp_rows.sort(key=lambda r: r.get("date", ""))
    rev = float(rev_rows[-1].get("value") or 0)
    gp = float(gp_rows[-1].get("value") or 0)
    if rev <= 0:
        return None
    return gp / rev * 100


def _extract_cash_flow(fin_data: list[dict]) -> Optional[float]:
    """自由現金流(估:營業現金流 - 資本支出)"""
    op_cf = [r for r in fin_data if r.get("type") == "CashFlowsFromOperatingActivities"]
    capex = [r for r in fin_data if r.get("type") == "PropertyAndEquipment"]
    if not op_cf:
        return None
    op_cf.sort(key=lambda r: r.get("date", ""))
    op = float(op_cf[-1].get("value") or 0)
    cx = 0.0
    if capex:
        capex.sort(key=lambda r: r.get("date", ""))
        cx = abs(float(capex[-1].get("value") or 0))
    return op - cx


# ==========================================
# 主入口
# ==========================================
def analyze(
    fin_data: Optional[list[dict]] = None,
    revenue_data: Optional[list[dict]] = None,
) -> DimScore:
    """
    fin_data:FinMind TaiwanStockFinancialStatements
    revenue_data:FinMind TaiwanStockMonthRevenue(可選)

    任何缺少子項的給 0 分。
    """
    details: dict = {}
    warnings: list[str] = []
    total = 0

    # 1. EPS 為正
    if fin_data:
        eps = _extract_latest_eps(fin_data)
        if eps is not None:
            passed = eps > 0
            if passed:
                total += 4
            details["eps_positive"] = {"score": 4 if passed else 0, "eps": eps}
        else:
            details["eps_positive"] = {"score": 0, "note": "無 EPS 資料"}
    else:
        details["eps_positive"] = {"score": 0, "note": "無財報"}

    # 2. EPS 連 2 季成長
    if fin_data:
        eps_series = _extract_eps_series(fin_data)
        if len(eps_series) >= 3:
            growing = eps_series[-1] > eps_series[-2] > eps_series[-3]
            if growing:
                total += 4
            details["eps_growth_2q"] = {
                "score": 4 if growing else 0,
                "recent_3q": eps_series[-3:],
            }
        else:
            details["eps_growth_2q"] = {"score": 0, "note": "EPS 資料不足 3 季"}
    else:
        details["eps_growth_2q"] = {"score": 0, "note": "無財報"}

    # 3. 近 3 月營收年增 > 10%
    if revenue_data:
        revs = sorted(revenue_data, key=lambda r: r.get("date", ""))
        # revenue_year 欄位是 YoY(%)
        recent3 = revs[-3:]
        yoys = [float(r.get("revenue_year", 0) or 0) for r in recent3]
        avg_yoy = sum(yoys) / len(yoys) if yoys else 0
        passed = avg_yoy > 10
        if passed:
            total += 4
        details["revenue_yoy_3m"] = {
            "score": 4 if passed else 0,
            "avg_yoy_pct": round(avg_yoy, 2),
        }
    else:
        details["revenue_yoy_3m"] = {"score": 0, "note": "無月營收資料"}

    # 4. 毛利率 > 15% 或改善中
    if fin_data:
        margin = _extract_margin(fin_data)
        if margin is not None:
            passed = margin > 15
            if passed:
                total += 4
            details["gross_margin"] = {
                "score": 4 if passed else 0,
                "margin_pct": round(margin, 2),
            }
        else:
            details["gross_margin"] = {"score": 0, "note": "無毛利資料"}
    else:
        details["gross_margin"] = {"score": 0}

    # 5. 自由現金流為正
    if fin_data:
        fcf = _extract_cash_flow(fin_data)
        if fcf is not None:
            passed = fcf > 0
            if passed:
                total += 4
            details["free_cash_flow"] = {
                "score": 4 if passed else 0,
                "fcf": fcf,
            }
        else:
            details["free_cash_flow"] = {"score": 0, "note": "無現金流資料"}
    else:
        details["free_cash_flow"] = {"score": 0}

    if total < 8:
        warnings.append("基本面偏弱,多數指標未通過")

    return DimScore(
        name="fundamental",
        score=cap(total, 0, 20),
        details=details,
        warnings=warnings,
    )
