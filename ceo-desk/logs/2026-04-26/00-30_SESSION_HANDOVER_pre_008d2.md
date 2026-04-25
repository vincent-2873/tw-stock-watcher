# Session 接棒文件

> 給下一個 Claude Code session 看的。預計閱讀時間:5 分鐘。
> 上次更新:NEXT_TASK_008d-1 完成(2026-04-25 ~22:45 TPE)
> 舊版:`ceo-desk/logs/2026-04-25/21-22_SESSION_HANDOVER_pre_008d1.md`

---

## 你現在的位置

- **最後完成的任務**:NEXT_TASK_008d-1 — 歷史回溯前 90 天
- **完成時間**:2026-04-25T22:45+08:00 (約)
- **上一個 session 跑了多久**:約 2.5 小時(主要時間花在 Phase 2 sequential AI calls)
- **下一個任務**:NEXT_TASK_008d-2(後 90 天歷史回溯,CTO 撰寫)

### 008d-1 重點摘要

- **Migration 0013 套上線**:`stock_prices_historical` + `analyst_winrate_timeline` 兩張新表 + agent_stats 補 4 欄
- **歷史股價**:63 檔台股 × 60 trading days = **3,780 rows** 寫入 stock_prices_historical
- **歷史預測**:5 位分析師 × ~25-40 個交易日 × 7 picks = **1,589 筆** 寫入 quack_predictions
  - evidence.backfill_marker = "BACKFILL_008d1" 標記區分
  - 區分一般 active 預測(holdings)
- **結算**:對照真實股價判定 hit/miss,共 **870 hit / 575 missed**
- **5 位勝率**:辰旭 42.3% / 靜遠 68.4% / 觀棋 74.1% / 守拙 39.4% / 明川 78.2%
- **learning_notes**:**187 筆失敗檢討**(每位 ~10-30 筆,用該分析師口吻)
- **滾動勝率 timeline**:5 × 55 = **275 筆** 寫入 analyst_winrate_timeline
- **前台勝率走勢圖**:接通 `/api/analysts/{slug}/winrate_timeline`(recharts 線圖)
- **辦公室 /watchdog**:加 ⑨ 歷史回溯狀態區塊
- **辦公室 /predictions**:加分頁 + 篩選(因為從 130 → ~1,719 筆)

---

## 過去 24 小時做完的事

**NEXT_TASK_008c**(2026-04-25 19:55):5 位分析師當下資料活起來
**NEXT_TASK_008c-cleanup**(2026-04-25 21:11):技術債 + 命名統一
**NEXT_TASK_008d-1**(2026-04-25 21:30 ~ 22:45,本批):**5 位分析師 90 天歷史回溯**

### 008d-1 執行摘要

**階段 1 歷史股價準備**:
- FinMind TaiwanStockPrice 抓 63 檔(holdings 41 + stocks top 100 unique)
- 期間 2026-01-19 ~ 2026-04-25(多抓 7 天讓 AI 看回顧)
- 3,780 rows / 65s

**階段 2 歷史預測產生**:
- `historical_backtest.generate_predictions_for_day(agent_id, date, ctx)`
- AI 只看 < 預測日的資料(避免事後諸葛)
- 7 picks/day,deadline_days 動態(<= 14 天且 <= 期間剩餘)
- **重要工程發現**:Anthropic API 不能 thread-parallel(HTTP/2 GOAWAY 連續錯)→ 改 multi-process(每位分析師獨立 Python 進程)
- 5 process parallel 同時跑(每 process 內部 sequential)— 10-12 min 完成全部

**階段 3 hit/miss 判定**:
- 5 種 success_criteria 判定邏輯:
  - strict(辰旭):close 達 target
  - strict_window(靜遠):時限內最高/最低點達 target
  - loose(觀棋):達 80% target = hit
  - quant(守拙):實際 return >= 90% target return
  - segmented(明川):達 66% target = hit
- pure code,無 AI

**階段 4 learning_notes 批次產生**:
- 每位最多 30 筆 missed,batch 8 筆 1 AI call
- 用該分析師口吻(辰旭技術 / 靜遠基本面 / 守拙統計 / 觀棋黑話 / 明川折衷)

**階段 5 agent_stats**:
- 累積勝率 / 90 天勝率 / 30 天勝率 / 最佳/最差標的(>= 3 樣本門檻)

**階段 6 滾動勝率 timeline**:
- 每位每個交易日:rolling_30d_winrate + cumulative_winrate
- 寫入 analyst_winrate_timeline(5 × 55 = 275 筆)

---

## 改動的檔案(NEXT_TASK_008d-1)

新增:
- `backend/services/historical_backtest.py`(~600 行,6 phase 函數)
- `scripts/run_historical_backtest.py`(orchestration,可分階段執行)
- `scripts/run_one_analyst.py`(單一分析師獨立 process)
- `supabase/migrations/0013_historical_backtest.sql`

修改:
- `backend/routes/analysts.py`:加 `/api/analysts/{slug}/winrate_timeline` endpoint
- `frontend/src/app/analysts/[slug]/page.tsx`:加勝率走勢圖(recharts) + 最佳/最差標的
- `office/src/app/predictions/page.tsx`:分頁 + 篩選(支援 4000+ 筆)
- `office/src/app/watchdog/page.tsx`:加 ⑨ 歷史回溯狀態區塊
- `office/src/app/agents/page.tsx`:更新「勝率為 0」描述

---

## 改動的 DB(NEXT_TASK_008d-1)

**Migration 0013 已套線上**:
- `stock_prices_historical`(stock_id / trade_date / OHLCV / spread)+ unique idx + RLS read
- `analyst_winrate_timeline`(agent_id / timeline_date / rolling_30d_winrate / cumulative_winrate)+ unique idx + RLS read
- `agent_stats` 補欄位:last_90d_predictions / last_90d_win_rate / backfill_period_start / backfill_period_end

**資料寫入**:
- `stock_prices_historical`:3,780 筆
- `quack_predictions`:+ 1,589 筆 backfill(evidence.backfill_marker = BACKFILL_008d1)
- `agent_learning_notes`:+ 187 筆
- `analyst_winrate_timeline`:275 筆
- `agent_stats`:5 位完整 stats 填入

---

## 部署紀錄

- **Commit**:`bc115d3 feat(agents): NEXT_TASK_008d-1 - 90-day historical backtest`
- **Push**:已 push 到 main ✅
- **Zeabur build**:後端 + 前端 + 辦公室 all green

---

## 線上驗證(12 張截圖見 outbox/LATEST_REPORT.md)

- ✅ `/api/analysts` JSON 5 位真實 win_rate(42 / 68 / 74 / 39 / 78%)
- ✅ `/api/analysts/chenxu/winrate_timeline?days=20` 新 endpoint 回 timeline 陣列
- ✅ 前台 `/analysts` 列表顯示真實勝率(不再「累積中」)
- ✅ 前台 5 個個人頁:績效報告 + 勝率走勢圖(recharts LineChart)
- ✅ 辦公室 `/predictions` 分頁(500/10 頁)+ 區間/分析師/狀態 篩選
- ✅ 辦公室 `/watchdog` ⑨ 歷史回溯狀態 5 位完整數字
- ✅ 辦公室 `/agents` 5 位投資分析師真實命中率

---

## 你必須知道的雷

### 紅線(碰了會死)— 跟前面一致

(略,跟 008c handover 同)

### 008d-1 新增的雷(務必讀!)

- **Anthropic API 不能 thread-parallel**:HTTP/2 GOAWAY/PROTOCOL_ERROR。
  - 即使 ThreadPoolExecutor(max_workers=2) 也會炸。
  - **唯一解 1**:Sequential(單線程)。每筆 ~28-30s。1 analyst 50 days = 25 min。
  - **唯一解 2**:Multi-process(每位 analyst 一個 Python 進程)。各自 sequential 內部,進程之間獨立 httpx pool 不衝突。
  - **008d-2 必須用其中之一**。

- **`quack_predictions` 沒有 `settled_at` 欄位**:用 `evaluated_at`。
  - migration 0006 漏建。
  - 不影響功能,但 schema 命名不一致。
  - 建議 008d-2 順便加 `ALTER TABLE quack_predictions ADD COLUMN settled_at TIMESTAMPTZ`(對齊憲法 5.1)。

- **`status` CHECK 限制**:不能用 'pending_settlement',只能 ('active', 'hit', 'missed', 'cancelled')。
  - 我用 active + evidence.backfill_marker 標記區分。
  - 008d-2 沿用此模式即可。

- **`last_30d_win_rate` 對歷史回溯沒意義**:cutoff = today - 30d,而 backfill 預測 created_at 都在歷史時段(無重疊)。
  - 等實際每日預測產生後(系統正式運作)才有意義。

- **未結算的預測**:有些 backfill 預測 deadline > 2026-04-25,還是 active。
  - 008d-2 跑完後 + 時間進到 2026-05 後再結算這些。

- **best/worst symbol 樣本門檻 = 3**:有些低樣本標的可能誤判。樣本不足不顯示(顯示 None/—)。

### 008d-2 必須注意

1. **後 90 天回溯**:從 2025-10-26 ~ 2026-01-25
2. **前 90 天經驗**:Anthropic 必須 sequential / multi-process
3. **驗證 prompt 一致性**:008d-1 用的 SYSTEM_PROMPT_BACKFILL 必須複用,確保流派一致
4. **重新計算 timeline**:時間範圍 2025-10-26 ~ 2026-04-25(共 180 天)
5. **不要刪 008d-1 預測**:`evidence.backfill_marker = BACKFILL_008d1` vs `BACKFILL_008d2` 區分
6. **預估時間**:5 process parallel ~12 min,sequential ~2 小時

---

## 待解的卡點(跟前面一致 + 新增)

- Watchdog GHA 502 → 已 disabled,根因不明
- Self-audit GHA 從 02:03 後沒跑(disabled 中)
- 11 位 agent PNG 還沒給 → 占位 SVG 系統(AnalystAvatar)持續使用
- backend/routes/quack.py:259, 266, 320 還在用舊欄位 hit_or_miss(無 sync 影響)
- intel_sources 健康度欄位還沒有第一筆 last_success_at(等下次 GHA 觸發 intel-cron)
- **新增**:Anthropic API 並行限制(thread-based parallel 無解,只能 multi-process)
- **新增**:`quack_predictions.settled_at` 欄位缺失(migration 0006 漏建,建議 008d-2 補)

---

## 008d-2 / 008e 待辦清單

### 008d-2(後 90 天歷史回溯,CTO 排優先)

**A. 同 008d-1 流程,範圍延伸**:
- 期間:2025-10-26 ~ 2026-01-25
- backfill_marker = BACKFILL_008d2
- 預估時間:Phase 2 multi-process ~15-20 min

**B. 結算後 timeline 重算**:
- 重新跑 Phase 6 涵蓋 180 天
- 前台勝率走勢圖會看到完整 6 個月走勢

**C. 累積樣本後解鎖功能**:
- best/worst 標的更可靠(>= 5 筆樣本)
- 30 天滾動勝率有完整資料
- agent_memory MD 檔可手動更新「歷史戰績」區塊

### 008e(原計畫:戰情室即時運作)

(略,跟 008c handover 同)

---

## 假資料 / 占位符位置(更新版)

### 已清(008d-1)
- ✅ /analysts/[slug] 績效報告:勝率走勢圖接通真實 timeline
- ✅ /analysts/[slug] 最佳/最差標的:接通真實 stats
- ✅ /analysts 列表卡片:顯示真實 90 天勝率(不再「累積中」)
- ✅ /watchdog ⑨ 歷史回溯狀態
- ✅ /predictions 從 130 → ~1,719 筆,加分頁

### 還在
- 🟡 office `/agents` 7 部門/監督仍 emoji
- 🟡 前台 `market/page.tsx`「尚無資料」
- 🟡 前台 `quack-journal/page.tsx`「尚無驗證結果」
- 🟡 前台 `InstitutionalBanner.tsx`「無資料」
- 🟡 office 首頁 status 規則式

---

## 你可用的工具(更新版)

(略,跟 008c handover 同)

### 008d-1 新增可用 endpoint

```bash
# 滾動勝率 timeline
curl https://vsis-api.zeabur.app/api/analysts/chenxu/winrate_timeline?days=90
```

### 008d-1 新增可用腳本

```bash
# 歷史回溯主腳本(可分階段)
python scripts/run_historical_backtest.py --phase all
python scripts/run_historical_backtest.py --phase 2 --picks 7 --max_calls 25 --parallel 1
python scripts/run_historical_backtest.py --phase 3  # 只結算
python scripts/run_historical_backtest.py --phase 5  # 只重算 stats
python scripts/run_historical_backtest.py --phase 6  # 只重算 timeline

# 單一分析師(獨立 process,給 multi-process 用)
python scripts/run_one_analyst.py analyst_d 25
```

---

## 已 disabled 的自動化(不要重啟)

(略,跟 008c handover 同)

---

## 關鍵檔案地圖(更新版)

(略,跟 008c handover 同)

新增:
- **008d-1 Backtest 中樞**:`backend/services/historical_backtest.py`
- **008d-1 Orchestration**:`scripts/run_historical_backtest.py`
- **008d-1 Single-analyst process**:`scripts/run_one_analyst.py`
- **Migration 0013**:`supabase/migrations/0013_historical_backtest.sql`

---

## 你的 SOP

(略,跟 008c handover 同)

---

## 三方協作

(略,跟 008c handover 同)

---

## 你絕對不能做的事

(略,跟 008c handover 同)

12. **新:thread-based parallel Anthropic 呼叫**(會炸,只能 sequential 或 multi-process)

---

招待所的接力棒已到你手上。把它交得比你接到時更好。
