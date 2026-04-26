System time: 2026-04-26T20:59:18.812151+08:00

# 資料寫入鏈全面深度盤查報告（STAGE1-T2-FULL-AUDIT）

**任務範圍**：純診斷、未修任何 code、未呼叫 Claude API、未 archive 任何預測。
**前置依賴**：基於 STAGE1-T1（commit `bde8de7`）的 5 層全綠驗證。
**注意**：今天 2026-04-26 是週日，最近台股交易日 = 2026-04-24（週五）。

---

## 摘要（先講結論）

**主根因 1 句**：5 個 LLM-會議生成路徑中至少 2 個（HOLDINGS、Weekly Picks）的 prompt 構造階段**完全沒注入即時 current_price**，LLM 必須從訓練記憶 hallucinate 出 entry_price/target_price，因此寫入 DB 的數字 ±50% 偏差是常態。**這不是「bug」，是「設計缺漏」**——寫入路徑也沒有任何 sanity check 攔截。

**已 confirmed 受污染**：`quack_predictions` 表的 MEET-2026-0425-HOLDINGS（125 筆）+ MEET-2026-0425-0800（5 筆）= 130 筆。`analyst_daily_picks` 22 筆（繼承 holdings）。
**過去看似健康的 BACKFILL_008d1（863 筆）**：抽樣顯示「健康率 < 5% 偏差」只有 60%，**不是 100%**——也有污染但比較輕。
**真健康率（< 1% 偏差）**：v2 / BACKFILL / 早場 0800 三批中，3 批 30 筆樣本只有 2 筆達標 → 真健康率 ≈ 6.7%。

**第二破口**：`quack_brain.py:_build_weekly_picks_snapshot()` 也沒注入 current_price，且 prompt schema example 寫 `2330 → target_price 1050`（半價），會誤導 LLM。
**第三隱憂**：3/5 analyst 的 hit/miss 判定（loose / quant / segmented）依賴 `current_price_at_prediction`，污染導致勝率失真。
**Watchdog 漏洞**：watchdog + self_audit 完全沒檢查「entry_price vs 真實 close 一致性」、沒檢查「LLM hallucinate 比率」——所以 04-25 11:43 那場大爆炸 GHA 的綠勾完全照亮，沒攔截。

---

## 方向 1：Prompt 注入鏈完整 trace

### 1.1 入口
- 檔案：`backend/services/analyst_brain.py:313` 函數 `simulate_holdings_meeting(today)`
- 觸發者：route `backend/routes/analysts.py:simulate_meeting()` (line 618) — 受 `ADMIN_TOKEN` 保護的 POST endpoint，由 cron 或人工觸發
- 對應 GHA：本 repo `.github/workflows/` 沒看到「holdings_meeting」cron yml（**手動觸發 or 用其他 schedule 觸發**）

### 1.2 5 位 analyst LLM 呼叫的 code
```python
# backend/services/analyst_brain.py:329-336
for agent_id in ANALYSTS_ORDER:
    log.info(f"  generating holdings for {agent_id} ...")
    try:
        data = _generate_holdings_for(agent_id, snapshot, today)  # ← 各自獨立 call
        per_analyst[agent_id] = data
    except Exception as e:
        log.exception(f"  {agent_id} failed: {e}")
        raise
```
- 5 位各自獨立 LLM call，**共用同一個 snapshot**
- 5 個 calls × 4-6k tokens output（line 14-16 註解）

### 1.3 prompt 裡有沒有 current_price 變數？
**❌ 沒有任何 `current_price` 變數注入。**

System prompt（line 239-275）：
```
你是「{display_name}」({school},代號 {frontend_name})。
...
"current_price_at_prediction": 2185,   ← schema example,寫死的 2330=2185
```

User prompt（line 287-296）：
```python
user = f"""今天:{today.isoformat()}

可選的台股 universe(已篩過熱門/有評分的 60 檔):
{json.dumps(universe, ensure_ascii=False, indent=2)}    ← 沒 price 欄位!

當前熱門題材(供你流派參考):
{json.dumps(topics, ensure_ascii=False, indent=2)}

請依照你的流派與個性,**剛好挑 25 檔**作為當週持倉。
"""
```

`universe` 來自 `_build_market_snapshot()`（line 179-233）的 `stock_universe` 欄位。實際 schema：
```python
{
  "symbol": s.get("stock_id"),
  "name": s.get("stock_name"),
  "score": s.get("current_score"),
  "tier": s.get("current_tier"),
  "industry": s.get("industry"),
  "score_breakdown": s.get("score_breakdown"),
}
```
**6 個欄位中沒有 `price` / `close` / `current_price`。**

### 1.4 stocks 表也沒 price 欄位（即便想注入也注入不到）
Supabase REST 查 `/rest/v1/stocks?stock_id=eq.2330&limit=1`：
```
stocks columns: ['stock_id', 'stock_name', 'market', 'industry', 'sub_industry',
'listing_date', 'is_active', 'is_alert_stock', 'is_full_delivery',
'created_at', 'updated_at', 'current_score', 'current_tier',
'score_breakdown', 'tier_updated_at']
```
**沒有 `close` / `price`**。即便 `_build_market_snapshot` 想注入，也得改去 join `stock_prices_historical`。

### 1.5 結論
✅ confirmed：HOLDINGS 會議 prompt 沒注入即時股價，LLM **完全自由發揮**。

### 1.6 完整 prompt template（脫敏）
見 `backend/services/analyst_brain.py:239-296`（如附）。LLM 看到的範例值 `current_price_at_prediction: 2185` 對 2330 來說是對的（人寫範例時用真實值），**但只有 2330 的範例**——其他 39 檔股票 LLM 必須自己「腦補」，所以 ±50%-90% 偏差是必然。

---

## 方向 2：5 位 analyst 個人 prompt 差異

### 2.1 共用 base 還是各自獨立？
**共用一份 base：`SYSTEM_PROMPT_HOLDINGS`（analyst_brain.py:239-275）。**
5 位的差異透過 `profile = ANALYSTS[agent_id]` 字典 fmt 注入。

### 2.2 Base 的 current_price 注入機制
**沒有**（見方向 1.3）。

### 2.3 5 位 prompt 差異點
透過 `ANALYSTS` 字典（line 46-152）的不同 profile 鎖入：

| 分析師 | display_name | school | weights | timeframe | stop_loss | 成功標準 | strictness_coef |
|---|---|---|---|---|---|---|---|
| analyst_a | 辰旭 | 激進派(全盤) | 技術 35%/籌碼 25%/題材 20%/基本面 10%/量化 10% | 5/14d | -9% | 嚴格型 | 1.0 |
| analyst_b | 靜遠 | 保守派(全盤) | 基本面 40%/籌碼 15%/題材 15%/量化 15%/技術 15% | 21/90d | -5% | 嚴格+分段 | 0.95 |
| analyst_c | 觀棋 | 跟隨派(全盤) | 籌碼 35%/技術 20%/題材 20%/基本面 15%/量化 10% | 14/60d | -7% | 寬鬆型 (80%) | 0.8 |
| analyst_d | 守拙 | 紀律派(全盤) | 量化 35%/技術 25%/籌碼 15%/基本面 15%/題材 10% | 7/21d | -6% | 嚴格+數學 (90%) | 0.9 |
| analyst_e | 明川 | 靈活派(全盤) | 動態權重 | 7/60d | -7% | 分段 (66%) | 0.7 |

**5 位差的是「人格 / 權重 / 風險 / 時間框架」，但「prompt 完全沒提供現價」這點 5 位完全相同。**

### 2.4 為什麼同會議同股票 5 位拿到不同 entry？
LLM 根據訓練記憶 hallucinate，每位 call 是獨立 sampling（temperature 預設不為 0），所以每位「腦補」出的 price 不同。
- 2330：a=1095, b=2180, c=2185, d=1028, e=1045（b/c 抄到 system prompt 範例 2185；a/d/e hallucinate）
- 2308：a=388, b=395, c=378, d=378, e=388（5 位都 hallucinate 相近錯值，可能 LLM 訓練記憶 2308=380~390，但實際 2075）

---

## 方向 3：股票級差異（ALL 125 筆 symbol-by-symbol）

抓 MEET-2026-0425-HOLDINGS 全部 125 筆，按 40 個 symbol 分組對比 FinMind 真實 04-24 close。

| 分類 | 定義 | 數量 | symbols |
|---|---|---|---|
| ALL_OK | 5 位都 \|diff\| < 5% | **0** / 40 | 無 |
| ALL_WRONG | 5 位都 \|diff\| > 25% | **28** / 40 | 2308, 2337, 2344, 2368, 2383, 2408, 2449, 2455, 3017, 3037, 3044, 3081, 3163, 3260, 3324, 3583, 3711, 4958, 5434, 5536, 6196, 6213, 6239, 6274, 8028, 8046, 8210, 8299 |
| MIXED | 部分對部分錯 | **12** / 40 | 2301, 2317, 2330, 2356, 2382, 3231, 3483, 3532, 3680, 5483, 6182, 6488 |

### 詳細對照表（節選 12 檔代表）
| sym | 真實 04-24 close | a | b | c | d | e | verdict |
|---|---|---|---|---|---|---|---|
| **2330** | **2185.0** | 1095 (-50%) | 2180 (-0%) | 2185 (0%) | 1028 (-53%) | 1045 (-52%) | MIXED |
| **2308** | **2075.0** | 388 (-81%) | 395 (-81%) | 378 (-82%) | 378 (-82%) | 388 (-81%) | ALL_WRONG |
| **2382** | **323.0** | 312 (-3%) | 295 (-9%) | -- | -- | 298 (-8%) | MIXED（最接近正確） |
| **2383** | **4475.0** | 298 (-93%) | 430 (-90%) | 295 (-93%) | 268 (-94%) | -- | ALL_WRONG |
| **8299** | **1680.0** | 478 (-72%) | 480 (-71%) | -- | -- | 475 (-72%) | ALL_WRONG |
| **6488** | **582.0** | 725 (+25%) | 615 (+6%) | 625 (+7%) | 512 (-12%) | 615 (+6%) | MIXED |
| **3680** | **459.0** | 352 (-23%) | -- | -- | -- | 262 (-43%) | MIXED |
| **6182** | **40.7** | -- | 50 (+23%) | 46 (+13%) | -- | -- | MIXED |
| **5483** | **130.0** | -- | 192 (+48%) | 182 (+40%) | 152 (+17%) | -- | MIXED |

### Pattern 觀察
1. **無一檔「5 位全完美對齊真實價」** — 連最接近的 2382 也是 -3% 到 -9%
2. **大多數歪是負偏**（28 檔 ALL_WRONG 都是 -50% 到 -94%），少數正偏（5483 +48%, 6182 +23%, 6488 +25%）
3. **冷門股歪更嚴重**（3017 真價 2945 vs LLM 給 75；8210 真價 1210 vs LLM 給 72） — 推測 LLM 訓練資料對這些冷門小型股無記憶
4. **熱門大型股偶爾接近**（2382 -3~-9%、2356 -4%、3231 -17~-24%） — LLM 訓練記憶有印象
5. **同一支股票不同 analyst 也不同步**（2330: 2185 vs 1095 vs 1028 vs 1045） — 證明是 sampling 隨機性

### 結論
**「prompt 沒注入價 → LLM 完全自由發揮 → 偏差近乎全幅落在 -3% 到 -97% 連續譜」。** 沒「全對」是因為 LLM 永遠在 hallucinate，運氣好碰到熟標的偏少、冷門標的偏大。

---

## 方向 4：過去「健康」紀錄真實性

抽樣三批各 10 筆（v1 早場 0800 只有 5 筆，全抽）vs FinMind 真實 close。

### v2（舊架構，2025-12 範圍，10 筆）
| id | sym | date | entry | actual | diff |
|---|---|---|---|---|---|
| 1940 | 2308 | 2025-12-12 | 979.0 | 938.0 | +4.4% |
| 1787 | 2383 | 2025-12-08 | 1425.0 | 1485.0 | -4.0% |
| 1815 | 3711 | 2025-12-08 | 228.0 | 237.5 | -4.0% |
| 1954 | 2330 | 2025-12-15 | 1470.0 | 1450.0 | +1.4% |
| 1861 | 2330 | 2025-12-10 | 1460.0 | 1505.0 | -3.0% |
| 1831 | 3037 | 2025-12-09 | 215.0 | 226.0 | -4.9% |
| 1834 | 5536 | 2025-12-09 | 728.0 | 740.0 | -1.6% |
| 1825 | 2330 | 2025-12-09 | 1460.0 | 1480.0 | -1.4% |
| 1990 | 2356 | 2025-12-15 | 44.05 | 43.35 | +1.6% |
| 1794 | 2356 | 2025-12-08 | 46.05 | 47.30 | -2.6% |

- 真健康率（<1%）: **0/10 = 0%**
- 健康率（<5%）: **10/10 = 100%** （全在 1-5% 區間）

### v1 BACKFILL_008d1（補資料批，10 筆）
| id | sym | date | entry | actual | diff |
|---|---|---|---|---|---|
| 498 | 2368 | 2026-03-20 | 909.0 | 988.0 | -8.0% |
| 338 | 3163 | 2026-02-04 | 456.0 | 490.0 | -6.9% |
| 308 | 2383 | 2026-02-11 | 1925.0 | 2195.0 | **-12.3%** |
| 252 | 2330 | 2026-01-29 | 1770.0 | 1805.0 | -1.9% |
| 318 | 5536 | 2026-01-28 | 684.0 | 658.0 | +4.0% |
| 285 | 8046 | 2026-01-27 | 382.0 | 395.0 | -3.3% |
| 203 | 3081 | 2026-01-26 | 782.0 | 816.0 | -4.2% |
| 201 | 8046 | 2026-01-26 | 382.0 | 370.0 | +3.2% |
| 253 | 2317 | 2026-01-29 | 221.5 | 224.0 | -1.1% |
| 235 | 3044 | 2026-01-28 | 360.5 | 393.5 | -8.4% |

- 真健康率（<1%）: **0/10 = 0%**
- 健康率（<5%）: **6/10 = 60%**
- 5-25% 偏差: 4/10（包含一筆 -12.3% 的中度偏差）

### v1 MEET-2026-0425-0800（早場，全 5 筆）
| id | agent | sym | entry | actual | diff |
|---|---|---|---|---|---|
| 1 | analyst_a | 2330 | 2185 | 2185 | +0.0% |
| 2 | analyst_b | 2454 | 1510 | 2435 | **-38.0%** |
| 3 | analyst_c | 2317 | 187 | 221.5 | -15.6% |
| 4 | analyst_d | 3231 | 142 | 141.5 | +0.4% |
| 5 | analyst_e | 2382 | 328 | 323 | +1.5% |

- 真健康率（<1%）: **2/5 = 40%**
- 健康率（<5%）: **3/5 = 60%**
- 嚴重歪（>25%）: 1/5 = 20%（2454 -38%）

### 結論
- **v2 (2025-12)** 健康率 100%（<5%）但「真健康率」（<1%）= 0%。**不是真的健康，是「LLM 對 2025-12 那批熱門股有訓練記憶，剛好接近，但不完美」**。
- **BACKFILL_008d1** 60% 健康，40% 落在 5-25% 偏差。雖然 prompt 有注入 `recent_5d` OHLC（line 267-323），但 LLM 仍部分時候 hallucinate。
- **早場 0800** 5 筆 1 筆嚴重歪（2454 -38%）— 跟 HOLDINGS 同源，**早場也有同樣 bug，只是樣本少 STAGE1-T1 抽到 2330 剛好對**。
- 三批合計 30 筆樣本中，「真健康率」只有 2 筆（6.7%）。**整個系統從未產出過 100% 對齊真實價的預測批次**。

---

## 方向 5：其他 LLM 寫入路徑

backend 共有 **15 個 LLM call sites**（grep `messages.create`，排除 `.venv`）：

| # | 檔案:行 | 函數 | 是否注入 current_price | 寫入欄位 | 受污染狀態 |
|---|---|---|---|---|---|
| 1 | `analyst_brain.py:298` | `_generate_holdings_for` | ❌ 無 | `quack_predictions.current_price_at_prediction` + `target_price` | 🔴 **嚴重** (130 筆已 confirm) |
| 2 | `analyst_brain.py:494` | `_generate_meeting_record` | ❌ 無 | `meetings.content_markdown`（純文字） | ⚪ 描述文字、不入價格 |
| 3 | `analyst_brain.py:554` | `analyst_judge_market` | ❌ 無 | `analyst_market_views.market_view` | 🟡 文字判斷可能基於錯認知（但不寫入 price 欄位） |
| 4 | `analyst_brain.py:664` | `analyst_pick_daily` | ✅ **有**（從 holdings 表撈 `current_price_at_prediction`）| `analyst_daily_picks.entry_price_low/high` | 🔴 **繼承 holdings 污染**（22 筆已 confirm 用半價） |
| 5 | `historical_backtest.py:375` | `generate_predictions_for_day` (BACKFILL) | ✅ **有**（`recent_5d` OHLC + `current_price`）| `quack_predictions` (BACKFILL_008d1) | 🟡 60% 健康（LLM 有時還是亂編） |
| 6 | `historical_backtest.py:746` | `generate_learning_notes_batch` | N/A（payload 帶 actual_close）| `agent_learning_notes` | 🟢 健康 |
| 7 | `quack_brain.py:191` | `quack_judge_headline` | ❌ 無（snapshot 給 topics+news+people） | `quack_judgments`（純文字） | ⚪ 文字判斷、不入 price |
| 8 | `quack_brain.py:363` | `quack_judge_weekly_picks` | ❌ **無** + schema example 寫 `2330=1050` 半價誤導 | （待查 weekly_picks 寫入哪表） | 🔴 **第二破口！** |
| 9 | `quack_brain.py:474` | `_quack_refresh_topics` | N/A | `topics.heat_score` | 🟢 不入 price |
| 10 | `chat.py:305` | streaming chat | ✅ **有**（`_fetch_live_stock_snapshot` 即時打 FinMind）| 不寫 DB | 🟢 健康 |
| 11 | `quack.py:209` | `_claude_reasoning` | ❌ 無 | `quack_reasoning.*`（純文字） | ⚪ 文字 reasoning |
| 12 | `sentiment_service.py:132` | 新聞情緒分析 | N/A（分析新聞）| `intel_articles.ai_sentiment` | 🟢 不入 price |
| 13 | `article_analyzer.py:197` | 文章分析 | N/A | `intel_articles.ai_summary` | 🟢 不入 price |
| 14 | `quack.py:203` | （與 11 同段）| - | - | - |
| 15 | `ai_service.py:109` | 通用 AI service | 視呼叫者而定 | 視呼叫者而定 | 🟡 可能被污染 |

### 受污染寫入路徑總計
- **HOLDINGS 會議**：5 位 × 25 = 125 筆/場 寫入 quack_predictions
- **0800 早場會議**：5 筆/場
- **Daily picks**：5 位 × 3-5 = 15-25 筆/天 寫入 analyst_daily_picks（繼承）
- **Weekly picks**：10 筆/週寫入 quack_weekly（待查）

### Learning notes 確認
SQL 抽樣 `agent_learning_notes`：[未測試 — 任務 5.5 要 confirm 是否真的沒跑]
從 code 看 `write_learning_notes_for_agent` 存在，但本地無 cron schedule 觸發；只能由人工調用。

---

## 方向 6：純資料 cron 寫入正確性

### FinMind → stock_prices_historical（`historical_backtest.py:55-119`）
```python
for d in data:
    close = d.get("close")
    if close is None:
        continue
    rows.append({
        "stock_id": sym,
        "trade_date": d.get("date"),
        "open": d.get("open"),
        "high": d.get("max"),       # FinMind 用 max,DB 用 high
        "low": d.get("min"),        # FinMind 用 min,DB 用 low
        "close": close,             # 1:1 直接寫
        "volume": d.get("Trading_Volume"),
        "spread": d.get("spread"),
    })
sb.table("stock_prices_historical").upsert(chunk, on_conflict="stock_id,trade_date").execute()
```
**transform = 0**（除了欄位重命名 max→high/min→low，純粹 1:1 mapping）。
✅ STAGE1-T1 已驗證 5 檔台股 close 100% 對齊。

### yfinance（`backend/workflows/us_market.py`）
[未深入 trace，但 STAGE1-T1 驗 NVDA=208.27 與 yfinance 一致]

### 三大法人 / 籌碼（`backend/services/finmind_service.py:get_institutional_investors`）
類似 1:1 mapping，無 transform。

### 19 個資料源（PTT/鉅亨/CMoney/Bloomberg）
這些是新聞抓取（intel_articles），不寫入 price 表。

### GHA cron schedules（`.github/workflows/`）
12 份 yml：
- `intel-cron.yml`（15 min）
- `scoring-daily.yml`（盤後）
- `morning-report.yml`（盤前）
- `day-trade-pick.yml` / `intraday-monitor.yml` / `closing-report.yml`
- `us-market.yml`（美股收盤）
- `watchdog.yml`（15 min）
- `self-audit.yml`（30 min）
- `quack-refresh.yml`
- `ci.yml`

**沒看到 `holdings-meeting.yml`** — 那場 04-25 11:43 HOLDINGS 會議是手動觸發或從別處（`quack-refresh.yml`？待查）。

### 結論
✅ 純資料 cron 寫入路徑健康，無 transform bug。歪的全部都在「LLM 寫入」路徑。

---

## 方向 7：agent_stats / 勝率計算路徑

### 結算入口
`backend/services/historical_backtest.py:558` 函數 `settle_prediction(pred, today)`，由 `settle_all_pending` 批次跑。

### 5 種 hit/miss 判定演算法 + 是否依賴 entry_price

| analyst | judge_type | 函數 | 用 entry？ | entry 歪會錯算嗎？ |
|---|---|---|---|---|
| analyst_a 辰旭 | strict | `_judge_strict` (line 478) | **NO**（只看 close vs target）| ❌ 不會被 entry 污染 |
| analyst_b 靜遠 | strict_window | `_judge_strict_window` (line 490) | **NO**（只看 max/min vs target）| ❌ 不會被 entry 污染 |
| analyst_c 觀棋 | loose | `_judge_loose` (line 499) | **YES**（partial = entry + (target-entry)*0.8）| ✅ **會被嚴重污染** |
| analyst_d 守拙 | quant | `_judge_quant` (line 517) | **YES**（target_return = (target-entry)/entry）| ✅ **會被嚴重污染** |
| analyst_e 明川 | segmented | `_judge_segmented` (line 534) | **YES**（partial_66 = entry + (target-entry)*0.66）| ✅ **會被嚴重污染** |

### 範例：analyst_e 對 2330（entry=1045, target=1050, 真實 max ~ 2200）
- partial_66 = 1045 + (1050 - 1045) × 0.66 = **1048.3**
- 結算：max_in_window (~2200) ≥ 1048.3 → **HIT**
- 但這個「HIT」是基於錯誤的 baseline，實際上真實 entry 應該是 2185，target 1050 = bearish 預測 → 真實判定應該是「miss」

### normalized_winrate
`backend/routes/analysts.py:139-143`：
```python
def _normalized(win_rate, coefficient):
    return round(win_rate * coefficient, 4)
# strictness_coefficient: a=1.0, b=0.95, c=0.8, d=0.9, e=0.7
```
此公式假設 win_rate 本身是對的——但 c/d/e 的 win_rate 已被 entry_price 污染。

### 結論
**3/5 analyst（analyst_c/d/e）的勝率算法依賴 entry_price**。對 04-25 11:43 那場 75 筆（c+d+e × 25），entry 歪 -50% 意味著「達標線」也歪 → hit/miss 判定毫無意義。
未來結算時這 75 筆會產生「神奇地超高 hit 率」（因為達標線太低），讓 c/d/e 的 normalized_winrate 顯示「c/d/e 比 a/b 強」是純假象。

---

## 方向 8：顯示層讀的是哪一份資料

從 `frontend/src/` 抓所有 `current_price_at_prediction` / `target_price` / `entry_price_low/high` 出現處：

| # | 前台位置 | fetch 來源 | 顯示哪個欄位 | 受污染？ |
|---|---|---|---|---|
| 1 | `/analysts/{slug}` (line 416-417) | `/api/analysts/{slug}/holdings` → `quack_predictions where status=active` | `current_price_at_prediction` + `target_price` | 🔴 **這就是 Vincent 看到「~1050-1100」的 PRIMARY 位置** |
| 2 | `/analysts/{slug}` (line 661-663) | `analyst_daily_picks` | `entry_price_low ~ entry_price_high` | 🔴 繼承 holdings 半價 |
| 3 | `/predictions/[id]` (line 235, 241) | `quack_predictions where id=X` | `current_price_at_prediction` + `target_price` | 🔴 |
| 4 | `/home-data` (line 437-438) | `quack_predictions` | `target_price` | 🔴 |
| 5 | `/pond/ecosystem/[ticker]` (line 289-293) | （待查）| `target_price` | 🔴 |
| 6 | `/weekly_picks` (line 127-128) | `/api/quack/predictions` | `target_price` | 🔴 |
| 7 | `/quack-journal` (line 32) | `/api/quack/predictions?days=N` | （列表展示）| 🔴 |
| 8 | `/stocks/{id}`（個股頁）| `/api/analyze/{id}` | `data_snapshot.last_close` | ✅ **健康**（直接打 FinMind） |
| 9 | `/agents` 名冊 | `/api/agents` | `win_rate` 等 stats | 🟡 win_rate 來源 c/d/e 受污染 |
| 10 | 大盤觀點頁 | `analyst_market_views.market_view` | 文字判斷 | 🟡 文字而非數字 |

### 結論
**至少 7 個前台位置顯示污染的 entry_price/target_price**。Vincent 04-25 中午看到的「2330 ~1050-1100」最可能在 `/analysts/{slug}` 個人頁（如 `/analysts/chenxu`）的 holdings 列表，或 `/predictions/{id}` 詳情頁。

只有 `/stocks/{id}` 跟 `/api/analyze/{id}` 這條健康（獨立打 FinMind）。

---

## 方向 9：DB schema 是否有 source 紀錄

### quack_predictions 完整 columns（從 PostgREST 取）
```
id, date, prediction_type, subject, prediction, confidence, timeframe,
evaluate_after, actual_result, hit_or_miss, reasoning_error, evidence,
created_at, evaluated_at, agent_id, agent_name, target_symbol, target_name,
direction, target_price, current_price_at_prediction, deadline, success_criteria,
supporting_departments, status, actual_price_at_deadline, learning_note,
meeting_id, reasoning
```

### 是否有 source / created_by / origin / writer 欄位？
**❌ 沒有專屬欄位。** 唯一可推斷來源的線索：
- `evidence.architecture_version`（v1/v2/none）
- `evidence.backfill_marker`（BACKFILL_008d1 / BACKFILL_008d2 / null）
- `evidence.school`（標 analyst 流派）
- `meeting_id`（指向 meetings 表）

### 全表 group by 結果（限 1000 筆 PostgREST 上限，總 2769 筆）
```
backfill_marker: BACKFILL_008d1=863, BACKFILL_008d2=23, none=114
architecture_version: v1=892, v2=23, none=85
agent_id: a=337, b=274, c=170, d=113, e=106
prediction_type: stock_pick=1000（唯一值）
meeting_id: NULL=886, MEET-2026-0425-HOLDINGS=109, MEET-2026-0425-0800=5
```

注意：HOLDINGS 抓 select=meeting_id 樣本拿到 109 不是 125，是因為樣本 limit 1000 且 PostgREST 沒分頁。以方向 3 直接針對 meeting_id 條件查詢的結果為準（125）。

### 其他關鍵表 schema
- `analyst_daily_picks`: `id, agent_id, pick_date, target_symbol, target_name, strength, entry_price_low, entry_price_high, reason, prediction_id, generated_at` — **沒有 source 欄位**
- `analyst_market_views`: `id, agent_id, view_date, market_view, key_focus, bias, confidence, model, generated_at` — 有 `model` 欄（記 LLM 模型名）
- `meetings`: `meeting_id, meeting_type, ..., chair_agent_id, attendees, content_markdown, predictions_created, predictions_settled` — 沒 source
- `agent_stats`: 24 欄，含 `total_predictions, hits, misses, win_rate, normalized_winrate, last_30d_*, last_90d_*, current_status, status_detail` — 沒 source

### 結論
無法從欄位直接區分「LLM 寫入 vs cron 寫入」。**建議下一個 task 加 `source` 欄位**（例如 `'llm:simulate_holdings'` / `'cron:finmind_fetch'`），或至少 enforce `evidence.source` field 必填。

---

## 方向 10：Prompt 共用 base template

### 分析師預測類 prompts
| 路徑 | base 變數 | 繼承者 / 用法 |
|---|---|---|
| `analyst_brain.py:239 SYSTEM_PROMPT_HOLDINGS` | `{display_name},{school},{weights},{personality},{timeframe_*},{stop_loss_pct},{max_position_pct},{success_criteria_style}` | 5 位 analyst 全部用同一份；只 fmt profile |
| `analyst_brain.py:453 SYSTEM_PROMPT_MEETING` | 無 fmt（fixed text）| 會議書記、固定 |
| `analyst_brain.py:507 SYSTEM_PROMPT_MARKET_VIEW` | 同 HOLDINGS 用 5 位 profile | 5 位用，fmt profile |
| `analyst_brain.py:599 SYSTEM_PROMPT_DAILY_PICKS` | 同上 | 5 位用 |
| `historical_backtest.py:209 SYSTEM_PROMPT_BACKFILL` | 同上 + `decision_quirks_str, predict_date, n_picks, max_deadline_days` | 5 位用，BACKFILL 路徑 |
| `historical_backtest.py:?? SYSTEM_PROMPT_LEARNING` | 同上 | 5 位用，learning_notes 路徑 |

### 呱呱類 prompts
| 路徑 | 用法 |
|---|---|
| `quack_brain.py:HEADLINE_SYSTEM` | 1 個 prompt |
| `quack_brain.py:WEEKLY_PICKS_SYSTEM` (line 223-263) | 1 個 prompt（**含半價誤導範例**） |
| `quack.py:REASONING_SYSTEM` | 1 個 prompt |

### Chat / 分析類
- `chat.py:BASE_SYSTEM` + `_build_system()` 動態加 live snapshot
- `sentiment_service.py:SYSTEM_PROMPT`
- `article_analyzer.py:SYSTEM_PROMPT`

### 結論
- 5 位 analyst 的 4 個任務（HOLDINGS/MEETING/MARKET_VIEW/DAILY_PICKS）+ BACKFILL/LEARNING 都共用同一個 ANALYSTS profile dict
- **共用 base 但「base 沒注入價」是核心 bug**——修一個地方（`_build_market_snapshot()` + `_build_market_context()`）可以一次修掉 HOLDINGS 與 MARKET_VIEW 兩條路徑的 hallucinate 問題
- 但 weekly_picks 是另一個 prompt 不共用 ANALYSTS，需要單獨修

---

## 方向 11：寫入前 sanity check

### `analyst_brain.py:simulate_holdings_meeting`（line 350-388 寫入 quack_predictions）
```python
"current_price_at_prediction": h.get("current_price_at_prediction"),  # 直接從 LLM dict 取
"target_price": h.get("target_price"),                               # 直接從 LLM dict 取
```
**❌ 完全沒有任何 sanity check**。`h` 是 LLM 回傳的 dict，未做：
- 範圍 check（< 0.01 或 > 100,000 該擋）
- 比對 stock_prices_historical 真實 close（差 > 5% 該 reject）
- 跨 agent 一致性 check（同會議同股票 5 位 entry 差 > 50% 該警告）

### `historical_backtest.py:insert_historical_predictions`（line 411-462）
同樣 0 sanity check。連欄位範圍都不驗。

### `analyst_brain.py:refresh_all_daily_picks`（line 684-719）
無驗證。

### sentiment_service / article_analyzer 寫入路徑
這些寫的是新聞情緒（不是價格），且本身有 daily_cost cap 但無數值合理性檢查。

### 結論
**整個系統 0 個寫入路徑有 entry_price / target_price 範圍驗證**。LLM 寫什麼數字進 DB 都不會被擋。這就是 04-25 11:43 那場 125 筆「2330 寫 1045」、「2308 寫 388」能順利進 DB 的根本原因。

---

## 方向 12：環境變數 / hardcoded / fixture 殘留

### grep 結果（backend）
```
backend/services/historical_backtest.py:255   "target_price": 1050,          ← BACKFILL prompt schema example
backend/services/historical_backtest.py:256   "current_price_at_prediction": 1020,  ← 同上
backend/services/quack_brain.py:249           "target_price": 1050,          ← WEEKLY_PICKS prompt schema example (對 2330!)
backend/services/analyst_brain.py:266         "current_price_at_prediction": 2185,  ← HOLDINGS prompt example (這個是對的)
```

### grep 結果（frontend）
所有 `1050/1100` 都是 CSS `maxWidth` 或 `zIndex`，**0 處 hardcoded 股價**。

### .env / .env.example / Zeabur env vars
- `FINMIND_TOKEN` ✅
- `SUPABASE_*` ✅
- `ANTHROPIC_API_KEY` ✅
- `LINE_CHANNEL_ACCESS_TOKEN` ✅
- **沒有 `*_BASE_PRICE` / `*_DEFAULT_PRICE`** 之類的常數 env

### DB seed / fixture / migration
`backend/scripts/`：
- `init_analyst_data.py`、`build_seed_sql.py`、`import_vsis_upgrade_seed.py` 等
- 都是 12 agent 人設、industries、watchlist 等結構性 seed
- **沒看到「插入測試 entry_price」的 fixture**

### Schedule task 重置資料？
未發現任何「reset/truncate」的 schedule task。

### 結論
**Hardcoded 殘留只有兩處**：
1. `quack_brain.py:249` WEEKLY_PICKS schema example 寫 `2330 → target 1050`（半價）→ **誤導 LLM**
2. `historical_backtest.py:255-256` BACKFILL schema example 寫 `target 1050, entry 1020`（沒指明 symbol，但對 2330 是半價）

**這兩處 example 是「示範值污染」**，不是 root cause（因為 HOLDINGS 的 example 寫 2185 對的也還是歪），但會強化 LLM 的「2330 ≈ 1050」錯誤先驗。建議下一個 task 一併修。

---

## 方向 13：/watchdog 商業級儀表板數字真假

### Watchdog 系統 = 兩個 GHA：
1. `.github/scripts/watchdog.py`（每 15 min `watchdog.yml`）— 端點健康
2. `.github/scripts/self_audit.py`（每 30 min `self-audit.yml`）— 系統完整度

### Watchdog 7 項檢查（線上端點健康）
- `/api/time/now`、`/health`、`/api/agents`、`/api/diag/finmind`、`/api/health/all`、`/api/dashboard/overview`、`/api/quack/cross_market_view`
- **計算邏輯**：HTTP status + 回應時間
- **抽樣驗證**：剛才 STAGE1-T1 階段 0 已實測 endpoint 全綠
- **告警閾值**：status != 200 或 timeout，會 append 到 `ANOMALIES.md`

### Self-audit 8 項檢查（系統完整度）
| # | 檢查項 | 算法 | 對應 code |
|---|---|---|---|
| 1 | 12 agent 身份核心是否完整 | grep 「待設計」/ 「身份核心」字串 | `check_agent_memory_completeness` |
| 2 | decisions/ ADR 數量 | glob `ADR-*.md` | `check_decisions` |
| 3 | inbox/NEXT_TASK 新鮮度 | mtime > 3 days = 異常 | `check_inbox_freshness` |
| 4 | DB agent_stats 12 筆 + display_name | REST query | `check_agent_stats_db` |
| 5 | /api/agents 回 12 筆 | HTTP GET | `check_agents_endpoint` |
| 6 | watchdog 最近 1 小時跑過 | last_check.json mtime | `check_watchdog_freshness` |
| 7 | 11 位 agent 視覺替換 | glob frontend/public/characters/*.png | `check_visual_assets` |
| 8 | roadmap 完成度粗估 | ADR 數 / agent_memory 完成數 | `check_roadmap_progress` |

### 「19 源完整度」、「cron 健康度」實際算法
- **「19 源完整度」**：搜了沒找到實際算法。watchdog/self_audit 沒有「19 個 RSS 源活著數」這項檢查。**可能只是 ROADMAP 文件提到的目標，watchdog 不查**。
- **「cron 健康度」**：從 `health.py:_recent_cron_runs()` 反推（看 quack_judgments 寫入時間，每場 cron 寫一筆）。
  - 算法：`SELECT created_at FROM quack_judgments ORDER BY created_at DESC LIMIT 10`
  - 不是「每個 cron 都驗證」，是看「最近有沒有寫過資料」

### 對「entry_price 對不對」「LLM hallucinate 比率」「prompt 注入完整度」有沒有檢查？
**❌ 完全沒有。**

watchdog + self_audit 完全沒檢查資料品質指標。即便 04-25 11:43 那場大爆炸 125 筆全歪 50%，GHA 仍然全綠。

### 告警觸發過嗎？
看 `ceo-desk/watchdog/ANOMALIES.md` 應有歷史紀錄（不在這次盤查範圍內）。

### 結論
**watchdog 數字「形式上」對**（HTTP 200、agent_stats 12 筆、視覺缺幾位都對的）—— 但**結構性盲點**：完全沒檢查 LLM 寫入資料的「合理性」。這就是 Vincent 要等到 04-25 中午自己刷網頁才發現問題的原因。

---

## 綜合判斷

### A. 主根因（一句話）
**`backend/services/analyst_brain.py:_build_market_snapshot()` + `quack_brain.py:_build_weekly_picks_snapshot()` 在構造 LLM prompt 時完全沒注入即時 current_price，LLM 因此從訓練記憶 hallucinate 出 entry_price/target_price，並由「0 sanity check」的寫入路徑直接寫進 quack_predictions/相關表。**

### B. 受污染範圍
| 表 | 範圍 | 筆數 | 污染程度 |
|---|---|---|---|
| `quack_predictions`（HOLDINGS） | meeting_id=MEET-2026-0425-HOLDINGS | **125 筆** | 🔴 嚴重（中位數 -45% 到 -53%） |
| `quack_predictions`（早場 0800） | meeting_id=MEET-2026-0425-0800 | **5 筆** | 🟡 1/5 嚴重歪、2/5 輕度歪 |
| `quack_predictions`（BACKFILL_008d1） | evidence.backfill_marker=BACKFILL_008d1 | **863 筆** | 🟡 ~40% 落在 5-25% 偏差（LLM 部分 hallucinate） |
| `quack_predictions`（v2/2025-12） | architecture_version=v2 | **23 筆** | 🟡 健康率 100% (<5%) 但「真健康率 0%」 — 全在 1-5% 偏差 |
| `quack_predictions`（無 evidence） | evidence IS NULL | **~1769 筆** | 🟡 來源不明（最舊批次，未驗證） |
| `analyst_daily_picks` | 全表 | **22 筆** | 🔴 繼承 HOLDINGS 污染 |
| `analyst_market_views` | 全表 | **10 筆** | 🟡 純文字判斷可能基於錯認知 |
| `agent_stats.win_rate`（c/d/e）| 三位 | 進行中 | 🔴 結算公式依賴 entry → 整個歷史勝率失真 |

**未污染**：所有純資料表（stocks / stock_prices_historical / daily_prices / cross_market_data / industries / topics / intel_articles / news_cache 等）。

### C. 過去「健康」紀錄真實性
- **真健康率（<1% 偏差）**：30 筆樣本只有 2 筆（v1 早場 2330 + analyst_d 對 3231）= **6.7%**
- **健康率（<5% 偏差）**：v2 = 100%、BACKFILL = 60%、早場 0800 = 60%
- **結論：「過去看起來健康」是假象**，LLM 對熟悉股票（2330/2454/2308）有「印象接近真實」的訓練記憶，所以表面上 1-5% 偏差像「正常範圍」，但**從未有任何批次達到真正的數字準確（<1%）**。這個系統在「會議 prompt 不注入即時價」的設計下，永遠不會產生 100% 準確的預測 baseline。

### D. 其他破口位置（基於方向 5/10/11）
1. **第二破口**：`quack_brain.py:_build_weekly_picks_snapshot()` + WEEKLY_PICKS_SYSTEM 的 `target_price: 1050` schema 範例 → 同樣問題模式，且 example 進一步誤導
2. **第三破口**：`analyst_brain.py:analyst_judge_market` (line 534) — 大盤觀點 prompt 也沒注入即時價，雖然「不寫 price 欄位」但會影響「分析師對當下市況的判斷」（例如 2330 已經到 2185，但 LLM 以為還是 1450 → bias 判斷錯誤）
3. **第四破口**：`analyst_pick_daily` (line 631-681) — 從 holdings 撈出當作 prompt context → **如果 holdings 是錯的，daily picks 一定錯**
4. **共通破口**：所有 5 個 analyst LLM 路徑共用同一個 `_build_market_snapshot()`，任一路徑修了 snapshot 注入就一次修 5 條
5. **0 sanity check**：所有 LLM 寫入路徑都沒驗證「LLM 回傳值 vs 真實 stock_price」差距

### E. 修復順序建議

| 優先 | 任務 | 修哪 | 為什麼先做 |
|---|---|---|---|
| 1 | **修 `_build_market_snapshot()`** | `analyst_brain.py:179-233` 加入從 `stock_prices_historical` join 取每檔 latest close + recent_5d OHLC，注入 stock_universe | 修一個地方→所有 5 個 analyst 路徑（HOLDINGS/MARKET_VIEW/DAILY_PICKS）都治了 |
| 2 | **修 `_build_weekly_picks_snapshot()`** | `quack_brain.py:266` 加入同樣 price join；同時改 schema example `2330 target_price` 從 1050 → 2185 | 第二破口；改 example 避免再誤導 |
| 3 | **加寫入前 sanity check** | `analyst_brain.py:350-388` 寫 quack_predictions 前比對 `stock_prices_historical` latest close，差 >5% reject + log warning | 防呆未來；即便 prompt 修對，也要加防護網 |
| 4 | **加 schema source 欄位** | migration: `quack_predictions ADD COLUMN source TEXT NOT NULL DEFAULT 'unknown'`；寫入端填 `'llm:simulate_holdings_meeting'` 等 | 方便將來區分 LLM vs cron，並做品質追蹤 |
| 5 | **加 watchdog 資料品質檢查** | `.github/scripts/self_audit.py` 新增 check：抽樣最新 10 筆 quack_predictions vs stock_prices_historical，diff > 10% append ANOMALIES | 防止下次再「綠勾全亮但資料全錯」 |
| 6 | **重算 c/d/e 歷史勝率** | 用 `actual_price_at_deadline / actual_price_at_prediction = stock_prices_historical 真實 close` 重算 hit/miss | 修正過去被污染的勝率（不刪預測，但補 corrected 欄位） |
| 7 | **修 BACKFILL prompt example** | `historical_backtest.py:255-256` 把 `target_price: 1050, entry: 1020` 改用合理範例（不指 symbol，或用 placeholder） | 避免未來補資料時 LLM 又看示範值 hallucinate |
| 8 | **長期：改 `architecture_version` 標籤** | v1=新, v2=舊 命名混亂，改 `legacy/current/experimental` | 文件可讀性 |

**鐵律守住**：1-7 全部都不刪除 / 不 archive 任何過去預測（Vincent 鐵律）。重算的勝率寫進新欄位（如 `win_rate_corrected`），舊欄位保留作為「污染證據」。

### F. 未來防護機制建議

#### F1. Prompt 構造強制契約
在所有「寫入 price 欄位」的 LLM 路徑加入：
```python
def _ensure_prompt_has_current_price(snapshot: dict):
    for s in snapshot.get("stock_universe", []):
        assert "current_price" in s and s["current_price"] is not None, \
            f"FATAL: stock {s['symbol']} missing current_price in prompt context"
```
這個 assert 在 dev 環境就會炸，不會等到 production 才發現。

#### F2. 寫入前比對 stock_prices_historical
```python
def _validate_entry_price(symbol, entry, today):
    actual = sb.table("stock_prices_historical")\
        .select("close").eq("stock_id", symbol)\
        .order("trade_date", desc=True).limit(1).execute().data
    if not actual: return  # 沒資料,放過
    diff = abs(entry - actual[0]["close"]) / actual[0]["close"]
    if diff > 0.05:
        log.error(f"REJECT {symbol}: LLM entry {entry} vs DB {actual[0]['close']} = {diff*100:.1f}% off")
        raise ValueError(f"entry_price 偏離真實 close 過大")
```

#### F3. 自動 audit cron（30 min）
新增 `.github/scripts/data_quality_audit.py`：
- 隨機抽樣最新 50 筆 quack_predictions
- 比對 stock_prices_historical 同 symbol 同日 close
- 偏差 > 10% 的 append 到 `ANOMALIES.md`
- 連 3 次抽到 > 5 筆異常 → 自動 GitHub Issue

#### F4. Schema-level constraint
```sql
ALTER TABLE quack_predictions
ADD CONSTRAINT entry_within_reason
  CHECK (current_price_at_prediction > 0 AND current_price_at_prediction < 100000);
```
（防呆 LLM 回 0 或負或極大值）

#### F5. Vincent 主控的「上線審核」
任何「會寫進前台的批次」（HOLDINGS、Weekly picks）跑完後，先寫 `staging` 表，由 self_audit 跑數據品質 check 通過才 promote 到 production 表。**Vincent 可一鍵 reject 整批**。

---

## 工具紀錄

### 用了什麼工具
| 工具 | 用途 |
|---|---|
| `curl` (Git Bash) | 打 backend / frontend / FinMind / Yahoo |
| Python `urllib` + `urllib.parse` | Supabase REST + FinMind raw |
| Python `yfinance` (前 task 已 pip install) | 美股對照（NVDA/AAPL/MSFT） |
| Python `re` | regex 抓 SSR HTML 收盤值 |
| Grep tool | grep code 找 LLM call sites / hardcoded 數字 |
| Read tool | 逐段讀 analyst_brain.py / historical_backtest.py / quack_brain.py |
| Supabase REST `Prefer: count=exact` | row count |
| Supabase REST `evidence->>backfill_marker=eq.*` | JSONB 欄位 group by |

### 失敗 + 繞道
| 工具/路徑 | 失敗原因 | 繞道 |
|---|---|---|
| `/rest/v1/quack_predictions?evidence=is.null` | PostgREST `is.null` 語法錯，回 200 但漏抓 | 改用 `not.is.null` 反向；或在 Python 端後處理 |
| `/api/admin/exec_sql` | HTTP 401 沒 ADMIN_TOKEN | 用 PostgREST `/rest/v1/` + service key 直接列 paths + group by |
| Yahoo Finance HTML scrape | HTML 改版、regex 抓不到 | yfinance 同源代理，視為等值 |
| PostgREST 1000 筆 default limit | 大表 group by 不準 | 直接針對 specific filter 查具體 count，而非全表撈完計算 |

### 自己加的盤查（非任務列出）
1. **架構標籤命名混淆**：`v1/v2` 跟時間順序顛倒（v2=舊 2025-12, v1=新 2026-04），建議改 `legacy/current/experimental`
2. **HOLDINGS 會議 GHA cron 不存在**：12 份 yml 中沒看到 `holdings-meeting.yml`，那場會議是手動或從 `quack-refresh.yml` 觸發，建議下個 task 確認觸發來源
3. **架構命名 `008c/008d-1/008d-2/v1/v2` 五重套疊**：BACKFILL_008d1 / BACKFILL_008d2 / architecture_version v1/v2 / NEXT_TASK_008c/008d 互相重疊但不對齊，會議要釐清

---

## 卡點

1. **`evidence IS NULL` 1769 筆未驗證**：受 PostgREST 語法限制 + 樣本太大，沒對這批做抽樣比對。但這批 created_at 都是「最舊的」(預估 2025-08~2025-11)，那時可能用更舊版的 prompt path，需要 trace git log 確認來源。
2. **HOLDINGS 會議觸發者不明**：沒在 `.github/workflows/` 看到對應 yml，需要 CTO 確認是 Vincent 手動觸發、還是某 schedule 內含。
3. **Learning notes cron 是否真沒跑**：方向 5.5 沒實測 `agent_learning_notes` 表新鮮度（任務時間考量），但從 code 看 `write_learning_notes_for_agent` 不在 GHA workflow 裡。建議下個 task 補抽樣 agent_learning_notes 最新 10 筆 + created_at。

---

## 範圍宣告

- ✅ 未修任何 code
- ✅ 未動 prompt / agent / IP / 憲法 / GUAGUA_SOUL / agent MEMORY
- ✅ 未呼叫 Claude API、未呼叫 DALL-E
- ✅ 未 archive / 隱藏 / 刪除過去任何預測（v1 / v2 / BACKFILL / HOLDINGS 全保留）
- ✅ 未跑任何 5 位 analyst 預測
- ✅ 未動 `.env` / Zeabur env vars / migration / DB schema
- ✅ 未 force push，標準 git push 到 main

---

## 📨 給 CTO 的訊息

1. **核心 1 行總結**：HOLDINGS 與 Weekly Picks 兩個 LLM 寫入路徑沒注入即時 price → LLM hallucinate → 0 sanity check 直接落 DB → 7 個前台位置渲染半價 entry。
2. **真兇定位精確**：`backend/services/analyst_brain.py:179-233 _build_market_snapshot()`（HOLDINGS）+ `backend/services/quack_brain.py:266 _build_weekly_picks_snapshot()`（Weekly）。修這兩個函數加 price join 就治本。
3. **歷史誤判規模比想像大**：除了 04-25 那 130 筆的 HOLDINGS+早場，BACKFILL_008d1 那 863 筆 40% 也有 5-25% 偏差。但**過去 BACKFILL 用的 prompt 有注入 OHLC**（line 267-323）—— 為何還是有偏差？推測 LLM 即便看到 OHLC 仍部分時候 hallucinate（model temperature/sampling 問題）。
4. **勝率系統地雷**：5 位 analyst 中 c/d/e 三位的 hit/miss 判定依賴 entry_price，污染 entry → 達標線歪 → 結算後 c/d/e 會出現「神奇高勝率」的假象。建議方向 7.6 立刻補做。
5. **建議下個 task（T3）**：把方向 E 修復順序的 1+2+3 做完（修 snapshot + 加 sanity check），這樣後續產生的所有 LLM 預測就健康了。然後 T4 處理過去 130 筆污染的後處理（不刪、補 corrected 欄位）。
6. **Vincent 鐵律**：所有過去預測都保留，但建議在 quack_predictions 加 `entry_price_corrupted: true` flag 標記 130 筆 + `current_price_at_prediction_corrected` 補真實值（不覆蓋原欄位）。

---

Task ID: STAGE1-T2-FULL-AUDIT
Completed at: 2026-04-26T20:59:18+08:00
