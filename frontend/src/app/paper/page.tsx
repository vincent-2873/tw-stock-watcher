"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchPaperAccount,
  fetchPaperTrades,
  placePaperOrder,
  resetPaperAccount,
  type PaperAccount,
} from "@/lib/api";

function fmt(n?: number | null, d = 0) {
  if (n == null) return "-";
  return n.toLocaleString("zh-TW", { maximumFractionDigits: d });
}

function colorPnl(n?: number) {
  if (n == null || n === 0) return "text-[var(--muted-fg)]";
  return n > 0 ? "text-rose-600" : "text-emerald-600";
}

export default function PaperPage() {
  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [trades, setTrades] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 下單表單
  const [stockId, setStockId] = useState("2330");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [shares, setShares] = useState(1000);
  const [ordering, setOrdering] = useState(false);
  const [orderMsg, setOrderMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [acc, tr] = await Promise.all([
        fetchPaperAccount(),
        fetchPaperTrades(),
      ]);
      setAccount(acc);
      setTrades(tr.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const submit = async () => {
    if (shares <= 0 || shares % 1000 !== 0) {
      setOrderMsg("股數必須為 1000 的倍數");
      return;
    }
    setOrdering(true);
    setOrderMsg(null);
    try {
      const r = await placePaperOrder({ stock_id: stockId, action, shares });
      setOrderMsg(`✅ ${r.message} (剩餘現金 ${fmt(r.cash_after, 0)})`);
      await reload();
    } catch (e) {
      setOrderMsg(`❌ ${(e as Error).message}`);
    } finally {
      setOrdering(false);
    }
  };

  const resetAcc = async () => {
    if (!confirm("確定重設?持倉與交易全部清空,現金回歸初始 100 萬。")) return;
    try {
      await resetPaperAccount();
      setOrderMsg("帳戶已重設");
      await reload();
    } catch (e) {
      setOrderMsg(`❌ ${(e as Error).message}`);
    }
  };

  return (
    <main className="min-h-screen px-4 py-6 md:px-6 md:py-8 wabi-enter">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold">模擬交易</h1>
          <p className="text-sm text-[var(--muted-fg)] font-serif italic mt-1">
            虛擬百萬資金練手 · 含手續費 0.1425% 與證交稅 0.3%
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetAcc}
            className="px-3 py-1.5 rounded-md border border-rose-300 text-rose-600 hover:bg-rose-50 text-sm"
          >
            重設
          </button>
          <Link
            href="/"
            className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--muted)] text-sm"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {loading && <p className="text-[var(--muted-fg)]">載入中...</p>}
      {error && <p className="text-rose-500">⚠️ {error}</p>}

      {account && (
        <>
          {/* 帳戶總覽 */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard
              label="總資產"
              value={fmt(account.total, 0)}
              sub={`初始 ${fmt(account.initial_capital, 0)}`}
            />
            <StatCard
              label="總報酬"
              value={`${account.total_return_pct >= 0 ? "+" : ""}${fmt(account.total_return_pct, 2)}%`}
              sub=""
              color={colorPnl(account.total_return_pct)}
            />
            <StatCard
              label="現金"
              value={fmt(account.cash, 0)}
              sub={`持倉 ${fmt(account.market_value, 0)}`}
            />
            <StatCard
              label="已實現"
              value={fmt(account.total_pnl, 0)}
              sub={`交易 ${account.closed_trades} / 勝 ${account.winning_trades}`}
              color={colorPnl(account.total_pnl)}
            />
          </section>

          {/* 下單 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 mb-6">
            <h3 className="font-semibold mb-3">下單</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="text-xs text-[var(--muted-fg)]">股票代號</label>
                <input
                  type="text"
                  value={stockId}
                  onChange={(e) => setStockId(e.target.value.trim())}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--muted-fg)]">動作</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as "buy" | "sell")}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)]"
                >
                  <option value="buy">買進</option>
                  <option value="sell">賣出</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--muted-fg)]">
                  股數(1 張 = 1000 股)
                </label>
                <input
                  type="number"
                  step={1000}
                  min={1000}
                  value={shares}
                  onChange={(e) => setShares(parseInt(e.target.value) || 1000)}
                  className="w-full mt-1 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--bg)] font-mono"
                />
                <p className="text-[11px] text-[var(--muted-fg)]">
                  = {shares / 1000} 張
                </p>
              </div>
              <div className="text-xs text-[var(--muted-fg)]">
                成交價用當日收盤
                <br />
                FinMind 最新報價
              </div>
              <button
                onClick={submit}
                disabled={ordering}
                className={`px-4 py-2 rounded-md text-white font-semibold disabled:opacity-50 ${
                  action === "buy"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {ordering ? "送單中..." : action === "buy" ? "買進" : "賣出"}
              </button>
            </div>
            {orderMsg && <p className="text-sm mt-3">{orderMsg}</p>}
          </section>

          {/* 持倉 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-baseline justify-between">
              <h3 className="font-semibold">持倉 ({account.positions.length})</h3>
              {account.error && (
                <span className="text-xs text-rose-500">⚠️ {account.error}</span>
              )}
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-[var(--muted-fg)] bg-[var(--muted)]">
                <tr>
                  <th className="text-left px-4 py-2">代號</th>
                  <th className="text-right px-4 py-2">股數</th>
                  <th className="text-right px-4 py-2">均價</th>
                  <th className="text-right px-4 py-2">現價</th>
                  <th className="text-right px-4 py-2">市值</th>
                  <th className="text-right px-4 py-2">未實現</th>
                </tr>
              </thead>
              <tbody>
                {account.positions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-[var(--muted-fg)]">
                      尚未持倉。下單後會顯示在這裡。
                    </td>
                  </tr>
                )}
                {account.positions.map((p) => (
                  <tr
                    key={p.stock_id}
                    className="border-t border-[var(--border)] hover:bg-[var(--muted)]/40"
                  >
                    <td className="px-4 py-2 font-mono font-semibold">{p.stock_id}</td>
                    <td className="text-right px-4 py-2 font-mono">
                      {fmt(p.shares, 0)}
                    </td>
                    <td className="text-right px-4 py-2 font-mono">
                      {fmt(p.avg_cost, 2)}
                    </td>
                    <td className="text-right px-4 py-2 font-mono">
                      {fmt(p.current_price, 2)}
                    </td>
                    <td className="text-right px-4 py-2 font-mono">
                      {fmt(p.market_value, 0)}
                    </td>
                    <td
                      className={`text-right px-4 py-2 font-mono ${colorPnl(p.unrealized_pnl)}`}
                    >
                      {p.unrealized_pnl >= 0 ? "+" : ""}
                      {fmt(p.unrealized_pnl, 0)} (
                      {p.unrealized_pnl_pct >= 0 ? "+" : ""}
                      {fmt(p.unrealized_pnl_pct, 2)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 最近交易 */}
          <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)]">
              <h3 className="font-semibold">最近交易 ({trades.length})</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-[var(--muted-fg)] bg-[var(--muted)]">
                <tr>
                  <th className="text-left px-4 py-2">時間</th>
                  <th className="text-left px-4 py-2">代號</th>
                  <th className="text-left px-4 py-2">狀態</th>
                  <th className="text-right px-4 py-2">股數</th>
                  <th className="text-right px-4 py-2">進場價</th>
                  <th className="text-right px-4 py-2">出場價</th>
                  <th className="text-right px-4 py-2">損益</th>
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-[var(--muted-fg)]">
                      尚無交易紀錄
                    </td>
                  </tr>
                )}
                {trades.slice(0, 30).map((t, i) => {
                  const pnl = t.pnl as number | null;
                  return (
                    <tr key={(t.id as string) || i} className="border-t border-[var(--border)]">
                      <td className="px-4 py-2 font-mono text-xs">
                        {t.entry_time
                          ? new Date(t.entry_time as string).toLocaleString("zh-TW", {
                              hour12: false,
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-2 font-mono">{t.stock_id as string}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            t.status === "open"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-slate-500/10 text-slate-600"
                          }`}
                        >
                          {t.status === "open" ? "持倉中" : "已平倉"}
                        </span>
                      </td>
                      <td className="text-right px-4 py-2 font-mono">
                        {fmt(t.quantity as number, 0)}
                      </td>
                      <td className="text-right px-4 py-2 font-mono">
                        {fmt(t.entry_price as number, 2)}
                      </td>
                      <td className="text-right px-4 py-2 font-mono">
                        {t.exit_price ? fmt(t.exit_price as number, 2) : "-"}
                      </td>
                      <td
                        className={`text-right px-4 py-2 font-mono ${colorPnl(pnl ?? undefined)}`}
                      >
                        {pnl != null
                          ? `${pnl >= 0 ? "+" : ""}${fmt(pnl, 0)}`
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
      <div className="text-xs text-[var(--muted-fg)]">{label}</div>
      <div className={`text-xl font-bold font-mono ${color || ""}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--muted-fg)] mt-0.5">{sub}</div>}
    </div>
  );
}
