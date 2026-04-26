// Supabase 客戶端(前端)— NEXT_TASK_009-finish 階段 3.2
//
// 用 @supabase/ssr 的 createBrowserClient(支援 cookie-based auth + SSR)。
// 對外提供 singleton supabase client 給整個 app 共用,避免多次 instantiate。

import { createBrowserClient, type SupabaseClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * 取得(或建立)瀏覽器端的 singleton Supabase client
 * SSR / build time 不會 throw — 只會回 lazy instance,實際 await call 時
 * 才會用 fetch(SSR 階段不會呼叫 await,只會 import + instantiate)
 */
export function getSupabase() {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    // build time 若 env 沒設,給空字串建 dummy client(實際 call 才會 fail,
    // 但這樣 build 不會炸,SSR prerender 也能走完)
    _client = createBrowserClient(url || "https://placeholder.supabase.co", anon || "placeholder-anon-key");
  }
  return _client;
}

/** 兼容舊 API — 等同 getSupabase() */
export function createClient() {
  return getSupabase();
}

/** 給 component 用:檢查目前是否已登入(同步,從 session) */
export async function getCurrentUser() {
  try {
    const sb = getSupabase();
    const { data } = await sb.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

/** Profile from public.user_profiles(tier / display_name / ...) */
export type UserProfile = {
  id: string;
  display_name: string | null;
  tier: "L1" | "L2" | "L3" | "L4" | "L5";
  avatar_url: string | null;
  created_at: string | null;
  last_seen_at: string | null;
};

/** 抓當前 user 的 profile(tier / display_name 等) */
export async function getMyProfile(): Promise<UserProfile | null> {
  try {
    const sb = getSupabase();
    const { data: userData } = await sb.auth.getUser();
    if (!userData.user) return null;
    const { data, error } = await sb
      .from("user_profiles")
      .select("*")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (error) return null;
    return (data as UserProfile) ?? null;
  } catch {
    return null;
  }
}

/** 把 supabase client export 出來,方便高階用法 */
export type { SupabaseClient };
