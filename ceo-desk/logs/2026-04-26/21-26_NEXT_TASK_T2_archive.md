# NEXT_TASK — STAGE1-T2-FULL-AUDIT（資料寫入鏈全面深度盤查）

**授權等級**：🔒 READ-ONLY（純診斷不修）
**建立時間**：2026-04-26 17:38 TPE（CEO 寫入）
**接手者**：Claude Code
**前置依賴**：基於 STAGE1-T1（commit bde8de7）的 5 層全綠驗證

---

## 背景

STAGE1-T1 已驗證：
- FinMind / DB stock_price / Backend API / 前台 / Yahoo 5 層全綠（2330=2185 全部一致）
- 美股 AAPL/NVDA/MSFT 全綠
- 歪的只有 quack_predictions 表 04-25 11:43 那場 HOLDINGS 會議的 125 筆 current_price_at_prediction
- 偏差 -3% 到 -97% 不固定、同場同股票 5 位 analyst 拿到不同 entry
- v2 / v1 BACKFILL_008d1 / v1 04-24 早場「看起來健康」、只 04-25 11:43 大爆

這次不重驗已驗過的東西。徹底搞清楚「為什麼 + 盤查所有可能也歪掉的地方」。

---

## 任務目標

13 個盤查方向全部做完、給結論、給證據。寧願慢、不要漏。仍然只診斷不修。

## 13 個盤查方向

1. Prompt 注入鏈完整 trace（會議生成器入口、5 位 analyst LLM 呼叫、prompt template、current_price 注入機制）
2. 5 位 analyst 個人 prompt 差異（共用 base 還是獨立、差異點）
3. 股票級差異（2382 全對 / 2308 與 2383 全錯，找 symbol-by-symbol pattern）
4. 過去「健康」紀錄真實性（v2/v1 BACKFILL/v1 04-24 各抽 10 筆，算真健康率）
5. 其他 LLM 寫入路徑（daily_recommendations / market_view / cross_market_view / 個人持倉 / learning_notes / 呱呱對話）
6. 純資料 cron 寫入正確性（FinMind/yfinance/籌碼/基本面/技術指標/19 個資料源 transform code）
7. agent_stats / 勝率計算路徑（hit/miss 判定基於 entry_price 還是 stock_price）
8. 顯示層讀的是哪一份資料（前台首頁/個人頁/RPG/預測詳情/會議詳情/大盤觀點）
9. DB schema 是否有 source 紀錄（能不能區分 LLM vs cron 寫入）
10. Prompt 構造是否有共用 base template
11. 寫入前 sanity check 機制（有沒有「entry vs stock_price 差太多就擋」）
12. 環境變數 / hardcoded / fixture 殘留（grep 1050/1100/test_price/mock_price）
13. /watchdog 商業級儀表板數字真假（19 源完整度、cron 健康度算法）

## 綜合判斷 6 題

A. 主根因是什麼？（一句話）
B. 受污染範圍多大？（哪些表、多少筆、哪些時段）
C. 過去「健康」紀錄真的健康嗎？真健康率 %？
D. 系統還有沒有其他「同一個破口模式」的地方？
E. 修復順序建議：先修哪、再修哪、最後修哪、為什麼
F. 修復後驗證機制建議

---

## 禁止事項（違反 = 任務失敗）

1. ❌ 不准修任何東西（純診斷）
2. ❌ 不准跳過驗證直接寫結論
3. ❌ 不准說「應該」「大概」「差不多」
4. ❌ 不准說「我看不到」「做不到」
5. ❌ 不准呼叫 Claude API
6. ❌ 不准跑 5 位 analyst 預測
7. ❌ 不准動 prompt、agent 設定、IP
8. ❌ 不准 archive/刪除/隱藏過去預測
9. ❌ 不准跳過 13 方向中任何一個
10. ❌ Vincent 不在現場時不准順手做別的 task

## 完成條件

1. ✅ 13 個方向每個都有答案 + 證據
2. ✅ 綜合判斷 6 題都有答案
3. ✅ outbox 寫進 ceo-desk/outbox/LATEST_REPORT.md
4. ✅ outbox 第一行有系統時間（從 /api/time/now）
5. ✅ 工具紀錄完整（含失敗繞道）
6. ✅ 卡點誠實列出
7. ✅ 未動任何修改、未呼叫 Claude API
8. ✅ 範圍宣告完整

---

Task ID: STAGE1-T2-FULL-AUDIT
