# NEXT_TASK: STAGE1-T3a-FOUNDATION-DEFENSE

基礎防線建設：schema 升級 + sanity check + 污染資料隔離 + 前台 filter

**授權等級**：🛡️ ADMIN（會動 DB schema、會 UPDATE 既有 row、會改前後端 code）
**建立時間**：2026-04-26 ~22:30 TPE
**接手者**：Claude Code

## 為什麼先做這個

T2/T2.5/T2.6 三份報告整合後修復策略：T3a 防線 → T3b 主修 HOLDINGS → T3c 收尾驗證 → T3d WEEKLY_PICKS。

CTO 決定先 T3a 不是 T3b：沒 sanity check 的話，T3b 修完跑會議時，萬一 LLM 不照注入的價，又寫一波髒資料。
防線必須在主修之前架好——這是 Vincent「寧願慢一步把架構建好」鐵律的真正執行。

T3a 是 0 風險：只動 schema、加防線、加 filter，不動 LLM 寫入邏輯主體（那是 T3b）。

## 任務目標

四道防線：
- 防線 1：DB schema 升級（quack_predictions + quack_judgments 各加 4 欄位）
- 防線 2：寫入前 sanity check（validate_prediction_entry_price）
- 防線 3：污染資料隔離（標記不刪：125 + 22 + 5 = 152 筆 + BACKFILL basis_accuracy）
- 防線 4：前台統計 quality filter（統計面 filter / 詳情面不 filter）

## 核心原則

1. 0 LLM 成本：純 schema + 寫入函數 + filter 修改、不呼叫 Claude API
2. 不刪不藏不 archive：所有過去資料完整保留（Vincent 鐵律）
3. 不動寫入邏輯主體：T3a 只架防線、不修注入鏈本身
4. 每步可逆：所有 schema 變更要有 down migration、能回滾
5. 每步驗收：每道防線建完立刻測試、不通過不繼續
6. 時間錨點：outbox 第一行從 /api/time/now
7. 誠實：做不到就寫做不到、不假完成

## 完成條件

1. 4 道防線全部上線、總驗收通過
2. End-to-end 測試證據完整
3. outbox 寫進 ceo-desk/outbox/LATEST_REPORT.md
4. outbox 第一行有系統時間
5. 工具紀錄完整
6. 對 CTO 的反饋有實質內容
7. 範圍宣告完整
8. 0 LLM 成本（或標註實際成本）

## 完成後

1. outbox 寫好
2. git add . && git commit -m "STAGE1-T3a: foundation defense (schema + sanity + isolation + filter)" && git push
3. 告訴 Vincent 「outbox 已寫入、commit hash 是 XXX」

呱呱所主在等。
這次不修主路、先架防網。
T3b 之前、防網先穩。
