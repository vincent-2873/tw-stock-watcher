# 🚀 VSIS / 呱呱招待所 · 最終執行計畫 v3.0

> **給 Claude Code 的最終版總指令書**
>
> **讀取順序**：
> 1. 先讀 `CLAUDE.md`（放在專案根目錄）
> 2. 再讀 `.claude-code/` 下所有文件
> 3. 最後執行本文件的任務
>
> **日期**：2026-04-23
> **版本**：v3.0 最終版

---

## 🎯 這份文件的目的

前面的對話 Claude Code 做出來有 **7 個關鍵問題**，這份文件要**一次解決**：

1. 🔴 時間錯亂（Hero 日期寫死）
2. 🔴 FinMind API 失敗（付費 token 沒設對）
3. 🔴 費半顯示「—」（FMP 沒接上）
4. 🔴 題材熱度是假資料
5. 🔴 「今日關鍵發言」空殼
6. 🔴 信心度首頁 / 個股頁矛盾
7. 🔴 個股頁自動捲到底

---

## 📋 執行順序（四大階段）

### 🔧 階段 0：緊急修復（TODAY，立刻做）

解決時間、FinMind、UX bug，讓系統資料正常。

### 🎨 階段 1：UI 對齊規範（本週）

把 UI 和評級系統對齊到最終設計。

### 🧠 階段 2：核心情報（下週）

加入情報中樞、重點人物、AI 分析。

### 💡 階段 3：智慧升級（第 3-4 週）

Line 通知、警示系統、呱呱學習。

---

# 🔧 階段 0：緊急修復

## 0.1 修時間（最優先！）

### 檢查清單

```bash
# 1. 確認 Zeabur / Docker 環境變數
echo $TZ  # 應該是 Asia/Taipei

# 2. 確認 Node.js 啟動時設定
# package.json scripts:
{
  "start": "TZ=Asia/Taipei node server.js"
}

# 3. 確認資料庫時區
SELECT current_setting('timezone');  -- 應該是 Asia/Taipei 或 UTC（顯示時轉換）
```

### 修復 Hero 日期

```typescript
// ❌ 找到並移除所有寫死的日期
// 例如：<div>Friday · April 24 · 2026 · 00:15 TPE</div>

// ✅ 改成動態
// components/HeroDate.tsx
'use client';
import { useEffect, useState } from 'react';

export function HeroDate() {
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

      const tpe = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));

      const str = `${weekdays[tpe.getDay()]} · ${months[tpe.getMonth()]} ${tpe.getDate()} · ${tpe.getFullYear()} · ${String(tpe.getHours()).padStart(2, '0')}:${String(tpe.getMinutes()).padStart(2, '0')} TPE`;

      setDateStr(str);
    };

    update();
    const timer = setInterval(update, 60000);  // 每分鐘更新
    return () => clearInterval(timer);
  }, []);

  return <div className="hero-date">{dateStr}</div>;
}
```

### 修復「最後更新」時間

```typescript
// components/LastUpdated.tsx
export function LastUpdated({ timestamp }: { timestamp: string }) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return <span>剛剛更新</span>;
  if (diffMin < 60) return <span>{diffMin} 分鐘前</span>;
  if (diffMin < 24 * 60) return <span>{Math.floor(diffMin / 60)} 小時前</span>;

  return <span>{date.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</span>;
}
```

---

## 0.2 修 FinMind API

### Step 1：確認 token

```bash
# .env 或 Zeabur 環境變數
FINMIND_TOKEN=Vincent的Sponsor_token值
```

### Step 2：驗證 token

```typescript
// scripts/verify-finmind.ts
async function verifyFinMind() {
  const token = process.env.FINMIND_TOKEN;

  if (!token) {
    console.error('❌ FINMIND_TOKEN not set');
    process.exit(1);
  }

  // 測試基本端點
  const res1 = await fetch('https://api.finmindtrade.com/api/v4/user_info', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data1 = await res1.json();
  console.log('User info:', data1);

  // 應該看到 level: 'Sponsor'

  // 測試 Sponsor 專屬資料（三大法人明細）
  const res2 = await fetch(
    'https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockInstitutionalInvestorsBuySell&data_id=2330&start_date=2026-04-01',
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  const data2 = await res2.json();
  if (data2.status === 200) {
    console.log('✅ Sponsor plan works');
  } else {
    console.log('❌ Sponsor plan failed:', data2);
  }
}
```

### Step 3：修好後，所有 FinMind 呼叫統一用

```typescript
// lib/finmind.ts
const TOKEN = process.env.FINMIND_TOKEN;
const BASE = 'https://api.finmindtrade.com/api/v4';

export async function finmindFetch(params: {
  dataset: string;
  data_id?: string;
  start_date?: string;
  end_date?: string;
}) {
  if (!TOKEN) throw new Error('FINMIND_TOKEN not configured');

  const qs = new URLSearchParams(params as any).toString();

  const res = await fetch(`${BASE}/data?${qs}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FinMind ${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data.status !== 200) {
    throw new Error(`FinMind returned: ${data.msg}`);
  }

  return data.data;
}
```

---

## 0.3 修費半 API（FMP）

```typescript
// lib/fmp.ts
const FMP_KEY = process.env.FMP_API_KEY;

export async function getSoxIndex() {
  if (!FMP_KEY) throw new Error('FMP_API_KEY not configured');

  // Philadelphia Semiconductor Index
  const res = await fetch(
    `https://financialmodelingprep.com/api/v3/quote/%5ESOX?apikey=${FMP_KEY}`
  );

  if (!res.ok) throw new Error(`FMP failed: ${res.status}`);

  const data = await res.json();
  return data[0];  // { symbol, price, change, changesPercentage, ... }
}

// 或用 Yahoo Finance 備用
export async function getSoxIndexYahoo() {
  const res = await fetch(
    'https://query1.finance.yahoo.com/v8/finance/chart/%5ESOX'
  );
  const data = await res.json();
  return data.chart.result[0];
}
```

---

## 0.4 修個股頁自動捲到底

```typescript
// app/stocks/[code]/page.tsx
'use client';
import { useEffect } from 'react';

export default function StockPage({ params }: { params: { code: string } }) {
  useEffect(() => {
    // 強制停在頁面頂部
    window.scrollTo(0, 0);
  }, [params.code]);

  return (
    <div>
      {/* 股票資訊區塊 */}
      <StockHeader />
      <ScoringCard />
      <FourQuadrants />
      <NewsFeed />

      {/* AI 對話框放最底 */}
      <AIChatBox />
    </div>
  );
}
```

---

## 0.5 修信心度矛盾

### 統一邏輯

```
個股四象限分數（0-95）→ 換算成 C/N/R/SR/SSR
                      ↓
首頁呱呱推薦只挑 SR / SSR
                      ↓
個股頁顯示 → 相同的評級
```

### 程式碼

```typescript
// lib/scoring.ts
export type Tier = 'C' | 'N' | 'R' | 'SR' | 'SSR';

export function scoreTotier(score: number, maxScore = 95): Tier {
  const pct = (score / maxScore) * 100;
  if (pct <= 20) return 'C';
  if (pct <= 40) return 'N';
  if (pct <= 60) return 'R';
  if (pct <= 80) return 'SR';
  return 'SSR';
}

export function tierColor(tier: Tier): string {
  const map = {
    C: '#4A4A4A',
    N: '#8A8170',
    R: '#B8B0A0',
    SR: '#B85450',
    SSR: '#B8893D'
  };
  return map[tier];
}

// 首頁推薦查詢
export async function getTodayPicks(): Promise<Stock[]> {
  return db.query(`
    SELECT * FROM stocks
    WHERE current_tier IN ('SR', 'SSR')
    ORDER BY current_score DESC
    LIMIT 3
  `);
}
```

---

## 0.6 刪除空狀態「——」

### 全站掃描刪除這些

```typescript
// ❌ 找到所有類似的，刪除
'—— 尚無 ——'
'—— 無資料 ——'
'近 3 日無警示'
'自選股尚無記錄'

// ✅ 改成條件渲染
{data && data.length > 0 ? (
  <List data={data} />
) : (
  <EmptyStateCTA type="watchlist" />  // 或整個區塊 return null
)}
```

### EmptyStateCTA 元件

```tsx
// components/EmptyStateCTA.tsx
export function EmptyStateCTA({ type }: { type: string }) {
  const ctas = {
    watchlist: {
      title: '還沒有自選股？',
      subtitle: '呱呱幫你準備了幾個開始的方式',
      actions: [
        { label: '🔥 從今日題材開始', href: '/topics' },
        { label: '🏆 看台股龍頭', href: '/sectors' },
      ]
    },
    alerts: {
      title: '今日市場平穩',
      subtitle: '還沒觸發任何警示',
      actions: [
        { label: '⚙️ 設定警示規則', href: '/settings' },
      ]
    }
  };

  const cta = ctas[type];
  // ... 渲染
}
```

---

# 🎨 階段 1：UI 對齊規範

## 1.1 導航改成直觀版

```typescript
// components/Navigation.tsx
const navItems = [
  { label: '今日重點', href: '/', icon: '🏠' },
  { label: '題材熱度', href: '/topics', icon: '🔥' },
  { label: '自選股', href: '/watchlist', icon: '📊' },
  { label: '產業地圖', href: '/sectors', icon: '🗺️' },
  { label: 'AI 對話', href: '/chat', icon: '💬' },
  {
    label: '更多',
    icon: '⋯',
    subItems: [
      { label: '盤後報告', href: '/reports' },
      { label: '呱呱日記', href: '/quack-journal' },
      { label: '設定', href: '/settings' },
    ]
  }
];
```

### 🗑️ 刪除以下頁面

- `/backtest`
- `/paper`（模擬下單）
- `/alerts`（改成設定頁的子區塊）

---

## 1.2 評級系統全站套用

### 個股頁

```tsx
// app/stocks/[code]/page.tsx
<div className="stock-header">
  <h1>{stock.name} {stock.code}</h1>
  <TierBadge tier={stock.tier} />
  <div className="score">{stock.score} / 95</div>
  <div className="breakdown">
    基 {stock.fundamental} · 籌 {stock.chip} · 技 {stock.technical} · 題 {stock.topic}
  </div>
</div>
```

### TierBadge 元件

```tsx
// components/TierBadge.tsx
export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`tier-badge tier-${tier.toLowerCase()}`}>
      {tier}
    </span>
  );
}
```

```css
/* globals.css */
.tier-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-family: 'Shippori Mincho', serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  border-radius: 2px;
}

.tier-c {
  background: #4A4A4A;
  color: var(--washi);
}

.tier-n {
  background: #8A8170;
  color: var(--washi);
}

.tier-r {
  background: #B8B0A0;
  color: var(--sumi);
}

.tier-sr {
  background: var(--shu);
  color: var(--washi);
  box-shadow: 0 2px 8px rgba(184, 84, 80, 0.3);
}

.tier-ssr {
  background: linear-gradient(135deg, #D4A05C, var(--kin));
  color: var(--washi);
  box-shadow: 0 4px 16px rgba(184, 137, 61, 0.5);
  position: relative;
  overflow: hidden;
}

.tier-ssr::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(245, 239, 224, 0.4), transparent);
  animation: shine 3s ease-in-out infinite;
}

@keyframes shine {
  0%, 100% { left: -100%; }
  50% { left: 100%; }
}
```

---

# 🧠 階段 2：核心情報

## 2.1 建資料表

```sql
-- 情報來源
CREATE TABLE intel_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50),                  -- 'news' / 'forum' / 'twitter'
  region VARCHAR(20),                -- 'tw' / 'us' / 'global'
  url TEXT,
  rss_url TEXT,
  language VARCHAR(10),
  credibility INT,
  update_frequency INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 情報文章
CREATE TABLE intel_articles (
  id SERIAL PRIMARY KEY,
  source_id INT REFERENCES intel_sources(id),
  title TEXT NOT NULL,
  title_zh TEXT,
  url TEXT UNIQUE,
  author VARCHAR(100),
  published_at TIMESTAMPTZ,
  raw_content TEXT,
  language VARCHAR(10),

  -- AI 分析
  ai_summary TEXT,
  ai_sentiment VARCHAR(20),
  ai_sentiment_score INT,
  ai_confidence INT,
  ai_reasoning TEXT,
  ai_key_points JSONB,
  ai_affected_stocks JSONB,
  ai_affected_sectors JSONB,
  ai_importance INT,
  ai_urgency INT,
  ai_quack_perspective TEXT,
  ai_analyzed_at TIMESTAMPTZ,

  captured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_articles_published ON intel_articles(published_at DESC);
CREATE INDEX idx_articles_importance ON intel_articles(ai_importance DESC);

-- 監測人物
CREATE TABLE watched_people (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_zh VARCHAR(100),
  role VARCHAR(200),
  category VARCHAR(50),
  priority INT,
  x_handle VARCHAR(100),
  affected_stocks JSONB,
  is_active BOOLEAN DEFAULT true
);

-- 人物發言
CREATE TABLE people_statements (
  id SERIAL PRIMARY KEY,
  person_id INT REFERENCES watched_people(id),
  source VARCHAR(50),
  source_url TEXT,
  statement_text TEXT,
  statement_zh TEXT,

  ai_summary TEXT,
  ai_topic VARCHAR(50),
  ai_market_impact TEXT,
  ai_affected_stocks JSONB,
  ai_urgency INT,
  ai_sentiment VARCHAR(20),

  said_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- 評級歷史
CREATE TABLE stock_tier_history (
  id SERIAL PRIMARY KEY,
  stock_code VARCHAR(10),
  score INT,
  tier VARCHAR(5),
  breakdown JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 呱呱預測
CREATE TABLE quack_predictions (
  id SERIAL PRIMARY KEY,
  prediction_type VARCHAR(50),
  subject VARCHAR(100),
  prediction TEXT,
  confidence INT,
  timeframe VARCHAR(20),
  actual_result TEXT,
  hit_or_miss VARCHAR(10),
  reasoning_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ
);

-- 警示
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL,
  subject VARCHAR(100),
  trigger_condition TEXT,
  trigger_data JSONB,
  base_importance INT,
  ai_adjusted_importance INT,
  ai_judgment TEXT,
  notification_type VARCHAR(20),
  notified BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  line_message_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_subject_time ON alerts(subject, created_at DESC);
```

---

## 2.2 填入 Tier 1 資料源

```sql
INSERT INTO intel_sources (name, type, region, rss_url, language, credibility, update_frequency) VALUES
  ('Bloomberg', 'news', 'global', 'https://www.bloomberg.com/feed/podcast/etf-report.xml', 'en', 10, 10),
  ('Reuters', 'news', 'global', 'https://www.reutersagency.com/feed/', 'en', 10, 10),
  ('CNBC', 'news', 'us', 'https://www.cnbc.com/id/100003114/device/rss/rss.html', 'en', 9, 5),
  ('Financial Times', 'news', 'global', 'https://www.ft.com/markets?format=rss', 'en', 10, 15),
  ('WSJ', 'news', 'us', 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', 'en', 10, 15),
  ('MarketWatch', 'news', 'us', 'https://www.marketwatch.com/rss/topstories', 'en', 8, 10),
  ('Seeking Alpha', 'news', 'us', 'https://seekingalpha.com/feed.xml', 'en', 7, 15),
  ('Yahoo Finance', 'news', 'us', 'https://finance.yahoo.com/news/rssindex', 'en', 7, 5),
  ('Benzinga', 'news', 'us', 'https://www.benzinga.com/feed', 'en', 7, 5),
  ('Reddit r/stocks', 'forum', 'global', 'https://www.reddit.com/r/stocks/.rss', 'en', 6, 15),
  ('Reddit r/wallstreetbets', 'forum', 'global', 'https://www.reddit.com/r/wallstreetbets/.rss', 'en', 5, 10),
  ('Reddit r/investing', 'forum', 'global', 'https://www.reddit.com/r/investing/.rss', 'en', 7, 30),
  ('Hacker News', 'forum', 'global', 'https://hnrss.org/frontpage', 'en', 7, 30);
```

---

## 2.3 填入重點人物

```sql
INSERT INTO watched_people (name, name_zh, role, category, priority, x_handle, affected_stocks) VALUES
  -- 美國政策
  ('Jerome Powell', '鮑爾', 'Fed Chairman', 'central_bank', 10, NULL, '[]'),
  ('Janet Yellen', '葉倫', 'US Treasury Secretary', 'central_bank', 9, NULL, '[]'),
  ('Donald Trump', '川普', 'US President', 'central_bank', 10, 'realDonaldTrump', '[]'),

  -- 科技 CEO
  ('Elon Musk', '馬斯克', 'Tesla/xAI/SpaceX CEO', 'tech_ceo', 10, 'elonmusk', '["TSLA"]'),
  ('Jensen Huang', '黃仁勳', 'NVIDIA CEO', 'tech_ceo', 10, NULL, '["2330","3231","2382"]'),
  ('Sam Altman', '奧特曼', 'OpenAI CEO', 'tech_ceo', 9, 'sama', '[]'),
  ('Mark Zuckerberg', '祖克柏', 'Meta CEO', 'tech_ceo', 8, NULL, '[]'),
  ('Satya Nadella', '納德拉', 'Microsoft CEO', 'tech_ceo', 8, 'satyanadella', '[]'),
  ('Tim Cook', '庫克', 'Apple CEO', 'tech_ceo', 9, 'tim_cook', '["2317","2454","3008"]'),
  ('Sundar Pichai', '皮蔡', 'Google CEO', 'tech_ceo', 8, 'sundarpichai', '[]'),

  -- 投資大師
  ('Warren Buffett', '巴菲特', 'Berkshire CEO', 'investor', 10, NULL, '[]'),
  ('Cathie Wood', 'ARK CEO', 'investor', 8, 'CathieDWood', '[]'),
  ('Michael Burry', '貝瑞', 'Scion Asset', 'investor', 7, 'michaeljburry', '[]'),
  ('Ray Dalio', '達利歐', 'Bridgewater Founder', 'investor', 8, 'RayDalio', '[]'),
  ('Bill Ackman', '艾克曼', 'Pershing Square CEO', 'investor', 7, 'BillAckman', '[]'),

  -- 台灣
  ('魏哲家', '魏哲家', 'TSMC Chairman', 'tw_ceo', 10, NULL, '["2330"]'),
  ('劉揚偉', '劉揚偉', 'Foxconn Chairman', 'tw_ceo', 9, NULL, '["2317"]'),
  ('蔡明介', '蔡明介', 'MediaTek Chairman', 'tw_ceo', 8, NULL, '["2454"]'),
  ('彭啓明', '彭啓明', 'Taiwan Central Bank Governor', 'tw_ceo', 8, NULL, '[]'),

  -- 分析師
  ('Dan Ives', 'Dan Ives', 'Wedbush Analyst', 'analyst', 7, 'DivesTech', '["TSLA"]'),
  ('Gene Munster', 'Gene Munster', 'Deepwater', 'analyst', 6, 'munster_gene', '[]'),
  ('謝金河', '謝金河', '財信傳媒董事長', 'analyst', 7, NULL, '[]'),
  ('呂宗耀', '呂宗耀', '呂張投資團隊', 'analyst', 6, NULL, '[]');
```

---

## 2.4 爬蟲實作

```typescript
// scripts/crawlers/rss_crawler.ts
import Parser from 'rss-parser';

const parser = new Parser();

export async function crawlRSSSources() {
  const sources = await db.query(`
    SELECT * FROM intel_sources
    WHERE is_active = true AND rss_url IS NOT NULL
  `);

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.rss_url);

      for (const item of feed.items) {
        // 檢查是否已存在
        const exists = await db.query(
          'SELECT id FROM intel_articles WHERE url = $1',
          [item.link]
        );
        if (exists.length > 0) continue;

        // 過濾：只要跟股市、科技、財經相關的
        const relevant = isRelevantToTaiwanStocks(item.title, item.contentSnippet);
        if (!relevant) continue;

        // 寫入 DB
        await db.query(`
          INSERT INTO intel_articles
            (source_id, title, url, published_at, raw_content, language)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          source.id,
          item.title,
          item.link,
          item.pubDate,
          item.content,
          source.language
        ]);
      }
    } catch (err) {
      console.error(`Failed to crawl ${source.name}:`, err);
    }
  }
}

function isRelevantToTaiwanStocks(title: string, content: string): boolean {
  const keywords = [
    'TSMC', 'Taiwan Semi', '台積電', '2330',
    'Apple', 'NVIDIA', 'AMD', 'Intel',
    'AI chip', 'semiconductor', '半導體',
    'Federal Reserve', 'Fed', 'CPI', 'inflation',
    'Elon Musk', 'Jensen Huang',
    // 更多關鍵字
  ];

  const text = (title + ' ' + content).toLowerCase();
  return keywords.some(kw => text.includes(kw.toLowerCase()));
}
```

---

## 2.5 AI 文章分析

```typescript
// scripts/analyzers/article_analyzer.ts
import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function analyzeArticle(articleId: number) {
  const article = await db.query(
    'SELECT * FROM intel_articles WHERE id = $1',
    [articleId]
  );

  const prompt = `
你是「呱呱」，台股情報分析師。

文章來源：${article.source_name}
文章標題：${article.title}
文章內容：${article.raw_content}

請用 JSON 格式輸出分析結果：

{
  "title_zh": "中文翻譯標題",
  "summary": "一句話摘要（≤ 40 字）",
  "sentiment": "bullish | bearish | neutral | mixed",
  "sentiment_score": -100 到 100,
  "confidence": 0-100,
  "reasoning": "為什麼是多/空（≤ 100 字）",
  "counter_arguments": ["反方觀點 1", "反方觀點 2"],
  "key_points": [
    {"type": "positive", "point": "..."},
    {"type": "negative", "point": "..."}
  ],
  "affected_stocks": [
    {"code": "2330", "name": "台積電", "impact": "positive", "strength": "strong", "reasoning": "..."}
  ],
  "affected_sectors": ["CCL", "半導體"],
  "importance": 1-10,
  "urgency": 1-10,
  "quack_perspective": "呱呱的獨家視角（≤ 100 字，有池塘/水位等意象）",
  "time_horizon": "short | medium | long"
}

風格要求：
- 不預言股價
- 一定要有反方觀點
- 呱呱視角要有洞察
`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }]
  });

  const analysis = JSON.parse(response.content[0].text);

  // 寫回 DB
  await db.query(`
    UPDATE intel_articles SET
      title_zh = $1,
      ai_summary = $2,
      ai_sentiment = $3,
      ai_sentiment_score = $4,
      ai_confidence = $5,
      ai_reasoning = $6,
      ai_key_points = $7,
      ai_affected_stocks = $8,
      ai_affected_sectors = $9,
      ai_importance = $10,
      ai_urgency = $11,
      ai_quack_perspective = $12,
      ai_analyzed_at = NOW()
    WHERE id = $13
  `, [
    analysis.title_zh,
    analysis.summary,
    analysis.sentiment,
    analysis.sentiment_score,
    analysis.confidence,
    analysis.reasoning,
    JSON.stringify(analysis.key_points),
    JSON.stringify(analysis.affected_stocks),
    JSON.stringify(analysis.affected_sectors),
    analysis.importance,
    analysis.urgency,
    analysis.quack_perspective,
    articleId
  ]);

  // 如果重要度高，觸發 Line 通知
  if (analysis.importance >= 8) {
    await triggerLineNotification('intel', articleId);
  }
}

// 批次處理排程（每 5 分鐘）
export async function batchAnalyzePending() {
  const pending = await db.query(`
    SELECT id FROM intel_articles
    WHERE ai_analyzed_at IS NULL
    ORDER BY published_at DESC
    LIMIT 10
  `);

  for (const article of pending) {
    try {
      await analyzeArticle(article.id);
    } catch (err) {
      console.error(`Analyze failed for article ${article.id}:`, err);
    }
  }
}
```

---

# 💡 階段 3：智慧升級

## 3.1 Line Bot 整合

### 設定 Line Webhook

```typescript
// app/api/line/webhook/route.ts
import { Client, validateSignature } from '@line/bot-sdk';

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!
});

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-line-signature');

  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature!)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const { events } = JSON.parse(body);

  for (const event of events) {
    if (event.type === 'message') {
      await handleMessage(event);
    } else if (event.type === 'postback') {
      await handlePostback(event);
    }
  }

  return new Response('OK');
}
```

### 推送函數

```typescript
// lib/line-notifier.ts
export async function sendQuackPick(userId: string, pick: Pick) {
  const flex = buildNewPickFlex(pick);
  await client.pushMessage(userId, flex);
}

// 建構 Flex Message（完整範本在 .claude-code/LINE_NOTIFY_RULES.md）
```

---

## 3.2 警示監測系統

```typescript
// scripts/cron/alert_monitor.ts
// 每 30 秒執行

async function monitorLoop() {
  await Promise.all([
    monitorWatchlistPrices(),
    monitorInstitutionalFlow(),
    monitorTopicHeat(),
    monitorUSMarket(),
    monitorPeopleStatements(),
    monitorSocialMentions(),
    monitorImportantNews(),
  ]);
}

async function monitorWatchlistPrices() {
  const watchlist = await db.getWatchlist();

  for (const stock of watchlist) {
    const current = await getCurrentPrice(stock.code);
    const alerts = checkPriceConditions(stock, current);

    for (const alert of alerts) {
      // AI 判斷
      const judgment = await evaluateAlert(alert);

      if (judgment.should_notify) {
        await sendLineAlert(judgment);

        // 記錄
        await db.query(
          'INSERT INTO alerts (...) VALUES (...)',
          [...]
        );
      }
    }
  }
}
```

---

## 3.3 呱呱學習（命中率）

```typescript
// scripts/cron/learning_loop.ts
// 每日 15:00 執行

async function evaluatePredictions() {
  const pending = await db.query(`
    SELECT * FROM quack_predictions
    WHERE evaluated_at IS NULL
      AND created_at <= NOW() - INTERVAL '1 day'
  `);

  for (const pred of pending) {
    const actual = await getActualResult(pred);
    const hitOrMiss = compareResult(pred.prediction, actual);

    // 如果 miss，送 AI 分析原因
    let errorAnalysis = null;
    if (hitOrMiss === 'miss') {
      errorAnalysis = await claude.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `
我昨天預測：${pred.prediction}
實際結果：${actual}
請分析為什麼預測錯了？（1-2 句）
是資料不足、推論錯誤、還是市場不理性？
`
        }]
      });
    }

    await db.query(`
      UPDATE quack_predictions SET
        actual_result = $1,
        hit_or_miss = $2,
        reasoning_error = $3,
        evaluated_at = NOW()
      WHERE id = $4
    `, [actual, hitOrMiss, errorAnalysis, pred.id]);
  }
}
```

---

# 📋 驗收清單

每個階段完成後，必須通過：

### 階段 0 驗收
- [ ] 首頁時間跟手機一致（動態更新）
- [ ] FinMind 抓得到三大法人資料
- [ ] 費半指數顯示數字，不是「—」
- [ ] 個股頁開啟停在頂部
- [ ] 信心度跟評級一致
- [ ] 沒有任何「——」空狀態文字

### 階段 1 驗收
- [ ] 所有頁面導航用直觀名稱
- [ ] 刪掉 /backtest、/paper、/alerts
- [ ] 評級徽章全站套用（C/N/R/SR/SSR）
- [ ] SSR 卡片會閃光
- [ ] 手機版好看
- [ ] 通過「10 秒測試」（打開 10 秒看懂今天市場）

### 階段 2 驗收
- [ ] 13 個 RSS 源有資料進來
- [ ] 重點人物資料表有 23 筆
- [ ] AI 分析每 5 分鐘跑一次
- [ ] 文章有多空標籤、信心度、影響個股
- [ ] 點文章進去看到 AI 分析頁
- [ ] 首頁「今日關鍵發言」有內容

### 階段 3 驗收
- [ ] Line Webhook 通了（使用者加好友可以收到歡迎訊息）
- [ ] 盤前晨報 8:30 準時推
- [ ] 到價通知觸發 → 5 秒內收到
- [ ] 致命急訊 → 立即收到
- [ ] 每日通知總量控制在 10 則以內
- [ ] 呱呱命中率每天更新

---

# 🔄 持續改進機制

## Claude Code 每次做事前

1. 讀 `CLAUDE.md`
2. 讀 `.claude-code/` 相關文件
3. 確認本計畫書當前階段
4. 執行
5. 自我檢查驗收清單
6. 截圖給 Vincent 確認

## 變更規則的流程

如果 Vincent 想改規則：
1. 在 `.claude-code/CHANGELOG.md` 記錄
2. 更新相關文件
3. 同步更新 `CLAUDE.md`

---

**版本**：v3.0 最終版
**最後更新**：2026-04-23
**適用於**：VSIS / 呱呱招待所

---

## 🦆 給 Vincent 的最後一句

這份計畫書 + `.claude-code/` 的 6 份規則文件，就是 Claude Code 的**教科書**。

他下次打開專案會先讀這些，不會再忘記、不會再做歪。

如果做歪了 = 沒照文件做，你可以直接說：「請重讀 `.claude-code/` 和 `21_FINAL_MASTER_PLAN.md` 再做。」
