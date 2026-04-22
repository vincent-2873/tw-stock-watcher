import { ChatPanel } from "@/components/chat/ChatPanel";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <main className="mx-auto flex h-[100dvh] max-w-4xl flex-col px-4 py-4 md:py-6 wabi-enter">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-semibold">AI 夥伴</h1>
          <p className="text-xs text-[var(--muted-fg)] font-serif italic">
            Claude Sonnet 4.5 · 強制多空平衡 · 會質疑你的情緒化決策
          </p>
        </div>
        <Link
          href="/"
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--muted)]"
        >
          ← 回 Dashboard
        </Link>
      </header>
      <div className="min-h-0 flex-1">
        <ChatPanel />
      </div>
    </main>
  );
}
