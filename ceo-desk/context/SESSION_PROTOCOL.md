# Session 接棒協議

> 建立：NEXT_TASK_007（2026-04-25）
> 目的：讓所有後續 Claude Code session 能用 5 分鐘接棒，而非從 9 小時混亂中重建上下文。

---

## 每個 NEXT_TASK 開頭強制（Step 0）

讀 `ceo-desk/handoffs/SESSION_HANDOVER.md`，確認沒有衝突或遺漏才繼續 Step 1。

如果 SESSION_HANDOVER 寫的「最後完成的任務」跟 NEXT_TASK 假設的「上一個任務」對不上 → 立即在 outbox 第一行喊停。

---

## 每個 NEXT_TASK 結尾強制

1. 寫 `outbox/LATEST_REPORT.md`（給 Vincent + CTO）
2. 覆蓋更新 `ceo-desk/handoffs/SESSION_HANDOVER.md`（給下一個 session）
3. 歸檔舊版 SESSION_HANDOVER 到 `ceo-desk/logs/YYYY-MM-DD/HH-MM_HANDOVER.md`

順序很重要：先歸檔舊版，再覆蓋。歸檔失敗不准覆蓋。

---

## 兩份檔案的差異

| 檔案 | 讀者 | 內容 | 風格 | 長度 |
|---|---|---|---|---|
| `outbox/LATEST_REPORT.md` | Vincent + CTO | 執行細節、證據、建議 | 報告 | 詳細，含截圖、curl 證據 |
| `handoffs/SESSION_HANDOVER.md` | 下一個 Claude Code | 上下文、雷、可用工具 | 接棒便條 | 5 分鐘讀完 |

---

## 為什麼要這套？

> Claude CTO 沒有時鐘、看不到檔案。
> Vincent 是唯一的橋。
> 每個 Claude Code session 是一次性 — 沒記憶、沒 hook、沒 cron。
>
> 沒有接棒協議 → 下一個 session 跟你今天一樣從 9 小時的混亂中接手 → 然後也跑 9 小時混亂。

接棒協議是中斷這個循環的唯一機制。

---

## 違反協議的後果

- 跳過 Step 0 讀 HANDOVER：很可能跟前 session 衝突、改回已修的 bug、開錯路徑
- 沒寫 HANDOVER：下一個 session 浪費 1-2 小時重新探勘
- 沒歸檔：時間久了 logs/ 缺漏，沒辦法回溯歷史

---

**這份協議不是建議，是強制流程。**
