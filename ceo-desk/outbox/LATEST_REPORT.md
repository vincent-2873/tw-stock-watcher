System time: 2026-04-25T23:25+08:00

# REPORT #008d-1 — 歷史回溯前 90 天

## 摘要

執行 NEXT_TASK_008d-1 完整 7 階段:5 位分析師對 2026-01-26 ~ 2026-04-25 的 90 天回溯。
Migration 0013 套上線(2 表 + agent_stats 補欄),抓 63 檔 × 60 trading days = 3,780 rows 歷史股價,
產出 **1,589 筆歷史預測**(每位 38-54 days),結算 **870 hit / 575 missed**(剩餘 active 是 deadline 超過今日),
寫 **187 筆 learning_notes**(每位 25 筆 + 之前 62 筆),計算 5 位 agent_stats,寫入 **275 筆 timeline**。
前後台勝率走勢圖接通(recharts)。

**重要工程發現 1**:Anthropic API 無法 thread-parallel(HTTP/2 GOAWAY)→ multi-process 解決。
**重要工程發現 2**:Anthropic 餘額耗盡中段中斷 → Vincent 即時儲值後恢復。

## 階段 1:歷史股價

- 抓取 90 天股價:✅ 63 檔 × 60 trading days = **3,780 rows**
- 完整度:抽查 10 檔重點股票 → 6 ✅(2330/2454/2317/3231/2382/2308 完整) / 4 不在 stocks universe(2412/6505/3008/2891 → AI 不會挑到 → 不影響)
- 期間:2026-01-19 ~ 2026-04-25(多抓 7 天讓 AI 看回顧)
- FinMind sponsor 6000/hr 額度充裕,耗時 65s

## 階段 2:歷史預測產生

- 總預測數:**1,589**(target 1500-2500,落在合理範圍下緣)
- 5 位分布:
  - 辰旭(技術派):378 筆(54 days)
  - 靜遠(基本面派):364 筆(52 days)
  - 觀棋(籌碼派):315 筆(45 days)
  - 守拙(量化派):266 筆(38 days)
  - 明川(綜合派):266 筆(38 days)
- AI 呼叫總數:~227(5 × 38-54 days,每天 1 call,每 call 7 picks)
- 平行模式:**multi-process**(每位 analyst 獨立 Python 進程,每進程內 sequential)
- **重要工程發現**:
  - thread-based parallel(ThreadPoolExecutor)→ Anthropic HTTP/2 GOAWAY/PROTOCOL_ERROR 100% 失敗
  - 唯一可行:sequential(28-30s/call)或 multi-process(~12 min 全部)
- 抽查 5 位各 1 筆品質:
  - 辰旭:「跳空長紅,量價齊揚結構漂亮」(技術術語 ✅)
  - 靜遠:「過於急促,等財報出來再說」(價值用語 ✅)
  - 觀棋:「絕對有人知道什麼,籌碼明顯墊高」(黑話 ✅)
  - 守拙:「sigma=3.2 回歸均值機率68%」(統計 ✅)
  - 明川:「PCB族群輪動,技術籌碼面都對齊」(綜合 ✅)

## 階段 3:hit/miss 判定

- 已結算:**1,445** = 870 hit + 575 missed
- 待結算(deadline > 2026-04-25):144 active(等時間進入 5 月後再結)
- 結算邏輯:5 種 success_criteria(strict / strict_window / loose / quant / segmented)按各分析師流派
- 抽查驗證:2330 靜遠 bullish target=1820 → 期間最高 1925 ≥ target → HIT(strict_window 正確)
- pure code,無 AI

## 階段 4:learning_notes

- 總筆數:**187**(5 位 × 25 新筆 + 之前 62 筆,batch 8 每 call)
- AI 呼叫:~25 batches × 30s = ~12 min
- 抽查 5 筆品質:
  - 守拙:「64% 勝率配 ±9% 區間 = 雜訊太大」(統計反省 ✅)
  - 靜遠:「我一直在用技術面邏輯硬套基本面,這根本不是我的風格」(自省 ✅)
  - 各位口吻一致 / 具體修正方案 ✅

## 階段 5:agent_stats

- 5 位勝率:
  - **辰旭**(strict): **42.3%** (n=371 settled, best 6274 / worst 5536)
  - **靜遠**(strict_window): **68.4%** (n=364 settled, best 3017 / worst 3044)
  - **觀棋**(loose): **74.1%** (n=301 settled, best 3044 / worst 6182)
  - **守拙**(quant): **39.4%** (n=203 settled, best 2308 / worst 2301)
  - **明川**(segmented): **78.2%** (n=206 settled, best 2317 / worst 4958)
- **合理性**:平均 60.5%,高低差 38.7% ✅
- 勝率差異反映各分析師 success_criteria 嚴格度(辰旭/守拙嚴 → 低;靜遠/觀棋/明川寬 → 高)
- 最佳/最差標的:✅ 各位都有(>= 3 樣本門檻)

## 階段 6:勝率走勢

- timeline 資料筆數:**275**(5 × 55 trading days)
- 前台走勢圖接通:✅ `/api/analysts/{slug}/winrate_timeline` + recharts LineChart
- 顯示:橘色累積勝率 + 灰色滾動 30 天 + 50% 基準線

## 階段 7:前後台更新

- 前台 `/analysts` 列表:✅(顯示真實勝率)
- 前台 5 個個人頁:✅(勝率走勢圖 + 最佳/最差標的)
- 辦公室 `/agents`:✅(更新「勝率為 0」描述)
- 辦公室 `/predictions`:✅(分頁 + 篩選 + 區間選擇,1719 筆可用)
- 辦公室 `/watchdog`:✅(加 ⑨ 歷史回溯狀態區塊)

## 改動的檔案

新增:
- `backend/services/historical_backtest.py`(~660 行,6 phase 函數 + 5 種判定邏輯)
- `scripts/run_historical_backtest.py`(orchestration,可分階段執行)
- `scripts/run_one_analyst.py`(單一分析師獨立 process,給 multi-process 用)
- `supabase/migrations/0013_historical_backtest.sql`

修改:
- `backend/routes/analysts.py`(加 `/api/analysts/{slug}/winrate_timeline`)
- `frontend/src/app/analysts/[slug]/page.tsx`(勝率走勢圖)
- `office/src/app/agents/page.tsx`
- `office/src/app/predictions/page.tsx`
- `office/src/app/watchdog/page.tsx`

## 線上驗證截圖

(commit + push + 等 Zeabur build 後,Chrome MCP 截圖補入)

## 給 CTO 的訊息

### 工程發現(必傳)

1. **Anthropic API 無法 thread-parallel** — HTTP/2 GOAWAY error_code:1 (PROTOCOL_ERROR)。
   - 即使 ThreadPoolExecutor(max_workers=2/3/5) 都炸,連續 ConnectionTerminated。
   - **唯一可行**:Sequential(每筆 ~28s,5 位 × 50 days = ~2.5 小時)或 multi-process(每位 analyst 獨立 Python 進程,~12 min)。
   - **008d-2 必須用 multi-process**(用 `scripts/run_one_analyst.py` 模式)。

2. **API 餘額耗盡中段中斷** — 我跑到 ~1300 預測時 Anthropic 401:credit balance too low。
   - Vincent 即時儲值後恢復。
   - 008d-2 開始前建議先測 1 次確認餘額。

3. **`quack_predictions` 沒有 `settled_at` 欄位** — 用 `evaluated_at`。
   - migration 0006 漏建。
   - 不影響功能,但 schema 命名不一致。
   - 建議 008d-2 順便加 `ALTER TABLE quack_predictions ADD COLUMN settled_at TIMESTAMPTZ`(對齊憲法 5.1)。

4. **`status` CHECK 限制** — 不能用 'pending_settlement',只能 ('active', 'hit', 'missed', 'cancelled')。
   - 我用 active + evidence.backfill_marker 標記區分。

5. **`last_30d_win_rate` 對歷史回溯沒意義** — cutoff = today - 30d,
   而 backfill 預測 created_at 都在歷史時段。
   - 等到實際運作後(daily 預測產生後)會有意義。

### 建議下一步

- **008d-2**:後 90 天回溯(2025-10-26 ~ 2026-01-25)
  - 用 multi-process(`scripts/run_one_analyst.py` × 5 同時)
  - backfill_marker = "BACKFILL_008d2"
  - 預估時間:~15 min Phase 2 + ~10 min Phase 4 = 25 min
  - 跑完後重新算 timeline 涵蓋 180 天

- **品質提升**:
  - 樣本足後可拉高 best/worst symbol 門檻到 5 筆以上
  - 觀棋(74%)/ 明川(78%)寬鬆判定可考慮收緊(避免勝率失真)
  - 辰旭(42%)/ 守拙(39%)嚴格判定可保留(展現流派差異)

### AI 成本實際

- Phase 2:~227 calls × ~3500 input + ~2200 output tokens
- Phase 4:~25 batches × ~1500 input + ~2000 output
- 估算:Sonnet 4.5 ~$8-12 USD

---

Task ID: NEXT_TASK_008d-1
Completed at: 2026-04-25T23:25+08:00
