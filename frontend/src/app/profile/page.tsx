"use client";

/**
 * 前台 /profile — 真實個人資料頁(NEXT_TASK_009-finish 階段 3.6)
 *
 * 抓 supabase session + user_profiles + user_followed_analysts。
 * 未登入 → 跳 /login。
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, EmptyState, LoadingSpinner } from "@/components/ui";
import { color, fontSize, spacing } from "@/styles/tokens";
import { getSupabase, type UserProfile } from "@/lib/supabase";
import { ANALYSTS, type AnalystSlug, AnalystAvatar } from "@/components/AnalystAvatar";

const TIER_INFO: Record<UserProfile["tier"], { label: string; tone: "accent" | "warning" | "info" | "success" | "default"; desc: string }> = {
  L1: { label: "L1 · CEO", tone: "accent", desc: "Vincent 專屬:呱呱命令台 / 直接調整中樞參數" },
  L2: { label: "L2 · 合夥人", tone: "warning", desc: "家人 / 合夥人:看完整持倉揭露 + 決策視窗" },
  L3: { label: "L3 · VIP", tone: "info", desc: "深度報告 + 即時推播 + 跨會議學習迴圈" },
  L4: { label: "L4 · 付費", tone: "success", desc: "完整勝率排行 + 分析師深度檔案 + ETF 績效" },
  L5: { label: "L5 · 訪客", tone: "default", desc: "首頁 / 分析師個人頁 / 會議列表(摘要)" },
};

const ANALYST_ID_TO_SLUG: Record<string, AnalystSlug> = {
  analyst_a: "chenxu",
  analyst_b: "jingyuan",
  analyst_c: "guanqi",
  analyst_d: "shouzhuo",
  analyst_e: "mingchuan",
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [follows, setFollows] = useState<string[]>([]);
  const [signOutBusy, setSignOutBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const sb = getSupabase();
        const { data } = await sb.auth.getUser();
        if (!data.user) {
          router.replace("/login");
          return;
        }
        if (cancelled) return;
        setUser({ id: data.user.id, email: data.user.email ?? null });

        const [{ data: p }, { data: f }] = await Promise.all([
          sb.from("user_profiles").select("*").eq("id", data.user.id).maybeSingle(),
          sb
            .from("user_followed_analysts")
            .select("agent_id")
            .eq("user_id", data.user.id),
        ]);
        if (cancelled) return;
        setProfile((p as UserProfile) ?? null);
        setFollows((f ?? []).map((row: { agent_id: string }) => row.agent_id));
      } catch {
        // 環境未設好 → 顯示 stub
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSignOut = async () => {
    setSignOutBusy(true);
    try {
      const sb = getSupabase();
      await sb.auth.signOut();
      router.push("/");
    } finally {
      setSignOutBusy(false);
    }
  };

  if (loading) {
    return (
      <main style={{ maxWidth: 760, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px`, textAlign: "center" }}>
        <LoadingSpinner size={48} label="載入個人資料中⋯" />
      </main>
    );
  }

  if (!user) {
    // 應該已被導向 /login,但保險顯示
    return (
      <main style={{ maxWidth: 480, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px` }}>
        <EmptyState
          title="尚未登入"
          description="登入後可看到個人資料、追蹤的分析師、tier。"
          action={
            <Link href="/login">
              <Button>登入</Button>
            </Link>
          }
        />
      </main>
    );
  }

  const tierInfo = profile ? TIER_INFO[profile.tier] : TIER_INFO.L5;
  const followedAnalysts = follows
    .map((aid) => ({ aid, slug: ANALYST_ID_TO_SLUG[aid] }))
    .filter((x) => x.slug && ANALYSTS[x.slug]);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px` }}>
      <header style={{ marginBottom: spacing.lg }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0, marginBottom: spacing.xs }}>
          👤 個人資料
        </h1>
      </header>

      <Card padded style={{ marginBottom: spacing.lg }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: spacing.md }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <Badge tone={tierInfo.tone}>{tierInfo.label}</Badge>
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h2.size, marginBottom: 4 }}>
              {profile?.display_name || user.email?.split("@")[0]}
            </div>
            <div style={{ color: color.secondaryText, fontSize: fontSize.caption.size, fontFamily: "var(--font-mono)" }}>
              {user.email}
            </div>
          </div>
          <Button variant="secondary" onClick={onSignOut} disabled={signOutBusy}>
            {signOutBusy ? "登出中⋯" : "登出"}
          </Button>
        </div>
        <p style={{ marginTop: spacing.md, fontSize: fontSize.caption.size, color: color.secondaryText, lineHeight: 1.7 }}>
          {tierInfo.desc}
        </p>
      </Card>

      {/* 追蹤的分析師 */}
      <Card padded style={{ marginBottom: spacing.lg }}>
        <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0, marginBottom: spacing.sm }}>
          🦆 我追蹤的分析師({followedAnalysts.length})
        </h3>
        {followedAnalysts.length === 0 ? (
          <EmptyState
            title="還沒追蹤任何分析師"
            description="去分析師團隊頁看看誰的風格適合你,點「追蹤」加入清單。"
            action={
              <Link href="/analysts">
                <Button variant="secondary">看分析師團隊</Button>
              </Link>
            }
          />
        ) : (
          <div style={{ display: "flex", gap: spacing.md, flexWrap: "wrap" }}>
            {followedAnalysts.map(({ aid, slug }) => (
              <Link key={aid} href={`/analysts/${slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <AnalystAvatar slug={slug} size="sm" />
                  <div style={{ fontSize: 12, color: color.primaryText }}>{ANALYSTS[slug].name}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <p style={{ marginTop: spacing.lg, textAlign: "center", fontSize: fontSize.micro.size, color: color.secondaryText }}>
        <Link href="/" style={{ color: color.accent }}>
          ← 回首頁
        </Link>
      </p>
    </main>
  );
}
