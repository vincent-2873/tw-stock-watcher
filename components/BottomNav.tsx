"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "大盤", icon: "📊" },
  { href: "/briefing", label: "報告", icon: "📰" },
  { href: "/screener", label: "選股", icon: "🎯" },
  { href: "/watchlist", label: "自選", icon: "⭐" },
  { href: "/trades", label: "紀錄", icon: "📒" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const hide = pathname === "/" || pathname === "/login";
  if (hide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur border-t border-border shadow-card-hover">
      <div className="grid grid-cols-5 gap-1 p-1 pb-safe">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg transition ${
                active ? "bg-primary/10 text-primary" : "text-muted-fg hover:text-fg"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
