"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TW_POPULAR = [
  { code: "2330", name: "台積電" }, { code: "2317", name: "鴻海" },
  { code: "2454", name: "聯發科" }, { code: "2881", name: "富邦金" },
  { code: "2882", name: "國泰金" }, { code: "0050", name: "元大台灣50" },
  { code: "00878", name: "國泰永續高股息" }, { code: "00679B", name: "元大美債20年" },
  { code: "2303", name: "聯電" }, { code: "2412", name: "中華電" },
  { code: "2308", name: "台達電" }, { code: "3008", name: "大立光" },
  { code: "2603", name: "長榮" }, { code: "2615", name: "萬海" },
  { code: "2609", name: "陽明" }, { code: "2610", name: "華航" },
];

const US_POPULAR = [
  { code: "AAPL", name: "Apple" }, { code: "MSFT", name: "Microsoft" },
  { code: "NVDA", name: "NVIDIA" }, { code: "GOOGL", name: "Alphabet" },
  { code: "AMZN", name: "Amazon" }, { code: "META", name: "Meta" },
  { code: "TSLA", name: "Tesla" }, { code: "SPY", name: "S&P 500 ETF" },
  { code: "QQQ", name: "NASDAQ 100 ETF" }, { code: "AMD", name: "AMD" },
  { code: "AVGO", name: "Broadcom" }, { code: "TSM", name: "台積電 ADR" },
];

export default function StockSearch() {
  const [q, setQ] = useState("");
  const [market, setMarket] = useState<"TW" | "US">("TW");
  const router = useRouter();

  function go(code: string) {
    const c = code.trim().toUpperCase();
    if (c) router.push(`/stock/${c}`);
  }

  const list = market === "TW" ? TW_POPULAR : US_POPULAR;
  const filtered = q ? list.filter(s => s.code.includes(q.toUpperCase()) || s.name.includes(q)) : list;
  // 不管有沒有匹配熱門清單,都允許直接查使用者輸入的代碼
  const qTrim = q.trim().toUpperCase();
  const isValidCode = market === "TW"
    ? /^\d{4,6}[A-Z]?$/.test(qTrim)
    : /^[A-Z]{1,5}$/.test(qTrim);
  const notInList = isValidCode && !list.some(s => s.code === qTrim);

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🔍 個股搜尋</h1>

      <div className="flex rounded-lg bg-muted p-1 mb-4 max-w-md">
        <button
          onClick={() => setMarket("TW")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition ${market === "TW" ? "bg-card shadow" : "text-muted-fg"}`}
        >
          🇹🇼 台股
        </button>
        <button
          onClick={() => setMarket("US")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition ${market === "US" ? "bg-card shadow" : "text-muted-fg"}`}
        >
          🇺🇸 美股
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); go(q); }} className="mb-6">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={market === "TW" ? "輸入代號或名稱（例：2330 / 台積電）" : "Ticker symbol (e.g. AAPL, NVDA)"}
            className="flex-1 px-4 py-3 rounded-lg bg-card border border-border font-mono text-lg"
          />
          <button className="px-6 py-3 rounded-lg bg-primary text-primary-fg font-semibold">
            查詢
          </button>
        </div>
      </form>

      <h2 className="text-lg font-semibold mb-3 text-muted-fg">
        {q ? `搜尋結果 (${filtered.length + (notInList ? 1 : 0)})` : "熱門"}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {notInList && (
          <button
            onClick={() => go(qTrim)}
            className="p-3 rounded-lg bg-primary/10 border-2 border-primary hover:bg-primary/20 text-left transition col-span-2 md:col-span-3"
          >
            <div className="font-mono text-sm text-primary">直接查詢 →</div>
            <div className="font-medium">
              {qTrim}
              <span className="text-xs text-muted-fg ml-2">(不在熱門列表,直接送出)</span>
            </div>
          </button>
        )}
        {filtered.map((s) => (
          <button
            key={s.code}
            onClick={() => go(s.code)}
            className="p-3 rounded-lg bg-card border border-border hover:bg-muted text-left transition"
          >
            <div className="font-mono text-sm text-muted-fg">{s.code}</div>
            <div className="font-medium">{s.name}</div>
          </button>
        ))}
        {q && filtered.length === 0 && !notInList && (
          <div className="col-span-2 md:col-span-3 p-6 text-center text-muted-fg text-sm">
            沒有匹配的熱門標的。按查詢送出看看,或改個關鍵字。
          </div>
        )}
      </div>
    </main>
  );
}
