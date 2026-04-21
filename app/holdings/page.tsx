import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchSymbolQuote } from "@/lib/data-sources/markets";

export const revalidate = 60;

type Trade = {
  id: string; symbol: string; action: "buy" | "sell";
  quantity: number; price: number; fee: number; tax: number;
  trade_date: string;
};

type Position = {
  symbol: string; quantity: number; avgCost: number; totalCost: number;
  realizedPnL: number;
};

function computePositions(trades: Trade[]): Position[] {
  const byCode = new Map<string, Trade[]>();
  for (const t of trades) {
    const list = byCode.get(t.symbol) ?? [];
    list.push(t);
    byCode.set(t.symbol, list);
  }

  const out: Position[] = [];
  for (const [symbol, ts] of byCode.entries()) {
    ts.sort((a, b) => a.trade_date.localeCompare(b.trade_date));
    let qty = 0;
    let costBasis = 0;
    let realized = 0;

    for (const t of ts) {
      if (t.action === "buy") {
        costBasis += t.quantity * t.price + t.fee;
        qty += t.quantity;
      } else {
        // sell: 用平均成本算實現損益
        if (qty > 0) {
          const avgCost = costBasis / qty;
          realized += (t.price - avgCost) * t.quantity - t.fee - t.tax;
          costBasis -= avgCost * t.quantity;
        }
        qty -= t.quantity;
      }
    }

    out.push({
      symbol, quantity: qty,
      avgCost: qty > 0 ? costBasis / qty : 0,
      totalCost: costBasis,
      realizedPnL: realized,
    });
  }
  return out;
}

export default async function HoldingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await (supabase as any).from("trades").select("*")
    .eq("user_id", user.id).order("trade_date", { ascending: true });

  const trades = (data ?? []) as Trade[];
  const positions = computePositions(trades);
  const holding = positions.filter((p) => p.quantity > 0);

  // 並行抓報價
  const quotes = await Promise.all(
    holding.map(async (p) => {
      const yahoo = /^\d{4,6}$/.test(p.symbol) ? `${p.symbol}.TW` : p.symbol;
      const q = await fetchSymbolQuote(yahoo);
      return { pos: p, quote: q };
    }),
  );

  const totalCost = holding.reduce((s, p) => s + p.totalCost, 0);
  const totalValue = quotes.reduce((s, { pos, quote }) => {
    const px = quote?.price ?? pos.avgCost;
    return s + pos.quantity * px;
  }, 0);
  const unrealized = totalValue - totalCost;
  const totalRealized = positions.reduce((s, p) => s + p.realizedPnL, 0);

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-4"><Link href="/dashboard" className="text-muted-fg hover:text-fg">← 回大盤</Link></div>
      <h1 className="text-3xl font-bold mb-6">💼 持倉總覽</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-fg">成本合計</div>
          <div className="text-xl font-mono font-bold">{totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-fg">市值合計</div>
          <div className="text-xl font-mono font-bold">{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-fg">未實現損益</div>
          <div className={`text-xl font-mono font-bold ${unrealized >= 0 ? "text-up" : "text-down"}`}>
            {unrealized >= 0 ? "+" : ""}{unrealized.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-fg">已實現損益</div>
          <div className={`text-xl font-mono font-bold ${totalRealized >= 0 ? "text-up" : "text-down"}`}>
            {totalRealized >= 0 ? "+" : ""}{totalRealized.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {holding.length === 0 ? (
        <div className="p-8 rounded-xl bg-card border border-border text-center text-muted-fg">
          尚無持倉。到 <Link href="/trades" className="text-primary-fg underline">交易紀錄</Link> 輸入您的買賣。
        </div>
      ) : (
        <div className="space-y-2">
          {quotes.map(({ pos, quote }) => {
            const px = quote?.price ?? pos.avgCost;
            const value = pos.quantity * px;
            const pnl = value - pos.totalCost;
            const pnlPct = pos.totalCost ? (pnl / pos.totalCost) * 100 : 0;
            return (
              <Link key={pos.symbol} href={`/stock/${pos.symbol}`}
                className="block p-4 rounded-xl bg-card border border-border hover:bg-muted transition">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-sm text-muted-fg">{pos.symbol}</div>
                    <div className="font-medium">{quote?.name ?? pos.symbol}</div>
                    <div className="text-xs text-muted-fg mt-1">
                      {pos.quantity.toLocaleString()} 股 @ 均價 {pos.avgCost.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold">{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className={`font-mono text-sm ${pnl >= 0 ? "text-up" : "text-down"}`}>
                      {pnl >= 0 ? "+" : ""}{pnl.toFixed(0)} ({pnlPct.toFixed(2)}%)
                    </div>
                    <div className="text-xs text-muted-fg">現價 {px.toFixed(2)}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
