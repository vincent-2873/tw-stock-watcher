"use client";

import Link from "next/link";
import { Button, Card, EmptyState } from "@/components/ui";
import { color, fontSize, spacing } from "@/styles/tokens";

export default function ForgotPasswordPage() {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: `${spacing["3xl"]}px ${spacing.lg}px` }}>
      <header style={{ textAlign: "center", marginBottom: spacing.lg }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0 }}>忘記密碼</h1>
      </header>

      <Card padded>
        <EmptyState
          title="尚未啟用"
          description="使用者系統建好後,這裡會接 Supabase Auth 的密碼重設流程。"
          action={
            <Link href="/login">
              <Button variant="secondary">回登入</Button>
            </Link>
          }
        />
      </Card>

      <p style={{ marginTop: spacing.lg, fontSize: fontSize.micro.size, color: color.secondaryText, textAlign: "center" }}>
        <Link href="/" style={{ color: color.accent }}>
          回首頁
        </Link>
      </p>
    </main>
  );
}
