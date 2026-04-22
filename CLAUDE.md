# 🤖 Vincent Stock Intelligence System
## Claude Code 開發指令書

> 這份文件是給 Claude Code 讀的。打開這個專案後,**你(Claude Code)應該從這裡開始**。

---

## 📌 專案身份

**名稱:** Vincent Stock Intelligence System (VSIS)
**版本:** v1.0 MVP
**目標使用者:** Vincent(個人投資者)
**部署環境:** GitHub + Supabase + Zeabur
**系統語言:** 繁體中文(介面)+ Python/TypeScript(程式)
**運作模式:** 半自動(系統分析 + 使用者確認 + 手動下單)

---

## 🎯 使命宣言

打造一個**「教我思考、不是給我答案」**的個人金融情報系統。

系統的核心信念:
1. **每個建議都要有根據,且使用者能看到根據**
2. **永遠給多空平衡,不是單邊鼓吹**
3. **標註信心度,不是假裝所有建議都一樣可靠**
4. **追蹤成效,讓使用者知道系統準不準**
5. **從使用者決策學習,持續優化**
6. **⭐ 系統要能跟 Vincent「討論」,不只是給答案**(詳見 spec 18)
7. **⭐ Vincent 可以質疑、補充、教系統,系統會學會並記住**
8. **⭐ 系統的終極目標是讓 Vincent 變成會判斷的投資人**
9. **⭐⭐ AI 會主動質疑 Vincent,攔住他的衝動與情緒化決策**(詳見 spec 19)
10. **⭐⭐ AI 不是「順從的助手」,是「救你不被自己騙」的夥伴**

**核心比喻:**
這不是「工具」,是「**夥伴 + 教練**」。
- 平時討論切磋(朋友)
- 危險時攔你一把(教練)
- 你做對時肯定你(夥伴)
- 你做錯時指正你(老師)

---

## 👤 使用者畫像(重要!所有決策都要回來對照)

```
姓名:Vincent
地區:台灣台中
職業:B2B 業務
可用時間:
  - 工作日早上 08:30-09:00(通勤)
  - 工作日中午 12:00-12:15(午餐)
  - 工作日晚上 21:00-22:00(下班)
  - 週末深度使用
  
投資經驗:初階→進階(42/100)
主要市場:台股(80%) + 美股(20%)
關注產業:AI 供應鏈、半導體、記憶體
風險承受:中等(單筆虧損上限 2%)
操作類型:波段 + 少量當沖
```

**系統所有功能的設計,都必須符合這個使用情境。**

---

## 🏗 系統架構(你必須先理解這個,才能開始寫程式)

### 高層架構圖

```
┌──────────────────────────────────────────────────┐
│                   Vincent 使用介面                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ LINE 推播 │ │ Web UI   │ │ Email報告│          │
│  └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────┬────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│                    API Gateway                    │
│              (Next.js API Routes)                 │
└─────────────────────┬────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐┌─────▼─────┐┌──────▼──────┐
│  決策引擎    ││  資料層   ││  通知引擎   │
│ (Decision)   ││  (Data)   ││ (Notify)    │
└───────┬──────┘└─────┬─────┘└──────┬──────┘
        │             │             │
┌───────▼─────────────▼─────────────▼──────┐
│          核心服務層 (Services)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 推論引擎  │ │ AI分析   │ │ 風險計算 │ │
│  ├──────────┤ ├──────────┤ ├──────────┤ │
│  │ 籌碼分析  │ │ 回測引擎 │ │ 績效追蹤 │ │
│  └──────────┘ └──────────┘ └──────────┘ │
└───────────────────┬──────────────────────┘
                    │
┌───────────────────▼──────────────────────┐
│           資料源層 (Data Sources)          │
│  FinMind │ FMP │ NewsAPI │ Claude API    │
│  證交所  │ 期交所 │ RSS    │ FRED        │
└──────────────────────────────────────────┘

      ┌───────────────────────────┐
      │   GitHub Actions (排程)    │
      │  ┌──早報 08:00─────────┐  │
      │  ├──當沖推薦 08:30─────┤  │
      │  ├──盤中監控 09-13:30──┤  │
      │  ├──盤後解析 14:30─────┤  │
      │  └──美股追蹤 21-05─────┘  │
      └───────────────────────────┘
```

### 技術堆疊

| 層級 | 技術選擇 | 理由 |
|------|---------|------|
| 前端 | Next.js 14 + TypeScript + Tailwind | 主流、快、SEO 友善 |
| UI 元件 | shadcn/ui + Recharts | 美觀、免費、中文友善 |
| 後端 | Python 3.11 + FastAPI | 金融資料處理強 |
| 排程(執行) | GitHub Actions (**Public Repo**) | 免費無限、穩定 |
| 排程(觸發) | **cron-job.org** | 精準觸發(秒級精度) |
| 資料庫 | Supabase (PostgreSQL) | 免費、好用、有 Auth |
| 部署 | Zeabur | 台灣、便宜、簡單 |
| AI | Claude Sonnet 4.5 API | 長文本、金融準 |
| 通知 | LINE Messaging API + SMTP | 免費、即時 |

> ⚠️ **Repo 必須設為 Public**!這樣 GitHub Actions 才是免費無限額度。
> 敏感資料(API Keys)放在 GitHub Secrets,加密儲存,不會公開。

---

## 📁 專案資料夾結構(你要建立這個)

```
vincent-stock-system/
│
├── README.md                    # 專案總覽
├── CLAUDE.md                    # 本檔(給 Claude Code)
├── .env.example                 # 環境變數範本
├── .gitignore
├── package.json                 # 根目錄(monorepo 設定)
│
├── backend/                     # Python 後端
│   ├── requirements.txt
│   ├── main.py                  # FastAPI 入口
│   │
│   ├── core/                    # 核心邏輯(不依賴外部)
│   │   ├── decision_engine.py   # 推論引擎
│   │   ├── risk_calculator.py   # 風險計算
│   │   ├── position_sizer.py    # 部位計算
│   │   └── scorer.py            # 評分系統
│   │
│   ├── services/                # 外部服務整合
│   │   ├── finmind_service.py
│   │   ├── fmp_service.py
│   │   ├── news_service.py
│   │   ├── ai_service.py
│   │   ├── twse_service.py      # 證交所
│   │   ├── taifex_service.py    # 期交所
│   │   └── notification_service.py
│   │
│   ├── analyzers/               # 分析模組
│   │   ├── fundamental.py       # 基本面
│   │   ├── chip.py              # 籌碼面
│   │   ├── technical.py         # 技術面
│   │   ├── catalyst.py          # 題材面
│   │   ├── fund_flow.py         # 資金流向
│   │   ├── day_trade.py         # 當沖分析
│   │   └── anomaly.py           # 異常偵測
│   │
│   ├── workflows/               # 工作流程
│   │   ├── morning_report.py    # 早報 (08:00)
│   │   ├── day_trade_pick.py    # 當沖推薦 (08:30)
│   │   ├── intraday_monitor.py  # 盤中監控
│   │   ├── closing_report.py    # 盤後解析 (14:30)
│   │   └── us_market.py         # 美股追蹤
│   │
│   ├── models/                  # 資料模型
│   │   ├── stock.py
│   │   ├── recommendation.py
│   │   ├── alert.py
│   │   └── user.py
│   │
│   ├── routes/                  # API 路由
│   │   ├── stocks.py
│   │   ├── watchlist.py
│   │   ├── alerts.py
│   │   └── reports.py
│   │
│   ├── utils/                   # 工具函式
│   │   ├── supabase_client.py
│   │   ├── logger.py
│   │   ├── time_utils.py
│   │   └── validators.py
│   │
│   └── tests/                   # 測試
│       ├── test_decision.py
│       ├── test_services.py
│       └── test_analyzers.py
│
├── frontend/                    # Next.js 前端
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   │
│   ├── src/
│   │   ├── app/                 # Next.js 14 App Router
│   │   │   ├── layout.tsx       # 全域布局
│   │   │   ├── page.tsx         # 首頁 Dashboard
│   │   │   ├── stocks/[code]/page.tsx
│   │   │   ├── watchlist/page.tsx
│   │   │   ├── day-trade/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   ├── components/          # UI 元件
│   │   │   ├── ui/              # 基礎元件 (shadcn)
│   │   │   ├── dashboard/       # Dashboard 元件
│   │   │   ├── charts/          # 圖表元件
│   │   │   └── alerts/          # 警報元件
│   │   │
│   │   ├── lib/                 # 工具函式
│   │   │   ├── api.ts           # API 呼叫
│   │   │   ├── supabase.ts
│   │   │   └── utils.ts
│   │   │
│   │   └── hooks/               # React Hooks
│   │       ├── useStock.ts
│   │       └── useAlerts.ts
│   │
│   └── public/
│
├── scripts/                     # GitHub Actions 用的腳本
│   ├── run_morning_report.py
│   ├── run_day_trade_pick.py
│   ├── run_intraday_monitor.py
│   ├── run_closing_report.py
│   └── run_us_market.py
│
├── .github/
│   └── workflows/
│       ├── morning-report.yml           # 08:00
│       ├── day-trade-recommendation.yml # 08:30
│       ├── intraday-monitor.yml         # 09:00-13:30
│       ├── closing-report.yml           # 14:30
│       └── us-market.yml                # 21:00-05:00
│
├── supabase/
│   ├── schema.sql               # 資料庫結構
│   ├── seed.sql                 # 初始資料
│   └── migrations/
│
└── docs/
    ├── SETUP.md                 # 部署指南
    ├── API.md                   # API 文件
    ├── DECISION_LOGIC.md        # 決策邏輯說明
    ├── UI_GUIDE.md              # UI 設計指南
    └── TROUBLESHOOTING.md
```

---

## 🚀 開發順序(你必須照這個順序)

### Phase 1:地基(Week 1-2)

**目標:能跑最基本的資料抓取**

- [ ] 建立完整資料夾結構(依上面)
- [ ] 設定 `.env.example` 與 `.gitignore`
- [ ] 寫 `backend/requirements.txt`
- [ ] 實作 Supabase schema(`supabase/schema.sql`)
- [ ] 實作 `backend/services/finmind_service.py`
- [ ] 實作 `backend/services/fmp_service.py`
- [ ] 實作 `backend/utils/supabase_client.py`
- [ ] 實作 `backend/utils/logger.py`
- [ ] 寫 3 個基本測試確認能抓資料
- [ ] 建立 Next.js 前端基本架構
- [ ] 確認前後端能通訊

**驗收:** `python backend/main.py` 能跑,且 `curl http://localhost:8000/api/stocks/tw/2317` 能回傳鴻海資料

---

### Phase 2:核心決策(Week 3-4)

**目標:能產生第一份「帶信心度」的分析**

- [ ] 實作 `core/scorer.py` (四象限評分)
- [ ] 實作 `core/decision_engine.py` (推論引擎)
- [ ] 實作 `core/risk_calculator.py` (停損停利)
- [ ] 實作 `core/position_sizer.py` (部位計算)
- [ ] 實作 `analyzers/fundamental.py`
- [ ] 實作 `analyzers/chip.py`
- [ ] 實作 `analyzers/technical.py`
- [ ] 實作 `analyzers/catalyst.py`
- [ ] 實作 `services/ai_service.py`

**驗收:** 呼叫 `decision_engine.analyze("2317")` 能回傳完整分析(含信心度、多空、停損停利)

---

### Phase 3:自動化(Week 5-6)

**目標:5 個排程都能跑**

- [ ] 實作 `workflows/morning_report.py`
- [ ] 實作 `workflows/day_trade_pick.py`
- [ ] 實作 `workflows/intraday_monitor.py`
- [ ] 實作 `workflows/closing_report.py`
- [ ] 實作 `workflows/us_market.py`
- [ ] 實作 `services/notification_service.py` (LINE)
- [ ] 寫 5 個 GitHub Actions workflow YAML
- [ ] 測試每個 workflow 能成功 trigger

**驗收:** 手動 trigger 任一 workflow,LINE 能收到推播

---

### Phase 4:前端 UI(Week 7-9)

**目標:可以從 Web 看到所有資料**

- [ ] Dashboard 首頁
- [ ] 個股詳細頁
- [ ] 自選股頁面
- [ ] 當沖推薦頁
- [ ] 報告頁面
- [ ] 設定頁面
- [ ] **身份驗證(spec 21)- LINE Login**
- [ ] **PWA 支援(spec 22)**
- [ ] 部署到 Zeabur

**驗收:** Vincent 從手機能打開網址看到完整系統

---

### Phase 5:學習系統上線(Week 10-12)⭐ 最重要

**目標:讓系統「會對話」、「會質疑」**

- [ ] **對話式 AI(spec 18)** - 個股頁可與 AI 討論
- [ ] **AI 質疑機制(spec 19)** - 四層保護
- [ ] 使用者偏好記錄
- [ ] 學習儀表板
- [ ] 決策追溯

**驗收:** Vincent 可以跟 AI 質疑系統判斷,AI 會記住並學習

---

### Phase 6:回測與驗證(Week 13-14)

**目標:用假錢驗證系統準不準**

- [ ] **歷史回測引擎(spec 20)**
- [ ] **模擬交易帳戶(spec 20)**
- [ ] 策略績效追蹤
- [ ] 走勢圖視覺化

**驗收:** Vincent 開模擬帳戶 3 個月,累計報酬可追蹤

---

### Phase 7:進階功能(Week 15+)

**目標:補齊 95 分系統**

- [ ] 資金流向分析(spec 04)
- [ ] 異常偵測引擎(spec 03)
- [ ] 供應鏈圖譜(spec 14)
- [ ] 飆股雷達(spec 13)
- [ ] 社群情報 + X VIP 追蹤(spec 12)
- [ ] 事件日曆(spec 16)
- [ ] 股票類別差異化(spec 23)
- [ ] 錯誤回報機制(spec 24)

---

## 📚 完整規格索引(Claude Code 必讀)

**24 份規格書,依類別分組:**

### 🏗 核心架構(1-9)
- `specs/01_decision_engine.md` - 決策引擎(四象限評分)
- `specs/02_day_trade_engine.md` - 當沖推薦(08:30)
- `specs/03_intraday_monitor.md` - 盤中監控(每 5 分)
- `specs/04_closing_report.md` - 盤後解析(14:30)
- `specs/05_ui_design.md` - UI 設計指南
- `specs/06_error_handling.md` - 錯誤處理
- `specs/07_github_actions.md` - 排程 YAML
- `specs/08_api_keys.md` - API 申請教學
- `specs/09_setup.md` - 部署步驟

### 🎯 關鍵機制(10, 17)
- `specs/10_zero_lag_scheduling.md` ⭐ - **分秒不差排程(鐵律)**
- `specs/17_time_and_freshness.md` ⭐ - **時間一致性 + 資料新鮮度(鐵律)**

### 🔍 情報與分析(11-14, 16)
- `specs/11_stock_query.md` - 指定股票查詢
- `specs/12_social_intelligence.md` - X + 社群情報(VIP 追蹤)
- `specs/13_stock_screener.md` - 飆股雷達(選股策略)
- `specs/14_supply_chain.md` - 供應鏈視覺化
- `specs/16_scheduled_events.md` - 法說會 / 財報 / 事件日曆

### 💼 交易與聯動(15)
- `specs/15_trading_and_linkage.md` - 半自動下單 + 台美聯動

### 🧠 系統靈魂(18-19)⭐⭐
- `specs/18_conversational_learning.md` ⭐⭐ - **對話學習(AI 是夥伴)**
- `specs/19_ai_challenge_user.md` ⭐⭐ - **AI 質疑使用者(AI 是教練)**

### 🛡 驗證與安全(20-21)
- `specs/20_backtest_papertrading.md` ⭐ - **回測 + 模擬交易(上線前必做)**
- `specs/21_authentication.md` - 身份驗證(LINE Login)

### 📱 維運與體驗(22-24)
- `specs/22_mobile_offline.md` - 手機 PWA + 離線
- `specs/23_stock_categories.md` - 股票類別差異化
- `specs/24_feedback_cost.md` - 錯誤回報 + AI 成本控制

---

## 🎨 UI 設計原則(讓前端照這個做)

### 核心原則

1. **手機優先(Mobile First)**
   - Vincent 通勤時間用手機看
   - 桌面版是「加強版」不是「標準版」

2. **資訊分層(Progressive Disclosure)**
   - 首屏:結論 + 信心度 + 立刻能做的事
   - 第二層:支持論點 + 反對論點
   - 第三層:原始資料 + 歷史對照
   - 使用者按「展開更多」才顯示更深資訊

3. **色彩語言**
   ```
   綠色 #10b981 → 看多 / 上漲 / 好消息
   紅色 #ef4444 → 看空 / 下跌 / 壞消息
   黃色 #f59e0b → 警示 / 需注意
   藍色 #3b82f6 → 資訊 / 分析
   灰色 #6b7280 → 中性 / 輔助
   ```

4. **信心度標示**
   ```
   🔥 90%+ 極高信心 (深綠)
   ✅ 75-90% 高信心 (綠)
   ⚡ 60-75% 中等信心 (黃)
   ⚠️ 45-60% 低信心 (橙)
   ❓ <45% 不建議採信 (灰)
   ```

5. **時間戳記**
   - 每個資料都要有「最後更新時間」
   - 過時資料要標示「⏰ 資料已過期」

### 主要頁面 Wireframe(文字版)

詳細 UI 設計請看 `ui-mockups/` 資料夾。

---

## 🚨 重要!開發時必守規則

### 規則 0:**分秒不差(Zero-Lag Scheduling)**

**Vincent 明確要求:「不要有分秒之差」**

GitHub Actions 原生 cron 會延遲 2-15 分鐘,這在金融系統**不可接受**。

**解決方案(詳見 `specs/10_zero_lag_scheduling.md`):**

1. **外部觸發器**:用 cron-job.org(免費)精準觸發 GitHub Workflow
2. **提早觸發 + 內部等待**:cron 提早 15 分鐘,Python 內部 `wait_until()` 等到精準時間
3. **預先載入**:等待時間不浪費,先抓好資料
4. **Loop 模式**:盤中監控用單一長駐 workflow,內部迴圈精準 5 分鐘間隔
5. **毫秒級精準**:最後 1 秒用 busy-wait,drift < 100ms

**所有 workflow 都必須:**
- 記錄 scheduled_time vs actual_start_time 的 drift
- Drift > 1 秒 → 寫入 system_health 為 degraded
- 連續 3 次 drift > 5 秒 → LINE 通知 Vincent

**Repo 必須設為 Public** 才能用 GitHub Actions 免費無限額度。

---

### 規則 1:每個建議都要有「可追溯證據」

❌ 錯誤做法:
```python
return {"recommendation": "買進", "stock": "2317"}
```

✅ 正確做法:
```python
return {
    "recommendation": "關注",
    "confidence": 75,
    "stock": "2317",
    "evidence": {
        "fundamental": {"score": 18, "max": 20, "reasons": [...]},
        "chip": {"score": 16, "max": 20, "reasons": [...]},
        ...
    },
    "bull_case": [...],
    "bear_case": [...],
    "risk_factors": [...],
    "data_snapshot": {
        "timestamp": "2026-04-22T08:30:00+08:00",
        "price": 213,
        "volume": 41762000,
        ...
    }
}
```

### 規則 2:所有建議都要存到資料庫(追溯)

每次產生建議,必須寫入 `recommendations` 表,欄位包括:
- 時間戳記
- 完整的 evidence
- 當時的資料快照
- 信心度
- 追蹤的 follow-up dates

這樣 30/60/90 天後可以自動驗證「系統準不準」。

### 規則 3:永遠要有「多空平衡」

AI 分析時,**強制產生兩組論點**:
1. 支持這個推薦的理由
2. 反對這個推薦的理由

不能只給單邊資訊。

### 規則 4:錯誤處理要友善

- API 壞掉 → LINE 通知 Vincent「系統有問題,今日報告延遲」
- 資料異常 → 標示「⚠️ 資料可能不準確」,不是當真資料
- AI 失敗 → 降級用規則式邏輯,不能開天窗

### 規則 5:使用繁體中文

- 所有介面文字:繁體中文
- 所有報告:繁體中文
- 程式碼註解:繁體中文(讓 Vincent 看懂)
- 程式碼本身:英文(標準)

### 規則 6:時間一致性鐵律(詳見 spec 17)

**這是金融系統的鐵律,違反 = 系統沒信用**

- 所有 UI 顯示時間 = **台灣時間(TPE)**,一定要帶 `TPE` 字尾
- 儲存用 UTC,顯示轉 TPE
- 美股事件**強制雙時區顯示**,格式:`02:00 TPE (14:00 ET)`
- 跨日美股事件要標明**日期 + 星期**
- 夏令冬令時間**自動切換**(用 `zoneinfo`)
- 台股開盤 09:00-13:30 TPE
- 美股開盤 21:30-04:00 TPE (09:30-16:00 ET)(夏令)
- 美股開盤 22:30-05:00 TPE (09:30-16:00 EST)(冬令)

### 規則 7:資料新鮮度鐵律(詳見 spec 17)

**系統絕不能用「舊資料」給 Vincent 建議**

- 每筆資料都必須有 `data_timestamp`、`fetched_at`、`valid_until`
- 推薦前**強制檢查**所有輸入資料的新鮮度
- 即時資料(股價)> 10 秒視為過期
- 盤中資料(籌碼)> 1 分鐘視為過期
- 關鍵資料過期 → **拒絕分析**(寧可不推薦也不給舊資料)
- 次要資料過期 → 降級分析 + 信心度扣 15 分
- UI 必須顯示「X 秒前更新」

### 規則 8:重要事件日曆(詳見 spec 16)

**推薦前必查「未來 30 天內有沒有重要事件」**

- 每日 05:00 TPE 自動同步:法說會、財報、除權息、FOMC、美股財報、處置股
- 自選股有事件 → 提前 7/3/1 天自動提醒
- Vincent 持股當日有事件 → 推薦時必須標註

### 規則 9:上線前必跑模擬交易(詳見 spec 20)

**Vincent 第一次不能用真錢,必須先通過模擬階段**

- 歷史回測達標(年化 > 大盤 5%、夏普 > 1、勝率 > 55%)
- 模擬交易 1 個月:實測勝率接近回測值
- 模擬交易 3 個月:橫跨多種市場狀態
- 小額真實交易 1 個月(20% 資金)
- 確認後才完整啟用

### 規則 10:身份驗證不可省(詳見 spec 21)

**沒有登入系統絕不上線**

- 優先用 LINE Login(Vincent 本來就有)
- 敏感資料加密儲存
- Supabase RLS 全啟用
- 可疑登入自動通知

### 規則 11:股票類別分策略(詳見 spec 23)

**不同類別股票用不同策略權重**

- 權值股:重基本面 + 法人
- 中小型股:重籌碼 + 題材
- 新上市 < 90 天:自動排除
- 全額交割 / 處置股:自動排除

### 規則 12:錯誤回報 + AI 成本保護(詳見 spec 24)

**系統要能從錯誤學習,且不會成本失控**

- 每個推薦都能一鍵回報
- 30 天後自動驗證誰對
- AI 成本有日 / 月硬上限
- 異常呼叫自動停止

### 規則 7:保護 Vincent

- 不給「一定會漲」這種結論
- 每份報告都附免責聲明
- 不鼓勵信用交易
- 警告投顧話術特徵

---

## 🔐 環境變數規格

見 `.env.example`。**你必須在 README 詳細說明每個變數從哪裡拿**(參考前一版 `docs/API_KEYS.md`)。

---

## 📊 資料庫設計

見 `supabase/schema.sql`。**重要表格**:
- `stocks` - 股票基本資料
- `watchlist` - 使用者自選股
- `recommendations` - 所有建議的歷史
- `alerts` - 警報紀錄
- `reports` - 每日報告內容
- `user_actions` - 使用者的反應(跟單/拒絕)
- `performance_tracking` - 推薦追蹤結果

---

## 🧪 測試策略

### 每個 Service 都要有測試

```python
# backend/tests/test_finmind_service.py

def test_get_stock_price_returns_data():
    service = FinMindService()
    data = service.get_stock_price("2317", "2026-04-01", "2026-04-22")
    assert len(data) > 0
    assert "close" in data[0]
```

### 每個 Workflow 都要有 Dry Run 模式

```python
# 測試用,不會真的發 LINE
python scripts/run_morning_report.py --dry-run
```

---

## 📝 給 Claude Code 的最後一句話

**你不是寫完所有程式碼就結束,你是要陪 Vincent 把系統運營起來。**

遇到不確定的地方:
- 問 Vincent(他會回答)
- 優先求「能動」,再求「完美」
- 每個 phase 結束都給 Vincent 看成果
- 發現問題要主動提出,不要硬做

**開始吧。從 Phase 1 的第一項開始做。**
