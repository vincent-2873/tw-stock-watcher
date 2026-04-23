import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchTwseDailyAll } from "@/lib/data-sources/twse";

export const revalidate = 1800;

// FinMind 三大法人買賣超（整個市場）
async function fetchDailyInstitutional(date: string) {
  const token = process.env.FINMIND_TOKEN ?? "";
  const q = new URLSearchParams({
    dataset: "TaiwanStockInstitutionalInvestorsBuySell",
    start_date: date,
    token,
  });
  try {
    const r = await fetch(`https://api.finmindtrade.com/api/v4/data?${q}`, { next: { revalidate: 1800 } });
    if (!r.ok) return [];
    const j = await r.json() as { data?: Array<{ date: string; stock_id: string; name: string; buy: number; sell: number }> };
    return j.data ?? [];
  } catch { return []; }
}

// 分點進出（市場主力）
async function fetchBrokerTop(date: string) {
  const token = process.env.FINMIND_TOKEN ?? "";
  const q = new URLSearchParams({
    dataset: "TaiwanStockTradingDailyReport",
    start_date: date,
    token,
  });
  try {
    const r = await fetch(`https://api.finmindtrade.com/api/v4/data?${q}`, { next: { revalidate: 1800 } });
    if (!r.ok) return [];
    const j = await r.json() as { data?: Array<{ date: string; securities_trader: string; stock_id: string; buy: number; sell: number }> };
    return j.data ?? [];
  } catch { return []; }
}

export default async function BrokersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 前一個交易日
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const dateStr = d.toISOString().slice(0, 10);

  const [institutional, brokers, stockList] = await Promise.all([
    fetchDailyInstitutional(dateStr),
    fetchBrokerTop(dateStr),
    fetchTwseDailyAll().catch(() => []),
  ]);

  // 股票代號 → 名稱對應
  const nameMap = new Map(stockList.map((s) => [s.Code, s.Name]));

  // 三大法人匯總：以 stock_id 分組
  type StockAgg = { stock_id: string; name: string; foreignNet: number; itNet: number; dealerNet: number; total: number };
  const aggMap = new Map<string, StockAgg>();
  for (const r of institutional) {
    const key = r.stock_id;
    const cur = aggMap.get(key) ?? { stock_id: key, name: nameMap.get(key) ?? r.name ?? key, foreignNet: 0, itNet: 0, dealerNet: 0, total: 0 };
    const net = Math.round((r.buy - r.sell) / 1000); // 張
    if (r.name?.includes("外陸資") || r.name?.includes("外資")) cur.foreignNet += net;
    else if (r.name?.includes("投信")) cur.itNet += net;
    else if (r.name?.includes("自營")) cur.dealerNet += net;
    cur.total = cur.foreignNet + cur.itNet + cur.dealerNet;
    aggMap.set(key, cur);
  }
  const institutionalArr = Array.from(aggMap.values());
  const foreignTop = [...institutionalArr].sort((a, b) => b.foreignNet - a.foreignNet).slice(0, 15);
  const foreignBottom = [...institutionalArr].sort((a, b) => a.foreignNet - b.foreignNet).slice(0, 15);
  const itTop = [...institutionalArr].sort((a, b) => b.itNet - a.itNet).slice(0, 15);

  // 分點進出：以 securities_trader 分組
  type BrokerAgg = { trader: string; totalBuy: number; totalSell: number; net: number; txCount: number; hotStocks: Array<{ stock_id: string; net: number }> };
  const brokerMap = new Map<string, BrokerAgg>();
  for (const r of brokers) {
    const cur = brokerMap.get(r.securities_trader) ?? {
      trader: r.securities_trader,
      totalBuy: 0, totalSell: 0, net: 0, txCount: 0, hotStocks: [],
    };
    cur.totalBuy += Math.round(r.buy / 1000);
    cur.totalSell += Math.round(r.sell / 1000);
    cur.net = cur.totalBuy - cur.totalSell;
    cur.txCount++;
    const existing = cur.hotStocks.find((s) => s.stock_id === r.stock_id);
    const diff = Math.round((r.buy - r.sell) / 1000);
    if (existing) existing.net += diff;
    else cur.hotStocks.push({ stock_id: r.stock_id, net: diff });
    brokerMap.set(r.securities_trader, cur);
  }
  const topBrokers = Array.from(brokerMap.values())
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .slice(0, 20);
  topBrokers.forEach((b) => { b.hotStocks.sort((x, y) => Math.abs(y.net) - Math.abs(x.net)); });

  return (
    <main className="min-h-screen bg-bg">
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-card">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🐰</span>
            <span className="font-bold">券商 × 法人情報</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {[
              { href: "/dashboard", label: "大盤" },
              { href: "/intel", label: "情報" },
              { href: "/brokers", label: "券商", active: true },
              { href: "/news", label: "新聞" },
              { href: "/watchlist", label: "自選" },
            ].map((l) => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded-md transition font-medium ${
                  l.active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}>{l.label}</Link>
            ))}
          </nav>
          <span className="text-xs text-muted-fg">{dateStr}</span>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* 外資 / 投信 前三大表 */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "🦜 外資買超 Top 15", data: foreignTop, field: "foreignNet", color: "up" },
            { title: "🦜 外資賣超 Top 15", data: foreignBottom, field: "foreignNet", color: "down" },
            { title: "🐢 投信買超 Top 15", data: itTop, field: "itNet", color: "up" },
          ].map((sec) => (
            <section key={sec.title} className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
              <div className={`px-4 py-3 border-b border-border bg-${sec.color}/5`}>
                <h2 className={`font-semibold text-${sec.color} flex items-center gap-2`}>
                  <span className={`w-1 h-5 bg-${sec.color} rounded`} />
                  {sec.title}
                </h2>
              </div>
              {sec.data.length === 0 ? (
                <div className="p-4 text-sm text-muted-fg text-center">
                  資料未載入（需 FINMIND_TOKEN 或等市場開盤後）
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-xs text-muted-fg">
                      <th className="py-2 px-3 text-left font-normal">股票</th>
                      <th className="py-2 px-3 text-right font-normal">淨買賣(張)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.data.map((r) => {
                      const val = (r as any)[sec.field] as number;
                      const up = val >= 0;
                      return (
                        <tr key={r.stock_id} className="border-b border-border hover:bg-muted/50 transition">
                          <td className="py-2 px-3">
                            <Link href={`/stock/${r.stock_id}`} className="flex items-center gap-2">
                              <span className="text-muted-fg font-mono text-xs w-12">{r.stock_id}</span>
                              <span className="font-medium">{r.name}</span>
                            </Link>
                          </td>
                          <td className={`py-2 px-3 text-right font-mono font-semibold ${up ? "text-up" : "text-down"}`}>
                            {up ? "+" : ""}{val.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          ))}
        </div>

        {/* 分點大戶 */}
        <section className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
          <div className="px-4 py-3 border-b border-border bg-primary/5 flex items-center justify-between">
            <h2 className="font-semibold text-primary flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded" />
              🏦 券商分點主力 Top 20（當日異常交易量最大）
            </h2>
            <span className="text-xs text-muted-fg">{dateStr}</span>
          </div>
          {topBrokers.length === 0 ? (
            <div className="p-8 text-center text-muted-fg text-sm">
              需要 FINMIND_TOKEN 才能載入分點資料。<br />
              免費註冊：<a href="https://finmindtrade.com/analysis/#/data/api" target="_blank" rel="noreferrer" className="text-primary underline">finmindtrade.com</a>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[700px] overflow-y-auto">
              {topBrokers.map((b) => {
                const up = b.net >= 0;
                return (
                  <details key={b.trader} className="group">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{up ? "🔥" : "❄️"}</span>
                        <div>
                          <div className="font-semibold">{b.trader}</div>
                          <div className="text-xs text-muted-fg">
                            買 {b.totalBuy.toLocaleString()} / 賣 {b.totalSell.toLocaleString()} / 交易 {b.txCount} 檔
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold ${up ? "text-up" : "text-down"}`}>
                          {up ? "+" : ""}{b.net.toLocaleString()} 張
                        </span>
                        <span className="text-muted-fg text-xs group-open:rotate-90 transition">▶</span>
                      </div>
                    </summary>
                    <div className="px-6 py-2 bg-muted/30 grid grid-cols-2 md:grid-cols-5 gap-2">
                      {b.hotStocks.slice(0, 10).map((s) => {
                        const sUp = s.net >= 0;
                        return (
                          <Link key={s.stock_id} href={`/stock/${s.stock_id}`}
                            className={`p-2 rounded-lg bg-card hover:shadow-card-hover transition text-xs ${sUp ? "border-l-4 border-up" : "border-l-4 border-down"}`}>
                            <div className="font-mono">{s.stock_id}</div>
                            <div className="font-medium truncate">{nameMap.get(s.stock_id) ?? ""}</div>
                            <div className={`font-mono font-semibold ${sUp ? "text-up" : "text-down"}`}>
                              {sUp ? "+" : ""}{s.net}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
