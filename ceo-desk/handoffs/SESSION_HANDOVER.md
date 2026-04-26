# Session 接棒文件

> 給下一個 Claude Code session 看的。預計閱讀時間:5 分鐘。
> 上次更新:NEXT_TASK_009 完成(2026-04-26 ~12:08 TPE)
> 舊版:`ceo-desk/logs/2026-04-26/SESSION_HANDOVER_pre_009.md`

---

## 你現在的位置

- **最後完成的任務**:NEXT_TASK_009 — 0 AI 成本純工程大改造
- **完成時間**:2026-04-26T12:08+08:00
- **上一個 session 跑了多久**:約 90 分鐘(階段 1-5 全包 + 階段 4 stub + 線上驗證)
- **下一個任務**:Vincent 決定。可能方向見下方「待續清單」

### 009 重點摘要

- **設計系統就位**:design tokens(facade 對應 CSS vars)+ 8 共用元件(Button/Card/Badge/Modal/Tooltip/LoadingSpinner/EmptyState/ErrorState),前後台對齊
- **辦公室 RPG-化**:純規則 status engine(0 LLM)+ 7 status 視覺(光暈+動畫)+ 12 位即時動態 30 秒輪詢
- **詳情頁系統**:/predictions/[id] /meetings /meetings/[id] + office /agents/[slug] 12 位深度檔案
- **使用者系統 stub**:/login /signup /profile /forgot-password 就位 + migration 0016/0017 SQL 檔
- **新頁面**:/weekly_picks /news /speeches 前台三頁
- **Backend 5 新 endpoint**:/agents/_status_all /agents/{id}/status /predictions/{id} /analysts/{slug}/learning_notes /analysts/{slug}/deep_profile
- **3 個 migration SQL 檔**:0015(agent_status,可選)/ 0016(user_profiles + L1-L5)/ 0017(追蹤分析師)
- **0 LLM 呼叫**:全程靠規則 + 模板 + 既有 DB

---

## 過去 90 分鐘做完的事

**NEXT_TASK_009**(2026-04-26 12:08):0 AI 成本商業級體驗大改造
- Commit `98b48e5`(主)+ `9effecb`(fix:_status_all 路由順序 + deep_profile hit_or_miss 欄位)

---

## 改動的檔案(NEXT_TASK_009)

新增 19 檔:
- `backend/services/agent_status.py`(308 行 — 規則 + 模板)
- `frontend/src/styles/tokens.ts` + `office/src/styles/tokens.ts`
- `frontend/src/components/ui/index.tsx` + `office/src/components/ui/index.tsx`
- `office/src/components/AgentBadge.tsx`(263 行)
- `frontend/src/app/predictions/[id]/page.tsx`
- `frontend/src/app/meetings/page.tsx` + `meetings/[id]/page.tsx`
- `frontend/src/app/weekly_picks/page.tsx`
- `frontend/src/app/news/page.tsx`
- `frontend/src/app/speeches/page.tsx`
- `frontend/src/app/login/page.tsx` + `signup` + `forgot-password` + `profile`
- `office/src/app/agents/[slug]/page.tsx`(504 行)
- `supabase/migrations/0015_agent_dynamic_status.sql`
- `supabase/migrations/0016_user_profiles_l1_to_l5.sql`
- `supabase/migrations/0017_user_followed_analysts.sql`

修改 9 檔:
- `backend/routes/agents.py`(+82 — _status_all + {id}/status,順序修)
- `backend/routes/analysts.py`(+126 — learning_notes + deep_profile,hit_or_miss 修正)
- `backend/routes/quack.py`(+63 — predictions/{id})
- `frontend/src/app/page.tsx`(+12 — nav + 查看更多)
- `frontend/src/app/analysts/[slug]/page.tsx`(+71 — 學習筆記區可點擊跳)
- `frontend/src/components/AnalystAvatar.tsx`(+144 — 7 status)
- `office/src/app/page.tsx`(+163 — AgentStatusBoard 12 位輪詢)
- `office/src/app/globals.css`(+53 — 補齊 vars + keyframes)
- `office/src/components/AnalystAvatar.tsx`(+129 — 7 status)

**總計:31 檔 / 4509 行新增**

---

## 改動的 DB(NEXT_TASK_009)

**0 個 ALTER 直接套上線**(沿用 0014 模式),3 個 SQL 檔等 Vincent 套:

- `0015_agent_dynamic_status.sql` — 可選(API 動態算,不依賴此欄位)
- `0016_user_profiles_l1_to_l5.sql` — **Auth 啟用前必套**
- `0017_user_followed_analysts.sql` — **追蹤功能前必套**

當前現況:系統照常運作,沒有破壞性。

---

## 部署紀錄

- **Commits**:
  - `98b48e5 feat(全站): NEXT_TASK_009 - 0 AI cost commercial-grade UX upgrade`
  - `9effecb fix(009): _status_all 路由順序 + deep_profile 用 hit_or_miss 欄位`
- **Push**:`8ceee6d..9effecb  main -> main` ✅
- **Zeabur build**:後端 + 前端 + 辦公室 all green(~2 min build,fix 後 ~4 min)
- **線上驗證**:三站 200,14 個新頁 200,5 個新 endpoint 全部 200 + JSON 結構正確

---

## 你必須知道的雷

### 紅線(碰了會死)— 跟前面一致

(略,跟 008d-2 handover 同 — 0 LLM 呼叫紅線在本任務嚴格守住)

### 009 新增的雷(務必讀!)

- **路由順序**:FastAPI 路徑參數會吞掉同層級的字面量路由。`/agents/_status_all` 必須放在 `/agents/{agent_id}` **之前**,否則會被當成 agent_id="_status_all" 處理。修法在 `backend/routes/agents.py` line 222。
- **quack_predictions 沒有 settled_result 欄位**:settled 結果存在 `hit_or_miss`(值:hit / miss / null)。任何 select 寫 settled_result 會被 PostgREST 拒絕。完整 schema:`id,date,prediction_type,subject,prediction,confidence,timeframe,evaluate_after,actual_result,hit_or_miss,reasoning_error,evidence,created_at,evaluated_at,agent_id,agent_name,target_symbol,target_name,direction,target_price,current_price_at_prediction,deadline,success_criteria,supporting_departments,status,actual_price_at_deadline,learning_note,meeting_id,reasoning`
- **status 引擎是 stateless**:`agent_status.py` 不寫 DB,純依時間 + agent_id 即時推算。每次請求都會重算。模板用 5 分鐘 hash bucket 穩定 — 同一 agent 在同 5 分鐘窗口顯示同一句。
- **office build 本機失敗**:next 15 預設找 tailwindcss(office 沒裝)。Zeabur 上 build 正常。本機若要 dev office 需 `cd office && pnpm add -D tailwindcss postcss autoprefixer` 或建一個 `postcss.config.js` 顯式關閉 tailwind plugin。**不阻塞 production**。
- **AnalystAvatar status type 已擴充為 7 個**:既有頁面用 4 個的部分都 backwards compat(沒有 exhaustive Record),但若你看到 office 任何地方寫死 4 個 status 的 switch,記得更新。
- **office /agents/[slug] 對部門 agent 走 fallback**:isAnalyst === false 時打 /api/agents/{id} 而不是 /analysts/{slug}/deep_profile(後者只支援 5 投資分析師)。

### 下棒必須注意

1. **Auth 啟用**:Vincent 必做 6 步(見 outbox「給 CTO」)。下棒裝 @supabase/supabase-js 後可把 stub 換成真表單。

2. **設計系統下手**:現有頁面(/、/analysts、/agents、/predictions、/watchdog 等)還沒套用 tokens。可一頁一頁慢慢替,風險低 — 既有 CSS variables 系統還是有效,新 tokens 只是 TS facade。

3. **/meetings 列表目前無資料**:meetings 表雖然存在但是空的。008e(戰情室)上線後會自動填充。當前頁顯示 EmptyState「尚無會議記錄」。

4. **/news 跟 /speeches 真實上線時要注意**:依賴 intel_articles 跟 people_statements 表。若爬蟲沒跑滿,會看到「目前無新聞」/「沒有達標的關鍵發言」 — 這是 EmptyState 期望行為。

---

## 待解的卡點

(沿用 008d-2 列表)

- **新增**:Migration 0015/0016/0017 待 Vincent 套上線(0015 可選,0016/0017 必套)
- **新增**:Supabase Auth dashboard 啟用 + frontend env(讓 stub 變真)
- **新增**:office 本機 build tailwindcss 缺(production 不影響,僅本機 dev)

---

## 下棒待辦清單(可選)

(010 預計 — 待 Vincent 指派)

**A. Auth 真正接通(視 Vincent 何時設好 dashboard)**:
- pnpm add @supabase/supabase-js
- /login /signup /profile 換成真實 supabase.auth API 表單
- 主導航加「登入 / 個人資料」按鈕
- 追蹤分析師按鈕串 user_followed_analysts

**B. 階段 1.4 套用 tokens 到既有頁面**(009 沒做):
- /(首頁,部分 inline style)
- /analysts(列表)
- /analysts/[slug](個人頁,大量 inline style)
- office /(首頁,大量 inline style)
- office /agents、/meetings、/predictions、/watchdog
- 替換寫死色為 token / 共用元件

**C. 階段 5.1 首頁區塊重排**(009 沒做):
- 依使用者視覺流動重新排序區塊
- 用 design tokens 美化每個 section title

**D. 階段 6 watchdog 視覺升級**(009 跳過):
- 套 design tokens
- 圖表配色用 tokens
- 加圖表動畫

**E. 008e 戰情室即時運作**(原本下一棒):
- 早 08:00 自動跑 simulate_holdings_meeting
- 寫進 meetings 表(填充 /meetings 列表頁)
- 14:30 settle + learning_note 寫入

---

## 假資料 / 占位符位置(更新版)

### 已清(009)
- ✅ /signup /login /profile /forgot-password stub 化等 Auth(原本不存在)
- ✅ /weekly_picks /news /speeches 完整頁(原本只首頁有區塊)
- ✅ /meetings 列表 + /meetings/[id] 詳情(原本不存在)
- ✅ /predictions/[id](原本不存在)
- ✅ office /agents/[slug] 12 位深度檔案頁(原本不存在)
- ✅ AnalystAvatar 4 status → 7 status

### 還在
- 🟡 office `/agents` 列表頁(深度頁已有,但列表本身未套 tokens)
- 🟡 前台 `market/page.tsx`「尚無資料」(009 未碰)
- 🟡 前台 `quack-journal/page.tsx`「尚無驗證結果」(009 未碰)
- 🟡 office /watchdog 視覺仍是 008b 工程師美感

---

## 你可用的工具(更新版)

(沿用 008d-2)

### 009 新增可用 endpoint

```bash
# 12 位 agent 即時 status(辦公室輪詢用)
curl https://vsis-api.zeabur.app/api/agents/_status_all

# 單一 agent status
curl https://vsis-api.zeabur.app/api/agents/analyst_a/status

# 預測詳情(replace 38 with valid id)
curl https://vsis-api.zeabur.app/api/predictions/38

# 學習筆記公開區(每筆 enriched with prediction)
curl "https://vsis-api.zeabur.app/api/analysts/chenxu/learning_notes?limit=10"

# 辦公室深度檔案(profile + 200 preds + 25 notes + meetings)
curl https://vsis-api.zeabur.app/api/analysts/chenxu/deep_profile
```

### 009 新增可用模組

```python
# 規則 status 引擎(可在 cron 跟其他 service 重用)
from backend.services.agent_status import (
    compute_status_by_time,
    render_status_detail,
    get_agent_status,
    VALID_STATUSES,
)
```

### 009 新增可用前台 component

```typescript
// 前台
import { Button, Card, Badge, Modal, Tooltip, LoadingSpinner, EmptyState, ErrorState } from "@/components/ui";
import { color, spacing, fontSize, radius, shadow, transition, font } from "@/styles/tokens";

// 辦公室
import { Button, Card, Badge, ... } from "@/components/ui"; // 同 API
import { color, spacing, ... } from "@/styles/tokens"; // 同 API
import { AgentBadge, ALL_AGENT_IDS, getAgentDisplayName } from "@/components/AgentBadge";
```

---

## 已 disabled 的自動化(不要重啟)

(沿用 008d-2)

---

## 關鍵檔案地圖(更新版)

(沿用 008d-2)

新增:
- **009 規則 status 引擎**:`backend/services/agent_status.py`
- **009 共用 UI 元件**:`frontend/src/components/ui/index.tsx` + `office/src/components/ui/index.tsx`
- **009 design tokens**:`frontend/src/styles/tokens.ts` + `office/src/styles/tokens.ts`
- **009 office AgentBadge**:`office/src/components/AgentBadge.tsx`
- **009 migrations**:`supabase/migrations/0015_agent_dynamic_status.sql`、`0016_user_profiles_l1_to_l5.sql`、`0017_user_followed_analysts.sql`

---

## 你的 SOP

(沿用 008d-2)

---

## 三方協作

(沿用 008d-2)

---

## 你絕對不能做的事

(沿用 008d-2)

15. **新:不要在 009 新建的元件裡 import LLM SDK**(0 LLM 呼叫紅線守住)
16. **新:不要破壞 AnalystAvatar 的 7 status type**(任何收窄都會破壞 office 首頁 12 位輪詢)
17. **新:不要把 quack_predictions 的 settled_result 當欄位用**(實際是 hit_or_miss)

---

招待所的接力棒已到你手上。把它交得比你接到時更好。
