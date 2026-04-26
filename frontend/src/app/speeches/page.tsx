"use client";

/**
 * 前台 /speeches — 關鍵發言完整列表(NEXT_TASK_009 階段 5.3)
 *
 * 從 /api/intel/people/statements?min_urgency=5 抓影響度高的發言。
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, EmptyState, ErrorState, LoadingSpinner } from "@/components/ui";
import { color, fontSize, spacing } from "@/styles/tokens";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

type Statement = {
  id?: number | string;
  person_id?: number;
  person?: { name?: string; name_zh?: string; role?: string; affected_stocks?: string[] };
  said_at?: string;
  source_title?: string;
  source_url?: string;
  content?: string;
  ai_summary?: string;
  ai_sentiment?: string;
  ai_urgency?: number;
  affected_stocks?: string[];
};

const sentimentTone = (s?: string): "success" | "danger" | "default" => {
  if (s === "bullish" || s === "positive" || s === "利多") return "success";
  if (s === "bearish" || s === "negative" || s === "利空") return "danger";
  return "default";
};

const sentimentLabel = (s?: string): string => {
  if (s === "bullish" || s === "positive") return "利多";
  if (s === "bearish" || s === "negative") return "利空";
  return s ?? "中性";
};

export default function SpeechesPage() {
  const [items, setItems] = useState<Statement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [minUrgency, setMinUrgency] = useState<number>(5);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `${API}/api/intel/people/statements?limit=50&min_urgency=${minUrgency}`,
        );
        if (!r.ok) {
          if (!cancelled) {
            setError(`API 錯誤 ${r.status}`);
            setLoading(false);
          }
          return;
        }
        const j = await r.json();
        if (!cancelled) {
          setItems(j.statements || []);
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
  }, [minUrgency]);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: `${spacing.xl}px ${spacing.lg}px` }}>
      <header style={{ marginBottom: spacing.lg }}>
        <div style={{ fontSize: fontSize.caption.size, color: color.secondaryText, marginBottom: spacing.xs }}>
          <Link href="/" style={{ color: "inherit" }}>
            首頁
          </Link>
          <span style={{ margin: "0 6px" }}>›</span>
          <span>關鍵發言</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h1.size, margin: 0, marginBottom: spacing.xs }}>
          🎤 關鍵發言完整列表
        </h1>
        <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, margin: 0 }}>
          央行總裁 / 企業 CEO / 重要分析師 — AI 標註對台股影響度
        </p>
      </header>

      {/* 篩選影響度 */}
      <div style={{ display: "flex", gap: 6, marginBottom: spacing.md, flexWrap: "wrap" }}>
        {[3, 5, 7].map((u) => (
          <button
            key={u}
            onClick={() => setMinUrgency(u)}
            style={{
              padding: "5px 12px",
              fontSize: fontSize.caption.size,
              border: `1px solid ${minUrgency === u ? color.accent : color.borderSubtle}`,
              background: minUrgency === u ? color.accent : "transparent",
              color: minUrgency === u ? "#fff" : color.primaryText,
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            影響度 ≥ {u}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: spacing.xl }}>
          <LoadingSpinner size={40} label="載入發言中…" />
        </div>
      )}

      {error && <ErrorState title="發言載入失敗" message={error} />}

      {!loading && !error && (!items || items.length === 0) && (
        <EmptyState
          title="目前沒有達標的關鍵發言"
          description={`沒有影響度 ≥ ${minUrgency} 的發言。試試降低門檻。`}
        />
      )}

      {items && items.length > 0 && (
        <div style={{ display: "grid", gap: spacing.md }}>
          {items.map((s, i) => {
            const personName = s.person?.name_zh || s.person?.name || "—";
            const personRole = s.person?.role;
            const dt = s.said_at?.slice(0, 16).replace("T", " ");
            const stocks = s.affected_stocks || s.person?.affected_stocks || [];
            return (
              <Card key={s.id ?? i} padded>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                  <Badge tone={sentimentTone(s.ai_sentiment)}>{sentimentLabel(s.ai_sentiment)}</Badge>
                  {s.ai_urgency != null && <Badge tone="warning">影響度 {s.ai_urgency}</Badge>}
                  <span style={{ fontSize: fontSize.micro.size, color: color.secondaryText }}>{dt}</span>
                </div>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: fontSize.h3.size, margin: 0, marginBottom: 4 }}>
                  {personName}
                  {personRole && (
                    <span style={{ fontSize: fontSize.caption.size, color: color.secondaryText, fontWeight: 400, marginLeft: 8 }}>
                      · {personRole}
                    </span>
                  )}
                </h3>
                {s.content && (
                  <p style={{ margin: 0, fontSize: fontSize.body.size, lineHeight: 1.7, color: color.primaryText }}>
                    「{s.content}」
                  </p>
                )}
                {s.ai_summary && (
                  <p style={{ margin: 0, marginTop: 8, fontSize: fontSize.caption.size, color: color.secondaryText, fontStyle: "italic" }}>
                    對台股影響:{s.ai_summary}
                  </p>
                )}
                {stocks.length > 0 && (
                  <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                    {stocks.slice(0, 8).map((stock) => (
                      <Badge key={stock} tone="info" size="sm">
                        {stock}
                      </Badge>
                    ))}
                  </div>
                )}
                {s.source_url && (
                  <a
                    href={s.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      fontSize: fontSize.micro.size,
                      color: color.accent,
                      textDecoration: "underline",
                    }}
                  >
                    來源 · {s.source_title || "原文"} ↗
                  </a>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
