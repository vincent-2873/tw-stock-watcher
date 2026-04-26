"use client";

/**
 * 前台 /forgot-password — 真實重設密碼(NEXT_TASK_009-finish 階段 3.5)
 */

import { useState } from "react";
import Link from "next/link";
import { Button, Card, ErrorState } from "@/components/ui";
import { color, fontSize, spacing, radius } from "@/styles/tokens";
import { getSupabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const sb = getSupabase();
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/profile` : undefined;
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }
      setSent(true);
      setSubmitting(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px` }}>
      <header style={{ textAlign: "center", marginBottom: spacing.lg }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0 }}>
          忘記密碼
        </h1>
      </header>

      <Card padded>
        {sent ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: spacing.sm }}>📨</div>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0 }}>
              重設信件已寄出
            </h3>
            <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, marginTop: spacing.xs }}>
              請到 {email} 收信並照連結重設密碼。
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "grid", gap: spacing.md }}>
            {error && <ErrorState title="重設失敗" message={error} />}
            <p style={{ fontSize: fontSize.caption.size, color: color.secondaryText, margin: 0 }}>
              輸入註冊時用的 email,我們會寄一封重設密碼的信。
            </p>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: fontSize.caption.size, color: color.primaryText, marginBottom: 4 }}>
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  fontSize: fontSize.body.size,
                  background: color.bgRaised,
                  border: `1px solid ${color.borderSubtle}`,
                  borderRadius: radius.md,
                  color: color.primaryText,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            </label>
            <Button type="submit" disabled={submitting} fullWidth>
              {submitting ? "送出中⋯" : "寄出重設信"}
            </Button>
          </form>
        )}
      </Card>

      <p style={{ marginTop: spacing.lg, fontSize: fontSize.micro.size, color: color.secondaryText, textAlign: "center" }}>
        <Link href="/login" style={{ color: color.accent }}>
          ← 回登入
        </Link>
      </p>
    </main>
  );
}
