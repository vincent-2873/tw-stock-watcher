# 📈 TW Stock Watcher — 台股分析看盤平台

**一站式台股情報系統**：即時報價 + 技術分析 + 籌碼分析 + 新聞情緒 + AI 個股健檢 + 跨市場聯動（台股/美股/期貨）

## 功能

| 模組 | 內容 |
|---|---|
| 📊 即時看盤 | 台股、美股、期貨、指數、ETF 一覽 |
| 📉 技術分析 | K 線、MA、MACD、RSI、KD、布林、量能 |
| 💰 籌碼分析 | 三大法人、分點進出、融資融券、借券 |
| 📰 新聞情緒 | AI 判讀利多/利空/中性，標記個股影響 |
| 🔬 個股健檢 | 技術/籌碼/基本面/新聞多維度打分 |
| 🎯 個股深度分析 | 財報、產業、競品、AI 綜合評分與建議 |
| ⭐ 自選股 | 雲端同步、多清單、快速切換 |
| 🔔 警示 | RSI/突破/籌碼異動/新聞推播（LINE/Discord/Email） |
| 📱 PWA | 手機離線可用、桌面主螢幕安裝 |

## 技術棧

- **Frontend**：Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui
- **State/Data**：React Query + Supabase SDK
- **Charts**：Lightweight Charts（K 線） + Recharts（指標）
- **Backend**：Next.js API Routes + Supabase Edge Functions
- **DB**：Supabase PostgreSQL（Row Level Security）
- **Auth**：Supabase Auth + Google OAuth
- **Deploy**：Zeabur（GitHub push → 自動部署）

## 資料源

| 來源 | 用途 | 額度 |
|---|---|---|
| TWSE OpenAPI | 台股歷史/個股 | 無限制 |
| FinMind | 三大法人、融資券、借券 | 500/hr 免費 |
| Fugle | 即時報價 | 1000/day 免費 |
| yfinance | 美股、期貨 | 無限（爬蟲） |
| NewsAPI | 新聞 | 100/day 免費 |
| 鉅亨網 RSS | 台股新聞 | 免費 |

## 開發

```bash
pnpm install
cp .env.example .env.local   # 填入各 API key
pnpm dev                      # http://localhost:3000
```

## 部署（Zeabur）

1. Push 到 GitHub `tw-stock-watcher` repo
2. Zeabur → New Project → Deploy from GitHub
3. 在 Zeabur 設環境變數（與 `.env.example` 同名）
4. 自動部署完成
