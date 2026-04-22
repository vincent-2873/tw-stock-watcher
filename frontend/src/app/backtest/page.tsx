"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import {
  runBacktest,
  fetchBacktestStrategies,
  type BacktestResponse,
} from "@/lib/api";

const STRATEGY_LABELS: Record<string, string> = {
  ma_cross: "均線穿越 (20/60)",
  rsi_reversion: "RSI 均值回歸",
  buy_and_hold: "買入持有 (基準)",
};

function fmt(n: number, d = 2) {
  return n.toLocaleString("zh-TW", { maximumFractionDigits: d });
}

export default function BacktestPage() {
  const [stockId, setStockId] = useState("2330");
  const [strategy, setStrategy] = useState("ma_cross");
  const [years, setYears] = useState(2);
  const [initialCash, setInitialCash] = useState(1_000_000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<string[]>([
    "ma_cross",
    "rsi_reversion",
    "buy_and_hold",
  ]);

  useEffect(() => {
    fetchBacktestStrategies()
      .then((d) => setStrategies(d.strategies))
      .catch(() => {});
  }, []);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const start = new Date(today);
      start.setFullYear(today.getFullYear() - years);
      const r = await runBacktest({
        stock_id: stockId,
        strategy,
        start: start.toISOString().slice(0, 10),
        initial_cash: initialCash,
      });
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const equityData =
    result?.equity_curve?.map((p, i) => ({
      date: p.date,
      資產: p.equity,
      股價: p.close,
      idx: i,
    })) ?? [];

  const buyPoints = result?.trades.filter((t) => t.action === "buy") ?? [];
  const sellPoints = result?.trades.filter((t) => t.action === "sell") ?? [];

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 md:py-8 bg-[var(--bg)] text-[var(--fg)]">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">📊 歷史回測</h1>
          <p className="text-sm text-[var(--muted-fg)]">
            用歷史資料測試策略,含手續費 + 證交稅
          </p>
        </div>
        <Link
          href="/"
          className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)] text-sm"
        >
          ← 回 Dashboard
        </Link>
      </header>

      {/* 表單 */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-xs text-[var(--muted-fg)]">股票代號</label>
            <input
              type="text"
              value={stockId}
              onChange={(e) => setStockId(e.target.value.trim())}
              placeholder="例: 2330"
              className="w-full mt-1 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted-fg)]">策略</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)]"
            >
              {strategies.map((s) => (
                <option key={s} value={s}>
                  {STRATEGY_LABELS[s] || s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--muted-fg)]">
              期間(年): {years}
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={years}
              onChange={(e) => setYears(parseInt(e.target.value))}
              className="w-full mt-2"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted-fg)]">初始資金</label>
            <input
              type="number"
              step={100000}
              value={initialCash}
              onChange={(e) => setInitialCash(parseFloat(e.target.value) || 1_000_000)}
              className="w-full mt-1 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-mono"
            />
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "回測中..." : "執行回測"}
          </button>
        </div>
        {error && <p className="text-sm text-rose-500 mt-3">⚠️ {error}</p>}
      </section>

      {/* 結果 */}
      {result && (
        <>
          {/* 績效指標卡 */}
          <section className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <StatCard
              label="總報酬"
              value={`${result.total_return_pct >= 0 ? "+" : ""}${fmt(result.total_return_pct, 1)}%`}
              color={result.total_return_pct >= 0 ? "rose" : "emerald"}
            />
            <StatCard
              label="年化 CAGR"
              value={`${fmt(result.cagr_pct, 1)}%`}
              color={result.cagr_pct >= 10 ? "rose" : result.cagr_pct >= 0 ? "amber" : "emerald"}
            />
            <StatCard
              label="最大回撤"
              value={`-${fmt(result.max_drawdown_pct, 1)}%`}
              color="emerald"
            />
            <StatCard
              label="勝率"
              value={`${fmt(result.win_rate_pct, 0)}%`}
              color={result.win_rate_pct >= 55 ? "rose" : "amber"}
            />
            <StatCard
              label="夏普比"
              value={fmt(result.sharpe, 2)}
              color={result.sharpe >= 1 ? "rose" : "amber"}
            />
            <StatCard
              label="交易次數"
              value={String(result.trades_count)}
              color="slate"
            />
          </section>

          {/* 資產曲線 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-semibold">資產曲線 vs 股價</h3>
              <span className="text-xs text-[var(--muted-fg)]">
                {result.start_date} → {result.end_date} · {result.stock_id}
              </span>
            </div>
            {equityData.length > 0 && (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={equityData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    interval={Math.floor(equityData.length / 10)}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 10000).toFixed(0)}萬`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === "資產"
                        ? [`${fmt(value, 0)} 元`, name]
                        : [`${fmt(value, 2)} 元`, name]
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="資產"
                    stroke="#a25243"
                    strokeWidth={2}
                    dot={false}
                    yAxisId="left"
                  />
                  <Line
                    type="monotone"
                    dataKey="股價"
                    stroke="#7a8471"
                    strokeWidth={1.5}
                    dot={false}
                    yAxisId="right"
                  />
                  <ReferenceLine
                    y={result.initial_cash}
                    stroke="#999"
                    strokeDasharray="3 3"
                    yAxisId="left"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
            <p className="text-xs text-[var(--muted-fg)] mt-2">
              赭紅=資產,苔綠=股價,灰虛線=初始資金基準
            </p>
          </section>

          {/* 交易紀錄 */}
          {result.trades.length > 0 && (
            <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h3 className="font-semibold">交易紀錄 ({result.trades.length} 筆)</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs text-[var(--muted-fg)] bg-[var(--muted)]">
                  <tr>
                    <th className="text-left px-4 py-2">日期</th>
                    <th className="text-left px-4 py-2">動作</th>
                    <th className="text-right px-4 py-2">價位</th>
                    <th className="text-right px-4 py-2">股數</th>
                    <th className="text-right px-4 py-2">餘額</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i} className="border-t border-[var(--border)]">
                      <td className="px-4 py-2 font-mono">{t.date}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            t.action === "buy"
                              ? "bg-rose-500/10 text-rose-600"
                              : "bg-emerald-500/10 text-emerald-600"
                          }`}
                        >
                          {t.action === "buy" ? "買進" : "賣出"}
                        </span>
                      </td>
                      <td className="text-right px-4 py-2 font-mono">{fmt(t.price, 2)}</td>
                      <td className="text-right px-4 py-2 font-mono">
                        {fmt(t.shares, 0)}
                      </td>
                      <td className="text-right px-4 py-2 font-mono">
                        {fmt(t.cash_after, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      <footer className="text-xs text-[var(--muted-fg)] text-center mt-8">
        ⚠️ 歷史回測結果不代表未來績效。含手續費 0.1425% 及賣出證交稅 0.3%。
      </footer>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "rose" | "emerald" | "amber" | "slate";
}) {
  const colorCls = {
    rose: "text-rose-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    slate: "text-slate-600",
  }[color];
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="text-xs text-[var(--muted-fg)]">{label}</div>
      <div className={`text-xl font-bold font-mono ${colorCls}`}>{value}</div>
    </div>
  );
}
