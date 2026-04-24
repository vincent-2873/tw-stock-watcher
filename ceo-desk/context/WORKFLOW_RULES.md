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

---

## ⏰ 時間管理規則

### Vincent 不用管時間
Vincent 不會手動提供時間。系統必須自己處理。

### Claude Code 是時間管家
每次寫 outbox/LATEST_REPORT.md 時,第一行必寫:
📅 TPE: [TZ=Asia/Taipei date '+%Y-%m-%d %H:%M:%S (%A %p)' 的結果]

例如:📅 TPE: 2026-04-24 22:45:30 (Friday PM)

### Claude CTO 的限制
- 沒有內建時鐘,不准自己猜時間
- 不寫具體鐘點(「早上 9 點」這種)
- 從 outbox 第一行取得時間錨點
- 沒時間資訊時不要問 Vincent,要問 Claude Code

### 投資系統時間規則(致命重要)
- 所有資料抓取時間用系統時鐘(date / datetime.now())
- backend 用 time_utils.now_tpe()(spec 10)
- 前端時間顯示由 backend 提供
- Claude Code 部署前驗證系統時區正確

### 時間敏感任務清單
以下任務必須用系統時間驗證:
- 盤中資料抓取、推播發送、交易建議時間戳
- 資料新鮮度判斷、cron 排程、LINE 通知時間
