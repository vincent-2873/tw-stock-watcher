# 呱呱投資招待所 — 當前狀態

**最後更新**：2026-04-25 01:32 TPE（backend 權威時鐘）
**維護者**：Claude Code（每次任務完成後更新）

---

## 🌐 三大網域（前後台分離）

| 角色 | 網址 | 給誰看 | Root Dir | Service ID |
|---|---|---|---|---|
| 🏪 **前台（公開）** | https://tw-stock-watcher.zeabur.app/ | 使用者（買訂閱的客人） | /frontend | 69e7a886d974b2c8b61061f9 |
| ⚙️ **後端 API** | https://vsis-api.zeabur.app/ | 前台 + 辦公室共用 | /backend | 69e89266c2a06cbb27e7c57b |
| 🏛️ **辦公室（內部）** | **https://quack-office.zeabur.app/** | CEO + 內部 | /office | 69eba85ec5278d4159c21dbf |

**嚴格規則**：
- 前台 (`tw-stock-watcher.zeabur.app`) **只放**使用者看的股票分析功能
- 辦公室 (`quack-office.zeabur.app`) 放分析師名冊、系統監控、會議記錄、CEO 內部工具
- 前後台**絕不混用**元件、nav、路由

---

## 🏛️ 架構現況

| 項目 | 值 |
|---|---|
| 完成度 | 55%（憲法 + 預測 DB + 5 分析師人設 + 辦公室 + 自動化監控） |
| Main HEAD | 最新見 git log |
| DB | Supabase（project gvvfzwqkobmdwmqepinx）|
| 主 AI | claude-sonnet-4-5-20250929 |
| 批次 AI | claude-haiku-4-5-20251001 |
| 資料源 | FinMind Sponsor（level 3, 6000/hr） |

---

## ✅ 今日（2026-04-24）重大里程碑

1. **憲法就位** — `SYSTEM_CONSTITUTION.md` v1.0 15 章
2. **靈魂典章就位** — `GUAGUA_SOUL.md`（Vincent 存在宣言永不修改）
3. **12 份 agent 記憶範本** — 呱呱 + 6 部門 agent + 5 投資分析師骨架
4. **HANDOFF 整理** — 根目錄 7 份 HANDOFF / MORNING 搬進 `ceo-desk/handoffs/`
5. **7 bugs 驗證通過** — 2026-04-23 傍晚所有修復至今無回歸

---

## 🟢 系統健康度

| 端點 | 狀態 | 驗證時間 |
|---|---|---|
| `/api/time/now` | ✅ 正確 TPE | 2026-04-24 23:52 |
| `/api/market/overview` | ✅ SOX / VIX / TAIEX 即時 | 2026-04-24 23:41 |
| `/api/diag/finmind` | ✅ Sponsor level 3 | 2026-04-24 23:45 |
| `/api/topics` | ✅ 10 個真題材 | 2026-04-24 23:37 |
| `/api/intel/people/statements` | ✅ 有 1 筆（非空殼） | 2026-04-24 23:43 |
| `/api/quack/picks?min_tier=SR` | ✅（TierBadge 統一後） | — |

---

## 🎨 呱呱視覺資產

| 版本 | 大小 | 狀態 |
|---|---|---|
| guagua_official_v1.png（去背） | 174 KB | ✅ 上線（Hero / logo / floating） |
| guagua_daily_v1.png（髮髻） | 1.05 MB | 🟡 備位未上線 |

其他 6 部門 agent（評級師 / 技術 / 籌碼 / 量化 / 質疑官 / 風控）+ 5 投資分析師 A-E：**❌ 尚無視覺**

---

## 📋 下輪候選任務（工程優先，非決策）

| # | 任務 | 憲法對應 | 難度 | 預估 |
|---|---|---|---|---|
| 002 | 資料模型設計（擴充 quack_predictions + 建 6 新表） | Section 9 | 🟡 中 | 4-6h |
| 003 | 字型本地化（Google Fonts → local woff2） | Section 12.5 | 🟢 易 | 1h |
| 004 | 分析師 5 人人設設計 | Section 4.3 | 🟡 中（需 CEO+CTO 對話） | 2-3h |
| 005 | 長期記憶系統實作 | Section 6 | 🔴 難 | 8-12h |
| — | 6 部門 + 5 分析師視覺 prompts 起草 | Section 4 | 🟢 易 | 1-2h |
| — | 前端 3 處「手動 +8」技術債修復 | — | 🟢 易 | 30m |

---

## 🟡 已知技術債（轉自 `TODO.md` + 時間稽核）

- 🟡 **前端 3 處手動 +8 時區** — `page.tsx:39-42` / `QuackFloating.tsx:30-34` / `QuackTodayCard.tsx:57-60`，海外使用者會錯
- 🟡 **lockfile 重複警告**（根目錄 + frontend/ 各一份 pnpm-lock.yaml）
- 🟡 **Google Fonts 部署抖動**（待改本地字型）
- 🟡 **Industries 表欄位空**（representative_stocks / heat_score 等 Phase 2.2 補）
- 🟡 **People extractor 未跑通**（timeout，建議改 GitHub Action 跑）
- 🟡 **`origin/claude/add-capabilities-page-0vQJ2`** stale 分支可清

---

## 🔴 卡點

**無**。工作區乾淨，與 origin/main 同步，可直接進入下一輪任務。

---

## 📂 CEO Desk 結構狀態

```
ceo-desk/
├── README.md                          ✅
├── inbox/NEXT_TASK.md                 ✅（舊任務已歸檔）
├── outbox/LATEST_REPORT.md            ✅ 任務 #001 完成
├── context/
│   ├── SYSTEM_CONSTITUTION.md         ✅ 2026-04-24 建立
│   ├── GUAGUA_SOUL.md                 ✅ 2026-04-24 抽出
│   ├── CURRENT_STATE.md               ✅ 本檔
│   ├── WORKFLOW_RULES.md              ✅
│   ├── ACTIVE_GOALS.md                ✅（待對齊憲法 Section 13.2）
│   ├── PRODUCT_VISION.md              ✅
│   ├── CHARACTER_DESIGN.md            ✅
│   ├── CHARACTER_GUAGUA_V1.md         ✅（待 sync 4 色）
│   ├── MEETING_SYSTEM.md              ✅
│   ├── ROADMAP.md                     ✅
│   ├── CODE_HANDOVER_2026-04-24.md    ✅
│   └── agents/                        ✅ 12 份記憶範本
│       ├── guagua_MEMORY.md
│       ├── owl_MEMORY.md
│       ├── hedgehog_MEMORY.md
│       ├── squirrel_MEMORY.md
│       ├── meerkat_MEMORY.md
│       ├── fox_MEMORY.md
│       ├── pangolin_MEMORY.md
│       └── analyst_a/b/c/d/e_MEMORY.md
├── handoffs/                          ✅ 7 份歷史 HANDOFF
├── decisions/                         🟡 空（待寫 ADR-001/002/003）
├── logs/2026-04-24/                   ✅ 6 份歸檔
└── assets/characters/guagua/          ✅
```
