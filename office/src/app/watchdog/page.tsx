"use client";

/**
 * /watchdog — 商業級系統監控儀表板(NEXT_TASK_008b 階段 6)
 *
 * 整合 8 個區塊:
 *  1. 三站健康度(前台 / 後端 / 辦公室)
 *  2. FinMind Sponsor 狀態 + 額度
 *  3. intel_crawler 16+ 來源狀態
 *  4. 美股資料源狀態(yfinance)
 *  5. cron 排程最近執行紀錄
 *  6. 24h API 呼叫量 / 錯誤率
 *  7. DB 各表資料量趨勢(從 errors / health 反推)
 *  8. 系統警示區(ANOMALIES.md + errors 表)
 */

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://vsis-api.zeabur.app";
const GH_RAW = "https://raw.githubusercontent.com/vincent-2873/tw-stock-watcher/main";
const SITES = [
  { key: "frontend", name: "前台", url: "https://tw-stock-watcher.zeabur.app/" },
  { key: "office", name: "辦公室", url: "https://quack-office.zeabur.app/" },
  { key: "api", name: "後端 API", url: `${API_BASE}/api/time/now` },
] as const;

type HealthAll = {
  tpe_now: string;
  supabase: string;
  finmind?: {
    ok: boolean;
    status: string;
    level?: number;
    level_title?: string;
    is_sponsor?: boolean;
    api_request_limit_hour?: number;
    token_prefix?: string;
    endpoint?: string;
  };
  intel_crawler?: {
    ok: boolean;
    overall_status: string;
    summary: {
      total_sources: number;
      healthy: number;
      stale: number;
      failing: number;
      total_today: number;
      expected_minimum: number;
    };
    sources: Array<{
      id: number;
      name: string;
      type?: string;
      region?: string;
      last_success_at?: string | null;
      hours_since_success?: number | null;
      today_count?: number;
      status: string;
      last_error_msg?: string | null;
    }>;
  };
  us_market?: {
    ok: boolean;
    overall_status: string;
    success: number;
    total: number;
    items: Array<{ symbol: string; label: string; price?: number; change_pct?: number; status: string }>;
  };
  cron_recent?: { ok: boolean; count?: number; items?: Array<{ judgment_type: string; judgment_date: string; created_at: string }> };
  errors?: {
    ok: boolean;
    total_24h?: number;
    by_severity?: Record<string, number>;
    by_source?: Record<string, number>;
    critical_24h?: number;
    status?: string;
    reason?: string;
  };
};

type ErrorRow = {
  id: number;
  trace_id: string;
  occurred_at: string;
  severity: string;
  source: string;
  service: string | null;
  endpoint: string | null;
  message: string;
};

type SiteCheck = { key: string; name: string; url: string; status: number | string; latency_ms: number };

const STATUS_COLOR: Record<string, string> = {
  healthy: "var(--accent-green)",
  ok: "var(--accent-green)",
  warning: "#d4a014",
  stale: "#d4a014",
  degraded: "#d4a014",
  fail: "var(--accent-red)",
  failing: "var(--accent-red)",
  critical: "var(--accent-red)",
  unknown: "var(--muted-fg)",
};

function statusColor(s: string) {
  return STATUS_COLOR[s.toLowerCase()] ?? "var(--muted-fg)";
}

function relTime(iso?: string | null): string {
  if (!iso) return "未知";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "未知";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "剛剛";
  if (min < 60) return `${min} 分鐘前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小時前`;
  return `${Math.floor(hr / 24)} 天前`;
}

export default function WatchdogPage() {
  const [health, setHealth] = useState<HealthAll | null>(null);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [siteChecks, setSiteChecks] = useState<SiteCheck[]>([]);
  const [anomalies, setAnomalies] = useState<string | null>(null);
  const [audit, setAudit] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. 三站健康度
      const checks = await Promise.all(
        SITES.map(async (s) => {
          const start = Date.now();
          try {
            const r = await fetch(s.url, { method: "HEAD", cache: "no-store", mode: "no-cors" });
            return { ...s, status: r.status || "ok", latency_ms: Date.now() - start };
          } catch (_e) {
            return { ...s, status: "fail", latency_ms: Date.now() - start };
          }
        }),
      );
      if (!cancelled) setSiteChecks(checks);

      // 2. /api/health/all 整合所有後端健康度
      try {
        const r = await fetch(`${API_BASE}/api/health/all`, { cache: "no-store" });
        if (r.ok && !cancelled) {
          const j = (await r.json()) as HealthAll;
          setHealth(j);
        }
      } catch (e) {
        if (!cancelled) setErr(`health/all 載入失敗: ${e}`);
      }

      // 3. /api/errors 最近錯誤
      try {
        const r = await fetch(`${API_BASE}/api/errors?limit=50`, { cache: "no-store" });
        if (r.ok && !cancelled) {
          const j = await r.json();
          setErrors(j.errors || []);
        }
      } catch (_e) {
        // 失敗忽略
      }

      // 4. ANOMALIES.md / SELF_AUDIT.md(GitHub raw)
      try {
        const [anRes, auRes] = await Promise.all([
          fetch(`${GH_RAW}/ceo-desk/watchdog/ANOMALIES.md`, { cache: "no-store" }),
          fetch(`${GH_RAW}/ceo-desk/watchdog/SELF_AUDIT.md`, { cache: "no-store" }),
        ]);
        if (!cancelled) {
          if (anRes.ok) setAnomalies(await anRes.text());
          if (auRes.ok) setAudit(await auRes.text());
        }
      } catch (_e) { /* 忽略 */ }

      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/" style={{ color: "var(--muted-fg)", fontSize: 13 }}>
          ← 回辦公室首頁
        </Link>
      </div>
      <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 500, marginBottom: 6 }}>
        系統監控儀表板
      </h1>
      <p style={{ color: "var(--muted-fg)", fontSize: 13, marginBottom: 24 }}>
        商業級健康度監控(NEXT_TASK_008b)·整合 8 個區塊·來源:/api/health/all + /api/errors + GitHub raw
        {health?.tpe_now ? ` · 後端時間 ${health.tpe_now.replace("T", " ").slice(0, 19)}` : ""}
      </p>

      {loading && <p style={{ fontSize: 13, color: "var(--muted-fg)" }}>載入中…</p>}
      {err && <p style={{ color: "var(--accent-red)", fontSize: 13 }}>⚠️ {err}</p>}

      {/* 1. 三站健康度 */}
      <Section title="① 三站健康度" subtitle="HEAD request × 3 sites">
        <Grid cols={3}>
          {siteChecks.map((c) => (
            <Card key={c.key} statusColor={c.status === "fail" ? STATUS_COLOR.fail : STATUS_COLOR.ok}>
              <strong>{c.name}</strong>
              <div style={{ fontSize: 11, color: "var(--muted-fg)", marginTop: 4 }}>
                {c.url.replace(/^https?:\/\//, "")}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, marginTop: 6 }}>
                狀態 <strong>{c.status}</strong> · {c.latency_ms} ms
              </div>
            </Card>
          ))}
        </Grid>
      </Section>

      {/* 2. FinMind */}
      {health?.finmind && (
        <Section title="② FinMind Sponsor 狀態" subtitle="付費方案 + 額度監控">
          <Card statusColor={statusColor(health.finmind.status)}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <KV label="方案" value={health.finmind.level_title || "—"} bold />
              <KV label="Level" value={String(health.finmind.level ?? "—")} />
              <KV label="額度/小時" value={String(health.finmind.api_request_limit_hour ?? "—")} />
              <KV label="是否 Sponsor" value={health.finmind.is_sponsor ? "✅" : "❌"} />
              <KV label="Token" value={health.finmind.token_prefix || "未設定"} mono />
              <KV label="Endpoint" value={(health.finmind.endpoint || "").replace("https://", "")} mono small />
            </div>
          </Card>
        </Section>
      )}

      {/* 3. intel_crawler */}
      {health?.intel_crawler && (
        <Section
          title="③ intel_crawler 資料源"
          subtitle={`${health.intel_crawler.summary.total_sources} 個來源 · 今日 ${health.intel_crawler.summary.total_today} 筆 (門檻 ${health.intel_crawler.summary.expected_minimum})`}
        >
          <Card statusColor={statusColor(health.intel_crawler.overall_status)}>
            <div style={{ display: "flex", gap: 18, fontSize: 13, marginBottom: 12 }}>
              <span>healthy <strong style={{ color: STATUS_COLOR.healthy }}>{health.intel_crawler.summary.healthy}</strong></span>
              <span>stale <strong style={{ color: STATUS_COLOR.stale }}>{health.intel_crawler.summary.stale}</strong></span>
              <span>failing <strong style={{ color: STATUS_COLOR.failing }}>{health.intel_crawler.summary.failing}</strong></span>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 4 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead style={{ position: "sticky", top: 0, background: "var(--bg-elev)" }}>
                  <tr>
                    <Th>名稱</Th>
                    <Th>類型</Th>
                    <Th>區域</Th>
                    <Th>今日</Th>
                    <Th>最後成功</Th>
                    <Th>狀態</Th>
                  </tr>
                </thead>
                <tbody>
                  {health.intel_crawler.sources.map((s) => (
                    <tr key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <Td>{s.name}</Td>
                      <Td muted>{s.type || "—"}</Td>
                      <Td muted>{s.region || "—"}</Td>
                      <Td>{s.today_count ?? 0}</Td>
                      <Td muted>
                        {s.hours_since_success != null && s.hours_since_success < 999
                          ? relTime(s.last_success_at)
                          : "尚未"}
                      </Td>
                      <Td>
                        <span style={{ color: statusColor(s.status), fontWeight: 500 }}>
                          {s.status}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Section>
      )}

      {/* 4. 美股 */}
      {health?.us_market && (
        <Section
          title="④ 美股資料源(yfinance)"
          subtitle={`${health.us_market.success}/${health.us_market.total} 成功`}
        >
          <Card statusColor={statusColor(health.us_market.overall_status)}>
            <Grid cols={3}>
              {health.us_market.items.map((it) => (
                <div
                  key={it.symbol}
                  style={{
                    padding: "8px 12px",
                    background: it.status === "ok" ? "var(--card)" : "var(--bg-elev)",
                    border: "1px solid var(--border)",
                    borderLeft: `3px solid ${statusColor(it.status)}`,
                    borderRadius: 4,
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--muted-fg)" }}>
                    {it.label} ({it.symbol})
                  </div>
                  {it.price != null ? (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, marginTop: 2 }}>
                      <strong>{it.price}</strong>{" "}
                      <span style={{ color: (it.change_pct || 0) >= 0 ? STATUS_COLOR.healthy : STATUS_COLOR.fail }}>
                        {(it.change_pct || 0) >= 0 ? "+" : ""}
                        {it.change_pct}%
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: STATUS_COLOR.fail }}>fetch 失敗</div>
                  )}
                </div>
              ))}
            </Grid>
          </Card>
        </Section>
      )}

      {/* 5. cron 最近執行 */}
      {health?.cron_recent && (
        <Section title="⑤ Cron 排程最近紀錄" subtitle={`從 quack_judgments 反推`}>
          <Card statusColor={STATUS_COLOR.ok}>
            {health.cron_recent.ok && (health.cron_recent.items?.length ?? 0) > 0 ? (
              <div style={{ maxHeight: 220, overflowY: "auto", fontSize: 12 }}>
                {(health.cron_recent.items || []).map((c, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "6px 8px",
                      borderBottom: "1px solid var(--border)",
                      display: "grid",
                      gridTemplateColumns: "150px 100px 1fr",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--muted-fg)" }}>
                      {c.created_at?.slice(0, 19).replace("T", " ")}
                    </span>
                    <strong>{c.judgment_type}</strong>
                    <span style={{ color: "var(--muted-fg)" }}>for {c.judgment_date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--muted-fg)" }}>尚無紀錄</p>
            )}
          </Card>
        </Section>
      )}

      {/* 6. 24h 錯誤統計 */}
      {health?.errors && (
        <Section title="⑥ 24 小時錯誤統計" subtitle="errors 表(Sentry 備案)">
          <Card statusColor={statusColor(health.errors.status || "ok")}>
            {health.errors.ok ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <KV label="24h 總數" value={String(health.errors.total_24h ?? 0)} bold />
                <KV
                  label="critical"
                  value={String(health.errors.critical_24h ?? 0)}
                  bold
                />
                <KV label="狀態" value={health.errors.status || "ok"} bold />
                <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--muted-fg)" }}>
                  by severity: {JSON.stringify(health.errors.by_severity || {})} ·
                  by source: {JSON.stringify(health.errors.by_source || {})}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--muted-fg)" }}>{health.errors.reason || "errors 表未建立"}</p>
            )}
          </Card>
        </Section>
      )}

      {/* 7. 最近錯誤列表 */}
      {errors.length > 0 && (
        <Section title="⑦ 最近錯誤(最多 50 條)" subtitle="critical 標紅">
          <div style={{ maxHeight: 320, overflowY: "auto", fontSize: 11, border: "1px solid var(--border)", borderRadius: 4 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-elev)" }}>
                <tr>
                  <Th>時間</Th>
                  <Th>嚴重度</Th>
                  <Th>來源</Th>
                  <Th>服務</Th>
                  <Th>endpoint</Th>
                  <Th>訊息</Th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e) => (
                  <tr
                    key={e.id}
                    style={{
                      borderTop: "1px solid var(--border)",
                      background: e.severity === "critical" ? "rgba(220,30,30,0.06)" : undefined,
                    }}
                  >
                    <Td muted>{e.occurred_at?.slice(0, 19).replace("T", " ")}</Td>
                    <Td>
                      <span style={{ color: statusColor(e.severity === "critical" ? "critical" : e.severity === "warning" ? "warning" : "fail") }}>
                        {e.severity}
                      </span>
                    </Td>
                    <Td muted>{e.source}</Td>
                    <Td muted>{e.service || "—"}</Td>
                    <Td mono>{e.endpoint || "—"}</Td>
                    <Td>{(e.message || "").slice(0, 120)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* 8. ANOMALIES + Self-audit */}
      {(anomalies || audit) && (
        <Section title="⑧ 系統警示與自審" subtitle="GitHub raw">
          {anomalies && anomalies.trim().length > 50 && (
            <Card statusColor={STATUS_COLOR.warning}>
              <strong style={{ fontSize: 13 }}>ANOMALIES.md</strong>
              <pre
                style={{
                  marginTop: 8,
                  padding: 10,
                  background: "var(--bg-elev)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  whiteSpace: "pre-wrap",
                  fontSize: 11,
                  lineHeight: 1.5,
                  maxHeight: 240,
                  overflow: "auto",
                }}
              >
                {anomalies}
              </pre>
            </Card>
          )}
          {audit && (
            <Card statusColor={STATUS_COLOR.ok}>
              <strong style={{ fontSize: 13 }}>SELF_AUDIT.md</strong>
              <pre
                style={{
                  marginTop: 8,
                  padding: 10,
                  background: "var(--bg-elev)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  whiteSpace: "pre-wrap",
                  fontSize: 11,
                  lineHeight: 1.5,
                  maxHeight: 240,
                  overflow: "auto",
                }}
              >
                {audit}
              </pre>
            </Card>
          )}
        </Section>
      )}
    </main>
  );
}

// ======================== 小元件 ========================

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 17, fontWeight: 500, marginBottom: 4 }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: 11, color: "var(--muted-fg)", marginBottom: 10 }}>{subtitle}</p>
      )}
      {children}
    </section>
  );
}

function Grid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 10,
      }}
    >
      {children}
    </div>
  );
}

function Card({ statusColor, children }: { statusColor?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 14,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${statusColor || "var(--border)"}`,
        borderRadius: 4,
        fontSize: 13,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function KV({
  label,
  value,
  bold,
  mono,
  small,
}: {
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--muted-fg)", marginBottom: 2 }}>{label}</div>
      <div
        style={{
          fontSize: small ? 11 : 13,
          fontWeight: bold ? 600 : 400,
          fontFamily: mono ? "var(--font-mono)" : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "6px 8px",
        fontSize: 10,
        color: "var(--muted-fg)",
        fontWeight: 500,
        borderBottom: "1px solid var(--border)",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  muted,
  mono,
}: {
  children: React.ReactNode;
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      style={{
        padding: "5px 8px",
        color: muted ? "var(--muted-fg)" : undefined,
        fontFamily: mono ? "var(--font-mono)" : undefined,
        fontSize: mono ? 10 : undefined,
      }}
    >
      {children}
    </td>
  );
}
