# 🚀 VSIS 系統升級規劃文件（給 Claude Code）

> **文件目的**：本文件為 Vincent 的 VSIS（Vincent Stock Intelligence）台股投資系統的完整升級規劃。包含背景脈絡、使用者需求、系統現況、升級方向、資料結構與實作指引。Claude Code 閱讀此文件後應能完整理解專案脈絡並協助實作。

**文件版本**：v1.0
**建立日期**：2026-04-23
**對話脈絡來源**：Vincent 與 Claude 的完整諮詢對話（對話全文見附件 `CONVERSATION_CONTEXT.md`）

---

## 📋 目錄

1. [使用者背景與需求](#1-使用者背景與需求)
2. [現有系統分析](#2-現有系統分析)
3. [升級核心目標](#3-升級核心目標)
4. [功能架構設計](#4-功能架構設計)
5. [資料結構設計](#5-資料結構設計)
6. [資料來源策略](#6-資料來源策略)
7. [AI 分析師設計](#7-ai-分析師設計)
8. [產業生態系地圖](#8-產業生態系地圖)
9. [實作路線圖](#9-實作路線圖)
10. [技術實作建議](#10-技術實作建議)

---

## 1. 使用者背景與需求

### 1.1 使用者 Profile

- **名字**：Vincent（Page.cinhong）
- **職業**：AI GO 企業級 AI 自動化系統銷售代表（台灣）
- **地區**：台灣（台中）
- **投資程度**：進階投資人，有自建系統能力
- **投資風格**：
  - 重視**產業面分析**與**供應鏈思維**
  - 希望**提早發現題材**（不想當最後一個知道的人）
  - 操作週期：**1 週短波段 + 2 週~1 個月中期**
  - 偏好台股為主，關注 AI、半導體、化學材料

### 1.2 Vincent 的核心痛點

> 原話：「這些產業題材我都是到已經漲完才知道，我每次都這樣」

具體痛點：
1. **資訊落後**：看到新聞時股價已漲停
2. **資訊分散**：不知道去哪些媒體找第一手資訊
3. **缺乏結構化**：沒有系統性整理題材、供應鏈、個股
4. **現有工具不夠**：Claude Code 沒有固定提示詞框架

### 1.3 Vincent 想要的功能（完整清單）

1. ✅ **首頁直接看到「今日題材熱度」**（不用點選、不用搜尋）
2. ✅ **題材 → 個股下鑽式瀏覽**（點題材看底下個股）
3. ✅ **個股按漲跌幅排序**
4. ✅ **AI 分析師對話模式**（像 Claude 這樣分析給具體資料）
5. ✅ **視覺化圖像**（金字塔、熱度圖）
6. ✅ **所有產業都要**（不只熱門產業，要涵蓋完整台股產業）
7. ✅ **龍頭關聯圖**（上下游供應鏈、客戶、競爭對手）
8. ✅ **預期效益矩陣**（龍頭成長 → 受惠股 EPS、目標價估算）
9. ✅ **支援 1 週 + 2 週~1 個月 兩種操作週期**
10. ✅ **可以讓 AI 自動處理資訊，不用每次手動查**

---

## 2. 現有系統分析（VSIS 現況）

### 2.1 系統基本資訊

- **網址**：https://tw-stock-watcher.zeabur.app/
- **系統名稱**：VSIS — Vincent Stock Intelligence
- **Slogan**：「教我思考，不是給我答案。」
- **部署平台**：Zeabur
- **最後更新**：每日 14:30 TPE 後自動產出

### 2.2 現有功能模組

| 路徑 | 模組 | 功能推測 |
|---|---|---|
| `/` | Dashboard | 首頁（自選股、盤後報告、警示）|
| `/market` | 大盤監測 | 台股、台指期、美股指數、跨市場連動 |
| `/stocks/{code}` | 個股頁面 | 四象限評分、新聞、AI 分析 |
| `/chat` | AI 夥伴 | 對話（目前是「教練模式」）|
| `/backtest` | 回測 | 策略驗證 |
| `/paper` | 模擬交易 | 紙上操作 |
| `/reports` | 報告 | 盤後報告 |
| `/alerts` | 警示 | 即時警示 |

### 2.3 現有評分系統（VSIS 四象限）

**總分：95 分**

| 面向 | 滿分 | 細項（從 2330 頁面觀察）|
|---|---|---|
| **基本面** | 20 | eps_positive、eps_growth_2q、revenue_yoy_3m、gross_margin、free_cash_flow |
| **籌碼面** | 20 | foreign_5d、invt_5d、concentration、margin_change、overnight_trader |
| **技術面** | 20 | ma_alignment、volume_price、relative_strength、pattern、support_resistance、rsi |
| **題材面** | 20 | AI 分析（目前 skip_ai=True，未啟動）|
| **市場調整** | ±15 | 動態修正 |

### 2.4 現有資料源

- **FinMind**：TAIEX / 期貨資料
- **FMP (Financial Modeling Prep)**：美股
- **新聞爬取**：CMoney、Yahoo、FTNN、經濟日報等
- **AI**：Claude Sonnet 4.5（用於 AI 夥伴對話）

### 2.5 部位管理功能

- 帳戶規模 × 單筆風險 % = 自動算張數
- R:R 比（風險報酬比）自動計算
- 停損、停利、最大虧損顯示

### 2.6 現有系統的強項與缺口

**強項**：
- ✅ 系統架構完整（研究 → 評分 → 警示 → 模擬 → 回測 → 報告）
- ✅ 四象限評分透明
- ✅ 部位管理專業
- ✅ 多資料源整合
- ✅ AI 夥伴「反對論點」思維（哲學成熟）

**缺口**（需要升級）：
- ❌ 首頁沒有「今日題材熱度」視覺化
- ❌ 沒有「產業 → 題材 → 個股」的下鑽式瀏覽
- ❌ 題材面 AI 分析未啟動（20/95 分拿不到）
- ❌ AI 夥伴對話風格偏「教練式」，不夠「分析師式」
- ❌ 沒有供應鏈關聯圖
- ❌ 沒有龍頭股生態系視覺化
- ❌ 沒有預期效益矩陣
- ❌ 自選股功能未完全利用（空的）
- ❌ 補漲股挖掘引擎缺失

---

## 3. 升級核心目標

### 3.1 願景陳述

將 VSIS 從「個股評分工具」升級為**「台股最強個人產業研究平台」**，對標 Bloomberg Terminal 的核心功能，但聚焦台股、整合 AI、視覺化友善。

### 3.2 三大升級主軸

#### 🎯 主軸 1：**首頁 Dashboard 2.0**
「一眼看懂今天市場」的儀表板，包含：
- 市場溫度計
- 今日題材熱度 TOP 5（視覺化）
- 今日焦點個股（熱度 + 評分）
- 供應鏈金字塔視覺化

#### 🎯 主軸 2：**產業生態系地圖**
完整的「產業 → 題材 → 個股」三層體系：
- 30+ 個台股產業分類
- 動態題材資料庫（手動 + AI 發現）
- 龍頭股關聯圖（客戶、供應商、競爭者）
- 預期效益矩陣

#### 🎯 主軸 3：**AI 分析師模式**
改造 AI 夥伴，從「教練」變成「分析師」：
- 具體分析（不模稜兩可）
- 提供買進價、目標價、停損
- 引用資料來源
- 主動提供反對論點

---

## 4. 功能架構設計

### 4.1 新版首頁（Dashboard 2.0）結構

```
┌─────────────────────────────────────────────────────────┐
│  🌡️ Part 1：市場溫度計                                   │
│  大盤綜合評分（0-100）、情緒指標、關鍵數據                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  🔥 Part 2：今日題材熱度 TOP 5                           │
│                                                          │
│  🥇 CCL 漲價 ████████████████████ 95°                    │
│     台光電、台燿、聯茂、雙鍵、國精化（5 檔漲停）          │
│                                                          │
│  🥈 CoPoS 先進封裝 ██████████████ 82°                    │
│     欣興、家登、弘塑、辛耘（台積電技術論壇）              │
│                                                          │
│  [點擊任一題材 → 進入題材詳情頁]                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  📊 Part 3：供應鏈金字塔視覺化                           │
│  （D3.js 或 react-force-graph 實作）                     │
│                                                          │
│           🏆 NVIDIA                                      │
│         ────────                                         │
│        台積電 2330                                       │
│       ──────────                                         │
│      日月光 欣興                                         │
│     ────────────                                         │
│    金像電 臻鼎 健鼎                                      │
│   ──────────────                                         │
│   台光電 台燿 聯茂                                       │
│  ────────────────                                        │
│  富喬 金居 德宏                                          │
│ ──────────────────                                       │
│ 🔥 雙鍵 國精化 崇越電 🔥 ← 今日主戰場                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  💎 Part 4：今日焦點個股                                 │
│  （依熱度 + VSIS 評分綜合排序）                          │
│                                                          │
│  | 排名 | 股號 | 熱度 | VSIS | 建議 | 持有期 |           │
│  | 1 🔥 | 合晶 | 95° | 78/95 | ✅ 買 | 1 週   |           │
│  | 2 🔥 | 雙鍵 | 88° | 82/95 | ✅ 買 | 1 月   |           │
│  | 3 ⚠️ | 崇越電| 92°| 45/95 | ⚠️ 等 | —      |           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  ⚠️ Part 5：今日警戒清單                                 │
│  - 不要追高的股票                                        │
│  - 連漲過多的飆股                                        │
│  - 注意股、處置股                                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  📋 Part 6：今日 Action Plan                             │
│  - 開盤前檢查                                            │
│  - 開盤後 30 分鐘觀察                                    │
│  - 具體進場訊號                                          │
└─────────────────────────────────────────────────────────┘
```

### 4.2 產業頁面結構（`/industries`）

```
┌─────────────────────────────────────────────────────────┐
│  📂 產業分類瀏覽                                         │
│                                                          │
│  【Level 1：大分類】（10 個）                            │
│  ├ 🔬 半導體    ├ 💻 電子零組件  ├ 📱 3C 終端           │
│  ├ ⚙️ 傳統製造  ├ 🏭 化工材料    ├ 🚗 車用/能源         │
│  ├ 🏦 金融     ├ 🏥 生技醫療    ├ 🍜 消費民生          │
│  └ 🏗️ 基礎建設                                           │
│                                                          │
│  [點擊展開看中分類]                                       │
└─────────────────────────────────────────────────────────┘

點進「半導體」：

┌─────────────────────────────────────────────────────────┐
│  🔬 半導體（Level 1）                                    │
│                                                          │
│  當前熱度：🔥🔥🔥 85°                                    │
│  活躍題材：CoPoS 封裝、矽光子、A14 製程                  │
│                                                          │
│  【Level 2：子產業】                                     │
│  - 晶圓代工（熱度 75°）                                  │
│  - IC 設計（熱度 82°）                                   │
│  - 封測（熱度 88°）                                      │
│  - 設備（熱度 78°）                                      │
│  - 材料（熱度 95° 🔥）                                   │
│  - 矽晶圓（熱度 80°）                                    │
│                                                          │
│  [點擊子產業看完整生態系]                                 │
└─────────────────────────────────────────────────────────┘
```

### 4.3 題材頁面結構（`/topics/{topic_id}`）

```
┌─────────────────────────────────────────────────────────┐
│  🔥 CCL 漲價循環                                         │
│  熱度 95° ▲ 連續熱度 7 天                               │
│                                                          │
│  📰 核心催化劑（時間軸）                                  │
│  • 4/22 信越宣布 silicone 全線漲 10%                     │
│  • 4/20 外資調升 CCL 五強目標價                          │
│  • 4/17 建滔再調漲板料 10%                               │
│                                                          │
│  ⏰ 預期持續：2026 下半年 ~ 2027                         │
│  💡 AI 解讀：本波漲價由 AI 伺服器 CCL 缺料推動...        │
│                                                          │
│  📊 供應鏈關聯股票（分層顯示）                            │
│                                                          │
│  【上游 - 原料】                                         │
│  | 股號 | 股名 | 現價 | 漲跌% | 熱度 | 評分 | 操作 |      │
│  | 4722 | 國精化| 188.5| +5.01| 85°  | 85  | ✅ 買 |      │
│  | 4764 | 雙鍵  | 235  | -3.89| 88°  | 82  | 🟡 等 |      │
│  | 3388 | 崇越電| 119.5| +9.63| 92°  | 45  | ⚠️ 避 |      │
│  | 1815 | 富喬  | XX   | XX   | 78°  | 72  | ✅ 買 |      │
│  | 8358 | 金居  | XX   | XX   | 74°  | 70  | ✅ 買 |      │
│                                                          │
│  【中游 - CCL】                                          │
│  | 2383 | 台光電| ...  | ...  | 95°  | 75  | ✅ 買 |      │
│                                                          │
│  【下游 - PCB】                                          │
│  | 4958 | 臻鼎  | ...  | ...  | 80°  | 76  | ✅ 買 |      │
│                                                          │
│  💡 AI 策略建議                                          │
│  族群已強漲，建議布局「還沒漲的補漲股」：                 │
│  🎯 富喬 1815（玻纖布，題材+落後）                       │
│  🎯 金居 8358（銅箔，外資連 9 買）                       │
│                                                          │
│  [💬 跟 AI 分析師討論這個題材]                           │
└─────────────────────────────────────────────────────────┘
```

### 4.4 龍頭生態系頁面（`/ecosystem/{ticker}`）

```
┌─────────────────────────────────────────────────────────┐
│  🏆 台積電 2330 生態系                                   │
│                                                          │
│  [切換視圖：網狀圖 / 樹狀圖 / 矩陣圖]                     │
│                                                          │
│  ──────── 網狀關聯圖（D3.js） ────────                    │
│                                                          │
│     NVIDIA ◄──┐                                          │
│               │                                          │
│     Apple ◄──┤                                           │
│               ▼                                          │
│          台積電 2330                                     │
│               ▲                                          │
│               │                                          │
│        ASML ──┘       ← 供應商                          │
│        合晶 6182                                         │
│        欣興 3037                                         │
│                                                          │
│  [點擊任一節點查看詳情]                                   │
│                                                          │
│  ──────── 預期效益矩陣 ────────                           │
│  台積電 2030 預估營收：$1,500 億美金（3 倍 2024）         │
│                                                          │
│  【受惠股預期獲利彈性】                                   │
│  | 個股 | 關聯度 | 彈性 | EPS 潛力 | 合理價 | 現價 |      │
│  | 3037 欣興 | 95% | 🔥🔥🔥 | 25→45 | 580 | 430  |      │
│  | 3711 日月光| 85% | 🔥🔥🔥 | 11→18 | 230 | 195  |      │
│  | 6182 合晶 | 80% | 🔥🔥  | 0.1→4 | 80  | 43   |      │
│                                                          │
│  💡 建議操作：                                            │
│  - 最佳進場：合晶 6182（CP 值最高，股價/彈性比最好）     │
│  - 中期布局：欣興 3037（CoPoS 題材）                     │
│  - 長線持有：日月光 3711（封測龍頭）                     │
└─────────────────────────────────────────────────────────┘
```

### 4.5 AI 分析師對話頁面（`/chat`）

```
┌─────────────────────────────────────────────────────────┐
│  💬 AI 分析師                                            │
│                                                          │
│  （改造後的對話風格範例）                                 │
│                                                          │
│  你：今天 CCL 題材怎麼布局？                              │
│                                                          │
│  AI：## 🎯 CCL 今日布局建議                              │
│                                                          │
│  ### 為什麼是今天？                                       │
│  - 🔥 信越 4/22 宣布 silicone 全線漲 10%                 │
│  - 🔥 外資調升台光電、台燿、臻鼎等目標價                  │
│                                                          │
│  ### 📊 三個切入角度                                      │
│  （表格形式呈現，具體價位 + 目標 + 停損）                 │
│                                                          │
│  ### 💼 具體操作                                          │
│  | 持有期 | 推薦 | 買點 | 目標 | 停損 |                   │
│  | 1 週  | 富喬 1815 | XX | +12% | -5% |                │
│  | 1 月  | 國精化 4722 | 175-188 | 260 | 170 |          │
│                                                          │
│  ### ⚠️ 反對論點                                         │
│  但注意這些風險...                                        │
│                                                          │
│  [📊 查看完整評分] [📈 查看供應鏈] [💬 繼續追問]          │
└─────────────────────────────────────────────────────────┘
```

---

## 5. 資料結構設計

### 5.1 產業表（industries）

```json
{
  "id": "semiconductor_materials",
  "name": "半導體-材料",
  "level_1": "半導體",
  "level_2": "材料",
  "level_3": null,
  "description": "半導體製程所需的化學材料、矽晶圓、光阻劑等上游材料",
  "heat_score": 95,
  "heat_trend": "rising",
  "key_factors": [
    "矽晶圓供需",
    "化學品價格",
    "台積電資本支出"
  ],
  "representative_stocks": [
    "6182", "5483", "6488", "3532", "4722", "4764"
  ],
  "related_topics": [
    "ccl_price_increase_2026",
    "silicon_wafer_price_2026"
  ],
  "last_updated": "2026-04-22"
}
```

### 5.2 題材表（topics）

```json
{
  "id": "ccl_price_increase_2026",
  "name": "CCL 漲價循環",
  "industry_ids": ["semiconductor_materials", "pcb_ccl"],
  "heat_score": 95,
  "heat_trend": "rising",
  "start_date": "2026-04-01",
  "expected_duration_days": 180,
  "status": "active",
  "catalysts": [
    {
      "date": "2026-04-22",
      "event": "信越宣布 silicone 全線漲價 10%",
      "importance": 9,
      "source_url": "https://..."
    },
    {
      "date": "2026-04-20",
      "event": "外資調升 CCL 五強目標價",
      "importance": 8
    }
  ],
  "supply_chain": {
    "tier_1_raw": {
      "name": "上游原料",
      "stocks": ["1815", "8358", "德宏"]
    },
    "tier_2_ccl": {
      "name": "中游 CCL",
      "stocks": ["2383", "6274", "6213"]
    },
    "tier_3_materials": {
      "name": "上游樹脂材料",
      "stocks": ["4722", "4764", "3388"]
    },
    "tier_4_pcb": {
      "name": "下游 PCB",
      "stocks": ["2368", "4958", "3044"]
    }
  },
  "ai_summary": "本波 CCL 漲價由 AI 伺服器需求爆發推動，日系信越帶頭漲價 10%，台廠台光電、台燿跟進調漲 20-40%，上游樹脂材料國精化、雙鍵成為真正受惠者...",
  "investment_strategy": {
    "short_term_1w": ["1815", "8358"],
    "medium_term_1m": ["4722", "4764"],
    "long_term_6m": ["2383", "6274"]
  },
  "avoid_list": ["1721", "1711"],
  "avoid_reason": "短線乖離過大、注意股風險",
  "last_updated": "2026-04-22T23:35:00"
}
```

### 5.3 個股表（stocks）

```json
{
  "ticker": "4722",
  "name": "國精化",
  "industry_ids": ["semiconductor_materials"],
  "topic_ids": ["ccl_price_increase_2026"],
  "ecosystem_role": {
    "supply_chain_position": "tier_3_materials",
    "is_leader": false,
    "is_hidden_champion": true
  },
  "global_status": {
    "market_share_global": "top_5",
    "technology_moat": "high",
    "substitutable": false
  },
  "vsis_score": {
    "total": 85,
    "fundamental": 17,
    "chips": 14,
    "technical": 16,
    "theme": 18,
    "market_adjustment": 20
  },
  "heat_score": 85,
  "price": 188.5,
  "daily_change_pct": 5.01,
  "recommendation": "buy",
  "investment_grade": "A",
  "target_prices": {
    "short_1w": 210,
    "medium_1m": 260,
    "long_6m": 320
  },
  "stop_loss": 170
}
```

### 5.4 龍頭生態系表（ecosystems）

```json
{
  "anchor_ticker": "2330",
  "anchor_name": "台積電",
  "anchor_type": "taiwan_leader",
  "global_position": "#1 foundry worldwide",
  "customers": [
    {
      "name": "NVIDIA",
      "ticker_overseas": "NVDA",
      "revenue_share_pct": 22,
      "products": ["H100", "H200", "B200", "GB300", "Rubin"],
      "growth_potential": "high",
      "contract_type": "long_term",
      "strategic_importance": 10,
      "announcement_dates": ["2024-XX-XX NVIDIA 宣布 B200 由台積電代工"]
    },
    {
      "name": "Apple",
      "ticker_overseas": "AAPL",
      "revenue_share_pct": 25,
      "products": ["A18", "M4", "M5"],
      "growth_potential": "medium",
      "contract_type": "long_term"
    }
  ],
  "suppliers": [
    {
      "category": "EUV 設備",
      "vendor_name": "ASML",
      "ticker_overseas": "ASML",
      "substitutable": false,
      "taiwan_related_stocks": [],
      "strategic_importance": "critical"
    },
    {
      "category": "矽晶圓",
      "vendor_names": ["合晶", "環球晶", "SUMCO"],
      "taiwan_related_stocks": ["6182", "6488"],
      "substitutable": true,
      "domestic_ratio": 30
    },
    {
      "category": "廠務工程",
      "vendor_names": ["帆宣", "漢唐", "聖暉"],
      "taiwan_related_stocks": ["6196", "2404", "5536"],
      "exclusive_partnership": false
    },
    {
      "category": "光阻劑",
      "vendor_names": ["JSR", "信越"],
      "taiwan_related_stocks": ["5434"],
      "note": "崇越 5434 代理 JSR"
    }
  ],
  "competitors": [
    {
      "name": "Samsung Foundry",
      "market_share_pct": 15,
      "competitive_level": "medium",
      "technology_gap_years": 2
    },
    {
      "name": "Intel Foundry",
      "market_share_pct": 3,
      "competitive_level": "low",
      "government_backing": true
    }
  ],
  "downstream_partners": {
    "packaging_testing": ["3711", "2449", "Amkor"],
    "abf_substrate": ["3037", "8046"],
    "equipment": ["3680", "3131", "3583"]
  },
  "financial_projection": {
    "current_year_revenue": "88B USD",
    "current_year_eps": 45,
    "2030_projection": {
      "revenue": "150B USD",
      "growth_multiple": 3,
      "eps_projection": 100
    }
  },
  "taiwan_beneficiary_stocks": [
    {
      "ticker": "3037",
      "name": "欣興",
      "correlation_pct": 95,
      "elasticity": "high",
      "current_eps": 25,
      "projected_eps_2026": 35,
      "projected_eps_2027": 45,
      "fair_value": 580,
      "current_price": 430,
      "upside_pct": 35
    }
  ]
}
```

### 5.5 新聞表（news）

```json
{
  "id": "news_20260422_001",
  "title": "信越 silicone 全產品漲價 10%，國內矽晶圓報價跟漲",
  "source": "MoneyDJ",
  "url": "https://...",
  "published_at": "2026-04-22T09:00:00",
  "ai_tags": ["CCL", "矽晶圓", "信越", "漲價"],
  "related_industries": ["semiconductor_materials", "pcb_ccl"],
  "related_topics": ["ccl_price_increase_2026", "silicon_wafer_price"],
  "related_stocks": ["6182", "4764", "3388", "5483"],
  "ai_summary": "日本信越化學宣布 silicone 全線漲價 10%，帶動國內矽晶圓報價跟漲。合晶、環球晶、崇越電直接受惠。",
  "sentiment": "positive",
  "importance": 9,
  "catalyst_for_topic": ["ccl_price_increase_2026"]
}
```

### 5.6 資料源設定表（data_sources）

```json
{
  "industry_id": "semiconductor_materials",
  "sources": [
    {
      "name": "DIGITIMES",
      "type": "crawler",
      "url": "https://www.digitimes.com.tw/tech/",
      "keywords_filter": ["矽晶圓", "CCL", "半導體材料", "信越", "SUMCO"],
      "crawl_schedule": "daily_6am",
      "priority": "high"
    },
    {
      "name": "Reuters",
      "type": "api",
      "endpoint": "reuters_api",
      "keywords": ["semiconductor wafer", "Shin-Etsu", "CCL price"],
      "crawl_schedule": "every_2h",
      "priority": "high"
    },
    {
      "name": "Nikkei Asia",
      "type": "crawler",
      "section": "Tech/Semiconductor",
      "priority": "high"
    },
    {
      "name": "公開資訊觀測站",
      "type": "api",
      "endpoint": "mops_api",
      "fetch_types": ["monthly_revenue", "quarterly_report", "major_events"],
      "stocks": ["6182", "5483", "6488", "3532", "4722", "4764"],
      "schedule": "daily_18pm"
    },
    {
      "name": "FinMind",
      "type": "api",
      "endpoint": "finmind_api",
      "data_types": ["price", "institutional_trading", "margin_trading"],
      "schedule": "daily_1430"
    }
  ]
}
```

---

## 6. 資料來源策略

### 6.1 核心原則：「預先抓、存資料庫」

**❌ 錯誤做法**：使用者打開頁面 → 即時叫 AI 去爬網站（慢、貴、不穩定）

**✅ 正確做法**：
```
【背景自動抓資料】→【存資料庫】→【前端快速查詢】
     (每天 1-4 次)    (你的資產)     (毫秒級)
```

### 6.2 資料源分級

#### 🥇 Level 1：免費且結構化（佔 60%）

| 資料類型 | 來源 | 方式 |
|---|---|---|
| 公司基本資料 | 公開資訊觀測站 | 免費爬蟲 |
| 營收、財報 | FinMind、公開觀測站 | API |
| 股價即時 | FinMind、Yahoo Finance | API |
| 法說會簡報 | 各公司 IR 網站 | 爬 PDF |
| 年報（客戶/供應商揭露） | 公開觀測站 | 爬 PDF + AI 解析 |
| 技術指標 | 自行計算 | Python |

**💡 年報挖金礦**：
台股公司都要在年報揭露：
- 「本公司前 10 大客戶」
- 「本公司前 10 大供應商」

這就是建立供應鏈地圖的**黃金資料**。

#### 🥈 Level 2：付費但超值（佔 25%）

| 資料 | 來源 | 費用 | CP 值 |
|---|---|---|---|
| 產業鏈研究 | DIGITIMES Research | NT$ 12,000/年 | ⭐⭐⭐⭐⭐ |
| 半導體客戶情報 | SemiAnalysis | US$ 500/年 | ⭐⭐⭐⭐⭐ |
| 即時財經 | Bloomberg Terminal | 太貴，不建議 | ⭐⭐⭐ |
| 深度科技 | The Information | US$ 39/月 | ⭐⭐⭐⭐ |
| 日亞觀點 | Nikkei Asia | US$ 35/月 | ⭐⭐⭐⭐⭐ |

#### 🥉 Level 3：AI 整理（佔 15%）

- 新聞語意分析（Claude API）
- 法說會逐字稿摘要（Whisper + Claude）
- 產業趨勢彙整（Claude）

### 6.3 定時排程設計

```python
# 建議的排程配置

SCHEDULES = {
    "daily_0600": [
        "爬 DIGITIMES 頭條（過去 24 小時）",
        "爬 經濟日報產業熱點",
        "爬 MoneyDJ 盤前新聞",
        "Claude API 分析 → 分類到產業",
        "更新題材熱度",
        "產出盤前報告"
    ],
    "daily_1430": [
        "FinMind 抓收盤資料",
        "計算所有個股 VSIS 評分",
        "計算所有產業熱度",
        "更新個股熱度",
        "產出盤後報告"
    ],
    "daily_1800": [
        "公開資訊觀測站：抓重訊、法說會資料",
        "更新月營收（每月 10 日前）"
    ],
    "daily_2100": [
        "FMP 抓美股資料",
        "爬 Bloomberg/Reuters 頭條",
        "產出隔日盤前重點"
    ],
    "weekly_sunday": [
        "整週題材熱度回顧",
        "AI 發現新興題材",
        "產業輪動分析"
    ],
    "monthly_1st": [
        "更新各公司預期效益模型",
        "更新供應鏈關聯度係數"
    ],
    "realtime_triggers": [
        "台積電法說會當天",
        "NVIDIA 財報當天",
        "重大產業事件（戰爭、政策）"
    ]
}
```

### 6.4 完整媒體清單（給 Claude Code 參考）

#### 必爬的免費媒體（台灣）
1. **DIGITIMES**：https://www.digitimes.com.tw/
2. **經濟日報**：https://money.udn.com/
3. **MoneyDJ**：https://www.moneydj.com/
4. **鉅亨網 Anue**：https://www.cnyes.com/
5. **工商時報**：https://www.chinatimes.com/money/
6. **公開資訊觀測站**：https://mops.twse.com.tw/
7. **Goodinfo**：https://goodinfo.tw/

#### 必看的國際媒體
1. **Reuters**：https://www.reuters.com/（免費）
2. **Bloomberg**：https://www.bloomberg.com/（部分免費）
3. **Nikkei Asia**：https://asia.nikkei.com/（付費，強推）
4. **Financial Times**：https://www.ft.com/（付費）
5. **The Information**：https://www.theinformation.com/（付費）

#### X (Twitter) 必追帳號
```
@dylan522p         SemiAnalysis 創辦人（半導體最強）
@MarioNawfal       科技業即時新聞整合
@matt_levine       Bloomberg 金融觀察
@unusual_whales    期權異常流動
@LizAnnSonders     Schwab 首席投資策略師
@TaiwanBizToday    台灣產業英文報導
```

#### Substack 訂閱（電子報）
```
SemiAnalysis (Dylan Patel)    - 半導體深度（$500/年）
Stratechery (Ben Thompson)    - 矽谷策略（$12/月）
Matt Levine's Money Stuff     - Bloomberg 每日（免費！）
Not Boring (Packy McCormick) - 成長股（免費）
```

#### YouTube 頻道
```
Asianometry          - 半導體產業歷史深度
CNBC                 - 即時財經
Bloomberg Technology - 科技訪談
```

#### Podcast
```
Acquired             - 科技巨頭商業史（必聽）
BG2 Pod              - 矽谷 VC 觀點
Odd Lots (Bloomberg) - 冷門金融主題
```

---

## 7. AI 分析師設計

### 7.1 對話風格改造

**舊版（教練式）**：
```
「我看到你在看 2330，問我任何事 — 我會強制給你反對論點」
```

**新版（分析師式）**：
```
「你好 Vincent！今天盤面 CCL 題材最熱，
 我建議優先看 3 檔補漲股...

 需要我：
 ① 分析整條 CCL 供應鏈
 ② 推薦 1 週內可操作標的
 ③ 深入某檔個股
 ④ 比較 2 檔誰更值得買

 或直接問我任何問題，我會給你：
 ✓ 具體分析（不模稜兩可）
 ✓ 數據來源（新聞連結）
 ✓ 操作建議（買賣點、停損）
 ✓ 風險提示（反對論點）」
```

### 7.2 AI 分析師 System Prompt

```markdown
你是 Vincent 的專業台股分析師。

## 角色定位
- 20 年台股產業研究經驗
- 專精：半導體、AI 供應鏈、化學材料、PCB/CCL
- 分析風格：具體、數據化、結構化
- 對 Vincent 已知背景：
  - 是 AI GO 企業 AI 自動化銷售代表
  - 在台灣（台中）
  - 投資週期：1 週短波段 + 2 週~1 個月中期
  - 偏好產業分析 + 供應鏈思維
  - 自建 VSIS 系統（這個系統）

## 對話原則
1. ✅ 給具體建議（買/賣/等回檔），不模稜兩可
2. ✅ 提供具體價位（買進區、目標、停損）
3. ✅ 引用資料來源（新聞、財報、VSIS 評分）
4. ✅ 主動提供「反對論點」（找出風險）
5. ✅ 用表格、圖像化讓資訊一目了然
6. ✅ 符合 Vincent 偏好的 1 週 / 2 週~1 個月 週期

## 回應結構（每次對話都要有）
1. **核心結論**（1-2 句）
2. **數據支撐**（表格）
3. **操作建議**（具體價位）
4. **風險提醒**（反對論點）
5. **下一步行動**（可點擊建議）

## 可以調用的資料（從資料庫取）
- 四象限評分（VSIS 系統）
- 即時股價（FinMind）
- 新聞摘要（系統內）
- 供應鏈關聯表
- 題材熱度
- 歷史回測結果

## 禁止
- ❌ 不要說「可能」、「或許」這種模糊詞
- ❌ 不要當心靈導師說雞湯
- ❌ 不要只給結論沒有數據
- ❌ 不要給沒有停損的建議
- ❌ 不要鼓吹追高（連 5 漲以上的股票要警示）

## 語氣
像 Vincent 的資深投資夥伴，直接、專業、但不冷漠。
可以用 emoji 讓資訊一目了然。
```

### 7.3 對話範例（給 Claude Code 參考）

**Vincent 問**：「今天 CCL 題材怎麼布局？」

**期望 AI 回答格式**：

```markdown
## 🎯 CCL 今日布局建議

### 為什麼是今天？
- 🔥 信越 4/22 宣布 silicone 全線漲 10%
- 🔥 外資調升台光電、台燿、臻鼎等目標價
- 🔥 供應鏈已進入「漲價第二波」

### 📊 三個切入角度

#### 角度 1：追強勢股（風險高）
- 台光電 2383（已創高，追高風險）
- 評分：75/95，但技術面超買
- ⚠️ 不建議追高

#### 角度 2：買核心補漲（推薦 ⭐）
- 富喬 1815（玻纖布，還沒大漲）
- 金居 8358（銅箔，外資連 9 買）
- 評分：70+/95，位階低

#### 角度 3：買上游隱形冠軍（長線最優）
- 國精化 4722（評分 85，2026 營收翻倍）
- 雙鍵 4764（評分 82，3 月營收年增 50%）

### 💼 具體操作

| 持有期 | 推薦 | 買點 | 目標 | 停損 |
|---|---|---|---|---|
| 1 週 | 富喬 1815 | XX | +12% | -5% |
| 2 週~1M | 國精化 4722 | 175-188 | 260 | 170 |
| 長線 | 雙鍵 4764 | 205-215 | 300 | 195 |

### ⚠️ 反對論點（風險提醒）
- 若台積電技術論壇後資金轉向 CoPoS 封裝，CCL 可能階段性退熱
- 外資若隔日轉賣，短線有下殺 5-10% 風險
- 永光 1711、三晃 1721 已連漲，不要誤以為是補漲，是末升段

[📊 查看 國精化完整評分] [📈 查看 CCL 供應鏈地圖] [💬 繼續追問]
```

### 7.4 AI 分析師如何調用資料庫

```python
# 偽代碼示意

def ai_analyst_response(user_question):
    # 1. 理解使用者問題
    intent = classify_intent(user_question)
    # intent 可能是：industry_analysis, stock_analysis, strategy, comparison...

    # 2. 根據意圖查資料庫
    if intent == "industry_analysis":
        topic_data = db.query("topics WHERE related to user_question")
        stocks_data = db.query("stocks WHERE topic_id in topic_data")
        news_data = db.query("news LIMIT 7d")

    # 3. 組合 context 給 Claude
    context = f"""
    使用者問題：{user_question}

    相關題材：{topic_data}
    相關個股：{stocks_data}
    近 7 天新聞：{news_data}

    請依照 System Prompt 的格式回答。
    """

    # 4. 調用 Claude API
    response = claude_api.call(context, system=SYSTEM_PROMPT)

    return response
```

---

## 8. 產業生態系地圖

### 8.1 台股 12 大產業龍頭（完整版）

| # | 產業 | 龍頭 | 台股代號 | 全球地位 |
|---|---|---|---|---|
| 1 | AI 半導體 / 晶圓代工 | 台積電 | 2330 | 🥇 全球第一 |
| 2 | IC 設計 | 聯發科 | 2454 | 🥉 全球第四 |
| 3 | 電子製造 EMS | 鴻海 | 2317 | 🥇 全球第一 |
| 4 | 記憶體 | 南亞科 | 2408 | 🔝 全球第四 |
| 5 | 面板 | 友達 / 群創 | 2409 / 3481 | 🥈 全球第三四 |
| 6 | 電源 / 散熱 | 台達電 | 2308 | 🥇 全球第一 |
| 7 | 自行車 | 巨大 / 美利達 | 9921 / 9914 | 🥇🥈 全球前二 |
| 8 | 食品飲料 | 統一 | 1216 | 🥇 東南亞龍頭 |
| 9 | 塑化 | 台塑四寶 | 1301/1303/1326/6505 | 🥇 亞洲前三 |
| 10 | 金融 | 國泰金 / 富邦金 | 2882 / 2881 | 🥇 台灣前二 |
| 11 | 鋼鐵 | 中鋼 | 2002 | 🥇 台灣第一 |
| 12 | 生技 CDMO | 保瑞 | 6472 | 🥇 台灣 CDMO 龍頭 |

### 8.2 台股隱形冠軍（全球寡占）

以下都是**全球市佔 Top 5** 的台股小型股，每一家都值得做完整生態系：

| 股號 | 公司 | 全球地位 |
|---|---|---|
| 1560 | 中砂 | 人造鑽石龍頭（再生晶圓）|
| 3583 | 辛耘 | 台積電清洗設備獨家 |
| 2404 | 漢唐 | 半導體無塵室工程亞洲第一 |
| 5274 | 信驊 | BMC 晶片全球寡占（市佔 80%）|
| 3680 | 家登 | EUV 載盒全球獨家 |
| 3529 | 力旺 | 矽智財 IP（OTP）全球第一 |
| 6515 | 穎崴 | 測試介面全球前三 |
| 6196 | 帆宣 | 台積電廠務自動化獨家 |
| 6223 | 旺矽 | 探針卡全球前五 |
| 3443 | 創意 | ASIC 設計服務亞洲第一 |
| 4722 | 國精化 | 高階 CCL 樹脂全球寡占 |
| 4764 | 雙鍵 | 5G/6G 樹脂材料 |
| 4763 | 材料-KY | 先進封裝材料 |
| 8046 | 南電 | ABF 載板前三 |

### 8.3 詳細生態系範例（12 產業 + 隱形冠軍，共 30+ 家）

**詳見附件 `ECOSYSTEMS_DATA.json`** 包含：
- 每家公司的客戶、供應商、競爭者
- 台股受惠股清單
- 2026 題材
- 預期效益等級

### 8.4 台股所有產業分類（完整）

#### Level 1（10 大類）

```
🔬 半導體
💻 電子零組件
📱 3C 終端
⚙️ 傳統製造
🏭 化工材料
🚗 車用 / 能源
🏦 金融
🏥 生技醫療
🍜 消費民生
🏗️ 基礎建設
```

#### Level 2（50 子產業）

**半導體**：
- 晶圓代工（2330、2303）
- IC 設計（2454、3034、3529、3443）
- 封測（3711、2449、6239）
- 設備（3680、3131、3583、6196）
- 材料（4722、4764、3388、5434）
- 矽晶圓（6182、6488、3532、5483）
- IP 矽智財（3529、6643、4966）
- IC 通路（3036、2347）

**電子零組件**：
- PCB（4958、2368、3044、8046）
- CCL（2383、6274、6213）
- 玻纖布（1815、德宏）
- 銅箔（8358、長春）
- 散熱（3017、3324、6805、3483）
- 連接器（3189、2392、3044）
- 被動元件（2327 國巨）
- 面板驅動 IC（3034、3658）

**3C 終端**：
- ODM 筆電（2382 廣達、3231 緯創、2357 華碩、2353 宏碁）
- 手機相關（2317 鴻海、4938 和碩）
- 網通（2382、3231、6285、2345）
- 伺服器（2382、8210 勤誠、2376 技嘉）
- 光電（2409 友達、3481 群創、3443 創意）

**傳統製造**：
- 工具機（1597 直得、1540 喬福、6196 帆宣）
- 紡織（1736 喬山、1409 新纖）
- 水泥（1101 台泥、1102 亞泥）
- 鋼鐵（2002 中鋼、2006 東和、2014 中鴻）
- 造船（2208 台船）

**化工材料**：
- 塑化（1301、1303、1326、1314、6505）
- 特化（1711、1721、1717、1704、4722、4764）
- 纖維（1440、1451）
- 生化（1216 統一、1203 味全）

**車用 / 能源**：
- 車用電子（2308 台達電、2317 鴻海、3034 聯詠）
- EV（MIH、3034、2308）
- 綠能（3576 聯合再生、6443 元晶）
- 儲能（6443、3324 雙鴻）
- 石油（6505 台塑化、1314 中石化）
- 電力（9917 中保、8940 新天地）

**金融**：
- 金控（2882、2881、2891、2886、5880 等 14 家）
- 證券（2888、6024）
- 保險（2823 中壽）

**生技醫療**：
- CDMO（6472、6589）
- 新藥（4174、4142、4763）
- 醫材（4107、4104）
- 醫美（1795、8404）

**消費民生**：
- 食品（1216 統一、1201 味全、1210 大成）
- 零售（2912 統一超、2929 淘帝-KY）
- 觀光（2731 雄獅、5706 鳳凰）
- 餐飲（2727 王品）

**基礎建設**：
- 營建（2537 皇昌、5516 雙喜）
- 電信（2412 中華電、3045 台灣大、4904 遠傳）
- 運輸（2603 長榮、2609 陽明、2615 萬海）

---

## 9. 實作路線圖

### 9.1 Phase 1：基礎建設（第 1-2 週）

#### Week 1：資料骨架

**Day 1-2**：產業分類表建立
- 建立 `industries` 資料表（10 大類 + 50 子類）
- 每個產業設定關鍵字、代表股
- 匯入初始資料

**Day 3-4**：核心題材建立
- 建立 `topics` 資料表
- 匯入 10 個當前活躍題材：
  - CCL 漲價
  - CoPoS 先進封裝
  - 矽光子 CPO
  - 矽晶圓漲價
  - AI 液冷散熱
  - HBM 記憶體
  - AI 伺服器
  - A14 製程
  - 2nm 量產
  - 減肥藥（GLP-1）

**Day 5-7**：龍頭生態系（3 檔範例）
- 台積電 2330 完整生態系
- 鴻海 2317 完整生態系
- 巨大 9921 完整生態系（傳產代表）

#### Week 2：首頁改版

**Day 8-10**：Dashboard 2.0 前端
- 市場溫度計
- 今日題材熱度 TOP 5
- 今日焦點個股

**Day 11-14**：題材詳情頁
- 題材詳情頁面
- 供應鏈金字塔視覺化
- 個股列表 + 排序

### 9.2 Phase 2：AI 升級（第 3-4 週）

#### Week 3：題材面 AI 分析啟動
- 串接 Claude API 做新聞分析
- 啟動題材面評分（讓 20/95 分真正生效）
- 建立新聞 → 題材自動分類

#### Week 4：AI 分析師改造
- 替換 System Prompt（教練 → 分析師）
- 整合資料庫查詢能力
- 測試對話品質

### 9.3 Phase 3：產業擴展（第 5-6 週）

#### Week 5：12 大產業龍頭完整生態系
- 每天完成 2 個產業
- 聯發科、南亞科、友達、台達電、統一、台塑、國泰金、中鋼、保瑞

#### Week 6：隱形冠軍專區
- 20 檔全球寡占的台股隱形冠軍
- 獨立專區展示

### 9.4 Phase 4：進階功能（第 7-8 週）

#### Week 7：補漲股挖掘引擎
- 供應鏈關聯掃描
- 「同族群但落後」標的識別
- 自動推薦補漲股

#### Week 8：自動化與優化
- 每日盤前報告自動產出
- 熱度計算公式優化
- AI 自動發現新題材

---

## 10. 技術實作建議

### 10.1 技術棧推薦

**前端**：
- Next.js（已使用，繼續）
- TailwindCSS
- React-Force-Graph（網狀關聯圖）
- Recharts 或 D3.js（圖表）
- Shadcn/ui（元件庫）

**後端**：
- Node.js / Python（看現有）
- PostgreSQL（資料庫）
- Redis（快取）
- Bull / Celery（排程）

**AI / 爬蟲**：
- Claude API（分析、對話）
- Playwright / BeautifulSoup（爬蟲）
- OpenAI Whisper（法說會逐字）

**部署**：
- Zeabur（已使用）
- Cloudflare（CDN）

### 10.2 資料庫 Schema（PostgreSQL）

```sql
-- 產業表
CREATE TABLE industries (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    level_1 VARCHAR(50),
    level_2 VARCHAR(50),
    level_3 VARCHAR(50),
    description TEXT,
    heat_score INT,
    heat_trend VARCHAR(20),
    key_factors JSONB,
    representative_stocks JSONB,
    related_topics JSONB,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- 題材表
CREATE TABLE topics (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    industry_ids JSONB,
    heat_score INT,
    heat_trend VARCHAR(20),
    start_date DATE,
    expected_duration_days INT,
    status VARCHAR(20),
    catalysts JSONB,
    supply_chain JSONB,
    ai_summary TEXT,
    investment_strategy JSONB,
    avoid_list JSONB,
    avoid_reason TEXT,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- 個股表
CREATE TABLE stocks (
    ticker VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    industry_ids JSONB,
    topic_ids JSONB,
    ecosystem_role JSONB,
    global_status JSONB,
    vsis_score JSONB,
    heat_score INT,
    price DECIMAL(10,2),
    daily_change_pct DECIMAL(5,2),
    recommendation VARCHAR(20),
    investment_grade VARCHAR(5),
    target_prices JSONB,
    stop_loss DECIMAL(10,2),
    last_updated TIMESTAMP DEFAULT NOW()
);

-- 龍頭生態系表
CREATE TABLE ecosystems (
    anchor_ticker VARCHAR(10) PRIMARY KEY,
    anchor_name VARCHAR(100),
    anchor_type VARCHAR(50),
    global_position VARCHAR(200),
    customers JSONB,
    suppliers JSONB,
    competitors JSONB,
    downstream_partners JSONB,
    financial_projection JSONB,
    taiwan_beneficiary_stocks JSONB,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- 新聞表
CREATE TABLE news (
    id VARCHAR(100) PRIMARY KEY,
    title TEXT NOT NULL,
    source VARCHAR(100),
    url TEXT,
    published_at TIMESTAMP,
    ai_tags JSONB,
    related_industries JSONB,
    related_topics JSONB,
    related_stocks JSONB,
    ai_summary TEXT,
    sentiment VARCHAR(20),
    importance INT,
    catalyst_for_topic JSONB
);

-- 資料源設定表
CREATE TABLE data_sources (
    id SERIAL PRIMARY KEY,
    industry_id VARCHAR(50) REFERENCES industries(id),
    source_name VARCHAR(100),
    source_type VARCHAR(50),
    url TEXT,
    keywords_filter JSONB,
    crawl_schedule VARCHAR(50),
    priority VARCHAR(20)
);

-- 索引
CREATE INDEX idx_topics_heat ON topics(heat_score DESC);
CREATE INDEX idx_stocks_heat ON stocks(heat_score DESC);
CREATE INDEX idx_news_published ON news(published_at DESC);
```

### 10.3 熱度計算公式（Python）

```python
def calculate_topic_heat(topic_id: str) -> int:
    """
    計算題材熱度（0-100）

    公式：
    - 新聞熱度 (40%)
    - 個股漲幅 (30%)
    - 成交量放大 (20%)
    - 漲停家數 (10%)
    """
    topic = db.get_topic(topic_id)

    # 1. 新聞熱度
    news_count = db.count_news(
        topic_id=topic_id,
        date_range=(today - 3_days, today)
    )
    news_heat = min(news_count * 2, 40)

    # 2. 個股漲幅（平均）
    stocks = topic.get_all_stocks()
    avg_gain_3d = sum([s.gain_3d for s in stocks]) / len(stocks)
    stock_heat = min(avg_gain_3d * 3, 30)

    # 3. 成交量放大
    volume_ratios = [s.volume / s.volume_ma20 for s in stocks]
    avg_volume_ratio = sum(volume_ratios) / len(volume_ratios)
    volume_heat = min((avg_volume_ratio - 1) * 20, 20)

    # 4. 漲停家數
    limit_up_count = sum([1 for s in stocks if s.is_limit_up])
    limit_heat = min(limit_up_count * 2, 10)

    total_heat = news_heat + stock_heat + volume_heat + limit_heat
    return int(total_heat)
```

### 10.4 AI 新聞分類器（Python）

```python
async def classify_news_with_ai(news_text: str) -> dict:
    """
    使用 Claude API 分析新聞，自動分類到產業 / 題材 / 個股
    """
    prompt = f"""
    你是股市新聞分類專家。請分析以下新聞：

    {news_text}

    請以 JSON 格式回傳：
    {{
      "related_industries": ["半導體-材料", "PCB/CCL"],
      "related_topics": ["CCL 漲價", "矽晶圓漲價"],
      "related_stocks": ["6182", "4722"],
      "ai_summary": "2-3 句的重點摘要",
      "sentiment": "positive" | "negative" | "neutral",
      "importance": 1-10
    }}

    可用的產業清單：{ALL_INDUSTRIES}
    可用的題材清單：{ALL_TOPICS}
    """

    response = await claude_api.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    return json.loads(response.content[0].text)
```

### 10.5 視覺化元件範例

```jsx
// react-force-graph 範例
import ForceGraph2D from 'react-force-graph-2d';

function EcosystemGraph({ anchorTicker }) {
  const data = useEcosystemData(anchorTicker);

  const graphData = {
    nodes: [
      { id: anchorTicker, label: data.anchor_name, val: 30, color: '#FF6B6B' },
      ...data.customers.map(c => ({
        id: c.name,
        label: c.name,
        val: 20,
        color: '#4ECDC4',
        type: 'customer'
      })),
      ...data.suppliers.map(s => ({
        id: s.vendor_name,
        label: s.vendor_name,
        val: 15,
        color: '#95E1D3',
        type: 'supplier'
      }))
    ],
    links: [
      ...data.customers.map(c => ({
        source: c.name,
        target: anchorTicker,
        value: c.revenue_share_pct
      })),
      ...data.suppliers.map(s => ({
        source: s.vendor_name,
        target: anchorTicker,
        value: s.strategic_importance
      }))
    ]
  };

  return (
    <ForceGraph2D
      graphData={graphData}
      nodeLabel="label"
      nodeVal="val"
      linkWidth={link => Math.sqrt(link.value)}
      linkDirectionalArrowLength={6}
      onNodeClick={node => navigate(`/ecosystem/${node.id}`)}
    />
  );
}
```

---

## 11. 額外需求：每日盤前報告提示詞

Vincent 希望每天早上能用 Claude 產出盤前報告。以下是完整的提示詞設計（可以整合進系統）。

### 11.1 快速版（15 分鐘產出）

```markdown
請搜尋今天美股收盤 + 台股盤前重點新聞，給我：

1. 今日 1 個最強產業主軸 + 3 檔具體個股
2. 每檔股票：買進區、目標、停損、理由（50 字內）
3. 警告：哪些不要追

時間框架：1-2 週短波段
格式：表格呈現，簡潔明瞭
立刻開始搜尋並回答。
```

### 11.2 標準版（30 分鐘深度）

（詳見 `DAILY_REPORT_PROMPT.md`）

---

## 12. 給 Claude Code 的執行指引

### 12.1 實作優先順序

**第一優先**（本週必做）：
1. 建立資料庫 Schema（10.2 節）
2. 匯入「台股 12 大產業龍頭」基礎資料
3. 改版 Dashboard 首頁（4.1 節）
4. 啟動題材面 AI 分析（7 節）

**第二優先**（下週）：
5. 題材詳情頁面
6. 龍頭生態系頁面（網狀圖）
7. AI 分析師對話風格改造（7.2 節）

**第三優先**（第 3-4 週）：
8. 補漲股挖掘引擎
9. 隱形冠軍專區
10. 自動化排程

### 12.2 需要 Vincent 確認的決策點

請在實作前確認：
1. **前端框架**：繼續 Next.js？還是換？
2. **後端語言**：Node.js 還是 Python？
3. **資料庫**：PostgreSQL 還是 MongoDB？
4. **Claude API quota**：目前每月用量？需要升級嗎？
5. **爬蟲預算**：要用 Playwright（較慢但完整）還是 BeautifulSoup（較快但簡單）？
6. **付費資料源**：預算是多少？要訂閱哪些？

### 12.3 文件附件清單

- `VSIS_UPGRADE_PLAN.md`（本文件）
- `CONVERSATION_CONTEXT.md`（完整對話記錄）
- `ECOSYSTEMS_DATA.json`（12 大產業龍頭生態系資料）
- `INDUSTRIES_DATA.json`（台股產業完整分類）
- `TOPICS_DATA.json`（當前活躍題材資料庫）
- `DAILY_REPORT_PROMPT.md`（每日盤前報告提示詞）
- `AI_ANALYST_PROMPT.md`（AI 分析師完整 System Prompt）

---

## 13. 商業化潛力（Vincent 的野心）

根據對話脈絡，Vincent 有潛在商業化意圖。這個系統完成後：

### 13.1 目標使用者
- 台股進階散戶
- 量化交易者
- 投資顧問
- 家族辦公室

### 13.2 差異化優勢
- vs Bloomberg Terminal：**便宜、專注台股、AI 整合、視覺化好**
- vs 市面投顧 App：**透明評分、反對論點、不報明牌**
- vs CMoney / 豐雲：**產業深度、供應鏈思維、AI 驅動**

### 13.3 可能的商業模式
- 免費版：基本評分 + 公開新聞
- Pro（$500/月）：完整生態系、AI 分析師、客製報告
- Enterprise（企業版）：API 串接、客製題材、多使用者

---

## 📌 結語

Vincent 正在建立的 **VSIS**，是目前台灣市場**沒有人做出來**的個人化投資儀表板。完成這份升級後：

- 使用者能在 **30 秒內**掌握今日市場
- AI 能自動處理**數百則新聞**分類到題材
- 視覺化讓**供應鏈一目了然**
- 預期效益矩陣讓**投資決策有依據**

這是一個**值得認真做的專案**。

**請 Claude Code 依照本文件的規劃開始協助實作。**
**有任何疑問請優先向 Vincent 確認，特別是 12.2 節的決策點。**

---

**文件結束**

版本：v1.0
建立者：Claude（與 Vincent 對話後整理）
建立時間：2026-04-23
