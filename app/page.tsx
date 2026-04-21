import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchAllIndices } from "@/lib/data-sources/markets";

export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const indices = await fetchAllIndices();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl text-center space-y-6">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-up via-warning to-success bg-clip-text text-transparent">
          TW Stock Watcher
        </h1>
        <p className="text-lg md:text-xl text-muted-fg">
          台股分析看盤平台 — 即時報價、技術分析、籌碼追蹤、AI 個股健檢
        </p>

        {indices.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-2xl mx-auto">
            {indices.slice(0, 8).map((q) => {
              const up = q.change >= 0;
              return (
                <div key={q.symbol} className="p-3 rounded-lg bg-card border border-border">
                  <div className="text-xs text-muted-fg">{q.label}</div>
                  <div className="font-mono font-semibold">{q.price.toFixed(2)}</div>
                  <div className={`text-xs font-mono ${up ? "text-up" : "text-down"}`}>
                    {up ? "▲" : "▼"} {q.changePercent.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-lg mx-auto">
          {[
            ["📊", "即時看盤"],
            ["📉", "技術分析"],
            ["💰", "籌碼追蹤"],
            ["🔬", "個股健檢"],
            ["📰", "新聞情緒"],
            ["🎯", "AI 推薦"],
            ["⭐", "自選股"],
            ["🔔", "警示推播"],
          ].map(([emoji, label]) => (
            <div key={label} className="p-3 rounded-lg bg-card border border-border">
              <div className="text-3xl">{emoji}</div>
              <div className="text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link
            href="/login"
            className="inline-block px-8 py-4 rounded-xl bg-primary text-primary-fg font-semibold text-lg hover:opacity-90 transition"
          >
            登入開始使用 →
          </Link>
          <Link
            href="/capabilities"
            className="inline-block px-8 py-4 rounded-xl bg-card border border-border font-semibold text-lg hover:bg-muted transition"
          >
            看看能做什麼
          </Link>
        </div>
        <p className="text-sm text-muted-fg">免費使用 · Google / Email 登入 · 無需信用卡</p>
      </div>
    </main>
  );
}
