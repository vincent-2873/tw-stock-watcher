import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchTwseDailyAll } from "@/lib/data-sources/twse";
import { fetchAllIndices } from "@/lib/data-sources/markets";
import MarketTicker from "@/components/MarketTicker";
import Link from "next/link";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let topGainers: Array<{ Code: string; Name: string; ClosingPrice: string; Change: string }> = [];
  let topLosers: typeof topGainers = [];
  try {
    const rows = await fetchTwseDailyAll();
    const parsed = rows
      .map((r) => ({ ...r, chg: parseFloat(r.Change || "0"), close: parseFloat(r.ClosingPrice || "0") }))
      .filter((r) => r.close > 0);
    topGainers = parsed.sort((a, b) => b.chg - a.chg).slice(0, 10);
    topLosers = parsed.sort((a, b) => a.chg - b.chg).slice(0, 10);
  } catch (e) {
    console.error("TWSE fetch failed:", e);
  }

  const indices = await fetchAllIndices();

  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">📊 大盤儀表板</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-fg hidden md:inline">{user.email}</span>
          <form action="/api/auth/signout" method="post">
            <button className="px-3 py-1 rounded-md bg-muted hover:bg-border transition">登出</button>
          </form>
        </div>
      </header>

      <div className="max-w-7xl mx-auto mb-4">
        <MarketTicker initial={indices} />
      </div>

      <nav className="max-w-7xl mx-auto grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        {[
          { href: "/dashboard", label: "📊 大盤", current: true },
          { href: "/stock", label: "🔍 個股" },
          { href: "/watchlist", label: "⭐ 自選" },
          { href: "/news", label: "📰 新聞" },
          { href: "/chips", label: "💰 籌碼" },
          { href: "/health", label: "🔬 健檢" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-4 py-2 rounded-lg text-center font-medium transition ${
              l.current ? "bg-primary text-primary-fg" : "bg-card hover:bg-muted"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-4">
        <section className="p-4 rounded-xl bg-card border border-border">
          <h2 className="font-semibold mb-3 text-up">🔺 今日強勢股 Top 10</h2>
          <div className="space-y-1">
            {topGainers.map((r) => (
              <Link
                key={r.Code}
                href={`/stock/${r.Code}`}
                className="flex justify-between items-center p-2 rounded-md hover:bg-muted transition"
              >
                <div>
                  <span className="font-mono text-sm text-muted-fg">{r.Code}</span>
                  <span className="ml-2 font-medium">{r.Name}</span>
                </div>
                <div className="text-right">
                  <div>{r.ClosingPrice}</div>
                  <div className="text-xs price-up">+{r.Change}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="p-4 rounded-xl bg-card border border-border">
          <h2 className="font-semibold mb-3 text-down">🔻 今日弱勢股 Top 10</h2>
          <div className="space-y-1">
            {topLosers.map((r) => (
              <Link
                key={r.Code}
                href={`/stock/${r.Code}`}
                className="flex justify-between items-center p-2 rounded-md hover:bg-muted transition"
              >
                <div>
                  <span className="font-mono text-sm text-muted-fg">{r.Code}</span>
                  <span className="ml-2 font-medium">{r.Name}</span>
                </div>
                <div className="text-right">
                  <div>{r.ClosingPrice}</div>
                  <div className="text-xs price-down">{r.Change}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
