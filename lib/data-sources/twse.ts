// TWSE OpenAPI 封裝（免費、無需 token）
// 文件：https://openapi.twse.com.tw/

const BASE = "https://openapi.twse.com.tw/v1";

type TwseDaily = {
  Code: string;       // 股票代號
  Name: string;       // 股票名稱
  TradeVolume: string;
  TradeValue: string;
  OpeningPrice: string;
  HighestPrice: string;
  LowestPrice: string;
  ClosingPrice: string;
  Change: string;
  Transaction: string;
};

export async function fetchTwseDailyAll(): Promise<TwseDaily[]> {
  const r = await fetch(`${BASE}/exchangeReport/STOCK_DAY_ALL`, {
    next: { revalidate: 300 }, // 5 分鐘快取
  });
  if (!r.ok) throw new Error(`TWSE API ${r.status}`);
  return r.json();
}

// 三大法人買賣超
export async function fetchInstitutionalInvestors(): Promise<
  Array<{ Code: string; Name: string; ForeignInvestorsBuyVolume: string; ForeignInvestorsSellVolume: string }>
> {
  const r = await fetch(`${BASE}/fund/T86`, { next: { revalidate: 1800 } });
  if (!r.ok) throw new Error(`TWSE T86 ${r.status}`);
  return r.json();
}

// 融資融券
export async function fetchMarginBalance() {
  const r = await fetch(`${BASE}/exchangeReport/MI_MARGN`, { next: { revalidate: 1800 } });
  if (!r.ok) throw new Error(`TWSE MI_MARGN ${r.status}`);
  return r.json();
}

// 大盤即時資訊（5秒級）
export async function fetchIndexRealtime() {
  const r = await fetch(`${BASE}/exchangeReport/MI_INDEX`, { next: { revalidate: 60 } });
  if (!r.ok) throw new Error(`TWSE MI_INDEX ${r.status}`);
  return r.json();
}

// 個股每日歷史（透過 STOCK_DAY endpoint，有 date 參數版本）
// 文件：https://www.twse.com.tw/exchangeReport/STOCK_DAY
export async function fetchStockDailyHistory(code: string, yearMonth: string) {
  const url = `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?date=${yearMonth}01&stockNo=${code}&response=json`;
  const r = await fetch(url, { next: { revalidate: 3600 } });
  if (!r.ok) throw new Error(`TWSE STOCK_DAY ${r.status}`);
  return r.json();
}
