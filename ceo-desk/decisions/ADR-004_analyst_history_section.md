# ADR-004:5 位 analyst 個人頁「歷史預測表現」section 規劃

**狀態**：proposed (T3a-cleanup 提案,T3d 之後實作)
**日期**:2026-04-27
**作者**:Claude Code(STAGE1-T3a-cleanup 收尾 5)
**前置依賴**:T3a (4f79e44) + T3a-cleanup + T3d 結算 cron 啟動

---

## 背景

T2.5 + T3a 數字實證:
- BACKFILL_008d1 + 008d2 共 2000 筆預測中、**1193 筆(60%)落 precise+acceptable 級**(< 5% 偏差)
- 這 1193 筆是「呱呱訓練期間」真實的數字驗證紀錄、是難得的訓練素材
- 不展示等於把信任素材閒置

但「呱呱這週挑的」(`/weekly_picks`) 是**當前式 UI** — 放半年前資料會語意錯亂:
- UI 文案「這週挑」=「現在進行式」
- 訓練期紀錄是「歷史回看」=「過去式」
- 混在一起會讓使用者誤以為現在的呱呱也跟訓練期一樣準

**折中方案**:5 位 analyst 個人頁(`/analysts/[slug]`)加「歷史預測表現」section,
跟「目前持倉」(當前式)、「最新觀點」(當前式)區隔開。

---

## 設計

### 位置

```
/analysts/[slug]
├── (existing) Hero — 人格、戰績摘要
├── (existing) 目前持倉
├── (existing) 最新大盤觀點
├── (existing) 學習筆記
├── (existing) 出席過的會議
└── (NEW) 歷史預測表現(訓練期)  ← 加這個
```

### 顯示資料

```sql
SELECT id, target_symbol, target_name, direction, target_price,
       current_price_at_prediction, deadline, hit_or_miss,
       evidence->>'basis_quality' AS basis_quality,
       evidence->>'basis_accuracy_pct' AS basis_accuracy_pct,
       created_at
FROM quack_predictions
WHERE agent_id = $1
  AND evidence->>'backfill_marker' IS NOT NULL  -- 訓練期 only
  AND evidence->>'basis_quality' IN ('precise', 'acceptable')  -- 只展示信得過的
ORDER BY created_at DESC
LIMIT 50;
```

### 顯示欄位

| 欄位 | 來源 | 顯示方式 |
|---|---|---|
| target_symbol + target_name | quack_predictions | 「2330 台積電」 |
| direction | quack_predictions | 看多 ↑ / 看空 ↓ |
| current_price_at_prediction | quack_predictions | $1020 |
| target_price | quack_predictions | $1050 |
| basis_accuracy_pct | evidence JSONB | 0.45%(綠色 chip)|
| basis_quality | evidence JSONB | precise / acceptable badge |
| deadline | quack_predictions | 2026-02-08 |
| hit_or_miss | quack_predictions(T3d 結算後填) | 命中 ✓ / 未中 ✗ / 觀察中 |
| created_at | quack_predictions | 2026-02-01 |

### 排序

`created_at DESC`、最近 50 筆。

### 區段標題 + 標註

```
【歷史預測表現(訓練期)】

此為呱呱正式上工前(< 2026-04-26)的訓練期紀錄。
- 已驗 entry_price 跟當日真實 close 偏差 < 5%
- accuracy 已過濾,呈現的都是基準乾淨的預測
- 不代表呱呱當前的命中率(看上方戰績總表)

[表格: 50 筆]
```

### 何時實作

**不在 T3a-cleanup / T3b / T3c 實作**。
**T3d 完成 + 結算 cron 跑過至少一輪後**才實作:
- T3d 啟動後 2000 筆 BACKFILL 開始有真實 hit_or_miss 資料
- 沒結算的話表格會大半空,使用者看不到價值
- 跑一輪結算之後,才有完整的「預測 + 命中」對照可秀

### 預期工程量

- backend route:`GET /api/analysts/{slug}/history` → 約 30 行新 code
- frontend component:`<HistoryPerformance>` → 約 80 行 React/TSX
- 整合進 `/analysts/[slug]/page.tsx` → 約 10 行
- **總計約 2 小時實作 + 30 分鐘對 5 位 analyst 各驗一次**

---

## 為什麼不在「呱呱這週挑的」展示

1. **UI 概念衝突**:當前 vs 歷史
2. **訓練期 ≠ 商業期、要分明**:訓練期準不代表商業期準
3. **個人頁深度頁面**:訪問者已是進階使用者、看得懂訓練期意涵

---

## 我(Claude Code)對 CTO 的反饋

### 質疑點 1:50 筆夠嗎?

CTO 提案 50 筆。我的看法:
- 5 位 analyst 各約 200-400 筆 BACKFILL,扣掉 invalid/biased 後每位約 240 筆 precise+acceptable
- 50 筆顯示「最近的」+「滾動更新」剛好,使用者也吞得下
- 提供「載入更多」按鈕比一次顯示 200 筆好(避免 page slow)

**結論**:同意 50 筆 + 加「載入更多」按鈕(無限捲動到 240 上限)

### 質疑點 2:basis_quality 取 precise + acceptable 對嗎?

CTO 提案 only `precise` + `acceptable`(< 5% 偏差)。我的看法:
- T3a 證實 BACKFILL biased(5-25%) 也佔 21%(424 筆)
- biased 不代表預測本身錯、只是 entry_price 偏離
- **建議**:加 toggle「顯示中度偏差(biased)」,預設關閉
  - 預設模式只顯示 1193 筆(precise + acceptable)
  - toggle 開了顯示全部 1617 筆(+ biased 424)
  - **不顯示 invalid**(那是訓練期前的破口、跟 T3a HOLDINGS 同性質)

### 質疑點 3:標註文字建議

CTO 提案文字:
> 此為呱呱正式上工前的訓練期紀錄、accuracy 已驗證 < 5%

我建議微調:
> 此為呱呱正式上工前(2026-04-26)的訓練期紀錄。
> 顯示的紀錄已過濾(entry_price 跟當日真實 close 偏差 < 5%)。
> 訓練期命中率不代表商業期表現,看上方總戰績為準。

加入「不代表商業期表現」是因為:
- 訓練期有「事後諸葛」風險(LLM 知道後續發展)
- 商業期是真即時、challenging
- 不應拿訓練期的 hit_rate 當招牌

### 補充建議:加「篩選器」

讓使用者在歷史 section 內可以:
- 篩 direction(看多/看空)→ 看哪個方向比較穩
- 篩 basis_quality(precise / acceptable / biased)→ 看品質分布
- 篩 hit_or_miss(命中 / 未中)→ 看分析師強項弱項

這 3 個篩選器是 5-line code 但能讓使用者深度互動,**強烈建議加**。

---

## 採納

待 CTO 在 T3d 階段啟動實作時 review 本 ADR 並決定是否採納。

---

## 修訂歷史

| 版本 | 日期 | 變更 |
|---|---|---|
| v1 | 2026-04-27 | 初版,T3a-cleanup 收尾 5 |
