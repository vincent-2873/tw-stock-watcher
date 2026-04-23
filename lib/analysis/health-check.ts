// 個股健檢：技術 / 籌碼 / 新聞 / 綜合打分（0-100）

import { rsi, macd, sma } from "./indicators";

export type HealthScore = {
  overall: number;                    // 0-100
  grade: "A+" | "A" | "B" | "C" | "D";
  tech: number;                       // 技術面
  chip: number;                       // 籌碼面
  sentiment: number;                  // 新聞情緒
  signals: string[];                  // 主要訊號
};

export function calcTechScore(closes: number[], highs: number[], lows: number[]): number {
  if (closes.length < 30) return 50;
  const lastClose = closes.at(-1)!;
  let score = 50;

  // 均線排列
  const ma5 = sma(closes, 5).at(-1) ?? lastClose;
  const ma20 = sma(closes, 20).at(-1) ?? lastClose;
  const ma60 = sma(closes, 60).at(-1) ?? lastClose;
  if (ma5 && ma20 && ma60) {
    if (lastClose > ma5 && ma5 > ma20 && ma20 > ma60) score += 15;        // 多頭排列
    else if (lastClose < ma5 && ma5 < ma20 && ma20 < ma60) score -= 15;   // 空頭排列
  }

  // RSI
  const r = rsi(closes).at(-1);
  if (r != null) {
    if (r > 70) score -= 8;       // 超買
    else if (r < 30) score += 8;  // 超賣反彈機會
    else if (r > 50 && r < 70) score += 5;
  }

  // MACD 柱狀體
  const { hist } = macd(closes);
  const h = hist.at(-1);
  const hPrev = hist.at(-2);
  if (h != null && hPrev != null) {
    if (h > 0 && h > hPrev) score += 10;     // 紅柱放大
    else if (h < 0 && h < hPrev) score -= 10; // 綠柱放大
  }

  return Math.max(0, Math.min(100, score));
}

export function calcChipScore(input: {
  foreignNet5d: number;   // 外資近 5 日買賣超（張）
  investmentTrustNet5d: number; // 投信 5 日
  dealerNet5d: number;    // 自營 5 日
  marginChange5d: number; // 融資餘額變化
  shortChange5d: number;  // 融券餘額變化
}): number {
  let score = 50;
  if (input.foreignNet5d > 0) score += Math.min(15, input.foreignNet5d / 1000);
  else score += Math.max(-15, input.foreignNet5d / 1000);
  if (input.investmentTrustNet5d > 0) score += Math.min(10, input.investmentTrustNet5d / 500);
  // 融資大減 + 融券大增 = 散戶退場 = 健康
  if (input.marginChange5d < 0) score += 5;
  if (input.shortChange5d > 0) score += 5;
  return Math.max(0, Math.min(100, score));
}

export function calcSentimentScore(newsScores: number[]): number {
  // newsScores: -1 (利空) ~ +1 (利多)
  if (!newsScores.length) return 50;
  const avg = newsScores.reduce((a, b) => a + b, 0) / newsScores.length;
  return Math.max(0, Math.min(100, 50 + avg * 50));
}

export function grade(score: number): HealthScore["grade"] {
  if (score >= 85) return "A+";
  if (score >= 70) return "A";
  if (score >= 55) return "B";
  if (score >= 40) return "C";
  return "D";
}

export function computeHealthScore(
  tech: number, chip: number, sentiment: number,
): HealthScore {
  // 加權：技術 40% / 籌碼 40% / 情緒 20%
  const overall = Math.round(tech * 0.4 + chip * 0.4 + sentiment * 0.2);
  const signals: string[] = [];
  if (tech >= 70) signals.push("技術面多頭");
  if (tech <= 30) signals.push("技術面空頭");
  if (chip >= 70) signals.push("法人加碼");
  if (chip <= 30) signals.push("法人出貨");
  if (sentiment >= 70) signals.push("新聞情緒正向");
  if (sentiment <= 30) signals.push("新聞情緒負向");
  return { overall, grade: grade(overall), tech, chip, sentiment, signals };
}
