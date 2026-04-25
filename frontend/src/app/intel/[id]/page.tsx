import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

export const dynamic = "force-dynamic";

type Stock = { code: string; name?: string; impact?: string; strength?: string; reasoning?: string };
type KeyPoint = { type?: string; point?: string };

type Article = {
  id: number;
  source_id: number;
  source?: { id: number; name: string; type: string; region: string };
  title: string;
  url: string;
  author?: string;
  published_at?: string;
  raw_content?: string;
  language?: string;
  ai_summary?: string;
  ai_sentiment?: "bullish" | "bearish" | "neutral" | "mixed";
  ai_confidence?: number;
  ai_reasoning?: string;
  ai_counter_arguments?: string[];
  ai_key_points?: KeyPoint[];
  ai_affected_stocks?: Stock[];
  ai_affected_sectors?: string[];
  ai_importance?: number;
  ai_urgency?: number;
  ai_quack_perspective?: string;
  ai_time_horizon?: string;
  ai_analyzed_at?: string;
  captured_at?: string;
};

const SENT: Record<string, { text: string; color: string; bg: string }> = {
  bullish: { text: "🟢 利多", color: "#C9754D", bg: "rgba(201, 117, 77, 0.12)" },
  bearish: { text: "🔴 利空", color: "#6B8E5A", bg: "rgba(107, 142, 90, 0.12)" },
  neutral: { text: "🟡 中性", color: "#C9A961", bg: "rgba(201, 169, 97, 0.10)" },
  mixed: { text: "🟠 混合", color: "#D4B896", bg: "rgba(212, 184, 150, 0.10)" },
};

async function getArticle(id: string): Promise<Article | null> {
  try {
    const r = await fetch(`${API}/api/intel/articles/${id}`, { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json()) as Article;
  } catch {
    return null;
  }
}

export default async function IntelDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getArticle(id);
  if (!a) notFound();

  const sentiment = SENT[a.ai_sentiment || "neutral"] || SENT.neutral;
  const hasAI = !!a.ai_analyzed_at;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--fg)" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ fontSize: 12, color: "var(--muted-fg)", marginBottom: 16 }}>
          <Link href="/" style={{ color: "var(--muted-fg)", textDecoration: "none" }}>
            首頁
          </Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <Link href="/intel" style={{ color: "var(--muted-fg)", textDecoration: "none" }}>
            情報中樞
          </Link>
          <span style={{ margin: "0 8px" }}>/</span>
          <span>分析</span>
        </div>

        <article
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "28px 28px",
          }}
        >
          {/* 頭部:來源 + 時間 + 多空標籤 */}
          <header style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <span
                style={{
                  fontSize: 11,
                  padding: "3px 10px",
                  borderRadius: 10,
                  background: sentiment.bg,
                  color: sentiment.color,
                  border: `1px solid ${sentiment.color}`,
                }}
              >
                {hasAI ? sentiment.text : "尚未分析"}
                {hasAI && a.ai_confidence != null && `  · 信心 ${a.ai_confidence}%`}
              </span>
              {hasAI && a.ai_importance != null && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 10,
                    background: "var(--muted)",
                    color: "var(--fg-soft)",
                  }}
                >
                  重要度 {a.ai_importance}/10
                </span>
              )}
              {hasAI && a.ai_urgency != null && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 10,
                    background: "var(--muted)",
                    color: "var(--fg-soft)",
                  }}
                >
                  緊急度 {a.ai_urgency}/10
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-fg)" }}>
              {a.source?.name ? `${a.source.name} · ` : ""}
              {a.author ? `${a.author} · ` : ""}
              {a.published_at
                ? new Date(a.published_at).toLocaleString("zh-TW", {
                    timeZone: "Asia/Taipei",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                : ""}
            </div>
          </header>

          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 24,
              fontWeight: 500,
              color: "var(--fg)",
              marginBottom: 24,
              lineHeight: 1.4,
            }}
          >
            {a.title}
          </h1>

          {!hasAI ? (
            <div
              style={{
                padding: "20px",
                background: "var(--bg-raised)",
                border: "1px dashed var(--border)",
                borderRadius: 6,
                textAlign: "center",
                color: "var(--muted-fg)",
              }}
            >
              <div style={{ marginBottom: 6, opacity: 0.6, display: "flex", justifyContent: "center" }}>
                <Image
                  src="/characters/guagua_official_v1.png"
                  alt="呱呱"
                  width={40}
                  height={40}
                />
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 14 }}>呱呱正在分析中⋯</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                AI 批次 5 分鐘跑一次,稍等就會有分析。
              </div>
              {a.raw_content && (
                <details style={{ marginTop: 16, textAlign: "left" }}>
                  <summary style={{ cursor: "pointer", fontSize: 12 }}>看原文</summary>
                  <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.7, color: "var(--fg-soft)" }}>
                    {a.raw_content}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 20 }}>
              {/* 一句話結論 */}
              {a.ai_summary && (
                <section>
                  <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--muted-fg)", marginBottom: 6 }}>
                    🎯 一句話結論
                  </h2>
                  <div
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 18,
                      lineHeight: 1.7,
                      color: "var(--fg)",
                      paddingLeft: 14,
                      borderLeft: `3px solid ${sentiment.color}`,
                    }}
                  >
                    {a.ai_summary}
                  </div>
                </section>
              )}

              {/* 判斷理由 */}
              {a.ai_reasoning && (
                <section>
                  <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--muted-fg)", marginBottom: 6 }}>
                    📊 為什麼{sentiment.text}
                  </h2>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--fg-soft)" }}>
                    {a.ai_reasoning}
                  </div>
                </section>
              )}

              {/* 關鍵論點 */}
              {a.ai_key_points && a.ai_key_points.length > 0 && (
                <section>
                  <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--muted-fg)", marginBottom: 8 }}>
                    💡 關鍵論點
                  </h2>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                    {a.ai_key_points.map((k, i) => {
                      const tone = k.type === "positive" ? "✅" : k.type === "negative" ? "⚠️" : "·";
                      return (
                        <li key={i} style={{ display: "flex", gap: 8, fontSize: 14, color: "var(--fg-soft)" }}>
                          <span>{tone}</span>
                          <span>{k.point}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* 反方觀點 */}
              {a.ai_counter_arguments && a.ai_counter_arguments.length > 0 && (
                <section
                  style={{
                    padding: 14,
                    background: "rgba(107, 142, 90, 0.06)",
                    borderRadius: 6,
                    border: "1px dashed var(--down-soft)",
                  }}
                >
                  <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 13, color: "var(--muted-fg)", marginBottom: 6 }}>
                    🤔 反方觀點(如果我看錯了會是哪裡錯)
                  </h2>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {a.ai_counter_arguments.map((c, i) => (
                      <li key={i} style={{ fontSize: 13, color: "var(--fg-soft)", lineHeight: 1.6 }}>
                        · {c}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 影響個股 */}
              {a.ai_affected_stocks && a.ai_affected_stocks.length > 0 && (
                <section>
                  <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--muted-fg)", marginBottom: 8 }}>
                    📈 影響個股
                  </h2>
                  <div style={{ display: "grid", gap: 8 }}>
                    {a.ai_affected_stocks.map((s, i) => {
                      const dir = s.impact === "positive" ? "🟢" : s.impact === "negative" ? "🔴" : "🟡";
                      const isTw = /^\d{4,6}$/.test(s.code || "");
                      return (
                        <div
                          key={i}
                          style={{
                            padding: "10px 12px",
                            background: "var(--bg-raised)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            display: "flex",
                            gap: 10,
                            alignItems: "baseline",
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontSize: 14 }}>{dir}</span>
                          {isTw ? (
                            <Link
                              href={`/stocks/${s.code}`}
                              style={{
                                fontFamily: "var(--font-mono)",
                                color: "var(--fg)",
                                textDecoration: "none",
                                fontSize: 14,
                                fontWeight: 500,
                              }}
                            >
                              {s.code} {s.name || ""}
                            </Link>
                          ) : (
                            <span style={{ fontFamily: "var(--font-mono)" }}>
                              {s.code} {s.name || ""}
                            </span>
                          )}
                          {s.strength && (
                            <span style={{ fontSize: 11, color: "var(--muted-fg)" }}>
                              · {s.strength === "strong" ? "強" : s.strength === "moderate" ? "中" : "弱"}
                            </span>
                          )}
                          {s.reasoning && (
                            <span style={{ fontSize: 12, color: "var(--fg-soft)" }}>· {s.reasoning}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 呱呱視角 */}
              {a.ai_quack_perspective && (
                <section
                  style={{
                    padding: 18,
                    background: "linear-gradient(135deg, rgba(201, 169, 97, 0.08) 0%, rgba(122, 132, 113, 0.05) 100%)",
                    borderLeft: "4px solid var(--gold)",
                    borderRadius: 6,
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 14,
                      color: "var(--gold)",
                      marginBottom: 6,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Image
                      src="/characters/guagua_official_v1.png"
                      alt="呱呱"
                      width={20}
                      height={20}
                    />
                    呱呱視角
                  </h2>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 15, lineHeight: 1.7, color: "var(--fg)" }}>
                    「{a.ai_quack_perspective}」
                  </div>
                </section>
              )}
            </div>
          )}

          {/* 底部:原文連結 + 來源資訊 */}
          <footer
            style={{
              marginTop: 28,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              fontSize: 13,
            }}
          >
            {a.url && (
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "8px 14px",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  color: "var(--fg-soft)",
                  textDecoration: "none",
                }}
              >
                🔗 看原文
              </a>
            )}
            <Link
              href="/chat"
              style={{
                padding: "8px 14px",
                background: "rgba(201, 169, 97, 0.15)",
                border: "1px solid var(--gold)",
                borderRadius: 4,
                color: "var(--gold)",
                textDecoration: "none",
              }}
            >
              💬 問呱呱
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
