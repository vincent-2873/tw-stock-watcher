"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Trade = {
  id: string; symbol: string; action: "buy" | "sell";
  quantity: number; price: number; fee: number; tax: number;
  trade_date: string; notes: string | null;
};

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [form, setForm] = useState({
    symbol: "", action: "buy", quantity: "", price: "",
    fee: "", tax: "", trade_date: new Date().toISOString().slice(0, 10), notes: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await fetch("/api/trades");
    if (r.ok) setTrades((await r.json()).trades ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/trades", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      setShowForm(false);
      setForm({ ...form, symbol: "", quantity: "", price: "", fee: "", tax: "", notes: "" });
      load();
    } else alert("儲存失敗");
  }

  async function del(id: string) {
    if (!confirm("確定刪除？")) return;
    const r = await fetch(`/api/trades?id=${id}`, { method: "DELETE" });
    if (r.ok) load();
  }

  // 統計
  const totalTrades = trades.length;
  const totalVolume = trades.reduce((s, t) => s + t.quantity * t.price, 0);
  const positions = new Map<string, number>();
  for (const t of trades) {
    const delta = t.action === "buy" ? t.quantity : -t.quantity;
    positions.set(t.symbol, (positions.get(t.symbol) ?? 0) + delta);
  }
  const holding = Array.from(positions.entries()).filter(([, q]) => q !== 0);

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-4"><Link href="/dashboard" className="text-muted-fg hover:text-fg">← 回大盤</Link></div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">📒 交易紀錄</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-primary text-primary-fg font-medium"
        >
          {showForm ? "關閉" : "+ 新增"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <div className="text-xs text-muted-fg">總筆數</div>
          <div className="text-2xl font-bold">{totalTrades}</div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <div className="text-xs text-muted-fg">累計金額</div>
          <div className="text-2xl font-bold font-mono">{(totalVolume / 10000).toFixed(1)}萬</div>
        </div>
        <div className="p-3 rounded-lg bg-card border border-border text-center">
          <div className="text-xs text-muted-fg">持倉檔數</div>
          <div className="text-2xl font-bold">{holding.length}</div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="p-4 rounded-xl bg-card border border-border mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="代號 (2330)" value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              className="px-3 py-2 rounded-lg bg-muted border border-border font-mono" />
            <select value={form.action}
              onChange={(e) => setForm({ ...form, action: e.target.value })}
              className="px-3 py-2 rounded-lg bg-muted border border-border">
              <option value="buy">買進</option>
              <option value="sell">賣出</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input required type="number" placeholder="股數" value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="px-3 py-2 rounded-lg bg-muted border border-border font-mono" />
            <input required type="number" step="0.01" placeholder="價格" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="px-3 py-2 rounded-lg bg-muted border border-border font-mono" />
            <input required type="date" value={form.trade_date}
              onChange={(e) => setForm({ ...form, trade_date: e.target.value })}
              className="px-3 py-2 rounded-lg bg-muted border border-border" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" step="0.01" placeholder="手續費 (選)" value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value })}
              className="px-3 py-2 rounded-lg bg-muted border border-border font-mono" />
            <input type="number" step="0.01" placeholder="交易稅 (選)" value={form.tax}
              onChange={(e) => setForm({ ...form, tax: e.target.value })}
              className="px-3 py-2 rounded-lg bg-muted border border-border font-mono" />
          </div>
          <textarea rows={2} placeholder="備註（買進理由 / 賣出原因）" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-muted border border-border" />
          <button className="w-full py-2 rounded-lg bg-primary text-primary-fg font-medium">儲存</button>
        </form>
      )}

      {loading ? <div className="text-muted-fg">載入中...</div> :
       trades.length === 0 ? (
        <div className="p-8 rounded-xl bg-card border border-border text-center text-muted-fg">
          尚無交易紀錄
        </div>
       ) : (
        <div className="space-y-2">
          {trades.map((t) => (
            <div key={t.id} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    t.action === "buy" ? "bg-up/20 text-up" : "bg-down/20 text-down"
                  }`}>
                    {t.action === "buy" ? "買" : "賣"}
                  </span>
                  <Link href={`/stock/${t.symbol}`} className="font-mono font-medium">{t.symbol}</Link>
                  <span className="text-sm text-muted-fg">{t.trade_date}</span>
                </div>
                <div className="text-sm mt-1">
                  <span className="font-mono">{t.quantity.toLocaleString()} 股 × {t.price}</span>
                  <span className="text-muted-fg ml-2">= {(t.quantity * t.price).toLocaleString()}</span>
                </div>
                {t.notes && <div className="text-xs text-muted-fg mt-1">{t.notes}</div>}
              </div>
              <button onClick={() => del(t.id)} className="px-3 py-1 text-xs text-muted-fg hover:text-down">
                刪除
              </button>
            </div>
          ))}
        </div>
       )}
    </main>
  );
}
