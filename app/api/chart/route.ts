import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol") ?? "^TWII";
  const days = Number(req.nextUrl.searchParams.get("days") ?? 90);

  // 選擇 interval
  const interval = days <= 1 ? "5m" : days <= 7 ? "30m" : "1d";
  const range = days <= 1 ? "1d" : days <= 5 ? "5d" : days <= 30 ? "1mo" : days <= 90 ? "3mo" : days <= 180 ? "6mo" : "1y";

  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`,
      {
        next: { revalidate: 300 },
        headers: { "User-Agent": "Mozilla/5.0" },
      }
    );
    if (!r.ok) return NextResponse.json({ points: [], latest: null }, { status: 500 });
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return NextResponse.json({ points: [], latest: null });

    const timestamps = result.timestamp as number[] | undefined;
    const closes = result.indicators?.quote?.[0]?.close as (number | null)[] | undefined;
    const points = (timestamps ?? []).map((t, i) => {
      const value = closes?.[i];
      if (value == null) return null;
      const d = new Date(t * 1000);
      const time = days <= 1
        ? d.toISOString().slice(11, 16)
        : d.toISOString().slice(0, 10);
      return { time, value };
    }).filter((p): p is { time: string; value: number } => p !== null);

    const meta = result.meta;
    const price = meta.regularMarketPrice ?? meta.previousClose;
    const prev = meta.chartPreviousClose ?? meta.previousClose;
    const change = price - prev;
    const changePct = prev ? (change / prev) * 100 : 0;

    return NextResponse.json({
      points,
      latest: { price, change, changePct },
    });
  } catch (e) {
    return NextResponse.json({ points: [], latest: null, error: String(e) }, { status: 500 });
  }
}
