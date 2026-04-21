import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  metadataBase: new URL("https://tw-stock-watcher.zeabur.app"),
  title: {
    default: "TW Stock Watcher — 台股分析看盤平台",
    template: "%s · TW Stock Watcher",
  },
  description: "免費台股即時看盤、K 線技術分析、三大法人籌碼、AI 新聞情緒、個股健檢、跨市場（台股/美股/期貨）聯動追蹤。",
  manifest: "/manifest.json",
  keywords: ["台股", "看盤", "技術分析", "籌碼", "三大法人", "個股健檢", "RSI", "MACD", "KD", "新聞情緒", "AI 股票"],
  authors: [{ name: "TW Stock Watcher" }],
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "https://tw-stock-watcher.zeabur.app",
    title: "TW Stock Watcher — 台股分析看盤平台",
    description: "即時看盤 + 技術分析 + 籌碼追蹤 + AI 個股健檢",
    siteName: "TW Stock Watcher",
  },
  twitter: {
    card: "summary_large_image",
    title: "TW Stock Watcher",
    description: "台股分析看盤平台",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className="dark">
      <body className="pb-16 md:pb-0">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
