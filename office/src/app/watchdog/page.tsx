"use client";

/**
 * /watchdog — 系統監控儀表板
 * 拉 GitHub raw 的 ceo-desk/watchdog/last_check.json + SELF_AUDIT.md
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const GH_RAW = "https://raw.githubusercontent.com/vincent-2873/tw-stock-watcher/main";

type Check = {
  name: string;
  endpoint?: string;
  status: number;
  latency_ms: number;
  anomaly: string | null;
  sample?: unknown;
};

type LastCheck = {
  checked_at_utc: string;
  checked_at_tpe: string;
  total_checks: number;
  healthy_count: number;
  anomaly_count: number;
  checks: Check[];
};

export default function WatchdogPage() {
  const [lastCheck, setLastCheck] = useState<LastCheck | null>(null);
  const [audit, setAudit] = useState<string | null>(null);
  const [anomalies, setAnomalies] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lcRes, auRes, anRes] = await Promise.all([
          fetch(`${GH_RAW}/ceo-desk/watchdog/last_check.json`, { cache: "no-store" }),
          fetch(`${GH_RAW}/ceo-desk/watchdog/SELF_AUDIT.md`, { cache: "no-store" }),
          fetch(`${GH_RAW}/ceo-desk/watchdog/ANOMALIES.md`, { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (lcRes.ok) setLastCheck(await lcRes.json());
        if (auRes.ok) setAudit(await auRes.text());
        if (anRes.ok) setAnomalies(await anRes.text());
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
        🐺 系統監控
      </h1>
      <p style={{ color: "var(--muted-fg)", fontSize: 13, marginBottom: 24 }}>
        Watchdog (15 分) + Self-audit (30 分) 的最新結果。
        資料從 GitHub raw 直接拉,反映最近一次 GHA 執行狀態。
      </p>

      {err && <p style={{ color: "var(--accent-red)", fontSize: 13 }}>載入失敗:{err}</p>}

      {lastCheck && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500 }}>
            🩺 最近一次 Watchdog (端點健康)
          </h2>
          <p style={{ fontSize: 12, color: "var(--muted-fg)" }}>
            {lastCheck.checked_at_tpe} · 健康 {lastCheck.healthy_count}/{lastCheck.total_checks} ·
            異常 {lastCheck.anomaly_count}
          </p>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {lastCheck.checks.map((c) => (
              <div
                key={c.name}
                style={{
                  padding: "10px 14px",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderLeft: `3px solid ${c.anomaly ? "var(--accent-red)" : "var(--accent-green)"}`,
                  borderRadius: 4,
                  display: "grid",
                  gridTemplateColumns: "150px 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <span style={{ fontWeight: 500 }}>
                  {c.anomaly ? "❌" : "✅"} {c.name}
                </span>
                <span style={{ color: "var(--muted-fg)" }}>
                  {c.anomaly || c.endpoint || "OK"}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted-fg)" }}>
                  {c.status}·{c.latency_ms}ms
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {audit && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500 }}>
            🔍 Self-audit (系統完整度)
          </h2>
          <pre
            style={{
              padding: 14,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              whiteSpace: "pre-wrap",
              fontSize: 11,
              lineHeight: 1.6,
              maxHeight: 400,
              overflow: "auto",
            }}
          >
            {audit}
          </pre>
        </section>
      )}

      {anomalies && anomalies.trim().length > 100 && (
        <section>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500 }}>
            ⚠️ 累積異常紀錄
          </h2>
          <pre
            style={{
              padding: 14,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--accent-red)",
              borderRadius: 4,
              whiteSpace: "pre-wrap",
              fontSize: 11,
              lineHeight: 1.6,
              maxHeight: 400,
              overflow: "auto",
            }}
          >
            {anomalies}
          </pre>
        </section>
      )}
    </main>
  );
}
