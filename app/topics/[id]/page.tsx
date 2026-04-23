import Link from "next/link";
import { notFound } from "next/navigation";

type Catalyst = { date: string; event: string; importance?: number };
type Tier = { name: string; stocks: string[]; status?: string };
type Avoid = { ticker: string; reason: string };

type Topic = {
  id: string;
  name: string;
  heat_score: number | null;
  heat_trend: string | null;
  start_date: string | null;
  expected_duration_days: number | null;
  expected_end_date: string | null;
  status: string | null;
  stage: string | null;
  ai_summary: string | null;
  supply_chain: Record<string, Tier> | null;
  catalysts: Catalyst[] | null;
  investment_strategy: {
    short_term_1w?: string[];
    medium_term_1m?: string[];
    long_term_6m?: string[];
  } | null;
  avoid_list: Avoid[] | null;
  risk_factors: string[] | null;
  industry_ids: string[] | null;
};

const API = process.env.NEXT_PUBLIC_API_URL || "https://vsis-api.zeabur.app";

export const revalidate = 300;

async function getTopic(id: string): Promise<Topic | null> {
  try {
    const r = await fetch(`${API}/api/topics/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

const TREND_ARROW: Record<string, string> = {
  rising: "↑ 上升",
  stable: "→ 平穩",
  falling: "↓ 下降",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-up/15 text-up",
  archived: "bg-muted text-muted-fg",
  watching: "bg-info/15 text-info",
};

const STAGE_LABEL: Record<string, string> = {
  starting: "起動",
  main_rally: "主升段",
  mature: "成熟",
  cooling: "退潮",
};

function StockChip({ code }: { code: string }) {
  // numeric TW ticker → link, others (如 "德宏") only show
  const isTw = /^\d{4,6}$/.test(code);
  if (isTw) {
    return (
      <Link
        href={`/stock/${code}`}
        className="inline-block text-xs font-mono px-2 py-1 rounded bg-card border border-border hover:border-warning hover:bg-warning/5 transition"
      >
        {code}
      </Link>
    );
  }
  return (
    <span className="inline-block text-xs font-mono px-2 py-1 rounded bg-muted/60 text-muted-fg">
      {code}
    </span>
  );
}

export default async function TopicDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = await getTopic(id);
  if (!topic) notFound();

  const tiers = Object.entries(topic.supply_chain || {});
  const catalysts = (topic.catalysts || []).slice().sort((a, b) => b.date.localeCompare(a.date));

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-5 space-y-6">
        {/* header */}
        <div className="flex items-center gap-3 text-sm text-muted-fg">
          <Link href="/dashboard" className="hover:text-fg">← 大盤</Link>
          <span>/</span>
          <span>題材</span>
        </div>

        <header className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{topic.name}</h1>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {topic.status && (
                  <span className={`px-2 py-0.5 rounded ${STATUS_BADGE[topic.status] || "bg-muted"}`}>
                    {topic.status}
                  </span>
                )}
                {topic.stage && (
                  <span className="px-2 py-0.5 rounded bg-info/15 text-info">
                    {STAGE_LABEL[topic.stage] || topic.stage}
                  </span>
                )}
                {topic.heat_trend && (
                  <span className="px-2 py-0.5 rounded bg-muted text-fg">
                    熱度趨勢 {TREND_ARROW[topic.heat_trend] || topic.heat_trend}
                  </span>
                )}
                {topic.start_date && (
                  <span className="text-muted-fg">
                    起始 {topic.start_date}
                    {topic.expected_end_date ? ` → 預估 ${topic.expected_end_date}` : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-fg mb-1">熱度</div>
              <div className="text-4xl font-bold text-warning font-mono">
                {topic.heat_score ?? "-"}°
              </div>
            </div>
          </div>
          {topic.ai_summary && (
            <div className="mt-4 p-3 rounded-lg bg-muted/40 text-sm leading-relaxed">
              {topic.ai_summary}
            </div>
          )}
        </header>

        {/* 供應鏈分層 */}
        {tiers.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-info rounded" />
              🔗 供應鏈分層
            </h2>
            <div className="space-y-3">
              {tiers.map(([tierKey, tier]) => (
                <div key={tierKey} className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">{tier.name}</div>
                    {tier.status && (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-card border border-border">
                        {tier.status}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(tier.stocks || []).map((s) => (
                      <StockChip key={s} code={s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 投資策略 */}
        {topic.investment_strategy && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-up rounded" />
              💼 投資策略(按持有期)
            </h2>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { k: "short_term_1w", label: "短線 1 週", icon: "⚡" },
                { k: "medium_term_1m", label: "中線 1 個月", icon: "📈" },
                { k: "long_term_6m", label: "長線 6 個月", icon: "🗻" },
              ].map((s) => {
                const list = (topic.investment_strategy as Record<string, string[] | undefined>)[s.k] || [];
                return (
                  <div key={s.k} className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="text-xs text-muted-fg mb-2">
                      {s.icon} {s.label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {list.length === 0 && <span className="text-xs text-muted-fg">—</span>}
                      {list.map((c) => (
                        <StockChip key={c} code={c} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 催化劑時間軸 */}
        {catalysts.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-warning rounded" />
              🔥 催化劑時間軸
            </h2>
            <ul className="space-y-2">
              {catalysts.map((c, i) => (
                <li key={i} className="flex gap-3 text-sm border-l-2 border-warning/30 pl-3 py-1">
                  <span className="font-mono text-xs text-muted-fg w-20 flex-shrink-0">
                    {c.date}
                  </span>
                  <span className="flex-1">{c.event}</span>
                  {c.importance !== undefined && (
                    <span className="text-xs font-mono text-warning flex-shrink-0">
                      {"●".repeat(Math.min(3, Math.max(1, Math.ceil(c.importance / 4))))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 風險 + 避開清單 */}
        <div className="grid md:grid-cols-2 gap-4">
          {topic.risk_factors && topic.risk_factors.length > 0 && (
            <section className="bg-card border border-border rounded-xl p-5 shadow-card">
              <h2 className="font-semibold text-base mb-3 flex items-center gap-2 text-down">
                <span className="w-1 h-5 bg-down rounded" />
                ⚠️ 風險提醒
              </h2>
              <ul className="space-y-2 text-sm">
                {topic.risk_factors.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-down flex-shrink-0">•</span>
                    <span className="leading-relaxed">{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {topic.avoid_list && topic.avoid_list.length > 0 && (
            <section className="bg-card border border-border rounded-xl p-5 shadow-card">
              <h2 className="font-semibold text-base mb-3 flex items-center gap-2 text-down">
                <span className="w-1 h-5 bg-down rounded" />
                ❌ 避開清單
              </h2>
              <ul className="space-y-2 text-sm">
                {topic.avoid_list.map((a) => (
                  <li key={a.ticker} className="flex gap-2 items-start">
                    <StockChip code={a.ticker} />
                    <span className="text-muted-fg leading-relaxed">{a.reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
