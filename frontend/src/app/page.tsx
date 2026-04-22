import { fetchBackendHealth } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const health = await fetchBackendHealth().catch((e) => ({ error: String(e) }));

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl w-full space-y-6">
        <header className="text-center">
          <h1 className="text-4xl font-bold mb-2">
            🧠 Vincent Stock Intelligence
          </h1>
          <p className="text-neutral">個人金融情報系統 — 夥伴 + 教練</p>
        </header>

        <section className="rounded-xl border border-[var(--border)] p-6 bg-[var(--card)]">
          <h2 className="font-semibold mb-3">🩺 後端健康狀態</h2>
          <pre className="text-xs font-mono bg-[var(--muted)] rounded p-3 overflow-x-auto">
            {JSON.stringify(health, null, 2)}
          </pre>
          <p className="text-xs text-[var(--muted-fg)] mt-2">
            Phase 1 驗收:前後端能通訊 = 看到 <code>status: ok</code> 或 <code>degraded</code>
          </p>
        </section>

        <section className="rounded-xl border border-[var(--border)] p-6 bg-[var(--card)]">
          <h2 className="font-semibold mb-2">下一步</h2>
          <ul className="text-sm space-y-1 text-[var(--muted-fg)] list-disc pl-5">
            <li>建立 Supabase project,執行 <code>supabase/schema.sql</code></li>
            <li>填好 <code>.env</code> 的 API keys</li>
            <li>啟動 <code>uvicorn backend.main:app --reload</code></li>
            <li>啟動 <code>pnpm dev</code> 測試前後端通訊</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
