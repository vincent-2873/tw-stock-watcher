"use client";

/**
 * /analysts — 分析師團隊總覽(NEXT_TASK_008c 真實資料版)
 *
 * 接 backend /api/analysts:
 *   每張卡顯示真實 holdings_count + win_rate + 最新 market_view 摘要
 *
 * 5 位分析師:辰旭 / 靜遠 / 觀棋 / 守拙 / 明川
 */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ANALYSTS, ANALYST_SLUGS, AnalystAvatar, AnalystSlug } from "@/components/AnalystAvatar";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

export const dynamic = "force-dynamic";

type AnalystListItem = {
  agent_id: string;
  slug: string | null;
  display_name: string;
  school: string;
  trait_label?: string | null;
  strictness_coefficient?: number | null;
  success_criteria_style?: string;
  holdings_count: number;
  stats: {
    total_predictions?: number;
    win_rate?: number | null;
    last_30d_predictions?: number;
    last_30d_win_rate?: number | null;
    v1_predictions?: number;
    v1_winrate?: number | null;
    v2_predictions?: number;
    v2_winrate?: number | null;
    normalized_winrate?: number | null;
  };
  latest_market_view: {
    market_view: string;
    bias?: string;
    confidence?: number;
    view_date?: string;
  } | null;
};

function pct(x?: number | null): string {
  return x == null ? "—" : `${(x * 100).toFixed(1)}%`;
}

function strictnessLabel(coef?: number | null): string {
  if (coef == null) return "—";
  if (coef >= 0.95) return "Strict";
  if (coef >= 0.85) return "Quant 90%";
  if (coef >= 0.75) return "Loose 80%";
  return "Segmented 66%";
}

export default function AnalystsIndex() {
  const [items, setItems] = useState<Record<string, AnalystListItem>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/api/analysts`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (!cancelled) {
            const map: Record<string, AnalystListItem> = {};
            for (const a of (j.analysts || [])) {
              if (a.slug) map[a.slug] = a;
            }
            setItems(map);
          }
        }
      } catch {/**/}
      finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ background: "var(--bg, #F2E8D5)", minHeight: "100vh" }}>
      <TopNav />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px 80px" }}>
        <header style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>呱呱投資招待所 ·</p>
          <h1 style={{ fontFamily: "var(--font-serif, serif)", fontSize: 32, fontWeight: 500, margin: 0 }}>
            分析師團隊
          </h1>
          <p style={{ marginTop: 12, fontFamily: "var(--font-serif, serif)", fontSize: 15, lineHeight: 1.7, color: "#5d4a3e", maxWidth: 720 }}>
            吶,五位分析師,五種**個性**。<br />
            **每位都看全盤**(技術 + 基本面 + 籌碼 + 量化 + 題材 + 消息)——<br />
            差異是個性、權重、風險偏好、時間框架,以及自己定義什麼叫「命中」。<br />
            選一位你願意託付的,跟著一起往前走。
          </p>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 48 }}>
          {ANALYST_SLUGS.map((slug) => {
            const a = ANALYSTS[slug as AnalystSlug];
            const item = items[slug];
            const winRate = item?.stats?.win_rate != null ? `${(item.stats.win_rate * 100).toFixed(1)}%` : "累積中";
            const normalized = item?.stats?.normalized_winrate;
            const trait = item?.trait_label || a.school;
            const strictMode = strictnessLabel(item?.strictness_coefficient);
            const v2Count = item?.stats?.v2_predictions ?? 0;
            void winRate;
            return (
              <article
                key={slug}
                style={{
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(93, 74, 62, 0.12)",
                  borderRadius: 8,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <AnalystAvatar slug={slug} size="md" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontFamily: "var(--font-serif, serif)", fontSize: 22, fontWeight: 500, margin: 0 }}>
                      {a.name}
                      <span style={{ fontSize: 13, color: "#888", marginLeft: 8, fontWeight: 400 }}>{a.pinyin}</span>
                    </h2>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: a.primary, fontWeight: 600 }}>
                        {trait}(全盤)
                      </span>
                      <span
                        title={`Strictness coefficient ${item?.strictness_coefficient ?? "—"} — normalized winrate = win_rate × coefficient`}
                        style={{
                          fontSize: 10,
                          padding: "1px 6px",
                          background: "rgba(93,74,62,0.08)",
                          border: "1px solid rgba(93,74,62,0.15)",
                          borderRadius: 4,
                          color: "#5d4a3e",
                        }}
                      >
                        {strictMode}
                      </span>
                      {v2Count > 0 && (
                        <span style={{ fontSize: 10, padding: "1px 6px", background: "#3a7d4a22", color: "#2d6539", borderRadius: 4 }}>
                          v2 已啟用
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                      {a.personality.join(" · ")}
                    </div>
                    <blockquote
                      style={{
                        margin: 0,
                        padding: "6px 10px",
                        borderLeft: `2px solid ${a.primary}66`,
                        fontFamily: "var(--font-serif, serif)",
                        fontStyle: "italic",
                        fontSize: 13,
                        color: "#5d4a3e",
                      }}
                    >
                      「{a.oneLine}」
                    </blockquote>
                  </div>
                </div>

                {item?.latest_market_view?.market_view && (
                  <div style={{ padding: "8px 10px", background: `${a.primary}0a`, borderLeft: `2px solid ${a.primary}66`, borderRadius: 4, fontSize: 12, color: "#5d4a3e", lineHeight: 1.6 }}>
                    <strong style={{ fontSize: 10, color: a.primary }}>本日大盤觀點:</strong>
                    <span style={{ marginLeft: 6 }}>{item.latest_market_view.market_view}</span>
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 8,
                    paddingTop: 10,
                    borderTop: "1px solid rgba(93, 74, 62, 0.08)",
                    fontSize: 11,
                  }}
                >
                  <div>
                    <div style={{ color: "#888" }}>當前持倉</div>
                    <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 14, color: a.primary, fontWeight: 600 }}>
                      {loading ? "…" : `${item?.holdings_count ?? 0} 檔`}
                    </div>
                  </div>
                  <div title={normalized != null ? `Normalized: ${pct(normalized)}` : "尚無 normalized"}>
                    <div style={{ color: "#888" }}>累積勝率</div>
                    <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 14 }}>
                      {loading ? "…" : pct(item?.stats?.win_rate)}
                      {normalized != null && (
                        <span style={{ fontSize: 10, color: "#888", marginLeft: 4 }}>
                          ↪{pct(normalized)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div title="v1=舊單一面向架構 / v2=全盤+個性新架構">
                    <div style={{ color: "#888" }}>v1 / v2</div>
                    <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
                      {loading ? "…" : (
                        <>
                          <span>{pct(item?.stats?.v1_winrate)}</span>
                          <span style={{ color: "#888", margin: "0 3px" }}>/</span>
                          <span style={{ color: a.primary }}>{pct(item?.stats?.v2_winrate)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/analysts/${slug}`}
                  style={{
                    display: "inline-block",
                    textAlign: "center",
                    padding: "10px 14px",
                    background: a.primary,
                    color: "#fff",
                    borderRadius: 6,
                    fontSize: 13,
                    textDecoration: "none",
                    fontFamily: "var(--font-serif, serif)",
                  }}
                >
                  進入個人頁 →
                </Link>
              </article>
            );
          })}
        </section>

        <section
          style={{
            marginTop: 48,
            padding: 24,
            background: "rgba(255,255,255,0.4)",
            borderRadius: 8,
            border: "1px dashed rgba(93, 74, 62, 0.2)",
          }}
        >
          <h3 style={{ fontFamily: "var(--font-serif, serif)", fontSize: 17, fontWeight: 500, margin: 0, marginBottom: 8 }}>
            追蹤分析師(即將開放)
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "#5d4a3e", margin: 0 }}>
            很快你就能訂閱單一分析師,每場會議他出聲時優先收到推播。<br />
            勝率累積到一定樣本後才會解鎖訂閱 —— 招待所不賣空頭支票。
          </p>
        </section>
      </main>
    </div>
  );
}

function TopNav() {
  return (
    <div style={{ background: "rgba(255,255,255,0.6)", borderBottom: "1px solid rgba(93, 74, 62, 0.1)", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 24 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#5d4a3e" }}>
          <Image src="/characters/guagua_official_v1.png" alt="呱呱投資招待所" width={32} height={32} />
          <span style={{ fontFamily: "var(--font-serif, serif)", fontSize: 16, fontWeight: 500 }}>
            呱呱投資招待所
          </span>
        </Link>
        <nav style={{ display: "flex", gap: 16, fontSize: 13 }}>
          <Link href="/" style={navLink}>今日重點</Link>
          <Link href="/pond" style={navLink}>題材熱度</Link>
          <Link href="/analysts" style={{ ...navLink, color: "#C84B3C", fontWeight: 600 }}>分析師團隊</Link>
          <Link href="/chat" style={navLink}>AI 對話</Link>
          <Link href="/intel" style={navLink}>情報</Link>
        </nav>
      </div>
    </div>
  );
}

const navLink: React.CSSProperties = { textDecoration: "none", color: "#5d4a3e" };
