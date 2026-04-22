# ⚙️ GitHub Actions 完整規格

> 5 個自動化 workflow 的完整 YAML 檔

---

## 前置準備

### 需要設定的 GitHub Secrets

到 GitHub Repo → Settings → Secrets and variables → Actions → New secret,加入:

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
FINMIND_TOKEN
FMP_API_KEY
NEWS_API_KEY
ANTHROPIC_API_KEY
LINE_CHANNEL_ACCESS_TOKEN
LINE_USER_ID
GMAIL_USER
GMAIL_APP_PASSWORD
```

---

## Workflow 1:早報(08:00)

**檔案:** `.github/workflows/morning-report.yml`

```yaml
name: 📅 Morning Report

on:
  schedule:
    # 台灣時間 08:00 = UTC 00:00
    - cron: '0 0 * * 1-5'  # 週一到週五
  workflow_dispatch:  # 允許手動觸發(測試用)

jobs:
  generate-report:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
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
      
      - name: Run morning report
        id: morning-report
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          FINMIND_TOKEN: ${{ secrets.FINMIND_TOKEN }}
          FMP_API_KEY: ${{ secrets.FMP_API_KEY }}
          NEWS_API_KEY: ${{ secrets.NEWS_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          LINE_CHANNEL_ACCESS_TOKEN: ${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
          LINE_USER_ID: ${{ secrets.LINE_USER_ID }}
          TZ: Asia/Taipei
        run: |
          cd backend
          python ../scripts/run_morning_report.py
      
      - name: Notify on failure
        if: failure()
        env:
          LINE_TOKEN: ${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
          LINE_USER_ID: ${{ secrets.LINE_USER_ID }}
        run: |
          curl -X POST https://api.line.me/v2/bot/message/push \
            -H "Authorization: Bearer $LINE_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
              \"to\": \"$LINE_USER_ID\",
              \"messages\": [{
                \"type\": \"text\",
                \"text\": \"🚨 早報產生失敗\n\n時間: $(date '+%Y-%m-%d %H:%M')\n\n系統將在下次排程重試,或可以到 Web 查看\"
              }]
            }"
      
      - name: Log execution
        if: always()
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: |
          python scripts/log_workflow_result.py \
            --workflow morning_report \
            --status ${{ job.status }} \
            --run-id ${{ github.run_id }}
```

---

## Workflow 2:當沖推薦(08:30-09:00)

**檔案:** `.github/workflows/day-trade-recommendation.yml`

```yaml
name: ⚡ Day Trade Recommendation

on:
  schedule:
    # 台灣時間 08:30 = UTC 00:30
    - cron: '30 0 * * 1-5'
  workflow_dispatch:

jobs:
  day-trade-pick:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Check market safety first
        id: safety-check
        env:
          # ... secrets ...
          FMP_API_KEY: ${{ secrets.FMP_API_KEY }}
        run: |
          python scripts/check_market_safety.py
      
      - name: Run day trade analysis
        if: steps.safety-check.outputs.safe == 'true'
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          FINMIND_TOKEN: ${{ secrets.FINMIND_TOKEN }}
          FMP_API_KEY: ${{ secrets.FMP_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          LINE_CHANNEL_ACCESS_TOKEN: ${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
          LINE_USER_ID: ${{ secrets.LINE_USER_ID }}
          TZ: Asia/Taipei
        run: |
          cd backend
          python ../scripts/run_day_trade_pick.py
      
      - name: Send skip notification
        if: steps.safety-check.outputs.safe == 'false'
        env:
          LINE_TOKEN: ${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
          LINE_USER_ID: ${{ secrets.LINE_USER_ID }}
        run: |
          curl -X POST https://api.line.me/v2/bot/message/push \
            -H "Authorization: Bearer $LINE_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
              \"to\": \"$LINE_USER_ID\",
              \"messages\": [{
                \"type\": \"text\",
                \"text\": \"⚠️ 今日市場環境不佳,暫停當沖推薦\n\n原因: ${{ steps.safety-check.outputs.reason }}\n\n建議今日觀望\"
              }]
            }"
      
      - name: Notify on error
        if: failure()
        run: |
          # ... 錯誤通知 ...
```

---

## Workflow 3:盤中監控(09:00-13:30,每 5 分鐘)

**檔案:** `.github/workflows/intraday-monitor.yml`

```yaml
name: 🚨 Intraday Monitor

on:
  schedule:
    # 台灣時間 09:00-13:30,每 5 分鐘
    # UTC 時間:01:00-05:30
    # 注意:GitHub Actions 的 cron 最小間隔是 5 分鐘
    - cron: '*/5 1-5 * * 1-5'
    # 最後一次:13:30 (UTC 05:30)
    - cron: '30 5 * * 1-5'
  workflow_dispatch:

jobs:
  monitor:
    runs-on: ubuntu-latest
    timeout-minutes: 4  # 必須 < 5 分鐘(下一次排程前完成)
    
    # 並行限制:同一時間只跑一個
    concurrency:
      group: intraday-monitor
      cancel-in-progress: false
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install (fast cached)
        run: |
          cd backend
          pip install -r requirements.txt --quiet
      
      - name: Run intraday monitor
        env:
          # ... all secrets ...
          TZ: Asia/Taipei
        run: |
          cd backend
          python ../scripts/run_intraday_monitor.py
      
      # 盤中不通知失敗,只記錄(避免打擾)
      - name: Silent log on failure
        if: failure()
        run: |
          echo "Intraday monitor failed at $(date)" >> .logs/intraday_errors.log
          # 連續失敗 3 次才通知(避免偶發錯誤騷擾)
```

---

## Workflow 4:盤後解析(14:30)

**檔案:** `.github/workflows/closing-report.yml`

```yaml
name: 📊 Closing Report

on:
  schedule:
    # 台灣時間 14:30 = UTC 06:30
    - cron: '30 6 * * 1-5'
    # 15:30 再跑一次(確保分點資料都到齊)
    - cron: '30 7 * * 1-5'
  workflow_dispatch:

jobs:
  closing-report:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Wait for market data (first run only)
        if: github.event.schedule == '30 6 * * 1-5'
        run: sleep 300  # 等 5 分鐘確保資料公布
      
      - name: Run closing report
        env:
          # ... all secrets ...
          TZ: Asia/Taipei
          REPORT_TYPE: ${{ github.event.schedule == '30 7 * * 1-5' && 'final' || 'preliminary' }}
        run: |
          cd backend
          python ../scripts/run_closing_report.py --type $REPORT_TYPE
      
      - name: Notify on failure
        if: failure()
        # ... 通知邏輯 ...
```

---

## Workflow 5:美股追蹤(21:00-05:00)

**檔案:** `.github/workflows/us-market.yml`

```yaml
name: 🌏 US Market Tracker

on:
  schedule:
    # 美股盤前(台灣 21:00)
    - cron: '0 13 * * 1-5'  # UTC 13:00
    # 美股開盤後 30 分鐘(台灣 22:00)
    - cron: '0 14 * * 1-5'
    # 美股盤中(台灣 23:00, 01:00, 03:00)
    - cron: '0 15 * * 1-5'
    - cron: '0 17 * * 2-6'  # 跨日
    - cron: '0 19 * * 2-6'
    # 美股收盤(台灣 04:00)
    - cron: '0 20 * * 2-6'
  workflow_dispatch:

jobs:
  us-market:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Determine event type
        id: event
        run: |
          HOUR=$(date -u +%H)
          if [ "$HOUR" == "13" ]; then
            echo "type=pre_market" >> $GITHUB_OUTPUT
          elif [ "$HOUR" == "14" ]; then
            echo "type=opening" >> $GITHUB_OUTPUT
          elif [ "$HOUR" == "20" ]; then
            echo "type=closing" >> $GITHUB_OUTPUT
          else
            echo "type=intraday" >> $GITHUB_OUTPUT
          fi
      
      - name: Run US market tracker
        env:
          # ... secrets ...
          EVENT_TYPE: ${{ steps.event.outputs.type }}
        run: |
          cd backend
          python ../scripts/run_us_market.py --event $EVENT_TYPE
```

---

## Workflow 6:系統健康度檢查

**檔案:** `.github/workflows/health-check.yml`

```yaml
name: 🏥 Health Check

on:
  schedule:
    - cron: '*/15 * * * *'  # 每 15 分鐘
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    timeout-minutes: 3
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Run health check
        env:
          # ... secrets ...
        run: |
          cd backend
          python ../scripts/health_check.py
      
      - name: Alert on critical
        if: failure()
        env:
          LINE_TOKEN: ${{ secrets.LINE_CHANNEL_ACCESS_TOKEN }}
          LINE_USER_ID: ${{ secrets.LINE_USER_ID }}
        run: |
          curl -X POST https://api.line.me/v2/bot/message/push \
            -H "Authorization: Bearer $LINE_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
              \"to\": \"$LINE_USER_ID\",
              \"messages\": [{
                \"type\": \"text\",
                \"text\": \"🚨 系統健康度警報\n\n有關鍵服務異常,請到 Web 查看\n\n時間: $(date '+%Y-%m-%d %H:%M')\"
              }]
            }"
```

---

## Workflow 7:每日備份(凌晨 02:00)

**檔案:** `.github/workflows/daily-backup.yml`

```yaml
name: 💾 Daily Backup

on:
  schedule:
    - cron: '0 18 * * *'  # UTC 18:00 = 台灣 02:00
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Backup Supabase
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: |
          python scripts/backup_supabase.py
      
      - name: Upload to GitHub Releases
        uses: softprops/action-gh-release@v1
        with:
          tag_name: backup-${{ github.run_number }}
          files: backups/*.sql.gz
          make_latest: false
```

---

## Cron 時間對照表

```
排程                     UTC            台灣 (UTC+8)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
早報                     00:00          08:00
當沖推薦                  00:30          08:30
盤中監控                  01:00-05:30    09:00-13:30 (每5分)
盤後解析(初)             06:30          14:30
盤後解析(完整)           07:30          15:30
美股盤前                  13:00          21:00
美股開盤                  14:00          22:00
美股盤中                  15:00-19:00    23:00-03:00
美股收盤                  20:00          04:00
每日備份                  18:00          02:00
健康度檢查                每 15 分鐘        每 15 分鐘
```

---

## 手動觸發(測試用)

每個 workflow 都有 `workflow_dispatch`,讓 Vincent 可以手動跑:

```
1. 進入 GitHub Repo
2. 點 Actions 分頁
3. 選 workflow(如:Morning Report)
4. 點 "Run workflow"
5. 選 main 分支 → Run
```

---

## 失敗處理策略

### 連續失敗升級

```python
# scripts/check_consecutive_failures.py

def check_and_escalate(workflow_name: str):
    """
    連續失敗 3 次 → 升級為 CRITICAL
    連續失敗 5 次 → 暫停該 workflow
    """
    recent = get_recent_workflow_runs(workflow_name, limit=5)
    consecutive_failures = count_consecutive_failures(recent)
    
    if consecutive_failures >= 5:
        # 暫停並發 CRITICAL 通知
        disable_workflow(workflow_name)
        send_critical_alert(
            f"🚨 {workflow_name} 連續失敗 5 次,已自動暫停"
        )
    elif consecutive_failures >= 3:
        # 升級通知
        send_high_alert(
            f"⚠️ {workflow_name} 連續失敗 {consecutive_failures} 次"
        )
```

---

## 成本控制

### GitHub Actions 免費額度(Public Repo)

- **Public Repo**:完全免費無限
- **Private Repo**:每月 2,000 分鐘(夠用)

### 我們的預估用量

```
早報:10 分鐘/天 × 22 天 = 220 分鐘
當沖推薦:15 分鐘/天 × 22 天 = 330 分鐘
盤中監控:3 分鐘 × 54 次 × 22 天 = 3,564 分鐘 ⚠️ 超出
盤後解析:10 分鐘 × 22 天 × 2 次 = 440 分鐘
美股追蹤:10 分鐘 × 6 次 × 22 天 = 1,320 分鐘
健康度:2 分鐘 × 96 次/天 × 30 天 = 5,760 分鐘 ⚠️ 超出
備份:30 分鐘 × 30 天 = 900 分鐘

合計:~12,534 分鐘/月
```

### 解決方案:

**方案 A:**用 Public Repo(免費無限)
- 優點:完全免費
- 缺點:程式碼公開(但 secrets 還是安全)

**方案 B:**付費 GitHub(~$4/月)
- 每月 3,000 分鐘

**方案 C:**降低頻率
- 盤中改為 10 分鐘一次
- 健康度改為 30 分鐘一次
- 就能壓進 2,000 分鐘

**推薦方案 A** + 把 .env.example 做好,實際 secrets 放在 GitHub Secrets(加密儲存,不公開)
