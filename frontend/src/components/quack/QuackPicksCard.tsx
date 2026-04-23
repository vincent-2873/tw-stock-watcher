import Link from "next/link";
import { API_URL } from "@/lib/api";
import { QuackAvatar } from "./QuackAvatar";

type Pick = {
  ticker: string;
  topic_id: string;
  topic_name: string;
  topic_stage: string | null;
  heat_score: number;
  chain_tier: string | null;
  topic_summary: string | null;
};

async function loadPicks(horizon: "1w" | "1m", limit = 6): Promise<Pick[]> {
  try {
    const r = await fetch(`${API_URL}/api/quack/picks?horizon=${horizon}&limit=${limit}`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.picks ?? []) as Pick[];
  } catch {
    return [];
  }
}

const STAGE_LABEL: Record<string, string> = {
  starting: "起動",
  main_rally: "主升段",
  mature: "成熟",
  cooling: "退潮",
};

function heatColor(score: number): string {
  if (score >= 90) return "var(--up)";
  if (score >= 75) return "var(--up-soft)";
  if (score >= 60) return "var(--gold)";
  return "var(--moss)";
}

export async function QuackPicksCard() {
  const [week, month] = await Promise.all([loadPicks("1w", 6), loadPicks("1m", 4)]);
  if (week.length === 0 && month.length === 0) return null;

  return (
    <section
      className="wabi-card"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border-strong)",
        padding: "22px 24px",
      }}
    >
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <QuackAvatar state="thinking" size="md" />
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "18px",
              fontWeight: 500,
              color: "var(--fg)",
              letterSpacing: "0.04em",
            }}
          >
            呱呱這週挑的
          </h2>
        </div>
        <span className="text-[11px]" style={{ color: "var(--muted-fg)" }}>
          依題材熱度 × 供應鏈位置選出
        </span>
      </div>

      {week.length > 0 && (
        <>
          <div
            className="text-xs mb-2 tracking-wider"
            style={{ color: "var(--muted-fg)", fontFamily: "var(--font-serif)" }}
          >
            1 週短波段
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
            {week.map((p) => (
              <Link
                key={`w-${p.ticker}`}
                href={`/stocks/${p.ticker}`}
                className="block group"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="p-3 rounded-lg transition-all"
                  style={{
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <span
                      className="font-mono"
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "var(--fg)",
                        fontSize: "18px",
                        fontWeight: 500,
                      }}
                    >
                      {p.ticker}
                    </span>
                    <span
                      className="font-mono text-sm"
                      style={{
                        color: heatColor(p.heat_score),
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {p.heat_score}°
                    </span>
                  </div>
                  <div
                    className="text-[12px]"
                    style={{
                      color: "var(--fg-soft)",
                      fontFamily: "var(--font-serif)",
                    }}
                  >
                    {p.topic_name}
                    {p.topic_stage ? (
                      <span
                        className="ml-1 text-[10px]"
                        style={{ color: "var(--muted-fg)" }}
                      >
                        · {STAGE_LABEL[p.topic_stage] || p.topic_stage}
                      </span>
                    ) : null}
                  </div>
                  {p.chain_tier && (
                    <div
                      className="text-[11px] mt-1"
                      style={{ color: "var(--muted-fg)" }}
                    >
                      供應鏈:{p.chain_tier}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {month.length > 0 && (
        <>
          <div
            className="text-xs mb-2 tracking-wider"
            style={{ color: "var(--muted-fg)", fontFamily: "var(--font-serif)" }}
          >
            1 個月中期
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {month.map((p) => (
              <Link
                key={`m-${p.ticker}`}
                href={`/stocks/${p.ticker}`}
                className="flex items-baseline justify-between p-2.5 rounded-lg"
                style={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  textDecoration: "none",
                }}
              >
                <div>
                  <div
                    className="font-mono"
                    style={{
                      fontFamily: "var(--font-mono)",
                      color: "var(--fg)",
                      fontWeight: 500,
                    }}
                  >
                    {p.ticker}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{
                      color: "var(--muted-fg)",
                      fontFamily: "var(--font-serif)",
                    }}
                  >
                    {p.topic_name}
                  </div>
                </div>
                <span
                  className="text-xs font-mono"
                  style={{
                    color: heatColor(p.heat_score),
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {p.heat_score}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
      <p
        className="mt-4 text-[11px] font-serif italic"
        style={{ color: "var(--muted-fg)" }}
      >
        ⚠ 推薦基於題材資料庫,實際進場需配合個股評分與停損設定。
      </p>
    </section>
  );
}

export default QuackPicksCard;
