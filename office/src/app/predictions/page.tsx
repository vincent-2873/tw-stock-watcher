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

const PAGE_SIZE = 50;

export default function PredictionsPage() {
  const [data, setData] = useState<{ count: number; hit_rate: number | null; evaluated_count?: number; predictions: Prediction[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [days, setDays] = useState<number>(120);
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;
    setPage(1);
    (async () => {
      try {
        const r = await fetch(`${API}/api/quack/predictions?days=${days}`, { cache: "no-store" });
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
  }, [days]);

  const filtered = (data?.predictions || []).filter((p) => {
    if (agentFilter !== "all" && p.agent_id !== agentFilter) return false;
    if (statusFilter !== "all" && (p.status || p.hit_or_miss) !== statusFilter) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const agentOptions = Array.from(new Set((data?.predictions || []).map((p) => p.agent_id).filter(Boolean))) as string[];
  const statusOptions = Array.from(new Set((data?.predictions || []).map((p) => p.status || p.hit_or_miss).filter(Boolean))) as string[];

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
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <StatCard label="期間總筆數" value={String(data.count ?? 0)} />
            <StatCard label="已結算" value={String(data.evaluated_count ?? 0)} />
            <StatCard label="總命中率" value={data.hit_rate != null ? `${data.hit_rate}%` : "—"} />
            <StatCard label="篩選後" value={`${filtered.length} 筆`} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center", fontSize: 12 }}>
            <label>
              區間:
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} style={selectStyle}>
                <option value={30}>近 30 天</option>
                <option value={60}>近 60 天</option>
                <option value={120}>近 120 天</option>
                <option value={180}>近 180 天</option>
              </select>
            </label>
            <label>
              分析師:
              <select value={agentFilter} onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }} style={selectStyle}>
                <option value="all">全部</option>
                {agentOptions.map((a) => (<option key={a} value={a}>{a}</option>))}
              </select>
            </label>
            <label>
              狀態:
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={selectStyle}>
                <option value="all">全部</option>
                {statusOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </label>
            <span style={{ marginLeft: "auto", color: "var(--muted-fg)" }}>
              第 {page}/{totalPages} 頁(每頁 {PAGE_SIZE})
            </span>
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={btnStyle}>上一頁</button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={btnStyle}>下一頁</button>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 24, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 16, margin: 0 }}>沒有符合條件的預測</h3>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {pageRows.map((p, idx) => (
                <PredictionCard key={p.prediction_id || p.id || idx} p={p} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

const selectStyle: React.CSSProperties = {
  marginLeft: 6, padding: "4px 8px", fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 4,
};
const btnStyle: React.CSSProperties = {
  padding: "4px 10px", fontSize: 12, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer",
};

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
        {p.confidence != null && <>信心 {Math.round(p.confidence > 1 ? p.confidence : p.confidence * 100)}% · </>}
        時限 {p.deadline || p.evaluate_after}
      </p>
      {p.reasoning && <p style={{ margin: "6px 0" }}>依據:{p.reasoning}</p>}
      {p.prediction && !p.reasoning && <p style={{ margin: "6px 0" }}>{p.prediction}</p>}
    </article>
  );
}
