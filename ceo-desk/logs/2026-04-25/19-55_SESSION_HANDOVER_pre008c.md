# Session 接棒文件

> 給下一個 Claude Code session 看的。預計閱讀時間:5 分鐘。
> 上次更新:NEXT_TASK_008b 完成(2026-04-25 17:58 TPE)
> 舊版:`ceo-desk/logs/2026-04-25/17-59_SESSION_HANDOVER_pre008b.md`

---

## 你現在的位置

- **最後完成的任務**:NEXT_TASK_008b — 地基穩定 + 商業級資料品質
- **完成時間**:2026-04-25T17:58+08:00
- **上一個 session 跑了多久**:約 3.5 小時(從讀檔到 outbox + handover)
- **下一個任務**:等 NEXT_TASK_008b-2 或 NEXT_TASK_008c(CTO 撰寫中)

---

## 過去 24 小時做完的事

**NEXT_TASK_008a**(2026-04-25 13:05):邏輯升級第一刀(quack 中樞 AI / migration 0009 / emoji 清乾淨)
**NEXT_TASK_008b**(本批,2026-04-25 17:58):**地基穩定 + 商業級資料品質**

### 008b 七個階段全數完成

**階段 1 FinMind Sponsor 三層診斷**:
- 結論:層級 A(token)+ 層級 B(endpoint+header)全通過 → **Sponsor 已生效**(level 3, 6000/hr)
- 不需走到層級 C(不需 Vincent 介入)
- 新增 `/api/health/finmind` 包裝(含 token 指紋 + 額度監控)

**階段 2 intel_crawler 健康度追蹤**:
- 既有已 18 RSS 來源 + PTT(共 19 個),不需「重新接 10+」
- 新增 `intel_sources.last_success_at, last_error_at, last_error_msg, today_count, today_count_date` 欄位
- `intel_crawler.py` 抓取後寫健康度 + 失敗寫 `errors` 表
- 新增 `/api/health/intel_crawler` endpoint

**階段 3 美股資料源 + cross_market_view + Hero 時段切換**:
- yfinance 9 個標的全接通(SPX/NDX/DJI/VIX/SOX/TSM/NVDA/AMD/TSLA)
- 新增 `us_tw_correlation` 表 + 8 條 seed(NVDA/SOX/TSM ADR/SPX/VIX 觸發條件)
- 新增 `/api/quack/cross_market_view`:抓美股盤後 → 比對連動表 → 觸發事件 → 生成 quack_view + tw_open_predict
- 新增 `/api/hero/headline`:依台北時間自動切換(盤前 / 盤中 / 盤後 / 週六 weekly_recap / 週日 next_week_preview / 美股盤中 us_session)
- 前端 HeroHeadline 改走 `/api/hero/headline` 為主路徑

**階段 4 topics cron 排程化**:
- 新增 `.github/workflows/quack-refresh.yml`:平日 6 次 + 週末 3 次
- 內建 3 次重試 + 失敗寫 ANOMALIES.md + auto commit
- 週六 16:00 / 週日 20:00 額外刷 weekly_picks

**階段 5 商業級錯誤處理(全站)**:
- Backend `ErrorHandlingMiddleware`:`/api/*` unhandled exception 寫 errors 表 + 回 200 + structured error + 友善訊息
- 前端 HeroHeadline 多層 fallback(hero/headline → quack/headline → market/headline → 友善訊息)
- Sentry 用 `errors` 表備案(架構同 Sentry,改 5 行可接真 Sentry)

**階段 6 /watchdog 商業級監控儀表板**:
- 8 區塊整合:三站健康度 / FinMind / intel_crawler 19 來源 / 美股 9 標的 / cron 紀錄 / 24h 錯誤 / 最近錯誤列表 / ANOMALIES + Self-audit
- 接 `/api/health/all` + `/api/errors` + GitHub raw

**階段 7 整合測試 + commit + push + Migration + 線上驗證**:
- Python ast × 7 / TypeCheck × 2 全通過
- Migration 0010 透過 Chrome MCP 套線上(Success. No rows returned)
- Zeabur build 完成,所有新 endpoint 200
- 9 張 Chrome MCP 截圖佐證

---

## 線上驗證(9 張截圖)

| # | 截圖 | 內容 |
|---|------|------|
| 1 | `ss_0315944mr` | Supabase Studio Migration 0010 「Success. No rows returned」 |
| 2 | `ss_3643jbcol` | Migration 4 行驗證:errors=0 / us_tw_correlation=8 / sources_with_health=18 / seeds=8 |
| 3 | `ss_59808xnio` | watchdog 上半:三站(全 ok)+ FinMind Sponsor / Level 3 / 6000/hr / Token eyJ0eX...zQ90 |
| 4 | `ss_63713kon4` | watchdog 中段:intel_crawler 列表 + 美股 9/9 全 ok + cron 排程 |
| 5 | `ss_4105qlg51` | watchdog 下段:24h 錯誤 0 critical / status healthy + ANOMALIES + Self-audit |
| 6 | `ss_6564sw980` | 前台 hero「波濤洶湧」+ 副標 + reason + 即時費半 +4.32% / NVDA / TSM |
| 7 | `ss_05115olvm` | `/api/quack/cross_market_view` 真實 JSON:9 美股 + 3 觸發 + 10 impacted stocks |
| 8 | `ss_1960ku7fx` | `/api/health/finmind` 真實 JSON |
| 9 | `ss_6235x3vqw` | `/api/health/intel_crawler` 真實 JSON 19 sources |

---

## 改動的檔案(NEXT_TASK_008b)

新增:
- `backend/routes/health.py`(/api/health/{finmind, intel_crawler, us_market, all} + /api/errors GET/POST)
- `backend/routes/hero.py`(/api/quack/cross_market_view + /api/hero/headline 時段切換)
- `backend/utils/error_middleware.py`(`ErrorHandlingMiddleware`)
- `supabase/migrations/0010_health_and_errors.sql`(errors / intel_sources 健康度欄位 / us_tw_correlation + 8 seed)
- `.github/workflows/quack-refresh.yml`(平日 6 + 週末 3 排程 + 重試)

修改:
- `backend/main.py`:加 ErrorHandlingMiddleware + include health/hero routes
- `backend/services/intel_crawler.py`:`_mark_source_success / _mark_source_error`
- `frontend/src/components/hero/HeroHeadline.tsx`:主路徑走 hero/headline + mode badge + watch_for string|array + triggered_events 顯示
- `office/src/app/watchdog/page.tsx`:整個重寫成 8 區塊商業級儀表板
- `ceo-desk/watchdog/AUTO_HEAL_LOG.md`:auto-heal cron 寫的紀錄

---

## 改動的 DB(NEXT_TASK_008b)

**Migration 0010 已套線上**:
- `errors` 表(trace_id / occurred_at / severity / source / service / endpoint / message / stacktrace / context / user_agent)+ 3 indexes + RLS read
- `intel_sources` 加 `last_success_at, last_error_at, last_error_msg, today_count, today_count_date`(18 sources 全部 default)
- `us_tw_correlation` 表 + 8 條 seed(NVDA up/down, SOX up/down, TSM ADR up/down, SPX up, VIX spike)+ idx + RLS

**驗證**:`SELECT count(*) FROM errors → 0`、`SELECT count(*) FROM us_tw_correlation → 8`、`SELECT count(*) FROM intel_sources WHERE today_count IS NOT NULL → 18`

---

## 部署紀錄

- **Code commit**:`cf101bb feat(全站): NEXT_TASK_008b — 商業級資料地基`
- **Push**:`c9db36a..cf101bb main -> main` ✅
- **變動**:10 files changed, +1784 / -124
- **後續 docs commit**(本檔 + outbox)會 push 第二個 commit
- **Zeabur build**:後端 + 辦公室 + 前端 all green,新 endpoints 全部 200

---

## 你必須知道的雷

### 紅線(碰了會死)— 跟 008a 一致

- ❌ 不准動 https://tw-stock-watcher.zeabur.app/ 前台未指定的部分
- ❌ 不准重啟已 disabled 的 watchdog / self-audit / scheduled task
- ❌ 不准抓網路圖片或神話模板(IP 風險,憲法 14.3)
- ❌ 不准修改 `SYSTEM_CONSTITUTION.md` 或 `GUAGUA_SOUL.md`
- ❌ 不准 force push main
- ❌ 不准 `git rm` 已 tracked 的檔案沒先講
- ❌ 不准 `npm install` / `pip install` 在 READ-ONLY task

### 008b 新增的雷

- **`errors` 表 graceful degrade**:middleware + intel_crawler 寫 errors 失敗時會 catch + log warn,不阻擋主功能。如果 errors 表被誤刪,系統可繼續跑(只是失去錯誤追蹤)
- **`/api/hero/headline` 依台北時間切換**:測試時注意「現在是平日盤前還是週末」會回不同 source。修改邏輯前看 `backend/routes/hero.py:hero_headline` 的時段判定
- **`us_tw_correlation` 表的 8 條 seed 是「規則式」**:目前 cross_market_view 是「比對 → 觸發」,沒走 AI。若要加 AI 解讀(例如「美股這樣跌但台股可能不跟,因為...」),需新建 quack_brain.quack_judge_cross_market 函數
- **GHA `quack-refresh.yml` 第一次跑**:Push 後 GitHub 不會立刻跑(等下一個 cron 時間點)。要手動觸發用 `workflow_dispatch` UI 或 gh CLI

### 待解的卡點(跟 008a 一致 + 新增)

- Watchdog GHA 502 → 已 disabled,根因不明
- Self-audit GHA 從 02:03 後沒跑(disabled 中)
- 11 位 agent PNG 還沒給 → 占位 SVG 系統(`AnalystAvatar`)持續使用
- backend/routes/quack.py:259, 266, 320 還在用舊欄位 `hit_or_miss`(沒人改,但 sync 不影響)
- **新增**:`intel_sources` 健康度欄位剛建立,需要等下一輪 intel-cron(15 分內)跑完才會有 last_success_at 資料填入

---

## 008b-2 / 008c 待辦清單(CTO 排優先順序用)

### 008b-2(後續地基,延續本次)

**a. 獨立 scraper(目前 Google News RSS 包裝已通,獨立會更穩)**
- 為什麼延後:RSS 已能拿到資料,只是有時 Google News 截斷標題或 link 跳板。獨立 scraper 是品質升級不是「能不能跑」
- 依賴:無
- Bloomberg headlines:獨立 scraper 用 https://www.bloomberg.com/markets RSS 或 API
- Reuters business:獨立 scraper 用 Reuters API(免費 100/day)
- Reddit OAuth:接通後可拿 score / comments / awards,目前只能讀公開 listing

**b. 官方公告專屬 scraper**
- 為什麼延後:這些是「定期但不頻繁」的訊號(FOMC 一年 8 次 / 法說會一季 1 次),整合進 intel_articles 即可,不需要單獨 cron
- 依賴:無
- Fed FOMC(federalreserve.gov)
- SEC(sec.gov/cgi-bin/browse-edgar)
- 黃仁勳 / 蘇姿丰 / Musk 發言(用既有 watched_people + 加 priority 9-10)
- 台積電 / 鴻海 / 聯發科法說會(MOPS investor relations)

**c. Sentry 真整合**
- 為什麼延後:errors 表已商業級可用。Sentry 真實價值在 Slack alert routing + 多人協作。Vincent 是單人開發,等用戶上來再加
- 依賴:Vincent 註冊 Sentry + 提供 SENTRY_DSN env
- 改動估計:5 行 Python(`sentry_sdk.init` + `capture_exception`)+ 5 行 JS(前端)

**d. 商業級 fallback UI 第二波**
- 為什麼延後:本次只改 hero,其他 UI 還用「尚無資料」這種文案 — 不致命但不夠商業級
- 依賴:無
- 範圍:`market/page.tsx`、`quack-journal/page.tsx`、`InstitutionalBanner.tsx`、`stocks/[code]` 等

**e. intel_crawler 跑一輪填健康度**
- 為什麼延後:等下一輪 GHA cron(每 15 分),或人工 admin POST /api/intel/cron 即可。本次只是 schema + endpoint 準備好
- 依賴:無

### 008c(分析師完整落地,008a 已預告)

**A. quack_brain.py 擴 4 個函數**
- `quack_judge_market`(每日盤後做整體市場觀)
- `quack_judge_homework`(每日盤前做今日功課)
- `pick_daily`(分析師每日選股)
- `backfill_history`(6 個月歷史回溯)

**B. 新表 analyst_market_views / analyst_daily_picks**

**C. 6 個月歷史回溯**:4500-9000 筆 AI 預測 + 真實價格對照(這是真正的長 task,可能要分數個 session)

---

## 假資料 / 占位符位置(更新版)

### 已清(008a)
- ✅ Hero 寫死副標 → AI 動態
- ✅ 呱呱這週挑的 → 中樞 AI 10 檔
- ✅ 呱呱今日功課 client now() → DB updated_at
- ✅ 全站 🦆 emoji → 0 處

### 已新增(008b)
- ✅ Hero mode 自動切換(盤前/盤中/盤後/週末)
- ✅ Hero triggered_events 顯示(盤前/夜盤時)
- ✅ Cross market view 即時抓 yfinance + 比對連動表

### 還在(008b-2 處理)
- 🟡 前台 `/analysts/[slug]` 個人頁占位
- 🟡 前台 `/analysts` 列表「— 檔」「— %」
- 🟡 辦公室 `/agents` 7 部門/監督仍 emoji
- 🟡 前台 `market/page.tsx`「尚無資料」
- 🟡 前台 `quack-journal/page.tsx`「尚無驗證結果」
- 🟡 前台 `InstitutionalBanner.tsx`「無資料」
- 🟡 office 首頁 status 規則式

---

## 你可用的工具(更新版)

- **Zeabur CLI**:已登入 vincent-2873
- **Supabase service key**:在 `.env`(注意:不要印出原始值,憲法紅線 1)
- **Supabase Studio Web**:Chrome MCP 已驗證可登入(本 session 用過套 0010)
- **取時間**:`curl https://vsis-api.zeabur.app/api/time/now`
- **三服務 URL**:
  - Frontend: https://tw-stock-watcher.zeabur.app/
  - Office: https://quack-office.zeabur.app/
  - API: https://vsis-api.zeabur.app/

### 008b 新增可用 endpoint

```bash
# FinMind Sponsor 健康度
curl https://vsis-api.zeabur.app/api/health/finmind

# intel_crawler 19 來源狀態
curl https://vsis-api.zeabur.app/api/health/intel_crawler

# 美股 yfinance 9 標的
curl https://vsis-api.zeabur.app/api/health/us_market

# 一次拿全部健康度(/watchdog 用)
curl https://vsis-api.zeabur.app/api/health/all

# 跨市場觀點(美股盤後 → 台股族群連動)
curl https://vsis-api.zeabur.app/api/quack/cross_market_view

# Hero 時段切換(自動依台北時間)
curl https://vsis-api.zeabur.app/api/hero/headline

# 最近錯誤
curl 'https://vsis-api.zeabur.app/api/errors?limit=50'

# 前端主動回報錯誤(POST)
curl -X POST -H "Content-Type: application/json" \
  -d '{"severity":"warning","source":"frontend","message":"foo"}' \
  https://vsis-api.zeabur.app/api/errors

# 手動觸發 quack-refresh GHA
gh workflow run quack-refresh.yml -f target=all
```

---

## 已 disabled 的自動化(不要重啟)

- Claude scheduled task `quack-office-auto-heal`
- GHA `watchdog.yml`
- GHA `self-audit.yml`

### 新增已啟用的 cron(本次 008b)

- GHA `quack-refresh.yml`:平日 6 次 + 週末 3 次 + 3 retry

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
- **呱呱中樞 AI(008a)**:`backend/services/quack_brain.py`
- **新:Health endpoints(008b)**:`backend/routes/health.py`
- **新:Hero 時段切換(008b)**:`backend/routes/hero.py`
- **新:Error middleware(008b)**:`backend/utils/error_middleware.py`
- **新:Migration 0010**:`supabase/migrations/0010_health_and_errors.sql`
- **新:Quack-refresh GHA**:`.github/workflows/quack-refresh.yml`

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
9. 用「降級」「資料不足」「以上僅供參考」這類話術(已寫進 quack_brain system prompt)
10. **新:在錯誤訊息裡寫「500 Internal Server Error」「載入失敗」**(全部統一走 ErrorHandlingMiddleware 的友善訊息)

---

招待所的接力棒已到你手上。把它交得比你接到時更好。
