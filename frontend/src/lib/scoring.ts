/**
 * C / N / R / SR / SSR 評級轉換
 * 對應 CLAUDE.md 鐵則 2 + .claude-code/SCORING_SYSTEM.md + 21_MASTER_PLAN 0.5
 */

export type Tier = "C" | "N" | "R" | "SR" | "SSR";

/**
 * 將 0-95 分數(四象限總分)換算成 C/N/R/SR/SSR
 *  C (0-20%)   普卡 · 避開
 *  N (21-40%)  一般 · 觀望
 *  R (41-60%)  稀有 · 值得關注
 *  SR (61-80%) 特稀有 · 推薦布局
 *  SSR (81+)   最稀有 · 頂級機會
 */
export function scoreToTier(score: number, maxScore = 95): Tier {
  const pct = (score / maxScore) * 100;
  if (pct <= 20) return "C";
  if (pct <= 40) return "N";
  if (pct <= 60) return "R";
  if (pct <= 80) return "SR";
  return "SSR";
}

export function tierColor(tier: Tier): string {
  const map: Record<Tier, string> = {
    C: "#4A4A4A",
    N: "#8A8170",
    R: "#B8B0A0",
    SR: "#B85450",
    SSR: "#B8893D",
  };
  return map[tier];
}

export function tierText(tier: Tier): string {
  const map: Record<Tier, string> = {
    C: "避開",
    N: "觀望",
    R: "值得關注",
    SR: "推薦布局",
    SSR: "頂級機會",
  };
  return map[tier];
}

/** 分數顏色 (漸層同 tier) */
export function scoreColor(score: number, maxScore = 95): string {
  return tierColor(scoreToTier(score, maxScore));
}
