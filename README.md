# 📊 Vincent Stock Intelligence System (VSIS)

> 個人金融情報系統 — 由 Vincent 設計,Claude Code 開發

---

## ⚡ 3 分鐘了解這個專案

### 這是什麼?
一個**半自動化**的個人投資分析系統,包含:
- 每日早報(08:00)
- **當沖推薦(08:30-09:00)**
- 盤中異常警報(09:00-13:30)
- 盤後解析(14:30)
- 美股追蹤(夜間)
- Web Dashboard
- LINE 即時推播

### 為什麼做?
Vincent 認為:
> 「我要打造一個系統,從中學習怎麼判斷。
>  系統完成時,我也變成會判斷的投資人。」

### 跟市面產品有什麼不同?
1. **標註信心度**(不是每個建議都一樣可靠)
2. **多空平衡**(強制給反面論點)
3. **追溯每個決策**(30/60/90 天後驗證)
4. **從 Vincent 的決策學習**(越用越懂你)

---

## 🏁 給 Claude Code 的開始指令

**Claude Code,讀完這份 README 後,請依序:**

1. **必讀第一份**:`CLAUDE.md` - 核心開發指令書(含完整規格索引)

2. **主指令書會告訴你**:24 份規格書分類、Phase 1-7 開發順序、6 大守則

3. **資料庫結構**:`schemas/supabase_schema.sql`

**規格書現況(24 份,12,660 行):**
- 核心架構:spec 01-09
- 關鍵鐵律:spec 10(分秒不差)、spec 17(時間/資料新鮮度)
- 情報分析:spec 11-14, 16
- 交易:spec 15
- **系統靈魂**:spec 18(對話學習)、spec 19(AI 質疑)
- 驗證安全:spec 20(回測/模擬)、spec 21(登入)
- 維運體驗:spec 22-24

**讀完 CLAUDE.md 後,你應該能:**
- 理解系統定位是「夥伴 + 教練」,不是工具
- 知道 Phase 1-7 的開發順序
- 明白 10 條核心規則(含時間鐵律、資料新鮮度、分秒不差等)
- 知道每個需求對應哪份 spec

---

## 🚀 快速開始(給 Vincent)

### Step 1:申請 API Keys(30 分鐘)

需要申請以下服務(詳情在 `docs/API_KEYS.md`):
- [ ] GitHub(免費)
- [ ] Supabase(免費)
- [ ] Zeabur(約 $5/月)
- [ ] FinMind(免費)
- [ ] FMP(免費)
- [ ] NewsAPI(免費)
- [ ] LINE Messaging API(免費)
- [ ] Anthropic Claude API(付費,約 $10-20/月)

### Step 2:設定環境(15 分鐘)

```bash
# Clone 專案
git clone https://github.com/YOUR_USERNAME/vincent-stock-system.git
cd vincent-stock-system

# 複製環境變數
cp .env.example .env
# 編輯 .env 填入你的 API Keys
```

### Step 3:啟動 Claude Code(15 分鐘)

```bash
# 安裝 Claude Code
npm install -g @anthropic-ai/claude-code

# 進入專案啟動
cd vincent-stock-system
claude
```

進入 Claude Code 後,說:
```
請讀 CLAUDE.md 然後按 Phase 1 的順序開始做,
每完成一個檢查項目就跟我 confirm 一次
```

Claude Code 會自動開始建立系統。

---

## 📂 專案結構概覽

```
vincent-stock-system/
├── CLAUDE.md                    # 給 Claude Code 的主指令
├── README.md                    # 本檔
├── .env.example                 # 環境變數範本
│
├── specs/                       # 詳細規格
│   ├── 01_decision_engine.md
│   ├── 02_day_trade_engine.md
│   ├── 03_intraday_monitor.md
│   ├── 04_closing_report.md
│   └── 05_ui_design.md
│
├── schemas/                     # 資料庫
│   └── supabase_schema.sql
│
├── backend/                     # Python 後端(Claude Code 建立)
├── frontend/                    # Next.js 前端(Claude Code 建立)
├── scripts/                     # GitHub Actions 腳本
├── .github/workflows/           # 5 個自動化排程
└── docs/                        # 說明文件
```

---

## 🎯 核心自動化排程

| 時間 | Workflow | 做什麼 |
|------|---------|--------|
| 08:00 | morning_report | 早報(美股+台股預告) |
| 08:30 | day_trade_pick | **當沖推薦 + 量能異常警報** |
| 09:00-13:30 | intraday_monitor | 盤中監控(每 5 分鐘) |
| 14:30 | closing_report | 盤後解析 |
| 21:00-05:00 | us_market | 美股追蹤 |

所有排程由 GitHub Actions 自動執行,**失敗會自動通知 Vincent**。

---

## 📊 預期成本(月費)

| 服務 | 費用 |
|------|------|
| GitHub Actions | 免費 |
| Supabase | 免費 |
| Zeabur | $5 |
| FinMind | 免費 |
| FMP | 免費 |
| NewsAPI | 免費 |
| Claude API | $10-20 |
| **總計** | **$15-25/月** |

折合台幣約 NT$ 500-800/月

---

## 🎨 系統 Demo(視覺概念)

### LINE 推播效果

```
🌅 Vincent 早安!(08:00)
美股昨夜:道瓊 +0.5%...

⚡ 當沖觀察(08:45)
3 檔候選...

🚨 量能異常!(10:23)
鴻海爆量 3.2x...

📊 盤後速報(14:35)
加權 +287 點...
```

### Web 介面

- 首頁 Dashboard
- 個股詳細頁
- 當沖推薦
- 盤後報告
- 自選股管理
- 設定

詳情見 `specs/05_ui_design.md`

---

## 🤝 給 Vincent 的話

這個系統是為了**讓你變強**,不是取代你的判斷。

每個建議都有**信心度**——
> 信心度 90% 的推薦,你跟了 9/10 對
> 信心度 60% 的推薦,你跟了 6/10 對

所以它永遠不會給你**保證會漲**的結論。

**它會陪你一起成長。**

---

## 📝 使用者須知

⚠️ 本系統僅供個人投資決策參考,**不構成投資建議**。

- 所有資料來自公開 API,可能有延遲或錯誤
- 系統判斷不保證準確
- 投資有風險,虧損請自行負責
- 建議搭配自己的判斷使用

---

## 🎯 Vincent 的使用 SOP 建議

### 平日早上(07:30-08:00)
1. 看 LINE 早報(3 分鐘)
2. 看當沖推薦(5 分鐘)
3. 決定今日策略

### 盤中(工作中)
- 只看 LINE 警報
- 不主動看盤
- 有 CRITICAL 警報才處理

### 盤後(下班後)
- 看盤後報告(10 分鐘)
- 複盤今日交易(15 分鐘)
- 準備明日計畫

### 週末
- 深度研究個股
- 複盤本週交易
- 調整系統設定

---

## 🔗 相關連結

- Claude Code: https://docs.claude.com/en/docs/claude-code/overview
- Anthropic API: https://console.anthropic.com
- Supabase: https://supabase.com
- Zeabur: https://zeabur.com
- FinMind: https://finmindtrade.com

---

**Built by Vincent, developed with Claude Code 🤖**
