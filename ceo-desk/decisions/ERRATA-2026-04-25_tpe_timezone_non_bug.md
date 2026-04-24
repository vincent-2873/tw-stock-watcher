# ERRATA 2026-04-25 — 時區「bug」經實測證明非 bug

- **狀態**：已釐清（Clarified）
- **日期**：2026-04-25 00:05 TPE（backend 權威時鐘）
- **發現者**：Claude Code（於 Chrome 實測驗證時）

---

## 背景

2026-04-24 晚的時間稽核報告（[logs/2026-04-24/23-29_REPORT_005_time_audit.md](../logs/2026-04-24/23-29_REPORT_005_time_audit.md)）指出：

> **風險 #2**：前端 3 處用「手動 +8」推算 TPE — 對非 TPE 使用者有 bug
>
> 寫法：
> ```js
> const d = new Date();
> const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
> const tpe = new Date(utcMs + 8 * 3600 * 1000);
> ```
>
> 問題：這段邏輯實際上得到「使用者本地時刻當 TPE 用」— 對 TPE 使用者剛好正確，對非 TPE 使用者（美國/歐洲使用者）錯。

該診斷被列入 TODO，並派生出 hotfix commit `7c47213`（hotfix/tpe-timezone-overseas-2026-04-24，已 merge 到 main `61a28c9`）。

## 實測證據

2026-04-25 00:04 TPE，在 Chrome MCP 對 https://tw-stock-watcher.zeabur.app/ 執行 JS，模擬 5 個 timezone 執行舊算法：

```js
function hourInTZ(ms, tz) { /* Intl lookup */ }
const now = new Date().getTime();

function simulate(tzName, fakeOffsetMin) {
  const utcMs = now + fakeOffsetMin * 60000;
  const tpeMs = utcMs + 8 * 3600 * 1000;
  return hourInTZ(tpeMs, tzName);  // 該 tz 使用者的 getHours 會看到什麼
}
```

| Timezone | 舊算法回傳 | 實際 TPE 時間 | 相符 |
|---|---|---|---|
| LA (UTC-7 PDT, offset=420) | `00:04` | `00:04` | ✅ |
| NY (UTC-4 EDT, offset=240) | `00:04` | `00:04` | ✅ |
| UK (UTC+1 BST, offset=-60) | `00:04` | `00:04` | ✅ |
| Tokyo (UTC+9, offset=-540) | `00:04` | `00:04` | ✅ |
| TPE (UTC+8, offset=-480) | `00:04` | `00:04` | ✅ |

**結論：舊算法在每個 timezone 都回正確 TPE 時間**。診斷錯誤。

## 為什麼會誤判

舊算法數學拆解：
- `getTime()` = 真實 UTC ms
- `getTimezoneOffset()` = 分鐘數 O，`local = UTC - O`（TPE 是 `-480`，表示 TPE = UTC + 480min）
- `utcMs = UTC_ms + O*60000` = 把 UTC ms 先「加上 offset」
- `tpe = Date(utcMs + 8h)` = 再加 8h

讀者的直覺是「這在幹嘛？為什麼 offset 要加上去？」，但關鍵是後面 `.getHours()` 在 client 本地時區解讀——而本地時區解讀會把 offset **減回去**。所以 offset 先加、getHours 時減，互相抵消。剩下的只是「+8h」這個 TPE - UTC 的差。

公式推導（O = tz offset in min, H_utc = 真 UTC 時）：
```
tpe_ms_utc = H_utc + O + 8     (UTC hour of the Date object)
tpe.getHours() = tpe_ms_utc - O = H_utc + 8 = TPE hour
```

O 在頭尾抵消，結果 **任何 timezone 都是 TPE hour**。原診斷漏掉了 `.getHours()` 會再減一次 offset 的步驟。

## Hotfix 仍然保留的理由

雖然舊算法數學正確，本輪 hotfix（commit `7c47213`）仍然有價值：

1. **可讀性**：`Intl.DateTimeFormat({ timeZone: "Asia/Taipei" })` 一看就懂；舊寫法需要反覆推導才確信正確
2. **防脆弱**：舊寫法是「巧合的正確」——若未來有人「優化」這段 code（例如「+offset 好像沒必要」），會引入真 bug
3. **與 `HeroDate.tsx` 一致**：backend 時鐘走 Intl，本地時鐘若用不同寫法會顯得 codebase 不一致
4. **意圖明確**：檔名 `tpeTime.ts`、函式 `getTpeHourMinute()`、參數 `timeZone: "Asia/Taipei"` 都在宣告目的

**本重構屬於「正向 refactor」，不是 bug fix**。

## 更新動作

- ✅ 2026-04-25 00:05 TPE：更新 `frontend/src/lib/tpeTime.ts` comment，說明「重構目的，非 bug 修復」
- ✅ 2026-04-25 00:05 TPE：寫本 ERRATA
- 🟡 未來避免類似誤判的對策：**任何「推測性 bug」診斷，commit 前必須先在 Chrome 或 node repl 實測**

## 教訓（寫給未來的 Claude Code 與 CTO）

1. **推測 ≠ 驗證**。「這段看起來會錯」不等於「它真的錯了」
2. **數學直覺可能錯**。牽涉 timezone / date / float 的邏輯，都要跑實測
3. **誠實標註**。發現錯了就寫 ERRATA，不遮掩（憲法紅線「可以說不確定」）
4. **refactor 仍然有價值**。就算原 code 正確，難讀的 code 也值得重寫成意圖明確版本

---

**本 ERRATA 不撤銷 hotfix**，但修正 hotfix 的描述：
- 原 commit message：「hotfix(tpe): 前端 3 處時區改用 Intl 強制 Asia/Taipei,海外使用者安全」
- **修正後定位**：「refactor(tpe): 前端 3 處時區改用 Intl 強制 Asia/Taipei,可讀性提升」
- 未來 commit history 看到請對照本 ERRATA
