"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="text-8xl mb-4">⚠️</div>
      <h1 className="text-4xl font-bold mb-2">系統繁忙</h1>
      <p className="text-xl text-muted-fg mb-2">資料源可能短暫中斷，請稍後再試</p>
      <p className="text-xs text-muted-fg mb-6 max-w-md font-mono">{error.message}</p>
      <div className="flex gap-3">
        <button onClick={reset} className="px-6 py-3 rounded-lg bg-primary text-primary-fg font-medium">
          重試
        </button>
        <Link href="/dashboard" className="px-6 py-3 rounded-lg bg-card border border-border">
          回首頁
        </Link>
      </div>
    </main>
  );
}
