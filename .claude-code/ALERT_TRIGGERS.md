# 🔔 警示觸發清單 · Alert Triggers

## 🎯 核心邏輯

警示系統 = 自動監測 + AI 判斷 + Line 通知

```
條件觸發 → AI 判斷重要度 → 決定是否通知 → 發 Line
```

---

## 📊 警示類別總覽

### 六大類

| 類別 | 說明 | 通知類型 |
|---|---|---|
| 法人類 | 外資 / 投信 / 自營商動態 | 🟡 一般 / 🔴 致命 |
| 股價類 | 自選股 / 焦點股價格異動 | 🟢 到價 / 🔴 致命 |
| 題材類 | 題材熱度變化 | 🟡 一般 |
| 國際類 | 美股 / VIX / 重點人物 | 🔵 情報 / 🔴 致命 |
| 社群類 | PTT / Reddit / X | 🔵 情報 |
| 新聞類 | 重要新聞 | 🔵 情報 |

---

## 💰 法人類警示

### 1.1 外資動態

```javascript
const foreignAlerts = {
  // 連續買超
  '外資連買 3 日': {
    condition: (data) => data.foreign_net_buy_days >= 3,
    importance: 6,
    notify_type: 'general',
  },
  '外資連買 5 日': {
    condition: (data) => data.foreign_net_buy_days >= 5,
    importance: 7,
    notify_type: 'general',
  },
  '外資連買 10 日': {
    condition: (data) => data.foreign_net_buy_days >= 10,
    importance: 9,
    notify_type: 'critical',
  },

  // 連續賣超
  '外資連賣 3 日': {
    condition: (data) => data.foreign_net_sell_days >= 3,
    importance: 6,
  },
  '外資連賣 5 日': {
    condition: (data) => data.foreign_net_sell_days >= 5,
    importance: 7,
  },
  '外資連賣 10 日': {
    condition: (data) => data.foreign_net_sell_days >= 10,
    importance: 9,
  },

  // 單日大額
  '外資單日買超 > 200 億': {
    condition: (data) => data.foreign_daily_net > 200e8,
    importance: 7,
  },
  '外資單日賣超 > 200 億': {
    condition: (data) => data.foreign_daily_net < -200e8,
    importance: 8,
  },
  '外資單日賣超 > 300 億': {
    condition: (data) => data.foreign_daily_net < -300e8,
    importance: 9,
    notify_type: 'critical',
  },

  // 個股買賣超
  '外資單日買超某股 > 10,000 張': {
    condition: (stock) => stock.foreign_net_volume > 10000,
    importance: 7,
  },
  '外資單日賣超某股 > 5,000 張': {
    condition: (stock) => stock.foreign_net_volume < -5000,
    importance: 7,
  },
};
```

### 1.2 投信動態

```javascript
const investmentAlerts = {
  '投信連買 3 日': { importance: 6 },
  '投信連買 5 日': { importance: 7 },
  '投信單日買超某股 > 1,000 張': { importance: 6 },
  '投信單日買超某股 > 3,000 張': { importance: 8 },
};
```

### 1.3 三大法人合計

```javascript
const institutionalAlerts = {
  '三大法人合計買超 > 200 億': { importance: 7 },
  '三大法人合計賣超 > 200 億': { importance: 8 },
  '三大法人同步買超某股': { importance: 7 },  // 外+投+自 都買
  '三大法人同步賣超某股': { importance: 7 },
};
```

---

## 📈 股價類警示

### 2.1 自選股價格異動

```javascript
const watchlistAlerts = {
  // 漲跌幅
  '自選股漲 > 3%': { importance: 5 },
  '自選股漲 > 5%': { importance: 6 },
  '自選股漲 > 7%': { importance: 7 },
  '自選股漲停': { importance: 9, notify_type: 'critical' },

  '自選股跌 > 3%': { importance: 5 },
  '自選股跌 > 5%': { importance: 7 },
  '自選股跌 > 7%': { importance: 8, notify_type: 'critical' },
  '自選股跌停': { importance: 10, notify_type: 'critical' },

  // 均線
  '自選股站上月線': { importance: 6 },
  '自選股跌破月線': { importance: 7 },
  '自選股站上季線': { importance: 7 },
  '自選股跌破季線': { importance: 8 },
  '自選股跌破年線': { importance: 9, notify_type: 'critical' },

  // 成交量
  '自選股爆量（> 5 日均量 2 倍）': { importance: 7 },
  '自選股爆量（> 5 日均量 3 倍）': { importance: 8 },
  '自選股爆量（> 5 日均量 5 倍）': { importance: 9 },

  // 關鍵位
  '自選股突破 20 日新高': { importance: 7 },
  '自選股突破 60 日新高': { importance: 8 },
  '自選股突破歷史新高': { importance: 9, notify_type: 'critical' },
  '自選股跌破 20 日新低': { importance: 7 },
  '自選股跌破 60 日新低': { importance: 8 },
};
```

### 2.2 到價警示（使用者自設）

```javascript
const priceAlerts = {
  '到達使用者設定的進場價': { importance: 8, notify_type: 'price_alert' },
  '到達使用者設定的停損價': { importance: 10, notify_type: 'critical' },
  '到達使用者設定的停利價': { importance: 9, notify_type: 'price_alert' },

  // 呱呱推薦的價位
  '到達呱呱推薦進場價': { importance: 7, notify_type: 'price_alert' },
  '跌破呱呱推薦停損價': { importance: 9, notify_type: 'critical' },
  '觸及呱呱推薦停利價': { importance: 8, notify_type: 'price_alert' },
};
```

### 2.3 四象限評級變化

```javascript
const tierAlerts = {
  '自選股評級升到 SR': { importance: 7 },
  '自選股評級升到 SSR': { importance: 9 },
  '自選股評級降到 C': { importance: 8, notify_type: 'critical' },
  '自選股評級降到 N（從 R 以上）': { importance: 7 },
};
```

---

## 🔥 題材類警示

### 3.1 題材熱度變化

```javascript
const topicAlerts = {
  '題材熱度 1 小時內升 > 10°': { importance: 6 },
  '題材熱度 1 小時內升 > 20°': { importance: 8 },
  '題材熱度突破 80°': { importance: 7 },
  '題材熱度突破 90°（極熱）': { importance: 8 },
  '題材熱度從 < 50 升到 > 70（新題材崛起）': { importance: 9 },

  '題材熱度 1 小時內降 > 15°': { importance: 7 },
  '題材熱度跌破 50°（從高點）': { importance: 6 },
};
```

### 3.2 供應鏈異動

```javascript
const supplyChainAlerts = {
  '某題材供應鏈多檔同步爆量': { importance: 8 },
  '某題材補漲位置啟動': { importance: 9, notify_type: 'new_pick' },
};
```

---

## 🌏 國際類警示

### 4.1 美股

```javascript
const usMarketAlerts = {
  '費半單日 > +3%': { importance: 7 },
  '費半單日 > +5%': { importance: 9 },
  '費半單日 < -3%': { importance: 8 },
  '費半單日 < -5%': { importance: 10, notify_type: 'critical' },

  'NVIDIA 盤後 > ±5%': { importance: 9 },
  '台積電 ADR 盤後 > ±3%': { importance: 9 },
  'Tesla 盤後 > ±5%': { importance: 8 },

  'S&P500 > ±2%': { importance: 7 },
  'Nasdaq > ±3%': { importance: 8 },

  'VIX > 20': { importance: 7 },
  'VIX > 25': { importance: 8, notify_type: 'critical' },
  'VIX > 30': { importance: 10, notify_type: 'critical' },
};
```

### 4.2 重點人物發言

```javascript
const peopleAlerts = {
  // 政策重量級
  'Powell 發言': { importance: 9 },
  'Yellen 發言': { importance: 8 },

  // 科技 CEO
  'Musk 推文（提到 Tesla / SpaceX / AI）': { importance: 7 },
  '黃仁勳發言': { importance: 9 },
  'Altman 發言（OpenAI）': { importance: 8 },

  // 台灣 CEO
  '魏哲家發言': { importance: 9, notify_type: 'critical' },
  '劉揚偉發言': { importance: 8 },
  '蔡明介發言': { importance: 8 },

  // 投資大師
  'Burry 發文': { importance: 8 },
  'Cathie Wood 週報': { importance: 7 },
};
```

### 4.3 重大事件

```javascript
const eventAlerts = {
  'Fed 利率決議': { importance: 10, notify_type: 'critical' },
  'CPI / 非農公布': { importance: 9 },
  '台積電法說會': { importance: 10, notify_type: 'critical' },
  '半導體巨頭法說會': { importance: 8 },

  '地緣政治衝突升級': { importance: 10, notify_type: 'critical' },
  '重大天災影響供應鏈': { importance: 9 },
};
```

---

## 💬 社群類警示

### 5.1 PTT Stock 板

```javascript
const pttAlerts = {
  '某股 6 小時內提及 > 500% 成長': { importance: 7 },
  '某股討論度突破歷史新高': { importance: 8 },
  '某題材 PTT 突然爆量討論': { importance: 7 },
};
```

### 5.2 Reddit

```javascript
const redditAlerts = {
  'r/wallstreetbets 某股爆衝': { importance: 7 },
  'r/stocks 熱門文影響台股供應鏈': { importance: 8 },
};
```

### 5.3 X / Twitter

```javascript
const xAlerts = {
  '重點人物新推文（影響台股）': { importance: 8 },
  '某關鍵字趨勢暴增（台股相關）': { importance: 7 },
};
```

---

## 📰 新聞類警示

### 6.1 台灣財經媒體

```javascript
const twNewsAlerts = {
  '重大財報公布（自選股 / 焦點股）': { importance: 9 },
  '券商調降目標價（自選股 / 焦點股 / R 級以上）': { importance: 8 },
  '券商調升目標價（自選股 / 焦點股 / R 級以上）': { importance: 7 },
  '重要法人報告（影響主流題材）': { importance: 8 },
};
```

### 6.2 國際媒體

```javascript
const intlNewsAlerts = {
  'Bloomberg / Reuters / WSJ 頭條（台股相關）': { importance: 8 },
  'CNBC 即時報導（影響科技股）': { importance: 7 },
  'Seeking Alpha 深度分析（SSR/SR 級股相關）': { importance: 7 },
};
```

---

## 🎯 AI 判斷邏輯

### 每個警示觸發後，送給 AI 判斷

```python
async def evaluate_alert(alert):
    prompt = f"""
你是呱呱，台股情報分析師。

偵測到以下事件：
類型：{alert.type}
內容：{alert.content}
基礎重要度：{alert.base_importance}

影響的個股：{alert.affected_stocks}
Vincent 的自選股：{vincent_watchlist}
Vincent 目前關注的題材：{vincent_topics}

請判斷：
1. 調整後的重要度（0-10）
   - 如果影響自選股，+2
   - 如果是主流題材，+1
   - 如果是雜訊 / 假新聞可能性，-2
   - 如果近期已推過類似訊息，-1

2. 要不要通知 Vincent？

3. 如果要通知，用哪種類型：
   - critical: 立即震撼
   - general: 一般通知
   - price_alert: 到價
   - intel: 情報
   - new_pick: 新推薦

4. 訊息內容（呱呱風格）

回傳 JSON 格式。
"""

    response = await claude.analyze(prompt)
    return response
```

### 重要度調整規則

```
基礎重要度（來自上面清單）
  ↓
+ 影響 Vincent 自選股  +2
+ 是當前主流題材       +1
+ 是 SR/SSR 級標的    +1
+ 台灣本地事件         +1

- 已推過類似訊息       -1
- 可能是假新聞         -2
- 在免打擾時段         -1
- 非工作日             -0.5

= 最終重要度
```

---

## 🔄 監測排程

```python
# scripts/cron/alert_monitor.py

async def monitor_loop():
    while True:
        tasks = [
            monitor_watchlist_prices(),    # 每 30 秒
            monitor_foreign_net(),          # 每 5 分鐘
            monitor_topic_heat(),           # 每 5 分鐘
            monitor_us_market(),            # 每 5 分鐘
            monitor_people_statements(),    # 每 5 分鐘
            monitor_social_mentions(),      # 每 15 分鐘
            monitor_important_news(),       # 每 5 分鐘
        ]
        await asyncio.gather(*tasks)
        await asyncio.sleep(30)

async def monitor_watchlist_prices():
    """監測自選股價格變化"""
    watchlist = await db.get_watchlist()
    for stock in watchlist:
        current = await get_current_price(stock.code)
        alerts = check_price_alerts(stock, current)
        for alert in alerts:
            ai_judgment = await evaluate_alert(alert)
            if ai_judgment.should_notify:
                await send_line_notification(ai_judgment)
```

---

## 📝 警示記錄（資料表）

```sql
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  subject VARCHAR(100),                  -- 股票代號 / 題材名 / 人物名
  trigger_condition TEXT,                -- 觸發的條件
  trigger_data JSONB,                    -- 觸發時的數據
  base_importance INT,
  ai_adjusted_importance INT,
  ai_judgment TEXT,
  notification_type VARCHAR(20),         -- critical / general / price_alert / intel / new_pick
  notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  line_message_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_subject_time ON alerts(subject, created_at DESC);
CREATE INDEX idx_alerts_type_time ON alerts(alert_type, created_at DESC);
```

---

## 🎛️ 使用者可調整

### Settings 頁面

使用者可以在 `/settings` 調整：

```
[ ] 外資動態通知
  [v] 大額（>200 億）
  [v] 連續賣超
  [ ] 一般買賣

[v] 自選股警示
  價格變化閾值： [_5_] %
  [v] 漲跌停立即通知
  [v] 突破關鍵位

[v] 題材熱度變化
  閾值： [_10_] °/小時

[v] 國際重大事件
  [v] Fed 決議
  [v] 重點人物發言

[v] 新聞情報
  最低重要度： [_7_]

每日上限： [_10_] 則
免打擾時段： 22:00 ~ 07:00
```

---

**版本**：v1.0
**最後更新**：2026-04-23
