"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useStockPriceFlash — Phase 3 C2 股價亮燈 hook
 *
 * 給定一個「當下價格」(由外部 polling 或 websocket 餵入),回傳一個 class 字串:
 *   - stock-flash-up    紅色 0.8s fade(上漲)
 *   - stock-flash-down  綠色 0.8s fade(下跌)
 *   - 空字串            (初次、未變)
 *
 * 對應 CSS 在 globals.css
 */
export function useStockPriceFlash(currentPrice: number | null | undefined) {
  const [flashClass, setFlashClass] = useState("");
  const prev = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentPrice == null || Number.isNaN(currentPrice)) return;
    if (prev.current == null) {
      prev.current = currentPrice;
      return;
    }
    if (currentPrice === prev.current) return;

    const up = currentPrice > prev.current;
    setFlashClass(up ? "stock-flash-up" : "stock-flash-down");
    prev.current = currentPrice;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlashClass(""), 800);

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [currentPrice]);

  return flashClass;
}

/**
 * 漲跌停 / 爆量 class 輔助 — 不用 hook,直接從數值決定
 *
 *   getLimitClass({ changePct: 10, limitUpPct: 10 }) → 'stock-limit-up'
 *   getVolumeBurstClass({ volRatio: 2.5 })           → 'stock-volume-burst'
 */
export function getLimitClass(opts: {
  changePct: number | null | undefined;
  limitUpPct?: number; // 台股 10%,上市興櫃可能不同
  tolerance?: number;
}) {
  const { changePct, limitUpPct = 10, tolerance = 0.05 } = opts;
  if (changePct == null) return "";
  if (changePct >= limitUpPct - tolerance) return "stock-limit-up";
  if (changePct <= -(limitUpPct - tolerance)) return "stock-limit-down";
  return "";
}

export function getVolumeBurstClass(opts: {
  volRatio: number | null | undefined; // 當日成交量 / 5 日均量
  threshold?: number;
}) {
  const { volRatio, threshold = 2 } = opts;
  if (volRatio == null) return "";
  return volRatio >= threshold ? "stock-volume-burst" : "";
}
