# ⏰ 時間一致性 + 資料新鮮度規格書

> Vincent 的原話:
> 「時間上要以台灣時間為主,如果是美國時間要特別寫美國時間
>  股市最重要的是時間準確,然後不是拉到舊款的資訊」
>
> 這份規格是金融系統的**鐵律**。違反這兩條,整個系統沒信用。

---

# Part 1:時間一致性鐵律

## 🚨 鐵律 1:**所有 UI 顯示都是台灣時間 (TPE)**

### ❌ 禁止做法

```
❌ "財報公布:14:30"          → 哪個時區?
❌ "美股開盤:09:30"          → 這是紐約時間
❌ "FOMC 會議:3:00 PM"       → 根本不清楚
```

### ✅ 正確做法

```
✅ "財報公布:14:30 TPE"
✅ "美股開盤:21:30 TPE (09:30 ET)"
✅ "FOMC 會議:02:00 TPE 週四 (14:00 ET 週三)"
```

**核心規則:**
1. 主要時間一定是台灣時間,格式 `HH:MM TPE`
2. 若為美股事件,**必須**用括號補上 `(HH:MM ET)`
3. 跨日事件要標明日期,例如 `週四 02:00 TPE (週三 14:00 ET)`

---

## 🚨 鐵律 2:**所有資料儲存都是 UTC**

```python
# ✅ 正確:儲存時用 UTC
from datetime import datetime, timezone

db_timestamp = datetime.now(timezone.utc)
supabase.insert({"created_at": db_timestamp.isoformat()})

# ❌ 錯誤:儲存時用本地時間
db_timestamp = datetime.now()  # 沒時區!
```

**為什麼?**
- 伺服器可能在不同時區
- GitHub Actions 是 UTC
- 未來跨市場擴展方便

---

## 🚨 鐵律 3:**時間顯示工具函式**

```python
# backend/utils/time_utils.py 新增

from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional

TPE = ZoneInfo("Asia/Taipei")
ET = ZoneInfo("America/New_York")


def format_for_display(
    dt: datetime, 
    market: str = "TW",
    show_both_zones: bool = False
) -> str:
    """
    統一的時間顯示函式 - 所有 UI 都必須用這個
    
    Args:
        dt: datetime 物件(應帶 tzinfo)
        market: 'TW' 或 'US'
        show_both_zones: 美股事件是否同時顯示兩個時區
    
    Returns:
        'HH:MM TPE' 或 'HH:MM TPE (HH:MM ET)'
    """
    # 強制轉為台北時間
    dt_tpe = dt.astimezone(TPE)
    tpe_str = dt_tpe.strftime("%H:%M TPE")
    
    # 若為美股事件,附加 ET
    if market == "US" or show_both_zones:
        dt_et = dt.astimezone(ET)
        
        # 跨日顯示(台灣凌晨 = 美東前一天)
        tpe_date = dt_tpe.strftime("%m/%d")
        et_date = dt_et.strftime("%m/%d")
        
        if tpe_date != et_date:
            return (
                f"{tpe_date} {dt_tpe.strftime('%H:%M')} TPE "
                f"({et_date} {dt_et.strftime('%H:%M')} ET)"
            )
        else:
            return f"{tpe_str} ({dt_et.strftime('%H:%M')} ET)"
    
    return tpe_str


def format_market_hours(market: str) -> str:
    """顯示各市場交易時段(以 TPE 為準)"""
    
    if market == "TW":
        return "台股:09:00-13:30 TPE(週一至週五)"
    elif market == "US":
        return "美股:21:30-04:00 TPE (09:30-16:00 ET)(週一至週五)"
    elif market == "US_dst":  # 美國夏令時間
        return "美股夏令:21:30-04:00 TPE (09:30-16:00 EDT)"
    elif market == "US_std":  # 美國冬令時間
        return "美股冬令:22:30-05:00 TPE (09:30-16:00 EST)"


def get_market_status(market: str = "TW") -> dict:
    """
    取得市場當下狀態
    
    Returns:
        {
            "is_open": bool,
            "status": 'pre_market' | 'open' | 'lunch' | 'closed' | 'weekend' | 'holiday',
            "next_event": '09:00 開盤 (還有 2 小時 30 分)',
            "current_time_display": '06:30 TPE'
        }
    """
    now = datetime.now(TPE)
    
    if market == "TW":
        return _get_tw_market_status(now)
    elif market == "US":
        return _get_us_market_status(now)
```

---

## 🚨 鐵律 4:**美國夏令/冬令時間自動處理**

```python
# 美國夏令時間(DST)切換:
# - 每年 3 月第 2 個週日開始(EDT: UTC-4)
# - 每年 11 月第 1 個週日結束(EST: UTC-5)

# 夏令:美股 21:30-04:00 TPE
# 冬令:美股 22:30-05:00 TPE

# ❌ 錯誤做法:寫死
def get_us_open_time_wrong():
    return "21:30 TPE"  # 只有夏令是對的!

# ✅ 正確做法:用 zoneinfo 自動處理
def get_us_open_time(target_date):
    market_open_et = target_date.replace(
        hour=9, minute=30, tzinfo=ET
    )
    return market_open_et.astimezone(TPE)
```

---

## 🚨 鐵律 5:**推播訊息格式必須清楚**

### ❌ 禁止格式

```
"今晚美股財報"        → 哪天?幾點?
"明天 3:00 FOMC"      → 哪邊的 3:00?
"下週一法說會"        → 沒日期沒時間
```

### ✅ 標準格式

**格式 A:單一市場事件**
```
📅 4/22 週二 14:00 TPE
台積電法說會
```

**格式 B:美股事件(強制雙時區)**
```
📅 4/24 週四 21:30 TPE (09:30 ET 週四)
Microsoft Q3 財報
```

**格式 C:跨日美股事件**
```
📅 4/25 週五 02:00 TPE (14:00 ET 週四)
FOMC 利率決議

⚠️ 注意時差:
 台灣時間週五凌晨 = 美東時間週四下午
 Vincent 週四睡前可以看到結果
```

---

# Part 2:資料新鮮度鐵律

## 🚨 鐵律 6:**每筆資料都要有時間戳記**

### 資料的四個時間

每一筆資料都要標註:

```json
{
    "data": { ... },
    "data_timestamp": "2026-04-22T08:29:00+08:00",
    // ^ 資料本身的時間(例:股價是幾點幾分的)
    
    "fetched_at": "2026-04-22T08:30:00+08:00",
    // ^ 我們抓到資料的時間
    
    "last_verified_at": "2026-04-22T08:30:00+08:00",
    // ^ 最後驗證資料還有效的時間
    
    "valid_until": "2026-04-22T08:35:00+08:00",
    // ^ 資料預期有效到幾點
}
```

---

## 🚨 鐵律 7:**不同類型資料的有效期**

```python
# backend/utils/data_freshness.py

DATA_FRESHNESS_RULES = {
    # 即時性資料(秒級)
    "realtime_price": {
        "max_age_seconds": 10,
        "warning_age_seconds": 5,
        "action_if_stale": "refresh_immediately",
    },
    
    # 近即時資料(分鐘級)
    "intraday_volume": {
        "max_age_seconds": 60,
        "warning_age_seconds": 30,
        "action_if_stale": "refresh",
    },
    
    # 盤中籌碼(盤後才更新)
    "institutional_data_today": {
        "updated_daily_at": "14:45 TPE",
        "max_age_hours": 24,
        "action_if_stale": "check_if_after_update_time",
    },
    
    # 分點籌碼
    "broker_detail_today": {
        "updated_daily_at": "15:00 TPE",
        "max_age_hours": 24,
    },
    
    # 財報(季度更新)
    "quarterly_report": {
        "max_age_days": 120,
        "warning_if_older_than_days": 90,
    },
    
    # 月營收(月度更新)
    "monthly_revenue": {
        "max_age_days": 40,
        "warning_if_older_than_days": 35,
    },
    
    # 新聞
    "stock_news": {
        "max_age_hours": 1,
        "for_current_analysis_max_minutes": 30,
    },
    
    # 社群貼文
    "social_posts": {
        "max_age_minutes": 15,
    },
    
    # 美股夜盤
    "us_market_overnight": {
        "max_age_minutes": 5,
        "during_us_market_hours": True,
    },
}
```

---

## 🚨 鐵律 8:**推薦前必須驗證所有資料新鮮**

```python
# core/decision_engine.py

async def analyze_stock(stock_id: str) -> dict:
    """
    分析前,強制檢查每個輸入資料的新鮮度
    """
    # Step 1: 抓所有資料
    data = await fetch_all_stock_data(stock_id)
    
    # Step 2: 檢查每個資料的新鮮度 ⭐
    freshness_check = validate_data_freshness(data)
    
    if not freshness_check.all_fresh:
        # 有過期資料!絕不能用
        stale_items = freshness_check.stale_items
        logger.error(f"⚠️ 過期資料:{stale_items}")
        
        if freshness_check.critical_stale:
            # 關鍵資料過期 → 拒絕分析
            return {
                "status": "error",
                "recommendation": "資料過期,暫無法分析",
                "stale_data": stale_items,
                "retry_after_seconds": 60,
            }
        else:
            # 次要資料過期 → 降級分析
            return {
                "status": "degraded",
                "recommendation": await partial_analysis(data, stale_items),
                "warning": f"以下資料未更新:{stale_items}",
                "confidence_penalty": 15,  # 信心度扣 15
            }
    
    # Step 3: 全部新鮮 → 正常分析
    return await full_analysis(data)
```

---

## 🚨 鐵律 9:**資料源健康監控**

```python
# scripts/data_freshness_monitor.py

async def monitor_data_sources():
    """每 5 分鐘執行,檢查所有資料源是否正常更新"""
    
    checks = [
        {
            "name": "FinMind 股價",
            "last_data_time_getter": get_latest_finmind_price_time,
            "expected_max_delay_minutes": 15,
            "during_market_hours_only": True,
        },
        {
            "name": "三大法人資料",
            "last_data_time_getter": get_latest_institutional_time,
            "expected_update_time": "14:45 TPE",
            "max_delay_after_expected_minutes": 30,
        },
        {
            "name": "NewsAPI",
            "last_data_time_getter": get_latest_news_time,
            "expected_max_delay_minutes": 60,
        },
        {
            "name": "X API",
            "last_data_time_getter": get_latest_x_post_time,
            "expected_max_delay_minutes": 10,
        },
        {
            "name": "FMP 美股",
            "last_data_time_getter": get_latest_fmp_us_time,
            "expected_max_delay_minutes": 15,
            "during_us_market_hours": True,
        },
    ]
    
    for check in checks:
        actual_delay = await calculate_delay(check)
        
        if actual_delay > check["expected_max_delay_minutes"]:
            await alert_vincent(
                f"🚨 {check['name']} 資料延遲 {actual_delay} 分鐘"
            )
            
            # 記錄到 system_health
            await mark_source_degraded(check["name"])
```

---

## 🚨 鐵律 10:**UI 必須顯示資料時間**

### ❌ 禁止

```
股價:213 元
```

### ✅ 強制

```
股價:213 元
⏱ 5 秒前更新

或

股價:213 元 ⚠️ 過期(更新於 15:45 TPE)
[立刻重新整理]
```

---

## 📱 UI 標準元件

### 時間標示元件

```tsx
// components/ui/TimeStamp.tsx

interface TimestampProps {
    datetime: string;  // ISO 8601
    market?: 'TW' | 'US';
    showRelative?: boolean;
    showBothZones?: boolean;
}

function Timestamp({ datetime, market, showRelative, showBothZones }: TimestampProps) {
    const absolute = formatForDisplay(datetime, market, showBothZones);
    const relative = getRelativeTime(datetime);  // "5 秒前"、"3 分鐘前"
    
    return (
        <span className="text-xs text-gray-500">
            {showRelative ? (
                <>
                    {relative}
                    <span className="ml-1 opacity-50">({absolute})</span>
                </>
            ) : (
                absolute
            )}
        </span>
    );
}

// 使用
<Timestamp datetime={stock.fetched_at} showRelative />
// "5 秒前 (13:45 TPE)"

<Timestamp datetime={fomc.event_time} market="US" />
// "02:00 TPE (14:00 ET)"
```

### 過期資料警告元件

```tsx
// components/ui/StaleDataWarning.tsx

function StaleDataWarning({ 
    dataAge, 
    maxAge, 
    dataType 
}: StaleDataWarningProps) {
    if (dataAge < maxAge) return null;
    
    return (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 my-2">
            <div className="flex items-center">
                <span className="text-yellow-500 mr-2">⚠️</span>
                <span className="text-sm">
                    {dataType} 資料可能過期
                    (距今 {formatDuration(dataAge)})
                </span>
                <button onClick={refreshData} className="ml-auto">
                    立刻更新
                </button>
            </div>
        </div>
    );
}
```

---

## 📊 系統健康度頁面(擴充)

```
┌─────────────────────────────────────┐
│ 🏥 資料新鮮度監控                    │
├─────────────────────────────────────┤
│                                     │
│ 現在時間:13:45:30 TPE               │
│                                     │
│ 📊 即時資料(目標 < 1 分鐘)          │
│  ✅ 股價       12 秒前   healthy    │
│  ✅ 成交量     18 秒前   healthy    │
│  ⚠️ 即時新聞   3 分鐘前  degraded   │
│                                     │
│ 📊 盤中資料(每 5 分鐘)              │
│  ✅ 技術指標   2 分鐘前  healthy    │
│  ✅ 異常偵測   剛剛     healthy    │
│                                     │
│ 📊 盤後資料                          │
│  ⏰ 三大法人   今日待更新            │
│      預計 14:45 更新(還有 59 分)   │
│  ⏰ 分點籌碼   今日待更新            │
│      預計 15:00 更新(還有 74 分)   │
│                                     │
│ 🌏 美股資料                          │
│  ✅ 昨夜收盤   04:05 TPE 更新       │
│  ✅ Nvidia     04:10 TPE 更新       │
│                                     │
│ 📅 行事曆資料                        │
│  ✅ 上次同步   今日 05:00 TPE       │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎯 完整時間一致性檢查清單

所有 UI 都必須符合:

- [ ] 時間字串有 TPE 或 ET 標示
- [ ] 美股事件**雙時區顯示**
- [ ] 過期資料有**過期警告**
- [ ] 每個資料都有**最後更新時間**
- [ ] 相對時間(5 分鐘前)與絕對時間**並列**
- [ ] 跨日事件標明**日期 + 星期**
- [ ] 夏令/冬令時間**自動切換**

---

## ⚠️ 不合格案例(絕對不能出現)

```
❌ "剛剛 Nvidia 大漲 3%"          → 幾點的剛剛?
❌ "財報將於 4:00 PM 公布"        → 哪個時區?
❌ "台積電最新價格:590"           → 最新是什麼時候?
❌ "美股昨夜收高"                 → 用昨夜是錯的(美東時間是今天)

✅ "Nvidia 在 03:42 TPE 大漲 3%(04:10 前的資料)"
✅ "財報於 04:00 TPE 公布(16:00 ET 週三)"
✅ "台積電:590(13:45 TPE 更新,3 分鐘前)"
✅ "美股 4/22 收盤(04:00 TPE) / 04/21 收盤(16:00 ET)"
```

---

## 🎯 Vincent 會得到什麼?

1. ✅ **再也不會搞混「昨天 / 今天」**(台灣 vs 美國)
2. ✅ **看得到每筆資料的時效**(知道是即時還是過期)
3. ✅ **過期資料自動警告**(不會基於舊資料做決策)
4. ✅ **美股事件雙時區標示**(知道要幾點看)
5. ✅ **夏令時間自動切換**(不用自己記)
6. ✅ **資料源健康度可見**(系統哪邊壞掉一目了然)

**這是金融系統的鐵律,違反 = 系統沒信用。**
