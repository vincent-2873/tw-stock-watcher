/**
 * 前端用 TPE 時區工具
 *
 * 為什麼存在:
 *   某些 UI 瞬時邏輯(歡迎詞、session 判斷、右下浮鈕情緒)不值得 fetch backend,
 *   但舊程式碼用「手動 +8 小時」推算 TPE — 那段邏輯其實是拿「使用者本地時」
 *   當 TPE 用,對 TPE 使用者剛好對,對海外使用者(美歐)會錯。
 *
 * 正解:用 Intl.DateTimeFormat 明確指定 `timeZone: "Asia/Taipei"`,
 *       無論使用者在哪個時區都拿到真正的 TPE 時分。
 *
 * 背景紀錄:
 *   - `CURRENT_STATE.md` 技術債清單
 *   - `ceo-desk/logs/2026-04-24/23-29_REPORT_005_time_audit.md` 風險 #2
 */

const _FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Taipei",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * 拿當下在 Asia/Taipei 的 [hour, minute]。
 * 海外使用者也正確。
 */
export function getTpeHourMinute(now: Date = new Date()): [number, number] {
  const parts = _FMT.formatToParts(now);
  const hStr = parts.find((p) => p.type === "hour")?.value ?? "0";
  const mStr = parts.find((p) => p.type === "minute")?.value ?? "0";
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  // Intl 回 "24" 代表午夜(部分 locale),保險起見 mod 24
  return [h % 24, m];
}

/**
 * 拿當下在 Asia/Taipei 的分鐘數(0-1439),方便做時段判斷。
 */
export function getTpeMinuteOfDay(now: Date = new Date()): number {
  const [h, m] = getTpeHourMinute(now);
  return h * 60 + m;
}
