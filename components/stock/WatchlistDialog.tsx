"use client";

import { useState } from "react";

type Props = {
  symbol: string;
  stockName?: string;
  onClose: () => void;
  onSaved: () => void;
};

const CATEGORIES = ["半導體", "AI / 伺服器", "電子", "金融", "生技", "航運", "傳產", "ETF", "題材股", "其他"];

export default function WatchlistDialog({ symbol, stockName, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    symbol,
    stock_name: stockName ?? symbol,
    category: "半導體",
    notes: "",
    target_buy: "",
    target_sell: "",
    stop_loss: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload = {
      symbol: form.symbol,
      market: "TW",
      stock_name: form.stock_name,
      category: form.category,
      notes: form.notes || null,
      target_buy: form.target_buy ? Number(form.target_buy) : null,
      target_sell: form.target_sell ? Number(form.target_sell) : null,
      stop_loss: form.stop_loss ? Number(form.stop_loss) : null,
    };
    const r = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (r.ok) { onSaved(); onClose(); }
    else alert("儲存失敗");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">加入自選：{form.stock_name}</h2>

        <label className="block">
          <span className="text-sm text-muted-fg">分類</span>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg bg-muted border border-border"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="text-xs text-muted-fg">目標買價</span>
            <input
              type="number" step="0.01"
              value={form.target_buy}
              onChange={(e) => setForm({ ...form, target_buy: e.target.value })}
              className="w-full mt-1 px-2 py-2 rounded-lg bg-muted border border-border font-mono text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-fg">目標賣價</span>
            <input
              type="number" step="0.01"
              value={form.target_sell}
              onChange={(e) => setForm({ ...form, target_sell: e.target.value })}
              className="w-full mt-1 px-2 py-2 rounded-lg bg-muted border border-border font-mono text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-muted-fg">停損價</span>
            <input
              type="number" step="0.01"
              value={form.stop_loss}
              onChange={(e) => setForm({ ...form, stop_loss: e.target.value })}
              className="w-full mt-1 px-2 py-2 rounded-lg bg-muted border border-border font-mono text-sm"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm text-muted-fg">備註</span>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="投資理由 / 催化劑 / 觀察點..."
            className="w-full mt-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm"
          />
        </label>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-muted hover:bg-border">取消</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2 rounded-lg bg-primary text-primary-fg hover:opacity-90 disabled:opacity-50">
            {saving ? "儲存中..." : "儲存"}
          </button>
        </div>
      </div>
    </div>
  );
}
