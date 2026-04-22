// Supabase 客戶端(前端)
// 只在需要直接讀取 DB 時使用(大部分走 FastAPI 比較安全)

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
