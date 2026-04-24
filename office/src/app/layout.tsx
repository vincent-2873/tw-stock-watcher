import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "呱呱招待所 · 內部辦公室",
  description: "Quack House · Internal Office — CEO Desk, 分析師管理, 會議記錄, 系統監控",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
