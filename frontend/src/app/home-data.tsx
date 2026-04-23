"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

const API =
  process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// ============================================
// 1. 市場脈動(TAIEX / 台指期 / 費半 / VIX)
// ============================================
type MarketOverview = {
  taiex?: { close?: number; day_change?: number; day_change_pct?: number };
  futures_tx?: { close?: number; day_change?: number; day_change_pct?: number };
  us?: Record<string, { label?: string; price?: number; changes_pct?: number }>;
};

function fmtNum(n?: number | null, d = 2) {
  if (n == null) return "—";
  return n.toLocaleString("zh-TW", { maximumFractionDigits: d });
}

export function MarketPulseLive() {
  const [d, setD] = useState<MarketOverview | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`${API}/api/market/overview`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as MarketOverview;
        if (!cancelled) setD(j);
      } catch {/* silent */}
    }
    load();
    const t = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const items = [
    {
      label: "加權指數 TAIEX",
      value: d?.taiex?.close,
      chg: d?.taiex?.day_change,
      chgPct: d?.taiex?.day_change_pct,
      extra: "即時 30 秒更新",
    },
    {
      label: "台指期",
      value: d?.futures_tx?.close,
      chg: d?.futures_tx?.day_change,
      chgPct: d?.futures_tx?.day_change_pct,
      extra: d?.futures_tx && d?.taiex
        ? `期現差 ${((d.futures_tx.close ?? 0) - (d.taiex.close ?? 0)).toFixed(0)}`
        : "",
    },
    {
      label: "費城半導體",
      value: d?.us?.["^SOX"]?.price,
      chg: undefined,
      chgPct: d?.us?.["^SOX"]?.changes_pct,
      extra: "隔夜美股",
    },
    {
      label: "VIX 恐慌",
      value: d?.us?.["^VIX"]?.price,
      chg: undefined,
      chgPct: d?.us?.["^VIX"]?.changes_pct,
      extra: (d?.us?.["^VIX"]?.price ?? 0) > 20 ? "⚠️ 警戒區間(>20)" : "平穩",
    },
  ];

  return (
    <div className={styles.marketPulse}>
      {items.map((m, i) => {
        const pct = m.chgPct ?? 0;
        const up = pct > 0;
        const down = pct < 0;
        return (
          <div key={i} className={styles.marketItem}>
            <div className={styles.label}>{m.label}</div>
            <div className={styles.valueNum}>{fmtNum(m.value, 2)}</div>
            <div className={cx(styles.change, up ? styles.rise : down ? styles.fall : styles.neutral)}>
              {m.chg != null && `${up ? "+" : ""}${fmtNum(m.chg, 2)} `}
              ({up ? "+" : ""}{fmtNum(pct, 2)}%)
            </div>
            <div className={styles.extra}>{m.extra}</div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// 2. 題材熱度 TOP 5
// ============================================
type Tier = { name: string; stocks: string[]; status?: string };
type Topic = {
  id: string;
  name: string;
  heat_score: number | null;
  heat_trend: "rising" | "falling" | "stable" | null;
  stage: string | null;
  ai_summary: string | null;
  supply_chain: Record<string, Tier> | null;
};

const STAGE_LABEL: Record<string, string> = {
  starting: "起動",
  main_rally: "主升段",
  mature: "成熟",
  cooling: "退潮",
  early: "初期",
};

function tierCss(score: number) {
  if (score >= 90) return styles.extreme;
  if (score >= 75) return styles.high;
  if (score >= 60) return styles.medium;
  return styles.low;
}

export function TopicsLive() {
  const [topics, setTopics] = useState<Topic[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`${API}/api/topics?status=active&order=heat&limit=5`, {
          cache: "no-store",
        });
        const j = await r.json();
        if (!cancelled) setTopics(j.topics ?? []);
      } catch {/* */}
    }
    load();
  }, []);

  if (topics === null) {
    return (
      <div style={{ padding: "24px 0", color: "var(--text-muted)", fontStyle: "italic" }}>
        呱呱正在整理題材⋯⋯
      </div>
    );
  }
  if (topics.length === 0) {
    return (
      <div style={{ padding: "24px 0", color: "var(--text-muted)" }}>—— 今日無活躍題材 ——</div>
    );
  }

  const roman = ["I.", "II.", "III.", "IV.", "V."];

  return (
    <>
      {topics.map((t, i) => {
        const heat = t.heat_score ?? 0;
        const topStocks = Object.values(t.supply_chain || {})
          .flatMap((x) => x?.stocks || [])
          .filter((s, idx, arr) => arr.indexOf(s) === idx)
          .slice(0, 4);
        return (
          <Link key={t.id} className={styles.topicCard} href={`/pond/${t.id}`}>
            <div className={styles.topicHeader}>
              <div className={styles.topicName}>
                <span className={styles.topicRank}>{roman[i] || `${i + 1}.`}</span>
                <span>{t.name}</span>
                {heat >= 90 && <span className={cx(styles.topicBadge, styles.badgeNew)}>熾</span>}
                {heat >= 75 && heat < 90 && <span className={cx(styles.topicBadge, styles.badgeHot)}>熱</span>}
              </div>
              <div className={styles.topicHeat}>
                <span className={styles.heatScore}>{heat}°</span>
                <span
                  className={cx(
                    styles.heatTrend,
                    t.heat_trend === "rising" ? styles.up : t.heat_trend === "falling" ? styles.down : styles.flat,
                  )}
                >
                  {t.heat_trend === "rising" ? "↑" : t.heat_trend === "falling" ? "↓" : "→"}
                </span>
              </div>
            </div>
            <div className={styles.heatBarWrapper}>
              <div className={cx(styles.heatBar, tierCss(heat))} style={{ width: `${heat}%` }} />
            </div>
            {t.ai_summary && <div className={styles.topicDesc}>{t.ai_summary}</div>}
            {topStocks.length > 0 && (
              <div className={styles.topicStocks}>
                {topStocks.map((code) => (
                  <span key={code} className={styles.stockChip}>{code}</span>
                ))}
              </div>
            )}
          </Link>
        );
      })}
    </>
  );
}

// ============================================
// 3. 呱呱這週挑的(帶信心度標示)
// ============================================
type Pick = {
  ticker: string;
  topic_id: string;
  topic_name: string;
  topic_stage: string | null;
  heat_score: number;
  chain_tier: string | null;
};

function confidenceBand(heat: number): { label: string; color: string; suffix: string } {
  if (heat >= 90) return { label: "高信心", color: "var(--accent-gold)", suffix: "" };
  if (heat >= 75) return { label: "中高信心", color: "var(--heat-medium, #C9A961)", suffix: "" };
  if (heat >= 60) return { label: "中等信心", color: "var(--neutral)", suffix: "" };
  return { label: "⚠ 低信心,僅供參考", color: "var(--fall)", suffix: "" };
}

export function QuackPicksLive() {
  const [picks, setPicks] = useState<Pick[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`${API}/api/quack/picks?horizon=1w&limit=6`, { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) setPicks(j.picks ?? []);
      } catch {/* */}
    }
    load();
  }, []);

  if (picks === null) {
    return (
      <div style={{ padding: 16, color: "var(--text-muted)", fontStyle: "italic" }}>
        呱呱正在挑選⋯⋯
      </div>
    );
  }
  if (picks.length === 0) {
    return <div style={{ padding: 16, color: "var(--text-muted)" }}>—— 本週無推薦 ——</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
      {picks.map((p) => {
        const band = confidenceBand(p.heat_score);
        return (
          <Link
            key={p.ticker}
            href={`/stocks/${p.ticker}`}
            style={{
              padding: 14,
              borderRadius: 6,
              background: "var(--bg-elevated)",
              border: "1px solid rgba(201, 169, 97, 0.1)",
              textDecoration: "none",
              color: "inherit",
              display: "block",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
              <span
                style={{
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  color: "var(--text-primary)",
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                {p.ticker}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  color: "var(--accent-gold)",
                  fontSize: 14,
                }}
              >
                {p.heat_score}°
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 2 }}>
              {p.topic_name}
              {p.topic_stage && (
                <span style={{ marginLeft: 6, fontSize: 10, color: "var(--text-muted)" }}>
                  · {STAGE_LABEL[p.topic_stage] || p.topic_stage}
                </span>
              )}
            </div>
            {p.chain_tier && (
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>供應鏈:{p.chain_tier}</div>
            )}
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: band.color,
                fontFamily: "var(--font-serif, 'Noto Serif TC', serif)",
                letterSpacing: "0.03em",
              }}
            >
              {band.label}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ============================================
// 4. 呱呱今日功課(從 topics + 市場狀況即時生成)
// ============================================
type MorningData = {
  topTopic?: Topic;
  avoid?: Topic;
  marketDown: boolean;
  updatedAt: string;
};

export function QuackMorningLive() {
  const [d, setD] = useState<MorningData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [tRes, mRes] = await Promise.all([
          fetch(`${API}/api/topics?status=active&order=heat&limit=10`, { cache: "no-store" }),
          fetch(`${API}/api/market/overview`, { cache: "no-store" }),
        ]);
        const t = await tRes.json();
        const m = await mRes.json();
        const topics: Topic[] = t.topics ?? [];
        const rising = topics.filter(
          (x) => x.heat_trend === "rising" && (x.heat_score ?? 0) < 80,
        )[0];
        const overheated = topics.find(
          (x) => (x.heat_score ?? 0) >= 90 && x.heat_trend !== "falling",
        );
        const marketDown = (m?.taiex?.day_change_pct ?? 0) < -0.5;
        if (!cancelled) {
          setD({
            topTopic: rising ?? topics[0],
            avoid: overheated,
            marketDown,
            updatedAt: new Date().toLocaleTimeString("zh-TW", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: "Asia/Taipei",
            }),
          });
        }
      } catch {/* */}
    }
    load();
  }, []);

  const opener = d?.marketDown
    ? "池塘今天水有點混。"
    : "池塘還算平靜,注意誰先動。";

  return (
    <div className={styles.quackMorning}>
      <div className={styles.quackHeader}>
        <div className={styles.quackAvatar}>🦆</div>
        <div>
          <div className={styles.quackTitle}>呱呱今日功課 · 即時</div>
          <div className={styles.quackTime}>
            {d?.updatedAt ? `${d.updatedAt} · 呱呱剛從 DB 讀完題材熱度` : "呱呱翻資料中⋯"}
          </div>
        </div>
      </div>
      <div className={styles.quackMain}>
        {opener}
        {d?.topTopic && (
          <>
            <br />
            今天最升溫的題材是「
            <Link
              href={`/pond/${d.topTopic.id}`}
              style={{ color: "var(--accent-gold)", textDecoration: "none" }}
            >
              {d.topTopic.name}
            </Link>
            」(熱度 {d.topTopic.heat_score}°
            {d.topTopic.heat_trend === "rising" ? " ↑" : ""}),
            <br />
            資金可能從{d.avoid?.name ?? "過熱題材"}輪動過來。
          </>
        )}
      </div>
      {d && (
        <div className={styles.quackHighlights}>
          <div className={styles.highlightBox}>
            <div className={styles.highlightLabel}>💡 呱呱留意(補漲 / 升溫題材)</div>
            <div className={styles.highlightStocks}>
              {d.topTopic ? (
                <Link href={`/pond/${d.topTopic.id}`} className={styles.safe} style={{ textDecoration: "none" }}>
                  {d.topTopic.name} {d.topTopic.heat_score}°
                </Link>
              ) : "—"}
            </div>
          </div>
          <div className={styles.highlightBox}>
            <div className={styles.highlightLabel}>⚠️ 呱呱警戒(過熱 / 避免追高)</div>
            <div className={styles.highlightStocks}>
              {d.avoid ? (
                <Link href={`/pond/${d.avoid.id}`} className={styles.risk} style={{ textDecoration: "none" }}>
                  {d.avoid.name} {d.avoid.heat_score}°
                </Link>
              ) : "—"}
            </div>
          </div>
        </div>
      )}
      <div className={styles.quackActions}>
        <Link className={cx(styles.btn, styles.primary)} href="/pond">🔥 看全部題材</Link>
        <Link className={styles.btn} href="/chat">💬 問呱呱為什麼</Link>
      </div>
    </div>
  );
}

// ============================================
// 5. 供應鏈金字塔(從 topics.supply_chain 動態產生)
// ============================================
export function SupplyChainLive() {
  const [topic, setTopic] = useState<Topic | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`${API}/api/topics?status=active&order=heat&limit=1`, { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) setTopic(j.topics?.[0] ?? null);
      } catch {/* */}
    }
    load();
  }, []);

  if (!topic) {
    return (
      <div style={{ padding: 24, color: "var(--text-muted)", fontStyle: "italic" }}>
        呱呱正在畫供應鏈⋯
      </div>
    );
  }

  const tiers = Object.entries(topic.supply_chain || {});
  const STATUS_LABEL: Record<string, { icon: string; txt: string; tone: string }> = {
    "主升段": { icon: "🟢", txt: "主升段(正在漲)", tone: "var(--heat-medium, #C9A961)" },
    "補漲": { icon: "🔥", txt: "補漲(推薦觀察)", tone: "var(--rise-light, #E89968)" },
    "已漲": { icon: "🟡", txt: "已漲完(追高風險)", tone: "var(--neutral, #8A8170)" },
    "成熟": { icon: "🟡", txt: "成熟期", tone: "var(--neutral, #8A8170)" },
    "退潮": { icon: "🔴", txt: "退潮(避開)", tone: "var(--text-muted)" },
  };

  return (
    <>
      <div
        style={{
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 12,
          marginBottom: 12,
        }}
      >
        題材:
        <Link
          href={`/pond/${topic.id}`}
          style={{ color: "var(--accent-gold)", textDecoration: "none", marginLeft: 6 }}
        >
          {topic.name}
        </Link>
        {" · 熱度 "}
        <span style={{ color: "var(--accent-gold)" }}>{topic.heat_score}°</span>
        {" · 點個股進分析頁"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "16px 0" }}>
        {tiers.map(([key, tier], i) => {
          const status = STATUS_LABEL[tier.status || ""] || { icon: "⚪", txt: tier.status || "", tone: "var(--text-muted)" };
          return (
            <div
              key={key}
              style={{
                display: "grid",
                gridTemplateColumns: "150px 1fr auto",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: 6,
                background: status.icon === "🔥" ? "rgba(168, 72, 54, 0.1)" : "var(--bg-elevated)",
                border: `1px solid ${status.icon === "🔥" ? "rgba(168, 72, 54, 0.35)" : "rgba(201, 169, 97, 0.1)"}`,
                position: "relative",
              }}
            >
              {i > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -8,
                    left: 80,
                    fontSize: 10,
                    color: "var(--text-muted)",
                  }}
                >
                  ↑ 資金從下往上流
                </span>
              )}
              <div
                style={{
                  fontFamily: "var(--font-serif, 'Noto Serif TC', serif)",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  textAlign: "right",
                  paddingRight: 12,
                  borderRight: "1px solid rgba(201, 169, 97, 0.15)",
                }}
              >
                {tier.name}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(tier.stocks || []).map((code) => {
                  const isTw = /^\d{4,6}$/.test(code);
                  return isTw ? (
                    <Link
                      key={code}
                      href={`/stocks/${code}`}
                      className={styles.stockChip}
                      style={{ textDecoration: "none" }}
                    >
                      {code}
                    </Link>
                  ) : (
                    <span key={code} className={styles.stockChip}>{code}</span>
                  );
                })}
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontSize: 12,
                  color: status.tone,
                  fontFamily: "var(--font-serif)",
                  minWidth: 140,
                }}
              >
                <span style={{ fontSize: 18, marginRight: 4 }}>{status.icon}</span>
                {status.txt}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          fontSize: 11,
          color: "var(--text-muted)",
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid rgba(201, 169, 97, 0.08)",
          flexWrap: "wrap",
        }}
      >
        <span>🔥 補漲(推薦觀察)</span>
        <span>🟢 主升段(正在漲)</span>
        <span>🟡 已漲完(追高風險)</span>
        <span>🔴 退潮(避開)</span>
      </div>
    </>
  );
}

// ============================================
// 6. 今日重點(AI 分類新聞)
// ============================================
type Headline = {
  title?: string;
  one_line?: string;
  sentiment?: "bull" | "bear" | "neutral";
  importance?: number;
  affected_tickers?: string[];
  link?: string;
  date?: string;
};

export function HeadlinesLive() {
  const [items, setItems] = useState<Headline[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`${API}/api/news/headlines?days=1&limit=6`, { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) setItems(j.headlines ?? []);
      } catch {/* */}
    }
    load();
  }, []);

  if (items === null) {
    return (
      <div style={{ padding: "16px 0", color: "var(--text-muted)", fontStyle: "italic" }}>
        呱呱正在讀新聞⋯⋯(AI 分類約 5-10 秒)
      </div>
    );
  }
  if (items.length === 0) {
    return <div style={{ padding: "16px 0", color: "var(--text-muted)" }}>—— 近 24 小時無重要新聞 ——</div>;
  }
  const SENT_LABEL: Record<string, { text: string; color: string }> = {
    bull: { text: "利多", color: "var(--rise-light, #E89968)" },
    bear: { text: "利空", color: "var(--fall-light, #8FA87C)" },
    neutral: { text: "中立", color: "var(--neutral, #8A8170)" },
  };
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((h, i) => {
        const s = SENT_LABEL[h.sentiment || "neutral"];
        return (
          <li key={i} style={{ padding: "10px 0", borderBottom: "1px solid rgba(201,169,97,0.06)", display: "flex", gap: 10 }}>
            <span
              style={{
                flexShrink: 0,
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 10,
                background: "rgba(26,24,21,0.5)",
                color: s.color,
                border: `1px solid ${s.color}`,
                minWidth: "2.6rem",
                textAlign: "center",
                alignSelf: "flex-start",
              }}
            >
              {s.text}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <a
                href={h.link || "#"}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--text-primary)", fontSize: 13, textDecoration: "none" }}
              >
                {h.one_line || h.title}
              </a>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {(h.affected_tickers || []).slice(0, 4).map((t) => (
                  <Link
                    key={t}
                    href={`/stocks/${t}`}
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 11,
                      padding: "2px 6px",
                      background: "rgba(201, 169, 97, 0.08)",
                      border: "1px solid rgba(201, 169, 97, 0.15)",
                      borderRadius: 3,
                      color: "var(--text-secondary)",
                      textDecoration: "none",
                    }}
                  >
                    {t}
                  </Link>
                ))}
                <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {h.date?.slice(5, 16) || ""}
                </span>
              </div>
            </div>
            <span
              style={{
                flexShrink: 0,
                fontSize: 12,
                color: s.color,
                fontFamily: "var(--font-mono, monospace)",
                alignSelf: "flex-start",
              }}
            >
              {h.importance ?? 0}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
