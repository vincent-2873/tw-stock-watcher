# 🦆 VSIS · 呱呱投資招待所 · Claude Code 核心守則

**專案名稱**：VSIS (Vincent Stock Intelligence System) / 呱呱投資招待所 · Quack House
**部署網址**：https://tw-stock-watcher.zeabur.app/
**使用者**：Vincent (Page.cinhong)
**風格**：日式禪風 · 和紙米色 · 侘寂美學

---

## 🔴 讀取順序（每次啟動必遵守）

1. **先讀這份 CLAUDE.md**（核心守則）
2. **再讀 `.claude-code/` 目錄下所有文件**（細節規範）
3. **最後才看使用者新指令**

如果使用者的指令跟規則衝突，**先確認他是否要改規則**，不要自己決定。

---

## 🚫 七條絕不可違反的鐵則

### 1. 時間必須動態抓取
- ❌ 絕不寫死日期 / 時間（像 `"April 24, 2026"`）
- ✅ 必須從 `new Date()` 或資料庫的 `updated_at` 抓
- ✅ 前端顯示時間一律用 `Asia/Taipei` 時區
- ✅ 後端排程必須設定 `TZ=Asia/Taipei` 環境變數

### 2. 評級只能用 C/N/R/SR/SSR 五階
- ❌ 不可以自創「買進/持有/賣出」「強烈推薦」等文字級別
- ❌ 不可以用 1-5 星、A-F 等級
- ✅ 強制用：**C (0-20) / N (21-40) / R (41-60) / SR (61-80) / SSR (81-100)**
- ✅ 顏色：C 深灰 / N 中灰 / R 淺灰 / SR 朱紅 / SSR 金茶
- 詳見 `.claude-code/SCORING_SYSTEM.md`

### 3. UI 配色必須用 CSS 變數
- ❌ 不可直接寫死 `#F5EFE0` 等色碼
- ✅ 必須用 `var(--washi)`、`var(--sumi)` 等變數
- ✅ 新增顏色要加到 `:root` 再用
- 詳見 `.claude-code/UI_GUIDELINES.md`

### 4. 資料為空時隱藏區塊
- ❌ 不可顯示「—— 尚無 ——」「No data」等佔位文字
- ✅ 資料為空就整個區塊不 render
- ✅ 或顯示引導性 CTA（例：「還沒設定自選股？[開始設定]」）

### 5. FinMind API 必須用正確認證
- ✅ Token 必須從環境變數 `FINMIND_TOKEN` 讀取
- ✅ 使用者已付費 Sponsor 方案，必須用付費端點
- ✅ API 失敗時要 log 錯誤，不要靜默沿用舊資料
- 詳見 `.claude-code/DATA_RULES.md`

### 6. Line 通知必須經 AI 重要度判斷
- ❌ 不可以任何事件都推
- ✅ 重要度 < 6 的事件不推
- ✅ 每日總量控制在 10 則以內（重大事件除外）
- ✅ 必須用 Flex Message 格式，不用純文字
- 詳見 `.claude-code/LINE_NOTIFY_RULES.md`

### 7. 個股頁預設停在頁面頂部
- ❌ 不可自動捲到最下方 AI 對話框
- ✅ 預設位置：`window.scrollTo(0, 0)`
- ✅ AI 對話框放頁面底部，使用者主動滑下去

---

## 🎯 VSIS 核心哲學

**Slogan**：「教你思考，不是給你答案」

呱呱的角色：
- 🦆 不是助手，是**思考夥伴**
- 🦆 會給多空兩面、反對論點、風險警告
- 🦆 用「池塘、水位、甩轎、洗浮額」等意象
- 🦆 不預言股價、不給明牌
- 🦆 一定要有「反方觀點」（如果我錯了，會是哪裡錯？）

---

## 📊 VSIS 功能架構（最終版）

### 保留頁面
- 🏠 `/` 首頁：今日重點 + 呱呱晨報 + 三碗茶
- 📈 `/topics` 題材熱度：所有題材 + 供應鏈金字塔
- 📊 `/watchlist` 自選股：使用者追蹤的股票
- 🔍 `/stocks/[code]` 個股頁：C/N/R/SR/SSR + 呱呱視角
- 🗺️ `/sectors` 產業地圖：熱力圖 + 輪動
- 💬 `/chat` AI 對話：即時分析 + 對話歷史
- ⚙️ `/settings` 設定：Line 綁定 + 到價規則

### 砍掉頁面
- ❌ `/backtest` 回測
- ❌ `/paper` 模擬下單
- ❌ `/alerts` 警示獨立頁面（改成內建 + Line 通知）
- ❌ `/reports` 盤後報告（合併到首頁）

---

## 🆕 新增功能

1. **到價警示**：使用者自設
2. **盤後自動報告**：14:30 後產出，推 Line
3. **呱呱命中率**：記錄預測 vs 實際
4. **快速查個股**：搜尋框輸入代號/名稱

---

## 🛠️ 技術規範

### 資料庫
- PostgreSQL
- 新表必須包含 `created_at`, `updated_at`
- 重要資料必須有 `index`

### 前端
- Next.js App Router
- Tailwind CSS（但優先用 CSS 變數）
- 字體：Shippori Mincho + Zen Maru Gothic + Cormorant Garamond + JetBrains Mono

### 後端
- Cron 排程必須設 TPE 時區
- API 錯誤必須回 500 + 明確錯誤訊息
- 關鍵 API 必須有 retry 機制

### Line Bot
- 用 `@line/bot-sdk`
- 必須用 Flex Message
- Webhook 必須驗證簽章

---

## 💡 遇到不確定時的行為準則

1. **先讀 `.claude-code/` 相關文件**
2. **查看 `21_FINAL_MASTER_PLAN.md` 總指令書**
3. **若文件沒寫，問 Vincent，不要自己發揮**
4. **絕對不要為了「填空」就隨便產生假資料**

---

## 📝 部署前檢查清單

每次部署前確認：

- [ ] 時間是否動態？（不能寫死）
- [ ] 資料為空是否隱藏？（不能顯示「——」）
- [ ] 評級是否用 C/N/R/SR/SSR？
- [ ] CSS 是否用變數？
- [ ] FinMind Token 是否有效？
- [ ] Line 通知是否正確觸發？
- [ ] 個股頁是否停在頂部？
- [ ] 手機版是否好看？

---

## 🦆 給 Claude Code 的一句話

> **「這是 Vincent 長期投入的作品。
> 你的工作是執行規則，不是做決策。
> 每個決策 Vincent 都已經想過了，寫在這些文件裡。
> 照做就好，不用發揮。」**

---

**版本**：v1.0
**最後更新**：2026-04-23
**維護者**：Vincent + Claude（諮詢）
