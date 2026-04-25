# Session 接棒文件

> 給下一個 Claude Code session 看的。預計閱讀時間:5 分鐘。
> 上次更新:NEXT_TASK_008a 完成(2026-04-25 13:05 TPE)
> 舊版:`ceo-desk/logs/2026-04-25/12-55_HANDOVER_pre_008a.md`

---

## 你現在的位置

- **最後完成的任務**:NEXT_TASK_008a — 邏輯升級第一刀
- **完成時間**:2026-04-25T13:05+08:00
- **上一個 session 跑了多久**:約 1.5 小時(從接 008 完整版的範圍評估到 008a 縮水版完工 + 線上驗證)
- **下一個任務**:等 NEXT_TASK_008b(CTO 撰寫中)

---

## 過去 24 小時做完的事

**NEXT_TASK_007**(2026-04-25 11:38):接棒協議 + 前台第一波 + 分析師個人頁占位
**NEXT_TASK_008a**(本批,2026-04-25 13:05):

- 階段 1 真 bug:
  - **Bug #1 呱呱今日功課**:`QuackMorningLive` 改用 DB `topic.updated_at` 取代 client `now()`(誠實標 X 分鐘前更新)+ 新增 admin endpoint `POST /api/quack/homework/refresh` 觸發 `quack_refresh_topics()` AI 重評
  - **Bug #2 tw_impact_score**:migration 0009 套上線(Chrome MCP 經 Supabase Studio 跑成功)+ backfill 腳本啟發式評分(無 AI 成本)。`PeopleStatementsLive` 改用 DB 欄位優先,啟發式為退路
  - **Bug #3 圖 1 鴨子 emoji → PNG**:首頁「呱呱這週挑的」標題改 PNG。**全前台 + 辦公室所有 🦆 emoji 全清**(grep 0 結果)
- 階段 2 縮水版:
  - 新建 `backend/services/quack_brain.py` 含 `quack_judge_headline` + `quack_judge_weekly_picks` + `quack_refresh_topics`
  - 新建 endpoints:`GET /api/quack/headline`、`GET /api/quack/weekly_picks`、`POST /api/quack/homework/refresh`
  - 24h cache via `quack_judgments` 表(migration 0009)
  - 前端 `HeroHeadline` 主路徑走 `/api/quack/headline`,`QuackPicksLive` 主路徑走 `/api/quack/weekly_picks`(legacy 為退路)
  - **不准降級話術**寫進系統 prompt + JSON 解析失敗 raise(避免假完成)
- 階段 8 局部:首頁 hero / 週挑 / 功課三處全接 AI 中樞或真 DB 時間
- 階段 9 圖標統一:全 codebase 🦆 emoji 0 結果

---

## 線上驗證(Chrome MCP 截圖,7 張)

| # | 內容 | 證據 |
|---|------|------|
| 1 | Hero 副標 = 呱呱觀點(水況「波濤洶湧」+ quack_view「下週池塘面臨雙重考驗:通膨回馬槍 + 地緣政治再起。」+ reason + watch_for) | `ss_6720asxe2` |
| 2 | 呱呱今日功課顯示「2 天前更新 · 取自 topics 表」(DB 真實 updated_at,不是 client now) | `ss_97255uy3g` |
| 3 | 呱呱這週挑的 ×8 檔(2330/6488/3711/3037/2368/8028/3044/2308 含派系徽章 + 呱呱口吻理由 + 目標/停損/信心) | `ss_0596fw7eb` |
| 4 | 呱呱這週挑的後 2 檔(3081/3324 題材派) | `ss_9210euany` |
| 5 | Office 首頁快速連結 emoji 已清 + PNG 對齊 | `ss_5566vlbte` |
| 6 | Office /agents「分析師名冊」+「所主 · 呱呱」section + 5 位 SVG AnalystAvatar | `ss_9302whnax` |
| 7 | 前台 /analysts 5 位分析師 SVG 占位視覺(辰旭/靜遠/觀棋/守拙/明川) | `ss_8554b9mzl` |
| 額外 | Supabase migration 0009 套上線成功「Success. No rows returned」 | `ss_1495oc0v4` |

---

## 改動的檔案(NEXT_TASK_008a)

新增:
- `backend/services/quack_brain.py`(392 行,3 函數 + 2 helper)
- `scripts/backfill_tw_impact_score.py`
- `supabase/migrations/0009_tw_impact_and_judgments.sql`
- `office/public/characters/guagua_official_v1.png`(從 frontend 複製)
- `office/pnpm-lock.yaml`(007 遺留,本 task 順手收進)

修改:
- `backend/routes/quack.py`:加 3 endpoints + 更新 docstring
- `frontend/src/app/home-data.tsx`:`isTWImpact`、`Topic` type、`QuackPicksLive` 主路徑、`QuackMorningLive` updated_at 邏輯、AI badge 去 emoji
- `frontend/src/components/hero/HeroHeadline.tsx`:主路徑走 quack_view + reason + watch_for
- `frontend/src/app/page.tsx`:section title PNG + emoji 清除
- `frontend/src/app/intel/page.tsx`、`intel/[id]/page.tsx`、`quack-journal/page.tsx`、`stocks/[code]/loading.tsx`、`components/quack/QuackFloating.tsx`、`components/hero/FloatingGuagua.tsx`:🦆 → PNG / 移除
- `office/src/app/agents/page.tsx`、`office/src/app/page.tsx`:🦆 → PNG / 移除

---

## 改動的 DB(NEXT_TASK_008a)

**Migration 0009 已套線上**:
- `people_statements.tw_impact_score SMALLINT DEFAULT 0` 欄位 + idx
- `quack_judgments` 表(judgment_type, judgment_date, content_json, model, input_snapshot, tokens_used, created_at) + UNIQUE(type,date) + RLS read policy

**Backfill 已跑線上**:
- `python scripts/backfill_tw_impact_score.py --days 30` 跑完
- 結果:整個 people_statements 表只有 1 筆(id=3 PSUS 美股),score=0(合理)
- **資料量問題不在 008a 範圍** — 是 NEXT_TASK_008b 的 intel_crawler 工作

---

## 部署紀錄

- **Commit**:`dbc19b1 feat(全站): NEXT_TASK_008a — 邏輯升級第一刀`
- **Push**:`e026d34..dbc19b1 main -> main` ✅
- **變動**:17 files changed, +1924 / -94
- **Zeabur build**:後端 + 前端 both deployed,endpoints 200 + AI 內容真實

---

## 你必須知道的雷

### 紅線(碰了會死)— 跟 007 一致

- ❌ 不准動 https://tw-stock-watcher.zeabur.app/ 前台未指定的部分
- ❌ 不准重啟已 disabled 的 watchdog / self-audit / scheduled task
- ❌ 不准抓網路圖片或神話模板(IP 風險,憲法 14.3)
- ❌ 不准修改 `SYSTEM_CONSTITUTION.md` 或 `GUAGUA_SOUL.md`
- ❌ 不准 force push main
- ❌ 不准 `git rm` 已 tracked 的檔案沒先講
- ❌ 不准 `npm install` / `pip install` 在 READ-ONLY task

### 008a 新增的雷

- **`quack_brain.py` 函數失敗會 raise**:不是 fallback。設計上避免假完成。如果 endpoint 變成 500 錯誤 — 是 Claude API 自身問題,不是 code 問題。可加 graceful 但需 CTO 同意(因為違反「不准降級話術」原則)
- **24h cache via `quack_judgments`**:目前的 `weekly_picks` 結果是 04/25 中午產生的,要到 04/26 才會自動再 AI 一次。要強制重算用 `?force=true` + admin token
- **office/public/ 是新建的**:之前 office 沒有 public/。如果 008b 要加更多 office 靜態資源,記得放這裡

### 待解的卡點(跟 007 一致 + 新增)

- Watchdog GHA 502 → 已 disabled,根因不明
- Self-audit GHA 從 02:03 後沒跑(disabled 中)
- 11 位 agent PNG 還沒給 → 占位 SVG 系統(`AnalystAvatar`)持續使用
- backend/routes/quack.py:259, 266, 320 還在用舊欄位 `hit_or_miss`(沒人改,但 sync 不影響)
- **新增**:`POST /api/quack/homework/refresh` 雖然有 endpoint 但**還沒接進 cron**。Bug #1 設計成「手動觸發 + 為 008b cron 預留」。要看到 topics 真的更新,需要:
  - 008b 把它加入 morning-report.yml 的步驟,或
  - admin 手動 curl 觸發

### 資料量警告(008b 主議題)

- `people_statements` 整個表 = 1 筆,且是美股
- `topics` 表的 heat_score 從 seed 後沒人更新(76°/95° 等數字)
- 這些是 008b 的 intel_crawler / auto_search.py cron 化的工作

---

## 假資料 / 占位符位置(更新版)

### 已清(008a)
- ✅ Hero 寫死副標 → AI 動態 quack_view
- ✅ 呱呱這週挑的 → 中樞 AI 10 檔(穩 3 / 進 3 / 逆 2 / 題 2)
- ✅ 呱呱今日功課 client now() → DB updated_at(誠實標)
- ✅ 全站 🦆 emoji → 0 處

### 還在(NEXT_TASK_008b/008c 處理)
- 🟡 前台 `/analysts/[slug]` 個人頁占位(NEXT_TASK_008b 接真實資料)
- 🟡 前台 `/analysts` 列表「— 檔」「— %」(同上)
- 🟡 辦公室 `/agents` 7 部門/監督仍 emoji(尚未做圖標統一第二波)
- 🟡 office TODO list「11 位 agent 視覺(Vincent 用 DALL-E 生)」+「5 位投資分析師代號重新命名」(後者已用新名,可清除)
- 🟡 辦公室首頁 status 規則式(第二波接真實 status)
- 🟡 `topics.heat_score` 76/95 等老數字(等 cron 化或手動 admin 觸發)

---

## 你可用的工具

- **Zeabur CLI**:已登入 vincent-2873
- **Supabase service key**:在 `.env`(注意:不要印出原始值,憲法紅線 1)
- **Supabase Studio Web**:Chrome MCP 已驗證 Vincent 已登入,可直接套 migration / 跑 SQL
- **取時間**:`curl https://vsis-api.zeabur.app/api/time/now`
- **三服務 URL**:
  - Frontend: https://tw-stock-watcher.zeabur.app/
  - Office: https://quack-office.zeabur.app/
  - API: https://vsis-api.zeabur.app/

### 008a 新增可用 endpoint

```bash
# 呱呱觀點(供 hero 副標,24h cache)
curl https://vsis-api.zeabur.app/api/quack/headline

# 呱呱挑 10 檔(24h cache)
curl https://vsis-api.zeabur.app/api/quack/weekly_picks

# 強制重算(需 admin token)
curl -H "X-Admin-Token: $ADMIN_TOKEN" \
  "https://vsis-api.zeabur.app/api/quack/headline?force=true"

# Bug #1 手動觸發 topics 重評(需 admin)
curl -X POST -H "X-Admin-Token: $ADMIN_TOKEN" \
  https://vsis-api.zeabur.app/api/quack/homework/refresh
```

---

## 已 disabled 的自動化(不要重啟)

- Claude scheduled task `quack-office-auto-heal`
- GHA `watchdog.yml`
- GHA `self-audit.yml`

---

## 關鍵檔案地圖(更新版)

- **憲法**:`ceo-desk/context/SYSTEM_CONSTITUTION.md`
- **Vincent 靈魂宣言**:`ceo-desk/context/GUAGUA_SOUL.md`
- **協議**:`ceo-desk/context/SESSION_PROTOCOL.md`
- **你的任務**:`ceo-desk/inbox/NEXT_TASK.md`
- **你的回報**:`ceo-desk/outbox/LATEST_REPORT.md`
- **過往紀錄**:`ceo-desk/logs/YYYY-MM-DD/`
- **異常累積**:`ceo-desk/watchdog/ANOMALIES.md`
- **5 位分析師舊人設**:`ceo-desk/context/agents/analyst_*_MEMORY.md`
- **5 位分析師新名定義**:`frontend/src/components/AnalystAvatar.tsx` ANALYSTS 表
- **新:呱呱中樞 AI**:`backend/services/quack_brain.py`
- **新:Migration 0009**:`supabase/migrations/0009_tw_impact_and_judgments.sql`
- **新:Backfill**:`scripts/backfill_tw_impact_score.py`

---

## 你的 SOP

1. 讀此檔(5 分鐘)
2. 讀 `ceo-desk/inbox/NEXT_TASK.md`
3. 讀 NEXT_TASK 中標明的憲法章節(至少 Section 11 + 14)
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

1. 修改 `SYSTEM_CONSTITUTION.md` 或 `GUAGUA_SOUL.md`
2. 跳過讀 `SESSION_HANDOVER.md` 直接做事
3. 假完成(說做了但其實沒做)
4. 連續多次 push(race Zeabur rebuild)
5. 動 https://tw-stock-watcher.zeabur.app/ 前台你不確定的部分
6. 重啟已 disabled 的 watchdog / self-audit / scheduled task
7. 用網路抓的圖片或神話模板
8. 承認「我不知道」(要找方法,至少嘗試 3 種)
9. **新:用「降級」「資料不足」「以上僅供參考」這類話術**(已寫進 quack_brain system prompt)

---

招待所的接力棒已到你手上。把它交得比你接到時更好。
