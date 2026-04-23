# 🦆 接棒指令(2026-04-24 凌晨 · 階段 2.3 完成)

**專案**:呱呱投資招待所 / VSIS
**工作目錄**:`C:\Users\USER\OneDrive\桌面\Claude code\projects\tw-stock-watcher`
**本輪最後 commit**:`af0a891`
**使用者**:Vincent

---

## 🎯 直接貼給新 Claude

> 我是 Vincent。接手「呱呱投資招待所 / VSIS」。已授權所有權限。
>
> **先讀**:
> 1. `CLAUDE.md` + `.claude-code/`(7 鐵則 + 5 細則)
> 2. 本檔 `HANDOFF_2026-04-24_phase2_scoring.md`(階段 2.3 已完成 + 下一步)
>
> **現在做**:階段 2.2 產業熱力圖 backend(最後一塊拼圖),詳見下方。

---

## ✅ 階段 2.3 全數完成(今晚)

### 新基礎建設 live on production

| 項目 | 位置 |
|---|---|
| Supabase migration | stocks 表 4 新欄位 + stock_tier_history 表 + people_statements unique 索引 |
| Stocks seed | 62 檔(從 topics supply_chain + FinMind 匯總) |
| scoring_worker.py | `backend/services/scoring_worker.py` 套 DecisionEngine 跑四象限 → upsert |
| scoring-daily.yml | `.github/workflows/` 每週一至五 15:30 TPE 自動跑 |
| /api/quack/picks | `backend/routes/vsis.py` 改 JOIN stocks.current_tier |
| QuackPicksLive | `frontend/src/app/home-data.tsx` 新 UI: TierBadge + 四象限 breakdown |

### 實際跑 62 檔結果(2026-04-23 22:28 TPE 首跑)

```
by_tier: { C: 5, N: 57, R: 0, SR: 0, SSR: 0 }
ok: 62, failed: 0, elapsed: 21.5 min
TOP 3 都 N 36/95: 鴻海(2317) / 欣興(3037) / 環球晶(6488)
Vincent 之前質疑的 1815 富喬 實際是 N 22/95 — 確認不該是推薦
```

### 首頁 UI 行為(三層 CTA fallback)

- 預設 `min_tier=SR` → 回空 → 顯示「今日無 SR/SSR 評級股 — 市場偏弱,呱呱暫不挑。」+「看 R 級觀察名單 →」按鈕
- 點 → `min_tier=R` → 回空 → 「今日亦無 R 級股 — 整體估值/籌碼/技術面都偏弱。」+「看 N 級觀察池 TOP 6 →」按鈕
- 點 → `min_tier=N` → 顯示 TOP 6(鴻海/欣興/環球晶/臻鼎/健鼎/力致)全 N 級卡片帶完整 TierBadge + 四象限子分數

**完全符合 CLAUDE.md 鐵則 4「資料為空整塊隱藏, 或顯示引導性 CTA」**

---

## 🔑 關鍵基礎建設總結

### 後端端點
```
/api/time/now                  權威 TPE 時鐘
/api/diag/finmind              Sponsor plan 驗證(level 3)
/api/market/overview           TAIEX + 台指期 + ^SOX + VIX 即時
/api/topics                    5 題材(CCL 95° 等)
/api/quack/reasoning           三層推論(Claude Sonnet 4.5)
/api/quack/picks               ⭐ NEW v2: JOIN stocks.current_tier
/api/intel/cron                extract_people=false opt-in
/api/intel/people/extract      手動觸發萃取
/api/intel/people/statements   人物發言(暫空,Phase 2.1 尚未跑完)
```

### 前端元件
```
<HeroDate />           後端權威時鐘, 30s poll
<HeroFloats />         4 浮動即時數字
<TierBadge />          C/N/R/SR/SSR 日式配色
<QuackPicksLive />     ⭐ NEW: TierBadge + 四象限 breakdown + 3 層 CTA
<ScrollToTop />        window.scrollTo(0,0)
lib/scoring.ts         scoreToTier(0-95)
```

### 排程
```
.github/workflows/
  intel-cron.yml         每 15 分: RSS + AI analyze (不含 extract_people)
  scoring-daily.yml      ⭐ NEW: 週一至五 15:30 TPE 跑 scoring_worker
```

---

## 🔥 階段 2.2 = 下一個 P0(產業熱力圖 backend)

**現狀**:首頁「🗺️ 產業熱力圖」區塊已被暫隱(commit `fa7d8a2`),註解標註「等後端」

**需要做**:
1. backend 新 endpoint `/api/sectors/heatmap`
2. 回傳結構:
   ```json
   {
     "date": "2026-04-23",
     "sectors": [
       { "name": "AI 伺服器", "change_pct": -3.2, "net_flow_twd": -12500000000, "tier": "hCold", "top_stocks": ["2317","2382"] },
       { "name": "CCL / 玻纖", "change_pct": 5.8, "net_flow_twd": 4800000000, "tier": "hExtreme", ... }
     ]
   }
   ```
3. 資料來源:
   - 漲跌: 從 stocks.industry 分組,計算產業加權(FinMind 日線)
   - 資金流: 三大法人 by industry aggregation
4. 前端 page.tsx 接回被隱的 heatmap 區塊

### 代碼位置提示
- 首頁暫隱區塊: `frontend/src/app/page.tsx` 搜「🗺️ 產業熱力圖」
- 寫 backend 新 service: `backend/services/sector_heatmap.py`
- 新 route: `backend/routes/sectors.py`(新建)

---

## 🚧 未完成 / 已知問題

### 2.1 人物發言萃取 — service 就緒但未跑通
- backend/services/people_extractor.py 寫好了
- 40 位人物名單在 watched_people 表
- 但每次觸發 extract 都 timeout(supabase-py sync 在 Zeabur uvicorn 單 worker 卡)
- **解法建議**:改用 GitHub Action 獨立跑(同 scoring_worker 模式)
  - 新建 `.github/workflows/people-extract.yml` 每小時跑一次
  - 腳本:`python -c "from backend.services.people_extractor import extract_statements; print(extract_statements(days=14, limit=500))"`
- 完成後首頁「🎤 今日關鍵發言」會自動有貨

### 真 Watchlist 頁
- 目前 `/stocks` 只是搜尋框 + 熱門 16 檔
- 需要 `/stocks` 新增「我的自選股」區塊(從 `watchlist` 表讀)+ TierBadge

### Scoring 涵蓋面
- 現在只 seed 了 62 檔(topics supply_chain)
- 應擴充到 TOP 100-200 檔(加入權值股 0050 成分、ETF 持股榜)
- 寫一個 `backend/scripts/seed_more_stocks.py` 批量匯入

---

## 📦 本輪 commit 軸(從 af0a891 往回)

```
af0a891  chore: ignore scoring worker logs
4afbb70  ux(picks): 無 R 時再加一層 CTA 切到 N 級觀察池 TOP 6
be7ddf0  phase-2.3: Stocks scoring worker + 真四象限挑股 ★
92b042a  docs: handoff 2026-04-24 Phase 2.3 P0 (前一輪寫的)
acf2ccf  fix: cron extract_people 改預設 false
d126df4  fix: extract 降 days=3 limit=50
452133f  fix: 移除 .not_.is_() chain
bdc8e04  fix: 對齊 intel_articles 真實欄位
cef171c  fix: 移除 title_zh
7694402  diag: 暴露 extract 錯誤
bb52485  phase-2.1: 人物發言萃取 + 下架假 picks
```

---

## 🔑 密鑰(沿用)

```
SUPABASE_URL=https://gvvfzwqkobmdwmqepinx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...(.env)
ADMIN_TOKEN=A-JVY4m_0lr2SUvmkBicOvXr6dltRX37vc9-sElVB_Y
FINMIND_TOKEN=eyJ0eXAi...(Sponsor level 3, 6000 req/hr)
ANTHROPIC_API_KEY=sk-ant-api03-...
```

GitHub secrets 已設: SUPABASE_URL / ANON / SERVICE / FINMIND / FMP / ANTHROPIC / ADMIN_TOKEN

GitHub: `https://github.com/vincent-2873/tw-stock-watcher` main

---

## 🦆 Vincent 原則(鐵則)

1. 懶人模式:先做後回報,別叫他手動點
2. 一次做完:他明確說「沒有要讓你分段做」
3. 嚴格照 CLAUDE.md + .claude-code/
4. 已授權:Chrome / Bash / 寫檔 / PowerShell 不再問
5. **絕不寫死假資料,空時整塊隱藏 or 引導 CTA**(鐵則 4)
6. **評級一律 C/N/R/SR/SSR**(鐵則 2)
7. 繁體中文 + 粗體 + 表格 + 結論在前

---

## ⭐ Vincent 會驗證的東西

打開 `https://tw-stock-watcher.zeabur.app/` 捲到「🦆 呱呱這週挑的」:
- **今晚(市場弱)**:會看到 CTA「看 R 級 → 看 N 級」兩層,最後落在 N 級 TOP 6 卡片
- **市場轉強時(未來)**:有 SR/SSR 會直接顯示朱紅 / 金茶徽章的卡片

每張卡片都附:
- 大 TierBadge (C/N/R/SR/SSR)
- 股名 + 產業 + 主要題材(如「CCL 漲價循環 上游原料」)
- 四象限細分:基 8 · 籌 12 · 技 14 · 題 16 · 總 40/95
- 點進去個股頁,分數完全一致(單一真理來源)

**不再是 seed 出來的幻覺清單。1815 再也不會冒出來當推薦。**
