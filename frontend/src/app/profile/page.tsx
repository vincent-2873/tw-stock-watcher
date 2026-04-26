"use client";

import Link from "next/link";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { color, fontSize, spacing } from "@/styles/tokens";

const TIERS: Array<{ id: string; label: string; desc: string; tone: "accent" | "warning" | "info" | "success" | "default" }> = [
  { id: "L1", label: "L1 · CEO", desc: "Vincent 專屬:呱呱命令台 / 直接調整中樞參數", tone: "accent" },
  { id: "L2", label: "L2 · 合夥人", desc: "家人 / 合夥人:看完整持倉揭露 + 決策視窗", tone: "warning" },
  { id: "L3", label: "L3 · VIP", desc: "深度報告 + 即時推播 + 跨會議學習迴圈", tone: "info" },
  { id: "L4", label: "L4 · 付費", desc: "完整勝率排行 + 分析師深度檔案 + ETF 績效", tone: "success" },
  { id: "L5", label: "L5 · 訪客", desc: "首頁 / 分析師個人頁 / 會議列表(摘要)", tone: "default" },
];

export default function ProfilePage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px` }}>
      <header style={{ marginBottom: spacing.lg }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0, marginBottom: spacing.xs }}>
          👤 個人資料
        </h1>
        <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, margin: 0 }}>
          使用者系統正在搭建中。下面顯示 L1-L5 等級規劃 — 等 Auth 啟用就能看到自己的資料。
        </p>
      </header>

      <Card padded style={{ marginBottom: spacing.lg }}>
        <EmptyState
          title="尚未登入"
          description="登入後可在這裡看到你的等級、追蹤的分析師、個人偏好。"
          action={
            <div style={{ display: "flex", gap: spacing.sm, justifyContent: "center" }}>
              <Link href="/login">
                <Button>登入</Button>
              </Link>
              <Link href="/signup">
                <Button variant="secondary">註冊</Button>
              </Link>
            </div>
          }
        />
      </Card>

      <Card padded>
        <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0, marginBottom: spacing.md }}>
          🎚️ L1-L5 權限分層(規劃中)
        </h3>
        <div style={{ display: "grid", gap: spacing.sm }}>
          {TIERS.map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                gap: spacing.md,
                padding: spacing.sm + 4,
                border: `1px solid ${color.borderSubtle}`,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <Badge tone={t.tone}>{t.label}</Badge>
              </div>
              <div style={{ fontSize: fontSize.caption.size, color: color.primaryText, flex: 1 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <p style={{ marginTop: spacing.lg, textAlign: "center", fontSize: fontSize.micro.size, color: color.secondaryText }}>
        <Link href="/" style={{ color: color.accent }}>
          ← 回首頁
        </Link>
      </p>
    </main>
  );
}
