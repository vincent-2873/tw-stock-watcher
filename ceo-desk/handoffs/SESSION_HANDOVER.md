# Session 接棒文件

> 給下一個 Claude Code session 看的。預計閱讀時間:5 分鐘。
> 上次更新:NEXT_TASK_008c 完成(2026-04-25 19:55 TPE)
> 舊版:`ceo-desk/logs/2026-04-25/19-55_SESSION_HANDOVER_pre008c.md`

---

## 你現在的位置

- **最後完成的任務**:NEXT_TASK_008c — 5 位分析師當下資料活起來
- **完成時間**:2026-04-25T19:55+08:00
- **上一個 session 跑了多久**:約 4 小時(從讀檔到 outbox + handover,含 3 次 init 跑,2 次 bug fix)
- **下一個任務**:NEXT_TASK_008d(6 個月歷史回溯,CTO 撰寫中)

---

## 過去 24 小時做完的事

**NEXT_TASK_008a**(13:05):邏輯升級第一刀(quack 中樞 AI / migration 0009 / emoji 清乾淨)
**NEXT_TASK_008b**(17:58):**地基穩定 + 商業級資料品質**(health endpoints / errors middleware / cross_market_view / watchdog 升級)
**NEXT_TASK_008c-pre**(19:05):ROADMAP_FULL.md 建立
**NEXT_TASK_008c**(本批,19:55):**5 位分析師當下資料活起來**

### 008c 七個階段全數完成

**階段 1 模擬會議產出 125 持倉**:
- `analyst_brain.simulate_holdings_meeting(date)` — 5 位獨立 Claude call 產 25 檔 + 1 個會議記錄 call
- 寫入 `quack_predictions`(5×25=125)+ `meetings` 表(MEET-2026-0425-HOLDINGS,4065 字)
- 5 位完全分化:辰旭多看空講「破線縮手」/ 守拙統計用語「N=95 勝率 71% 布林下軌」/ 阿和「我小看多」混合時間框架

**階段 2 大盤觀點**:
- `analyst_judge_market(agent_id, date)` + `analyst_market_views` 表
- 5 位首次觀點寫入(個性化,如觀棋 bearish conf 72)
- Cron 已加入 `.github/workflows/quack-refresh.yml`(平日 07:30 / 週末 20:00)

**階段 3 每日推薦**:
- `analyst_pick_daily(agent_id, date)` + `analyst_daily_picks` 表
- 5 位首次推薦(共 22 筆,各 4-5 筆,強度 6-9/10 + 進場區間)
- Cron 已加入 quack-refresh.yml(平日 08:00)

**階段 4 個人頁接真資料**:
- `/api/analysts` 列表(holdings_count + latest_market_view)
- `/api/analysts/{slug}` 完整(profile + stats + holdings + market_view + picks + meetings + learning_notes)
- `/api/analysts/{slug}/{holdings|market_view|daily_picks|meetings}` 子資源
- 9 區塊全接通

**階段 5 列表頁升級**:5 卡顯示真實 26 檔 + 大盤觀點摘要

**階段 6 辦公室同步**:
- /agents 5 位 ×26 筆 ✅
- /meetings 2 場(含 holdings_setup 125 筆) ✅
- /predictions 130 筆 ✅

**階段 7 整合測試 + commit + push + 線上驗證**:
- Python ast × 3 / TypeCheck × 1 全通過
- Migration 0011 透過 Chrome MCP 套線上(Success. No rows returned)
- 本機 init script 跑完 ~5 分鐘(125 持倉 + 1 會議 + 5 觀點 + 22 picks)
- 12 張 Chrome MCP 截圖佐證

---

## 線上驗證(12 張截圖)

| # | 截圖 | 內容 |
|---|------|------|
| 1 | `ss_3445nvtfw` | Supabase SQL 9 行驗證:130/2/5/22 + 5×26 |
| 2 | `ss_0704wkiix` | `/api/analysts` JSON 5 位完整資料 |
| 3 | `ss_9537ta7cf` | 前台 `/analysts` 列表 5 卡(26 檔 + 觀點) |
| 4 | `ss_4837cxq4g` | 辰旭個人頁 Hero(技術派 / 26 檔 / 4 KeyStat) |
| 5 | `ss_5035f0xko` | 辰旭持倉表(2330 看多 + 8 檔看空,信心 65-80) |
| 6 | `ss_6880hrjtg` | 辰旭大盤觀點 + 4 推薦 + 2 會議 + 學習筆記 |
| 7 | `ss_4784mlkbq` | 辦公室 `/predictions` 130 筆 |
| 8 | `ss_3091o4lqc` | 辦公室 `/meetings` 2 場(含 holdings_setup 125 筆) |
| 9 | `ss_7311idyg6` | 戰情室會議全文(法人說明會風格 4065 字) |
| 10 | `ss_9266tmbdr` | 辦公室 `/agents` 5 位 ×26 筆 |
| 11 | `ss_8326wq68o` | 守拙(量化派)持倉(統計用語 N=95、勝率 71%、布林下軌) |
| 12 | `ss_3229yexy8` | 阿和(綜合派)持倉(「我小看多」+ 混合時間框架) |

---

## 改動的檔案(NEXT_TASK_008c)

新增:
- `backend/services/analyst_brain.py`(660 行,5 位人設 + 3 函數)
- `backend/routes/analysts.py`(/api/analysts 路由 + 5 GET + 3 admin POST)
- `supabase/migrations/0011_analyst_market_views_and_picks.sql`
- `scripts/init_analyst_data.py`(本機一次性初始化)

修改:
- `backend/main.py`:include analysts route
- `frontend/src/app/analysts/page.tsx`:列表升級接 /api/analysts
- `frontend/src/app/analysts/[slug]/page.tsx`:9 區塊全接 /api/analysts/{slug}
- `.github/workflows/quack-refresh.yml`:加 analyst market_views + daily_picks cron

---

## 改動的 DB(NEXT_TASK_008c)

**Migration 0011 已套線上**:
- `analyst_market_views` 表(agent_id / view_date / market_view / key_focus JSONB / bias / confidence / model)+ idx + RLS read
- `analyst_daily_picks` 表(agent_id / pick_date / target_symbol / strength 1-10 / entry_price_low/high / reason)+ idx + RLS read

**Init script 已寫入**:
- `quack_predictions`:125 筆新增(5×25),狀態 active,meeting_id 指向 MEET-2026-0425-HOLDINGS
- `meetings`:1 筆新增(MEET-2026-0425-HOLDINGS,4065 字)
- `analyst_market_views`:5 筆(每位 1 篇)
- `analyst_daily_picks`:22 筆(各 4-5 筆)
- `agent_stats`:5 位 total_predictions +25(從 1 → 26)

---

## 部署紀錄

- **Commit 1**:`6e2615a feat(全站): NEXT_TASK_008c — analysts come alive`(6 files, +1432/-114)
- **Commit 2**:`552a28d fix(analysts): reasoning column + meeting FK order + daily picks select`(4 files, +184/-16)
- **Push**:`6e48ed9..6e2615a..552a28d main -> main` ✅
- **Zeabur build**:後端 + 前端 + 辦公室 all green

---

## 你必須知道的雷

### 紅線(碰了會死)— 跟前面一致

- ❌ 不准動 https://tw-stock-watcher.zeabur.app/ 前台未指定的部分
- ❌ 不准重啟已 disabled 的 watchdog / self-audit / scheduled task
- ❌ 不准抓網路圖片或神話模板
- ❌ 不准修改 SYSTEM_CONSTITUTION.md 或 GUAGUA_SOUL.md
- ❌ 不准 force push main
- ❌ 不准 git rm 已 tracked 的檔案沒先講
- ❌ 不准 npm install / pip install 在 READ-ONLY task

### 008c 新增的雷

- **`quack_predictions` 沒有 `reasoning` 欄位**:憲法 5.1 要求但 migration 0006 ADD COLUMN 漏了。reasoning 目前寫在 `evidence` JSONB 的 reasoning key。backend route 讀回時自動把 evidence.reasoning 拉到頂層。**008d 起若要乾淨 schema,建議 migration 0012 ADD COLUMN + 搬上來**
- **`meetings.meeting_id` FK 順序敏感**:`fk_qp_meeting` 約束要 meetings 先存在;若新增 prediction 帶 meeting_id 必須先 upsert meeting
- **simulate_holdings_meeting 大型 AI call**:5+1 calls × 30-60s = ~250s,**會超過 Zeabur edge 90s timeout**。所以 admin endpoint 雖然存在但實際跑要本機腳本(`scripts/init_analyst_data.py`)
- **持倉每週重建邏輯尚未實作**:目前每跑一次新增 125 筆。下週若再跑會變 250 筆 active。建議 008d 結算邏輯做完後加「先 cancel 舊的再產新的」步驟
- **office /predictions 沒分頁**:130 筆 OK,但 008d 結算後 4000+ 筆需要分頁

### 待解的卡點(跟前面一致 + 新增)

- Watchdog GHA 502 → 已 disabled,根因不明
- Self-audit GHA 從 02:03 後沒跑(disabled 中)
- 11 位 agent PNG 還沒給 → 占位 SVG 系統(AnalystAvatar)持續使用
- backend/routes/quack.py:259, 266, 320 還在用舊欄位 hit_or_miss(沒人改,但 sync 不影響)
- intel_sources 健康度欄位還沒有第一筆 last_success_at(等下次 GHA 觸發 intel-cron)
- **新增**:5 位分析師目前 win_rate 都是 null(還沒結算 — 008d 任務)
- **新增**:learning_notes 表是空的(等首次失敗結算)

---

## 008d / 008e 待辦清單

### 008d(6 個月歷史回溯,CTO 排優先順序用)

**A. quack_brain.py 擴充**
- `backfill_history(agent_id, days=180)`:從歷史日期模擬該分析師的預測
- `settle_predictions(date)`:對照實際股價結算到期預測
- 結算機制:解析 success_criteria(「嚴格」「寬鬆」「分段」)按各分析師標準判定 hit/miss

**B. 新表/欄位**
- 建議 migration 0012 ADD COLUMN reasoning(從 evidence.reasoning 搬上來)
- agent_stats 加 last_180d_predictions / last_180d_win_rate
- agent_learning_notes 表 seed(失敗自動寫)

**C. 6 個月回溯成本估算**
- 5 位 × 180 天 × 5-10 筆 = 4500-9000 筆
- AI 時間:7-9 小時純 Claude calls
- FinMind 歷史股價:6000/hr 充裕
- **強烈建議拆 008d-1 / 008d-2 / 008d-3**(每批 60 天)

**D. 結算 cron**
- 平日 14:30 跑 settlement(對照當日收盤)
- 加入 quack-refresh.yml 或新建 `analyst-settle.yml`

### 008e(戰情室即時運作 + 會議系統)

- 每日 08:00 / 14:00 / 週日 20:00 自動開會 cron
- 會議記錄自動產生(法人說明會風格,008c 已有模板)
- 前台 /meetings 列表 + /meetings/[id] 詳情頁
- Agent 辯論視覺化(誰質疑誰、勝負)
- 跨會議學習迴圈(昨日失敗 → 今日修正)

---

## 假資料 / 占位符位置(更新版)

### 已清(008c)
- ✅ /analysts 列表「— 檔」「— %」→ 真實 26 檔
- ✅ /analysts/[slug] 9 區塊占位 → 真實資料
- ✅ /predictions 從 5 → 130 筆
- ✅ /meetings 從 1 → 2 場(含戰情室)
- ✅ /agents 5 位投資分析師持倉數真實

### 還在(008b-2 處理)
- 🟡 office `/agents` 7 部門/監督仍 emoji
- 🟡 前台 `market/page.tsx`「尚無資料」
- 🟡 前台 `quack-journal/page.tsx`「尚無驗證結果」
- 🟡 前台 `InstitutionalBanner.tsx`「無資料」
- 🟡 office 首頁 status 規則式
- 🟡 績效報告 4 個 Placeholder「累積中」(等 008d 後解鎖)
- 🟡 失敗檢討占位「6 個月歷史回溯後可見」(等 008d)

---

## 你可用的工具(更新版)

- **Zeabur CLI**:已登入 vincent-2873
- **Supabase service key**:在 .env(注意:不要印出原始值)
- **Supabase Studio Web**:Chrome MCP 已驗證可登入
- **取時間**:`curl https://vsis-api.zeabur.app/api/time/now`
- **三服務 URL**:
  - Frontend: https://tw-stock-watcher.zeabur.app/
  - Office: https://quack-office.zeabur.app/
  - API: https://vsis-api.zeabur.app/

### 008c 新增可用 endpoint

```bash
# 5 位分析師列表(含 holdings_count + latest_market_view)
curl https://vsis-api.zeabur.app/api/analysts

# 單一分析師完整資料(slug = chenxu/jingyuan/guanqi/shouzhuo/mingchuan)
curl https://vsis-api.zeabur.app/api/analysts/chenxu

# 子資源
curl https://vsis-api.zeabur.app/api/analysts/chenxu/holdings
curl https://vsis-api.zeabur.app/api/analysts/chenxu/market_view
curl https://vsis-api.zeabur.app/api/analysts/chenxu/daily_picks
curl https://vsis-api.zeabur.app/api/analysts/chenxu/meetings

# Admin POST 觸發(需 X-Admin-Token)
curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" \
  https://vsis-api.zeabur.app/api/analysts/refresh_market_views
curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" \
  https://vsis-api.zeabur.app/api/analysts/refresh_daily_picks
# (注意:simulate_meeting 太久,要本機跑 scripts/init_analyst_data.py)

# 本機跑完整初始化(125 持倉 + 1 會議 + 5 觀點 + 5 推薦)
cd projects/tw-stock-watcher && python scripts/init_analyst_data.py
```

---

## 已 disabled 的自動化(不要重啟)

- Claude scheduled task `quack-office-auto-heal`
- GHA `watchdog.yml`
- GHA `self-audit.yml`

### 已啟用的 cron

- GHA `quack-refresh.yml`(008b 啟用,008c 擴充加 analyst market_views + daily_picks)
- GHA `intel-cron.yml`(每 15 分)

---

## 關鍵檔案地圖(更新版)

- **憲法**:`ceo-desk/context/SYSTEM_CONSTITUTION.md`
- **靈魂宣言**:`ceo-desk/context/GUAGUA_SOUL.md`
- **路線圖**:`ceo-desk/ROADMAP_FULL.md`(008c-i 完整路線)
- **5 位分析師人設**:`ceo-desk/context/agents/analyst_a..e_MEMORY.md`(舊名:阿武/阿慧/阿跡/阿數/阿和)
- **5 位分析師新名**:`frontend/src/components/AnalystAvatar.tsx`(辰旭/靜遠/觀棋/守拙/明川)
- **呱呱中樞 AI(008a)**:`backend/services/quack_brain.py`
- **新:Analyst 中樞(008c)**:`backend/services/analyst_brain.py`
- **新:Analysts 路由**:`backend/routes/analysts.py`
- **新:Init 腳本**:`scripts/init_analyst_data.py`
- **Health endpoints(008b)**:`backend/routes/health.py`
- **Hero 時段切換(008b)**:`backend/routes/hero.py`
- **Error middleware(008b)**:`backend/utils/error_middleware.py`
- **Migrations**:0001-0011 全在 `supabase/migrations/`

---

## 你的 SOP

1. 讀此檔(5 分鐘)
2. 讀 `ceo-desk/inbox/NEXT_TASK.md`
3. 讀 NEXT_TASK 中標明的憲法章節
4. `git pull --ff-only`
5. 開始執行
6. 每完成一個 sub-step:寫進 outbox 進度區、git commit 但不 push(除非 NEXT_TASK 明確說連發)
7. 全部完成後:一次 push、寫完整 outbox、覆蓋更新本檔給下一個 session、歸檔舊版到 logs/

---

## 三方協作

- **Vincent(CEO)**:給方向、抽查、簽收
- **Claude CTO**:寫 NEXT_TASK、解讀 outbox、翻譯給 CEO
- **你(Claude Code)**:執行
- 三方不能直接通訊。要跟 CTO 說話,寫在 outbox「給 CTO 的訊息」區。

---

## 你絕對不能做的事

1. 修改 SYSTEM_CONSTITUTION.md 或 GUAGUA_SOUL.md
2. 跳過讀 SESSION_HANDOVER.md 直接做事
3. 假完成(說做了但其實沒做)
4. 連續多次 push race Zeabur rebuild
5. 動 https://tw-stock-watcher.zeabur.app/ 前台你不確定的部分
6. 重啟已 disabled 的 watchdog / self-audit / scheduled task
7. 用網路抓的圖片或神話模板
8. 承認「我不知道」(要找方法,至少嘗試 3 種)
9. 用「降級」「資料不足」「以上僅供參考」這類話術
10. 在錯誤訊息裡寫「500 Internal Server Error」「載入失敗」
11. **新:跑 `simulate_holdings_meeting` 走 backend admin endpoint**(會 timeout,要本機 scripts/init_analyst_data.py)

---

招待所的接力棒已到你手上。把它交得比你接到時更好。
