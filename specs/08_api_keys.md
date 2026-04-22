# 🔑 API Keys 申請完整指南

> 照順序申請,全部完成約需 30-40 分鐘

---

## 📋 申請清單總覽

| # | 服務 | 免費? | 難度 | 預估時間 |
|---|------|-------|------|---------|
| 1 | GitHub 帳號 | ✅ 免費 | ⭐ | 2 分鐘 |
| 2 | Supabase | ✅ 免費 | ⭐ | 5 分鐘 |
| 3 | Zeabur | 💰 $5/月 | ⭐ | 5 分鐘 |
| 4 | FinMind | ✅ 免費 | ⭐ | 3 分鐘 |
| 5 | FMP | ✅ 免費 | ⭐ | 3 分鐘 |
| 6 | NewsAPI | ✅ 免費 | ⭐ | 2 分鐘 |
| 7 | LINE Messaging API | ✅ 免費 | ⭐⭐⭐ | 10 分鐘 |
| 8 | Anthropic API | 💰 付費 | ⭐⭐ | 5 分鐘 |
| 9 | Gmail App Password | ✅ 免費 | ⭐⭐ | 5 分鐘 |

**總成本:約 NT$ 500-800/月**

---

## 1. GitHub 帳號(程式碼 + 排程)

### 為什麼需要?
- 儲存專案程式碼
- GitHub Actions 排程執行所有 workflow
- 完全免費

### 申請步驟

1. 前往 https://github.com/signup
2. 填 Email、密碼、使用者名稱
3. 驗證 Email
4. 完成

### 需要記下的

```
USERNAME: 你的 GitHub 使用者名稱
```

### 進階設定(建立 Repo 時)

```bash
# 建立新 Repo
名稱:vincent-stock-system
類型:Public(這樣 Actions 免費無限)
注意:敏感資訊只放在 GitHub Secrets,不會公開
```

---

## 2. Supabase(資料庫)

### 為什麼需要?
- 儲存所有資料(股票、推薦、警報、報告)
- 免費方案:500MB 空間、50,000 筆 row(夠用)
- 有內建 Auth、API

### 申請步驟

1. 前往 https://supabase.com
2. 點 "Start your project" → 用 GitHub 登入
3. 建立新專案
   ```
   Name: vincent-stock-system
   Database Password: [產生強密碼,存好]
   Region: Northeast Asia (Tokyo) ← 台灣最近
   Pricing: Free
   ```
4. 等 2 分鐘建立完成

### 需要記下的

到 Settings → API,複製:

```
SUPABASE_URL: https://xxxxx.supabase.co
SUPABASE_ANON_KEY: eyJhbGciOiJI...  (公開 key)
SUPABASE_SERVICE_KEY: eyJhbGciOiJI...  (私密!不要公開)
```

### 初始化資料庫

1. 到 Supabase Dashboard → SQL Editor
2. 貼上 `schemas/supabase_schema.sql` 的內容
3. 按 Run
4. 應該看到 "Success. No rows returned"

---

## 3. Zeabur(前端部署)

### 為什麼需要?
- 部署 Next.js 前端
- 台灣團隊,連線快
- $5/月(Developer Plan)

### 申請步驟

1. 前往 https://zeabur.com
2. 用 GitHub 登入
3. 綁定信用卡
4. 升級到 Developer($5/月)

### 部署(晚點做)

Claude Code 完成前端後:
1. Zeabur → New Project
2. 選 GitHub Repo
3. 選 `vincent-stock-system/frontend`
4. 自動部署

---

## 4. FinMind(台股資料)

### 為什麼需要?
- 台股最完整的免費 API
- 股價、法人、籌碼、財報

### 申請步驟

1. 前往 https://finmindtrade.com
2. 點 "註冊"
3. 填 Email、密碼
4. 驗證 Email
5. 登入後到 "用戶中心"
6. 複製 API Token

### 需要記下的

```
FINMIND_TOKEN: eyJhbGciOiJI...
```

### 方案建議

```
免費方案(入門夠用):
 ✅ 600 次/小時
 ✅ 基本股價、法人、籌碼
 ❌ 分點資料(要付費)

進階方案 NT$599/月:
 ✅ 4,000 次/小時
 ✅ 加上分點資料(隔日沖警示需要)
 
建議:先用免費,MVP 完成後再升級
```

---

## 5. FMP (Financial Modeling Prep) - 美股資料

### 為什麼需要?
- 美股股價、財報
- 指數、ADR、期貨

### 申請步驟

1. 前往 https://financialmodelingprep.com/developer
2. 點 "Get my API Key"
3. 註冊帳號
4. 驗證 Email
5. 登入後到 Dashboard 複製 API Key

### 需要記下的

```
FMP_API_KEY: xxxxx
```

### 方案建議

```
免費方案:
 ✅ 250 次/天
 ✅ 5 年歷史資料
 ✅ 基本美股資料
 
付費方案(如果不夠用):$14/月
 ✅ 300 次/分鐘
 ✅ 即時資料

建議:先用免費
```

---

## 6. NewsAPI(新聞)

### 為什麼需要?
- 抓國際財經新聞
- AI 分析用

### 申請步驟

1. 前往 https://newsapi.org
2. 點 "Get API Key"
3. 填 Email、密碼、使用情境
4. 選 "Personal"(免費)
5. 驗證 Email
6. Dashboard 複製 API Key

### 需要記下的

```
NEWS_API_KEY: xxxxx
```

### 方案建議

```
免費方案:
 ✅ 100 次/天
 ✅ 可搜尋全球新聞
 ❌ 只限開發環境(不能商用)

備援方案(免費):
 - Google News RSS
 - Yahoo Finance RSS
 - MoneyDJ RSS

建議:NewsAPI + RSS 備援
```

---

## 7. LINE Messaging API(推播)⭐ 最關鍵

### 為什麼需要?
- Vincent 要的「LINE 通知」功能核心

### 申請步驟(分 3 部分)

#### Part A:建立 LINE Developer 帳號

1. 前往 https://developers.line.biz/console
2. 用你的 LINE 帳號登入
3. 同意條款

#### Part B:建立 Provider

1. 點 "Create a new provider"
2. 名稱:`Vincent Stock System`
3. 建立

#### Part C:建立 Channel

1. 在 Provider 裡點 "Create a Messaging API channel"
2. 填寫:
   ```
   Channel name: Vincent 股票分析
   Channel description: 個人股票分析通知
   Category: Finance
   Subcategory: Other finance
   Email: 你的 email
   ```
3. 建立

#### Part D:取得 Access Token

1. 進入 Channel 設定
2. 到 "Messaging API" tab
3. 找 "Channel access token"
4. 點 "Issue" 產生

### 需要記下的

```
LINE_CHANNEL_ACCESS_TOKEN: xxxxxxxxxxxxxxx (很長)
LINE_CHANNEL_SECRET: xxxxx (較短)
```

#### Part E:取得你的 User ID(重要!)

這一步很容易卡住:

**方法 1:用 LINE Official Account Manager**

1. 前往 https://manager.line.biz
2. 登入 → 選剛建立的帳號
3. 設定 → 回應設定
4. 開啟 "Webhook"(先關閉 "自動回應訊息")

**方法 2:用這個小工具**

```python
# get_my_line_id.py

from flask import Flask, request
app = Flask(__name__)

@app.route("/webhook", methods=["POST"])
def webhook():
    data = request.json
    events = data.get("events", [])
    for event in events:
        user_id = event["source"]["userId"]
        print(f"你的 LINE User ID: {user_id}")
    return "OK"

app.run(port=5000)
```

執行後:
1. 用 ngrok 把本機 port 5000 暴露到公網
2. 到 LINE Channel 設定 Webhook URL
3. 用 LINE 加這個 Bot 為好友
4. 傳任何訊息
5. Terminal 會印出你的 User ID

**方法 3:最簡單(推薦)**

Claude Code 寫完系統後,會內建「取得 User ID」功能:
1. 加 Bot 為好友
2. 傳「我的ID」
3. Bot 會回你 User ID

### 需要記下的

```
LINE_USER_ID: Uxxxxxxxxxxxxxxxxx (以 U 開頭)
```

---

## 8. Anthropic Claude API(AI 大腦)

### 為什麼需要?
- 所有 AI 分析的核心
- 新聞分析、推論、推薦

### 申請步驟

1. 前往 https://console.anthropic.com
2. 用 Google 或 Email 註冊
3. 驗證手機
4. 充值(最少 $5)
5. Settings → API Keys → Create Key
6. 複製 Key(只顯示一次,馬上存!)

### 需要記下的

```
ANTHROPIC_API_KEY: sk-ant-api03-xxxxx
```

### 費用預估

```
Claude Sonnet 4.5 定價:
 - Input:$3 / 1M tokens
 - Output:$15 / 1M tokens

我們預估每月用量:
 - 早報:10 次 × 5K tokens = 50K
 - 當沖:10 次 × 10K tokens = 100K
 - 盤中:44 次/天 × 22 天 × 2K = 1.9M
 - 盤後:22 次 × 15K = 330K
 - 個股分析:按需
 
總計:約 3-5M tokens/月
成本:約 $10-20/月(NT$ 300-600)

如果擔心成本:
 - 簡單任務用 Claude Haiku 4.5(便宜 10 倍)
 - 複雜分析用 Sonnet
```

---

## 9. Gmail App Password(備援通知)

### 為什麼需要?
- LINE 壞了的備援管道
- 發送每日報告 Email

### 申請步驟

1. 前往 https://myaccount.google.com/security
2. 開啟「兩步驟驗證」(必要)
3. 搜尋 "App passwords"
4. 產生新的 App Password
5. 名稱:`Vincent Stock System`
6. 複製 16 字密碼

### 需要記下的

```
GMAIL_USER: your_email@gmail.com
GMAIL_APP_PASSWORD: xxxx xxxx xxxx xxxx
```

---

## 🔐 整合到 GitHub Secrets

全部申請完後,一次加到 GitHub:

### 步驟

1. 進入你的 GitHub Repo:`vincent-stock-system`
2. Settings → Secrets and variables → Actions
3. New repository secret
4. 依序加入:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
FINMIND_TOKEN=eyJhbGci...
FMP_API_KEY=xxxxx
NEWS_API_KEY=xxxxx
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
LINE_CHANNEL_ACCESS_TOKEN=xxxxx
LINE_USER_ID=Uxxxxx
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

### ⚠️ 安全提醒

- **不要**把 `.env` 檔 commit 到 GitHub
- **不要**把 API Key 貼在程式碼裡
- **不要**把 Key 傳給別人看
- 如果洩漏,立刻到各服務「重新產生」

---

## 🧪 測試全部 API 是否能用

建立後,用這個小腳本驗證:

```python
# scripts/test_all_apis.py

import os
import asyncio
import httpx

async def test_all():
    results = {}
    
    # 1. Supabase
    try:
        from supabase import create_client
        client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_KEY")
        )
        result = client.table("stocks").select("count").execute()
        results["supabase"] = "✅"
    except Exception as e:
        results["supabase"] = f"❌ {e}"
    
    # 2. FinMind
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://api.finmindtrade.com/api/v4/data",
                params={
                    "dataset": "TaiwanStockPrice",
                    "data_id": "2317",
                    "start_date": "2026-04-01",
                    "token": os.getenv("FINMIND_TOKEN")
                }
            )
            if r.status_code == 200 and "data" in r.json():
                results["finmind"] = "✅"
            else:
                results["finmind"] = f"❌ {r.status_code}"
    except Exception as e:
        results["finmind"] = f"❌ {e}"
    
    # 3. FMP
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"https://financialmodelingprep.com/api/v3/quote/AAPL",
                params={"apikey": os.getenv("FMP_API_KEY")}
            )
            results["fmp"] = "✅" if r.status_code == 200 else f"❌ {r.status_code}"
    except Exception as e:
        results["fmp"] = f"❌ {e}"
    
    # 4. NewsAPI
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                "https://newsapi.org/v2/top-headlines",
                params={
                    "country": "us",
                    "category": "business",
                    "apiKey": os.getenv("NEWS_API_KEY")
                }
            )
            results["newsapi"] = "✅" if r.status_code == 200 else f"❌ {r.status_code}"
    except Exception as e:
        results["newsapi"] = f"❌ {e}"
    
    # 5. Claude
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=10,
            messages=[{"role": "user", "content": "say hi"}]
        )
        results["claude"] = "✅"
    except Exception as e:
        results["claude"] = f"❌ {e}"
    
    # 6. LINE
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://api.line.me/v2/bot/message/push",
                headers={
                    "Authorization": f"Bearer {os.getenv('LINE_CHANNEL_ACCESS_TOKEN')}",
                    "Content-Type": "application/json"
                },
                json={
                    "to": os.getenv("LINE_USER_ID"),
                    "messages": [{
                        "type": "text",
                        "text": "✅ 系統測試 - 所有 API 已驗證"
                    }]
                }
            )
            results["line"] = "✅" if r.status_code == 200 else f"❌ {r.status_code}"
    except Exception as e:
        results["line"] = f"❌ {e}"
    
    print("\n🧪 API 測試結果:\n")
    for service, status in results.items():
        print(f"  {service}: {status}")
    
    print("\n全部 ✅ 代表可以開始開發了!")

if __name__ == "__main__":
    asyncio.run(test_all())
```

### 執行

```bash
# 1. 把所有 Key 放在 .env 檔
cp .env.example .env
# 編輯 .env 填入你的 Keys

# 2. 安裝依賴
pip install supabase httpx anthropic

# 3. 載入環境變數執行測試
python -m dotenv scripts/test_all_apis.py
```

**如果有任何 ❌,先解決後再繼續。**

---

## 💰 每月成本試算表

| 服務 | 費用 | 備註 |
|------|------|------|
| GitHub(Public Repo) | $0 | 免費無限 Actions |
| Supabase | $0 | 免費 500MB |
| Zeabur | $5 | Developer Plan |
| FinMind | $0-20 | 視需求升級 |
| FMP | $0 | 免費夠用 |
| NewsAPI | $0 | 免費 |
| LINE Messaging API | $0 | 前 500 則/月免費 |
| Claude API | $10-20 | 視用量 |
| Gmail | $0 | 免費 |
| 總計 MVP | **$15-25/月** | 約 NT$ 500-800 |
| 完整版 | **$50-80/月** | 約 NT$ 1,500-2,500 |

---

## 🎯 申請完後的下一步

```
✅ 所有 API 申請完成
✅ 資料庫 Schema 建好
✅ GitHub Secrets 設定好
✅ 測試腳本跑過

現在可以開始讓 Claude Code 開發了!

進入專案資料夾 → 執行 `claude`
  → 告訴 Claude Code:「請讀 CLAUDE.md 並開始 Phase 1」
```
