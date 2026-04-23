import { NextRequest, NextResponse } from "next/server";
import { fetchLatestNews, dictionarySentiment } from "@/lib/data-sources/news";

export const revalidate = 600;

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const raw = await fetchLatestNews(80);

  const items = raw.map((n) => {
    const s = dictionarySentiment(`${n.title} ${n.description ?? ""}`);
    return { ...n, ...s };
  });

  const filtered = symbol
    ? items.filter((n) =>
        n.stocks.includes(symbol) ||
        n.title.includes(symbol) ||
        (n.description ?? "").includes(symbol),
      )
    : items;

  return NextResponse.json({ items: filtered.slice(0, 30) });
}
