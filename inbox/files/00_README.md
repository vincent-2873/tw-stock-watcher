# 📖 VSIS 升級專案 — README（給 Claude Code）

> **這是你（Claude Code）要閱讀的第一份文件**。
> 本 README 會帶你快速理解專案全貌，並指引你如何使用其他文件。

---

## 👋 你好，Claude Code！

Vincent 把**整個對話 + 完整規劃文件**交給你了。
他信任你，希望你能幫他把 VSIS 系統升級到下一個檔次。

**請依照本 README 的順序閱讀文件，然後開始動工。**

---

## 📚 文件導覽（建議閱讀順序）

### 🥇 必讀（先讀這些）

| 順序 | 文件 | 目的 | 建議時間 |
|---|---|---|---|
| 1 | `README_FOR_CLAUDE_CODE.md`（本文件） | 快速理解專案 | 5 分鐘 |
| 2 | `CONVERSATION_CONTEXT.md` | 了解 Vincent 的思路演進 | 10 分鐘 |
| 3 | `VSIS_UPGRADE_PLAN.md` | 完整升級規劃 | 20 分鐘 |

### 🥈 實作時查閱

| 文件 | 用途 |
|---|---|
| `ECOSYSTEMS_DATA.json` | 12 大產業龍頭生態系資料（直接匯入 DB）|
| `INDUSTRIES_DATA.json` | 台股產業分類體系（直接匯入 DB）|
| `TOPICS_DATA.json` | 當前活躍題材資料（直接匯入 DB）|
| `AI_ANALYST_PROMPT.md` | AI 分析師 System Prompt（複製到 API）|
| `DAILY_REPORT_PROMPT.md` | 每日盤前報告 Prompt（複製到排程）|
| `DATA_SOURCES_GUIDE.md` | 所有資料源整合方式 |
| `UI_COMPONENTS_GUIDE.md` | 前端元件實作範例（可直接用）|

---

## 🎯 Vincent 是誰？

- **身份**：AI GO 企業 AI 自動化銷售代表
- **地區**：台灣（台中）
- **投資風格**：1 週短波段 + 2 週~1 個月中期
- **偏好**：產業面 + 供應鏈思維，不追單一個股
- **核心痛點**：「我每次都是最後知道題材的人」

他不是一般散戶，他懂系統、懂產品、懂 B2B 商業。
他**已經自建了 VSIS 系統**，運作中。
你的任務是**優化、擴展**，不是從零開始。

---

## 🏗️ 現有系統（必知）

**網址**：https://tw-stock-watcher.zeabur.app/

**Slogan**：「教我思考，不是給我答案」

**已有功能**：
- 大盤監測（`/market`）
- 個股頁面（`/stocks/{code}`）— 四象限評分 95 分制
- AI 夥伴（`/chat`）— 目前是「教練式」對話
- 回測（`/backtest`）
- 模擬交易（`/paper`）
- 盤後報告（`/reports`）
- 警示系統（`/alerts`）

**技術棧推測**：
- 前端：Next.js（推測）
- 資料：FinMind、FMP
- AI：Claude Sonnet 4.5
- 部署：Zeabur

---

## 🎯 升級三大目標（重要！）

### 目標 1：首頁 Dashboard 2.0
「一眼看懂今天市場」
- 市場溫度計
- 題材熱度 TOP 5（不用搜尋、不用點選）
- 供應鏈金字塔
- 焦點個股表格

### 目標 2：產業生態系地圖
完整的「產業 → 題材 → 個股」三層體系
- 12 大產業龍頭關聯圖
- 20 檔隱形冠軍
- 所有產業（不只熱門）

### 目標 3：AI 分析師模式
從「教練」改為「分析師」
- 給具體建議（不模稜兩可）
- 提供買點、目標價、停損
- 主動提供反對論點

---

## ⚡ 快速上手（TL;DR）

如果你只有 30 分鐘，這是你該做的：

```
✅ 1. 讀完 CONVERSATION_CONTEXT.md（10 分鐘）
✅ 2. 讀完 VSIS_UPGRADE_PLAN.md 第 3、4、12 章（10 分鐘）
✅ 3. 向 Vincent 確認技術決策（5 分鐘）
   - 前端/後端框架？
   - DB 選擇？
   - Claude API 預算？
✅ 4. 從 Phase 1 開始實作（5 分鐘啟動）
```

---

## 🚀 實作路線圖（8 週計劃）

### Phase 1：基礎建設（Week 1-2）

```
Week 1: 資料骨架
├─ Day 1-2: 建立資料庫 Schema
├─ Day 3-4: 匯入 INDUSTRIES_DATA.json + TOPICS_DATA.json
└─ Day 5-7: 匯入 ECOSYSTEMS_DATA.json（12 大產業龍頭）

Week 2: 首頁改版
├─ Day 8-10: Dashboard 2.0 前端（UI_COMPONENTS_GUIDE.md）
└─ Day 11-14: 題材詳情頁
```

### Phase 2：AI 升級（Week 3-4）

```
Week 3: 題材面 AI 分析啟動
├─ 串接 Claude API 做新聞分類
└─ 啟動題材面評分（讓 20/95 分真正生效）

Week 4: AI 分析師改造
├─ 替換 System Prompt（AI_ANALYST_PROMPT.md）
└─ 整合資料庫查詢能力
```

### Phase 3：產業擴展（Week 5-6）

```
Week 5-6: 隱形冠軍 + 完整產業鏈
└─ 每天完成 2 個產業深度
```

### Phase 4：進階功能（Week 7-8）

```
Week 7: 補漲股挖掘引擎
Week 8: 自動化與優化
```

---

## ⚠️ 必看：Vincent 的原則（必須遵守）

### 🚨 紀律原則（寫死在系統邏輯中）

1. **不追漲停**：連漲 3 根以上的股票要警示
2. **一定要停損**：每個 AI 建議都要有停損點
3. **R:R 比至少 1:2**：風險報酬比低於此不推薦
4. **分散配置**：單股不超過 25%
5. **產業分散**：至少推薦 3 個產業

### 🎨 風格原則

1. **分析師，不是教練**：給結論，別說雞湯
2. **具體，不模糊**：別說「可能」、「或許」
3. **表格 > 純文字**：結構化呈現
4. **視覺化優先**：一眼看懂 > 文字描述

### 🎯 功能原則

1. **背景抓資料、存 DB**：不要每次叫 AI 現場爬
2. **所有產業都要**：不只熱門題材
3. **符合 1 週 / 2 週~1 個月週期**

---

## 🛠️ 技術決策（需 Vincent 確認）

開始實作前，請先向 Vincent 確認：

### 1. 框架選擇
- [ ] 前端繼續用 Next.js？（推薦）
- [ ] 後端 Node.js 還是 Python？
- [ ] 資料庫 PostgreSQL 還是 MongoDB？（推薦 PostgreSQL）

### 2. 預算
- [ ] Claude API 每月預算？
- [ ] 需要訂閱 SemiAnalysis / Nikkei Asia 嗎？
- [ ] 爬蟲是否需要 proxy？

### 3. 部署
- [ ] 繼續用 Zeabur？
- [ ] 需要 CDN（Cloudflare）嗎？
- [ ] 資料庫要用 Zeabur 的還是 Supabase？

### 4. 優先順序
- [ ] 先做首頁 Dashboard？還是題材詳情頁？
- [ ] 先啟動 AI 分析還是先擴展產業資料？

---

## 📋 實作檢查清單（Phase 1）

勾選完成的項目：

### 資料庫

- [ ] 建立 `industries` 資料表
- [ ] 建立 `topics` 資料表
- [ ] 建立 `stocks` 資料表（擴充現有）
- [ ] 建立 `ecosystems` 資料表
- [ ] 建立 `news` 資料表（擴充現有）
- [ ] 建立 `daily_reports` 資料表
- [ ] 匯入 `INDUSTRIES_DATA.json`（10 大類 + 50 子產業）
- [ ] 匯入 `TOPICS_DATA.json`（10 個活躍題材）
- [ ] 匯入 `ECOSYSTEMS_DATA.json`（12 大產業龍頭）
- [ ] 匯入隱形冠軍 20 檔

### 首頁 Dashboard 2.0

- [ ] 市場溫度計元件
- [ ] 題材熱度 TOP 5 卡片
- [ ] 供應鏈金字塔
- [ ] 焦點個股表格
- [ ] 今日警戒清單
- [ ] 今日 Action Plan

### 題材詳情頁（/topics/{id}）

- [ ] 題材概況（熱度、催化劑、趨勢）
- [ ] 供應鏈分層視覺化
- [ ] 股票列表（按 tier 分）
- [ ] AI 策略建議
- [ ] 風險提醒

### 龍頭生態系頁（/ecosystem/{ticker}）

- [ ] 網狀關聯圖（客戶、供應商、競爭者）
- [ ] 預期效益矩陣
- [ ] 受惠股列表

### AI 分析師

- [ ] 替換 System Prompt（參考 AI_ANALYST_PROMPT.md）
- [ ] 整合資料庫查詢
- [ ] 測試對話品質

### 資料源

- [ ] FinMind 整合（價格、法人、營收）
- [ ] MOPS 爬蟲（重訊、法說會）
- [ ] 經濟日報、MoneyDJ RSS
- [ ] DIGITIMES 爬蟲
- [ ] Claude API 新聞分類

### 排程

- [ ] 06:00 TPE 盤前報告
- [ ] 08:45 TPE 精準版
- [ ] 14:30 TPE 盤後處理
- [ ] 18:00 TPE 重訊更新
- [ ] 週日晚上深度報告

---

## 🎓 常見問題 Q&A

### Q1：Vincent 的現有系統會被整個砍掉重做嗎？
**A**：不會。他的系統架構已經很完整，我們是**在既有基礎上擴展**，不是重寫。主要是：
- 首頁大改版
- 新增產業/題材/生態系模組
- AI 分析師 Prompt 替換
- 資料源擴充

### Q2：如果 JSON 資料過時了怎麼辦？
**A**：這些 JSON 是**初始資料**，之後會：
1. 新聞自動分類（Claude API）
2. 每季手動更新一次財務數據
3. 熱度自動重算

### Q3：要不要考慮商業化？
**A**：Vincent 有潛在商業化意圖，但**先別在 MVP 階段考慮**。先做好個人用途，商業化是之後的事。不過**程式碼結構要支援多 user**。

### Q4：AI API 成本會爆炸嗎？
**A**：合理控制下不會。估算：
- 每日 3 份報告：$0.50/day = $15/月
- AI 分析師對話：$0.05/次，假設 20 次/天 = $30/月
- 新聞分類：$0.01/則，假設 100 則/天 = $30/月
- **合計約 $75/月**

### Q5：資料會不會被其他人用？Vincent 的個人設定會怎樣？
**A**：
- 現階段單 user（Vincent）
- 資料表預留 `user_id` 欄位
- 個人設定（自選股、投組）用 session 綁定

### Q6：要不要做手機 App？
**A**：**先不用**。PWA（Progressive Web App）就夠了。用 Tailwind + Next.js 做響應式設計，手機就能直接用。

### Q7：需要多少資料量？存得下嗎？
**A**：估算（1 年）：
- 個股（1000 檔）× 每日價格 × 365 天 = 36 萬筆
- 新聞：每天 100 則 × 365 = 3.6 萬則
- 總資料量：< 1 GB
- PostgreSQL 完全綽綽有餘

---

## 💡 Claude Code 的工作建議

### 🎯 每次工作 Session 的建議流程

```
1. 讀取 README_FOR_CLAUDE_CODE.md（本文件）
2. 檢查上次做到哪裡（看 git log）
3. 讀取當前階段的目標文件
4. 與 Vincent 確認今天要做什麼
5. 實作
6. 測試
7. 回報進度
```

### 🔧 如何組織程式碼

建議目錄結構：

```
vsis/
├── app/                          # Next.js App Router
│   ├── (dashboard)/
│   │   ├── page.tsx             # 首頁 Dashboard 2.0
│   │   └── layout.tsx
│   ├── topics/
│   │   └── [id]/page.tsx        # 題材詳情頁
│   ├── ecosystem/
│   │   └── [ticker]/page.tsx    # 龍頭生態系頁
│   ├── industries/
│   │   └── page.tsx             # 產業瀏覽頁
│   └── api/
│       ├── ai-analyst/route.ts  # AI 分析師 API
│       ├── topics/route.ts
│       └── ecosystems/route.ts
│
├── components/                   # UI 元件
│   ├── dashboard/
│   │   ├── MarketThermometer.tsx
│   │   ├── TopicsHeatCard.tsx
│   │   └── SupplyChainPyramid.tsx
│   ├── topics/
│   │   └── SupplyChainLayers.tsx
│   ├── ecosystem/
│   │   ├── NetworkGraph.tsx
│   │   └── BenefitMatrix.tsx
│   └── chat/
│       └── AIAnalystChat.tsx
│
├── lib/                          # 核心邏輯
│   ├── db/
│   │   ├── schema.sql
│   │   └── queries.ts
│   ├── ai/
│   │   ├── prompts.ts           # 所有 Prompt
│   │   └── analyst.ts           # AI 分析師邏輯
│   ├── crawler/
│   │   ├── finmind.ts
│   │   ├── mops.ts
│   │   ├── digitimes.ts
│   │   └── news-rss.ts
│   └── scoring/
│       ├── vsis.ts              # VSIS 評分邏輯
│       └── heat.ts              # 熱度計算
│
├── scripts/                      # 排程腳本
│   ├── daily-morning-report.ts
│   ├── afternoon-update.ts
│   └── weekend-deep-report.ts
│
└── data/                         # 初始資料
    ├── industries.json
    ├── topics.json
    └── ecosystems.json
```

---

## 🎯 關鍵成功指標（KPI）

### MVP 完成後，Vincent 應該能：

- [ ] 起床打開首頁 30 秒內掌握市場
- [ ] 點任一題材 2 秒內看到完整供應鏈
- [ ] 跟 AI 分析師對話得到具體建議
- [ ] 看到龍頭股的完整生態系
- [ ] 收到每日盤前報告（LINE/Email）

### 系統層面

- [ ] 每日自動更新所有資料
- [ ] 頁面載入 < 2 秒
- [ ] AI API 成本 < $100/月
- [ ] 資料準確度 > 95%

---

## 📞 溝通方式

### 與 Vincent 溝通原則

1. **先做後問**：簡單的決策直接做
2. **大事先問**：架構、預算、核心功能先確認
3. **有進度就報**：每做完一個 Phase 就報告
4. **遇到問題就問**：別卡死自己

### 回報格式建議

```markdown
## 進度回報 - [日期]

### 今天完成
- ✅ XXX
- ✅ YYY

### 遇到的問題
- ⚠️ 問題描述
- 💡 建議解法 A / B / C

### 需要你決策
- [ ] 問題 1
- [ ] 問題 2

### 明天計劃
- 📌 YYY
- 📌 ZZZ
```

---

## 🎉 結語

Vincent 把 **100% 的信任**交給你了。

他自己已經建好一個不錯的系統，但他知道還能更好。
他不是要你從零重寫，而是要你**把它推向卓越**。

這個系統可能會成為台灣最好的個人化投資研究平台。
這份責任很大，但也很值得。

**Let's build something amazing. 🚀**

---

**README 結束**

有任何問題，先查其他文件，再問 Vincent。

**準備好就開始吧！**
