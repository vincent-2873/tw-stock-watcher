# 🦆 接棒指令(2026-04-24 凌晨 · 階段 2 進行中)

**專案**:呱呱投資招待所 / VSIS
**工作目錄**:`C:\Users\USER\OneDrive\桌面\Claude code\projects\tw-stock-watcher`
**上一輪 handoff**:`HANDOFF_2026-04-23_phase1_complete.md`
**本輪最後 commit**:`acf2ccf`(fix extract_people opt-in)
**使用者**:Vincent

---

## 🔴🔴🔴 最優先:Zeabur backend 當機中!

### 現象
- `vsis-api.zeabur.app` **所有 endpoint timeout**(connected 但無 body)
- `/api/time/now`、`/`、`/docs`、`/openapi.json` 全卡
- frontend (`tw-stock-watcher.zeabur.app`) 正常 ✅ 不受影響

### 可能原因
1. 本輪多次觸發 `/api/intel/people/extract` 單一 handler 跑 > 90s
2. GitHub Actions cron(每 15 分)預設帶 `extract_people=true` 也長跑
3. uvicorn 單 worker 被 block → 所有 request 排隊
4. 最新 commit `acf2ccf` 已改 extract 為 opt-in(預設 false),但 container 尚未 restart 生效

### ⚠ 請 Vincent 到 Zeabur dashboard 手動 Restart backend service
或等 Zeabur 自動 redeploy 最新 commit `acf2ccf`(通常 3-5 分內)

### Restart 後如何驗證

```bash
# 1. 確認活過來
curl -s https://vsis-api.zeabur.app/api/time/now --max-time 10

# 2. 小量測 extract
curl -s -X POST "https://vsis-api.zeabur.app/api/intel/people/extract?days=3&limit=20" \
  -H "X-Admin-Token: A-JVY4m_0lr2SUvmkBicOvXr6dltRX37vc9-sElVB_Y" \
  --max-time 90

# 3. 看結果
curl -s "https://vsis-api.zeabur.app/api/intel/people/statements?limit=10"
```

---

## ✅ 階段 2.1 現況(Service Layer 就緒但有 timeout 風險)

### 已完成
- `backend/services/people_extractor.py` — 40 位人物別名表 + 萃取邏輯
- `/api/intel/people/extract` admin 端點
- 本機 regex 測試通過(40 人物 / Powell / Musk 全部匹配正常)
- `/api/intel/cron` 新 query param `extract_people`(opt-in,預設 false)

### 知道的坑
- **單次呼叫 > 90s 會被 Zeabur edge 斷**。若 `limit=200` 必超時
- **supabase-py sync client 會 block uvicorn worker**。需 `days=3 limit=30` 以內
- **`.not_.is_()` chain 不 work**(supabase-py 2.x),已移除
- **`intel_articles` 沒有 `title_zh` / `ai_market_impact` 欄位**,service 改用 `ai_quack_perspective` + `ai_urgency`

### 下一步修(可選,不阻塞 2.3)
選項 A:把 extract 改成 **FastAPI BackgroundTasks**
```python
from fastapi import BackgroundTasks

@router.post("/intel/people/extract")
async def extract(bg: BackgroundTasks, ...):
    bg.add_task(_extract_people, days, limit)
    return {"queued": True}
```

選項 B:寫 **GitHub Action 獨立 workflow** 每小時跑一次 extract(脫離 Zeabur edge timeout)

選項 C:改用 **asyncio + httpx** 非同步(需重寫 supabase 操作)

---

## 🔥 階段 2.3 是 P0:Stocks Scoring Worker(Vincent 明確要求)

**Vincent 原話**:「阿你的推薦標的呢?1815 應該不是你的推薦標的???? 你好像還是用舊資料喔」

**根本問題**:
- `/api/quack/picks` 只從 `topics.investment_strategy.short_term_1w` 的 **hardcoded 清單**挑
- `stocks` 表是空的(`SELECT count(*) FROM stocks` 回 0)
- 沒有 `current_score` / `current_tier` 欄位
- 完全沒經過四象限評分
- 違反 CLAUDE.md「每個建議都要有根據」

**首頁「呱呱這週挑的」已暫隱**(commit `bb52485`),Phase 2.3 完成前不恢復。

### 完整 to-do

#### a. Migration(Supabase SQL editor,照 HANDOFF_evening 的 Chrome MCP workflow)
```sql
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS current_score INT;
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS current_tier VARCHAR(5);  -- C/N/R/SR/SSR
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS score_breakdown JSONB;
  -- { fundamental: 8, chip: 12, technical: 14, topic: 16, market_adj: -5, total: 45 }
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_stocks_tier ON stocks (current_tier, current_score DESC);

-- history 表(選做)
CREATE TABLE IF NOT EXISTS stock_tier_history (
  id SERIAL PRIMARY KEY,
  stock_id VARCHAR(10),
  score INT,
  tier VARCHAR(5),
  breakdown JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tier_hist
  ON stock_tier_history(stock_id, recorded_at DESC);
```

#### b. Seed TOP 50 股(CCL / AI / 記憶體 / 半導體 / 衛星)
用 `/api/topics` 題材的 `supply_chain.stocks` 匯總去重(現在就可以跑)
```python
# scripts/seed_stocks_from_topics.py
from backend.utils.supabase_client import get_service_client
svc = get_service_client()
topics = svc.table("topics").select("supply_chain").execute().data
all_codes = set()
for t in topics:
    for tier in (t.get("supply_chain") or {}).values():
        for c in tier.get("stocks", []):
            if str(c).isdigit():
                all_codes.add(str(c))

# 從 FinMind 取 stock_name / industry 寫入 stocks 表
from backend.services.finmind_service import FinMindService
info, _ = FinMindService().get_stock_info()
by_id = {r["stock_id"]: r for r in info}
rows = []
for code in all_codes:
    if code in by_id:
        rows.append({
          "stock_id": code,
          "stock_name": by_id[code].get("stock_name"),
          "industry": by_id[code].get("industry_category"),
          "market": "tw",
          "is_active": True,
        })
svc.table("stocks").upsert(rows).execute()
```

#### c. Scoring Worker(`backend/services/scoring_worker.py`)
```python
"""
每日 15:30 TPE 對 stocks 表每檔跑四象限, upsert current_score/tier.
靠 backend.core.decision_engine (已存在).
"""
from backend.core.decision_engine import DecisionEngine
from backend.utils.supabase_client import get_service_client
from backend.utils.time_utils import now_tpe

def run_all():
    svc = get_service_client()
    stocks = svc.table("stocks").select("stock_id").eq("is_active", True).execute().data
    engine = DecisionEngine()
    updated = 0
    for s in stocks:
        try:
            analysis = engine.analyze(s["stock_id"], skip_ai=True)
            tier = score_to_tier(analysis.total_score)
            svc.table("stocks").update({
                "current_score": analysis.total_score,
                "current_tier": tier,
                "score_breakdown": analysis.breakdown,
                "tier_updated_at": now_tpe().isoformat(),
            }).eq("stock_id", s["stock_id"]).execute()
            # 同步寫 history
            svc.table("stock_tier_history").insert({
                "stock_id": s["stock_id"],
                "score": analysis.total_score,
                "tier": tier,
                "breakdown": analysis.breakdown,
            }).execute()
            updated += 1
        except Exception as e:
            print(f"scoring {s['stock_id']} failed: {e}")
    return {"updated": updated, "total": len(stocks)}

def score_to_tier(score: int) -> str:
    # (score/95) * 100
    pct = (score / 95) * 100
    if pct <= 20: return "C"
    if pct <= 40: return "N"
    if pct <= 60: return "R"
    if pct <= 80: return "SR"
    return "SSR"
```

#### d. GitHub Action(`.github/workflows/scoring-daily.yml`)
```yaml
name: 🎯 Daily Stock Scoring (15:30 TPE)
on:
  schedule:
    - cron: '30 7 * * 1-5'   # 15:30 TPE = 07:30 UTC, Mon-Fri
  workflow_dispatch:

jobs:
  run:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          FINMIND_TOKEN: ${{ secrets.FINMIND_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          TZ: Asia/Taipei
        run: python -c "from backend.services.scoring_worker import run_all; print(run_all())"
```

#### e. /api/quack/picks 改版
```python
# backend/routes/vsis.py (替換現行)
@router.get("/quack/picks")
async def quack_picks(limit: int = Query(6, ge=1, le=15)):
    sb = _svc()
    rows = (
        sb.table("stocks")
        .select("stock_id,stock_name,industry,current_score,current_tier,score_breakdown,tier_updated_at")
        .in_("current_tier", ["SR", "SSR"])
        .order("current_score", desc=True)
        .limit(limit)
        .execute()
        .data or []
    )
    return {"count": len(rows), "picks": rows}
```

#### f. 首頁恢復 `<QuackPicksLive />` + 套 TierBadge
```tsx
// frontend/src/app/home-data.tsx QuackPicksLive
// 加 import { TierBadge } from "@/components/stocks/TierBadge";
// 卡片上顯示 <TierBadge score={p.current_score} size="md" />
// 副文字 "基 X · 籌 Y · 技 Z · 題 W" (從 score_breakdown)
```

**驗證**:首頁看到的每張卡都有 SR/SSR 徽章,點進去個股頁 TierBadge 一致,Vincent 不會再質疑「這是你挑的嗎」。

---

## 📋 其他 Phase 2 項目(較低優先)

### 2.2 產業熱力圖 backend
`/api/sectors/heatmap` → 回 8-12 大類產業 + 漲跌% + 法人淨流
首頁 `page.tsx` 有註解 `// TODO: 等後端` 的區塊(已暫隱)會自動接回

### 2.4 真 Watchlist 頁
目前 `/stocks` 只是熱門 16 檔搜尋框
要加「我的自選股」區塊(從 `watchlist` 表讀)+ TierBadge + 漲跌

---

## 🔑 關鍵密鑰(照舊)

```
SUPABASE_URL=https://gvvfzwqkobmdwmqepinx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...service_role (.env)
ADMIN_TOKEN=A-JVY4m_0lr2SUvmkBicOvXr6dltRX37vc9-sElVB_Y
ANTHROPIC_API_KEY=sk-ant-api03-...
FINMIND_TOKEN=eyJ0eXAi...(Sponsor level 3, 6000 req/hr)
```

GitHub: `https://github.com/vincent-2873/tw-stock-watcher` main

---

## 📂 本輪檔案變更

```
backend/
  services/people_extractor.py  # 新建 (Phase 2.1)
  routes/intel.py               # 新 /people/extract 端點 + cron extract_people opt-in

frontend/src/app/
  page.tsx                      # 刪「呱呱這週挑的」(no real AI scoring)

HANDOFF_2026-04-24_phase2_scoring.md  # 本檔
```

## 📜 本輪 commit 軸

```
acf2ccf  fix: cron extract_people 改預設 false
d126df4  fix: extract 降 days=3 limit=50
452133f  fix: 移除 .not_.is_() chain
bdc8e04  fix: 對齊 intel_articles 真實欄位
cef171c  fix: 移除 title_zh
7694402  diag: 暴露 extract 錯誤
bb52485  phase-2.1: 人物發言萃取 + 下架假 picks
```

---

## 🔴 立刻要做(下輪 Claude 第一件事)

1. **ping `/api/time/now`** 確認 backend 活了(若還死,請 Vincent 去 Zeabur dashboard restart)
2. 活了之後,**跑 Phase 2.3 migration + seed stocks**(上面 a、b 章節)
3. 實作 **scoring_worker.py**(c 章節)
4. 本機試跑(`python -c "from backend.services.scoring_worker import run_all; print(run_all())"`)
5. 確認 `stocks` 表有 current_score / current_tier 資料
6. 改 `/api/quack/picks`(e 章節)+ 首頁恢復 QuackPicksLive(f 章節)
7. **截圖**首頁「呱呱這週挑的」顯示真 SR/SSR 清單給 Vincent 看

**預估時間**:migration 30 分、seed 30 分、worker 1 小時、picks + UI 1 小時 → 總 3 小時可全部搞定。

---

**Vincent 原則重申**:先做後回報、一次做完、嚴格照文件、繁體中文 + 粗體 + 表格、絕不寫死假資料。
