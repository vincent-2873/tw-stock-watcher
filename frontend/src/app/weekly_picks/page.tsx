"use client";

/**
 * 前台 /weekly_picks — 本週推薦完整列表(NEXT_TASK_009 階段 5.3)
 *
 * 從 /api/quack/weekly_picks 抓最新 weekly_picks。
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, EmptyState, ErrorState, LoadingSpinner } from "@/components/ui";
import { color, fontSize, spacing } from "@/styles/tokens";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

type Pick = {
  symbol: string;
  name?: string;
  category?: string;
  reasoning?: string;
  target_price?: number;
  entry_price?: number;
  confidence?: number;
};

const CATEGORY_TONE: Record<string, "success" | "danger" | "warning" | "info"> = {
  穩健: "success",
  進攻: "danger",
  逆勢: "warning",
  題材: "info",
};

export default function WeeklyPicksPage() {
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/quack/weekly_picks`);
        if (!r.ok) {
          if (!cancelled) setError(`API 錯誤 ${r.status}`);
          if (!cancelled) setLoading(false);
          return;
        }
        const j = await r.json();
        if (!cancelled) {
          setPicks(j.picks || []);
          setUpdatedAt(j.generated_at ?? j.updated_at ?? null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(`連線失敗:${e instanceof Error ? e.message : String(e)}`);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: `${spacing.xl}px ${spacing.lg}px` }}>
      <header style={{ marginBottom: spacing.lg }}>
        <div style={{ fontSize: fontSize.caption.size, color: color.secondaryText, marginBottom: spacing.xs }}>
          <Link href="/" style={{ color: "inherit" }}>
            首頁
          </Link>
          <span style={{ margin: "0 6px" }}>›</span>
          <span>本週推薦</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0, marginBottom: spacing.xs }}>
          🦆 呱呱這週挑的
        </h1>
        <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, margin: 0 }}>
          穩健 / 進攻 / 逆勢 / 題材 · 呱呱中樞 AI 推理產出
          {updatedAt && ` · 更新於 ${updatedAt.slice(0, 16).replace("T", " ")}`}
        </p>
      </header>

      {loading && (
        <div style={{ textAlign: "center", padding: spacing.xl }}>
          <LoadingSpinner size={40} label="載入推薦中…" />
        </div>
      )}

      {error && <ErrorState title="推薦載入失敗" message={error} />}

      {!loading && !error && (!picks || picks.length === 0) && (
        <EmptyState
          title="這週尚未產出推薦"
          description="呱呱每週日晚間更新本週名單。"
          action={
            <Link href="/" style={{ color: color.accent, textDecoration: "underline" }}>
              ← 回首頁
            </Link>
          }
        />
      )}

      {picks && picks.length > 0 && (
        <div style={{ display: "grid", gap: spacing.md, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {picks.map((p) => (
            <Card key={p.symbol} hoverable>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: fontSize.h3.size, fontWeight: 500 }}>
                  {p.symbol}
                </div>
                {p.category && <Badge tone={CATEGORY_TONE[p.category] || "default"}>{p.category}</Badge>}
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.body.size, marginBottom: 4 }}>
                {p.name ?? "—"}
              </div>
              {p.reasoning && (
                <p style={{ margin: 0, marginTop: spacing.sm, fontSize: fontSize.caption.size, lineHeight: 1.7, color: color.secondaryText }}>
                  {p.reasoning}
                </p>
              )}
              <div style={{ display: "flex", gap: spacing.md, marginTop: spacing.sm, fontSize: fontSize.micro.size, color: color.secondaryText }}>
                {p.entry_price != null && <span>進場 ${p.entry_price}</span>}
                {p.target_price != null && (
                  <span style={{ color: color.accent }}>目標 ${p.target_price}</span>
                )}
                {p.confidence != null && <span>信心 {Math.round(p.confidence * 100)}%</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
