# 🦆 接棒指令(2026-04-23 傍晚)

**專案**:呱呱投資招待所 / VSIS
**工作目錄**:`C:\Users\USER\OneDrive\桌面\Claude code\projects\tw-stock-watcher`
**上一輪 handoff**:`HANDOFF_2026-04-23_afternoon.md`(commit `c009abe`)
**本輪結束 commit**:`c1a8e87`(2026-04-23 晚,Zeabur 已全部上線)

---

## 🎯 直接貼給新 Claude

> 我是 Vincent。接手「呱呱投資招待所 / VSIS」專案,我已授權 Chrome MCP / Bash / 寫檔。先讀 `HANDOFF_2026-04-23_evening.md` 再讀:
>
> - `inbox/zen_v3/18_ZEN_HOMEPAGE_v3.html`(視覺範本)
> - `inbox/zen_v3/19_V2_UPGRADE_BRIEF.md`(升級指令書)
> - `inbox/zen_v3/20_INTEL_HUB_UPGRADE.md`(情報中樞)
>
> **現在立刻做**:
> 1. 跑 Supabase migration `supabase/migrations/0003_quack_phase2.sql`(新增 4 表)
> 2. 觸發 `/api/quack/reasoning` 讓 quack_reasoning 寫入當日快取
> 3. 觸發 `/api/intel/cron` 讓剩下 ~340 篇 RSS 繼續 AI 分析
> 4. 設 GitHub Action 每 15 分自動跑 cron + quack reasoning 每日 1 次
> 5. Phase 2 UI:把呱呱今日功課改成三層摺疊(fact / causal / meaning + counter view)
>
> 別問 UAC、別叫我點 Supabase,都自己做。

---

## 📍 這一輪做了什麼(2026-04-23 下午 → 傍晚)

### ✅ Phase 1 UI 完整到位(照 18_ZEN_HOMEPAGE_v3.html)

**已 live 在 `https://tw-stock-watcher.zeabur.app/`:**
- Topnav 左側:🦆 + 日文副標「クワック・ハウス」+ 呱呱投資招待所 + hover 金茶底線
- Topnav 右側 nav 去 emoji 純文字:**今日重點 / 題材熱度 / 自選股 / 產業地圖 / AI 對話 / 更多 ⋯**(Shippori Mincho 明朝體,active 朱紅 + 紅底線)
- Hero 左:Cormorant Garamond 斜體日期 + 52px 大標「今天池塘的水 / 有點**混**。」(朱紅「混」+ 底下 8px 金茶 highlight)
- Hero 左:Mincho 22px 引言 + 3px 金茶左邊框 + 「引號裝飾
- Hero 左:3 個 action button(📄 看完整晨報 primary / 💬 問呱呱 / 🔗 相關情報)
- Hero 右:320px `.quackCircle`(radial gradient + breathe 6s + 雙層 ripple 4s)+ 160px 🦆 wobble
- Hero 右:4 個浮動市場數字裝飾(TAIEX / VIX / 台指期 / 費半)drift 8s
- 整站 4 片朱光花瓣 `ZenPetals` fixed z-index 0

### ✅ Phase 2 backend 全打通(graceful degrade)

新 `backend/routes/quack.py`,4 個端點(全 live):
- `GET /api/quack/reasoning` — 三層推論(Claude Sonnet 4.5)+ 反方觀點,寫快取到 `quack_reasoning`
- `GET/POST /api/quack/predictions` — 命中率 + 建立預測(需 admin token)
- `POST /api/quack/social/refresh` — 觸發 PTT 爬蟲 (需 admin)
- `GET /api/quack/social/hot` — 社群熱度排行(mentions * 1 + push * 2 - boo * 1.5)
- `POST /api/quack/auto_search/run` — 從 intel_articles ai_importance ≥ 8 自動生成 auto_alerts
- `GET /api/quack/alerts` — 自動警示列表

PostgREST `Could not find the table` + psycopg2 `does not exist` 都在 `_is_missing_table()` 偵測,表沒建時 API 不 500 改回傳 `note: 'migration 0003 未執行'`。

### ✅ Phase 3 股價亮燈 scaffold

- `frontend/src/hooks/useStockPriceFlash.ts` — 股價變動 0.8s flash-up/down
- `getLimitClass()` / `getVolumeBurstClass()` helper
- `globals.css` 加 `.stock-flash-up/down`、`.stock-limit-up/down` 邊框脈動、`.stock-volume-burst` 金光 + 💰 bounce

### ✅ 資料修補

- 透過 Supabase REST 修 4 個壞掉 RSS URL(id=2/7/10/12):
  - Reuters → Google News `q=reuters+finance`
  - Yahoo Finance → `/news/rssindex`
  - 鉅亨網 → Google News `site:cnyes.com`
  - DIGITIMES → Google News `site:digitimes.com.tw`
- 觸發 `/api/intel/refresh/{id}` 4 次 → **+120 篇新文章** 入庫
- 背景 analyze 跑到 **26 / 370** 篇(每 90s Zeabur edge timeout 但 backend 持續跑)

### ✅ Migration schema 已寫(但未執行)

`supabase/migrations/0003_quack_phase2.sql`(4 表):
- `quack_predictions` — 呱呱預測與事後驗證(命中率追蹤)
- `quack_reasoning` — 三層推論當日快取
- `social_mentions` — PTT/Dcard/CMoney/X 社群提及
- `auto_alerts` — 自動警示

全 ENABLE RLS + anon read policy + 索引。

### ✅ Zeabur Backend admin pooler 補強

`backend/routes/admin.py` 的 `_dsn_candidates()` 改輪詢 11 個 AWS region pooler(ap-southeast-1 / ap-northeast-1/2 / us-east-1/2 / us-west-1/2 / eu-west-1/2 / eu-central-1 / sa-east-1),connect_timeout=4s。

---

## 🔴 下一輪 Claude 必做(用戶已關機,本輪沒跑完的事)

### 1. 跑 migration 0003(最急)

**現狀**:
- Zeabur backend `/api/admin/exec_sql` 走 Supabase pooler 全 11 region 都回 **"Tenant or user not found"**
- 本機 Python(Git Bash + PowerShell)也 DNS 解析 `db.{ref}.supabase.co` 只有 IPv6,連不到
- Chrome MCP 開 Supabase SQL editor 頁面凍結(CDP timeout)

**三條路,照順序試**:
1. **(最快)** 新對話開始,先 Chrome MCP `tabs_create_mcp` 開 `https://supabase.com/dashboard/project/gvvfzwqkobmdwmqepinx/sql/new`,等 Monaco 載完,用 `javascript_exec` 塞 SQL:
   ```js
   monaco.editor.getModels()[0].setValue(SQL_CONTENT);
   // 然後 find "Run" button 點一下,或按 Ctrl+Enter
   ```
2. **(偷渡)** 在 Zeabur backend env 加 `SUPABASE_POOLER_HOST=aws-0-<正確region>.pooler.supabase.com`(但真正哪個 region 還是未知 — 可能要去 Supabase dashboard settings → database 看 connection string)
3. **(最骯髒)** 寫個 script 在 Zeabur backend 起動時檢查表存在否,不存在就用 supabase-py 透過 PostgREST 做 table existence probe + 等用戶手動跑 migration(因為 PostgREST 不能做 DDL)

**驗收**:4 表 COUNT 都回 0
```bash
SK="eyJ...service_role..."  # .env 裡
curl -sI "https://gvvfzwqkobmdwmqepinx.supabase.co/rest/v1/quack_reasoning?select=id" \
  -H "apikey: $SK" -H "Authorization: Bearer $SK" -H "Prefer: count=exact" -H "Range: 0-0"
# 應該回 Content-Range: */0(不是 404)
```

### 2. 觸發 reasoning 第一次

```bash
curl -s "https://vsis-api.zeabur.app/api/quack/reasoning" --max-time 60
```
會跑 Claude Sonnet 4.5 做三層推論 + 反方觀點,自動 upsert 到 `quack_reasoning` 表。成功後再打一次應回 `cached: true`。

### 3. 把 340 篇 intel article 跑完 analyze

**現狀**:26/370 analyzed。每次 `/api/intel/analyze?limit=5` Zeabur edge 90s timeout 但 backend 會持續跑。可以背景呼叫多次:
```bash
for i in $(seq 1 20); do
  curl -sX POST "https://vsis-api.zeabur.app/api/intel/analyze?limit=5" \
    -H "X-Admin-Token: A-JVY4m_0lr2SUvmkBicOvXr6dltRX37vc9-sElVB_Y" \
    --max-time 90 > /dev/null &
done
wait
```

或直接設 GitHub Actions 排 `/api/intel/cron` 每 15 分。

### 4. Phase 2 UI:呱呱今日功課改三層摺疊卡

`frontend/src/app/home-data.tsx` 的 `QuackMorningLive` 現在是單層「今天最升溫題材 X,資金可能從 Y 輪過來」。
**要改成**(照 19_V2_UPGRADE_BRIEF.md B1):
```
🦆 呱呱今日功課
─────────────────
[▼ 今天發生了什麼]     ← /api/quack/reasoning 的 fact_layer
[▼ 為什麼會這樣]       ← causal_layer
[▼ 對你的操作意味什麼] ← meaning_layer
[▼ 反方觀點]           ← counter_view
```

### 5. GitHub Action 排程

寫 `.github/workflows/intel-cron.yml`:
```yaml
on:
  schedule:
    - cron: '*/15 * * * *'  # 每 15 分鐘
  workflow_dispatch:
jobs:
  cron:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -sX POST "https://vsis-api.zeabur.app/api/intel/cron?analyze_limit=8" \
            -H "X-Admin-Token: ${{ secrets.ADMIN_TOKEN }}" \
            --max-time 180
```
用戶需去 GitHub repo Settings → Secrets 加 `ADMIN_TOKEN = A-JVY4m_0lr2SUvmkBicOvXr6dltRX37vc9-sElVB_Y`。或之前的做法直接寫進 env。

### 6. Phase 3 UI — 浮動鈴鐺 + 亮燈接線

- Floating duck 旁加鈴鐺(讀 `/api/quack/alerts`)
- 個股頁接 `useStockPriceFlash`
- 題材卡熱度 + 5° 閃紅光(現在 heatBar 已經靜態)

### 7. Phase 2 社群(PTT / Dcard)

- 已寫 `backend/services/ptt_scraper.py` + `POST /api/quack/social/refresh`
- 需設另一個 GitHub Actions 每 15 分 curl `/api/quack/social/refresh?pages=3`
- 呱呱晨報卡新增「🔥 社群熱度雷達」區塊(讀 `/api/quack/social/hot?hours=6`)

---

## 📂 本輪的檔案變更(新對話不用自己找)

```
frontend/
  src/app/layout.tsx                # 加 Shippori Mincho / Zen Maru Gothic / Cormorant Garamond + ZenPetals
  src/app/globals.css               # zen palette + 花瓣動畫 + 股價亮燈 CSS
  src/app/page.tsx                  # topnav 日文 logo + hero 52px + 3 btn + 大呱呱 + 4 浮動數字
  src/app/page.module.css           # 所有 var(--washi/sumi/kin) + hero 樣式
  src/app/quack-journal/page.tsx    # 新 頁:30 日命中率 + 預測表
  src/components/quack/ZenPetals.tsx # 4 片朱光花瓣
  src/hooks/useStockPriceFlash.ts   # 股價亮燈 hook

backend/
  main.py                           # mount quack router
  routes/quack.py                   # 4 端點 + graceful degrade
  routes/admin.py                   # pooler 多 region fallback
  services/ptt_scraper.py           # PTT Stock 版爬蟲
  services/auto_search.py           # 自動搜尋 trigger #5

supabase/migrations/
  0003_quack_phase2.sql             # 4 表 schema(待執行)

scripts/
  fix_rss_urls.json                 # 修 RSS 用 JSON payload(已用過,留作記錄)
```

---

## 🔑 關鍵密鑰(和上一份 handoff 相同)

```
SUPABASE_URL=https://gvvfzwqkobmdwmqepinx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...service_role...(在 .env)
ADMIN_TOKEN=A-JVY4m_0lr2SUvmkBicOvXr6dltRX37vc9-sElVB_Y
ANTHROPIC_API_KEY=sk-ant-api03-...
LINE_CHANNEL_ACCESS_TOKEN=(招待所 Channel 2009873895)
LINE_USER_ID=U93f0c04b7e6f1797575a58348fb03428
```

GitHub: `https://github.com/vincent-2873/tw-stock-watcher` main

最新 5 commit:
- `c1a8e87` fix graceful degrade PostgREST
- `75d085e` Hero + topnav 照 18 HTML
- `836e9b3` PTT + auto_search
- `ee57dca` Phase 2/3 reasoning + predictions + 亮燈
- `b512036` Phase 1 Day 1-2 日文字體 + 米底

---

## ⚠ Vincent 原則(記好)

1. **懶人模式**:先做後回報,別叫他手動點 Supabase / Zeabur / UAC
2. **一次做完**:他明確說「沒有要讓你分段做」— 不要做一半停下來等確認
3. **嚴格照文件**:18 HTML / 19 brief / 20 intel 都要做足,不自己發揮
4. **已授權**:Chrome / Bash / 寫檔 / PowerShell 不再問
5. **Zeabur webhook** 通常 3-5 分內觸發 build。push 後 curl `tw-stock-watcher.zeabur.app/` 找 `クワック・ハウス` 字串確認 live
6. **截圖驗證**:Chrome MCP read_page 比 screenshot 更快
7. **繁體中文 + 粗體 + 表格,結論在前**

---

**下一輪新對話直接從上面「🎯 直接貼給新 Claude」那段開始即可。**
