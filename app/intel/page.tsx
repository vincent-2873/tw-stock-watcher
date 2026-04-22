import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  fetchUSMarketIntel,
  fetchSupplyChain,
  findRelatedTWStocks,
  KEY_PEOPLE,
} from "@/lib/data-sources/intelligence";
import { fetchAllIndices } from "@/lib/data-sources/markets";
import { analyzeNewsWithAI, type NewsAnalysis } from "@/lib/analysis/sentiment-ai";

export const revalidate = 600;

export default async function IntelPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [usNewsRes, scNewsRes, indicesRes] = await Promise.allSettled([
    fetchUSMarketIntel(20),
    fetchSupplyChain(30),
    fetchAllIndices(),
  ]);
  const usNews = usNewsRes.status === "fulfilled" ? usNewsRes.value : [];
  const scNews = scNewsRes.status === "fulfilled" ? scNewsRes.value : [];
  const indices = indicesRes.status === "fulfilled" ? indicesRes.value : [];

  const hasAI = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);

  type EnrichedNews = {
    title: string; link: string; pubDate: string; source: string; description?: string;
  } & NewsAnalysis & { relatedTW: ReturnType<typeof findRelatedTWStocks> };

  async function enrich(list: Array<{ title: string; link: string; pubDate: string; source: string; description?: string }>): Promise<EnrichedNews[]> {
    const result: EnrichedNews[] = [];
    const batchSize = hasAI ? 3 : list.length;
    for (let i = 0; i < list.length; i += batchSize) {
      const batch = list.slice(i, i + batchSize);
      const done = await Promise.all(batch.map(async (n) => {
        const ai = await analyzeNewsWithAI(n.title, n.description).catch(() => null);
        const relatedTW = findRelatedTWStocks(`${n.title} ${n.description ?? ""}`);
        return {
          ...n,
          ...(ai ?? { score: 0, label: "中立" as const, summary: n.title, stocks: [], themes: [], sectors: [], confidence: 0 }),
          relatedTW,
        };
      }));
      result.push(...done);
    }
    return result;
  }

  const [enrichedUS, enrichedSC] = await Promise.all([enrich(usNews), enrich(scNews)]);

  // 受台股影響的美國新聞
  const twImpactNews = enrichedUS.filter((n) => n.relatedTW.length > 0);

  // 台美指數對比
  const tw = indices.find((i) => i.symbol === "^TWII");
  const us = indices.filter((i) => ["^DJI", "^IXIC", "^SOX", "^GSPC"].includes(i.symbol));

  // 關鍵人物提到率
  const peopleMentions: Array<{ name: string; count: number }> = Object.entries(KEY_PEOPLE).map(([name, kws]) => ({
    name,
    count: [...enrichedUS, ...enrichedSC].filter((n) =>
      kws.some((k) => `${n.title} ${n.description ?? ""}`.toLowerCase().includes(k.toLowerCase()))
    ).length,
  })).filter((p) => p.count > 0).sort((a, b) => b.count - a.count);

  return (
    <main className="min-h-screen bg-bg">
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-card">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="font-bold">情報中心</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {[
              { href: "/dashboard", label: "大盤" },
              { href: "/intel", label: "情報", active: true },
              { href: "/stock", label: "個股" },
              { href: "/screener", label: "選股" },
              { href: "/sectors", label: "類股" },
              { href: "/watchlist", label: "自選" },
            ].map((l) => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1.5 rounded-md transition font-medium ${
                  l.active ? "bg-primary/10 text-primary" : "hover:bg-muted text-fg"
                }`}>
                {l.label}
              </Link>
            ))}
          </nav>
          <span className="text-xs text-muted-fg hidden md:inline">
            {hasAI ? "🤖 AI 分析中" : "⚠️ 未設 AI key"}
          </span>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* 台美同步摘要 */}
        <section className="grid md:grid-cols-5 gap-3">
          {tw && (
            <div className="p-4 rounded-xl bg-card border-2 border-primary shadow-card md:col-span-1">
              <div className="text-xs text-muted-fg">台股</div>
              <div className="font-bold">{tw.label}</div>
              <div className="text-2xl font-mono font-bold mt-1">{tw.price.toFixed(0)}</div>
              <div className={`text-sm font-mono ${tw.change >= 0 ? "text-up" : "text-down"}`}>
                {tw.change >= 0 ? "▲" : "▼"} {Math.abs(tw.change).toFixed(0)} ({tw.changePercent.toFixed(2)}%)
              </div>
            </div>
          )}
          {us.map((i) => (
            <div key={i.symbol} className="p-4 rounded-xl bg-card border border-border shadow-card">
              <div className="text-xs text-muted-fg">🇺🇸 {i.label}</div>
              <div className="text-2xl font-mono font-bold mt-1">{i.price.toFixed(0)}</div>
              <div className={`text-sm font-mono ${i.change >= 0 ? "text-up" : "text-down"}`}>
                {i.change >= 0 ? "▲" : "▼"} {Math.abs(i.change).toFixed(0)} ({i.changePercent.toFixed(2)}%)
              </div>
            </div>
          ))}
        </section>

        {/* 關鍵人物熱度 */}
        {peopleMentions.length > 0 && (
          <section className="p-4 rounded-xl bg-card border border-border shadow-card">
            <h3 className="text-sm font-semibold mb-3">👤 關鍵人物近期熱度</h3>
            <div className="flex flex-wrap gap-2">
              {peopleMentions.map((p) => (
                <span key={p.name} className="px-3 py-1.5 rounded-full bg-warning/10 text-warning text-sm font-medium">
                  {p.name} <span className="text-xs opacity-70">×{p.count}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 雙欄：美國新聞 → 台股連動 + 供應鏈 */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* 左：美國 → 台股連動 */}
          <section className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="px-4 py-3 border-b border-border bg-primary/5">
              <h2 className="font-semibold text-primary flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded" />
                🇺🇸 美國新聞 × 台股連動
                <span className="text-xs text-muted-fg font-normal">({twImpactNews.length})</span>
              </h2>
            </div>
            <div className="divide-y divide-border max-h-[800px] overflow-y-auto">
              {twImpactNews.length === 0 ? (
                <div className="p-4 text-sm text-muted-fg">目前無明顯關聯</div>
              ) : twImpactNews.map((n) => (
                <a key={n.link} href={n.link} target="_blank" rel="noreferrer"
                  className="block p-4 hover:bg-muted/50 transition">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-semibold text-sm flex-1">{n.title}</h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${
                      n.label === "利多" ? "bg-up text-white" :
                      n.label === "利空" ? "bg-down text-white" : "bg-muted text-muted-fg"
                    }`}>{n.label}</span>
                  </div>
                  {n.summary && n.summary !== n.title && (
                    <p className="text-xs text-fg mb-2">💡 {n.summary}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {n.relatedTW.map((r) => (
                      <div key={r.company} className="flex flex-wrap items-center gap-1 bg-muted/50 rounded px-2 py-1">
                        <span className="text-xs font-bold">{r.company} →</span>
                        {r.stocks.slice(0, 4).map((s) => (
                          <Link key={s.code} href={`/stock/${s.code}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs bg-primary/10 text-primary font-mono px-1.5 py-0.5 rounded hover:bg-primary/20">
                            {s.code} {s.name}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-fg">
                    {n.source} · {new Date(n.pubDate).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* 右：供應鏈新聞 */}
          <section className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="px-4 py-3 border-b border-border bg-warning/5">
              <h2 className="font-semibold text-warning flex items-center gap-2">
                <span className="w-1 h-5 bg-warning rounded" />
                🔗 台股即時情資
                <span className="text-xs text-muted-fg font-normal">({enrichedSC.length})</span>
              </h2>
            </div>
            <div className="divide-y divide-border max-h-[800px] overflow-y-auto">
              {enrichedSC.map((n) => (
                <a key={n.link} href={n.link} target="_blank" rel="noreferrer"
                  className="block p-4 hover:bg-muted/50 transition">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h4 className="font-semibold text-sm flex-1">{n.title}</h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap ${
                      n.label === "利多" ? "bg-up text-white" :
                      n.label === "利空" ? "bg-down text-white" : "bg-muted text-muted-fg"
                    }`}>{n.label}</span>
                  </div>
                  {n.summary && n.summary !== n.title && (
                    <p className="text-xs text-fg mb-2">💡 {n.summary}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-fg">
                    <span>{n.source}</span>
                    <span>·</span>
                    <span>{new Date(n.pubDate).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    {n.themes.slice(0, 3).map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-warning/10 text-warning">#{t}</span>
                    ))}
                    {n.stocks.slice(0, 3).map((s) => (
                      <Link key={s} href={`/stock/${s}`} onClick={(e) => e.stopPropagation()}
                        className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono hover:bg-primary/20">{s}</Link>
                    ))}
                  </div>
                </a>
              ))}
            </div>
          </section>
        </div>

        {/* 其他美國新聞（無台股關聯，也顯示） */}
        {enrichedUS.length > twImpactNews.length && (
          <section className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <span className="w-1 h-5 bg-muted-fg rounded" />
                🌍 其他美國財經
              </h2>
            </div>
            <div className="grid md:grid-cols-2 divide-x divide-border">
              {enrichedUS.filter((n) => n.relatedTW.length === 0).slice(0, 10).map((n) => (
                <a key={n.link} href={n.link} target="_blank" rel="noreferrer"
                  className="block p-3 hover:bg-muted/50 transition border-b border-border">
                  <div className="flex items-start gap-2 mb-1">
                    <h4 className="text-sm font-medium flex-1">{n.title}</h4>
                    <span className={`text-[9px] px-1 py-0.5 rounded whitespace-nowrap ${
                      n.label === "利多" ? "bg-up text-white" :
                      n.label === "利空" ? "bg-down text-white" : "bg-muted text-muted-fg"
                    }`}>{n.label}</span>
                  </div>
                  <div className="text-[10px] text-muted-fg">
                    {n.source} · {new Date(n.pubDate).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
