"use client";

/**
 * /meetings — 會議記錄 (辦公室)
 * 從 Supabase meetings 表拉最近 30 場會議
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

type Meeting = {
  meeting_id: string;
  meeting_type: string;
  scheduled_at: string;
  started_at: string | null;
  ended_at: string | null;
  chair_agent_id: string;
  attendees: string[] | null;
  content_markdown: string;
  predictions_created: string[] | null;
  predictions_settled: string[] | null;
  created_at: string;
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/api/meetings?limit=30`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancelled) setMeetings(j.meetings || []);
      } catch (e) {
        if (!cancelled) setErr(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ color: "var(--muted-fg)", fontSize: 13 }}>
          ← 回辦公室首頁
        </Link>
      </div>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 500 }}>
        📋 會議記錄
      </h1>
      <p style={{ color: "var(--muted-fg)", fontSize: 13, marginBottom: 24 }}>
        呱呱投資招待所研究部所有會議記錄。依憲法 Section 7 排程:
        07:30 / 08:00 / 12:00 / 14:00 + 週/月 + 事件觸發。
      </p>

      {err && (
        <p style={{ color: "var(--accent-red)", fontSize: 13 }}>
          連線失敗:<code>{err}</code>
        </p>
      )}

      {meetings === null && !err && (
        <p style={{ color: "var(--muted-fg)", fontStyle: "italic" }}>載入會議記錄 ⋯</p>
      )}

      {meetings && meetings.length === 0 && (
        <div
          style={{
            padding: 24,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 6,
          }}
        >
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 16, margin: 0 }}>
            尚無會議紀錄
          </h3>
          <p style={{ fontSize: 13, color: "var(--muted-fg)", marginTop: 8 }}>
            會議系統 (憲法 Section 7) 尚未實作 cron。首場會議產生後,此處會自動顯示。
          </p>
          <ul style={{ fontSize: 12, color: "var(--muted-fg)", lineHeight: 1.8 }}>
            <li>07:30 資訊部門內部會議</li>
            <li>08:00 投資部門盤前會議</li>
            <li>12:00 午盤快速檢查</li>
            <li>14:00 盤後成績單會議</li>
            <li>週五 14:30 週檢討</li>
            <li>月底月檢討</li>
          </ul>
        </div>
      )}

      {meetings && meetings.length > 0 && (
        <div style={{ display: "grid", gap: 14 }}>
          {meetings.map((m) => (
            <article
              key={m.meeting_id}
              style={{
                padding: 18,
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 6,
              }}
            >
              <header style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 15, margin: 0 }}>
                    {formatMeetingType(m.meeting_type)}
                  </h3>
                  <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: "2px 0 0" }}>
                    {new Date(m.scheduled_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
                    {m.chair_agent_id && <> · 主席 {m.chair_agent_id}</>}
                  </p>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-fg)", textAlign: "right" }}>
                  預測 {m.predictions_created?.length ?? 0} / 結算 {m.predictions_settled?.length ?? 0}
                </div>
              </header>
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--muted-fg)" }}>
                  展開會議全文
                </summary>
                <pre
                  style={{
                    marginTop: 10,
                    padding: 14,
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    whiteSpace: "pre-wrap",
                    fontSize: 12,
                    fontFamily: "var(--font-serif)",
                    lineHeight: 1.7,
                  }}
                >
                  {m.content_markdown}
                </pre>
              </details>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function formatMeetingType(t: string): string {
  const map: Record<string, string> = {
    pre_market: "🌅 盤前會議",
    mid_day: "🕛 午盤快速檢查",
    post_market: "🌆 盤後成績單",
    weekly: "📅 週檢討",
    monthly: "📊 月檢討",
    saturday_summary: "📝 週六大事摘要",
    sunday_preview: "🔮 週日展望",
    event_triggered: "🚨 事件觸發會議",
    information: "📡 資訊部門內部會議",
  };
  return map[t] || t;
}
