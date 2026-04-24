# 🏮 CEO Desk - 呱呱投資招待所指揮中心

Vincent(CEO)、Claude(CTO)、Claude Code(工程主管)三方協作橋樑。

## 資料夾
- inbox/    CTO → Claude Code 任務
- outbox/   Claude Code → Vincent 回報
- context/  三方共用文件(規則、狀態、願景、角色、會議、路線圖)
- logs/     歷史紀錄(YYYY-MM-DD/HH-MM_taskname.md)

## 工作流
1. Vincent 跟 CTO 對話
2. CTO 寫任務 → inbox/NEXT_TASK.md
3. Vincent 對 Claude Code 說:「讀 ceo-desk/inbox/NEXT_TASK.md 執行」
4. Claude Code 執行 → 寫 outbox/LATEST_REPORT.md + 存 logs/
5. Vincent 貼 outbox 給 CTO
6. CTO 決定下一步

## 品牌精神
侘寂風、木頭褐色、日式招待所、遊戲化(原創非寶可夢 IP)、多智能體決策系統
