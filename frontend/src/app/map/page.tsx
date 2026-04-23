import Link from "next/link";
import { API_URL } from "@/lib/api";
import { QuackAvatar } from "@/components/quack/QuackAvatar";

export const revalidate = 600;

type Industry = {
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
  icon: string | null;
  description: string | null;
  heat_level: string | null;
  representative_stocks: string[];
  key_drivers: string[];
};

type Tree = Industry & { sub_industries: Industry[] };

async function loadTree(): Promise<Tree[]> {
  try {
    const r = await fetch(`${API_URL}/api/industries/tree`, {
      next: { revalidate: 600 },
    });
    if (!r.ok) return [];
    const j = await r.json();
    return (j.tree ?? []) as Tree[];
  } catch {
    return [];
  }
}

function heatBadgeColor(lvl: string | null): string {
  switch (lvl) {
    case "extreme":
      return "var(--up)";
    case "high":
      return "var(--up-soft)";
    case "medium":
      return "var(--gold)";
    case "low":
      return "var(--moss)";
    default:
      return "var(--muted-fg)";
  }
}

function heatBadgeLabel(lvl: string | null): string {
  switch (lvl) {
    case "extreme":
      return "熾熱";
    case "high":
      return "高溫";
    case "medium":
      return "溫";
    case "low":
      return "涼";
    default:
      return "—";
  }
}

function StockChip({ code }: { code: string }) {
  const isTw = /^\d{4,6}$/.test(code);
  return (
    <Link
      href={isTw ? `/stocks/${code}` : "#"}
      className="inline-block text-[11px] font-mono px-1.5 py-0.5 rounded"
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

export default async function IndustryMapPage() {
  const tree = await loadTree();

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <div className="text-xs mb-5" style={{ color: "var(--muted-fg)" }}>
          <Link href="/" className="hover:text-[var(--fg)]">
            今日
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--fg-soft)" }}>產業地圖</span>
        </div>

        <header className="mb-8 flex items-start gap-4">
          <QuackAvatar state="studying" size="lg" />
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
              產業地圖
            </h1>
            <p className="text-sm font-serif italic" style={{ color: "var(--muted-fg)" }}>
              「10 大類 → 子產業 → 個股。找一條有動靜的路。」
            </p>
          </div>
        </header>

        <div className="wabi-divider mb-6" />

        {tree.length === 0 ? (
          <div
            className="text-center py-16 font-serif italic text-sm"
            style={{ color: "var(--muted-fg)" }}
          >
            ——  地圖還沒畫好  ——
          </div>
        ) : (
          <div className="space-y-6">
            {tree.map((cat) => (
              <section
                key={cat.id}
                className="wabi-card"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  padding: "20px 22px",
                }}
              >
                <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-baseline gap-3">
                    {cat.icon && (
                      <span style={{ fontSize: "22px" }}>{cat.icon}</span>
                    )}
                    <h2
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "20px",
                        fontWeight: 500,
                        color: "var(--fg)",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {cat.name}
                    </h2>
                    {cat.heat_level && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                        style={{
                          background: "var(--muted)",
                          color: heatBadgeColor(cat.heat_level),
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {heatBadgeLabel(cat.heat_level)}
                      </span>
                    )}
                  </div>
                </div>
                {cat.description && (
                  <p
                    className="text-sm mb-4"
                    style={{ color: "var(--muted-fg)" }}
                  >
                    {cat.description}
                  </p>
                )}

                <div className="grid md:grid-cols-2 gap-3">
                  {cat.sub_industries.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-lg"
                      style={{
                        background: "var(--bg-raised)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        className="mb-2"
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: "15px",
                          fontWeight: 500,
                          color: "var(--fg)",
                        }}
                      >
                        {s.name}
                      </div>
                      {s.representative_stocks && s.representative_stocks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {s.representative_stocks.map((code) => (
                            <StockChip key={code} code={code} />
                          ))}
                        </div>
                      )}
                      {s.key_drivers && s.key_drivers.length > 0 && (
                        <div
                          className="text-[11px]"
                          style={{ color: "var(--muted-fg)" }}
                        >
                          {s.key_drivers.map((d) => `# ${d}`).join(" ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="text-center mt-10 py-6">
          <div className="wabi-divider" />
          <p className="text-xs font-serif italic" style={{ color: "var(--muted-fg)" }}>
            ⚠ 地圖依公開資料與呱呱整理,非投資建議。
          </p>
        </footer>
      </div>
    </main>
  );
}
