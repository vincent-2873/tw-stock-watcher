# NEXT_TASK — STAGE1-T1-PRICE-DIAGNOSIS（股價資料層診斷）

**授權等級**：🔒 READ-ONLY（只診斷不修）
**建立時間**：2026-04-26（CEO 寫入）
**接手者**：Claude Code（第三任 CTO 派任）
**範圍**：純診斷 — 0 LLM 呼叫、不修任何東西、不動 prompt/agent/IP

---

## 背景

2026-04-25 中午 Vincent 發現股價全錯：
- Yahoo 台積電 2330 = 2,185（真實）
- 系統前台顯示 ~1,050-1,100（錯）
- 比例約 0.47×，整整錯一半

前 CTO 沒抓到這個被換掉。第三任 CTO 接手第一個 task = 找根因。

注意：04-25 凌晨 SESSION_SUMMARY 寫「FinMind 2026-04-24 實收 2,185 元吻合 AI 回答」=> 04-24 還是對的，04-25 中午後才歪。

---

## 任務目標

搞清楚股價在哪一層歪——source / fetch / cache / DB / 顯示層——並提出證據。**只診斷不修。**

---

## 核心原則（違反任一條 = 任務失敗）

1. 先驗證再修：這個 task 只診斷，不准順手修任何東西
2. 不准放棄：工具不能用換工具、endpoint 不通讀 DB、DB 進不去看 log
3. 商業級數字化：寫「2330 系統 1050.5 / Yahoo 2185.0 / 誤差 51.9%」，不准寫「差不多」「應該」
4. 證據要求：每步驟附完整證據（curl 結果、SQL 結果、對照表），不附 = 沒做
5. 時間錨點：outbox 第一行寫從 /api/time/now 取的時間

---

## 階段 0：環境前置

- curl https://vsis-api.zeabur.app/api/time/now（權威時鐘）
- curl https://vsis-api.zeabur.app/health
- curl https://vsis-api.zeabur.app/watchdog
- curl -i 任一 FinMind endpoint 看 header 確認 plan = sponsor

任一條紅 → 停下、寫 outbox 報卡點、不繼續。

---

## 階段 1：5 檔台股 4 層對照

標的：2330 台積電、2317 鴻海、2454 聯發科、2308 台達電、2882 國泰金

每檔抓 5 個值：
- 前台顯示值（從 https://tw-stock-watcher.zeabur.app/ 抓 HTML）
- 系統 API 值（curl https://vsis-api.zeabur.app/api/stock/{symbol}）
- DB 存值（query Supabase stock_price 相關表）
- FinMind raw 值（直接打 https://api.finmindtrade.com/api/v4/data）
- Yahoo 真實值（https://tw.stock.yahoo.com/）

判定邏輯：
- 前台 ≠ API → 前端 cache/stale build
- API ≠ DB → backend 邏輯
- DB ≠ FinMind raw → cron/寫入問題
- FinMind raw ≠ Yahoo → 源頭問題

---

## 階段 2：3 檔美股 4 層對照

標的：AAPL、NVDA、MSFT
- 系統 API、DB、yfinance raw、Yahoo Finance

---

## 階段 3：歷史預測基準診斷

從 predictions 表抽樣 5 筆 v1 + 5 筆 v2，比對當時 entry_price vs FinMind 真實 close。

---

## 階段 4：根因分析（4 題）

- Q1：哪一層歪？
- Q2：系統性還是隨機？
- Q3：台股美股是否一致歪？
- Q4：歷史預測基準也歪嗎？

---

## 階段 5：寫 outbox

覆蓋 ceo-desk/outbox/LATEST_REPORT.md。

---

## 禁止事項（違反 = 任務失敗）

1. ❌ 不准修任何東西
2. ❌ 不准跳過驗證直接寫結論
3. ❌ 不准說「endpoint 200 所以資料對」
4. ❌ 不准說「我看不到」「做不到」
5. ❌ 不准用模糊詞
6. ❌ 不准呼叫 Claude API（這個 task 0 成本）
7. ❌ 不准跑 5 位分析師預測
8. ❌ 不准動 prompt、agent 設定、IP
9. ❌ 不准 archive / 刪除 / 隱藏過去 v1/v2 預測（鐵律）
10. ❌ Vincent 不在現場時不准順手做別的 task

---

## 完成條件

1. ✅ 階段 0 三條前置全綠
2. ✅ 階段 1 完整 5 檔台股對照表
3. ✅ 階段 2 完整 3 檔美股對照表
4. ✅ 階段 3 完整 10 筆歷史預測對照表
5. ✅ 階段 4 四題根因都有答案 + 證據
6. ✅ outbox 寫進 ceo-desk/outbox/LATEST_REPORT.md
7. ✅ outbox 第一行有系統時間
8. ✅ 工具使用紀錄完整（含失敗繞道）
9. ✅ 未動任何修改、未呼叫 Claude API
10. ✅ 卡點誠實列出

---

Task ID: STAGE1-T1-PRICE-DIAGNOSIS
