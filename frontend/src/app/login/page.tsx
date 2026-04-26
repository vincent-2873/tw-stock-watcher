"use client";

/**
 * 前台 /login — 登入頁(NEXT_TASK_009 階段 4.3)
 *
 * 因 Supabase Auth 尚未在 dashboard 啟用 + env 未設好,本頁先 stub 化:
 * 顯示「即將開放」提示 + 給 Vincent 啟用步驟連結。
 *
 * 啟用後 Vincent 需要做:
 *   1. Supabase Dashboard → Authentication → Providers → Email enable
 *   2. 新增 frontend env:NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   3. cd frontend && pnpm add @supabase/supabase-js
 *   4. 換掉本檔(可改寫成真正登入表單)
 *   5. 執行 migration 0016/0017 SQL 檔
 */

import Link from "next/link";
import { Button, Card, EmptyState } from "@/components/ui";
import { color, fontSize, spacing } from "@/styles/tokens";

export default function LoginPage() {
  return (
    <main
      style={{
        maxWidth: 480,
        margin: "0 auto",
        padding: `${spacing["3xl"]}px ${spacing.lg}px`,
      }}
    >
      <header style={{ textAlign: "center", marginBottom: spacing.lg }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0, marginBottom: spacing.sm }}>
          🔐 登入呱呱招待所
        </h1>
        <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, margin: 0 }}>
          看分析師勝率不需登入。登入後可追蹤分析師、客製化推薦。
        </p>
      </header>

      <Card padded>
        <EmptyState
          title="登入功能即將開放"
          description="使用者系統正在搭建中。屆時會接 Supabase Auth(Email + 密碼登入)。"
          action={
            <div style={{ display: "flex", gap: spacing.sm, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/">
                <Button variant="secondary">回首頁</Button>
              </Link>
              <Link href="/analysts">
                <Button>看分析師團隊</Button>
              </Link>
            </div>
          }
        />
      </Card>

      <p
        style={{
          marginTop: spacing.lg,
          fontSize: fontSize.micro.size,
          color: color.secondaryText,
          textAlign: "center",
        }}
      >
        還沒有帳號?<Link href="/signup" style={{ color: color.accent, marginLeft: 4 }}>註冊</Link>
        {" · "}
        <Link href="/forgot-password" style={{ color: color.accent }}>忘記密碼</Link>
      </p>
    </main>
  );
}
