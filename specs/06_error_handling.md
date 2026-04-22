# 🛡 錯誤處理與系統健康度規格

> 系統「自動出錯」時如何不讓 Vincent 失望

---

## 核心原則

**絕不沉默失敗**

```
❌ 錯誤做法:
 API 壞了 → 系統照跑 → 用壞資料做分析 → 亂推薦

✅ 正確做法:
 API 壞了 → 系統偵測 → 通知 Vincent
 → 標記資料為「不可信」 → 跳過這次分析
```

---

## 錯誤分級系統

### 🔴 CRITICAL(立刻通知 Vincent + 停止相關功能)

**情境:**
- 資料庫連線失敗
- 所有 API 都失敗
- 關鍵排程連續 3 次失敗
- 傳錯誤資料給使用者的風險

**處理:**
```python
async def handle_critical_error(error: CriticalError):
    # 1. 立刻發 LINE(多次重試)
    await notify_line(
        message=f"🚨 系統嚴重錯誤\n{error.summary}\n\n已暫停相關功能",
        retry=3
    )
    
    # 2. 發 Email(備份)
    await notify_email(...)
    
    # 3. 停用相關功能
    disable_feature(error.affected_feature)
    
    # 4. 記錄詳細 log
    logger.critical(error.details)
    
    # 5. 不讓系統產生新輸出,避免誤導
    raise SystemError("Feature disabled due to critical error")
```

---

### 🟡 HIGH(通知 + 降級處理)

**情境:**
- 單一 API 失敗(但其他能用)
- AI 服務失敗
- 資料不完整(某個欄位缺失)

**處理:**
```python
async def handle_high_error(error: HighError):
    # 1. 通知 Vincent(可合併)
    queue_line_notification(
        message=f"⚠️ {error.service} 暫時異常,系統降級運作中"
    )
    
    # 2. 降級到備援方案
    fallback_result = await use_fallback(error.service)
    
    # 3. 標記輸出為「降級模式」
    return {
        "data": fallback_result,
        "mode": "degraded",
        "warning": "部分資料可能不完整"
    }
```

**範例:**
```python
try:
    news = await newsapi.fetch()
except APIError:
    # 降級用 RSS
    news = await rss_service.fetch()
    log_degradation("newsapi", "rss_fallback")
```

---

### 🟢 MEDIUM(記錄 + 彙整通知)

**情境:**
- 偶發性超時(重試可解決)
- 個別股票資料缺失(整體仍可用)
- 非關鍵警報失敗

**處理:**
```python
async def handle_medium_error(error):
    # 只 log,不立刻通知
    logger.warning(error)
    
    # 累積到每日健康報告
    add_to_daily_health_report(error)
    
    # 重試(如果適用)
    if error.retryable:
        await retry_with_backoff(error.task)
```

---

### 🔵 LOW(僅記錄)

**情境:**
- 快取過期(重新抓就好)
- 預期內的 Rate Limit(延遲重試)
- 資訊性 log

**處理:**
```python
logger.info(f"Cache miss for {key}, refetching")
```

---

## 具體錯誤處理範例

### 範例 1:FinMind API 失敗

```python
# services/finmind_service.py

class FinMindService:
    async def get_stock_price(self, stock_id: str):
        try:
            # 嘗試 1: 主要 API
            return await self._call_api_with_timeout(
                url=f"{self.BASE_URL}/TaiwanStockPrice",
                params={"data_id": stock_id},
                timeout=10
            )
        except TimeoutError:
            # 嘗試 2: 延長 timeout 再試
            try:
                return await self._call_api_with_timeout(timeout=30)
            except:
                pass
        except RateLimitError as e:
            # 嘗試 3: 等待後再試
            await asyncio.sleep(e.retry_after)
            return await self._call_api_with_timeout()
        except APIError as e:
            # 嘗試 4: 用備援(證交所 OpenAPI)
            logger.warning(f"FinMind failed, trying TWSE: {e}")
            return await twse_service.get_price(stock_id)
        
        # 全部失敗
        raise DataSourceError(
            f"Unable to fetch price for {stock_id} from any source"
        )
```

### 範例 2:Workflow 失敗

```python
# scripts/run_morning_report.py

async def main():
    try:
        # 執行早報
        report = await generate_morning_report()
        
        # 推播
        await send_to_line(report)
        
    except CriticalError as e:
        # 關鍵錯誤
        await notify_critical(
            title="早報產生失敗",
            error=e,
            recovery="將在 08:30 再次嘗試"
        )
        
        # 不發部分報告,避免誤導
        return
    
    except HighError as e:
        # 部分錯誤
        await notify_degraded(
            title="早報部分資料缺失",
            missing=e.missing_fields
        )
        
        # 發送「降級版」報告
        await send_degraded_report(report, missing=e.missing_fields)
    
    except Exception as e:
        # 未預期錯誤
        await notify_unexpected_error(e)
        
        # 保留現場供 debug
        save_error_context(e)
```

### 範例 3:資料驗證失敗

```python
# core/decision_engine.py

async def analyze_stock(stock_id: str):
    # 1. 抓資料
    data = await gather_all_data(stock_id)
    
    # 2. 驗證資料品質
    validation = validate_data_quality(data)
    
    if not validation.passed:
        return {
            "recommendation": "資料品質不足,無法分析",
            "reason": validation.issues,
            "confidence": 0,
            "action": "請明日重試"
        }
    
    # 3. 如果資料只是「部分缺失」
    if validation.has_warnings:
        return {
            "recommendation": await do_analysis(data),
            "confidence": min(60, confidence),  # 信心度打折
            "warning": f"⚠️ {validation.missing_items} 資料缺失,信心度已調整"
        }
    
    # 4. 正常分析
    return await do_analysis(data)
```

---

## 系統健康度監控

### 每 5 分鐘自動檢查

```python
# scripts/health_check.py

async def run_health_check():
    """
    系統健康度檢查(由 GitHub Actions 每 5 分鐘跑)
    """
    results = []
    
    # 1. 資料源檢查
    for service in ['finmind', 'fmp', 'news_api', 'claude']:
        status = await check_service_health(service)
        results.append(status)
    
    # 2. 資料庫檢查
    db_status = await check_supabase_connection()
    results.append(db_status)
    
    # 3. 排程檢查
    schedule_status = check_recent_workflows()
    results.append(schedule_status)
    
    # 4. 資料新鮮度
    freshness = check_data_freshness()
    results.append(freshness)
    
    # 5. 儲存結果
    save_health_check(results)
    
    # 6. 如果有問題,通知
    issues = [r for r in results if r.status != 'healthy']
    if issues:
        await alert_on_health_issues(issues)
```

### 系統健康度儀表板

Vincent 可以在 Web UI 看到:

```
🏥 系統健康度(最近 24 小時)

✅ 資料源狀態
  ✅ FinMind         100%  (最後成功 2 分鐘前)
  ✅ FMP             98.5% (最後成功 5 分鐘前)
  ⚠️ NewsAPI         85%   (偶發超時)
  ✅ Claude API      99%   (正常)

✅ 排程狀態
  ✅ 早報         今日 08:00 成功
  ✅ 當沖推薦     今日 08:45 成功
  ✅ 盤中監控     每 5 分鐘 (已執行 42 次)
  ✅ 盤後解析     昨日 14:35 成功

✅ 資料新鮮度
  ✅ 股價資料    5 分鐘前更新
  ✅ 法人資料    今日 14:45 更新
  ⚠️ 新聞資料    30 分鐘前(略舊)

✅ 通知管道
  ✅ LINE        成功率 100%
  ✅ Email       成功率 98%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
整體健康度:95/100
```

---

## 自動恢復機制

### 機制 1:指數退避重試

```python
async def retry_with_exponential_backoff(
    task, 
    max_retries=3,
    base_delay=1
):
    for attempt in range(max_retries):
        try:
            return await task()
        except RetryableError:
            if attempt == max_retries - 1:
                raise
            
            delay = base_delay * (2 ** attempt)
            logger.info(f"Retry {attempt+1}/{max_retries} after {delay}s")
            await asyncio.sleep(delay)
```

### 機制 2:熔斷器(Circuit Breaker)

```python
class CircuitBreaker:
    """
    防止故障服務拖垮整個系統
    """
    def __init__(self, failure_threshold=5, recovery_timeout=60):
        self.failures = 0
        self.last_failure = None
        self.is_open = False
    
    async def call(self, service):
        # 熔斷器打開,直接拒絕
        if self.is_open:
            if (now() - self.last_failure) > self.recovery_timeout:
                # 半開狀態,試一次
                self.is_open = False
            else:
                raise ServiceUnavailable(f"{service.name} is circuit broken")
        
        try:
            result = await service()
            self.failures = 0  # 成功,重置
            return result
        except Exception as e:
            self.failures += 1
            self.last_failure = now()
            
            if self.failures >= self.failure_threshold:
                self.is_open = True
                await notify_circuit_breaker_opened(service.name)
            
            raise
```

### 機制 3:Fallback 降級

```python
SERVICE_FALLBACKS = {
    "finmind": ["twse_openapi", "cached_data"],
    "newsapi": ["rss_feeds", "cached_news"],
    "fmp": ["yahoo_finance", "cached_data"],
    "claude": ["rule_based_analysis"],
}

async def get_with_fallback(service_name: str, task):
    # 試主要服務
    try:
        return await task(get_service(service_name))
    except ServiceError:
        pass
    
    # 試 fallback
    for fallback_name in SERVICE_FALLBACKS[service_name]:
        try:
            logger.warning(f"Falling back to {fallback_name}")
            return await task(get_service(fallback_name))
        except ServiceError:
            continue
    
    # 全部失敗
    raise AllServicesDown(service_name)
```

---

## GitHub Actions 錯誤處理

每個 workflow 都要有:

```yaml
name: Morning Report

on:
  schedule:
    - cron: '0 0 * * 1-5'  # 08:00 TPE

jobs:
  run:
    runs-on: ubuntu-latest
    timeout-minutes: 10   # 超時保護
    
    steps:
      - uses: actions/checkout@v4
      
      # ... 執行步驟 ...
      
      - name: Run morning report
        id: run
        env:
          # ... secrets ...
        run: |
          python scripts/run_morning_report.py
      
      - name: Notify on failure
        if: failure()
        run: |
          curl -X POST https://api.line.me/v2/bot/message/push \
            -H "Authorization: Bearer ${{ secrets.LINE_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "to": "${{ secrets.LINE_USER_ID }}",
              "messages": [{
                "type": "text",
                "text": "🚨 早報產生失敗\n時間:${{ github.event.schedule }}\n請稍後檢查系統"
              }]
            }'
      
      - name: Log to Supabase
        if: always()
        run: |
          python scripts/log_workflow_result.py \
            --workflow "morning_report" \
            --status "${{ steps.run.outcome }}"
```

---

## 日誌系統

### 日誌級別

```python
# utils/logger.py

import logging
from loguru import logger

# 設定格式
logger.add(
    "logs/system_{time}.log",
    rotation="1 day",      # 每天一個檔
    retention="30 days",   # 保留 30 天
    level="DEBUG",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level} | {module}:{function}:{line} | {message}"
)

# 重要事件另存
logger.add(
    "logs/critical_{time}.log",
    rotation="1 week",
    retention="6 months",
    level="WARNING",
)
```

### 結構化日誌

```python
# 不要這樣
logger.info("鴻海推薦")

# 要這樣
logger.info("Recommendation generated", extra={
    "stock_id": "2317",
    "recommendation": "watch",
    "confidence": 75,
    "timestamp": "2026-04-22T08:30:00+08:00"
})
```

---

## 測試策略

### 測試 1:Unit Test(每個函式)

```python
# tests/test_decision_engine.py

def test_score_to_recommendation():
    assert score_to_recommendation(90) == ("強烈買進", "🔥")
    assert score_to_recommendation(70) == ("買進", "✅")
    assert score_to_recommendation(30) == ("避開", "❌")

def test_confidence_calculation_balanced():
    """四個維度都在中間值 → 應該給中等信心度"""
    scores = {"fundamental": 15, "chip": 15, "technical": 15, "catalyst": 15}
    assert 60 <= calculate_confidence(scores) <= 80

def test_confidence_calculation_unbalanced():
    """一維度極高,其他極低 → 信心度應該打折"""
    scores = {"fundamental": 20, "chip": 5, "technical": 5, "catalyst": 5}
    assert calculate_confidence(scores) < 50
```

### 測試 2:Integration Test(服務間)

```python
# tests/test_integration.py

async def test_full_analysis_pipeline():
    """完整分析流程"""
    result = await analyze_stock("2317")
    
    assert result['stock_id'] == "2317"
    assert 'recommendation' in result
    assert 0 <= result['confidence'] <= 100
    assert len(result['bull_case']) >= 3
    assert len(result['bear_case']) >= 3
    assert 'action_plan' in result
```

### 測試 3:E2E Test(從排程到通知)

```python
# tests/test_e2e.py

async def test_morning_report_workflow():
    """測試早報完整流程"""
    # 模擬時間為平日 08:00
    with mock_time("2026-04-22 08:00:00 +0800"):
        await run_morning_report()
    
    # 驗證
    assert line_notifications_sent() == 1
    assert report_saved_to_db()
```

### 測試 4:Chaos Test(故意破壞)

```python
# tests/test_resilience.py

async def test_system_handles_api_failure():
    """當 FinMind 壞掉時,系統該怎麼辦?"""
    with mock_service_failure("finmind"):
        result = await analyze_stock("2317")
        
        # 應該降級,不是崩潰
        assert result['mode'] == 'degraded'
        assert result['warning'] is not None
```

---

## Vincent 常見問題 FAQ

**Q1: 今天沒收到早報?**
1. 檢查 Web 儀表板的健康度
2. 查看 GitHub Actions 執行紀錄
3. 可能是假日或系統維護

**Q2: 警報太多怎麼辦?**
- 到設定調整「警報等級」
- 關閉 LOW 級別
- 加入靜音時段

**Q3: 建議準確率如何驗證?**
- 到「系統績效」頁面
- 看「推薦追蹤」分類
- 系統自動統計勝率

**Q4: 系統出錯會怎樣?**
- 立刻 LINE 通知
- 不會給錯誤資料
- 記錄到健康度頁
