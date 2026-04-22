"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, AreaSeries, ColorType, type IChartApi } from "lightweight-charts";

type Point = { time: string; value: number };

const RANGES = [
  { label: "1D", days: 1 },
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
];

export default function InteractiveIndexChart({ symbol = "^TWII", label = "加權指數" }: { symbol?: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [range, setRange] = useState(90);
  const [data, setData] = useState<Point[]>([]);
  const [latest, setLatest] = useState<{ price: number; change: number; changePct: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&days=${range}`);
        const j = await r.json() as { points: Point[]; latest?: typeof latest };
        setData(j.points ?? []);
        setLatest(j.latest ?? null);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [symbol, range]);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;
    const chart = createChart(ref.current, {
      height: 300,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#5c6472" },
      grid: {
        vertLines: { color: "rgba(0,0,0,0.04)" },
        horzLines: { color: "rgba(0,0,0,0.04)" },
      },
      timeScale: { borderVisible: false, timeVisible: range <= 7 },
      rightPriceScale: { borderVisible: false },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const up = (latest?.change ?? 0) >= 0;
    const color = up ? "#dc2626" : "#059669";
    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: up ? "rgba(220, 38, 38, 0.25)" : "rgba(5, 150, 105, 0.25)",
      bottomColor: up ? "rgba(220, 38, 38, 0.0)" : "rgba(5, 150, 105, 0.0)",
      lineWidth: 2,
      priceLineVisible: false,
    });
    series.setData(data as any);
    chart.timeScale().fitContent();

    const onR = () => chart.applyOptions({ width: ref.current!.clientWidth });
    window.addEventListener("resize", onR);
    return () => { window.removeEventListener("resize", onR); chart.remove(); };
  }, [data, range, latest]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm text-muted-fg">🐰 {label}</div>
          {latest && (
            <div className="flex items-baseline gap-3 mt-1">
              <div className="text-3xl font-mono font-bold">{latest.price.toFixed(2)}</div>
              <div className={`text-sm font-mono font-semibold ${latest.change >= 0 ? "text-up" : "text-down"}`}>
                {latest.change >= 0 ? "▲" : "▼"} {Math.abs(latest.change).toFixed(2)} ({latest.changePct.toFixed(2)}%)
              </div>
            </div>
          )}
        </div>
        <div className="flex rounded-lg bg-muted p-0.5 text-xs">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r.days)}
              className={`px-2 py-1 rounded font-medium transition ${
                range === r.days ? "bg-card shadow text-fg" : "text-muted-fg hover:text-fg"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="h-[300px] flex items-center justify-center text-muted-fg">載入中...</div>
      ) : data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted-fg">無資料</div>
      ) : (
        <div ref={ref} className="w-full" />
      )}
    </div>
  );
}
