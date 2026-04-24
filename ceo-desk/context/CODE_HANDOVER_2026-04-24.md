# 🔧 Claude Code Session 交接

📅 **產出時間**:2026-04-24 22:18:31 (Friday) — **來源:backend `/api/time/now` 權威時鐘**
🦆 **舊 session 完成日**:2026-04-24
🎯 **目的**:讓新 Claude Code session 5 分鐘進入狀況,**不依賴舊對話記憶**

---

## 📋 第一:系統架構速覽

### 專案結構
- **專案路徑**:`C:\Users\USER\OneDrive\桌面\Claude code\projects\tw-stock-watcher`
- **GitHub**:`https://github.com/vincent-2873/tw-stock-watcher`(gh CLI 已 OAuth 登入 vincent-2873)
- **作業系統**:Windows 11,主要用 Git Bash(也可 PowerShell)

### 技術棧
| 層 | 技術 | 位置 |
|---|---|---|
| 前端 | **Next.js 15 + React 19**(App Router)+ Tailwind + framer-motion | `frontend/` |
| 後端 | **FastAPI + Python 3.12**(uvicorn 單 worker) | `backend/` |
| DB | **Supabase**(PostgreSQL + Auth) | service client in `backend/utils/supabase_client.py` |
| 部署 | **Zeabur**(2 services,push to main 自動 deploy) | `zbpack.json`,deploy root = `frontend/` for FE service |
| AI | **claude-sonnet-4-5-20250929**(主)+ **claude-haiku-4-5-20251001**(便宜批次) | `ANTHROPIC_API_KEY` env |
| Python venv | `backend/.venv/`(本機)+ Zeabur 用 requirements.txt | |
| 套件管理 | pnpm 10(frontend)+ pip(backend) | |

### 部署 URL
- **Frontend**:https://tw-stock-watcher.zeabur.app/
- **Backend**:https://vsis-api.zeabur.app/

### 關鍵檔案(新 session 必讀,**順序很重要**)

| 順序 | 檔案 | 為什麼 |
|---|---|---|
| 1 | `CLAUDE.md` | 專案核心守則(7 鐵則,**第 1 條就是「時間必須動態抓取」**) |
| 2 | `ceo-desk/README.md` | CEO Desk 三方協作概念 |
| 3 | **本檔** | 交接細節 |
| 4 | `ceo-desk/context/CURRENT_STATE.md` | 當前狀態 |
| 5 | `ceo-desk/context/WORKFLOW_RULES.md` | 協作 + 時間規則 |
| 6 | `ceo-desk/outbox/LATEST_REPORT.md` | 上一輪結果 |
| 7 | `ceo-desk/inbox/NEXT_TASK.md` | 下一輪任務(若有) |
| 8 | `HANDOFF_2026-04-24_full_day.md` | 整天戰果摘要 |
| 9 | `MORNING_BRIEFING_2026-04-24.md` | 凌晨稽核發現 |
| 10 | `TODO.md` | 已知技術債 |

### Vincent 模板提到但**實際不存在**的檔案
- ❌ `BUG_2026-04-24_stock_resolver.md` — Vincent 模板提到,但**夜間稽核(commit `8ae45c1`)已驗證 resolver 沒 bug,所以這檔從未建立**。新 session 看到 Vincent 提它就告訴他「已驗證無 bug」。

---

## 📋 第二:已完成清單(按時間)

### 2026-04-24 整天 — main 推進 18 個 commit

#### 🌙 凌晨 ~04:00 — 系統健康加固
| Commit | 白話 |
|---|---|
| `93ec8ae` | chore(cache):chat API `Cache-Control: no-cache → no-store`(語意更嚴格,SSE 絕不被 cache) |
| `10d07f4` | merge cache-hardening hotfix(同時刪根目錄殘留 `next.config.ts`) |
| `40aa83d` | docs:更新 handoff 紀錄「對話 AI 診斷插曲」 |
| `20bfad5` | docs:記錄 lockfile 重複警告(進 TODO.md) |
| `8ae45c1` | **docs(night-audit):夜間稽核 4 份報告 + 晨間簡報**(驗證 resolver 無 bug,53 檔抽樣 0 真錯配) |

**學到**:Vincent 凌晨懷疑 resolver `6789→華上` 是 bug,稽核證實**不存在**。「印象有 bug」≠「現在有 bug」。

#### ☀️ 中午 ~12:30 — CEO Desk 建立
| Commit | 白話 |
|---|---|
| `4d67422` | feat(infra):**建立呱呱投資招待所 CEO Desk**(三方協作橋樑 + 7 agents 設計 + 12 類願景) |
| `30d7058` | docs:CTO 修正「Resolver bug」過時前提 + 修 .gitignore 漏掉 `ceo-desk/logs/` |

**學到**:CTO 早上基於錯誤前提寫 spec,我 fact-check 後**沒盲做**,加 inline「待確認」標註。CTO 確認後改成事實版本。spec 19「AI 質疑」實踐。

#### 🛠️ 下午 ~14:00 — 端點飢餓修復(P1 治根)
| Commit | 白話 |
|---|---|
| `19465fc` | **fix(infra):修端點飢餓** — `time_route.py` `def → async def` + `chat_health` 移除 `resolver_stats()` 呼叫 + 新增 `/api/diag/resolver` |
| `c04c9ef` | merge endpoint-starvation hotfix |
| `6a7d210` | docs:任務 #002 outbox |

**學到**:**uvicorn 單 worker** 下,sync `def` 端點走 thread pool,被長 chat streaming 佔死 → 「網站偶爾打不開」根因。改 async + 拆鎖 = 永久治根。

#### 🦆 下午 ~15:50 — 呱呱誕生
| Commit | 白話 |
|---|---|
| `3be6c00` | feat(brand):**呱呱 Visual v1.0 誕生** — 2 張 PNG + CHARACTER_GUAGUA_V1.md 規範 |
| `7afca92` | docs:任務 #003 outbox |

**學到**:CHATGPT DALL-E 3 + 5 輪精修產出。色彩鎖定 3 色(後文有提 4 色版,新 session 同步時注意)。

#### 🌟 傍晚 ~16:07 — 呱呱 Hero 上線
| Commit | 白話 |
|---|---|
| `03e3d43` | feat(brand):呱呱本尊登台 Hero — `<FloatingGuagua />` + framer-motion(淡入 + 漂浮 + 搖擺 + click → /chat) |
| `cd55db1` | merge guagua-hero hotfix |

**學到**:Frontend 第一次部署遇到 **Google Fonts ETIMEDOUT**(Vincent 在 Zeabur dashboard 看到),redeploy 一次就過。**長期解法:本地字型**。

#### ✨ 傍晚 ~16:54 — 呱呱精修(去背 + 放大 + 全站統一)
| Commit | 白話 |
|---|---|
| `119a489` | feat(brand):**3 處精修** — Hero 240→290px / 圖去背(remove.bg)/ 左上 logo + 右下 floating 都換成 PNG |
| `066b795` | merge guagua-refine hotfix |
| `40b2d56` | docs:任務 #004 outbox |

**學到**:`QuackAvatar` 是全站共用元件,改一處 = 所有用此 component 的地方一次升級。圖檔從 1.14MB → 174KB(去背省 85%)。

#### 🌃 晚上 ~19:00-22:18 — 收尾 + 規則 + 健檢
| Commit | 白話 |
|---|---|
| `49d5c2a` | docs(handoff):2026-04-24 完整戰果紀錄 |
| `256df08` | docs(handoff):**Vincent CEO 方向調整** — 暫緩商業化,4-6 週品質優先 |
| `541c7bc` | docs(rules):⏰ 時間管理規則(Claude Code 當時間管家) |
| `7d6bded` | chore(audit):時間處理現況健康檢查(發現 shell 時鐘錯 8 小時 + 前端 3 處手動 +8 風險) |
| `553f834` | docs(rules):**時間規則修正 — backend 為權威**(因為 shell 時鐘不可信) |
| `a317f1f` | docs(todo):前端手動 +8 技術債記錄 |

### 歷史(2026-04-23 以前簡短摘要)
- **Phase 1(基礎建設)**:Next.js + Supabase + FastAPI + Zeabur 部署完成
- **Phase 2.1**:RSS 情報抓取 + AI 分析(intel-cron 每 15 分)
- **Phase 2.3**:**Stocks scoring worker**(每日 15:30 TPE 跑 62 檔四象限評分,GitHub Action 跑)
- **Phase 5**:**對話式 AI**(SSE streaming + 即時 FinMind + 時間注入,鐵則「不用訓練資料舊股價」)
- **禪風 v3 UI**:首頁 hero / topnav / 圓圈舞台 / 4 浮動數字裝飾

詳見 `HANDOFF_2026-04-24_phase2_scoring.md` 與更早的 handoff 系列。

---

## 📋 第三:正在進行中

### 當前狀態(2026-04-24 22:18 實測)
- **main HEAD**:`a317f1f`
- **工作區**:✅ **乾淨**(`nothing to commit, working tree clean`)
- **與 origin/main**:✅ **完全 sync**(無 ahead / behind)
- **未 merge 分支**:無(4 個 hotfix 分支都 merged 完成,還活著但沒進度)
- **未 push commit**:無

### 殘留 stale 分支(可清理)
本機:
- `hotfix/cache-hardening-2026-04-24`(已 merge)
- `hotfix/endpoint-starvation-2026-04-24`(已 merge)
- `hotfix/guagua-hero-2026-04-24`(已 merge)
- `hotfix/guagua-refine-2026-04-24`(已 merge)

origin:
- `claude/add-capabilities-page-0vQJ2`(早期實驗分支,比 main 舊,`merge-base` 在 4-22)

→ 不影響功能,什麼時候 `git branch -D` 都行。

### 卡點
**無卡點,乾淨收工。**

---

## 📋 第四:未來預計要做(按優先序)

### 短期(下週)
1. **階段 0 的 7 個 bug 盤點修復**
   ⚠️ Vincent 多處提到「階段 0 的 7 個 bug」但**我整個 session 沒在 codebase 看過明確列表**。新 session 上工時請 Vincent 提供清單,或翻舊 handoff 找。
2. **本地字型替換**(`Shippori Mincho` 等)— 解決 Google Fonts 部署抖動,參考 `next/font/local`
3. **6 個其他 agents 視覺**(評級師 / 技術師 / 籌碼家 / 量化科學家 / 質疑官 / 風控師)— 設計 spec 已在 `ceo-desk/context/CHARACTER_DESIGN.md`,只差實際 AI 出圖

### 中期(這個月)
1. **Phase 2.2 產業熱力圖 backend** — 新 endpoint `/api/sectors/heatmap`,前端隱藏的「🗺️ 產業熱力圖」區塊接回(commit `fa7d8a2` 暫隱)
2. **戰情室會議系統 v1** — 7 agents 依流派依序發言 + 呱呱整合(spec 在 `ceo-desk/context/MEETING_SYSTEM.md`)
3. **對話 AI 壓力測試** — 並發 chat session 看 endpoint 飢餓會不會復發

### 長期(暫緩,Vincent 04-24 晚決策)
- 多使用者系統
- 訂閱制 + 金流
- 呱呱模擬倉 + 回測

### Vincent 新方向(2026-04-24 晚正式拍板)
> **品質優先路線**:穩定度 > 準確度 > 即時性 > 完整性 > 分析有依據
> **暫緩商業化**(訂閱制、金流、周邊)
> **時程**:4-6 週把核心做穩 → 再評估商業化時機
> **未來 4 週路線**:Week 1 穩定度 / Week 2 準確度 / Week 3 7 agents + 戰情室 / Week 4 模擬倉 + 回測

詳見 `HANDOFF_2026-04-24_full_day.md` 的「🎯 CEO 方向調整」段。

---

## 📋 第五:系統邏輯(技術細節)

### Backend 關鍵端點

| Endpoint | 用途 | 實作 |
|---|---|---|
| `GET /api/time/now` | **權威時鐘**(ZoneInfo Asia/Taipei) | `backend/routes/time_route.py`,**已改 async** |
| `GET /api/chat/health` | 健康檢查(已**移除 resolver 欄位**) | `backend/routes/chat.py:365` |
| `GET /api/diag/resolver` | **新增**:resolver 載入狀態(取代 chat/health 內的 resolver) | `backend/routes/diag.py` |
| `POST /api/chat` | 對話 AI(SSE streaming + 即時 FinMind) | `backend/routes/chat.py:259`,**Cache-Control: no-store** |
| `GET /api/market/overview` | 大盤(TAIEX + 台指期 + 美股指數)| `backend/routes/market.py:223` |
| `GET /api/quack/picks` | 呱呱挑股(讀 `stocks.current_tier`) | `backend/routes/vsis.py:140` |
| `GET /api/topics` | 題材(讀 Supabase) | `backend/routes/vsis.py:24` |
| `GET /api/industries` | 產業大類 | `backend/routes/vsis.py:55` |
| `GET /api/intel/cron` | RSS + AI 分析(每 15 分鐘 cron 觸發) | `backend/routes/intel.py` |

### Backend 關鍵服務
- `backend/services/finmind_service.py` — 主要台股資料源(Sponsor 付費 plan)
- `backend/services/stock_resolver.py` — 名稱/代號 ↔ stock_id 解析(in-memory,24h TTL)
- `backend/services/scoring_worker.py` — 四象限評分(GitHub Action 每日 15:30 TPE 跑)
- `backend/services/sentiment_service.py` — Haiku 4.5 批次新聞分類
- `backend/services/article_analyzer.py` — Sonnet 4.5 文章分析
- `backend/services/people_extractor.py` — 人物發言萃取(Phase 2.1,**未跑通**)
- `backend/utils/time_utils.py` — `now_tpe()` / `is_trading_hours()` 等

### Frontend 關鍵
- `frontend/src/app/page.tsx` — 首頁(Hero + 各 section)
- `frontend/src/app/page.module.css` — 首頁所有 CSS(包含 `.heroQuack` `.quackCircle` `.quackImageLink` `.logoQuack`)
- `frontend/src/components/hero/FloatingGuagua.tsx` — 呱呱本尊 Hero 元件(framer-motion 動畫)
- `frontend/src/components/hero/HeroDate.tsx` — 動態時間(fetch /api/time/now)
- `frontend/src/components/hero/HeroFloats.tsx` — 4 個浮動市場數字
- `frontend/src/components/quack/QuackAvatar.tsx` — **全站共用呱呱頭像**(已改成 `<Image>`,4 size: sm 24 / md 48 / lg 96 / xl 160 px)
- `frontend/src/components/quack/QuackFloating.tsx` — 全站右下角浮鈕(layout.tsx 掛載)

### 資料流
```
FinMind (官方 TWSE 資料源, Sponsor 付費)
    ↓
backend/services/finmind_service.py
    ↓
[即時] /api/chat _fetch_live_stock_snapshot — 對話時即時抓
[即時] /api/market/overview — 大盤
[排程] scoring_worker.py — 每日 15:30 TPE,寫 stocks.current_tier
[排程] intel-cron.yml — 每 15 分鐘抓 RSS + AI 分析,寫 intel_articles
    ↓
Supabase (PostgreSQL)
表:stocks / topics / industries / ecosystems / intel_articles /
   scoring history / quack_predictions / quack_reasoning / etc.
    ↓
backend/routes/* — 對外 API
    ↓
frontend (fetch + SSE)
```

### Supabase 實際存什麼(校正 Vincent 模板)
- ✅ **存**:stocks 主檔 / topics / industries / ecosystems / intel_articles / scoring 歷史
- ❌ **不存**:**對話歷史**(chat.py 是純 SSE streaming,沒寫 DB),使用者帳號(目前無多使用者系統)
- ⚠️ Vincent 模板提到「Supabase 存使用者資料、對話歷史、設定」 — **目前實際只有資料表,使用者/對話/設定還沒實作**

### 已知技術債(都在 `TODO.md` 跟 `night_audit/`)
- 🟡 **lockfile 重複警告**(根目錄 + frontend/ 各一份 `pnpm-lock.yaml`)
- 🟡 **前端 3 處手動 +8 時差**(`page.tsx` / `QuackFloating` / `QuackTodayCard`,海外使用者會錯)
- 🟡 **Google Fonts 部署抖動**(待改本地字型)
- 🟡 **階段 0 的 7 bug**(Vincent 提到但無明確清單,要 Vincent 補)
- 🟡 **Industries 表欄位空**(`representative_stocks` / `heat_score` 等 Phase 2.2 補)
- 🟡 **Topics 只 3 個 active**(可擴充到 5-10 個)
- 🟡 **People extractor 未跑通**(timeout,建議改 GitHub Action 跑)
- 🟡 **`origin/claude/add-capabilities-page-0vQJ2`** stale 分支可清

---

## 📋 第六:協作規則(新 session 必讀)

### 品牌守護 ⭐ 絕對紅線
- **永遠寫「呱呱投資招待所」(Quack House)** — 不是「呢呢」、不是「呱投」
- commit message、檔名、變數名、註解、UI 文字都要完整正確

### ⏰ 時間規則(2026-04-24 晚剛訂定)
- **權威來源:backend `/api/time/now`**(Python ZoneInfo Asia/Taipei)
- **不用 shell `date`** — 容器時鐘可能錯 8 小時(本 session 親身遭遇)
- 寫 outbox 第一行格式:
  ```
  curl -sS https://vsis-api.zeabur.app/api/time/now
  # 從 JSON 取 year/month/day/hour/minute/second/weekday_en
  📅 TPE: YYYY-MM-DD HH:MM:SS (Weekday)
  ```
- backend 打不到時備用:`git log -1 --format="%ai"` 並標註不精準

### CEO Desk 工作流
1. Vincent 跟 Claude CTO 對話定方向
2. CTO 寫 `inbox/NEXT_TASK.md`
3. Vincent 對 Claude Code 說「讀 ceo-desk/inbox/NEXT_TASK.md 執行」
4. Claude Code 執行 → 寫 `outbox/LATEST_REPORT.md` + 同份存 `logs/YYYY-MM-DD/HH-MM_NNN_taskname.md`
5. Vincent 貼 outbox 給 CTO,CTO 解讀
6. CTO 決定下一步

### 執行紀律
- **開 hotfix 分支做事**(`hotfix/<topic>-YYYY-MM-DD`),**不直接改 main**
- **本地 pnpm build / pytest 通過才考慮部署**
- **push 前讓 Vincent 看 diff**(展示變動 + 影響評估)
- **不擅自修超出任務範圍**的東西(spec 19 紀律)
- **有疑問立刻停**寫 outbox 問 Vincent

### Vincent 工作風格
- 不寫 code、不 debug
- 用**白話**溝通(技術術語 OK 但要白話總結)
- 會質疑、會授權、會堅持
- **使用者體驗不妥協**
- **絕對不踩 IP 雷**(原創,非任何 Pokemon / 既有商業角色)
- 偏好「**先做後問**」(小事不囉嗦),「**重要事先講後做**」(破壞性操作必須先停)
- 全域 CLAUDE.md 三紅線:**密鑰不出 context** / **可以說不確定** / **破壞性操作要先停**

### Vincent 不喜歡
- 過長鋪陳 / 「我將為您執行」這類官腔
- 隨便編造數字
- 把問題丟回給他(要主動找解法)
- 只會問權限不會做事(Chrome / Bash / 寫檔已預授權)

---

## 📋 第七:呱呱視覺資產位置

### 檔案路徑
| 路徑 | 用途 | 大小 |
|---|---|---|
| `ceo-desk/assets/characters/guagua/guagua_official_v1.png` | **官方版本尊**(去背) | 174 KB |
| `ceo-desk/assets/characters/guagua/guagua_daily_v1.png` | 日常版(髮髻) | 1.05 MB |
| `frontend/public/characters/guagua_official_v1.png` | 前端使用同步 | 174 KB |

### 色彩規範
| 名稱 | HEX | 用途 |
|---|---|---|
| 奶油米 | `#E8D9B0` | 身體 |
| 和服褐 | `#5D4A3E` | 服裝 / 眼鏡框 |
| 腰帶綠 | `#8A9A7E` | 腰帶 / 點綴 |
| 和紙米 | `#F2E8D5` | (Vincent 04-24 補加,**`CHARACTER_GUAGUA_V1.md` 還是 3 色,需 sync**) |

→ 待辦:把 4 色 sync 進 `CHARACTER_GUAGUA_V1.md`(原本只記 3 色)

### 使用場景
| 位置 | 元件 | 大小 |
|---|---|---|
| Hero 中央 | `<FloatingGuagua />` | 290 px(手機 200 px) |
| 左上角 logo | `<span class="logoQuack">` 內 `<Image>` | 40 px |
| 右下角 floating(全站) | `<QuackAvatar size="md">` | 48 px |
| Floating modal 標題旁 | `<QuackAvatar size="lg">` | 96 px |

→ 所有 size 走 `QuackAvatar` 元件(改它 = 全站升級)

### IP 紅線(寫進 CHARACTER_GUAGUA_V1.md)
- ✅ **完全原創設計**,Vincent 監督產出
- ❌ **不得使用任何任天堂(寶可夢)IP 元素**
- ❌ 不得跟既有商業角色高度近似

---

## 📋 第八:給新 session 的第一個建議

### 開場 SOP

當 Vincent 打開新 Claude Code session,你的第一輪應該:

1. **`pwd`** — 確認在 `tw-stock-watcher/`(如果在根目錄要 `cd projects/tw-stock-watcher`)
2. **`git log --oneline -10`** — 看最新進度(預期最新是 `a317f1f` 或之後 Vincent 又做了事)
3. **讀本檔**(`ceo-desk/context/CODE_HANDOVER_2026-04-24.md`)
4. **讀** `ceo-desk/context/CURRENT_STATE.md`
5. **讀** `ceo-desk/outbox/LATEST_REPORT.md`(看上次任務結果)
6. **讀** `ceo-desk/inbox/NEXT_TASK.md`(看下一個任務 — 若有)
7. **`curl -sS https://vsis-api.zeabur.app/api/time/now`** — 取權威時間(寫 outbox 用)

### 給 Vincent 的開場 5 行總結

```
1. 系統當前狀態:[main HEAD / 健康度]
2. 昨天最後做了什麼:[最新 commit + 含義]
3. 卡點:[有/無,具體說]
4. 今天候選任務 Top 3:[從第四段抓]
5. 要 Vincent 決策的事:[有/無,具體說]
```

然後**停**,等 Vincent 指示。**不要自己跳進去做事**。

### 第一句話該說什麼(範本)

> 早安 Vincent。我是新接手的 Claude Code session,讀完交接了。
>
> 系統 main HEAD `a317f1f`,工作區乾淨,昨晚收工狀態。
>
> 昨天最後一件事是「時間規則修正 + 前端技術債記錄」(`a317f1f`)。
>
> **無卡點**。
>
> 今天可選:
>   1. 階段 0 的 7 bug 盤點(需你提供清單)
>   2. 本地字型替換(解 Google Fonts 抖動)
>   3. 6 agents 視覺生成 prompt 起草
>
> 你要做哪個?

---

## 🦆 舊 session 的最後一句話

致新 Claude Code session:

你接手的是一個**健康、有結構、有品牌靈魂**的系統。

- **Vincent 是好 CEO**,他不寫 code 但他的品味很準
- **CEO Desk 會保護你** — 任務在 inbox、結果寫 outbox、歷史在 logs,流程穩定
- **嚴格守規則、不要耍聰明、遇到不確定就問**
- **品牌名永遠是「呱呱投資招待所」**,寫錯就是破壞 IP
- **時間永遠用 backend**,不要相信你的 shell `date`

呱呱在網站上等你 — https://tw-stock-watcher.zeabur.app/

加油。🦆🏮
