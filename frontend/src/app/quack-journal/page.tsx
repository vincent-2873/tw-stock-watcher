import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Prediction = {
  id: number;
  date: string;
  prediction_type: string;
  subject: string;
  prediction: string;
  confidence: number;
  timeframe: string;
  actual_result: string | null;
  hit_or_miss: string | null;
  reasoning_error: string | null;
  evaluated_at: string | null;
};

type PredictionsResp = {
  count: number;
  evaluated_count: number;
  hit_rate: number | null;
  predictions: Prediction[];
  note?: string;
};

async function fetchPredictions(days = 30): Promise<PredictionsResp> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  try {
    const r = await fetch(`${base}/api/quack/predictions?days=${days}`, {
      next: { revalidate: 60 },
    });
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as PredictionsResp;
  } catch {
    return { count: 0, evaluated_count: 0, hit_rate: null, predictions: [] };
  }
}

const TYPE_LABEL: Record<string, string> = {
  topic_heat: "題材熱度",
  stock_pick: "個股挑選",
  sector_rotation: "產業輪動",
  market_direction: "大盤方向",
};

export default async function QuackJournalPage() {
  const data = await fetchPredictions(30);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px" }}>
      <header style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 12, letterSpacing: "0.4em", color: "var(--sumi-mist)" }}>
          くぉくぉ にっき
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 32,
            marginTop: 6,
            color: "var(--sumi)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            justifyContent: "center",
          }}
        >
          <Image
            src="/characters/guagua_official_v1.png"
            alt="呱呱"
            width={36}
            height={36}
          />
          呱呱日記
        </h1>
        <p style={{ color: "var(--sumi-soft)", marginTop: 8 }}>
          呱呱自己追蹤的命中率 · 講對的肯定、講錯的反省
        </p>
      </header>

      {/* 命中率卡 */}
      <section
        className="wabi-card"
        style={{ padding: 24, marginBottom: 24, display: "flex", gap: 32 }}
      >
        <MetricBlock
          label="過去 30 天命中率"
          value={data.hit_rate == null ? "—" : `${data.hit_rate}%`}
          hint={
            data.evaluated_count
              ? `已驗證 ${data.evaluated_count} 筆 / 總 ${data.count} 筆`
              : "尚無驗證結果"
          }
        />
        <MetricBlock
          label="總預測數"
          value={String(data.count)}
          hint={data.note ?? "近 30 天"}
        />
        <MetricBlock
          label="最準類型"
          value={bestType(data.predictions) ?? "—"}
          hint="依命中比率"
        />
      </section>

      {/* 預測清單 */}
      <section>
        <h2
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 20,
            marginBottom: 12,
            color: "var(--sumi)",
          }}
        >
          最近預測
        </h2>

        {data.predictions.length === 0 ? (
          <EmptyState note={data.note} />
        ) : (
          <div className="wabi-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="wabi-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>類型</th>
                  <th>對象</th>
                  <th>預測</th>
                  <th style={{ textAlign: "right" }}>信心</th>
                  <th style={{ textAlign: "center" }}>結果</th>
                </tr>
              </thead>
              <tbody>
                {data.predictions.map((p) => (
                  <tr key={p.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{p.date}</td>
                    <td style={{ whiteSpace: "nowrap", color: "var(--sumi-mist)" }}>
                      {TYPE_LABEL[p.prediction_type] ?? p.prediction_type}
                    </td>
                    <td style={{ whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
                      {p.subject}
                    </td>
                    <td style={{ lineHeight: 1.5 }}>{p.prediction}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                      {p.confidence}
                    </td>
                    <td style={{ textAlign: "center" }}>{renderHit(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer style={{ marginTop: 32, color: "var(--sumi-mist)", fontSize: 12 }}>
        <Link href="/" style={{ color: "var(--kin)" }}>
          ← 回首頁
        </Link>
        <span style={{ marginLeft: 12 }}>
          排程 15:00 TPE 自動驗證到期預測 · 錯的會送進 Claude 分析錯在哪
        </span>
      </footer>
    </main>
  );
}

function MetricBlock({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, color: "var(--sumi-mist)", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-latin)",
          fontSize: 36,
          color: "var(--sumi)",
          marginTop: 4,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: "var(--sumi-mist)", marginTop: 6 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function renderHit(p: Prediction) {
  switch (p.hit_or_miss) {
    case "hit":
      return <span className="wabi-pill" style={{ color: "var(--up)" }}>✅ 命中</span>;
    case "miss":
      return <span className="wabi-pill" style={{ color: "var(--down)" }}>✗ 落空</span>;
    case "partial":
      return <span className="wabi-pill" style={{ color: "var(--gold)" }}>◐ 部分</span>;
    default:
      return <span style={{ color: "var(--sumi-mist)" }}>⋯ 待驗</span>;
  }
}

function bestType(rows: Prediction[]): string | null {
  const byType: Record<string, { hit: number; total: number }> = {};
  for (const r of rows) {
    if (!r.hit_or_miss) continue;
    const t = byType[r.prediction_type] ?? { hit: 0, total: 0 };
    t.total += 1;
    if (r.hit_or_miss === "hit") t.hit += 1;
    byType[r.prediction_type] = t;
  }
  let best: { type: string; rate: number } | null = null;
  for (const [type, v] of Object.entries(byType)) {
    if (v.total < 3) continue;
    const rate = v.hit / v.total;
    if (!best || rate > best.rate) best = { type, rate };
  }
  return best ? `${TYPE_LABEL[best.type] ?? best.type} (${Math.round(best.rate * 100)}%)` : null;
}

function EmptyState({ note }: { note?: string }) {
  return (
    <div className="wabi-card" style={{ padding: 40, textAlign: "center" }}>
      <div style={{ opacity: 0.5, display: "flex", justifyContent: "center", marginBottom: 6 }}>
        <Image src="/characters/guagua_official_v1.png" alt="呱呱" width={56} height={56} />
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 18,
          marginTop: 12,
          color: "var(--sumi)",
        }}
      >
        呱呱還沒在池塘裡留下足跡
      </div>
      <div style={{ fontSize: 13, color: "var(--sumi-mist)", marginTop: 8 }}>
        {note ?? "等呱呱晨報開始預測後,這裡會自動記錄命中率"}
      </div>
    </div>
  );
}
