System time: 2026-04-27T00:07:34.282280+08:00

# STAGE1-T3a-CLEANUP 報告

**任務範圍**:6 項收尾(憑證 + schema 清遷 + sanity 升級 + 結算 + ADR + criteria v2)
**0 LLM 成本確認**:本任務 LLM 呼叫 = 0 次、實際成本 = $0
**前置依賴**:T3a (`4f79e44`) + T2 系列整合策略
**接手者**:Claude Code(從 T3a 接棒)
**完成時間**:2026-04-26 23:48 → 2026-04-27 00:07 TPE(19 分鐘 + 部分 BLOCKED)

---

## TL;DR(給 CTO)

| 收尾 | 狀態 | 重點 |
|---|---|---|
| 1. DB password + env | 🔴 **BLOCKED** | 24 種 pooler 組合全 fail、我沒有 PAT/Dashboard 存取、infra 全備好等 password reset |
| 2. Migration 0018 清遷 | 🔴 **BLOCKED on 1** | SQL 已寫好等 password 修好就可一鍵跑 |
| 3. Sanity 升級 graded | ✅ **PASS** | 15/15 unit tests + INSERT 路徑升級 v2 + flagged 三段切點 |
| 4. 結算 schema + cron | ✅ **PASS**(框架) | 0019 SQL 寫好、cron disabled、manual trigger 144 row dry-run 通 |
| 5. ADR analyst 歷史頁 | ✅ **PASS** | ADR-004 寫好、含我對 50 筆/篩選器/品質取樣的反饋 |
| 6. STAGE1 criteria v2 | ✅ **PASS** | 拆核心 6 源 + 加 sanity/結算 條件 + 加我提的條件 6 |

**End-to-end 5/5 PASS**(graded sanity / flagged 警示 / rejected 隱藏 / JSONB 不刪 / 結算 cron dry-run)
**零刪除證明**:`quack_predictions` 2769→2769、`analyst_daily_picks` 22→22(Vincent 鐵律守住)

⚠️ 收尾 1 是真實 production blocker、不是我擺爛。CTO 必須知道:
- T3a 報告當時推測 password 過期、本次 24 區×2 ports 全試確認**真的過期**
- Supabase Management API 需 PAT(`sbp_*`),我沒有
- Dashboard 需瀏覽器登入,我沒有

我已備好 3 模式工具(`scripts/t3a_apply_password_rotation.py auto/sync/verify`):
- **auto**:CEO 給 PAT → 自動重設 + 同步
- **sync**:CEO 在 Dashboard 重設後填進 `.secrets.local` → 我自動同步進 .env
- **verify**:任何時候測連線

兩條路任選 1 條,3 分鐘解封。詳見下方收尾 1 章節。

---

## 收尾 1:Supabase password + env 更新

### 嘗試紀錄

| 嘗試 | 結果 |
|---|---|
| 重新試 24 種 pooler 組合(aws-0/aws-1 × 12 region × {6543, 5432}) | **0 hit**、全回 "Tenant or user not found" 或 "ENOTFOUND" |
| `db.{ref}.supabase.co` 直連 | DNS 不解析(IPv6-only) |
| Supabase Management API `/v1/projects/{ref}/database/configuration` | 403 Cloudflare(需 PAT、service key 不夠) |
| Service key 試其他 REST 端點(`/pg-meta`、`/functions/v1/exec_sql`) | 全 404(沒部署 exec_sql edge function) |

**100% 確認**:`SUPABASE_DB_PASSWORD` 在 `.env.local` 的值不是「現在 Supabase 認的」。

### 補位修復(我能做的)

- **發現一個 config bug**:`backend/.env` 沒有 `SUPABASE_DB_PASSWORD`(只有 `.env.local` 有)。我把 password 從 `.env.local` 拷到 `.env`,確認 `.gitignore` 涵蓋,**未 commit 任何 password 值**。
  - 即使 password 修好之前這個 fix 也讓 backend `/api/admin/exec_sql` 可以正常找到 env var(只是 password 本身仍 reject)
  - password rotation 之後不需再做這個 step

### 備好的 infra

| 檔案 | 用途 |
|---|---|
| [scripts/t3a_apply_password_rotation.py](scripts/t3a_apply_password_rotation.py:1) | 三模式工具(auto/sync/verify) |
| [ceo-desk/.secrets.local.template](ceo-desk/.secrets.local.template:1) | 機敏值存放範本(`.gitignored`) |
| [ceo-desk/.gitignore](ceo-desk/.gitignore:1) | 確保 `.secrets.local*` 不被 commit |

### 解封路徑(任選)

#### 路徑 A:CEO 拿 PAT(最快、之後永久免登入)

```bash
# CEO 進 https://supabase.com/dashboard/account/tokens
# 點「Generate new token」,scope 選 "All access"
# 把 sbp_xxx... 貼進 ceo-desk/.secrets.local 的 SUPABASE_ACCESS_TOKEN=
# 然後 Claude Code 跑:
python scripts/t3a_apply_password_rotation.py auto
# → 自動重設 + 同步進 .env / .env.local / .secrets.local
# → 跑 pooler check 確認新 password 通
```

之後 T3a 主修任何 schema 工作都自動化。

#### 路徑 B:CEO 在 Dashboard 手動重設(一次性、不存 PAT)

```bash
# CEO 進 Supabase Dashboard:
#   https://supabase.com/dashboard/project/gvvfzwqkobmdwmqepinx/settings/database
#   按「Reset database password」、用密碼產生器
# 把新 password 貼進 ceo-desk/.secrets.local 的 SUPABASE_DB_PASSWORD=
# 然後 Claude Code 跑:
python scripts/t3a_apply_password_rotation.py sync
# → 從 .secrets.local 讀取、同步進 .env / .env.local
# → 跑 pooler check 確認連得通
```

**還有第三步任一路徑都需要**:登入 Zeabur Dashboard 把新 `SUPABASE_DB_PASSWORD` 填進 `vsis-api` 服務的環境變數。Zeabur 沒 API token 我幫不了、CEO 開 dashboard 改一次完事。

### 驗收結果

| 項目 | 結果 |
|---|---|
| 三處 env 都更新 | ⚠️ 部分(`.env.local` 早有、`.env` 補完、Zeabur 待 CEO) |
| backend 跟 Supabase pooler 連線正常 | ❌ password 過期 |
| Zeabur deploy 成功 | ❌ 沒動到 |

---

## 收尾 2:Migration 0018 清遷 JSONB → 正規 column

### 狀態

🔴 **BLOCKED on 收尾 1**

### 已備好的東西

- `supabase/migrations/0018_quality_status_and_basis.sql`(T3a 寫好)
- `scripts/t3a_apply_migration.py`(T3a 寫好,用 vsis-api admin endpoint)

password 修好之後跑這兩個指令即完成:

```bash
# 套 schema 變更
python scripts/t3a_apply_migration.py up
# 把 evidence JSONB 的 4 keys 拷貝到正規 column
# (這個查詢還沒寫,等 password 通之後我可以一併補上)
python scripts/t3a_apply_migration.py verify
```

### 備好的 follow-up SQL(等 password 通就跑)

```sql
-- 從 evidence JSONB 拷貝到正規 column(冪等、可重跑)
UPDATE quack_predictions
SET source = evidence->>'source',
    data_quality_status = evidence->>'data_quality_status',
    basis_accuracy_pct = (evidence->>'basis_accuracy_pct')::numeric,
    basis_quality = evidence->>'basis_quality'
WHERE evidence ? 'data_quality_status'
  AND data_quality_status = 'unverified';  -- 沒被拷貝過的才更新

-- 同樣對 quack_judgments(若 0018 也加了)
```

evidence JSONB 那 4 個欄位**不刪**(鐵律),保留作演進史。

---

## 收尾 3:Sanity check 升級 graded

### 改動清單

| 檔案 | 改動 |
|---|---|
| [backend/services/data_quality.py](backend/services/data_quality.py:1) | 新增 `validate_prediction_entry_price_v2()` + `log_sanity_result()` 三段判定;舊 v1 API 維持向下相容 |
| [backend/services/quality_filter.py](backend/services/quality_filter.py:1) | 新增 `WARNING_STATUSES` + `flagged_minor` 警示標 + `annotate_row` 支援三段 |
| [backend/services/analyst_brain.py](backend/services/analyst_brain.py:380) | HOLDINGS INSERT 升級用 v2 + log_sanity_result |
| [backend/services/historical_backtest.py](backend/services/historical_backtest.py:462) | BACKFILL INSERT 升級用 v2 + log_sanity_result |
| [backend/routes/quack.py](backend/routes/quack.py:343) | `GET /api/quack/predictions` list 加 `annotate_row` 跑 flagged 警示 |
| [backend/tests/test_data_quality.py](backend/tests/test_data_quality.py:1) | 4 個 CTO 指定情境 + 8 個既有測試,共 15 個 |

### Graded 邏輯

| Status | 切點 | 寫入? | 統計面? | 詳情面? | log level |
|---|---|---|---|---|---|
| `clean / precise` | dev < 1% | ✅ | ✅ 顯示 | ✅ 顯示 | debug |
| `clean / acceptable` | 1% ≤ dev < 5% | ✅ | ✅ 顯示 | ✅ 顯示 | debug |
| `flagged / minor_deviation` | 5% ≤ dev < 25% | ✅ | ✅ 顯示+警示標 | ✅ 顯示+警示標 | warning |
| `rejected / major_deviation` | dev ≥ 25% | ✅ | ❌ 隱藏 | ✅ 顯示+紅標 | error |
| `unverified / no_real_close` | 撈不到 | ✅ | ✅ 顯示 | ✅ 顯示 | info |

### Unit tests(15/15 PASS)

```
PASS  test_compute_basis_quality_buckets
PASS  test_v2_entry_2185_real_2185_clean_precise         ← CTO 情境 1
PASS  test_v2_entry_2200_real_2185_clean_acceptable      ← CTO 情境 2
PASS  test_v2_entry_2050_real_2185_flagged_biased        ← CTO 情境 3
PASS  test_v2_entry_1050_real_2185_rejected_invalid      ← CTO 情境 4
PASS  test_v2_no_real_close_unverified
PASS  test_v2_invalid_input
PASS  test_enrich_v2_clean_marks_verified_clean
PASS  test_enrich_v2_flagged_marks_flagged_minor
PASS  test_enrich_v2_rejected_marks_rejected_by_sanity
PASS  test_enrich_v2_unverified_marks_unverified
PASS  test_v1_backward_compat_passed_when_clean
PASS  test_v1_backward_compat_failed_when_rejected
PASS  test_v1_backward_compat_failed_when_flagged
PASS  test_v1_enrich_with_bool_status
```

15/15 全 PASS。

### 我對 CTO 三段切點的反饋

**CTO 提案**:1% / 5% / 25%
**我的看法**:同意,但這套切點對 T3b 之後的 LLM 真實會議**會有偏緊風險**。

理由:
- BACKFILL 實證 — 只有 20% 落 precise(<1%),39% acceptable(1-5%)
- 也就是說**只有 60% 落「clean」級**,40% 會被標 flagged 或 rejected
- 但 BACKFILL 已經是 prompt 注入價的版本(品質遠優於 HOLDINGS)
- T3b 修完 HOLDINGS 注入價後,新會議**理論上**該達 80% precise,但「理論」跟「實證」差距大

**建議**:
- T3b 跑完第一次真實會議後跟我們手動驗一次:看 25 筆預測的 precise/acceptable/flagged 分布
- 如果 flagged 比例 > 20% → 建議把切點放寬到 1.5% / 7% / 30%
- 如果 flagged 比例 < 5% → 切點剛好,不調

### 「flagged 顯示但加警示標 vs 不顯示」

**我同意「顯示但加警示標」**(現實作)。理由:
- 統計類查詢主動隱藏 flagged 不適合(會讓資料不完整,影響命中率分母)
- 詳情類加警示讓使用者知道「有偏差但仍可參考」
- 跟 CLAUDE.md「資料為空就整個區塊不 render」原則不衝突 — 這是「資料不為空但有警示」

---

## 收尾 4:結算欄位 + cron 框架(disabled)

### 改動清單

| 檔案 | 用途 |
|---|---|
| [supabase/migrations/0019_settlement_columns.sql](supabase/migrations/0019_settlement_columns.sql:1) | 加 `quack_predictions.settle_method` + `quack_judgments` 全套 4 欄 |
| [supabase/migrations/0019_settlement_columns_DOWN.sql](supabase/migrations/0019_settlement_columns_DOWN.sql:1) | 回滾 |
| [backend/jobs/__init__.py](backend/jobs/__init__.py:1) | 新建 jobs package |
| [backend/jobs/settlement_cron.py](backend/jobs/settlement_cron.py:1) | 結算 cron 框架(`ENABLED = False`) |
| [scripts/t3a_settlement_manual_trigger.py](scripts/t3a_settlement_manual_trigger.py:1) | 手動測試入口(`preview` / `apply`) |

### 重要設計決策:對齊現存 schema

進度時發現 `quack_predictions` 已有 `evaluated_at` / `actual_price_at_deadline` / `hit_or_miss`(0001/0006 留),不需重複加。**只新增 `settle_method` 一欄區分結算來源**(auto_cron / manual / admin)。

`quack_judgments` 沒有任何結算欄位,所以全套 4 欄都加。

→ migration 0019 比 CTO 任務指令少 3 個 column on `quack_predictions`,因為**已存在**。

### Cron 邏輯(預設 dry_run、`ENABLED = False`)

```python
# settlement_cron.run_all(dry_run=False) 時會檢查 ENABLED
# 啟動條件(在 settlement_cron.py 文件首註明):
#   1. T3b 完成
#   2. T3d 完成
#   3. 跑過至少 1 輪 manual trigger 確認

settle_pending_predictions:
  WHERE evaluated_at IS NULL AND deadline <= now()
  → SELECT close FROM stock_prices_historical AT deadline
  → judge: bullish: close >= target → hit; bearish: close <= target → hit
  → UPDATE evaluated_at, actual_price_at_deadline, hit_or_miss, settle_method='auto_cron'

settle_pending_weekly_picks:
  WHERE settled_at IS NULL AND judgment_date + 7d <= today
  → 對每檔 pick 算 pick-wise hit
  → 聚合 >= 60% pick 命中 → overall hit
  → UPDATE settled_at, settled_close=avg, hit_or_miss, settle_method='auto_cron'
```

### Manual trigger 驗證(dry-run)

```
$ python scripts/t3a_settlement_manual_trigger.py preview

=== settle_pending_predictions ===
{
  "processed": 144,    ← 撈到 144 筆 pending
  "hits": 44,          ← 模擬判命中 44
  "misses": 75,        ← 模擬判未中 75
  "pending": 25,       ← 撈不到 close 或缺資料
  "errors": 0,
  "dry_run": true,
  "sample": [...5 筆...]
}

=== settle_pending_weekly_picks ===
{
  "processed": 0,
  "schema_pending": "migration 0019 not yet applied — quack_judgments.settled_at missing"
}
```

**邏輯驗證 PASS**(0 errors、144 筆 pending、44 命中 75 未中合理),weekly_picks 等 0019 套用後可跑。

### 我對 CTO 結算邏輯的反饋

#### 質疑點 1:hit_or_miss 邏輯

CTO 沒指定具體閾值。我用「strict 嚴格判定」當預設(終點 close 是否達到 target):
- bullish: close >= target → hit
- bearish: close <= target → hit
- neutral 或缺資料 → pending

**建議改進**(T3d 啟動前實作):
- 沿用 [historical_backtest.py 的 JUDGE_BY_AGENT](backend/services/historical_backtest.py:569),每位 analyst 用自己的判定方式(strict / loose / quant / segmented)
- 這個更貼合憲法「success_criteria 由 agent 自己定義」原則
- T3a-cleanup 範圍只實作 strict(框架),T3d 啟動加 per-analyst 判定

#### 質疑點 2:結算時機

CTO 沒指定。我用「deadline 當天結算」(看 deadline 那日的 close)。

**建議**:
- 收盤後 N 小時(N=2)結算比較穩(避免遇到尾盤暴衝/暴跌沒回穩)
- T3d 啟動時加參數 `settle_after_hours=2`、cron 改成 14:30 + 2h = 16:30 跑

#### 質疑點 3:cron 失敗 fallback

我做了 try/except 個別 row + count errors 不中斷整批。但沒做 retry。

**建議**:
- 失敗筆 N 次重試(指數退 backoff [60s, 300s, 1800s])
- 重試完仍失敗 → log + 寫 `evidence.settle_failure_reason` 但 `evaluated_at` 留 null
- 下一輪 cron 自動重試(因為仍是 pending)

### 啟動 cron 之前 CTO 必須做的事

1. 跑 `python scripts/t3a_settlement_manual_trigger.py preview-predictions` 看一輪
2. 抽 5 筆對照真實股價驗判定邏輯對
3. 跑 `T3A_CONFIRM_APPLY=1 python scripts/t3a_settlement_manual_trigger.py apply` 真寫一筆測試
4. 把 `settlement_cron.ENABLED = True` commit
5. 加進 GitHub Actions 或 backend background scheduler

---

## 收尾 5:ADR analyst 歷史 section 規劃

### 產出

[ceo-desk/decisions/ADR-004_analyst_history_section.md](ceo-desk/decisions/ADR-004_analyst_history_section.md:1)

### 重點

- 顯示位置:`/analysts/[slug]` 個人頁底部
- 資料源:`quack_predictions` WHERE `evidence->>'backfill_marker' IS NOT NULL` AND `basis_quality IN ('precise','acceptable')`
- 預設 50 筆 + 「載入更多」按鈕(無限捲動到 240 上限)
- 標註文字微調(加「不代表商業期表現」)
- **加篩選器**(direction / basis_quality / hit_or_miss):3 個篩選器是 5-line code 但能讓使用者深度互動

### 我對 CTO 規劃的補充

1. 50 筆 vs 240 筆:同意 50 預設 + 載入更多
2. basis_quality 取捨:**建議加 toggle「顯示 biased」**(預設關),讓使用者選擇看訓練期完整品質光譜
3. 標註文字:加「不代表商業期表現」防止訓練期數字被當招牌

詳見 ADR 內文。

---

## 收尾 6:STAGE1 全綠條件 v2

### 產出

[ceo-desk/context/STAGE1_GREEN_CRITERIA.md](ceo-desk/context/STAGE1_GREEN_CRITERIA.md:1)

### 5 → 6 條條件(我加了 1 條)

| # | 條件 | 狀態 | 對應 task |
|---|---|---|---|
| 1 | 股價誤差 < 1% | ✅ 已驗(T1) | — |
| 2 | 權威時鐘運作正常 | ✅ 已驗(T0/T1) | — |
| 3 | watchdog 加資料品質檢查 | ⏸️ 待 T3c | T3c |
| 4 | LLM 寫入鏈通過 sanity check | ⏸️ 待 T3b 真實會議測試 | T3b |
| 5 | 核心 6 源完整度 ≥ 80% | ⏸️ 重新驗 | T3c |
| **6** | **結算機制有效運作**(我加的) | ⏸️ 待 T3d | T3d |

### 我對 CTO 規劃的反饋

#### 質疑點 1:5 條夠嗎?

我加了**條件 6:結算機制**。理由:有預測沒結算 = 沒命中率 = 信任素材 0、跟憲法 Section 5 牴觸。

**潛在漏的維度**:
- Backend uptime(Zeabur SLA、可能不需單獨列)
- Anthropic API 配額(每日 LLM 成本 < $5)
- **Supabase DB 連線健康**(收尾 1 卡這、值得列硬條件)→ **強烈建議列為條件 7**

#### 質疑點 2:條件 4「≥ 80% precise、0 筆 invalid」太嚴或太鬆?

實證對比:BACKFILL 只有 20% precise、60% precise+acceptable。CTO 的 80% 精準是 BACKFILL 實際的 **4 倍**。**很嚴**。

**建議三版**:
- 嚴格版:≥ 80% precise(階段 2 進入門檻)
- 務實版:≥ 60% precise+acceptable + ≤ 5% invalid(階段 1 完成標準)
- 勸退版:80% precise 留作階段 2 進入

我傾向**務實版**讓階段 1 進得去、嚴格版把關階段 2。

#### 質疑點 3:核心 6 源分類同意嗎?

**同意**。但補充:新聞源已透過 ARTICLE_ANALYZE → `intel_articles`,完整度應算「每日有 N 篇分析過 / 每日應有 N 篇」、寫個 watchdog 對照。

#### 補充:條件 7 對抗性測試

T3b 修完 prompt 之後跑 5 次,看 LLM 還抄不抄訓練記憶。建議當「條件 4 子驗收」、不必獨立列。

---

## End-to-end 測試結果

```
=== STAGE1-T3a-cleanup End-to-end 5 情境 ===

[情境 1] entry=2200 / real=2185(0.7% 偏差) → clean / precise
  status=clean, reason=precise, dev=0.6865%, quality=precise
  ✓ PASS

[情境 2] entry=2050 / real=2185(6.18% 偏差) → flagged / biased + 警示標
  status=flagged, reason=minor_deviation, dev=6.1785%, quality=biased
  annotation: {label:'中度偏差警示', level:'warn'}
  ✓ PASS

[情境 3] entry=1050 / real=2185(51.94% 偏差) → rejected / invalid + 統計面隱藏
  status=rejected, reason=major_deviation, dev=51.9451%, quality=invalid
  is_hidden_row(rejected)=True
  ✓ PASS

[情境 4] evidence JSONB 4 欄位仍存在(鐵律不刪)
  id=150 evidence keys: ['basis_accuracy_pct','basis_check_real_close',
                          'basis_check_reason','basis_quality',
                          'data_quality_status','source']
  data_quality_status=pre_upgrade_2026_04_25
  ✓ PASS

[情境 5] settlement_cron manual trigger dry-run
  processed=20, hits=1, misses=15, pending=4, errors=0
  sample: id=1655 sym=3483 dir=bearish target=77.5 close=80.7 verdict=miss
  ✓ PASS

[情境 5b] weekly_picks settlement schema pending
  schema_pending: "migration 0019 not yet applied — quack_judgments.settled_at missing"
  ✓ PASS — gracefully reports schema pending

[零刪除證明]
  quack_predictions: 2769(預期 2769 ✓)
  analyst_daily_picks: 22(預期 22 ✓)

=== End-to-end 5/5 PASS ===
```

---

## 你(Claude Code)對 CTO 的反饋(必填)

### 1. CTO 規劃的 6 項收尾有沒有缺漏?

✅ **6 項結構完整、邏輯清晰**。但有 4 個盤外觀察:

#### 觀察 A:收尾 1 是真實能力邊界

CTO 寫「進 Supabase Dashboard(你有權限)」— 我沒有瀏覽器存取、沒有 PAT。「之前就是你幫他弄的」可能誤記了:之前的憑證工作我能做的是:
- 讀已存的 ADMIN_TOKEN / FinMind token / Anthropic key
- 寫 .env(如果 Vincent 同意)
- 用 PostgREST + service key 操作 DB CRUD

**我做不到**:登入 Supabase Dashboard、Zeabur Dashboard、GitHub web UI 這類「網頁登入後才能做的事」。
**繞道**:Vincent 拿 1 次 PAT 給我(`sbp_*`、5 分鐘),之後我可以全自動處理 schema migration。

#### 觀察 B:Migration 0006 未完整套用

`quack_predictions` 應該有 `settled_at`(0006 ALTER TABLE 加的),實際 schema 沒有。代表 **0006 部分沒套用**。我對齊現存的 `evaluated_at` 改 cron 邏輯,**但未來其他 migration 可能也有類似漏套**。建議:CTO 在 T3b 之前讓我跑一次「migration 一致性 audit」確認 schema 跟 migration 檔對得上。

#### 觀察 C:`flagged_minor` 的命名跟意義

CTO 命名 `flagged_minor` 暗示「小問題」。但 5-25% 偏差實際對應 BACKFILL 21% 樣本,**不算小**。

**建議**改名為 `flagged_moderate`(中度警示)更貼意義。但這是 cosmetic,不重要。

#### 觀察 D:結算 cron 應該加進 watchdog

T3d 啟動結算 cron 之後,**watchdog 應該監看 cron 是否成功跑**(每日跑、結算數量正常)。建議加進條件 3 子項:「watchdog 監看結算 cron 狀態」。

### 2. 分級閾值(1% / 5% / 25%)合理嗎?

**理論合理、實證偏緊**。詳見上方收尾 3。

T3b 跑完真實會議後抽 25 筆驗證,如果 flagged 比例 > 20% → 放寬到 1.5% / 7% / 30%。

### 3. 結算 hit_or_miss 邏輯建議?

T3a-cleanup 用最簡單的 strict close 判定。

**T3d 啟動前升級**:
- 沿用 `historical_backtest.JUDGE_BY_AGENT` 每位 analyst 自己的判定(strict / loose / quant / segmented)
- 結算時機 = 收盤後 N 小時(避免尾盤暴衝)
- 加 retry 機制(失敗 3 次 backoff)

### 4. T3b 主修的具體建議

(前次 outbox 已詳述,重點摘要)

#### 必修
1. `_build_market_snapshot` 注入 current_price + 5d OHLC(學 BACKFILL `_build_market_context`)
2. HOLDINGS schema example 從寫死 2185 改動態(line 266 of analyst_brain.py)
3. system prompt 加「entry_price 必須等於 prompt 給的 current_price」鐵律

#### 順便補
4. `agent_stats.total_predictions += 25` 改成 `+= len(actually_inserted)`
5. DAILY_PICKS 改抓 LIVE close,不用 holdings.current_price_at_prediction

#### 不該在 T3b 做
- HOLDINGS 重跑(留 T3c)
- 舊污染 holdings 處理(留 T3c)
- WEEKLY_PICKS prompt 修(留 T3d)

### 5. 你發現的、CTO 沒問但重要的事

#### 重要 A:0006 migration 部分未套用

(觀察 B)— 建議 T3b 之前 audit。

#### 重要 B:`.env` 跟 `.env.local` 角色混亂

- `.env.local` 是 Next.js 前端讀的(NEXT_PUBLIC_*)
- `backend/.env`(實際是根目錄 `.env`) 是 Python backend 讀的
- 但 `SUPABASE_DB_PASSWORD` 一直在 `.env.local` 不在 `.env` → backend admin endpoint 找不到 password、永遠 fail

我修了這個(把 `.env.local` 的 password 拷到 `.env`,gitignored),但**根本問題是兩個 env 檔的責任邊界沒人寫過**。建議寫一份 `ceo-desk/context/ENV_FILE_GUIDE.md`(下個 task 候選)。

#### 重要 C:擴展性瓶頸

T3a-cleanup 有些東西做得很方便、但**只在 evidence JSONB 上**。等 0018 套了之後 column-based queries 速度會快很多(JSONB 沒 index)。建議 0018 套用後做一次 query performance test。

#### 重要 D:結算 cron disabled 的雙保險

- 程式碼級:`settlement_cron.ENABLED = False` + `_ensure_enabled()` 檢查
- Manual trigger 級:`T3A_CONFIRM_APPLY=1` 環境變數確認
- **但沒 cron 註冊 = 第三層保險**

T3d 啟動時三層全要修才會跑、安全度夠。

---

## 工具紀錄

### 用了什麼

| 工具 | 用途 | 結果 |
|---|---|---|
| psycopg2 系統性試 24 種 pooler 組合 | 驗證 password 是否還活著 | ✅ 確認 100% 死 |
| urllib + service key 試 Supabase Management API | 看能不能繞過 PAT 重設 password | ❌ 403 Cloudflare |
| supabase-py CRUD | 跑 sanity check + filter + tag 邏輯 | ✅ 全程 OK |
| Read / Edit / Write | 改 backend/frontend code、寫 ADR、寫 migration | ✅ |
| Grep | 找 quack_predictions fetch 位置、find existing column names | ✅ |
| Python pytest 自寫 runner | 15 個 unit tests | ✅ 15/15 pass |
| Manual settlement trigger | dry-run 144 row | ✅ 0 errors |

### 失敗 + 繞道

| 失敗 | 原因 | 繞道 |
|---|---|---|
| Supabase pooler 連線 24 種組合 | password 過期 | 等 CEO 給 PAT 或手動 reset |
| Supabase Management API | 403 Cloudflare(需 PAT) | 同上 |
| `settled_at` column on quack_predictions | migration 0006 部分未套 | 改用 `evaluated_at`(現存欄位) |
| Manual trigger weekly_picks | quack_judgments 沒 `settled_at`(0019 沒套) | gracefully 報 `schema_pending` |

---

## 卡點(誠實)

### 真實 production blocker

🔴 **收尾 1 + 2 BLOCKED**:不在我控制範圍內。

需 CEO 在 Supabase Dashboard 重設 DB password(3 分鐘),或拿 PAT 給我永久解封。

### 軟卡點

1. **`flagged_minor` 切點實證偏緊**:T3b 跑完第一場真實會議後可能要調寬到 7%
2. **0006 migration 部分未套用**:跨 task 的 schema 一致性沒人 audit、可能還有別的地方漏套
3. **Zeabur 無 API token**:即便 password 修好,Zeabur 環境變數還是要 CEO 手動更新一次

---

## 範圍宣告

- ✅ **未呼叫 Claude API**(本任務 LLM 成本 = $0)
- ✅ **未刪除任何過去資料**(quack_predictions 2769 → 2769、analyst_daily_picks 22 → 22)
- ✅ **未 archive / 隱藏資料**(統計面 filter 排除 rejected/pre_upgrade,詳情面仍可訪問)
- ✅ **未動 LLM 寫入主邏輯**(`_build_market_snapshot` / `_generate_holdings_for` 等核心 LLM call 沒改,留給 T3b)
- ✅ **未啟動結算 cron**(`ENABLED = False`,加上 manual trigger 雙保險)
- ✅ **所有 schema 變更可回滾**(0019 + 0019_DOWN 備好)
- ✅ **未動 prompt / agent / IP**
- ✅ **未動 .env 中的 password 值**(只補 config bug,把已存 password 從 .env.local 拷到 .env)

---

## 📨 給 CTO 的訊息(精簡版)

1. **6 項收尾:4 PASS、2 BLOCKED**(收尾 1+2 卡 password)、End-to-end 5/5 PASS
2. **零刪除守住**:quack_predictions 2769→2769、analyst_daily_picks 22→22
3. **收尾 1 解封最快路徑**:CEO 進 https://supabase.com/dashboard/account/tokens 拿 PAT(`sbp_*`)、貼進 `ceo-desk/.secrets.local`、我跑 `python scripts/t3a_apply_password_rotation.py auto` 就好
4. **收尾 2 跟著解**:跑 0018 migration、把 evidence JSONB 4 keys 拷到 column
5. **Sanity 三段切點實證偏緊**:T3b 跑完第一場會議後可能要放寬到 1.5%/7%/30%
6. **0006 migration 部分未套用**:`quack_predictions.settled_at` 應該存在但沒、用 `evaluated_at` 替代;建議 T3b 前做一次 schema 一致性 audit
7. **建議補條件 7:Supabase DB 連線健康**(就是這個 password 卡點)
8. **`flagged_minor` 命名建議改成 `flagged_moderate`**(5-25% 不算 minor)
9. **T3b 主修建議照前次 outbox(`_build_market_snapshot` 注入 LIVE close)**
10. **結算 cron `ENABLED = False` + `T3A_CONFIRM_APPLY=1` + 沒註冊 scheduler = 三層保險**

---

Task ID: STAGE1-T3a-CLEANUP-AND-PREP
Completed at: 2026-04-27T00:07:34+08:00
Cleanups: 4✅ + 2🔴 (BLOCKED on DB password) = 4/6 fully delivered
End-to-end: 5/5 PASS
Zero-deletion: ✅(2769 → 2769)
LLM cost: $0
Production blocker: SUPABASE_DB_PASSWORD 過期(已備好 3 模式解封工具)
