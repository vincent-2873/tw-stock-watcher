import type { DimEvidence } from "@/lib/api";

/**
 * 每個評分子項目在後端 details 裡是:
 *   key -> { score: number, ...一些欄位 }
 * 或  key -> 純數字 / 字串 / 布林
 *
 * 這個元件把它展開成人類看得懂的兩行(第一行標題+分數,第二行摘要資料)。
 */

type Facet = {
  key: string;
  zh: string;
  summary?: (v: Record<string, unknown>) => string;
};

const LABEL: Record<string, Facet> = {
  // 基本面
  eps_positive: { key: "eps_positive", zh: "EPS 正向", summary: (v) => (v.eps != null ? `EPS ${v.eps}` : "") },
  eps_growth_2q: { key: "eps_growth_2q", zh: "EPS 連 2 季成長", summary: (v) => (v.growth_pct != null ? `成長 ${v.growth_pct}%` : String(v.note || "")) },
  revenue_yoy_3m: { key: "revenue_yoy_3m", zh: "月營收 YoY 3 月", summary: (v) => (v.yoy_pct != null ? `YoY ${v.yoy_pct}%` : String(v.note || "")) },
  gross_margin: { key: "gross_margin", zh: "毛利率", summary: (v) => (v.margin_pct != null ? `${v.margin_pct}%` : "") },
  free_cash_flow: { key: "free_cash_flow", zh: "自由現金流", summary: (v) => (v.fcf != null ? String(v.fcf) : String(v.note || "")) },
  // 籌碼面
  foreign_5d: { key: "foreign_5d", zh: "外資近 5 日淨", summary: (v) => (v.foreign_net_5d != null ? `${Number(v.foreign_net_5d).toLocaleString()} 張` : "") },
  invt_5d: { key: "invt_5d", zh: "投信近 5 日淨", summary: (v) => (v.invt_net_5d != null ? `${Number(v.invt_net_5d).toLocaleString()} 張` : "") },
  concentration: { key: "concentration", zh: "分點集中度", summary: (v) => (v.top_ratio_pct != null ? `前 ${v.top_ratio_pct}%` : String(v.note || "")) },
  margin_change: { key: "margin_change", zh: "融資增減(5 日)", summary: (v) => (v.margin_change_5d_pct != null ? `${v.margin_change_5d_pct}%` : "") },
  overnight_trader: { key: "overnight_trader", zh: "隔日沖壓力", summary: (v) => String(v.note || (v.flag == null ? "" : v.flag ? "有" : "無")) },
  // 技術面
  ma_alignment: { key: "ma_alignment", zh: "均線排列", summary: (v) => (v.last_close != null ? `收盤 ${v.last_close}` : "") },
  volume_price: { key: "volume_price", zh: "量價配合", summary: (v) => (v.price_volume_up_day_ratio != null ? `量價齊揚 ${v.price_volume_up_day_ratio}%` : "") },
  relative_strength: { key: "relative_strength", zh: "相對強度(20 日)", summary: (v) => (v.return_20d != null ? `${v.return_20d}%` : "") },
  pattern: { key: "pattern", zh: "型態", summary: (v) => String(v.pattern || v.note || "") },
  support_resistance: { key: "support_resistance", zh: "支撐/壓力乖離", summary: (v) => (v.deviation_from_ma60_pct != null ? `偏 MA60 ${v.deviation_from_ma60_pct}%` : "") },
  rsi14: { key: "rsi14", zh: "RSI(14)", summary: (v) => (v.rsi != null ? String(v.rsi) : "") },
};

function asNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asObj(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function scoreColor(ratio: number): string {
  if (ratio >= 0.8) return "var(--up)";
  if (ratio >= 0.6) return "var(--gold)";
  if (ratio >= 0.4) return "var(--moss)";
  if (ratio > 0) return "var(--down-soft)";
  return "var(--muted-fg)";
}

function FacetRow({ rawKey, rawValue }: { rawKey: string; rawValue: unknown }) {
  const facet = LABEL[rawKey];
  const obj = asObj(rawValue);
  const score = obj ? asNumber(obj.score) : null;
  const note = obj ? (obj.note as string | undefined) : undefined;
  const summary = obj && facet?.summary ? facet.summary(obj) : "";
  const displayValue = summary || note || (obj == null ? String(rawValue ?? "") : "");

  return (
    <li className="flex items-baseline justify-between gap-3 py-1 text-xs">
      <span style={{ color: "var(--fg-soft)", minWidth: "6rem" }}>
        {facet?.zh || rawKey}
      </span>
      <span
        className="flex-1 text-right font-mono truncate"
        style={{ color: "var(--muted-fg)", fontFamily: "var(--font-mono)" }}
        title={typeof displayValue === "string" ? displayValue : undefined}
      >
        {displayValue || "—"}
      </span>
      {score !== null && (
        <span
          className="font-mono shrink-0 text-right"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--fg)",
            minWidth: "2.4rem",
          }}
        >
          {score}
        </span>
      )}
    </li>
  );
}

export function DimCard({
  label,
  dim,
  max,
}: {
  label: string;
  dim: DimEvidence;
  max: number;
}) {
  const ratio = Math.max(0, Math.min(1, dim.score / max));
  const color = scoreColor(ratio);
  const entries = Object.entries(dim.details || {});

  return (
    <div
      className="wabi-card"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        padding: "18px 20px",
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "16px",
            fontWeight: 500,
            color: "var(--fg)",
          }}
        >
          {label}
        </h3>
        <div className="text-right">
          <span
            className="font-mono"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--fg)",
              fontSize: "26px",
              fontWeight: 500,
            }}
          >
            {dim.score}
          </span>
          <span className="text-xs" style={{ color: "var(--muted-fg)" }}>
            /{max}
          </span>
        </div>
      </div>

      <div
        className="h-[3px] rounded-full overflow-hidden mb-3"
        style={{ background: "var(--muted)" }}
      >
        <div
          className="h-full"
          style={{ width: `${ratio * 100}%`, background: color }}
        />
      </div>

      {entries.length === 0 ? (
        <p className="text-xs font-serif italic" style={{ color: "var(--muted-fg)" }}>
          —
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          {entries.slice(0, 8).map(([k, v]) => (
            <FacetRow key={k} rawKey={k} rawValue={v} />
          ))}
        </ul>
      )}

      {dim.warnings && dim.warnings.length > 0 && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {dim.warnings.map((w, i) => (
            <div
              key={i}
              className="text-xs"
              style={{ color: "var(--gold)" }}
            >
              ⚠ {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DimCard;
