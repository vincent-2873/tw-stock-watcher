"use client";

/**
 * 前台 /signup — 真實註冊表單(NEXT_TASK_009-finish 階段 3.3)
 *
 * 用 supabase.auth.signUp + auto trigger handle_new_user 建立 user_profiles(L5)。
 * 因 dashboard 已關閉「Confirm email」,註冊後 session 立刻就有,可導去 /profile。
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorState } from "@/components/ui";
import { color, fontSize, spacing, radius } from "@/styles/tokens";
import { getSupabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("密碼至少 8 個字元");
      return;
    }
    setSubmitting(true);
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split("@")[0] },
        },
      });
      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      // Confirm email 已關閉,session 應該立刻建立
      setTimeout(() => router.push("/profile"), 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px` }}>
      <header style={{ textAlign: "center", marginBottom: spacing.lg }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0, marginBottom: spacing.sm }}>
          🌱 註冊呱呱招待所
        </h1>
        <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, margin: 0 }}>
          註冊後成為 L5 訪客 — 可追蹤分析師、保留個人偏好。
        </p>
      </header>

      <Card padded>
        {success ? (
          <div style={{ textAlign: "center", padding: spacing.lg }}>
            <div style={{ fontSize: 32, marginBottom: spacing.sm }}>🎉</div>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0 }}>
              註冊成功
            </h3>
            <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, marginTop: spacing.xs }}>
              正在帶你到個人資料頁⋯
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} style={{ display: "grid", gap: spacing.md }}>
            {error && <ErrorState title="註冊失敗" message={error} />}
            <Field
              label="顯示名稱(可選)"
              type="text"
              value={displayName}
              onChange={setDisplayName}
              placeholder="不填會用 email 前綴"
            />
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              required
              placeholder="you@example.com"
            />
            <Field
              label="密碼(至少 8 字元)"
              type="password"
              value={password}
              onChange={setPassword}
              required
              minLength={8}
              placeholder="••••••••"
            />
            <Button type="submit" disabled={submitting} fullWidth>
              {submitting ? "送出中⋯" : "建立帳號"}
            </Button>
          </form>
        )}
      </Card>

      <p style={{ marginTop: spacing.lg, fontSize: fontSize.micro.size, color: color.secondaryText, textAlign: "center" }}>
        已有帳號?
        <Link href="/login" style={{ color: color.accent, marginLeft: 4 }}>
          登入
        </Link>
      </p>
    </main>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  required,
  placeholder,
  minLength,
}: {
  label: string;
  type: "text" | "email" | "password";
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  minLength?: number;
}) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: fontSize.caption.size, color: color.primaryText, marginBottom: 4 }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        minLength={minLength}
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
        onFocus={(e) => {
          e.target.style.borderColor = color.accent as string;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = color.borderSubtle as string;
        }}
      />
    </label>
  );
}
