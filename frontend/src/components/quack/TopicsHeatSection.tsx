import Link from "next/link";
import { API_URL } from "@/lib/api";

type Tier = { name: string; stocks: string[]; status?: string };
type Topic = {
  id: string;
  name: string;
  heat_score: number | null;
  heat_trend: string | null;
  stage: string | null;
  ai_summary: string | null;
  supply_chain: Record<string, Tier> | null;
  industry_ids: string[] | null;
};

const TREND_ARROW: Record<string, string> = {
  rising: "↑",
  stable: "→",
  falling: "↓",
};

function heatColor(score: number): string {
  if (score >= 90) return "var(--up)"; // 赭紅(熾)
  if (score >= 75) return "var(--up-soft)"; // 淺赭紅
  if (score >= 60) return "var(--gold)"; // 金粟
  return "var(--moss)"; // 苔綠
}

async function loadTopics(limit = 5): Promise<Topic[]> {
  try {
    const r = await fetch(`${API_URL}/api/topics?status=active&order=heat&limit=${limit}`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.topics ?? []) as Topic[];
  } catch {
    return [];
  }
}

export async function TopicsHeatSection() {
  const topics = await loadTopics(5);
  if (topics.length === 0) return null;

  return (
    <section
      className="wabi-card"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        padding: "24px",
      }}
    >
      <div className="flex items-baseline justify-between mb-5">
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "20px",
            fontWeight: 600,
            color: "var(--fg)",
            letterSpacing: "0.04em",
          }}
        >
          池塘動靜 · Top 5
        </h2>
        <Link
          href="/pond"
          className="text-xs"
          style={{ color: "var(--muted-fg)" }}
        >
          看池塘全景 →
        </Link>
      </div>

      <div className="space-y-4">
        {topics.map((t, i) => {
          const score = t.heat_score ?? 0;
          const color = heatColor(score);
          const trend = TREND_ARROW[t.heat_trend || ""] || "";
          const topStocks = Object.values(t.supply_chain || {})
            .flatMap((x) => x?.stocks || [])
            .filter((s, idx, arr) => arr.indexOf(s) === idx)
            .slice(0, 6);

          return (
            <Link
              key={t.id}
              href={`/pond/${t.id}`}
              className="block group"
              style={{ textDecoration: "none" }}
            >
              <div
                className="grid gap-3 transition-all"
                style={{
                  gridTemplateColumns: "28px 1fr auto",
                  alignItems: "center",
                }}
              >
                <span
                  className="font-mono text-sm"
                  style={{
                    color: "var(--muted-fg)",
                    fontFamily: "var(--font-serif)",
                    fontSize: "14px",
                  }}
                >
                  {i + 1}.
                </span>
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "16px",
                        fontWeight: 500,
                        color: "var(--fg)",
                      }}
                    >
                      {t.name}
                    </span>
                    {t.stage && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: "var(--muted)",
                          color: "var(--muted-fg)",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {t.stage === "main_rally"
                          ? "主升段"
                          : t.stage === "starting"
                          ? "起動"
                          : t.stage === "cooling"
                          ? "退潮"
                          : t.stage}
                      </span>
                    )}
                  </div>
                  {/* heat bar */}
                  <div
                    className="mt-2 h-[3px] rounded-full overflow-hidden"
                    style={{ background: "var(--muted)" }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, score))}%`,
                        background: color,
                      }}
                    />
                  </div>
                  {topStocks.length > 0 && (
                    <div
                      className="mt-2 text-xs font-mono truncate"
                      style={{
                        color: "var(--muted-fg)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {topStocks.join(" · ")}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div
                    className="font-mono"
                    style={{
                      color,
                      fontFamily: "var(--font-mono)",
                      fontSize: "22px",
                      lineHeight: 1,
                      fontWeight: 500,
                    }}
                  >
                    {score}
                    <span style={{ fontSize: "13px", marginLeft: "2px" }}>°</span>
                  </div>
                  {trend && (
                    <div
                      className="text-xs mt-0.5"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      {trend}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default TopicsHeatSection;
