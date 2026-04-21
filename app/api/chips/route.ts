import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600;

// FinMind TaiwanStockInstitutionalInvestorsBuySell
async function fetchInstitutional(code: string, startDate: string) {
  const token = process.env.FINMIND_TOKEN ?? "";
  const query = new URLSearchParams({
    dataset: "TaiwanStockInstitutionalInvestorsBuySell",
    data_id: code,
    start_date: startDate,
    token,
  });
  const r = await fetch(`https://api.finmindtrade.com/api/v4/data?${query}`, {
    next: { revalidate: 3600 },
  });
  if (!r.ok) return [];
  const j = await r.json() as { status: number; data?: Array<{ date: string; stock_id: string; name: string; buy: number; sell: number }> };
  if (j.status !== 200) return [];
  return j.data ?? [];
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ rows: [] }, { status: 400 });

  // 15 天前
  const d = new Date(); d.setDate(d.getDate() - 30);
  const startDate = d.toISOString().slice(0, 10);

  try {
    const raw = await fetchInstitutional(symbol, startDate);
    // 以日期 group，sum 所有法人（外資 + 投信 + 自營）
    const byDate = new Map<string, { date: string; buy: number; sell: number; net: number }>();
    for (const r of raw) {
      const key = r.date;
      const cur = byDate.get(key) ?? { date: key, buy: 0, sell: 0, net: 0 };
      const buy = Math.round(r.buy / 1000);
      const sell = Math.round(r.sell / 1000);
      cur.buy += buy;
      cur.sell += sell;
      cur.net += (buy - sell);
      byDate.set(key, cur);
    }
    const rows = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    return NextResponse.json({ rows });
  } catch (e) {
    return NextResponse.json({ rows: [], error: String(e) });
  }
}
