"use client";

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, ColorType, type IChartApi, type ISeriesApi } from "lightweight-charts";

type Candle = { time: string; open: number; high: number; low: number; close: number; volume?: number };

export default function KLineChart({ data, height = 500 }: { data: Candle[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      timeScale: { borderVisible: false, timeVisible: true },
      rightPriceScale: { borderVisible: false },
      crosshair: { mode: 1 },
    });
    chartRef.current = chart;

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#ef4444",       // 台股紅漲
      downColor: "#10b981",     // 台股綠跌
      wickUpColor: "#ef4444",
      wickDownColor: "#10b981",
      borderVisible: false,
    });
    candles.setData(data.map((d) => ({ time: d.time, open: d.open, high: d.high, low: d.low, close: d.close })) as any);

    // MA5, MA20, MA60
    function sma(vals: number[], p: number) {
      return vals.map((_, i) => (i < p - 1 ? null : vals.slice(i - p + 1, i + 1).reduce((a, b) => a + b, 0) / p));
    }
    const closes = data.map((d) => d.close);
    const addMA = (period: number, color: string) => {
      const ma = sma(closes, period);
      const line = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      line.setData(data.map((d, i) => (ma[i] != null ? { time: d.time, value: ma[i] } : null)).filter(Boolean) as any);
    };
    addMA(5, "#3b82f6");   // blue
    addMA(20, "#f59e0b");  // orange
    addMA(60, "#a78bfa");  // purple

    // 量
    if (data.some((d) => d.volume != null)) {
      const vol = chart.addSeries(HistogramSeries, {
        color: "#64748b",
        priceFormat: { type: "volume" },
        priceScaleId: "",
      });
      vol.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      vol.setData(data.map((d, i) => ({
        time: d.time,
        value: d.volume ?? 0,
        color: i > 0 && d.close >= data[i - 1].close ? "rgba(239,68,68,0.5)" : "rgba(16,185,129,0.5)",
      })) as any);
    }

    chart.timeScale().fitContent();

    const onResize = () => chart.applyOptions({ width: ref.current!.clientWidth });
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); chart.remove(); };
  }, [data, height]);

  return <div ref={ref} className="w-full rounded-lg overflow-hidden" />;
}
