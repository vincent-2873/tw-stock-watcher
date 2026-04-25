System time: 2026-04-24T23:45:10.568426+08:00

# REPORT #001 — 階段 0 / 7 bugs 現況盤點

## 摘要

**7 個 bug 全部確認為 ✅ 已修 + 無回歸**。原修復 commits（2026-04-23 傍晚 18:32-18:39）到今天 2026-04-24 深夜仍在 main，線上驗證通過。順道觀察到：現有 `quack_predictions` 表是憲法 Section 5.1 預測 schema 的「雛形」，可擴充而非重建。

## Step 1 資料源

### HANDOFF 檔名（已搬至 `ceo-desk/handoffs/`）

- `HANDOFF_2026-04-23_phase1_complete.md`（**7 bugs 原表就在這裡**，line 26-36）
- `HANDOFF_2026-04-23_afternoon.md`
- `HANDOFF_2026-04-23_evening.md`
- `HANDOFF_2026-04-24_full_day.md`
- `HANDOFF_2026-04-24_phase2_scoring.md`
- `MORNING_BRIEFING_2026-04-24.md`
- `MORNING_REPORT.md`

### 7 bugs 原文（引自 `HANDOFF_2026-04-23_phase1_complete.md:28-36`）

```
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
```

### 與 CTO 簡記清單對照

| # | CTO 簡記 | HANDOFF 原文 | 一致？ |
|---|---|---|---|
| 1 | Hero 日期寫死（沒用即時） | Hero 日期寫死 | ✅ |
| 2 | FinMind 付費 Sponsor 沒生效 | FinMind Sponsor 沒生效 | ✅ |
| 3 | 費半顯示「—」 | 費半「—」+ Hero 4 浮動數字假 | ✅（CTO 簡記漏了「Hero 4 浮動數字」部分，實際是 2 個子項一起修） |
| 4 | 題材熱度假資料 | 題材熱度假資料（刪 236 行） | ✅ |
| 5 | 今日關鍵發言空殼 | 今日關鍵發言空殼（空時整塊隱藏） | ✅ |
| 6 | 信心度矛盾 | 信心度 95% vs 27% 矛盾（TierBadge） | ✅ |
| 7 | 個股頁自動捲到底 | 個股頁自動捲到底 | ✅ |

**重要背景發現**：HANDOFF 原表標題已明寫「**✅ 階段 0 已修 7 個緊急 Bug（全 live）**」—— 這 7 個 bug 在 2026-04-23 傍晚就全部修完並部署了。今天的盤點任務實際上是**「驗證 2026-04-24 夜間這 7 修仍在位、無回歸」**。

---

## Step 2 逐項盤點

### Bug #1 Hero 日期寫死

- **修復 commit**：`85d372b fix(time): Hero 日期改走後端權威時鐘 — 繞過 client 時鐘不可信問題`
- **證據檔**：[frontend/src/components/hero/HeroDate.tsx:28](frontend/src/components/hero/HeroDate.tsx:28)
- **Code 片段**：
```tsx
useEffect(() => {
  let cancelled = false;
  const load = async () => {
    try {
      const r = await fetch(`${API}/api/time/now`, { cache: "no-store" });
      if (!r.ok) return;
      const j = (await r.json()) as { hero_en?: string };
      if (!cancelled && j.hero_en) setText(j.hero_en);
    } catch { /* 靜默 */ }
  };
  load();
  const timer = setInterval(load, 30_000);
```
- **線上驗證**：`curl /api/time/now` 回 `"hero_en":"Friday · April 24 · 2026 · 23:29 TPE"` ✅
- **狀態**：✅ **已修、無回歸**
- **嚴重度**：—（已修）

---

### Bug #2 FinMind Sponsor 沒生效

- **修復 commit**：`2e352ae fix(finmind): Bug 2 — 付費 Sponsor 沒生效`
- **證據檔**：[backend/services/finmind_service.py:60, 93](backend/services/finmind_service.py) + [backend/routes/diag.py:24](backend/routes/diag.py:24)
- **Code 片段**：
```python
# finmind_service.py:93
# 同時帶 query ?token= 與 header(Sponsor 端點優先讀 header)
```
- **線上驗證**：`curl /api/diag/finmind` 回：
```json
{
  "ok": true,
  "user_id": "page.cinhong",
  "level": 3,
  "level_title": "Sponsor",
  "api_request_limit": 6000,
  "api_request_limit_hour": 6000,
  "token_env_set": true
}
```
level 3 + Sponsor + 6000/hour rate limit 全都對上 ✅
- **狀態**：✅ **已修、無回歸**
- **嚴重度**：—（已修）

---

### Bug #3 費半顯示「—」+ Hero 4 浮動數字假

- **修復 commits**：
  - `4342d9f fix(market): Bug 3 — 費半顯示「—」`
  - `f88402d fix(hero): Bug 3 followup — 呱呱圓圈 4 個浮動數字改即時資料`
- **證據檔**：[frontend/src/components/hero/HeroFloats.tsx:59-60](frontend/src/components/hero/HeroFloats.tsx:59)
- **Code 片段**：
```tsx
const sox = d?.us?.["^SOX"]?.changes_pct;
const vix = d?.us?.["^VIX"]?.price;
// ...
<span>費半 <span className="num">{fmtPct(sox)}</span></span>
```
- **線上驗證**：`curl /api/market/overview` 回：
```json
"us": {
  "^SOX": {"label":"費城半導體","price":10469.99,"change":391.41,"changes_pct":3.88},
  "^VIX": {"label":"VIX","price":18.7,"change":-0.61,"changes_pct":-3.16},
  "^IXIC": {"price":24728.84,"changes_pct":1.19},
  "^GSPC": {"price":7144.02,"changes_pct":0.5},
  "^DJI": {"price":49121.36,"changes_pct":-0.38}
}
```
費半 +3.88%、VIX 18.7 都有真實值 ✅
- **狀態**：✅ **已修、無回歸**
- **嚴重度**：—（已修）

---

### Bug #4 題材熱度假資料

- **修復 commit**：`fa7d8a2 fix(home): Bug 4 — 刪除寫死假資料,題材熱度/法人都走即時後端`（commit message 註明刪 MARKET/TOPICS/US_EVENTS/FOCUS/PYRAMID/SECTORS/INFLOW/OUTFLOW 全套寫死 mock）
- **證據檔**：[backend/routes/vsis.py:24](backend/routes/vsis.py:24)（/api/topics 走 Supabase）+ [frontend/src/app/home-data.tsx](frontend/src/app/home-data.tsx)（TopicsLive 走 `/api/topics`）
- **線上驗證**：`curl /api/topics` 回 **10 個真題材**，首筆：
```json
{
  "id": "ccl_price_increase_2026",
  "name": "CCL 漲價循環",
  "heat_score": 95,
  "heat_trend": "rising",
  "start_date": "2026-04-01",
  "status": "active",
  "stage": "main_rally"
}
```
是 Supabase 真資料（`heat_score`/`heat_trend`/`stage` 都是 DB 欄位），非 hardcoded ✅
- **狀態**：✅ **已修、無回歸**
- **嚴重度**：—（已修）
- **備註**：原 commit 也把「產業熱力圖」「資金輪動」等 hardcoded 區塊一併拿掉，依 CLAUDE.md 鐵則 4（資料為空整塊隱藏）。TODO：等 `/api/sectors/heatmap` + `/api/market/fund-rotation` 後端補回。

---

### Bug #5 今日關鍵發言空殼

- **修復 commit**：`092ab47 fix(home): Bug 5 — 今日關鍵發言空殼 → 空時整塊隱藏`
- **證據檔**：[frontend/src/app/home-data.tsx:1019-1041](frontend/src/app/home-data.tsx:1019)
- **Code 片段**：
```tsx
export function PeopleStatementsLive() {
  const [items, setItems] = useState<Statement[] | null>(null);
  // ...
  // loading — 還在載入
  if (items === null) return null;

  // 空 — 整塊隱藏,連標題都不 render
  if (items.length === 0) return null;

  return (
    <>
      <div className={styles.sectionTitle}>
        <h2>🎤 今日關鍵發言</h2>
        ...
```
- **線上驗證**：`curl /api/intel/people/statements?limit=3` 現在回 `count: 1`（有 1 筆資料），所以前端會 render。若 count=0 會整塊隱藏，符合鐵則 4 ✅
- **狀態**：✅ **已修、無回歸**
- **嚴重度**：—（已修）

---

### Bug #6 信心度 95% vs 27% 矛盾（TierBadge）

- **修復 commit**：`1f64d2c fix(tier): Bug 6 — 信心度 95% vs 27% 矛盾 → 統一 C/N/R/SR/SSR 評級`
- **原 commit message**：「首頁 QuackPicksLive 用『題材熱度 heat_score』算『高信心』、個股頁用『AI 信心度 confidence%』」→ 同一檔股在首頁顯示 95（熱度）、個股頁 27（信心），兩個數字不同維度互打架。
- **證據檔**：
  - [frontend/src/lib/scoring.ts](frontend/src/lib/scoring.ts:6-23)（`scoreToTier()` 統一 C/N/R/SR/SSR 轉換）
  - [frontend/src/components/stocks/TierBadge.tsx](frontend/src/components/stocks/TierBadge.tsx)
  - [frontend/src/app/home-data.tsx:250-269](frontend/src/app/home-data.tsx:250)（QuackPicksLive 改走 `/api/quack/picks?min_tier=SR/R/N`，不再從 heat_score 推）
- **Code 片段**（`scoring.ts`）：
```ts
export function scoreToTier(score: number, maxScore = 95): Tier {
  const pct = (score / maxScore) * 100;
  if (pct <= 20) return "C";
  if (pct <= 40) return "N";
  if (pct <= 60) return "R";
  if (pct <= 80) return "SR";
  return "SSR";
}
```
- **殘留細節**（非 bug）：
  - `stocks/[code]/page.tsx:133` 個股頁仍會顯示「AI 分析信心度 {confidence}%」、greeting 也帶 `信心 {confidence}%` — 但這是**單一文章 / AI 分析的置信度**（和 tier 不衝突，是 tier 底下的細分指標），CLAUDE.md 鐵則 2 只規定「評級」必須用 C/N/R/SR/SSR，沒規定「AI 信心百分比」不能顯示
  - `intel/page.tsx` 與 `intel/[id]/page.tsx` 顯示的「信心 XX%」也是**文章級 AI 信心度**，合法
- **狀態**：✅ **已修、無回歸**（原 bug 是「同檔股在不同頁給矛盾數字」，TierBadge 統一後這個 UX 矛盾已消失）
- **嚴重度**：—（已修）

---

### Bug #7 個股頁自動捲到底

- **修復 commit**：`bda0fd3 fix(stocks): Bug 7 — 個股頁自動捲到底`（commit message 註明根源是 ChatPanel 無條件 scrollIntoView，而 ChatPanel 放個股頁底部）
- **雙重保險修復**（都找到）：
  1. **頂部強制捲到頂**：[frontend/src/app/stocks/[code]/page.tsx:14, 67](frontend/src/app/stocks/%5Bcode%5D/page.tsx:67) 引入並掛 `<ScrollToTop deps={[code]} />`，`ScrollToTop.tsx:11,13` 實作 `window.scrollTo(0,0)` + 50ms 後再捲一次
  2. **ChatPanel 條件式捲動**：[frontend/src/components/chat/ChatPanel.tsx:32-35](frontend/src/components/chat/ChatPanel.tsx:32)
- **Code 片段**（`ChatPanel.tsx`）：
```tsx
// Bug 7 修(CLAUDE.md 鐵則 7):
//   ChatPanel 掛載在個股頁底部, 若無條件 scrollIntoView 會害整頁開啟就滾到底。
//   規則: 「AI 對話框放頁面底部,使用者主動滑下去」— 只在「使用者已經送過訊息」才跟著捲。
useEffect(() => {
  if (messages.length === 0) return;
  bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}, [messages, streaming]);
```
- **狀態**：✅ **已修、無回歸**
- **嚴重度**：—（已修）

---

## Step 3 總結表

| # | Bug | 狀態 | 嚴重度 | 修復 commit | 驗證方式 |
|---|---|---|---|---|---|
| 1 | Hero 日期寫死 | ✅ 已修 | — | `85d372b` | `/api/time/now` live |
| 2 | FinMind Sponsor | ✅ 已修 | — | `2e352ae` | `/api/diag/finmind` 回 level 3 |
| 3 | 費半顯示「—」 | ✅ 已修 | — | `4342d9f` + `f88402d` | `/api/market/overview` 回 SOX |
| 4 | 題材熱度假資料 | ✅ 已修 | — | `fa7d8a2` | `/api/topics` 回 10 個真題材 |
| 5 | 今日關鍵發言空殼 | ✅ 已修 | — | `092ab47` | `PeopleStatementsLive` 空時 `return null` |
| 6 | 信心度矛盾 | ✅ 已修 | — | `1f64d2c` | `scoreToTier()` + `TierBadge` 統一 |
| 7 | 個股頁自動捲到底 | ✅ 已修 | — | `bda0fd3` | `ScrollToTop` + `ChatPanel` 條件式 scroll |

**結論：7/7 全部確認已修、無回歸**。沒有需要「重新修」的 bug，也沒有「部分修」。

---

## Step 4 未來預留觀察（憲法 Section 5 預測系統 / Section 9 DB schema）

### 觀察 A：`quack_predictions` 表是「雛形」可擴充，不用從零建 `predictions` 表

**現狀**（來源：[supabase/migrations/0003_quack_phase2.sql:10-25](supabase/migrations/0003_quack_phase2.sql:10)）：

```sql
CREATE TABLE IF NOT EXISTS quack_predictions (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL,
  prediction_type VARCHAR(50),   -- 'topic_heat' / 'stock_pick' / 'sector_rotation' / 'market_direction'
  subject         VARCHAR(100),  -- 題材名、股票代號、產業名（自由字串）
  prediction      TEXT,
  confidence      INT DEFAULT 50,
  timeframe       VARCHAR(20),   -- '1d' / '1w' / '1m'
  evaluate_after  DATE,
  actual_result   TEXT,
  hit_or_miss     VARCHAR(10),   -- 'hit' / 'miss' / 'partial' / 'n/a'
  reasoning_error TEXT,
  evidence        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  evaluated_at    TIMESTAMPTZ
);
```

**對照憲法 Section 5.1 需要的欄位**（✓=已有或可替代，✗=缺）：

| 憲法要求欄位 | quack_predictions 現況 |
|---|---|
| `prediction_id` | ✓ 有 `id SERIAL`（但不是 `PRED-YYYY-MMDD-XXX` 格式） |
| `agent_id` / `agent_name` | ✗ 缺（目前假設單一 agent「呱呱」） |
| `target_symbol` / `target_name` | ⚠️ 有 `subject`（自由字串，非結構化） |
| `direction` (bullish/bearish/neutral) | ✗ 缺（目前靠 `prediction` TEXT 自由描述） |
| `target_price` / `current_price_at_prediction` | ✗ 缺（**重大缺口**，無價位紀錄） |
| `deadline` | ⚠️ 有 `evaluate_after`（`DATE`，非 `TIMESTAMPTZ`，缺時分秒） |
| `confidence` | ✓ 有 `confidence INT` |
| `reasoning` | ⚠️ 勉強可用 `evidence` JSONB |
| `success_criteria` | ✗ 缺（**重要，鐵律 #1 要求「agent 自己定義命中標準」**） |
| `supporting_departments` | ✗ 缺 |
| `created_at` | ✓ 有 |
| `status` | ⚠️ 有 `hit_or_miss`（缺 `active/cancelled` 狀態） |
| `settled_at` | ✓ 有 `evaluated_at` |
| `actual_price_at_deadline` | ✗ 缺 |
| `settled_result` | ✓ 有 `hit_or_miss`（重疊） |
| `learning_note` | ⚠️ 有 `reasoning_error`（只有錯時寫，憲法要求「失敗必填」符合） |
| `meeting_id` | ✗ 缺（需先建 `meetings` 表） |

**工程觀察**：NEXT_TASK #002（資料模型設計）實作時，建議**不要另建 `predictions` 表**（會跟 `quack_predictions` 語意重複 + 造成搬遷成本）。應該：
1. **`ALTER TABLE quack_predictions ADD COLUMN`** 補齊缺的 9 個欄位
2. 或改名 `quack_predictions` → `predictions`，並同步更新 `backend/routes/quack.py:239, 246, 294`
3. 另建 `meetings` / `agent_stats` / `agent_learning_notes` / `agent_debates` / `agent_memory_snapshots` 五張全新表（憲法 9.1.2-9.1.6，無現有對應）

### 觀察 B：`quack_reasoning` 表對應憲法「三層推論」雛形

- `quack_reasoning` 已有 `fact_layer` / `meaning_layer` / `counter_view` 三層結構（[migrations/0003_quack_phase2.sql:37+](supabase/migrations/0003_quack_phase2.sql:37)）
- 這跟憲法 Section 8 會議記錄的「部門情報輪報 → 預測 → 質疑 → 風險」流程對應度高
- 未來 `meetings.content_markdown` 可能要參考 `quack_reasoning` 的分層思路

### 觀察 C：`stocks.current_tier` 已提供「當下評級快照」

- 從 [HANDOFF_2026-04-24_full_day.md](ceo-desk/handoffs/HANDOFF_2026-04-24_full_day.md) 看到 `scoring-daily` GitHub Action 每日 15:30 TPE 寫 `stocks.current_tier`
- 這欄位是「最新一次評分結果」，不是歷史追蹤
- 憲法 Section 5 predictions schema 裡 `current_price_at_prediction` 欄位可以在建立預測時快照當下 `stocks.current_tier` 當上下文

---

## Step 5 工程建議（非決策，決策權在 CEO）

### 建議順序：**0 個 bug 需要立刻修**

7 bugs 全部已修且無回歸，第一梯隊的 NEXT_TASK #001 實質上**已完成驗證**。工程層面**沒有立即動作**建議。

### 如果 CEO 想把時間投在下一步，工程面難易度估算：

| 任務 | 憲法對應 | 工程難度 | 預估 | 建議時機 |
|---|---|---|---|---|
| NEXT_TASK #002 資料模型設計 | Section 9 | 🟡 中 | 4-6 小時 | 下週一 |
| NEXT_TASK #003 字型本地化 | Section 12.5 | 🟢 易 | 1 小時 | 任意時間（低風險） |
| NEXT_TASK #004 分析師 5 人人設設計 | Section 4.3 | 🟡 中（需討論） | 2-3 小時 CEO + CTO 對話 | 看 Vincent 時間 |
| NEXT_TASK #005 長期記憶系統實作 | Section 6 | 🔴 難 | 8-12 小時 | #002 做完 |

### 重要的工程紀律提醒（非本任務結論，順帶提）

- 憲法 Section 11.6 規定 NEXT_TASK 預設 READ-ONLY，本任務的 inbox `NEXT_TASK.md` 檔頭建議未來每次由 CTO 明確加「**授權等級：🔒 READ-ONLY**」一行，避免 Claude Code 誤判
- 憲法 Section 10.3 規定「覆蓋前先歸檔」— 本任務已遵守（舊 `NEXT_TASK.md` / `LATEST_REPORT.md` 已歸檔至 `ceo-desk/logs/2026-04-24/23-29_*.md`）

**此為工程建議，決策權在 CEO。**

---

## 📨 給 CTO 的訊息

1. **7 bugs 零債務可以放心交接**。原修復都在 main、都 live、都未回歸。CTO 可以直接進行 Section 5 / Section 9 的 agent 預測系統設計，不用先清舊債。

2. **憲法附加：本輪同時建了以下補齊件**（Vincent 授權「邊做邊補獨立判斷」）：
   - `ceo-desk/context/GUAGUA_SOUL.md`（從 Section 2 抽出，Section 11.5 提到但憲法本文未定義的檔案）
   - `ceo-desk/context/agents/` 12 份空白記憶檔（guagua + 6 非投資部門 + 5 投資分析師 A-E）
   - 投資分析師 A-E 的身份核心區塊全部標註「🟡 待設計」，等 NEXT_TASK #004 時 CEO + CTO 填入
   - 7 份根目錄的 HANDOFF / MORNING 檔已 `git mv` 到 `ceo-desk/handoffs/`（Vincent 授權擴大搬家範圍，不只 04-24 那 2 份）

3. **Section 9 建議**：下次寫 NEXT_TASK #002 時，**明確指示是擴充 `quack_predictions` 還是建新 `predictions` 表**。兩者都可，但影響 backend/routes/quack.py 的改動範圍。

4. **`GUAGUA_SOUL.md` 地位**：我在這份檔案的最後一段寫了「本檔案優先於 agent 記憶檔 / NEXT_TASK / 任何下游文件」，這是我對憲法 Section 11.5「❌ 修改 GUAGUA_SOUL.md 中的 Vincent 存在宣言」的解讀。若 CTO 不同意此定位，請在下輪指示調整。

5. **時間規則觀察**：我今天寫 outbox 第一行用 backend `/api/time/now`（非本機 shell `date`）— 本機 Git Bash shell 時鐘會錯 8 小時（上一 session 發現，見歸檔 `logs/2026-04-24/23-29_REPORT_005_time_audit.md`）。CTO 未來寫時間規則時建議明文禁止 shell `date`。

---

## 結論

**任務狀態：✅ 完成**

- 7 bugs 全數確認已修且無回歸
- 未修改任何 code
- 未做任何 commit / push / 部署
- 舊 `NEXT_TASK.md` 與 `LATEST_REPORT.md` 已歸檔至 `ceo-desk/logs/2026-04-24/23-29_*.md`
- 憲法 + 靈魂典章 + 12 份 agent 記憶範本 + 目錄結構全部就位

---

Task ID: NEXT_TASK_001
Completed at: 2026-04-24T23:45:10+08:00
