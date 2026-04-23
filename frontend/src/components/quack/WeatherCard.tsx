import { fetchMarketOverview } from "@/lib/api";

type Weather = {
  icon: string;
  label: string;
  description: string;
};

function weatherFor(changePct: number): Weather {
  if (changePct > 2) return { icon: "☀️", label: "烈日當空", description: "池塘曝曬,小心熱過頭" };
  if (changePct > 0.5) return { icon: "🌤️", label: "晴時多雲", description: "採光良好,適合走動" };
  if (changePct > -0.5) return { icon: "⛅", label: "多雲平盤", description: "無聲無息,看看就好" };
  if (changePct > -2) return { icon: "🌥️", label: "陰天", description: "池塘發涼,扣緊衣服" };
  return { icon: "🌧️", label: "下雨", description: "撐傘避雨,別追出去" };
}

export async function WeatherCard() {
  let value = 0;
  let change = 0;
  let changePct = 0;
  let fetched = false;
  try {
    const o = await fetchMarketOverview();
    if (o?.taiex) {
      value = o.taiex.close ?? 0;
      change = o.taiex.day_change ?? 0;
      changePct = o.taiex.day_change_pct ?? 0;
      fetched = Boolean(o.taiex.close);
    }
  } catch {
    // silent
  }

  const w = weatherFor(changePct);
  const up = change >= 0;

  return (
    <section
      className="wabi-card relative overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        padding: "28px 24px",
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div
            className="text-xs mb-2 tracking-wider"
            style={{ color: "var(--muted-fg)", fontFamily: "var(--font-serif)" }}
          >
            今日池塘
          </div>
          <div className="flex items-baseline gap-3">
            <span style={{ fontSize: "54px", lineHeight: 1 }}>{w.icon}</span>
            <div>
              <h2
                className="text-2xl"
                style={{
                  fontFamily: "var(--font-serif)",
                  color: "var(--fg)",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}
              >
                {w.label}
              </h2>
              <p className="text-xs mt-1" style={{ color: "var(--muted-fg)" }}>
                {w.description}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs mb-1" style={{ color: "var(--muted-fg)" }}>
            加權指數
          </div>
          <div
            className="font-mono text-2xl"
            style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}
          >
            {fetched ? value.toFixed(2) : "—"}
          </div>
          {fetched && (
            <div
              className="font-mono text-sm mt-1"
              style={{ color: up ? "var(--up)" : "var(--down)" }}
            >
              {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}{" "}
              ({up ? "+" : ""}
              {changePct.toFixed(2)}%)
            </div>
          )}
        </div>
      </div>
      {/* 水波紋(很淡) */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-6 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--ink-wash) 0, transparent 70%)",
        }}
      />
    </section>
  );
}

export default WeatherCard;
