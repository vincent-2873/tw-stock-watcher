System time: 2026-04-26T22:02:41.231451+08:00

# LLM 寫入路徑完整地圖（STAGE1-T2.6）

**任務範圍**：純診斷，未修任何 code、未呼叫 Claude API、未動任何過去預測。
**前置依賴**：STAGE1-T2 (commit `3ee8908`) + STAGE1-T2.5 (commit `b21acd5`)
**接手者**：Claude Code

⚠️ 重要規則（依任務指令）：
- 對 CTO 規劃的盤查方向被授權質疑（見最後 section）
- 不假定 STAGE1-T2 / T2.5 結論成立，全部重新對照 code 驗證
- 不美化結論，不省略卡點

---

## 完整 LLM 寫入路徑表（15 條鏈）

| # | 鏈名稱 | 觸發 | 函數位置 | Prompt 注入 price | 寫入表 | sanity check | 前台位置 | 風險 |
|---|---|---|---|---|---|---|---|---|
| 1 | **HOLDINGS** | `POST /api/analysts/simulate_meeting` (admin) + `scripts/init_analyst_data.py` | `analyst_brain.py:298` `_generate_holdings_for` | ❌ NO | `quack_predictions` + `meetings` | ❌ 0 | `/analysts/[slug]`、`/meetings`、`/meetings/[id]`、`/quack-journal`、`/predictions/[id]`、`/agents/_status_all` | 🔴 |
| 2 | **MEETING markdown** | 同 #1（內部呼叫） | `analyst_brain.py:494` `_generate_meeting_record` | ❌ NO | `meetings.content_markdown` | ❌ 0 | `/meetings/[id]` | 🟡 |
| 3 | **MARKET_VIEW** | `POST /api/analysts/refresh_market_views` (quack-refresh GHA cron 9 次/日) | `analyst_brain.py:554` `analyst_judge_market` | ❌ NO | `analyst_market_views` | ❌ 0 | `/analysts/[slug]` | 🟡 |
| 4 | **DAILY_PICKS** | `POST /api/analysts/refresh_daily_picks` (quack-refresh GHA cron 平日 08:00) | `analyst_brain.py:664` `analyst_pick_daily` | ❌ NO（但**注入 HOLDINGS 已寫 DB 的髒 price**） | `analyst_daily_picks` | ❌ 0 | `/analysts/[slug]/daily_picks` | 🔴 |
| 5 | **BACKFILL** | `scripts/run_008d2.py` / `run_one_analyst.py` / `run_historical_backtest.py`（手動） | `historical_backtest.py:375` `generate_predictions_for_day` | ✅ YES（current_price + 5d OHLC） | `quack_predictions` | ❌ 0 | `/quack-journal`、`/analysts/[slug]`、`/predictions/[id]` | 🟡 |
| 6 | **LEARNING** | `write_learning_notes_for_agent`（admin / script 手動） | `historical_backtest.py:746` `generate_learning_notes_batch` | ❌ NO（注入歷史 missed 詳情） | `agent_learning_notes` | ❌ 0 | `/predictions/[id]`、`/analysts/[slug]` | 🟢 |
| 7 | **HEADLINE** | `GET /api/quack/headline?force=true` (quack-refresh cron 9 次/日) | `quack_brain.py:191` `quack_judge_headline` | ❌ NO（注入 topics + news + people） | `quack_judgments`(headline) | ❌ 0 | `/`（hero 副標 via `/api/hero/headline`）、`/api/quack/headline` | 🟢 |
| 8 | **WEEKLY_PICKS** | `GET /api/quack/weekly_picks?force=true` (quack-refresh cron 部分時段) | `quack_brain.py:363` `quack_judge_weekly_picks` | ❌ NO（schema example 寫死 2330=1050） | `quack_judgments`(weekly_picks) | ❌ 0 | `/`、`/weekly_picks` | 🔴 |
| 9 | **TOPIC_REFRESH** | `POST /api/quack/homework/refresh` (quack-refresh cron 9 次/日) | `quack_brain.py:474` `quack_refresh_topics` | ❌ NO（注入 topics + 3 天新聞） | `topics` (heat_score, heat_trend, ai_summary) | ⚠️ 部分（heat_score 變化 ±20 系統 prompt 寫死規則） | `/`、`/pond`、`/pond/[topicId]` | 🟡 |
| 10 | **REASONING** | `GET /api/quack/reasoning?force=true` (admin 手動) | `routes/quack.py:209` `_claude_reasoning` | ❌ NO | `quack_reasoning` | ❌ 0 | （前台未確認；`/api/quack/reasoning` 端點存在） | 🟢 |
| 11 | **ARTICLE_ANALYZE** | `POST /api/intel/cron` (intel-cron GHA 每 15 分鐘) | `article_analyzer.py:197` `ArticleAnalyzer.run_batch` | ❌ NO（只注入文章 title + raw_content） | `intel_articles.ai_*` | ❌ 0 | `/intel`、`/intel/[id]`、`/news`、`/`（via `/api/news/headlines`） | 🟡 |
| 12 | **NEWS_CLASSIFY** | `/news/recent`、`/news/headlines`（即時 API，使用者觸發 + Hero） | `sentiment_service.py:132` `classify_news_batch` | ❌ NO（haiku model） | **不寫 DB** | ❌ 0 | `/`、`/news`（即時） | 🟢 |
| 13 | **CHAT** | `POST /api/chat`（使用者主動觸發） | `chat.py:296+305` SSE stream | ✅ YES（`_fetch_live_stock_snapshot` 注入即時 close + LIVE 區塊） | **不寫 DB** | N/A（注入有保護） | `/chat`、`/stocks/[id]` 底部 ChatPanel | 🟢 |
| 14 | **ANALYZE_CATALYST** | `GET /api/analyze/{stock_id}?skip_ai=False` | `catalyst.py:37` → `ai_service.py:109` `analyze_catalyst` | ❌ NO（注入 news_summary） | **不寫 DB**（DimScore in-memory） | ❌ 0 | 線上 default `skipAi=true`，前台未實際觸發；scoring_worker 強制 `skip_ai=True` 不跑 | 🟢 |
| 15 | **BULL_BEAR** | `GET /api/analyze/{stock_id}?skip_ai=False`（且 score>=40） | `decision_engine.py:178` → `ai_service.py:109` `bull_bear_case` | ❌ NO（注入文字 summary） | **不寫 DB**（AnalysisResult in-memory） | ❌ 0 | 同 #14 | 🟢 |

**LLM call site 計數確認**：直接 `messages.create` 或 `messages.stream` = 14（chat.py:305 SSE stream 是其中之一），加上 `ai_service.py:109` 包裝層被 catalyst.py + decision_engine.py 用 = **15 個邏輯路徑**。STAGE1-T2 報的 15 個正確，但 ai_service:109 entry 同時被兩條邏輯共用。

**會寫 DB 的鏈** = #1–#11 = **11 條**
**不寫 DB**（即時 API response）= #12–#15 = 4 條

---

## 各盤查項詳細結果

### 盤查項 1：所有 LLM call sites + 證據

#### 1.1 `messages.create` / `messages.stream` 直接呼叫（14 處）

```
backend/services/analyst_brain.py:298   _generate_holdings_for       (HOLDINGS)
backend/services/analyst_brain.py:494   _generate_meeting_record      (MEETING)
backend/services/analyst_brain.py:554   analyst_judge_market          (MARKET_VIEW)
backend/services/analyst_brain.py:664   analyst_pick_daily            (DAILY_PICKS)
backend/services/historical_backtest.py:375  generate_predictions_for_day (BACKFILL)
backend/services/historical_backtest.py:746  generate_learning_notes_batch (LEARNING)
backend/services/quack_brain.py:191     quack_judge_headline          (HEADLINE)
backend/services/quack_brain.py:363     quack_judge_weekly_picks      (WEEKLY_PICKS)
backend/services/quack_brain.py:474     quack_refresh_topics          (TOPIC_REFRESH)
backend/routes/quack.py:209             _claude_reasoning             (REASONING)
backend/services/article_analyzer.py:197 ArticleAnalyzer.run_batch     (ARTICLE_ANALYZE)
backend/services/sentiment_service.py:132 classify_news_batch          (NEWS_CLASSIFY)
backend/routes/chat.py:305              chat() event_stream            (CHAT)
backend/services/ai_service.py:109      AIService.complete             (通用包裝層)
```

#### 1.2 經 `ai_service` 間接呼叫（2 處）

```
backend/analyzers/catalyst.py:37       → ai.analyze_catalyst() → ai_service:109
backend/core/decision_engine.py:178    → ai.bull_bear_case()   → ai_service:109
```

⚠️ **質疑 STAGE1-T2 報的「15 個 LLM call sites」**：
- 數字正確，但 T2 沒區分「直接 entry point」和「邏輯路徑」。`ai_service.py:109` 是 1 個 entry，但被兩條邏輯（catalyst, bull_bear）共用，所以實際**邏輯路徑** = 14 直接 + 2 間接（共用 1 entry）= **15 邏輯路徑、14 唯一 entry point**。修一個 `ai_service:109` 同時影響 catalyst 跟 bull_bear。
- T2 把 `ai_service.py:109` 標「視呼叫者而定 / 視呼叫者而定 / 🟡 可能被污染」是合理的，但漏了一點：`scoring_worker` 強制 `skip_ai=True`，所以 catalyst 在生產環境的 cron 路徑**完全不會跑 LLM**，line `ai_service:109` 在生產 cron 路徑是 dead code（除非 admin 手動打 `/api/analyze?skip_ai=false`）。

#### 1.3 確認非 LLM 但易誤判的 call sites

- `backend/services/people_extractor.py:88` — **regex 別名匹配**，0 LLM 呼叫
- `backend/services/scoring_worker.py:58` `score_one` — `engine.analyze(stock_id, skip_ai=True)`，**強制跳過 LLM**
- `backend/workflows/morning_report.py:65` — default `skip_ai=True`
- `backend/workflows/closing_report.py:103` — default `use_ai=False`
- `backend/workflows/day_trade_pick.py / intraday_monitor.py / us_market.py` — **0 LLM 呼叫**
- `routes/news.py:91, 136` `/news/recent` `/news/headlines` 觸發 sentiment_service 但結果**不寫 DB**

#### 1.4 重新計數確認

| 類型 | 數量 |
|---|---|
| 直接 `messages.create` / `messages.stream` | 14 |
| 經 ai_service 間接 | +2（共用 1 entry） |
| **唯一 LLM API entry point** | **14** |
| **邏輯路徑（含分流）** | **15** |
| **會寫 DB 的邏輯路徑** | **11** |
| **不寫 DB（即時 API / 內存）** | **4** |

---

### 盤查項 2：每條鏈的 prompt 構造方式

#### 是否注入「真實 stock_price.close」一覽

| # | 鏈 | 注入個股 close | 機制 | 機制可靠度 |
|---|---|---|---|---|
| 1 | HOLDINGS | ❌ NO | `_build_market_snapshot` SELECT stocks 表（無 close 欄位） | N/A — 結構性缺失 |
| 2 | MEETING | ❌ NO | 寫文字會議記錄不需要 price | OK（不該注入） |
| 3 | MARKET_VIEW | ❌ NO | snapshot 同 HOLDINGS（共用 `_build_market_snapshot`） | 寫文字觀點，但若提到具體 price 會錯 |
| 4 | DAILY_PICKS | ❌ NO | 注入 SELECT 自己 active 持倉的 `current_price_at_prediction` `target_price`（**那是 LLM 上次寫的 price**） | 🔴 **次級污染**：吃 HOLDINGS 髒 price |
| 5 | BACKFILL | ✅ YES | `_build_market_context` 從 `stock_prices_historical` 撈 5 日 OHLC + latest_close | T2.5 證實有效（p50 偏差 2.89%） |
| 6 | LEARNING | ❌ NO（注入歷史結算 price） | 從 `quack_predictions` 撈 missed 預測，含 `target_price` `current_price` `actual_close` | OK — 寫反省，不影響新預測 |
| 7 | HEADLINE | ❌ NO | snapshot = topics + news + people_statements，無個股 | OK — 寫水況觀點 |
| 8 | WEEKLY_PICKS | ❌ NO | snapshot = stocks(score/tier/breakdown) + topics，無 close | 🔴 schema example 寫死 `2330: target=1050, stop_loss=990`（line 249-252） |
| 9 | TOPIC_REFRESH | ❌ NO | snapshot = topics + 3 天新聞 | OK — 寫熱度，不寫個股 price |
| 10 | REASONING | ❌ NO | snapshot = topics_top5 + news_top5 | OK — 寫三層推論文字 |
| 11 | ARTICLE_ANALYZE | ❌ NO | 只注入文章 title + raw_content（4000 char 截斷） | 但 LLM 可能輸出含 price 的 affected_stocks（風險未實證） |
| 12 | NEWS_CLASSIFY | ❌ NO | 只注入 title + description | OK — 不寫 DB |
| 13 | CHAT | ✅ YES | `_fetch_live_stock_snapshot` 即時 FinMind 抓 latest_close + 5 日 OHLC + 三大法人 + 融資；**system prompt 含「LIVE 沒給 → 回需要即時查詢」鐵律** | 🟢 **設計上最完整防線** |
| 14 | ANALYZE_CATALYST | ❌ NO | 注入 news_summary 文字 | OK — 寫題材布林分數，不注入 price |
| 15 | BULL_BEAR | ❌ NO | 注入文字 `_build_analysis_summary`（含 score/breakdown 但**無具體 price**） | OK — 寫文字論點 |

#### 對 STAGE1-T2.5 結論「LLM 訓練記憶 > hardcoded 影響」我的看法

⚠️ **同意但補強**：

T2.5 驗證項 5 顯示 LLM 不帶任何 example 也 5/5 回 1050，「訓練記憶」是主因確證。我**重看 code 後發現 T2.5 漏談的點**：
- `analyst_brain.py:266` HOLDINGS schema example 寫的是 **2185**（真實 04-24 close），不是 1050
- HOLDINGS 那場 2330 寫的 5 筆 entry: `[1028, 1045, 1095, 2180, 2185]` — 其中 2 筆（2180, 2185）跟 example 提供的 2185 一致
- 也就是 a/d/e 寫的 1028/1045/1095（那 3 筆 ≈ 1050）跟 example 提供的 2185 **差距 2 倍**，例子根本沒帶到他們

**結論**：HOLDINGS 那場 5 筆中 b/c（2180/2185）很可能是「**抄 schema example**」、a/d/e（1028/1045/1095）是「**訓練記憶**」。兩個機制同時存在於同一場會議。

`quack_brain.py:249` schema example 寫死 1050 → 對 WEEKLY_PICKS 那條鏈仍可能有誤導效應（雖然 LLM 寫 picks 列表時，每檔不一定都是 2330，所以影響面比 HOLDINGS 廣泛但分散）

#### 隱藏注入點驗證

✅ 全 codebase 無 langchain / llamaindex（grep 0 結果）
✅ 無 middleware / decorator / interceptor 對 LLM 呼叫做 prompt 改寫
✅ 各條鏈的 system / user prompt 在送進 `messages.create` 前都是已成形 string
✅ 無第三方 prompt cache（`anthropic` SDK 預設 prompt cache 是 server-side 的 ephemeral cache，不影響 prompt 內容）

---

### 盤查項 3：每條鏈寫入 DB 表 + sanity check

#### 寫入細節

| # | 鏈 | 寫入表 | 寫入位置 | sanity check 內容 |
|---|---|---|---|---|
| 1 | HOLDINGS | `quack_predictions`（125 筆/場）+ `meetings`（1 筆）+ `agent_stats.total_predictions += 25` | `analyst_brain.py:416, 410, 425` | **僅 `len(holdings) == 25`**（line 308-309）。0 個 price 範圍檢查 |
| 2 | MEETING | `meetings.content_markdown` | `analyst_brain.py:410`（同上 upsert） | 0 |
| 3 | MARKET_VIEW | `analyst_market_views`（upsert by agent_id+view_date） | `analyst_brain.py:588` | 0 |
| 4 | DAILY_PICKS | `analyst_daily_picks`（先 DELETE 當日再 INSERT） | `analyst_brain.py:689 + 714` | **僅 `3 <= len(picks) <= 5`**（line 675-679）。0 個 price 範圍檢查 |
| 5 | BACKFILL | `quack_predictions`（N 筆/批）+ evidence.backfill_marker | `historical_backtest.py:468` | **僅 `len(preds) > 0`** + retry [3,8,20,45,90]。0 個 price 範圍檢查 |
| 6 | LEARNING | `agent_learning_notes` + 標記原 `quack_predictions.evidence.learning_note_done=True` | `historical_backtest.py:794, 803` | 0 |
| 7 | HEADLINE | `quack_judgments`(judgment_type='headline', judgment_date) upsert | `quack_brain.py:545` save_judgment | 0（截斷字串長度但不檢查內容） |
| 8 | WEEKLY_PICKS | `quack_judgments`(judgment_type='weekly_picks') upsert | 同上 | **僅 `len(picks) == 10`**（line 379-381）。0 個 price 範圍檢查 |
| 9 | TOPIC_REFRESH | `topics`（heat_score, heat_trend, ai_summary, updated_at） | `quack_brain.py:499` update each | system prompt 規定 ±20 變化，但 **code 沒檢查**，全靠 LLM 守紀律 |
| 10 | REASONING | `quack_reasoning`（upsert by date） | `quack.py:149` | 0 |
| 11 | ARTICLE_ANALYZE | `intel_articles.ai_*`（11 個欄位 update by id） | `article_analyzer.py:213` | 0 |

**結論**：**11 條會寫 DB 的鏈，0 條有「price 範圍 sanity check」**。最強的 check 只有 `len()` 數量檢查。

#### Cross check：同一表被多條鏈寫入

| 表 | 寫入鏈 |
|---|---|
| `quack_predictions` | **HOLDINGS、BACKFILL、LEARNING(update only)**（**3 條鏈共用**） |
| `meetings` | HOLDINGS（meeting_id + content_markdown） |
| `analyst_market_views` | MARKET_VIEW |
| `analyst_daily_picks` | DAILY_PICKS |
| `quack_judgments` | HEADLINE（judgment_type='headline'）+ WEEKLY_PICKS（judgment_type='weekly_picks'）— 同表不同 type，靠 `judgment_type` 區分 |
| `topics` | TOPIC_REFRESH |
| `quack_reasoning` | REASONING |
| `intel_articles` | ARTICLE_ANALYZE（update ai_* 欄位） |
| `agent_learning_notes` | LEARNING |
| `agent_stats` | HOLDINGS（直接 +25） |

**最危險的混用**：`quack_predictions` 同時被 HOLDINGS（無 price 注入，70% 偏差）跟 BACKFILL（有 price 注入，2.89% 偏差）寫入。兩者都寫到同一張表，前台 query 看到的是兩種品質的混合資料。

---

### 盤查項 4：每條鏈影響哪些前台位置

#### 完整下游影響地圖

```
quack_predictions（HOLDINGS + BACKFILL 寫）
  └─→ /api/quack/predictions      → /quack-journal           [呱呱日誌頁]
  └─→ /api/quack/predictions/{id} → /predictions/[id]        [預測詳情頁]
  └─→ /api/analysts/{slug}        → /analysts/[slug]         [分析師頁 holdings 區]
  └─→ /api/analysts/{slug}/holdings → /analysts/[slug]
  └─→ /api/analysts/{slug}/winrate_timeline → /analysts/[slug] [勝率時序]
  └─→ /api/agents/_status_all     → /agents（office）        [12 位 agent 動態]
  └─→ /api/agents/{agent_id}/status → /agents/[id]
  └─→ /api/analysts (列表)        → /analysts                [全分析師列表 hit_rate 計算]

meetings.content_markdown（MEETING 寫）
  └─→ /api/meetings               → /meetings                [會議列表]
  └─→ /api/meetings/{id}          → /meetings/[id]           [單場會議完整 markdown]

analyst_market_views（MARKET_VIEW 寫）
  └─→ /api/analysts/{slug}        → /analysts/[slug]         [分析師大盤觀點區]

analyst_daily_picks（DAILY_PICKS 寫，且吃 HOLDINGS 髒 price）
  └─→ /api/analysts/{slug}/daily_picks → /analysts/[slug]   [分析師每日推薦區]

quack_judgments(headline)（HEADLINE 寫）
  └─→ /api/quack/headline         → /                       [hero 副標 via /api/hero/headline]
  └─→ /api/hero/headline (中介)   → /                       [所有 hero 副標時段]

quack_judgments(weekly_picks)（WEEKLY_PICKS 寫）
  └─→ /api/quack/weekly_picks     → /weekly_picks + /       [呱呱挑 10 檔頁 + 首頁]

topics（TOPIC_REFRESH 寫）
  └─→ /api/topics                 → /、/pond                 [首頁題材熱度區 + 池塘列表]
  └─→ /api/topics/{slug}          → /pond/[topicId]          [單題材深度頁]

intel_articles.ai_*（ARTICLE_ANALYZE 寫）
  └─→ /api/intel/articles         → /intel + /news           [情報庫 + 新聞列表]
  └─→ /api/intel/articles/{id}    → /intel/[id]              [文章詳情]
  └─→ /api/news/headlines         → /                        [首頁今日重點新聞]

agent_learning_notes（LEARNING 寫）
  └─→ /api/predictions/{id} (含 learning_notes) → /predictions/[id]
  └─→ /api/analysts/{slug} (含 learning_notes) → /analysts/[slug]

quack_reasoning（REASONING 寫）
  └─→ /api/quack/reasoning        → （前台未確認有頁面 fetch）
```

#### 資料品質過濾（前台是否有 sanity filter）

我搜過前台 + backend route，**沒找到**：
- 「只顯示偏差 < X% 的資料」過濾
- 「skip 異常 price」過濾
- 任何 quality gate

```bash
# grep 結果:0
grep -rn "abs_diff\|valid_price\|price_sane\|filter_outlier" backend/ frontend/src/
```

意味著 **DB 寫進去的 price 多離譜，前台就照顯示**。前台甚至會用這個錯 price 算「該檔的命中率」（hit_or_miss 對照 actual_price_at_deadline）。

#### 污染下游影響地圖（量化）

- `quack_predictions` 被污染 → 影響至少 **8 個前台 API endpoint** + **6 個前台頁面**
- `meetings.content_markdown` 被污染 → 影響 **2 個前台頁面**
- `analyst_daily_picks` 被污染（吃 HOLDINGS 髒 price 算 entry_price）→ 影響 **1 個前台頁面，但這是「具體進場區間」最敏感的 UX**
- `quack_judgments(weekly_picks)` 被污染 → 影響 **2 個前台位置**（首頁 + /weekly_picks）

---

### 盤查項 5：風險分級 + 修復順序建議

#### 風險矩陣（綜合「破口存在」+「實證污染」+「影響面」）

| # | 鏈 | 破口存在 | 實證污染 | 影響面（前台位置） | 流量 / 寫入頻率 | 風險 |
|---|---|---|---|---|---|---|
| 1 | HOLDINGS | ✅ 無 price 注入、無 sanity | ✅ T2.5 證實 p50=70%、78% 樣本 ≥ 25% | 6 個前台頁、3 條 API | 1 場 = 125 筆寫入 + 5 LLM call | 🔴 |
| 4 | DAILY_PICKS | ✅ 吃 HOLDINGS 髒 price 推 entry_low/high | ⚠️ 未實證但**結構上必然污染**（吃上一條） | 1 個前台頁（每日推薦） | 平日 08:00 cron 5 LLM call | 🔴 |
| 8 | WEEKLY_PICKS | ✅ schema example 寫死 1050、無 sanity | ⚠️ 未實證偏差，但 LLM 直接給 target_price + stop_loss | 2 個前台位置（首頁 + 專屬頁） | quack-refresh 部分時段 cron | 🔴 |
| 5 | BACKFILL | ⚠️ 已注入 price 但 28% 樣本偏差 ≥ 5% | ⚠️ T2.5 證實偏差遠小（p50=2.89%）但仍非零 | 3 個前台頁 | 手動跑（run_008d2 / run_one_analyst） | 🟡 |
| 9 | TOPIC_REFRESH | ⚠️ heat_score ±20 規則靠 LLM 自律、code 無檢查 | ⚠️ 未實證 | 3 個前台頁（首頁 + /pond） | quack-refresh cron 9 次/日 | 🟡 |
| 11 | ARTICLE_ANALYZE | ⚠️ affected_stocks 欄位 LLM 自填、無對照 | ⚠️ 未實證 | 4 個前台頁（情報 + 新聞 + 首頁） | intel-cron 每 15 分（一批 15-20 篇） | 🟡 |
| 2 | MEETING | ⚠️ 文字內容靠 LLM 自律 | ⚠️ 未實證 | 2 個前台頁 | 同 #1（每場 1 次） | 🟡 |
| 3 | MARKET_VIEW | ⚠️ 文字觀點靠 LLM 自律、可能提到錯 price | ⚠️ 未實證 | 1 個前台頁 | quack-refresh cron 9 次/日 × 5 位 | 🟡 |
| 6 | LEARNING | ❌ 寫文字反省，不影響新預測 | 不適用 | 2 個前台頁 | 手動觸發 | 🟢 |
| 7 | HEADLINE | ❌ 寫水況觀點，無 price | 不適用 | 1 個前台位置（hero） | quack-refresh cron 9 次/日 | 🟢 |
| 10 | REASONING | ❌ 寫三層推論文字 | 不適用 | 0（前台未 fetch） | admin 手動 | 🟢 |
| 12 | NEWS_CLASSIFY | ❌ 不寫 DB | 不適用 | 即時 | /news/* 即時 | 🟢 |
| 13 | CHAT | ❌ 注入 LIVE 即時 close + 5 日 OHLC | 不適用 | 即時 | 使用者觸發 | 🟢 |
| 14 | ANALYZE_CATALYST | ❌ 不寫 DB；scoring_worker 強制 skip_ai=True 不跑 | 不適用 | 0（生產實際不觸發） | 即時，預設 skipAi=true | 🟢 |
| 15 | BULL_BEAR | 同 #14 | 不適用 | 0 | 同 #14 | 🟢 |

#### 整體系統 LLM 寫入健康度評估

- **3 條 🔴 高風險、5 條 🟡 中風險、7 條 🟢 低風險**
- 11 條會寫 DB 的鏈中，**3 條（27%）有實證污染或結構性破口**
- 寫入 `quack_predictions` 的兩條鏈品質落差 24×（HOLDINGS p50=70% vs BACKFILL p50=2.89%）
- **0 條鏈有 price sanity check**——這是系統性結構缺陷，不是某條鏈的個案
- **11 條鏈中只有 1 條（CHAT）的注入機制有 spec 上的「LIVE 鐵律」防線**——這也只發生在不寫 DB 那條

#### 修復順序建議（工程觀點，非決策）

**P0 — 立刻**：
1. **修 HOLDINGS（#1）** — 最高優先：
   - 方案 A：讓 `_build_market_snapshot` 也注入 `current_price` + `recent_5d` OHLC（學 BACKFILL `_build_market_context`）
   - 方案 B：在 `_generate_holdings_for` line 308 後 `insert` 前加 sanity check（拒絕 abs_diff > 5% 的 entry，要求 LLM 重做）
   - **建議組合**：A + B 雙保險（A 處理機制、B 處理 LLM 偶發偏離）
   - 修了之後 #4 DAILY_PICKS 自動修
2. **修 WEEKLY_PICKS（#8）**：
   - 改 `quack_brain.py:249` schema example 用變動值（從 stocks 表抓 top 1 當下 price）
   - snapshot 注入 current_price 給每檔
   - insert 前 sanity check `target_price` vs `current_price` 偏差合理性

**P1 — 隨後**：
3. **加 `quack_predictions.insert` 的中央 sanity check**：
   - 在 supabase RLS layer 或 db trigger 層級 reject `|target_price - last_close| / last_close > 5%` 的 row
   - 一次擋掉 HOLDINGS、BACKFILL 兩條鏈所有寫入
4. **修 DAILY_PICKS（#4）的次級污染**：
   - 即使 #1 修了，DAILY_PICKS 的 prompt 仍應**獨立抓 LIVE close** 而非用 holdings 表的歷史 LLM-written `current_price_at_prediction`

**P2 — 後續**：
5. BACKFILL 28% 偏差案例研究（採樣高偏差筆做 case study，看 LLM 為何忽略 prompt 給的 OHLC）
6. TOPIC_REFRESH 的 ±20 規則加 code-level 檢查（不靠 LLM 自律）
7. ARTICLE_ANALYZE 的 `affected_stocks` 加股號合法性檢查（reject 不存在 stocks 表的代號）

**P3 — 觀察期**：
8. MEETING / MARKET_VIEW / HEADLINE / REASONING 等文字觀點鏈，加「禁止提具體 price 數字」prompt 約束 + post-process regex 抓出文字中提到的 4 碼數字 reject

---

### 盤查項 6：CTO 規劃漏洞 + 補充發現

#### 6.1 重試 / Fallback / Cache / 批次寫入

**重試機制盤點**：

| 鏈 | 有重試？ | 詳情 |
|---|---|---|
| HOLDINGS | ❌ 無 | 直接 raise（line 309 + 336 raise Exception 中斷整場會議） |
| BACKFILL | ✅ 5 次 | exponential backoff `[3,8,20,45,90]`（line 371-396），catch `httpx.RemoteProtocolError`、`anthropic.APIConnectionError`、`json.JSONDecodeError`、`ValueError` |
| MEETING / MARKET_VIEW / DAILY_PICKS | ❌ 無 | 失敗就 raise（refresh_all_market_views / refresh_all_daily_picks 在外層 catch 但只 log） |
| HEADLINE / WEEKLY_PICKS / TOPIC_REFRESH | ❌ 無 | 失敗 RuntimeError |
| ARTICLE_ANALYZE | ⚠️ 跳過 | 該篇失敗 log 後跳下一篇（line 218-221），整批不掛掉但失敗篇 article 標 ai_analyzed_at=null 永遠不會被跑 |
| LEARNING | ❌ 無 | raise |
| NEWS_CLASSIFY | ⚠️ 跳過 | catch + 回 empty_result（line 175-179） |
| CHAT | ⚠️ 部分 | stream 失敗 yield error event（line 349-352） |

**Fallback 邏輯**：
- ai_service.py:131 `complete()` 失敗回 `AIResult("", 0, 0, 0, ...)` — **不寫 DB**（catalyst.py 的 caller 會處理 default）
- ✅ 沒看到任何 fallback 寫髒資料的 case

**LLM Cache**：
- `sentiment_service.py` 自建 in-memory cache，TTL 6 小時，key = sha1(title+description)
  - 風險:**若同一篇新聞第一次分類錯（譬如錯把利多當利空），6 小時內每次抓都拿到錯的**。但只是 sentiment 不污染股價
- `quack_judgments` 表 24h 「日級 cache」（同日同 type 不重算）
  - 風險：**LLM 寫錯一次，整天前台都看到錯的**。但 cron 每天會重來
- 無 langchain / 無 llamaindex / 無 redis cache（grep 0 結果）

**批次寫入失敗處理**：
- `analyst_brain.py:412-416` HOLDINGS：`BATCH=30`，**chunk 失敗整批 raise**（沒 try/except）→ 那場會議部分 LLM call 已花、寫不進 DB → `agent_stats.total_predictions += 25` line 425 仍會被執行，造成 **stat 跟實際資料不一致**
- `historical_backtest.py:466-471` BACKFILL：BATCH=30 同上
- `analyst_daily_picks` line 689 先 DELETE 再 INSERT — 若 INSERT 失敗，**會把當日 daily_picks 全清空**（DELETE 無 transaction 保護）

#### 6.2 重看 STAGE1-T2 / T2.5 後新發現的疑點

**疑點 A：T2.5 對 hardcoded 1050 影響的結論需要修正**

T2.5 結論「LLM 訓練記憶 > hardcoded 影響」是對的，但漏談了：
- HOLDINGS schema example 寫的是 **2185**（非 1050），但 a/d/e 寫的 1028/1045/1095 仍 ≈ 1050
- 同場 b/c 寫 2180/2185 等於 example 值
- 同一場會議 5 筆 → 2 種機制並存：「example 抄寫」+「訓練記憶」
- → 修 schema example 至少能讓 b/c 那種「抄 example」案例消失，**修法本身不純無效**

**疑點 B：`quack_judgments(weekly_picks)` 的 LLM 預測「永遠不被結算」**

- WEEKLY_PICKS LLM 輸出含 `target_price` + `stop_loss` + `confidence` 但**只寫 `quack_judgments` 不寫 `quack_predictions`**
- 也就是呱呱挑的 10 檔**不會被結算 hit/miss、不會進命中率**
- 但前台首頁顯示的「呱呱挑股」會用到這個資料 → 使用者看到的「呱呱建議」實際**沒被追蹤**
- 跟憲法 Section 5「每次預測都會公開給使用者看，使用者看得到呱呱的歷史命中率」**牴觸**

**疑點 C：`agent_stats.total_predictions += 25` 跟實際 insert 數不一致風險**

- `analyst_brain.py:425` 不管 batch insert 成功幾筆，每位 agent 都 +25
- 若 Supabase 寫入失敗（網路 / FK / 唯一性衝突），stat 失真
- T2 / T2.5 沒談過

**疑點 D：scoring_worker 強制 skip_ai=True，意味線上 catalyst 永遠是 0 分**

- `backend/services/scoring_worker.py:64` 寫死 `skip_ai=True`
- decision_engine.py:130-134 在 skip_ai=True 時 catalyst_score = `DimScore(score=0, ...)`
- 也就是 stocks.score_breakdown 的 catalyst 永遠 0
- total_score 滿分理論 = 95（spec），實際永遠少 20 分（catalyst 那塊）
- **這影響 WEEKLY_PICKS 跟 HOLDINGS 的 universe 選股**（兩者都用 stocks.current_score 排序）
- T2 提到「Bug #4 題材熱度假資料」可能跟這個有關，但這 task 的範圍外

#### 6.3 我看 codebase 後「CTO 沒問但很重要」的觀察

**觀察 1：憲法 vs 實作不一致 — `prediction_id` 欄位**

- 憲法 Section 9.1.1 寫 `prediction_id VARCHAR(50) PRIMARY KEY`
- analyst_brain.py:170 `_pred_id` 函數產 `PRED-YYYY-MMDD-A-001` 格式
- 但 line 351 `pid = _pred_id(...)` 之後 **`pid` 沒被寫進 inserted_predictions row**（line 361-386 row dict 無 prediction_id 欄位）
- 推測 `quack_predictions` 表用自增 `id` 當 PK，憲法的 `prediction_id` 設計**沒落地**
- 影響：CTO 規劃的「PRED-YYYY-MMDD-A-001」對外可讀 ID **不存在**

**觀察 2：`hit_or_miss` 跟 `status` 雙寫但前台用法不一致**

- `historical_backtest.py:613-613` 結算時雙寫 `status` + `hit_or_miss`
- 前台 `/api/quack/predictions` line 326-328 用 `hit_or_miss` 算 hit_rate
- 前台 `/api/analysts/{slug}` 用 `status` filter active/missed/hit
- 兩個欄位若哪天分歧（譬如手動修 status 沒同步 hit_or_miss），前台兩處顯示不一致

**觀察 3：HOLDINGS 跟 BACKFILL 的 `architecture_version` 標記不對應時間**

T2.5 已經提到，但值得 STAGE1-T2.6 重新強調：
- BACKFILL_008d1 commit `bc115d3` 較早 → 標 v1
- BACKFILL_008d2 commit `3ca44e0` 較晚 → 標 v2
- HOLDINGS 那場 → 標 v1
- **但 HOLDINGS 比 008d2 commit 還新**（HOLDINGS 是 2026-04-25 跑的，008d2 commit 已存在）
- 「v1/v2」=人設架構版本，不對應時序 → 容易把 HOLDINGS 跟 BACKFILL_008d1 混為「同代」

**觀察 4：`/api/quack/picks`（首頁）跟 `/api/quack/weekly_picks`（首頁 + /weekly_picks）是兩個不同來源**

- `/api/quack/picks` → 查 `stocks` 表（量化 score/tier）
- `/api/quack/weekly_picks` → 查 `quack_judgments(weekly_picks)`（LLM 寫）
- **首頁 home-data.tsx 同時 fetch 兩個**（line 284 + line 304）
- 使用者可能誤以為兩個都是「呱呱判斷」，實際一個量化、一個 LLM
- CLAUDE.md 鐵律「每個建議都要有根據」可能因此被弱化

**觀察 5：Daily budget cap 是 in-memory 單 process，不跨 instance**

- `ai_service.py:38` `_daily_cost_usd = 0.0` 是 module-level 變數
- `article_analyzer.py:76` `_daily_cost_twd = 0.0` 同
- 若 Zeabur backend 多 instance 部署或重啟，**daily cap 會被重置**
- 不會擋住超支，是 best-effort
- 影響：實際成本可能超 spec 給的 $5/day USD，但跟 LLM 寫入污染主軸無直接關係

**觀察 6：我（Claude Code）的範圍外但 STAGE 後續可能撞到的點**

- `quack_predictions` 表已累積大量歷史 row（T2.5 提到「evidence IS NULL 的 1769 筆」）
- 若決定修法後想「重新生成」乾淨的 holdings，**舊資料怎麼處理**：
  - 不刪 → 前台命中率永遠帶歷史污染
  - 軟刪（加 `archived_at`）→ 需要 schema 動 + 前台 query 全加 filter
  - 硬刪 → 違反任務指令「不准 archive / 隱藏 / 刪除過去預測」
- 這不是 T2.6 範圍的決策，但值得 CTO 提早思考

---

## 你（Claude Code）對 CTO 的反饋

### CTO 規劃的盤查項覆蓋度

✅ **盤查項 1-5 規劃精準**，特別是「不只看 STAGE1-T2 報的 15 個」這個 instruction 讓我重新驗證了 ai_service entry 的計數方式（**14 唯一 entry / 15 邏輯路徑**，比 T2 的「15」更精確）

⚠️ **盤查項 6 我有想到但沒在規劃中的角度**：
1. **「同一表被多條鏈寫入」的混用風險**（quack_judgments 被 HEADLINE+WEEKLY_PICKS 共用、quack_predictions 被 HOLDINGS+BACKFILL 共用）— CTO 規劃的「cross check」被我擴充進報告
2. **「次級污染」概念**（DAILY_PICKS 吃 HOLDINGS 髒 price）— 規劃沒明確要求，但這是會放大主鏈污染的關鍵
3. **「daily_budget cap 是單 process」的部署細節** — 跟主軸無關但對 LLM 成本控管有意義

### 我同意 / 不同意 STAGE1-T2 / T2.5 的點

**同意**：
- 15 個 LLM call sites 數字大致正確
- HOLDINGS p50=70% / BACKFILL p50=2.89% 量級差距 24×
- 注入 price 機制差異（`_build_market_snapshot` vs `_build_market_context`）是穩固事實
- 兩條路徑不是「共用 base」、不能「修一個治多條」

**不同意 / 補強**：
- T2.5 結論「hardcoded 1050 影響弱化」**部分對**，但我看到 HOLDINGS 同場 5 筆中 b/c（2180, 2185）跟 schema example 寫的 2185 **完全一致**，這比「訓練記憶」更像「example 抄寫」。**T2.5 漏掉這個觀察**。
- T2 把 ai_service:109 標 🟡 是合理的，但漏談「scoring_worker 強制 skip_ai=True 在生產 cron 路徑等於 dead code」這個事實 → 實際生產風險低於 T2 評估

### 我建議的下一個 task 方向

**選項 A（修復 HOLDINGS）**：直接修 `analyst_brain.py:_build_market_snapshot` 注入 price + 加 insert 前 sanity check。最高 ROI、影響面最廣（6 個前台頁、3 條 API）。

**選項 B（中央 sanity 防線）**：在 supabase 加 trigger 或 RLS，reject `|target_price - latest_close| / latest_close > X%` 的 insert。一次擋三條鏈。

**選項 C（先做 schema 重設計）**：把「LLM 寫的 raw output」跟「對應真實 price 校驗過的版本」分兩個 view 或兩個表，前台 query view，插入仍 raw → 但這較大、不適合下一個 task。

**我的真實推薦**：**選項 A 先做 HOLDINGS 修法**。理由：
1. 影響面最廣（前台 6 頁 + 3 API）
2. 修法最確定（BACKFILL 已證實 p50 從 70% 降 2.89%）
3. 同時自動消除 DAILY_PICKS 次級污染
4. 不需要動 DB schema、不需要動 supabase RLS、不需要動 migration

選項 B 可作為 P1 加碼，但結構性 sanity check 需要先確認「historical 1769 筆 evidence IS NULL 的舊資料」要不要過濾。

選項 C 等修完三條 🔴 再評估。

### 我覺得這個任務有沒有更好的做法

⚠️ **有一個建議**：**T2.6 任務指令的「禁止 archive / 隱藏 / 刪除過去預測」這條跟 STAGE1 收尾衝突可能性**。

- 若修完 HOLDINGS 後決定重跑「乾淨的當週持倉」，必然要處理舊的 125 筆髒 holdings（status=active）
- 不能 archive、不能刪 → 只剩兩條路：
  - 等它們自然 settle（過 7-14 天 deadline 自動結算）→ 短期前台仍顯示髒資料
  - 加「來源版本」欄位（schema 動）→ 前台 query 加 filter 跳過 v1 髒資料
- 這個衝突值得 CTO 先做決策，否則 STAGE1 修完後，**過去污染仍出現在前台**

---

## 工具紀錄

### 用了什麼工具

| 工具 | 用途 |
|---|---|
| Grep tool | 全 codebase 搜 messages.create / anthropic / ai_service / sanity check 關鍵字 |
| Read tool | 讀 11 條 LLM 鏈的完整 source code（analyst_brain / quack_brain / historical_backtest / quack.py / chat.py / article_analyzer / sentiment_service / ai_service / catalyst / decision_engine / scoring_worker / news.py / hero.py / vsis.py / meetings.py / morning_report / closing_report / day_trade_pick） |
| Bash | `ls .github/workflows/` 找 cron 觸發、`grep ` 找前台 fetch endpoint |
| curl | `/api/time/now` 拿系統時間（22:02 TPE） |

### 失敗 + 繞道

| 工具 | 失敗 | 繞道 |
|---|---|---|
| `cd projects/tw-stock-watcher && git pull` 第一次 | bash 已在該目錄不能再 cd | 改用直接 `git pull --ff-only` |
| Grep 多個 path 一起 | 第一次 path 包含 backend/services/people_extractor.py 跟 sentiment_service.py 但結果可能漏算 | 改逐目錄 grep + 直接 read 確認 |

### 自己加的盤查（不在 6 項裡）

1. **GHA cron schedule 完整盤點**：對照每條 LLM 鏈的觸發頻率（quack-refresh 每天 9 次、intel-cron 每 15 分鐘、scoring-daily 每天 1 次、closing-report 每天 1 次預設不跑 LLM）
2. **scoring_worker 強制 skip_ai=True 的下游影響**：意味著 catalyst 在生產 cron 永遠 0 分、stocks.score_breakdown 永遠少 20 分
3. **架構版本標記混淆 cross check**（沿用 T2.5）：v1/v2 不對應時序、HOLDINGS 標 v1 但比 008d2 commit 還新
4. **首頁兩個「呱呱挑股」端點同時呈現的 UX 風險**：`/api/quack/picks`（量化）vs `/api/quack/weekly_picks`（LLM）

---

## 卡點

1. **`quack_reasoning` 表前台是否真有頁面 fetch**：grep `frontend/src` 找不到 `quack/reasoning` 字串。可能：
   - 端點存在但前台還沒接（spec 寫了但沒做）
   - 前台某處有 fetch 但 lint/refactor 已移除
   - **無法確認影響面**，本份報告標「前台未確認」

2. **DAILY_PICKS 次級污染未實證**：T2.5 沒抽 daily_picks 樣本驗證。我推論「結構上必然污染」（吃 holdings 髒 price），但**沒有實際偏差數字**。需要另一輪抽樣才能定量。

3. **WEEKLY_PICKS 偏差未實證**：同上，T2.5 沒抽 weekly_picks 樣本。schema example 寫死 1050 是事實，但 LLM 實際輸出的 picks 是否真的集中在 1050 附近未知。

4. **catalyst.py / bull_bear_case 在生產環境是否「真的」永遠不跑**：
   - scoring_worker 強制 skip_ai=True 確認
   - workflow morning/closing default skip_ai=True 確認
   - `/api/analyze/{stock_id}?skip_ai=False` 沒前台 fetch 確認（grep 0）
   - 但 `routes/analysis.py:120` 的 `/watchlist?include_analysis=True` 也用 skip_ai=True
   - **不能 100% 排除手動 admin 觸發**，所以仍標 🟢（風險極低但非零）

---

## 範圍宣告

- ✅ 未修任何 code（純讀取 + grep + 寫 outbox）
- ✅ 未動 prompt / agent 設定 / IP / 憲法 / migration
- ✅ 未呼叫 Claude API（本任務 LLM 成本 = $0）
- ✅ 未 archive / 隱藏 / 刪除過去任何預測
- ✅ 未動 `.env` / Zeabur env / DB schema
- ✅ 未做修復行動（僅建議順序，標明「工程觀點，非決策」）
- ✅ 未沿用 STAGE1-T2 / T2.5 結論當前提（每條鏈重新驗 prompt + DB 寫入）

---

## 📨 給 CTO 的訊息（精簡版）

1. **15 個 LLM call sites 確認**：14 唯一 entry / 15 邏輯路徑 / 11 條會寫 DB
2. **3 條 🔴 高風險**：HOLDINGS（p50=70%）、DAILY_PICKS（吃髒 price）、WEEKLY_PICKS（schema example 寫死 1050）
3. **0 條鏈有 price sanity check**——這是系統性結構缺陷
4. **HOLDINGS schema example 寫的是 2185 不是 1050**，但同場 a/d/e 仍寫 1050 → 「訓練記憶」+「example 抄寫」兩機制並存（T2.5 漏談的點）
5. **DAILY_PICKS 是次級污染**：吃 HOLDINGS 寫的 current_price 推 entry_low/high，修法主鏈會自動修
6. **`quack_judgments(weekly_picks)` 寫的預測永遠不被結算**——跟憲法 Section 5「每次預測都公開命中率」牴觸
7. 我建議下一 task 方向：**選項 A（修 HOLDINGS 注入 price + insert sanity）** > 選項 B（中央 RLS 防線）> 選項 C（schema 重設計）
8. **STAGE1 收尾必撞**的決策：舊污染 125 筆 status=active holdings 怎麼處理（不能刪、不能 archive、自然 settle 需 7-14 天）

---

Task ID: STAGE1-T2.6-LLM-WRITE-PATH-COMPLETE-MAP
Completed at: 2026-04-26T22:02:41+08:00
