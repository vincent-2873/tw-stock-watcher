// 跨市場指數：台股 / 美股 / 期貨
// 用 Yahoo Finance 的公開 query endpoint（無需 key）

const YF = "https://query1.finance.yahoo.com/v8/finance/chart";

export type MarketQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;       // 絕對值
  changePercent: number;
  time?: number;
};

async function fetchYahoo(symbol: string, range = "1d", interval = "5m"): Promise<MarketQuote | null> {
  try {
    const r = await fetch(`${YF}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`, {
      next: { revalidate: 60 },
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const price = meta.regularMarketPrice ?? meta.previousClose;
    const prev = meta.chartPreviousClose ?? meta.previousClose;
    const change = price - prev;
    const changePercent = prev ? (change / prev) * 100 : 0;
    return {
      symbol: meta.symbol,
      name: meta.longName ?? meta.shortName ?? meta.symbol,
      price,
      change,
      changePercent,
      time: meta.regularMarketTime,
    };
  } catch {
    return null;
  }
}

const INDEX_MAP: Array<{ symbol: string; label: string; market: "TW" | "US" | "FX" }> = [
  { symbol: "^TWII", label: "加權指數", market: "TW" },
  { symbol: "^TWOII", label: "櫃買指數", market: "TW" },
  { symbol: "TXF.TW", label: "台指期", market: "TW" },
  { symbol: "^DJI", label: "道瓊", market: "US" },
  { symbol: "^IXIC", label: "NASDAQ", market: "US" },
  { symbol: "^GSPC", label: "S&P 500", market: "US" },
  { symbol: "^SOX", label: "費半", market: "US" },
  { symbol: "USDTWD=X", label: "美元/台幣", market: "FX" },
];

export async function fetchAllIndices(): Promise<Array<MarketQuote & { label: string; market: string }>> {
  const results = await Promise.all(
    INDEX_MAP.map(async (i) => {
      const q = await fetchYahoo(i.symbol);
      return q ? { ...q, label: i.label, market: i.market } : null;
    }),
  );
  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

export async function fetchSymbolQuote(symbol: string) {
  return fetchYahoo(symbol, "3mo", "1d");
}
