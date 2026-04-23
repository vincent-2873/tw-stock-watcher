"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QuackAvatar } from "@/components/quack/QuackAvatar";

const POPULAR_TW: { code: string; name: string; tag?: string }[] = [
  { code: "2330", name: "台積電", tag: "晶圓代工" },
  { code: "2317", name: "鴻海", tag: "AI 伺服器" },
  { code: "2454", name: "聯發科", tag: "IC 設計" },
  { code: "2344", name: "華邦電", tag: "記憶體" },
  { code: "3037", name: "欣興", tag: "ABF 載板" },
  { code: "3711", name: "日月光", tag: "封測" },
  { code: "2383", name: "台光電", tag: "CCL" },
  { code: "6274", name: "台燿", tag: "CCL" },
  { code: "4722", name: "國精化", tag: "CCL 樹脂" },
  { code: "6182", name: "合晶", tag: "矽晶圓" },
  { code: "2303", name: "聯電", tag: "晶圓代工" },
  { code: "2308", name: "台達電", tag: "電源" },
  { code: "2382", name: "廣達", tag: "AI 伺服器" },
  { code: "3017", name: "奇鋐", tag: "散熱" },
  { code: "2376", name: "技嘉", tag: "AI 伺服器" },
  { code: "2368", name: "金像電", tag: "PCB" },
];

const RECENT_KEY = "stocks_recent_v1";

export default function StocksSearchPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const qTrim = q.trim().toUpperCase();
  const isValidTwCode = /^\d{4,6}[A-Z]?$/.test(qTrim);

  const filtered = useMemo(() => {
    if (!q) return POPULAR_TW;
    const lower = q.toLowerCase();
    return POPULAR_TW.filter(
      (s) => s.code.toLowerCase().includes(lower) || s.name.includes(q),
    );
  }, [q]);

  const notInList = isValidTwCode && !POPULAR_TW.some((s) => s.code === qTrim);

  function go(code: string) {
    const c = code.trim().toUpperCase();
    if (!c) return;
    // 更新 recent
    try {
      const next = [c, ...recent.filter((x) => x !== c)].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      setRecent(next);
    } catch {
      // ignore
    }
    router.push(`/stocks/${c}`);
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 md:py-10">
        <div className="text-xs mb-5" style={{ color: "var(--muted-fg)" }}>
          <Link href="/" className="hover:text-[var(--fg)]">
            今日
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--fg-soft)" }}>查個股</span>
        </div>

        <header className="mb-8 flex items-start gap-4">
          <QuackAvatar state="thinking" size="lg" />
          <div>
            <h1
              className="text-3xl md:text-4xl mb-1"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: "var(--fg)",
              }}
            >
              查個股
            </h1>
            <p className="text-sm font-serif italic" style={{ color: "var(--muted-fg)" }}>
              「打個代號或名字,呱呱幫你翻資料。」
            </p>
          </div>
        </header>

        {/* 搜尋框 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isValidTwCode) go(qTrim);
            else if (filtered.length === 1) go(filtered[0].code);
          }}
          className="mb-6"
        >
          <div className="flex gap-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="代號或名稱(如 2330 / 台積電 / 6182)"
              className="flex-1 px-4 py-3 text-base"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border-strong)",
                borderRadius: "8px",
                color: "var(--fg)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.05em",
              }}
            />
            <button
              type="submit"
              disabled={!isValidTwCode && filtered.length !== 1}
              className="px-5"
              style={{
                background: "var(--fg)",
                color: "var(--card)",
                border: "1px solid var(--fg)",
                borderRadius: "8px",
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                opacity: isValidTwCode || filtered.length === 1 ? 1 : 0.35,
                cursor: isValidTwCode || filtered.length === 1 ? "pointer" : "not-allowed",
              }}
            >
              查詢
            </button>
          </div>
          {notInList && (
            <div
              className="mt-3 p-3 rounded-lg flex items-center justify-between gap-3"
              style={{
                background: "var(--bg-raised)",
                border: "1px dashed var(--gold)",
              }}
            >
              <span className="text-sm" style={{ color: "var(--fg-soft)" }}>
                <span
                  className="font-mono mr-2"
                  style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}
                >
                  {qTrim}
                </span>
                不在熱門清單,直接打去查
              </span>
              <button
                onClick={() => go(qTrim)}
                className="text-xs px-3 py-1.5 rounded"
                style={{
                  background: "var(--gold)",
                  color: "var(--card)",
                  fontFamily: "var(--font-serif)",
                }}
              >
                直接查 →
              </button>
            </div>
          )}
        </form>

        {/* 最近查過 */}
        {recent.length > 0 && (
          <section className="mb-6">
            <h2
              className="text-xs mb-2 tracking-wider"
              style={{ color: "var(--muted-fg)", fontFamily: "var(--font-serif)" }}
            >
              最近翻過
            </h2>
            <div className="flex flex-wrap gap-2">
              {recent.map((c) => (
                <button
                  key={c}
                  onClick={() => go(c)}
                  className="text-sm font-mono px-3 py-1.5 rounded"
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--fg-soft)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 熱門 */}
        <section>
          <h2
            className="text-xs mb-3 tracking-wider"
            style={{ color: "var(--muted-fg)", fontFamily: "var(--font-serif)" }}
          >
            {q ? `搜尋結果 · ${filtered.length + (notInList ? 1 : 0)}` : "熱門"}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {filtered.map((s) => (
              <button
                key={s.code}
                onClick={() => go(s.code)}
                className="p-3 text-left transition-colors"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                }}
              >
                <div
                  className="font-mono text-xs"
                  style={{ color: "var(--muted-fg)", fontFamily: "var(--font-mono)" }}
                >
                  {s.code}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "15px",
                    fontWeight: 500,
                    color: "var(--fg)",
                    marginTop: "2px",
                  }}
                >
                  {s.name}
                </div>
                {s.tag && (
                  <div
                    className="text-[11px] mt-1"
                    style={{ color: "var(--muted-fg)" }}
                  >
                    {s.tag}
                  </div>
                )}
              </button>
            ))}
            {q && filtered.length === 0 && !notInList && (
              <div
                className="col-span-2 md:col-span-3 py-10 text-center text-sm font-serif italic"
                style={{ color: "var(--muted-fg)" }}
              >
                ——  沒有匹配。改個字或按查詢送出  ——
              </div>
            )}
          </div>
        </section>

        <footer className="text-center mt-10 py-6">
          <div className="wabi-divider" />
          <p className="text-xs font-serif italic" style={{ color: "var(--muted-fg)" }}>
            ⚠ 分析結果依公開資料,並非投資建議。
          </p>
        </footer>
      </div>
    </main>
  );
}
