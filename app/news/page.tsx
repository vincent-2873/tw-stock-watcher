import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchLatestNews, dictionarySentiment } from "@/lib/data-sources/news";

export const revalidate = 600;

export default async function NewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rawNews = await fetchLatestNews(30);
  const news = rawNews.map((n) => {
    const sent = dictionarySentiment(`${n.title} ${n.description ?? ""}`);
    return { ...n, ...sent };
  });

  const stats = {
    pos: news.filter((n) => n.label === "利多").length,
    neg: news.filter((n) => n.label === "利空").length,
    neutral: news.filter((n) => n.label === "中性").length,
  };

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-4"><Link href="/dashboard" className="text-muted-fg hover:text-fg">← 回大盤</Link></div>
      <h1 className="text-3xl font-bold mb-2">📰 即時新聞情緒</h1>
      <p className="text-muted-fg mb-6">來源：鉅亨網 RSS · 自動詞典法分析 · 每 10 分鐘更新</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-xl bg-up/10 border border-up/30 text-center">
          <div className="text-3xl font-bold text-up">{stats.pos}</div>
          <div className="text-sm">利多</div>
        </div>
        <div className="p-4 rounded-xl bg-muted border border-border text-center">
          <div className="text-3xl font-bold">{stats.neutral}</div>
          <div className="text-sm text-muted-fg">中性</div>
        </div>
        <div className="p-4 rounded-xl bg-down/10 border border-down/30 text-center">
          <div className="text-3xl font-bold text-down">{stats.neg}</div>
          <div className="text-sm">利空</div>
        </div>
      </div>

      <div className="space-y-2">
        {news.map((n) => (
          <a
            key={n.link}
            href={n.link}
            target="_blank"
            rel="noreferrer"
            className="block p-4 rounded-xl bg-card border border-border hover:bg-muted transition"
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <h3 className="font-semibold flex-1">{n.title}</h3>
              <span className={`text-xs px-2 py-1 rounded whitespace-nowrap font-semibold ${
                n.label === "利多" ? "bg-up/20 text-up" :
                n.label === "利空" ? "bg-down/20 text-down" : "bg-muted text-muted-fg"
              }`}>
                {n.label} {n.score > 0 ? "+" : ""}{(n.score * 100).toFixed(0)}
              </span>
            </div>
            {n.description && <p className="text-sm text-muted-fg mb-2 line-clamp-2">{n.description}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-fg">
              <span>{n.source}</span>
              <span>{new Date(n.pubDate).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              {n.stocks.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {n.stocks.slice(0, 5).map((s) => (
                    <Link
                      key={s}
                      href={`/stock/${s}`}
                      onClick={(e) => e.stopPropagation()}
                      className="px-1.5 py-0.5 rounded bg-primary/10 text-primary-fg font-mono hover:bg-primary/20"
                    >
                      {s}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
