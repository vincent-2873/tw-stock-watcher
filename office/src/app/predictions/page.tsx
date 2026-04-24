"use client";

/**
 * /predictions — 預測追蹤 (辦公室)
 * 拉 /api/quack/predictions 看所有分析師的預測與命中率
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

type Prediction = {
  id?: number;
  prediction_id?: string;
  agent_id?: string;
  agent_name?: string;
  target_symbol?: string;
  target_name?: string;
  direction?: string;
  target_price?: number;
  current_price_at_prediction?: number;
  deadline?: string;
  confidence?: number;
  reasoning?: string;
  success_criteria?: string;
  status?: string;
  hit_or_miss?: string;
  created_at?: string;
  // 舊 schema 相容欄位
  subject?: string;
  prediction?: string;
  prediction_type?: string;
  timeframe?: string;
  evaluate_after?: string;
  evidence?: Record<string, unknown> | null;
};

export default function PredictionsPage() {
  const [data, setData] = useState<{ count: number; hit_rate: number | null; predictions: Prediction[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/api/quack/predictions?days=30`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancelled) setData(j);
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
        📈 預測追蹤
      </h1>
      <p style={{ color: "var(--muted-fg)", fontSize: 13, marginBottom: 24 }}>
        所有分析師的近 30 天預測與命中率。透明度 = 呱呱招待所的商業價值核心。
      </p>

      {err && <p style={{ color: "var(--accent-red)", fontSize: 13 }}>連線失敗:{err}</p>}

      {data && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <StatCard label="總預測數" value={String(data.count ?? 0)} />
            <StatCard label="總命中率" value={data.hit_rate != null ? `${data.hit_rate}%` : "—"} />
            <StatCard label="資料範圍" value="近 30 天" />
          </div>

          {data.predictions.length === 0 ? (
            <div
              style={{
                padding: 24,
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 6,
              }}
            >
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 16, margin: 0 }}>
                尚無預測紀錄
              </h3>
              <p style={{ fontSize: 13, color: "var(--muted-fg)", marginTop: 8 }}>
                預測系統 schema 已就緒 (migration 0006),但還沒有首場會議產生預測。
              </p>
              <p style={{ fontSize: 12, color: "var(--muted-fg)", marginTop: 8 }}>
                下一步:
                <br />
                1. 會議系統 cron 實作 (憲法 Section 7)
                <br />
                2. 分析師 A-E (阿武/阿慧/阿跡/阿數/阿和) 首場正式預測
                <br />
                3. 每日 14:30 結算器比對實際收盤
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {data.predictions.map((p, idx) => (
                <PredictionCard key={p.prediction_id || p.id || idx} p={p} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: 14,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 4,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--muted-fg)" }}>{label}</div>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 24, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function PredictionCard({ p }: { p: Prediction }) {
  const status = p.status || p.hit_or_miss || "active";
  const color =
    status === "hit"
      ? "var(--accent-green)"
      : status === "missed" || status === "miss"
        ? "var(--accent-red)"
        : "var(--accent-gold)";
  return (
    <article
      style={{
        padding: 14,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${color}`,
        borderRadius: 4,
        fontSize: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <strong>
          {p.agent_name || p.agent_id || "呱呱"} · {p.target_symbol || p.subject}
          {p.target_name && ` ${p.target_name}`}
        </strong>
        <span style={{ color, fontFamily: "var(--font-mono)" }}>{status.toUpperCase()}</span>
      </div>
      <p style={{ margin: "6px 0", color: "var(--muted-fg)" }}>
        {p.direction && <>方向 {p.direction} · </>}
        {p.target_price && <>目標 {p.target_price} · </>}
        {p.current_price_at_prediction && <>起始 {p.current_price_at_prediction} · </>}
        {p.confidence != null && <>信心 {Math.round((p.confidence as number) * 100)}% · </>}
        時限 {p.deadline || p.evaluate_after}
      </p>
      {p.reasoning && <p style={{ margin: "6px 0" }}>依據:{p.reasoning}</p>}
      {p.prediction && !p.reasoning && <p style={{ margin: "6px 0" }}>{p.prediction}</p>}
    </article>
  );
}
