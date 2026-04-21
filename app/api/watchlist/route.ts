import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getWatchlistId(userId: string) {
  const supabase = await createClient();
  const { data } = await (supabase as any).from("watchlists").select("id").eq("user_id", userId).limit(1).single();
  return data?.id as string | undefined;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] }, { status: 401 });
  const wlId = await getWatchlistId(user.id);
  if (!wlId) return NextResponse.json({ items: [] });
  const { data } = await (supabase as any)
    .from("watchlist_items").select("*").eq("watchlist_id", wlId).order("sort_order", { ascending: true });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json() as { symbol: string; market?: string };
  if (!body.symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const wlId = await getWatchlistId(user.id);
  if (!wlId) return NextResponse.json({ error: "no watchlist" }, { status: 404 });
  const { error } = await (supabase as any).from("watchlist_items").upsert(
    { watchlist_id: wlId, symbol: body.symbol, market: body.market ?? "TW" },
    { onConflict: "watchlist_id,symbol" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });
  const wlId = await getWatchlistId(user.id);
  if (!wlId) return NextResponse.json({ error: "no watchlist" }, { status: 404 });
  const { error } = await (supabase as any).from("watchlist_items").delete()
    .eq("watchlist_id", wlId).eq("symbol", symbol);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
