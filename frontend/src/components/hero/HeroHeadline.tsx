"use client";

/**
 * Hero 動態標題 — NEXT_TASK_008a 階段 2 縮水版
 *
 * 規則(優先序):
 *   1. /api/quack/headline 拿到呱呱觀點 → water_status 決定標題狀態詞,
 *      quack_view 作為副標(這是「呱呱觀點」,不是新聞摘要)
 *   2. quack endpoint 失敗 → 退回新聞 headline 作副標 + 用 |TAIEX %| 算狀態
 *   3. 完全失敗 → 顯示「呱呱去後場確認中」
 *
 * NEXT_TASK_008a 完成條件 #2:副標是呱呱觀點(不是新聞抓取)
 */

import { useEffect, useState } from "react";
import styles from "../../app/page.module.css";

const API = process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

type State = "calm" | "quiet" | "stirred" | "rough" | "chaotic";

const STATE_WORD: Record<State, { word: string; accent: string }> = {
  calm: { word: "風平浪靜", accent: "風平浪靜" },
  quiet: { word: "還算平靜", accent: "平靜" },
  stirred: { word: "有點混", accent: "混" },
  rough: { word: "波濤洶湧", accent: "洶湧" },
  chaotic: { word: "詭譎", accent: "詭譎" },
};

function pickState(taiexPct: number | null | undefined, futuresPct: number | null | undefined): State {
  const t = Math.abs(taiexPct ?? 0);
  if (taiexPct != null && futuresPct != null) {
    const sameSign = (taiexPct >= 0) === (futuresPct >= 0);
    if (!sameSign && Math.max(t, Math.abs(futuresPct)) > 1) return "chaotic";
  }
  if (t > 3) return "chaotic";
  if (t >= 2) return "rough";
  if (t >= 1) return "stirred";
  if (t >= 0.3) return "quiet";
  return "calm";
}

// 從 water_status 字串推回 State key
function stateFromWaterStatus(s: string | undefined): State | null {
  if (!s) return null;
  if (s.includes("詭譎")) return "chaotic";
  if (s.includes("洶湧") || s.includes("波濤")) return "rough";
  if (s.includes("混") || s.includes("有點")) return "stirred";
  if (s.includes("還算平靜") || s.includes("平靜")) return "quiet";
  if (s.includes("風平浪靜")) return "calm";
  return null;
}

type QuackHeadline = {
  water_status?: string;
  quack_view?: string;
  headline?: string;
  reason?: string;
  watch_for?: string | string[];
  generated_at?: string;
  mode?: string;
  source?: string;
  us_overnight?: Record<string, { symbol: string; price: number; change_pct?: number }>;
  triggered_events?: Array<{ event_zh: string; correlation_score: number }>;
};

const MODE_BADGE: Record<string, string> = {
  pre_market: "盤前",
  intraday: "盤中",
  after_close: "盤後",
  weekly_recap: "本週",
  next_week_preview: "下週",
  us_session: "美股盤中",
};

type Headline = {
  title?: string;
  one_line?: string;
  importance?: number;
  date?: string;
};

export function HeroHeadline() {
  const [state, setState] = useState<State | null>(null);
  const [quack, setQuack] = useState<QuackHeadline | null>(null);
  const [headline, setHeadline] = useState<Headline | null>(null);
  const [stale, setStale] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // 008b 主路徑:/api/hero/headline 自動依時段切換內容
      let gotQuack = false;
      try {
        const hRes = await fetch(`${API}/api/hero/headline`, { cache: "no-store" });
        if (hRes.ok) {
          const hj: QuackHeadline = await hRes.json();
          if (!cancelled && (hj.quack_view || hj.headline)) {
            setQuack(hj);
            const s = stateFromWaterStatus(hj.water_status) ||
              (hj.mode === "pre_market" ? "stirred" : (hj.mode === "us_session" ? "stirred" : null));
            if (s) {
              setState(s);
              gotQuack = true;
            } else if (hj.quack_view) {
              setState("stirred");
              gotQuack = true;
            }
          }
        }
      } catch {/* fall through to legacy path */}

      // 退路 1:008a 既有 /api/quack/headline
      if (!gotQuack) {
        try {
          const qRes = await fetch(`${API}/api/quack/headline`, { cache: "no-store" });
          if (qRes.ok) {
            const qj: QuackHeadline = await qRes.json();
            if (!cancelled && qj.quack_view) {
              setQuack(qj);
              const s = stateFromWaterStatus(qj.water_status);
              if (s) {
                setState(s);
                gotQuack = true;
              }
            }
          }
        } catch {/* fall through */}
      }

      // 退路:既有的市場 + 新聞 headline 路徑
      if (!gotQuack) {
        try {
          const [mRes, hRes] = await Promise.all([
            fetch(`${API}/api/market/overview`, { cache: "no-store" }),
            fetch(`${API}/api/news/headlines?days=1&limit=1`, { cache: "no-store" }),
          ]);
          const m = mRes.ok ? await mRes.json() : null;
          const h = hRes.ok ? await hRes.json() : null;

          if (!cancelled) {
            setState(pickState(m?.taiex?.day_change_pct, m?.futures_tx?.day_change_pct));

            const items: Headline[] = h?.headlines ?? [];
            if (items.length > 0) {
              setHeadline(items[0]);
              setStale(false);
            } else {
              try {
                const r2 = await fetch(`${API}/api/news/headlines?days=3&limit=1`, { cache: "no-store" });
                const j2 = await r2.json();
                const arr2: Headline[] = j2?.headlines ?? [];
                if (!cancelled && arr2.length > 0) {
                  setHeadline(arr2[0]);
                  setStale(true);
                }
              } catch {/**/}
            }
          }
        } catch {
          if (!cancelled) setErrored(true);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // 還在 loading
  if (state === null && !errored) {
    return (
      <>
        <h1>
          今天池塘的水<br />
          ⋯⋯
        </h1>
        <div className={styles.heroQuote} style={{ opacity: 0.5 }}>
          呱呱正在看盤⋯⋯
        </div>
      </>
    );
  }

  if (errored && state === null) {
    return (
      <>
        <h1>
          今天池塘的水<br />
          有點<span className={styles.accent}>混</span>。
        </h1>
        <div className={styles.heroQuote} style={{ opacity: 0.7 }}>
          —— 即時資料暫時連不上,呱呱去後場確認中 ——
        </div>
      </>
    );
  }

  const sw = STATE_WORD[state!];
  const word = sw.word;
  const accent = sw.accent;
  const before = word.slice(0, word.indexOf(accent));
  const after = word.slice(word.indexOf(accent) + accent.length);

  return (
    <>
      <h1>
        今天池塘的水<br />
        {before}
        <span className={styles.accent}>{accent}</span>
        {after}。
      </h1>
      <div className={styles.heroQuote}>
        {quack?.quack_view ? (
          <>
            {quack.mode && MODE_BADGE[quack.mode] && (
              <span
                style={{
                  display: "inline-block",
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 3,
                  background: "var(--accent-gold, #C9A961)",
                  color: "var(--bg, #fff)",
                  marginRight: 8,
                  verticalAlign: "middle",
                  fontStyle: "normal",
                }}
              >
                {MODE_BADGE[quack.mode]}
              </span>
            )}
            {quack.quack_view}
            {quack.reason && (
              <span
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 4,
                  fontStyle: "normal",
                }}
              >
                {quack.reason}
                {quack.watch_for && (
                  <>
                    {" · "}
                    <span style={{ color: "var(--accent-gold, #C9A961)" }}>
                      下個關卡:{Array.isArray(quack.watch_for) ? quack.watch_for.join(" / ") : quack.watch_for}
                    </span>
                  </>
                )}
              </span>
            )}
            {quack.triggered_events && quack.triggered_events.length > 0 && (
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 3,
                  fontStyle: "normal",
                }}
              >
                觸發:{quack.triggered_events.slice(0, 3).map((e) => e.event_zh).join(" · ")}
              </span>
            )}
          </>
        ) : headline ? (
          <>
            {stale && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 6 }}>
                (昨日摘要)
              </span>
            )}
            {headline.one_line || headline.title}
          </>
        ) : (
          <>拉高的別追,跌深的先等。</>
        )}
      </div>
    </>
  );
}
