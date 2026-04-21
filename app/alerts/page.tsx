"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Alert = {
  id: string; symbol: string; enabled: boolean; channel: string;
  condition: { type: string; value: number };
  triggered_at: string | null; created_at: string;
};

const CONDITION_TYPES = [
  { value: "price_above", label: "價格 ≥" },
  { value: "price_below", label: "價格 ≤" },
  { value: "change_above", label: "漲幅 ≥ %" },
  { value: "change_below", label: "跌幅 ≥ %" },
  { value: "rsi_above", label: "RSI ≥" },
  { value: "rsi_below", label: "RSI ≤" },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [form, setForm] = useState({ symbol: "", type: "price_above", value: "", channel: "email" });
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const r = await fetch("/api/alerts");
    if (r.ok) setAlerts((await r.json()).alerts ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        symbol: form.symbol,
        condition: { type: form.type, value: Number(form.value) },
        channel: form.channel,
      }),
    });
    if (r.ok) { setShowForm(false); setForm({ ...form, symbol: "", value: "" }); load(); }
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, enabled }),
    });
    load();
  }

  async function del(id: string) {
    if (!confirm("刪除這個警示？")) return;
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-4"><Link href="/dashboard" className="text-muted-fg hover:text-fg">← 回大盤</Link></div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🔔 警示規則</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-primary text-primary-fg font-medium">
          {showForm ? "關閉" : "+ 新增"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="p-4 rounded-xl bg-card border border-border mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="股票代號 (2330)" value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              className="px-3 py-2 rounded-lg bg-muted border border-border font-mono" />
            <select value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="px-3 py-2 rounded-lg bg-muted border border-border">
              {CONDITION_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input required type="number" step="0.01" placeholder="觸發值" value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="px-3 py-2 rounded-lg bg-muted border border-border font-mono" />
            <select value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
              className="px-3 py-2 rounded-lg bg-muted border border-border">
              <option value="email">Email</option>
              <option value="line">LINE</option>
              <option value="discord">Discord</option>
            </select>
          </div>
          <button className="w-full py-2 rounded-lg bg-primary text-primary-fg font-medium">建立警示</button>
        </form>
      )}

      {alerts.length === 0 ? (
        <div className="p-8 rounded-xl bg-card border border-border text-center text-muted-fg">
          尚無警示規則。先到 /webhooks 設定推播管道，再回來建立警示。
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const typeLabel = CONDITION_TYPES.find((c) => c.value === a.condition.type)?.label ?? a.condition.type;
            return (
              <div key={a.id} className={`p-3 rounded-xl bg-card border flex items-center justify-between ${a.enabled ? "border-border" : "border-border opacity-50"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/stock/${a.symbol}`} className="font-mono font-medium">{a.symbol}</Link>
                    <span className="text-sm">{typeLabel}</span>
                    <span className="font-mono">{a.condition.value}</span>
                  </div>
                  <div className="text-xs text-muted-fg mt-1">
                    推播: {a.channel} · {a.triggered_at ? `已觸發 ${new Date(a.triggered_at).toLocaleDateString()}` : "監測中"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggle(a.id, !a.enabled)}
                    className={`px-3 py-1 rounded text-sm ${a.enabled ? "bg-success/20 text-success" : "bg-muted"}`}>
                    {a.enabled ? "啟用中" : "已停用"}
                  </button>
                  <button onClick={() => del(a.id)} className="px-3 py-1 text-sm text-muted-fg hover:text-down">
                    刪除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
