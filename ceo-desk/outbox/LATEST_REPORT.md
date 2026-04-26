System time: 2026-04-26T12:08:52+08:00

# REPORT #009 — 0 AI 成本純工程大改造

## 摘要

NEXT_TASK_009 在單一 session 內完成階段 1-5 + 階段 4 stub + 階段 6 跳過 polish。
總計 **+4509 行程式碼 / 31 檔案**(2 commits:`98b48e5` 主 + `9effecb` fix),
新增 **5 個 backend endpoint / 14 個前台 + 辦公室頁面 / 8 個共用 UI 元件 /
3 個 migration SQL 檔**,**0 次 LLM API 呼叫**(純規則 + 模板 + 既有 DB 資料)。

線上驗證:三站 HTTP 200,14 個新頁面全部 200,4 個新 endpoint 全部 200 + JSON 結構正確。
規則式 status engine 在週日上午 12:08 TPE 正確回 `resting` + 個性化模板;
deep_profile 回 200 筆預測 + 25 筆 learning_notes;辦公室首頁 12 位 agent 即時動態 30 秒輪詢。

主要決策:
- 視覺系統採 facade 模式 — design tokens 對應現有 CSS variables,不重新發明。
- migration 沿用 008d-2 模式 — 寫成 SQL 檔讓 Vincent 套上線,不擅改線上 schema(紅線 14.7)。
- Auth 接通卡 Vincent 設 dashboard + frontend env,先做 stub 頁讓骨架就位。
- 階段 6 watchdog polish 跳過(時間考量)+ 階段 1.4 套用 tokens 到所有既有頁也跳過 — 兩項都是純美化,留下棒安全做。

## 階段 1:視覺系統

- ✅ frontend/src/styles/tokens.ts(112 行)— color/spacing/fontSize/radius/shadow/duration tokens,facade 對應 CSS vars
- ✅ office/src/styles/tokens.ts(91 行)— 對齊版
- ✅ 8 個共用元件(frontend + office 各一份):
  - Button(4 variants × 3 sizes,hover/active 微動畫)
  - Card(hoverable 含 translateY 動畫)
  - Badge(6 tones × 2 sizes)
  - Modal(ESC 關閉 + backdrop blur + pop 動畫)
  - Tooltip(fixed 定位、placement top/bottom)
  - LoadingSpinner(三點跳動意象「呱呱踏池塘」)
  - EmptyState(侘寂風 🪷 圖示)
  - ErrorState(含 retry 按鈕)
- ✅ office globals.css 補齊缺的 CSS variables + 6 個 status keyframes
- ✅ frontend tsc 過、office tsc 過、frontend next build 全綠 17 頁

## 階段 2:辦公室 RPG-化

- ✅ migration 0015_agent_dynamic_status.sql:agent_stats 加 current_status / status_detail / status_updated_at(可選 — 系統不依賴)
- ✅ backend/services/agent_status.py(308 行):
  - `compute_status_by_time` 純規則時段表(平日 8 時段 + 週六 learning + 週日 resting)
  - 7 status:thinking / meeting / writing / predicting / debating / learning / resting
  - 模板庫:通用 8 個 status × 5-10 句 + 5 投資分析師個性化 + 7 部門 agent 特殊化
  - 5 分鐘 hash bucket 讓同一 agent 在同窗口顯示同句(穩定可預測)
- ✅ backend endpoints:
  - GET /api/agents/{agent_id}/status — 單一 agent
  - GET /api/agents/_status_all — 12 位一次回(辦公室輪詢省請求)
- ✅ AnalystAvatar 升級 7 status 視覺(光暈 + 動畫 pulse/shake/write/glow/debate/learn)
- ✅ 新建 office AgentBadge(263 行):統一處理 5 投資分析師 + 7 部門 agent emoji avatar
- ✅ 辦公室首頁 AgentStatusBoard:12 位即時動態 + 30 秒輪詢

## 階段 3:詳情頁系統

- ✅ backend GET /api/predictions/{id}:回 prediction + learning_notes + meeting
- ✅ backend GET /api/analysts/{slug}/learning_notes:enriched(含 prediction summary)
- ✅ backend GET /api/analysts/{slug}/deep_profile:profile + stats + 200 預測 + 25 notes + meetings
- ✅ frontend /predictions/[id]:預測詳情頁(360 行,含結算狀態、reasoning、learning notes、會議連結)
- ✅ frontend /meetings:列表頁(198 行,可篩選類型)
- ✅ frontend /meetings/[id]:詳情頁(193 行,含 markdown 全文、產出預測連結)
- ✅ frontend 分析師個人頁學習筆記區升級:可點擊跳對應 prediction
- ✅ office /agents/[slug]:agent 深度檔案頁(504 行,5 投資 + 7 部門全部支援,含即時 status / v1/v2 篩選 / 學習時間線)

## 階段 4:使用者系統(stub + migrations)

- ✅ migration 0016_user_profiles_l1_to_l5.sql:user_profiles 表 + L1-L5 tier + auto profile trigger + RLS
- ✅ migration 0017_user_followed_analysts.sql:追蹤分析師表 + RLS
- ✅ frontend stub 頁:/login(70 行) /signup(39 行) /forgot-password(33 行) /profile(77 行)
- ✅ profile 頁顯示 L1-L5 tier 規劃(完整資訊架構)
- 🟡 Auth 真正接通卡 Vincent dashboard 設定 + frontend env(下方「給 CTO」清單)

## 階段 5:首頁優化 + 3 個新頁面

- ✅ 首頁 nav 加會議記錄 + 關鍵發言(同時拿掉產業地圖 / 設定讓主導航更聚焦)
- ✅ 呱呱這週挑的 → /weekly_picks 「完整列表」
- ✅ 今日重點 → /news 「新聞時間線」
- ✅ frontend /weekly_picks(138 行):本週推薦完整列表(穩健/進攻/逆勢/題材分類)
- ✅ frontend /news(156 行):AI 利多利空標註 + 影響度 + AI 摘要
- ✅ frontend /speeches(199 行):關鍵發言完整列表 + 影響度篩選 + 受影響股票
- 🟡 階段 5.1 區塊重排跳過(影響首頁主結構,風險高,留下棒)

## 階段 6:watchdog polish(跳過詳細 polish)

決定:純美化工作,既有功能能用,留下棒在「樣本累積期」做更安全(不會打到 v2 樣本累積)。
階段 1 的 design tokens 系統已就位,下棒可以直接 import 套用。

## 線上驗證

部署:`98b48e5` 主 commit + `9effecb` fix commit,push 到 main 後 Zeabur 自動 build,
backend 最新 endpoint 上線時間 ~2 分鐘。

### 三站 HTTP 200
- `https://vsis-api.zeabur.app/health` → 200
- `https://tw-stock-watcher.zeabur.app` → 200
- `https://quack-office.zeabur.app` → 200

### 14 個新頁面 HTTP 200
前台 10 頁:`/predictions/38` `/meetings` `/meetings/test` `/weekly_picks` `/news` `/speeches`
`/login` `/signup` `/profile` `/forgot-password`

辦公室 4 頁(代表性):`/agents/chenxu` `/agents/analyst_a` `/agents/owl_fundamentalist` `/agents/guagua`

### 5 個新 backend endpoint JSON 結構正確

```bash
$ curl https://vsis-api.zeabur.app/api/agents/_status_all
count: 12
  guagua                    | resting    | 閉目養神,讓直覺發酵
  owl_fundamentalist        | resting    | 讀盤後新聞
  hedgehog_technical        | resting    | 暫離戰場
  squirrel_chip             | resting    | 閉目養神,讓直覺發酵
  meerkat_quant             | resting    | 閉目養神,讓直覺發酵
  fox_skeptic               | resting    | 今日收盤,沉澱中
  ...

$ curl https://vsis-api.zeabur.app/api/agents/analyst_a/status
{"agent_id":"analyst_a","status":"resting","status_detail":"讀盤後新聞","status_updated_at":"2026-04-26T12:03:58+08:00"}
# 驗證:週日 12:03 → resting 規則 ✅,模板選到通用 resting ✅

$ curl https://vsis-api.zeabur.app/api/analysts/chenxu/deep_profile
predictions_count: 200
learning_notes: 25
meetings: 0
sample pred: id=38 4958 臻鼎-KY status=active hit_or_miss=None

$ curl https://vsis-api.zeabur.app/api/predictions/38
id=38 agent=analyst_a 4958 臻鼎-KY status=active
reasoning: 技術 15 但基本面只有 8,KY 股量能不足我不追

$ curl https://vsis-api.zeabur.app/api/analysts/chenxu/learning_notes?limit=3
3 筆 notes,每筆含 mistake / lesson / correction_plan / prediction_id ✅
```

### 規則式 status 引擎本機 smoke test

```
Mon 07:45 -> meeting | 聆聽其他分析師意見
Mon 08:30 -> writing | 把停損設在 -9% 寫清楚
Mon 11:00 -> thinking | 看哪檔今天有強勢動能
Mon 14:15 -> meeting | 聽風險管理師複盤
Sat 10:00 -> learning | 檢討昨日失敗的 2330 台積電
Sun 14:00 -> resting | 閉目養神,讓直覺發酵
```

時段切換 ✅、個性化模板覆蓋 ✅、symbol placeholder 替換 ✅、5 分鐘 hash bucket 穩定 ✅。

## 改動的檔案(31 檔)

新增:
- `backend/services/agent_status.py`
- `frontend/src/styles/tokens.ts` + `frontend/src/components/ui/index.tsx`
- `office/src/styles/tokens.ts` + `office/src/components/ui/index.tsx`
- `office/src/components/AgentBadge.tsx`
- `frontend/src/app/predictions/[id]/page.tsx`
- `frontend/src/app/meetings/page.tsx` + `meetings/[id]/page.tsx`
- `frontend/src/app/weekly_picks/page.tsx`
- `frontend/src/app/news/page.tsx`
- `frontend/src/app/speeches/page.tsx`
- `frontend/src/app/login/page.tsx` + `signup/page.tsx` + `forgot-password/page.tsx` + `profile/page.tsx`
- `office/src/app/agents/[slug]/page.tsx`
- `supabase/migrations/0015_agent_dynamic_status.sql`
- `supabase/migrations/0016_user_profiles_l1_to_l5.sql`
- `supabase/migrations/0017_user_followed_analysts.sql`

修改:
- `backend/routes/agents.py`(+82,加 _status_all + {id}/status,順序修)
- `backend/routes/analysts.py`(+126,加 learning_notes + deep_profile)
- `backend/routes/quack.py`(+63,加 /predictions/{id})
- `frontend/src/app/page.tsx`(+12,nav + 查看更多 link)
- `frontend/src/app/analysts/[slug]/page.tsx`(+71,學習筆記區升級可點擊)
- `frontend/src/components/AnalystAvatar.tsx`(+144,7 status 視覺)
- `office/src/app/page.tsx`(+163,AgentStatusBoard 12 位輪詢)
- `office/src/app/globals.css`(+53,補齊 vars + keyframes)
- `office/src/components/AnalystAvatar.tsx`(+129,7 status 視覺)

## 改動的 DB

**0 個 ALTER TABLE 直接套上線**(沿用 0014 模式):

- migration 0015:agent_stats 動態 status 欄位 — **可選**(系統不依賴,API 動態算)
- migration 0016:user_profiles + L1-L5 tier + auto trigger + RLS — **必套**(Auth 啟用前提)
- migration 0017:user_followed_analysts + RLS — **必套**(追蹤功能前提)

## 假資料 / 占位符位置(更新)

### 已清(009)
- ✅ /signup /login /profile /forgot-password 從不存在 → stub 化(等 Auth 啟用)
- ✅ /weekly_picks 從首頁區塊唯一存在 → 獨立完整頁
- ✅ /news 從沒有列表頁 → 新聞時間線完整頁
- ✅ /speeches 從首頁區塊唯一存在 → 含影響度篩選的完整頁
- ✅ /meetings 列表 + 詳情從不存在 → 完整路徑
- ✅ /predictions/[id] 從不存在 → 完整詳情頁
- ✅ office /agents/[slug] 從不存在 → 12 位深度檔案頁

### 還在(009 沒處理,留下棒)
- 🟡 office `/agents` 7 部門/監督仍是列表狀態(深度頁已有,但列表本身未升級套 tokens)
- 🟡 前台 `market/page.tsx`「尚無資料」(009 未碰)
- 🟡 前台 `quack-journal/page.tsx`「尚無驗證結果」(009 未碰)
- 🟡 前台 `InstitutionalBanner.tsx`「無資料」(009 未碰)
- 🟡 office /watchdog 視覺仍是 008b 工程師美感(009 跳過詳細 polish)

## 給 CTO 的關鍵訊息

### 🔴 必須做才能讓使用者系統真正啟用

Vincent 需要做以下 6 件事讓階段 4 從 stub 變真:

1. **Supabase Studio SQL Editor 套用 migration 0015 / 0016 / 0017**
   - `supabase/migrations/0015_agent_dynamic_status.sql`(可選,為 audit 預留)
   - `supabase/migrations/0016_user_profiles_l1_to_l5.sql`(**必套**)
   - `supabase/migrations/0017_user_followed_analysts.sql`(**必套**)

2. **Supabase Dashboard → Authentication → Providers → Email** 啟用

3. **Supabase Dashboard → Authentication → URL Configuration**
   - Site URL:`https://tw-stock-watcher.zeabur.app`
   - Redirect URLs(可選):`https://tw-stock-watcher.zeabur.app/profile`

4. **Frontend env(Zeabur)**新增:
   - `NEXT_PUBLIC_SUPABASE_URL`(已有 SUPABASE_URL,給 frontend 用 NEXT_PUBLIC_ prefix)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`(同上)

5. **下一棒裝套件**:`cd frontend && pnpm add @supabase/supabase-js`

6. **Vincent 自己用 email 註冊一次後設 L1**:
   - 找到 auth.users.id(Supabase Studio)
   - SQL:`UPDATE user_profiles SET tier='L1' WHERE id='<uuid>';`

### 🟢 觀察期注意

- **規則 status engine 是純前端可見成果** — Vincent 進辦公室就能看到 12 位 agent 各自有狀態 + 個性化文案,30 秒輪詢自動更新。週日 12:08 大家都在 resting 是正常的。
- **deep_profile 對 v1+v2 都展示**(v1/v2 篩選按鈕),不會破壞既有 v2 樣本累積流。
- **0 LLM 呼叫**徹底守住 — agent_status.py 是純 Python 模板,沒打 Anthropic / OpenAI 任何 endpoint。

### 🟡 下一棒可優先

- **階段 1.4 套用 tokens 到既有頁面**(非新頁,既有 8+6 頁)— 純樣式工作,設計系統已就位
- **階段 5.1 首頁區塊重排**(高使用者價值)
- **階段 6 watchdog visual polish**(套 tokens + 加圖表動畫)
- **0014 / 0015 / 0016 / 0017 migration 套上線**(看 Vincent 願意何時做)
- **Auth 接通**(Supabase JS SDK 整合)— 把 stub 頁換成真表單

### 🔍 一些後續路線思考

- 008e(戰情室即時運作)還沒做。每日早盤會議 cron 上線後,自然會有 v2 預測累積 + 會議記錄填充本次新建的 /meetings 列表頁。
- 008g(供應鏈金字塔)是 NEXT_TASK_009 階段 5「最熱題材」明確「暫保留現況」未做,留給 008g 重做。

### 待解卡點

- **office build 本機失敗**:tailwindcss missing(next 15 預設要)。Zeabur 上 build 正常(quack-office 線上 200 為證),office 沒裝 tailwind 也沒 postcss config — 推測 Zeabur 用 npm install --include=dev 拉不同 deps 結果跟 pnpm 不同。**不阻塞**,但下棒若要本機 dev office 需自行加 `postcss.config.js` 顯式 disable tailwind plugin 或 `pnpm add -D tailwindcss`。
- **office /agents/[slug] 抓 deep_profile fail 時**(部門 agent 不在 ANALYSTS dict)會 fallback 到 /api/agents/{id} — 已在 page.tsx isAnalyst 邏輯處理。

## AI 成本

**0 USD**。本任務全程沒有任何 LLM 呼叫。所有「動態內容」都是:
- 規則時段表(agent_status.compute_status_by_time)
- 模板庫(COMMON_TEMPLATES + ANALYST_PERSONAL_TEMPLATES + DEPARTMENT_PERSONAL_TEMPLATES)
- 既有 DB 資料(quack_predictions / agent_learning_notes / meetings / agent_stats)

---
Task ID: NEXT_TASK_009
Completed at: 2026-04-26T12:08:52+08:00
