"use client";

/**
 * /agents — 分析師名冊與績效
 *
 * 依據 SYSTEM_CONSTITUTION Section 4 + Section 5:
 *   使用者訂閱的理由之一 = 所有分析師勝率公開。
 *   12 個 agent(所主 + 4 資訊 + 2 監督 + 5 投資) 對應 persona + stats。
 *
 * 日式禪風:和紙米色卡片、細邊框、無殘酷漸層。
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

type AgentStats = {
  total_predictions: number;
  hits: number;
  misses: number;
  cancelled: number;
  win_rate: number | null;
  best_symbol: string | null;
  best_symbol_win_rate: number | null;
  worst_symbol: string | null;
  last_30d_predictions: number;
  last_30d_win_rate: number | null;
  last_updated: string | null;
};

type Agent = {
  agent_id: string;
  display_name: string;
  role: string;
  emoji: string;
  department: string;
  school: string;
  personality: string;
  timeframe: string;
  risk: string;
  catchphrase: string;
  tracked: boolean;
  stats: AgentStats;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API}/api/agents`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancelled) setAgents(j.agents || []);
      } catch (e) {
        if (!cancelled) setErr(String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24 }}>分析師名冊</h1>
        <p style={{ color: "var(--muted-fg)", marginTop: 24 }}>
          呱呱招待所暫時聯絡不上 ⋯ <code style={{ fontSize: 11 }}>{err}</code>
        </p>
      </main>
    );
  }

  if (!agents) {
    return (
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24 }}>分析師名冊</h1>
        <p style={{ color: "var(--muted-fg)", marginTop: 24, fontStyle: "italic" }}>
          呱呱正在召集所有分析師 ⋯
        </p>
      </main>
    );
  }

  const owner = agents.filter((a) => a.agent_id === "guagua");
  const investment = agents.filter((a) => a.agent_id.startsWith("analyst_"));
  const information = agents.filter((a) =>
    ["owl_fundamentalist", "hedgehog_technical", "squirrel_chip", "meerkat_quant"].includes(a.agent_id),
  );
  const supervision = agents.filter((a) => ["fox_skeptic", "pangolin_risk"].includes(a.agent_id));

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/" style={{ color: "var(--muted-fg)", fontSize: 13 }}>
          ← 回主頁
        </Link>
      </div>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 28,
          fontWeight: 500,
          marginBottom: 4,
          color: "var(--fg)",
        }}
      >
        呱呱投資招待所 · 分析師名冊
      </h1>
      <p style={{ color: "var(--muted-fg)", fontSize: 13, marginBottom: 8 }}>
        12 位分析師,每位流派不同、風險偏好不同、「命中」標準自己定義。<br />
        投資部門 5 位被追蹤勝率 —— 這是本所的**透明承諾**。
      </p>
      <p style={{ color: "var(--muted-fg)", fontSize: 11, marginBottom: 32, fontStyle: "italic" }}>
        ※ 目前系統剛上線,勝率為空。首場會議產生預測後,勝率會開始累積並公開。
      </p>

      <Section title="🦆 所主" agents={owner} highlight />
      <Section title="👤 投資部門 · 決策整合層(被追蹤勝率)" agents={investment} highlight />
      <Section title="📡 資訊生產層 · 4 部門主管" agents={information} />
      <Section title="🦊 監督學習層" agents={supervision} />

      <section style={{ marginTop: 48, padding: 24, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }}>
        <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 16, marginBottom: 8 }}>
          為什麼「自己定義命中標準」?
        </h3>
        <p style={{ fontSize: 13, color: "var(--muted-fg)", lineHeight: 1.7 }}>
          阿武的「嚴格」— 收盤必須達目標價;阿跡的「寬鬆」— 達 80% 就算半命中;
          阿數的「數學」— 實際報酬率要達預測的 90%;阿和的「分段」— 把時限切三段各算 1/3。
          <br /><br />
          **系統不強制統一**。因為一致的標準會讓五位變得一模一樣。
          我們要的是**多樣性 + 透明度**:每位的標準公開、勝率公開,
          讓你自己選要跟誰。
        </p>
      </section>
    </main>
  );
}

function Section({ title, agents, highlight }: { title: string; agents: Agent[]; highlight?: boolean }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          fontWeight: 500,
          marginBottom: 14,
          color: "var(--fg)",
          borderLeft: highlight ? "3px solid var(--accent-gold, #B8893D)" : "2px solid var(--border)",
          paddingLeft: 10,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {agents.map((a) => (
          <AgentCard key={a.agent_id} agent={a} />
        ))}
      </div>
    </section>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const winRatePct =
    agent.stats.win_rate != null
      ? `${Math.round(agent.stats.win_rate * 100)}%`
      : agent.stats.total_predictions === 0
        ? "—"
        : "計算中";
  return (
    <article
      style={{
        padding: 18,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            fontSize: 32,
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: 6,
          }}
        >
          {agent.emoji}
        </div>
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 17,
              fontWeight: 500,
              margin: 0,
              color: "var(--fg)",
            }}
          >
            {agent.display_name}
          </h3>
          <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: "2px 0 0" }}>
            {agent.role}
          </p>
        </div>
      </header>

      <blockquote
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 13,
          color: "var(--fg)",
          fontStyle: "italic",
          margin: 0,
          padding: "8px 10px",
          borderLeft: "2px solid var(--border)",
        }}
      >
        「{agent.catchphrase}」
      </blockquote>

      <dl style={{ fontSize: 11, color: "var(--muted-fg)", margin: 0, display: "grid", gap: 3 }}>
        <div>
          <strong>流派</strong>:{agent.school}
        </div>
        <div>
          <strong>時間框架</strong>:{agent.timeframe}
        </div>
        <div>
          <strong>風險</strong>:{agent.risk} · <strong>個性</strong>:{agent.personality}
        </div>
      </dl>

      {agent.tracked && (
        <div
          style={{
            marginTop: 4,
            padding: "8px 10px",
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            fontSize: 11,
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 10,
            alignItems: "baseline",
          }}
        >
          <span>📈 命中率</span>
          <span style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
            {winRatePct}
          </span>
          <span style={{ color: "var(--muted-fg)" }}>
            {agent.stats.total_predictions} 筆預測
          </span>
        </div>
      )}

      {!agent.tracked && (
        <div
          style={{
            marginTop: 4,
            padding: "4px 10px",
            fontSize: 10,
            color: "var(--muted-fg)",
            fontStyle: "italic",
          }}
        >
          ※ 本 agent 產情報/監督,不直接做預測,不被追蹤勝率
        </div>
      )}
    </article>
  );
}
