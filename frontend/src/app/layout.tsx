import type { Metadata, Viewport } from "next";
import { Noto_Serif_TC, Noto_Sans_TC, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "VSIS — Vincent Stock Intelligence",
  description: "個人金融情報系統 · 夥伴 + 教練",
  manifest: "/manifest.json",
  applicationName: "VSIS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VSIS",
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
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
