"use client";

import Link from "next/link";
import { Button, Card, EmptyState } from "@/components/ui";
import { color, fontSize, spacing } from "@/styles/tokens";

export default function SignupPage() {
  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: `${spacing["3xl"]}px ${spacing.lg}px` }}>
      <header style={{ textAlign: "center", marginBottom: spacing.lg }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0, marginBottom: spacing.sm }}>
          🌱 註冊呱呱招待所
        </h1>
        <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, margin: 0 }}>
          註冊後成為 L5 訪客 — 可追蹤分析師、保留個人偏好。
        </p>
      </header>

      <Card padded>
        <EmptyState
          title="註冊功能即將開放"
          description="使用者系統正在搭建中(NEXT_TASK_009 階段 4)。等 Supabase Auth 啟用後就能用 email 註冊。"
          action={
            <Link href="/">
              <Button variant="secondary">回首頁</Button>
            </Link>
          }
        />
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
