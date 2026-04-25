# NEXT_TASK #006 — Vincent 驗收 + 啟動首場會議

**授權等級**：🚀 WRITE-MAIN（人設微調 + 圖片替換 + 可選啟動會議）
**建立時間**：2026-04-25 01:05 TPE
**建立者**：Claude Code（session 2026-04-24 深夜批次工作交棒）
**適用對象**：Vincent（明天驗收）+ 下一個 Claude Code session（如 Vincent 授權）

---

## 🎯 任務目標

Vincent 明天起床後驗收 2026-04-24 深夜 session 的成果，決定：
1. 5 位分析師人設是否保留 / 要改
2. 11 位 agent 圖片替換（Vincent 會用 DALL-E 生）
3. 是否啟動「首場會議」產生第一批真實預測

---

## ✅ 驗收清單（Vincent 請逐項打勾）

### A. 前端實體驗收

- [ ] 打開 https://tw-stock-watcher.zeabur.app/agents
- [ ] 確認看到 12 個 agent cards（1 所主 + 5 投資 + 4 資訊 + 2 監督）
- [ ] 投資部門 5 位有命中率區塊（目前都「—」代表 0 筆預測）
- [ ] 金句 / 流派 / 個性都讀起來舒服（否則 → B）

### B. 5 位分析師人設驗收

分別讀 `ceo-desk/context/agents/analyst_a_MEMORY.md` ~ `analyst_e_MEMORY.md`：

- [ ] 阿武 A（技術派）人設 OK？
- [ ] 阿慧 B（基本面派）人設 OK？
- [ ] 阿跡 C（籌碼派）人設 OK？
- [ ] 阿數 D（量化派）人設 OK？
- [ ] 阿和 E（綜合派）人設 OK？

**要改的話** → 直接改檔案 → commit + push（或把需求寫進本檔）。

### C. Agent 視覺 — Vincent 明天做

- [ ] 用 DALL-E 生 11 張（6 部門 + 5 投資分析師）
- [ ] 放到 `frontend/public/characters/{agent_id}.png`
- [ ] 檔名建議：
  ```
  owl_fundamentalist.png
  hedgehog_technical.png
  squirrel_chip.png
  meerkat_quant.png
  fox_skeptic.png
  pangolin_risk.png
  analyst_a.png    (阿武 — 技術派，武士風)
  analyst_b.png    (阿慧 — 基本面，學者風)
  analyst_c.png    (阿跡 — 籌碼派，偵探風)
  analyst_d.png    (阿數 — 量化派，實驗室風)
  analyst_e.png    (阿和 — 綜合派，和尚風)
  ```
- [ ] 放完後告訴下一個 Claude Code 讓他改 `/agents/page.tsx` 把 emoji 換成 `<Image>`

### D. 自動化系統驗收

- [ ] 打開 https://github.com/vincent-2873/tw-stock-watcher/actions
- [ ] 確認 `🐺 System Watchdog` 每 15 分鐘有跑（綠勾）
- [ ] 確認 `🔍 Self Audit` 每 30 分鐘有跑（綠勾）
- [ ] 讀 `ceo-desk/watchdog/SELF_AUDIT.md` 看系統完整度最新狀態

---

## 🚀 啟動首場會議（可選，看 Vincent 指示）

**當前狀態**：
- quack_predictions 表 schema 齊了（Migration 0006）
- agent_stats 12 筆 seed 齊了（Migration 0007）
- 但**還沒有任何真實預測**被產生 → /agents 頁面命中率全 0

**為什麼沒自動產生**：
- 憲法 Section 7 定義會議排程在 07:30 / 08:00，但**會議生成器 code 還沒寫**
- 下一輪 NEXT_TASK #007 的範圍：寫 `backend/routes/meetings.py` + GHA cron

**今晚我先預留的骨架**：
- 沒寫 code，但已把架構 / SQL schema / agent persona 全準備好
- 明天 Claude Code session 接手時,可以一次性建完會議系統

**Vincent 如果想明天就看到阿武們動起來**，請寫：

```
/ceo-desk/inbox/NEXT_TASK.md
NEXT_TASK #007: 建會議生成器 backend + 啟動首場示範會議
授權等級: WRITE-MAIN
```

---

## 🎨 視覺替換流程（明天給圖後）

1. Vincent 把 11 張 PNG 放進 `frontend/public/characters/`
2. 告訴 Claude Code:「圖放好了,去 /agents 頁把 emoji 換 Image」
3. Claude Code 改：
   ```tsx
   // frontend/src/app/agents/page.tsx AgentCard 元件
   // 把 {agent.emoji} 換成 <Image src={`/characters/${agent.agent_id}.png`} />
   ```
4. Push → Zeabur auto-deploy ~3 分鐘
5. 驗收 /agents 頁看到真實立繪

---

## 🟡 本 session 沒做完的（留給未來）

| 項目 | 優先度 | 工程量 |
|---|---|---|
| 會議系統 backend + cron | 🔴 高 | 8~12h |
| 預測結算器（每日 14:30 抓收盤比對） | 🔴 高 | 4~6h |
| 社群爬蟲（PTT / Dcard） | 🟡 中 | 12~16h |
| 即時通報（LINE Notify / Discord） | 🟡 中 | 4~6h |
| backend/routes/quack.py 改用新 schema | 🟡 中 | 3~4h |
| 本地字型 | 🟢 低 | 1h |

---

## 🛡️ 紅線（提醒所有未來的 Claude Code）

- ❌ 絕不自行修改 `SYSTEM_CONSTITUTION.md` 或 `GUAGUA_SOUL.md`
- ❌ 絕不修 `.env`
- ❌ 絕不 force push main
- ❌ 不可以跳過驗證就 commit（憲法 Section 11.2 Step 6）
- ✅ 遇到推測性 bug 先用 Chrome 實測再 commit（ERRATA 教訓）
- ✅ 每次 commit message 用中文清楚描述
- ✅ 每次寫 outbox 第一行用 backend `/api/time/now`

---

## 📎 本 session 留給明天的關鍵檔案

**優先讀**：
1. `ceo-desk/SESSION_SUMMARY_2026-04-25.md`（本 session 完整盤點）
2. `ceo-desk/context/SYSTEM_CONSTITUTION.md`（憲法,Section 11 + 14 必讀）
3. `ceo-desk/context/agents/analyst_*_MEMORY.md`（5 位分析師人設）
4. `ceo-desk/watchdog/SELF_AUDIT.md`（最新系統完整度）

**工具路徑**：
- Backend：`backend/routes/agents.py`（本 session 新建）
- Frontend：`frontend/src/app/agents/page.tsx`（本 session 新建）
- Migration：`supabase/migrations/0006_*.sql` + `0007_*.sql`（已 apply）

---

**Vincent 明天驗收完後**，用這 3 種方式之一告知下一個 Claude Code session：

1. **滿意 + 要繼續**：「讀 inbox/NEXT_TASK.md,開始 #007 會議系統」
2. **要改人設**：直接改 `analyst_*_MEMORY.md` + 丟給 Claude Code:「重新部署」
3. **要休息一下**：「今天先這樣」

🦆 🏮
