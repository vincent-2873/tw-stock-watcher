import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchTwseDailyAll } from "@/lib/data-sources/twse";
import { fetchAllIndices } from "@/lib/data-sources/markets";
import MarketTicker from "@/components/MarketTicker";
import InteractiveIndexChart from "@/components/InteractiveIndexChart";
import Link from "next/link";

type Row = {
  code: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  tradeValue: number;
};

function parseRow(r: {
  Code: string;
  Name: string;
  ClosingPrice: string;
  Change: string;
  TradeVolume: string;
  TradeValue: string;
}): Row | null {
  const price = parseFloat(r.ClosingPrice || "0");
  const change = parseFloat(r.Change || "0");
  const volume = parseInt((r.TradeVolume || "0").replace(/,/g, ""), 10);
  const tradeValue = parseInt((r.TradeValue || "0").replace(/,/g, ""), 10);
  if (!price) return null;
  const prev = price - change;
  const changePct = prev ? (change / prev) * 100 : 0;
  return { code: r.Code, name: r.Name, price, change, changePct, volume, tradeValue };
}

function Cell({
  row,
}: { row: Row }) {
  const up = row.change >= 0;
  return (
    <tr className="border-b border-border hover:bg-muted/50 transition">
      <td className="py-2 px-3">
        <Link href={`/stock/${row.code}`} className="flex items-center gap-2">
          <span className="text-muted-fg font-mono text-xs w-12">{row.code}</span>
          <span className="font-medium">{row.name}</span>
        </Link>
      </td>
      <td className="py-2 px-3 text-right font-mono">{row.price.toFixed(2)}</td>
      <td className={`py-2 px-3 text-right font-mono font-semibold ${up ? "text-up" : "text-down"}`}>
        {up ? "▲" : "▼"} {Math.abs(row.change).toFixed(2)}
      </td>
      <td className={`py-2 px-3 text-right font-mono font-semibold ${up ? "text-up" : "text-down"}`}>
        {up ? "+" : ""}{row.changePct.toFixed(2)}%
      </td>
      <td className="py-2 px-3 text-right font-mono text-muted-fg text-xs">
        {(row.volume / 1000).toFixed(0)}
      </td>
    </tr>
  );
}

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let allRows: Row[] = [];
  try {
    const rows = await fetchTwseDailyAll();
    allRows = rows.map(parseRow).filter((r): r is Row => r !== null);
  } catch (e) { console.error(e); }

  const indices = await fetchAllIndices();

  const upCount = allRows.filter((r) => r.change > 0).length;
  const downCount = allRows.filter((r) => r.change < 0).length;
  const flatCount = allRows.filter((r) => r.change === 0).length;
  const totalValue = allRows.reduce((s, r) => s + r.tradeValue, 0);

  const topGainers = [...allRows].sort((a, b) => b.changePct - a.changePct).slice(0, 15);
  const topLosers = [...allRows].sort((a, b) => a.changePct - b.changePct).slice(0, 15);
  const topVolume = [...allRows].sort((a, b) => b.tradeValue - a.tradeValue).slice(0, 15);

  return (
    <main className="min-h-screen bg-bg">
      {/* 頂部 Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-card">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl">🐰</span>
              <span className="font-bold text-lg hidden sm:inline">烏薩奇看盤</span>
              <span className="text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded hidden md:inline">情報版</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm">
              {[
                { href: "/dashboard", label: "大盤", icon: "🐰" },
                { href: "/intel", label: "情報", icon: "🧠" },
                { href: "/news", label: "新聞", icon: "📰" },
                { href: "/brokers", label: "券商", icon: "🏦" },
                { href: "/stock", label: "個股", icon: "🔍" },
                { href: "/sectors", label: "類股", icon: "🗂️" },
                { href: "/watchlist", label: "自選", icon: "⭐" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-3 py-1.5 rounded-md hover:bg-muted transition text-fg font-medium"
                >
                  {l.icon} {l.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-fg hidden md:inline">{user.email}</span>
              <form action="/api/auth/signout" method="post">
                <button className="px-3 py-1.5 rounded-md hover:bg-muted transition text-muted-fg">
                  登出
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* 指數 Ticker */}
        <MarketTicker initial={indices} />

        {/* 互動圖：台股 + 美股主要指數 */}
        <div className="grid lg:grid-cols-2 gap-4">
          <InteractiveIndexChart symbol="^TWII" label="加權指數" />
          <InteractiveIndexChart symbol="^IXIC" label="NASDAQ" />
        </div>

        {/* 市場摘要 */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-card border border-border shadow-card">
            <div className="text-xs text-muted-fg mb-1">上漲家數</div>
            <div className="text-2xl font-mono font-bold text-up">{upCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-card">
            <div className="text-xs text-muted-fg mb-1">下跌家數</div>
            <div className="text-2xl font-mono font-bold text-down">{downCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-card">
            <div className="text-xs text-muted-fg mb-1">平盤家數</div>
            <div className="text-2xl font-mono font-bold text-muted-fg">{flatCount}</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-card">
            <div className="text-xs text-muted-fg mb-1">成交金額</div>
            <div className="text-2xl font-mono font-bold">
              {(totalValue / 100000000).toFixed(0)}
              <span className="text-sm font-normal text-muted-fg ml-1">億</span>
            </div>
          </div>
        </section>

        {/* 三欄表格 */}
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* 漲幅 */}
          <section className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-up/5">
              <h2 className="font-semibold text-up flex items-center gap-2">
                <span className="w-1 h-5 bg-up rounded" />
                漲幅排行 Top 15
              </h2>
              <Link href="/screener?preset=gainers" className="text-xs text-muted-fg hover:text-fg">
                更多 →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-xs text-muted-fg">
                  <th className="py-2 px-3 text-left font-normal">股票</th>
                  <th className="py-2 px-3 text-right font-normal">成交</th>
                  <th className="py-2 px-3 text-right font-normal">漲跌</th>
                  <th className="py-2 px-3 text-right font-normal">幅度</th>
                  <th className="py-2 px-3 text-right font-normal">量(張)</th>
                </tr>
              </thead>
              <tbody>
                {topGainers.map((r) => <Cell key={r.code} row={r} />)}
              </tbody>
            </table>
          </section>

          {/* 跌幅 */}
          <section className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-down/5">
              <h2 className="font-semibold text-down flex items-center gap-2">
                <span className="w-1 h-5 bg-down rounded" />
                跌幅排行 Top 15
              </h2>
              <Link href="/screener?preset=losers" className="text-xs text-muted-fg hover:text-fg">
                更多 →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-xs text-muted-fg">
                  <th className="py-2 px-3 text-left font-normal">股票</th>
                  <th className="py-2 px-3 text-right font-normal">成交</th>
                  <th className="py-2 px-3 text-right font-normal">漲跌</th>
                  <th className="py-2 px-3 text-right font-normal">幅度</th>
                  <th className="py-2 px-3 text-right font-normal">量(張)</th>
                </tr>
              </thead>
              <tbody>
                {topLosers.map((r) => <Cell key={r.code} row={r} />)}
              </tbody>
            </table>
          </section>

          {/* 成交量 */}
          <section className="bg-card border border-border rounded-xl overflow-hidden shadow-card xl:col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5">
              <h2 className="font-semibold text-primary flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded" />
                成交金額排行 Top 15
              </h2>
              <Link href="/screener?preset=volume" className="text-xs text-muted-fg hover:text-fg">
                更多 →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-xs text-muted-fg">
                  <th className="py-2 px-3 text-left font-normal">股票</th>
                  <th className="py-2 px-3 text-right font-normal">成交</th>
                  <th className="py-2 px-3 text-right font-normal">漲跌</th>
                  <th className="py-2 px-3 text-right font-normal">幅度</th>
                  <th className="py-2 px-3 text-right font-normal">成交額</th>
                </tr>
              </thead>
              <tbody>
                {topVolume.map((r) => {
                  const up = r.change >= 0;
                  return (
                    <tr key={r.code} className="border-b border-border hover:bg-muted/50 transition">
                      <td className="py-2 px-3">
                        <Link href={`/stock/${r.code}`} className="flex items-center gap-2">
                          <span className="text-muted-fg font-mono text-xs w-12">{r.code}</span>
                          <span className="font-medium">{r.name}</span>
                        </Link>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{r.price.toFixed(2)}</td>
                      <td className={`py-2 px-3 text-right font-mono ${up ? "text-up" : "text-down"}`}>
                        {up ? "▲" : "▼"}{Math.abs(r.change).toFixed(2)}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono font-semibold ${up ? "text-up" : "text-down"}`}>
                        {up ? "+" : ""}{r.changePct.toFixed(2)}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-muted-fg text-xs">
                        {(r.tradeValue / 100000000).toFixed(1)}億
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </main>
  );
}
