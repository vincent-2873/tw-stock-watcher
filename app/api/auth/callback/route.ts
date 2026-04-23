import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getBaseUrl(request: Request) {
  // 優先用環境變數；否則從 x-forwarded headers 推斷（Zeabur 代理環境）
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = request.headers;
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "tw-stock-watcher.zeabur.app";
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const base = getBaseUrl(request);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
  }
  return NextResponse.redirect(`${base}/login?error=auth`);
}
