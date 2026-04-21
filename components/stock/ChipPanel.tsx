"use client";

import { useEffect, useState } from "react";

type ChipRow = { date: string; buy: number; sell: number; net: number; name?: string };

export default function ChipPanel({ symbol }: { symbol: string }) {
  const [rows, setRows] = useState<ChipRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/chips?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => (r.ok ? r.json() : { rows: [] }))
      .then((d: { rows: ChipRow[] }) => setRows(d.rows ?? []))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return <div className="text-sm text-muted-fg">載入中...</div>;
  if (rows.length === 0) return <div className="text-sm text-muted-fg">近 10 日無法人買賣超資料</div>;

  // 最近 10 日合計
  const recent = rows.slice(-10);
  const totalNet = recent.reduce((s, r) => s + r.net, 0);
  const posDays = recent.filter((r) => r.net > 0).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-muted">
          <div className="text-xs text-muted-fg">10 日累計</div>
          <div className={`text-xl font-mono font-bold ${totalNet >= 0 ? "text-up" : "text-down"}`}>
            {totalNet >= 0 ? "+" : ""}{totalNet.toLocaleString()} 張
          </div>
        </div>
        <div className="p-3 rounded-lg bg-muted">
          <div className="text-xs text-muted-fg">買超天數</div>
          <div className="text-xl font-mono font-bold">{posDays} / {recent.length}</div>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-fg">
            <th className="text-left py-1">日期</th>
            <th className="text-right py-1">買進</th>
            <th className="text-right py-1">賣出</th>
            <th className="text-right py-1">淨買賣</th>
          </tr>
        </thead>
        <tbody>
          {recent.slice().reverse().map((r) => (
            <tr key={r.date} className="border-t border-border">
              <td className="py-1.5">{r.date.slice(5)}</td>
              <td className="text-right font-mono">{r.buy.toLocaleString()}</td>
              <td className="text-right font-mono">{r.sell.toLocaleString()}</td>
              <td className={`text-right font-mono font-semibold ${r.net >= 0 ? "text-up" : "text-down"}`}>
                {r.net >= 0 ? "+" : ""}{r.net.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
