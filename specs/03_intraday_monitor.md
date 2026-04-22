# 🚨 盤中異常偵測引擎規格書

> 盤中(09:00-13:30)持續監控,發現異常立刻通知 Vincent

---

## 核心目標

**在 5 分鐘內偵測到異常,並在 1 分鐘內通知 Vincent**

```
📡 全市場掃描頻率:每 5 分鐘一次
🎯 自選股監控:每 1 分鐘一次
🔔 推播延遲:< 1 分鐘
```

---

## 偵測的異常類型

### 類型 1:**成交量異常**(最重要!)

Vincent 特別提到這個。

```python
class VolumeAnomalyDetector:
    """
    量能異常偵測
    """
    
    def detect(self, stock_id: str) -> dict | None:
        current = get_current_volume(stock_id)
        historical = get_historical_volume_stats(stock_id, days=20)
        
        # 計算「異常度」
        current_ratio = current / historical['hourly_average']
        
        # 異常等級
        if current_ratio > 5:
            level = "🔥🔥🔥 極端爆量"
        elif current_ratio > 3:
            level = "🔥🔥 爆量"
        elif current_ratio > 2:
            level = "🔥 量能放大"
        else:
            return None  # 不異常
        
        # 產生警報
        return {
            "type": "VOLUME_ANOMALY",
            "stock_id": stock_id,
            "level": level,
            "current_volume": current,
            "average_volume": historical['hourly_average'],
            "ratio": current_ratio,
            "timestamp": now(),
            "message": self._build_message(stock_id, level, current_ratio)
        }
    
    def _build_message(self, stock_id, level, ratio):
        stock_name = get_stock_name(stock_id)
        return f"""
🚨 成交量異常!

股票:{stock_name} ({stock_id})
程度:{level}
現在量能:{ratio:.1f}x 日均

可能原因(AI 分析中...)
"""
```

### 類型 2:**價格急速變動**

```python
class PriceMovementDetector:
    """
    價格急速變動偵測
    """
    
    def detect(self, stock_id: str) -> dict | None:
        # 取得過去 15 分鐘價格
        prices_15m = get_prices_last_n_minutes(stock_id, 15)
        
        if len(prices_15m) < 2:
            return None
        
        change_pct = (prices_15m[-1] - prices_15m[0]) / prices_15m[0] * 100
        
        # 異常等級
        if abs(change_pct) > 5:
            level = "🚨 極端波動"
        elif abs(change_pct) > 3:
            level = "⚠️ 大波動"
        else:
            return None
        
        direction = "暴漲" if change_pct > 0 else "暴跌"
        
        return {
            "type": "PRICE_MOVEMENT",
            "stock_id": stock_id,
            "direction": direction,
            "change_pct": change_pct,
            "level": level,
            "timeframe": "15 分鐘",
            ...
        }
```

### 類型 3:**突破/跌破關鍵價位**

```python
class BreakoutDetector:
    """
    關鍵價位突破/跌破
    """
    
    KEY_LEVELS = [
        "昨日最高價",
        "昨日最低價", 
        "近 5 日高點",
        "近 20 日高點",
        "月線",
        "季線",
        "年線",
        "歷史新高",
        "歷史新低",
    ]
    
    def detect(self, stock_id: str) -> list[dict]:
        alerts = []
        current = get_current_price(stock_id)
        
        for level_name in self.KEY_LEVELS:
            level_price = get_key_level(stock_id, level_name)
            
            # 剛剛突破
            if crossed_above(current, level_price):
                alerts.append({
                    "type": "BREAKOUT",
                    "level_name": level_name,
                    "level_price": level_price,
                    "current": current,
                    "direction": "上"
                })
            elif crossed_below(current, level_price):
                alerts.append({
                    "type": "BREAKDOWN",
                    "level_name": level_name,
                    "direction": "下"
                })
        
        return alerts
```

### 類型 4:**法人異常進出**

```python
class InstitutionalAnomalyDetector:
    """
    法人異常進出
    """
    
    def detect(self, stock_id: str) -> dict | None:
        today_flow = get_institutional_flow_today(stock_id)
        historical = get_institutional_flow_stats(stock_id, days=20)
        
        alerts = []
        
        # 外資異常
        if abs(today_flow['foreign']) > historical['foreign_avg'] * 3:
            alerts.append({
                "type": "FOREIGN_ANOMALY",
                "direction": "買" if today_flow['foreign'] > 0 else "賣",
                "amount": today_flow['foreign'],
            })
        
        # 投信異常
        if abs(today_flow['investment_trust']) > historical['it_avg'] * 3:
            alerts.append({
                "type": "INVESTMENT_TRUST_ANOMALY",
                ...
            })
        
        return alerts
```

### 類型 5:**券商分點異常**

```python
class BrokerAnomalyDetector:
    """
    特定券商異常進出
    """
    
    def detect(self, stock_id: str) -> dict | None:
        broker_data = get_broker_activity_realtime(stock_id)
        
        alerts = []
        
        for broker in broker_data:
            # 隔日沖主力大買
            if broker['id'] in OVERNIGHT_TRADERS and broker['net_buy'] > 1000:
                alerts.append({
                    "type": "OVERNIGHT_TRADER_BUYING",
                    "broker": broker['name'],
                    "amount": broker['net_buy'],
                    "warning": "明日開盤需警戒倒貨"
                })
            
            # 某券商突然大量進出
            if abs(broker['net_buy']) > broker['avg_5d'] * 5:
                alerts.append({
                    "type": "BROKER_UNUSUAL",
                    ...
                })
        
        return alerts
```

### 類型 6:**新聞催化**

```python
class NewsAnomalyDetector:
    """
    盤中新聞偵測
    """
    
    async def detect(self, stock_id: str) -> dict | None:
        # 抓最近 30 分鐘新聞
        recent_news = await get_recent_news(stock_id, minutes=30)
        
        for news in recent_news:
            # AI 判斷影響
            impact = await ai_service.analyze_news_impact(news)
            
            if impact['severity'] >= 7:  # 1-10 分
                return {
                    "type": "MAJOR_NEWS",
                    "title": news['title'],
                    "impact": impact,
                    "predicted_direction": impact['direction']
                }
```

### 類型 7:**相關股動向**

```python
class CorrelatedStockDetector:
    """
    相關股異常 → 預告自選股可能動
    """
    
    def detect(self, watchlist: list[str]) -> list[dict]:
        alerts = []
        
        for stock_id in watchlist:
            related = get_correlated_stocks(stock_id)
            
            for related_stock in related:
                # 相關股大漲 但這檔沒動
                if (related_stock['change_pct'] > 3 and 
                    get_current_change_pct(stock_id) < 1):
                    alerts.append({
                        "type": "CORRELATED_STOCK_UP",
                        "stock": stock_id,
                        "related_stock": related_stock,
                        "hint": f"{related_stock['name']} 大漲,{stock_id} 可能補漲"
                    })
        
        return alerts
```

---

## 警報優先級系統

```python
ALERT_PRIORITY = {
    "CRITICAL": {  # 立刻通知,中斷 Vincent
        "level": 1,
        "examples": [
            "自選股跌破停損",
            "重大新聞 + 急跌",
            "大盤熔斷",
            "系統性風險"
        ],
        "notification": "LINE 多次推播 + Email"
    },
    
    "HIGH": {  # 1 分鐘內通知
        "level": 2,
        "examples": [
            "自選股爆量 + 急漲",
            "突破重要壓力",
            "法人異常大買大賣"
        ],
        "notification": "LINE 推播"
    },
    
    "MEDIUM": {  # 5 分鐘內通知
        "level": 3,
        "examples": [
            "關注股量能放大",
            "產業題材發酵",
            "相關股動"
        ],
        "notification": "LINE 推播(靜音)"
    },
    
    "LOW": {  # 彙整到整點報告
        "level": 4,
        "examples": [
            "一般爆量股",
            "技術型態形成"
        ],
        "notification": "累積 1 小時整點報告"
    }
}
```

---

## 推播訊息格式

### CRITICAL 警報

```
🚨🚨🚨 緊急警報 🚨🚨🚨

【鴻海 2317】觸發停損!

⏰ 時間:11:23
📉 當前:203 (-4.7%)
🎯 你的停損價:205

--- 異常分析 ---
📊 量能:突然爆量 3.2x
🏦 外資:改為賣超 -25 億
📰 新聞:中午有傳言(查證中)

--- 建議動作 ---
已觸發停損價,建議立即執行
或等待 11:30 觀察是否止跌

不要攤平!

[查看詳細] [設定已處理]
```

### HIGH 警報

```
🔥 量能異常警報

【台達電 2308】

⏰ 09:45
📊 量能:日均 3.2x(爆量)
📈 漲幅:+2.3%

可能原因(AI 分析):
- Nvidia 昨夜大漲 3%
- AI 類股全面走強
- 台達電為電源龍頭

是否加入觀察? [加入] [忽略]
```

### MEDIUM 警報

```
⚡ 動態通知

相關股動:
【廣達 2382】+4.5%
→ 你的鴻海 2317 可能有補漲機會

目前:鴻海 +1.2%,廣達 +4.5%
歷史相關性 0.75

[查看鴻海詳細]
```

---

## 排程設定(GitHub Actions)

```yaml
# .github/workflows/intraday-monitor.yml

name: 盤中監控

on:
  schedule:
    # 09:00 開始,每 5 分鐘一次,直到 13:30
    # Cron 時區是 UTC,台灣 +8
    - cron: '*/5 1-5 * * 1-5'   # 09:00-13:55 台灣時間

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run monitor
        env:
          FINMIND_TOKEN: ${{ secrets.FINMIND_TOKEN }}
          LINE_TOKEN: ${{ secrets.LINE_TOKEN }}
          # ... 其他 secrets
        run: |
          python scripts/run_intraday_monitor.py
      
      - name: Notify on failure
        if: failure()
        run: |
          python scripts/notify_system_error.py
```

---

## 異常偵測主迴圈

```python
# scripts/run_intraday_monitor.py

async def main_loop():
    """
    盤中主要監控邏輯
    """
    # 1. 檢查是否開盤時段
    if not is_trading_hours():
        return
    
    # 2. 載入 Vincent 的自選股
    watchlist = get_watchlist("vincent")
    
    # 3. 載入今日當沖推薦
    day_trade_recs = get_today_day_trade_recs()
    
    # 4. 全市場掃描(找意外之喜)
    market_wide_alerts = await scan_market_wide()
    
    # 5. 針對性監控
    alerts = []
    
    # 5a. 自選股深度檢查
    for stock_id in watchlist:
        alerts.extend(await deep_check(stock_id))
    
    # 5b. 當沖推薦追蹤
    for rec in day_trade_recs:
        alerts.extend(await track_recommendation(rec))
    
    # 5c. 市場性警報
    alerts.extend(await check_market_events())
    
    # 6. 去重 + 優先級排序
    alerts = deduplicate_and_prioritize(alerts)
    
    # 7. 推播
    for alert in alerts:
        await send_alert(alert)
    
    # 8. 記錄到資料庫
    save_alerts_to_db(alerts)
    
    # 9. 健康度檢查
    check_system_health()
```

---

## 避免打擾疲勞

**每天上限**:
- CRITICAL 警報:無上限
- HIGH 警報:10 則/天
- MEDIUM 警報:20 則/天
- LOW 警報:整點彙整,每天 5 次

**靜音時段**:
- 午休 12:00-12:30(除非 CRITICAL)
- 會議時段(Vincent 可在設定中加)

**重複警報合併**:
- 5 分鐘內同一檔股票同類警報 → 合併
- 例:鴻海量能異常 x 3 → 一則「持續異常」

---

## 學習模式

系統追蹤每則警報的「有效性」:

```python
def track_alert_effectiveness():
    """
    追蹤警報是否真的有意義
    """
    for alert in recent_alerts:
        # 警報發出後 30 分鐘,股價怎樣?
        price_change = get_price_change_after(alert, minutes=30)
        
        # 標記有效性
        if alert['type'] == 'BREAKOUT' and price_change > 1:
            alert['effective'] = True  # 真的突破了
        elif alert['type'] == 'BREAKOUT' and price_change < -0.5:
            alert['effective'] = False  # 假突破
            # → 未來降低這類訊號權重
    
    # 每週自動調整警報閾值
    adjust_thresholds_weekly()
```
