# NEXT_TASK — STAGE1-T2.5-ADVERSARIAL-VERIFICATION

**授權等級**：🔒 READ-ONLY + 1 次小實測（< $0.50 LLM 成本）
**建立時間**：2026-04-26 21:0X TPE（CEO 寫入）
**接手者**：Claude Code
**前置依賴**：質疑 STAGE1-T2 (commit `3ee8908`) 結論、找反證

---

## 為什麼有這個 task

STAGE1-T2 的 NEXT_TASK 寫法帶引導性詞彙（「真健康率」「hallucinate」「運氣好」），可能讓上一輪產生 confirmation bias。

CTO 自己承認當時寫法有引導性。

**精神：假設 STAGE1-T2 結論全錯、給反證**。
- 反證找不到 → STAGE1-T2 成立、可動手修
- 反證找得到 → 整個方向重評估

---

## 6 項驗證

1. **偏差分布原始樣貌**（150 筆 multi-threshold slicing）
2. **時間錯配假說**（用「predicted_at 那天」真實 close 重算 BACKFILL）
3. **hardcoded 1050 影響實測**（2330 entry 分布 vs 其他股票）
4. **Prompt 注入鏈完整性**（找漏掉的注入點）
5. **LLM 行為實測**（10 次 call、< $0.50）
6. **HOLDINGS vs BACKFILL 路徑差異**

## 核心原則

- 中性語言：禁用「hallucinate」「真健康」「運氣」「失真」「污染」
- 多閾值切片：0.5%/1%/2%/5%/10%/25%
- 對抗思維：找相反假說
- 不下「修哪裡」建議
- 0 LLM 呼叫除驗證項 5、預算 < $0.50

## 禁止事項

1. ❌ 引導性詞彙
2. ❌ 單一閾值
3. ❌ 「修哪裡」建議
4. ❌ 跳過任何驗證項
5. ❌ LLM 呼叫超 10 次
6. ❌ 修任何東西
7. ❌ archive/刪除/隱藏過去預測
8. ❌ 沿用 STAGE1-T2 結論當前提

## 完成條件

1. ✅ 6 項驗證每項原始數字 + 證據
2. ✅ 反證綜合判斷
3. ✅ outbox 寫入
4. ✅ 第一行系統時間
5. ✅ 工具紀錄
6. ✅ 範圍宣告
7. ✅ LLM 成本 ≤ $0.50

---

Task ID: STAGE1-T2.5-ADVERSARIAL-VERIFICATION
