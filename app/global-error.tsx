"use client";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="zh-TW" className="dark">
      <body className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-slate-950 text-white">
        <div className="text-8xl mb-4">💥</div>
        <h1 className="text-4xl font-bold mb-2">系統錯誤</h1>
        <p className="text-xl text-slate-400 mb-6">{error.message}</p>
        <button onClick={reset} className="px-6 py-3 rounded-lg bg-white text-black font-medium">
          重試
        </button>
      </body>
    </html>
  );
}
