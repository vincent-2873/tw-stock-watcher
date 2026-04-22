import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VSIS — Vincent Stock Intelligence System",
  description: "個人金融情報系統 — 夥伴 + 教練",
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
  themeColor: "#0b0f1a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
