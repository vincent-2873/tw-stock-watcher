# 📊 資料處理規則 · Data Rules

## ⏰ 時間處理（最重要！之前都錯在這）

### 鐵則 1：絕不寫死日期

```javascript
// ❌ 絕對不可以
const today = "April 24, 2026";
const date = "2026/4/22";

// ✅ 必須動態
const today = new Date();
const taipeiTime = new Date().toLocaleString('zh-TW', {
  timeZone: 'Asia/Taipei',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit'
});
```

### 鐵則 2：統一用 Asia/Taipei

```javascript
// utils/time.ts
export const TPE_TZ = 'Asia/Taipei';

export function getTaipeiNow() {
  return new Date().toLocaleString('en-US', { timeZone: TPE_TZ });
}

export function formatTaipeiDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('zh-TW', {
    timeZone: TPE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function formatTaipeiDateFancy(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  return `${weekdays[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()} · ${d.getFullYear()} · ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} TPE`;
}
```

### 鐵則 3：Cron 必須設 TPE 時區

```yaml
# Zeabur / Docker 環境變數
TZ=Asia/Taipei

# 或 Node.js 啟動時
process.env.TZ = 'Asia/Taipei';
```

### 鐵則 4：資料庫 TIMESTAMP 用 UTC，顯示時轉 TPE

```sql
-- 存 UTC
CREATE TABLE articles (
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 讀取時轉 TPE
SELECT
  id, title,
  published_at AT TIME ZONE 'Asia/Taipei' AS published_tpe
FROM articles;
```

### 鐵則 5：前端顯示時間規格

| 位置 | 格式 | 範例 |
|---|---|---|
| Hero 日期 | 英文完整 | `Friday · April 23 · 2026 · 16:21 TPE` |
| 卡片角落 | 簡短 | `16:21` 或 `2 小時前` |
| 更新時間 | 相對 | `剛剛更新`、`30 秒前`、`2 分鐘前` |
| 文章發布 | 視情況 | `4/23 16:21`（今天）、`4/22`（昨天）、`2 天前` |

---

## 🔌 FinMind API 規則

### Token 設定

```bash
# .env
FINMIND_TOKEN=eyJ0eXAi...  # Vincent 的 Sponsor plan token
```

```javascript
// api/finmind.ts
const FINMIND_BASE = 'https://api.finmindtrade.com/api/v4';
const TOKEN = process.env.FINMIND_TOKEN;

if (!TOKEN) {
  throw new Error('FINMIND_TOKEN is required');
}
```

### 正確呼叫方式

```javascript
// ✅ 正確
async function getTaiexData() {
  const response = await fetch(
    `${FINMIND_BASE}/data?dataset=TaiwanStockPrice&data_id=TAIEX&start_date=2026-01-01`,
    {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    }
  );

  if (!response.ok) {
    console.error('FinMind API failed:', response.status, await response.text());
    throw new Error(`FinMind API failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 200) {
    console.error('FinMind returned error:', data);
    throw new Error(data.msg);
  }

  return data.data;
}
```

### Sponsor Plan 可用端點

```
TaiwanStockPrice              股價（含 TAIEX）
TaiwanStockInstitutionalInvestorsBuySell  三大法人（Sponsor 才完整）
TaiwanStockMarginPurchaseShortSale        融資融券
TaiwanStockShareholding       集保分點
TaiwanFutOpt                  期貨選擇權
TaiwanStockNews               新聞（有限）
TaiwanStockMonthRevenue       月營收
TaiwanStockFinancialStatements 財報
```

### ❌ API 失敗時的行為

```javascript
// ❌ 不可以（靜默沿用舊資料）
async function getData() {
  try {
    return await fetchFromAPI();
  } catch {
    return OLD_CACHED_DATA;  // ❌ 使用者會看不出問題
  }
}

// ✅ 要這樣
async function getData() {
  try {
    return await fetchFromAPI();
  } catch (error) {
    console.error('API failed:', error);
    // 記錄到監控
    await logToMonitoring('FINMIND_API_FAILED', error);
    // 顯示明確錯誤，讓使用者知道
    throw new Error('資料暫時無法取得，請稍後再試');
  }
}
```

---

## 🌐 外部資料源優先級

### Tier 1：核心資料源（必須穩定）

| 來源 | 用途 | 備註 |
|---|---|---|
| FinMind Sponsor | 台股所有資料 | Vincent 付費 |
| FMP (Financial Modeling Prep) | 美股即時 | 備用 Yahoo Finance |
| Anthropic Claude API | AI 分析 | Sonnet 4.5 |

### Tier 2：情報來源（新聞 + 社群）

| 來源 | 類型 | 費用 |
|---|---|---|
| Bloomberg | RSS | 免費 |
| Reuters | RSS | 免費 |
| CNBC | RSS | 免費 |
| Financial Times | RSS | 部分付費 |
| Yahoo Finance | API | 免費 |
| Seeking Alpha | RSS | 免費 |
| MarketWatch | RSS | 免費 |

### Tier 3：社群

| 來源 | 類型 | 費用 |
|---|---|---|
| Reddit API | 論壇 | 免費（有限額）|
| X API v2 | 社群 | 有免費額度 |
| PTT | 爬蟲 | 免費 |
| Dcard | 爬蟲 | 免費 |
| CMoney | 爬蟲 | 免費 |

---

## 💾 資料庫規則

### 所有表必須有

```sql
CREATE TABLE example (
  id SERIAL PRIMARY KEY,
  -- 業務欄位 ...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_example
  BEFORE UPDATE ON example
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### 必要索引

```sql
-- 時間序列查詢
CREATE INDEX idx_articles_published ON intel_articles(published_at DESC);

-- 關聯查詢
CREATE INDEX idx_articles_stock ON intel_articles USING gin(ai_affected_stocks);

-- 狀態查詢
CREATE INDEX idx_articles_sentiment ON intel_articles(ai_sentiment);
```

---

## 🔄 資料更新頻率

| 資料類型 | 更新頻率 | 方式 |
|---|---|---|
| 股價（即時） | 30 秒 | WebSocket or 輪詢 |
| TAIEX / 台指期 | 30 秒 | FinMind |
| 三大法人（盤中估算） | 5 分鐘 | FinMind |
| 三大法人（確定值） | 每天 15:30 | FinMind |
| 新聞爬取 | 5-15 分鐘 | RSS |
| 社群監測 | 15 分鐘 | API |
| 重點人物 X | 5 分鐘 | X API |
| AI 文章分析 | 即時（抓到就分析）| Claude |
| 題材熱度重算 | 5 分鐘 | 後端 job |
| 個股評級重算 | 15 分鐘 | 後端 job |
| 呱呱命中率 | 每天 15:30 | 後端 job |

---

## 🚫 資料呈現禁忌

### 1. 不可顯示「—」或「無資料」
```javascript
// ❌ 不可以
{data ?? '——'}
{data ?? '無資料'}

// ✅ 要這樣
{data ? <DataCard /> : null}  // 整個隱藏
{data ? <DataCard /> : <EmptyStateCTA />}  // 或顯示引導
```

### 2. 不可顯示假資料

```javascript
// ❌ 絕對不可以
const FAKE_DATA = { price: 68.5, change: 8.5 };

// ✅ 要這樣
const data = await fetchRealData();
if (!data) return <LoadingOrError />;
```

### 3. Loading 狀態必須明確

```jsx
{isLoading ? (
  <SkeletonCard />  // 不要只顯示空白
) : data ? (
  <RealCard data={data} />
) : (
  <ErrorState onRetry={refetch} />
)}
```

---

## ⚙️ 環境變數規範

```bash
# .env.example

# === 必要 ===
DATABASE_URL=postgresql://...
FINMIND_TOKEN=your_finmind_token
ANTHROPIC_API_KEY=your_claude_key
LINE_CHANNEL_ACCESS_TOKEN=your_line_token
LINE_CHANNEL_SECRET=your_line_secret

# === 選用 ===
FMP_API_KEY=your_fmp_key
X_API_KEY=your_x_key
REDDIT_CLIENT_ID=your_reddit_id
REDDIT_CLIENT_SECRET=your_reddit_secret

# === 時區（重要！）===
TZ=Asia/Taipei
```

---

## 📝 資料驗證

### 新進資料必須驗證

```typescript
// 例：新聞文章
interface ArticleInput {
  title: string;
  url: string;
  published_at: string;
  content: string;
  source: string;
}

function validateArticle(input: unknown): ArticleInput {
  // 使用 zod / yup / 手寫
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid article');
  }

  const a = input as any;

  if (!a.title || typeof a.title !== 'string' || a.title.length > 500) {
    throw new Error('Invalid title');
  }

  try {
    new URL(a.url);
  } catch {
    throw new Error('Invalid URL');
  }

  const publishedDate = new Date(a.published_at);
  if (isNaN(publishedDate.getTime())) {
    throw new Error('Invalid published_at');
  }

  // 未來時間不合理
  if (publishedDate > new Date()) {
    throw new Error('published_at is in future');
  }

  return a as ArticleInput;
}
```

---

**版本**：v1.0
**最後更新**：2026-04-23
