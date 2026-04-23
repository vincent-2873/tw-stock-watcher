"use client";

import { useEffect, useState } from "react";

type NewsItem = {
  title: string; link: string; pubDate: string; source: string;
  description?: string; label: string; score: number; stocks: string[];
};

export default function StockNews({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/news?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: NewsItem[] }) => setNews(d.items ?? []))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <div className="text-sm text-muted-fg">載入中...</div>;
  if (news.length === 0) return <div className="text-sm text-muted-fg">近期無相關新聞</div>;

  return (
    <div className="space-y-2">
      {news.slice(0, 5).map((n) => (
        <a
          key={n.link}
          href={n.link}
          target="_blank"
          rel="noreferrer"
          className="block p-3 rounded-lg bg-muted hover:bg-border transition"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-medium text-sm flex-1">{n.title}</h4>
            <span className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${
              n.label === "利多" ? "bg-up/20 text-up" :
              n.label === "利空" ? "bg-down/20 text-down" : "bg-muted-fg/20"
            }`}>
              {n.label}
            </span>
          </div>
          <div className="text-xs text-muted-fg">
            {n.source} · {new Date(n.pubDate).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        </a>
      ))}
    </div>
  );
}
