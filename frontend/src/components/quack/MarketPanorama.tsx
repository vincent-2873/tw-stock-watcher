"use client";

import { useEffect, useState } from "react";
import { fetchMarketOverview, type MarketOverview } from "@/lib/api";

type Cell = {
  key: string;
  label: string;
  sub?: string;
  price?: number | null;
  changePct?: number | null;
};

function fmt(n: number | null | undefined, d = 2): string {
  if (n == null) return "—";
  return n.toLocaleString("zh-TW", { maximumFractionDigits: d });
}

function pickUs(us: MarketOverview["us"] | undefined, keys: string[]): Cell[] {
  if (!us) return [];
  return keys
    .map((k) => {
      const v = us[k];
      if (!v) return null;
      return {
        key: k,
        label: v.label || k,
        sub: k,
        price: v.price ?? null,
        changePct: v.changes_pct ?? null,
      } as Cell;
    })
    .filter((x): x is Cell => x !== null);
}

export function MarketPanorama() {
  const [cells, setCells] = useState<Cell[]>([]);
  const [updated, setUpdated] = useState<string>("");

  useEffect(() => {
    async function reload() {
      try {
        const o = await fetchMarketOverview();
        const list: Cell[] = [];
        if (o.taiex) {
          list.push({
            key: "taiex",
            label: "加權指數",
            sub: "TAIEX",
            price: o.taiex.close ?? null,
            changePct: o.taiex.day_change_pct ?? null,
          });
        }
        if (o.futures_tx) {
          list.push({
            key: "tx",
            label: "台指期",
            sub: o.futures_tx.contract,
            price: o.futures_tx.close ?? null,
            changePct: o.futures_tx.day_change_pct ?? null,
          });
        }
        list.push(...pickUs(o.us, ["^IXIC", "^GSPC", "^SOX", "^DJI", "^VIX"]));
        setCells(list.slice(0, 6));
        setUpdated(o.tpe_now);
      } catch {
        // silent
      }
    }
    reload();
    const t = setInterval(reload, 30_000); // 30 秒一次,比 ticker 更即時
    return () => clearInterval(t);
  }, []);

  if (cells.length === 0) return null;

  return (
    <section
      className="wabi-card"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        padding: "18px 20px",
      }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "16px",
            fontWeight: 500,
            color: "var(--fg)",
            letterSpacing: "0.04em",
          }}
        >
          大盤全景
        </h2>
        <span
          className="text-[11px] font-mono flex items-center gap-2"
          style={{ color: "var(--muted-fg)", fontFamily: "var(--font-mono)" }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--up)", opacity: 0.7 }}
          />
          30s 自動更新
          {updated && (
            <span>
              {" · "}
              {new Date(updated).toLocaleTimeString("zh-TW", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "Asia/Taipei",
              })}
            </span>
          )}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {cells.map((c) => {
          const up = (c.changePct ?? 0) > 0;
          const down = (c.changePct ?? 0) < 0;
          const color = up ? "var(--up)" : down ? "var(--down)" : "var(--muted-fg)";
          return (
            <div
              key={c.key}
              className="p-3 rounded-lg"
              style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="text-[11px] tracking-wider"
                style={{ color: "var(--muted-fg)", fontFamily: "var(--font-serif)" }}
              >
                {c.label}
              </div>
              {c.sub && c.sub !== c.label && (
                <div
                  className="text-[10px] font-mono"
                  style={{
                    color: "var(--muted-fg)",
                    fontFamily: "var(--font-mono)",
                    opacity: 0.6,
                  }}
                >
                  {c.sub}
                </div>
              )}
              <div
                className="font-mono mt-1"
                style={{
                  color: "var(--fg)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "17px",
                  fontWeight: 500,
                  lineHeight: 1.2,
                }}
              >
                {fmt(c.price, 2)}
              </div>
              {c.changePct != null && (
                <div
                  className="font-mono text-xs mt-0.5"
                  style={{ color, fontFamily: "var(--font-mono)" }}
                >
                  {up ? "▲" : down ? "▼" : "·"}
                  {fmt(Math.abs(c.changePct), 2)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default MarketPanorama;
