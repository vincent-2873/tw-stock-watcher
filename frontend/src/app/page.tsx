import Link from "next/link";
import {
  fetchBackendHealth,
  fetchLatestReports,
  fetchRecentAlerts,
  fetchWatchlist,
  type Recommendation,
  type WatchlistItem,
} from "@/lib/api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function recoColor(rec?: Recommendation): string {
  switch (rec) {
    case "strong_buy":
      return "bg-emerald-600 text-white";
    case "buy":
      return "bg-emerald-500 text-white";
    case "watch":
      return "bg-amber-400 text-zinc-900";
    case "hold":
      return "bg-zinc-400 text-white";
    case "avoid":
      return "bg-rose-500 text-white";
    default:
      return "bg-zinc-300 text-zinc-700";
  }
}

function confColor(c?: number): string {
  if (!c) return "bg-zinc-100 text-zinc-500";
  if (c >= 90) return "bg-emerald-100 text-emerald-800";
  if (c >= 75) return "bg-green-100 text-green-800";
  if (c >= 60) return "bg-yellow-100 text-yellow-800";
  if (c >= 45) return "bg-orange-100 text-orange-800";
  return "bg-zinc-100 text-zinc-500";
}

function confEmoji(c?: number): string {
  if (!c) return "❓";
  if (c >= 90) return "🔥";
  if (c >= 75) return "✅";
  if (c >= 60) return "⚡";
  if (c >= 45) return "⚠️";
  return "❓";
}

export default async function Dashboard() {
  const [health, watchlist, alertsRes, closingReports] = await Promise.all([
    fetchBackendHealth().catch(() => null),
    fetchWatchlist(true).catch(() => ({ items: [] as WatchlistItem[], count: 0, tpe_now: "" })),
    fetchRecentAlerts(3, 20).catch(() => ({ alerts: [] })),
    fetchLatestReports("closing", 1).catch(() => ({ reports: [] })),
  ]);

  const items = [...watchlist.items].sort(
    (a, b) => (b.analysis?.total_score ?? 0) - (a.analysis?.total_score ?? 0),
  );
  const alerts = alertsRes.alerts ?? [];
  const closing = closingReports.reports?.[0];

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 md:py-8 bg-[var(--bg)] text-[var(--fg)]">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            🧠 Vincent Stock Intelligence
          </h1>
          <p className="text-sm text-[var(--muted-fg)]">
            {watchlist.tpe_now && (
              <>最後刷新 {new Date(watchlist.tpe_now).toLocaleString("zh-TW", { hour12: false })} TPE</>
            )}
            {" · "}
            <span
              className={
                health?.status === "ok"
                  ? "text-emerald-600"
                  : "text-amber-600"
              }
            >
              {health?.status === "ok" ? "● 系統正常" : `⚠ ${health?.status ?? "離線"}`}
            </span>
          </p>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link
            href="/market"
            className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]"
          >
            🌏 大盤
          </Link>
          <Link
            href="/stocks/2330"
            className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]"
          >
            2330 台積電
          </Link>
          <Link
            href="/chat"
            className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]"
          >
            💬 AI 夥伴
          </Link>
          <Link
            href="/backtest"
            className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]"
          >
            📊 回測
          </Link>
          <Link
            href="/paper"
            className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]"
          >
            📓 模擬交易
          </Link>
          <Link
            href="/reports"
            className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]"
          >
            📊 報告
          </Link>
          <Link
            href="/alerts"
            className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]"
          >
            🔔 警示
          </Link>
        </nav>
      </header>

      {/* 核心:watchlist 表格 */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold">📈 自選股 / 分析總覽</h2>
          <span className="text-xs text-[var(--muted-fg)]">
            {items.length} 檔 · 量化分析(skip AI)
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-[var(--muted-fg)] bg-[var(--muted)]">
              <tr>
                <th className="text-left px-4 py-2 font-medium">代號</th>
                <th className="text-left px-4 py-2 font-medium">推薦</th>
                <th className="text-right px-4 py-2 font-medium">總分</th>
                <th className="text-right px-4 py-2 font-medium">信心度</th>
                <th className="text-left px-4 py-2 font-medium">加入時間</th>
                <th className="text-right px-4 py-2 font-medium">詳細</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-[var(--muted-fg)]"
                  >
                    自選股是空的。預設會載入 watchlist 表或回退清單。
                  </td>
                </tr>
              )}
              {items.map((it) => {
                const a = it.analysis;
                return (
                  <tr
                    key={it.stock_id}
                    className="border-t border-[var(--border)] hover:bg-[var(--muted)]/40"
                  >
                    <td className="px-4 py-2 font-mono font-semibold">
                      {it.stock_id}
                    </td>
                    <td className="px-4 py-2">
                      {a ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${recoColor(a.recommendation)}`}
                        >
                          {a.recommendation_emoji} {a.recommendation}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--muted-fg)]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {a?.total_score ?? "-"}
                      <span className="text-xs text-[var(--muted-fg)]">/95</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${confColor(a?.confidence)}`}
                      >
                        {confEmoji(a?.confidence)} {a?.confidence ?? "-"}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--muted-fg)]">
                      {it.added_at
                        ? new Date(it.added_at).toLocaleDateString("zh-TW")
                        : "-"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/stocks/${it.stock_id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        深度分析 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 最近盤後報告 */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h2 className="font-semibold">📊 最新盤後</h2>
            {closing && (
              <p className="text-xs text-[var(--muted-fg)]">
                {new Date(closing.generated_at).toLocaleString("zh-TW", { hour12: false })} TPE
              </p>
            )}
          </div>
          <div className="p-4 text-sm">
            {closing?.summary ? (
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {closing.summary}
              </pre>
            ) : (
              <p className="text-[var(--muted-fg)]">
                尚無盤後報告。14:30 TPE 後自動產出。
              </p>
            )}
          </div>
        </section>

        {/* 最近 alerts */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold">🔔 近 3 日警示</h2>
            <span className="text-xs text-[var(--muted-fg)]">{alerts.length}</span>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {alerts.length === 0 && (
              <li className="p-4 text-sm text-[var(--muted-fg)]">
                近 3 日無警示。盤中監控每 5 分鐘 scan。
              </li>
            )}
            {alerts.slice(0, 8).map((a) => (
              <li key={a.id} className="p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      a.severity === "urgent"
                        ? "bg-rose-500 text-white"
                        : a.severity === "warning"
                          ? "bg-amber-400 text-zinc-900"
                          : "bg-sky-400 text-white"
                    }`}
                  >
                    {a.severity}
                  </span>
                  <span className="font-mono font-semibold">{a.stock_id}</span>
                  <span className="text-xs">{a.alert_type}</span>
                </div>
                <div className="text-xs text-[var(--muted-fg)] mt-0.5">
                  {a.message}
                </div>
                <div className="text-[10px] text-[var(--muted-fg)] mt-0.5">
                  {new Date(a.triggered_at).toLocaleString("zh-TW", { hour12: false })}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="text-xs text-[var(--muted-fg)] text-center mt-8">
        ⚠️ 本系統為資訊整理與量化評分,非投資建議。股市有風險,投資需謹慎,請自行負責。
      </footer>
    </main>
  );
}
