# 🧠 決策引擎規格書

> 這是系統的大腦。所有推薦都經過這裡。

---

## 核心目標

把一檔股票的所有資料,經過**四層篩選 + 五維評分**,產出:
- 推薦結論(強烈買進 / 買進 / 關注 / 觀望 / 避開)
- 信心度(0-100%)
- 完整證據鏈
- 多空論點
- 風險警示

---

## 四層篩選架構

### Layer 0:**先決條件檢查**(不通過就淘汰)

```python
def layer_0_prerequisite_check(stock_id: str) -> bool:
    """
    先決條件 - 不通過就不分析
    """
    checks = {
        "是否為上市/上櫃": check_is_listed(stock_id),
        "是否為異常股": not check_is_abnormal(stock_id),
        "是否停止交易": not check_is_halted(stock_id),
        "日均成交量": check_volume_sufficient(stock_id, min_volume=1000),
        "上市時間": check_listed_over_months(stock_id, months=6),
    }
    
    failed = [k for k, v in checks.items() if not v]
    if failed:
        logger.info(f"{stock_id} 未通過先決條件: {failed}")
        return False
    return True
```

**不通過的例子:**
- 主力操縱警示股
- 全額交割股
- 剛上市不到 6 個月
- 日均成交量 < 1000 張

---

### Layer 1:**基本面檢查**(必要條件)

```python
def layer_1_fundamental_check(stock_id: str) -> dict:
    """
    基本面篩選 - 決定是否值得深入分析
    
    Returns:
        {
            "passed": bool,
            "score": 0-20,
            "details": {...}
        }
    """
    data = get_fundamental_data(stock_id)
    
    criteria = {
        "EPS 為正": data['eps'] > 0,                          # +4
        "EPS 連 2 季成長": check_eps_growth(data, quarters=2), # +4
        "近 3 月營收年增 > 10%": data['rev_yoy_3m'] > 10,      # +4
        "毛利率 > 15% 或 改善中": (
            data['gross_margin'] > 15 or
            data['gross_margin_improving']
        ),                                                    # +4
        "自由現金流為正": data['free_cash_flow'] > 0,          # +4
    }
    
    score = sum(4 for v in criteria.values() if v)
    passed = score >= 12  # 至少 60% 通過
    
    return {
        "passed": passed,
        "score": score,
        "max_score": 20,
        "details": criteria,
        "data_snapshot": data
    }
```

---

### Layer 2:**籌碼面評分**

```python
def layer_2_chip_analysis(stock_id: str) -> dict:
    """
    籌碼面評分 (0-20 分)
    """
    data = get_chip_data(stock_id, days=10)
    
    scoring = {
        "外資近 5 日買超": {
            "weight": 5,
            "score": calc_foreign_score(data['foreign_net_buy_5d']),
        },
        "投信近 5 日買超": {
            "weight": 4,
            "score": calc_investment_trust_score(data),
        },
        "主力集中度 (健康範圍)": {
            "weight": 4,
            "score": calc_concentration_score(data['top5_concentration']),
        },
        "融資變化 (不過熱)": {
            "weight": 4,
            "score": calc_margin_score(data['margin_change_pct']),
        },
        "無隔日沖主力進場": {
            "weight": 3,
            "score": check_no_short_term_traders(data),
        },
    }
    
    total_score = sum(s['score'] for s in scoring.values())
    
    return {
        "score": total_score,
        "max_score": 20,
        "details": scoring,
        "warnings": detect_chip_warnings(data),
    }
```

**隔日沖主力清單**(系統必須維護這個清單):
```python
OVERNIGHT_TRADER_BROKERS = {
    "9100": "凱基-台北",
    "9600": "凱基-信義",
    "9800": "元大-松山",
    # ... (系統需自動更新)
}
```

---

### Layer 3:**技術面評分**

```python
def layer_3_technical_analysis(stock_id: str) -> dict:
    """
    技術面評分 (0-20 分)
    """
    price_data = get_price_data(stock_id, days=120)
    
    scoring = {
        "均線多頭排列": {
            "weight": 5,
            "score": check_ma_bullish_alignment(price_data),
        },
        "成交量健康 (價漲量增)": {
            "weight": 4,
            "score": check_volume_price_relationship(price_data),
        },
        "相對強弱 RS": {
            "weight": 4,
            "score": calc_rs_score(stock_id),  # vs 大盤
        },
        "技術型態": {
            "weight": 4,
            "score": detect_chart_pattern(price_data),
        },
        "支撐/壓力位置": {
            "weight": 3,
            "score": evaluate_support_resistance(price_data),
        },
    }
    
    return aggregate_scores(scoring)
```

---

### Layer 4:**題材面評分**

```python
def layer_4_catalyst_analysis(stock_id: str) -> dict:
    """
    題材面評分 (0-20 分)
    """
    # 從新聞 + AI 分析
    news = get_recent_news(stock_id, days=14)
    industry = get_stock_industry(stock_id)
    
    ai_analysis = ai_service.analyze_catalyst(
        stock_id=stock_id,
        news=news,
        industry=industry
    )
    
    scoring = {
        "屬於主流題材": ai_analysis['is_mainstream'],   # +5
        "題材仍在發酵 (非尾聲)": ai_analysis['is_early_stage'],  # +5
        "公司為題材龍頭": ai_analysis['is_leader'],     # +4
        "訂單/營收實質受惠": ai_analysis['has_real_benefit'],  # +3
        "題材期至少 6 個月": ai_analysis['sustainability'],  # +3
    }
    
    return aggregate_scores(scoring)
```

---

### Layer 5:**市場狀態調整**

```python
def layer_5_market_regime_adjustment(base_score: int) -> dict:
    """
    根據當前市場狀態調整
    """
    regime = detect_market_regime()
    
    adjustments = {
        "多頭趨勢": +5,
        "盤整": 0,
        "空頭趨勢": -10,
        "高波動": -5,
        "低波動": +3,
        "系統性風險 (VIX > 30)": -15,
    }
    
    total_adjustment = sum(
        adjustments[state] 
        for state in regime['states']
    )
    
    return {
        "regime": regime,
        "adjustment": total_adjustment,
        "final_score": base_score + total_adjustment
    }
```

---

## 總分與結論對應

```python
def score_to_recommendation(score: int) -> str:
    """
    總分 → 推薦等級
    """
    if score >= 85:
        return "強烈買進", "🔥"
    elif score >= 70:
        return "買進", "✅"
    elif score >= 55:
        return "關注", "⚡"
    elif score >= 40:
        return "觀望", "⚠️"
    else:
        return "避開", "❌"
```

---

## 信心度計算

```python
def calculate_confidence(all_scores: dict) -> int:
    """
    信心度 = 各維度的平衡度
    
    原則:
    - 某個維度特別高 ≠ 高信心
    - 每個維度都過水準 = 高信心
    """
    scores = [
        all_scores['fundamental'] / 20,
        all_scores['chip'] / 20,
        all_scores['technical'] / 20,
        all_scores['catalyst'] / 20,
    ]
    
    # 平均分
    avg = sum(scores) / len(scores)
    
    # 標準差 (越小越一致 → 越有信心)
    std = calculate_std(scores)
    
    # 信心度公式
    base_confidence = avg * 100
    consistency_bonus = max(0, 20 - std * 100)  # 越一致加越多
    
    confidence = min(95, base_confidence + consistency_bonus)
    
    # 不給超過 95%(永遠保留不確定性)
    return round(confidence)
```

---

## 多空論點生成

```python
async def generate_bull_bear_case(
    stock_id: str, 
    analysis: dict
) -> dict:
    """
    強制 AI 產生多空平衡論點
    """
    bull_prompt = f"""
    基於以下資料,列出 {stock_id} 的 5 個支持買進理由:
    {analysis}
    
    要求:
    - 每個理由都要有具體數字支撐
    - 不要空泛的「前景看好」
    - 優先列出「其他人可能忽略」的點
    """
    
    bear_prompt = f"""
    基於以下資料,列出 {stock_id} 的 5 個反對買進理由:
    {analysis}
    
    要求:
    - 不要為了反對而反對
    - 找真實的風險和隱憂
    - 特別注意「基本面看似好但實際不妙」的訊號
    """
    
    bull_case = await ai_service.complete(bull_prompt)
    bear_case = await ai_service.complete(bear_prompt)
    
    return {
        "bull_case": parse_points(bull_case),
        "bear_case": parse_points(bear_case),
    }
```

---

## 完整輸出格式

```python
{
    "stock_id": "2317",
    "stock_name": "鴻海",
    "timestamp": "2026-04-22T08:30:00+08:00",
    
    # 總結
    "recommendation": "關注",
    "recommendation_emoji": "⚡",
    "confidence": 75,
    "total_score": 67,
    
    # 詳細評分
    "scores": {
        "fundamental": {"score": 18, "max": 20, "passed": true},
        "chip": {"score": 16, "max": 20},
        "technical": {"score": 15, "max": 20},
        "catalyst": {"score": 18, "max": 20},
        "market_adjustment": -2
    },
    
    # 多空論點
    "bull_case": [
        "AI 題材主流,鴻海是 ODM 龍頭",
        "外資連 5 日買超,累計 85 億",
        "3月營收年增 45%,創同期新高",
        "配息 7.2 元創高,殖利率 3.4%",
        "Nvidia NVL72 機櫃 9 成市占"
    ],
    "bear_case": [
        "毛利率僅 6%,外資評價受限",
        "已漲半年,題材鈍化風險",
        "緯創、廣達是直接競爭",
        "大盤若修正,權值股首當其衝",
        "今年 EPS 預期已充分反映"
    ],
    
    # 操作建議
    "action_plan": {
        "entry": {
            "ideal_price": 210,
            "acceptable_max": 213,
            "do_not_chase_above": 215
        },
        "stop_loss": {
            "conservative": 205,  # -3.8%
            "standard": 202,      # -5.2%
            "aggressive": 200     # -6.1%
        },
        "take_profit": {
            "first": 221,    # +4% 出 1/3
            "second": 229,   # +8% 出 1/3
            "third": 237,    # +11% 出剩下
            "risk_reward_ratio": "1:3"
        },
        "position_size": {
            "conservative": "總資金 3%",
            "standard": "總資金 5%",
            "aggressive": "總資金 7%"
        },
        "time_stop": "30 天未漲 3% 退出",
        "strategy_fail_triggers": [
            "外資連 3 日賣超 → 立即出",
            "跌破月線 + 量放大 → 立即出",
            "Nvidia 訂單負面消息 → 立即出"
        ]
    },
    
    # 資料快照(追溯用)
    "data_snapshot": {
        "current_price": 213,
        "volume": 41762000,
        "5_day_foreign_net_buy": 8500000000,
        "monthly_revenue_yoy": 45.6,
        "ma_5": 208,
        "ma_20": 205,
        "rsi_14": 68,
        ...
    },
    
    # 監控警訊
    "monitoring_signals": [
        {
            "trigger": "外資連 3 日賣超",
            "action": "降級為觀望"
        },
        {
            "trigger": "Nvidia 盤後 -3%",
            "action": "預警,次日開盤觀察"
        },
        {
            "trigger": "突破 220 但量不足",
            "action": "警告,可能假突破"
        }
    ],
    
    # 學習提示(教育性)
    "learning_points": [
        "這是『跟漲』不是『領漲』(類股漲 1.5%,個股漲 2.4%)",
        "AI 題材已發酵半年,注意鈍化風險",
        "毛利率低為何還被看好:因為營收規模夠大"
    ],
    
    # 追蹤設定
    "follow_up": {
        "next_check_dates": ["2026-04-29", "2026-05-22", "2026-07-21"],
        "tracking_id": "rec_20260422_2317_001"
    },
    
    # 免責聲明
    "disclaimer": "本建議僅供參考,不構成投資建議。投資有風險,請自行評估。"
}
```

---

## 異常情境處理

### 情境 1:資料不足

```python
if not enough_data:
    return {
        "recommendation": "資料不足,無法分析",
        "confidence": 0,
        "reason": "xx 資料缺失",
        "retry_after": "等 x 天後重新分析"
    }
```

### 情境 2:AI 失敗

```python
try:
    ai_result = await ai_service.analyze(...)
except AIServiceError:
    # 降級為規則式分析
    logger.warning("AI 失敗,使用規則式邏輯")
    return rule_based_analysis(...)
```

### 情境 3:資料互相矛盾

```python
if fundamental_score > 18 and chip_score < 5:
    # 基本面好但籌碼差
    return {
        "recommendation": "矛盾訊號,觀望",
        "confidence": 30,
        "warning": "基本面強但法人不買,可能有未公開訊息"
    }
```
