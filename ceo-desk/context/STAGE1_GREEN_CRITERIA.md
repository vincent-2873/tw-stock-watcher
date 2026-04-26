# 階段 1:資料層全綠條件(v2、2026-04-27 校準)

**版本**:v2
**校準者**:Claude Code(STAGE1-T3a-cleanup 收尾 6)
**校準日期**:2026-04-27
**前置依賴**:T3a (4f79e44) + T3a-cleanup

---

## 校準理由

### v1 設計問題(原版)

原版「19 源完整度 80%」太粗、不分核心輔助:
- 19 源含 PTT 論壇 + 小眾消息源,這些經常斷線、80% 完整度太重
- 沒區分「主要決策依賴的核心源」vs「輔助補充」
- 容易因為小眾源缺一兩天 → 階段 1 永遠不全綠

### v2 改動

1. **拆「核心 6 源」vs「輔助 13 源」**:核心源 ≥ 80% 完整度才算全綠;輔助源不算入
2. **加「LLM 寫入鏈通過 sanity check」維度**(T3b 之後啟用):確保 LLM 不再瞎寫
3. **加「資料品質檢查」維度**(T3c 之後啟用):watchdog 不只看「有沒有」也看「對不對」
4. **加「結算機制有效運作」維度**(T3d 之後啟用):每筆預測有結算結果,信任素材累積中

---

## 5 條全綠條件

### ✅ 條件 1:股價誤差 < 1%

**狀態**:已驗(STAGE1-T1, commit `bde8de7`)
**驗收方式**:5 檔台股(2330/2317/2454/2308/2882)+ 5 檔美股(AAPL/MSFT/GOOG/NVDA/TSLA)各對 Yahoo / yfinance 比對,誤差 < 1%
**watchdog 整合**:已上線,每日跑

### ✅ 條件 2:權威時鐘運作正常

**狀態**:已驗(STAGE1-T0/T1)
**驗收方式**:`GET /api/time/now` 回傳 `Asia/Taipei` 時區、誤差 < 1 秒
**watchdog 整合**:已上線

### ⏸️ 條件 3:/watchdog 加入資料品質檢查

**狀態**:T3c 完成才啟用
**驗收方式**:
- 每日新寫入預測中 `data_quality_status = 'rejected_by_sanity'` 比例 < 1%
- 每日新寫入預測中 `basis_quality = 'invalid'` 比例 < 1%
- 每日新寫入預測中 `data_quality_status = 'flagged_minor'` 比例 < 5%
**對應 task**:T3c 寫 watchdog 規則 + 報警機制

### ⏸️ 條件 4:LLM 寫入鏈通過 sanity check

**狀態**:T3b 完成 + 真實會議測試之後
**驗收方式**:
- 1 場 25 筆預測,基準分布:
  - **≥ 80%** 落 `precise` (< 1% 偏差)
  - **0 筆** `invalid` (≥ 25% 偏差)
  - **5 位 analyst 都至少 1 筆** `precise`
- 跑連續 3 場會議都符合這個標準才算穩
**對應 task**:T3b 修 `_build_market_snapshot` + HOLDINGS schema example

### ⏸️ 條件 5:核心 6 源完整度 ≥ 80%

**狀態**:STAGE1-T2 已部分驗(原版 19 源),需重新依新分類驗
**核心 6 源定義**:

| # | 源 | 用途 | 期望覆蓋率 |
|---|---|---|---|
| 1 | FinMind 台股股價 | 資料層基底、所有預測依賴 | ≥ 95% |
| 2 | yfinance 美股 | 美股傳導性分析 | ≥ 90% |
| 3 | 三大法人籌碼 | 籌碼派分析師主資料 | ≥ 85% |
| 4 | 基本面(EPS/PE/毛利率) | 評級師(基本面派)主資料 | ≥ 80% |
| 5 | 技術指標(MA/MACD/RSI) | 技術派分析師主資料 | ≥ 90% |
| 6 | 主流新聞(鉅亨/工商) | 題材熱度 + AI 分析素材 | ≥ 85% |

**完整度計算**:過去 7 天每日資料覆蓋率 / 應有覆蓋率 平均
**對應 task**:T3c 整合進 watchdog

### ⏸️(新增)條件 6:結算機制有效運作

**狀態**:T3d 完成 + 結算 cron 跑過至少 1 輪
**驗收方式**:
- `quack_predictions` 中 deadline 已過 + `evaluated_at IS NOT NULL` 比例 ≥ 95%
- `quack_judgments(weekly_picks)` 中 judgment_date + 7 天 + `settled_at IS NOT NULL` 比例 ≥ 90%
- 5 位 analyst 都有結算後的 `hit_or_miss` 累積資料(每位 ≥ 50 筆)
**對應 task**:T3d 啟動結算 cron + 補跑歷史 BACKFILL 結算

---

## 全綠之後才能進階段 2

階段 2 內容(預告):
- 多分析師人設深度化(各自個性 / 流派 / 學派)
- 商業期會議啟動(每日 08:00 投資部門會議 → 真實寫進 DB)
- 「呱呱戰情室」首頁 hero 重做(展示當日 5 位 analyst 各自的判斷)

階段 2 不應在階段 1 條件還有 ⏸️ 時開工。

---

## 我(Claude Code)對 CTO 的反饋

### 質疑點 1:5 條夠嗎?漏了什麼?

CTO 列了 5 條,我看完整 codebase 後建議補上**條件 6:結算機制**(已加在上面)。
理由:有預測但沒結算 = 沒命中率資料 = 信任素材是 0。憲法 Section 5「每次預測都公開命中率」沒落地等於階段 1 不算全綠。

**潛在漏的維度**(備記、CTO 評估是否補):
- **Backend uptime**:Zeabur 每月 ≥ 99% uptime 才算全綠(這個 Zeabur 自帶 SLA,可能不需要再列)
- **Anthropic API 配額充足**:每日 LLM 成本 < $5 USD(防超支)
- **Supabase DB 連線健康**:T3a-cleanup 卡在這、值得列為硬條件

### 質疑點 2:條件 4「≥ 80% precise、0 筆 invalid」太嚴或太鬆?

CTO 提案「≥ 80% 落 < 1% 偏差、0 筆 > 25%」。

**我的分析**(根據 T2.5 + T3a 實證):
- BACKFILL precise 比例 = 404/2000 = **20%**(差 60%)
- BACKFILL acceptable 比例 = 789/2000 = 39%
- BACKFILL precise + acceptable 合計 = **60%**
- HOLDINGS invalid 比例 = ~80%(極差)

**結論**:CTO 提案的 ≥ 80% precise 是「BACKFILL 實際落在 20% precise」的 4 倍標準,**很嚴**。

**建議調整**:
- **嚴格版**:≥ 80% `precise` (適合 T3b 完成後,LLM 真的拿到 LIVE close 該達標)
- **務實版**:≥ 60% `precise + acceptable` + ≤ 5% `invalid`(對應 BACKFILL 實際分布、留餘地)
- **勸退版**:≥ 80% `precise` 保留為「階段 1 + 階段 2 之間的過渡標準」、階段 2 啟動門檻

CTO 決定採哪個版本看商業節奏。我傾向務實版讓階段 1 能進得去、再用嚴格版把關階段 2 進入。

### 質疑點 3:核心 6 源分類同意嗎?

**同意**。BUT 補一個觀察:
- **新聞源**(主流新聞/鉅亨/工商)已經被 ARTICLE_ANALYZE LLM 鏈處理進 `intel_articles`
- 「完整度」應該是「每日有 N 篇分析過的文章 / 每日應有 N 篇」
- 現有 `intel-cron` 每 15 分跑、應該不會缺日,但要寫個 watchdog 對照看有沒有跑空

### 補充:條件 7?——資料對照(adversarial testing)

T2.5 用 LLM 不帶任何 example 也回 1050、證實「訓練記憶」是污染主因。
階段 1 全綠之後階段 2 開工前,**建議加一個「對抗性測試」回合**:
- 拿 T3b 修好的 `_build_market_snapshot`,跑 5 次,看 LLM 會不會仍然抄訓練記憶
- 如果 5 次都通過 sanity check + basis_quality=precise → 商業期穩
- 如果有 1 次仍然抄記憶 → prompt 還沒夠強、回頭加鐵律

這個不必當「條件」、可當「條件 4 的子驗收項」。

---

## 修訂歷史

| 版本 | 日期 | 變更 |
|---|---|---|
| v2 | 2026-04-27 | 拆核心 6 源 vs 輔助 13 源、加條件 4(sanity)、條件 6(結算)、加 Claude 反饋 |
| v1 | (原版,被取代) | 19 源完整度 80% 單一條件 |
