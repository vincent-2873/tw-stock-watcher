import Link from "next/link";
import { notFound } from "next/navigation";
import { API_URL } from "@/lib/api";
import { QuackAvatar } from "@/components/quack/QuackAvatar";

export const revalidate = 300;

type Catalyst = { date: string; event: string; importance?: number };
type Tier = { name: string; stocks: string[]; status?: string };
type Avoid = { ticker: string; reason: string };
type Topic = {
  id: string;
  name: string;
  heat_score: number | null;
  heat_trend: string | null;
  start_date: string | null;
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
};

async function loadTopic(id: string): Promise<Topic | null> {
  try {
    const r = await fetch(`${API_URL}/api/topics/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return null;
    return (await r.json()) as Topic;
  } catch {
    return null;
  }
}

function heatColor(score: number): string {
  if (score >= 90) return "var(--up)";
  if (score >= 75) return "var(--up-soft)";
  if (score >= 60) return "var(--gold)";
  return "var(--moss)";
}

function StockChip({ code }: { code: string }) {
  const isTw = /^\d{4,6}$/.test(code);
  return (
    <Link
      href={isTw ? `/stocks/${code}` : "#"}
      className="inline-block text-[12px] font-mono px-2 py-1 rounded transition-colors"
      style={{
        background: "var(--bg-raised)",
        color: "var(--fg-soft)",
        border: "1px solid var(--border)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {code}
    </Link>
  );
}

const STAGE_LABEL: Record<string, string> = {
  starting: "起動",
  main_rally: "主升段",
  mature: "成熟",
  cooling: "退潮",
};

export default async function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const topic = await loadTopic(topicId);
  if (!topic) notFound();

  const tiers = Object.entries(topic.supply_chain || {});
  const catalysts = (topic.catalysts || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const score = topic.heat_score ?? 0;
  const color = heatColor(score);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-10">
        {/* breadcrumb */}
        <div className="text-xs mb-5" style={{ color: "var(--muted-fg)" }}>
          <Link href="/" className="hover:text-[var(--fg)]">
            今日
          </Link>
          <span className="mx-2">/</span>
          <Link href="/pond" className="hover:text-[var(--fg)]">
            池塘
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--fg-soft)" }}>{topic.name}</span>
        </div>

        {/* header */}
        <header
          className="wabi-card mb-6"
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            padding: "24px",
          }}
        >
          <div className="flex items-start gap-5 flex-wrap">
            <QuackAvatar state="studying" size="lg" />
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl md:text-3xl mb-2"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 600,
                  letterSpacing: "0.03em",
                  color: "var(--fg)",
                }}
              >
                {topic.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap text-xs mb-3">
                {topic.stage && (
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ background: "var(--muted)", color: "var(--fg-soft)" }}
                  >
                    {STAGE_LABEL[topic.stage] || topic.stage}
                  </span>
                )}
                {topic.heat_trend && (
                  <span style={{ color: "var(--muted-fg)" }}>
                    {topic.heat_trend === "rising"
                      ? "↑ 熱度上升"
                      : topic.heat_trend === "falling"
                      ? "↓ 熱度下降"
                      : "→ 熱度平穩"}
                  </span>
                )}
                {topic.start_date && (
                  <span style={{ color: "var(--muted-fg)" }}>
                    {topic.start_date}
                    {topic.expected_end_date ? ` → ${topic.expected_end_date}` : ""}
                  </span>
                )}
              </div>
              {topic.ai_summary && (
                <p className="text-sm leading-relaxed" style={{ color: "var(--fg-soft)" }}>
                  {topic.ai_summary}
                </p>
              )}
            </div>
            <div className="text-right">
              <div
                className="text-[10px] tracking-widest mb-1"
                style={{ color: "var(--muted-fg)" }}
              >
                熱度
              </div>
              <div
                className="font-mono"
                style={{
                  color,
                  fontFamily: "var(--font-mono)",
                  fontSize: "48px",
                  lineHeight: 1,
                  fontWeight: 500,
                }}
              >
                {score}
                <span style={{ fontSize: "22px" }}>°</span>
              </div>
            </div>
          </div>
        </header>

        {/* 供應鏈分層 */}
        {tiers.length > 0 && (
          <section
            className="wabi-card mb-6"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              padding: "22px 24px",
            }}
          >
            <h2
              className="mb-4"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "18px",
                fontWeight: 500,
                color: "var(--fg)",
              }}
            >
              供應鏈分層
            </h2>
            <div className="space-y-3">
              {tiers.map(([key, t]) => (
                <div
                  key={key}
                  className="p-3 rounded-lg"
                  style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-sm"
                      style={{
                        fontFamily: "var(--font-serif)",
                        color: "var(--fg)",
                        fontWeight: 500,
                      }}
                    >
                      {t.name}
                    </span>
                    {t.status && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--muted)",
                          color: "var(--muted-fg)",
                        }}
                      >
                        {t.status}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(t.stocks || []).map((s) => (
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
          <section
            className="wabi-card mb-6"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              padding: "22px 24px",
            }}
          >
            <h2
              className="mb-4"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "18px",
                fontWeight: 500,
                color: "var(--fg)",
              }}
            >
              呱呱建議(依持有期)
            </h2>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { k: "short_term_1w", label: "短線 · 1 週" },
                { k: "medium_term_1m", label: "中線 · 1 月" },
                { k: "long_term_6m", label: "長線 · 半年" },
              ].map((s) => {
                const list =
                  (topic.investment_strategy as Record<string, string[] | undefined>)[s.k] || [];
                return (
                  <div
                    key={s.k}
                    className="p-3 rounded-lg"
                    style={{
                      background: "var(--bg-raised)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div
                      className="text-xs mb-2 tracking-wider"
                      style={{ color: "var(--muted-fg)", fontFamily: "var(--font-serif)" }}
                    >
                      {s.label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {list.length === 0 ? (
                        <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
                          —
                        </span>
                      ) : (
                        list.map((c) => <StockChip key={c} code={c} />)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 催化劑 */}
        {catalysts.length > 0 && (
          <section
            className="wabi-card mb-6"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              padding: "22px 24px",
            }}
          >
            <h2
              className="mb-4"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "18px",
                fontWeight: 500,
                color: "var(--fg)",
              }}
            >
              催化劑 · 時間軸
            </h2>
            <ul className="space-y-2">
              {catalysts.map((c, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-sm pl-3 py-1"
                  style={{ borderLeft: "2px solid var(--gold)" }}
                >
                  <span
                    className="font-mono text-xs w-24 flex-shrink-0 pt-0.5"
                    style={{ color: "var(--muted-fg)", fontFamily: "var(--font-mono)" }}
                  >
                    {c.date}
                  </span>
                  <span className="flex-1" style={{ color: "var(--fg-soft)" }}>
                    {c.event}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 風險 + 避開 */}
        <div className="grid md:grid-cols-2 gap-5 mb-8">
          {topic.risk_factors && topic.risk_factors.length > 0 && (
            <section
              className="wabi-card"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                padding: "20px 22px",
              }}
            >
              <h2
                className="mb-3"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "var(--down)",
                }}
              >
                風險
              </h2>
              <ul className="space-y-2 text-sm">
                {topic.risk_factors.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span style={{ color: "var(--down)", flexShrink: 0 }}>·</span>
                    <span style={{ color: "var(--fg-soft)" }}>{r}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {topic.avoid_list && topic.avoid_list.length > 0 && (
            <section
              className="wabi-card"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                padding: "20px 22px",
              }}
            >
              <h2
                className="mb-3"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "16px",
                  fontWeight: 500,
                  color: "var(--down)",
                }}
              >
                避開清單
              </h2>
              <ul className="space-y-2 text-sm">
                {topic.avoid_list.map((a) => (
                  <li key={a.ticker} className="flex gap-2 items-start">
                    <StockChip code={a.ticker} />
                    <span style={{ color: "var(--muted-fg)", lineHeight: 1.6 }}>
                      {a.reason}
                    </span>
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
