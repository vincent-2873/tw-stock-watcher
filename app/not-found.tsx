import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
      <div className="text-8xl mb-4">📉</div>
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-xl text-muted-fg mb-6">這個頁面好像跟您的投資一樣，找不到了</p>
      <div className="flex gap-3">
        <Link href="/dashboard" className="px-6 py-3 rounded-lg bg-primary text-primary-fg font-medium">
          回到大盤
        </Link>
        <Link href="/stock" className="px-6 py-3 rounded-lg bg-card border border-border">
          查個股
        </Link>
      </div>
    </main>
  );
}
