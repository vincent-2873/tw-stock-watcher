# Session 接棒文件

> 給下一個 Claude Code session 看的。預計閱讀時間:5 分鐘。
> 上次更新:NEXT_TASK_008d-2 完成(2026-04-26 ~00:35 TPE)
> 舊版:`ceo-desk/logs/2026-04-26/00-30_SESSION_HANDOVER_pre_008d2.md`

---

## 你現在的位置

- **最後完成的任務**:NEXT_TASK_008d-2 — 分析師架構 v2 修正 + 後 30 天回溯
- **完成時間**:2026-04-26T00:35+08:00
- **上一個 session 跑了多久**:約 1.5 小時(包括 v1 marking 5 min + v2 multi-process backfill ~30 min + settle 12 min + learning_notes 11 min + 前後台 + commit)
- **下一個任務**:NEXT_TASK_008e(戰情室即時運作 / 每日會議系統,CTO 撰寫)

### 008d-2 重點摘要

- **架構徹底修正**:5 位分析師從「單一面向派」→ **「全盤分析 + 個性差異」**
  - 5 位都看技術 + 基本面 + 籌碼 + 量化 + 題材 + 消息(6 面向)
  - 差異是個性主軸:辰旭(激進)/ 靜遠(保守)/ 觀棋(跟隨)/ 守拙(紀律)/ 明川(靈活)
  - reasoning 強制提到至少 2 個面向(v2 鐵律 #1)
- **v1 資料保留**:1,589 筆 v1 預測 + 187 筆 v1 learning_notes 全標 `evidence.architecture_version='v1'`(無破壞)
- **v2 新增**:
  - **1,050 筆 v2 預測**(5 × 30 days × 7 picks,multi-process 0 errors)
  - **125 筆 v2 learning_notes**(每位 25 筆失敗檢討)
  - **440 筆 timeline**(5 × 88 trading days,180 天涵蓋 v1+v2)
- **v1 vs v2 勝率**:
  | 分析師 | v1 (n) | v2 (n) | 差異 |
  |---|---|---|---|
  | 辰旭(激進 strict) | 42.3% (371) | 30.5% (210) | -11.8% |
  | 靜遠(保守 strict_window) | 68.4% (364) | 64.3% (210) | -4.1% |
  | 觀棋(跟隨 loose) | 74.1% (301) | 58.1% (210) | **-16.0%** |
  | 守拙(紀律 quant) | 39.4% (203) | 40.5% (210) | +1.1% |
  | 明川(靈活 segmented) | 78.2% (206) | 68.6% (210) | -9.6% |
- **Normalized 排序**(公平比較):靜遠 63.6% > 觀棋 54.0% > 明川 51.3% > 辰旭 38.0% > 守拙 36.0%
- **前後台**:5 個分析師卡片 / 個人頁加架構演進區塊 / 辦公室 /predictions v1/v2 篩選 / /watchdog 9 欄 v2 表格

---

## 過去 6 小時做完的事

**NEXT_TASK_008d-1**(2026-04-25 22:45):前 90 天歷史回溯
**NEXT_TASK_008d-2**(2026-04-26 00:35,本批):**架構修正 + 後 30 天 v2**

---

## 改動的檔案(NEXT_TASK_008d-2)

新增:
- `scripts/run_008d2.py`(v2 orchestration,可分階段)
- `scripts/run_008d2_one.py`(單分析師獨立 process)
- `supabase/migrations/0014_architecture_v2.sql`(可選 DDL,系統已可運作)

修改:
- `backend/services/analyst_brain.py`(ANALYSTS dict 5 位 v2 化:trait_label / decision_quirks / strictness_coefficient)
- `backend/services/historical_backtest.py`(SYSTEM_PROMPT_BACKFILL v2 化 + settle pagination 修補)
- `backend/routes/analysts.py`(_v1v2_split_stats + _normalized + architecture_evolution + timeline transitions)
- `backend/routes/agents.py`(AGENT_PROFILES 5 位 v2 化)
- `backend/routes/quack.py`(predictions endpoint days/limit 拉大)
- `frontend/src/app/analysts/page.tsx`(list 卡片 v2 視覺)
- `frontend/src/app/analysts/[slug]/page.tsx`(個人頁 v2 + 架構演進區塊)
- `frontend/src/components/AnalystAvatar.tsx`(5 位 v2 文案)
- `office/src/app/predictions/page.tsx`(v1/v2 篩選 + 徽章)
- `office/src/app/watchdog/page.tsx`(⑨ 區塊 v2 表格)
- `scripts/run_historical_backtest.py`(支援 backfill_marker / architecture_version 參數)
- `ceo-desk/context/agents/analyst_*.md` × 5(每份加 v2 架構新章節,v1 保留)

---

## 改動的 DB(NEXT_TASK_008d-2)

**Migration 0014**(可選,寫成檔案,Vincent 可選擇套線上):
- `quack_predictions` 加 `architecture_version VARCHAR(10) DEFAULT 'v1'` + index
- `agent_learning_notes` 加 `architecture_version VARCHAR(10) DEFAULT 'v1'` + index
- `agent_stats` 加 v1/v2/normalized 欄位(預測數 / hit / miss / wr × 2 + normalized + coef)
- `analyst_winrate_timeline` 加 `architecture_version VARCHAR(10) DEFAULT 'mixed'`

**現況**:
- 系統不依賴 migration 0014 — 用 `evidence.architecture_version` JSONB + API 動態計算
- migration 0014 套上線後 → index 加速 + agent_stats 直接欄位查詢更便利

**資料寫入**:
- `quack_predictions`:1,719 → 2,769(+1,050 v2 + 0 cancelled)
- `agent_learning_notes`:187 → 312(+125 v2)
- `analyst_winrate_timeline`:275 → 440(擴展到 88 trading days × 5 = 180 天)
- `stock_prices_historical`:3,780 → 6,867(+3,087 rows for back 30d)

---

## 部署紀錄

- **Commit**:(待 push 後填)
- **Push**:(待)
- **Zeabur build**:(待驗證)

---

## 你必須知道的雷

### 紅線(碰了會死)— 跟前面一致

(略,跟 008d-1 handover 同)

### 008d-2 新增的雷(務必讀!)

- **`settle_all_pending` pagination bug 已修補**:原本用 offset 分頁,但 status=active 過濾 + 結算同時改 status,導致漏掉部分。改成「每次都從頭查 status=active」,直到 batch 全 skipped 才停。
- **Anthropic API 仍不能 thread-parallel**:HTTP/2 GOAWAY 持續存在。multi-process 是唯一解。
- **`agent_stats` 新欄位不寫**:Migration 0014 未套上線時,`v1_winrate / v2_winrate / normalized_winrate` 等欄位 PostgREST 拒寫。系統不影響 — API `/api/analysts` 動態計算。
- **新分析師「個性派別」覆蓋**:`school` 從「技術派/基本面派/...」全改為「激進派/保守派/跟隨派/紀律派/靈活派」。office /agents、前台 list、AnalystAvatar 都已改。**注意若有外部系統依賴舊 school 字串,需要同步**。
- **觀棋 normalized 54.0% 提示**:loose 80% 判定的虛胖效應極強。CTO 可考慮收緊到 strict 100%,但會壓低樣本累積期的勝率展現,需要 trade-off。

### 008e 必須注意

1. **不需再 backfill**:每日早盤會議自然累積 v2 資料,~3-6 個月後 v2 樣本足以蓋過 v1
2. **多面向 reasoning prompt 已生效**:後續每日會議 system_prompt 應沿用 v2 SYSTEM_PROMPT_BACKFILL 風格(多面向強制)
3. **observe v2 → ongoing 切換點**:2026-04-26 起新預測都應該標 architecture_version='v2'
4. **Migration 0014 套線上時機**:CTO 評估 — 若 Watchdog 顯示 agent_stats 直接欄位有用就套,不套也無妨

---

## 待解的卡點(跟前面一致 + 新增)

(沿用 008d-1 列表)

- **新增**:Migration 0014 待 Vincent 套線上(可選)
- **新增**:觀棋 success_criteria_style 建議檢討(loose 80% → strict 100%)
- **新增**:明川 success_criteria_style 建議檢討(segmented 66% → 80%)

---

## 008e 待辦清單

(原 008e 計畫:戰情室即時運作)

**A. 每日早盤會議自動化**:
- 早 08:00 自動跑 simulate_holdings_meeting(已實作)
- 但 v2 prompt 風格要套到 SYSTEM_PROMPT_HOLDINGS(目前還是 v1 風格)
- → 需要把 SYSTEM_PROMPT_HOLDINGS 改為「全盤+個性」版

**B. 每日盤後結算 + learning_notes**:
- 14:30 後跑 settle_all_pending(無 backfill_marker,結算所有 active 過期的)
- 跑 write_learning_notes_for_agent(每位最多 3-5 筆/日)

**C. 樣本累積觀察期**:
- ~3-6 個月後評估 v2 真實勝率分布是否合理

---

## 假資料 / 占位符位置(更新版)

### 已清(008d-1 + 008d-2)
- ✅ /analysts/[slug] 績效報告:勝率走勢圖 + 架構演進區塊接通
- ✅ /analysts/[slug] 最佳/最差標的:接通真實 stats
- ✅ /analysts 列表卡片:trait_label + Strict/Loose 模式 + v1/v2 對比
- ✅ /watchdog ⑨ 歷史回溯狀態 9 欄(含 v1/v2/normalized)
- ✅ /predictions 從 130 → 2,769 筆,加分頁 + v1/v2 篩選

### 還在
- 🟡 office `/agents` 7 部門/監督仍 emoji
- 🟡 前台 `market/page.tsx`「尚無資料」
- 🟡 前台 `quack-journal/page.tsx`「尚無驗證結果」
- 🟡 前台 `InstitutionalBanner.tsx`「無資料」
- 🟡 office 首頁 status 規則式

---

## 你可用的工具(更新版)

(沿用 008d-1)

### 008d-2 新增可用 endpoint

```bash
# 滾動勝率 timeline 含架構切換點
curl https://vsis-api.zeabur.app/api/analysts/chenxu/winrate_timeline?days=240
# 回應加 architecture_transitions 陣列

# /api/analysts 加 v1/v2/normalized stats
curl https://vsis-api.zeabur.app/api/analysts | jq '.analysts[0].stats'

# /api/analysts/{slug} 加 architecture_evolution 物件
curl https://vsis-api.zeabur.app/api/analysts/chenxu | jq '.architecture_evolution'
```

### 008d-2 新增可用腳本

```bash
# v2 主腳本(可分階段)
python scripts/run_008d2.py --phase all
python scripts/run_008d2.py --phase 5  # 只重算 stats
python scripts/run_008d2.py --phase 6  # 只重算 timeline

# 單一分析師 v2(獨立 process,給 multi-process 用)
python scripts/run_008d2_one.py analyst_a 30
```

---

## 已 disabled 的自動化(不要重啟)

(沿用 008d-1)

---

## 關鍵檔案地圖(更新版)

(沿用 008d-1)

新增:
- **008d-2 v2 orchestration**:`scripts/run_008d2.py`
- **008d-2 single-analyst process**:`scripts/run_008d2_one.py`
- **Migration 0014**:`supabase/migrations/0014_architecture_v2.sql`

---

## 你的 SOP

(沿用 008d-1)

---

## 三方協作

(沿用 008d-1)

---

## 你絕對不能做的事

(沿用 008d-1)

13. **新:跳過 architecture_version 標記**(任何新預測必須標 v2,讓 v1/v2 切割可追溯)
14. **新:在 v2 prompt 中只用單一面向**(reasoning 必須提至少 2 個面向)

---

招待所的接力棒已到你手上。把它交得比你接到時更好。
