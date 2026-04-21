"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) alert(error.message);
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-2xl bg-card border border-border">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">登入</h1>
          <p className="text-muted-fg text-sm">TW Stock Watcher</p>
        </div>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg bg-white text-black font-medium hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center gap-3 transition"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.3-7.2 2.3-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.8l6.2 5.2c-.4.4 6.6-4.8 6.6-15 0-1.3-.1-2.6-.4-3.9z"/>
          </svg>
          {loading ? "登入中..." : "使用 Google 登入"}
        </button>
        <p className="text-xs text-muted-fg text-center">
          登入即同意使用條款。我們不儲存您的密碼。
        </p>
      </div>
    </main>
  );
}
