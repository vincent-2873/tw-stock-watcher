import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchLatestNews } from "@/lib/data-sources/news";
import { analyzeNewsWithAI, type NewsAnalysis } from "@/lib/analysis/sentiment-ai";

export const revalidate = 900; // 15 分

export default async function NewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rawNews = await fetchLatestNews(20);
  const hasAI = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);

  // 限制：若沒 AI key，只跑詞典法（同步快）；有 key 則串 AI 分析（避免太多 parallel）
  const analyzed: Array<typeof rawNews[number] & NewsAnalysis> = [];
  const batchSize = hasAI ? 3 : 20;
  for (let i = 0; i < rawNews.length; i += batchSize) {
    const batch = rawNews.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (n) => {
        const ai = await analyzeNewsWithAI(n.title, n.description).catch(() => null);
        return { ...n, ...(ai ?? { score: 0, label: "中立" as const, summary: n.title, stocks: [], themes: [], sectors: [], confidence: 0 }) };
      }),
    );
    analyzed.push(...results);
  }

  const stats = {
    pos: analyzed.filter((n) => n.label === "利多").length,
    neg: analyzed.filter((n) => n.label === "利空").length,
    neutral: analyzed.filter((n) => n.label === "中立").length,
  };

  // 題材彙總
  const themeCount = new Map<string, number>();
  analyzed.forEach((n) => n.themes.forEach((t) => themeCount.set(t, (themeCount.get(t) ?? 0) + 1)));
  const hotThemes = [...themeCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <main className="min-h-screen bg-bg">
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-card">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">📰</span>
            <span className="font-bold">即時新聞情緒</span>
          </Link>
          <span className="text-xs text-muted-fg">
            {hasAI ? "🤖 AI 分析中" : "⚠️ 詞典法（未設 AI key）"}
          </span>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* 情緒統計 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-card border border-border shadow-card text-center">
            <div className="text-3xl font-bold text-up">{stats.pos}</div>
            <div className="text-xs text-muted-fg">利多</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-card text-center">
            <div className="text-3xl font-bold">{stats.neutral}</div>
            <div className="text-xs text-muted-fg">中立</div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border shadow-card text-center">
            <div className="text-3xl font-bold text-down">{stats.neg}</div>
            <div className="text-xs text-muted-fg">利空</div>
          </div>
        </div>

        {/* 熱門題材 */}
        {hotThemes.length > 0 && (
          <div className="p-4 rounded-xl bg-card border border-border shadow-card">
            <h3 className="text-sm font-semibold mb-2">🔥 熱門題材</h3>
            <div className="flex flex-wrap gap-2">
              {hotThemes.map(([theme, count]) => (
                <span key={theme} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {theme} <span className="opacity-60 text-xs">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 新聞列表 */}
        <div className="space-y-2">
          {analyzed.map((n) => (
            <a
              key={n.link}
              href={n.link}
              target="_blank"
              rel="noreferrer"
              className="block p-4 rounded-xl bg-card border border-border hover:shadow-card-hover transition"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-semibold flex-1">{n.title}</h3>
                <span className={`text-xs px-2 py-1 rounded-md whitespace-nowrap font-bold shrink-0 ${
                  n.label === "利多" ? "bg-up text-white" :
                  n.label === "利空" ? "bg-down text-white" :
                  "bg-muted text-muted-fg"
                }`}>
                  {n.label}
                </span>
              </div>
              {n.summary && n.summary !== n.title && (
                <p className="text-sm text-fg mb-2">💡 {n.summary}</p>
              )}
              {n.description && (
                <p className="text-xs text-muted-fg mb-2 line-clamp-2">{n.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-fg">{n.source}</span>
                <span className="text-muted-fg">
                  {new Date(n.pubDate).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                {n.themes.length > 0 && n.themes.map((t) => (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-warning/10 text-warning">#{t}</span>
                ))}
                {n.sectors.length > 0 && n.sectors.map((s) => (
                  <span key={s} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary">{s}</span>
                ))}
                {n.stocks.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {n.stocks.slice(0, 5).map((s) => (
                      <Link
                        key={s}
                        href={`/stock/${s}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-1.5 py-0.5 rounded bg-muted font-mono hover:bg-border"
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
      </div>
    </main>
  );
}
