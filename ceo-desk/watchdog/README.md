# 🐺 System Watchdog

每 15 分鐘自動跑健康檢查的監控系統。

## 為什麼存在

依據 SYSTEM_CONSTITUTION Section 13.1：「**系統穩定度（不掛）**」是優先級 #1。

人類（Vincent / CTO）不可能每 15 分鐘手動檢查一次。
Watchdog 是「沉默的守門員」——平常不打擾，異常時留下足跡讓下一個 Claude Code session 接手。

## 怎麼跑

- **觸發**：`.github/workflows/watchdog.yml`，cron `*/15 * * * *`（每 15 分鐘）
- **執行**：`.github/scripts/watchdog.py`
- **環境**：GitHub Actions ubuntu-latest（不依賴 Vincent 電腦開機）

## 檢查什麼

| # | 檢查項 | 端點 / 對象 | 偵測什麼 |
|---|---|---|---|
| 1 | time | `/api/time/now` | 時鐘權威是否正常、TZ 是否 Asia/Taipei |
| 2 | finmind | `/api/diag/finmind` | FinMind 是否還是 Sponsor level 3 |
| 3 | market_overview | `/api/market/overview` | TAIEX / SOX / VIX 是否回真實值（Bug #3 regression monitor） |
| 4 | topics | `/api/topics` | 題材是否回非空（Bug #4 regression monitor） |
| 5 | chat_health | `/api/chat/health` | chat AI 健康狀態 |
| 6 | frontend | https://tw-stock-watcher.zeabur.app/ | 首頁 200 + 含品牌關鍵字 |
| 7 | resolver | `/api/diag/resolver` | stock resolver 載入狀態 |

## 產出

### 健康時
- `ceo-desk/watchdog/last_check.json`：每次都更新（記憶體中），但只在每小時 :00/:01 commit 到 main 一次（避免 commit 洪水）
- 不打擾任何人

### 異常時
- 寫入 `ceo-desk/watchdog/ANOMALIES.md` append 一段
- commit 到 main（自動，commit message 標 `[auto]`）
- 下次 Claude Code session 開始**應主動讀此檔**（憲法 Section 11.2 SOP 增補）

### 嚴重異常時（網路全死）
- workflow fail（GitHub 會發 email 通知 Vincent）

## 哲學紅線

- ❌ **絕不自動改 code / config / .env / migration**
- ❌ 絕不自動重啟 Zeabur / 重 build
- ❌ 絕不自動關閉 / 啟用功能
- ✅ **只記錄、只 commit log 檔案**
- ✅ 嚴重時叫人類來看

## 怎麼擴充

加新檢查：在 `watchdog.py` 加 `def check_xxx() -> dict` 然後 append 進 `main()` 的 `checks = [...]` list。

每個檢查回 `dict` 必含：`name / endpoint / status / latency_ms / anomaly / sample`。
`anomaly` 為 None 表健康，為字串表異常描述。

## 手動觸發

GitHub → Actions → 🐺 System Watchdog → Run workflow

## 本機測試

```bash
cd <專案根>
python .github/scripts/watchdog.py
```

## 相關檔案

- `.github/workflows/watchdog.yml` — schedule + commit 邏輯
- `.github/scripts/watchdog.py` — 檢查邏輯
- `ceo-desk/watchdog/last_check.json` — 最近一次結果
- `ceo-desk/watchdog/ANOMALIES.md` — 異常累積紀錄

---

**版本**：v1.0
**建立**：2026-04-25
**設計者**：Claude Code（Vincent 授權「自動化偵錯除錯」）
