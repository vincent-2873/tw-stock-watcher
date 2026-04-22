# ⚡ 當沖推薦引擎規格書

> 每日 08:30-09:00 執行,開盤前給 Vincent 當沖觀察標的

---

## 設計哲學

**重要:當沖是高風險活動。系統的角色不是「給明牌」,是「提供合理候選 + 風險警示」**

```
✅ 我們做的:
 - 找出今日最可能有波動的標的
 - 提供進出場參考價
 - 標記風險等級
 - 提醒當沖紀律

❌ 我們不做的:
 - 保證賺錢
 - 給定死的買賣點
 - 鼓勵追高殺低
 - 忽略停損
```

---

## 執行時程

```
📅 每日 08:30 台北時間(盤前 30 分鐘)

執行順序:
 1. 08:30:00 - 抓取美股收盤資料
 2. 08:30:30 - 抓取期貨夜盤
 3. 08:31:00 - 分析全市場昨日籌碼
 4. 08:32:00 - 篩選當沖候選
 5. 08:35:00 - AI 綜合分析
 6. 08:40:00 - 產生推薦報告
 7. 08:45:00 - LINE 推播給 Vincent
 8. 08:50:00 - 儲存到資料庫
```

---

## 當沖候選篩選條件

### 必要條件(全部符合才進下一輪)

```python
def screen_day_trade_candidates() -> list[str]:
    """
    第一輪篩選:技術性條件
    """
    all_stocks = get_all_listed_stocks()
    
    criteria = {
        "昨日成交量 > 10,000 張": lambda s: s.yesterday_volume > 10_000_000,
        "股價 > 20 元": lambda s: s.close > 20,
        "股價 < 500 元": lambda s: s.close < 500,
        "非全額交割股": lambda s: not s.is_full_delivery,
        "非警示股": lambda s: not s.is_alert_stock,
        "昨日振幅 > 3%": lambda s: s.yesterday_amplitude > 3,
        "近 5 日日均成交 > 5,000 張": lambda s: s.avg_volume_5d > 5_000_000,
    }
    
    candidates = []
    for stock in all_stocks:
        if all(check(stock) for check in criteria.values()):
            candidates.append(stock)
    
    return candidates  # 通常剩 100-200 檔
```

### 進階篩選(第二輪)

```python
def advanced_screen(candidates: list) -> list[dict]:
    """
    第二輪:找出「有戲」的
    """
    scored = []
    
    for stock in candidates:
        score = 0
        signals = []
        
        # 訊號 1: 昨日強勢收盤
        if stock.close_strength > 0.8:  # 收在當日高檔
            score += 15
            signals.append("昨日強勢收盤")
        
        # 訊號 2: 爆量
        if stock.yesterday_volume > stock.avg_volume_20d * 1.5:
            score += 20
            signals.append("爆量")
        
        # 訊號 3: 突破關鍵價位
        if stock.broke_resistance:
            score += 15
            signals.append("突破壓力")
        
        # 訊號 4: 外資買超
        if stock.foreign_net_buy_yesterday > 1000:
            score += 10
            signals.append("外資買超")
        
        # 訊號 5: 主流題材
        if stock.industry in get_hot_industries():
            score += 10
            signals.append("熱門題材")
        
        # 訊號 6: 隔日沖主力介入
        if detect_overnight_trader(stock):
            score += 25  # 隔日沖主力 = 當沖機會大
            signals.append("隔日沖主力")
        
        # 訊號 7: 美股同類股大漲
        us_peer_change = get_us_peer_change(stock)
        if us_peer_change > 3:
            score += 15
            signals.append("美股同類股大漲")
        
        # 訊號 8: 新聞催化
        if has_major_news_overnight(stock):
            score += 20
            signals.append("有重大新聞")
        
        if score >= 40:
            scored.append({
                "stock": stock,
                "score": score,
                "signals": signals
            })
    
    # 取前 20 檔
    return sorted(scored, key=lambda x: x['score'], reverse=True)[:20]
```

---

## AI 深度分析

對篩出的 20 檔,逐一給 AI 分析:

```python
async def ai_analyze_day_trade_candidate(candidate: dict) -> dict:
    """
    AI 深度分析單一當沖候選
    """
    context = {
        "stock_info": candidate['stock'],
        "yesterday_performance": get_yesterday_detail(candidate),
        "chip_data": get_chip_data(candidate, days=5),
        "us_market": get_us_market_context(),
        "relevant_news": get_relevant_news(candidate, hours=24),
        "industry_strength": get_industry_strength(candidate),
    }
    
    prompt = f"""
你是專業當沖分析師。請評估以下股票今日當沖可行性:

{json.dumps(context, ensure_ascii=False)}

請提供:

1. 當沖策略類型:
   - A. 開盤追高型 (適合昨日突破強勢股)
   - B. 開盤低買型 (適合拉回支撐股)
   - C. 盤中擴量型 (適合量能放大股)
   - D. 收盤拉尾型 (適合主力介入股)
   - E. 不建議當沖

2. 進場條件:
   - 進場價區
   - 觸發條件 (例:開盤 5 分鐘站穩 xxx)
   - 最多允許追多少 %

3. 出場條件:
   - 停損價
   - 停利價(分 2-3 段)
   - 時間停損(例:11:00 前未獲利就出)

4. 風險等級: 低 / 中 / 高 / 極高

5. 關鍵風險:(列 3 個)

6. 信心度(0-100):

以 JSON 格式回答。
"""
    
    response = await claude_api.complete(prompt)
    return parse_json(response)
```

---

## 推薦報告格式

```
🌅 早安 Vincent!今日當沖觀察 (08:45)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 今日市場氛圍
 美股昨夜:道瓊 +0.5%, 那指 +1.2%, 費半 +1.8%
 台積電 ADR:+2.3% (預估台股開盤 +35 點)
 期貨夜盤:+0.8% 
 
🎯 判斷:開盤偏多,選擇性佈局

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 當沖候選 Top 5

【1】鴻海 2317 ⚡ 信心 75%
 策略:A. 開盤追高型
 進場:站穩 215 後追,不追 217 以上
 停損:211(-1.8%)
 停利:
   第一:219(+1.4%)出 50%
   第二:223(+3.2%)出剩下
 時間停損:11:00 前未獲利出場
 
 ✅ 正面:
  - 昨日突破月線 + 爆量
  - Nvidia 昨夜 +2.5%
  - 外資連 5 日買超
 
 ⚠️ 風險:
  - 214 有壓力
  - 若大盤回測可能拖累

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【2】華邦電 2344 ⚡ 信心 68%
 策略:C. 盤中擴量型
 進場:11:00 後觀察量能,爆量再進
 停損:-2%
 停利:+3% / +5%
 ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨 今日警戒清單

【⚠️ 疑似隔日沖標的】
 - 台亞 2340:昨日凱基台北大買 3,500 張
   → 若開高 > 2% 可能反手倒貨,謹慎
 
 - XXX:..

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 今日當沖紀律 (每次都要提醒!)

✅ 進場前:確定知道停損價
✅ 進場前:確定部位不超過總資金 20%
✅ 進場後:停損價立刻設好
❌ 虧損加碼 (絕對禁止)
❌ 超過 13:00 仍持有 (除非有把握)

📊 建議今日最多操作:2-3 檔
💰 建議今日最多投入:總資金 40%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ 免責聲明:以上為系統分析,非投資建議
    當沖風險極高,請自行判斷並承擔責任
```

---

## 盤中追蹤

推薦發出後,系統持續追蹤:

```python
async def track_day_trade_recommendations():
    """
    盤中每 5 分鐘檢查一次推薦標的
    """
    recommendations = get_today_day_trade_recs()
    
    for rec in recommendations:
        current_price = get_realtime_price(rec['stock'])
        
        # 觸發進場訊號?
        if check_entry_triggered(rec, current_price):
            send_line_alert(f"""
            🎯 {rec['stock']} 進場訊號觸發!
            
            當前價:{current_price}
            建議停損:{rec['stop_loss']}
            建議停利:{rec['take_profit']}
            
            Vincent,要不要進場?
            """)
        
        # 觸發停損?
        if check_stop_loss_triggered(rec, current_price):
            send_line_alert(f"""
            🚨 {rec['stock']} 觸發停損!
            
            當前價:{current_price}
            建議停損價:{rec['stop_loss']}
            
            已到出場條件,請執行
            """)
        
        # 時間停損?
        if is_past_time_stop(rec):
            send_line_alert(f"""
            ⏰ {rec['stock']} 時間停損
            
            11:00 未獲利,建議出場
            """)
```

---

## 當沖機器人的「安全開關」

### 開關 1:大盤異常

```python
def check_market_safety():
    """
    大盤異常時,不推薦當沖
    """
    if vix_tw > 30:  # 恐慌
        return "🚨 VIX 過高,今日不推薦當沖"
    
    if foreign_sell_yesterday > 500_000_000_000:  # 外資大賣
        return "⚠️ 外資昨日大賣超,今日觀望"
    
    if taiex_futures_night < -2:  # 期貨夜盤大跌
        return "🚨 期貨夜盤重挫,今日暫停當沖推薦"
    
    return None
```

### 開關 2:Vincent 昨日績效

```python
def check_user_recent_performance():
    """
    如果 Vincent 連續虧損,提醒休息
    """
    recent_trades = get_vincent_recent_trades(days=5)
    
    if consecutive_losses(recent_trades) >= 3:
        return {
            "warning": "⚠️ 你最近連續 3 筆虧損",
            "suggestion": "考慮今日休息,檢討策略"
        }
    
    if monthly_loss_pct() > 10:
        return {
            "warning": "🚨 本月虧損 > 10%",
            "suggestion": "強烈建議暫停當沖 1 週"
        }
```
