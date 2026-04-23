# 🚀 VSIS v2 升級指令書（給 Claude Code）

> **重要前提**：你（Claude Code）**已經完成了 API 接通的前半段**，這份文件不是要你打掉重做，而是**增強與擴展**。
>
> **核心原則**：
> - 🟢 **保留**所有現有 API 邏輯
> - 🎨 **替換**UI 外觀（用新的禪風原型）
> - 🧠 **新增**判斷 / 學習 / 自動化能力
> - 💡 **新增**股價亮燈提示

**版本**：v2.0
**日期**：2026-04-23
**配對檔案**：`18_ZEN_HOMEPAGE_v3.html`（視覺範本）

---

## 📋 你已經完成的（保留！不要動）

根據你最新的進度回報，這些**已經接好的 API** 必須**原封不動保留**：

| 區塊 | 現有 API | 狀態 |
|------|---------|------|
| 市場脈動 | `/api/market/overview` 30 秒輪詢 | ✅ 保留 |
| 題材熱度 Top 5 | `/api/topics` 即時熱度 | ✅ 保留 |
| 呱呱今日功課 | 依題材熱度 + TAIEX 動態生成 | ✅ 保留 |
| 供應鏈金字塔 | 自動抓最熱題材的供應鏈 | ✅ 保留 |
| 呱呱這週挑的 | 6 檔推薦 + 信心度 | ✅ 保留 |
| 今日重點 | Claude AI 分類利多/中立/利空 | ✅ 保留 |

**下一批接通中**（繼續做）：
- 🌏 昨夜美股 (US_EVENTS)
- 💎 焦點股 (FOCUS)
- 💰 三大法人 (FinMind Sponsor API)
- 🗺️ 產業熱力圖 (從 sectors)
- 🔄 資金輪動 (產業漲跌 TOP 5)

---

## 🎯 這次升級要做的事（三大類）

### 🎨 類別 A：UI 全面替換（優先）
把現有 Dashboard 的外觀換成禪風版，但**保留所有資料來源**。

### 🧠 類別 B：智慧升級
加入自動學習、社群監測、主動判斷的能力。

### 💡 類別 C：即時體驗增強
加入像專業看盤軟體一樣的「亮燈提示」與「自動搜尋」。

---

# 🎨 類別 A：UI 全面替換

## A1. 替換原則

**重要**：這是 **UI 替換**，不是從零重做：

```
[舊]                           [新]
─────────────                  ─────────────
深色 Bootstrap 風   →           禪風和紙色系
文字列表            →           視覺化卡片
硬編碼區塊名        →           編號 I. II. III.
無動畫              →           微互動 + fade-in
英文 Inter          →           Shippori Mincho + Zen Maru Gothic
```

## A2. 執行步驟

### Step 1：保留 `/api/*` 所有路由
完全**不要**改後端 API。Claude Code 只改前端。

### Step 2：更換全站 CSS 變數
參考 `18_ZEN_HOMEPAGE_v3.html` 的 `:root` 區塊，把所有顏色、字體、間距變數複製過去。

```css
/* 關鍵變數（全部複製到 globals.css） */
--washi: #F5EFE0;        /* 和紙米 */
--sumi: #2C2416;         /* 墨色 */
--kin: #B8893D;          /* 金茶 */
--shu: #B85450;          /* 朱紅 */
--rise: #C95B4C;         /* 漲 */
--fall: #6B8B5A;         /* 跌 */
```

### Step 3：導航文字改直觀（重要！）

```
舊：盤大盤 | 2330台積電 | 談AI夥伴 | 驗回測 | 練模擬 | 報報告 | 警警示

新：今日重點 | 題材熱度 | 自選股 | 產業地圖 | AI 對話 | 更多 ⋯
         ↓         ↓         ↓         ↓         ↓
         /         /topics   /watchlist  /sectors  /chat
```

「更多」點開：回測、模擬、警示、報告、設定

### Step 4：元件逐一對應

| 新元件（禪風原型內）| 對應現有 API | 注意 |
|---|---|---|
| `.hero` 區（呱呱圓圈 + 引言）| `/api/quack/briefing` 或現有「呱呱今日功課」 | 文案來自 API |
| `.market-row` 四欄 | `/api/market/overview` | **完全保留** |
| `.topic-layout` 左側題材卡 | `/api/topics` | **完全保留** |
| `.topic-layout` 右側美股連動 | `/api/us-events`（下一批）| 接 US_EVENTS |
| `.topic-layout` 右側焦點股 | `/api/focus`（下一批）| 接 FOCUS |
| `.pyramid-section` **含切換器** | `/api/supply-chain?topic=xxx` | ⚠️ **需要新增切換參數** |
| `.flow-grid` 三大法人 | `/api/institutional`（下一批）| 接 FinMind Sponsor |
| `.heatmap` 產業熱力圖 | `/api/sectors/heatmap`（下一批）| 接 sectors |
| `.rotation-panel` 資金輪動 | `/api/sectors/rotation`（下一批）| 接 sectors |
| `.pick-section` 呱呱推薦 | `/api/picks` 或現有「呱呱這週挑的」 | **完全保留** |
| `.floating-quack` 浮動按鈕 | 連到 `/chat` | 新增 |

### Step 5：刪除的元素

- ❌ 舊的「我的筆記」空狀態卡（整塊移除）
- ❌ 舊的「最新盤後 —— 尚無 ——」空狀態
- ❌ 舊的「近日警示 —— 近 3 日無警示 ——」
- ❌ 硬寫死的「2330台積電」導航

**空狀態原則**：有數據才顯示，沒數據就整塊隱藏（不要放「——」）。

---

# 🧠 類別 B：智慧升級（三大能力）

## B1. 判斷力升級：讓呱呱會「思考」，不只是「整理」

### 需求說明

現在的呱呱晨報是**「資訊整理」**（把數據湊起來）。
升級後要做到**「邏輯推論」**（告訴使用者 what it means）。

### 具體實作

**新增後端服務**：`/api/quack/reasoning`

**輸入**：今日所有資料（題材熱度、美股、法人、技術面）
**處理**：送到 Claude Sonnet 4.5 做三層推論
**輸出**：結構化的判斷結果

### System Prompt（放進 Claude API 呼叫）

```
你是「呱呱」，一隻不給明牌、只教思考的台股分析師。

請依照今日資料做三層推論：

【第一層：事實層】
- 今天市場發生了什麼？（≤ 3 句）
- 不解釋、不判斷，只陳述

【第二層：因果層】
- 為什麼會這樣？背後的連鎖反應？
- 引用具體事件（誰說了什麼、哪個報告、哪個數據）
- 格式：「因為 A → 所以 B → 影響 C」

【第三層：含義層】
- 這對 Vincent 的操作意味著什麼？
- 具體建議：等 / 買 / 避開 / 減碼
- 給出「為什麼」不只是「做什麼」

風格要求：
- 用「池塘、水位、甩轎、洗浮額」等意象
- 不要預言股價
- 每層 ≤ 100 字
- 最後一定要有「反方觀點」（如果我錯了，會是哪裡錯？）
```

### 前端顯示

呱呱今日功課卡**改成三層可摺疊**：

```
🦆 呱呱今日功課
─────────────────
[▼ 今天發生了什麼]       ← 點開看第一層
[▼ 為什麼會這樣]         ← 點開看第二層
[▼ 對你的操作意味著什麼]   ← 點開看第三層
[▼ 反方觀點]             ← 呱呱的自我質疑
```

---

## B2. 學習能力：讓呱呱記住判斷對錯

### 需求說明

呱呱每次給建議都是「一次性」的，沒有記住自己講對什麼、講錯什麼。

### 具體實作

**新增資料表**：`quack_predictions`

```sql
CREATE TABLE quack_predictions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  prediction_type VARCHAR(50),    -- 'topic_heat' / 'stock_pick' / 'sector_rotation'
  subject VARCHAR(100),            -- 題材名或股票代號
  prediction TEXT,                 -- 呱呱預測了什麼
  confidence INT,                  -- 信心度 0-100
  timeframe VARCHAR(20),           -- '1d' / '1w' / '1m'
  actual_result TEXT,              -- 實際結果（事後填）
  hit_or_miss VARCHAR(10),         -- 'hit' / 'miss' / 'partial'
  reasoning_error TEXT,            -- 如果錯，錯在哪
  created_at TIMESTAMP DEFAULT NOW(),
  evaluated_at TIMESTAMP
);
```

### 排程任務

**每日 15:00**（收盤後）：
1. 撈 `quack_predictions` 裡 `evaluated_at IS NULL` 且到期的預測
2. 對比實際收盤價/熱度/輪動
3. 填入 `actual_result`、`hit_or_miss`
4. **如果 miss**，送進 Claude 分析錯在哪：

```
你昨天預測：{prediction}
實際結果：{actual}
請用 1-2 句分析為什麼預測錯了？是資料不足？推論錯誤？
還是市場不理性？
```

### 前端顯示

新增頁面 `/quack-journal`（呱呱日記）：
- 過去 30 天的命中率
- 哪類題材呱呱最準
- 哪類最常錯
- 每次錯誤的原因總結

**呱呱晨報要顯示**：
```
🦆 今日呱呱狀態
過去 7 天命中率：68%
最準題材：CCL 漲價（5/5 中）
最常錯：短線個股選時
```

---

## B3. 社群敏感度：自動監測台股社群熱議

### 需求說明

現在 VSIS 只看**新聞媒體**和**法人報告**，沒看**散戶在聊什麼**。
但散戶情緒常常是**短線動能的先行指標**。

### 資料源（Claude Code 要接的）

#### 🟢 免費可爬
1. **PTT Stock 板** — `https://www.ptt.cc/bbs/Stock/index.html`
   - 抓標題、推文數、噓文數、熱度
   - 關鍵字頻率分析
2. **Dcard 投資版** — `https://www.dcard.tw/f/stock`
3. **CMoney 股市爆料同學會** — 各股論壇
4. **Mobile01 投資版**
5. **X/Twitter**（用關鍵字搜 `#台股 $2330` 等）

#### 🟡 付費但 ROI 高
- **API 服務**：考慮接 RapidAPI 的社群監測服務

### 實作架構

**新增服務**：`/scripts/cron/social_monitor.py`

```python
# 每 15 分鐘跑一次
async def monitor_social():
    # 1. 撈 PTT Stock 首頁 50 篇
    ptt_posts = fetch_ptt_stock()

    # 2. 提取股票代號與題材關鍵字
    for post in ptt_posts:
        stocks = extract_stock_codes(post.title + post.content)
        topics = extract_topic_keywords(post)

        # 3. 寫入熱度計算
        for stock in stocks:
            db.increment_social_mention(stock, post.push_count)

    # 4. 算「社群熱度」分數
    # 公式：提及數 * 1 + 推文 * 2 - 噓文 * 1.5 + 回文 * 0.5

    # 5. 異常警報
    if any_stock_mentions > baseline * 5:
        trigger_alert(f"{stock} 社群討論度異常暴增")
```

**新增資料表**：

```sql
CREATE TABLE social_mentions (
  id SERIAL PRIMARY KEY,
  stock_code VARCHAR(10),
  source VARCHAR(20),              -- 'ptt' / 'dcard' / 'cmoney' / 'twitter'
  post_url TEXT,
  mention_count INT DEFAULT 1,
  push_count INT DEFAULT 0,
  boo_count INT DEFAULT 0,
  sentiment VARCHAR(20),           -- 'bullish' / 'bearish' / 'neutral'
  hot_keywords JSONB,
  captured_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_social_stock_time ON social_mentions(stock_code, captured_at DESC);
```

### 前端顯示

**呱呱晨報新增**：
```
🔥 社群熱度雷達（過去 6 小時）
─────────────────────────
1. 富喬 1815   提及 +320% 🚨
2. 旺宏 2337   提及 +180%
3. 創意 3443   提及 +150%（但噓文多，情緒偏空）
```

**題材卡新增**：
```
🔥 CCL 漲價       85°
[新增] 💬 PTT 熱議：47 篇（+250%）
[新增] 情緒：偏多 76%
```

---

# 💡 類別 C：即時體驗增強

## C1. 自動化搜尋（不用使用者叫才做）

### 需求說明

現在 Claude AI 對話是「**使用者問、我才查**」。
升級後要**主動**：每當有重大事件，自動去網路搜尋並推送。

### 觸發條件（Claude Code 要設這些）

| 觸發條件 | 動作 |
|---|---|
| 外資單日買/賣超 > 200 億 | 自動搜尋原因，產生警示 |
| 單一個股漲跌 > 7% | 自動搜尋新聞 + 法人動態 |
| 題材熱度 1 小時內變化 > 15° | 自動搜尋催化劑 |
| 美股科技巨頭盤後漲跌 > 3% | 自動搜尋財報/事件，推估台股影響 |
| 重要人物發言（Musk, Jensen, Powell, 彭博）| 自動抓取 + 分析 |
| PTT Stock 某股討論度突破歷史 | 自動搜尋發生什麼事 |

### 實作架構

**新增服務**：`/scripts/cron/auto_search.py`

```python
# 每 5 分鐘檢查觸發條件
async def auto_search_loop():
    triggers = check_all_triggers()

    for trigger in triggers:
        # 1. 用 Claude + Web Search 工具搜尋
        search_result = await claude_with_web_search(
            query=f"{trigger.keyword} 台股影響 {today}",
            trigger_type=trigger.type
        )

        # 2. 讓 Claude 做三層分析
        analysis = await claude_analyze(search_result)

        # 3. 寫入通知
        db.insert_auto_alert({
            'trigger': trigger,
            'analysis': analysis,
            'affected_stocks': analysis.stocks,
        })

        # 4. 推送給前端（WebSocket 或 SSE）
        push_to_frontend(analysis)
```

### 前端顯示

**浮動呱呱旁邊**加個小鈴鐺：
```
                          🔔 3 ← 新的自動警示
    🦆 ← 點擊展開對話
```

點鈴鐺看到：
```
🔔 呱呱幫你發現了：

14:05  外資突然賣超 250 億
       原因：昨夜 Tesla 財報利空
       影響：[創意] [世芯] 可能續弱
       [查看完整分析]

13:30  PTT 熱議：富喬
       討論度 6 小時 +450%
       情緒：偏多 82%
       [查看討論串]

11:20  Musk 推特：「自駕產能要翻倍」
       台股影響：[台達電] [光寶科]
       [查看完整分析]
```

---

## C2. 股價亮燈提示（像專業看盤軟體）

### 需求說明

像富邦 e01、元大 AI 贏家那種，股價跳動時會有視覺提示。

### 三種亮燈

#### 🟢 類別 1：股價變動亮燈

每當有自選股 / 焦點股 / 推薦股價格變動：

- **上漲**：紅色閃一下 + 向上箭頭 ▲
- **下跌**：綠色閃一下 + 向下箭頭 ▼
- **漲停**：紅色邊框持續閃爍 + 🔥 圖示
- **跌停**：綠色邊框持續閃爍 + ⚠️ 圖示
- **爆量**（成交量 > 5 日均量 2 倍）：金色光環 + 💰 圖示

### CSS 實作範例

```css
/* 亮燈動畫 */
@keyframes flash-rise {
  0% { background: rgba(201, 91, 76, 0.3); }
  100% { background: transparent; }
}

@keyframes flash-fall {
  0% { background: rgba(107, 139, 90, 0.3); }
  100% { background: transparent; }
}

.stock-price {
  transition: all 0.3s ease;
}

.stock-price.flash-up {
  animation: flash-rise 0.8s ease-out;
  color: var(--rise);
}

.stock-price.flash-down {
  animation: flash-fall 0.8s ease-out;
  color: var(--fall);
}

/* 漲停 */
.stock-card.limit-up {
  border: 2px solid var(--rise);
  animation: pulse-limit-up 1.5s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(201, 91, 76, 0.4);
}

@keyframes pulse-limit-up {
  0%, 100% { box-shadow: 0 0 20px rgba(201, 91, 76, 0.4); }
  50% { box-shadow: 0 0 40px rgba(201, 91, 76, 0.8); }
}

/* 爆量 */
.stock-card.volume-burst {
  border: 2px solid var(--kin);
  background: linear-gradient(135deg, var(--washi), rgba(184, 137, 61, 0.1));
}

.stock-card.volume-burst::before {
  content: '💰';
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 20px;
  animation: bounce 1s ease-in-out infinite;
}
```

### 前端 React 實作（指導 Claude Code 怎麼寫）

```tsx
// hooks/useStockPriceFlash.ts
export function useStockPriceFlash(ticker: string) {
  const [currentPrice, setCurrentPrice] = useState(0);
  const [flashClass, setFlashClass] = useState('');

  useEffect(() => {
    const ws = new WebSocket(`wss://api.../stock/${ticker}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const newPrice = data.price;

      if (newPrice > currentPrice) {
        setFlashClass('flash-up');
      } else if (newPrice < currentPrice) {
        setFlashClass('flash-down');
      }

      setCurrentPrice(newPrice);

      // 0.8 秒後移除閃爍
      setTimeout(() => setFlashClass(''), 800);
    };

    return () => ws.close();
  }, [ticker]);

  return { price: currentPrice, flashClass };
}
```

#### 🔔 類別 2：事件警報亮燈

右下角浮動呱呱按鈕**持續發光變色**表示有新事件：

- 🔴 **緊急**（紅光閃爍）：跌停、大跌破支撐、外資賣超暴增
- 🟡 **重要**（金光脈動）：漲停、題材新高、法人異常
- 🔵 **資訊**（藍光緩慢）：呱呱新推薦、晨報更新

#### 📊 類別 3：題材熱度變化亮燈

題材卡熱度條：

- **熱度 +5° 以上**（1 小時內）：熱度條**閃爍紅光**
- **熱度 -5° 以上**：熱度條**變灰**
- **熱度 > 90°**：熱度條旁**跳動火焰** 🔥

### WebSocket 架構（建議）

```
後端：
┌────────────────────┐
│ Cron 排程（每 30s） │
│ 檢查所有股價變動   │
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│ Redis Pub/Sub      │
│ channel: stock_*   │
└──────────┬─────────┘
           │
           ▼
┌────────────────────┐
│ WebSocket Server   │
│ 推送給所有連線前端  │
└──────────┬─────────┘
           │
           ▼
前端（所有使用者）
```

---

# 📋 Claude Code 執行順序

### 🏃 Phase 1（本週）— UI 替換（最優先）

**Day 1-2：視覺替換**
- [ ] 複製 `18_ZEN_HOMEPAGE_v3.html` 的 CSS 變數到 `globals.css`
- [ ] 引入三款字體：Shippori Mincho, Zen Maru Gothic, Cormorant Garamond
- [ ] 全站配色從深色換成和紙米色

**Day 3：導航 + Hero 區**
- [ ] 導航文字改直觀（今日重點、題材熱度、自選股、產業地圖、AI 對話）
- [ ] 首頁加入呱呱 Hero 圓圈 + 引言
- [ ] 浮動呱呱按鈕加入

**Day 4-5：各區塊替換**
- [ ] 市場脈動（接現有 `/api/market/overview`）
- [ ] 題材熱度卡（接現有 `/api/topics`）
- [ ] 供應鏈金字塔 **加切換器**（5 個題材）
- [ ] 呱呱推薦三張卡（接現有「呱呱這週挑的」API）
- [ ] 刪掉舊的「我的筆記」空狀態

**Day 6-7：Hero 動畫 + 微互動**
- [ ] 花瓣飄落
- [ ] 呱呱漣漪
- [ ] 熱度條填充動畫
- [ ] fade-in-up 入場

### 🧠 Phase 2（下週）— 智慧升級

**Day 8-10：判斷力**
- [ ] 新增 `/api/quack/reasoning` 三層推論
- [ ] 呱呱晨報改三層可摺疊
- [ ] 加入「反方觀點」區

**Day 11-12：學習力**
- [ ] 建 `quack_predictions` 資料表
- [ ] 每日 15:00 命中率排程
- [ ] 建 `/quack-journal` 頁面

**Day 13-14：社群敏感度**
- [ ] PTT Stock 爬蟲
- [ ] Dcard / CMoney 爬蟲
- [ ] `social_mentions` 資料表
- [ ] 呱呱晨報新增「社群熱度雷達」

### 💡 Phase 3（第三週）— 即時體驗

**Day 15-17：自動搜尋**
- [ ] 觸發條件監測
- [ ] Claude + Web Search 自動執行
- [ ] 警示 WebSocket 推送
- [ ] 浮動小鈴鐺 UI

**Day 18-21：亮燈提示**
- [ ] WebSocket 股價推送
- [ ] `useStockPriceFlash` hook
- [ ] 漲跌停邊框動畫
- [ ] 爆量金光效果
- [ ] 熱度變化閃爍

---

# ⚠️ 給 Claude Code 的關鍵守則

### ❌ 絕對不要做的事

1. **不要動後端 API 邏輯**
   - 已經接好的 6 個 API 路由全部保留
   - 資料庫 Schema 不要改（只新增，不修改）

2. **不要自己設計 UI**
   - 照 `18_ZEN_HOMEPAGE_v3.html` 做
   - 配色、字體、間距不能改

3. **不要等使用者指示才自動化**
   - 社群監測、自動搜尋都是**背景排程跑**
   - 使用者打開系統就看到結果，不用手動觸發

4. **不要刪掉現有功能**
   - 回測、模擬交易等先收進「更多」選單
   - 不要因為新功能上線就砍舊的

5. **不要一次全改**
   - 每個 Phase 完成一部分就部署
   - 讓 Vincent 可以逐步驗收

### ✅ 每個 Phase 完成後要做

1. **部署到測試環境**
2. **截圖給 Vincent 確認**
3. **有問題馬上改**
4. **確認 OK 才進下一個 Phase**

---

# 🎯 驗收標準

用 6 個測試（參考 `14_HUMAN_FEEL_CHECKLIST.md`）：

| 測試 | 標準 |
|---|---|
| 10 秒測試 | 打開首頁 10 秒內看懂今天市場 |
| 3 擊測試 | 任何功能 3 次點擊內到達 |
| 單手測試 | 手機單手能用 90% 功能 |
| 5 分鐘測試 | 連續看 5 分鐘眼睛不累 |
| 呱呱測試 | 3 個以上地方感受到呱呱 |
| 智慧測試 | 能自動告訴我「為什麼」不只是「什麼」|

---

# 🦆 給 Vincent 的一句話

這次升級的核心邏輯：

> **「呱呱不只是看盤，是幫我看盤的朋友。
> 他會主動發現、會自己學習、會在關鍵時刻拍我肩膀。」**

Claude Code 的工作就是把這個感覺做出來。

---

**文件版本**：v2.0
**建立日期**：2026-04-23
**配對檔案**：
- `18_ZEN_HOMEPAGE_v3.html`（視覺範本）
- `14_HUMAN_FEEL_CHECKLIST.md`（驗收標準）
- `AI_ANALYST_PROMPT.md`（AI Prompt）
