"use client";

import { useEffect, useRef } from "react";
import { createChart, LineSeries, HistogramSeries, ColorType, type IChartApi } from "lightweight-charts";

type Point = { time: string; value: number };

export default function IndicatorsChart({
  title, data, color = "#3b82f6", type = "line", height = 160, zeroLine = false,
}: {
  title: string;
  data: Point[];
  color?: string;
  type?: "line" | "histogram";
  height?: number;
  zeroLine?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    const chart = createChart(ref.current, {
      height,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#9ca3af" },
      grid: { vertLines: { color: "rgba(255,255,255,0.05)" }, horzLines: { color: "rgba(255,255,255,0.05)" } },
      timeScale: { borderVisible: false, timeVisible: true },
      rightPriceScale: { borderVisible: false },
    });
    chartRef.current = chart;

    if (type === "line") {
      const s = chart.addSeries(LineSeries, { color, lineWidth: 2, priceLineVisible: false });
      s.setData(data as any);
    } else {
      const s = chart.addSeries(HistogramSeries, { color, priceFormat: { type: "volume" } });
      s.setData(data.map((d) => ({ ...d, color: d.value >= 0 ? "#ef4444" : "#10b981" })) as any);
    }

    chart.timeScale().fitContent();
    const onR = () => chart.applyOptions({ width: ref.current!.clientWidth });
    window.addEventListener("resize", onR);
    return () => { window.removeEventListener("resize", onR); chart.remove(); };
  }, [data, color, type, height]);

  return (
    <div>
      <div className="text-xs text-muted-fg mb-1">{title}</div>
      <div ref={ref} className="w-full rounded-lg overflow-hidden" />
    </div>
  );
}
