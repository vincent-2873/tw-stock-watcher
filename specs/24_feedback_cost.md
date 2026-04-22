# 🔄 錯誤回報機制 + 成本控制規格書

> 兩個維運盲點:
> 1. 系統推薦錯,Vincent 怎麼告訴它?
> 2. AI 失控呼叫,怎麼避免信用卡爆炸?

---

# Part 1:錯誤回報機制

## 🎯 核心概念

**系統不完美,需要 Vincent 回報才能改進**

```
沒有回報機制:
 系統推薦爛 → Vincent 不爽 → 離開 → 永遠不知道哪邊錯

有回報機制:
 系統推薦爛 → Vincent 一鍵回報 → 系統學習 → 下次改進
```

---

## 📱 三層回報介面

### 層級 1:**快速回報**(每個推薦都有)

```
┌─────────────────────────────────────┐
│ 💼 系統推薦:鴻海 買進               │
│ ...                                  │
├─────────────────────────────────────┤
│                                     │
│ 這個推薦如何?                        │
│ [👍 有幫助] [👎 沒幫助] [📝 詳細]  │
│                                     │
└─────────────────────────────────────┘
```

### 層級 2:**分類回報**

```
點「👎 沒幫助」後:

┌─────────────────────────────────────┐
│ 為什麼不滿意?(可複選)              │
├─────────────────────────────────────┤
│                                     │
│ ☐ 方向錯(建議買結果跌)               │
│ ☐ 信心度太高                         │
│ ☐ 信心度太低(我覺得這檔超好)         │
│ ☐ 時機不對                            │
│ ☐ 忽略了某個因素                      │
│ ☐ 不符合我的風格                      │
│ ☐ 資訊過期                            │
│ ☐ 其他                                │
│                                     │
│ [送出] [加入備註後送出]                │
└─────────────────────────────────────┘
```

### 層級 3:**詳細回報**(開放文字)

```
「忽略了某個因素」→ 讓 Vincent 寫:

Vincent:「你沒考慮公司 Q1 財報下週要公布,
          這個時間點不該推薦進場」

系統 AI 回應:
「謝謝你的回饋。你說的對,我應該要:
 1. 檢查未來 14 天有沒有重大事件
 2. 事件前減少推薦權重
 
 要把這個規則加入我的決策邏輯嗎?
 [加入規則] [只這次]」
```

---

## 🔧 技術實作

### 資料庫

```sql
CREATE TABLE user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) DEFAULT 'vincent',
    
    -- 回報對象
    target_type VARCHAR(50),  -- 'recommendation', 'alert', 'analysis', 'chat'
    target_id UUID,           -- 對應的 ID
    
    -- 回報內容
    rating INT,              -- 1-5
    feedback_type VARCHAR(50), -- 'wrong_direction', 'bad_timing', 'missed_factor', ...
    categories TEXT[],        -- 複選分類
    detailed_feedback TEXT,   -- 開放文字
    
    -- 系統處理
    processed BOOLEAN DEFAULT FALSE,
    resulted_in_rule_change BOOLEAN DEFAULT FALSE,
    related_insight_id UUID,  -- 若轉為洞察
    
    -- 事後驗證
    user_was_correct BOOLEAN,  -- 追蹤結果驗證誰對
    verification_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_unprocessed ON user_feedback(processed) WHERE processed = FALSE;
```

### 處理流程

```python
async def handle_user_feedback(feedback: dict):
    """
    處理 Vincent 的回報
    """
    # 1. 存入資料庫
    record = await save_feedback(feedback)
    
    # 2. 如果是 "missed_factor" 類型,AI 分析
    if feedback["type"] == "missed_factor":
        ai_analysis = await claude_api.analyze_feedback(
            original_recommendation=feedback["target"],
            user_comment=feedback["comment"],
        )
        
        # 3. AI 判斷:這是一次性 or 應該變規則?
        if ai_analysis["should_be_a_rule"]:
            # 提議加入規則
            await propose_new_rule(
                user_id=feedback["user_id"],
                rule=ai_analysis["proposed_rule"],
                source_feedback_id=record["id"],
            )
    
    # 4. 通知 Vincent
    await reply_to_vincent(
        f"收到你的回饋。我會記錄這個,"
        f"30 天後驗證{feedback['target_id']}的結果,"
        f"確認誰對誰錯"
    )


async def weekly_feedback_review():
    """
    每週統計:最常被抱怨的問題是什麼?
    """
    feedbacks = await get_feedbacks_last_7_days()
    
    # 分類統計
    categories_count = Counter(
        cat for fb in feedbacks for cat in fb.categories
    )
    
    # 最常抱怨的 Top 3
    top_issues = categories_count.most_common(3)
    
    # 告訴 Vincent
    await send_line(f"""
    📊 本週回饋統計
    
    你抱怨最多的 3 件事:
    1. {top_issues[0][0]}({top_issues[0][1]} 次)
    2. {top_issues[1][0]}({top_issues[1][1]} 次)
    3. {top_issues[2][0]}({top_issues[2][1]} 次)
    
    系統已自動調整這些策略,下週會改善。
    """)
```

---

## 🎓 錯誤學習:讓系統越來越準

```python
async def validate_feedback_accuracy():
    """
    30 天後驗證:Vincent 回報的是對的嗎?
    """
    old_feedbacks = await get_feedbacks_older_than(days=30)
    
    for fb in old_feedbacks:
        if fb.user_was_correct is None:
            # 看結果
            actual_result = await get_actual_result(fb.target_id)
            
            # 判斷 Vincent 是否對
            if fb.feedback_type == "should_not_buy":
                # 他說不該買,結果真的跌了 → Vincent 對
                fb.user_was_correct = actual_result.return_pct < 0
            
            elif fb.feedback_type == "should_buy_more":
                # 他說該多買,結果真的漲了 → Vincent 對
                fb.user_was_correct = actual_result.return_pct > 5
            
            await save_feedback_validation(fb)
    
    # 產生報告
    accuracy_stats = await calculate_vincent_accuracy()
    
    await send_line(f"""
    📊 你的判斷準確度(過去 90 天)
    
    Vincent 對的:45 次
    Vincent 錯的:12 次
    準確度:79% ⭐
    
    → 你在這些情境判斷特別準:
     • 籌碼面(87%)
     • 題材發酵(82%)
    
    → 你在這些情境有誤判:
     • 短線技術(58%)
    """)
```

---

# Part 2:AI 成本保護

## 🚨 最壞情境:Claude API 成本失控

```
想像這個:
 系統 bug 讓某個函式無限呼叫 Claude API
 
 每小時 100 次 × Sonnet 4.5 單價
 = 一天 $50
 = 一個月 $1,500
 = 信用卡帳單大爆炸

必須有保護機制!
```

---

## 🛡 三層保護

### 層級 1:**每次呼叫前檢查**

```python
# services/claude_service.py

class ClaudeService:
    def __init__(self):
        self.daily_usage_cap_usd = 10   # 每日上限 $10
        self.monthly_usage_cap_usd = 100  # 每月上限 $100
    
    async def complete(self, prompt: str, model: str = "sonnet"):
        """
        呼叫 Claude API 前先檢查額度
        """
        # 檢查今日已用
        today_usage = await self._get_today_usage()
        if today_usage >= self.daily_usage_cap_usd:
            raise DailyCapExceeded(
                f"今日 Claude API 用量已達 ${today_usage:.2f}, "
                f"上限 ${self.daily_usage_cap_usd}"
            )
        
        # 檢查本月已用
        month_usage = await self._get_month_usage()
        if month_usage >= self.monthly_usage_cap_usd:
            raise MonthlyCapExceeded(...)
        
        # 單次呼叫的 token 限制
        if len(prompt) > 50000:  # 約 15000 tokens
            raise PromptTooLarge(
                "單次呼叫 prompt 過大,檢查是否有迴圈"
            )
        
        # 執行
        response = await self._actual_call(prompt, model)
        
        # 記錄用量
        await self._record_usage(response.usage, model)
        
        return response
```

### 層級 2:**速率限制**

```python
from collections import deque
import asyncio

class RateLimiter:
    """
    防止 AI 被瘋狂呼叫
    """
    def __init__(self, max_per_minute: int = 10):
        self.max_per_minute = max_per_minute
        self.calls = deque()
    
    async def acquire(self):
        now = time.time()
        
        # 清掉 1 分鐘前的
        while self.calls and self.calls[0] < now - 60:
            self.calls.popleft()
        
        # 檢查是否超限
        if len(self.calls) >= self.max_per_minute:
            wait_time = self.calls[0] + 60 - now
            logger.warning(f"Rate limit hit, waiting {wait_time:.1f}s")
            await asyncio.sleep(wait_time)
            return await self.acquire()
        
        self.calls.append(now)
```

### 層級 3:**異常偵測**

```python
async def detect_abnormal_usage():
    """
    每 10 分鐘檢查一次:有沒有異常高頻呼叫
    """
    recent_usage = await get_usage_last_10_minutes()
    
    # 正常一天 < $1
    # 10 分鐘 > $0.50 = 異常
    if recent_usage > 0.50:
        await emergency_alert(f"""
        🚨🚨🚨 AI 成本異常警報
        
        最近 10 分鐘消耗:${recent_usage:.2f}
        (正常值:$0.01-0.05)
        
        可能原因:
         - 程式出現迴圈
         - 被惡意攻擊
         - 排程異常
        
        已採取行動:
         ✅ 暫停所有 Claude API 呼叫
         ✅ 停止排程
         
        請 Vincent 儘速檢查
        """)
        
        # 真的停掉
        await disable_all_ai_calls()
```

---

## 📊 用量監控儀表板

```
┌─────────────────────────────────────┐
│ 💰 AI 用量監控                       │
├─────────────────────────────────────┤
│                                     │
│ 今日(2026/04/22)                    │
│  使用:$3.25 / $10 上限              │
│  ████████░░░░░░░░ 32%               │
│                                     │
│ 本月                                │
│  使用:$45.80 / $100 上限            │
│  ████████████░░░░░ 46%              │
│                                     │
│ 使用分解:                            │
│  • 早報:$0.15                       │
│  • 當沖推薦:$0.85 ⭐                │
│  • 盤中分析:$0.20                   │
│  • 盤後報告:$0.65                   │
│  • Vincent 對話:$1.40               │
│                                     │
│ 🎯 最貴的呼叫                        │
│  對話 ID: xxx                       │
│  Tokens: 8,500                       │
│  成本: $0.25                         │
│                                     │
│ ⚠️ 警告                              │
│  你今日對話較多,留意成本             │
│                                     │
│ [調整每日上限] [暫停 AI]              │
└─────────────────────────────────────┘
```

---

## 💡 成本優化策略

### 策略 1:**分級模型使用**

```python
def choose_model(task_type: str) -> str:
    """
    根據任務複雜度選模型
    """
    SIMPLE_TASKS = [
        "summarize_news",      # 摘要新聞
        "classify_sentiment",  # 情緒分類
        "extract_numbers",     # 抽取數字
    ]
    
    COMPLEX_TASKS = [
        "deep_stock_analysis",
        "conversational_challenge",
        "supply_chain_analysis",
    ]
    
    if task_type in SIMPLE_TASKS:
        return "claude-haiku-4-5"  # 便宜 5x
    elif task_type in COMPLEX_TASKS:
        return "claude-sonnet-4-5"
    else:
        return "claude-haiku-4-5"  # 預設便宜
```

### 策略 2:**Context 壓縮**

```python
async def get_compressed_context(user_id: str):
    """
    長期對話用摘要,不用原文
    """
    # 最近 5 輪用原文
    recent = await get_recent_messages(user_id, limit=5)
    
    # 更早的用 AI 摘要
    older_summary = await get_or_create_summary(user_id)
    # 5000 tokens → 壓到 800 tokens
    
    return {
        "summary_of_past": older_summary,
        "recent_exchanges": recent,
    }
```

### 策略 3:**快取重複查詢**

```python
@cache(ttl=300)  # 5 分鐘快取
async def analyze_stock(stock_id: str):
    """
    同一檔股票 5 分鐘內 Vincent 重複查 → 不重跑 AI
    """
    return await actual_ai_analysis(stock_id)
```

---

# 🎯 Vincent 會得到什麼?

## 錯誤回報
1. ✅ 一鍵回報「這推薦爛」
2. ✅ 系統會分析原因,提議改進
3. ✅ 30 天後驗證誰對
4. ✅ 你的判斷準確度統計

## 成本保護
1. ✅ 日 / 月成本硬上限
2. ✅ 異常呼叫自動停止
3. ✅ 完整用量儀表板
4. ✅ 每次 AI 呼叫都選對模型(省 5x)

**最壞情境下,你一個月不會燒超過 $100。**
