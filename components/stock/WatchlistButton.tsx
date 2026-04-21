"use client";

import { useEffect, useState } from "react";

export default function WatchlistButton({ symbol, market = "TW" }: { symbol: string; market?: string }) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: { symbol: string }[] }) => {
        setAdded(d.items?.some((i) => i.symbol === symbol));
      })
      .catch(() => {});
  }, [symbol]);

  async function toggle() {
    setLoading(true);
    try {
      if (added) {
        const r = await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: "DELETE" });
        if (r.ok) setAdded(false);
      } else {
        const r = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ symbol, market }),
        });
        if (r.ok) setAdded(true);
        else if (r.status === 401) alert("請先登入");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-4 py-2 rounded-lg font-medium transition ${
        added ? "bg-warning/20 text-warning border border-warning/40" : "bg-muted hover:bg-border"
      }`}
    >
      {added ? "★ 已加入自選" : "☆ 加入自選"}
    </button>
  );
}
