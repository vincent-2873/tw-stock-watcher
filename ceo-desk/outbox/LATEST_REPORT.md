System time: 2026-04-26T21:34:25.099299+08:00

# 對抗性驗證報告（STAGE1-T2.5-ADVERSARIAL）

**任務範圍**：純診斷 + 1 項小實測（10 次 LLM call）。實測成本 $0.00309（預算 $0.50）。
**前置依賴**：質疑 STAGE1-T2 (commit `3ee8908`) 結論、找反證。
**接手者**：Claude Code

**規則自我約束**：本份報告**禁用**「hallucinate」「真健康」「運氣」「失真」「污染」這類帶結論詞彙；只給原始數字 + 多角度切片；不下「修哪裡」建議。

---

## 驗證項 1：偏差分布原始樣貌

### 樣本
| 批次 | 篩選 | 抽樣 n |
|---|---|---|
| HOLDINGS | meeting_id=eq.MEET-2026-0425-HOLDINGS | 50（隨機）|
| BACKFILL_008d1 | evidence->>backfill_marker=eq.BACKFILL_008d1 | 50（隨機）|
| v2 (2025-12) | evidence->>architecture_version=eq.v2 | 50（隨機，但實際只 23 筆，全抽再補）|

random.seed(2026)；原始 150 筆對照表已存於 `.scratch/t25_raw.json`（commit 不入版控）。

### 偏差計算
`abs_diff_pct = |entry_price - baseline_close| / baseline_close × 100`
其中 `baseline_close = stock_prices_historical(stock_id=sym, trade_date<=predicted_at).order(trade_date desc).limit(1).close`
（即「predicted_at 當天或最近的歷史交易日 close」，**非「今天的 close」**）

### 累積閾值表（cumulative %）

| 閾值 | HOLDINGS (n=50) | BACKFILL_008d1 (n=50) | v2 (n=50) |
|---|---|---|---|
| < 0.5% | **0%** | **26%** | **0%** |
| < 1% | 0% | 36% | 16% |
| < 2% | 0% | 46% | 26% |
| < 5% | 6% | 72% | 84% |
| < 10% | 12% | 92% | 94% |
| < 25% | 22% | 100% | 100% |
| ≥ 25% | **78%** | **0%** | **0%** |

### 直方圖（每個 bucket 筆數）

| bucket | HOLDINGS | BACKFILL | v2 |
|---|---|---|---|
| 0–0.5% | 0 | 13 | 0 |
| 0.5–1% | 0 | 5 | 8 |
| 1–2% | 0 | 5 | 5 |
| 2–5% | 3 | 13 | 29 |
| 5–10% | 3 | 10 | 5 |
| 10–25% | 5 | 4 | 3 |
| 25–50% | 14 | 0 | 0 |
| 50%+ | 25 | 0 | 0 |

### 描述統計（abs_diff_pct）

| 統計量 | HOLDINGS | BACKFILL | v2 |
|---|---|---|---|
| min | 0.5% | 0.0% | 0.5% |
| p10 | 8.67% | 0.00% | 0.89% |
| **p50（median）** | **69.93%** | **2.89%** | **2.53%** |
| p90 | 93.49% | 8.68% | 9.80% |
| max | 97.9% | 13.1% | 17.1% |
| mean | 59.78% | 3.52% | 3.70% |
| signed range | -97.9% ~ +22.9% | -13.1% ~ +10.8% | -17.1% ~ +14.2% |

### 證據
- SQL 構造（PostgREST equivalent）：
  ```
  GET /rest/v1/quack_predictions?meeting_id=eq.MEET-2026-0425-HOLDINGS
      &select=id,target_symbol,current_price_at_prediction,created_at,evidence,meeting_id,agent_id&limit=300
  ```
- 三批合計 150 筆原始對照表寫入 `.scratch/t25_raw.json`
- baseline 取自 PostgREST `stock_prices_historical?stock_id=eq.{sym}&trade_date=lte.{predicted_at}&order=trade_date.desc&limit=1`

### 數字事實
- HOLDINGS 中位數 |diff| = **69.93%**；BACKFILL = **2.89%**；v2 = **2.53%**
- HOLDINGS 78% 樣本 |diff| ≥ 25%；BACKFILL/v2 100% 樣本 |diff| < 25%
- BACKFILL 26% 樣本 |diff| < 0.5%（精準匹配當日 close）；v2 0%
- 三批中**極端偏差只發生在 HOLDINGS**

---

## 驗證項 2：時間錯配假說

### CTO 質疑
若 STAGE1-T2 用「今天的 close」對照「過去日期的預測」，偏差是時間錯配、非預測本身錯誤。

### 重看 STAGE1-T2 方向 4 對照基準
T2 用的 `finmind` 函數（outbox 嵌入版）：
```python
def finmind(sym, ymd):
    qs = ...{'start_date': ymd, 'end_date': ymd, 'token': fmt}
    # 嚴格抓 ymd 當天
    # 失敗時 fallback 往前 -1, -2, -3, -4, -5 天找
```
即 T2 用的是「predicted_at 當天的 FinMind raw close」，**不是今天**。當天無資料才往前 fallback（適用週末預測）。

### 本驗證項用三種基準並列對照（同 150 筆）

| 基準 | HOLDINGS (n=50) p50 | BACKFILL (n=50) p50 | v2 (n=50) p50 |
|---|---|---|---|
| DB historical (lte trade_date) | **69.93%** | **2.89%** | **2.53%** |
| FinMind exact (only that day) | (HOLDINGS 04-25 週六無資料) | 2.89% | 2.53% |
| FinMind fallback (T2 method) | 69.93% | 2.89% | 2.53% |

### FinMind 對週末日測試（2026-04-25 週六）
```
GET https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockPrice&data_id=2330&start_date=2026-04-25&end_date=2026-04-25
→ status=200, data=[]
```
HOLDINGS 全 50 筆 predicted_at = 2026-04-25 週六，FinMind exact 全空。fallback 與 DB lte 都拿到 2026-04-24（週五）close = 2185。

### 證據（單筆對照樣本）
| 批次 | sym | predicted_at | DB lte close & date | FinMind exact close | FinMind fallback close & date |
|---|---|---|---|---|---|
| HOLDINGS | 2330 | 2026-04-25 | 2185.0 (2026-04-24) | None | 2185.0 (2026-04-24) |
| BACKFILL | 2330 | 2026-01-29 | 1805.0 (2026-01-29) | 1805.0 | 1805.0 (2026-01-29) |
| v2 | 2330 | 2025-12-08 | 1495.0 (2025-12-08) | 1495.0 | 1495.0 (2025-12-08) |

### 數字事實
- 三種基準在 BACKFILL/v2 完全等值（predicted_at 都是工作日，FinMind exact 直接命中）
- HOLDINGS：DB lte 與 FinMind fallback 等值（都拿到 04-24 close）；FinMind exact 為空（週六）
- T2 方向 4 用的時間基準與本驗證項使用的「DB 歷史 close」完全等價，無時間錯配

---

## 驗證項 3：hardcoded 1050 影響範圍實測

### 推論待驗
STAGE1-T2 推論：`quack_brain.py:249` schema example 寫 `2330 → target_price 1050` 誤導 LLM。

### 假說可驗證形式
若 hardcoded 是主因 → 2330 的 entry_price 分布應集中在 1050±5%；非 2330 股票分布隨機。

### 2330 全部 quack_predictions entry_price 分布（n=320）
| 區間 | 筆數 |
|---|---|
| 1000–1500 | 56 |
| 1500–2000 | 250 |
| 2000–2500 | 14 |
| < 1000 或 > 2500 | 0 |

| 統計量 | 值 |
|---|---|
| min | 1028.0 |
| p10 | 1460.0 |
| p50（median）| **1775.0** |
| p90 | 1975.0 |
| max | 2185.0 |

| 集中度測試 | 數量 / 320 | 比例 |
|---|---|---|
| 1050 ± 5% (998–1103) | 3 | **0.9%** |
| 1020 ± 5% (969–1071) | 2 | 0.6% |

### 同樣分析其他 4 檔（從 T2 ALL_WRONG 名單抽）
| 股票 | n | median | 1050 ± 5% 數量 | 真實 04-24 close |
|---|---|---|---|---|
| 2308 | 179 | 1160.0 | 30 (16.8%) | 2075 |
| 2317 | 66 | 214.5 | 0 (0%) | 221.5 |
| 2454 | 1 | 1510.0 | 0 (0%) | 2435 |
| 8299 | 3 | 478.0 | 0 (0%) | 1680 |
| 3017 | 112 | 1765.0 | 0 (0%) | 2945 |
| 8210 | 103 | 909.0 | 9 (8.7%) | 1210 |
| 5536 | 70 | 728.0 | 0 (0%) | 972 |
| 6274 | 33 | 584.0 | 0 (0%) | 1045 |

### grep 整個 codebase hardcoded 數字
```
backend/services/historical_backtest.py:255  "target_price": 1050   ← BACKFILL prompt schema example（無 symbol）
backend/services/historical_backtest.py:256  "current_price_at_prediction": 1020  ← 同上
backend/services/quack_brain.py:249          "target_price": 1050   ← WEEKLY_PICKS schema 對 2330
backend/services/analyst_brain.py:266        "current_price_at_prediction": 2185  ← HOLDINGS schema 對 2330（值為真實值 2185）
```
frontend 中 `1050/1100` 全為 CSS `maxWidth/zIndex`，0 處 hardcoded 股價。

### 同會議 2330 5 筆細節
HOLDINGS 那場 2330 entry：`[1028.0, 1045.0, 1095.0, 2180.0, 2185.0]`，其中 3 筆落在 1050±5%。

### 數字事實
- 2330 整體 320 筆中只 0.9% 在 1050±5%；median=1775，距離 1050 一倍距離
- HOLDINGS 那場 2330 5 筆中 3 筆（60%）在 1050±5%；其他批次 2330 的 entry 整體集中在 1500–2000
- `analyst_brain.py:266` HOLDINGS schema example 寫的是 2185（與真實 04-24 close 一致），不是 1050
- 集中現象只在 HOLDINGS 那場 2330 出現；非 2330 股票或非 HOLDINGS 批次的 2330 都不集中於 1050

---

## 驗證項 4：prompt 注入鏈完整性

### HOLDINGS 完整呼叫鏈

```
觸發者:
├─ POST /api/analysts/simulate_meeting (受 ADMIN_TOKEN 保護)
│   backend/routes/analysts.py:617-622
│   → analyst_brain.simulate_holdings_meeting(today)
│
└─ scripts/init_analyst_data.py:50 (人工執行)
    → analyst_brain.simulate_holdings_meeting(today)

(未發現 GHA cron yml 對應 holdings_meeting)

進入後:
backend/services/analyst_brain.py:313  simulate_holdings_meeting(today)
  └─ line 325: snapshot = _build_market_snapshot(60)
       │
       │   _build_market_snapshot(target_count=60)  [line 179-233]
       │   ├─ SQL: stocks SELECT stock_id, stock_name, current_score, current_tier, score_breakdown, industry
       │   │       (stocks 表完整 columns 共 15 個,無 close/price)
       │   ├─ SQL: topics SELECT slug, name, heat_score, heat_trend, one_liner
       │   └─ SQL: us_tw_correlation SELECT us_event_zh, impact_tw_sectors
       │
       │   返回 dict {date, stock_universe(no price), topics, us_tw_rules}
       │
       └─ for agent_id in ANALYSTS_ORDER (loop 5):
            data = _generate_holdings_for(agent_id, snapshot, today)  [line 279-310]
              ├─ profile = ANALYSTS[agent_id]
              ├─ system = SYSTEM_PROMPT_HOLDINGS.format(**profile)  [line 282]
              │           其中 system prompt schema example 寫 "current_price_at_prediction": 2185
              ├─ user = f"...universe={json.dumps(universe[:60])}\ntopics={...}"  [line 287-296]
              │         universe 來自 snapshot.stock_universe(無 price)
              ├─ msg = _client().messages.create(MODEL, system=system, messages=[user])
              └─ data = json.loads(msg.content[0].text)
                  raise if len(data['holdings']) != 25

寫入:
simulate_holdings_meeting line 350-388:
  for h in per_analyst[agent_id]['holdings']:
    row = {
      ...
      "current_price_at_prediction": h.get("current_price_at_prediction"),  ← 直接從 LLM dict
      "target_price": h.get("target_price"),                                ← 直接從 LLM dict
      ...
    }
    inserted_predictions.append(row)
  sb.table("quack_predictions").insert(chunk).execute()  [line 416, 0 sanity check]
```

### 每個函數對 prompt 的影響

| 函數 | 對 prompt 的影響 |
|---|---|
| `simulate_holdings_meeting` | 不直接組 prompt，分派 snapshot 給 5 個 analyst |
| `_build_market_snapshot` | 從 stocks/topics/us_tw 三表 SELECT，**無價格資料注入** |
| `_generate_holdings_for` | system fmt = profile（人格 / 流派 / 風險）；user 裝 universe + topics 兩個 JSON |
| `SYSTEM_PROMPT_HOLDINGS` (template) | 含 schema example 一句 `current_price_at_prediction: 2185`，硬編碼 2330 真實值 |
| `_client().messages.create` | 標準 Anthropic SDK call，model = `claude-sonnet-4-5-20250929` (env override) |

### 找漏掉的注入點？
- 無 middleware：`backend/routes/analysts.py:622` 直接 call `analyst_brain.simulate_holdings_meeting`
- 無 langchain / llamaindex（grep 0 結果）
- 無 pre-processor / interceptor
- `backend/services/ai_service.py` 是另一條通用 LLM client，但 HOLDINGS 沒走它（HOLDINGS 用 `analyst_brain._client()` 直接呼叫 anthropic SDK）
- 無 `meeting_orchestrator.py` 之類獨立檔
- LLM messages.create 之前 system + user 兩個 string 已成形，無別處再注入

### 最終 prompt 範例（5 位之一 / 2026-04-25 / analyst_a）
**System prompt (line 239-275，fmt 後)**：
```
你是「辰旭」(激進派(全盤),代號 辰旭)。
你的流派比例:技術 35% / 籌碼 25% / 題材 20% / 基本面 10% / 量化 10%
你的個性:動能優先,看到突破就敢進、有訊號就動。直接、不囉嗦、有點毒舌...
你的時間框架:短期 5 天 / 長期 14 天
你的單一持倉上限:30.0%,停損:-9.0%
你的成功標準風格:嚴格型(收盤達標才算)

**任務**:從給定的台股 universe 中,挑出你**現在最看好的 25 檔**作為當週持倉。
## 鐵律
1. **必須剛好 25 檔**(違反就 raise)
2. 每檔必須包含:symbol(4 碼)、name、direction、target_price、current_price_at_prediction、deadline_days、confidence、reasoning、success_criteria
...
## 輸出 schema
{
  "holdings": [
    {
      "symbol": "2330",
      "name": "台積電",
      ...
      "current_price_at_prediction": 2185,  ← 這是 schema 範例值
      ...
    }
  ]
}
```

**User prompt (line 287-296，fmt 後)**：
```
今天:2026-04-25

可選的台股 universe(已篩過熱門/有評分的 60 檔,你不一定全用):
[
  {"symbol": "2330", "name": "台積電", "score": 37, "tier": "N",
   "industry": "電子工業", "score_breakdown": {...}},
  {"symbol": "2454", "name": "聯發科", "score": ...},
  ... 共 60 個
]

當前熱門題材:
[{"slug": "ai-server", "name": "AI 伺服器", ...}, ...]

請依照你的流派與個性,**剛好挑 25 檔**作為當週持倉。
記住:你是 辰旭,不是其他人。用你自己的話講理由。
```

### 數字事實
- prompt 中提供 60 檔 universe，**每檔 6 個欄位**：symbol / name / score / tier / industry / score_breakdown
- 0 個欄位含當下價格、5 日 OHLC、近期成交量
- system prompt schema example 出現 1 次價格範例：`2330 = 2185`（與真實 04-24 close 一致）
- 從觸發到 LLM call，**整條路徑無任何中間注入點**

---

## 驗證項 5：LLM 行為實測

### 預算
$0.50。實際使用 $0.00309（735 input tokens + 59 output tokens）。

### 實驗設計
- Model: `claude-sonnet-4-5-20250929`（與 production 同）
- 不帶任何 system prompt
- 不帶任何 stock universe / 流派人設

### Prompt A（無 example）— 5 次呼叫
```
你是台股分析師。台積電 2330 現在的合理 entry price 區間是多少?
用一個具體數字回答(只回數字、不要其他文字、不要範圍)。
```

| call | tokens (in/out) | response |
|---|---|---|
| 1 | 67/6 | `1050` |
| 2 | 67/6 | `1050` |
| 3 | 67/6 | `1050` |
| 4 | 67/6 | `1050` |
| 5 | 67/6 | `1050` |

5 次 median = **1050.0**

### Prompt B（含 example "2330=1050"）— 5 次呼叫
```
你是台股分析師。台積電 2330 現在的合理 entry price 區間是多少?
用一個具體數字回答(只回數字、不要其他文字、不要範圍)。

(範例:2330 = 1050)
```

| call | tokens (in/out) | response |
|---|---|---|
| 1 | 80/6 | `1050` |
| 2 | 80/6 | `1050` |
| 3 | 80/5 | `950` |
| 4 | 80/6 | `1000` |
| 5 | 80/6 | `1000` |

5 次 median = **1000.0**

### 對照
- 真實 2330 close (2026-04-24) = **2185.0**
- A median = 1050（無 example）
- B median = 1000（有 example）
- A 5 次完全一致；B 5 次出現 3 種不同值

### 數字事實
- 兩組 10 次回答都不在 2185 附近
- A 組 5 次都回 1050；B 組 5 次中 2 次回 1050、1 次回 950、2 次回 1000
- A 組的數值集中度（5/5）高於 B 組（2/5）
- LLM 從未拒答（沒回「我不知道即時價」）
- 所有 10 次回答都落在 950–1050 區間
- HOLDINGS 那場 2330 的 5 位 analyst 寫入 entry：[1028, 1045, 1095, 2180, 2185]，與 A 組 5/5=1050、B 組 2/5=1050 落在類似區間

---

## 驗證項 6：HOLDINGS vs BACKFILL 路徑差異

### 兩條路徑 prompt 構造對比

| 維度 | HOLDINGS | BACKFILL_008d1 / 008d2 |
|---|---|---|
| 入口 | `simulate_holdings_meeting()` | `scripts/run_008d2.py` 或 `run_historical_backtest.py` → `generate_predictions_for_day()` |
| 觸發者 | `POST /api/analysts/simulate_meeting` (人工) 或 `scripts/init_analyst_data.py` | 手動 batch 跑 |
| Snapshot 函數 | `_build_market_snapshot()` (analyst_brain.py:179) | `_build_market_context()` (historical_backtest.py:267) |
| stocks SELECT 欄位 | stock_id, stock_name, current_score, current_tier, score_breakdown, industry | stock_id, stock_name, industry, current_score |
| 是否注入 current_price | ❌ NO | ✅ YES（從 `get_price_history_until` 撈 stock_prices_historical 取 last close）|
| 是否注入近 5 日 OHLC | ❌ NO | ✅ YES（recent_5d 陣列含 d/o/h/l/c）|
| system prompt template | `SYSTEM_PROMPT_HOLDINGS` (line 239) | `SYSTEM_PROMPT_BACKFILL` (line 209) |
| schema example 中的 2330 範例值 | `current_price_at_prediction: 2185` | `target_price: 1050, current_price: 1020`（無 symbol）|
| LLM model | `claude-sonnet-4-5-20250929` | `claude-sonnet-4-5-20250929` |
| 寫入後是否標 backfill_marker | 無（meeting_id 即為 marker）| `BACKFILL_008d1` / `BACKFILL_008d2` |

### `_build_market_context` 注入機制（line 287-318）
```python
for s in universe:
    sym = s.get("stock_id")
    history = get_price_history_until(sym, predict_date, lookback_days=5)  # 從 stock_prices_historical 撈
    latest_close = history[-1].get("close")
    stocks_info.append({
        "symbol": sym,
        "name": s.get("stock_name"),
        "industry": s.get("industry"),
        "score": s.get("current_score"),
        "current_price": float(latest_close),       ← 注入 current_price
        "change_5d_pct": change_5d,
        "recent_5d": [                                ← 注入 5 日 OHLC
            {"d": h["trade_date"], "o": ..., "h": ..., "l": ..., "c": ...}
            for h in history
        ],
    })
```

### 兩批的元資料分佈

| 批次 | 計數 | architecture_version | school 分佈 | confidence (median/avg) | unique symbols | unique dates |
|---|---|---|---|---|---|---|
| HOLDINGS | 125 | v1 (100%) | 5 派各 25（25/25/25/25/25）| 60 / 60.9 | 40 | 1 (僅 2026-04-25) |
| BACKFILL_008d1 (sample 200) | 200 | v1 (100%) | 技術派 64% 偏多 | 70 / 69.5 | 23 | 24 |
| BACKFILL_008d2 (sample 200) | 200 | v2 (100%) | 5 派接近平均 | 70 / 69.7 | 24 | 23 |

### 命名混淆釐清（git log 證據）
- commit `bc115d3` (NEXT_TASK_008d-1) 較早 → marker `BACKFILL_008d1`，但 `architecture_version` = `v1`
- commit `3ca44e0` (NEXT_TASK_008d-2) 較晚 → marker `BACKFILL_008d2`，但 `architecture_version` = `v2`
- HOLDINGS 那場 (commit 已存在) → `architecture_version` = `v1`
- 「v1/v2」標籤對應「**人設架構版本**」（v2 是 5 派改名為「全盤+個性」）；不對應時間順序

### 驗證項 1 中三批的偏差中位數對照（重列）
| 批次 | snapshot 注入 price | p50 abs_diff |
|---|---|---|
| HOLDINGS | NO | 69.93% |
| BACKFILL_008d1 | YES (5d OHLC) | 2.89% |
| v2 (BACKFILL_008d2) | YES (5d OHLC) | 2.53% |

### 數字事實
- HOLDINGS 與 BACKFILL 用同一 LLM（claude-sonnet-4-5-20250929）、同 5 位人設定義
- 唯一機制差異：snapshot 函數是否注入 `current_price` + `recent_5d` OHLC
- 注入價格那條的 |diff| 中位數 2.89%；不注入那條 69.93%

---

## 反證綜合判斷

### 驗證項對應的 STAGE1-T2 結論

| 項 | STAGE1-T2 結論 | 反證找到？ | 備註 |
|---|---|---|---|
| 1 偏差分布 | HOLDINGS 嚴重偏差、BACKFILL 健康 | **未找到** | 多閾值切片下 HOLDINGS p50=69.93% / BACKFILL p50=2.89%，量級差異 24×。但 BACKFILL 26% < 0.5% 比 T2 抽 10 筆「<1% = 0%」結論強 |
| 2 時間錯配 | T2 用「predicted_at 當天 close」基準 | **未找到** | DB lte / FinMind exact / FinMind fallback 三種基準在 BACKFILL/v2 完全等值；HOLDINGS 三者拿到的也都是 04-24 close |
| 3 hardcoded 1050 影響 | quack_brain.py:249 hardcoded example 誤導 LLM | **部分找到反證** | 2330 全 320 筆只 0.9% 落在 1050±5%；median=1775。集中現象只在 HOLDINGS 那場局部存在（5 筆中 3 筆） |
| 4 prompt 注入鏈完整性 | `_build_market_snapshot` 沒注入 price | **未找到** | 完整 trace 確認從觸發到 LLM call 無中間注入點；stocks 表本身也無 close 欄位 |
| 5 LLM 行為 | LLM 從訓練記憶給數字 | **未找到主因反證；但對「hardcoded 是主因」找到反證** | 無 example 5/5 都回 1050；有 example 反而出現 1050/950/1000 三種值 |
| 6 路徑差異 | 兩條路徑共用 base、修一個治多條 | **部分找到反證** | 兩條路徑 snapshot 函數不同（`_build_market_snapshot` vs `_build_market_context`），不是「共用 base」。但 system prompt template 都依 ANALYSTS profile fmt，兩條都用同 5 位 analyst 設定 |

### 翻盤的點
- **「hardcoded 1050 example 是 HOLDINGS 嚴重偏差的主因」這個假說：弱化**。LLM 即使無任何 example 也回 1050，hardcoded 不是必要條件。
- **「BACKFILL 真健康率 0%（< 1% 偏差）」這個 T2 結論：被推翻**。50 筆樣本顯示 36% < 1%、26% < 0.5%。T2 抽 10 筆 0/10 是樣本量過少。

### 成立的點
- HOLDINGS 嚴重偏差是事實（p50 = 70%、78% 樣本 ≥ 25%）。
- BACKFILL 偏差遠小於 HOLDINGS 是事實（p50 = 2.89%）。
- HOLDINGS prompt 不注入 current_price 是事實（code trace + schema 確認）。
- BACKFILL prompt 注入 current_price + 5d OHLC 是事實（line 287-318）。
- 時間基準：T2 用法正確、無錯配。
- 注入鏈無漏掉的中間層。
- LLM 在無價格 context 時，會給訓練記憶值（驗證項 5 確證）。

### 仍有疑慮 / CTO 進一步判斷
1. **驗證項 5 結果反直覺**：LLM 即使無 example 也 5/5 回 1050。可能解釋：
   - LLM 訓練資料截止時 2330 在 1000–1100 區間（2024 H2 平均價）
   - LLM 不主動承認「我不知道現在價」
   - HOLDINGS 那場 a/d/e 寫的 1028/1045/1095 與本實驗 LLM 直接給的 1050 落在同區間
   - → **HOLDINGS 偏差來源更像「LLM 訓練截止日」效應，而非「hardcoded example 誤導」**
2. **BACKFILL 0.5% 精準命中 26% 機制不明**：BACKFILL prompt 注入 current_price 後，LLM 是「直接抄 prompt 的 current_price」嗎？需要檢驗是否 BACKFILL 的 entry_price 與 prompt 注入的 latest_close 完全相同（精準 abs_diff = 0）。
3. **BACKFILL 仍有 28% 樣本偏差 ≥ 5%**：即使 prompt 注入了價格，仍有偏差。可能是 LLM 部分時候忽略 prompt 直接給判斷值（例如把 target 當 entry）。需要 case study。
4. **HOLDINGS 那場 b 與 c（2185, 2180）為何接近正確？**：在「prompt 完全沒給價」前提下，b/c 對 2330 寫對。可能：
   - LLM 有時會「猜」到接近真實的數字（這 2 筆與真實 2185 完全一致，似乎不是猜）
   - LLM 訓練資料較新（涵蓋 2025 末 2330 上漲到 2000+ 期間）
   - sampling 隨機性的 long tail
5. **BACKFILL_008d1 confidence median=70 vs HOLDINGS=60**：信心分佈差異，可能與 prompt 是否注入 OHLC 有關（看到資料更敢給高 confidence）。

---

## 工具紀錄

### 用了什麼工具
| 工具 | 用途 |
|---|---|
| Python `urllib` + `urllib.parse` | Supabase REST、FinMind raw API |
| Python `random.seed(2026)` | 重現性抽樣 |
| Python `anthropic` SDK | 驗證項 5 LLM call |
| Python `re` + `json` | response 解析 |
| Read tool | 讀 analyst_brain.py / historical_backtest.py / quack_brain.py 對應行 |
| Grep tool | 找 hardcoded 數字、`simulate_holdings_meeting` 呼叫者、commit 中包含特定字串 |
| Bash + `git log -S` | 追溯 008d-1 / 008d-2 commit 順序 |

### 失敗 + 繞道
| 工具 | 失敗 | 繞道 |
|---|---|---|
| `os.environ.setdefault` 載入 .env | `.env.local` 內 `ANTHROPIC_API_KEY=` 為空字串會優先設成 `''`、之後 .env 的真值無法覆蓋 | 改用「強制 load `.env`、且只在值非空時才寫入 environ」 |
| FinMind exact for HOLDINGS predicted_at | 04-25 為週六，FinMind 回 `data=[]` | 用 fallback (-1 ~ -5) 或 DB lte 取 04-24 close（兩者等值） |
| 直接 SQL 查詢 information_schema | PostgREST 不支援跨 schema 查 | 用 PostgREST root paths metadata 列出所有可查表 |

### 自己加的盤查（不在 6 項裡）
1. **驗證項 1 重現性**：用 `random.seed(2026)` 確保抽樣可重現。
2. **驗證項 1 補充**：v2 evidence 標記只有 23 筆（不滿 50），所以實際抽 23 筆全用、再從 evidence-null 中抽相近時段補到 50。為避免引入新假設、結果以「v2 樣本只 23 筆抽 50」標註說明。
3. **架構命名混淆釐清**：`v1/v2 architecture_version` vs `BACKFILL_008d1/d2` vs commit 順序，三者並非全部對齊；本份報告 4.1 / 6.1 已附 git log 證據。

---

## 卡點

1. **驗證項 5 樣本量小（10 次 call）**：若要更嚴謹確認 LLM 對 2330 的「訓練記憶值」分佈，需要 50+ 次呼叫。本任務預算 $0.50，若 CTO 批准 ~$0.05 額外預算可擴大樣本到 50 次。
2. **驗證項 1 v2 樣本量受限**：evidence.architecture_version='v2' 只有 23 筆，無法達到 50 筆等量比較。
3. **`evidence IS NULL` 的 1769 筆未驗證**：來源不明。可能是更早期的舊 schema 寫入（pre-008c）。

---

## 範圍宣告

- ✅ 未修任何 code
- ✅ 未動 prompt / agent 設定 / IP / 憲法
- ✅ LLM 成本實際使用 $0.00309（預算 $0.50）；只用於驗證項 5 之 10 次 call
- ✅ 未呼叫 DALL-E
- ✅ 未 archive / 隱藏 / 刪除過去任何預測（150 筆樣本只讀，未變動原始紀錄）
- ✅ 未動 `.env` / Zeabur env vars / migration / DB schema
- ✅ 未跑 5 位 analyst 預測
- ✅ 未做修復建議（依任務指令）

---

## 📨 給 CTO 的訊息

1. 6 項驗證 4 項「未找到反證」（STAGE1-T2 對應結論成立）、2 項「部分找到反證」（hardcoded 1050 影響、BACKFILL 真健康率）。
2. **最大反證**：驗證項 5 顯示 LLM 即使無 example 也 5/5 回 1050。意味 STAGE1-T2 推測的「hardcoded example 誤導」可能不是主機制，更像是「LLM 訓練截止日」效應。
3. **BACKFILL 偏差比 T2 報告的更輕**：T2 抽 10 筆「<1% = 0%」是樣本量過少；50 筆顯示 36% < 1%、26% < 0.5%。T2 對 BACKFILL 嚴重度的描述需要溫和化。
4. HOLDINGS 嚴重偏差（p50=70%）vs BACKFILL（p50=2.89%）的差距 24× 是穩固事實。
5. 兩條路徑機制差異（`_build_market_snapshot` 不注入 price vs `_build_market_context` 注入 current_price+5d OHLC）是穩固事實，由 code trace 證明。
6. 仍有 5 個「進一步判斷需要」的點留在「仍有疑慮」區，包含 BACKFILL 為何仍有 28% 偏差 ≥ 5%、b/c 對 2330 為何能寫對等。
7. 本份報告**未下「修哪裡」建議**，依 T2.5 任務指令執行；CTO 看完數字自己決定方向。

---

Task ID: STAGE1-T2.5-ADVERSARIAL-VERIFICATION
Completed at: 2026-04-26T21:34:25+08:00
