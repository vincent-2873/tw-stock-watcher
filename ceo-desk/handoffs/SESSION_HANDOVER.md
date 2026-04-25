# Session 接棒文件

> 給下一個 Claude Code session 看的。預計閱讀時間：5 分鐘。
> 上次更新：NEXT_TASK_007（執行中，會在完成後再覆蓋一次）

---

## 你現在的位置

- **最後完成的任務**：NEXT_TASK_006（Vincent 驗收 + 啟動首場會議；自動 watchdog 跑了一夜）
- **正在執行**：NEXT_TASK_007 — 接棒協議建立 + 前台第一波修正 + 分析師個人頁位置預留
- **完成時間**：（執行中，將在 Stage 7 結束時填入）
- **上一個 session 跑了多久**：~9 小時（憲法 + DB + 5 分析師人設 + watchdog + self-audit + 辦公室骨架）
- **下一個任務**：等 NEXT_TASK_008（CTO 撰寫中）

---

## 過去 48 小時做完的事

- 階段 0 七大 bug 全修並驗證無回歸（commit 6 個 fix，2026-04-23 傍晚）
- 憲法 v1.0 建立（`SYSTEM_CONSTITUTION.md` 15 章 + `GUAGUA_SOUL.md`）
- 12 份 agent 記憶範本骨架建立
- Migration 0006（quack_predictions 擴充 + meetings/agent_stats/agent_learning_notes/agent_debates/agent_memory_snapshots 5 張新表）
- Migration 0007（agent_stats 加 display_name / role / emoji / tracked）
- 5 位投資分析師人設完整（阿武 / 阿慧 / 阿跡 / 阿數 / 阿和）
- `/api/agents` endpoint 上線
- 辦公室前端 `office/` 獨立部署到 quack-office.zeabur.app
- 辦公室 `/agents` `/meetings` `/predictions` `/watchdog` 4 頁
- Watchdog GHA 每 15 分跑健康檢查（後因 502 / GHA 罷工 已被 disabled）
- Self-audit GHA 每 30 分跑系統完整度檢查（同樣 disabled）
- 首場示範會議 + 5 筆分析師 seed 預測

NEXT_TASK_007 增量：
- 接棒協議檔（本檔 + `ceo-desk/context/SESSION_PROTOCOL.md`）
- 前台 6 項視覺修正
- 前台 `/analysts` + `/analysts/[slug]` 路由（占位 UI）
- 辦公室 `AnalystAvatar` component（純 SVG 占位視覺）

---

## 改動的檔案（NEXT_TASK_007）

（執行中。完成後此區會列出全部 paths）

---

## 改動的 DB（NEXT_TASK_007）

- 修正 #3：`stock_news` 或對應發言表加 `tw_impact_score INT`（執行中可能未做）
- 修正 #5：對應新聞 / headlines 表加 `sentiment` 欄位（如缺則加）

詳細狀態見 outbox/LATEST_REPORT.md。

---

## 部署紀錄

（執行中，commit hash 填於完成時）

---

## 你必須知道的雷

### 紅線（碰了會死）

- ❌ 不准動 https://tw-stock-watcher.zeabur.app/ 前台未指定的部分（Vincent 紅線）
- ❌ 不准重啟已 disabled 的 watchdog / self-audit / scheduled task
- ❌ 不准抓網路圖片或神話模板（IP 風險，憲法 14.3）
- ❌ 不准修改 `SYSTEM_CONSTITUTION.md` 或 `GUAGUA_SOUL.md`
- ❌ 不准 force push main
- ❌ 不准 `git rm` 已 tracked 的檔案沒先講

### 名稱衝突（重要）

- 後端 API + DB seed 用 `analyst_a` / `analyst_b` / ... / `analyst_e`，display_name 是 **阿武 / 阿慧 / 阿跡 / 阿數 / 阿和**
- NEXT_TASK_007 額外給了「正式名」**辰旭 / 靜遠 / 觀棋 / 守拙 / 明川**，前台 `/analysts/[slug]` 用這套
- slug 對應：
  - chenxu → analyst_a（技術派）
  - jingyuan → analyst_b（基本面）
  - guanqi → analyst_c（籌碼派）
  - shouzhuo → analyst_d（量化派）
  - mingchuan → analyst_e（綜合派）
- **真實人設資料還是讀 `ceo-desk/context/agents/analyst_*_MEMORY.md`**

### 待解的卡點

- Watchdog GHA 502 → 已 disabled，根因不明（可能 Zeabur cold start + GHA timeout 雙重問題）
- Self-audit GHA 從 02:03 後就沒跑（disabled 中）
- 11 位 agent PNG 還沒給 → 改用占位視覺系統（`AnalystAvatar` component）
- backend/routes/quack.py:239, 246, 294 還在用舊欄位（hit_or_miss）

### 假資料 / 占位符位置

- **辦公室 `/agents` 卡片**：用 emoji，待 Vincent 給真實 PNG
- **前台 `/analysts/[slug]` 個人頁**：所有「持倉/勝率/推薦清單」是占位，第二波接真實資料
- **前台 `/analysts` 總覽**：「持倉數 / 勝率」顯示「— 檔」「— %」
- **辦公室首頁分析師動態**：status 是規則式（08:00-08:45 meeting、09:00-13:30 thinking...），第二波接真實 status

---

## 你可用的工具

- **Zeabur CLI**：已登入 vincent-2873
- **Supabase service key**：在 `.env`（注意：不要印出原始值，憲法紅線 1）
- **取時間**：`curl https://vsis-api.zeabur.app/api/time/now`
- **GraphQL**：https://api.zeabur.com/graphql（cookie auth via Chrome）
- **三服務 URL**：
  - Frontend: https://tw-stock-watcher.zeabur.app/
  - Office: https://quack-office.zeabur.app/
  - API: https://vsis-api.zeabur.app/

---

## 已 disabled 的自動化（不要重啟）

- Claude scheduled task `quack-office-auto-heal`
- GHA `watchdog.yml`
- GHA `self-audit.yml`

如果你要碰 .github/workflows/，先確認 NEXT_TASK 是否明確授權。否則別動。

---

## 關鍵檔案地圖

- **憲法**：`ceo-desk/context/SYSTEM_CONSTITUTION.md`
- **Vincent 靈魂宣言**：`ceo-desk/context/GUAGUA_SOUL.md`
- **協議**：`ceo-desk/context/SESSION_PROTOCOL.md`（本批新增）
- **你的任務**：`ceo-desk/inbox/NEXT_TASK.md`
- **你的回報**：`ceo-desk/outbox/LATEST_REPORT.md`
- **過往紀錄**：`ceo-desk/logs/YYYY-MM-DD/`
- **異常累積**：`ceo-desk/watchdog/ANOMALIES.md`
- **5 位分析師人設**：`ceo-desk/context/agents/analyst_*_MEMORY.md`

---

## 你的 SOP

1. 讀此檔（5 分鐘）
2. 讀 `ceo-desk/inbox/NEXT_TASK.md`
3. 讀 NEXT_TASK 中標明的憲法章節（至少 Section 11 + 14）
4. `git pull --ff-only`（避免跟 watchdog auto-commit 打架）
5. 開始執行
6. 每完成一個 sub-step：寫進 outbox 進度區、git commit 但不 push（除非 NEXT_TASK 明確說連發）
7. 全部完成後：一次 push、寫完整 outbox、覆蓋更新本檔給下一個 session、歸檔舊版到 logs/

---

## 三方協作

- **Vincent（CEO）**：給方向、抽查、簽收
- **Claude CTO**：寫 NEXT_TASK、解讀 outbox、翻譯給 Vincent
- **你（Claude Code）**：執行
- 三方不能直接通訊。要跟 CTO 說話，寫在 outbox「給 CTO 的訊息」區。

---

## 你絕對不能做的事

1. 修改 `SYSTEM_CONSTITUTION.md` 或 `GUAGUA_SOUL.md`
2. 跳過讀 `SESSION_HANDOVER.md` 直接做事
3. 假完成（說做了但其實沒做）
4. 連續多次 push（race Zeabur rebuild）
5. 動 https://tw-stock-watcher.zeabur.app/ 前台你不確定的部分
6. 重啟已 disabled 的 watchdog / self-audit / scheduled task
7. 用網路抓的圖片或神話模板
8. 承認「我不知道」（要找方法，至少嘗試 3 種）

---

🦆 招待所的接力棒已到你手上。把它交得比你接到時更好。
