# 🚀 部署完整步驟指南

> 從零到系統上線,照這個順序做

---

## 📋 完整流程總覽

```
Day 1:準備環境(1 小時)
 1. 申請 API Keys
 2. 建立 GitHub Repo
 3. 建立 Supabase 專案
 4. 測試 API

Day 2-14:開發(Phase 1-2)
 5. 啟動 Claude Code
 6. 完成地基建設
 7. 完成核心決策

Day 15-30:自動化(Phase 3)
 8. 設定 GitHub Actions
 9. 測試所有排程
 10. 上線 LINE 通知

Day 31-60:前端(Phase 4)
 11. 開發 Web UI
 12. 部署到 Zeabur

Day 61+:優化(Phase 5+)
 13. 進階功能
 14. 持續迭代
```

---

## Day 1:準備環境

### Step 1:申請所有 API Keys

照 `specs/08_api_keys.md` 逐一申請。

**驗證:** 跑 `scripts/test_all_apis.py` 全部 ✅

---

### Step 2:建立 GitHub Repo

```bash
# 1. 在本機建立資料夾
mkdir vincent-stock-system
cd vincent-stock-system

# 2. 初始化 git
git init

# 3. 把我給你的規格檔放進來
# (解壓縮我給的 zip 到這裡)

# 4. 建立 .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
venv/
.venv/

# Node
node_modules/
.next/
out/

# IDE
.vscode/
.idea/

# 環境變數
.env
.env.local

# 日誌
logs/
*.log

# 備份
backups/

# macOS
.DS_Store

# 資料快取
.cache/
EOF

# 5. 提交
git add .
git commit -m "初始化專案,加入規格文件"

# 6. 在 GitHub 建立 Repo(透過網頁)
# 名稱:vincent-stock-system
# 類型:Public(Actions 免費無限)

# 7. 推送
git remote add origin https://github.com/YOUR_USERNAME/vincent-stock-system.git
git branch -M main
git push -u origin main
```

---

### Step 3:設定 GitHub Secrets

到 Repo → Settings → Secrets → New secret,加入所有 keys(見 `specs/08_api_keys.md`)。

---

### Step 4:建立 Supabase 資料庫

1. 登入 https://app.supabase.com
2. 建立專案
3. SQL Editor → 貼上 `schemas/supabase_schema.sql`
4. Run
5. 確認有 12 個表格

---

## Day 2-14:開發 Phase 1-2

### Step 5:啟動 Claude Code

```bash
# 安裝 Claude Code
npm install -g @anthropic-ai/claude-code

# 進入專案
cd vincent-stock-system

# 啟動
claude
```

### Step 6:給 Claude Code 第一個任務

```
👤 你跟 Claude Code 說:

請先讀 CLAUDE.md,然後依照 Phase 1 的清單開始做。

特別注意:
1. 每完成一個檢查項目,請跟我回報
2. 不確定的地方,問我再繼續
3. 不要偷懶跳過測試
```

### Step 7:Claude Code 會做的事

Phase 1 完成後,你應該有:
- ✅ 完整資料夾結構
- ✅ 可運作的 FinMind / FMP 服務
- ✅ Supabase 連線正常
- ✅ 可抓取鴻海(2317)資料

**驗收指令:**
```bash
cd backend
python -c "
from services.finmind_service import FinMindService
import asyncio

async def test():
    service = FinMindService()
    data = await service.get_stock_price('2317', '2026-04-01', '2026-04-22')
    print(f'✅ 抓到 {len(data)} 筆資料')

asyncio.run(test())
"
```

---

### Step 8:Phase 2 - 核心決策

```
👤 你跟 Claude Code 說:

Phase 1 完成了,現在開始 Phase 2。
重點是把 specs/01_decision_engine.md 實作出來。

完成後,我要能用這個指令測試:
python -c "from core.decision_engine import analyze; analyze('2317')"

並且看到完整的分析報告(含信心度、多空、停損停利)。
```

---

## Day 15-30:自動化 Phase 3

### Step 9:設定 GitHub Actions

Claude Code 會依照 `specs/07_github_actions.md` 建立:

```
.github/workflows/
├── morning-report.yml
├── day-trade-recommendation.yml
├── intraday-monitor.yml
├── closing-report.yml
├── us-market.yml
├── health-check.yml
└── daily-backup.yml
```

### Step 10:測試 Workflow

```bash
# 手動觸發測試(不等排程)
1. GitHub Repo → Actions
2. 選 "Morning Report"
3. Run workflow
4. 等幾分鐘
5. 檢查:
   - Actions 執行成功嗎?
   - LINE 收到訊息嗎?
   - Supabase 有資料嗎?
```

### Step 11:第一次自動化成功!

**指標:**
- 明天 08:00 自動收到早報
- 08:30 自動收到當沖推薦
- 盤中收到警報
- 14:30 自動收到盤後

如果都有,恭喜,**系統已經活了!** 🎉

---

## Day 31-60:前端 Phase 4

### Step 12:開發 Next.js 前端

```
👤 你跟 Claude Code 說:

Phase 3 完成,排程都能跑了。
現在開始 Phase 4,依照 specs/05_ui_design.md 做前端。

優先順序:
1. Dashboard 首頁
2. 自選股頁(最常用)
3. 個股詳細頁
4. 當沖推薦頁
5. 盤後報告
6. 設定頁
```

### Step 13:本機測試

```bash
cd frontend
npm install
npm run dev

# 打開 http://localhost:3000
```

### Step 14:部署到 Zeabur

1. Zeabur → New Project
2. 連結 GitHub Repo
3. 選 frontend 資料夾
4. 設定環境變數:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   NEXT_PUBLIC_API_URL
   ```
5. Deploy

### Step 15:綁定網域(可選)

```
如果你想用自己的網域:
1. Zeabur → Domain
2. 加入 vincent.stock.com
3. 設定 DNS CNAME
```

---

## 🎯 驗收清單

每個 Phase 結束後確認:

### Phase 1 完成
- [ ] 所有 API 能成功呼叫
- [ ] Supabase 有資料
- [ ] logs 能正常寫入
- [ ] 測試全過

### Phase 2 完成
- [ ] 能分析任一檔股票
- [ ] 輸出含完整 evidence
- [ ] 信心度計算正確
- [ ] 多空論點平衡

### Phase 3 完成
- [ ] 5 個 workflow 都能跑
- [ ] LINE 通知正常
- [ ] 失敗有自動通知
- [ ] 所有排程時間正確

### Phase 4 完成
- [ ] 手機、電腦都能看
- [ ] 所有頁面響應式正常
- [ ] 資料即時更新
- [ ] 已部署到 Zeabur

### Phase 5 進階
- [ ] 有回測功能
- [ ] 有績效追蹤
- [ ] 系統自我監控
- [ ] 資料流分析

---

## 🆘 常見問題

### Q1:Claude Code 一直問問題,我不知道怎麼回答?

**答:** 優先回答關鍵問題,其他說「你判斷」:

```
❌ 不好的回答:
"我不知道,你決定"(太籠統)

✅ 好的回答:
"這個功能先做簡單版,MVP 能跑就好"
"這個按你的最佳判斷"
"保持簡單,不要過度設計"
```

### Q2:GitHub Actions 執行失敗怎麼辦?

**檢查順序:**
1. Actions → 失敗的 workflow → 看 log
2. 是不是某個 Secret 沒設定?
3. 是不是 API 超時?
4. 是不是節假日?(台股不開市)

### Q3:LINE 收不到訊息?

```bash
# 手動測試 LINE API
curl -X POST https://api.line.me/v2/bot/message/push \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_USER_ID",
    "messages": [{"type":"text","text":"測試"}]
  }'

# 200 → LINE 設定正確
# 401 → Token 錯誤
# 400 → User ID 錯誤
```

### Q4:Supabase 連不上?

```bash
# 測試連線
python -c "
from supabase import create_client
client = create_client(
    'YOUR_URL',
    'YOUR_SERVICE_KEY'
)
result = client.table('stocks').select('count').execute()
print(result)
"
```

### Q5:Claude Code 生成的程式碼怪怪的?

```
跟 Claude Code 說:
"這段程式碼有問題:__說明__
 請依照 specs/01_decision_engine.md 的規格重寫"

或:
"這不符合我們在 CLAUDE.md 定義的規則
 請遵守規則 X 後再做"
```

---

## 📊 成功指標

系統上線 30 天後,你應該:

### 使用情況
- 每天早上 08:00 收到 LINE 早報
- 每天 08:45 收到當沖推薦
- 盤中 5-15 則警報
- 每天 14:35 收到盤後報告

### 資料累積
- `recommendations` 表有 100+ 筆建議
- `alerts` 表有 200+ 筆警報
- `reports` 表有 30 天完整紀錄

### 學到的東西
- 知道哪類股票系統準確率高
- 知道系統哪些維度分析強
- 知道自己跟單 vs 不跟單的差異

---

## 🔄 上線後的維運

### 每週
- 檢查系統健康度
- 查看本週績效
- 調整設定(如需要)

### 每月
- 備份資料庫
- 更新 API Key(如過期)
- 檢視系統成本

### 每季
- 深度檢討系統表現
- 新增功能
- 升級服務方案(如需要)

---

## 🎓 給 Vincent 的最後叮嚀

### 1. 不要追求完美才上線

**MVP 版本上線 → 邊用邊改**

很多功能你用了才知道需不需要,先把系統跑起來。

### 2. 不要自動執行交易

**「半自動」是安全的平衡點:**
- 系統分析
- 系統推薦
- 你確認
- 你下單

### 3. 記得記錄你的反應

系統會追蹤「你跟單 vs 拒絕」,
**越用越準,越用越懂你**。

所以每個推薦都要留下你的反應:
- ✅ 跟單
- ❌ 拒絕(原因:...)
- ⏸ 觀望

### 4. 記得看「系統績效」頁

每月至少看一次:
- 系統準確率如何?
- 跟單的比沒跟單的賺多少?
- 系統強項在哪?

這是「從系統學習」的關鍵。

### 5. 不要把系統當神

系統有信心度 75% 的建議,
代表 25% 機會是錯的。

**你的判斷 > 系統的判斷**

系統是工具,不是老師。
但用久了,你會變成自己的老師。

---

## 📞 遇到問題找誰?

### Claude Code 相關
- 官方文件:https://docs.claude.com/en/docs/claude-code
- Discord:https://discord.gg/anthropic

### 金融資料問題
- FinMind:support@finmindtrade.com
- FMP:support@fmpcloud.io

### 部署問題
- Supabase:Discord / GitHub Issues
- Zeabur:官方 Discord

### 真的卡住了?
開個新的 Claude 對話,貼上錯誤訊息與你的 CLAUDE.md,請它幫你診斷。

---

**祝你開發順利,變成會判斷的投資人!** 🚀
