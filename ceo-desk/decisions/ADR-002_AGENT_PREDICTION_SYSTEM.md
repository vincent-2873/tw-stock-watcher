# ADR-002: Agent 預測系統 — 結構化預測 + 強制留檔

- **狀態**：已採納（Accepted）
- **日期**：2026-04-24
- **決策者**：Vincent（CEO）
- **提案者**：Claude CTO
- **依據**：SYSTEM_CONSTITUTION Section 5

---

## 背景

呱呱招待所的商業價值建立在「**透明的命中率**」。使用者為什麼願意付訂閱費？因為：

1. 所有預測**公開**（不能事後抹除失敗）
2. 命中率**可查**（近 30 天 / 近 1 年 / 全期）
3. 失敗有**學習筆記**（agent 真的會進步）

這三件事都需要「**結構化預測**」當底層。自由文字的「呱呱覺得台積電會漲」追蹤不了命中率、統計不了勝率、累積不了學習。

## 決策

**每一次 agent 做預測，必須產生結構化紀錄**（完整欄位見憲法 Section 5.1）：

```json
{
  "prediction_id": "PRED-2026-0427-001",
  "agent_id": "analyst_a",
  "target_symbol": "2330",
  "direction": "bullish",
  "target_price": 1050,
  "current_price_at_prediction": 1020,
  "deadline": "2026-05-01T13:30:00+08:00",
  "confidence": 0.75,
  "reasoning": "技術突破月線 + 外資連買 5 日 + 歷史回測 68%",
  "success_criteria": "收盤價達到或超過 1050",
  "status": "active",
  "learning_note": null
}
```

### 關鍵設計

1. **`success_criteria` 由 agent 自己定義**：
   - 系統不干預「命中」標準
   - 有的 agent 嚴格（收盤必須達標），有的寬鬆（方向對就算）
   - **尊重 agent 主觀**就是尊重人設

2. **失敗必寫 `learning_note`**：
   - 這是憲法鐵律 #2 的實作
   - 寫不出來就不能關單（強制前端 modal）
   - 所有 learning_notes 同步寫入 `agent_learning_notes` 表 + 各 agent 的 `MEMORY.md`

3. **結算流程**：
   - `deadline` 到期 → cron 自動抓當下實際價 → 按 `success_criteria` 判定
   - 結果進 `agent_stats.wins/misses` → 更新命中率
   - 命中率**前端公開**（使用者訂閱前能先看）

4. **DB 選型：擴充 `quack_predictions`，不新建 `predictions` 表**：
   - 現有 `quack_predictions` 已在用（migration 0003_quack_phase2.sql）
   - 擴充 9 個欄位（agent_id / target_symbol / target_price 等）比重建成本低
   - 遷移 code：`backend/routes/quack.py:239, 246, 294`（3 處需同步更新）
   - 詳見 migration `0006_agent_prediction_system.sql`（本日同步產出）

## 選項比較

| 選項 | 優 | 缺 | 結論 |
|---|---|---|---|
| A. 自由文字預測 | 寫作彈性 | 無法追蹤命中率、無法累積學習 | ❌（破壞商業模型） |
| B. **結構化 + 欄位擴充既有表** | 結構清楚、遷移成本低 | 需同步改 3 處 backend code | ✅（本採納） |
| C. 結構化 + 新建 `predictions` 表 | schema 乾淨 | 要搬歷史資料、雙寫期 | ❌（遷移風險） |

## 風險與緩解

| 風險 | 緩解 |
|---|---|
| agent 偷懶不寫 `learning_note` | 前端強制 modal，沒寫不能結案；後端 API reject 缺失 |
| `success_criteria` 用語不統一 | 前期由 CTO 每週抽查 5 筆；後期訓練 agent 一致性 |
| 結算當下 API 抓不到價（休市） | 順延至下一交易日收盤；停市由呱呱人工裁決 |

## 本 ADR 對應憲法段落

- Section 5（Agent 預測系統）
- Section 9.1.1（`predictions` / `quack_predictions` 擴充 schema）
- 鐵律 #1（每個預測都留檔）
- 鐵律 #2（錯了會檢討）

## 後續相依任務

- **NEXT_TASK #002**：寫 migration `0006_agent_prediction_system.sql`（本日已先寫 ✅）
- **NEXT_TASK #004**：設計 5 位分析師人設（各自 `success_criteria` 風格）
- **NEXT_TASK #006**：預測結算 cron（每小時掃到期預測）

## 修訂紀錄

| 日期 | 版本 | 修改 |
|---|---|---|
| 2026-04-24 | v1.0 | 初版 |
