import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchTwseDailyAll } from "@/lib/data-sources/twse";

export const revalidate = 600;

// 台股產業代表股
const SECTORS: Record<string, string[]> = {
  "半導體": ["2330", "2454", "2303", "2379", "3034", "3711", "6770", "3443", "5347", "8299"],
  "AI / 伺服器": ["2382", "2317", "3231", "2376", "2356", "2353", "3017", "4938"],
  "電子零組件": ["2308", "2327", "2385", "2395", "3044", "3034", "3037"],
  "金融": ["2881", "2882", "2891", "2892", "2884", "2885", "2886", "2890", "2883", "2887"],
  "航運": ["2603", "2609", "2615", "2606", "2610", "2634", "2618", "2637"],
  "傳產": ["1301", "1303", "1326", "2002", "2105", "2027", "9904", "1216"],
  "生技": ["1590", "4174", "4147", "6446", "3684", "4142", "6446"],
  "ETF": ["0050", "0056", "00878", "00679B", "00713", "00919", "0052"],
};

export default async function SectorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let rows: Array<{ Code: string; Name: string; ClosingPrice: string; Change: string }> = [];
  try {
    rows = await fetchTwseDailyAll();
  } catch {}

  const byCode = new Map(rows.map((r) => [r.Code, r]));

  const sectors = Object.entries(SECTORS).map(([name, codes]) => {
    const stocks = codes.map((c) => {
      const r = byCode.get(c);
      if (!r) return null;
      const price = parseFloat(r.ClosingPrice || "0");
      const chg = parseFloat(r.Change || "0");
      const chgPct = price ? (chg / (price - chg)) * 100 : 0;
      return { code: c, name: r.Name, price, chg, chgPct };
    }).filter((s): s is NonNullable<typeof s> => s !== null && s.price > 0);
    const avgChg = stocks.length ? stocks.reduce((s, x) => s + x.chgPct, 0) / stocks.length : 0;
    return { name, stocks, avgChg };
  }).sort((a, b) => b.avgChg - a.avgChg);

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-4"><Link href="/dashboard" className="text-muted-fg hover:text-fg">← 回大盤</Link></div>
      <h1 className="text-3xl font-bold mb-2">🗂️ 類股表現</h1>
      <p className="text-muted-fg mb-6">按產業類別聚合，平均漲跌幅排序</p>

      <div className="space-y-4">
        {sectors.map((sector) => {
          const up = sector.avgChg >= 0;
          return (
            <section key={sector.name} className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">{sector.name}</h2>
                <span className={`text-lg font-mono font-semibold ${up ? "text-up" : "text-down"}`}>
                  {up ? "▲" : "▼"} {sector.avgChg.toFixed(2)}%
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {sector.stocks.map((s) => {
                  const sUp = s.chg >= 0;
                  return (
                    <Link key={s.code} href={`/stock/${s.code}`}
                      className="p-2 rounded-lg bg-muted hover:bg-border transition">
                      <div className="text-xs font-mono text-muted-fg">{s.code}</div>
                      <div className="text-sm font-medium truncate">{s.name}</div>
                      <div className="flex justify-between items-baseline">
                        <span className="font-mono text-sm">{s.price.toFixed(2)}</span>
                        <span className={`text-xs font-mono ${sUp ? "text-up" : "text-down"}`}>
                          {sUp ? "+" : ""}{s.chgPct.toFixed(2)}%
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
