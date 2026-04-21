import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "tw-stock-watcher.zeabur.app";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;
  return NextResponse.redirect(`${base}/`, { status: 303 });
}
