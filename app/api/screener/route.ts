import { NextRequest, NextResponse } from "next/server";
import { fetchTwseDailyAll } from "@/lib/data-sources/twse";

export const revalidate = 300;

type Criteria = {
  price_min?: number;
  price_max?: number;
  change_min?: number;
  change_max?: number;
  volume_min?: number;
};

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const c: Criteria = {
    price_min: params.get("price_min") ? Number(params.get("price_min")) : undefined,
    price_max: params.get("price_max") ? Number(params.get("price_max")) : undefined,
    change_min: params.get("change_min") ? Number(params.get("change_min")) : undefined,
    change_max: params.get("change_max") ? Number(params.get("change_max")) : undefined,
    volume_min: params.get("volume_min") ? Number(params.get("volume_min")) : undefined,
  };

  try {
    const rows = await fetchTwseDailyAll();
    const parsed = rows.map((r) => ({
      code: r.Code,
      name: r.Name,
      price: parseFloat(r.ClosingPrice || "0"),
      change: parseFloat(r.Change || "0"),
      volume: parseInt((r.TradeVolume || "0").replace(/,/g, ""), 10),
    })).filter((r) => r.price > 0);

    const filtered = parsed.filter((r) => {
      if (c.price_min != null && r.price < c.price_min) return false;
      if (c.price_max != null && r.price > c.price_max) return false;
      if (c.change_min != null && r.change < c.change_min) return false;
      if (c.change_max != null && r.change > c.change_max) return false;
      if (c.volume_min != null && r.volume < c.volume_min) return false;
      return true;
    }).sort((a, b) => b.change - a.change).slice(0, 100);

    return NextResponse.json({ count: filtered.length, results: filtered });
  } catch (e) {
    return NextResponse.json({ error: String(e), results: [] }, { status: 500 });
  }
}
