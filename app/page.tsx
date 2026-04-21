import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-br from-up via-warning to-success bg-clip-text text-transparent">
          TW Stock Watcher
        </h1>
        <p className="text-xl text-muted-fg">
          台股分析看盤平台 — 即時報價、技術分析、籌碼追蹤、AI 個股健檢
        </p>
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
        <Link
          href="/login"
          className="inline-block px-8 py-4 rounded-xl bg-primary text-primary-fg font-semibold text-lg hover:opacity-90 transition"
        >
          登入開始使用 →
        </Link>
        <p className="text-sm text-muted-fg">免費使用 · Google 登入 · 無需信用卡</p>
      </div>
    </main>
  );
}
