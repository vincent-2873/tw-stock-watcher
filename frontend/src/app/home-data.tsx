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
// 6. 昨夜美股 → 今日台股(用 market overview 的 us 欄位)
// ============================================
export function USConnectLive() {
  const [d, setD] = useState<MarketOverview | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`${API}/api/market/overview`, { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) setD(j);
      } catch {/* */}
    }
    load();
  }, []);
  const us = d?.us ?? {};
  const events: Array<{ icon: string; dir: "rise" | "fall" | "neutral"; title: string; impact: string; stocks: string }> = [];
  const ixic = us["^IXIC"];
  const gspc = us["^GSPC"];
  const sox = us["^SOX"];
  const vix = us["^VIX"];
  if (sox) {
    const pct = sox.changes_pct ?? 0;
    events.push({
      icon: pct >= 0 ? "📈" : "📉",
      dir: pct >= 0 ? "rise" : "fall",
      title: `費半 ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
      impact: pct >= 0 ? "→ 半導體權值開高" : "→ 半導體權值開低",
      stocks: "台積電、聯發科、聯電",
    });
  }
  if (ixic) {
    const pct = ixic.changes_pct ?? 0;
    events.push({
      icon: pct >= 0 ? "📈" : "📉",
      dir: pct >= 0 ? "rise" : "fall",
      title: `NASDAQ ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
      impact: pct >= 0 ? "→ 科技股情緒偏多" : "→ 科技股開低",
      stocks: "廣達、鴻海、緯穎",
    });
  }
  if (gspc) {
    const pct = gspc.changes_pct ?? 0;
    events.push({
      icon: pct >= 0 ? "📈" : "📉",
      dir: pct >= 0 ? "rise" : "fall",
      title: `S&P 500 ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
      impact: pct >= 0 ? "→ 整體風險偏好回升" : "→ 外資態度保守",
      stocks: "",
    });
  }
  if (vix) {
    const v = vix.price ?? 0;
    events.push({
      icon: v > 20 ? "⚠️" : "✓",
      dir: v > 20 ? "rise" : "neutral",
      title: `VIX ${v.toFixed(2)} ${(vix.changes_pct ?? 0) > 0 ? "+" : ""}${(vix.changes_pct ?? 0).toFixed(2)}%`,
      impact: v > 20 ? "→ 外資賣壓升溫,防禦優先" : "→ 市場情緒平穩",
      stocks: "",
    });
  }

  if (events.length === 0) {
    return (
      <div style={{ padding: "16px 0", color: "var(--text-muted)", fontStyle: "italic" }}>
        呱呱在看美股⋯
      </div>
    );
  }

  return (
    <>
      {events.map((e, i) => (
        <div key={i} className={styles.usEvent}>
          <div className={styles.usEventTitle}>
            <span className={e.dir === "rise" ? styles.rise : e.dir === "fall" ? styles.fall : ""}>{e.icon}</span>
            {e.title}
          </div>
          <div className={styles.usImpactArrow}>{e.impact}</div>
          {e.stocks && <div className={styles.usStocks}>{e.stocks}</div>}
        </div>
      ))}
    </>
  );
}

// ============================================
// 7. 焦點股(從最熱 2 題材 tier_1 / tier_2 抽出)
// ============================================
type FocusItem = {
  ticker: string;
  topic_name: string;
  heat: number;
  stage: string | null;
};

export function FocusStocksLive() {
  const [items, setItems] = useState<FocusItem[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`${API}/api/topics?status=active&order=heat&limit=3`, { cache: "no-store" });
        const j = await r.json();
        const topics: Topic[] = j.topics ?? [];
        const out: FocusItem[] = [];
        for (const t of topics) {
          const sc = t.supply_chain || {};
          for (const tier of Object.values(sc)) {
            for (const s of tier.stocks || []) {
              if (!/^\d{4,6}$/.test(s)) continue;
              if (out.find((x) => x.ticker === s)) continue;
              out.push({
                ticker: s,
                topic_name: t.name,
                heat: t.heat_score ?? 0,
                stage: t.stage,
              });
              if (out.length >= 5) break;
            }
            if (out.length >= 5) break;
          }
          if (out.length >= 5) break;
        }
        if (!cancelled) setItems(out);
      } catch {/* */}
    }
    load();
  }, []);

  if (items === null) {
    return (
      <div style={{ padding: 12, color: "var(--text-muted)", fontStyle: "italic", fontSize: 13 }}>
        呱呱挑焦點中⋯
      </div>
    );
  }
  if (items.length === 0) {
    return <div style={{ padding: 12, color: "var(--text-muted)", fontSize: 13 }}>無焦點股</div>;
  }

  return (
    <>
      {items.map((f) => (
        <Link key={f.ticker} href={`/stocks/${f.ticker}`} className={styles.focusStockItem}>
          <div>
            <div className={styles.focusStockName}>{f.ticker}</div>
            <div className={styles.focusStockTag}>{f.topic_name}</div>
          </div>
          <div className={styles.focusStockPrice}>
            <div className="px" style={{ fontSize: 13, color: "var(--accent-gold)" }}>{f.heat}°</div>
            <div className="chg" style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {f.stage === "main_rally" ? "主升段" : f.stage === "starting" ? "起動" : f.stage}
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}

// ============================================
// 7.5 三大法人
// ============================================
type InstitutionalData = {
  latest_date?: string;
  today?: { foreign: number; invt: number; dealer: number };
  five_day?: { foreign: number; invt: number; dealer: number; avg_foreign_per_day?: number };
  status?: { foreign: string; invt: string; dealer: string };
  error?: string;
};

function toYi(n: number): string {
  return (n / 1e8).toFixed(1);
}

function StatusPill({ status }: { status: string }) {
  const isSell = status.includes("賣");
  const isBig = status.includes("大幅");
  const color = isSell ? "var(--fall-light)" : status.includes("買") ? "var(--rise-light)" : "var(--neutral)";
  const bg = isSell
    ? "rgba(107, 142, 90, 0.15)"
    : status.includes("買")
    ? "rgba(200, 75, 60, 0.15)"
    : "rgba(138, 129, 112, 0.15)";
  return (
    <span
      style={{
        fontSize: 11,
        padding: "2px 8px",
        borderRadius: 10,
        background: bg,
        color,
        display: "inline-block",
        marginTop: 10,
      }}
    >
      {status} {isBig ? "⚠️" : ""}
    </span>
  );
}

export function InstitutionalLive() {
  const [d, setD] = useState<InstitutionalData | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`${API}/api/institutional/overview?days=5`, { cache: "no-store" });
        const j = (await r.json()) as InstitutionalData;
        if (!cancelled) setD(j);
      } catch {/* */}
    }
    load();
  }, []);

  if (!d) {
    return (
      <div style={{ padding: 16, color: "var(--text-muted)", fontStyle: "italic", gridColumn: "1 / -1" }}>
        呱呱查三大法人⋯
      </div>
    );
  }
  if (d.error || !d.today) {
    return (
      <div style={{ padding: 16, color: "var(--text-muted)", gridColumn: "1 / -1" }}>
        {d.error || "今日尚無三大法人資料"}
      </div>
    );
  }

  const cards = [
    { icon: "🌍", title: "外資", today: d.today.foreign, fiveDay: d.five_day?.foreign ?? 0, status: d.status?.foreign ?? "" },
    { icon: "🏦", title: "投信", today: d.today.invt, fiveDay: d.five_day?.invt ?? 0, status: d.status?.invt ?? "" },
    { icon: "🏛️", title: "自營商", today: d.today.dealer, fiveDay: d.five_day?.dealer ?? 0, status: d.status?.dealer ?? "" },
  ];

  return (
    <>
      {cards.map((c) => {
        const todayYi = toYi(c.today);
        const fiveYi = toYi(c.fiveDay);
        const dir = c.today > 0 ? "rise" : c.today < 0 ? "fall" : "neutral";
        return (
          <div key={c.title} className={styles.flowCard}>
            <div className={styles.flowTitle}>
              {c.icon} {c.title}
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{d.latest_date}</span>
            </div>
            <div className={cx(styles.flowAmount, styles[dir])}>
              {c.today > 0 ? "+" : ""}{todayYi} 億
            </div>
            <div className={styles.flowTrend}>
              5 日累計 {c.fiveDay > 0 ? "+" : ""}{fiveYi} 億
            </div>
            <StatusPill status={c.status} />
          </div>
        );
      })}
    </>
  );
}

// ============================================
// 7.9 今日關鍵發言(重點人物 Phase 1 Day 6-7 空殼)
// ============================================
type Statement = {
  id: number;
  said_at?: string;
  source?: string;
  source_url?: string;
  statement_text?: string;
  statement_translated?: string;
  ai_summary?: string;
  ai_topic?: string;
  ai_urgency?: number;
  ai_market_impact?: string;
  ai_affected_stocks?: Array<{ code: string; name?: string; impact?: string }>;
  person?: {
    id: number;
    name: string;
    name_zh?: string;
    role?: string;
    category?: string;
    priority?: number;
    affected_stocks?: string[];
  };
};

/**
 * Bug 5 修(CLAUDE.md 鐵則 4):
 *   - 資料為空整塊隱藏,不顯示「暫無」或佔位文字
 *   - 此元件現在自己管理區塊標題 + loading/empty/data 三狀態
 *   - 空時 return null,外層看不到標題也看不到空殼
 */
export function PeopleStatementsLive() {
  const [items, setItems] = useState<Statement[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`${API}/api/intel/people/statements?limit=3`, { cache: "no-store" });
        const j = await r.json();
        if (!cancelled) setItems(j.statements ?? []);
      } catch {
        if (!cancelled) setItems([]);
      }
    }
    load();
    const t = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // loading — 用極簡佔位符 (不算空殼,因還在載入)
  if (items === null) return null;

  // 空 — 整塊隱藏,連標題都不 render
  if (items.length === 0) return null;

  return (
    <>
      <div className={styles.sectionTitle}>
        <h2>🎤 今日關鍵發言</h2>
        <div className={styles.divider}></div>
        <Link className={styles.moreLink} href="/intel">所有情報 →</Link>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
      {items.map((s) => (
        <div
          key={s.id}
          style={{
            padding: "14px 16px",
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
              👤 {s.person?.name_zh || s.person?.name} · {s.person?.role || "—"}
            </span>
            {s.ai_urgency != null && (
              <span style={{ fontSize: 11, color: s.ai_urgency >= 8 ? "var(--up)" : "var(--muted-fg)", fontFamily: "var(--font-mono)" }}>
                {s.ai_urgency >= 8 ? "🔥 " : ""}緊急度 {s.ai_urgency}/10
              </span>
            )}
          </div>
          {(s.ai_summary || s.statement_translated || s.statement_text) && (
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "var(--fg-soft)", lineHeight: 1.6, marginBottom: 6 }}>
              「{s.ai_summary || s.statement_translated || s.statement_text}」
            </div>
          )}
          {s.ai_market_impact && (
            <div style={{ fontSize: 12, color: "var(--muted-fg)" }}>
              📊 {s.ai_market_impact}
            </div>
          )}
        </div>
      ))}
      </div>
    </>
  );
}

// ============================================
// 8. 今日重點(AI 分類新聞)
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
