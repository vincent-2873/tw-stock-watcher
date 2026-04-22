# 💼 半自動下單 + 台美聯動規格書

> 補齊 Vincent 兩個之前說到但沒寫深的需求:
> 1. 「我自己去我的證券戶下單」— 半自動下單方案
> 2. 「台股+美股聯動」— 跨市場分析

---

# Part 1:半自動下單方案

## 🎯 Vincent 的立場(很重要)

Vincent 明確說過:
> 「我先沒有綁定我的證券戶沒關係,所以用半自動模式就好」

所以**第一階段不做全自動下單**,只做「讓 Vincent 容易下單的工具」。

---

## 📱 半自動下單的三種做法

### 做法 1:**一鍵複製建議**(MVP,最簡單)

```
┌─────────────────────────────────────┐
│ 💼 系統建議(鴻海 2317)              │
├─────────────────────────────────────┤
│ 進場價:210-213                      │
│ 停損:205                             │
│ 部位:5 張                            │
│                                     │
│ [📋 一鍵複製到剪貼簿]                │
└─────────────────────────────────────┘

按下後 → 自動複製:
━━━━━━━━━━━━━━━━━━━━
2317 鴻海
買進 5 張
限價 213 元
停損價 205
━━━━━━━━━━━━━━━━━━━━

Vincent 切換到券商 APP → 貼上資訊 → 手動輸入
```

**優點**:
- 零整合成本
- 不需券商 API 權限
- 最快上線

**缺點**:
- 每次要切換 APP
- 手動輸入可能出錯

---

### 做法 2:**深連結(Deep Link)到券商 APP**(中級)

點按鈕 → **直接開券商 APP 並預填欄位**。

```swift
// iOS URL Scheme(如果券商支援)
永豐金證券:fubon://trade?stock=2317&price=213&qty=5000
元大證券:yuanta://order?code=2317&price=213
群益證券:capital://trade/...
```

**目前台股券商支援狀況:**

| 券商 | 支援深連結 | 說明 |
|------|----------|------|
| 永豐金 | ⚠️ 部分 | 可開啟但不預填 |
| 元大 | ⚠️ 有限 | 需開啟後手動輸入 |
| 富邦 | ❌ | 不支援 |
| 凱基 | ❌ | 不支援 |
| 國泰 | ⚠️ 部分 | |

**結論:深連結效果有限,不是好選項**

---

### 做法 3:**永豐 Shioaji API**(進階,可選)

永豐金證券提供**免費的官方 Python API**,叫 Shioaji。

```python
import shioaji as sj

# 登入
api = sj.Shioaji()
api.login(
    api_key="YOUR_API_KEY",
    secret_key="YOUR_SECRET"
)

# 取得即時報價
contract = api.Contracts.Stocks.TSE["2317"]
snapshot = api.snapshots([contract])

# 下單(需要 CA 憑證)
order = api.Order(
    price=213,
    quantity=5,
    action=sj.constant.Action.Buy,
    price_type=sj.constant.StockPriceType.LMT,  # 限價
    order_type=sj.constant.OrderType.ROD,
    account=api.stock_account
)
trade = api.place_order(contract, order)
```

**條件**:
- Vincent 需在永豐金開戶
- 需申請 API 權限(免費)
- 需上傳 CA 憑證(繁瑣)

**優點**:
- 完全免費
- 真正的「一鍵下單」
- Python 生態成熟

**缺點**:
- 只綁定一家券商
- 初次設定麻煩

---

## 🎯 我的建議

### Phase 1(上線時):做法 1(一鍵複製)
- 0 成本、0 風險
- 維持 Vincent 的手動控制感
- 「半自動」的精神不變

### Phase 2(熟悉系統後):考慮做法 3
- 如果 Vincent 本來就是永豐金用戶
- 可以進階到 Shioaji API
- 每筆下單**仍需使用者手動確認**(不是全自動)

### Phase 3(更後期):全自動(不建議)
- 會有合規、責任、風控問題
- **Vincent 自己說不要了**

---

## 🔧 UI 設計

### 個股頁底部新增「進場區」

```
┌─────────────────────────────────────┐
│ 💼 建立進場計畫                      │
├─────────────────────────────────────┤
│                                     │
│ 股票:2317 鴻海                      │
│ 操作:買進                            │
│                                     │
│ 數量:[5 ] 張                        │
│       系統建議 5 張(總資金 5%)      │
│                                     │
│ 價格:[213 ] 元                      │
│       系統建議 210-213              │
│                                     │
│ 停損:[205 ] 元(-3.8%)              │
│ 停利:[221 ] / [229 ] / [237 ]      │
│                                     │
│ 總投入:NT$ 106,500                  │
│ 最大虧損:NT$ 4,000(-3.8%)          │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ 📋 一鍵複製                   │   │
│ │ [複製到剪貼簿]                 │   │
│ └─────────────────────────────┘   │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ 🚀 透過永豐 API 下單(選用)  │   │
│ │ [預覽訂單] [直接送出]          │   │
│ │  ⚠️ 需先設定 API 權限         │   │
│ └─────────────────────────────┘   │
│                                     │
│ ┌─────────────────────────────┐   │
│ │ 📱 開啟券商 APP               │   │
│ │ [富邦] [元大] [凱基] [永豐]  │   │
│ └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

---

## 📊 訂單追蹤

### 讓 Vincent 手動輸入「已下單」

```
Vincent 下完單 → 回來系統點「✅ 已下單」
       ↓
系統記錄這筆交易:
- 進場時間、價格、張數
- 預設停損、停利
- 開始追蹤績效
       ↓
後續:
- 價格到停損/停利時 LINE 提醒
- 每日檢視損益
- 盤後歸入「我的交易」紀錄
```

### 交易紀錄表

```sql
CREATE TABLE user_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) DEFAULT 'vincent',
    
    stock_id VARCHAR(10),
    action VARCHAR(10),  -- buy / sell
    quantity INT,        -- 張數
    price NUMERIC(10, 2),
    
    entry_time TIMESTAMPTZ,
    exit_time TIMESTAMPTZ,
    exit_price NUMERIC(10, 2),
    
    stop_loss_price NUMERIC(10, 2),
    take_profit_prices NUMERIC[],
    
    -- 來自系統建議的 ID(追溯)
    recommendation_id UUID REFERENCES recommendations(id),
    
    -- 結果
    pnl NUMERIC(12, 2),
    pnl_pct NUMERIC(6, 2),
    status VARCHAR(20),  -- open / closed / stopped
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# Part 2:台美聯動分析

## 🎯 為什麼重要?

**台股是被美股「牽著走」的市場:**

```
美股收盤 (04:00 TPE)
    ↓
次日台股開盤會大致反映
    ↓
尤其是科技股

相關係數:
 - 費半 vs 台股電子:~0.75
 - Nvidia vs 鴻海:~0.65
 - 台積電 vs TSM ADR:~0.90
```

**沒做聯動分析 → 每天早上盲猜台股開盤**
**有做聯動分析 → 08:00 就知道今天大致方向**

---

## 📊 四大聯動模型

### 模型 1:**台積電 vs TSM ADR**(最強連動)

```python
def predict_tsmc_from_adr() -> dict:
    """
    根據 TSM ADR 預測台積電開盤
    
    歷史規律:
    - ADR 漲 1% → 台積電平均開 +0.85%
    - ADR 跌 1% → 台積電平均開 -0.9%
    """
    tsm_adr_change = get_latest_adr_change("TSM")
    predicted_open = current_tsmc_price * (1 + tsm_adr_change * 0.87)
    
    return {
        "predicted_open": predicted_open,
        "confidence": 85,
        "basis": f"ADR {tsm_adr_change:+.2f}%"
    }
```

---

### 模型 2:**費半 vs 台股電子**(產業連動)

```python
def predict_electronic_stocks() -> dict:
    """
    費半指數 → 台股電子類股
    
    規律:
    - 費半 +1% → 台股電子類股開盤平均 +0.7%
    - 影響對象:2330、2317、2454、2308、2379 等
    """
    sox_change = get_sox_change()
    
    affected_stocks = [
        "2330", "2317", "2454", "2308", "2379",
        "2382", "3034", "3008", "6669"
    ]
    
    return {
        "sox_change": sox_change,
        "predicted_sector_change": sox_change * 0.7,
        "most_affected": affected_stocks,
        "confidence": 75
    }
```

---

### 模型 3:**個股聯動對應表**

```python
# 建立明確的「美股 → 台股」對應
STOCK_LINKAGE_MAP = {
    "NVDA": {
        "primary": ["2317", "2382", "3231"],  # 鴻海、廣達、緯創
        "secondary": ["3037", "3017"],         # 欣興、奇鋐
        "correlation": 0.65,
    },
    "AAPL": {
        "primary": ["2317", "4938", "2382"],  # 鴻海、和碩、廣達
        "secondary": ["3008", "2474"],         # 大立光、可成
        "correlation": 0.55,
    },
    "AMD": {
        "primary": ["2454", "3034"],           # 聯發科、聯詠
        "secondary": ["2330"],                 # 台積電
        "correlation": 0.50,
    },
    "TSLA": {
        "primary": ["2308"],                   # 台達電
        "secondary": ["2327", "6121"],         # 國巨、新普
        "correlation": 0.40,
    },
    "META": {
        "primary": ["2317"],                   # AI 基建
        "correlation": 0.35,
    },
    # ... 更多
}
```

---

### 模型 4:**夜盤期貨 → 台股預測**

```python
def predict_from_taiex_futures() -> dict:
    """
    台指期夜盤 → 次日台股開盤
    
    規律:
    - 夜盤收盤點數基本 = 次日台股開盤預測
    - 誤差通常 < 50 點
    """
    futures_change = get_taiex_futures_night_change()
    
    return {
        "futures_change_points": futures_change,
        "predicted_taiex_change": futures_change * 0.95,  # 稍微打折
        "confidence": 80,
    }
```

---

## 📱 UI 呈現

### 每日早報新增「跨市場連動」區塊

```
┌─────────────────────────────────────┐
│ 🌏 跨市場連動(07:55 更新)            │
├─────────────────────────────────────┤
│                                     │
│ 📊 美股昨夜收盤                      │
│  道瓊   +0.8%                        │
│  那指   +1.2%                        │
│  費半   +1.8% ⭐                    │
│  S&P    +0.9%                        │
│                                     │
│ 📊 台積電 ADR:+2.3%                 │
│  → 預測台積電開盤:+25 元(+1.2%)    │
│                                     │
│ 📊 台指期夜盤:+185 點               │
│  → 預測大盤開盤:+170 點             │
│                                     │
│ 🎯 今日連動受惠族群:                  │
│                                     │
│  Nvidia +3% 帶動:                   │
│   ✅ 鴻海 2317(AI 供應鏈)          │
│   ✅ 廣達 2382                       │
│   ✅ 緯創 3231                       │
│                                     │
│  費半 +1.8% 帶動:                   │
│   ✅ 聯發科 2454                     │
│   ✅ 聯電 2303                       │
│                                     │
│ ⚠️ 逆風個股:                         │
│  Apple -1.5% → 和碩 4938 可能開低    │
│                                     │
│ 💡 綜合判斷:                          │
│  開盤偏多,重點佈局 AI 供應鏈         │
│  但 Apple 相關需注意                 │
└─────────────────────────────────────┘
```

---

## 🔄 聯動分析的執行時機

```
📅 時程:

04:00 TPE 美股收盤
04:05 系統抓取收盤數據
04:10 更新聯動預測

06:00 TPE 抓取最新期貨數據
06:30 更新預測

07:55 產出最終早報
08:00 推播給 Vincent
```

---

## 💾 資料庫

```sql
CREATE TABLE cross_market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    market_close_time TIMESTAMPTZ,
    
    -- 美股
    dji_close NUMERIC(10, 2),
    dji_change_pct NUMERIC(6, 2),
    nasdaq_close NUMERIC(10, 2),
    nasdaq_change_pct NUMERIC(6, 2),
    sox_close NUMERIC(10, 2),
    sox_change_pct NUMERIC(6, 2),
    sp500_close NUMERIC(10, 2),
    sp500_change_pct NUMERIC(6, 2),
    
    -- ADR
    tsm_adr_close NUMERIC(10, 2),
    tsm_adr_change_pct NUMERIC(6, 2),
    
    -- 關鍵個股
    nvda_close NUMERIC(10, 2),
    nvda_change_pct NUMERIC(6, 2),
    aapl_close NUMERIC(10, 2),
    aapl_change_pct NUMERIC(6, 2),
    
    -- 台指期夜盤
    taiex_futures_night_close NUMERIC(10, 2),
    taiex_futures_night_change NUMERIC(10, 2),
    
    -- 預測
    predicted_taiex_open NUMERIC(10, 2),
    predicted_tsmc_open NUMERIC(10, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date)
);
```

---

## 📊 預測準確度追蹤

```python
async def track_prediction_accuracy():
    """
    每天盤後比對:預測 vs 實際
    """
    today = date.today()
    
    prediction = await get_predicted_open(today)
    actual_open = await get_actual_open(today)
    
    error_pct = abs(prediction - actual_open) / actual_open * 100
    
    # 記錄
    await save_prediction_result({
        "date": today,
        "predicted": prediction,
        "actual": actual_open,
        "error_pct": error_pct,
    })
    
    # 如果連續錯 → 調整模型權重
    if check_recent_accuracy_below_threshold():
        await retrain_linkage_model()
```

---

## 🎯 Vincent 會得到什麼?

1. ✅ **每天 08:00 知道開盤大致方向**(而不是 09:00 才猜)
2. ✅ **聯動個股自動標記**(不用自己找)
3. ✅ **準確度持續優化**(系統自我學習)
4. ✅ **可以跨市場套利**(例如 TSM ADR 強 → 提早買台積電)

這就是**把台股+美股聯動真正落地**。
