import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function NewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 從 Supabase 撈新聞情緒（待 Edge Function 定時寫入）
  type NewsRow = {
    id: string; url: string; title: string | null; source: string | null;
    published_at: string | null; score: number | null; label: string | null;
    summary: string | null; stocks: string[] | null;
  };
  const { data: newsData } = await supabase
    .from("news_sentiment")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(30);
  const news = (newsData ?? []) as NewsRow[];

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-4"><Link href="/dashboard" className="text-muted-fg hover:text-fg">← 回大盤</Link></div>
      <h1 className="text-3xl font-bold mb-6">📰 新聞情緒</h1>

      {news.length === 0 ? (
        <div className="p-8 rounded-xl bg-card border border-border text-center text-muted-fg">
          新聞尚未抓取。Edge Function 每 30 分鐘自動爬取，上線後會陸續出現。
        </div>
      ) : (
        <div className="space-y-2">
          {news.map((n) => (
            <a
              key={n.id}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="block p-4 rounded-xl bg-card border border-border hover:bg-muted transition"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-semibold flex-1">{n.title ?? "(無標題)"}</h3>
                <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                  n.label === "利多" ? "bg-up/20 text-up" :
                  n.label === "利空" ? "bg-down/20 text-down" : "bg-muted"
                }`}>
                  {n.label ?? "中性"} · {((n.score ?? 0) * 100).toFixed(0)}
                </span>
              </div>
              <p className="text-sm text-muted-fg mb-2">{n.summary}</p>
              <div className="flex items-center gap-3 text-xs text-muted-fg">
                <span>{n.source}</span>
                <span>{n.published_at ? new Date(n.published_at).toLocaleString("zh-TW") : ""}</span>
                {n.stocks && n.stocks.length > 0 && (
                  <div className="flex gap-1">
                    {n.stocks.slice(0, 5).map((s: string) => (
                      <span key={s} className="px-1.5 py-0.5 rounded bg-muted font-mono">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
