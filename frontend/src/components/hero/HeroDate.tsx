"use client";

import { useEffect, useState } from "react";

/**
 * Hero 日期 — 權威時間來自後端 /api/time/now
 *
 * 設計:
 * - 後端 Zeabur 已設 TZ=Asia/Taipei,時鐘可信
 * - 瀏覽器 client 時鐘可能錯誤(VM / 錯誤本地 TZ / BIOS UTC 混淆)
 * - 每 30 秒 poll 一次 /api/time/now 確保時間正確
 * - 中間秒數在 client 用 Date.now() 的「差值」推進(避免整分鐘跳動)
 *
 * 鐵則 1(CLAUDE.md):不寫死日期。時間一律 TPE。
 */

const API =
  process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

export function HeroDate() {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const r = await fetch(`${API}/api/time/now`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { hero_en?: string };
        if (!cancelled && j.hero_en) setText(j.hero_en);
      } catch {
        /* 靜默 — 保留上一次的值 */
      }
    };

    load();
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // SSR 第一次:顯示 non-breaking space 避免 layout jump
  return <span suppressHydrationWarning>{text || "\u00A0"}</span>;
}
