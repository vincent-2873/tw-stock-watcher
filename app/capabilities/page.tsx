import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "功能一覽 — 這個 App 能做什麼",
  description:
    "TW Stock Watcher 能提供的功能清單：即時看盤、技術分析、籌碼追蹤、新聞情緒、個股健檢、自選股與跨市場監控。",
};

type Capability = {
  emoji: string;
  title: string;
  summary: string;
  features: string[];
  href?: string;
  cta?: string;
  requireLogin?: boolean;
};

const CAPABILITIES: Capability[] = [
  {
    emoji: "📊",
    title: "大盤儀表板",
    summary: "一眼掌握台股、美股、指數與期貨，以及當日強弱勢個股。",
    features: [
      "台股加權、櫃買、期貨即時報價",
      "道瓊、NASDAQ、費半、台積電 ADR",
      "今日強勢 / 弱勢股 Top 10",
      "跨市場 Ticker 輪播",
    ],
    href: "/dashboard",
    cta: "進入大盤",
    requireLogin: true,
  },
  {
    emoji: "🔍",
    title: "個股深度分析",
    summary: "輸入股票代號，看 K 線、指標與基本資料。",
    features: [
      "日 K 線、成交量",
      "MA、MACD、RSI、KD、布林通道",
      "量價背離提示",
      "產業與競品連動",
    ],
    href: "/stock",
    cta: "查詢個股",
    requireLogin: true,
  },
  {
    emoji: "🔬",
    title: "個股健檢",
    summary: "技術 40% + 籌碼 40% + 情緒 20%，一鍵打出 0–100 綜合評分。",
    features: [
      "A+ / A / B / C / D 分級",
      "技術面：均線、RSI、MACD、布林",
      "籌碼面：三大法人、融資券、借券",
      "新聞情緒：利多 / 利空 / 中性",
    ],
    href: "/health",
    cta: "開始健檢",
    requireLogin: true,
  },
  {
    emoji: "💰",
    title: "籌碼追蹤",
    summary: "看得到大戶在做什麼，避免被洗出場。",
    features: [
      "外資、投信、自營買賣超",
      "融資融券餘額與變化",
      "借券餘額",
      "分點進出（規劃中）",
    ],
    href: "/chips",
    cta: "看籌碼",
    requireLogin: true,
  },
  {
    emoji: "📰",
    title: "新聞情緒",
    summary: "爬鉅亨網 RSS，詞典法自動判讀利多 / 利空 / 中性並標記個股。",
    features: [
      "每 10 分鐘自動更新",
      "利多 / 利空 / 中性分數",
      "自動標出相關個股代號",
      "點新聞可直接跳個股頁",
    ],
    href: "/news",
    cta: "看新聞",
    requireLogin: true,
  },
  {
    emoji: "📑",
    title: "盤前 / 盤中 / 盤後報告",
    summary: "依時段自動切換，帶你快速看完今天該看的東西。",
    features: [
      "美股收盤速覽",
      "台股大盤與期貨",
      "匯率（USD / JPY）",
      "昨日三大法人買賣超",
    ],
    href: "/briefing",
    cta: "看報告",
    requireLogin: true,
  },
  {
    emoji: "⭐",
    title: "自選股",
    summary: "雲端同步的個人觀察清單。",
    features: [
      "Supabase 雲端同步",
      "跨裝置共用",
      "一鍵跳個股頁",
      "多清單（規劃中）",
    ],
    href: "/watchlist",
    cta: "我的自選",
    requireLogin: true,
  },
  {
    emoji: "🔔",
    title: "警示推播（開發中）",
    summary: "RSI 超買超賣、突破、籌碼異動、利空新聞 — 會主動通知你。",
    features: [
      "RSI / MACD 技術訊號",
      "關鍵價位突破",
      "三大法人異常買賣",
      "LINE / Discord / Email",
    ],
  },
  {
    emoji: "📱",
    title: "手機優先 + PWA",
    summary: "完全手機優先設計，可加入主畫面離線使用。",
    features: [
      "Bottom Navigation",
      "PWA 安裝到桌面",
      "安全區域適配",
      "深色模式",
    ],
  },
];

export default function CapabilitiesPage() {
  return (
    <main className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/" className="text-muted-fg hover:text-fg">
          ← 回首頁
        </Link>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl md:text-5xl font-bold mb-3">
          這個 App 能做什麼
        </h1>
        <p className="text-muted-fg text-lg">
          TW Stock Watcher 是一站式台股情報平台 — 即時看盤、技術分析、籌碼追蹤、新聞情緒、個股健檢、跨市場聯動。
        </p>
      </header>

      <section className="grid md:grid-cols-2 gap-4">
        {CAPABILITIES.map((c) => (
          <article
            key={c.title}
            className="p-5 rounded-xl bg-card border border-border flex flex-col"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="text-3xl leading-none">{c.emoji}</div>
              <div className="flex-1">
                <h2 className="font-semibold text-lg">{c.title}</h2>
                <p className="text-sm text-muted-fg mt-1">{c.summary}</p>
              </div>
            </div>

            <ul className="text-sm space-y-1 mb-4 flex-1">
              {c.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-muted-fg">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {c.href && c.cta && (
              <Link
                href={c.href}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-fg font-semibold text-sm hover:opacity-90 transition"
              >
                {c.cta} →
                {c.requireLogin && (
                  <span className="ml-2 text-xs opacity-70">需登入</span>
                )}
              </Link>
            )}
          </article>
        ))}
      </section>

      <section className="mt-10 p-5 rounded-xl bg-card border border-border">
        <h2 className="font-semibold text-lg mb-3">🔌 資料來源</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {[
            ["TWSE OpenAPI", "台股歷史 / 個股"],
            ["FinMind", "三大法人 / 融資券"],
            ["Fugle", "即時報價"],
            ["yfinance", "美股 / 期貨"],
            ["鉅亨網 RSS", "台股新聞"],
            ["NewsAPI", "國際新聞"],
          ].map(([name, use]) => (
            <div key={name} className="p-3 rounded-lg bg-muted">
              <div className="font-semibold">{name}</div>
              <div className="text-xs text-muted-fg">{use}</div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted-fg text-center mt-8">
        ⚠️ 本站所有資訊僅供參考，不構成投資建議。投資人須自行判斷並承擔風險。
      </p>
    </main>
  );
}
