"use client";

/**
 * 前台 /login — 真實登入表單(NEXT_TASK_009-finish 階段 3.4)
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, ErrorState } from "@/components/ui";
import { color, fontSize, spacing, radius } from "@/styles/tokens";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const sb = getSupabase();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setSubmitting(false);
        return;
      }
      router.push("/profile");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px` }}>
      <header style={{ textAlign: "center", marginBottom: spacing.lg }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0, marginBottom: spacing.sm }}>
          🔐 登入呱呱招待所
        </h1>
        <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, margin: 0 }}>
          看分析師勝率不需登入。登入後可追蹤分析師、客製化推薦。
        </p>
      </header>

      <Card padded>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: spacing.md }}>
          {error && <ErrorState title="登入失敗" message={error} />}
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            required
            placeholder="you@example.com"
          />
          <Field
            label="密碼"
            type="password"
            value={password}
            onChange={setPassword}
            required
            placeholder="••••••••"
          />
          <Button type="submit" disabled={submitting} fullWidth>
            {submitting ? "登入中⋯" : "登入"}
          </Button>
        </form>
      </Card>

      <p
        style={{
          marginTop: spacing.lg,
          fontSize: fontSize.micro.size,
          color: color.secondaryText,
          textAlign: "center",
        }}
      >
        還沒有帳號?
        <Link href="/signup" style={{ color: color.accent, marginLeft: 4 }}>
          註冊
        </Link>
        {" · "}
        <Link href="/forgot-password" style={{ color: color.accent }}>
          忘記密碼
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
}: {
  label: string;
  type: "text" | "email" | "password";
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
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
  );
}
