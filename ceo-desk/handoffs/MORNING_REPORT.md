# 🌅 早安報告 — TW Stock Watcher 一夜工事

**時間**: 2026-04-22 晚 → 2026-04-23 早
**執行者**: Claude (你睡覺時自動接手)
**Git commits 總數**: 10+ 次,全部 push 到 main 並自動 deploy 到 Zeabur
**主網址**: https://tw-stock-watcher.zeabur.app
**API 網址**: https://vsis-api.zeabur.app

---

## ✅ 全部完成清單

### P0 致命修復(你提到的 — 華邦電股價錯誤)
- **修掉了**。AI 現在聊天時會即時打 FinMind API 抓當下股價,禁用訓練資料的舊值
- 實測華邦電 2344 抓到收盤 **90.6**(非舊值 20 幾)
- 支援「華邦電/華邦/2344/華邦電子」任一寫法
- System prompt 加入當前 TPE 時間 + 即時資料鐵律

### P1 大盤 / 新聞 / 分點 API
- `/api/market/overview` 一次拿 TAIEX + 台指期 + 美股指數
- `/api/market/taiex` TAIEX 30 日走勢
- `/api/market/futures` 台指期(含期現價差)
- `/api/market/us` S&P500 / Nasdaq / Dow 30 / VIX(改用 Yahoo 免費)
- `/api/news/stock/{id}` + `/api/news/recent` 個股新聞
- `/api/brokers/{id}` + `/api/brokers/{id}/summary` 分點進出

### P1 通知通道
- LINE(已有) + **新增 Discord webhook** + **新增 Email SMTP**
- `/api/notify/status` 檢查各通道配置
- `/api/notify/test` 手動測試任一通道
- `/api/notify/broadcast` 一發三通道

### P2 Phase 6 回測 + 模擬交易(spec 20)
- `/api/backtest` 歷史回測 — 3 策略(ma_cross / rsi_reversion / buy_and_hold)
- 含手續費 0.1425% + 證交稅 0.3%
- 績效: 總報酬 / CAGR / 最大回撤 / 勝率 / 夏普 / 交易次數 / 資產曲線
- `/api/paper` 模擬交易帳戶 — 虛擬 100 萬
- 買賣 FIFO 平倉,自動記帳

### P3 UI 大改版 — 侘寂風 + 生動互動
- 全新色票: 和紙米 / 墨黑 / 線香 / 苔綠 / 赭紅(台股漲紅) / 松藍 / 金粟
- 字體: Noto Serif TC(標題襯線)+ Noto Sans TC(內文)+ JetBrains Mono(數字)
- 全局 CSS tokens: `.wabi-card` / `.wabi-btn` / `.wabi-pill` / `.wabi-num` / `.wabi-table`
- **LiveTicker** 頂部跑馬燈(60s 自動刷新 TAIEX + 台指期 + 美股)
- 入場動畫 `ink-bloom`、pulse dot、水墨分隔線、紙張背景紋理
- 移除喧嘩配色 emoji,改漢字印章「盤/談/驗/練/報/警」
- 信心度用漢字分級「熾/確/可/惑/疑」取代 emoji

### 新增頁面
- `/market` 大盤監測(TAIEX + 台指期 + 美股 + 30 日 sparkline + 跨市場解讀)
- `/chat` AI 夥伴(Claude Sonnet 4.5 SSE streaming + 自動抓即時股價)
- `/backtest` 互動回測(滑桿選年期 + Recharts 資產曲線 + 交易明細)
- `/paper` 模擬交易(下單 form + 持倉表 + 交易歷史 + 重設帳戶)
- 個股頁底部: **新聞區塊** + **5 日主力分點** + **AI 對話** with stock context

---

## 📌 需要你確認或處理的事

### 🚨 需要購買 / 升級的服務(按急迫度)

| 服務 | 問題 | 方案 | 費用 |
|---|---|---|---|
| **FinMind** | 免費版不支援「新聞 API」+「分點進出」(都 HTTP 400) | 升級付費版或繼續 graceful 空資料 | NT$390/月 |
| **FMP** | 免費版 QQQ/DIA 要 Premium | 已改用 Yahoo Finance(免費),不用升級 | — |
| **Anthropic** | 目前跑 Sonnet 4.5,成本保護有日上限 $5 | 看 usage 決定是否加額度 | 按 token 計 |
| **LINE Messaging API** | 你昨晚以為額度滿 → **其實是 backend 沒設 env!** | 見下方 | 免費 500 則/月 |

### 🔧 LINE 推播還沒能用(需你給 1 樣東西)

**現況**: `/api/notify/status` 回報 backend `token_set=false` — 後端 env **完全沒設 LINE**。

**你要做的**:
1. Zeabur backend service(`tw-stock-watcher-ing`)環境變數補:
   - `LINE_CHANNEL_ACCESS_TOKEN`(從前端 service 複製過去即可)
   - `LINE_USER_ID`(**這個我沒有 — 你要加你的 LINE 官方帳號為好友後,從 LINE webhook 或 Messaging API 開發者平台取得你的 User ID**)
2. 補完後測: `POST /api/notify/test` body `{"channels":["line"],"subject":"test","message":"hi"}`

### 📧 Email + Discord 推播(想用的話)

**Email**: 設三個 env:
- `SMTP_USER=你的gmail`、`SMTP_PASS=應用程式密碼`、`EMAIL_TO=你的收件`
- Gmail 要開兩步驟 + 產生應用程式密碼(不是用登入密碼)

**Discord**: 設一個 env:
- `DISCORD_WEBHOOK_URL=你的頻道 webhook URL`
- 建立: Discord 頻道設定 → 整合 → Webhook → 新增 → 複製 URL

### 📊 Supabase 資料(可有可無,不影響使用)

目前 DB 裡 `watchlist`、`reports`、`alerts` 表都空。幾個 workflow 還沒跑過實際排程(等 GitHub Actions cron 啟動後會慢慢填)。

---

## 🎨 UI 變更摘要(你關心的)

| 以前 | 現在 |
|---|---|
| 亮藍紫 slate、emerald、rose tailwind 色 | 米白紙張 + 墨線 + 赭紅 + 苔綠(侘寂風) |
| 無襯線 | Noto Serif TC 襯線標題 |
| 靜態卡片 | hover 浮起微陰影 + 入場 ink-bloom 動畫 |
| 頂部無動態 | LiveTicker 跑馬燈(TAIEX 台指期 美股 1 分鐘刷新) |
| Dashboard 表格純文字 | 漢字印章 + 漢字信心度(熾/確/可/惑/疑)|
| 回測頁無 | 完整互動回測 + Recharts 雙軸曲線(資產 vs 股價)|
| 模擬交易頁無 | 帳戶總覽 + 下單 form + FIFO 持倉 |

---

## 🧪 你可以馬上玩的

```
主頁           https://tw-stock-watcher.zeabur.app/
大盤           https://tw-stock-watcher.zeabur.app/market
台積電         https://tw-stock-watcher.zeabur.app/stocks/2330
華邦電(驗證)    https://tw-stock-watcher.zeabur.app/stocks/2344
AI 夥伴        https://tw-stock-watcher.zeabur.app/chat
回測           https://tw-stock-watcher.zeabur.app/backtest
模擬交易       https://tw-stock-watcher.zeabur.app/paper
API 文件       https://vsis-api.zeabur.app/docs
```

---

## 🗺 還沒做的(下次)

- **Phase 7 進階**: 資金流向、異常偵測、供應鏈圖譜、飆股雷達、X VIP 追蹤、事件日曆
- **spec 21 身份驗證**: LINE Login / OAuth → Supabase Auth 綁定
- **spec 16 事件日曆**: 法說會 / 財報 / 除權息 / FOMC 自動同步
- **GitHub Actions 排程接線**:5 個 workflow 的 cron-job.org 外部觸發器還沒對接(用 GitHub Actions 原生 cron 有 2-15 分鐘延遲,不符 spec 10 鐵律)
- **LINE/Discord 整合到 alerts workflow**: 服務跟 API 都有了,但還沒把「盤中警示觸發 → 自動推播」那條線串起來(等你給 LINE_USER_ID)

---

**一夜總結**: 幫你從「Phase 5 剛做完」推進到「Phase 1-6 全做完、UI 大改版、所有 API live、華邦電致命 bug 修掉」。花費約 3 小時 Claude 時間,你一覺起來看到的網站應該完全不同了 🫡

---

## 🧪 睡前驗收通過(2026-04-22 23:31 TPE)

### ✅ 華邦電致命 bug 修復實測
問 AI: 「現在華邦電價位大概多少?給我當下的,不要訓練資料的舊值」

AI 回:
> ## 華邦電 (2344) 即時狀態
> **最新交易日**: 2026-04-22 (今天)
> **收盤價**: **90.6 元**
> **漲跌**: -0.5 元 (-0.55%)
> **成交量**: 9,469 萬股
>
> ### 快速判斷
> - **位置**: 在 5 日均價 88.96 **上方** (+1.8%)
> - **法人動向**(今日):
>   - 外資:賣超 331 萬股 ❌
>   - 投信:賣超 83 萬股 ❌
>   - 自營商:小買 30 萬股
>
> **你問價位是想做什麼?**
> - 想進場?先說你的理由
> - 想加碼?告訴我你現在成本
> - 純好奇?那現在你知道了 😏

→ **不再用訓練資料** + **給當下即時數字** + **法人買賣超** + **AI 主動質疑你的意圖**(spec 19 鐵律生效)

### ✅ 模擬交易實測
下單買 2344 1 張 → 成交價 90.6,扣除手續費後剩餘現金 909,271。持倉正確記錄。

### ✅ 全面 API 驗收
所有 10+ endpoint HTTP 200:
- `/health` / `/api/chat/health` / `/api/market/overview`
- `/api/analyze/{stock}` / `/api/news/stock/{id}` / `/api/news/recent`
- `/api/brokers/{id}` / `/api/brokers/{id}/summary`
- `/api/backtest/strategies` / `/api/paper/account`
- `/api/reports/latest` / `/api/watchlist` / `/api/alerts/recent`

### 🩺 自動健康檢查
Monitor session 已啟動,每 30 分鐘自動檢查:
- backend health + Supabase 連線
- 所有主要 API endpoint
- 所有前端頁面載入
- 華邦電股價合理性(避免資料源突然跑偏)

有問題直接問我。
