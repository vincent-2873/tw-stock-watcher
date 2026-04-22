# 📊 盤後解析引擎規格書

> 每日 14:30 台股收盤後執行,產出完整的盤後報告

---

## 執行時程

```
📅 每日 14:30 台北時間

14:30 - 台股收盤
14:35 - 開始抓取今日收盤資料
14:45 - 三大法人資料公布(證交所)
15:00 - 分點資料公布
15:15 - AI 深度分析
15:30 - 產生盤後報告
15:35 - LINE 推播 + Email
```

---

## 報告內容結構

### 第 1 部分:**市場總覽**

```python
{
    "market_summary": {
        "taiex": {
            "close": 37605,
            "change": 287,
            "change_pct": 0.77,
            "volume": 4523,  # 億
            "up_count": 856,
            "down_count": 421,
            "unchanged": 123,
        },
        "otc": {...},  # 櫃買
        "tpex": {...},  # 興櫃
        
        "market_breadth": {
            "advance_decline_ratio": 2.03,  # 漲家/跌家
            "up_volume_pct": 68,  # 上漲股成交量占比
            "new_high_count": 45,  # 創新高家數
            "new_low_count": 12,  # 創新低家數
        }
    }
}
```

### 第 2 部分:**三大法人**

```python
{
    "institutional": {
        "foreign": {
            "net_buy": 28750,  # 億
            "buy_top10": [...],
            "sell_top10": [...],
            "consecutive_days": 6,  # 連 6 日買超
        },
        "investment_trust": {
            "net_buy": 3520,
            "top_buys": [...],
        },
        "dealer": {
            "net_buy": -1280,  # 自營商
        },
        "combined": 30990
    }
}
```

### 第 3 部分:**產業資金流向**

```python
{
    "sector_flow": {
        "inflow": [
            {"sector": "AI 伺服器", "amount": 125.3, "leaders": ["鴻海", "廣達"]},
            {"sector": "半導體", "amount": 98.7, "leaders": ["台積電"]},
            ...
        ],
        "outflow": [
            {"sector": "金融", "amount": -35.2, "losers": ["富邦金"]},
            ...
        ],
        "rotation_signal": "資金從防禦股轉向成長股(偏多訊號)"
    }
}
```

### 第 4 部分:**籌碼變化**

```python
{
    "chip_analysis": {
        "margin_change": {
            "total": 1875,  # 融資餘額
            "change_pct": 1.3,
            "interpretation": "散戶信心略增"
        },
        "short_selling": {
            "total": 5.5,  # 萬張
            "change_ratio": 8.2,  # 券資比
        },
        "margin_call_risk": 158,  # 融資維持率
        
        "concentrated_stocks": [
            # 籌碼集中度異常的股票
            {"stock": "華邦電", "concentration": 78, "warning": "主力集中"},
        ]
    }
}
```

### 第 5 部分:**熱門股深度分析**

```python
{
    "hot_stocks": [
        {
            "rank": 1,
            "stock_id": "2317",
            "stock_name": "鴻海",
            "change_pct": 2.4,
            "volume": 41762,  # 張
            "volume_vs_avg": 1.5,  # 1.5 倍日均
            
            "why_it_moved": {
                "ai_analysis": """
今日鴻海上漲主因有三:
1. Nvidia 昨夜 +2.3%,帶動 AI 供應鏈
2. 外資連 6 日買超,累計 85 億
3. 法人預期 Q1 財報優於預期

但要注意:
- 已漲半年,高位震盪
- 短線賣壓在 220 元
""",
                "catalysts": ["AI", "Nvidia 合作", "財報預期"],
            },
            
            "tomorrow_outlook": {
                "direction": "偏多",
                "resistance": 220,
                "support": 205,
                "key_watch": "美股台積電 ADR 今夜表現"
            }
        }
    ]
}
```

### 第 6 部分:**Vincent 的自選股表現**

```python
{
    "watchlist_performance": [
        {
            "stock_id": "2317",
            "name": "鴻海",
            "change_pct": 2.4,
            "my_cost": 210,  # 如果有設定成本
            "unrealized_pnl": 1.4,  # 未實現
            "analyst_comment": "符合預期,繼續持有",
            "action_required": None
        },
        {
            "stock_id": "2344",
            "name": "華邦電",
            "change_pct": -3.2,
            "my_cost": 26,
            "unrealized_pnl": -7.8,
            "analyst_comment": "接近你的停損價 24,需注意",
            "action_required": "考慮停損或等明日觀察"
        }
    ]
}
```

### 第 7 部分:**異常股警示**

```python
{
    "anomalies": [
        {
            "stock_id": "xxxx",
            "type": "隔日沖大量買超",
            "broker": "凱基-台北",
            "amount": 8200,
            "warning": "明日開盤可能倒貨"
        },
        {
            "stock_id": "yyyy",
            "type": "籌碼過度集中",
            "concentration": 85,
            "warning": "流動性風險"
        }
    ]
}
```

### 第 8 部分:**明日觀察清單**

```python
{
    "tomorrow_watch": {
        "bullish_candidates": [
            {
                "stock": "xxx",
                "reason": "量能放大突破壓力 + 外資連買",
                "entry_if": "開盤拉回不破 xxx",
                "target": "xxx",
                "stop": "xxx"
            }
        ],
        "bearish_alerts": [
            {
                "stock": "yyy",
                "reason": "隔日沖主力進場,要警戒倒貨",
                "action": "若有持股,考慮明日減碼"
            }
        ],
        "key_events": [
            "明日 xxx 公司法說會",
            "美國 FOMC 會議結果"
        ]
    }
}
```

### 第 9 部分:**Vincent 的學習要點**

```python
{
    "learning_points": {
        "today_highlights": [
            "今日 AI 族群領漲,但鴻海漲幅(2.4%)< 廣達(4.5%)",
            "→ 教訓:同族群要挑最強,不要挑最貴",
        ],
        "reflection_questions": [
            "如果你今天有持倉,是主動執行還是被動等待?",
            "你今天有沒有追高漲停股?為什麼?",
        ],
        "pattern_recognition": [
            "今日類股輪動:金融 → 科技",
            "歷史上這種輪動通常持續 2-3 週"
        ]
    }
}
```

---

## LINE 推播格式(精簡版)

由於 LINE 字數限制,推播會是「精華版」:

```
📊 盤後速報 (14:35)

━━━━━━━━━━━━━━━━━━━━━━━

📈 加權指數:37,605 (+287, +0.77%)
 成交量:4,523 億(放大)
 漲家 856 / 跌家 421

🏦 法人動態:
 外資 +287.5 億 (連 6 買)
 投信 +35.2 億 (連 3 買)
 自營 -12.8 億

🔥 熱門族群:
 1. AI 伺服器 +125 億
 2. 半導體 +98 億
 3. 記憶體 +42 億

💼 你的自選股:
 🟢 鴻海 +2.4% → 繼續持有
 🔴 華邦電 -3.2% → 接近停損
 🟢 台達電 +1.8%
 ⚠️ 聯電 +0.5%(相對弱勢)

🔮 明日觀察:
 正面:xxx, yyy
 警示:zzz(隔日沖)

🎓 今日教訓:
 AI 族群要挑最強的,不要挑最貴的

━━━━━━━━━━━━━━━━━━━━━━━

[查看完整報告]
```

---

## Web UI 的完整報告頁

LINE 是精簡版,完整版在網頁看。

### 頁面結構

```
🗓 2026/04/22 盤後報告

[導覽]
├─ 市場總覽
├─ 三大法人
├─ 產業資金流向
├─ 籌碼變化
├─ 熱門股分析 (5 檔)
├─ 我的自選股
├─ 異常警示
├─ 明日觀察
└─ 學習要點

(每個區塊可以摺疊/展開)
```

### 視覺化重點

- **產業資金流向:桑基圖(Sankey)**
  - 左邊:外資、投信、自營
  - 右邊:產業類別
  - 連線粗細 = 金額

- **籌碼集中度:熱力圖**
  - X 軸:股票
  - Y 軸:時間(近 5 日)
  - 顏色:集中度

- **自選股表現:卡片式**
  - 每檔一張卡
  - 綠/紅色
  - 一眼看完狀況

---

## 演算法重點

### 演算法 1:為什麼今日某檔股票漲/跌?

```python
async def why_did_it_move(stock_id: str) -> str:
    """
    AI 分析個股異動原因
    """
    context = gather_all_context(stock_id)
    
    prompt = f"""
請分析 {stock_id} 今日為何 {change_pct}%。

資料:
- 今日成交:{context['volume']}
- 5 日日均:{context['avg_5d']}
- 外資:{context['foreign_flow']}
- 投信:{context['it_flow']}
- 今日新聞:{context['news']}
- 同業表現:{context['peers']}
- 類股:{context['sector']}
- 大盤:{context['market']}

請用 3 個重點解釋(每點一句),然後:
1. 真正的原因(按影響程度排序)
2. 明日會怎樣?
3. 可能的風險

回答用繁體中文,簡潔有力。
"""
    
    return await claude_api.complete(prompt)
```

### 演算法 2:明日預測

```python
async def predict_tomorrow(stock_id: str) -> dict:
    """
    基於多個因子預測明日方向
    """
    factors = {
        "us_market_tonight": 0,  # 會在盤後更新
        "tsm_adr": 0,
        "today_momentum": calculate_momentum(stock_id),
        "chip_trend": analyze_chip_trend(stock_id),
        "news_sentiment": analyze_news_sentiment(stock_id),
        "sector_strength": get_sector_strength(stock_id),
        "technical_signal": get_technical_signal(stock_id),
    }
    
    # 加權計算
    weights = {
        "us_market_tonight": 0.25,
        "tsm_adr": 0.20,
        "today_momentum": 0.15,
        "chip_trend": 0.15,
        "news_sentiment": 0.10,
        "sector_strength": 0.10,
        "technical_signal": 0.05,
    }
    
    score = sum(factors[k] * weights[k] for k in factors)
    
    return {
        "direction": "up" if score > 0 else "down",
        "confidence": abs(score) * 100,
        "factors_breakdown": factors
    }
```

### 演算法 3:異常偵測

```python
def detect_post_market_anomalies() -> list[dict]:
    """
    盤後尋找異常
    """
    anomalies = []
    
    # 1. 爆量但價平
    # → 可能有未來訊號
    stocks_with_flat_huge_volume = find_stocks(
        volume_ratio > 3,
        abs(change_pct) < 1
    )
    
    # 2. 逆勢大漲/大跌
    # → 大盤漲但這檔跌(或反之)
    counter_trend_stocks = find_counter_trend_stocks()
    
    # 3. 尾盤拉尾/殺尾
    end_of_day_anomalies = find_end_of_day_moves()
    
    # 4. 主力高度集中
    concentrated_stocks = find_highly_concentrated()
    
    return anomalies
```
