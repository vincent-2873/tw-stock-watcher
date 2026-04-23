"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { QuackAvatar } from "@/components/quack/QuackAvatar";

type WatchlistItem = {
  id: string;
  watchlist_id: string;
  symbol: string;
  market: string;
  stock_name: string | null;
  category: string | null;
  notes: string | null;
  target_buy: number | null;
  target_sell: number | null;
  stop_loss: number | null;
  created_at: string;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "empty" }
  | { kind: "ready"; items: WatchlistItem[] }
  | { kind: "error"; message: string };

export default function JournalPage() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        const {
          data: { user },
        } = await sb.auth.getUser();
        if (!user) {
          setState({ kind: "unauthenticated" });
          return;
        }
        // biome-ignore: Supabase's thin typings
        const { data: wl } = await (sb as any)
          .from("watchlists")
          .select("id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (!wl?.id) {
          setState({ kind: "empty" });
          return;
        }
        const { data, error } = await (sb as any)
          .from("watchlist_items")
          .select("*")
          .eq("watchlist_id", wl.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const items = (data ?? []) as WatchlistItem[];
        setState(items.length === 0 ? { kind: "empty" } : { kind: "ready", items });
      } catch (e) {
        setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, []);

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-10">
        <div className="text-xs mb-5" style={{ color: "var(--muted-fg)" }}>
          <Link href="/" className="hover:text-[var(--fg)]">
            今日
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--fg-soft)" }}>我的筆記</span>
        </div>

        <header className="mb-8 flex items-start gap-4">
          <QuackAvatar state="calm" size="lg" />
          <div>
            <h1
              className="text-3xl md:text-4xl mb-1"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: "var(--fg)",
              }}
            >
              我的筆記
            </h1>
            <p className="text-sm font-serif italic" style={{ color: "var(--muted-fg)" }}>
              「你今天看的,明天可能就忘了。先寫下來。」
            </p>
          </div>
        </header>

        <div className="wabi-divider mb-6" />

        {state.kind === "loading" && (
          <div className="text-center py-16 font-serif italic text-sm" style={{ color: "var(--muted-fg)" }}>
            呱呱翻翻你的筆記中⋯⋯
          </div>
        )}

        {state.kind === "unauthenticated" && (
          <div
            className="wabi-card p-8 text-center"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <QuackAvatar state="sleeping" size="xl" className="mb-4" />
            <h2
              className="text-xl mb-2"
              style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
            >
              還沒登入
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--muted-fg)" }}>
              筆記要先登入才能看。
            </p>
            <Link
              href="/login"
              className="wabi-btn inline-block"
              style={{
                padding: "8px 20px",
                border: "1px solid var(--border-strong)",
                background: "var(--bg-raised)",
              }}
            >
              去登入 →
            </Link>
          </div>
        )}

        {state.kind === "empty" && (
          <div
            className="wabi-card p-10 text-center"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <QuackAvatar state="meditating" size="xl" className="mb-4" />
            <h2
              className="text-xl mb-2"
              style={{ fontFamily: "var(--font-serif)", color: "var(--fg)" }}
            >
              筆記還空著
            </h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted-fg)" }}>
              ——  先去池塘看看哪檔值得記下一筆  ——
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link
                href="/pond"
                className="wabi-btn inline-block"
                style={{
                  padding: "8px 20px",
                  border: "1px solid var(--border-strong)",
                  background: "var(--bg-raised)",
                }}
              >
                🦆 逛池塘
              </Link>
              <Link
                href="/stocks"
                className="wabi-btn inline-block"
                style={{
                  padding: "8px 20px",
                  border: "1px solid var(--border)",
                }}
              >
                🔍 查個股
              </Link>
            </div>
          </div>
        )}

        {state.kind === "error" && (
          <div
            className="wabi-card p-6"
            style={{ background: "var(--card)", border: "1px solid var(--up)" }}
          >
            <p className="text-sm" style={{ color: "var(--up)" }}>
              讀取筆記失敗:{state.message}
            </p>
          </div>
        )}

        {state.kind === "ready" && (
          <div className="space-y-3">
            {state.items.map((it) => (
              <Link
                key={it.id}
                href={`/stocks/${it.symbol}`}
                className="block group"
                style={{ textDecoration: "none" }}
              >
                <article
                  className="wabi-card p-5 transition-all"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span
                          className="font-mono text-sm"
                          style={{ color: "var(--muted-fg)", fontFamily: "var(--font-mono)" }}
                        >
                          {it.symbol}
                        </span>
                        <h2
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: "18px",
                            fontWeight: 500,
                            color: "var(--fg)",
                          }}
                        >
                          {it.stock_name || it.symbol}
                        </h2>
                        {it.category && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{
                              background: "var(--muted)",
                              color: "var(--muted-fg)",
                            }}
                          >
                            {it.category}
                          </span>
                        )}
                      </div>
                      {it.notes && (
                        <p
                          className="text-sm mt-2 leading-relaxed"
                          style={{ color: "var(--fg-soft)" }}
                        >
                          {it.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 text-xs">
                      {it.target_buy !== null && (
                        <div className="text-right">
                          <div style={{ color: "var(--muted-fg)" }}>買</div>
                          <div
                            className="font-mono"
                            style={{
                              color: "var(--up)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {it.target_buy}
                          </div>
                        </div>
                      )}
                      {it.target_sell !== null && (
                        <div className="text-right">
                          <div style={{ color: "var(--muted-fg)" }}>賣</div>
                          <div
                            className="font-mono"
                            style={{
                              color: "var(--moss-deep, var(--moss))",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {it.target_sell}
                          </div>
                        </div>
                      )}
                      {it.stop_loss !== null && (
                        <div className="text-right">
                          <div style={{ color: "var(--muted-fg)" }}>損</div>
                          <div
                            className="font-mono"
                            style={{
                              color: "var(--down)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {it.stop_loss}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className="text-[11px] mt-3 font-mono"
                    style={{ color: "var(--muted-fg)", fontFamily: "var(--font-mono)" }}
                  >
                    {new Date(it.created_at).toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        <footer className="text-center mt-10 py-6">
          <div className="wabi-divider" />
          <p className="text-xs font-serif italic" style={{ color: "var(--muted-fg)" }}>
            ⚠ 目標價與停損僅為記錄,實際執行請下單確認。
          </p>
        </footer>
      </div>
    </main>
  );
}
