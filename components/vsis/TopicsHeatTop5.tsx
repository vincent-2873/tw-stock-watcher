import Link from "next/link";

type Topic = {
  id: string;
  name: string;
  heat_score: number | null;
  heat_trend: string | null;
  status: string | null;
  stage: string | null;
  ai_summary: string | null;
  supply_chain: Record<string, { name: string; stocks: string[]; status?: string }> | null;
  industry_ids: string[] | null;
};

const API = process.env.NEXT_PUBLIC_API_URL || "https://vsis-api.zeabur.app";

const MEDAL = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
const TREND_ARROW: Record<string, string> = {
  rising: "↑",
  stable: "→",
  falling: "↓",
};

function heatBar(score: number) {
  const pct = Math.min(100, Math.max(0, score));
  let color = "bg-muted";
  if (pct >= 90) color = "bg-down"; // 熾熱紅
  else if (pct >= 75) color = "bg-warning"; // 橘黃
  else if (pct >= 60) color = "bg-up"; // 綠
  else color = "bg-info";
  return { pct, color };
}

export default async function TopicsHeatTop5() {
  let topics: Topic[] = [];
  try {
    const r = await fetch(`${API}/api/topics?status=active&order=heat&limit=5`, {
      next: { revalidate: 300 },
    });
    if (r.ok) {
      const j = await r.json();
      topics = j.topics || [];
    }
  } catch (e) {
    console.error("TopicsHeatTop5 fetch failed", e);
  }

  if (topics.length === 0) {
    return null;
  }

  return (
    <section className="bg-card border border-border rounded-xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2 text-lg">
          <span className="w-1 h-6 bg-warning rounded" />
          🔥 今日題材熱度 TOP 5
        </h2>
        <Link href="/intel" className="text-xs text-muted-fg hover:text-fg">
          更多題材 →
        </Link>
      </div>

      <div className="space-y-3">
        {topics.map((t, i) => {
          const score = t.heat_score ?? 0;
          const { pct, color } = heatBar(score);
          const trendArrow = TREND_ARROW[t.heat_trend || ""] || "";
          const chainTiers = Object.values(t.supply_chain || {}).filter(Boolean);
          const firstLineStocks = chainTiers
            .flatMap((tier) => tier?.stocks || [])
            .slice(0, 6);

          return (
            <Link
              key={t.id}
              href={`/topics/${t.id}`}
              className="block group"
            >
              <div className="p-3 rounded-lg border border-border hover:border-warning hover:bg-warning/5 transition">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xl flex-shrink-0 w-7 text-center">
                    {MEDAL[i] || `${i + 1}`}
                  </span>
                  <span className="font-semibold text-base flex-1 truncate">
                    {t.name}
                  </span>
                  <span className="font-mono text-sm text-muted-fg flex-shrink-0">
                    {trendArrow} {score}°
                  </span>
                  {t.stage && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-fg flex-shrink-0 hidden sm:inline">
                      {t.stage.replace("_", " ")}
                    </span>
                  )}
                </div>

                {/* heat bar */}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                  <div
                    className={`h-full ${color} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* ai summary */}
                {t.ai_summary && (
                  <p className="text-xs text-muted-fg line-clamp-2 mb-2 leading-snug">
                    {t.ai_summary}
                  </p>
                )}

                {/* quick stocks */}
                {firstLineStocks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {firstLineStocks.map((s) => (
                      <span
                        key={s}
                        className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted/70 group-hover:bg-card border border-border"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
