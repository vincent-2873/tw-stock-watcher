"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const POPULAR = [
  { code: "2330", name: "台積電" }, { code: "2317", name: "鴻海" },
  { code: "2454", name: "聯發科" }, { code: "2881", name: "富邦金" },
  { code: "2882", name: "國泰金" }, { code: "0050", name: "元大台灣50" },
  { code: "00878", name: "國泰永續高股息" }, { code: "2303", name: "聯電" },
  { code: "2412", name: "中華電" }, { code: "2308", name: "台達電" },
];

export default function StockSearch() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function go(code: string) {
    if (/^\d{4,6}$/.test(code)) router.push(`/stock/${code}`);
  }

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 個股搜尋</h1>
      <form onSubmit={(e) => { e.preventDefault(); go(q); }} className="mb-6">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="輸入股票代號（例：2330）"
            className="flex-1 px-4 py-3 rounded-lg bg-card border border-border font-mono text-lg"
          />
          <button className="px-6 py-3 rounded-lg bg-primary text-primary-fg font-semibold">
            查詢
          </button>
        </div>
      </form>

      <h2 className="text-lg font-semibold mb-3 text-muted-fg">熱門</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {POPULAR.map((s) => (
          <button
            key={s.code}
            onClick={() => router.push(`/stock/${s.code}`)}
            className="p-3 rounded-lg bg-card border border-border hover:bg-muted text-left transition"
          >
            <div className="font-mono text-sm text-muted-fg">{s.code}</div>
            <div className="font-medium">{s.name}</div>
          </button>
        ))}
      </div>
    </main>
  );
}
