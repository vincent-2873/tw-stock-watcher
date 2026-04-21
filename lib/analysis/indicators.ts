// 技術指標純函數庫（無依賴）

export function sma(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    const slice = values.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

export function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  values.forEach((v, i) => {
    if (i === 0) { out.push(v); prev = v; return; }
    const cur = v * k + (prev as number) * (1 - k);
    out.push(cur); prev = cur;
  });
  return out;
}

export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period + 1) return out;
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= period; loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const ef = ema(values, fast);
  const es = ema(values, slow);
  const diff = values.map((_, i) => (ef[i] != null && es[i] != null ? (ef[i] as number) - (es[i] as number) : null));
  const diffFilled = diff.map((v) => v ?? 0);
  const dea = ema(diffFilled, signal);
  const hist = diff.map((v, i) => (v != null && dea[i] != null ? v - (dea[i] as number) : null));
  return { diff, dea, hist };
}

export function kd(high: number[], low: number[], close: number[], period = 9) {
  const rsv = close.map((c, i) => {
    if (i < period - 1) return null;
    const hi = Math.max(...high.slice(i - period + 1, i + 1));
    const lo = Math.min(...low.slice(i - period + 1, i + 1));
    return hi === lo ? 50 : ((c - lo) / (hi - lo)) * 100;
  });
  const k: (number | null)[] = [];
  const d: (number | null)[] = [];
  let prevK = 50, prevD = 50;
  rsv.forEach((v) => {
    if (v == null) { k.push(null); d.push(null); return; }
    const curK = (2 / 3) * prevK + (1 / 3) * v;
    const curD = (2 / 3) * prevD + (1 / 3) * curK;
    k.push(curK); d.push(curD);
    prevK = curK; prevD = curD;
  });
  return { k, d };
}

export function bollinger(values: number[], period = 20, stdMul = 2) {
  const mid = sma(values, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  values.forEach((_, i) => {
    if (mid[i] == null) { upper.push(null); lower.push(null); return; }
    const slice = values.slice(i - period + 1, i + 1);
    const m = mid[i] as number;
    const variance = slice.reduce((s, v) => s + (v - m) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper.push(m + stdMul * sd);
    lower.push(m - stdMul * sd);
  });
  return { mid, upper, lower };
}
