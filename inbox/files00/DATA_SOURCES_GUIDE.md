# 🌐 VSIS 資料源完整清單

> 本文件列出 VSIS 系統所有建議整合的資料源。分級分類，包含 API 端點、爬蟲設定、成本估算。

---

## 📊 資料源分級

### 🥇 Level 1：必接，免費（第 1-2 週實作）
### 🥈 Level 2：必接，付費但超值（第 3-4 週實作）
### 🥉 Level 3：選配，提升深度（第 5-8 週實作）

---

## 🥇 Level 1：免費必接資料源

### 1. FinMind（台股價量）

**用途**：台股價格、法人、融資券、基本面
**費用**：免費版即可應付（或 $99/月升級版）
**實作方式**：API

```python
import requests

BASE_URL = "https://api.finmindtrade.com/api/v4/data"

def get_stock_price(ticker: str, start_date: str):
    url = f"{BASE_URL}"
    params = {
        "dataset": "TaiwanStockPrice",
        "data_id": ticker,
        "start_date": start_date,
        "token": FINMIND_TOKEN
    }
    return requests.get(url, params=params).json()

def get_institutional_investors(ticker: str, date: str):
    """法人買賣超"""
    params = {
        "dataset": "TaiwanStockInstitutionalInvestorsBuySell",
        "data_id": ticker,
        "start_date": date,
        "token": FINMIND_TOKEN
    }
    return requests.get(BASE_URL, params=params).json()

def get_monthly_revenue(ticker: str):
    """月營收"""
    params = {
        "dataset": "TaiwanStockMonthRevenue",
        "data_id": ticker,
        "token": FINMIND_TOKEN
    }
    return requests.get(BASE_URL, params=params).json()
```

**建議排程**：
- 盤中即時股價：每 5 分鐘
- 收盤資料：14:30 TPE
- 法人買賣超：15:30 TPE
- 月營收：每月 10 日 18:00

---

### 2. 公開資訊觀測站 MOPS（最重要的免費資源）

**用途**：財報、重訊、股東會、董事會、法說會資料
**費用**：完全免費
**實作方式**：爬蟲（BeautifulSoup/Playwright）

**重要頁面**：
```
https://mops.twse.com.tw/mops/web/t05st01   # 重大訊息
https://mops.twse.com.tw/mops/web/t51sb01   # 法說會資料
https://mops.twse.com.tw/mops/web/t05st02   # 股東會資料
https://mops.twse.com.tw/mops/web/t51sb10   # 年報/財報
```

**💎 超重要功能**：年報的「主要客戶/供應商」揭露
```python
def parse_annual_report_customers(ticker: str, year: int):
    """
    從年報 PDF 挖掘「主要客戶」與「主要供應商」
    這是建立供應鏈地圖的黃金資料！
    """
    # 1. 下載年報 PDF
    pdf_url = f"https://mops.twse.com.tw/.../download?co_id={ticker}&year={year}"
    pdf_content = download_pdf(pdf_url)

    # 2. 用 AI 解析（Claude 很擅長這個）
    prompt = f"""
    請從以下年報內容中，找出：
    1. 前 10 大客戶（公司名、佔營收比例）
    2. 前 10 大供應商（公司名、佔採購比例）

    以 JSON 格式回傳。

    年報內容：
    {pdf_content[:50000]}
    """

    return claude_api.call(prompt)
```

---

### 3. DIGITIMES（半導體必看）

**用途**：台灣最強半導體產業媒體
**費用**：免費摘要 + 付費全文（$12,000/年）
**實作方式**：爬蟲 + RSS

```python
# 建議用 Playwright 因為有動態載入
from playwright.sync_api import sync_playwright

DIGITIMES_SECTIONS = [
    "https://www.digitimes.com.tw/tech/semiconductor/",  # 半導體
    "https://www.digitimes.com.tw/tech/display/",         # 面板
    "https://www.digitimes.com.tw/tech/green_industry/",  # 綠能
    "https://www.digitimes.com.tw/tech/ict/",             # ICT
]

def scrape_digitimes_latest():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        articles = []
        for url in DIGITIMES_SECTIONS:
            page.goto(url)
            # 解析文章列表
            titles = page.query_selector_all(".article-title")
            for t in titles[:10]:  # 每個分類抓最新 10 篇
                articles.append({
                    "title": t.inner_text(),
                    "url": t.get_attribute("href"),
                    "section": url,
                    "crawled_at": datetime.now()
                })

        browser.close()
        return articles
```

---

### 4. 經濟日報、工商時報、MoneyDJ、鉅亨網

**用途**：台股綜合財經新聞
**費用**：免費（大部分）
**實作方式**：RSS + 爬蟲

```python
# 用 RSS 先抓摘要，再用爬蟲抓全文
RSS_FEEDS = {
    "經濟日報": "https://money.udn.com/rss/money/index.xml",
    "MoneyDJ": "https://www.moneydj.com/KMDJ/RssCenter.aspx?svc=NR&fno=1",
    "鉅亨網": "https://www.cnyes.com/rss/cat/tw_stock",
    "工商時報": "https://www.ctee.com.tw/rss/latestnews",
}

import feedparser

def fetch_all_news():
    all_news = []
    for source, url in RSS_FEEDS.items():
        feed = feedparser.parse(url)
        for entry in feed.entries:
            all_news.append({
                "source": source,
                "title": entry.title,
                "link": entry.link,
                "published": entry.published,
                "summary": entry.summary
            })
    return all_news
```

---

### 5. TWSE / TPEX（台灣證交所）

**用途**：官方股價、指數、類股資料
**費用**：免費
**實作方式**：API

```python
# 證交所每日收盤行情
https://www.twse.com.tw/exchangeReport/MI_INDEX

# 三大法人買賣超
https://www.twse.com.tw/fund/T86

# 融資融券
https://www.twse.com.tw/exchangeReport/MI_MARGN
```

---

### 6. Yahoo Finance（美股、國際指數）

**用途**：美股、期貨、外匯、商品
**費用**：免費
**實作方式**：yfinance（Python 套件）

```python
import yfinance as yf

def get_us_market_overview():
    symbols = {
        "道瓊": "^DJI",
        "那斯達克": "^IXIC",
        "費半": "^SOX",
        "標普500": "^GSPC",
        "VIX恐慌指數": "^VIX"
    }

    results = {}
    for name, symbol in symbols.items():
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="2d")
        latest = hist.iloc[-1]
        prev = hist.iloc[-2]
        change_pct = (latest.Close - prev.Close) / prev.Close * 100

        results[name] = {
            "price": latest.Close,
            "change_pct": round(change_pct, 2)
        }
    return results
```

---

### 7. Reuters / Bloomberg（國際新聞）

**用途**：國際科技巨頭新聞、地緣政治
**費用**：免費網站 + RSS
**實作方式**：RSS + 爬蟲

```python
REUTERS_RSS = [
    "https://feeds.reuters.com/reuters/technologyNews",
    "https://feeds.reuters.com/reuters/businessNews",
]

BLOOMBERG_TECH = "https://www.bloomberg.com/technology"  # 需爬蟲
```

---

### 8. Goodinfo（台股基本面整合）

**用途**：台股財報、本益比、股利歷史
**費用**：免費
**實作方式**：爬蟲

```python
# Goodinfo 用 encoding=big5，要處理編碼
def scrape_goodinfo(ticker: str):
    url = f"https://goodinfo.tw/tw/StockBzPerformance.asp?STOCK_ID={ticker}"
    response = requests.get(url)
    response.encoding = "big5"
    # 解析財務資料
```

---

## 🥈 Level 2：付費必接（高 ROI）

### 1. SemiAnalysis（Dylan Patel）

**用途**：全球半導體產業最深度分析
**費用**：$500/年
**ROI**：極高（一年帶 10 個勝率 80%+ 的題材就回本）
**網址**：https://semianalysis.com/

**價值**：
- 第一手知道 NVIDIA、AMD、台積電供應鏈真相
- 提早 3-6 個月看到題材
- 台灣散戶幾乎沒人訂閱

---

### 2. Nikkei Asia（日亞觀點）

**用途**：亞洲產業深度報導、日系供應鏈情報
**費用**：$35/月 (~$420/年)
**ROI**：高
**網址**：https://asia.nikkei.com/

**價值**：
- 日本半導體公司動向（信越、SUMCO、Resonac）
- 韓國記憶體動態
- 中國政策解讀

---

### 3. DIGITIMES Research（深度報告）

**用途**：台灣最完整的產業鏈研究
**費用**：NT$ 12,000/年（基本版）
**ROI**：中-高
**網址**：https://www.digitimes.com.tw/

**包含**：
- 半導體產業季度報告
- PCB、面板、手機供應鏈
- 關鍵零組件產能追蹤

---

### 4. The Information

**用途**：矽谷內部消息、科技巨頭動向
**費用**：$39/月
**ROI**：中
**網址**：https://www.theinformation.com/

---

### 5. Stratechery（Ben Thompson）

**用途**：矽谷策略分析
**費用**：$12/月
**ROI**：中（思考框架啟發）
**網址**：https://stratechery.com/

---

## 🥉 Level 3：選配資料源

### Twitter / X（必追帳號）

```python
TWITTER_ACCOUNTS = {
    "@dylan522p": "SemiAnalysis 創辦人 - 半導體深度",
    "@MarioNawfal": "科技業即時新聞整合",
    "@matt_levine": "Bloomberg 金融觀察",
    "@unusual_whales": "期權異常流動",
    "@LizAnnSonders": "Schwab 首席投資策略師",
    "@TaiwanBizToday": "台灣產業英文報導",
    "@RyanBudnickF1": "汽車工業深度",
    "@FaradayResearch": "AI 供應鏈",
}
```

**實作**：X API 或 Apify/Scraperapi 第三方工具
**費用**：X API $100/月（新版）

---

### Substack 電子報

訂閱清單：
- **Matt Levine's Money Stuff** - 免費！每日
- **Stratechery** - $12/月
- **Not Boring (Packy McCormick)** - 免費
- **Platformer** - $10/月

---

### YouTube 頻道

**必追**：
- **Asianometry** - 半導體產業歷史深度
- **CNBC** - 即時財經
- **Bloomberg Technology** - 科技訪談
- **Patrick Boyle** - 金融深度

**實作**：用 Whisper API 自動轉錄 + Claude 摘要
**費用**：Whisper $0.006/分鐘

---

### Podcast

**必聽**：
- **Acquired** - 科技巨頭商業史
- **BG2 Pod** - 矽谷 VC 觀點
- **Odd Lots (Bloomberg)** - 冷門金融主題
- **All-In Podcast** - 科技 VC 圓桌

---

## 💰 預算規劃（不同階段）

### 免費版（$0/月）
- 只用 Level 1 免費資料源
- 人工整理 Twitter 動態

### 基礎版（$50/月）
- Level 1 全部
- The Information ($39/月)
- X API ($10/月 basic)

### 進階版（$200/月）
- 以上全部
- SemiAnalysis ($500/年 = $42/月)
- Nikkei Asia ($35/月)
- DIGITIMES Research ($1,000/年 = $83/月)

### 專業版（$500+/月）
- 以上全部
- Bloomberg Terminal（太貴，不建議）
- 替代方案：Koyfin ($40/月) + TradingView ($60/月)

---

## 🔧 資料源 → 資料庫整合架構

```
┌─────────────────────────────────────────────────────────┐
│                  定時排程系統 (Cron/Celery)              │
└──────┬──────────────────────────────────────────────────┘
       │
       ├──▶ 06:00 抓新聞（Reuters + 經濟日報 + DIGITIMES）
       ├──▶ 09:00 抓亞股開盤
       ├──▶ 14:30 抓台股收盤（FinMind）
       ├──▶ 15:30 抓法人買賣超（TWSE）
       ├──▶ 18:00 抓重訊（MOPS）
       ├──▶ 21:00 抓美股開盤（Yahoo Finance）
       └──▶ 每月 10 日 抓月營收（FinMind）
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                   資料清洗與標準化                        │
│     • 格式統一 • 去重 • 關聯個股 • 關聯題材              │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                    Claude API 分析                       │
│   • 新聞 → 題材分類 • 新聞 → 情緒判斷 • 催化劑偵測       │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                     PostgreSQL 資料庫                    │
│   news / topics / stocks / ecosystems / reports         │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│                     前端 Next.js                         │
│          (每個頁面在毫秒內從資料庫查詢)                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🚨 重要注意事項

### 1. 爬蟲倫理
- **設定合理 delay**（至少 2-3 秒）
- **設定 User-Agent**（模擬真實瀏覽器）
- **遵守 robots.txt**
- **尊重版權**（不要整篇轉載）

### 2. API Rate Limits
- FinMind 免費版：600 次/小時
- Claude API：視 tier 而定
- 建議加 Redis 快取（相同資料不重複抓）

### 3. 法律風險
- **不要爬付費內容繞過訂閱**
- **不要自動發布**（避免被告誹謗）
- **個人使用**（AI 分析、研究）是 OK 的

### 4. 資料可靠性
- **不要只信一個來源**（交叉驗證）
- **Twitter 假消息多**（要設信任分數）
- **AI 可能誤判**（重要決策手動 review）

---

## 📋 給 Claude Code 的實作優先順序

### 第 1 週：Level 1 核心資料源
- [ ] FinMind 台股價格整合
- [ ] MOPS 重訊爬蟲
- [ ] 經濟日報、MoneyDJ RSS

### 第 2 週：新聞智能化
- [ ] Claude API 新聞分類
- [ ] 新聞 → 題材自動連結
- [ ] 新聞 → 個股自動連結

### 第 3-4 週：擴展資料源
- [ ] DIGITIMES 爬蟲
- [ ] Yahoo Finance 美股整合
- [ ] Reuters/Bloomberg RSS

### 第 5-8 週：進階整合
- [ ] 年報 AI 解析（客戶/供應商）
- [ ] 法說會逐字稿 + 摘要
- [ ] Twitter 關鍵帳號監控

---

**文件結束**
