"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

type Article = {
  id: number;
  source_id: number;
  source?: { id: number; name: string; type: string; region: string };
  title: string;
  url: string;
  author?: string;
  published_at?: string;
  language?: string;
  ai_summary?: string;
  ai_sentiment?: "bullish" | "bearish" | "neutral" | "mixed" | null;
  ai_confidence?: number;
  ai_importance?: number;
  ai_analyzed_at?: string;
};

const SENT_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  bullish: { text: "🟢 利多", color: "#C9754D", bg: "rgba(201, 117, 77, 0.12)" },
  bearish: { text: "🔴 利空", color: "#6B8E5A", bg: "rgba(107, 142, 90, 0.12)" },
  neutral: { text: "🟡 中性", color: "#C9A961", bg: "rgba(201, 169, 97, 0.10)" },
  mixed: { text: "🟠 混合", color: "#D4B896", bg: "rgba(212, 184, 150, 0.10)" },
};

type Filter = "all" | "bullish" | "bearish" | "neutral" | "mixed";

export default function IntelListPage() {
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const qs = new URLSearchParams({ limit: "60" });
        if (filter !== "all") qs.set("sentiment", filter);
        const r = await fetch(`${API}/api/intel/articles?${qs}`, { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) setArticles(j.articles ?? []);
      } catch {
        if (!cancelled) setArticles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
  }, [filter]);

  const countAll = articles?.length ?? 0;
  const byTag = {
    bullish: articles?.filter((a) => a.ai_sentiment === "bullish").length ?? 0,
    bearish: articles?.filter((a) => a.ai_sentiment === "bearish").length ?? 0,
    neutral: articles?.filter((a) => a.ai_sentiment === "neutral").length ?? 0,
    mixed: articles?.filter((a) => a.ai_sentiment === "mixed").length ?? 0,
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--fg)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ fontSize: 12, color: "var(--muted-fg)", marginBottom: 16 }}>
          <Link href="/" style={{ color: "var(--muted-fg)", textDecoration: "none" }}>
            ← 首頁
          </Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>情報中樞</span>
        </div>

        <header style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 28,
              fontWeight: 500,
              color: "var(--fg)",
            }}
          >
            📰 今日重點情報
          </h1>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 13,
              color: "var(--muted-fg)",
              fontStyle: "italic",
              marginTop: 6,
            }}
          >
            「呱呱幫你讀過世界,整理成你看得懂的話。」
          </p>
        </header>

        {/* 多空篩選 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {(["all", "bullish", "bearish", "neutral", "mixed"] as Filter[]).map((k) => {
            const isActive = filter === k;
            const label =
              k === "all"
                ? `🌍 全部 ${countAll}`
                : `${SENT_LABEL[k].text} ${byTag[k as keyof typeof byTag]}`;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 4,
                  fontSize: 13,
                  cursor: "pointer",
                  background: isActive ? "var(--fg)" : "var(--card)",
                  color: isActive ? "var(--card)" : "var(--fg-soft)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-serif)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {loading && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted-fg)", fontStyle: "italic" }}>
            呱呱正在讀⋯
          </div>
        )}

        {!loading && articles && articles.length === 0 && (
          <div
            style={{
              padding: "40px 24px",
              textAlign: "center",
              color: "var(--muted-fg)",
              background: "var(--card)",
              border: "1px dashed var(--border)",
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>🦆💤</div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 15 }}>
              還沒抓到文章,呱呱還在睡。
            </div>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              管理員可打 POST /api/intel/refresh 觸發抓取。
            </div>
          </div>
        )}

        {!loading && articles && articles.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
            {articles.map((a) => {
              const s = SENT_LABEL[a.ai_sentiment || "neutral"] || SENT_LABEL.neutral;
              const hasAI = !!a.ai_analyzed_at;
              return (
                <li key={a.id}>
                  <Link
                    href={`/intel/${a.id}`}
                    style={{
                      display: "block",
                      textDecoration: "none",
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "16px 18px",
                      color: "var(--fg)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 10px",
                          borderRadius: 10,
                          background: s.bg,
                          color: s.color,
                          border: `1px solid ${s.color}`,
                        }}
                      >
                        {hasAI ? s.text : "🦆 尚未分析"}
                        {hasAI && a.ai_confidence != null && `  ·  信心 ${a.ai_confidence}%`}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--muted-fg)" }}>
                        {a.source?.name ? `${a.source.name} · ` : ""}
                        {a.published_at
                          ? new Date(a.published_at).toLocaleString("zh-TW", {
                              timeZone: "Asia/Taipei",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })
                          : ""}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: 16,
                        fontWeight: 500,
                        color: "var(--fg)",
                        marginBottom: a.ai_summary ? 6 : 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {a.title}
                    </div>
                    {a.ai_summary && (
                      <div style={{ fontSize: 13, color: "var(--fg-soft)", lineHeight: 1.6 }}>
                        {a.ai_summary}
                      </div>
                    )}
                    {hasAI && a.ai_importance != null && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: "var(--muted-fg)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        重要度 {a.ai_importance}/10
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
