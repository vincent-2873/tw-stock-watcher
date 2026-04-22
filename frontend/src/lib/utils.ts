import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 依 CLAUDE.md 規則:信心度視覺 */
export function confidenceStyle(pct: number) {
  if (pct >= 90) return { emoji: "🔥", label: "極高", cls: "bg-emerald-600 text-white" };
  if (pct >= 75) return { emoji: "✅", label: "高", cls: "bg-emerald-400/20 text-emerald-700" };
  if (pct >= 60) return { emoji: "⚡", label: "中", cls: "bg-amber-400/20 text-amber-700" };
  if (pct >= 45) return { emoji: "⚠️", label: "低", cls: "bg-orange-400/20 text-orange-700" };
  return { emoji: "❓", label: "不可信", cls: "bg-neutral/20 text-neutral" };
}

/** 依 spec 17:時間顯示一律 TPE */
export function formatTpe(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return (
    d.toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " TPE"
  );
}
