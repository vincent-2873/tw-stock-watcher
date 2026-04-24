# 🦆 接棒指令(貼到新對話的第一則)

**專案**:呱呱投資招待所 / VSIS — 台股情報中樞
**工作目錄**:`C:\Users\USER\OneDrive\桌面\Claude code\projects\tw-stock-watcher`
**上一輪 handoff**:2026-04-23 下午,git commit `c009abe`

---

## 🎯 直接貼給新 Claude

> 我是 Vincent。你接手「呱呱投資招待所 / VSIS」專案,我已授權你直接控制我電腦(Chrome MCP / Bash / 寫檔),不用再問。先讀 `HANDOFF_2026-04-23_afternoon.md`(專案根目錄)看進度,然後讀:
>
> - `inbox/zen_v3/18_ZEN_HOMEPAGE_v3.html`(禪風視覺範本)
> - `inbox/zen_v3/19_V2_UPGRADE_BRIEF.md`(前輪 UI 升級)
> - `inbox/zen_v3/20_INTEL_HUB_UPGRADE.md`(本輪情報中樞)
>
> 目標是**嚴格照文件做**(不自己發揮)、每做完一個 Phase 就 build + push + 截圖。我是懶人模式:先做後回報,不要叫我點 UAC / SQL / Zeabur。Chrome 會卡,我已授權你直接用 Chrome GraphQL + Supabase SQL Editor 的 Monaco API 跑 SQL。
>
> **現在立刻做**:讀完 HANDOFF 後,觸發 `/api/intel/cron` 讓 RSS 抓 + AI 分析一次,然後把還沒做的 Phase 依序完成。

---

## 📍 目前狀態

### ✅ 已完成

**基礎架構**
- Next.js 15 App Router(`frontend/`,部署在 Zeabur `tw-stock-watcher.zeabur.app`)
- FastAPI Python 3.12(`backend/`,部署在 Zeabur `vsis-api.zeabur.app`)
- Supabase PostgreSQL(project ref `gvvfzwqkobmdwmqepinx`,帳號 `991171dd@gmail.com`)

**LINE 推播**
- 升級到「呱呱投資招待所」LINE 官方帳號(Channel ID `2009873895`)
- Vincent 已升 FinMind Sponsor NT$999/月 → 分點進出、完整新聞、三大法人總表全開

**資料庫表(全在 Supabase,有 RLS anon 讀)**
| 表 | 狀態 |
|---|---|
| `stocks / daily_prices / institutional_investors / recommendations / reports / alerts / watchlist / watchlists / watchlist_items / push_schedules / trades / news_cache` | ✅ Phase 1 既有 |
| `industries`(59 筆)`topics`(10)`ecosystems`(12)| ✅ VSIS upgrade seed |
| `intel_sources`(18)`intel_articles` `watched_people`(40)`people_statements` | ✅ **剛跑** Phase 1 Day 1-3 |

**Backend API(都 live)**
```
/health
/api/market/overview         (30s TAIEX/台指期/費半/VIX/NASDAQ/GSPC)
/api/analyze/{code}          (個股四象限 + 法人 + 技術)
/api/brokers/{code}/summary  (5 日分點)
/api/topics [/{id}] /tree
/api/industries [/{id}]
/api/ecosystems [/{ticker}]
/api/dashboard/overview
/api/quack/picks?horizon=1w|1m
/api/news/stock/{id} /api/news/recent /api/news/headlines (AI 分類)
/api/chat (Claude SSE streaming,system prompt 已換分析師式)
/api/notify/status /api/notify/test /api/notify/broadcast
/api/institutional/overview  (三大法人近 N 日)
/api/admin/exec_sql  /api/admin/upsert_seed  (X-Admin-Token)
/api/intel/sources /api/intel/articles[/{id}] /api/intel/people /api/intel/people/statements
/api/intel/refresh [/{source_id}]  (X-Admin-Token)
/api/intel/analyze                 (X-Admin-Token,Claude 批次分析)
/api/intel/cron                    (一次 crawl + analyze,Zeabur cron 用)
```

**Frontend 頁(都 live)**
```
/                首頁(接 6 個 API)
  - 市場脈動(30s 輪詢)
  - 呱呱今日功課(依 topics + TAIEX 動態)
  - 🎤 今日關鍵發言(Intel Hub 空殼,等 AI 分析填)
  - 題材熱度 Top 5
  - 昨夜美股連動
  - 焦點股(從題材抽)
  - 供應鏈金字塔(最熱題材)
  - 呱呱這週挑的(1w 6 檔 + 1m 4 檔,帶信心度)
  - 今日重點(AI 分類新聞)
  - 三大法人(FinMind Sponsor TotalInstitutionalInvestors)
/intel           情報中樞列表(多空篩選)
/intel/[id]      單篇 AI 分析(一句話結論/判斷理由/反方/影響股/呱呱視角/原文)
/pond            池塘題材列表
/pond/[topicId]  題材詳情(供應鏈分層)
/pond/ecosystem/[ticker]  龍頭生態系
/map             產業地圖
/stocks          個股搜尋
/stocks/[code]   個股深度(評分 + 分點 + 法人 + 新聞 + 聊天)有 loading 骨架
/market /chat /alerts /reports /paper /backtest  (既有)
```

**最新一批 commit(2026-04-23 下午 14:15 之後)**
- `dc877bd` Intel Hub schema + seed
- `704d704` RSS 爬蟲 + 6 個 /api/intel/* 端點
- `67d3335` /intel 列表 + /intel/[id] AI 分析詳情
- `2dbefd2` 首頁加「今日關鍵發言」+ nav 加 📰 情報
- **`c009abe`** 禪風 v3 palette(和紙米 #F5EFE0 + 墨 #2C2416 + 朱 #B85450)+ Claude 分析器 + `/api/intel/cron`

---

## 🔄 背景進行中

- Zeabur backend 在 build `c009abe`(裝 feedparser + beautifulsoup4)
- 背景 task `b05si47ul` 在 poll 等 backend 上線後自動觸發 `/api/intel/refresh` 跑一次 RSS 抓

---

## 🟡 剩下要做的(依 19 + 20 號文件 Phase 順序)

### 立刻(新對話第一動作)

1. **確認 backend 部署完成**:`curl -s https://vsis-api.zeabur.app/api/intel/sources` 回 200
2. **觸發 `/api/intel/cron`** 跑 crawl + analyze:
   ```
   curl -X POST https://vsis-api.zeabur.app/api/intel/cron \
     -H "X-Admin-Token: A-JVY4m_0lr2SUvmkBicOvXr6dltRX37vc9-sElVB_Y" \
     -H 'Content-Type: application/json'
   ```
   會花 3-5 分鐘(RSS 抓 + Claude 分析 15 篇)
3. **前端刷 `/intel` 看真資料**

### Phase 1 剩

- [ ] **Reddit API**(相對 RSS 有更完整內文/upvote):用 `https://www.reddit.com/r/{sub}.json?limit=25` 取代 RSS,但要加 User-Agent
- [ ] **X / Nitter RSS**:抓 `watched_people.x_handle` 透過 nitter.net/{handle}/rss(nitter 常被封,多試幾個 instance)
- [ ] **Zeabur Cron 排程**:用 Chrome GraphQL `mutation SetAutoRestart` 不對,是另一個 mutation,或用 GitHub Actions 每 15 分 curl `/api/intel/cron`

### Phase 2 剩

- [ ] **重點人物發言分析**:類似 article_analyzer 但針對 `people_statements`,加緊急度 > 7 自動 LINE 推播
- [ ] **/intel 篩選器**:日期 / 重要度 / 來源 / 語言 多維度(列表頁目前只有多空)
- [ ] **自選股關聯警示**:AI 分析影響個股時,若在 `watchlist_items`,自動 LINE

### Phase 3(19 號禪風 UI)

- [ ] **整站套禪風字體**:`layout.tsx` 加 `Shippori_Mincho` + `Zen_Maru_Gothic` + `Cormorant_Garamond`(next/font/google),注入 `--font-mincho-loaded` / `--font-maru-loaded` / `--font-cormorant-loaded`
- [ ] **首頁 page.tsx / page.module.css 改用禪風 palette**(現在仍是深炭灰 v2 原型)— globals.css 已改,但首頁用的是獨立 module.css 裡 hard-code 的 `#1A1815`。要改 module.css 全部改成 `var(--washi)` 等
- [ ] 照 `18_ZEN_HOMEPAGE_v3.html` 重做 5 大區塊(hero 區、問候區、呱呱晨報、題材卡、供應鏈切換器)
- [ ] 飄落花瓣、滾動 reveal 動畫

### 其他既有待辦

- [ ] `/api/analyze` Supabase cache(個股頁 10-15 秒 → 3 秒)
- [ ] 排程 LINE 推播(06:00 / 08:30 / 14:30 / 18:00)
- [ ] Event calendar(法說會/財報/除權息/FOMC)
- [ ] 14_HUMAN_FEEL_CHECKLIST 逐頁自檢
- [ ] 使用者抱怨過「產業熱力圖」「資金輪動」仍 hard-code,要接 FinMind sector 指數

---

## 🔑 關鍵密鑰與設定

**環境變數(Zeabur backend 已設)**
```
SUPABASE_URL=https://gvvfzwqkobmdwmqepinx.supabase.co
SUPABASE_SERVICE_KEY=...(.env 裡)
SUPABASE_DB_PASSWORD==xZGzicsqMBgfw1W8oNEnCU5T#Oh
FINMIND_TOKEN=...(Sponsor 方案)
ANTHROPIC_API_KEY=sk-ant-api03-...
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
LINE_CHANNEL_ACCESS_TOKEN=(招待所 Channel 2009873895 的長效 token)
LINE_USER_ID=U93f0c04b7e6f1797575a58348fb03428 (Vincent 本人)
LINE_CHANNEL_ID=2009873895
ADMIN_TOKEN=A-JVY4m_0lr2SUvmkBicOvXr6dltRX37vc9-sElVB_Y
CLAUDE_DAILY_CAP_TWD=100
```

**Zeabur IDs**
- Project: `69e7a7b8d974b2c8b61061d6`
- Frontend service: `69e7a886d974b2c8b61061f9`(tw-stock-watcher)
- Backend service: `69e89266c2a06cbb27e7c57b`(tw-stock-watcher-ing)
- Environment ID: `69e7a7b828b1ec4f67060830`

**GitHub**:`https://github.com/vincent-2873/tw-stock-watcher` `main`(Zeabur webhook 有時會失靈,push 後要手動 `RedeployService` mutation 踹一下)

---

## ⚠ Vincent 的使用者原則(記好)

1. **懶人模式**:先做後回報,不要叫他手動點(Supabase SQL / Zeabur 按鈕 / UAC 都繞)
2. **已授權**:安裝、下載、PowerShell、寫檔、操作 Chrome、直接存取他電腦 — 不再問
3. **遇到障礙自己想辦法**:絕不說做不到(有 feedback memory `feedback_solve_dont_ask`)
4. **時間 TPE**,股價一律當下
5. **繁體中文**,**粗體 + 表格**,結論在前
6. **不要自己發揮**:嚴格照文件做(19/20 號 Phase 順序)
7. **每個 Phase 完成就部署 + 截圖**(但 Chrome 截圖常卡,用 Bash poll HTML 代替)

---

## 🧰 常用指令備忘

```bash
# 網站健康
curl -s https://vsis-api.zeabur.app/health
curl -sI https://tw-stock-watcher.zeabur.app/

# 觸發 RSS 抓 + AI 分析
curl -X POST https://vsis-api.zeabur.app/api/intel/cron \
  -H "X-Admin-Token: A-JVY4m_0lr2SUvmkBicOvXr6dltRX37vc9-sElVB_Y"

# 看最近文章
curl -s "https://vsis-api.zeabur.app/api/intel/articles?limit=10&analyzed_only=true"

# Frontend build(本地驗證)
cd frontend && rm -rf .next && pnpm build

# Commit push(Zeabur auto build 2-3 分鐘)
cd .. && git add . && git -c commit.gpgsign=false commit -m "..." && git push

# Chrome 卡住時 forcequit tab 重開
mcp__Claude_in_Chrome__tabs_close_mcp + tabs_context_mcp createIfEmpty=true
```

---

**新對話第一訊息範本**(貼到新對話):

```
接棒。讀 HANDOFF_2026-04-23_afternoon.md。然後:

1. 確認 backend c009abe 部署完成
2. 觸發 /api/intel/cron 跑 RSS 抓 + AI 分析
3. 檢查 /intel 有沒有文章
4. 接著做 Phase 3(禪風 UI)— frontend/src/app/page.module.css 把 --bg-primary / --bg-card 等硬編碼色換成 var(--washi) / var(--washi-warm) / var(--sumi),把 layout.tsx 加 Shippori Mincho / Zen Maru Gothic / Cormorant Garamond 字體
5. 每個 Phase 完成 commit push

別問 UAC、別叫我點 Supabase,都自己做。
```
