import Link from "next/link";
import { fetchMarketOverview, fetchTaiex, fetchFutures } from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmt(n?: number | null, digits = 2) {
  if (n == null) return "-";
  return n.toLocaleString("zh-TW", { maximumFractionDigits: digits });
}

function changeColor(v?: number | null) {
  if (v == null) return "text-[var(--muted-fg)]";
  if (v > 0) return "text-rose-600";  // 台股習慣:紅漲
  if (v < 0) return "text-emerald-600";
  return "text-[var(--muted-fg)]";
}

function sign(v?: number | null) {
  if (v == null) return "";
  return v >= 0 ? "+" : "";
}

export default async function MarketPage() {
  const [overview, taiex, futures] = await Promise.all([
    fetchMarketOverview().catch(() => null),
    fetchTaiex(30).catch(() => null),
    fetchFutures("TX", 30).catch(() => null),
  ]);

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 md:py-8 wabi-enter">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold">大盤監測</h1>
          <p className="text-sm text-[var(--muted-fg)] font-serif italic mt-1">
            台股 · 台指期 · 美股主要指數 · 跨市場連動
          </p>
          {overview?.tpe_now && (
            <p className="text-xs text-[var(--muted-fg)] mt-1">
              最後更新 {new Date(overview.tpe_now).toLocaleString("zh-TW", { hour12: false, timeZone: "Asia/Taipei" })} TPE
            </p>
          )}
        </div>
        <Link
          href="/"
          className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)] text-sm"
        >
          ← 回 Dashboard
        </Link>
      </header>

      {/* 三大指數卡片 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* TAIEX */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="font-semibold">加權指數 TAIEX</h3>
            <span className="text-xs text-[var(--muted-fg)]">{overview?.taiex?.date}</span>
          </div>
          <div className="text-3xl font-bold">{fmt(overview?.taiex?.close, 2)}</div>
          <div className={`text-lg ${changeColor(overview?.taiex?.day_change)}`}>
            {sign(overview?.taiex?.day_change)}{fmt(overview?.taiex?.day_change, 2)}
            {" "}
            ({sign(overview?.taiex?.day_change_pct)}{fmt(overview?.taiex?.day_change_pct, 2)}%)
          </div>
          <div className="text-xs text-[var(--muted-fg)] mt-2">
            成交金額 {fmt((overview?.taiex?.turnover_twd ?? 0) / 1e8, 0)} 億
          </div>
          {overview?.taiex_error && (
            <div className="text-xs text-rose-500 mt-1">⚠️ {overview.taiex_error}</div>
          )}
        </div>

        {/* 台指期 */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="font-semibold">台指期 (近月)</h3>
            <span className="text-xs text-[var(--muted-fg)]">
              {overview?.futures_tx?.date} · {overview?.futures_tx?.contract}
            </span>
          </div>
          <div className="text-3xl font-bold">{fmt(overview?.futures_tx?.close, 2)}</div>
          <div className={`text-lg ${changeColor(overview?.futures_tx?.day_change)}`}>
            {sign(overview?.futures_tx?.day_change)}{fmt(overview?.futures_tx?.day_change, 2)}
            {" "}
            ({sign(overview?.futures_tx?.day_change_pct)}{fmt(overview?.futures_tx?.day_change_pct, 2)}%)
          </div>
          {overview?.taiex?.close && overview?.futures_tx?.close && (
            <div className="text-xs text-[var(--muted-fg)] mt-2">
              價差(期-現): {fmt(overview.futures_tx.close - overview.taiex.close, 2)}
            </div>
          )}
          {overview?.futures_error && (
            <div className="text-xs text-rose-500 mt-1">⚠️ {overview.futures_error}</div>
          )}
        </div>

        {/* 美股 */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <h3 className="font-semibold mb-3">🇺🇸 美股三大指數 (proxy)</h3>
          <div className="space-y-2">
            {overview?.us && Object.entries(overview.us).map(([sym, d]) => (
              <div key={sym} className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono font-semibold">{sym}</span>
                  <span className="text-xs text-[var(--muted-fg)]">{d.label}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono">{fmt(d.price, 2)}</div>
                  <div className={`text-xs ${changeColor(d.changes_pct)}`}>
                    {sign(d.changes_pct)}{fmt(d.changes_pct, 2)}%
                  </div>
                </div>
              </div>
            ))}
            {!overview?.us && (
              <div className="text-xs text-[var(--muted-fg)]">(尚無資料)</div>
            )}
          </div>
        </div>
      </section>

      {/* TAIEX + 期貨走勢(簡易 sparkline) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Sparkline title="TAIEX 30 日走勢" rows={taiex?.history ?? []} />
        <Sparkline title="台指期 30 日走勢" rows={futures?.history ?? []} />
      </div>

      {/* 跨市場連動解讀 */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6">
        <h3 className="font-semibold mb-2">🔗 跨市場解讀</h3>
        <ul className="text-sm space-y-1 text-[var(--muted-fg)]">
          <li>
            • 期現價差(台指期 − 加權): 通常 ±10 點內。&gt;30 常見於選擇權結算或除息日。
          </li>
          <li>
            • 美股昨夜大漲: 台股開盤常高開 ~30-50 點(視產業關聯)。
          </li>
          <li>
            • 那指(QQQ) 關聯半導體權值股 2330/2303/2454,連動性最強。
          </li>
          <li>
            • 恐慌(VIX)&gt;25 常伴隨外資賣超,要警戒。
          </li>
        </ul>
      </section>

      <footer className="text-xs text-[var(--muted-fg)] text-center">
        資料源: FinMind(TAIEX/期貨) · FMP(美股) · 所有時間為台北(TPE)
      </footer>
    </main>
  );
}

function Sparkline({
  title,
  rows,
}: {
  title: string;
  rows: { date: string; close: number }[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-[var(--muted-fg)]">尚無資料</p>
      </div>
    );
  }
  const closes = rows.map((r) => r.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 400;
  const h = 100;
  const pts = rows.map((r, i) => {
    const x = (i / (rows.length - 1 || 1)) * w;
    const y = h - ((r.close - min) / range) * (h - 10) - 5;
    return `${x},${y}`;
  });
  const first = rows[0].close;
  const last = rows[rows.length - 1].close;
  const chg = last - first;
  const chgPct = (chg / first) * 100;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-semibold">{title}</h3>
        <span className={`text-sm font-mono ${chg >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
          {chg >= 0 ? "+" : ""}{fmt(chg, 2)} ({chg >= 0 ? "+" : ""}{fmt(chgPct, 2)}%)
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24">
        <polyline
          fill="none"
          stroke={chg >= 0 ? "#dc2626" : "#059669"}
          strokeWidth="1.5"
          points={pts.join(" ")}
        />
      </svg>
      <div className="flex justify-between text-xs text-[var(--muted-fg)] mt-1">
        <span>{rows[0].date}</span>
        <span>{rows[rows.length - 1].date}</span>
      </div>
    </div>
  );
}
