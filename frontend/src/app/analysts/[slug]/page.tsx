"use client";

/**
 * /analysts/[slug] — 分析師個人頁(NEXT_TASK_008c 真實資料版)
 *
 * 接 backend /api/analysts/{slug}:
 *   - profile + stats(從 agent_stats)
 *   - holdings(active 持倉,quack_predictions where status=active)
 *   - latest_market_view(analyst_market_views 最新一則)
 *   - daily_picks(analyst_daily_picks 今日)
 *   - meetings_attended(出席的會議)
 *   - learning_notes(失敗檢討 — 008d 後填入)
 *
 * 9 區塊接資料策略:
 *   1. Hero: profile + stats(累積中標示)
 *   2. 個人介紹: ANALYST_INTROS(寫死,屬人設)
 *   3. 績效報告: 008d 後接通,目前顯示「累積中」
 *   4. 當前持倉: 來自 /api/analysts/{slug}/holdings
 *   5. 大盤觀點: 來自 /api/analysts/{slug} latest_market_view
 *   6. 今日推薦: 來自 daily_picks
 *   7. 歷史會議發言: 來自 meetings_attended
 *   8. 學習筆記: 008d 後填入
 *   9. 訂閱按鈕: hover「即將開放」
 */

import Link from "next/link";
import Image from "next/image";
import { use, useEffect, useState } from "react";
import { ANALYSTS, AnalystSlug, AnalystAvatar } from "@/components/AnalystAvatar";
import { ANALYST_INTROS } from "./intros";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

export const dynamic = "force-dynamic";

type Holding = {
  id: number;
  target_symbol: string;
  target_name: string;
  direction: string;
  target_price: number | null;
  current_price_at_prediction: number | null;
  deadline: string | null;
  confidence: number;
  reasoning: string | null;
  success_criteria: string | null;
  status: string;
  meeting_id: string | null;
};

type MarketView = {
  market_view: string;
  key_focus: string[];
  bias: string;
  confidence: number;
  view_date: string;
  generated_at: string;
};

type DailyPick = {
  target_symbol: string;
  target_name: string | null;
  strength: number;
  entry_price_low: number | null;
  entry_price_high: number | null;
  reason: string;
  pick_date: string;
};

type MeetingMeta = {
  meeting_id: string;
  meeting_type: string;
  started_at: string;
  predictions_count: number;
};

type AnalystResponse = {
  display_name: string;
  school: string;
  weights: string;
  personality: string;
  catchphrase: string[];
  stats: {
    total_predictions?: number;
    hits?: number;
    misses?: number;
    win_rate?: number | null;
    last_30d_predictions?: number;
    last_30d_win_rate?: number | null;
  };
  holdings: Holding[];
  holdings_count: number;
  latest_market_view: MarketView | null;
  daily_picks: DailyPick[];
  meetings_attended: MeetingMeta[];
  learning_notes: Array<{ note_id: number; date: string; lesson: string }>;
};

export default function AnalystDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const a = ANALYSTS[slug as AnalystSlug];
  const intro = a ? ANALYST_INTROS[slug as AnalystSlug] : null;

  const [data, setData] = useState<AnalystResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!a) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/api/analysts/${slug}`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (!cancelled) setData(j);
        } else {
          if (!cancelled) setError(`HTTP ${r.status}`);
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, a]);

  if (!a) {
    return (
      <div style={{ background: "var(--bg, #F2E8D5)", minHeight: "100vh" }}>
        <TopNav />
        <main style={{ maxWidth: 800, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-serif, serif)", fontSize: 28 }}>找不到這位分析師</h1>
          <Link href="/analysts" style={{ display: "inline-block", marginTop: 24, padding: "10px 16px", background: "#5d4a3e", color: "#fff", textDecoration: "none", borderRadius: 6 }}>
            ← 回團隊總覽
          </Link>
        </main>
      </div>
    );
  }

  const stats = data?.stats;
  const winRate = stats?.win_rate != null ? `${Math.round(stats.win_rate * 100)}%` : "累積中";
  const totalPreds = stats?.total_predictions ?? 0;
  const holdingsCount = data?.holdings_count ?? 0;

  return (
    <div style={{ background: "var(--bg, #F2E8D5)", minHeight: "100vh" }}>
      <TopNav />

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/analysts" style={{ color: "#888", fontSize: 13, textDecoration: "none" }}>
            ← 分析師團隊
          </Link>
        </div>

        {/* 1. Hero */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 32,
            padding: 28,
            background: "rgba(255,255,255,0.55)",
            borderRadius: 10,
            marginBottom: 24,
            alignItems: "center",
          }}
        >
          <AnalystAvatar slug={a.slug} size="lg" />
          <div>
            <div style={{ fontSize: 12, color: a.primary, fontWeight: 600, marginBottom: 6 }}>
              {a.school}
            </div>
            <h1 style={{ fontFamily: "var(--font-serif, serif)", fontSize: 38, fontWeight: 500, margin: 0 }}>
              {a.name}
              <span style={{ fontSize: 16, color: "#888", marginLeft: 12, fontWeight: 400 }}>{a.pinyin}</span>
            </h1>
            <p style={{ marginTop: 10, fontSize: 14, color: "#5d4a3e", lineHeight: 1.7 }}>
              {a.personality.join(" · ")}
            </p>
            <blockquote
              style={{
                marginTop: 14,
                padding: "10px 14px",
                background: `${a.primary}11`,
                borderLeft: `3px solid ${a.primary}`,
                fontFamily: "var(--font-serif, serif)",
                fontStyle: "italic",
                fontSize: 15,
                color: "#5d4a3e",
              }}
            >
              「{a.oneLine}」
            </blockquote>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 18 }}>
              <KeyStat label="當前持倉" value={`${holdingsCount} 檔`} />
              <KeyStat label="總預測數" value={String(totalPreds)} />
              <KeyStat label="勝率" value={winRate} />
              <KeyStat label="平均報酬" value="累積中" />
            </div>

            <button
              type="button"
              disabled
              title="即將開放 — 樣本累積到一定數量後解鎖訂閱"
              style={{
                marginTop: 18,
                padding: "10px 20px",
                background: "#bbb",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                cursor: "not-allowed",
                fontFamily: "var(--font-serif, serif)",
              }}
            >
              訂閱(即將開放)
            </button>
          </div>
        </section>

        {error && (
          <div style={{ padding: 14, background: "#fff5e6", border: "1px solid #d4a014", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
            分析師資料暫時連不上({error}),呱呱去後場確認中
          </div>
        )}

        {/* 2. 個人介紹 */}
        {intro && (
          <Section title="關於 我">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <IntroCard title="我是誰" body={intro.who} />
              <IntroCard title="我的信念" body={intro.belief} />
              <IntroCard title="我的風格" body={intro.style} />
            </div>
          </Section>
        )}

        {/* 3. 績效報告(008d 後接通) */}
        <Section title="績效報告">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <Placeholder title="勝率走勢" note={winRate} hint={totalPreds > 0 ? "預測樣本累積中,需 6 個月歷史回溯後解鎖走勢圖。" : "預測樣本到 30 筆後出現曲線。"} />
            <Placeholder title="最佳標的" note={"—"} hint="6 個月歷史回溯(008d)後解鎖。" />
            <Placeholder title="最差標的" note={"—"} hint="6 個月歷史回溯(008d)後解鎖。" />
            <Placeholder title="近 30 日勝率" note={stats?.last_30d_win_rate != null ? `${Math.round((stats.last_30d_win_rate as number) * 100)}%` : "累積中"} hint={`${stats?.last_30d_predictions ?? 0} 筆樣本`} />
          </div>
        </Section>

        {/* 4. 當前持倉 */}
        <Section title={`當前持倉(active 預測 · ${holdingsCount} 檔)`}>
          {loading ? (
            <CenteredHint>持倉資料整理中⋯⋯</CenteredHint>
          ) : data?.holdings && data.holdings.length > 0 ? (
            <div style={{ background: "rgba(255,255,255,0.5)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(93,74,62,0.12)" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead style={{ background: "rgba(93,74,62,0.06)" }}>
                    <tr>
                      <Th>標的</Th>
                      <Th>方向</Th>
                      <Th>進場價</Th>
                      <Th>目標價</Th>
                      <Th>信心</Th>
                      <Th>時限</Th>
                      <Th>呱呱口吻理由</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.holdings.map((h) => (
                      <tr key={h.id} style={{ borderTop: "1px solid rgba(93,74,62,0.08)" }}>
                        <Td>
                          <strong>{h.target_symbol}</strong>{" "}
                          <span style={{ color: "#888", fontSize: 11 }}>{h.target_name}</span>
                        </Td>
                        <Td>
                          <span style={{ color: dirColor(h.direction), fontWeight: 500 }}>
                            {dirText(h.direction)}
                          </span>
                        </Td>
                        <Td mono>{h.current_price_at_prediction ?? "—"}</Td>
                        <Td mono><strong style={{ color: a.primary }}>{h.target_price ?? "—"}</strong></Td>
                        <Td>
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: 3,
                              background: confBg(h.confidence),
                              fontSize: 11,
                              fontWeight: 500,
                            }}
                          >
                            {h.confidence}
                          </span>
                        </Td>
                        <Td mono>{h.deadline ? h.deadline.slice(0, 10) : "—"}</Td>
                        <Td>
                          <div style={{ maxWidth: 320, color: "#5d4a3e" }}>
                            {h.reasoning ? truncate(h.reasoning, 90) : "—"}
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <CenteredHint>持倉資料整理中⋯⋯ 戰情室會議刷新後可見。</CenteredHint>
          )}
        </Section>

        {/* 5. 大盤觀點 */}
        <Section title="本週大盤觀點">
          {data?.latest_market_view ? (
            <MarketViewCard view={data.latest_market_view} primary={a.primary} />
          ) : (
            <CenteredHint>大盤觀點整理中,刷新後即可見。</CenteredHint>
          )}
        </Section>

        {/* 6. 今日推薦 */}
        <Section title="今日重點推薦">
          {data?.daily_picks && data.daily_picks.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {data.daily_picks.map((p, i) => (
                <DailyPickCard key={i} pick={p} primary={a.primary} />
              ))}
            </div>
          ) : (
            <CenteredHint>今日推薦整理中⋯⋯</CenteredHint>
          )}
        </Section>

        {/* 7. 歷史會議發言 */}
        <Section title={`歷史會議出席(${data?.meetings_attended?.length ?? 0} 場)`}>
          {data?.meetings_attended && data.meetings_attended.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {data.meetings_attended.map((m) => (
                <div
                  key={m.meeting_id}
                  style={{
                    padding: "10px 14px",
                    background: "rgba(255,255,255,0.5)",
                    border: "1px solid rgba(93,74,62,0.1)",
                    borderRadius: 6,
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    gap: 10,
                    alignItems: "center",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <strong>{m.meeting_type}</strong>{" "}
                    <span style={{ color: "#888", marginLeft: 8 }}>{m.meeting_id}</span>
                  </div>
                  <span style={{ color: "#888", fontFamily: "var(--font-mono)" }}>
                    {m.started_at?.slice(0, 19).replace("T", " ")}
                  </span>
                  <span style={{ color: a.primary, fontWeight: 500 }}>
                    建立 {m.predictions_count} 筆預測
                  </span>
                </div>
              ))}
              <a
                href="https://quack-office.zeabur.app/meetings"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: a.primary, fontSize: 12, marginTop: 6 }}
              >
                看完整會議記錄(辦公室)→
              </a>
            </div>
          ) : (
            <CenteredHint>會議記錄整理中⋯⋯</CenteredHint>
          )}
        </Section>

        {/* 8. 學習筆記 */}
        <Section title="失敗檢討與修正">
          {data?.learning_notes && data.learning_notes.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {data.learning_notes.slice(0, 10).map((n) => (
                <div key={n.note_id} style={{ padding: 12, background: "rgba(255,255,255,0.5)", borderRadius: 6, fontSize: 12 }}>
                  <span style={{ color: "#888" }}>{n.date?.slice(0, 10)}</span> · {n.lesson}
                </div>
              ))}
            </div>
          ) : (
            <CenteredHint>
              {a.name} 失敗才寫筆記。樣本累積到 6 個月歷史回溯(008d)後可見。
            </CenteredHint>
          )}
        </Section>

        {/* 9. 底部 */}
        <section
          style={{
            marginTop: 48,
            padding: 24,
            background: "rgba(255,255,255,0.4)",
            borderRadius: 8,
            border: "1px dashed rgba(93, 74, 62, 0.2)",
            textAlign: "center",
          }}
        >
          <h3 style={{ fontFamily: "var(--font-serif, serif)", fontSize: 17, fontWeight: 500, margin: 0, marginBottom: 6 }}>
            願意把錢交給 {a.name} 嗎?
          </h3>
          <p style={{ fontSize: 13, color: "#5d4a3e", margin: "8px 0 16px" }}>
            訂閱功能還在準備。先看完一兩場會議,確認這位分析師的風格適合你。
          </p>
          <Link href="/analysts" style={{ display: "inline-block", padding: "8px 16px", border: "1px solid #5d4a3e", color: "#5d4a3e", textDecoration: "none", borderRadius: 6, fontSize: 13 }}>
            ← 回團隊總覽
          </Link>
        </section>
      </main>
    </div>
  );
}

// ======================== 小元件 ========================

function MarketViewCard({ view, primary }: { view: MarketView; primary: string }) {
  return (
    <div
      style={{
        padding: 18,
        background: "rgba(255,255,255,0.6)",
        borderLeft: `3px solid ${primary}`,
        borderRadius: 8,
        fontSize: 14,
        color: "#5d4a3e",
        lineHeight: 1.7,
      }}
    >
      <div style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 11, color: "#888", alignItems: "center" }}>
        <span style={{ padding: "2px 8px", background: biasBg(view.bias), borderRadius: 3, fontWeight: 500 }}>
          {biasText(view.bias)}
        </span>
        <span>信心 {view.confidence}</span>
        <span>· {view.view_date}</span>
      </div>
      <div style={{ fontFamily: "var(--font-serif, serif)", fontSize: 15 }}>
        「{view.market_view}」
      </div>
      {view.key_focus?.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: "#5d4a3e" }}>
          <strong>盯這些:</strong>
          {view.key_focus.map((f, i) => (
            <span key={i} style={{ marginLeft: 8, padding: "2px 8px", background: "rgba(93,74,62,0.06)", borderRadius: 3 }}>
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DailyPickCard({ pick, primary }: { pick: DailyPick; primary: string }) {
  return (
    <div
      style={{
        padding: 14,
        background: "rgba(255,255,255,0.6)",
        borderRadius: 8,
        border: `1px solid ${primary}33`,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <strong style={{ fontSize: 16 }}>
          {pick.target_symbol} <span style={{ fontSize: 12, color: "#888" }}>{pick.target_name}</span>
        </strong>
        <StrengthBadge value={pick.strength} primary={primary} />
      </div>
      {(pick.entry_price_low != null && pick.entry_price_high != null) && (
        <div style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)", color: "#5d4a3e", marginBottom: 6 }}>
          進場區間 {pick.entry_price_low} ~ {pick.entry_price_high}
        </div>
      )}
      <p style={{ fontSize: 12, color: "#5d4a3e", margin: 0, lineHeight: 1.6 }}>{pick.reason}</p>
    </div>
  );
}

function StrengthBadge({ value, primary }: { value: number; primary: string }) {
  return (
    <span
      style={{
        padding: "2px 8px",
        background: primary,
        color: "#fff",
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      強度 {value}/10
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontFamily: "var(--font-serif, serif)",
          fontSize: 18,
          fontWeight: 500,
          margin: "0 0 12px",
          paddingBottom: 8,
          borderBottom: "1px solid rgba(93, 74, 62, 0.12)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function KeyStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.6)", borderRadius: 6, textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 16, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function IntroCard({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ padding: 16, background: "rgba(255,255,255,0.55)", borderRadius: 8 }}>
      <h3 style={{ fontFamily: "var(--font-serif, serif)", fontSize: 14, fontWeight: 500, margin: 0, marginBottom: 8, color: "#5d4a3e" }}>{title}</h3>
      <p style={{ fontSize: 13, lineHeight: 1.75, color: "#5d4a3e", margin: 0 }}>{body}</p>
    </div>
  );
}

function Placeholder({ title, note, hint }: { title: string; note: string; hint: string }) {
  return (
    <div style={{ padding: 16, background: "rgba(255,255,255,0.5)", borderRadius: 8, border: "1px dashed rgba(93, 74, 62, 0.18)" }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{title}</div>
      <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 22, fontWeight: 500, color: "#5d4a3e", marginBottom: 6 }}>{note}</div>
      <div style={{ fontSize: 11, color: "#888" }}>{hint}</div>
    </div>
  );
}

function CenteredHint({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 20,
        background: "rgba(255,255,255,0.5)",
        borderRadius: 8,
        border: "1px dashed rgba(93, 74, 62, 0.2)",
        textAlign: "center",
        color: "#888",
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "8px 10px", fontSize: 11, color: "#888", fontWeight: 500, textAlign: "left" }}>{children}</th>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td style={{ padding: "8px 10px", fontFamily: mono ? "var(--font-mono, monospace)" : undefined, fontSize: mono ? 12 : 13, color: "#5d4a3e" }}>{children}</td>
  );
}

function dirText(d: string): string {
  if (d === "bullish") return "看多";
  if (d === "bearish") return "看空";
  return "中性";
}

function dirColor(d: string): string {
  if (d === "bullish") return "#C84B3C";
  if (d === "bearish") return "#5D7A4F";
  return "#888";
}

function confBg(c: number): string {
  if (c >= 80) return "#fde6d4";
  if (c >= 65) return "#fcf2d9";
  return "#f0f0f0";
}

function biasText(b: string): string {
  if (b === "bullish") return "看多";
  if (b === "bearish") return "看空";
  return "中性";
}

function biasBg(b: string): string {
  if (b === "bullish") return "#fde6d4";
  if (b === "bearish") return "#dde7d6";
  return "#f0f0f0";
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
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
