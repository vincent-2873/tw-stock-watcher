# 🏷 特殊股票類別處理規格書

> 不同股票類別策略要不同,IPO 新股要特別小心

---

# Part 1:股票類別分類

## 🎯 為什麼要分?

```
台積電(2330)和某檔中小型股:
 • 波動性不同(小型股波動大 3-5 倍)
 • 籌碼結構不同(小型股籌碼集中度高)
 • 外資影響力不同(小型股外資少)
 • 流動性不同(小型股易被操縱)

→ 統一策略 = 對誰都不夠準
→ 分類別調整策略 = 各取所長
```

## 📊 四大類別分類

```python
STOCK_CATEGORIES = {
    "mega_cap": {
        "name": "權值股",
        "criteria": "市值 > 5000 億",
        "examples": ["2330 台積電", "2317 鴻海", "2454 聯發科"],
        "strategy_weight": {
            "fundamental": 30,  # 基本面最重要
            "institutional": 35, # 法人動向很重要
            "technical": 20,
            "catalyst": 15,
            "chip_concentration": 0,  # 籌碼分散,不看
        },
        "traits": [
            "波動較小,穩定",
            "外資主導",
            "跟大盤連動高",
            "適合波段",
        ],
    },
    
    "large_cap": {
        "name": "中大型股",
        "criteria": "市值 500 億 - 5000 億",
        "examples": ["2382 廣達", "3231 緯創"],
        "strategy_weight": {
            "fundamental": 25,
            "institutional": 30,
            "technical": 25,
            "catalyst": 20,
            "chip_concentration": 0,
        },
    },
    
    "mid_cap": {
        "name": "中型股",
        "criteria": "市值 100 億 - 500 億",
        "examples": ["3017 奇鋐", "6488 環球晶"],
        "strategy_weight": {
            "fundamental": 20,
            "institutional": 20,
            "technical": 25,
            "catalyst": 25,
            "chip_concentration": 10,  # 籌碼開始重要
        },
        "traits": [
            "波動中等",
            "題材敏感",
            "可能有主力進場",
        ],
    },
    
    "small_cap": {
        "name": "中小型股",
        "criteria": "市值 < 100 億",
        "examples": ["小型股大多"],
        "strategy_weight": {
            "fundamental": 15,
            "institutional": 10,   # 外資少
            "technical": 25,
            "catalyst": 20,
            "chip_concentration": 30,  # 籌碼最關鍵
        },
        "traits": [
            "波動極大",
            "籌碼集中容易被操縱",
            "流動性風險",
            "主力味道重",
        ],
        "warnings": [
            "避免單一股票持有 > 5%",
            "設嚴格停損(-5% 以下)",
            "不要融資",
        ],
    },
}
```

## 🔧 決策引擎根據類別動態調整

```python
# core/decision_engine.py

async def analyze_stock_with_category(stock_id: str):
    """
    根據股票類別,動態調整評分權重
    """
    # 判斷類別
    category = classify_stock(stock_id)
    weights = STOCK_CATEGORIES[category]["strategy_weight"]
    
    # 用對應權重評分
    score = (
        fundamental_score * weights["fundamental"] / 100 +
        institutional_score * weights["institutional"] / 100 +
        technical_score * weights["technical"] / 100 +
        catalyst_score * weights["catalyst"] / 100 +
        chip_concentration_score * weights["chip_concentration"] / 100
    )
    
    # 加上類別警告
    if category == "small_cap":
        return {
            "score": score,
            "category": "小型股",
            "warnings": [
                "⚠️ 小型股風險較高",
                "建議部位上限 5%",
                "嚴格設定停損",
            ]
        }
    
    return {"score": score, "category": category}
```

---

# Part 2:IPO 與新上市股處理

## 🚨 為什麼新股要特別小心?

```
新上市(前 3 個月):
 ❌ 沒有技術面歷史(均線、RSI 算不出)
 ❌ 財報只有一兩季
 ❌ 主力常進場炒
 ❌ 蜜月期結束常崩

🎯 策略:系統預設「排除新上市 3 個月內」
       除非 Vincent 手動指定要看
```

## 🔧 實作

```python
# core/stock_filters.py

async def is_excluded_new_ipo(stock_id: str) -> bool:
    """
    判斷是否為應排除的新股
    """
    listing_date = await get_listing_date(stock_id)
    
    if not listing_date:
        return False
    
    days_since_listing = (date.today() - listing_date).days
    
    # 上市 < 90 天 → 排除
    if days_since_listing < 90:
        return True
    
    return False


async def get_recommendable_stocks():
    """
    取得可推薦的股票池(自動排除新股)
    """
    all_stocks = await get_all_listed_stocks()
    return [s for s in all_stocks if not await is_excluded_new_ipo(s.id)]
```

## 📅 IPO 追蹤(為了未來機會)

即使現在不推薦,也要追蹤:

```python
IPO_TRACKING = {
    # 上市 0-30 天:只觀察,不推薦
    "observation_period": {
        "days": 30,
        "track": ["price", "volume", "major_investors"],
        "label": "觀察期",
    },
    
    # 上市 30-90 天:累積資料
    "accumulation_period": {
        "days": 60,
        "track": ["technical_indicators_starting"],
        "label": "成長期",
    },
    
    # 上市 90+ 天:正式進入推薦池
    "mature": {
        "label": "成熟期",
    },
}
```

## 📱 UI 呈現

```
┌─────────────────────────────────────┐
│ 🆕 近期新上市股                      │
├─────────────────────────────────────┤
│                                     │
│ ⚠️ 新上市股波動大,系統暫不推薦       │
│    通常上市 90 天後才進入推薦池       │
│                                     │
│ 📊 近期新股追蹤:                     │
│                                     │
│ ┌───────────────────────────┐     │
│ │ XXXX 公司                    │     │
│ │ 上市日:2026/04/01(21 天)   │     │
│ │ 現價:120(上市價 100)       │     │
│ │ 🔍 系統評估:觀察期            │     │
│ │ 💡 建議:再等 69 天           │     │
│ └───────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

---

# Part 3:特殊股票警示

## 💀 必須警告的類別

```python
WARNING_STOCK_TYPES = {
    "full_delivery": {
        "name": "全額交割股",
        "reason": "營運出問題,不能信用交易",
        "action": "系統自動排除",
    },
    
    "alert_stock": {
        "name": "警示股",
        "reason": "處置股,流動性差",
        "action": "系統自動排除 + 警告",
    },
    
    "variable_trade": {
        "name": "變更交易",
        "reason": "公司財報異常",
        "action": "系統自動排除",
    },
    
    "suspended": {
        "name": "停止交易",
        "reason": "可能下市或重大事件",
        "action": "系統自動排除",
    },
    
    "penny_stock": {
        "name": "低價股 < 10 元",
        "reason": "波動大、流動性風險",
        "action": "警告,不建議",
    },
    
    "low_volume": {
        "name": "成交量 < 500 張/日",
        "reason": "流動性差,買不到也賣不掉",
        "action": "警告",
    },
    
    "high_concentration": {
        "name": "籌碼高度集中(前 10 券商 > 80%)",
        "reason": "可能被主力操縱",
        "action": "警告,需特別小心",
    },
}
```

---

# 🎯 Vincent 會得到什麼?

1. ✅ 權值股 vs 中小型股用不同策略
2. ✅ 新上市股自動排除(除非手動指定)
3. ✅ 全額交割等危險股自動排除
4. ✅ 籌碼集中的小型股主動警告
5. ✅ 各類別都有對應的風控建議
