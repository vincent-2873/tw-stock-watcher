import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-4"><Link href="/dashboard" className="text-muted-fg hover:text-fg">← 回大盤</Link></div>
      <h1 className="text-3xl font-bold mb-2">🔬 個股健檢</h1>
      <p className="text-muted-fg mb-6">輸入股票代號，立即得到技術 / 籌碼 / 情緒綜合評分（0-100）</p>

      <form action="" className="flex gap-2 mb-6">
        <input
          name="code"
          placeholder="股票代號（例：2330）"
          className="flex-1 px-4 py-3 rounded-lg bg-card border border-border font-mono text-lg"
        />
        <Link
          href="/stock"
          className="px-6 py-3 rounded-lg bg-primary text-primary-fg font-semibold inline-flex items-center"
        >
          開始健檢 →
        </Link>
      </form>

      <section className="grid md:grid-cols-3 gap-4">
        {[
          { title: "技術面 40%", items: ["MA 多空排列", "RSI 超買 / 超賣", "MACD 黃金 / 死亡交叉", "布林通道突破"] },
          { title: "籌碼面 40%", items: ["外資 / 投信 / 自營買賣超", "融資券變化", "借券餘額", "分點進出"] },
          { title: "新聞情緒 20%", items: ["AI 判讀利多 / 利空", "近期新聞密度", "產業連動", "題材熱度"] },
        ].map((b) => (
          <div key={b.title} className="p-4 rounded-xl bg-card border border-border">
            <h3 className="font-semibold mb-2">{b.title}</h3>
            <ul className="space-y-1 text-sm text-muted-fg">
              {b.items.map((i) => <li key={i}>• {i}</li>)}
            </ul>
          </div>
        ))}
      </section>

      <section className="mt-8 p-6 rounded-xl bg-card border border-border">
        <h2 className="font-semibold mb-3">評分標準</h2>
        <div className="grid grid-cols-5 gap-2 text-center text-sm">
          {[
            { grade: "A+", range: "85-100", color: "text-up" },
            { grade: "A", range: "70-84", color: "text-up/80" },
            { grade: "B", range: "55-69", color: "text-muted-fg" },
            { grade: "C", range: "40-54", color: "text-warning" },
            { grade: "D", range: "0-39", color: "text-down" },
          ].map((g) => (
            <div key={g.grade} className="p-3 rounded-lg bg-muted">
              <div className={`text-2xl font-bold ${g.color}`}>{g.grade}</div>
              <div className="text-xs text-muted-fg">{g.range}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
