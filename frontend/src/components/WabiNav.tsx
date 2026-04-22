import Link from "next/link";

const LINKS = [
  { href: "/", label: "主頁", icon: "主" },
  { href: "/market", label: "大盤", icon: "盤" },
  { href: "/chat", label: "AI 夥伴", icon: "談" },
  { href: "/backtest", label: "回測", icon: "驗" },
  { href: "/paper", label: "模擬", icon: "練" },
];

export function WabiNav({ currentPath }: { currentPath?: string }) {
  return (
    <nav className="flex gap-1 flex-wrap">
      {LINKS.map((n) => {
        const active = currentPath === n.href;
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`wabi-btn text-xs ${active ? "wabi-btn-primary" : ""}`}
          >
            <span className="font-serif opacity-60 text-[10px]">{n.icon}</span>
            <span>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
