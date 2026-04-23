import Link from "next/link";
import { notFound } from "next/navigation";
import { API_URL } from "@/lib/api";
import { QuackAvatar } from "@/components/quack/QuackAvatar";

export const revalidate = 600;

type Customer = {
  name: string;
  ticker_overseas?: string;
  revenue_share_pct?: number;
  products?: string[];
  latest_news?: string;
};
type Supplier = {
  category: string;
  vendor_name?: string;
  vendor_names?: string[];
  taiwan_related_stocks?: string[];
  strategic_importance?: string;
  note?: string;
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

async function loadEco(t: string): Promise<Ecosystem | null> {
  try {
    const r = await fetch(`${API_URL}/api/ecosystems/${encodeURIComponent(t)}`, {
      next: { revalidate: 600 },
    });
    if (!r.ok) return null;
    return (await r.json()) as Ecosystem;
  } catch {
    return null;
  }
}

function TWChip({ code }: { code: string }) {
  const isTw = /^\d{4,6}$/.test(code);
  return (
    <Link
      href={isTw ? `/stocks/${code}` : "#"}
      className="inline-block text-[12px] font-mono px-2 py-1 rounded"
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

export default async function EcosystemPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const eco = await loadEco(ticker);
  if (!eco) notFound();

  const downstream = Object.entries(eco.downstream_partners || {});

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
        <div className="text-xs mb-5" style={{ color: "var(--muted-fg)" }}>
          <Link href="/" className="hover:text-[var(--fg)]">
            今日
          </Link>
          <span className="mx-2">/</span>
          <Link href="/pond" className="hover:text-[var(--fg)]">
            池塘
          </Link>
          <span className="mx-2">/</span>
          <span>龍頭生態系</span>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--fg-soft)" }}>
            {eco.anchor_ticker} {eco.anchor_name}
          </span>
        </div>

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
              <div className="flex items-baseline gap-3 flex-wrap">
                <span
                  className="font-mono"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: "var(--muted-fg)",
                    fontSize: "15px",
                  }}
                >
                  {eco.anchor_ticker}
                </span>
                <h1
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "28px",
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    color: "var(--fg)",
                  }}
                >
                  {eco.anchor_name}
                </h1>
                {eco.anchor_english && (
                  <span style={{ color: "var(--muted-fg)" }}>({eco.anchor_english})</span>
                )}
              </div>
              {eco.industry && (
                <div className="text-xs mt-1" style={{ color: "var(--muted-fg)" }}>
                  {eco.industry}
                </div>
              )}
              {eco.global_position && (
                <div className="text-sm mt-3" style={{ color: "var(--fg-soft)" }}>
                  {eco.global_position}
                </div>
              )}
              {eco.key_description && (
                <p
                  className="mt-3 text-sm leading-relaxed"
                  style={{ color: "var(--fg-soft)" }}
                >
                  {eco.key_description}
                </p>
              )}
            </div>
            <div className="text-right text-xs space-y-1">
              {eco.market_cap_ntd && (
                <div>
                  <div style={{ color: "var(--muted-fg)" }}>市值</div>
                  <div
                    className="font-mono"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--fg)", fontSize: "15px" }}
                  >
                    {eco.market_cap_ntd}
                  </div>
                </div>
              )}
              {eco.current_price_range && (
                <div>
                  <div style={{ color: "var(--muted-fg)" }}>近期</div>
                  <div
                    className="font-mono"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--fg)" }}
                  >
                    {eco.current_price_range}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 台廠受惠股 */}
        {eco.taiwan_beneficiary_stocks && eco.taiwan_beneficiary_stocks.length > 0 && (
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
              台廠受惠股
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {eco.taiwan_beneficiary_stocks.map((b) => (
                <Link
                  key={b.ticker}
                  href={/^\d{4,6}$/.test(b.ticker) ? `/stocks/${b.ticker}` : "#"}
                  className="block p-3 rounded-lg transition-all"
                  style={{
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <div className="flex items-baseline gap-2">
                      <span
                        className="font-mono text-xs"
                        style={{
                          fontFamily: "var(--font-mono)",
                          color: "var(--muted-fg)",
                        }}
                      >
                        {b.ticker}
                      </span>
                      {b.name && (
                        <span
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: "15px",
                            fontWeight: 500,
                            color: "var(--fg)",
                          }}
                        >
                          {b.name}
                        </span>
                      )}
                    </div>
                    {b.elasticity_grade && (
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: "var(--muted)",
                          color: "var(--gold)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {b.elasticity_grade}
                      </span>
                    )}
                  </div>
                  {b.category && (
                    <div className="text-xs mb-1" style={{ color: "var(--muted-fg)" }}>
                      {b.category}
                    </div>
                  )}
                  {b.note && (
                    <div
                      className="text-xs leading-relaxed"
                      style={{ color: "var(--fg-soft)" }}
                    >
                      {b.note}
                    </div>
                  )}
                  <div
                    className="flex justify-between items-center mt-2 text-xs"
                    style={{ color: "var(--muted-fg)" }}
                  >
                    {b.correlation_pct !== undefined && (
                      <span>關聯 {b.correlation_pct}%</span>
                    )}
                    {b.target_price !== undefined && (
                      <span
                        style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}
                      >
                        目標 {b.target_price}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 客戶 + 供應商 */}
        <div className="grid lg:grid-cols-2 gap-5 mb-6">
          {eco.customers && eco.customers.length > 0 && (
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
                  color: "var(--fg)",
                }}
              >
                主要客戶
              </h2>
              <ul className="space-y-2">
                {eco.customers.map((c, i) => (
                  <li
                    key={i}
                    className="p-2 rounded"
                    style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          color: "var(--fg)",
                          fontSize: "14px",
                        }}
                      >
                        {c.name}
                        {c.ticker_overseas && (
                          <span
                            className="font-mono text-xs ml-1"
                            style={{
                              color: "var(--muted-fg)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            ({c.ticker_overseas})
                          </span>
                        )}
                      </span>
                      {c.revenue_share_pct !== undefined && (
                        <span
                          className="text-xs font-mono"
                          style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}
                        >
                          {c.revenue_share_pct}%
                        </span>
                      )}
                    </div>
                    {c.products && c.products.length > 0 && (
                      <div className="text-xs mt-1" style={{ color: "var(--muted-fg)" }}>
                        {c.products.join(" · ")}
                      </div>
                    )}
                    {c.latest_news && (
                      <div
                        className="text-xs mt-1 italic"
                        style={{ color: "var(--fg-soft)" }}
                      >
                        {c.latest_news}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {eco.suppliers && eco.suppliers.length > 0 && (
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
                  color: "var(--fg)",
                }}
              >
                主要供應商
              </h2>
              <ul className="space-y-2">
                {eco.suppliers.map((s, i) => (
                  <li
                    key={i}
                    className="p-2 rounded"
                    style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          color: "var(--fg)",
                          fontSize: "14px",
                        }}
                      >
                        {s.category}
                      </span>
                      {s.strategic_importance && (
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "var(--muted)", color: "var(--muted-fg)" }}
                        >
                          {s.strategic_importance}
                        </span>
                      )}
                    </div>
                    {(s.vendor_name || s.vendor_names) && (
                      <div className="text-xs mt-1" style={{ color: "var(--muted-fg)" }}>
                        {s.vendor_name || (s.vendor_names || []).join(", ")}
                      </div>
                    )}
                    {s.taiwan_related_stocks && s.taiwan_related_stocks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {s.taiwan_related_stocks.map((t) => (
                          <TWChip key={t} code={t} />
                        ))}
                      </div>
                    )}
                    {s.note && (
                      <div className="text-xs mt-1 italic" style={{ color: "var(--fg-soft)" }}>
                        {s.note}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* 競爭者 + 下游 */}
        <div className="grid md:grid-cols-2 gap-5 mb-6">
          {eco.competitors && eco.competitors.length > 0 && (
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
                  color: "var(--fg)",
                }}
              >
                競爭者
              </h2>
              <ul className="space-y-2 text-xs">
                {eco.competitors.map((c, i) => (
                  <li
                    key={i}
                    className="p-2 rounded"
                    style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}
                  >
                    <div
                      className="mb-1"
                      style={{
                        fontFamily: "var(--font-serif)",
                        color: "var(--fg)",
                        fontSize: "14px",
                      }}
                    >
                      {c.name}
                    </div>
                    <div className="flex gap-3 flex-wrap" style={{ color: "var(--muted-fg)" }}>
                      {c.market_share_pct !== undefined && <span>市佔 {c.market_share_pct}%</span>}
                      {c.technology_gap_years !== undefined && (
                        <span>技術落後 {c.technology_gap_years} 年</span>
                      )}
                      {c.competitive_level && <span>威脅 {c.competitive_level}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {downstream.length > 0 && (
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
                  color: "var(--fg)",
                }}
              >
                下游夥伴
              </h2>
              <div className="space-y-2">
                {downstream.map(([cat, stocks]) => (
                  <div key={cat} className="text-xs">
                    <div className="mb-1" style={{ color: "var(--muted-fg)" }}>
                      {cat}
                    </div>
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
        </div>
      </div>
    </main>
  );
}
