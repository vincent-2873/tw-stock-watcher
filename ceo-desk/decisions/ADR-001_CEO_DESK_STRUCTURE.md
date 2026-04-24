# ADR-001: CEO Desk 結構（三方協作橋樑）

- **狀態**：已採納（Accepted）
- **日期**：2026-04-24
- **決策者**：Vincent（CEO）
- **提案者**：Claude CTO

---

## 背景

Vincent 同時與多個 Claude 介面互動（Claude Code、Claude.ai 網頁 CTO、Claude for Chrome）。各介面**無法直接通訊**：

- Claude Code 看不到 Vincent 和 CTO 的聊天歷史
- Claude CTO 看不到檔案系統（只能讀 Vincent 貼給他的片段）
- 必須靠 Vincent 人工複製貼上當「橋」

若缺乏明確協議與檔案結構：
- CTO 會假設某些狀態（可能過時）
- Claude Code 會重複解釋架構（浪費 context）
- 交接沒有標準格式，每次 session 都要重建背景

## 決策

建立 `ceo-desk/` 目錄，作為三方協作的**共享檔案協議**：

```
ceo-desk/
├── inbox/NEXT_TASK.md        # CTO → Claude Code 的任務指令（覆蓋式）
├── outbox/LATEST_REPORT.md   # Claude Code → CTO 的結果（覆蓋式）
├── context/                  # 長期背景（憲法、記憶、規則）
├── handoffs/                 # 歷史交接文件
├── logs/YYYY-MM-DD/          # 歸檔（inbox/outbox 覆蓋前自動存這裡）
├── decisions/                # ADR（本檔所在處）
└── assets/                   # 視覺資產（呱呱 PNG 等）
```

### 關鍵設計

1. **inbox / outbox 覆蓋式 + logs 歸檔**：
   - CTO 寫新 NEXT_TASK 前，Claude Code 先歸檔舊的到 `logs/YYYY-MM-DD/HH-MM_*.md`
   - Claude Code 寫新 LATEST_REPORT 前同樣歸檔
   - 好處：CTO 只需看最新，但歷史可追溯

2. **Vincent 是唯一的橋**：
   - CTO 寫完 inbox → Vincent 複製貼給 Claude Code
   - Claude Code 寫完 outbox → Vincent 複製貼給 CTO
   - 協議簡單，不依賴任何自動化

3. **時間管家責任**：
   - Claude Code 擁有終端機 + 能打 backend API，是唯一能取得真實時間的介面
   - 每份 outbox 第一行必寫 `System time: <ISO>`（來自 `GET /api/time/now`）
   - CTO 從 outbox 第一行取時間錨點（CTO 沒有時鐘）

## 選項比較

| 選項 | 優 | 缺 | 結論 |
|---|---|---|---|
| A. 每次對話重新交接 | 零基礎建設 | 每次 session 重建背景，高成本 | ❌ |
| B. **`ceo-desk/` 檔案協議**（本採納） | 結構化、可追溯、Vincent 低負擔 | 需維護協議紀律 | ✅ |
| C. 直接串 Claude Code ↔ CTO（自建 bridge） | 零人工搬運 | 工程量巨大、失去 Vincent 的質疑介入點 | ❌（喪失 CEO 監督） |

## 後續衍生

- `SYSTEM_CONSTITUTION.md`（Section 11）定義 Claude Code 的 SOP
- `WORKFLOW_RULES.md` 規範 inbox/outbox 格式
- `logs/` 自動歸檔機制靠 Claude Code 手動執行（無 cron，Vincent 要求低技術負債）

## 本 ADR 對應憲法段落

- Section 3.2（資料流）
- Section 10.2（CEO Desk 存檔機制）
- Section 10.3（自動歸檔流程）

## 修訂紀錄

| 日期 | 版本 | 修改 |
|---|---|---|
| 2026-04-24 | v1.0 | 初版（從 2026-04-24 中午 commit `4d67422` 建立 CEO Desk 時的決策回溯撰寫） |
