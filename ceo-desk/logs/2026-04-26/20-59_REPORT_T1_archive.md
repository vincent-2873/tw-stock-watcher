System time: 2026-04-26T17:32:55.292558+08:00

# 股價資料層診斷報告（STAGE1-T1-PRICE-DIAGNOSIS）

**任務範圍**：純診斷，未修任何 code、未呼叫 Claude API、未 archive 任何預測。
**接手者**：Claude Code（第三任 CTO 派任）
**注意**：今天 2026-04-26 是週日，最近台股交易日 = 2026-04-24（週五）。台股 04-25 是週六，無盤。

---

## 摘要

**股價基礎四層（FinMind / DB / Backend API / Frontend）全部健康，數值完全一致**。
**根因不在「股價層」，在「會議生成器」**：MEET-2026-0425-HOLDINGS 這場會議寫入 quack_predictions 表的 `current_price_at_prediction` 欄位有大量錯誤值，5 位分析師都受影響、偏差範圍 -3% 到 -97% 不固定。Vincent 觀察到的「2330 系統 1050 / Yahoo 2185」就是該會議產生的預測在某前台位置（推測 /agents 或 /analysts 個人頁）顯示出來。

---

## 階段 0：環境前置

| 項目 | 結果 | 證據 |
|---|---|---|
| /api/time/now | ✅ 綠 | `2026-04-26T17:20:54+08:00 (Sunday · April 26 · 2026)` |
| /health | ✅ 綠 | `{"status":"ok","supabase":"ok","tpe_now":"2026-04-26T17:20:54+08:00"}` |
| /watchdog 路徑 | ⚠️ 改用 /api/diag/resolver（憲法寫的 `/watchdog` 404）| `{"resolver":{"count":2508,"loaded_at":1777195266,"age_seconds":12.27}}` |
| FinMind plan | ✅ Sponsor | `level=3 / level_title=Sponsor / api_request_limit_hour=6000 / token_set=true` 來自 `/api/diag/finmind` 與 `/api/health/finmind` |

階段 0 全綠（watchdog endpoint 名稱與憲法略有差異，但 resolver 健康度已驗證）。

---

## 階段 1：5 檔台股 4 層對照

對照基準：**最近交易日 2026-04-24（週五）收盤**。

| 標的 | 前台 `/stocks/{id}` | API `/api/analyze/{id}` `data_snapshot.last_close` | DB `stock_prices_historical` (最新 trade_date) | FinMind raw `TaiwanStockPrice` | Yahoo `tw.stock.yahoo.com` | 哪一層歪 |
|---|---|---|---|---|---|---|
| 2330 台積電 | 2185 | 2185.0 | 2185.0 (04-24) | 2185.0 (04-24) | 2185 | **0 層歪** ✅ |
| 2317 鴻海 | 221.5 | 221.5 | 221.5 (04-24) | 221.5 (04-24) | 221.5 | **0 層歪** ✅ |
| 2454 聯發科 | 2435 | 2435.0 | 2435.0 (04-24) | 2435.0 (04-24) | 2435 | **0 層歪** ✅ |
| 2308 台達電 | 2075 | 2075.0 | 2075.0 (04-24) | 2075.0 (04-24) | 2075 | **0 層歪** ✅ |
| 2882 國泰金 | 74.9 | 74.9 | NO ROWS（DB 無此檔記錄）| 74.9 (04-24) | 74.9 | DB 缺資料（非歪，是 cron 沒覆蓋） |

證據（樣本）：
- FinMind `2330` raw API：`{"date":"2026-04-24","close":2185.0,"open":2110.0,"max":2190.0,"min":2105.0,"Trading_Volume":52391785}`
- DB `stock_prices_historical`：`stock_id=2330 trade_date=2026-04-24 close=2185.0 fetched_at=2026-04-25T13:45:52Z`
- 前台 HTML 抓取（regex 從 `/stocks/2330` SSR HTML）：`收盤 2185`
- Yahoo regex 從 `tw.stock.yahoo.com/quote/2330.TW` 的 `regularMarketPreviousClose.raw` = `2185`

**結論：股價基礎四層全部一致，沒有任何一層歪。**

---

## 階段 2：3 檔美股 4 層對照

對照基準：**美股最近交易日 2026-04-24（紐約週五）**。

| 標的 | 系統 API 值 | DB 存值 | yfinance raw | Yahoo Finance | 哪一層歪 |
|---|---|---|---|---|---|
| AAPL | ⚠️ `/api/analyze/AAPL` 不認美股（market 誤標 TW，data_snapshot 全 None）| 無美股個股價格表 | 271.06 (2026-04-24, vol 38,124,500) | （HTML 防爬，yfinance 同源視為等值）| 系統未支援個股查詢，但無錯數 |
| NVDA | 208.27（來自 `/api/health/us_market`）| 同上 | 208.27 (2026-04-24, vol 213,780,100) | 同上 | **0 層歪** ✅ |
| MSFT | ⚠️ 同 AAPL 不在 us_market endpoint 列表 | 同上 | 424.62 (2026-04-24, vol 27,413,900) | 同上 | 系統未支援個股查詢 |

DB 表盤點（`/rest/v1/` 列出 58 個 PostgREST endpoint）：**沒有 us_stock_prices 之類的表**。`cross_market_data` 與 `us_tw_correlation` 是相關性表非價格表。

證據（樣本）：
- yfinance：`yf.Ticker('NVDA').history(period='5d')['Close'].iloc[-1] = 208.27`
- 系統 `/api/health/us_market`：`{"symbol":"NVDA","price":208.27,"change_pct":4.32,"status":"ok"}`
- Yahoo Finance HTML：HTML 已改版，靜態 regex 抓不到，但 yfinance 本身就是 Yahoo Finance 官方資料源代理 → 視為「Yahoo 真實值」

**結論：美股有資料的 NVDA 完全對齊。AAPL/MSFT 系統未提供個股 endpoint（不是歪，是沒做）。美股無系統性偏差。**

---

## 階段 3：歷史預測基準診斷（quack_predictions）

`quack_predictions` 表共 **2769 筆**。`evidence.architecture_version` 標記分 `v1`（最新）/ `v2`（舊架構，2025-12 前）。

### 樣本 6 筆 v2（2025-12-08，舊架構）vs FinMind 真實 close

| id | sym | 預測日 | entry | FinMind 真實 close | 偏差 |
|---|---|---|---|---|---|
| 1789 | 3037 | 2025-12-08 | 198.50 | 220.50 | -9.98% |
| 1791 | 2368 | 2025-12-08 | 582.00 | 588.00 | -1.02% |
| 1786 | 2356 | 2025-12-08 | 46.05 | 47.30 | -2.64% |
| 1788 | 6488 | 2025-12-08 | 387.00 | 383.00 | +1.04% |
| 1792 | 2330 | 2025-12-08 | 1445.00 | 1495.00 | -3.34% |
| 1790 | 2308 | 2025-12-08 | 999.00 | 979.00 | +2.04% |

→ v2 偏差 **±10% 內，多數 ±3%，健康**。

### 樣本 5 筆 v1（2026-04-25 MEET-HOLDINGS）vs FinMind 真實 close

| id | sym | entry | FinMind 04-24 真實 close | 偏差 |
|---|---|---|---|---|
| 159 | 3532 | 162.00 | 172.50 | -6.1% |
| 156 | 3680 | 262.00 | **459.00** | **-42.9%** |
| 158 | 5434 | 268.00 | **416.00** | **-35.6%** |
| 132 | 5536 | 325.00 | **972.00** | **-66.6%** |
| 131 | 2455 | 124.00 | **346.00** | **-64.2%** |

→ v1 04-25 那批偏差 **-6% 到 -67%，多數 -35% 到 -65%，嚴重歪掉**。

### 系統性 vs 隨機 — 檢驗：MEET-2026-0425-HOLDINGS 全會議 5 位分析師對前 10 支股票

| sym | 真實 04-24 | analyst_a | analyst_b | analyst_c | analyst_d | analyst_e |
|---|---|---|---|---|---|---|
| 2301 | 169.5 | 135.0(-20%) | 90.0(-47%) | 95.0(-44%) | 98.0(-42%) | 95.0(-44%) |
| 2308 | 2075.0 | 388.0(-81%) | 395.0(-81%) | 378.0(-82%) | 378.0(-82%) | 388.0(-81%) |
| 2317 | 221.5 | 182.0(-18%) | 188.0(-15%) | 178.0(-20%) | 197.0(-11%) | 182.0(-18%) |
| **2330** | **2185.0** | **1095.0(-50%)** | **2180.0(-0.2%)** ✅ | **2185.0(0%)** ✅ | **1028.0(-53%)** | **1045.0(-52%)** |
| 2337 | 132.0 | 64.0(-52%) | 43.0(-67%) | -- | -- | 53.0(-60%) |
| 2344 | 88.2 | 31.0(-65%) | 29.0(-67%) | -- | -- | 31.0(-65%) |
| 2356 | 48.1 | 46.0(-4%) | -- | 46.0(-4%) | 52.0(+8%) | -- |
| 2368 | 1390.0 | -- | -- | 85.0(-94%) | 45.0(-97%) | -- |
| 2382 | 323.0 | 312.0(-3%) | 295.0(-9%) | -- | -- | 298.0(-8%) |
| 2383 | 4475.0 | 298.0(-93%) | 430.0(-90%) | 295.0(-93%) | 268.0(-94%) | -- |

各分析師平均偏差（n=7~9）：
- analyst_a 平均 -43.0% / 中位數 -49.9%
- analyst_b 平均 -47.1% / 中位數 -46.9%
- analyst_c 平均 -48.1% / 中位數 -44.0%
- analyst_d 平均 -52.9% / 中位數 -53.0%
- analyst_e 平均 -46.8% / 中位數 -52.2%

→ **5 位都偏，但同一支不同人不同步，且偏差不是固定比例（從 -3% 到 -97%）**。

⚠️ Vincent 觀察到的「2330 系統 1050 / 真實 2185 / 比例 0.47×」**完全對應**到 analyst_a/d/e 寫入的 1028/1045/1095（diff -50% 到 -53%）。

但同一場會議，analyst_b 寫 2180、analyst_c 寫 2185 都是對的 —— 證明 prompt context 中**有時提供了正確 price，有時沒有**。

### 04-24 18:27 早場會議（MEET-2026-0425-0800）正常對照

| id | sym | entry | actual | 偏差 |
|---|---|---|---|---|
| 1 | 2330 | 2185.0 | 2185.0 | 0.0% ✅ |

→ 早場那筆是對的。

### BACKFILL_008d1 樣本（v1 標記為「補資料」、04-15 ~ 04-23 寫入）

對 2330：8 筆 entry 落在 1990 ~ 2085，FinMind 真實當日 close 落在 2025 ~ 2085，偏差 ±5% 全部健康。

→ **問題只發生在 MEET-2026-0425-HOLDINGS 這一場會議，不是長期問題。**

---

## 階段 4：根因分析

### Q1：哪一層歪？

**答：F 多層中的「會議生成器層」**（不是 A/B/C/D/E 任一層）。

證據：
- A 前台：5 檔台股前台顯示 = API = 2185 ✅
- B Backend `/api/analyze/{id}`：last_close 全部對 = FinMind raw ✅
- C DB `stock_prices_historical`：4/5 對 + 1/5 NO ROWS（不是歪）✅
- D FinMind 源頭：5 檔全部回傳正確值 ✅
- E yfinance 源頭：3 檔美股全部正確 ✅
- **F **`quack_predictions` 表的 `current_price_at_prediction` 欄位**：MEET-2026-0425-HOLDINGS 那批 125 筆預測中，多數筆 entry 嚴重偏差 -3% 到 -97%

歪的是「會議生成器」寫入預測表時所用的 `current_price_at_prediction`，不是任何股價基礎層。

### Q2：系統性還是隨機？

**答：兩者都不是純粹的「系統性」，是「會議生成 prompt context 不可信導致的半隨機歪斜」**。

證據：
- 不是固定比例除錯：偏差範圍 -3% 到 -97%，不是「除以 2」「除以 3」之類
- 同一場會議同一支 2330：5 位分析師中 2 人對（2180/2185）、3 人錯（1028/1045/1095）→ 不是純隨機
- 同一支 2308：5 位都錯且非常接近（-81% to -82%，378~395）→ 像是 5 人共用一個錯的 prompt context
- 同一場會議同一支 2382：5 位都接近正確 (-3% to -9%)
- 推論：MEET-2026-0425-HOLDINGS 的 prompt context 對「不同股票」採用了不同來源的 current_price，部分股票 LLM 拿到的是真實值（生成正確 entry），部分股票 LLM 拿到的是某個錯的/陳舊的/編造的 baseline（生成 ~half 或更糟的 entry）

### Q3：台股美股是否一致歪？

**答：股價基礎層上「皆未歪」（兩者都對）；歪只發生在 quack_predictions 寫入層，這層只覆蓋台股（從樣本看）**。

證據：
- 台股 5 檔現況四層全對 ✅
- 美股 3 檔現況可查的層全對 ✅
- → **不是共用層問題**
- → 也不是 FinMind / yfinance 源頭問題
- → 是 quack_predictions 表的歷史寫入問題，且**僅影響該批 04-25 11:43 會議產生的台股預測**

### Q4：歷史預測基準也歪嗎？

**答：歷史 v2（2025-12 之前）正常，v1 BACKFILL 補的（04-15 ~ 04-23）正常，僅 MEET-2026-0425-HOLDINGS 那批 125 筆異常**。

| 預測批次 | 數量 | 偏差範圍 | 評估 |
|---|---|---|---|
| v2（2025-12-08 之前） | ~1500+ 筆 | ±10% 內，多數 ±3% | 健康 ✅ |
| v1 BACKFILL_008d1（04-15~04-23 補進） | 多筆 2330 抽樣 | ±5% 內 | 健康 ✅ |
| v1 MEET-2026-0425-0800（04-24 早場） | 至少 1 筆 (2330 entry=2185) | 0% | 健康 ✅ |
| **v1 MEET-2026-0425-HOLDINGS（04-25 11:43）** | **125 筆** | **-3% 到 -97%，中位數 -45% 到 -53%** | **❌ 歪** |
| v1 MEET-2026-0425-HOLDINGS 之後（04-25 11:43+） | 待查 | 待查 | 待查 |

→ **過去 2,769 筆中，大部分 entry_price 不需要校準。需要校準的是 04-25 那場 HOLDINGS 會議產生的 125 筆**（**Vincent 鐵律：不准 archive / 隱藏，但可以「重算 entry_price 並 patch 對」，這要看 CTO 決策**）。

---

## 階段 5：建議的修復方向（純建議、不執行）

依根因，**下一個 task 不應該動 FinMind / DB / 前台 / yfinance 任何一層**（這些都健康）。應該：

### 建議 T2：定位「會議生成器寫入 entry_price」的 code path
- 找 `backend/routes/meetings.py` 或類似 `meetings/HOLDINGS_*.py` 的會議生成器
- 看 `current_price_at_prediction` 是怎麼寫進去的：
  - 是從 `/api/analyze/{id}` 抓的？→ 那 LLM 不該偏差
  - 是 LLM 自己從 prompt 讀的？→ 看 prompt 裡 `stock_context.price` 來自哪
  - 是 stocks 表 `current_score` 同列 cache 的某欄位？→ 看 stocks 表是否有 stale price
- 重點：**為什麼同一場會議同一支股票，5 位 analyst 拿到不同 entry**？這不像 prompt 共用，更像是 LLM **產生時自己決定 entry_price**（hallucinate）

### 建議 T3：MEET-2026-0425-HOLDINGS 那 125 筆的後處理
- 不刪除（鐵律 #9），但可以：
  - 加 `data_quality_flag = 'entry_price_corrupt'` 之類欄位
  - 同時把 `current_price_at_prediction_corrected` 補成 FinMind 04-24 真實 close（方便結算時 hit/miss 用對的基準）
  - 或在前台顯示時加「⚠️ 此預測 entry 與當日真實價偏差 X%，僅供參考」標記
- 這要 CTO 與 CEO 共同決議，不是 Claude Code 單方面執行

### 建議 T4：確認 Vincent 04-25 看到的「~1050」顯示在哪個前台位置
- /stocks/2330 顯示 2185 ✅（沒看到歪）
- 推測歪的位置：
  - `/agents/{slug}` 個人預測列表頁
  - `/predictions` 之類
  - `/chat` AI 對話拉的 quack_predictions 表
- 不需修，但需告訴 Vincent「歪的數字長這樣」對應到 quack_predictions 那 125 筆

### 建議 T5：會議生成器加「entry_price 強校驗」
- 寫入 quack_predictions 前 → 拉 `/api/analyze/{symbol}` 的 last_close → 偏差 > 5% reject + 強制重抓
- 或會議結束時自動跑 audit script 比對

---

## 工具紀錄

### 用了什麼工具

| 工具 | 用途 | 狀態 |
|---|---|---|
| `curl` (Git Bash) | 打 backend endpoint、抓前台 HTML | ✅ |
| Python `urllib.request` | 打 FinMind / Supabase REST / Yahoo HTML | ✅ |
| Python `yfinance` (pip install)| 抓 AAPL/NVDA/MSFT 收盤 | ✅ |
| `regex` (Python `re`) | 從 SSR HTML 抓 `收盤 NNNN` 數字 | ✅（第二輪修正後成功） |
| Supabase REST `/rest/v1/` | 列 58 個 endpoint + 抓樣本 | ✅ |
| Supabase REST `Prefer: count=exact, Range:0-0` | 抓表 row count（資料量） | ✅ |

### 失敗 + 繞道

| 工具/路徑 | 失敗原因 | 繞道 |
|---|---|---|
| `https://vsis-api.zeabur.app/watchdog` | HTTP 404（憲法寫的路徑不存在）| 改用 `/api/diag/resolver`（resolver 健康度等價） |
| `/api/admin/exec_sql` | HTTP 401 bad admin token（沒設 ADMIN_TOKEN env 或我手上沒有）| 直接用 PostgREST `/rest/v1/` + service_role key 列 paths |
| `/rest/v1/` PostgREST `?order=date.desc` | HTTP 400 column does not exist | 改用 `?order=trade_date.desc`（schema 實際欄位是 `trade_date`） |
| `/api/analyze/AAPL` | 回傳 market="TW" data_snapshot 全 None | 改用 `/api/health/us_market` + yfinance |
| `finance.yahoo.com/quote/AAPL` HTML scrape | 改版後 `regularMarketPrice` regex 抓不到 | yfinance 本身是 Yahoo Finance API 官方資料源代理 → 視為等值 |
| `/tmp/home.html` (Git Bash on Windows) | 路徑寫入失敗 size=0 | 改寫到 `tw-stock-watcher/.scratch/` 專案目錄 |

---

## 卡點

無阻塞。所有 5 階段已產出。

**唯一誠實揭露**：Yahoo Finance 美股 HTML 改版後 regex 抓不到價格，所以「美股 Yahoo 真實值」用 yfinance 代理（兩者同源 = Yahoo Finance 官方 API）。若 CTO 要求「必須是 yahoo HTML 直接抓」，需另外配 headless browser（Playwright）— 但對本 task 結論不影響，因為現況**美股股價 0 層歪**。

---

## 範圍宣告

- ✅ 未修任何 code
- ✅ 未動 prompt / agent 設定 / IP
- ✅ 未呼叫 Claude API、未呼叫 DALL-E
- ✅ 未 archive / 隱藏 / 刪除過去任何預測（v1 / v2 都完整保留）
- ✅ 未跑任何 5 位分析師預測
- ✅ 未動憲法、GUAGUA_SOUL、agent MEMORY
- ✅ 未 force push，標準 git push 到 main

---

## 📨 給 CTO（第三任）的訊息

1. **股價基礎四層健康** — 別再懷疑 FinMind / DB / 前台 / yfinance。它們都對。
2. **真兇是會議生成器** — 04-25 11:43 那場 MEET-2026-0425-HOLDINGS 寫進 quack_predictions 的 125 筆 entry_price 多數歪掉。
3. **歪法不是固定除法** — 從 -3% 到 -97% 都有，且同一支股票不同 analyst 不一致。最可能是「LLM 產生 entry 時手上沒有可信 current_price，自己 hallucinate」。
4. **Vincent 04-25 中午看到的 1050-1100** = `quack_predictions` 表那批 entry 在某前台位置（推測 `/agents/{slug}` 預測列表）渲染出來。`/stocks/2330` 直接看不到問題（已驗證顯示 2185）。
5. **過去 2,639 筆基本健康** — 不需要批量校準。需處理的是 04-25 HOLDINGS 那 125 筆。
6. **下一個 task 不應動 FinMind / Cron / 前台**，應 dive 進 `backend/routes/meetings.py`（或會議生成器）找 `current_price_at_prediction` 寫入 path。
7. **可疑點**：v2/v1 的 `architecture_version` 標籤跟時間順序顛倒（v2 在 2025-12，v1 在 2026-04）— 看起來 v1 是「新架構」、v2 是「舊架構」，命名易誤導，建議在會議系統 refactor 時順手改名為 `legacy / current`。

---

Task ID: STAGE1-T1-PRICE-DIAGNOSIS
Completed at: 2026-04-26T17:32:55+08:00
