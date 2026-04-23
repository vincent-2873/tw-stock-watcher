# 🦆 接棒指令(2026-04-23 深夜 · 階段 1 完成)

**專案**:呱呱投資招待所 / VSIS
**工作目錄**:`C:\Users\USER\OneDrive\桌面\Claude code\projects\tw-stock-watcher`
**上一輪 handoff**:`HANDOFF_2026-04-23_evening.md`(Phase 2 backend 就緒)
**本輪結束 commit**:`c99fe1f`(階段 1.1/1.2/1.3 完成,全部 live)
**使用者**:Vincent
**下輪要做**:**階段 2 — 情報中樞 + 重點人物監測**

---

## 🎯 直接貼給新 Claude

> 我是 Vincent。接手「呱呱投資招待所 / VSIS」專案,已授權 Chrome MCP / Bash / 寫檔。
>
> **先讀**:
> 1. `CLAUDE.md`(7 條鐵則)
> 2. `.claude-code/` 全部(CORE / UI / DATA / SCORING / LINE / ALERT / README)
> 3. `HANDOFF_2026-04-23_phase1_complete.md`(本檔,了解階段 0+1 做了什麼)
> 4. `inbox/21_FINAL_MASTER_PLAN.md` 階段 2 那一大節
>
> **現在立刻做**:階段 2 情報中樞 + 重點人物 — 細節見下。

---

## ✅ 階段 0 已修 7 個緊急 Bug(全 live)

| # | Bug | Commit |
|---|---|---|
| 1 | Hero 日期寫死 | `85d372b` |
| 2 | FinMind Sponsor 沒生效 | `2e352ae` |
| 3 | 費半「—」+ Hero 4 浮動數字假 | `4342d9f` + `f88402d` |
| 4 | 題材熱度假資料(刪 236 行) | `fa7d8a2` |
| 5 | 今日關鍵發言空殼(空時整塊隱藏) | `092ab47` |
| 6 | 信心度 95% vs 27% 矛盾(TierBadge) | `1f64d2c` |
| 7 | 個股頁自動捲到底 | `bda0fd3` |

## ✅ 階段 1 完成(commit `c99fe1f`)

- **砍 4 頁**:`/backtest` `/paper` `/reports` `/alerts` + `WabiNav.tsx` dead code
- **新建 /settings**:系統健康(FinMind plan / TPE 時鐘即時顯示)+ 4 個 Phase 3 stub(Line 綁定 / 警示規則 / AI 預算 / 免打擾)
- **nav 微調**:「更多 ⋯」→ 拆成「情報」+「設定」兩個頂層入口
- **清掉**首頁 🔔 小鈴鐺假空狀態

---

## 🔑 關鍵基礎建設(前一輪留下)

### 後端已就緒端點
```
GET  /api/time/now              → 權威 TPE 時鐘(TZ=Asia/Taipei)
GET  /api/diag/finmind          → { level_title: "Sponsor", level: 3 }
GET  /api/diag/fmp              → FMP 測試
GET  /api/diag/env              → env var 設否
GET  /api/market/overview       → TAIEX + 台指期 + ^SOX + VIX 即時
GET  /api/topics                → 5 個真題材(CCL 95° 等)
GET  /api/quack/reasoning       → Claude 三層推論快取(Phase 2)
GET  /api/quack/alerts          → 自動警示(Phase 2 表就緒但空)
GET  /api/quack/picks           → 題材挑股(⚠ 目前只有 heat_score,缺 stock tier)
GET  /api/quack/social/hot      → 社群熱度(Phase 2 PTT 爬蟲就緒)
POST /api/intel/cron            → 拉 RSS + analyze N 篇(GitHub Action 每 15 分呼叫)
GET  /api/intel/people/statements → 重點人物發言(⚠ 目前空)
```

### 前端新元件
```
<HeroDate />               — 後端權威時鐘, 30s poll
<HeroFloats />             — 4 浮動數字即時
<TierBadge score={N} />    — C/N/R/SR/SSR, SSR 金茶閃光
<ScrollToTop deps={} />    — window.scrollTo(0,0)
lib/scoring.ts             — scoreToTier(0-95)
```

### 排程
- `.github/workflows/intel-cron.yml` 每 15 分跑 `/api/intel/cron + /social/refresh`
- Secret `ADMIN_TOKEN` 已設(A-JVY4m_0lr2SUvmkBicOvXr6dltRX37vc9-sElVB_Y)

### Supabase Phase 2 schema 已建
- `quack_predictions` — 呱呱預測與事後驗證
- `quack_reasoning` — 三層推論快取(已有 2026-04-23 一筆)
- `social_mentions` — 社群提及
- `auto_alerts` — 自動警示

---

## 🚀 階段 2 待做(按急迫度排序)

### 2.1 重點人物監測(🔴 最急,直接影響 Bug 5 UI)

**現狀**:`/api/intel/people/statements` 回空 → Bug 5 的區塊永遠隱藏
**目標**:40+ 位重點人物(黃仁勳 / 馬斯克 / Powell / 魏哲家 / 劉德音 / Lisa Su 等)的發言被爬取、AI 分析、寫入 `watched_people_statements` 表

**步驟**:
1. 建 `watched_people` 表(CLAUDE.md `.claude-code/` 或 21_MASTER_PLAN 2.1 有 schema)
2. Seed 40+ 位人物清單(name / name_zh / role / affected_stocks)
3. RSS / X / Bloomberg 爬蟲 → `intel/services/people_crawler.py`
4. Claude 分析 → ai_summary + ai_market_impact + ai_urgency
5. 寫入 `intel_articles` 或新 `statements` 表
6. 前端 `/api/intel/people/statements` 有資料就自動顯示

### 2.2 產業熱力圖 backend(Bug 4 的 follow-up)

**現狀**:首頁 SECTORS 熱力圖被暫隱(commit `fa7d8a2`)
**目標**:`/api/sectors/heatmap` 回 8 大類產業(AI 伺服器 / 記憶體 / CCL / 衛星 ...)+ 今日漲跌% + 資金淨流

**資料源**:
- 漲跌:從 `stocks` 表 + FinMind 日線算產業加權
- 資金:三大法人 + 個股買賣超 by sector

前端 `page.tsx` 有個 `{/* Bug 4 修: TODO: 等後端 */}` 註解標記要接回的位置。

### 2.3 `/api/quack/picks` 加 stock tier

**現狀**:Pick 只有 `heat_score`(題材熱度),沒 stock 自己的四象限
**目標**:加 `total_score` / `tier` 欄位,首頁挑股可套 TierBadge

**改動**:`backend/routes/quack.py` get picks 時 join `stocks.current_score` → 算 tier 回傳

### 2.4 真 Watchlist 頁

**現狀**:`/stocks` 只是搜尋框 + 熱門 16 檔
**目標**:`/stocks` 新增「我的自選股」區塊(從 Supabase `watchlist` 表讀),顯示:
- 代號 / 名稱 / TierBadge / 收盤 / 今日漲跌% / 加入時間
- 點卡去個股頁

**前置**:Supabase RLS + 簡易 userless local storage 也 OK(Phase 1 階段)

---

## ⚠ Vincent 原則(再次強調)

1. **懶人模式**:先做後回報,別叫他手動點 Supabase / UAC
2. **一次做完**:他明確說「沒有要讓你分段做」
3. **嚴格照文件**:CLAUDE.md + `.claude-code/` + 21_MASTER_PLAN
4. **已授權所有權限**:Chrome / Bash / 寫檔
5. **Zeabur 部署**:push 後 ~3 分 build,screen 驗證
6. **繁體中文 + 粗體 + 表格,結論在前**
7. **絕不寫死假資料,空時整塊隱藏**(鐵則 4)
8. **評級一律用 C/N/R/SR/SSR**(鐵則 2)

---

## 🔑 關鍵密鑰(同前兩輪)

```
SUPABASE_URL=https://gvvfzwqkobmdwmqepinx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...service_role(.env)
ADMIN_TOKEN=A-JVY4m_0lr2SUvmkBicOvXr6dltRX37vc9-sElVB_Y
ANTHROPIC_API_KEY=sk-ant-api03-...
LINE_CHANNEL_ACCESS_TOKEN=(招待所 Channel 2009873895)
LINE_USER_ID=U93f0c04b7e6f1797575a58348fb03428
FINMIND_TOKEN=eyJ0eXAiOiJK...(Sponsor level 3, 6000 req/hr)
```

GitHub: `https://github.com/vincent-2873/tw-stock-watcher` main

---

## 📂 本輪檔案變更

```
frontend/src/app/
  alerts/page.tsx              # 刪
  backtest/page.tsx            # 刪
  paper/page.tsx               # 刪
  reports/page.tsx             # 刪
  settings/page.tsx            # 新建 (stub)
  page.tsx                     # nav + 刪 🔔 小鈴鐺

frontend/src/components/
  WabiNav.tsx                  # 刪 (dead)
```

---

**下一輪新對話直接從「🎯 直接貼給新 Claude」那段開始即可。階段 2.1 最急。**
