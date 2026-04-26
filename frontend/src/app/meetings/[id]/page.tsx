"use client";

/**
 * 前台 /meetings/[id] — 會議詳情頁(NEXT_TASK_009 階段 3.2)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Card, EmptyState, ErrorState, LoadingSpinner } from "@/components/ui";
import { color, fontSize, spacing } from "@/styles/tokens";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

type Meeting = {
  meeting_id: string;
  meeting_type: string;
  scheduled_at: string;
  started_at?: string;
  ended_at?: string;
  chair_agent_id: string;
  attendees?: string[];
  content_markdown?: string;
  predictions_created?: number[];
  predictions_settled?: number[];
};

const TYPE_LABEL: Record<string, string> = {
  pre_market: "盤前會議",
  mid_day: "午盤檢查",
  post_market: "盤後成績單",
  weekly: "週檢討",
  monthly: "月檢討",
  event: "事件觸發",
  prediction_meeting: "預測會議",
  holdings_meeting: "持倉會議",
};

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/meetings/${id}`);
        if (!r.ok) {
          if (!cancelled) {
            setError(r.status === 404 ? "找不到這場會議" : `API 錯誤 ${r.status}`);
            setLoading(false);
          }
          return;
        }
        const j: Meeting = await r.json();
        if (!cancelled) {
          setMeeting(j);
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
  }, [id]);

  if (loading) {
    return (
      <main style={{ maxWidth: 920, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px`, textAlign: "center" }}>
        <LoadingSpinner size={48} label="載入會議中…" />
      </main>
    );
  }

  if (error || !meeting) {
    return (
      <main style={{ maxWidth: 920, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px` }}>
        <ErrorState title="會議載入失敗" message={error || "未知錯誤"} />
        <div style={{ marginTop: spacing.lg, textAlign: "center" }}>
          <Link href="/meetings" style={{ color: color.accent, textDecoration: "underline" }}>
            ← 回會議列表
          </Link>
        </div>
      </main>
    );
  }

  const type = TYPE_LABEL[meeting.meeting_type] ?? meeting.meeting_type;
  const dt = meeting.scheduled_at?.slice(0, 16).replace("T", " ");

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: `${spacing.xl}px ${spacing.lg}px` }}>
      {/* 麵包屑 */}
      <div style={{ fontSize: fontSize.caption.size, color: color.secondaryText, marginBottom: spacing.md }}>
        <Link href="/" style={{ color: "inherit" }}>
          首頁
        </Link>
        <span style={{ margin: "0 6px" }}>›</span>
        <Link href="/meetings" style={{ color: "inherit" }}>
          會議記錄
        </Link>
        <span style={{ margin: "0 6px" }}>›</span>
        <span>{type}</span>
      </div>

      {/* Hero */}
      <Card padded style={{ marginBottom: spacing.lg }}>
        <div style={{ display: "flex", gap: 8, marginBottom: spacing.sm, flexWrap: "wrap" }}>
          <Badge tone="accent">{type}</Badge>
          <span style={{ fontSize: fontSize.caption.size, color: color.secondaryText }}>{dt}</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0, marginBottom: spacing.xs }}>
          {type} · {dt}
        </h1>
        <div style={{ color: color.secondaryText, fontSize: fontSize.caption.size }}>
          主席 <strong style={{ color: color.primaryText }}>{meeting.chair_agent_id}</strong>
          {Array.isArray(meeting.attendees) && meeting.attendees.length > 0 && (
            <> · 出席 {meeting.attendees.length} 位</>
          )}
        </div>
      </Card>

      {/* Markdown 全文 */}
      {meeting.content_markdown ? (
        <Card padded style={{ marginBottom: spacing.lg }}>
          <pre
            style={{
              margin: 0,
              fontFamily: "var(--font-serif)",
              fontSize: fontSize.body.size,
              lineHeight: 1.85,
              color: color.primaryText,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {meeting.content_markdown}
          </pre>
        </Card>
      ) : (
        <EmptyState
          title="這場會議尚無詳細記錄"
          description="戰情室會議系統正式運作後,每場會議的完整討論會以法人說明會風格呈現在這裡。"
        />
      )}

      {/* 產出的預測 */}
      {Array.isArray(meeting.predictions_created) && meeting.predictions_created.length > 0 && (
        <Card padded style={{ marginBottom: spacing.lg }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0, marginBottom: spacing.sm }}>
            📈 此會議產出的預測({meeting.predictions_created.length} 筆)
          </h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {meeting.predictions_created.map((pid) => (
              <Link
                key={String(pid)}
                href={`/predictions/${pid}`}
                style={{
                  display: "inline-block",
                  padding: "5px 11px",
                  fontSize: fontSize.caption.size,
                  border: `1px solid ${color.borderSubtle}`,
                  borderRadius: 4,
                  color: color.primaryText,
                  textDecoration: "none",
                  background: color.bgRaised,
                }}
              >
                #{pid}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div style={{ marginTop: spacing.xl, textAlign: "center" }}>
        <Link href="/meetings" style={{ color: color.accent, textDecoration: "underline" }}>
          ← 回會議列表
        </Link>
      </div>
    </main>
  );
}
