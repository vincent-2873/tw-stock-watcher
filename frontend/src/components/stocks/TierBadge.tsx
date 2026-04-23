import { scoreToTier, tierColor, tierText, type Tier } from "@/lib/scoring";

/**
 * 評級徽章(C / N / R / SR / SSR)
 * 用法:
 *   <TierBadge score={72} />              從分數推算 tier
 *   <TierBadge tier="SR" />               直接給 tier
 *   <TierBadge score={72} showText />     顯示「推薦布局」副文字
 */
export function TierBadge(props: {
  score?: number;
  tier?: Tier;
  maxScore?: number;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const { score, tier: givenTier, maxScore = 95, showText, size = "md" } = props;
  const tier: Tier = givenTier ?? scoreToTier(score ?? 0, maxScore);
  const color = tierColor(tier);

  const sizeClass: Record<string, { pad: string; font: string }> = {
    sm: { pad: "2px 8px", font: "11px" },
    md: { pad: "4px 12px", font: "13px" },
    lg: { pad: "6px 16px", font: "15px" },
  };
  const s = sizeClass[size];

  // SSR 特效:金茶漸層
  const isSSR = tier === "SSR";
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: s.pad,
    background: isSSR
      ? "linear-gradient(135deg, #D4A05C, #B8893D)"
      : color,
    color: tier === "R" ? "#2C2416" : "#F5EFE0",
    fontFamily: "'Shippori Mincho', serif",
    fontSize: s.font,
    fontWeight: 600,
    letterSpacing: "0.1em",
    borderRadius: "2px",
    boxShadow:
      tier === "SR"
        ? "0 2px 8px rgba(184, 84, 80, 0.3)"
        : tier === "SSR"
          ? "0 4px 16px rgba(184, 137, 61, 0.5)"
          : "none",
    position: "relative",
    overflow: "hidden",
  };

  return (
    <span style={style} className={isSSR ? "tier-ssr-shine" : undefined}>
      {tier}
      {showText && <span style={{ marginLeft: 6, fontWeight: 400 }}>{tierText(tier)}</span>}
    </span>
  );
}
