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
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
      {quotes.map((q) => {
        const up = q.change >= 0;
        return (
          <div
            key={q.symbol}
            className="flex-shrink-0 px-4 py-3 rounded-xl bg-card border border-border shadow-card hover:shadow-card-hover transition min-w-[150px]"
          >
            <div className="text-xs text-muted-fg flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${up ? "bg-up" : "bg-down"} animate-pulse`} />
              {q.label}
            </div>
            <div className="font-mono font-bold text-lg mt-1">{q.price.toFixed(2)}</div>
            <div className={`text-xs font-mono font-semibold ${up ? "text-up" : "text-down"}`}>
              {up ? "▲" : "▼"} {Math.abs(q.change).toFixed(2)} ({q.changePercent.toFixed(2)}%)
            </div>
          </div>
        );
      })}
    </div>
  );
}
