// Fugle Market Data API（即時報價）
// 註冊：https://developer.fugle.tw/
// 免費：1000 req/day

const BASE = "https://api.fugle.tw/marketdata/v1.0";

export async function fetchQuote(code: string) {
  const key = process.env.FUGLE_API_KEY;
  if (!key) throw new Error("FUGLE_API_KEY not set");
  const r = await fetch(`${BASE}/stock/intraday/quote/${code}`, {
    headers: { "X-API-KEY": key },
    next: { revalidate: 5 },
  });
  if (!r.ok) throw new Error(`Fugle quote ${r.status}`);
  return r.json() as Promise<{
    symbol: string;
    name: string;
    openPrice: number;
    highPrice: number;
    lowPrice: number;
    lastPrice: number;
    previousClose: number;
    change: number;
    changePercent: number;
    total: { tradeVolume: number; tradeValue: number };
  }>;
}

export async function fetchKline(code: string, timeframe: "1min" | "5min" | "30min" | "60min" | "D" = "D") {
  const key = process.env.FUGLE_API_KEY;
  if (!key) throw new Error("FUGLE_API_KEY not set");
  const r = await fetch(`${BASE}/stock/historical/candles/${code}?resolution=${timeframe}`, {
    headers: { "X-API-KEY": key },
    next: { revalidate: 300 },
  });
  if (!r.ok) throw new Error(`Fugle candles ${r.status}`);
  return r.json() as Promise<{ data: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> }>;
}
