// FinMind API（籌碼、分點進出、借券）
// 文件：https://finmindtrade.com/
// 免費：500 req/hr

const BASE = "https://api.finmindtrade.com/api/v4/data";

async function fetchFinMind<T>(dataset: string, params: Record<string, string>): Promise<T[]> {
  const token = process.env.FINMIND_TOKEN ?? "";
  const query = new URLSearchParams({ dataset, ...params, token });
  const r = await fetch(`${BASE}?${query}`, { next: { revalidate: 1800 } });
  if (!r.ok) throw new Error(`FinMind ${dataset} ${r.status}`);
  const j = await r.json() as { data: T[]; status: number; msg: string };
  if (j.status !== 200) throw new Error(`FinMind ${dataset} ${j.msg}`);
  return j.data;
}

// 三大法人買賣超
export function fetchInstitutional(code: string, startDate: string) {
  return fetchFinMind<{
    date: string; stock_id: string; name: string;
    buy: number; sell: number;
  }>("TaiwanStockInstitutionalInvestorsBuySell", { data_id: code, start_date: startDate });
}

// 分點進出（券商分點）
export function fetchBrokerTrades(code: string, date: string) {
  return fetchFinMind<{
    date: string; securities_trader: string; stock_id: string;
    buy: number; sell: number; price: number;
  }>("TaiwanStockTradingDailyReport", { data_id: code, start_date: date });
}

// 借券賣出
export function fetchShortSale(code: string, startDate: string) {
  return fetchFinMind<{ date: string; stock_id: string; volume: number }>(
    "TaiwanStockShortSaleMarginPurchaseTogether",
    { data_id: code, start_date: startDate },
  );
}

// 融資融券
export function fetchMargin(code: string, startDate: string) {
  return fetchFinMind<{
    date: string; stock_id: string;
    MarginPurchaseBuy: number; MarginPurchaseSell: number;
    ShortSaleBuy: number; ShortSaleSell: number;
  }>("TaiwanStockMarginPurchaseShortSale", { data_id: code, start_date: startDate });
}
