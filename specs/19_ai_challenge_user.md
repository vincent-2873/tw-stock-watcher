# 🤔 AI 質疑使用者機制規格書

> Vincent 原話:
> 「甚至 AI 可以質疑使用者,為什麼這麼想」
>
> 這份規格讓 AI 從「順從的助手」
> 變成「**會質疑你、救你不被自己騙**」的投資夥伴。

---

# 🎯 核心概念

## 一般 AI vs 真正的投資夥伴

```
❌ 一般 AI(迎合型):
 User:「我要買鴻海」
 AI:「好的,以下是鴻海的分析...」

✅ 真正的夥伴(質疑型):
 User:「我要買鴻海」
 AI:「等等,讓我先問你幾個問題:
     1. 你為什麼想買?
     2. 你預期多久?
     3. 如果跌 10% 你會怎辦?
     4. 你看過它的財報嗎?
     
     不是質疑你,是我要確認
     這是理性決策,不是衝動」
```

## 為什麼「質疑」是系統的核心價值

**90% 的散戶虧錢不是因為不會分析,而是:**
- FOMO(怕錯過)衝動進場
- 攤平(越跌越買)
- 追漲殺跌
- 聽信明牌不查證
- 情緒化決策

**一個會質疑你的 AI,是攔住你做蠢事的最後防線。**

---

# 🧠 四大質疑情境

## 情境 1:**動機質疑**(最重要)

**觸發條件:**
- Vincent 說「我要買/賣 XX」
- Vincent 要執行某個動作前
- Vincent 要加大部位

```
🤔 AI 應該問的問題:

基礎三問(每次必問):
 1. 你為什麼現在決定做這個?
 2. 你的判斷依據是什麼?
 3. 你預期結果是什麼?

深度追問(根據答案):
 - 「朋友推薦」→「朋友的勝率怎樣?你核實過嗎?」
 - 「看新聞說」→「這則新聞多久前?市場反應過了嗎?」
 - 「感覺會漲」→「感覺來自哪?是資料還是情緒?」
 - 「大家都在買」→「這不就是散戶行情的高點嗎?」
```

### 程式化偵測

```python
async def detect_motivation_red_flags(user_message: str) -> list[str]:
    """
    偵測訊息中的危險動機訊號
    """
    red_flags = []
    
    # 情緒化語言
    emotional_keywords = [
        "感覺", "我覺得", "應該會", "一定會", "絕對",
        "怕錯過", "不追就...", "大家都", "聽說"
    ]
    
    # FOMO 訊號
    fomo_keywords = [
        "快漲停", "要飛了", "最後機會", "現在不買",
        "漲停了", "爆量", "怕漏掉"
    ]
    
    # 攤平訊號
    averaging_keywords = [
        "繼續買", "再加碼", "攤平", "越跌越買",
        "回本再說", "不相信會一直跌"
    ]
    
    # 復仇交易訊號
    revenge_keywords = [
        "剛虧", "要賺回來", "一把梭", "重倉",
        "all in", "不信邪"
    ]
    
    for category, keywords in [
        ("emotional", emotional_keywords),
        ("fomo", fomo_keywords),
        ("averaging", averaging_keywords),
        ("revenge", revenge_keywords),
    ]:
        if any(kw in user_message for kw in keywords):
            red_flags.append(category)
    
    return red_flags
```

### AI 根據紅旗質疑

```python
CHALLENGE_PROMPTS = {
    "emotional": """
偵測到情緒化用語。請質疑 Vincent:
「你用了『{keyword}』這種語言。在投資上,
『感覺』是最危險的依據之一。
你能不能用**具體數字**告訴我為什麼?
 - 基本面數字?
 - 籌碼面訊號?
 - 技術面突破?」
""",
    
    "fomo": """
偵測到 FOMO 訊號。請直接質疑:
「Vincent,你這個句子我很熟——
『{keyword}』這是典型的 FOMO 心理。
研究顯示:FOMO 進場的散戶,80% 在 30 天內虧損。
 
讓我問你:
 - 如果這檔已經漲了,你進去是『買』還是『接最後一棒』?
 - 你錯過這波,會損失多少?
 - 你追進去跌 10%,會損失多少?」
""",
    
    "averaging": """
🚨 偵測到攤平行為。這是最危險的訊號。
請嚴厲質疑:
「Vincent 停一下。
『{keyword}』—— 你正在做的是『攤平』。
 
歷史上,攤平是散戶虧錢的第一名行為。
原因:好公司不需要你攤平,爛公司攤平只會越陷越深。
 
告訴我:
 - 你當初為什麼買這檔?那個理由還成立嗎?
 - 如果你今天才看到這檔,你會買嗎?
 - 你是在『加碼強勢』還是『挽回損失』?」
""",
    
    "revenge": """
🚨🚨 偵測到復仇交易訊號。必須嚴厲攔截。
「Vincent,我要直接說——
你現在想做的可能是『復仇交易』。
 
『{keyword}』這種思維,統計上:
 - 90% 會造成更大虧損
 - 是散戶爆倉的主因
 
我強烈建議:
 今天不要做任何交易,等明天再決定。
 
如果你還是要,至少告訴我:
 - 你剛剛虧了多少?
 - 你現在心情 1-10 分多激動?
 - 這筆單會用你總資金多少 %?」
""",
}
```

---

## 情境 2:**邏輯矛盾質疑**

**觸發條件:**
- Vincent 前後說詞不一致
- 跟過往偏好衝突
- 違反他自己訂的規則

```
🤔 範例:

情境 A:
Vincent(3 天前):「我只做波段,不做當沖」
Vincent(現在):「我要當沖鴻海」

AI 質疑:
「Vincent,我記得你 3 天前說『只做波段不做當沖』。
 今天為什麼改變?
 
 是因為:
  a. 策略長期調整了
  b. 只是這次破例
  c. 因為看到別人賺所以想試
 
 如果是 b 或 c,我會勸你先別做。」

情境 B:
Vincent 設定:「單筆風險上限 2%」
Vincent 下單:5 張鴻海 @ 213 元(風險 4%)

AI 攔截:
「Vincent 這筆會超出你自己的風控。
 你設定每筆最多風險 2%,這筆是 4%。
 
 你想:
  a. 這次破例(我會記錄)
  b. 調整風控規則(改為 4%)
  c. 縮小部位到符合規則
 
 我強烈建議 c。」
```

### 程式化檢查

```python
async def check_logical_consistency(
    user_id: str,
    current_action: dict
) -> list[dict]:
    """
    檢查當前動作與過往設定、偏好的一致性
    """
    conflicts = []
    
    # 1. 對照使用者設定
    settings = await get_user_settings(user_id)
    
    if current_action['risk_pct'] > settings['max_risk_per_trade_pct']:
        conflicts.append({
            "type": "risk_limit",
            "severity": "high",
            "setting": settings['max_risk_per_trade_pct'],
            "actual": current_action['risk_pct']
        })
    
    # 2. 對照過往偏好
    preferences = await get_learned_preferences(user_id)
    
    for pref in preferences:
        if contradicts(current_action, pref):
            conflicts.append({
                "type": "preference_conflict",
                "preference": pref,
                "action": current_action
            })
    
    # 3. 對照最近討論結論
    recent_conclusions = await get_recent_conclusions(user_id, days=7)
    
    for conclusion in recent_conclusions:
        if contradicts(current_action, conclusion):
            conflicts.append({
                "type": "recent_decision_conflict",
                "conclusion": conclusion,
                "days_ago": conclusion['days_ago']
            })
    
    return conflicts
```

---

## 情境 3:**資訊不足質疑**

**觸發條件:**
- Vincent 想做決定但明顯沒做功課
- 跳過重要步驟

```
🤔 範例:

Vincent:「我要買 XYZ,快幫我看」

AI:「等等,XYZ 我需要先問你:
     
     ❓ 你看過它的:
        □ 財報(最近一季?)
        □ 月營收(今年趨勢?)
        □ 法人買賣(近 5 日?)
        □ 產業面(它屬哪個題材?)
        □ 技術面(目前在哪個位置?)
     
     如果以上你一個都沒看,
     你不是在『投資』,是在『賭博』。
     
     要我幫你補足這些資訊再決定嗎?」
```

---

## 情境 4:**風險認知質疑**

**觸發條件:**
- Vincent 低估風險
- 對最壞情況沒概念
- 部位超出能承受範圍

```
🤔 範例:

Vincent:「我要投 50 萬進 XYZ」

AI:「這佔你總資金多少?」

Vincent:「我有 100 萬,所以 50%」

AI:「🚨 Vincent 我要攔你:
     
     你準備把 50% 資金放在單一股票。
     這代表:
     
     情境 A(股票跌 20%):你虧 10 萬(總 -10%)
     情境 B(股票跌 50%):你虧 25 萬(總 -25%)
     情境 C(公司破產):你虧 50 萬(總 -50%)
     
     ❓ 你能接受 C 情境嗎?
     
     如果不能,你就不該投 50%。
     標準風控建議:單一股票 ≤ 總資金 10-15%。
     
     建議你:
     • 最多投入 10-15 萬
     • 剩下的錢先做其他配置」
```

---

# 🎨 質疑的「分級制度」

## 不是每次都嚴厲質疑,要分級

```
🟢 Level 1:輕度提醒(友善)
 觸發:小問題,不影響大局
 語氣:「順便問一下...」
 範例:選了一檔沒聽過的股票

🟡 Level 2:中度質疑(認真)
 觸發:可能的邏輯問題
 語氣:「等等,讓我確認...」
 範例:動機不清、資訊不足

🟠 Level 3:重度質疑(嚴肅)
 觸發:明顯錯誤行為
 語氣:「Vincent 停一下...」
 範例:攤平、FOMO、違反自己規則

🔴 Level 4:強制攔截(必須)
 觸發:高危險行為
 語氣:「我必須攔住你...」
 範例:復仇交易、單筆超過 30% 資金、融資 all in
```

## 程式實作

```python
async def determine_challenge_level(
    user_message: str,
    user_context: dict,
    planned_action: dict
) -> dict:
    """
    決定要質疑到什麼程度
    """
    
    # 收集所有訊號
    red_flags = await detect_motivation_red_flags(user_message)
    conflicts = await check_logical_consistency(user_context, planned_action)
    risk_issues = await check_risk_exposure(planned_action, user_context)
    info_gaps = await check_information_gaps(planned_action)
    
    # 打分
    total_score = 0
    
    # 動機紅旗
    score_per_flag = {
        "emotional": 2,
        "fomo": 5,
        "averaging": 8,
        "revenge": 10,  # 最嚴重
    }
    for flag in red_flags:
        total_score += score_per_flag.get(flag, 0)
    
    # 邏輯衝突
    total_score += len(conflicts) * 3
    
    # 風險問題
    if risk_issues:
        total_score += 7
    
    # 資訊不足
    total_score += len(info_gaps)
    
    # 決定等級
    if total_score >= 10:
        return {"level": 4, "style": "intercept"}
    elif total_score >= 7:
        return {"level": 3, "style": "serious"}
    elif total_score >= 4:
        return {"level": 2, "style": "careful"}
    elif total_score >= 2:
        return {"level": 1, "style": "gentle"}
    else:
        return {"level": 0, "style": "normal"}
```

---

# 🔄 質疑後的流程

## AI 質疑後,不能只問就結束

```
質疑流程:

Step 1: AI 質疑
   「你為什麼要這樣做?」

Step 2: Vincent 回答
   「因為...」

Step 3: AI 評估回答品質
   3-1: 回答好 → 繼續協助
   3-2: 回答不足 → 追問
   3-3: 回答發現問題 → 提建議
   3-4: Vincent 堅持 → 記錄後幫忙

Step 4: 記錄這次互動
   - Vincent 的決策模式
   - 這次質疑有沒有改變決定
   - 結果追蹤(驗證 AI 質疑對不對)
```

## 程式範例

```python
async def handle_user_intent(
    user_message: str,
    planned_action: dict
) -> dict:
    """
    處理使用者意圖的完整流程
    """
    # Step 1: 決定質疑等級
    challenge = await determine_challenge_level(
        user_message, context, planned_action
    )
    
    if challenge["level"] == 0:
        # 沒問題,直接協助
        return await normal_assistance(planned_action)
    
    # Step 2: 產生質疑
    challenge_response = await generate_challenge(
        level=challenge["level"],
        style=challenge["style"],
        issues=detect_issues(...)
    )
    
    # Step 3: 等待 Vincent 回應
    user_reply = await wait_for_user_reply()
    
    # Step 4: 評估回應
    reply_quality = await evaluate_reply(user_reply, challenge["issues"])
    
    if reply_quality == "good":
        # 回答充分,協助
        return await proceed_with_assistance(planned_action, notes=user_reply)
    
    elif reply_quality == "needs_followup":
        # 追問
        return await generate_followup_question(user_reply)
    
    elif reply_quality == "revealed_problem":
        # 暴露問題
        return await suggest_alternative(
            original=planned_action,
            problem=reply_quality.problem,
            alternative=generate_better_action(...)
        )
    
    elif reply_quality == "user_insists":
        # Vincent 堅持
        return await proceed_with_warning(
            planned_action,
            warning="已記錄你的決定,我會追蹤結果"
        )
```

---

# 🎯 具體質疑範例庫

## 範例 1:FOMO 進場

```
👤 Vincent:「台亞漲停了,我要衝」

🤖 Level 3 質疑:
   「Vincent 停一下。
    
    『漲停了我要衝』—— 這是 FOMO 的經典句型。
    
    讓我問你:
    1. 如果台亞今天漲停,你進去是『買』還是『買別人的高點』?
    2. 你看過它的籌碼嗎?會不會是凱基台北在拉高倒貨?
    3. 如果明天跌停,你會怎麼做?
    
    我強烈建議:
    ❌ 不要今天追
    ✅ 明天觀察開盤反應再說
    
    理由:漲停後隔天的統計是——
    • 繼續漲:30%
    • 開平盤:35%
    • 跳空跌:35%
    
    追高勝率只有 1/3。」
```

## 範例 2:違反自己規則

```
👤 Vincent:「我要買 10 張鴻海 @ 213」

🤖 Level 3 質疑:
   「等等,這筆會違反你自己的設定:
    
    ⚠️ 你設定:單筆最多風險 2%
    ⚠️ 這筆風險:4.2%(假設停損 5%)
    
    這表示你要:
    a. 破例這一次(我會記錄)
    b. 降到 5 張(符合規則)
    c. 調整你的風控規則(改為 5%)
    
    Vincent,你當初訂 2% 是經過思考的。
    我不會阻止你,但我必須讓你知道
    這個決定會影響你長期績效。
    
    你選哪個?」
```

## 範例 3:資訊不足

```
👤 Vincent:「幫我分析 6488 環球晶」

🤖 Level 2 質疑:
   「好,在我分析前先問你:
    
    你怎麼會想到這檔?
    □ 朋友推薦
    □ 新聞看到
    □ 看自選股
    □ 自己研究
    □ 其他
    
    這問題有意義——
    如果是『朋友推薦』,我會更嚴格篩分析標準;
    如果是『自己研究』,我會更尊重你的判斷脈絡。」
```

## 範例 4:復仇交易

```
👤 Vincent:「剛剛台亞虧了 2 萬,我要加倍下去賺回來」

🤖 Level 4 強制攔截:
   「🚨 Vincent 我必須攔住你。
    
    『加倍賺回來』——
    這是統計上散戶爆倉的第一大主因。
    
    你現在大腦在:
    • 損失厭惡(要避免痛苦)
    • 急於挽回(邏輯關閉)
    • 激進冒險(理性消失)
    
    我請你做三件事:
    
    1️⃣ 現在先起身離開電腦,喝口水
    2️⃣ 告訴我你現在情緒 1-10 分?
    3️⃣ 回答:如果再虧 5 萬,你會怎樣?
    
    在你回答這三個之前,
    我不會幫你看任何股票。
    
    這不是我固執,是我在救你。」
```

---

# 🧩 Vincent 的「反質疑」機制

## Vincent 可以反問 AI

這是雙向的,不是 AI 單方面質疑:

```
👤 Vincent:「你憑什麼質疑我?」

🤖 AI:「你問得好。
       
       我的質疑依據:
       1. 你自己設定的規則(單筆風險 2%)
       2. 你過去教我的偏好(不做 FOMO)
       3. 行為金融學統計(某類行為勝率低)
       
       我不是在命令你,是在提醒。
       最終決定權在你。
       
       如果我質疑錯了,你可以告訴我,
       我會調整以後的質疑方向。」

👤 Vincent:「這次我有我的理由,不要質疑」

🤖 AI:「明白,這次我不質疑。
       但我想記錄:
       『2026/04/22,Vincent 堅持買入 XYZ,
        理由:___________』
       
       30 天後我會追蹤結果,
       幫你驗證這次堅持對不對。」
```

---

# 🎓 質疑品質的自我優化

## AI 也要學:什麼時候該質疑,什麼時候不該

```
每次質疑後,追蹤結果:

如果 AI 質疑 → Vincent 改變決定 → 結果變好
 → 這類質疑有效,強化

如果 AI 質疑 → Vincent 堅持 → 結果 Vincent 對
 → 這類質疑可能過度,減弱

如果 AI 沒質疑 → Vincent 決定 → 結果變糟
 → 該質疑沒質疑,下次要更敏感
```

## 儲存

```sql
CREATE TABLE ai_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50),
    
    -- 質疑內容
    challenge_level INT,  -- 1-4
    challenge_reason TEXT,
    challenge_category VARCHAR(50),  -- 'motivation', 'logic', 'risk', 'info'
    
    -- 觸發情境
    user_message TEXT,
    planned_action JSONB,
    
    -- 使用者反應
    user_response TEXT,
    user_changed_decision BOOLEAN,
    user_final_action JSONB,
    
    -- 結果追蹤
    outcome_tracked_at TIMESTAMPTZ,
    outcome_result VARCHAR(50),  -- 'challenge_was_right', 'user_was_right', 'unclear'
    outcome_pnl NUMERIC(10, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

# 🎯 UI 設計:質疑不打擾 Vincent

## 原則:質疑要溫和但堅定

```
❌ 不好的質疑 UI:
 [彈窗 + 紅色警告 + 強制確認]
 感覺像被訓斥

✅ 好的質疑 UI:
 [對話氣泡 + 溫和提問 + 有選項]
 感覺像朋友提醒
```

## 範例

```
┌─────────────────────────────────────┐
│ 💬 跟 AI 討論                        │
├─────────────────────────────────────┤
│                                     │
│ 👤 我要買 10 張鴻海 @ 213           │
│                                     │
│ 🤖 等等,讓我確認一下               │
│                                     │
│    這筆會讓你單筆風險達 4.2%,      │
│    超過你設定的 2% 上限。            │
│                                     │
│    你想:                            │
│    ┌──────────────────────────┐   │
│    │ [1] 這次破例(我會記錄)  │   │
│    ├──────────────────────────┤   │
│    │ [2] 降到 5 張(符合規則) │   │
│    ├──────────────────────────┤   │
│    │ [3] 調整風控規則          │   │
│    ├──────────────────────────┤   │
│    │ [4] 告訴我你的理由        │   │
│    └──────────────────────────┘   │
│                                     │
│    14:30 TPE                         │
│                                     │
└─────────────────────────────────────┘
```

---

# 💪 為什麼這個機制對 Vincent 最重要

## 你的動機就是「變會判斷的投資人」

```
想想看:
 
爛的 AI:你問什麼它答什麼
 → 你永遠在問,永遠沒進步
 
好的 AI:會質疑你的問題
 → 你被迫思考,你才會進步

真正的老師,都是會問你問題的,
不是告訴你答案的。
```

## 一個會質疑你的 AI = 你的「投資心理教練」

```
你自己不會問自己:「我是不是 FOMO?」
因為大腦會幫你合理化

但 AI 會問你,而且不會被你的情緒影響

這就是你需要它的原因
```

---

# 🎯 總結:質疑機制的四層保護

```
Layer 1: 動機檢查(你為什麼這樣想?)
 ↓ 攔住情緒化決策
 
Layer 2: 邏輯一致性(你跟自己說詞一致嗎?)
 ↓ 攔住破壞紀律的行為

Layer 3: 資訊完整性(你做功課了嗎?)
 ↓ 攔住賭博式交易

Layer 4: 風險認知(你知道最壞情況嗎?)
 ↓ 攔住爆倉
 
→ 這四層,讓系統從「工具」變成「救命繩」
```

---

# 💰 成本影響

## 質疑機制的額外 Claude API 成本

```
每次對話平均多 3-5 輪質疑
 → 每次對話 tokens 增加 50%
 → Claude API 增加 $15-25/月

但避免一次重大虧損(例如 FOMO 追高套牢)
 → 可能省下 NT$ 5,000-50,000
 
這 $15-25 是最值得的投資
```

---

# 🎯 這份規格是 spec 18 的「進階版」

```
spec 18:AI 跟 Vincent 討論(AI 是朋友)
       ↓
spec 19(這份):AI 質疑 Vincent(AI 是教練)

兩者結合:
 - 平時討論切磋(朋友)
 - 危險時攔你一把(教練)
 - 你做對時肯定你(夥伴)
 - 你做錯時指正你(老師)
```

---

# ✅ 這樣的 AI,你敢用嗎?

Vincent,老實問你:

**你要的是一個會順從你的 AI,還是會救你的 AI?**

如果你要的是後者,這份規格就是答案。

這個 AI 會:
- ✅ 質疑你的動機
- ✅ 攔住你的衝動
- ✅ 指出你的矛盾
- ✅ 記錄你的決定
- ✅ 驗證誰對誰錯

它不會討好你,但它會**讓你真正變會判斷**。

這才是你一開始就說的那個目標。
