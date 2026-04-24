"use client";

/**
 * 呱呱招待所 · 內部辦公室首頁
 *
 * 這不是前台!前台在 https://tw-stock-watcher.zeabur.app/
 * 本網域為 CEO / 分析師 / 系統內部使用,不對外使用者公開。
 *
 * 內容:
 *   - 系統健康度儀表板(從 /api/agents / /api/diag/* 拉)
 *   - 分析師名冊(12 agents) · 點進去可看個別詳情
 *   - 會議記錄(尚未實作,佔位)
 *   - Watchdog / Self-audit 狀態連結到 GitHub Actions
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

type HealthCheck = {
  time_ok: boolean;
  finmind_ok: boolean;
  market_ok: boolean;
  topics_count: number | null;
  tpe_now: string | null;
};

export default function OfficeHome() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [agentCount, setAgentCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [time, finmind, market, topics, agents] = await Promise.all([
          fetch(`${API}/api/time/now`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API}/api/diag/finmind`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API}/api/market/overview`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API}/api/topics`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API}/api/agents`).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (cancelled) return;
        setHealth({
          time_ok: !!time?.iso,
          finmind_ok: finmind?.level === 3 && finmind?.level_title === "Sponsor",
          market_ok: !!market?.taiex?.close,
          topics_count: topics?.count ?? null,
          tpe_now: time?.hero_en ?? null,
        });
        setAgentCount(agents?.count ?? null);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "48px 24px",
      }}
    >
      <header style={{ marginBottom: 40, borderBottom: "2px solid var(--border-strong)", paddingBottom: 24 }}>
        <div style={{ fontSize: 11, color: "var(--muted-fg)", letterSpacing: 2, marginBottom: 8 }}>
          QUACK HOUSE · INTERNAL OFFICE
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 32,
            fontWeight: 500,
            margin: 0,
          }}
        >
          🏮 呱呱招待所 · 內部辦公室
        </h1>
        <p style={{ color: "var(--muted-fg)", fontSize: 13, marginTop: 6 }}>
          CEO 工作檯 · 分析師管理 · 系統監控 · 不對外使用者公開
        </p>
        <p style={{ color: "var(--muted-fg)", fontSize: 11, marginTop: 4, fontStyle: "italic" }}>
          {health?.tpe_now || "連線中 ⋯"}
        </p>
      </header>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, marginBottom: 14 }}>
          🩺 系統健康度
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 10,
          }}
        >
          <HealthCard label="Backend 時鐘" ok={health?.time_ok} detail="/api/time/now" />
          <HealthCard label="FinMind Sponsor" ok={health?.finmind_ok} detail="level 3" />
          <HealthCard label="市場即時資料" ok={health?.market_ok} detail="TAIEX / SOX / VIX" />
          <HealthCard
            label="題材熱度"
            ok={health?.topics_count != null && health.topics_count > 0}
            detail={`${health?.topics_count ?? "—"} 個活躍題材`}
          />
          <HealthCard label="分析師名冊" ok={agentCount === 12} detail={`${agentCount ?? "—"} / 12 位`} />
        </div>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, marginBottom: 14 }}>
          🦆 快速連結
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
          <OfficeLink href="/agents" title="分析師名冊" desc="12 位 agent 人設 · 流派 · 命中率" />
          <OfficeLink
            href="https://github.com/vincent-2873/tw-stock-watcher/actions"
            title="GitHub Actions · 自動化監控"
            desc="Watchdog 每 15 分 · Self-audit 每 30 分"
            external
          />
          <OfficeLink
            href="https://tw-stock-watcher.zeabur.app/"
            title="前台(使用者看的)"
            desc="Quack House 公開網站 · 別把這裡跟前台搞混"
            external
          />
          <OfficeLink
            href="https://supabase.com/dashboard/project/gvvfzwqkobmdwmqepinx"
            title="Supabase 後台"
            desc="DB 管理 · SQL Editor · Auth 設定"
            external
          />
          <OfficeLink
            href="https://github.com/vincent-2873/tw-stock-watcher"
            title="GitHub Repo"
            desc="原始碼 · Issues · PR"
            external
          />
        </div>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 500, marginBottom: 14 }}>
          📋 待辦 / 尚未啟動
        </h2>
        <ul style={{ padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
          <TodoItem text="11 位 agent 視覺(Vincent 用 DALL-E 生,放 frontend/public/characters/)" />
          <TodoItem text="5 位投資分析師代號重新命名(阿武/阿慧等太土,等 CEO 最終定案)" />
          <TodoItem text="會議系統 backend + cron(憲法 Section 7 未實作)" />
          <TodoItem text="預測結算器(每交易日 14:30 抓收盤比對)" />
          <TodoItem text="社群爬蟲(PTT / Dcard / Mobile01)" />
          <TodoItem text="即時通報(LINE / Discord / Email)" />
        </ul>
      </section>

      <footer
        style={{
          marginTop: 48,
          paddingTop: 20,
          borderTop: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--muted-fg)",
          textAlign: "center",
        }}
      >
        呱呱招待所 · 內部辦公室 v0.1 · 2026-04-25 建立 · 此網域不對外公開
      </footer>
    </main>
  );
}

function HealthCard({ label, ok, detail }: { label: string; ok: boolean | null | undefined; detail: string }) {
  const color = ok === true ? "var(--accent-green)" : ok === false ? "var(--accent-red)" : "var(--muted-fg)";
  const mark = ok === true ? "✅" : ok === false ? "❌" : "⋯";
  return (
    <div
      style={{
        padding: 14,
        background: "var(--card)",
        border: `1px solid var(--border)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 4,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500 }}>
        {mark} {label}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted-fg)", marginTop: 4 }}>{detail}</div>
    </div>
  );
}

function OfficeLink({
  href,
  title,
  desc,
  external,
}: {
  href: string;
  title: string;
  desc: string;
  external?: boolean;
}) {
  const body = (
    <>
      <div style={{ fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 500 }}>
        {title} {external && <span style={{ fontSize: 11, color: "var(--muted-fg)" }}>↗</span>}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted-fg)", marginTop: 4 }}>{desc}</div>
    </>
  );
  const style = {
    padding: 14,
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 4,
    display: "block",
  };
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} style={style}>
      {body}
    </Link>
  );
}

function TodoItem({ text }: { text: string }) {
  return (
    <li
      style={{
        padding: "8px 12px",
        background: "var(--bg-raised)",
        borderLeft: "2px solid var(--border-strong)",
        borderRadius: 2,
        fontSize: 12,
      }}
    >
      🟡 {text}
    </li>
  );
}
