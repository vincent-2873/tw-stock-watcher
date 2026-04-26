# NEXT_TASK: STAGE1-T3a-CLEANUP-AND-PREP

憑證修復 + Schema 清遷 + Sanity 升級 + 結算欄位預備 + 階段條件校準

**授權等級**：🛡️ ADMIN
**建立時間**：2026-04-26 ~23:48 TPE
**接手者**：Claude Code（從 T3a 4f79e44 接棒）

## 為什麼有這個 task

T3a 完成 4 道防線、但有 6 個收尾事項：
- T3a 用 evidence JSONB workaround 因為 SUPABASE_DB_PASSWORD 過期
- T3a 的 sanity check 用單一 5% 閾值、CTO 重新判斷後改分級邏輯
- WEEKLY_PICKS 結算機制衝突要在 T3a-cleanup 設計（disabled）、T3d 才啟動
- 5 位 analyst 個人頁要規劃「歷史預測表現」section（規劃不實作）
- 階段 1 全綠條件要校準（原版 19 源 80% 太重、改核心 6 源）

## 六項收尾

1. 修 Supabase DB password + 更新三處 env
2. 跑 migration 0018.sql 清遷 JSONB → 正規 column
3. Sanity check 升級分級邏輯（clean / flagged / rejected）
4. quack_judgments 結算欄位 + 結算 cron 框架（disabled）
5. 5 位 analyst 個人頁「歷史預測表現」section ADR
6. 階段 1 全綠條件 v2

## 核心原則

1. 0 LLM 成本
2. 不刪不藏不 archive
3. 不動 LLM 寫入主邏輯（_build_market_snapshot 留 T3b）
4. 每步可逆
5. 每步驗收
6. outbox 第一行從 /api/time/now
7. 誠實

## 完成條件

1. 6 項收尾全 PASS
2. End-to-end 5 情境全 PASS
3. outbox 寫進 ceo-desk/outbox/LATEST_REPORT.md
4. outbox 第一行有系統時間
5. 工具紀錄完整
6. 對 CTO 的反饋有實質內容
7. 範圍宣告完整
8. 0 LLM 成本

## 完成後

git add . && git commit -m "STAGE1-T3a-cleanup: ..." && git push
告訴 Vincent commit hash + 6 項收尾全 PASS

呱呱所主在等。
這次把所有收尾一次做完、T3b 之前不留尾巴。
