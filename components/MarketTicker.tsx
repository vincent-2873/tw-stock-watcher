"use client";

import { useEffect, useState } from "react";

type Quote = { symbol: string; label: string; market: string; price: number; change: number; changePercent: number };

export default function MarketTicker({ initial }: { initial: Quote[] }) {
  const [quotes, setQuotes] = useState(initial);

  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/indices", { cache: "no-store" });
        if (r.ok) {
          const data = await r.json();
          setQuotes(data);
        }
      } catch {}
    }, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {quotes.map((q) => {
        const up = q.change >= 0;
        return (
          <div
            key={q.symbol}
            className="flex-shrink-0 px-3 py-2 rounded-lg bg-card border border-border min-w-[140px]"
          >
            <div className="text-xs text-muted-fg">{q.label}</div>
            <div className="font-mono font-semibold">{q.price.toFixed(2)}</div>
            <div className={`text-xs font-mono ${up ? "text-up" : "text-down"}`}>
              {up ? "▲" : "▼"} {Math.abs(q.change).toFixed(2)} ({q.changePercent.toFixed(2)}%)
            </div>
          </div>
        );
      })}
    </div>
  );
}
