import Link from "next/link";
import { API_URL } from "@/lib/api";
import { QuackAvatar } from "@/components/quack/QuackAvatar";

export const revalidate = 300;

type Tier = { name: string; stocks: string[]; status?: string };
type Topic = {
  id: string;
  name: string;
  heat_score: number | null;
  heat_trend: string | null;
  stage: string | null;
  status: string | null;
  ai_summary: string | null;
  supply_chain: Record<string, Tier> | null;
  industry_ids: string[] | null;
};

async function loadTopics(): Promise<Topic[]> {
  try {
    const r = await fetch(`${API_URL}/api/topics?status=active&order=heat&limit=50`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.topics ?? []) as Topic[];
  } catch {
    return [];
  }
}

function heatColor(score: number): string {
  if (score >= 90) return "var(--up)";
  if (score >= 75) return "var(--up-soft)";
  if (score >= 60) return "var(--gold)";
  return "var(--moss)";
}

const STAGE_LABEL: Record<string, string> = {
  starting: "起動",
  main_rally: "主升段",
  mature: "成熟",
  cooling: "退潮",
};

export default async function PondPage() {
  const topics = await loadTopics();

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
        {/* breadcrumb */}
        <div className="text-xs mb-5" style={{ color: "var(--muted-fg)" }}>
          <Link href="/" className="hover:text-[var(--fg)]">
            今日
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--fg-soft)" }}>池塘</span>
        </div>

        {/* header */}
        <header className="mb-8 flex items-start gap-4">
          <QuackAvatar state="observing" size="lg" />
          <div>
            <h1
              className="text-3xl md:text-4xl mb-1"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: "var(--fg)",
              }}
            >
              池塘
            </h1>
            <p className="text-sm font-serif italic" style={{ color: "var(--muted-fg)" }}>
              「呱呱在池塘邊,看誰在動。」
            </p>
          </div>
        </header>

        <div className="wabi-divider mb-6" />

        {/* topics list */}
        {topics.length === 0 ? (
          <div
            className="text-center py-20 text-sm font-serif italic"
            style={{ color: "var(--muted-fg)" }}
          >
            ——  池塘還很安靜,呱呱先睡一下  ——
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((t, i) => {
              const score = t.heat_score ?? 0;
              const color = heatColor(score);
              const topStocks = Object.values(t.supply_chain || {})
                .flatMap((x) => x?.stocks || [])
                .filter((s, idx, arr) => arr.indexOf(s) === idx)
                .slice(0, 8);
              return (
                <Link
                  key={t.id}
                  href={`/pond/${t.id}`}
                  className="block group"
                  style={{ textDecoration: "none" }}
                >
                  <article
                    className="wabi-card transition-all"
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      padding: "20px 22px",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span
                          className="font-mono text-xs"
                          style={{ color: "var(--muted-fg)", minWidth: "1.5rem" }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h2
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: "19px",
                            fontWeight: 500,
                            color: "var(--fg)",
                          }}
                        >
                          {t.name}
                        </h2>
                        {t.stage && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{
                              background: "var(--muted)",
                              color: "var(--muted-fg)",
                            }}
                          >
                            {STAGE_LABEL[t.stage] || t.stage}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div
                          className="font-mono"
                          style={{
                            color,
                            fontFamily: "var(--font-mono)",
                            fontSize: "26px",
                            lineHeight: 1,
                            fontWeight: 500,
                          }}
                        >
                          {score}
                          <span style={{ fontSize: "15px", marginLeft: "2px" }}>°</span>
                        </div>
                        {t.heat_trend && (
                          <div
                            className="text-[11px] mt-0.5"
                            style={{ color: "var(--muted-fg)" }}
                          >
                            {t.heat_trend === "rising"
                              ? "↑ 升溫"
                              : t.heat_trend === "falling"
                              ? "↓ 降溫"
                              : "→ 平穩"}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* heat bar */}
                    <div
                      className="h-[3px] rounded-full overflow-hidden mb-3"
                      style={{ background: "var(--muted)" }}
                    >
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, score))}%`,
                          background: color,
                        }}
                      />
                    </div>
                    {t.ai_summary && (
                      <p
                        className="text-sm leading-relaxed line-clamp-2 mb-3"
                        style={{ color: "var(--fg-soft)" }}
                      >
                        {t.ai_summary}
                      </p>
                    )}
                    {topStocks.length > 0 && (
                      <div
                        className="text-xs font-mono truncate"
                        style={{
                          color: "var(--muted-fg)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {topStocks.join(" · ")}
                      </div>
                    )}
                  </article>
                </Link>
              );
            })}
          </div>
        )}

        <footer className="text-center mt-10 py-6">
          <div className="wabi-divider" />
          <p className="text-xs font-serif italic" style={{ color: "var(--muted-fg)" }}>
            ⚠ 熱度為多訊號綜合,非買賣訊號。
          </p>
        </footer>
      </div>
    </main>
  );
}
