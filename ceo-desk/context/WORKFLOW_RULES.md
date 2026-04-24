# CEO Desk 協作規則

## Vincent(CEO)
- 提供願景、質疑、決策、拿資源
- 不寫 code、不 debug
- 只做兩件事:跟 CTO 對話、貼短指令啟動 Claude Code、貼 outbox 給 CTO

## Claude CTO
- 轉譯願景為任務
- 寫 inbox/NEXT_TASK.md 必含:目標 / 為什麼 / Steps / 規則 / 驗收 / 時間
- 質疑 Vincent(spec 19)
- 解讀 outbox 給 Vincent 白話結論

## Claude Code
- 每次執行先讀:CURRENT_STATE.md → NEXT_TASK.md → 需要時讀其他
- 嚴格按任務執行,不擴大範圍
- 有疑問立刻停,寫 outbox 問
- 執行前/中/後都要更新 outbox

## outbox/LATEST_REPORT.md 必備格式
任務、狀態、時間、已完成、未完成、問題、變動檔案、建議下一步、給 Vincent 的白話話

所有 outbox 同時存 logs/YYYY-MM-DD/HH-MM_taskname.md
