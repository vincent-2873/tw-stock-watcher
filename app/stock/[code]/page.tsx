import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchStockDailyHistory } from "@/lib/data-sources/twse";
import { sma, rsi } from "@/lib/analysis/indicators";
import { calcTechScore, computeHealthScore } from "@/lib/analysis/health-check";
import KLineChart from "@/components/charts/KLineChart";
import WatchlistButton from "@/components/stock/WatchlistButton";
import Link from "next/link";

export default async function StockDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

  type Candle = { time: string; open: number; high: number; low: number; close: number; volume: number };
  let closes: number[] = [];
  let candles: Candle[] = [];
  let stockName = code;
  let latest = 0;
  let change = 0;
  try {
    const data = await fetchStockDailyHistory(code, ym) as { data: string[][]; title?: string };
    if (data?.data?.length) {
      // data.data rows: [日期, 成交股數, 成交金額, 開盤, 高, 低, 收盤, 漲跌, 筆數]
      candles = data.data.map((r: string[]) => {
        // 日期格式：115/04/21（民國）→ 轉西元
        const [roc, m, d] = r[0].split("/").map(Number);
        const yyyy = roc + 1911;
        const time = `${yyyy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        return {
          time,
          volume: parseInt((r[1] ?? "0").replace(/,/g, ""), 10) / 1000,
          open: parseFloat((r[3] ?? "0").replace(/,/g, "")),
          high: parseFloat((r[4] ?? "0").replace(/,/g, "")),
          low: parseFloat((r[5] ?? "0").replace(/,/g, "")),
          close: parseFloat((r[6] ?? "0").replace(/,/g, "")),
        };
      }).filter((c) => !isNaN(c.close) && c.close > 0);
      closes = candles.map((c) => c.close);
      latest = closes.at(-1) ?? 0;
      const prev = closes.at(-2) ?? latest;
      change = prev ? ((latest - prev) / prev) * 100 : 0;
      stockName = data.title?.replace(/\d+年\d+月\s*/, "").replace(/日成交資訊/, "") ?? code;
    }
  } catch (e) {
    console.error(e);
  }

  const techScore = closes.length ? calcTechScore(closes, closes, closes) : 50;
  const health = computeHealthScore(techScore, 50, 50); // chip/sentiment 待串接
  const rsi14 = closes.length ? rsi(closes).at(-1) : null;
  const ma5 = closes.length ? sma(closes, 5).at(-1) : null;
  const ma20 = closes.length ? sma(closes, 20).at(-1) : null;

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <Link href="/dashboard" className="text-muted-fg hover:text-fg">← 回大盤</Link>
      </div>

      <header className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="text-muted-fg font-mono">{code}</div>
          <h1 className="text-4xl font-bold">{stockName}</h1>
        </div>
        <div className="text-right space-y-2">
          <div className="text-4xl font-mono">{latest.toFixed(2)}</div>
          <div className={change >= 0 ? "price-up" : "price-down"}>
            {change >= 0 ? "+" : ""}{change.toFixed(2)}%
          </div>
          <WatchlistButton symbol={code} />
        </div>
      </header>

      <section className="grid md:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-fg">健檢綜合</div>
          <div className="text-3xl font-bold">{health.overall}</div>
          <div className="text-sm">{health.grade}</div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-fg">技術面</div>
          <div className="text-3xl font-bold">{health.tech}</div>
          <div className="text-sm text-muted-fg">滿分 100</div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-fg">RSI(14)</div>
          <div className="text-3xl font-bold">{rsi14?.toFixed(1) ?? "-"}</div>
          <div className="text-sm text-muted-fg">
            {rsi14 && rsi14 > 70 ? "超買" : rsi14 && rsi14 < 30 ? "超賣" : "中性"}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <div className="text-xs text-muted-fg">MA5 / MA20</div>
          <div className="text-xl font-bold">
            {ma5?.toFixed(2) ?? "-"} / {ma20?.toFixed(2) ?? "-"}
          </div>
        </div>
      </section>

      <section className="p-4 rounded-xl bg-card border border-border mb-6">
        <h2 className="font-semibold mb-3">K 線圖（MA5 / MA20 / MA60）</h2>
        {candles.length > 0 ? (
          <KLineChart data={candles} height={500} />
        ) : (
          <p className="text-sm text-muted-fg">本月尚無交易資料</p>
        )}
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border">
          <h3 className="font-semibold mb-2">📈 技術訊號</h3>
          <ul className="space-y-1 text-sm">
            {health.signals.length ? health.signals.map((s) => <li key={s}>• {s}</li>) : <li className="text-muted-fg">尚無明顯訊號</li>}
          </ul>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <h3 className="font-semibold mb-2">💡 建議</h3>
          <p className="text-sm text-muted-fg">
            {health.overall >= 70
              ? "技術面偏多，可持續觀察。"
              : health.overall <= 30
              ? "訊號偏弱，建議觀望。"
              : "訊號中性，等待明確方向。"}
          </p>
        </div>
      </section>
    </main>
  );
}
