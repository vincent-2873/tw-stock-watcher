import Link from "next/link";
import {
  fetchBackendHealth,
  fetchLatestReports,
  fetchRecentAlerts,
  fetchWatchlist,
  type Recommendation,
  type WatchlistItem,
} from "@/lib/api";
import { LiveTicker } from "@/components/LiveTicker";
import { WeatherCard } from "@/components/quack/WeatherCard";
import { QuackTodayCard } from "@/components/quack/QuackTodayCard";
import { TopicsHeatSection } from "@/components/quack/TopicsHeatSection";
import { MarketPanorama } from "@/components/quack/MarketPanorama";
import { HeadlinesCard } from "@/components/quack/HeadlinesCard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function recoClass(rec?: Recommendation): string {
  switch (rec) {
    case "strong_buy":
      return "wabi-reco-strong_buy";
    case "buy":
      return "wabi-reco-buy";
    case "watch":
      return "wabi-reco-watch";
    case "hold":
      return "wabi-reco-hold";
    case "avoid":
      return "wabi-reco-avoid";
    default:
      return "wabi-pill";
  }
}

function confClass(c?: number): string {
  if (!c) return "wabi-conf-low";
  if (c >= 90) return "wabi-conf-90";
  if (c >= 75) return "wabi-conf-75";
  if (c >= 60) return "wabi-conf-60";
  if (c >= 45) return "wabi-conf-45";
  return "wabi-conf-low";
}

function confEmoji(c?: number): string {
  if (!c) return "";
  if (c >= 90) return "熾";
  if (c >= 75) return "確";
  if (c >= 60) return "可";
  if (c >= 45) return "惑";
  return "疑";
}

const NAV_LINKS = [
  { href: "/", label: "今日", icon: "🏠" },
  { href: "/pond", label: "池塘", icon: "🦆" },
  { href: "/journal", label: "筆記", icon: "📓" },
  { href: "/map", label: "地圖", icon: "🗺️" },
  { href: "/stocks", label: "查股", icon: "🔍" },
  { href: "/chat", label: "呱呱", icon: "💬" },
  { href: "/alerts", label: "鈴鐺", icon: "🔔" },
];

export default async function Dashboard() {
  const [health, watchlist, alertsRes, closingReports] = await Promise.all([
    fetchBackendHealth().catch(() => null),
    fetchWatchlist(true).catch(() => ({
      items: [] as WatchlistItem[],
      count: 0,
      tpe_now: "",
    })),
    fetchRecentAlerts(3, 20).catch(() => ({ alerts: [] })),
    fetchLatestReports("closing", 1).catch(() => ({ reports: [] })),
  ]);

  const items = [...watchlist.items].sort(
    (a, b) => (b.analysis?.total_score ?? 0) - (a.analysis?.total_score ?? 0),
  );
  const alerts = alertsRes.alerts ?? [];
  const closing = closingReports.reports?.[0];
  const now = watchlist.tpe_now
    ? new Date(watchlist.tpe_now)
    : null;

  return (
    <main className="min-h-screen">
      {/* LIVE 跑馬燈 */}
      <LiveTicker />

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <header className="mb-8 wabi-enter">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">
                  呱呱投資招待所
                </h1>
                <span className="text-xs text-[var(--muted-fg)] tracking-widest uppercase">
                  Quack House
                </span>
              </div>
              <p className="text-sm text-[var(--muted-fg)] mt-2 font-serif italic">
                「一隻呱呱,陪你想清楚每一筆。」
              </p>
              <p className="text-xs text-[var(--muted-fg)] mt-1">
                {now && (
                  <>
                    <span className="wabi-num">
                      {now.toLocaleString("zh-TW", { hour12: false, timeZone: "Asia/Taipei" })}
                    </span>{" "}
                    TPE
                  </>
                )}
                {"  ·  "}
                <span
                  className={
                    health?.status === "ok" ? "text-moss" : "text-gold"
                  }
                >
                  {health?.status === "ok" ? "● 茶室已開" : `◌ ${health?.status ?? "離線"}`}
                </span>
              </p>
            </div>
            {/* Nav */}
            <nav className="flex gap-1 flex-wrap">
              {NAV_LINKS.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="wabi-btn text-xs"
                >
                  <span className="text-[11px]">{n.icon}</span>
                  <span>{n.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className="wabi-divider" />

        {/* 呱呱招待所 · 今日三塊 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 wabi-enter wabi-enter-delay-1">
          <WeatherCard />
          <QuackTodayCard />
        </div>

        {/* 大盤全景 (30s 即時更新) */}
        <div className="mb-5 wabi-enter wabi-enter-delay-1">
          <MarketPanorama />
        </div>

        {/* 今日重點(AI 分類新聞 利多/中立/利空) */}
        <div className="mb-5 wabi-enter wabi-enter-delay-2">
          <HeadlinesCard />
        </div>

        <div className="mb-8 wabi-enter wabi-enter-delay-2">
          <TopicsHeatSection />
        </div>

        {/* 自選股 / 分析表格 */}
        <section className="wabi-card p-0 mb-8 wabi-enter wabi-enter-delay-1">
          <div className="flex items-baseline justify-between px-5 py-4 border-b border-[var(--border)]">
            <div className="flex items-baseline gap-3">
              <h2 className="font-serif text-xl">自選股</h2>
              <span className="text-xs text-[var(--muted-fg)]">
                {items.length} 檔 · VSIS 四象限分析
              </span>
            </div>
            <Link
              href="/stocks/2330"
              className="text-xs text-[var(--muted-fg)] hover:text-[var(--fg)]"
            >
              查個股 →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="wabi-table">
              <thead>
                <tr>
                  <th>代號</th>
                  <th>推薦</th>
                  <th className="text-right">總分</th>
                  <th className="text-right">信心</th>
                  <th>加入時間</th>
                  <th className="text-right"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[var(--muted-fg)] font-serif italic">
                      ——   自選股尚無記錄   ——
                    </td>
                  </tr>
                )}
                {items.map((it) => {
                  const a = it.analysis;
                  return (
                    <tr key={it.stock_id}>
                      <td className="wabi-num font-semibold">{it.stock_id}</td>
                      <td>
                        {a ? (
                          <span
                            className={`wabi-pill ${recoClass(a.recommendation)}`}
                          >
                            {a.recommendation}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--muted-fg)]">-</span>
                        )}
                      </td>
                      <td className="text-right wabi-num">
                        {a?.total_score ?? "-"}
                        <span className="text-xs text-[var(--muted-fg)]">/95</span>
                      </td>
                      <td className="text-right">
                        <span className={`wabi-pill ${confClass(a?.confidence)}`}>
                          {confEmoji(a?.confidence)} {a?.confidence ?? "-"}%
                        </span>
                      </td>
                      <td className="text-xs text-[var(--muted-fg)] wabi-num">
                        {it.added_at
                          ? new Date(it.added_at).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })
                          : "-"}
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/stocks/${it.stock_id}`}
                          className="text-xs underline decoration-[var(--border-strong)] underline-offset-2 hover:decoration-[var(--fg)]"
                        >
                          深度分析
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* 下排:最新盤後 + 警示 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <section className="wabi-card p-0 wabi-enter wabi-enter-delay-2">
            <div className="px-5 py-4 border-b border-[var(--border)]">
              <h2 className="font-serif text-xl">最新盤後</h2>
              {closing && (
                <p className="text-xs text-[var(--muted-fg)] mt-1 wabi-num">
                  {new Date(closing.generated_at).toLocaleString("zh-TW", { hour12: false, timeZone: "Asia/Taipei" })} TPE
                </p>
              )}
            </div>
            <div className="p-5 text-sm leading-relaxed">
              {closing?.summary ? (
                <pre className="whitespace-pre-wrap font-sans text-[13px]">
                  {closing.summary}
                </pre>
              ) : (
                <p className="text-[var(--muted-fg)] font-serif italic">
                  ——   尚無盤後報告,14:30 TPE 後自動產出   ——
                </p>
              )}
            </div>
          </section>

          <section className="wabi-card p-0 wabi-enter wabi-enter-delay-3">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-baseline justify-between">
              <h2 className="font-serif text-xl">近日警示</h2>
              <span className="text-xs text-[var(--muted-fg)]">
                近 3 日 · {alerts.length}
              </span>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {alerts.length === 0 && (
                <li className="p-5 text-sm text-[var(--muted-fg)] font-serif italic">
                  ——   近 3 日無警示   ——
                </li>
              )}
              {alerts.slice(0, 8).map((a) => (
                <li key={a.id} className="p-4 hover:bg-[var(--ink-wash)]">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`wabi-pill text-[10px] ${
                        a.severity === "urgent"
                          ? "bg-up"
                          : a.severity === "warning"
                            ? "text-gold border-[var(--gold)]"
                            : "text-down"
                      }`}
                    >
                      {a.severity === "urgent"
                        ? "急"
                        : a.severity === "warning"
                          ? "警"
                          : "記"}
                    </span>
                    <span className="wabi-num font-semibold">{a.stock_id}</span>
                    <span className="text-xs text-[var(--muted-fg)]">
                      {a.alert_type}
                    </span>
                  </div>
                  <div className="text-xs mt-1">{a.message}</div>
                  <div className="text-[11px] text-[var(--muted-fg)] mt-1 wabi-num">
                    {new Date(a.triggered_at).toLocaleString("zh-TW", {
                      hour12: false, timeZone: "Asia/Taipei" })}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="text-center py-6">
          <div className="wabi-divider" />
          <p className="text-xs text-[var(--muted-fg)] font-serif italic">
            ⚠ 本系統為資訊整理與量化評分,非投資建議。股市有風險,投資需謹慎。
          </p>
        </footer>
      </div>
    </main>
  );
}
