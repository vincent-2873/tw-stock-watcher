"use client";

import { useEffect, useState } from "react";
import WatchlistDialog from "./WatchlistDialog";

export default function WatchlistButton({ symbol, stockName, market = "TW" }: { symbol: string; stockName?: string; market?: string }) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState(false);

  async function refresh() {
    const r = await fetch("/api/watchlist");
    if (r.ok) {
      const d = await r.json() as { items: { symbol: string }[] };
      setAdded(d.items?.some((i) => i.symbol === symbol) ?? false);
    }
  }

  useEffect(() => { refresh(); }, [symbol]);

  async function remove() {
    setLoading(true);
    const r = await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: "DELETE" });
    setLoading(false);
    if (r.ok) setAdded(false);
  }

  return (
    <>
      {added ? (
        <button
          onClick={remove}
          disabled={loading}
          className="px-4 py-2 rounded-lg font-medium bg-warning/20 text-warning border border-warning/40 transition"
        >
          ★ 已加入自選
        </button>
      ) : (
        <button
          onClick={() => setDialog(true)}
          className="px-4 py-2 rounded-lg font-medium bg-muted hover:bg-border transition"
        >
          ☆ 加入自選
        </button>
      )}
      {dialog && (
        <WatchlistDialog
          symbol={symbol}
          stockName={stockName}
          onClose={() => setDialog(false)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
