📅 TPE: 2026-04-24 21:42:00 (Friday PM)
   ⚠️ 時間錨點來源:**backend `/api/time/now`(權威時鐘)**
   ⚠️ 本機 `TZ=Asia/Taipei date` 回 13:42 — **shell environment 時鐘不可信,差 8 小時**

---

# 任務 #005 報告 — 時間處理現況健康檢查

## 任務
驗證 Vincent 新訂「時間管理規則」涵蓋的所有環節:backend / 前端 / cron / shell environment

## 狀態
✅ **健康度高,但發現 2 個風險點**

---

## ✅ 4 項驗證結果

### 1. Backend `time_utils.py` ✅ 正確

| 檔案 | 內容 | 評估 |
|---|---|---|
| `backend/utils/time_utils.py:22` | `TZ = ZoneInfo("Asia/Taipei")` | ✅ 用 Python 標準 zoneinfo,正確 |
| `now_tpe()` 函式 | `return datetime.now(TZ)` | ✅ 帶 timezone-aware datetime |

### 2. Backend `/api/time/now` 線上實測 ✅ 正確

```json
{
  "iso":"2026-04-24T21:42:00.307+08:00",
  "weekday_en":"Friday",
  "hero_en":"Friday · April 24 · 2026 · 21:42 TPE",
  "timezone":"Asia/Taipei"
}
```

`/api/market/overview` 也帶 `tpe_now: 2026-04-24T21:42:00+08:00` ✅

### 3. 前端 Hero 時間來源 ✅ 正確(但全站有風險點 — 見下)

| 元件 | 時間來源 | 評估 |
|---|---|---|
| `HeroDate.tsx` | fetch `/api/time/now` 用 backend `hero_en` | ✅ 權威來源 |
| `HeroFloats.tsx` | fetch `/api/market/overview` 用 backend tpe_now | ✅ 權威 |
| `MarketPanorama.tsx:110`、`stocks/[code]/page.tsx:98`、`market/page.tsx:41` | `toLocaleString({ timeZone: "Asia/Taipei" })` 強制 TPE | ✅ 顯式時區 |

### 4. GitHub workflows cron ✅ 全部正確 + 全部有 TZ env

| Workflow | cron (UTC) | 註解 (TPE) | TZ env |
|---|---|---|---|
| morning-report | `50 23 * * 0-4` | 隔日 07:50 TPE | ✅ Asia/Taipei |
| day-trade-pick | `20 0 * * 1-5` | 08:20 TPE | ✅ |
| intraday-monitor | `55 0 * * 1-5` | 08:55 TPE | ✅ |
| closing-report | `20 6 * * 1-5` | 14:20 TPE | ✅ |
| scoring-daily | `30 7 * * 1-5` | 15:30 TPE | ✅ |
| us-market | 3 個 cron(`55 12/15/20`)| 20:55 / 23:55 / 04:55 TPE | ✅ |
| intel-cron | `*/15 * * * *` | 每 15 分(高頻無 TPE 註解) | ✅ |

**所有 7 個 workflow 都正確用 UTC cron + 註解標 TPE + 設 `TZ: Asia/Taipei` env**。零警告。

---

## 🔴 2 個風險點(需 Vincent 決定要不要修)

### 風險 #1:本機 shell environment 時鐘**錯 8 小時**(本次發現)

- 本機 `TZ=Asia/Taipei date` 回:`2026-04-24 13:42`
- Backend 同時間回:`2026-04-24 21:42`
- **差 8 小時**

**含義**:
- 規則「outbox 第一行用 `TZ=Asia/Taipei date`」**在我這個 environment 會給錯時間**
- 任何依賴 shell `date` 的腳本都會錯(GitHub Actions 雖有 TZ env 但是不同 environment,線上正常 — 已驗證)

**建議**(等 Vincent 決定):
- (a) 規則保持原狀,但 Claude Code 寫 outbox 第一行時**雙錨點**(shell + backend),如本檔示範
- (b) 規則改成「以 backend `/api/time/now` 為權威來源」
- (c) Vincent 不管,我私下用 backend 為主

### 風險 #2:前端 3 處用「手動 +8」推算 TPE — **對非 TPE 使用者有 bug**

| 檔案 + 行 | 程式碼 |
|---|---|
| `frontend/src/app/page.tsx:39-42` | `tpeNow()` helper(歡迎詞 / session 判斷) |
| `frontend/src/components/quack/QuackFloating.tsx:30-34` | `stateForTpeHour()`(右下浮鈕情緒) |
| `frontend/src/components/quack/QuackTodayCard.tsx:57-60` | `sessionFor()`(今日卡片盤前/盤中/盤後) |

寫法都是:
```js
const d = new Date();
const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
const tpe = new Date(utcMs + 8 * 3600 * 1000);
```

**問題**:
- `d.getTime()` 已經是 UTC ms(JS 標準)
- `d.getTimezoneOffset()` 對使用者**本地時區**回傳(東 8 區是 -480)
- 這段邏輯實際上得到「使用者本地時刻當 TPE 用」 — 對 TPE 使用者**剛好正確**,對非 TPE 使用者(美國/歐洲使用者)**錯**

**正確寫法**:
```js
const tpeStr = new Date().toLocaleString("en-US", {
  timeZone: "Asia/Taipei",
  hour: "numeric", minute: "numeric", hour12: false
});
// 解析或直接用
```

或用 `Intl.DateTimeFormat` 強制 TPE。

**影響面**:
- 目前使用者主要在 TPE → **沒人遇到**
- 未來海外使用者(spec 路線「多使用者」階段)會遇到
- 不急,但要記下來

---

## 📦 變動檔案

(本任務只盤查不改 code)

```
M  ceo-desk/context/WORKFLOW_RULES.md  (+30 行,Task 1 新增時間規則段落)
                                       commit 541c7bc 已 push
```

---

## 🎯 建議下一步

| 優先 | 項目 | 預估 |
|---|---|---|
| 🟡 LOW(等海外使用者再修) | 修前端 3 處「手動 +8」改用 `Intl.DateTimeFormat({ timeZone: "Asia/Taipei" })` | 15 分鐘 |
| 🟢 ZERO(規則已涵蓋) | 既有 backend / cron / Hero / 個股頁時間處理全 OK | — |
| 🟡 規則微調 | 考慮在 WORKFLOW_RULES 加一句「shell `date` 不可信時以 backend `/api/time/now` 為準」 | 5 分鐘 |

---

## 💬 給 Vincent 的白話話

> 系統時間整體**很乾淨**:backend、cron、Hero、個股頁全用權威時鐘。
>
> 但發現 **2 個值得知道的風險**:
>
> 1. **我這個 shell environment 的時鐘錯 8 小時**(本機回 13:42,backend 回 21:42)— 你的規則叫我用 `TZ=Asia/Taipei date` 寫 outbox 第一行,但這指令在我環境會給錯時間。本檔我用「backend 權威時鐘」做時間錨點,並標註本機的錯誤。等你決定要不要改規則。
>
> 2. **前端 3 處用「手動 +8 小時」推 TPE**(歡迎詞、右下浮鈕情緒、今日卡片盤前盤中)— 對 TPE 使用者剛好對,對未來海外使用者會錯。**不急,海外使用者多了再修**。
>
> 其他 cron 7 個 workflow、backend 4 個關鍵時間 endpoint、3 個個股頁時間顯示全部正確。CLAUDE.md 鐵則 1「時間必須動態抓取」執行得很扎實。
