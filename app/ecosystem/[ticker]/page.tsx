import Link from "next/link";
import { notFound } from "next/navigation";

type Customer = {
  name: string;
  ticker_overseas?: string;
  revenue_share_pct?: number;
  products?: string[];
  importance?: number;
  growth_potential?: string;
  latest_news?: string;
};
type Supplier = {
  category: string;
  vendor_name?: string;
  vendor_names?: string[];
  taiwan_related_stocks?: string[];
  substitutable?: boolean;
  strategic_importance?: string;
  note?: string;
  domestic_ratio?: number;
};
type Competitor = {
  name: string;
  market_share_pct?: number;
  competitive_level?: string;
  technology_gap_years?: number;
  government_backing?: boolean;
};
type Benefit = {
  ticker: string;
  name?: string;
  category?: string;
  correlation_pct?: number;
  elasticity_grade?: string;
  note?: string;
  target_price?: number;
};

type Ecosystem = {
  anchor_ticker: string;
  anchor_name: string;
  anchor_english: string | null;
  anchor_type: string | null;
  industry: string | null;
  global_position: string | null;
  market_cap_ntd: string | null;
  current_price_range: string | null;
  key_description: string | null;
  customers: Customer[] | null;
  cloud_customers: { name: string; product: string }[] | null;
  suppliers: Supplier[] | null;
  competitors: Competitor[] | null;
  downstream_partners: Record<string, string[]> | null;
  taiwan_beneficiary_stocks: Benefit[] | null;
};

const API = process.env.NEXT_PUBLIC_API_URL || "https://vsis-api.zeabur.app";

export const revalidate = 600;

async function getEco(t: string): Promise<Ecosystem | null> {
  try {
    const r = await fetch(`${API}/api/ecosystems/${encodeURIComponent(t)}`, {
      next: { revalidate: 600 },
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

function TWChip({ code, label }: { code: string; label?: string }) {
  const isTw = /^\d{4,6}$/.test(code);
  if (isTw) {
    return (
      <Link
        href={`/stock/${code}`}
        className="inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded bg-card border border-border hover:border-warning hover:bg-warning/5 transition"
      >
        {code}
        {label && <span className="text-muted-fg">{label}</span>}
      </Link>
    );
  }
  return (
    <span className="inline-block text-xs font-mono px-2 py-1 rounded bg-muted/60 text-muted-fg">
      {code}
    </span>
  );
}

export default async function EcosystemPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const eco = await getEco(ticker);
  if (!eco) notFound();

  const downstream = Object.entries(eco.downstream_partners || {});

  return (
    <main className="min-h-screen bg-bg">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-5 space-y-6">
        <div className="flex items-center gap-3 text-sm text-muted-fg">
          <Link href="/dashboard" className="hover:text-fg">← 大盤</Link>
          <span>/</span>
          <span>龍頭生態系</span>
        </div>

        <header className="bg-card border border-border rounded-xl p-5 shadow-card">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-muted-fg">{eco.anchor_ticker}</span>
                <h1 className="text-2xl md:text-3xl font-bold">{eco.anchor_name}</h1>
                {eco.anchor_english && (
                  <span className="text-base text-muted-fg">({eco.anchor_english})</span>
                )}
              </div>
              {eco.industry && (
                <div className="text-sm text-muted-fg mt-1">{eco.industry}</div>
              )}
              {eco.global_position && (
                <div className="text-sm mt-2">{eco.global_position}</div>
              )}
              {eco.key_description && (
                <div className="mt-3 p-3 rounded-lg bg-muted/40 text-sm leading-relaxed">
                  {eco.key_description}
                </div>
              )}
            </div>
            <div className="text-right space-y-1 min-w-[140px]">
              {eco.market_cap_ntd && (
                <div>
                  <div className="text-xs text-muted-fg">市值</div>
                  <div className="font-mono font-bold text-lg">{eco.market_cap_ntd}</div>
                </div>
              )}
              {eco.current_price_range && (
                <div>
                  <div className="text-xs text-muted-fg">近期價位</div>
                  <div className="font-mono">{eco.current_price_range}</div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 受惠股 — 優先顯示 */}
        {eco.taiwan_beneficiary_stocks && eco.taiwan_beneficiary_stocks.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-up rounded" />
              🎯 台廠受惠股
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
              {eco.taiwan_beneficiary_stocks.map((b) => (
                <Link
                  key={b.ticker}
                  href={/^\d{4,6}$/.test(b.ticker) ? `/stock/${b.ticker}` : "#"}
                  className="p-3 rounded-lg border border-border hover:border-up hover:bg-up/5 transition"
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <div>
                      <span className="font-mono text-muted-fg text-sm">{b.ticker}</span>
                      {b.name && <span className="font-semibold ml-2">{b.name}</span>}
                    </div>
                    {b.elasticity_grade && (
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-up/15 text-up">
                        {b.elasticity_grade}
                      </span>
                    )}
                  </div>
                  {b.category && (
                    <div className="text-xs text-muted-fg mb-1">{b.category}</div>
                  )}
                  {b.note && (
                    <div className="text-xs leading-relaxed text-fg/80">{b.note}</div>
                  )}
                  <div className="flex justify-between items-center mt-2 text-xs">
                    {b.correlation_pct !== undefined && (
                      <span className="text-muted-fg">關聯度 {b.correlation_pct}%</span>
                    )}
                    {b.target_price !== undefined && (
                      <span className="font-mono text-warning">目標 {b.target_price}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 客戶 + 供應商 */}
        <div className="grid lg:grid-cols-2 gap-4">
          {eco.customers && eco.customers.length > 0 && (
            <section className="bg-card border border-border rounded-xl p-5 shadow-card">
              <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-info rounded" />
                📈 主要客戶
              </h2>
              <ul className="space-y-2">
                {eco.customers.map((c, i) => (
                  <li key={i} className="p-2 rounded border border-border">
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold">
                        {c.name}
                        {c.ticker_overseas && (
                          <span className="font-mono text-muted-fg text-xs ml-1">
                            ({c.ticker_overseas})
                          </span>
                        )}
                      </span>
                      {c.revenue_share_pct !== undefined && (
                        <span className="text-xs font-mono text-info">
                          {c.revenue_share_pct}%
                        </span>
                      )}
                    </div>
                    {c.products && c.products.length > 0 && (
                      <div className="text-xs text-muted-fg mt-1">
                        {c.products.join(" / ")}
                      </div>
                    )}
                    {c.latest_news && (
                      <div className="text-xs text-fg/70 mt-1 italic">{c.latest_news}</div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {eco.suppliers && eco.suppliers.length > 0 && (
            <section className="bg-card border border-border rounded-xl p-5 shadow-card">
              <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-warning rounded" />
                🏭 主要供應商
              </h2>
              <ul className="space-y-2">
                {eco.suppliers.map((s, i) => (
                  <li key={i} className="p-2 rounded border border-border">
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold text-sm">{s.category}</span>
                      {s.strategic_importance && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-warning/15 text-warning">
                          {s.strategic_importance}
                        </span>
                      )}
                    </div>
                    {(s.vendor_name || s.vendor_names) && (
                      <div className="text-xs text-muted-fg mt-1">
                        {s.vendor_name || (s.vendor_names || []).join(", ")}
                      </div>
                    )}
                    {s.taiwan_related_stocks && s.taiwan_related_stocks.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {s.taiwan_related_stocks.map((t) => (
                          <TWChip key={t} code={t} />
                        ))}
                      </div>
                    )}
                    {s.note && (
                      <div className="text-[11px] text-fg/70 mt-1">{s.note}</div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* 競爭者 */}
        {eco.competitors && eco.competitors.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-down rounded" />
              ⚔️ 競爭者
            </h2>
            <div className="grid md:grid-cols-3 gap-3">
              {eco.competitors.map((c, i) => (
                <div key={i} className="p-3 rounded-lg border border-border">
                  <div className="font-semibold text-sm mb-1">{c.name}</div>
                  <div className="space-y-1 text-xs text-muted-fg">
                    {c.market_share_pct !== undefined && (
                      <div>市佔 {c.market_share_pct}%</div>
                    )}
                    {c.technology_gap_years !== undefined && (
                      <div>技術落後 {c.technology_gap_years} 年</div>
                    )}
                    {c.competitive_level && (
                      <div>威脅 {c.competitive_level}</div>
                    )}
                    {c.government_backing && <div>政府支持</div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 下游 */}
        {downstream.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-info rounded" />
              ⬇️ 下游夥伴
            </h2>
            <div className="space-y-2">
              {downstream.map(([category, stocks]) => (
                <div key={category} className="flex gap-3 items-start">
                  <span className="text-sm text-muted-fg w-32 flex-shrink-0 pt-1">
                    {category}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(stocks || []).map((s) => (
                      <TWChip key={s} code={s} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 雲服務客戶 */}
        {eco.cloud_customers && eco.cloud_customers.length > 0 && (
          <section className="bg-card border border-border rounded-xl p-5 shadow-card">
            <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-info rounded" />
              ☁️ 雲端客戶(ASIC)
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
              {eco.cloud_customers.map((c, i) => (
                <div key={i} className="p-2 rounded border border-border text-sm">
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-muted-fg">{c.product}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
