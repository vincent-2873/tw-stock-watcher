"use client";

/**
 * 前台 /news — 新聞時間線(NEXT_TASK_009 階段 5.3)
 *
 * 從 /api/intel/articles 抓最近文章。
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, EmptyState, ErrorState, LoadingSpinner } from "@/components/ui";
import { color, fontSize, spacing } from "@/styles/tokens";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

type Article = {
  id?: number | string;
  title?: string;
  source?: string;
  url?: string;
  published_at?: string;
  ai_sentiment?: string;
  ai_summary?: string;
  ai_tag?: string;
  tw_impact_score?: number;
};

const sentimentTone = (s?: string): "success" | "danger" | "default" => {
  if (s === "bullish" || s === "positive" || s === "利多") return "success";
  if (s === "bearish" || s === "negative" || s === "利空") return "danger";
  return "default";
};

const sentimentLabel = (s?: string): string => {
  if (s === "bullish" || s === "positive") return "利多";
  if (s === "bearish" || s === "negative") return "利空";
  if (s === "neutral") return "中性";
  return s ?? "—";
};

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/intel/articles?limit=80`);
        if (!r.ok) {
          if (!cancelled) {
            setError(`API 錯誤 ${r.status}`);
            setLoading(false);
          }
          return;
        }
        const j = await r.json();
        if (!cancelled) {
          setArticles(j.articles || []);
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
          <span>新聞時間線</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0, marginBottom: spacing.xs }}>
          📰 新聞時間線
        </h1>
        <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, margin: 0 }}>
          AI 已讀過 · 標註利多/利空/中性 · 最近 80 則
        </p>
      </header>

      {loading && (
        <div style={{ textAlign: "center", padding: spacing.xl }}>
          <LoadingSpinner size={40} label="載入新聞中…" />
        </div>
      )}

      {error && <ErrorState title="新聞載入失敗" message={error} />}

      {!loading && !error && (!articles || articles.length === 0) && (
        <EmptyState title="目前無新聞" description="爬蟲下次更新前先休息。" />
      )}

      {articles && articles.length > 0 && (
        <div style={{ display: "grid", gap: spacing.sm }}>
          {articles.map((a, i) => {
            const dt = a.published_at?.slice(0, 16).replace("T", " ");
            return (
              <Card key={a.id ?? i} hoverable padded>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <Badge tone={sentimentTone(a.ai_sentiment)}>{sentimentLabel(a.ai_sentiment)}</Badge>
                  {a.ai_tag && <Badge tone="info">{a.ai_tag}</Badge>}
                  {a.tw_impact_score != null && a.tw_impact_score >= 5 && (
                    <Badge tone="warning">影響度 {a.tw_impact_score}</Badge>
                  )}
                  <span style={{ fontSize: fontSize.micro.size, color: color.secondaryText }}>
                    {a.source} · {dt}
                  </span>
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: fontSize.body.size,
                    margin: 0,
                    marginBottom: 6,
                    lineHeight: 1.5,
                  }}
                >
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: color.primaryText, textDecoration: "none" }}
                    >
                      {a.title}
                    </a>
                  ) : (
                    a.title
                  )}
                </h3>
                {a.ai_summary && (
                  <p style={{ margin: 0, fontSize: fontSize.caption.size, color: color.secondaryText, lineHeight: 1.7 }}>
                    {a.ai_summary}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
