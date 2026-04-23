import { NextResponse } from "next/server";
import { fetchAllIndices } from "@/lib/data-sources/markets";

export const revalidate = 30;

export async function GET() {
  const data = await fetchAllIndices();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
  });
}
