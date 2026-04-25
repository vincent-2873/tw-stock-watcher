"use client";

/**
 * /agents — 分析師名冊(辦公室版)
 *
 * 從前台 frontend/ 移出(前後台分網域),放在獨立的 office/ service。
 * 這裡顯示 12 位 agent 的完整 persona + 命中率。
 *
 * NEXT_TASK_007 增量：
 *   - 5 位投資分析師卡片改用 AnalystAvatar 占位視覺（純 SVG）
 *   - display_name 用新名（辰旭/靜遠/觀棋/守拙/明川）覆蓋舊的（阿武等）
 *     真正 DB 更新等 migration 0008
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AnalystAvatar,
  ANALYSTS,
  type AnalystSlug,
} from "../../components/AnalystAvatar";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

// agent_id → AnalystSlug 對應
const AGENT_TO_SLUG: Record<string, AnalystSlug> = {
  analyst_a: "chenxu",
  analyst_b: "jingyuan",
  analyst_c: "guanqi",
  analyst_d: "shouzhuo",
  analyst_e: "mingchuan",
};

type AgentStats = {
  total_predictions: number;
  hits: number;
  misses: number;
  cancelled: number;
  win_rate: number | null;
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
        <BackLink />
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
        <BackLink />
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 24 }}>分析師名冊</h1>
        <p style={{ color: "var(--muted-fg)", marginTop: 24, fontStyle: "italic" }}>
          正在召集所有分析師 ⋯
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
      <BackLink />
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 500, marginBottom: 4 }}>
        🦆 分析師名冊
      </h1>
      <p style={{ color: "var(--muted-fg)", fontSize: 13, marginBottom: 8 }}>
        12 位分析師,每位流派不同、風險偏好不同、「命中」標準自己定義。<br />
        投資部門 5 位被追蹤勝率 —— 本所的透明承諾。
      </p>
      <p style={{ color: "var(--muted-fg)", fontSize: 11, marginBottom: 32, fontStyle: "italic" }}>
        ※ 系統剛上線,勝率為 0 筆。首場會議產生預測後,勝率會開始累積。
      </p>

      <Section title="🦆 所主" agents={owner} highlight />
      <Section title="👤 投資部門 · 決策整合層(被追蹤勝率)" agents={investment} highlight />
      <Section title="📡 資訊生產層 · 4 部門主管" agents={information} />
      <Section title="🦊 監督學習層" agents={supervision} />
    </main>
  );
}

function BackLink() {
  return (
    <div style={{ marginBottom: 16 }}>
      <Link href="/" style={{ color: "var(--muted-fg)", fontSize: 13 }}>
        ← 回辦公室首頁
      </Link>
    </div>
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
          borderLeft: highlight ? "3px solid var(--accent-gold)" : "2px solid var(--border)",
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

  // NEXT_TASK_007: 投資分析師用 AnalystAvatar；舊 display_name 覆蓋為新名
  const analystSlug = AGENT_TO_SLUG[agent.agent_id];
  const meta = analystSlug ? ANALYSTS[analystSlug] : null;
  const displayName = meta ? `${meta.name}（${meta.pinyin}）` : agent.display_name;

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
        {analystSlug ? (
          <AnalystAvatar slug={analystSlug} size="sm" />
        ) : (
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
        )}
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 500, margin: 0 }}>
            {displayName}
          </h3>
          <p style={{ fontSize: 11, color: "var(--muted-fg)", margin: "2px 0 0" }}>{agent.role}</p>
        </div>
      </header>
      <blockquote
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 13,
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
          <span style={{ fontFamily: "var(--font-mono)" }}>{winRatePct}</span>
          <span style={{ color: "var(--muted-fg)" }}>{agent.stats.total_predictions} 筆</span>
        </div>
      )}
      {!agent.tracked && (
        <div style={{ padding: "4px 10px", fontSize: 10, color: "var(--muted-fg)", fontStyle: "italic" }}>
          ※ 本 agent 產情報/監督,不直接做預測
        </div>
      )}
    </article>
  );
}
