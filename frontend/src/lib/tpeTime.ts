/**
 * 前端用 TPE 時區工具
 *
 * 為什麼存在(重構目的,非 bug 修復):
 *   某些 UI 瞬時邏輯(歡迎詞、session 判斷、右下浮鈕情緒)不值得 fetch backend,
 *   需要直接從 client 算 TPE 時間。
 *
 *   舊寫法「d.getTime() + d.getTimezoneOffset()*60000 + 8h」經 Chrome 實測
 *   在 LA / NY / UK / Tokyo / TPE 五個 timezone 都回傳正確 TPE 時分
 *   ——因為 offset 和 8h 在本地 getHours() 解讀時剛好互相抵消。
 *
 *   這是「脆弱的正確」:任何人讀要反覆算才懂,未來改動容易引入真 bug。
 *   本 util 用 Intl.DateTimeFormat 明確指定 `timeZone: "Asia/Taipei"`,
 *   意圖一看就知,無暗箱數學。
 *
 * 背景:
 *   - 原診斷見 `ceo-desk/logs/2026-04-24/23-29_REPORT_005_time_audit.md` 風險 #2
 *     (診斷當時說舊寫法「海外會錯」,經 2026-04-25 Chrome 實測證明該診斷錯誤)
 *   - 本重構仍值得保留: 可讀性、與 HeroDate.tsx 一致、防脆弱
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
