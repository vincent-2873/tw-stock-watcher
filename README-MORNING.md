# 🌅 早安！上線前最後 3 件事（各 30 秒）

專案已 100% 寫完，pnpm install 完成。只差**您用 Google 登入拿到 3 個 token**，然後**我一鍵部署**。

---

## Step 1 — 拿 3 個 token

### A. Supabase（資料庫 + Auth）

1. 打開 https://supabase.com/dashboard
2. New Project：名稱 `tw-stock-watcher`，選擇最近的區域（Tokyo 或 Singapore）
3. 等 2 分鐘建好 → 左側 Settings → API
4. 複製這 3 個給我：
   - `Project URL`（像 `https://abcdefg.supabase.co`）
   - `anon / public key`
   - `service_role key`（機密，別貼到公開地方）
5. 順手執行 migration：左側 SQL Editor → New query → 貼上 `supabase/migrations/0001_init.sql` 全文 → Run
6. 再到 Authentication → Providers → Google → Enable

### B. GitHub

1. https://github.com/new
2. repo 名稱 `tw-stock-watcher`，可選 Private
3. **不要**勾 README / .gitignore（我已建好）
4. 建完後複製左上方 URL（`https://github.com/你的帳號/tw-stock-watcher.git`）貼給我

### C. Zeabur

1. https://dash.zeabur.com
2. New Project → Deploy from GitHub → 選 `tw-stock-watcher` repo
3. Zeabur 會問要部署哪個服務，選 `Next.js`
4. Settings → Environment Variables：貼上 Supabase 的 3 個 key
5. 給我您的 Zeabur **Project 網址**就好（不用 token）

---

## Step 2 — 傳 token 給我，格式：

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE=eyJ...
GITHUB_URL=https://github.com/yourname/tw-stock-watcher.git
ZEABUR_URL=https://xxx.zeabur.app
```

## Step 3 — 我一鍵部署

收到上面資訊我做：
1. `.env.local` 填好
2. Git remote 設好
3. `git push -u origin main`
4. Zeabur 自動偵測 push，2 分鐘部署完成
5. 回報您可用網址

---

## 💡 為什麼不能我昨晚就做好？

因為：
1. GitHub / Supabase / Zeabur 三個 OAuth token 只有您的 Google 帳號能拿到
2. 我嚴守「不代您註冊、不用您密碼」的安全規則
3. 這 3 個 token 拿完是「**3 分鐘一次性工作**」，之後就再也不用做了

收到 token 後 → **網站 5 分鐘內上線** → 我會自動每半小時升級一次功能。

---

## 📊 目前已完成的程式（您的資產）

| 模組 | 檔案 | 說明 |
|---|---|---|
| 首頁 | `app/page.tsx` | Landing + 登入按鈕 |
| Google 登入 | `app/login/page.tsx` | Supabase OAuth |
| 大盤儀表板 | `app/dashboard/page.tsx` | 強勢 / 弱勢股 Top 10 |
| 個股搜尋 | `app/stock/page.tsx` | 熱門股 + 搜尋框 |
| 個股詳情 | `app/stock/[code]/page.tsx` | K 線 + 健檢 + RSI / MA |
| 新聞情緒 | `app/news/page.tsx` | AI 判讀利多/利空 |
| 籌碼分析 | `app/chips/page.tsx` | 外資買賣超 Top 15 |
| 個股健檢 | `app/health/page.tsx` | 技術 / 籌碼 / 情緒 打分 |
| TWSE API | `lib/data-sources/twse.ts` | 官方免費 OpenAPI |
| FinMind | `lib/data-sources/finmind.ts` | 三大法人、分點、借券 |
| Fugle | `lib/data-sources/fugle.ts` | 即時報價 |
| 技術指標 | `lib/analysis/indicators.ts` | MA/EMA/RSI/MACD/KD/BB |
| 健檢演算 | `lib/analysis/health-check.ts` | 綜合打分 |
| 情緒 AI | `lib/analysis/sentiment.ts` | Claude / OpenAI |
| DB Schema | `supabase/migrations/0001_init.sql` | 自選、警示、快取、偏好 |
| PWA | `public/manifest.json` | 手機裝桌面 |
| CI | `.github/workflows/ci.yml` | type-check + lint + build |
| 部署 | `zbpack.json` | Zeabur 自動辨識 |

早安，愉快一天！
