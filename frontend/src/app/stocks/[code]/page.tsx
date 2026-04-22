import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchAnalysis, fetchTwStock, type AnalysisResult } from "@/lib/api";
import { ChatPanel } from "@/components/chat/ChatPanel";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ ai?: string }>;
}

function recoClass(r: string) {
  switch (r) {
    case "strong_buy":
      return "bg-emerald-600 text-white";
    case "buy":
      return "bg-emerald-500 text-white";
    case "watch":
      return "bg-amber-400 text-zinc-900";
    case "hold":
      return "bg-zinc-400 text-white";
    case "avoid":
      return "bg-rose-500 text-white";
    default:
      return "bg-zinc-300";
  }
}

function fmt(n?: number | null, digits = 2) {
  if (n == null) return "-";
  return n.toLocaleString("zh-TW", { maximumFractionDigits: digits });
}

function DimCard({
  label,
  dim,
  max,
}: {
  label: string;
  dim: AnalysisResult["evidence"]["fundamental"];
  max: number;
}) {
  const pct = (dim.score / max) * 100;
  return (
    <div className="rounded-lg border border-[var(--border)] p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-semibold">{label}</h3>
        <div className="text-right">
          <span className="text-2xl font-bold">{dim.score}</span>
          <span className="text-sm text-[var(--muted-fg)]">/{max}</span>
        </div>
      </div>
      <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-blue-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="text-xs text-[var(--muted-fg)] space-y-1">
        {Object.entries(dim.details)
          .slice(0, 6)
          .map(([k, v]) => (
            <li key={k} className="flex justify-between gap-2">
              <span className="truncate">{k}</span>
              <span className="font-mono text-right">
                {typeof v === "object" ? JSON.stringify(v).slice(0, 30) : String(v).slice(0, 30)}
              </span>
            </li>
          ))}
      </ul>
      {dim.warnings.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
          {dim.warnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-600">
              ⚠️ {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function StockDetailPage({ params, searchParams }: Props) {
  const { code } = await params;
  const sp = await searchParams;
  const withAi = sp.ai === "1";

  const analysis = await fetchAnalysis(code, { skipAi: !withAi }).catch((e) => {
    console.error(e);
    return null;
  });
  if (!analysis) return notFound();

  const priceRes = await fetchTwStock(code, 60).catch(() => null);
  const last = priceRes?.data?.[priceRes.data.length - 1];

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 md:py-8 bg-[var(--bg)] text-[var(--fg)]">
      <nav className="mb-4 text-sm">
        <Link href="/" className="text-blue-600 hover:underline">
          ← 回主頁
        </Link>
      </nav>

      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold font-mono">{analysis.stock_id}</h1>
          <span className="text-2xl font-semibold">{analysis.stock_name}</span>
          <span
            className={`px-3 py-1 rounded-full font-semibold text-sm ${recoClass(
              analysis.recommendation,
            )}`}
          >
            {analysis.recommendation_emoji} {analysis.recommendation}
          </span>
          {!withAi && (
            <Link
              href={`?ai=1`}
              className="ml-auto text-xs px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)]"
            >
              🤖 啟用 AI 分析
            </Link>
          )}
        </div>
        <div className="mt-2 text-sm text-[var(--muted-fg)]">
          最後更新 {new Date(analysis.timestamp).toLocaleString("zh-TW", { hour12: false })} TPE
          {last && (
            <>
              {" · "}收盤 <span className="font-mono">{last.close}</span>
              {" · "}量{" "}
              <span className="font-mono">
                {Math.round((last.Trading_Volume ?? 0) / 1000).toLocaleString()} 張
              </span>
            </>
          )}
        </div>
      </header>

      {/* 核心數字 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="text-xs text-[var(--muted-fg)]">總分</div>
          <div className="text-3xl font-bold">
            {analysis.total_score}
            <span className="text-sm text-[var(--muted-fg)]">/95</span>
          </div>
          <div className="text-xs text-[var(--muted-fg)] mt-1">
            基礎 {analysis.base_score} · 市場調整 {analysis.market_adjustment >= 0 ? "+" : ""}
            {analysis.market_adjustment}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="text-xs text-[var(--muted-fg)]">信心度</div>
          <div className="text-3xl font-bold">{analysis.confidence}%</div>
          <div className="text-xs text-[var(--muted-fg)] mt-1">
            {analysis.confidence >= 75
              ? "✅ 高信心"
              : analysis.confidence >= 60
                ? "⚡ 中等信心"
                : "⚠️ 低信心"}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="text-xs text-[var(--muted-fg)]">進場 / 停損</div>
          <div className="text-2xl font-bold font-mono">
            {fmt(analysis.risk?.entry_price)}
          </div>
          <div className="text-xs text-rose-600">
            停損 {fmt(analysis.risk?.stop_loss_price)} ({analysis.risk?.risk_pct}%)
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="text-xs text-[var(--muted-fg)]">停利 / R:R</div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {fmt(analysis.risk?.take_profit_price)}
          </div>
          <div className="text-xs text-emerald-700">
            R:R {analysis.risk?.reward_risk_ratio}:1
          </div>
        </div>
      </section>

      {/* 四象限 */}
      <section className="mb-6">
        <h2 className="font-semibold mb-3">🎯 四象限評分</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <DimCard label="基本面" dim={analysis.evidence.fundamental} max={20} />
          <DimCard label="籌碼面" dim={analysis.evidence.chip} max={20} />
          <DimCard label="技術面" dim={analysis.evidence.technical} max={20} />
          <DimCard label="題材面" dim={analysis.evidence.catalyst} max={20} />
        </div>
      </section>

      {/* 多空論點 */}
      {(analysis.bull_case.length > 0 || analysis.bear_case.length > 0) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <h3 className="font-semibold mb-3 text-emerald-700">
              ✅ 看多論點
            </h3>
            <ul className="space-y-2 text-sm">
              {analysis.bull_case.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-500">●</span>
                  <span>{b}</span>
                </li>
              ))}
              {analysis.bull_case.length === 0 && (
                <li className="text-[var(--muted-fg)]">(啟用 AI 後顯示)</li>
              )}
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4">
            <h3 className="font-semibold mb-3 text-rose-700">❌ 看空論點</h3>
            <ul className="space-y-2 text-sm">
              {analysis.bear_case.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-rose-500">●</span>
                  <span>{b}</span>
                </li>
              ))}
              {analysis.bear_case.length === 0 && (
                <li className="text-[var(--muted-fg)]">(啟用 AI 後顯示)</li>
              )}
            </ul>
          </div>
        </section>
      )}

      {/* 部位規劃 */}
      {analysis.position && (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6">
          <h2 className="font-semibold mb-3">💼 部位規劃</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-[var(--muted-fg)]">帳戶規模</div>
              <div className="font-mono font-semibold">
                {fmt(analysis.position.account_size, 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted-fg)]">單筆風險</div>
              <div className="font-mono font-semibold">
                {analysis.position.risk_pct}% ={" "}
                {fmt(analysis.position.risk_amount, 0)}
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted-fg)]">建議張數</div>
              <div className="font-mono font-semibold text-blue-600">
                {analysis.position.lots} 張
              </div>
            </div>
            <div>
              <div className="text-xs text-[var(--muted-fg)]">買入成本</div>
              <div className="font-mono font-semibold">
                {fmt(analysis.position.notional, 0)} (
                {analysis.position.notional_pct}%)
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted-fg)]">
            若打到停損最大虧損 {fmt(analysis.position.expected_loss, 0)} 元
          </div>
        </section>
      )}

      {/* AI 對話(spec 18 + 19)— 帶個股 context */}
      <section className="h-[600px]">
        <ChatPanel
          stockContext={{
            stock_id: analysis.stock_id,
            stock_name: analysis.stock_name,
            recommendation: analysis.recommendation,
            total_score: analysis.total_score,
            confidence: analysis.confidence,
            fundamental_score: analysis.evidence.fundamental.score,
            chip_score: analysis.evidence.chip.score,
            technical_score: analysis.evidence.technical.score,
            catalyst_score: analysis.evidence.catalyst.score,
            bull_case: analysis.bull_case,
            bear_case: analysis.bear_case,
            entry_price: analysis.risk?.entry_price,
            stop_loss_price: analysis.risk?.stop_loss_price,
            take_profit_price: analysis.risk?.take_profit_price,
          }}
          greeting={`我看到你在看 ${analysis.stock_id} ${analysis.stock_name}，目前系統給 ${analysis.recommendation}(${analysis.total_score}/95，信心 ${analysis.confidence}%)。問我任何事 — 我會強制給你反對論點。`}
          placeholder={`問我關於 ${analysis.stock_id} 的事...`}
        />
      </section>

      {/* 免責 */}
      <footer className="text-xs text-[var(--muted-fg)] text-center">
        {analysis.disclaimer}
      </footer>
    </main>
  );
}
