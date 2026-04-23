# 🌍 VSIS 情報中樞升級指令書 v2.1

> **升級核心**：把 VSIS 從「本地看盤工具」升級成「**全球情報分析中樞**」
>
> **配對檔案**：`19_V2_UPGRADE_BRIEF.md`（前一份升級指令書）
>
> **版本**：v2.1 — 情報擴展
>
> **日期**：2026-04-23

---

## 🎯 四大升級模組

| # | 模組 | 核心能力 |
|---|---|---|
| 1 | 🌍 **全球情報網** | 擴展到國外財經媒體、論壇、X |
| 2 | 👤 **重點人物雷達** | 自動追蹤關鍵人物發言 |
| 3 | 📄 **AI 摘要分析** | 點文章 → 看整理好的分析 |
| 4 | 🎯 **多空判斷** | 每篇文章自動標記 + 說明原因 + 影響個股 |

---

# 🌍 模組 1：全球情報網

## 1.1 資料源分級（Claude Code 照這個順序接）

### 🥇 Tier 1：必接（免費或低成本，ROI 最高）

#### 📰 國際財經媒體
| 來源 | 方式 | 頻率 |
|---|---|---|
| **Bloomberg** | RSS + Web scraping | 每 10 分鐘 |
| **Reuters** | RSS | 每 10 分鐘 |
| **CNBC** | RSS | 每 5 分鐘 |
| **Financial Times** | RSS（部分付費牆）| 每 15 分鐘 |
| **Wall Street Journal** | RSS | 每 15 分鐘 |
| **MarketWatch** | RSS | 每 10 分鐘 |
| **Yahoo Finance** | API（免費）| 每 5 分鐘 |
| **Seeking Alpha** | RSS + API | 每 15 分鐘 |

#### 💬 國外社群論壇
| 來源 | 方式 | 頻率 |
|---|---|---|
| **Reddit r/stocks** | Reddit API（免費）| 每 15 分鐘 |
| **Reddit r/wallstreetbets** | Reddit API | 每 10 分鐘（情緒指標）|
| **Reddit r/investing** | Reddit API | 每 30 分鐘 |
| **Reddit r/SecurityAnalysis** | Reddit API | 每 1 小時 |
| **Hacker News** | HN API（免費）| 每 30 分鐘（科技股用）|

#### 🐦 X / Twitter（重點人物）
| 方式 | 說明 |
|---|---|
| **X API v2** | 官方 API（有免費額度）|
| **Nitter 前端** | 開源替代，免費 |
| **第三方服務** | SocialSearcher, Brand24 |

### 🥈 Tier 2：付費但高 ROI

| 來源 | 月費 | 說明 |
|---|---|---|
| **Bloomberg Terminal** | $2,000+ | 專業版，不推薦個人 |
| **Benzinga Pro** | $99 | 快訊速度快 |
| **Briefing.com** | $35 | 市場快訊 |
| **Finnhub.io** | $39 | 含社群情緒 API |
| **Tipranks** | $30 | 分析師觀點聚合 |

### 🥉 Tier 3：選配

- **Podcast 轉文字**：All-In Podcast, Odd Lots, Bloomberg Surveillance
- **YouTube 頻道**：CNBC, Bloomberg TV（有即時摘要服務）
- **LinkedIn**：投行、基金經理人發文

## 1.2 資料表設計

```sql
-- 新增情報來源表
CREATE TABLE intel_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50),                  -- 'news' / 'forum' / 'twitter' / 'blog'
  region VARCHAR(20),                -- 'tw' / 'us' / 'global'
  url TEXT,
  rss_url TEXT,
  language VARCHAR(10),              -- 'zh-TW' / 'en' / 'zh-CN'
  credibility INT,                   -- 公信力 1-10
  update_frequency INT,              -- 分鐘
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 抓到的文章
CREATE TABLE intel_articles (
  id SERIAL PRIMARY KEY,
  source_id INT REFERENCES intel_sources(id),
  title TEXT NOT NULL,
  url TEXT UNIQUE,
  author VARCHAR(100),
  published_at TIMESTAMP,
  raw_content TEXT,                  -- 原文
  language VARCHAR(10),

  -- AI 分析欄位（模組 3 會填）
  ai_summary TEXT,                   -- AI 摘要
  ai_sentiment VARCHAR(20),          -- 'bullish' / 'bearish' / 'neutral' / 'mixed'
  ai_sentiment_score INT,            -- -100 ~ +100
  ai_reasoning TEXT,                 -- 為什麼是多/空
  ai_key_points JSONB,               -- 關鍵論點陣列
  ai_affected_stocks JSONB,          -- 受影響個股 + 影響方向
  ai_affected_sectors JSONB,         -- 受影響產業
  ai_importance INT,                 -- 重要性 1-10
  ai_analyzed_at TIMESTAMP,

  captured_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_articles_published ON intel_articles(published_at DESC);
CREATE INDEX idx_articles_sentiment ON intel_articles(ai_sentiment);
CREATE INDEX idx_articles_importance ON intel_articles(ai_importance DESC);
```

---

# 👤 模組 2：重點人物雷達

## 2.1 監測名單（MVP 版本，Claude Code 先接這些）

### 🇺🇸 美國政策/央行（影響全球）
| 人物 | 身份 | 平台 |
|---|---|---|
| Jerome Powell | Fed 主席 | 新聞稿 + 演講 |
| Janet Yellen | 財政部長 | 新聞稿 |
| Donald Trump | 總統 | Truth Social + X |
| Elon Musk | Tesla/SpaceX/X CEO | X @elonmusk |

### 💻 科技巨頭
| 人物 | 公司 | 平台 |
|---|---|---|
| Jensen Huang | NVIDIA CEO | 演講 + 財報會議 |
| Sam Altman | OpenAI CEO | X @sama |
| Mark Zuckerberg | Meta CEO | 財報會議 + Threads |
| Satya Nadella | Microsoft CEO | 財報會議 |
| Tim Cook | Apple CEO | 財報會議 |
| Sundar Pichai | Google CEO | 財報會議 |

### 💰 投資大師
| 人物 | 身份 | 平台 |
|---|---|---|
| Warren Buffett | Berkshire | 股東信 + 年會 |
| Cathie Wood | ARK Invest | 週報 + X |
| Michael Burry | Scion Asset | X @michaeljburry |
| Ray Dalio | Bridgewater | LinkedIn + X |
| Bill Ackman | Pershing Square | X @BillAckman |

### 🇹🇼 台灣關鍵人物
| 人物 | 身份 | 平台 |
|---|---|---|
| 魏哲家 | 台積電董事長 | 法說會 |
| 劉揚偉 | 鴻海董事長 | 法說會 + 臨時記者會 |
| 蔡明介 | 聯發科董事長 | 法說會 |
| 彭啓明 | 央行總裁 | 新聞稿 + 記者會 |

### 📊 重量級分析師
| 人物 | 機構 |
|---|---|
| Dan Ives | Wedbush（特斯拉多頭）|
| Gene Munster | Deepwater（蘋果）|
| 謝金河 | 財信傳媒 |
| 呂宗耀 | 呂張投資團隊 |

## 2.2 資料表

```sql
CREATE TABLE watched_people (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_zh VARCHAR(100),
  role VARCHAR(200),                 -- "NVIDIA CEO" 等
  category VARCHAR(50),              -- 'central_bank' / 'tech_ceo' / 'investor' / 'tw_ceo' / 'analyst'
  priority INT,                      -- 1-10 重要度
  x_handle VARCHAR(100),             -- Twitter handle
  x_id VARCHAR(100),                 -- Twitter User ID
  linkedin_url TEXT,
  affected_stocks JSONB,             -- 這個人發言主要影響哪些股
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE people_statements (
  id SERIAL PRIMARY KEY,
  person_id INT REFERENCES watched_people(id),
  source VARCHAR(50),                -- 'x' / 'press' / 'interview' / 'earnings' / 'speech'
  source_url TEXT,
  statement_text TEXT,               -- 原文
  statement_translated TEXT,         -- 中文翻譯

  -- AI 分析
  ai_summary TEXT,                   -- 一句話摘要
  ai_topic VARCHAR(50),              -- 主題：'rate' / 'ai_capex' / 'product_launch' 等
  ai_market_impact TEXT,             -- 對市場的影響
  ai_affected_stocks JSONB,          -- 影響的個股 + 多空
  ai_urgency INT,                    -- 1-10 緊急度

  said_at TIMESTAMP,
  captured_at TIMESTAMP DEFAULT NOW()
);
```

## 2.3 前端呈現

### 首頁新增「今日關鍵發言」區塊

```
┌──────────────────────────────────┐
│ 🎤 今日關鍵發言 · Today's Words   │
├──────────────────────────────────┤
│                                   │
│ [2 小時前] 🔥 緊急度 9/10         │
│ 👤 Vaibhav Taneja · Tesla CFO    │
│ ━━━━━━━━━━━━━━━━━━             │
│ 「今年資本支出將達 250 億美元，   │
│   今年剩餘時間將為負現金流」      │
│                                   │
│ 📊 呱呱分析：                    │
│   利空 AI 供應鏈高本益比股        │
│   影響：創意、世芯、信驊、緯穎     │
│                                   │
│ [ 看完整分析 →]                  │
│                                   │
├──────────────────────────────────┤
│                                   │
│ [5 小時前] 🟡 緊急度 6/10         │
│ 👤 Elon Musk · X                 │
│ ━━━━━━━━━━━━━━━━━━             │
│ "Optimus production will ramp     │
│  10x next year"                   │
│                                   │
│ 📊 呱呱分析：                    │
│   利多台灣機器人供應鏈            │
│   影響：和大、所羅門、鴻海         │
│                                   │
├──────────────────────────────────┤
│                                   │
│ [看更多 →]                        │
└──────────────────────────────────┘
```

### 專屬頁面 `/watch-radar`

- 按人物分類
- 按重要度排序
- 可訂閱（有新發言推播）
- 歷史記錄

---

# 📄 模組 3：AI 摘要分析（點進去不是原文）

## 3.1 核心體驗設計

### 使用者旅程

```
首頁題材卡
   │
   ↓ 點「查看詳情」或某則新聞
   │
進入 AI 分析頁（不是原文）
   │
   ├─ 🎯 一句話結論（最重要！）
   ├─ 📊 多空分類 + 原因
   ├─ 💡 關鍵論點 3-5 點
   ├─ 📈 影響個股列表
   ├─ 🦆 呱呱視角（獨家解讀）
   └─ 🔗 原文連結（想看再點）
```

### UI 範例

```
┌─────────────────────────────────────┐
│  ← 返回題材 / CCL 漲價                │
├─────────────────────────────────────┤
│                                      │
│  🎯 呱呱分析                         │
│                                      │
│  [來源：Bloomberg · 2 小時前]        │
│  [原文標題：Taiwan's CCL makers...] │
│                                      │
│  ━━━━━━━━━━━━━━━━━━━━━            │
│                                      │
│  🎯 一句話結論                       │
│  信越全線漲價 10%，整個 CCL 產業鏈   │
│  價格傳導已確認，上游補漲機會明確。   │
│                                      │
│  ━━━━━━━━━━━━━━━━━━━━━            │
│                                      │
│  📊 判斷：利多（信心 85%）           │
│                                      │
│  [為什麼是利多]                      │
│  1. 信越是全球 silicone 三大廠之一   │
│     全線漲價代表供需緊繃屬實         │
│  2. CCL 中游已率先反映，上游尚未啟動 │
│  3. 歷史上這類傳導週期約 2-3 個月    │
│  4. 符合 AI 基建需求持續擴張的邏輯   │
│                                      │
│  ━━━━━━━━━━━━━━━━━━━━━            │
│                                      │
│  💡 關鍵論點                         │
│                                      │
│  ✅ 信越漲價幅度達 10%，超預期        │
│  ✅ 日系材料商集體表態，非單一事件    │
│  ⚠️ 但要注意 Q3 可能有供給調整風險   │
│                                      │
│  ━━━━━━━━━━━━━━━━━━━━━            │
│                                      │
│  📈 影響個股                         │
│                                      │
│  🟢 直接受惠（強）                   │
│     富喬 1815   玻纖布龍頭           │
│     金居 8358   銅箔廠               │
│     國精化 4722  CCL 樹脂            │
│                                      │
│  🟡 間接受惠（中）                   │
│     台光電 2383  （已漲一波）        │
│     台燿 6274    （已漲一波）        │
│                                      │
│  🔴 可能受壓（負）                   │
│     下游 PCB 廠成本上升：            │
│     臻鼎 4958、健鼎 3044             │
│                                      │
│  ━━━━━━━━━━━━━━━━━━━━━            │
│                                      │
│  🦆 呱呱視角                         │
│                                      │
│  「這不是新故事，是已經發酵 3 週的   │
│   第二波。第一波是 CCL 中游，現在輪  │
│   到玻纖/銅箔補漲。但要注意：主力    │
│   可能用『漲價新聞』當作出貨理由，   │
│   所以看富喬量價是否健康，別看新聞   │
│   就追。」                           │
│                                      │
│  ━━━━━━━━━━━━━━━━━━━━━            │
│                                      │
│  [ 💬 問呱呱 ]  [ 🔗 看原文 ]        │
│                                      │
└─────────────────────────────────────┘
```

## 3.2 AI 分析 Prompt（給 Claude Code 複製用）

```
你是「呱呱」，台股情報分析師。

我給你一篇文章，請做結構化分析。

文章來源：{source}
文章標題：{title}
文章內容：{content}

請用 JSON 格式輸出：

{
  "one_sentence_conclusion": "一句話總結（≤ 40 字）",

  "sentiment": "bullish | bearish | neutral | mixed",
  "confidence": 0-100,

  "sentiment_reasoning": {
    "main_reasons": [
      "理由 1（≤ 30 字）",
      "理由 2",
      "理由 3"
    ],
    "counter_arguments": [
      "反方觀點 1（如果我看錯了會是哪裡錯）"
    ]
  },

  "key_points": [
    {"type": "positive", "point": "..."},
    {"type": "negative", "point": "..."},
    {"type": "neutral", "point": "..."}
  ],

  "affected_stocks": [
    {
      "code": "1815",
      "name": "富喬",
      "impact": "positive",
      "strength": "strong | moderate | weak",
      "reasoning": "為什麼受影響（≤ 20 字）"
    }
  ],

  "affected_sectors": ["CCL", "玻纖", "銅箔"],

  "importance": 1-10,
  "urgency": 1-10,

  "quack_perspective": "呱呱的獨家視角（≤ 100 字，要有人味，可帶池塘/水位/甩轎等意象）",

  "related_topics": ["CCL 漲價循環"],

  "time_horizon": "short | medium | long"
}

風格要求：
- 不預言股價
- 不給明牌
- 說「可能會」「可能使」，不說「一定」
- 反方觀點一定要有（強迫自己找反對意見）
- 呱呱視角要有洞察，不是重述結論
```

## 3.3 批次處理排程

```python
# /scripts/cron/article_analyzer.py
# 每 5 分鐘跑一次

async def analyze_pending_articles():
    # 1. 撈還沒分析的文章
    articles = db.query("""
        SELECT * FROM intel_articles
        WHERE ai_analyzed_at IS NULL
        ORDER BY published_at DESC
        LIMIT 20
    """)

    for article in articles:
        # 2. 呼叫 Claude API
        analysis = await claude_analyze_article(article)

        # 3. 存回去
        db.update_article_analysis(article.id, analysis)

        # 4. 如果重要度 > 7，推播
        if analysis['importance'] > 7:
            push_to_dashboard(article, analysis)

        # 5. 如果影響個股有在自選股，特別警示
        watchlist = db.get_watchlist()
        affected = set(s['code'] for s in analysis['affected_stocks'])
        overlap = affected & set(watchlist)
        if overlap:
            push_watchlist_alert(article, analysis, overlap)
```

---

# 🎯 模組 4：多空判斷 UI

## 4.1 多空標記系統

### 視覺規範

每篇文章都要有明確的**多空標記**：

```
🟢 利多（Bullish）    — 綠色標籤
🔴 利空（Bearish）    — 紅色標籤
🟡 中性（Neutral）    — 黃色標籤
🟠 混合（Mixed）      — 橙色標籤（有利多也有利空）
```

### 信心度顯示

```
高信心 ████████░░  85%
中信心 █████░░░░░  55%
低信心 ██░░░░░░░░  25%
```

## 4.2 文章卡片設計

在首頁「今日重點」區塊，每張文章卡要長這樣：

```
┌─────────────────────────────────────┐
│ 🟢 利多                  信心 85%   │  ← 多空標籤 + 信心度
├─────────────────────────────────────┤
│                                      │
│ 信越全線漲價 10%                    │  ← 標題（AI 改寫後的中文）
│ 📰 Bloomberg · 2 小時前              │  ← 來源 + 時間
│                                      │
│ 📊 呱呱一句話：                     │
│ CCL 供應鏈補漲機會明確，            │  ← AI 摘要
│ 上游玻纖/銅箔尚未啟動。             │
│                                      │
│ 🎯 影響個股：                       │
│ [富喬 +8%] [金居 +6%] [國精化]      │  ← 個股 chip，點可跳轉
│                                      │
│ 🔗 重要度 ████████░░ 8/10           │
│                                      │
│ [ 看完整分析 →]                     │
└─────────────────────────────────────┘
```

## 4.3 首頁「今日重點」區域重新設計

```
┌─────────────────────────────────────────────┐
│  📰 今日重點 · Today's Intelligence          │
│  [🌍 全部 5] [🟢 利多 2] [🔴 利空 2] [🟡 中性 1]│
├─────────────────────────────────────────────┤
│                                              │
│  [最新]                                      │
│  🔴 利空 · 信心 92%                         │
│  Tesla Q1 財報 CAPEX 警告                   │
│  💎 影響：創意 -5.2%、世芯 -6.8%            │
│  [ 看分析 →]                                │
│                                              │
│  ─────────────────────────                  │
│                                              │
│  🟢 利多 · 信心 85%                         │
│  信越全線漲價 10%                           │
│  💎 影響：富喬 +8.5%、金居 +6.1%            │
│  [ 看分析 →]                                │
│                                              │
│  ─────────────────────────                  │
│                                              │
│  🔴 利空 · 信心 78%                         │
│  大摩降評南亞科、華邦電                     │
│  💎 影響：南亞科 -3.8%、華邦電 -5.2%        │
│  [ 看分析 →]                                │
│                                              │
│  ─────────────────────────                  │
│                                              │
│  🟡 中性 · 信心 60%                         │
│  Musk: "Optimus 明年量產 10 倍"             │
│  💎 影響：和大、所羅門（長線）              │
│  [ 看分析 →]                                │
│                                              │
│  ─────────────────────────                  │
│                                              │
│  🟢 利多 · 信心 72%                         │
│  信越 Q1 EPS 創新高                         │
│  💎 影響：國精化、雙鍵                      │
│  [ 看分析 →]                                │
│                                              │
│  [ 看所有情報 →]                            │
└─────────────────────────────────────────────┘
```

## 4.4 篩選與搜尋

提供多維度篩選：

```
篩選：
  多空：全部 | 利多 | 利空 | 中性 | 混合
  重要度：全部 | 高（7-10）| 中（4-6）| 低（1-3）
  時間：全部 | 今天 | 本週 | 本月
  來源：全部 | Bloomberg | Reuters | CNBC | PTT | Reddit | X
  語言：全部 | 中文 | 英文
  個股：輸入代號只看相關

排序：
  最新 | 重要度 | 信心度 | 影響大小
```

---

# 🎨 Dashboard 首頁整合設計

新版首頁順序（從上到下）：

```
1. Hero 區（呱呱 + 今日一句話）
2. 市場脈動（四欄數字）
3. 🆕 今日關鍵發言（重點人物，最多 3 筆）
4. 🆕 今日重點情報（全球新聞分析，5 筆）
5. 題材熱度 Top 5
6. 供應鏈金字塔（含切換器）
7. 三大法人
8. 產業熱力圖
9. 資金輪動
10. 呱呱推薦標的（3 碗茶）
```

---

# 📋 Claude Code 執行順序

## Phase 1（本週）：UI 外殼 + 基礎爬蟲

### Day 1-3：資料源設置
- [ ] 建 `intel_sources` 表，填入 Tier 1 清單
- [ ] 建 `intel_articles` 表
- [ ] 建 `watched_people` 表，填入人物名單
- [ ] 建 `people_statements` 表

### Day 4-5：爬蟲實作
- [ ] Bloomberg / Reuters / CNBC / MarketWatch RSS
- [ ] Reddit API 接入（r/stocks, r/wallstreetbets）
- [ ] X API 接入（重點人物 10-20 個先試水）
- [ ] 排程每 5-30 分鐘抓取

### Day 6-7：基礎 UI
- [ ] 首頁新增「今日關鍵發言」區塊（空殼）
- [ ] 首頁新增「今日重點情報」區塊（空殼）
- [ ] 單篇文章詳情頁 `/intel/[id]`

## Phase 2（下週）：AI 分析接上

### Day 8-10：分析引擎
- [ ] Prompt 確認（用上面的 JSON 格式）
- [ ] 批次分析排程（每 5 分鐘）
- [ ] 翻譯功能（英文文章翻中文摘要）
- [ ] 影響個股標記

### Day 11-12：重點人物
- [ ] 人物發言分析
- [ ] 緊急度判斷
- [ ] 即時推播（重要度 > 7）

### Day 13-14：多空 UI
- [ ] 文章卡完整樣式
- [ ] 多空標籤 + 信心度視覺化
- [ ] 篩選器
- [ ] 搜尋功能

## Phase 3（第三週）：體驗優化

- [ ] 文章詳情頁的呱呱視角
- [ ] 影響個股點擊跳轉
- [ ] 自選股關聯警示
- [ ] 歷史情報查詢
- [ ] 人物關注訂閱

---

# 💬 給 Claude Code 的指令（直接複製）

```
繼續 VSIS 升級。我要擴展「情報中樞」能力。

請讀兩份新文件：
1. 20_INTEL_HUB_UPGRADE.md（本文件）
2. （搭配前面的 19_V2_UPGRADE_BRIEF.md）

【核心升級】
1. 資料源擴展到全球（Bloomberg、Reuters、CNBC、Reddit、X 等）
2. 重點人物雷達（Musk、Jensen、Powell、魏哲家等）
3. 文章不給原文，給 AI 分析（摘要、多空、原因、影響個股）
4. 每篇都有利多/中立/利空標記

【執行原則】
- 保留所有現有 API
- 按 Phase 1/2/3 順序做
- 每個 Phase 完成截圖給我看
- 不要自己改設計，嚴格照文件做

【第一步】
先做 Phase 1 Day 1-3：
建好 4 個資料表（intel_sources, intel_articles,
watched_people, people_statements），
並填入 Tier 1 資料源 + 重點人物名單。

完成後給我看資料庫 schema 確認。
```

---

# 🦆 給 Vincent 的一句話

這次升級後，VSIS 會變成：

> **「呱呱不只看台灣、不只讀新聞、不只給原文。
> 他看全世界、監控關鍵人物、幫你消化所有訊息。
> 你打開 Dashboard 就看到『今天世界發生什麼 + 對你意味著什麼』」**

這就是**真正的情報中樞**。

---

**文件版本**：v2.1
**建立日期**：2026-04-23
**配對檔案**：
- `18_ZEN_HOMEPAGE_v3.html`（視覺範本）
- `19_V2_UPGRADE_BRIEF.md`（前一份升級書）
- `14_HUMAN_FEEL_CHECKLIST.md`（驗收標準）
