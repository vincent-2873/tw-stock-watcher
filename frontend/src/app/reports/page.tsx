import Link from "next/link";
import { fetchLatestReports, type ReportRow } from "@/lib/api";

export const dynamic = "force-dynamic";

const TYPES = [
  { key: "morning", label: "📅 早報", time: "08:00" },
  { key: "day_trade", label: "⚡ 當沖", time: "08:30" },
  { key: "closing", label: "📊 盤後", time: "14:30" },
  { key: "us_close", label: "🇺🇸 美股收盤", time: "05:00" },
];

export default async function ReportsPage() {
  const all = await Promise.all(
    TYPES.map((t) =>
      fetchLatestReports(t.key, 3).catch(() => ({ reports: [] as ReportRow[] })),
    ),
  );

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 md:py-8 bg-[var(--bg)] text-[var(--fg)]">
      <nav className="mb-4 text-sm">
        <Link href="/" className="text-blue-600 hover:underline">
          ← 回主頁
        </Link>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold mb-6">📊 歷史報告</h1>

      <div className="space-y-6">
        {TYPES.map((t, i) => {
          const reports = all[i].reports;
          return (
            <section
              key={t.key}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">{t.label}</h2>
                  <p className="text-xs text-[var(--muted-fg)]">
                    每交易日 {t.time} TPE 自動產出
                  </p>
                </div>
                <span className="text-xs text-[var(--muted-fg)]">
                  最近 {reports.length} 份
                </span>
              </div>
              {reports.length === 0 ? (
                <div className="p-4 text-sm text-[var(--muted-fg)]">
                  尚未產生過此類報告。
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {reports.map((r) => (
                    <li key={r.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono">
                          {r.report_date}
                        </span>
                        <span className="text-xs text-[var(--muted-fg)]">
                          {new Date(r.generated_at).toLocaleString("zh-TW", {
                            hour12: false, timeZone: "Asia/Taipei" })}{" "}
                          TPE
                        </span>
                      </div>
                      {r.summary && (
                        <pre className="text-xs font-mono whitespace-pre-wrap bg-[var(--muted)] rounded p-3 overflow-x-auto">
                          {r.summary}
                        </pre>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
