import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchSymbolQuote } from "@/lib/data-sources/markets";

type Item = { id: string; symbol: string; market: string; created_at: string };

export default async function WatchlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // use any cast to avoid strict type issues with thin Database type
  const sb = supabase as any;
  const { data: wl } = await sb.from("watchlists").select("id").eq("user_id", user.id).limit(1).single();

  let items: Item[] = [];
  if (wl?.id) {
    const { data } = await sb.from("watchlist_items").select("*").eq("watchlist_id", wl.id).order("sort_order", { ascending: true });
    items = (data ?? []) as Item[];
  }

  const quotes = await Promise.all(
    items.map(async (i) => {
      const yahooSymbol = i.market === "TW" ? `${i.symbol}.TW` : i.symbol;
      const q = await fetchSymbolQuote(yahooSymbol);
      return { item: i, quote: q };
    }),
  );

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-4"><Link href="/dashboard" className="text-muted-fg hover:text-fg">← 回大盤</Link></div>
      <h1 className="text-3xl font-bold mb-6">⭐ 我的自選股</h1>

      {items.length === 0 ? (
        <div className="p-8 rounded-xl bg-card border border-border text-center">
          <p className="mb-4">尚未加入自選股</p>
          <Link href="/stock" className="inline-block px-6 py-3 rounded-lg bg-primary text-primary-fg">
            前往搜尋個股 →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {quotes.map(({ item, quote }) => {
            const up = (quote?.change ?? 0) >= 0;
            return (
              <Link
                key={item.id}
                href={`/stock/${item.symbol}`}
                className="flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:bg-muted transition"
              >
                <div>
                  <div className="font-mono text-sm text-muted-fg">{item.symbol} · {item.market}</div>
                  <div className="font-medium">{quote?.name ?? item.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg">{quote ? quote.price.toFixed(2) : "--"}</div>
                  {quote && (
                    <div className={up ? "price-up" : "price-down"}>
                      {up ? "▲" : "▼"} {Math.abs(quote.change).toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
