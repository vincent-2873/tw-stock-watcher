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
  const body = await req.json() as {
    symbol: string;
    market?: string;
    stock_name?: string | null;
    category?: string | null;
    notes?: string | null;
    target_buy?: number | null;
    target_sell?: number | null;
    stop_loss?: number | null;
  };
  if (!body.symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  // 沒 watchlist 就自動建一個,不要回 404
  let wlId = await getWatchlistId(user.id);
  if (!wlId) {
    const { data: created, error: cerr } = await (supabase as any)
      .from("watchlists")
      .insert({ user_id: user.id, name: "我的自選" })
      .select("id")
      .single();
    if (cerr) return NextResponse.json({ error: "create watchlist failed: " + cerr.message }, { status: 500 });
    wlId = created?.id as string;
  }
  if (!wlId) return NextResponse.json({ error: "no watchlist" }, { status: 500 });

  const row = {
    watchlist_id: wlId,
    symbol: body.symbol.toUpperCase(),
    market: body.market ?? "TW",
    stock_name: body.stock_name ?? null,
    category: body.category ?? null,
    notes: body.notes ?? null,
    target_buy: body.target_buy ?? null,
    target_sell: body.target_sell ?? null,
    stop_loss: body.stop_loss ?? null,
  };
  const { error } = await (supabase as any).from("watchlist_items").upsert(
    row,
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
