# 🤖 START HERE — 給 Claude Code 的第一封信

> **Claude Code,這是你進入這個專案要做的第一件事。**
>
> 讀完這份文件,你會知道:
> 1. 你在做什麼
> 2. 你應該怎麼開始
> 3. 你要遵守的規則

---

## 🎯 一句話說明

你要幫 Vincent(台灣 B2B 業務、業餘投資者)打造一套**個人金融情報系統**。

**這不是「工具」,是「夥伴 + 教練」。**
- 平時討論切磋(朋友)
- 危險時攔他一把(教練)
- 他做對時肯定(夥伴)
- 他做錯時指正(老師)

---

## 📚 你進入專案後的第一步(必做順序)

```
Step 1: 讀這份 START_HERE.md(你正在看的)
Step 2: 讀 CLAUDE.md(主指令書,有 24 份規格的完整索引)
Step 3: 讀 README.md(專案總覽)
Step 4: 讀 DEPLOY_CHECKLIST.md(部署流程)
Step 5: 開始 Phase 1(CLAUDE.md 裡有 Phase 1-7 清單)

⚠️ 絕對不要略讀。這個系統的靈魂在細節。
```

---

## 🚨 10 條絕對不能違反的規則(詳見 CLAUDE.md)

```
規則 0: 分秒不差排程(spec 10)
  → GitHub Actions cron 會延遲 5-15 分鐘
  → 必須用 cron-job.org + 內部 wait_until()
  → 誤差 < 100ms

規則 1: 每個建議都要有可追溯證據
  → 所有推薦存入 recommendations 表
  → 含 evidence, bull_case, bear_case, data_snapshot

規則 2: 永遠多空平衡
  → AI 強制產生兩組論點,不能單邊鼓吹

規則 3: 標註信心度
  → 不能假裝所有建議一樣可靠
  → 最高只能給 95%(保留不確定性)

規則 4: 錯誤處理要友善
  → API 壞 → LINE 通知 + 降級
  → 資料異常 → 標示不可信,不亂推薦

規則 5: 繁體中文介面,英文程式碼,中文註解

規則 6: 時間一致性鐵律(spec 17)
  → UI 顯示一定是 TPE
  → 美股事件強制雙時區:"02:00 TPE (14:00 ET)"

規則 7: 資料新鮮度鐵律(spec 17)
  → 每筆資料都有 fetched_at, valid_until
  → 過期資料 → 拒絕分析,不可降級使用

規則 8: 事件日曆(spec 16)
  → 推薦前必查「30 天內有無重要事件」

規則 9: 系統靈魂(spec 18 + 19)
  → AI 要能與 Vincent 對話、質疑他
  → 不是順從的助手,是救他不被自己騙的夥伴

規則 10: 保護 Vincent
  → 不給「一定會漲」的結論
  → 永遠附免責聲明
  → 偵測 FOMO / 攤平 / 復仇交易 → 強制攔截
```

---

## 🏗 你的開發順序(Phase 1-7)

```
Phase 1: 基礎建設(Week 1-2)
  ├── 資料夾結構
  ├── Supabase schema(已寫好,直接執行 SQL)
  ├── FinMind / FMP service
  └── Next.js + FastAPI 骨架
  
Phase 2: 核心決策(Week 3-4)
  ├── 四象限評分(spec 01)
  ├── 決策引擎
  └── AI service

Phase 3: 自動化排程(Week 5-6)⭐ 最關鍵
  ├── 分秒不差架構(spec 10)— 已有 time_utils.py
  ├── 早報 / 當沖 / 盤中 / 盤後 / 美股
  └── GitHub Actions workflows

Phase 4: 前端 UI(Week 7-9)
  ├── Dashboard / 個股頁 / 當沖頁
  ├── LINE Login(spec 21)
  ├── PWA(spec 22)
  └── 部署到 Zeabur

Phase 5: 系統靈魂(Week 10-12)⭐⭐ 最重要
  ├── 對話學習(spec 18)
  ├── AI 質疑使用者(spec 19)
  └── 學習儀表板

Phase 6: 回測 + 模擬(Week 13-14)
  ├── 歷史回測(spec 20)
  └── Paper Trading 帳戶

Phase 7: 進階功能(Week 15+)
  ├── 飆股雷達(spec 13)
  ├── 供應鏈圖(spec 14)
  ├── 社群情報(spec 12)
  └── 事件日曆(spec 16)
```

---

## 💡 每個 Phase 結束前必做的事

```
✅ 完成該 Phase 所有功能
✅ 寫測試確認能跑
✅ 跟 Vincent 確認成果(展示 demo)
✅ 更新資料庫 migration
✅ 更新 .env.example(若有新環境變數)
✅ commit + push 到 GitHub
```

---

## 🧪 已經幫你實作好的程式(直接用,不要重寫)

```
backend/utils/time_utils.py
  → 分秒不差的核心函式 wait_until()
  → 已實測平均 drift 7.82ms,100% < 100ms
  → 所有排程必用

scripts/test_precision.py
  → 精準度驗證腳本
  → 每次 Phase 3 deploy 後跑一次

schemas/supabase_schema.sql
  → 23 個表的完整 schema
  → 直接到 Supabase SQL Editor 貼上執行
  → 不要重新設計
```

---

## 🛑 遇到狀況的處理

### 若不確定某個決策

```
1. 先查 CLAUDE.md 的 24 份規格索引
2. 讀對應的 spec
3. 仍不確定 → 問 Vincent(不要自己猜)
```

### 若發現規格有漏

```
1. 不要硬做
2. 跟 Vincent 討論
3. 更新對應的 spec
4. 再開發
```

### 若遇到技術阻礙

```
1. 誠實告訴 Vincent
2. 提出 2-3 個替代方案
3. 不要自作主張改架構
```

---

## 📊 成本控制(每個 Phase 都要注意)

```
月費上限:NT$ 4,800(~$150 USD)

主要成本:
 - Zeabur: $5
 - X API: $32
 - Claude API: $25-35(含對話)
 - 其他 免費

紅線:
 - 單日 Claude API > $5 → 立即停機
 - 月累積 > $150 → 警告 Vincent
```

---

## 🎯 Vincent 的個人背景(會影響你的決策)

```
姓名:Vincent(page.cinhong)
地區:台灣台中
職業:B2B 業務
可用時間:
 - 工作日 07:30-08:30(通勤)
 - 工作日中午 12:00-12:15
 - 工作日晚上 21:00-22:00
 - 週末深度使用

投資經驗:42/100(正在學)
主要市場:台股 80% + 美股 20%
關注產業:AI 供應鏈、半導體、記憶體
風險承受:中等(單筆 2%)
```

**你做任何決策,都要對照這個畫像**。
例如:UI 要 Mobile First,因為他 80% 時間用手機。

---

## 🔥 這個系統的「靈魂」是什麼

**Vincent 做這個系統的最終目標不是「拿到明牌」,是:**

> 「打造系統 → 從系統判斷中學習 → 系統完成時,
>  我自己也變成會判斷的投資人」

**所以:**
- ❌ 不要做順從 AI
- ✅ 要做**會質疑 Vincent 的 AI**
- ❌ 不要只給答案
- ✅ 要展示思考過程

---

## ✅ 你的成功標準

3 個月後,Vincent 應該能說:

```
✅ 系統每天準時推播(誤差 < 5 秒)
✅ 每個推薦我都看得懂為什麼
✅ AI 會質疑我的衝動
✅ 我跟 AI 討論過 50+ 次
✅ 系統記得我的偏好,越用越懂我
✅ 模擬帳戶跑 3 個月,報酬超越大盤
✅ 我比 3 個月前更會判斷股票
```

---

## 🚀 準備好了?

**現在讀 CLAUDE.md。**

那份有更詳細的規則、完整的 24 份規格索引、以及 Phase 1 的第一個任務清單。

**開始吧。**

---

**Vincent 正在期待這個系統改變他的投資生涯。
 請認真做,把細節做到位。**
