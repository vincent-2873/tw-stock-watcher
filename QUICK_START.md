# 🚀 給 Claude Code 的啟動指令

> Vincent 打開這個專案後,把下面的訊息貼給 Claude Code

---

## 🤖 首次啟動對話(複製貼上給 Claude Code)

```
你好,Claude Code!

我是 Vincent,這是我的個人股票分析系統專案。

請你:

1. 先閱讀 CLAUDE.md(核心開發指令書)
2. 閱讀 README.md(專案總覽)
3. 瀏覽 specs/ 資料夾的所有規格文件
4. 看過 schemas/supabase_schema.sql
5. 告訴我你理解了什麼,準備開始 Phase 1

**重要:**
- 每完成一個檢查項目,請回報確認
- 不確定的地方,問我再繼續,不要猜
- 遵守 CLAUDE.md 裡的 6 大規則
- 所有程式碼註解用繁體中文

讓我們開始吧!
```

---

## 🎯 Phase 1 的第一個任務

讀完規格後,跟 Claude Code 說:

```
好的,現在開始 Phase 1。

請建立專案結構:
1. 建立所有必要的資料夾(參考 CLAUDE.md)
2. 建立 backend/requirements.txt
3. 建立 .env.example 和 .gitignore
4. 建立 backend/main.py 的基本框架
5. 建立 backend/utils/logger.py
6. 建立 backend/utils/supabase_client.py

完成後給我看結構,確認沒問題我們再繼續。
```

---

## 💬 Phase 1 - 資料服務開發

```
專案結構 OK 了,現在實作資料服務:

1. 先做 backend/services/finmind_service.py
   - 支援抓股價、法人、籌碼
   - 要有重試機制
   - 要有錯誤處理
   - 加對應的 tests/test_finmind_service.py

2. 再做 backend/services/fmp_service.py
   - 美股股價
   - 加對應測試

3. 每個 service 都要能獨立呼叫測試

做完後我用這個指令驗證:
python -m pytest backend/tests/
```

---

## 💬 Phase 1 - Supabase 整合

```
資料服務 OK 了,現在整合 Supabase:

1. 實作 backend/utils/supabase_client.py
2. 建立 backend/models/ 下的所有模型
   - stock.py
   - recommendation.py
   - alert.py
   - user.py

3. 建立 backend/routes/stocks.py
   - GET /api/stocks/tw/{stock_id}
   - 回傳:從 Supabase 或 FinMind 抓資料

測試:
curl http://localhost:8000/api/stocks/tw/2317
應該回傳鴻海的資料
```

---

## 💬 Phase 2 - 核心決策引擎

```
Phase 1 完成了。現在開始 Phase 2,重點是決策引擎。

請依照 specs/01_decision_engine.md 完整實作:

1. backend/core/scorer.py(四象限評分)
2. backend/analyzers/fundamental.py
3. backend/analyzers/chip.py
4. backend/analyzers/technical.py
5. backend/analyzers/catalyst.py
6. backend/core/decision_engine.py(整合)
7. backend/core/risk_calculator.py
8. backend/core/position_sizer.py
9. backend/services/ai_service.py(Claude API 整合)

完成後測試:
python -c "
from core.decision_engine import DecisionEngine
import asyncio

async def test():
    engine = DecisionEngine()
    result = await engine.analyze('2317')
    print(result)

asyncio.run(test())
"

應該看到:
- 推薦結論
- 信心度 (0-100)
- 四象限評分
- 5 個看多理由
- 5 個看空理由
- 完整 action_plan
- data_snapshot

**重要:**
- 所有資料都要記到 recommendations 表
- 每個建議都要有 evidence
- 信心度計算要有邏輯(不是隨便給)
```

---

## 💬 Phase 3 - 自動化排程

```
Phase 2 完成。現在開始 Phase 3,做自動化。

依照 specs/07_github_actions.md 做:

1. 建立 scripts/run_morning_report.py
2. 建立 scripts/run_day_trade_pick.py(重要!)
3. 建立 scripts/run_intraday_monitor.py
4. 建立 scripts/run_closing_report.py
5. 建立 scripts/run_us_market.py
6. 建立 scripts/health_check.py

7. 對應 workflows:
   - .github/workflows/morning-report.yml
   - .github/workflows/day-trade-recommendation.yml
   - .github/workflows/intraday-monitor.yml
   - .github/workflows/closing-report.yml
   - .github/workflows/us-market.yml
   - .github/workflows/health-check.yml

8. 建立 backend/services/notification_service.py
   - LINE 推播
   - Email 備援

**重要:**
- 每個 workflow 失敗都要通知 Vincent
- 所有時間用台灣時區
- 盤中監控每 5 分鐘一次
- 當沖推薦在 08:30 執行

測試方法:
手動觸發 GitHub Action,看 LINE 有沒有收到
```

---

## 💬 Phase 4 - 前端 UI

```
Phase 3 完成。現在做前端。

依照 specs/05_ui_design.md 實作 Next.js 14 + TypeScript。

優先順序:
1. 基礎架構:frontend/src/app/layout.tsx
2. Dashboard: frontend/src/app/page.tsx
3. 自選股: frontend/src/app/watchlist/page.tsx
4. 個股: frontend/src/app/stocks/[code]/page.tsx
5. 當沖: frontend/src/app/day-trade/page.tsx
6. 盤後: frontend/src/app/reports/page.tsx
7. 設定: frontend/src/app/settings/page.tsx

使用:
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 元件
- Recharts 圖表

**重要:**
- 手機優先設計(375px)
- 繁體中文介面
- 資訊分層(首屏結論→展開詳情)
- 信心度用色階表示
- 所有資料用 Supabase 即時同步
```

---

## 💬 常用指令集

### 檢查系統狀態
```
請檢查:
1. 所有 tests 都過嗎?
2. 有 lint 錯誤嗎?
3. 有沒有未處理的 TODO?
4. 環境變數都有嗎?
```

### 修 bug
```
這個功能有問題:
[貼錯誤訊息或描述]

請:
1. 找出原因
2. 修復
3. 加測試避免復發
```

### 加功能
```
我想加一個功能:[描述]

請:
1. 先跟我討論實作方式
2. 確認後再動工
3. 依照 CLAUDE.md 的規則
```

### 優化
```
這段程式碼能優化嗎?[指定檔案]

優化方向:
- 效能 / 可讀性 / 正確性
```

---

## 🚨 緊急情況

### Claude Code 生成錯誤程式碼

```
你剛才生成的程式碼違反了 CLAUDE.md 的規則 X
請重新依照規格產生

具體問題:
- [列出問題]
```

### Claude Code 沒遵守規格

```
請你再讀一次 specs/XX.md 的 YY 段
你的實作與規格不符

請修正
```

### 一直卡在同一個問題

```
我們卡住太久了,請總結:
1. 目前卡在哪?
2. 你嘗試過什麼?
3. 還有什麼選項?
4. 建議下一步?
```

---

## 🎓 給 Vincent 的使用訣竅

### 訣竅 1:明確指示 > 開放式提問

❌ 不好:
```
「做一個分析功能」
```

✅ 好:
```
「依照 specs/01_decision_engine.md 的 Layer 2 規格,
 實作 backend/analyzers/chip.py
 完成後用這個指令測試:[指令]」
```

### 訣竅 2:一次一個任務

❌ 不好:
```
「同時做完 A、B、C 然後跑測試」
```

✅ 好:
```
「先做 A,做完給我看,確認後做 B」
```

### 訣竅 3:要求看中間產物

```
「寫 code 前先給我看你的規劃:
 - 要建哪些檔案?
 - 每個檔案負責什麼?
 - 預期怎麼運作?」
```

### 訣竅 4:善用 specs/ 資料夾

```
「這個功能有些細節不確定,
 請回頭看 specs/XX.md 的 YY 段
 照那邊寫的做」
```

### 訣竅 5:記得 commit 進度

```
「這個階段完成了,幫我:
 1. git add .
 2. git commit -m '清楚的訊息'
 3. git push」
```

---

## 🎯 預期時程

```
Day 1:申請 API、設定環境、Phase 1 開始(4 小時)
Day 2-4:Phase 1 完成
Day 5-10:Phase 2 完成
Day 11-14:Phase 3 完成(自動化上線!)
Day 15-30:Phase 4 前端開發
Day 31+:Phase 5 進階功能

全職:1-2 個月
業餘:3-6 個月
```

---

## 💡 最後提醒

**Vincent,你不需要懂程式碼也能完成這個專案。**

重要的是:
1. 你清楚知道自己要什麼(規格寫得很詳細)
2. 你會驗收(每個 Phase 結束測試一下)
3. 你有耐心(遇到問題不急躁)

**Claude Code 是你的工程師團隊,不是你的決策團隊。**

決策都是你的,程式碼讓它寫。

出發!🚀
