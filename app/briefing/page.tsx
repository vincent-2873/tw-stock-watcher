import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchAllIndices } from "@/lib/data-sources/markets";

export const revalidate = 300;

// 美股收盤指數（道瓊、NASDAQ、費半、台積電 ADR）
const US_SYMBOLS = ["^DJI", "^IXIC", "^SOX", "TSM"];
const TW_INDICES = ["^TWII"];

async function fetchInstitutionalSummary() {
  try {
    const r = await fetch("https://openapi.twse.com.tw/v1/fund/BFI82U", {
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data;
  } catch { return null; }
}

export default async function BriefingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [allIndices, institutional] = await Promise.all([
    fetchAllIndices(),
    fetchInstitutionalSummary(),
  ]);

  const usStocks = allIndices.filter((i) => ["^DJI", "^IXIC", "^SOX", "^GSPC"].includes(i.symbol));
  const twStocks = allIndices.filter((i) => ["^TWII", "TXF.TW", "^TWOII"].includes(i.symbol));
  const fx = allIndices.filter((i) => i.market === "FX");

  const hour = new Date().getHours();
  const phase = hour < 9 ? "盤前" : hour < 14 ? "盤中" : "盤後";

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-4"><Link href="/dashboard" className="text-muted-fg hover:text-fg">← 回大盤</Link></div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">
          📰 {phase}報告
          <span className="text-base font-normal text-muted-fg ml-2">
            {new Date().toLocaleString("zh-TW", { month: "long", day: "numeric", weekday: "long" })}
          </span>
        </h1>
      </header>

      <section className="p-5 rounded-xl bg-card border border-border mb-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2">🌍 美股收盤</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {usStocks.map((s) => {
            const up = s.change >= 0;
            return (
              <div key={s.symbol} className="p-3 rounded-lg bg-muted">
                <div className="text-xs text-muted-fg">{s.label}</div>
                <div className="font-mono text-lg font-bold">{s.price.toFixed(0)}</div>
                <div className={`text-sm font-mono ${up ? "text-up" : "text-down"}`}>
                  {up ? "+" : ""}{s.changePercent.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="p-5 rounded-xl bg-card border border-border mb-4">
        <h2 className="font-semibold mb-3">📈 台股大盤 + 期貨</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {twStocks.map((s) => {
            const up = s.change >= 0;
            return (
              <div key={s.symbol} className="p-3 rounded-lg bg-muted">
                <div className="text-xs text-muted-fg">{s.label}</div>
                <div className="font-mono text-lg font-bold">{s.price.toFixed(0)}</div>
                <div className={`text-sm font-mono ${up ? "text-up" : "text-down"}`}>
                  {up ? "+" : ""}{s.change.toFixed(0)} ({s.changePercent.toFixed(2)}%)
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="p-5 rounded-xl bg-card border border-border mb-4">
        <h2 className="font-semibold mb-3">💱 匯率</h2>
        <div className="grid grid-cols-2 gap-2">
          {fx.map((s) => {
            const up = s.change >= 0;
            return (
              <div key={s.symbol} className="p-3 rounded-lg bg-muted">
                <div className="text-xs text-muted-fg">{s.label}</div>
                <div className="font-mono text-lg font-bold">{s.price.toFixed(3)}</div>
                <div className={`text-sm font-mono ${up ? "text-up" : "text-down"}`}>
                  {up ? "+" : ""}{s.changePercent.toFixed(3)}%
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {institutional && (
        <section className="p-5 rounded-xl bg-card border border-border mb-4">
          <h2 className="font-semibold mb-3">💰 昨日三大法人買賣超</h2>
          <div className="space-y-2 text-sm">
            {Array.isArray(institutional) && institutional.slice(0, 5).map((row: any, i: number) => (
              <div key={i} className="flex justify-between p-2 rounded bg-muted">
                <span>{row.InvestorName ?? row.name ?? "-"}</span>
                <span className="font-mono">{row.TotalBuy ?? row.buy ?? "-"}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-xs text-muted-fg text-center mt-6">
        ⚠️ 以上僅為資訊整理，不構成投資建議
      </p>
    </main>
  );
}
