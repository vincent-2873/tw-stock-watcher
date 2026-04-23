import Link from "next/link";
import { fetchRecentAlerts, type AlertRow } from "@/lib/api";

export const dynamic = "force-dynamic";

function sevClass(s: string) {
  switch (s) {
    case "urgent":
      return "bg-rose-500 text-white";
    case "warning":
      return "bg-amber-400 text-zinc-900";
    default:
      return "bg-sky-400 text-white";
  }
}

export default async function AlertsPage() {
  const res = await fetchRecentAlerts(14, 200).catch(() => ({
    alerts: [] as AlertRow[],
  }));
  const alerts = res.alerts;

  // 按日分組
  const byDate = alerts.reduce<Record<string, AlertRow[]>>((acc, a) => {
    const d = new Date(a.triggered_at).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
    (acc[d] ||= []).push(a);
    return acc;
  }, {});

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 md:py-8 bg-[var(--bg)] text-[var(--fg)]">
      <nav className="mb-4 text-sm">
        <Link href="/" className="text-blue-600 hover:underline">
          ← 回主頁
        </Link>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold mb-2">🔔 警示紀錄</h1>
      <p className="text-sm text-[var(--muted-fg)] mb-6">
        近 14 日,共 {alerts.length} 筆。盤中監控每 5 分鐘 scan,放量突破/急跌/RSI 極值/跌破 20MA 會觸發。
      </p>

      {Object.keys(byDate).length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] p-8 text-center text-[var(--muted-fg)]">
          近 14 日無警示。
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byDate).map(([date, items]) => (
            <section
              key={date}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
            >
              <div className="px-4 py-2 bg-[var(--muted)] border-b border-[var(--border)] text-sm font-semibold">
                {date} · {items.length} 筆
              </div>
              <ul className="divide-y divide-[var(--border)]">
                {items.map((a) => (
                  <li key={a.id} className="p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${sevClass(a.severity)}`}>
                        {a.severity}
                      </span>
                      <Link
                        href={`/stocks/${a.stock_id}`}
                        className="font-mono font-semibold hover:underline"
                      >
                        {a.stock_id}
                      </Link>
                      <span className="text-sm">{a.alert_type}</span>
                      <span className="ml-auto text-[10px] text-[var(--muted-fg)]">
                        {new Date(a.triggered_at).toLocaleTimeString("zh-TW", {
                          hour12: false, timeZone: "Asia/Taipei" })}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--muted-fg)] mt-1">
                      {a.message}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
