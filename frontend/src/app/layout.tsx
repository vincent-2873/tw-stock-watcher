import type { Metadata, Viewport } from "next";
import {
  Noto_Serif_TC,
  Noto_Sans_TC,
  JetBrains_Mono,
  Shippori_Mincho,
  Zen_Maru_Gothic,
  Cormorant_Garamond,
} from "next/font/google";
import "./globals.css";
import { QuackFloating } from "@/components/quack/QuackFloating";

const serif = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif-loaded",
  display: "swap",
});

const sans = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans-loaded",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono-loaded",
  display: "swap",
});

// ===== 禪風 v3 日文字體(Phase 1 Day 1-2) =====
const mincho = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-mincho-loaded",
  display: "swap",
});

const maru = Zen_Maru_Gothic({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-maru-loaded",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "呱呱投資招待所 · Quack House",
  description: "一隻呱呱,陪你想清楚每一筆。",
  manifest: "/manifest.json",
  applicationName: "呱呱投資招待所",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "呱呱招待所",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F5F0E6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-TW"
      className={`${serif.variable} ${sans.variable} ${mono.variable} ${mincho.variable} ${maru.variable} ${cormorant.variable}`}
    >
      <body>
        {children}
        <QuackFloating />
      </body>
    </html>
  );
}
