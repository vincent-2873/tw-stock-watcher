import type { DimEvidence } from "@/lib/api";

function asObj(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function FlowCell({
  label,
  net,
  unit = "張",
  note,
}: {
  label: string;
  net: number | null;
  unit?: string;
  note?: string;
}) {
  const hasValue = net !== null;
  const isNet0 = net === 0;
  const isBuy = hasValue && net! > 0;
  const isSell = hasValue && net! < 0;
  const color = isBuy
    ? "var(--up)"
    : isSell
    ? "var(--down)"
    : "var(--muted-fg)";
  const symbol = isBuy ? "+" : isSell ? "" : "";
  const bg = isBuy
    ? "rgba(180, 79, 62, 0.06)"
    : isSell
    ? "rgba(74, 107, 119, 0.06)"
    : "var(--bg-raised)";

  return (
    <div
      className="flex-1 min-w-[130px] p-4 rounded-lg"
      style={{
        background: bg,
        border: "1px solid var(--border)",
      }}
    >
      <div
        className="text-[11px] tracking-wider mb-1"
        style={{ color: "var(--muted-fg)", fontFamily: "var(--font-serif)" }}
      >
        {label}
      </div>
      <div
        className="font-mono"
        style={{
          color,
          fontFamily: "var(--font-mono)",
          fontSize: "22px",
          fontWeight: 500,
          lineHeight: 1.2,
        }}
      >
        {hasValue ? (
          <>
            {isNet0 ? "±" : symbol}
            {Math.abs(net!).toLocaleString("zh-TW", { maximumFractionDigits: 0 })}
            <span
              className="ml-1"
              style={{ fontSize: "12px", color: "var(--muted-fg)" }}
            >
              {unit}
            </span>
          </>
        ) : (
          <span style={{ color: "var(--muted-fg)", fontSize: "14px" }}>
            {note || "—"}
          </span>
        )}
      </div>
    </div>
  );
}

export function InstitutionalBanner({ chip }: { chip: DimEvidence }) {
  const d = chip.details || {};
  const foreign = asObj(d.foreign_5d);
  const invt = asObj(d.invt_5d);
  const conc = asObj(d.concentration);
  const margin = asObj(d.margin_change);

  const foreignNet = foreign ? asNumber(foreign.foreign_net_5d) : null;
  const invtNet = invt ? asNumber(invt.invt_net_5d) : null;
  const concRatio = conc ? asNumber(conc.top_ratio_pct) : null;
  const marginChg = margin ? asNumber(margin.margin_change_5d_pct) : null;

  return (
    <section
      className="wabi-card mb-6"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        padding: "18px 20px",
      }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "16px",
            fontWeight: 500,
            color: "var(--fg)",
            letterSpacing: "0.04em",
          }}
        >
          法人動向 · 近 5 日
        </h2>
        <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
          正值=買超 / 負值=賣超
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        <FlowCell
          label="外資"
          net={foreignNet}
          note={foreign ? String(foreign.note || "") : "無資料"}
        />
        <FlowCell
          label="投信"
          net={invtNet}
          note={invt ? String(invt.note || "") : "無資料"}
        />
        <FlowCell
          label="分點集中度 Top"
          net={concRatio}
          unit="%"
          note={conc ? String(conc.note || "") : "無分點資料"}
        />
        <FlowCell
          label="融資增減"
          net={marginChg}
          unit="%"
          note={margin ? String(margin.note || "") : "無資料"}
        />
      </div>
    </section>
  );
}

export default InstitutionalBanner;
