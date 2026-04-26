"use client";

/**
 * 前台 /meetings — 會議列表(NEXT_TASK_009 階段 3.2)
 *
 * 從 /api/meetings 抓所有會議,卡片式排版:
 *  - 日期 / 會議類型 / 主席 / 出席分析師頭像
 *  - 可篩選會議類型
 *  - 點擊跳 /meetings/[id] 詳情
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  predictions_created?: string[] | number[];
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

const meetingTypeLabel = (t: string) => TYPE_LABEL[t] ?? t;

const meetingTypeTone = (t: string): "default" | "info" | "warning" | "accent" => {
  if (t.includes("pre")) return "info";
  if (t.includes("post")) return "warning";
  if (t.includes("weekly") || t.includes("monthly")) return "accent";
  return "default";
};

export default function MeetingsListPage() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${API}/api/meetings?limit=100`);
        if (!r.ok) {
          if (!cancelled) setError(`API 錯誤 ${r.status}`);
          if (!cancelled) setLoading(false);
          return;
        }
        const j = await r.json();
        if (!cancelled) {
          setMeetings(j.meetings || []);
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

  const types = useMemo(() => {
    const set = new Set<string>();
    (meetings ?? []).forEach((m) => set.add(m.meeting_type));
    return ["all", ...Array.from(set).sort()];
  }, [meetings]);

  const filtered = useMemo(() => {
    if (!meetings) return [];
    if (filterType === "all") return meetings;
    return meetings.filter((m) => m.meeting_type === filterType);
  }, [meetings, filterType]);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: `${spacing.xl}px ${spacing.lg}px` }}>
      <header style={{ marginBottom: spacing.lg }}>
        <div style={{ fontSize: fontSize.caption.size, color: color.secondaryText, marginBottom: spacing.xs }}>
          <Link href="/" style={{ color: "inherit" }}>
            首頁
          </Link>
          <span style={{ margin: "0 6px" }}>›</span>
          <span>會議記錄</span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: fontSize.h1.size,
            margin: 0,
            marginBottom: spacing.xs,
          }}
        >
          🏛️ 會議記錄
        </h1>
        <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, margin: 0 }}>
          盤前 / 午盤 / 盤後 / 週 / 月會議 — 招待所每場討論的完整記錄。
        </p>
      </header>

      {/* 篩選 */}
      {types.length > 2 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: spacing.md }}>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              style={{
                padding: "5px 12px",
                fontSize: fontSize.caption.size,
                border: `1px solid ${filterType === t ? color.accent : color.borderSubtle}`,
                background: filterType === t ? color.accent : "transparent",
                color: filterType === t ? "#fff" : color.primaryText,
                borderRadius: 4,
                cursor: "pointer",
                transition: "all 200ms ease",
              }}
            >
              {t === "all" ? "全部" : meetingTypeLabel(t)}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: spacing.xl }}>
          <LoadingSpinner size={40} label="載入會議中…" />
        </div>
      )}

      {error && <ErrorState title="會議列表載入失敗" message={error} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          title="尚無會議記錄"
          description="戰情室會議系統運作後,每場討論都會留檔在這裡。"
        />
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gap: spacing.md }}>
          {filtered.map((m) => {
            const dt = m.scheduled_at?.slice(0, 16).replace("T", " ");
            const attendeeCount = Array.isArray(m.attendees) ? m.attendees.length : 0;
            const predCount = Array.isArray(m.predictions_created) ? m.predictions_created.length : 0;
            return (
              <Link key={m.meeting_id} href={`/meetings/${m.meeting_id}`} style={{ textDecoration: "none" }}>
                <Card hoverable>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.md, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <Badge tone={meetingTypeTone(m.meeting_type)}>{meetingTypeLabel(m.meeting_type)}</Badge>
                        <span style={{ fontSize: fontSize.caption.size, color: color.secondaryText }}>{dt}</span>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: fontSize.h3.size,
                          color: color.primaryText,
                        }}
                      >
                        主席:{m.chair_agent_id}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: fontSize.micro.size, color: color.secondaryText }}>
                      <div>出席 {attendeeCount} 位</div>
                      <div>產出 {predCount} 筆預測</div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
