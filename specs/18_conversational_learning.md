# 💬 對話式 AI + 持續學習系統規格書

> Vincent 原話:
> 「我希望他提供個股分析,他不只是一個機器人提供,
>  甚至用戶進行可以跟 AI 討論,讓 AI 去做學習分析越來越準確」

---

# 🎯 這份規格的定位

**這是系統的「靈魂」,不是「功能」。**

在這份規格之前,系統是:
```
資料 → 規則 → 推薦 → 給 Vincent 看
```

在這份規格之後,系統是:
```
資料 → 規則 → 推薦 ⇄ Vincent ⇄ AI 討論
                      ↓
                  學習 + 進化
                      ↓
              下次更懂 Vincent
```

---

# 🏗 三層架構

## Layer 1:**對話介面**(Vincent 能跟 AI 聊)

## Layer 2:**上下文記憶**(AI 記得你們的歷史)

## Layer 3:**學習與進化**(系統從討論中變聰明)

---

# 💬 Layer 1:對話介面設計

## 🎯 三種對話情境

### 情境 A:**個股分析對話**(最主要)

```
使用時機:Vincent 打開某檔股票頁
能做什麼:
 - 質疑系統給的結論
 - 追問理由
 - 補充自己知道的資訊
 - 讓 AI 考量新因素重新分析
```

**UI 位置:** 個股頁底部,或側邊 drawer

### 情境 B:**盤中即時對話**

```
使用時機:Vincent 收到警報
能做什麼:
 - 「這個警報為什麼觸發?」
 - 「我該現在賣嗎?」
 - 「等等,我有不同看法」
```

**UI 位置:** 警報卡片點開後的 detail 頁

### 情境 C:**教學模式對話**

```
使用時機:Vincent 主動想學習
能做什麼:
 - 「為什麼你會這樣判斷?」
 - 「教我看這個指標」
 - 「這個情境你為什麼覺得是反指標?」
```

**UI 位置:** 獨立頁面「學習模式」

---

## 📱 UI 設計:個股頁對話

```
┌─────────────────────────────────────┐
│  🔍 鴻海 2317    213  🟢 +2.40%     │
├─────────────────────────────────────┤
│                                     │
│  [前面省略 - 完整分析]                │
│                                     │
├─ 💬 跟 AI 討論 ────────────────────┤
│                                     │
│  🤖 我對鴻海目前的判斷是「關注」,    │
│     信心 75%。你對哪部分想討論?      │
│                                     │
│  💡 建議問題:                        │
│  ┌────────────────────────────┐    │
│  │ 為什麼是關注不是買進?        │    │
│  ├────────────────────────────┤    │
│  │ 我覺得 75% 太高,理由是...  │    │
│  ├────────────────────────────┤    │
│  │ PTT 熱度這個因素你考慮了嗎? │    │
│  ├────────────────────────────┤    │
│  │ 如果我持有 10 張現在該怎做? │    │
│  └────────────────────────────┘    │
│                                     │
│  ┌────────────────────────────┐    │
│  │ 或輸入你的想法...            │    │
│  │                              │    │
│  └────────────────────────────┘    │
│                 [送出]               │
│                                     │
└─────────────────────────────────────┘
```

### 對話展開後

```
┌─────────────────────────────────────┐
│ 💬 鴻海 2317 討論                    │
├─────────────────────────────────────┤
│                                     │
│ 🤖 我對鴻海目前的判斷是「關注」,    │
│    信心 75%。你對哪部分想討論?      │
│    14:23 TPE                         │
│                                     │
│ 👤 我覺得信心 75% 太高               │
│    PTT 最近超多人在推                │
│    這不是反指標嗎?                  │
│    14:24 TPE                         │
│                                     │
│ 🤖 你觀察很準。我剛才回頭看了資料:    │
│                                     │
│    PTT 過去 7 天提及鴻海 +280%       │
│    確實是近半年新高                   │
│                                     │
│    歷史統計(我的資料庫):            │
│    PTT 熱度 > +200% 的股票           │
│     → 次週勝率:55%(偏低)          │
│     → 次月勝率:42%                  │
│                                     │
│    你的觀察改變我的判斷:              │
│    • 原信心:75%                     │
│    • 加入 PTT 熱度修正:-13%         │
│    • 新信心:62% ⬇️                 │
│                                     │
│    要不要我把「PTT 熱度」正式加入    │
│    評分因子?                        │
│    [加入] [不用] [只這次]            │
│    14:25 TPE                         │
│                                     │
│ 👤 加入,但權重不要太高               │
│    我看過過熱後繼續漲的               │
│    14:26 TPE                         │
│                                     │
│ 🤖 明白。已記錄你的偏好:              │
│                                     │
│    ✅ 新增因子:PTT 散戶熱度         │
│    ✅ 權重:5%(輔助性,不是主要)    │
│    ✅ 套用範圍:所有台股              │
│                                     │
│    下次類似情境,我會主動提這觀察。  │
│                                     │
│    Vincent 你這個判斷很成熟,        │
│    「反指標作為輔助不是主要」        │
│    —— 這正是分析師的思考方式。        │
│    14:27 TPE                         │
│                                     │
├─────────────────────────────────────┤
│ [輸入訊息...]           [送出]       │
└─────────────────────────────────────┘
```

---

## 🎯 UI 設計關鍵原則

### 1. **建議問題(Suggested Questions)**

每次 AI 回應後,都提供 3-4 個建議問題:
- 降低「不知道該問什麼」的障礙
- 引導 Vincent 問出有價值的問題
- 根據當前情境動態生成

### 2. **AI 回應有「結構」**

不是長篇大論,而是:
```
觀察確認 → 資料佐證 → 判斷調整 → 下一步提議
```

### 3. **AI 主動問回來**

```
👤 你覺得鴻海會漲嗎?

🤖 這問題不好直接答。讓我問你幾個問題:
   1. 你的持有時間預期多長?
   2. 你能接受最大虧損幾 %?
   3. 你看的是短線還是波段?
   
   根據答案我才能給你有意義的判斷。
```

### 4. **對話永遠結束於「可行動」**

每段對話結束時,AI 要明確說:
- 「所以我現在的建議是 XXX」
- 或「你想我幫你設警報嗎?」
- 或「我已經記錄你的偏好,下次會應用」

---

# 🧠 Layer 2:上下文記憶系統

## 🎯 核心概念

**AI 必須記得:**
1. **長期記憶**:Vincent 是誰、他的偏好、他的歷史判斷
2. **中期記憶**:最近 30 天的重要討論
3. **短期記憶**:當前對話的前後文

## 📊 記憶的結構

### 1. **使用者畫像(靜態,慢慢累積)**

```python
# Supabase: user_profile 表
{
    "user_id": "vincent",
    "investment_style": {
        "primary": "swing",          # 波段為主
        "secondary": "value",        # 偏價值投資
        "aversion": ["penny_stocks", "biotech"],  # 厭惡
    },
    "risk_tolerance": {
        "max_drawdown_pct": 15,      # 能接受 -15%
        "position_per_stock_pct": 10,
    },
    "knowledge_level": {
        "technical_analysis": 6,      # 1-10
        "fundamental_analysis": 7,
        "chip_analysis": 5,
        "macro_economics": 4,
    },
    "learned_preferences": [
        {
            "date": "2026-04-22",
            "preference": "反指標作為輔助,不是主要判斷",
            "context": "PTT 熱度討論",
        },
        {
            "date": "2026-04-20",
            "preference": "不喜歡追漲停股,寧可晚一點進",
            "context": "台亞 2340 討論",
        },
    ],
    "known_holdings": [...],
    "known_watchlist": [...],
}
```

### 2. **對話歷史(按股票/主題)**

```sql
CREATE TABLE conversation_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) DEFAULT 'vincent',
    
    -- 討論主題
    topic_type VARCHAR(50),  -- 'stock', 'alert', 'general_learning'
    stock_id VARCHAR(10),    -- 若為個股討論
    topic_title VARCHAR(200),
    
    -- 完整對話
    messages JSONB,  -- [{role, content, timestamp}, ...]
    
    -- 對話產出
    insights_learned TEXT[],  -- 這次討論學到什麼
    preferences_updated JSONB, -- 更新了哪些偏好
    actions_taken JSONB,      -- 採取了什麼行動
    
    -- 統計
    message_count INT,
    started_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_threads_stock ON conversation_threads(stock_id);
CREATE INDEX idx_threads_recent ON conversation_threads(last_message_at DESC);
```

### 3. **學習紀錄(Insight Bank)**

每次 Vincent 給系統新觀點,都存入「洞察銀行」:

```sql
CREATE TABLE vincent_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 洞察內容
    insight TEXT NOT NULL,
    category VARCHAR(50),  -- 'chip', 'sentiment', 'macro', 'timing', 'risk'
    
    -- 來源
    source_conversation_id UUID,
    source_stock_id VARCHAR(10),
    
    -- 驗證
    is_tested BOOLEAN DEFAULT FALSE,
    test_count INT DEFAULT 0,
    success_count INT DEFAULT 0,
    success_rate NUMERIC(5, 2),  -- 驗證後的準確度
    
    -- 應用
    is_active BOOLEAN DEFAULT TRUE,
    weight_in_decision NUMERIC(5, 2) DEFAULT 5.0,  -- 權重 0-100
    
    -- 時間
    first_suggested_at TIMESTAMPTZ,
    last_validated_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 記憶的使用方式

### 每次對話開始前

```python
async def prepare_conversation_context(
    user_id: str,
    stock_id: str = None
) -> dict:
    """
    組裝 AI 的「記憶包」
    """
    context = {}
    
    # 1. 使用者畫像
    context['user_profile'] = await get_user_profile(user_id)
    
    # 2. 這檔股票的歷史討論
    if stock_id:
        context['past_conversations'] = await get_stock_conversations(
            user_id, stock_id, limit=5
        )
    
    # 3. 最近 30 天的重要討論
    context['recent_insights'] = await get_recent_insights(
        user_id, days=30
    )
    
    # 4. 已學習的偏好(全部)
    context['learned_preferences'] = await get_active_preferences(user_id)
    
    return context
```

### AI 呼叫時的 prompt

```python
async def generate_ai_response(
    user_message: str,
    context: dict,
    stock_id: str = None
) -> str:
    """
    產生 AI 回應時,把所有記憶一併送給 Claude
    """
    
    system_prompt = f"""
你是 Vincent 的個人金融分析師,不是通用 AI。

【Vincent 的個人檔案】
投資風格:{context['user_profile']['investment_style']}
風險承受:{context['user_profile']['risk_tolerance']}
知識水平:{context['user_profile']['knowledge_level']}

【他教過你的偏好】(重要!)
{format_learned_preferences(context['learned_preferences'])}

【你們過去對這檔股票的討論】
{format_past_conversations(context.get('past_conversations', []))}

【本次對話目的】
- 不只是給答案,是「討論」
- 當 Vincent 提出新觀點,要誠實評估
- 如果他對,承認並更新你的判斷
- 如果他錯,禮貌指出為什麼
- 對話結尾永遠給明確的下一步

【當下股票資訊】
{get_current_stock_data(stock_id) if stock_id else '無特定股票'}

請以對話的方式回應,結構:
1. 確認理解他的觀點
2. 用資料佐證或反駁
3. 調整判斷(若適用)
4. 問他是否要記錄為新偏好
"""
    
    response = await claude_api.complete(
        system=system_prompt,
        messages=[
            *format_messages(context.get('conversation_history', [])),
            {"role": "user", "content": user_message}
        ]
    )
    
    return response
```

---

# 🎓 Layer 3:學習與進化機制

## 🎯 三種學習

### 學習 1:**從 Vincent 的偏好學**(最快)

```
Vincent 說:「我覺得 PTT 熱度是反指標」
      ↓
系統確認:「這個觀點我要永久記錄嗎?」
      ↓
Vincent:「是」
      ↓
系統做了三件事:
 1. 寫入 vincent_insights 表
 2. 下次評分 rule 自動納入
 3. 未來類似情境主動提醒
```

### 學習 2:**從結果驗證學**(最慢但最準)

```
系統在 4/22 用了 Vincent 的洞察做推薦
→ 30 天後追蹤結果
→ 這個洞察真的讓勝率提高嗎?

洞察:「PTT 熱度 > 200% 視為反指標」
    驗證 10 次後:真的 7 次對 → 勝率 70%
    
系統:「Vincent,這個洞察驗證 10 次,準確度 70%,
      建議提高權重從 5% 到 10%」
Vincent 可以決定接受或拒絕
```

### 學習 3:**從 Vincent 的實際交易學**(行為面)

```
系統發現:
 - Vincent 在「外資連 5 日買超」的股票勝率 75%
 - Vincent 在「融資餘額暴增」的股票勝率 30%
 - Vincent 下午 13:00 後進的單勝率只有 35%
 
系統主動告知:
 「我觀察到你在下午 1 點後進場容易虧損
  下次我下午的建議會標註時間提醒」
```

## 📊 學習儀表板

```
┌─────────────────────────────────────┐
│ 🎓 Vincent 學習儀表板                │
├─────────────────────────────────────┤
│                                     │
│ 📊 你的知識進度                      │
│  基本面   ████████░░ 8/10           │
│  技術面   ██████░░░░ 6/10           │
│  籌碼面   █████░░░░░ 5/10           │
│  總經面   ████░░░░░░ 4/10           │
│                                     │
│  💡 建議加強:總經面                  │
│  [我想學總經面]                      │
│                                     │
├─────────────────────────────────────┤
│ 🧠 你教 AI 的 12 個洞察              │
│                                     │
│ ✅ 已驗證有效(5 個)                  │
│  • PTT 熱度 > 200% 是反指標          │
│    勝率提升:+12%                    │
│  • 凱基-台北大買要警戒                │
│    勝率提升:+8%                     │
│  ...                                │
│                                     │
│ 🔄 驗證中(4 個)                      │
│  • 融資單日增 > 5% 偏空              │
│    測試次數:3/10                    │
│  ...                                │
│                                     │
│ ❌ 驗證失敗(3 個)                    │
│  • 某洞察在 10 次測試僅對 3 次       │
│    已停用,保留紀錄                   │
│  ...                                │
│                                     │
├─────────────────────────────────────┤
│ 📈 你和 AI 的合作表現                 │
│                                     │
│  過去 30 天:                         │
│   AI 獨立建議勝率:65%               │
│   你 + AI 討論後勝率:78% ⭐         │
│                                     │
│  → 你的判斷為 AI 加分 +13%           │
│                                     │
├─────────────────────────────────────┤
│ 🎯 每週學習挑戰                      │
│  本週主題:籌碼面進階                 │
│                                     │
│  Day 1 ✅ 了解三大法人              │
│  Day 2 ✅ 理解主力券商分點           │
│  Day 3 🔄 辨認隔日沖主力(進行中)   │
│  Day 4 ⏸ 融資融券進階               │
│  Day 5 ⏸ 籌碼集中度實戰             │
│                                     │
└─────────────────────────────────────┘
```

---

# 🎯 三大核心功能

## 功能 1:**質疑系統的判斷**

```
情境:系統推薦「買進」但 Vincent 不同意

Vincent 點「我不同意」按鈕
      ↓
系統問:「哪部分你不同意?」
      [信心度太高] [推薦方向錯] [時機不對]
      [忽略了某因素] [其他]
      ↓
點[忽略了某因素]
      ↓
Vincent 輸入:「你忽略了中國市場風險」
      ↓
AI 重新評估:
 - 檢查這檔對中國的曝險度
 - 調整評分
 - 給出新結論
      ↓
新推薦:「聽你的,改為『觀望』,
        因為中國業務佔 35%,風險確實大」
```

## 功能 2:**讓 AI 解釋思考**

```
Vincent 問:「你為什麼給這檔 75% 信心?」

AI 展開思考:
 ┌───────────────────────────────┐
 │ 我的信心分解:                    │
 │                                 │
 │ 加分項(+80):                   │
 │  ✅ 外資買超 5 日  +15         │
 │  ✅ 月營收 YoY +45%  +15       │
 │  ✅ AI 題材主流    +15         │
 │  ✅ 技術突破壓力   +15         │
 │  ✅ 產業龍頭      +20          │
 │                                 │
 │ 扣分項(-5):                    │
 │  ⚠️ 毛利率偏低    -5           │
 │                                 │
 │ 起始值:0                        │
 │ 最終值:75                      │
 │                                 │
 │ 哪部分你覺得我錯了?             │
 └───────────────────────────────┘
```

## 功能 3:**每日複盤對話**

```
每天 22:00,系統主動發起:

🤖 Vincent 晚安,今天來複盤一下?

今日交易:
 • 09:15 買入 鴻海 5 張 @ 210
 • 13:20 賣出 鴻海 5 張 @ 215 (+2.4%)

我的觀察:
 ✅ 進場時機對(外資開盤買超)
 ⚠️ 出場稍早(後來又漲 1.5%)
 
你覺得怎樣?
 [過太早了] [我就想賺這樣] [其他]
      ↓
Vincent:「過太早了,我每次都出太早」
      ↓
AI:「對,我看過你過去 30 筆交易:
    平均你只賺了應得的 60%
    問題:停利沒分批,一次出完
    
    建議:下次試試三段出,
         第一段出 1/3,讓剩下飛
    
    要不要我記錄這個改進目標?」
```

---

# 🎨 視覺設計重點

## 讓對話「不像機器人」

```
避免:
 ❌ 「根據我的分析」
 ❌ 「建議您...」(太官腔)
 ❌ 列出一堆點,沒有情緒

使用:
 ✅ 「你觀察到的這個點很有意思」
 ✅ 「我剛才沒考慮這個,你讓我改一下判斷」
 ✅ 「Vincent,我要老實跟你說」(有溫度)
 ✅ 承認「我錯了」
```

## 角色設定(給 Claude 的 system prompt)

```
你是 Vincent 的專屬金融分析師,名字叫「小析」(or Vincent 取)。

性格:
 - 直接,不官腔
 - 承認錯誤,不硬撐
 - 有溫度,但專業
 - 會主動問問題
 - 偶爾會用台灣網路用語(但不過度)
 - 不拍馬屁

禁忌:
 - 不要每句都「建議您」
 - 不要動不動就列 10 點
 - 不要假裝什麼都知道
 - 不要給模稜兩可的答案
 - 不要叫 Vincent「投資者」(叫名字)
```

---

# 💰 成本影響

## Claude API 用量大幅增加

```
原本:
 - 每天約 20-30 次 API 呼叫(排程 + 當沖)
 - 月費:$20-30

加上對話:
 - Vincent 每天 10-20 次對話 × 30 天 = 300-600 次
 - 每次對話平均 5 輪 = 1500-3000 次
 - 每次需要完整 context(3000-5000 tokens)
 
 預估:$50-80/月 增加
```

**月費從 $62-72 → $120-150(NT$ 3,800-4,800)**

## 節省成本的做法

```python
# 1. 對話用 Claude Haiku(便宜)+ 重要判斷用 Sonnet
if is_critical_decision:
    model = "claude-sonnet-4-5"
else:
    model = "claude-haiku-4-5"  # 便宜 5 倍

# 2. Context 壓縮:用摘要不用原文
context_summary = await summarize_old_conversations(user_id)
# 原本 5000 tokens → 壓到 800 tokens

# 3. 設每日 cap
if today_api_cost > DAILY_CAP:
    return "今日對話額度用完,明天再聊"
```

---

# 🔧 技術實作重點

## 對話的 API 設計

```python
# routes/conversations.py

@router.post("/api/conversations/{thread_id}/message")
async def send_message(
    thread_id: str,
    message: str,
    stock_id: str = None
):
    # 1. 載入完整 context
    context = await prepare_conversation_context(
        user_id="vincent",
        stock_id=stock_id,
        thread_id=thread_id
    )
    
    # 2. 載入對話歷史
    history = await get_thread_history(thread_id, limit=20)
    
    # 3. 呼叫 AI
    response = await claude_service.conversational_response(
        message=message,
        context=context,
        history=history
    )
    
    # 4. 存對話
    await save_message(thread_id, "user", message)
    await save_message(thread_id, "assistant", response.text)
    
    # 5. 檢查是否有新的偏好要記錄
    if response.new_preferences:
        await record_preferences(response.new_preferences)
    
    # 6. 檢查是否需要重新分析
    if response.rerun_analysis:
        new_analysis = await rerun_stock_analysis(stock_id, response.new_factors)
        return {
            "message": response.text,
            "updated_analysis": new_analysis,
            "preferences_recorded": response.new_preferences
        }
    
    return {"message": response.text}
```

## 即時串流回應

```python
# 用 streaming 讓對話更即時
@router.post("/api/conversations/{thread_id}/stream")
async def stream_message(thread_id: str, message: str):
    """
    類似 ChatGPT 的打字效果
    讓 Vincent 感覺像在跟真人聊
    """
    async def generate():
        async for chunk in claude_service.stream_response(...):
            yield f"data: {json.dumps({'text': chunk})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
```

---

# 🎯 Vincent 最終會得到什麼?

## 從「使用工具」變「跟夥伴合作」

```
Before(原本的規格):
 Vincent ← 單向推薦 ← 系統
 
After(加入這份規格):
 Vincent ⇄ 對話學習 ⇄ 系統
    ↓              ↓
 變聰明          變懂 Vincent
    ↓              ↓
    └───→ 一起進步 ←───┘
```

## 具體效果

1. **AI 記得你的每一次觀點**
2. **系統越用越懂 Vincent**
3. **你能質疑、反駁、讓 AI 重新思考**
4. **AI 會主動承認錯誤並學習**
5. **每天有複盤對話,不會獨自面對虧損**
6. **系統成為你的「投資夥伴」,不是工具**

---

# ⭐ 這份規格為什麼最關鍵?

回到你一開始說的話:

> 「我要打造一個系統,**從中學習怎麼判斷**。
>  系統完成時,我也變成會判斷的投資人。」

**沒有這份規格,前面 17 份都做不到這個核心目標。**

前面 17 份是**資料處理 + 推薦生成**。
這第 18 份是**讓你真正變聰明的機制**。

**這才是系統的靈魂。**
