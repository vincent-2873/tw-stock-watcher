"use client";

import { useEffect, useState } from "react";
import { fetchMarketOverview, type MarketOverview } from "@/lib/api";

interface TickerItem {
  label: string;
  price?: number;
  change_pct?: number | null;
  sub?: string;
}

function fmt(n?: number | null, d = 2) {
  if (n == null) return "--";
  return n.toLocaleString("zh-TW", { maximumFractionDigits: d });
}

export function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  const reload = async () => {
    try {
      const o: MarketOverview = await fetchMarketOverview();
      const out: TickerItem[] = [];
      if (o.taiex) {
        out.push({
          label: "TAIEX",
          price: o.taiex.close,
          change_pct: o.taiex.day_change_pct ?? null,
          sub: `${fmt((o.taiex.turnover_twd ?? 0) / 1e8, 0)} 億`,
        });
      }
      if (o.futures_tx) {
        out.push({
          label: "台指期",
          price: o.futures_tx.close,
          change_pct: o.futures_tx.day_change_pct ?? null,
          sub: o.futures_tx.contract,
        });
      }
      if (o.us) {
        for (const [sym, d] of Object.entries(o.us)) {
          out.push({
            label: sym,
            price: d.price ?? undefined,
            change_pct: d.changes_pct ?? null,
            sub: d.label,
          });
        }
      }
      setItems(out);
      setUpdatedAt(o.tpe_now);
    } catch {
      // 靜默失敗
    }
  };

  useEffect(() => {
    reload();
    const t = setInterval(reload, 60_000); // 1 分鐘更新
    return () => clearInterval(t);
  }, []);

  if (items.length === 0) return null;

  // 複製一份做無縫 loop
  const loop = [...items, ...items];

  return (
    <div className="border-y border-[var(--border)] bg-[var(--bg-raised)] overflow-hidden wabi-ticker-pause">
      <div className="flex items-center px-3 py-2">
        <span className="flex items-center gap-2 shrink-0 text-xs text-[var(--muted-fg)] pr-4 border-r border-[var(--border)]">
          <span className="wabi-live-dot"></span>
          LIVE
          {updatedAt && (
            <span className="font-mono">
              {new Date(updatedAt).toLocaleTimeString("zh-TW", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </span>
        <div className="overflow-hidden flex-1 pl-4">
          <div className="wabi-ticker">
            {loop.map((it, i) => (
              <span key={i} className="inline-flex items-baseline gap-2 pr-8">
                <span className="font-serif text-sm">{it.label}</span>
                <span className="wabi-num text-sm">{fmt(it.price, 2)}</span>
                {it.change_pct != null && (
                  <span
                    className={`wabi-num text-xs ${
                      it.change_pct >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {it.change_pct >= 0 ? "▲" : "▼"}
                    {fmt(Math.abs(it.change_pct), 2)}%
                  </span>
                )}
                {it.sub && (
                  <span className="text-xs text-[var(--muted-fg)]">{it.sub}</span>
                )}
                <span className="text-[var(--border-strong)] pl-4">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
