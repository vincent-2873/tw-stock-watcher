# Session 接棒文件

> 給下一個 Claude Code session 看的。預計閱讀時間：5 分鐘。
> 上次更新：NEXT_TASK_007 完成（2026-04-25 11:38 TPE）
> 舊版（執行中快照）：`ceo-desk/logs/2026-04-25/11-38_HANDOVER_executing.md`

---

## 你現在的位置

- **最後完成的任務**：NEXT_TASK_007 — 接棒協議建立 + 前台第一波修正 + 分析師個人頁位置預留
- **完成時間**：2026-04-25T11:38:22+08:00
- **上一個 session 跑了多久**：~20 分鐘（type-check + 部署等待時間另算）
- **下一個任務**：等 NEXT_TASK_008（CTO 撰寫中）

---

## 過去 48 小時做完的事

**NEXT_TASK_006 之前**（憲法+架構建立 session，~9 小時）：
- 階段 0 七大 bug 全修並驗證無回歸
- 憲法 v1.0 + GUAGUA_SOUL.md 建立
- 12 份 agent 記憶範本骨架
- Migration 0006 / 0007（quack_predictions 擴充 + 5 張新表 + agent_stats 擴欄）
- 5 位投資分析師人設完整（舊名：阿武 / 阿慧 / 阿跡 / 阿數 / 阿和）
- `/api/agents` endpoint 上線
- 辦公室 office/ 獨立部署到 quack-office.zeabur.app
- 辦公室 /agents /meetings /predictions /watchdog 4 頁
- Watchdog GHA + Self-audit GHA（後因 502 / GHA 罷工 disabled）
- 首場示範會議 + 5 筆分析師 seed 預測

**NEXT_TASK_007（本批）增量**：
- 接棒協議（SESSION_HANDOVER.md + SESSION_PROTOCOL.md）
- 前台 6 項視覺修正（#3 部分完成—前端啟發式上線，DB migration 待）
- 前台 /analysts + /analysts/[slug] 5 個 slug 路由（占位）
- AnalystAvatar SVG 占位視覺系統 ×2（office + frontend）
- 辦公室 /agents 套用 AnalystAvatar，5 位投資師 display_name 用新名覆蓋
- 辦公室首頁加分析師動態區（規則式 status）
- **分析師正式名啟用**：辰旭 / 靜遠 / 觀棋 / 守拙 / 明川（取代舊的阿武等）

---

## 改動的檔案（NEXT_TASK_007）

新增：
- `ceo-desk/context/SESSION_PROTOCOL.md`
- `ceo-desk/handoffs/SESSION_HANDOVER.md`（本檔）
- `frontend/src/app/analysts/page.tsx`
- `frontend/src/app/analysts/[slug]/page.tsx`
- `frontend/src/app/analysts/[slug]/intros.ts`
- `frontend/src/components/AnalystAvatar.tsx`
- `frontend/src/components/hero/HeroHeadline.tsx`
- `office/src/components/AnalystAvatar.tsx`

修改：
- `frontend/src/app/home-data.tsx`（QuackPicksLive auto-fallback + QuackPicksColdNote / QuackMorningLive PNG / PeopleStatementsLive TW filter / HeadlinesLive sentiment color）
- `frontend/src/app/page.tsx`（HeroHeadline 替換寫死文案 / 移除自選股 emptyState 區塊 / nav 加分析師團隊）
- `office/src/app/agents/page.tsx`（5 位投資師卡片套用 AnalystAvatar + display_name 新名覆蓋）
- `office/src/app/page.tsx`（加 AnalystStatusBoard）

---

## 改動的 DB（NEXT_TASK_007）

**沒動 DB**。Schema 完全保留。

待下一個 NEXT_TASK 處理：
- migration 0008 加 `intel_people_statements.tw_impact_score INT`（修正 #3 真本）
- migration 0008 同時 UPDATE `agent_stats.display_name` 改為新名

---

## 部署紀錄

- **Commit**：`030698f feat(frontend+office): NEXT_TASK_007 — handover protocol + frontend wave 1`
- **Push**：`a31f32b..030698f main -> main` 成功
- **變動**：12 files, +2191 / -118
- **Zeabur build**：等待中（背景 monitor 守候 /analysts 200）

---

## 你必須知道的雷

### 紅線（碰了會死）

- ❌ 不准動 https://tw-stock-watcher.zeabur.app/ 前台未指定的部分（Vincent 紅線）
- ❌ 不准重啟已 disabled 的 watchdog / self-audit / scheduled task
- ❌ 不准抓網路圖片或神話模板（IP 風險，憲法 14.3）
- ❌ 不准修改 `SYSTEM_CONSTITUTION.md` 或 `GUAGUA_SOUL.md`
- ❌ 不准 force push main
- ❌ 不准 `git rm` 已 tracked 的檔案沒先講
- ❌ 不准 `npm install` / `pip install` 在 READ-ONLY task

### 名稱衝突 — 已用前端覆蓋過渡

- 後端 API + DB seed 的 agent_id 仍是 `analyst_a` ~ `analyst_e`
- DB `agent_stats.display_name` 仍是「阿武 A」等舊名（migration 0008 未做）
- 前台 `/analysts` 用新名（辰旭/靜遠/觀棋/守拙/明川）— hardcoded 在 `AnalystAvatar.tsx` 的 `ANALYSTS` 表
- 辦公室 `/agents` 也顯示新名 — 用 `AGENT_TO_SLUG` mapping 在 `office/src/app/agents/page.tsx` 覆蓋 DB 的 display_name
- slug 對應：
  - chenxu → analyst_a（技術派）
  - jingyuan → analyst_b（基本面）
  - guanqi → analyst_c（籌碼派）
  - shouzhuo → analyst_d（量化派）
  - mingchuan → analyst_e（綜合派）
- **真實人設資料還是讀 `ceo-desk/context/agents/analyst_*_MEMORY.md`**（內容用舊名「阿武」等；下次更新時再統一）

### 待解的卡點

- Watchdog GHA 502 → 已 disabled，根因不明
- Self-audit GHA 從 02:03 後就沒跑（disabled 中）
- 11 位 agent PNG 還沒給 → 占位視覺系統（`AnalystAvatar`）已上線
- backend/routes/quack.py:239, 246, 294 還在用舊欄位（hit_or_miss）
- 修正 #3 的 `tw_impact_score` DB migration 未做（前端啟發式過渡）

### 假資料 / 占位符位置

- **前台 /analysts/[slug]**：所有「持倉/勝率/推薦清單/大盤觀點/學習筆記」是占位
- **前台 /analysts**：「持倉數 / 勝率」顯示「— 檔」「— %」
- **辦公室 /agents 卡片**：5 投資師用 SVG 幾何，7 部門/監督仍 emoji
- **辦公室首頁分析師動態**：status 是規則式，第二波接真實 status
- **辦公室首頁 TODO list 第 2 條「5 位投資分析師代號重新命名」**：本 task 已用新名覆蓋，這項可以順手拿掉

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

- Claude scheduled task `quack-office-auto-heal`（auto-heal 還在跑，自動 commit AUTO_HEAL_LOG.md，但沒有實際 watchdog 動作）
- GHA `watchdog.yml`
- GHA `self-audit.yml`

如果你要碰 .github/workflows/，先確認 NEXT_TASK 是否明確授權。

---

## 關鍵檔案地圖

- **憲法**：`ceo-desk/context/SYSTEM_CONSTITUTION.md`
- **Vincent 靈魂宣言**：`ceo-desk/context/GUAGUA_SOUL.md`
- **協議**：`ceo-desk/context/SESSION_PROTOCOL.md`
- **你的任務**：`ceo-desk/inbox/NEXT_TASK.md`
- **你的回報**：`ceo-desk/outbox/LATEST_REPORT.md`
- **過往紀錄**：`ceo-desk/logs/YYYY-MM-DD/`
- **異常累積**：`ceo-desk/watchdog/ANOMALIES.md`
- **5 位分析師舊人設**：`ceo-desk/context/agents/analyst_*_MEMORY.md`（標題用舊名）
- **5 位分析師新人設定義**：`frontend/src/components/AnalystAvatar.tsx` ANALYSTS export + `frontend/src/app/analysts/[slug]/intros.ts`

---

## 你的 SOP

1. 讀此檔（5 分鐘）
2. 讀 `ceo-desk/inbox/NEXT_TASK.md`
3. 讀 NEXT_TASK 中標明的憲法章節（至少 Section 11 + 14）
4. `git pull --ff-only`（避免跟 auto-heal commit 打架）
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
