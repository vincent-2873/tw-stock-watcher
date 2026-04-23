"use client";

import { useEffect, useState } from "react";
import styles from "../../app/page.module.css";

/**
 * Hero 右側呱呱圓圈旁的 4 個浮動數字
 * 由 /api/market/overview 提供即時資料,不再寫死
 */

const API =
  process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

type Overview = {
  taiex?: { close?: number; day_change?: number; day_change_pct?: number };
  futures_tx?: { close?: number; day_change?: number; day_change_pct?: number };
  us?: Record<
    string,
    { label?: string; price?: number; change?: number; changes_pct?: number }
  >;
};

function fmtNum(n?: number | null, d = 0) {
  if (n == null) return "—";
  return n.toLocaleString("zh-TW", { maximumFractionDigits: d });
}

function fmtPct(n?: number | null) {
  if (n == null) return "—";
  const s = n > 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

export function HeroFloats() {
  const [d, setD] = useState<Overview | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/market/overview`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as Overview;
        if (!cancelled) setD(j);
      } catch {
        /* silent */
      }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const taiex = d?.taiex?.close;
  const futures = d?.futures_tx?.close;
  const sox = d?.us?.["^SOX"]?.changes_pct;
  const vix = d?.us?.["^VIX"]?.price;

  return (
    <>
      <span className={`${styles.floatNum} ${styles.floatN1}`}>
        TAIEX <span className="num">{fmtNum(taiex, 0)}</span>
      </span>
      <span className={`${styles.floatNum} ${styles.floatN2}`}>
        VIX <span className="num">{fmtNum(vix, 2)}</span>
      </span>
      <span className={`${styles.floatNum} ${styles.floatN3}`}>
        台指期 <span className="num">{fmtNum(futures, 0)}</span>
      </span>
      <span className={`${styles.floatNum} ${styles.floatN4}`}>
        費半 <span className="num">{fmtPct(sox)}</span>
      </span>
    </>
  );
}
