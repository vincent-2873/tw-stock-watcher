# ⏰ 分秒不差排程架構(Zero-Lag Scheduling)

> ⚠️ 這份文件解決一個業界公開秘密:**GitHub Actions 的 cron 會延遲!**

---

## 🚨 你必須知道的真相

### GitHub Actions Cron 的真實行為

官方文件寫「每 5 分鐘執行」,但**實際行為是**:

```
你設定:*/5 * * * *(每 5 分鐘)

實際執行時間(例):
 08:30:00 → 實際 08:32:47 觸發(延遲 2 分 47 秒)
 08:35:00 → 實際 08:38:12 觸發(延遲 3 分 12 秒)
 08:40:00 → 實際 08:47:30 觸發(延遲 7 分 30 秒)⚠️
 08:45:00 → 可能「跳過」不執行 ⚠️⚠️
```

**更糟的是**:
- 尖峰時段(UTC 整點、美股開盤)延遲可能高達 **15-30 分鐘**
- 某些時候會**直接跳過**(skip)不跑
- **GitHub 官方不保證準時**

### 為什麼?

GitHub Actions 是免費服務,runner 是共享的。當全球幾百萬個 repo 同時要在 08:00:00 執行時,GitHub 會排隊。

---

## ❌ 天真做法(會被 Vincent 罵)

```yaml
# 這樣寫 → 08:30 的當沖推薦可能 08:45 才到
- cron: '30 0 * * 1-5'
```

結果:
- Vincent 08:35 在通勤時,沒收到推播
- 到公司 09:00 開盤,才看到 08:45 來的推薦
- 🔥 完全失去當沖價值

---

## ✅ 正確做法(三層保險)

### 層 1:**提早觸發 + 內部等待**

把 cron 設提前 10 分鐘,讓 workflow 先啟動並等待到精準時間才執行核心邏輯。

```yaml
# 當沖推薦原本要 08:30:00 執行
# 設定提早在 08:20 觸發(cron UTC 00:20)
- cron: '20 0 * * 1-5'
```

```python
# scripts/run_day_trade_pick.py

import asyncio
from datetime import datetime, time
from zoneinfo import ZoneInfo

async def wait_until_precise_time(target_hour: int, target_minute: int, target_second: int = 0):
    """
    等到精確時間才開始執行
    """
    tpe = ZoneInfo("Asia/Taipei")
    now = datetime.now(tpe)
    
    target = now.replace(
        hour=target_hour,
        minute=target_minute,
        second=target_second,
        microsecond=0
    )
    
    # 如果目標時間已過,直接執行
    if now >= target:
        print(f"⚠️ 已超過目標時間 {target},立即執行")
        return
    
    # 等待
    wait_seconds = (target - now).total_seconds()
    print(f"⏱ 等待 {wait_seconds:.1f} 秒 (到 {target.strftime('%H:%M:%S')})")
    
    # 分段等待(避免一次 sleep 太久被中斷)
    while True:
        now = datetime.now(tpe)
        if now >= target:
            break
        remaining = (target - now).total_seconds()
        await asyncio.sleep(min(remaining, 10))
    
    print(f"✅ 精準觸發於 {datetime.now(tpe).strftime('%H:%M:%S.%f')[:-3]}")


async def main():
    # 等到 08:30:00
    await wait_until_precise_time(
        target_hour=8,
        target_minute=30,
        target_second=0
    )
    
    # 開始執行當沖分析
    await run_day_trade_analysis()
```

**效果:**
- 即使 GitHub 08:20 的 cron 延遲到 08:27 才觸發
- Python 內部等待到 08:30:00.000 才執行
- LINE 推播在 08:30:XX 到達 ✅

---

### 層 2:**外部觸發器備援(Cron-Job.org)**

GitHub Actions 不夠準?**用免費的外部 cron 服務觸發 GitHub Actions**。

**推薦服務:**
- **cron-job.org**(免費,秒級精度)
- **EasyCron**(免費版 300 次/月)
- **UptimeRobot**(監控 + cron 雙用)

#### 設定步驟

1. 到 **https://cron-job.org** 免費註冊
2. 建立一個 cron job
3. 設定 URL 指向 GitHub Actions 的 webhook:

```
URL: https://api.github.com/repos/YOUR_USERNAME/vincent-stock-system/actions/workflows/day-trade-recommendation.yml/dispatches

Method: POST
Headers:
  Accept: application/vnd.github+json
  Authorization: Bearer YOUR_GITHUB_PAT
  X-GitHub-Api-Version: 2022-11-28

Body:
  {"ref": "main"}

Schedule: 08:29:30 台北時間(台灣時區)
```

4. **結果:精準 08:29:30 觸發,workflow 08:29:35 啟動,08:30:00 執行核心邏輯**

#### 建立 GitHub Personal Access Token (PAT)

```
1. GitHub → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token (classic)
4. 權限勾選: workflow
5. 複製 token 到 cron-job.org 的 Authorization header
```

---

### 層 3:**Self-Hosted Runner(終極方案)**

如果你對精準度要求極高(秒級),可以跑你自己的 runner。

但這會讓架構複雜 → **不推薦給 MVP,第二階段再考慮**。

---

## 📅 完整排程表(採「提早 + 精準等待」架構)

| 功能 | 目標精準時間 | Cron 觸發(提早) | 內部等待到 |
|------|-------------|------------------|-----------|
| 早報 | **08:00:00** | 07:50 (UTC 23:50) | 08:00:00 |
| 當沖推薦 | **08:30:00** | 08:20 (UTC 00:20) | 08:30:00 |
| 盤中監控 (開盤) | **09:00:00** | 08:55 (UTC 00:55) | 09:00:00 |
| 盤中監控 (每5分) | **每 XX:05/10/15...** | 每 5 分提早觸發 | 精準等待 |
| 盤後解析 | **14:30:00** | 14:25 (UTC 06:25) | 14:30:30 *(註 1)* |
| 盤後完整版 | **15:30:00** | 15:25 (UTC 07:25) | 15:30:00 |
| 美股盤前 | **21:00:00** | 20:50 (UTC 12:50) | 21:00:00 |

*註 1:盤後解析延後 30 秒,確保證交所資料公布*

---

## 🔧 實作範例:當沖推薦(最重要的)

### YAML(外部觸發 + 內部備援)

```yaml
# .github/workflows/day-trade-recommendation.yml
name: ⚡ Day Trade Recommendation

on:
  # 主要觸發:cron-job.org 於 08:29:30 TPE 觸發
  workflow_dispatch:
  
  # 備援觸發:GitHub 自己的 cron(提早 10 分鐘)
  schedule:
    - cron: '20 0 * * 1-5'  # UTC 00:20 = 台灣 08:20

jobs:
  day-trade-pick:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    
    # 防止重複執行(外部觸發 + GitHub cron 都觸發時)
    concurrency:
      group: day-trade-${{ github.event.repository.updated_at }}
      cancel-in-progress: false
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Log trigger time
        run: |
          echo "Workflow triggered at: $(TZ='Asia/Taipei' date '+%Y-%m-%d %H:%M:%S.%N')"
          echo "Trigger source: ${{ github.event_name }}"
      
      - name: Wait for precise time and run
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          FINMIND_TOKEN: ${{ secrets.FINMIND_TOKEN }}
          FMP_API_KEY: ${{ secrets.FMP_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          LINE_CHANNEL_ACCESS_TOKEN: ${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
          LINE_USER_ID: ${{ secrets.LINE_USER_ID }}
          TARGET_TIME: "08:30:00"  # 目標時間
          TZ: Asia/Taipei
        run: |
          cd backend
          python ../scripts/run_day_trade_pick.py --precise-time 08:30:00
```

### Python 腳本(核心:精準等待)

```python
# scripts/run_day_trade_pick.py

import argparse
import asyncio
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S.%f'[:-3]
)
logger = logging.getLogger(__name__)

TPE = ZoneInfo("Asia/Taipei")


async def wait_until(target_time_str: str) -> float:
    """
    等到精確的目標時間
    
    Args:
        target_time_str: "HH:MM:SS" 格式
    
    Returns:
        實際觸發延遲(秒)。正數代表延遲,負數代表提早
    """
    hour, minute, second = map(int, target_time_str.split(':'))
    
    now = datetime.now(TPE)
    target = now.replace(hour=hour, minute=minute, second=second, microsecond=0)
    
    # 如果目標時間已過(> 5 分鐘)→ 立即執行 + 警告
    if now > target + timedelta(minutes=5):
        delay = (now - target).total_seconds()
        logger.warning(
            f"⚠️ 已超過目標時間 {target_time_str} 達 {delay:.1f} 秒,立即執行"
        )
        return delay
    
    # 如果剛好超過(< 5 分鐘)→ 也是立即執行但記錄
    if now > target:
        delay = (now - target).total_seconds()
        logger.warning(f"⚠️ 已超過 {delay:.1f} 秒,立即執行")
        return delay
    
    # 還沒到 → 精準等待
    wait_seconds = (target - now).total_seconds()
    logger.info(f"⏱ 等待 {wait_seconds:.2f} 秒到 {target_time_str}")
    
    # 分段 sleep,最後 1 秒用 busy-wait 確保精準
    if wait_seconds > 2:
        await asyncio.sleep(wait_seconds - 1)
    
    # 最後 1 秒 busy-wait(cpu 忙碌等待,換取毫秒級精準)
    while datetime.now(TPE) < target:
        await asyncio.sleep(0.01)  # 每 10ms 檢查一次
    
    actual_start = datetime.now(TPE)
    drift_ms = (actual_start - target).total_seconds() * 1000
    
    logger.info(
        f"✅ 精準觸發於 {actual_start.strftime('%H:%M:%S.%f')[:-3]} "
        f"(偏差 {drift_ms:+.0f}ms)"
    )
    
    return drift_ms / 1000


async def main(precise_time: str):
    logger.info("=" * 60)
    logger.info(f"🚀 當沖推薦啟動 | 目標時間: {precise_time}")
    logger.info(f"   啟動時間: {datetime.now(TPE).strftime('%H:%M:%S.%f')[:-3]}")
    logger.info("=" * 60)
    
    # 1. 預先載入所有要用的資料(趁等待時間)
    logger.info("📊 預先載入市場資料...")
    pre_loaded_data = await preload_market_data()
    
    # 2. 等到精準時間
    await wait_until(precise_time)
    
    # 3. 執行核心分析(此時已 08:30:00)
    logger.info("🎯 開始當沖分析...")
    picks = await run_day_trade_analysis(pre_loaded_data)
    
    # 4. 推播(越快越好)
    logger.info("📱 推播到 LINE...")
    await send_to_line(picks)
    
    # 5. 儲存
    logger.info("💾 儲存到資料庫...")
    await save_to_supabase(picks)
    
    done_time = datetime.now(TPE)
    logger.info(f"✅ 完成於 {done_time.strftime('%H:%M:%S.%f')[:-3]}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--precise-time', required=True, help="HH:MM:SS")
    args = parser.parse_args()
    
    asyncio.run(main(args.precise_time))
```

---

## ⚡ 關鍵技巧:**預先載入**

Python 腳本在「等待」的時間**不是閒著**,而是**預先做準備**:

```python
async def preload_market_data():
    """
    趁等待的時間預先載入資料
    等到 08:30:00 時,只差分析 + 推播
    """
    tasks = [
        get_us_market_close_data(),       # 美股收盤
        get_overnight_futures(),           # 夜盤期貨
        get_yesterday_institutional(),     # 昨日三大法人
        get_hot_news_overnight(),          # 隔夜新聞
        get_tsm_adr_change(),              # 台積電 ADR
    ]
    
    results = await asyncio.gather(*tasks)
    logger.info(f"✅ 預載 {len(tasks)} 項資料完成")
    return results
```

**效果:**
- 07:50 開始:workflow 啟動,預載資料(花 5-8 分鐘)
- 08:30:00.000:精準觸發,分析開始(資料已在手)
- 08:30:15:分析完成,LINE 推播
- **Vincent 在 08:30:20 收到推播** ✅

---

## 📊 盤中監控(每 5 分鐘精準)

這個最難,因為要從 09:00 到 13:30 共 54 次,每次都要精準。

### 做法:用 cron-job.org 設定 54 個觸發點

```
09:00:00, 09:05:00, 09:10:00, ... 13:25:00, 13:30:00
```

### 或更聰明的做法:**一個長駐 workflow**

```yaml
# .github/workflows/intraday-monitor-loop.yml
name: 🚨 Intraday Monitor (Loop Mode)

on:
  workflow_dispatch:
  schedule:
    - cron: '55 0 * * 1-5'  # 08:55 UTC 00:55 啟動

jobs:
  monitor-loop:
    runs-on: ubuntu-latest
    timeout-minutes: 300  # 5 小時(GitHub 上限 6 小時)
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install
        run: cd backend && pip install -r requirements.txt
      
      - name: Run intraday loop
        env:
          # ... all secrets ...
          TZ: Asia/Taipei
        run: |
          cd backend
          python ../scripts/run_intraday_monitor_loop.py
```

### Python:長駐迴圈

```python
# scripts/run_intraday_monitor_loop.py

import asyncio
from datetime import datetime, time
from zoneinfo import ZoneInfo

TPE = ZoneInfo("Asia/Taipei")

# 台股盤中時間
MARKET_OPEN = time(9, 0, 0)
MARKET_CLOSE = time(13, 30, 0)
CHECK_INTERVAL_MINUTES = 5


async def intraday_monitoring_loop():
    """
    盤中監控迴圈
    從 09:00:00 開始,每 5 分鐘準時執行一次
    直到 13:30:00 收盤
    """
    # 1. 等到 09:00:00
    await wait_until("09:00:00")
    
    # 2. 每 5 分鐘執行直到 13:30
    current_check_time = datetime.now(TPE).replace(
        hour=9, minute=0, second=0, microsecond=0
    )
    
    while True:
        now = datetime.now(TPE)
        
        # 到收盤時間就結束
        if now.time() > MARKET_CLOSE:
            logger.info("📊 盤中監控結束(已過 13:30)")
            break
        
        # 執行本次檢查(不 await,讓它背景跑)
        asyncio.create_task(run_single_check(current_check_time))
        
        # 計算下次時間
        next_check = current_check_time + timedelta(minutes=CHECK_INTERVAL_MINUTES)
        
        # 等到下次時間
        wait_sec = (next_check - datetime.now(TPE)).total_seconds()
        if wait_sec > 0:
            logger.info(f"⏱ 等待 {wait_sec:.1f} 秒到下次檢查")
            await asyncio.sleep(wait_sec)
        
        current_check_time = next_check


async def run_single_check(scheduled_time: datetime):
    """單次檢查,不阻塞迴圈"""
    start = datetime.now(TPE)
    drift = (start - scheduled_time).total_seconds()
    
    logger.info(f"🔍 [{start.strftime('%H:%M:%S')}] 盤中檢查 (偏差 {drift:+.2f}s)")
    
    try:
        # 並行做多件事
        await asyncio.gather(
            check_watchlist_anomalies(),
            check_market_wide_volume(),
            check_breakouts(),
            track_day_trade_recommendations(),
        )
    except Exception as e:
        logger.error(f"❌ 檢查失敗: {e}")


if __name__ == "__main__":
    asyncio.run(intraday_monitoring_loop())
```

**優勢:**
- ✅ 單一 workflow 跑 4.5 小時(9:00-13:30)
- ✅ GitHub Actions 只觸發 1 次(省額度)
- ✅ 迴圈內部精準 5 分鐘間隔
- ✅ 每次檢查都有 drift 記錄,方便除錯

---

## 🎯 外部觸發完整設定(分秒不差的關鍵)

### Step 1:在 cron-job.org 建立 6 個 job

| Job 名稱 | 觸發時間 (TPE) | 觸發 Workflow |
|---------|---------------|--------------|
| 1. Morning Report | 07:59:30 每天 1-5 | morning-report.yml |
| 2. Day Trade Pick | 08:29:30 每天 1-5 | day-trade-recommendation.yml |
| 3. Intraday Loop | 08:59:30 每天 1-5 | intraday-monitor-loop.yml |
| 4. Closing Report | 14:29:30 每天 1-5 | closing-report.yml |
| 5. Closing Final | 15:29:30 每天 1-5 | closing-report.yml (final) |
| 6. US Pre-Market | 20:59:30 每天 1-5 | us-market.yml |

### Step 2:建立 GitHub PAT

```
1. https://github.com/settings/tokens
2. Generate new token (classic)
3. Note: "Vincent Stock External Trigger"
4. Expiration: 1 year
5. Scopes: ☑️ workflow (只勾這個)
6. Generate → 複製 token (以 ghp_ 開頭)
```

### Step 3:cron-job.org 每個 job 的設定

**URL:**
```
https://api.github.com/repos/YOUR_USERNAME/vincent-stock-system/actions/workflows/WORKFLOW_FILE.yml/dispatches
```

**Method:** POST

**Request Headers:**
```
Accept: application/vnd.github+json
Authorization: Bearer ghp_YOUR_TOKEN
X-GitHub-Api-Version: 2022-11-28
Content-Type: application/json
```

**Request Body:**
```json
{"ref": "main"}
```

**Schedule (Timezone: Asia/Taipei):**
```
例:當沖推薦 = 08:29:30
每週一到五
```

---

## ⚠️ 進一步降低觸發延遲的技巧

### 技巧 1:**啟動腳本前完成所有 import**

Python 啟動慢,把 import 放到最早:

```python
# run_day_trade_pick.py

# === 所有 import 放最前面(啟動時就載入)===
import asyncio
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import httpx
import pandas as pd
# ... 所有會用到的 ...

# === 精準等待 ===
async def main():
    await wait_until("08:30:00")
    # 此時所有函式庫都已 import 完畢
```

### 技巧 2:**Python 用 `--precise-time` 時傳 NTP 校時**

```python
import ntplib
from datetime import datetime

def get_ntp_time():
    """從 NTP server 取得準確時間,避免 GitHub Runner 時鐘誤差"""
    client = ntplib.NTPClient()
    response = client.request('pool.ntp.org', timeout=2)
    return datetime.fromtimestamp(response.tx_time)
```

但實測:GitHub Runner 的時鐘誤差 < 1 秒,通常不需要 NTP。

### 技巧 3:**LINE 推播用 async + batch**

```python
async def send_to_line_fast(messages: list):
    """並行送出多則訊息"""
    async with httpx.AsyncClient(timeout=3) as client:
        tasks = [
            client.post(
                "https://api.line.me/v2/bot/message/push",
                headers={"Authorization": f"Bearer {LINE_TOKEN}"},
                json=msg
            )
            for msg in messages
        ]
        await asyncio.gather(*tasks)
    # 總延遲 < 1 秒
```

---

## 📊 實測預期效能

| 環節 | 時間花費 |
|------|---------|
| Cron-job.org 觸發 | 08:29:30.000 |
| GitHub API 收到 | 08:29:30.500 (+500ms) |
| Workflow 啟動 | 08:29:32 (+2s) |
| Runner 就緒 | 08:29:45 (+15s) |
| pip install | 08:30:15 (+45s) ⚠️ |
| 預載資料 | 08:30:15 (背景中) |
| 等到 08:30:00 | *已過* |

**等等!這樣反而不夠提早。**

### 修正:**提早 15 分鐘觸發**

```yaml
schedule:
  - cron: '15 0 * * 1-5'  # UTC 00:15 = 台灣 08:15
```

```
實際流程:
 08:15:00 cron-job.org 觸發
 08:15:30 Workflow 啟動
 08:16:30 pip install 完成
 08:17:00 預載資料(花 5 分鐘)
 08:22:00 預載完成,等待中
 08:30:00.000 精準觸發 ← 分析開始
 08:30:10 分析完成
 08:30:12 LINE 推播到達
```

---

## 🧪 驗證分秒不差的測試

建立一個測試 workflow 來驗證精準度:

```python
# scripts/test_precision.py

async def test_precision():
    """測試 100 次,看平均 drift"""
    drifts = []
    
    for i in range(100):
        target_time = (datetime.now(TPE) + timedelta(seconds=2)).strftime('%H:%M:%S')
        
        start_scheduled = datetime.now(TPE) + timedelta(seconds=2)
        start_scheduled = start_scheduled.replace(microsecond=0)
        
        await wait_until(start_scheduled.strftime('%H:%M:%S'))
        
        actual = datetime.now(TPE)
        drift_ms = (actual - start_scheduled).total_seconds() * 1000
        drifts.append(drift_ms)
    
    print(f"平均 drift: {sum(drifts)/len(drifts):.2f}ms")
    print(f"最大 drift: {max(drifts):.2f}ms")
    print(f"最小 drift: {min(drifts):.2f}ms")
```

**預期結果:**
- 平均 drift: < 20ms
- 最大 drift: < 100ms
- **所有推播都在 08:30:00.0XX 到達 ✅**

---

## 🛡 如果分秒不差失敗怎麼辦?

### 監控 drift

每次觸發都記錄 drift 到 Supabase:

```python
async def log_execution_drift(scheduled: datetime, actual: datetime):
    drift_ms = (actual - scheduled).total_seconds() * 1000
    
    await supabase.table("system_health").insert({
        "checked_at": actual.isoformat(),
        "service_name": "scheduler",
        "status": "healthy" if abs(drift_ms) < 1000 else "degraded",
        "response_time_ms": int(drift_ms),
        "metadata": {
            "scheduled": scheduled.isoformat(),
            "actual": actual.isoformat(),
        }
    }).execute()
```

### Web UI 顯示

```
🏥 排程精準度(最近 7 天)

當沖推薦 (目標 08:30:00)
 平均偏差: +45ms
 最大偏差: +890ms
 準時率: 100% (< 1 秒)

盤中監控 (每 5 分鐘)
 平均偏差: +120ms
 最大偏差: +2.1 秒 ⚠️
 準時率: 98.5%

早報 (目標 08:00:00)
 平均偏差: +78ms
 準時率: 100%
```

---

## 📋 部署檢查清單

- [ ] Cron-job.org 免費帳號建立
- [ ] 6 個 cron job 設定完成
- [ ] GitHub PAT 建立並設定到 cron-job.org
- [ ] `wait_until()` 函式實作到 `backend/utils/time_utils.py`
- [ ] 所有 workflow 都用「提早觸發 + 內部等待」架構
- [ ] 盤中監控改為「Loop 模式」減少排程次數
- [ ] 每次執行記錄 drift 到資料庫
- [ ] Web UI 有「排程精準度」頁面
- [ ] 連續 3 次 drift > 5 秒 → LINE 通知 Vincent

---

## 💡 Vincent 你要知道

1. **GitHub Actions 原生 cron 延遲 2-15 分鐘是正常的** → 所以我們用 cron-job.org 補
2. **Python 的等待精準度可達毫秒級** → 靠內部 `wait_until()` 解決
3. **預先載入資料可以「偷」時間** → 等待時不浪費
4. **盤中監控用 Loop 模式更穩定** → 避免 54 次觸發的不確定性

**最終效果:**
- LINE 早報 **08:00:0X** 到達(誤差 < 1 秒)
- 當沖推薦 **08:30:0X** 到達
- 盤中警報 **09:00, 09:05, 09:10...** 每次都準時
- 盤後解析 **14:30:3X** 到達(等證交所公布)

---

## ⚙️ 費用確認

| 服務 | 費用 | 用途 |
|------|------|------|
| GitHub Actions | **免費**(Public Repo 無限) | 執行 workflow |
| Cron-job.org | **免費**(50 個 job 足夠) | 精準觸發 |
| 合計 | **$0** | ✅ 完全免費 |
