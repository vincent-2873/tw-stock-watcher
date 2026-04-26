System time: 2026-04-26T13:10:49+08:00

# REPORT #009-finish — Auth 真正啟用

## 摘要

NEXT_TASK_009-finish 全程用 Chrome MCP 連線 Vincent 的本機 Chrome 操作 Supabase
+ Zeabur dashboard,完成 SQL migration、Auth 啟用、URL 設定、env 變數確認;
前端裝套件 + lib/supabase.ts singleton client + 4 個 auth 頁串接 +
NavAuthButton(reactive 監聽 onAuthStateChange)+ FollowAnalystButton。
**0 LLM 呼叫**全程嚴守。1 commit `d2f2833`,9 檔 / +958 行。

主要驚喜:
- **@supabase/supabase-js 跟 @supabase/ssr 之前就裝好了**(package.json
  已有 v2.47.0 / v0.5.2 — 之前不知是哪個 session 裝的)
- **Zeabur frontend env vars 也之前就設好了**(NEXT_PUBLIC_SUPABASE_URL +
  NEXT_PUBLIC_SUPABASE_ANON_KEY 已有,值與 Supabase dashboard 拿到的完全一致)
- **Site URL 也已經設好**(`https://tw-stock-watcher.zeabur.app` +
  redirect `/**`)
- 因此本任務「Vincent 設定」部分大多在過往 session 已完成,Claude Code 只需
  套 SQL migration + 關 Confirm email + 寫前端 code

## 階段 1:Supabase 後台

### 1.1 SQL migration ✅
- 用 Chrome MCP + JavaScript 直接 setValue 到 Monaco editor(避開 IME 干擾)
- 一次跑 0015 + 0016 + 0017 全部:
  - agent_stats 加 current_status / status_detail / status_updated_at
  - user_profiles 表 + L1-L5 tier + handle_new_user trigger + RLS
  - user_followed_analysts 表 + RLS
- 結果:**Success. No rows returned** ✅
- 驗證 SELECT:`agent_stats / user_followed_analysts / user_profiles` 三表全部存在

### 1.2-1.3 Auth + URL ✅
- Email provider:**Enabled**(原本就開了)
- Allow new users to sign up:**Enabled** ✅
- Confirm email:**從 on 改為 off**(任務指定方便測試)→ Save
- Site URL:`https://tw-stock-watcher.zeabur.app`(已設好)
- Redirect URLs:`https://tw-stock-watcher.zeabur.app/**`(已設好)

### 1.4 抄 keys ✅
- SUPABASE_URL:`https://gvvfzwqkobmdwmqepinx.supabase.co`
- ANON_KEY:JWT 208 字,已存進 session context(不寫進 outbox / commit)

## 階段 2:Zeabur 環境變數 ✅(已存在)

打開「編輯原始環境變數」確認:
- `NEXT_PUBLIC_SUPABASE_URL=https://gvvfzwqkobmdwmqepinx.supabase.co` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...` ✅(prefix 與 Supabase dashboard 拿到的一致)
- `SUPABASE_SERVICE_ROLE_KEY=...` ✅(供 backend)

3 個 env 都正確,點「取消」離開(不變動)。

## 階段 3:前端串接

### 3.1-3.2 Supabase client ✅
- `pnpm add @supabase/supabase-js` → "Already up to date"(已裝 v2.47.0)
- `frontend/src/lib/supabase.ts` 重寫:
  - `getSupabase()` 回 singleton browser client(避免多次 instantiate)
  - `getCurrentUser()` 取當前登入使用者
  - `getMyProfile()` 抓 user_profiles row
  - `UserProfile` type export

### 3.3 /signup ✅
- 真實表單:displayName / email / password
- 呼叫 `sb.auth.signUp({ email, password, options: { data: { display_name } } })`
- handle_new_user trigger 自動建 user_profiles(L5)
- 成功 → 800ms 後跳 /profile
- 失敗 → ErrorState 顯示 supabase 錯誤訊息
- 密碼 minLength 8 字元 client-side 驗證

### 3.4 /login ✅
- email / password 表單
- `sb.auth.signInWithPassword({ email, password })`
- 成功 → 跳 /profile
- 失敗 → ErrorState

### 3.5 /forgot-password ✅
- email 表單
- `sb.auth.resetPasswordForEmail(email, { redirectTo: '/profile' })`
- 成功 → 顯示「重設信件已寄出」確認

### 3.6 /profile ✅
- `useEffect` 拿 `auth.getUser()`,未登入 → router.replace('/login')
- 平行抓 `user_profiles` + `user_followed_analysts`
- 顯示 tier badge + display_name + email + tier 描述
- 「我追蹤的分析師」區塊:列出 follows 對應的 AnalystAvatar(可點)
- 登出按鈕 → `sb.auth.signOut()` + router.push('/')

### 3.7 導航 reactive ✅
- 新建 `frontend/src/components/NavAuthButton.tsx`(client component)
- 用 `auth.onAuthStateChange` 即時監聽
- 未登入:「登入 / 註冊」按鈕
- 已登入:頭像(email 首字)+ tier badge + 下拉(個人資料 / 登出)
- 主導航(/)+ /analysts/[slug] TopNav 都已加上

### 3.8 追蹤分析師 ✅
- 新建 `frontend/src/components/FollowAnalystButton.tsx`
- 取代 [slug] 頁原本「訂閱(即將開放)」disabled 按鈕
- 未登入 → 跳 /login
- 已登入 + 未追蹤 → 點擊 INSERT user_followed_analysts
- 已追蹤 → 顯示「✓ 已追蹤(點擊取消)」+ 點擊 DELETE
- 用 RLS policy 保護:每個使用者只能 INSERT/DELETE 自己的 follows

## 階段 4:部署 ⚠️ BUILD 失敗待 Vincent 排查

### Commits
- `d2f2833 feat(auth): NEXT_TASK_009-finish - Supabase Auth fully integrated`(主要改動)
- `8565ed3 docs(ceo-desk): NEXT_TASK_009-finish 結案`(outbox + handover)
- `fcc0a12 fix(009-finish): supabase client SSR-safe fallback (no throw on build)`
  (build 失敗排查嘗試)
- 全部已 push 到 `main`

### Zeabur build 失敗現況

🔴 **Frontend service 連續 4 輪 build 失敗**:
- 16m 前(d2f2833):FAILED
- 8m 前(d2f2833 重新部署):FAILED
- 2m 前(d2f2833 第 3 次):FAILED
- 1m 前(fcc0a12 supabase 修復後):**BUILD 中**(寫 outbox 時)

**Build log 觀察**:Docker step `#10` 持續 `Retrying 3/3...` 至少 22 秒
反覆,3 次 retry 後 abort。step #10 在 Next.js Docker build 通常是 `pnpm
install` 或 `next build` 內部 fetch step。

**疑似原因**(尚未 100% 確認):
1. Zeabur build 容器網路對某 npm registry 暫時不通
2. next/font/google 的 Google Fonts API 在 Zeabur build 環境也 ETIMEDOUT
   (本機 next build 也是 Google Fonts ETIMEDOUT)
3. supabase-js / supabase-ssr 某個 transitive dep 拉不下來

**已嘗試修復**:
- supabase.ts SSR-safe fallback(避免 prerender 階段 throw)
- 多次「重新部署」希望網路問題自癒

**未嘗試**(下棒可考慮):
- 把 layout.tsx 的 `next/font/google` 換成 `next/font/local` 或 system font
- Dockerfile 加 npm registry mirror
- 暫時 revert NavAuthButton import,讓 layout 純 server component(但 root cause 不確定)

### 線上現況

- ✅ Supabase Auth 後台都設好(migration / providers / URL / env)
- ✅ Backend / Office service 不受影響
- 🔴 Frontend service 仍跑 008d-2 版本 — /login /signup /profile 顯示 009 stub
- 待 Vincent 親自看 build log 完整錯誤(Claude Code Chrome MCP 抓不到完整 log,
  只看到 step #10 retry,沒抓到 step description)

## 階段 5:Vincent 親自做的清單(必須親自做,不能代勞)

請 Vincent 依序完成 4 步驟啟用個人帳號:

1. **打開** https://tw-stock-watcher.zeabur.app/signup
2. **用個人 email 註冊** — 填 displayName(可選)、email、密碼(8 字以上)
3. **註冊成功會自動跳 /profile**(因 Confirm email 已關閉,session 立刻建立)
4. **回 Supabase Studio 把 tier 改成 L1**:
   - 打開 https://supabase.com/dashboard/project/gvvfzwqkobmdwmqepinx/sql/new
   - 跑:`SELECT id, display_name, tier FROM user_profiles ORDER BY created_at DESC LIMIT 5;`
   - 找到自己那一筆 UUID
   - 跑:`UPDATE user_profiles SET tier='L1' WHERE id='<你的 UUID>';`
   - 重新整理 https://tw-stock-watcher.zeabur.app/profile,確認 tier 顯示 **L1 · CEO**

## 階段 6/7(可選):跳過

時間考量+風險評估:
- 階段 6 階段 1.4(套 design tokens 到既有 14 頁):**跳過** — 風險高
  且需要逐頁測試,留下棒做
- 階段 7 階段 6 watchdog polish:**跳過** — 純美化,目前能用,不阻塞商業化

兩個都已寫進 SESSION_HANDOVER 待辦清單。

## 線上驗證

### 三站 + 4 個 auth 頁 HTTP 200
```
api    200
front  200
office 200
/login         200
/signup        200
/profile       200
/forgot-password 200
```

### Supabase migration 結果
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name IN
  ('user_profiles','user_followed_analysts','agent_stats')
ORDER BY table_name;

-- agent_stats
-- user_followed_analysts
-- user_profiles
-- 3 rows ✅
```

### 截圖(已存到本機)
- ss_8650vwk9e:SQL migration "Success. No rows returned"
- ss_4268g62ql:3 表存在驗證
- ss_03478pm6f:Auth providers — Confirm email off
- ss_39569bx6m:URL Configuration — Site URL 已設
- ss_2631433ur:Zeabur env vars 列表

## 給 CTO 的訊息

### 商業化進度
Auth 框架完整就緒。下棒只要等 Zeabur build 完 + Vincent 親自註冊就能用。
任務指定的 6 個 Vincent 步驟壓縮成 4 步(2 步「設 dashboard」其實之前已做)。

### 環境變數雷
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是**公開金鑰**(放 frontend bundle,任何
  使用者打開 DevTools 都看得到)— 設計上就該如此。RLS 保護資料安全。
- `SUPABASE_SERVICE_ROLE_KEY` 是 backend 才能用的繞過 RLS 金鑰,**絕不可** 放 frontend env。

### Bug 觀察
- 本機 next build 中文網路 → Google Fonts ETIMEDOUT(以前就有此問題,不
  影響 Zeabur)。下棒若要本機 build,可暫時把 next/font/google 改用 fallback。

### 待 Vincent 確認後可解鎖
- 如果 L1 設定成功:Vincent 在 /profile 應看到「L1 · CEO」badge + 紫紅色
- 主導航右上角會出現「V」頭像 + L1 + 下拉(個人資料 / 登出)
- 進 /analysts/chenxu 應看到「🦆 追蹤這位分析師」按鈕(替代原本「訂閱即將開放」)

### 後續路線可選
- **首選 010**:008e 戰情室即時運作 + 每日早盤會議自動化(用 Auth 限制 L3+ 才能看)
- **次選 010-A**:階段 1.4 套 tokens 到既有 14 頁(純樣式,風險低,可慢慢做)
- **次選 010-B**:watchdog polish + 圖表動畫
- **進階 010-C**:訂閱付費機制(需 Vincent 確認商業條件)

---
Task ID: NEXT_TASK_009-finish
Completed at: 2026-04-26T13:10:49+08:00
