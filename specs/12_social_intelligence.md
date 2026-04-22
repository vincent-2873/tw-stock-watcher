# 📡 社群情報系統規格書

> 追蹤 X(推特)、Truth Social、PTT、Threads、Google Trends 等多平台
> 把「非結構化資訊」轉成「可行動投資訊號」

---

## 🎯 為什麼要做這個?

**傳統財報分析追不上的東西:**

- **川普一則 X 貼文** → 10 分鐘內讓全球股市跳動 1-2%
- **馬斯克一句話** → 直接影響 TSLA、BTC、狗狗幣
- **黃仁勳訪談提到某公司** → 該檔隔日跳空開高
- **Sam Altman 一個產品公告** → AI 供應鏈全面動
- **Fed 主席一句暗示** → 美債、股市、匯市同時反應

**這些都不在財報裡。**
**這些都比財報早發生。**
**這些就是 AI 時代真正的 Alpha 來源。**

---

## 📊 四大監控類別

### 類別 1:**國際政要 / 經濟決策者**

| 人物 | 身份 | 平台 | 為什麼重要 |
|------|------|------|----------|
| 川普(Donald Trump) | 美國總統 | Truth Social + X | 貼文能動全球市場 |
| 馬斯克(Elon Musk) | Tesla/X/xAI CEO | X | TSLA、加密貨幣、AI |
| Jerome Powell | Fed 主席 | 公開演講、新聞 | 利率政策暗示 |
| 財政部長 | 美國財政部 | 媒體發言 | 關稅、貨幣政策 |
| 中國官媒 | 新華社、央視 | 官網 | 台海、科技管制 |
| 台灣央行總裁 | 央行 | 公開發言 | 匯率、利率 |

### 類別 2:**科技產業大佬**

| 人物 | 公司 | 影響股票 |
|------|------|---------|
| 黃仁勳(Jensen Huang) | NVIDIA | NVDA、台積電、鴻海、廣達 |
| Sam Altman | OpenAI | 微軟、NVDA、整個 AI 供應鏈 |
| 蘇姿丰(Lisa Su) | AMD | AMD、台積電、AI PC |
| 庫克(Tim Cook) | Apple | AAPL、鴻海、和碩 |
| 祖克柏(Mark Zuckerberg) | Meta | META、AI 算力需求 |
| 馬化騰、李彥宏 | 騰訊、百度 | 中概股 |
| 郭台銘、童子賢 | 鴻海、和碩 | 台灣代工廠 |
| 劉揚偉 | 鴻海董座 | 台股 AI 供應鏈 |

### 類別 3:**台灣財經意見領袖**

| 類型 | 範例 | 平台 |
|------|------|------|
| 投顧分析師 | 大戶老師、投顧節目 | YouTube |
| 財經網紅 | 股癌、Mr. Market | Threads、Podcast |
| 傳統財經人 | 雪球、財訊 | 新聞媒體 |
| 自媒體 | 股海老牛、99M | Facebook、Threads |

⚠️ **警告**:投顧老師要特別小心,AI 要會判斷「出貨話術」

### 類別 4:**散戶情緒(反指標)**

| 來源 | 訊號 | 應用 |
|------|-----|------|
| PTT Stock 板 | 提及次數暴增 | **反指標**(過熱) |
| Threads 股市標籤 | 情緒溫度 | 補充情報 |
| Google Trends | 搜尋量暴增 | 題材發酵早期 |
| Dcard 投資板 | 年輕散戶 | 補充情報 |

---

## 🐦 X(推特)方案 — 最重要的部分

### ⚠️ X 是唯一「非做不可」的平台

因為:
- 川普、馬斯克、黃仁勳、Sam Altman 等關鍵人物**主要發聲管道**
- 消息最快,從發文到全球擴散只要分鐘級
- 其他平台都是「轉述」,有 30 分鐘以上延遲

### 📊 2026 年 X API 最新狀況

X 在 **2026 年 2 月**改成 **Pay-Per-Use(按次收費)**,對個人用戶反而更友善:

| 方案 | 成本 | 適合 |
|------|------|------|
| **X 官方 Pay-Per-Use** | **$0.005/則讀取** + $0.05/次搜尋 | ✅ **推薦給 Vincent** |
| X 官方 Basic(legacy) | $200/月 | ❌ 太貴 |
| X 官方 Pro | $5,000/月 | ❌ 完全不需要 |
| TwitterAPI.io(第三方) | $0.015/credit | ✅ 備選 |
| TweetAPI(第三方) | $17/月 100K 次 | ✅ 備選 |

### 💰 Vincent 的實際月費估算

**追蹤 10 個 VIP 帳號:**
```
川普、馬斯克、黃仁勳、Sam Altman、蘇姿丰
庫克、祖克柏、Powell、劉揚偉、某台灣財經 KOL
```

**用量估算:**
```
每人每天發 5 則 × 10 人 × 30 天 = 1,500 則/月
每則讀取 $0.005 = $7.5/月

每月關鍵字搜尋約 500 次 × $0.05 = $25/月
(搜尋用於找「鴻海」、「2317」、「AI」相關新貼文)

X API 總成本:約 $32.5/月(NT$ 1,000)
```

**這筆錢值得嗎?**
- 一次避免當沖虧損 = 可能省 NT$ 5,000-20,000
- 一次抓到黃仁勳說的話提早布局 = 可能賺 3-10%
- **絕對值得**

### 🔧 X API 實作

```python
# services/x_api_service.py

from tweepy import Client
import asyncio
from datetime import datetime, timedelta

class XApiService:
    """X (Twitter) API Pay-Per-Use 整合"""
    
    # VIP 人物列表(Vincent 可在設定頁增減)
    VIP_ACCOUNTS = {
        "realDonaldTrump": {
            "name": "Donald Trump",
            "category": "political",
            "priority": "critical",
            "default_language": "en"
        },
        "elonmusk": {
            "name": "Elon Musk",
            "category": "tech_ceo",
            "priority": "critical",
            "default_language": "en"
        },
        "nvidia": {  # 黃仁勳較少用個人帳號,多從 NVIDIA 官方
            "name": "NVIDIA",
            "category": "tech_company",
            "priority": "high",
            "default_language": "en"
        },
        "sama": {
            "name": "Sam Altman",
            "category": "tech_ceo",
            "priority": "high",
            "default_language": "en"
        },
        "LisaSu": {
            "name": "Lisa Su",
            "category": "tech_ceo",
            "priority": "high",
            "default_language": "en"
        },
        "tim_cook": {
            "name": "Tim Cook",
            "category": "tech_ceo",
            "priority": "medium",
            "default_language": "en"
        },
        "federalreserve": {
            "name": "Federal Reserve",
            "category": "central_bank",
            "priority": "critical",
            "default_language": "en"
        },
        # Vincent 可加更多
    }
    
    def __init__(self, api_key: str):
        self.client = Client(
            bearer_token=api_key,
            wait_on_rate_limit=True
        )
        self.last_check_time = {}
    
    async def check_vip_accounts(self) -> list[dict]:
        """
        每 3 分鐘檢查所有 VIP 帳號最新貼文
        """
        new_posts = []
        
        for username, info in self.VIP_ACCOUNTS.items():
            try:
                # 只抓上次檢查之後的新貼文
                since_time = self.last_check_time.get(
                    username,
                    datetime.now() - timedelta(minutes=30)
                )
                
                # 抓使用者最近的貼文(Pay-Per-Use: $0.005 × 5 = $0.025)
                tweets = await self._fetch_user_tweets(
                    username=username,
                    since=since_time,
                    max_results=5
                )
                
                for tweet in tweets:
                    new_posts.append({
                        "platform": "x",
                        "author_username": username,
                        "author_name": info["name"],
                        "author_category": info["category"],
                        "priority": info["priority"],
                        "content": tweet.text,
                        "created_at": tweet.created_at,
                        "tweet_id": tweet.id,
                        "url": f"https://x.com/{username}/status/{tweet.id}",
                        "metrics": {
                            "likes": tweet.public_metrics['like_count'],
                            "retweets": tweet.public_metrics['retweet_count'],
                            "replies": tweet.public_metrics['reply_count'],
                        }
                    })
                
                self.last_check_time[username] = datetime.now()
                
            except Exception as e:
                logger.error(f"X API 抓 {username} 失敗: {e}")
        
        return new_posts
    
    async def search_stock_mentions(self, stock_keywords: list[str]) -> list[dict]:
        """
        搜尋特定股票或關鍵字的最新貼文
        用量較貴($0.05/次),不要頻繁用
        """
        results = []
        
        for keyword in stock_keywords:
            # 搜尋近 1 小時的貼文
            query = f"{keyword} -is:retweet lang:en OR lang:zh"
            
            tweets = await self._search_recent(
                query=query,
                max_results=20,
                hours=1
            )
            
            for tweet in tweets:
                results.append({
                    "platform": "x_search",
                    "keyword": keyword,
                    "content": tweet.text,
                    "created_at": tweet.created_at,
                    "author": tweet.author_id,
                    "url": f"https://x.com/i/web/status/{tweet.id}",
                })
        
        return results
```

### 📅 X 監控排程

```yaml
# .github/workflows/x-monitor.yml
name: 🐦 X (Twitter) VIP Monitor

on:
  schedule:
    # 每 3 分鐘檢查 VIP 帳號
    - cron: '*/3 * * * *'
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    timeout-minutes: 2
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Check X VIP accounts
        env:
          X_API_BEARER_TOKEN: ${{ secrets.X_API_BEARER_TOKEN }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          # ... 其他 secrets
        run: |
          python scripts/x_vip_monitor.py
```

### 🚨 重要人物發文時的應急處理

```python
async def handle_vip_post(post: dict):
    """
    VIP 發文了!要快速判斷和推播
    """
    # Step 1: AI 快速判斷影響
    analysis = await ai_quick_analyze(post, timeout=5)
    
    # Step 2: 根據影響等級決定動作
    if analysis['impact_level'] >= 9:
        # 🚨 重大 → 立刻多管道推播
        await notify_critical(post, analysis)
        await update_homepage_urgent_banner(post, analysis)
        await log_as_market_event(post, analysis)
    
    elif analysis['impact_level'] >= 7:
        # ⚡ 顯著 → LINE 推播
        await notify_line_push(post, analysis)
    
    elif analysis['impact_level'] >= 4:
        # 📰 中等 → 累積到整點彙整
        add_to_hourly_digest(post, analysis)
    
    # Step 3: 所有都存檔,供未來查詢
    await save_to_db(post, analysis)
```

---

## 🌐 其他平台實作

### Truth Social(川普專用)

```python
# services/truth_social_service.py

# 用開源工具 truthbrush
from truthbrush import Api

class TruthSocialService:
    """追蹤川普的 Truth Social"""
    
    def __init__(self):
        self.api = Api()
    
    async def get_trump_recent_posts(self, hours: int = 1) -> list[dict]:
        """免費,無 API 費用"""
        since = datetime.now() - timedelta(hours=hours)
        
        posts = []
        for post in self.api.pull_statuses(
            username="realDonaldTrump",
            created_after=since
        ):
            posts.append({
                "platform": "truth_social",
                "author": "Donald Trump",
                "content": post['content'],
                "created_at": post['created_at'],
                "url": post['url'],
            })
        
        return posts
```

### PTT Stock 板

```python
# services/ptt_service.py

import aiohttp
from bs4 import BeautifulSoup

class PTTStockService:
    """PTT Stock 板監控 - 散戶情緒用"""
    
    BASE_URL = "https://www.ptt.cc/bbs/Stock/index.html"
    
    async def get_hot_topics(self, min_push: int = 30) -> list[dict]:
        """抓推文數 >= 30 的熱門文章"""
        posts = []
        
        async with aiohttp.ClientSession() as session:
            async with session.get(self.BASE_URL) as resp:
                html = await resp.text()
        
        soup = BeautifulSoup(html, 'lxml')
        
        for entry in soup.select('.r-ent'):
            push_elem = entry.select_one('.hl')
            if push_elem:
                push_count = push_elem.text
                if push_count == '爆' or (push_count.isdigit() and int(push_count) >= min_push):
                    title = entry.select_one('.title a').text
                    url = "https://www.ptt.cc" + entry.select_one('.title a')['href']
                    posts.append({
                        "platform": "ptt",
                        "title": title,
                        "push_count": push_count,
                        "url": url,
                    })
        
        return posts
    
    async def analyze_stock_mentions(self, stock_id: str, days: int = 7) -> dict:
        """分析某股在 PTT 的討論度"""
        # 統計提及次數、情緒、討論度變化
        # ... 實作細節略
        pass
```

### Google Trends(免費情緒指標)

```python
# services/google_trends_service.py

from pytrends.request import TrendReq

class GoogleTrendsService:
    """Google Trends - 搜尋熱度反映散戶關注度"""
    
    def __init__(self):
        self.pytrends = TrendReq(hl='zh-TW', tz=480)
    
    async def get_stock_search_trend(
        self, 
        stock_keyword: str, 
        timeframe: str = 'now 7-d'
    ) -> dict:
        """
        取得某股票 7 天內的搜尋熱度
        
        Returns:
            {
                "current_value": 85,
                "change_pct": +280,
                "is_spiking": True,
                "history": [日別數據]
            }
        """
        self.pytrends.build_payload(
            [stock_keyword], 
            timeframe=timeframe, 
            geo='TW'
        )
        data = self.pytrends.interest_over_time()
        
        current = data[stock_keyword].iloc[-1]
        start = data[stock_keyword].iloc[0]
        change = (current - start) / max(start, 1) * 100
        
        return {
            "current_value": int(current),
            "change_pct": round(change, 1),
            "is_spiking": change > 100,
            "history": data[stock_keyword].tolist(),
        }
```

---

## 🤖 AI 分析核心

### 單則貼文分析

```python
async def analyze_social_post(post: dict, stock_context: dict = None) -> dict:
    """
    分析一則社群貼文對股市的影響
    """
    prompt = f"""
你是專業金融分析師。請分析這則貼文對股市的影響。

【貼文資訊】
 - 發布者:{post['author_name']}
 - 身份:{post['author_category']}
 - 平台:{post['platform']}
 - 時間:{post['created_at']}
 - 內容:{post['content']}
 - 互動:{post.get('metrics', {})}

【市場當前狀態】
{json.dumps(stock_context or {}, ensure_ascii=False)}

請從以下幾個面向分析並以 JSON 回傳:

1. **impact_level**(1-10):
   - 10 = 重大(如川普宣布關稅、Fed 利率決議)
   - 7-9 = 顯著(大咖 CEO 重要發言)
   - 4-6 = 中等(產業相關消息)
   - 1-3 = 輕微(一般言論)

2. **affected_stocks_direct**:
   - up: 直接利多的股票列表
   - down: 直接利空的股票列表

3. **affected_stocks_indirect**:
   - 供應鏈上下游影響
   - 同業受到的影響

4. **time_impact**:
   - short_term(1-5 天):...
   - medium_term(1-3 月):...
   - long_term(6 月以上):...

5. **credibility**:
   - score(0-100):可信度
   - reason:為什麼給這個分數
   - historical_accuracy:此人過去預測準確度(如果有資料)

6. **is_political_noise**(true/false):
   - 是否只是政治言論沒股市實質影響

7. **action_recommendation**:
   - if_holding_related:若 Vincent 持有相關股票
   - if_considering_entry:若考慮進場
   - if_holding_opposite:若持有相反方向部位

8. **summary_tw**:
   繁體中文一句話摘要(< 40 字,給 LINE 推播用)

9. **deep_dive_tw**:
   詳細分析(100-200 字繁體中文,給網頁看)

請用 JSON 格式回傳。
"""
    
    response = await claude_api.complete(prompt)
    return parse_json(response)
```

### 範例輸出

```json
{
    "impact_level": 9,
    "affected_stocks_direct": {
        "up": ["台積電", "鴻海", "廣達", "NVDA"],
        "down": []
    },
    "affected_stocks_indirect": {
        "up": ["記憶體類股", "AI 散熱", "伺服器零組件"],
        "down": ["傳統 PC 廠"]
    },
    "time_impact": {
        "short_term": "台 AI 供應鏈可能跳空 +2-3%",
        "medium_term": "Nvidia 下一代平台需求預期提高,供應鏈訂單加急",
        "long_term": "AI 機櫃整體市場 2030 可能達 $500B,結構性受惠"
    },
    "credibility": {
        "score": 85,
        "reason": "黃仁勳身為 NVIDIA CEO 對產業預測有第一手資訊",
        "historical_accuracy": "過去 3 年數字預測準確率約 75%"
    },
    "is_political_noise": false,
    "action_recommendation": {
        "if_holding_related": "持有不動,目標價可調高 10%",
        "if_considering_entry": "開盤前 30 分鐘觀察,若跳空 >3% 追高風險大",
        "if_holding_opposite": "立即檢視停損位置"
    },
    "summary_tw": "黃仁勳:AI 算力需求 2028 年達 5 兆,台 AI 供應鏈受惠",
    "deep_dive_tw": "黃仁勳在 GTC 演講中預測 2028 年 AI 算力市場將達 5 兆美元,此數字遠超市場先前預期。對台股 AI 供應鏈是重大利多,尤其台積電(3nm/2nm 製程)、鴻海(NVL72 機櫃 9 成市占)、廣達(AI 伺服器)直接受惠。短線可能跳空,但要注意高位追價風險,建議等開盤觀察 30 分鐘。"
}
```

---

## 📱 UI 呈現

### 1. 個股頁「社群雷達」區塊

```
├─ 📡 社群雷達(近 7 天) ────────────┤
│                                     │
│  影響這檔股票的重要貼文:              │
│                                     │
│  ┌───────────────────────────┐     │
│  │ 🔥 影響:9/10               │     │
│  │ 🇺🇸 黃仁勳 - 2 天前            │     │
│  │ [X] [GTC 演講]              │     │
│  │ "AI 算力需求 2028 達 5 兆"   │     │
│  │                             │     │
│  │ → 鴻海直接受惠               │     │
│  │ → 建議:持有不動              │     │
│  │ → 可信度:85%                │     │
│  │ [查看完整分析]                │     │
│  └───────────────────────────┘     │
│                                     │
│  ┌───────────────────────────┐     │
│  │ ⚡ 影響:7/10                │     │
│  │ 🇺🇸 川普 - 5 天前             │     │
│  │ [Truth Social]              │     │
│  │ "對中國晶片加關稅"           │     │
│  │                             │     │
│  │ → 鴻海中性(分散多國產能)    │     │
│  │ [查看完整分析]                │     │
│  └───────────────────────────┘     │
│                                     │
│  💬 散戶情緒                         │
│  PTT 討論度:+85%(過去 7 天)        │
│  情緒分數:+45(偏樂觀)              │
│  Google 搜尋:+280%(暴增)          │
│                                     │
│  ⚠️ 反指標警示:                      │
│  「散戶過度樂觀,接近情緒高點」      │
```

### 2. 「情報雷達」獨立頁

```
┌─────────────────────────────────────┐
│ 📡 情報雷達                         │
├─────────────────────────────────────┤
│                                     │
│ 🔥 今日重大事件(1)                  │
│ ┌───────────────────────────┐     │
│ │ 影響:9/10                   │     │
│ │ 黃仁勳 GTC 演講                │     │
│ │ → AI 供應鏈全面受惠            │     │
│ │ 相關股票:台積電、鴻海、廣達    │     │
│ │ [完整分析]                     │     │
│ └───────────────────────────┘     │
│                                     │
│ ⚡ 值得關注(3)                       │
│ • 馬斯克發布新模型 (影響 7)          │
│ • Fed 主席鴿派發言 (影響 7)          │
│ • 蘇姿丰談 AI PC 滲透率 (影響 6)     │
│                                     │
│ 📰 今日整點彙整(8)                  │
│ 產業類:                             │
│ • 半導體:TSM 新廠確定               │
│ • AI 伺服器:超微訂單增              │
│                                     │
│ 💬 散戶熱度 Top 5                    │
│  1. 鴻海     +280%  (警示:過熱)    │
│  2. 台積電   +125%                  │
│  3. 華邦電   +95%                   │
│  4. 聯發科   +45%                   │
│  5. 廣達     +30%                   │
│                                     │
│ 🔍 我關注的人物 [編輯]                │
│  ✅ 黃仁勳    (最新 2 天前)          │
│  ✅ 馬斯克    (最新 1 天前)          │
│  ✅ 川普     (最新 6 小時前)         │
│  ✅ Sam Altman                       │
│  ✅ Fed Chair                       │
└─────────────────────────────────────┘
```

---

## 📅 執行排程

```
📅 持續監控(24/7):

每 3 分鐘:X VIP 帳號(10 人)
每 30 分鐘:Truth Social(川普)
每 1 小時:PTT Stock 板
每 1 小時:財經 KOL RSS
每 1 小時:Google Trends(自選股)
每 3 小時:Threads、Dcard

📅 定時整合:

07:30 早報前彙整(過去 12 小時重點)
13:45 盤中彙整(台股收盤前)
22:00 每日情報日報
```

---

## 💰 最終成本

| 服務 | 用途 | 月費 |
|------|------|------|
| X API Pay-Per-Use | VIP 即時追蹤 | ~$32 |
| truthbrush | 川普 Truth Social | 免費 |
| pytrends | Google Trends | 免費 |
| PTT 爬蟲 | 散戶情緒 | 免費 |
| NewsAPI | 新聞補強 | 免費 |
| RSS.app | 媒體聚合 | 免費 |
| **Claude API 增加量** | AI 分析貼文 | +$10-15 |
| **合計新增** | | **~$42-47/月** |

原系統 $15-25 → **加入社群智慧後 $60-75/月(NT$ 2,000-2,400)**

---

## 🚨 風險與警告

### 1. 虛假訊息
- 冒充帳號:AI 必須檢查 verified 標記
- 深偽(Deepfake):影片/音訊要多源交叉驗證

### 2. 翻譯偏差
- 英文原文直翻中文會失真
- AI 分析時**同時看原文 + 翻譯**

### 3. 反指標使用
- PTT 過熱 ≠ 股價會跌(時機不定)
- 散戶情緒當「警示」不當「交易訊號」

### 4. 政治雜訊
- 川普的政治表態 ≠ 經濟政策
- AI 必須判斷「這則對股市有影響嗎」

### 5. 成本失控
- X API 搜尋較貴($0.05/次)
- 要設月度 cap,超過就降級為「只追 VIP」

```python
# 成本控管
MAX_MONTHLY_X_COST = 50  # USD
current_month_cost = await get_current_month_x_cost()

if current_month_cost > MAX_MONTHLY_X_COST:
    logger.warning("X API 月費超上限,降級為只追 VIP")
    # 停止搜尋,只追 VIP 帳號
    disable_search_mode()
```

---

## ✅ 這份規格書回答了什麼

| Vincent 的問題 | 答案 |
|---------------|------|
| 「有社群貼文分析嗎?」 | ✅ 有,四大類別 + AI 分析 |
| 「文章分析有嗎?」 | ✅ 有,NewsAPI + RSS + AI 深度解讀 |
| 「川普貼文獲取到嗎?」 | ✅ Truth Social(免費)+ X(即時) |
| 「產業大佬貼文?」 | ✅ X API 追蹤 10 個 VIP 帳號 |
| 「步驟完整嗎?」 | ✅ 從抓取 → 分析 → 分發 → UI |
