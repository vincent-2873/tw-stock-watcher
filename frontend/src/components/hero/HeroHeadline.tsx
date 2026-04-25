"use client";

/**
 * Hero 動態標題 — NEXT_TASK_007 修正 #1
 *
 * 規則：
 *   標題狀態詞依當日大盤 |day_change_pct| 決定：
 *     < 0.3%        風平浪靜
 *     0.3 ~ 1%      還算平靜
 *     1 ~ 2%        有點混
 *     2 ~ 3%        波濤洶湧
 *     > 3% / 內外盤分歧  詭譎
 *   副標：取當日影響最強的一條 headline 作為摘要。
 *
 * 沒有當日資料時：fallback 顯示昨日 + 加小標「(昨日摘要)」。
 * 完全 fetch 失敗時：保留原寫死文案 + 標「— 無法連線即時資料 —」。
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
  // 內外盤分歧 → 詭譎
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

type Headline = {
  title?: string;
  one_line?: string;
  importance?: number;
  date?: string;
};

export function HeroHeadline() {
  const [state, setState] = useState<State | null>(null);
  const [headline, setHeadline] = useState<Headline | null>(null);
  const [stale, setStale] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [mRes, hRes] = await Promise.all([
          fetch(`${API}/api/market/overview`, { cache: "no-store" }),
          fetch(`${API}/api/news/headlines?days=1&limit=1`, { cache: "no-store" }),
        ]);
        const m = mRes.ok ? await mRes.json() : null;
        const h = hRes.ok ? await hRes.json() : null;

        const taiexPct = m?.taiex?.day_change_pct;
        const futuresPct = m?.futures_tx?.day_change_pct;

        if (!cancelled) {
          setState(pickState(taiexPct, futuresPct));

          const items: Headline[] = h?.headlines ?? [];
          if (items.length > 0) {
            setHeadline(items[0]);
            setStale(false);
          } else {
            // 退而求其次 — 抓近 3 日
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

  // 完全錯誤 — 退回最後保險文案
  if (errored && state === null) {
    return (
      <>
        <h1>
          今天池塘的水<br />
          有點<span className={styles.accent}>混</span>。
        </h1>
        <div className={styles.heroQuote} style={{ opacity: 0.7 }}>
          —— 即時資料暫時連不上，呱呱去後場確認中 ——
        </div>
      </>
    );
  }

  const sw = STATE_WORD[state!];
  const word = sw.word;
  const accent = sw.accent;
  // 把 accent 從 word 裡標出來
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
        {headline ? (
          <>
            {stale && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 6 }}>
                (昨日摘要)
              </span>
            )}
            {headline.one_line || headline.title}
          </>
        ) : (
          <>拉高的別追，跌深的先等。</>
        )}
      </div>
    </>
  );
}
