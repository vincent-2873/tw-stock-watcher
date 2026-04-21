"use client";

import { useState } from "react";
import Link from "next/link";

type Result = { code: string; name: string; price: number; change: number; volume: number };

const PRESETS = [
  { name: "漲幅 > 5%", params: { change_min: 5 } },
  { name: "跌幅 > 5%", params: { change_max: -5 } },
  { name: "爆量上漲", params: { change_min: 3, volume_min: 10000000 } },
  { name: "低價股 (< $50)", params: { price_max: 50 } },
  { name: "高價股 (> $500)", params: { price_min: 500 } },
  { name: "窄幅整理 (±1%)", params: { change_min: -1, change_max: 1, volume_min: 5000000 } },
];

export default function ScreenerPage() {
  const [criteria, setCriteria] = useState({
    price_min: "", price_max: "", change_min: "", change_max: "", volume_min: "",
  });
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  async function scan(params: Record<string, number | string | undefined>) {
    setLoading(true);
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== "" && v != null) qs.set(k, String(v)); });
    const r = await fetch(`/api/screener?${qs}`);
    if (r.ok) {
      const d = await r.json();
      setResults(d.results ?? []);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-4"><Link href="/dashboard" className="text-muted-fg hover:text-fg">← 回大盤</Link></div>
      <h1 className="text-3xl font-bold mb-2">🎯 自訂選股引擎</h1>
      <p className="text-muted-fg mb-6">輸入條件後掃描台股全市場，找出符合的標的</p>

      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">🔥 常用條件</h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => scan(p.params)}
              className="px-3 py-1.5 rounded-lg bg-card border border-border text-sm hover:bg-muted transition"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-card border border-border mb-6">
        <h3 className="text-sm font-semibold mb-3">自訂條件</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-fg">股價區間</label>
            <div className="flex gap-1 mt-1">
              <input type="number" placeholder="最低" value={criteria.price_min}
                onChange={(e) => setCriteria({ ...criteria, price_min: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-muted text-sm font-mono" />
              <input type="number" placeholder="最高" value={criteria.price_max}
                onChange={(e) => setCriteria({ ...criteria, price_max: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-muted text-sm font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-fg">漲跌幅 (%)</label>
            <div className="flex gap-1 mt-1">
              <input type="number" step="0.1" placeholder="最小" value={criteria.change_min}
                onChange={(e) => setCriteria({ ...criteria, change_min: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-muted text-sm font-mono" />
              <input type="number" step="0.1" placeholder="最大" value={criteria.change_max}
                onChange={(e) => setCriteria({ ...criteria, change_max: e.target.value })}
                className="w-full px-2 py-1.5 rounded bg-muted text-sm font-mono" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-fg">最低成交量 (股)</label>
            <input type="number" placeholder="10000000 = 10 張" value={criteria.volume_min}
              onChange={(e) => setCriteria({ ...criteria, volume_min: e.target.value })}
              className="w-full mt-1 px-2 py-1.5 rounded bg-muted text-sm font-mono" />
          </div>
        </div>
        <button
          onClick={() => scan(criteria)}
          disabled={loading}
          className="w-full mt-4 py-2 rounded-lg bg-primary text-primary-fg font-medium disabled:opacity-50"
        >
          {loading ? "掃描中..." : "🔍 開始掃描"}
        </button>
      </div>

      {results.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">符合條件：{results.length} 檔</h3>
          <div className="grid gap-2">
            {results.slice(0, 50).map((r) => {
              const up = r.change >= 0;
              return (
                <Link key={r.code} href={`/stock/${r.code}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:bg-muted transition">
                  <div>
                    <span className="font-mono text-sm text-muted-fg">{r.code}</span>
                    <span className="ml-2 font-medium">{r.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">{r.price.toFixed(2)}</div>
                    <div className={`text-sm font-mono ${up ? "text-up" : "text-down"}`}>
                      {up ? "+" : ""}{r.change.toFixed(2)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
