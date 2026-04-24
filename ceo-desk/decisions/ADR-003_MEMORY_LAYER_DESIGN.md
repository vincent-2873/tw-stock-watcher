# ADR-003: 長期記憶三層架構

- **狀態**：已採納（Accepted）
- **日期**：2026-04-24
- **決策者**：Vincent（CEO）
- **提案者**：Claude CTO
- **依據**：SYSTEM_CONSTITUTION Section 6

---

## 背景

鐵律 #5：「呱呱記得一輩子」——每場會議、每次預測、每個教訓都要寫進長期記憶。

但「長期記憶」不是單一概念：
- **一場會議內部**：部門情報、分析師發言 → 會後大部分不再看
- **30 天內**：近期失誤、趨勢判斷 → 用於「近期表現」統計
- **永久**：身份核心、重大教訓、辯論紀錄 → 每次做預測都要載入

若全部塞進同一個 prompt，會膨脹到無法處理。若只記永久的，會錯過近期脈絡。

## 決策

**三層記憶架構**，讀寫時機與儲存位置各異：

| 層 | 壽命 | 寫入時機 | 讀取時機 | 儲存位置 |
|---|---|---|---|---|
| **Layer 1 短期** | 一場會 | 會議進行中 | 本場 prompt | 記憶體 / Redis |
| **Layer 2 中期** | 30 天滾動 | 每日盤後 | 中期趨勢判斷 | Supabase（`predictions` + `agent_stats`） |
| **Layer 3 長期** | 永久 | 每場會後 | 每次預測前載入 | **Supabase + `agents/*_MEMORY.md`** |

### 為什麼 Layer 3 要「雙地儲存」（MD 檔 + DB）

1. **MD 檔給人類看**：
   - Vincent / CTO 可直接打開 `ceo-desk/context/agents/owl_MEMORY.md` 檢查
   - Git 版本追溯（每天盤後 commit 一次）
   - 斷電、DB 掛掉仍然看得到

2. **DB 給程式查**：
   - `agent_memory_snapshots` 表每日快照
   - 便於 analytics（「評級師 6 個月前怎麼想的？」）
   - 支援 agent 互查（呱呱讀 6 位 agent 的當天記憶組 prompt）

3. **Git 歷史當災難備援**：
   - MD 檔每天 commit
   - 若 DB 損毀可從 Git 還原

→ 「三地同步」寫死在 `save_agent_memory()` 函式（憲法 Section 10.5）

### Layer 分工的執行面

**Layer 1 短期**：
- 實作：會議 agent 跑在同一 process，state 存記憶體
- 大小：一場會議內所有訊息，會後 drop
- 不持久化

**Layer 2 中期**：
- 實作：每日 23:00 cron 跑 `rollup_recent_stats.py`
- 產出：`agent_stats` 表的 `last_30d_win_rate` 等欄位
- 讀取：每次 agent 載入 prompt 時 query

**Layer 3 長期**：
- 實作：每場會議結束時自動寫
- 產出：更新 `*_MEMORY.md` + `agent_memory_snapshots` 表
- 讀取：下次預測前整份載入（**這是 agent 身份的來源**）

### 「身份核心」區塊的特殊地位

Layer 3 記憶檔內部分為兩類：
- **系統自主寫入區**（戰績、教訓、辯論紀錄、新方法）
- **人類手動補充區**（`## 身份核心` 區塊）

身份核心只能由 CEO / CTO 手動改。系統 agent **絕對不能自己重寫自己是誰**（否則會漂移）。

## 選項比較

| 選項 | 優 | 缺 | 結論 |
|---|---|---|---|
| A. 單層全歷史 | 最簡單 | prompt 爆炸 | ❌ |
| B. 只存命中率數字 | 快 | 失去教訓與個性 | ❌（無法學習） |
| C. **三層分工 + MD+DB+Git 三地備援** | 完整、可追溯、容錯 | 寫入邏輯複雜 | ✅（本採納） |

## 風險與緩解

| 風險 | 緩解 |
|---|---|
| MD 檔與 DB 不同步 | 每次寫入都先寫 MD 再寫 DB，任一步失敗回滾 |
| MD 檔太大（5 年累積後） | 定期歸檔（每年 12 月 31 日 snapshot → `_MEMORY_2026.md`） |
| agent 自我改寫身份核心 | 系統層面拒絕寫入該區塊（parser 只認 `## 歷史戰績` 以下的段落） |
| Git commit 污染 | 每日盤後**一次**自動 commit，commit message 標 `[mem-autoupdate]` |

## 本 ADR 對應憲法段落

- Section 6（Agent 長期記憶系統）
- Section 10.5（長期記憶的冗餘保存）
- 鐵律 #5（記得一輩子）

## 後續相依任務

- **NEXT_TASK #005**：實作 `load_agent_context()` + `save_agent_memory()` 函式
- **NEXT_TASK #005 follow-up**：Layer 2 的 nightly rollup cron
- **NEXT_TASK 005+**：Git 自動 commit 腳本（`[mem-autoupdate]` prefix）

## 修訂紀錄

| 日期 | 版本 | 修改 |
|---|---|---|
| 2026-04-24 | v1.0 | 初版 |
