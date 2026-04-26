"use client";

/**
 * NavAuthButton — 主導航右上角的登入狀態元件(NEXT_TASK_009-finish 階段 3.7)
 *
 * 監聽 supabase.auth.onAuthStateChange:
 *  - 未登入:顯示「登入 / 註冊」按鈕
 *  - 已登入:顯示頭像 + 下拉選單(個人資料 / 登出)
 *
 * 環境變數沒設好時 silent fallback,渲染「登入 / 註冊」連結 — 點擊跳 stub 頁。
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type NavAuthSize = "compact" | "default";

export function NavAuthButton({ size = "default" }: { size?: NavAuthSize }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    (async () => {
      try {
        const { getSupabase } = await import("@/lib/supabase");
        const sb = getSupabase();
        // initial read
        const { data: { user } } = await sb.auth.getUser();
        if (cancelled) return;
        if (user) {
          setEmail(user.email ?? null);
          // 抓 tier(可選)
          const { data: p } = await sb
            .from("user_profiles")
            .select("tier,display_name")
            .eq("id", user.id)
            .maybeSingle();
          if (!cancelled && p) {
            setTier((p as { tier?: string }).tier ?? null);
          }
        }
        const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
          if (cancelled) return;
          setEmail(session?.user?.email ?? null);
          if (!session) setTier(null);
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      } catch {
        /* env not ready or build context */
      }
    })();
    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const onSignOut = async () => {
    setBusy(true);
    try {
      const { getSupabase } = await import("@/lib/supabase");
      await getSupabase().auth.signOut();
      setEmail(null);
      setTier(null);
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const fontSize = size === "compact" ? 12 : 13;
  const padding = size === "compact" ? "4px 10px" : "5px 12px";

  if (!email) {
    return (
      <div style={{ display: "inline-flex", gap: 8 }}>
        <Link
          href="/login"
          style={{
            fontSize,
            padding,
            color: "#5d4a3e",
            textDecoration: "none",
            border: "1px solid transparent",
            borderRadius: 4,
          }}
        >
          登入
        </Link>
        <Link
          href="/signup"
          style={{
            fontSize,
            padding,
            color: "#fff",
            background: "#B85450",
            textDecoration: "none",
            borderRadius: 4,
          }}
        >
          註冊
        </Link>
      </div>
    );
  }

  // 已登入
  const initial = (email.charAt(0) || "?").toUpperCase();
  const tierLabel = tier ?? "L5";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 10px",
          fontSize,
          background: "rgba(255,255,255,0.6)",
          border: "1px solid rgba(168, 152, 120, 0.4)",
          borderRadius: 999,
          cursor: "pointer",
          color: "#5d4a3e",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#B85450",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {initial}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{tierLabel}</span>
        <span style={{ fontSize: 9, opacity: 0.5 }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: "#FAF5E8",
            border: "1px solid rgba(168, 152, 120, 0.3)",
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(44, 36, 22, 0.1)",
            minWidth: 180,
            padding: 6,
            zIndex: 100,
          }}
        >
          <div style={{ padding: "6px 10px", fontSize: 11, color: "#7A6E53", fontFamily: "var(--font-mono)" }}>
            {email}
          </div>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            style={{
              display: "block",
              padding: "7px 10px",
              fontSize: 13,
              color: "#5d4a3e",
              textDecoration: "none",
              borderRadius: 4,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(184,84,80,0.08)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            👤 個人資料
          </Link>
          <button
            onClick={onSignOut}
            disabled={busy}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "7px 10px",
              fontSize: 13,
              color: "#B85450",
              background: "transparent",
              border: "none",
              cursor: busy ? "wait" : "pointer",
              fontFamily: "inherit",
              borderRadius: 4,
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(184,84,80,0.08)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            {busy ? "登出中⋯" : "🚪 登出"}
          </button>
        </div>
      )}
    </div>
  );
}

export default NavAuthButton;
