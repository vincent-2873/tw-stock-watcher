"use client";

/**
 * 追蹤分析師按鈕(NEXT_TASK_009-finish 階段 3.8)
 *
 * 未登入 → 跳 /login
 * 已登入 + 未追蹤 → 點擊 INSERT user_followed_analysts
 * 已追蹤 → 點擊 DELETE
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function FollowAnalystButton({
  agentId,
  primaryColor = "#B85450",
}: {
  agentId: string;
  primaryColor?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [followed, setFollowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getSupabase } = await import("@/lib/supabase");
        const sb = getSupabase();
        const { data: { user } } = await sb.auth.getUser();
        if (cancelled) return;
        if (!user) {
          setSignedIn(false);
          setLoading(false);
          return;
        }
        setSignedIn(true);
        const { data } = await sb
          .from("user_followed_analysts")
          .select("agent_id")
          .eq("user_id", user.id)
          .eq("agent_id", agentId)
          .maybeSingle();
        if (cancelled) return;
        setFollowed(!!data);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setSignedIn(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  const onClick = async () => {
    if (signedIn === false) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { getSupabase } = await import("@/lib/supabase");
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      if (followed) {
        const { error } = await sb
          .from("user_followed_analysts")
          .delete()
          .eq("user_id", user.id)
          .eq("agent_id", agentId);
        if (error) throw error;
        setFollowed(false);
      } else {
        const { error } = await sb
          .from("user_followed_analysts")
          .insert({ user_id: user.id, agent_id: agentId });
        if (error) throw error;
        setFollowed(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <button
        type="button"
        disabled
        style={{
          marginTop: 18,
          padding: "10px 20px",
          background: "#ddd",
          color: "#888",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          fontFamily: "var(--font-serif, serif)",
          cursor: "wait",
        }}
      >
        載入中⋯
      </button>
    );
  }

  if (signedIn === false) {
    return (
      <Link
        href="/login"
        style={{
          display: "inline-block",
          marginTop: 18,
          padding: "10px 20px",
          background: primaryColor,
          color: "#fff",
          border: "none",
          borderRadius: 6,
          fontSize: 14,
          fontFamily: "var(--font-serif, serif)",
          textDecoration: "none",
        }}
      >
        🦆 追蹤(請先登入)
      </Link>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        style={{
          padding: "10px 20px",
          background: followed ? "transparent" : primaryColor,
          color: followed ? primaryColor : "#fff",
          border: `1px solid ${primaryColor}`,
          borderRadius: 6,
          fontSize: 14,
          fontFamily: "var(--font-serif, serif)",
          cursor: busy ? "wait" : "pointer",
          transition: "all 200ms ease",
        }}
      >
        {busy ? "處理中⋯" : followed ? "✓ 已追蹤(點擊取消)" : "🦆 追蹤這位分析師"}
      </button>
      {error && (
        <span style={{ fontSize: 11, color: "#B85450" }}>
          錯誤:{error}
        </span>
      )}
    </div>
  );
}

export default FollowAnalystButton;
