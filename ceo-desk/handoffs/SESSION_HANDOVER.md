# Session 接棒文件

> 給下一個 Claude Code session 看的。預計閱讀時間:5 分鐘。
> 上次更新:NEXT_TASK_009-finish 完成(2026-04-26 ~13:15 TPE)
> 舊版:`ceo-desk/logs/2026-04-26/SESSION_HANDOVER_post_009.md`

---

## 你現在的位置

- **最後完成的任務**:NEXT_TASK_009-finish — Auth 真正啟用
- **完成時間**:2026-04-26T13:15+08:00
- **上一個 session 跑了多久**:約 60 分鐘(Chrome MCP 操作 dashboard +
  寫前端 code + commit + 等 Zeabur build)
- **下一個任務**:Vincent 親自註冊 + 設 L1(見下方階段 5),然後 Vincent
  決定 010 方向

### 009-finish 重點摘要

- **Supabase migration 0015/0016/0017 已套線上**:agent_stats 加 status 三欄、
  user_profiles 表 + L1-L5 + auto trigger + RLS、user_followed_analysts + RLS。
  3 個表都 SELECT 確認存在。
- **Auth dashboard 已就緒**:Email provider Enabled、Allow signups On、
  Confirm email Off(方便註冊測試)、Site URL = `https://tw-stock-watcher.zeabur.app`、
  Redirect URLs = `/**`。
- **Zeabur frontend env vars 早就設好**:NEXT_PUBLIC_SUPABASE_URL +
  NEXT_PUBLIC_SUPABASE_ANON_KEY 都已存在,值與 Supabase dashboard 一致。
- **前端套件早就裝好**:@supabase/supabase-js v2.47 + @supabase/ssr v0.5.2。
- **lib/supabase.ts 重寫**:singleton browser client + getCurrentUser +
  getMyProfile + UserProfile type。
- **4 個 auth 頁全部串通**:/signup signUp、/login signInWithPassword、
  /forgot-password resetPasswordForEmail、/profile getUser + signOut。
- **NavAuthButton**(client component):reactive 監聽 onAuthStateChange,
  未登入「登入/註冊」按鈕,已登入頭像下拉選單。已加入主導航 + /analysts/[slug]。
- **FollowAnalystButton**:取代「訂閱(即將開放)」disabled 按鈕,真實
  INSERT/DELETE user_followed_analysts。
- **0 LLM 呼叫**全程嚴守。

---

## 過去 60 分鐘做完的事

**NEXT_TASK_009-finish**(2026-04-26 13:15):Auth 真正啟用
- Commit `d2f2833 feat(auth): NEXT_TASK_009-finish - Supabase Auth fully integrated`

---

## 改動的檔案(NEXT_TASK_009-finish)

新增 2 檔:
- `frontend/src/components/NavAuthButton.tsx`(reactive 登入狀態)
- `frontend/src/components/FollowAnalystButton.tsx`(追蹤分析師按鈕)

修改 7 檔:
- `frontend/src/lib/supabase.ts`(+77 — singleton + helpers)
- `frontend/src/app/signup/page.tsx`(+157 — 真表單 + signUp)
- `frontend/src/app/login/page.tsx`(+139 — signInWithPassword)
- `frontend/src/app/forgot-password/page.tsx`(+99 — resetPasswordForEmail)
- `frontend/src/app/profile/page.tsx`(+201 — getUser + tier + 追蹤的分析師)
- `frontend/src/app/page.tsx`(+4 — NavAuthButton 加進主導航)
- `frontend/src/app/analysts/[slug]/page.tsx`(+27 — TopNav 加 NavAuthButton +
  訂閱按鈕替換 FollowAnalystButton)

**總計:9 檔 / +958 行**

---

## 改動的 DB(NEXT_TASK_009-finish)

✅ **0015 + 0016 + 0017 全部套上線了**(透過 Supabase Studio SQL Editor):

- `agent_stats`:加 current_status / status_detail / status_updated_at(可選欄位,系統不依賴)
- `user_profiles`:新表,id (UUID PK FK auth.users) + display_name + tier (L1-L5) +
  avatar_url + created_at + last_seen_at + metadata (JSONB)
- `handle_new_user()` PL/pgSQL function + `on_auth_user_created` trigger 已建
- `user_followed_analysts`:新表,user_id + agent_id + followed_at(複合 PK)
- 兩表的 RLS policies 已建(read/update/insert/delete own)

驗證 SQL:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN
  ('user_profiles','user_followed_analysts','agent_stats')
ORDER BY table_name;
-- 3 rows ✅
```

---

## 部署紀錄

- **Commit**:`d2f2833 feat(auth): NEXT_TASK_009-finish - Supabase Auth fully integrated`
- **Push**:`e676590..d2f2833 main -> main` ✅
- **Zeabur frontend service**:Vincent 手動點「重新部署」trigger build
  (push 後 webhook 沒自動觸發,需手動)
- **Zeabur backend / office**:不受此 commit 影響(都只改 frontend)

⚠️ **注意**:截至 outbox 寫完時,frontend 部署仍在進行中。線上 /login 仍顯示
009 stub「登入功能即將開放」— 等部署完成後會自動切到新版表單。

---

## 你必須知道的雷

### 紅線(碰了會死)— 跟前面一致

- 不可呼叫任何 LLM API(NEXT_TASK_009-finish 嚴格守住,本任務 0 LLM 呼叫)
- 不可印 SUPABASE_SERVICE_ROLE_KEY 等 secret(只放 backend env)
- 不可改憲法 SYSTEM_CONSTITUTION.md
- 不可破壞 v1/v2 architecture markings

### 009-finish 新增的雷(務必讀!)

- **Zeabur webhook 不一定自動觸發**:push 後沒 build,要手動點「重新部署」。
  下棒可考慮在 Zeabur 設定確認 GitHub webhook 是否正確,或加 GitHub Action
  自動 trigger Zeabur build(用 Zeabur API)。
- **本機 next build 會 ETIMEDOUT(Google Fonts)**:不影響 Zeabur build。
  下棒若要本機 dev,需考慮 next/font/local 替代或 mock font loader。
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY` 是公開金鑰**:設計上會暴露在 frontend
  bundle,RLS 保護資料安全。**SERVICE_ROLE_KEY** 才是 secret。
- **handle_new_user trigger 用 SECURITY DEFINER**:可以繞過 RLS 寫入
  user_profiles。如果 Vincent 要客製 — 改 function body。
- **Confirm email 已關閉**:註冊後 session 立刻有,不需收信驗證。**正式
  上線前** 應該重新打開,避免假 email 註冊。
- **NavAuthButton 用 dynamic import getSupabase()**:避免 SSR 階段 throw。
  若需 SSR 顯示登入狀態,改用 @supabase/ssr 的 createServerClient。
- **FollowAnalystButton 也用 dynamic import**:同樣理由。
- **/profile 未登入會 router.replace('/login')**:這在 Next 15 App Router
  對 client component 是 OK 的,不會引發 SSR redirect 錯誤。

### 下棒必須注意

1. **驗證 Vincent 註冊 + 設 L1** 真的成功(階段 5 待辦)。沒驗證就不能說
   完工。

2. **Auth 在其他頁面要不要也顯示登入狀態?** 目前只主導航 + /analysts/[slug]
   有 NavAuthButton。/analysts 列表頁、/predictions/[id]、/meetings 等沒加。
   下棒可考慮把 NavAuthButton 抽到一個共用 SiteHeader 元件,所有頁面 import。

3. **追蹤分析師頁面不顯示「追蹤狀態」徽章**:/analysts 列表頁卡片上沒顯示
   「已追蹤」徽章。下棒可加。

4. **正式上線前要做的事**:
   - Confirm email 重新開啟(防假 email)
   - Captcha / Rate limiting(防註冊機器人)
   - 訂閱付費機制(L4 → L3 升級流程)
   - L2 邀請碼機制(Vincent 邀家人 / 合夥人)

---

## 待解的卡點

(沿用 009)+

- **新增**:Zeabur webhook 自動觸發確認(下棒可去 Zeabur 設定 → GitHub
  integration 看)
- **新增**:本機 next build 中文網路 Google Fonts 超時(以 next/font/local
  或 fontsource 取代)

---

## 下棒待辦清單(可選)

(010 預計 — 待 Vincent 指派)

**A. 驗證 Vincent L1 設定 + UI 收尾**:
- 確認 /profile 顯示 「L1 · CEO」
- 確認 NavAuthButton 顯示 V 頭像 + L1
- 確認 /analysts/chenxu 「追蹤」按鈕能 INSERT/DELETE

**B. 階段 1.4 套用 tokens 到既有 14 頁**(009 沒做):
- /、/analysts、/analysts/[slug]、office /、office /agents 等
- 替換寫死色為 token / 共用元件

**C. 階段 5.1 首頁區塊重排**(009 沒做)

**D. 階段 6 watchdog 視覺升級**(009 跳過)

**E. 008e 戰情室即時運作**(原本下一棒):
- 早 08:00 自動跑 simulate_holdings_meeting
- 寫進 meetings 表(填充 /meetings 列表頁)

**F. Auth 收尾**(009-finish 後續):
- SiteHeader 共用元件,套到所有頁面
- /analysts 列表卡片加「已追蹤」徽章
- L2 邀請碼系統
- 正式上線前 Confirm email 重啟
- captcha / rate limiting

---

## 假資料 / 占位符位置(更新版)

### 已清(009-finish)
- ✅ /signup /login /profile /forgot-password 從 stub 換成真實 Auth 表單
- ✅ /analysts/[slug] 「訂閱(即將開放)」按鈕 → 真實追蹤功能
- ✅ 主導航 + /analysts/[slug] 加 reactive 登入狀態

### 還在
- 🟡 /analysts 列表卡片沒「已追蹤」徽章
- 🟡 office /、/agents、/predictions、/watchdog 視覺仍是工程師美感
- 🟡 office /agents 列表頁(深度頁有,但列表本身未套 tokens)
- 🟡 前台 market/page.tsx「尚無資料」(009 未碰)
- 🟡 前台 quack-journal/page.tsx「尚無驗證結果」(009 未碰)

---

## 你可用的工具(更新版)

(沿用 009)

### 009-finish 新增可用 component / lib

```typescript
// frontend
import { getSupabase, getCurrentUser, getMyProfile, type UserProfile } from "@/lib/supabase";
import { NavAuthButton } from "@/components/NavAuthButton";
import { FollowAnalystButton } from "@/components/FollowAnalystButton";

// 用法
const sb = getSupabase();
const { data: { user } } = await sb.auth.getUser();
sb.auth.onAuthStateChange((event, session) => { /* ... */ });
sb.from("user_profiles").select("*").eq("id", user.id).maybeSingle();
sb.from("user_followed_analysts").insert({ user_id, agent_id });
```

### 009-finish 新增可用 DB 表

```sql
-- 使用者設定檔(每註冊一個 auth.users 自動建一筆 L5)
SELECT * FROM user_profiles WHERE id = auth.uid();

-- 追蹤的分析師
SELECT agent_id FROM user_followed_analysts WHERE user_id = auth.uid();

-- 動態 status(可選用)
UPDATE agent_stats SET current_status='thinking', status_detail='analyzing 2330'
WHERE agent_id='analyst_a';
```

---

## 已 disabled 的自動化(不要重啟)

(沿用 008d-2)

---

## 關鍵檔案地圖(更新版)

(沿用 009)

新增:
- **009-finish 共用元件**:`frontend/src/components/NavAuthButton.tsx` /
  `FollowAnalystButton.tsx`
- **009-finish supabase client**:`frontend/src/lib/supabase.ts`
- **009-finish auth 頁**:`frontend/src/app/{login,signup,forgot-password,profile}/page.tsx`

---

## 你的 SOP

(沿用 008d-2)

新增:**Chrome MCP 操作 dashboard 的 SOP**
1. `mcp__Claude_in_Chrome__list_connected_browsers` 確認 Vincent Chrome 連著
2. `select_browser` 選定 deviceId
3. `tabs_context_mcp { createIfEmpty: true }` 拿 tabId
4. `navigate` + 等 `wait`
5. 用 `find` 找 element ref(避免猜座標)
6. 用 `browser_batch` 串多步驟操作(避免來回 round-trip)
7. **Monaco editor 設值**:用 `javascript_tool` 直接 setValue,避開 type 過程
   被 IME / autocomplete 干擾(009-finish 學到的教訓)

---

## 三方協作

(沿用 009)

---

## 你絕對不能做的事

(沿用 009)+

18. **新:不可印或寫進 commit message 的 SUPABASE_SERVICE_ROLE_KEY**(那是 secret)
19. **新:不可代替 Vincent 註冊個人帳號**(沒密碼也做不到,但要明確標記為 Vincent 待辦)
20. **新:不可改 handle_new_user trigger 的 SECURITY DEFINER**(沒它 trigger 寫不進 user_profiles)

---

招待所的接力棒已到你手上。把它交得比你接到時更好。
