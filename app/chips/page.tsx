import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchInstitutionalInvestors } from "@/lib/data-sources/twse";

export default async function ChipsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let rows: Array<{ Code: string; Name: string; net: number; foreignNet: number }> = [];
  try {
    const raw = await fetchInstitutionalInvestors();
    rows = raw.map((r: any) => {
      const fBuy = parseInt((r.ForeignInvestorsBuyVolume ?? "0").replace(/,/g, "")) || 0;
      const fSell = parseInt((r.ForeignInvestorsSellVolume ?? "0").replace(/,/g, "")) || 0;
      const foreignNet = fBuy - fSell;
      return { Code: r.Code, Name: r.Name, net: foreignNet, foreignNet };
    }).filter((r) => r.Code);
  } catch (e) {
    console.error(e);
  }

  const topBuy = [...rows].sort((a, b) => b.foreignNet - a.foreignNet).slice(0, 15);
  const topSell = [...rows].sort((a, b) => a.foreignNet - b.foreignNet).slice(0, 15);

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-4"><Link href="/dashboard" className="text-muted-fg hover:text-fg">← 回大盤</Link></div>
      <h1 className="text-3xl font-bold mb-6">💰 籌碼分析 — 外資買賣超</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="p-4 rounded-xl bg-card border border-border">
          <h2 className="font-semibold mb-3 text-up">外資買超 Top 15</h2>
          {topBuy.length === 0 ? <p className="text-muted-fg text-sm">資料載入中或今日未開盤</p> : (
            <div className="space-y-1">
              {topBuy.map((r) => (
                <Link key={r.Code} href={`/stock/${r.Code}`} className="flex justify-between p-2 rounded hover:bg-muted">
                  <span>
                    <span className="font-mono text-sm text-muted-fg">{r.Code}</span>
                    <span className="ml-2">{r.Name}</span>
                  </span>
                  <span className="price-up">+{r.foreignNet.toLocaleString()} 張</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="p-4 rounded-xl bg-card border border-border">
          <h2 className="font-semibold mb-3 text-down">外資賣超 Top 15</h2>
          {topSell.length === 0 ? <p className="text-muted-fg text-sm">資料載入中或今日未開盤</p> : (
            <div className="space-y-1">
              {topSell.map((r) => (
                <Link key={r.Code} href={`/stock/${r.Code}`} className="flex justify-between p-2 rounded hover:bg-muted">
                  <span>
                    <span className="font-mono text-sm text-muted-fg">{r.Code}</span>
                    <span className="ml-2">{r.Name}</span>
                  </span>
                  <span className="price-down">{r.foreignNet.toLocaleString()} 張</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="mt-6 text-sm text-muted-fg">
        投信 / 自營商買賣超、分點進出（券商）、融資融券、借券 資料待 FinMind token 串接後顯示。
      </p>
    </main>
  );
}
