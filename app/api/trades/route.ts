import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ trades: [] }, { status: 401 });
  const { data } = await (supabase as any).from("trades")
    .select("*").eq("user_id", user.id).order("trade_date", { ascending: false });
  return NextResponse.json({ trades: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const { error } = await (supabase as any).from("trades").insert({
    user_id: user.id,
    symbol: body.symbol,
    action: body.action,
    quantity: Number(body.quantity),
    price: Number(body.price),
    fee: Number(body.fee ?? 0),
    tax: Number(body.tax ?? 0),
    trade_date: body.trade_date,
    notes: body.notes ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await (supabase as any).from("trades").delete()
    .eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
