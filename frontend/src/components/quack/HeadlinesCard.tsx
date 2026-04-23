import Link from "next/link";
import { fetchHeadlines, type HeadlineItem } from "@/lib/api";
import { QuackAvatar } from "./QuackAvatar";

const SENTIMENT_COLOR: Record<string, string> = {
  bull: "var(--up)",
  bear: "var(--down)",
  neutral: "var(--muted-fg)",
};

const SENTIMENT_LABEL: Record<string, string> = {
  bull: "利多",
  bear: "利空",
  neutral: "中立",
};

function ImportanceBar({ v }: { v: number }) {
  const width = Math.min(100, Math.max(0, v * 10));
  return (
    <div
      className="h-[2px] w-10 rounded-full overflow-hidden"
      style={{ background: "var(--muted)" }}
    >
      <div
        className="h-full"
        style={{
          width: `${width}%`,
          background:
            v >= 8 ? "var(--up)" : v >= 5 ? "var(--gold)" : "var(--moss)",
        }}
      />
    </div>
  );
}

export async function HeadlinesCard() {
  let items: HeadlineItem[] = [];
  try {
    const r = await fetchHeadlines(1, 8);
    items = r.headlines ?? [];
  } catch (e) {
    console.error("headlines fetch failed", e);
  }

  if (items.length === 0) {
    return (
      <section
        className="wabi-card"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          padding: "22px 24px",
        }}
      >
        <div className="flex items-baseline justify-between mb-3">
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "16px",
              fontWeight: 500,
              color: "var(--fg)",
              letterSpacing: "0.04em",
            }}
          >
            今日重點
          </h2>
        </div>
        <div className="flex items-center gap-3 py-4">
          <QuackAvatar state="sleeping" size="md" />
          <p
            className="text-sm font-serif italic"
            style={{ color: "var(--muted-fg)" }}
          >
            ——  還沒收到新聞。(FinMind 免費版不含新聞,升級後自動帶入)  ——
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="wabi-card"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        padding: "22px 24px",
      }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "16px",
            fontWeight: 500,
            color: "var(--fg)",
            letterSpacing: "0.04em",
          }}
        >
          今日重點 · AI 分類
        </h2>
        <span className="text-[11px]" style={{ color: "var(--muted-fg)" }}>
          近 24 小時 · 按重要度排序
        </span>
      </div>
      <ul className="space-y-3">
        {items.map((h, i) => {
          const color = SENTIMENT_COLOR[h.sentiment || "neutral"];
          const label = SENTIMENT_LABEL[h.sentiment || "neutral"];
          const imp = h.importance ?? 0;
          return (
            <li key={i} className="flex gap-3 items-start">
              <span
                className="text-[11px] px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
                style={{
                  background: "var(--bg-raised)",
                  color,
                  border: `1px solid ${color}`,
                  fontFamily: "var(--font-serif)",
                  minWidth: "2.6rem",
                  textAlign: "center",
                }}
              >
                {label}
              </span>
              <div className="flex-1 min-w-0">
                <a
                  href={h.link || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm leading-snug"
                  style={{
                    color: "var(--fg)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {h.one_line || h.title}
                </a>
                {h.one_line && h.title && (
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "var(--muted-fg)" }}
                  >
                    {h.title}
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {(h.affected_tickers || []).slice(0, 4).map((t) => (
                    <Link
                      key={t}
                      href={`/stocks/${t}`}
                      className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: "var(--bg-raised)",
                        color: "var(--fg-soft)",
                        border: "1px solid var(--border)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {t}
                    </Link>
                  ))}
                  {(h.affected_topics || []).slice(0, 3).map((tp) => (
                    <span
                      key={tp}
                      className="text-[11px] px-1.5 py-0.5 rounded"
                      style={{
                        background: "var(--muted)",
                        color: "var(--muted-fg)",
                      }}
                    >
                      #{tp}
                    </span>
                  ))}
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: "var(--muted-fg)", fontFamily: "var(--font-mono)" }}
                  >
                    {h.date?.slice(5) || ""}
                  </span>
                </div>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-0.5">
                <span
                  className="text-xs font-mono"
                  style={{ color, fontFamily: "var(--font-mono)" }}
                >
                  {imp}
                </span>
                <ImportanceBar v={imp} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default HeadlinesCard;
