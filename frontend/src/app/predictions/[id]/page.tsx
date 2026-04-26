"use client";

/**
 * 前台 /predictions/[id] — 預測詳情頁(NEXT_TASK_009 階段 3.1)
 *
 * 顯示:
 *  - 預測 ID + 建立時間 + 結算時間
 *  - 該 agent(用 AnalystAvatar)
 *  - 標的 + 名稱 + 方向 + 目標價 + 時限
 *  - 信心度 + reasoning + success_criteria
 *  - 結算狀態(hit / missed / active)
 *  - 若已結算:actual_price + learning_note
 *  - 連結到 agent 個人頁、會議
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnalystAvatar, type AnalystSlug } from "@/components/AnalystAvatar";
import { Badge, Card, EmptyState, ErrorState, LoadingSpinner } from "@/components/ui";
import { color, fontSize, spacing } from "@/styles/tokens";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

const AGENT_TO_SLUG: Record<string, AnalystSlug> = {
  analyst_a: "chenxu",
  analyst_b: "jingyuan",
  analyst_c: "guanqi",
  analyst_d: "shouzhuo",
  analyst_e: "mingchuan",
};

type Prediction = {
  id: number;
  agent_id?: string;
  date?: string;
  created_at?: string;
  target_symbol?: string;
  target_name?: string;
  direction?: string;
  target_price?: number;
  current_price_at_prediction?: number;
  confidence?: number;
  reasoning?: string;
  success_criteria?: string;
  deadline?: string;
  status?: string;
  settled_at?: string;
  settled_result?: string;
  actual_price_at_deadline?: number;
  learning_note?: string;
  meeting_id?: string;
  evidence?: { architecture_version?: string; trait_label?: string; [key: string]: unknown };
  _quality_annotation?: {
    label: string;
    detail: string;
    level: "warn" | "error";
  };
};

type LearningNote = {
  note_id: number;
  date: string;
  context?: string;
  mistake?: string;
  lesson?: string;
  correction_plan?: string;
};

type Meeting = {
  meeting_id: string;
  meeting_type: string;
  scheduled_at: string;
  chair_agent_id: string;
};

type ApiResponse = {
  prediction: Prediction;
  learning_notes: LearningNote[];
  meeting: Meeting | null;
};

const directionLabel = (d?: string) => {
  if (!d) return "—";
  if (d === "bullish" || d === "long" || d === "up") return "看多 ↑";
  if (d === "bearish" || d === "short" || d === "down") return "看空 ↓";
  return d;
};

const directionTone = (d?: string): "success" | "danger" | "default" => {
  if (!d) return "default";
  if (["bullish", "long", "up"].includes(d)) return "success";
  if (["bearish", "short", "down"].includes(d)) return "danger";
  return "default";
};

const statusToTone = (s?: string): "success" | "danger" | "info" | "default" => {
  if (s === "hit") return "success";
  if (s === "missed") return "danger";
  if (s === "active") return "info";
  return "default";
};

const statusLabel = (s?: string): string => {
  if (s === "hit") return "命中";
  if (s === "missed") return "未中";
  if (s === "active") return "觀察中";
  if (s === "cancelled") return "已取消";
  return s ?? "—";
};

export default function PredictionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API}/api/predictions/${id}`);
        if (!r.ok) {
          if (cancelled) return;
          if (r.status === 404) setError("找不到這筆預測");
          else setError(`API 錯誤 ${r.status}`);
          setLoading(false);
          return;
        }
        const j: ApiResponse = await r.json();
        if (!cancelled) {
          setData(j);
          setError(null);
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
      <main style={{ maxWidth: 860, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px`, textAlign: "center" }}>
        <LoadingSpinner size={48} label="載入預測中…" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main style={{ maxWidth: 860, margin: "0 auto", padding: `${spacing["2xl"]}px ${spacing.lg}px` }}>
        <ErrorState title="預測載入失敗" message={error || "未知錯誤"} />
        <div style={{ marginTop: spacing.lg, textAlign: "center" }}>
          <Link href="/analysts" style={{ color: color.accent, textDecoration: "underline" }}>
            ← 回分析師團隊
          </Link>
        </div>
      </main>
    );
  }

  const p = data.prediction;
  const slug = p.agent_id ? AGENT_TO_SLUG[p.agent_id] : undefined;
  const archVersion = p.evidence?.architecture_version;

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: `${spacing.xl}px ${spacing.lg}px` }}>
      {/* 麵包屑 */}
      <div style={{ fontSize: fontSize.caption.size, color: color.secondaryText, marginBottom: spacing.md }}>
        <Link href="/" style={{ color: "inherit" }}>
          首頁
        </Link>
        <span style={{ margin: "0 6px" }}>›</span>
        <Link href="/analysts" style={{ color: "inherit" }}>
          分析師團隊
        </Link>
        <span style={{ margin: "0 6px" }}>›</span>
        <span>預測 #{p.id}</span>
      </div>

      {/* T3a Defense 4: 升級前 / sanity 拒絕資料的標註(詳情頁仍可訪問) */}
      {p._quality_annotation && (
        <Card
          padded
          style={{
            marginBottom: spacing.md,
            borderLeft: `4px solid ${
              p._quality_annotation.level === "error" ? color.danger : color.warning ?? "#c79b3a"
            }`,
            background: p._quality_annotation.level === "error" ? "rgba(199,80,80,0.06)" : "rgba(199,155,58,0.06)",
          }}
        >
          <div style={{ fontSize: fontSize.caption.size, fontWeight: 600, color: color.primaryText, marginBottom: 4 }}>
            ⚠️ {p._quality_annotation.label}
          </div>
          <div style={{ fontSize: fontSize.micro.size, color: color.secondaryText, lineHeight: 1.5 }}>
            {p._quality_annotation.detail}
          </div>
        </Card>
      )}

      {/* Hero */}
      <Card padded style={{ marginBottom: spacing.lg }}>
        <div style={{ display: "flex", gap: spacing.lg, alignItems: "flex-start", flexWrap: "wrap" }}>
          {slug && (
            <Link href={`/analysts/${slug}`} style={{ textDecoration: "none" }}>
              <AnalystAvatar slug={slug} size="md" status="resting" />
            </Link>
          )}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: spacing.sm, flexWrap: "wrap" }}>
              <Badge tone={statusToTone(p.status)}>{statusLabel(p.status)}</Badge>
              <Badge tone={directionTone(p.direction)}>{directionLabel(p.direction)}</Badge>
              {archVersion && <Badge tone="default">{archVersion.toUpperCase()}</Badge>}
              {p.evidence?.trait_label && (
                <Badge tone="accent">{String(p.evidence.trait_label)}</Badge>
              )}
            </div>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: fontSize.h1.size,
                margin: 0,
                marginBottom: spacing.xs,
                lineHeight: 1.2,
              }}
            >
              {p.target_symbol} {p.target_name}
            </h1>
            <div style={{ color: color.secondaryText, fontSize: fontSize.caption.size }}>
              預測 #{p.id} · 建立 {p.date ?? p.created_at?.slice(0, 10) ?? "—"}
              {p.deadline && ` · 結算 ${p.deadline.slice(0, 10)}`}
            </div>
          </div>
        </div>
      </Card>

      {/* 預測 + 結算 grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <Card>
          <div style={{ fontSize: fontSize.micro.size, color: color.secondaryText, marginBottom: 4 }}>當下價格</div>
          <div style={{ fontSize: fontSize.h2.size, fontFamily: "var(--font-mono)" }}>
            {p.current_price_at_prediction != null ? `$${p.current_price_at_prediction}` : "—"}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: fontSize.micro.size, color: color.secondaryText, marginBottom: 4 }}>目標價</div>
          <div style={{ fontSize: fontSize.h2.size, fontFamily: "var(--font-mono)", color: color.accent }}>
            {p.target_price != null ? `$${p.target_price}` : "—"}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: fontSize.micro.size, color: color.secondaryText, marginBottom: 4 }}>信心度</div>
          <div style={{ fontSize: fontSize.h2.size, fontFamily: "var(--font-mono)" }}>
            {p.confidence != null ? `${Math.round(p.confidence * 100)}%` : "—"}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: fontSize.micro.size, color: color.secondaryText, marginBottom: 4 }}>
            {p.status === "active" ? "預期結算" : "實際結算"}
          </div>
          <div
            style={{
              fontSize: fontSize.h2.size,
              fontFamily: "var(--font-mono)",
              color: p.status === "hit" ? color.success : p.status === "missed" ? color.danger : undefined,
            }}
          >
            {p.actual_price_at_deadline != null ? `$${p.actual_price_at_deadline}` : "—"}
          </div>
        </Card>
      </div>

      {/* Reasoning */}
      {p.reasoning && (
        <Card padded style={{ marginBottom: spacing.md }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0, marginBottom: spacing.sm }}>
            🧠 進場理由
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: fontSize.body.size,
              lineHeight: 1.8,
              color: color.primaryText,
              whiteSpace: "pre-wrap",
            }}
          >
            {p.reasoning}
          </p>
        </Card>
      )}

      {/* Success criteria */}
      {p.success_criteria && (
        <Card padded style={{ marginBottom: spacing.md }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0, marginBottom: spacing.sm }}>
            🎯 命中標準
          </h3>
          <p style={{ margin: 0, fontSize: fontSize.caption.size, color: color.secondaryText, lineHeight: 1.7 }}>
            {p.success_criteria}
          </p>
        </Card>
      )}

      {/* 學習筆記(若 settled 後有) */}
      {data.learning_notes && data.learning_notes.length > 0 && (
        <Card padded style={{ marginBottom: spacing.md, borderLeft: `3px solid ${color.warning}` }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0, marginBottom: spacing.sm }}>
            📓 結算後的學習筆記
          </h3>
          {data.learning_notes.map((n) => (
            <div key={n.note_id} style={{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTop: `1px dashed ${color.borderSubtle}` }}>
              <div style={{ fontSize: fontSize.micro.size, color: color.secondaryText, marginBottom: 4 }}>
                {n.date?.slice(0, 10)}
              </div>
              {n.mistake && (
                <p style={{ margin: 0, marginBottom: 6, fontSize: fontSize.caption.size }}>
                  <strong style={{ color: color.danger }}>失誤:</strong> {n.mistake}
                </p>
              )}
              {n.lesson && (
                <p style={{ margin: 0, marginBottom: 6, fontSize: fontSize.caption.size }}>
                  <strong style={{ color: color.warning }}>教訓:</strong> {n.lesson}
                </p>
              )}
              {n.correction_plan && (
                <p style={{ margin: 0, fontSize: fontSize.caption.size, color: color.success }}>
                  <strong>修正:</strong> {n.correction_plan}
                </p>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* 來自的會議 */}
      {data.meeting && (
        <Card padded style={{ marginBottom: spacing.md }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0, marginBottom: spacing.sm }}>
            🏛️ 來自的會議
          </h3>
          <Link
            href={`/meetings/${data.meeting.meeting_id}`}
            style={{ color: color.accent, textDecoration: "underline", fontSize: fontSize.body.size }}
          >
            {data.meeting.meeting_type} · {data.meeting.scheduled_at?.slice(0, 16).replace("T", " ")}
          </Link>
        </Card>
      )}

      {!p.reasoning && !p.success_criteria && !data.meeting && (
        <EmptyState
          title="這筆預測沒有附加資料"
          description="可能是早期版本資料,或還沒結算。"
        />
      )}

      <div style={{ marginTop: spacing.xl, textAlign: "center" }}>
        {slug && (
          <Link href={`/analysts/${slug}`} style={{ color: color.accent, textDecoration: "underline" }}>
            ← 回該分析師個人頁
          </Link>
        )}
      </div>
    </main>
  );
}
