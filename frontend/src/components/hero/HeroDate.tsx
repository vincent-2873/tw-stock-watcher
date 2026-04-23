"use client";

import { useEffect, useState } from "react";

/**
 * Hero 日期 — 用瀏覽器時間計算,強制 Asia/Taipei
 * 鐵則 1(CLAUDE.md #1):不寫死日期,用 new Date()
 *
 * 格式:「Friday · April 23 · 2026 · 16:21 TPE」
 */
export function HeroDate() {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      // 強制 Asia/Taipei 拿欄位
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Taipei",
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(now);

      const get = (type: string) =>
        parts.find((p) => p.type === type)?.value ?? "";

      const weekday = get("weekday");
      const month = get("month");
      const day = get("day");
      const year = get("year");
      const hour = get("hour").padStart(2, "0");
      const minute = get("minute").padStart(2, "0");

      setText(
        `${weekday} · ${month} ${day} · ${year} · ${hour}:${minute} TPE`,
      );
    };

    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);

  // 第一次 render 在 SSR 時 text 是空字串,client hydrate 後立刻填入,避免 hydration mismatch
  return <span suppressHydrationWarning>{text || "\u00A0"}</span>;
}
