import Link from "next/link";
import styles from "./page.module.css";
import {
  MarketPulseLive,
  TopicsLive,
  QuackPicksLive,
  HeadlinesLive,
} from "./home-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ===== 假資料(Phase A:先把視覺做出來,之後接 API)=====

const MARKET = [
  {
    label: "加權指數 TAIEX",
    value: "37,612",
    change: "-266 (-0.70%)",
    chgClass: "fall",
    extra: "量 8,420 億 · 跌破月線",
  },
  {
    label: "台指期",
    value: "37,520",
    change: "-1,226 (-3.16%)",
    chgClass: "fall",
    extra: "期現差 -92 · 外資偏空",
  },
  {
    label: "費城半導體",
    value: "6,845",
    change: "-2.45%",
    chgClass: "fall",
    extra: "昨夜收黑 · 拖累台股",
  },
  {
    label: "VIX 恐慌",
    value: "22.15",
    change: "+17.2%",
    chgClass: "rise",
    extra: "⚠️ 警戒區間(>20)",
  },
];

type TopicBadge = "new" | "hot" | null;
type HeatTier = "extreme" | "high" | "medium" | "low";
type TrendDir = "up" | "down" | "flat";

const TOPICS: Array<{
  rank: string;
  name: string;
  badge: TopicBadge;
  heat: number;
  trend: TrendDir;
  tier: HeatTier;
  desc: string;
  stocks: Array<{ code: string; name: string; change: number }>;
}> = [
  {
    rank: "I.",
    name: "AI 資本支出疑慮",
    badge: "new",
    heat: 85,
    trend: "down",
    tier: "extreme",
    desc: "Tesla Q1 財報 CFO 警告 2026 資本支出增至 250 億美元(原 200 億),今年剩餘時間將為負現金流。市場重估 AI 變現能力。",
    stocks: [
      { code: "3443", name: "創意", change: -5.2 },
      { code: "3661", name: "世芯", change: -6.8 },
      { code: "5274", name: "信驊", change: -4.1 },
      { code: "6669", name: "緯穎", change: -3.8 },
    ],
  },
  {
    rank: "II.",
    name: "記憶體雙雄降評",
    badge: "hot",
    heat: 75,
    trend: "down",
    tier: "high",
    desc: "大摩 4/21 報告將南亞科、華邦電價評雙降,推薦 MLC NAND(旺宏、愛普)。雙雄 4/20 合計蒸發 1,345 億市值。",
    stocks: [
      { code: "2408", name: "南亞科", change: -3.8 },
      { code: "2344", name: "華邦電", change: -5.2 },
      { code: "2337", name: "旺宏", change: 2.1 },
      { code: "6531", name: "愛普", change: 1.5 },
    ],
  },
  {
    rank: "III.",
    name: "CCL 漲價循環(補漲機會)",
    badge: null,
    heat: 65,
    trend: "up",
    tier: "medium",
    desc: "信越 4/22 宣布全線漲 10%,上游玻纖/銅箔尚未跟上主升段。資金輪動首選。",
    stocks: [
      { code: "1815", name: "富喬", change: 8.5 },
      { code: "8358", name: "金居", change: 6.1 },
      { code: "4722", name: "國精化", change: 0.0 },
      { code: "2383", name: "台光電", change: 2.3 },
    ],
  },
  {
    rank: "IV.",
    name: "低軌衛星(避險輪動)",
    badge: null,
    heat: 58,
    trend: "up",
    tier: "medium",
    desc: "AI 拉回時的資金避風港,昇達科、昇紘等逆勢走強。",
    stocks: [
      { code: "3491", name: "昇達科", change: 7.2 },
      { code: "6967", name: "昇紘", change: 4.5 },
    ],
  },
  {
    rank: "V.",
    name: "CoPoS 先進封裝",
    badge: null,
    heat: 52,
    trend: "flat",
    tier: "medium",
    desc: "台積電論壇技術焦點,中長線布局。今日隨大盤拉回。",
    stocks: [
      { code: "3680", name: "家登", change: -1.2 },
      { code: "3037", name: "欣興", change: -2.1 },
    ],
  },
];

const US_EVENTS = [
  { icon: "📉", iconClass: "fall", title: "Tesla 盤後 -5.3%(CAPEX 警告)", impact: "→ 衝擊台股 AI 族群", stocks: "創意、世芯、信驊、緯穎" },
  { icon: "📉", iconClass: "fall", title: "費半 -2.45%", impact: "→ 半導體權值開低", stocks: "台積電、聯發科" },
  { icon: "📈", iconClass: "rise", title: "Micron 盤後 +1.2%", impact: "→ 記憶體相對抗跌", stocks: "旺宏、愛普" },
  { icon: "⚠️", iconClass: "rise", title: "VIX +17% 至 22.15", impact: "→ 外資賣壓升溫", stocks: "" },
];

const FOCUS = [
  { code: "1815", name: "富喬", tag: "CCL 上游補漲首選", px: "68.5", chg: "+8.5%", dir: "rise" },
  { code: "2337", name: "旺宏", tag: "大摩推薦 MLC NAND", px: "142.5", chg: "+2.1%", dir: "rise" },
  { code: "3491", name: "昇達科", tag: "低軌衛星避險", px: "1,785", chg: "+7.2%", dir: "rise" },
  { code: "3443", name: "創意", tag: "⚠️ 漲停打開", px: "3,660", chg: "-5.2%", dir: "fall" },
  { code: "2408", name: "南亞科", tag: "⚠️ 大摩降評", px: "199.0", chg: "-3.8%", dir: "fall" },
];

type TierStatus = "🔴" | "🟡" | "🟢" | "🔥";
const PYRAMID: Array<{
  label: string;
  status: TierStatus;
  hot?: boolean;
  stocks: Array<{ code: string; change?: number; foreign?: boolean }>;
}> = [
  { label: "終端需求", status: "🔴", stocks: [{ code: "🇺🇸 NVIDIA", foreign: true }, { code: "🇺🇸 AMD", foreign: true }, { code: "🇺🇸 Apple", foreign: true }] },
  { label: "PCB 組裝", status: "🟡", stocks: [{ code: "臻鼎 4958" }, { code: "健鼎 3044" }, { code: "欣興 3037" }] },
  { label: "CCL 基板(已漲)", status: "🟢", stocks: [{ code: "台光電 2383", change: 2.3 }, { code: "台燿 6274", change: 1.8 }, { code: "聯茂 6213" }] },
  { label: "樹脂材料", status: "🟢", stocks: [{ code: "國精化 4722" }, { code: "雙鍵 4764", change: -1.2 }, { code: "崇越電 3388" }] },
  { label: "玻纖/銅箔 🔥", status: "🔥", hot: true, stocks: [{ code: "富喬 1815", change: 8.5 }, { code: "金居 8358", change: 6.1 }, { code: "德宏 5475" }] },
];

const SECTORS = [
  { name: "AI 伺服器", chg: "-3.2%", amount: "-125 億", dir: "fall", tier: "hLow" },
  { name: "記憶體", chg: "-4.1%", amount: "-62 億", dir: "fall", tier: "hCold" },
  { name: "半導體代工", chg: "-1.8%", amount: "-38 億", dir: "fall", tier: "hFlat" },
  { name: "IC 設計 (ASIC)", chg: "-4.5%", amount: "-85 億", dir: "fall", tier: "hCold" },
  { name: "CCL / 玻纖 🔥", chg: "+5.8%", amount: "+48 億", dir: "rise", tier: "hExtreme" },
  { name: "低軌衛星", chg: "+4.2%", amount: "+22 億", dir: "rise", tier: "hHigh" },
  { name: "造紙/傳產", chg: "+1.8%", amount: "+15 億", dir: "rise", tier: "hMedium" },
  { name: "金融", chg: "-0.5%", amount: "-12 億", dir: "fall", tier: "hFlat" },
];

const INFLOW = [
  { name: "CCL/玻纖", amount: "+48 億", filled: 5 },
  { name: "低軌衛星", amount: "+22 億", filled: 3 },
  { name: "造紙傳產", amount: "+15 億", filled: 2 },
  { name: "MLC NAND", amount: "+12 億", filled: 2 },
  { name: "被動元件", amount: "+8 億", filled: 1 },
];

const OUTFLOW = [
  { name: "AI 伺服器", amount: "-125 億", filled: 5 },
  { name: "ASIC / IC 設計", amount: "-85 億", filled: 4 },
  { name: "記憶體", amount: "-62 億", filled: 3 },
  { name: "半導體代工", amount: "-38 億", filled: 2 },
  { name: "散熱雙雄", amount: "-28 億", filled: 2 },
];

// ===== helpers =====
function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function StockChip({ code, change, href }: { code: string; change?: number; href?: string }) {
  const dir = change == null ? "" : change > 0 ? styles.rise : change < 0 ? styles.fall : "";
  const text = change == null ? code : `${code} ${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
  const content = <span className={cx(styles.stockChip, dir)}>{text}</span>;
  return href ? <Link href={href}>{content}</Link> : content;
}

function tpeNow() {
  const d = new Date();
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
  const tpe = new Date(utcMs + 8 * 3600 * 1000);
  const hm = tpe.getHours() * 60 + tpe.getMinutes();
  let greet = "呱呱";
  let session = "盤後";
  if (hm < 8 * 60) greet = "早安";
  else if (hm < 11 * 60) greet = "上午好";
  else if (hm < 13 * 60) greet = "中午好";
  else if (hm < 18 * 60) greet = "下午好";
  else greet = "晚安";
  if (hm >= 9 * 60 && hm < 13 * 60 + 30) session = "盤中";
  else if (hm < 9 * 60) session = "盤前";
  const date = tpe.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Taipei",
  }).replace(/\//g, ".");
  const weekday = "日一二三四五六"[tpe.getDay()];
  const time = tpe.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Taipei",
  });
  return { greet, session, date: `${date} 週${weekday}`, time };
}

// ===== 頁面 =====

export default function Home() {
  const now = tpeNow();

  return (
    <div className={styles.root}>
      {/* Top nav */}
      <div className={styles.topnav}>
        <div className={styles.topnavInner}>
          <Link href="/" className={styles.logo} style={{ textDecoration: "none" }}>
            <span className={styles.logoQuack}>🦆</span>
            <div>
              <div className={styles.logoText}>呱呱投資招待所</div>
              <div className={styles.logoSub}>Quack House</div>
            </div>
          </Link>
          <nav className={styles.navLinks}>
            <Link className={cx(styles.navLink, styles.active)} href="/">🏠 首頁</Link>
            <Link className={styles.navLink} href="/pond">🔥 題材熱度</Link>
            <Link className={styles.navLink} href="/map">🗺️ 產業分類</Link>
            <Link className={styles.navLink} href="/stocks">🔍 查個股</Link>
            <Link className={styles.navLink} href="/chat">💬 AI 問答</Link>
            <Link className={styles.navLink} href="/alerts">🔔 警示</Link>
          </nav>
        </div>
      </div>

      <div className={styles.container}>
        {/* Greeting */}
        <div className={styles.greeting}>
          <div className={styles.greetingLeft}>
            <h1>{now.greet},Vincent</h1>
            <div className={styles.subtitle}>
              今天池塘的水有點混,呱呱已經在觀察 · {now.session} {now.time}
            </div>
          </div>
          <div className={styles.greetingRight}>
            <div className={styles.date}>{now.date}</div>
            <div className={styles.status}>
              <span className={styles.statusDot}></span>{now.session}資料 · 自動更新
            </div>
          </div>
        </div>

        {/* 🌡️ 市場脈動 */}
        <div className={styles.sectionTitle}>
          <h2>🌡️ 今日市場脈動</h2>
          <div className={styles.divider}></div>
          <Link className={styles.moreLink} href="/market">大盤詳情 →</Link>
        </div>
        {/* 即時 30 秒更新 */}
        <MarketPulseLive />

        {/* 🦆 呱呱今日功課 */}
        <div className={styles.quackMorning}>
          <div className={styles.quackHeader}>
            <div className={styles.quackAvatar}>🦆</div>
            <div>
              <div className={styles.quackTitle}>呱呱今日功課 · {now.session}更新</div>
              <div className={styles.quackTime}>{now.time} · 呱呱剛剛重新翻了一輪資料</div>
            </div>
          </div>
          <div className={styles.quackMain}>
            「昨夜 Tesla CFO 一句『CAPEX 250 億 + 負現金流』,<br />
            引爆 AI 泡沫疑慮。今天池塘有人在倒水,<br />
            拉高的別追,跌深的先等水位穩。」
          </div>
          <div className={styles.quackHighlights}>
            <div className={styles.highlightBox}>
              <div className={styles.highlightLabel}>💡 補漲機會(資金輪動受惠)</div>
              <div className={styles.highlightStocks}>
                <Link href="/stocks/1815" className={styles.safe}>富喬 1815</Link>
                {" · "}
                <Link href="/stocks/8358" className={styles.safe}>金居 8358</Link>
                {" · "}
                <Link href="/stocks/4722" className={styles.safe}>國精化 4722</Link>
              </div>
            </div>
            <div className={styles.highlightBox}>
              <div className={styles.highlightLabel}>⚠️ 避免追高(AI 泡沫疑慮)</div>
              <div className={styles.highlightStocks}>
                <Link href="/stocks/3443" className={styles.risk}>創意 3443</Link>
                {" · "}
                <Link href="/stocks/3661" className={styles.risk}>世芯 3661</Link>
                {" · "}
                <Link href="/stocks/5274" className={styles.risk}>信驊 5274</Link>
              </div>
            </div>
          </div>
          <div className={styles.quackActions}>
            <Link className={cx(styles.btn, styles.primary)} href="/chat">📄 看完整盤前報告</Link>
            <Link className={styles.btn} href="/chat">💬 問呱呱為什麼</Link>
          </div>
        </div>

        {/* 🔥 題材熱度 + 右欄 */}
        <div className={styles.sectionTitle}>
          <h2>🔥 今日題材熱度</h2>
          <div className={styles.divider}></div>
          <Link className={styles.moreLink} href="/pond">所有題材 →</Link>
        </div>

        <div className={styles.twoCol}>
          <div>
            <TopicsLive />
          </div>

          {/* 右欄 */}
          <div>
            {/* 美股連動 */}
            <div className={styles.usConnect} style={{ marginBottom: 16 }}>
              <div className={styles.flowTitle} style={{ marginBottom: 10 }}>
                🌏 昨夜美股 → 今日台股
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>4/22 盤後</span>
              </div>
              {US_EVENTS.map((e, i) => (
                <div key={i} className={styles.usEvent}>
                  <div className={styles.usEventTitle}>
                    <span className={styles[e.iconClass]}>{e.icon}</span> {e.title}
                  </div>
                  <div className={styles.usImpactArrow}>{e.impact}</div>
                  {e.stocks && <div className={styles.usStocks}>{e.stocks}</div>}
                </div>
              ))}
            </div>

            {/* 焦點股 */}
            <div className={styles.focusStocks}>
              <div className={styles.flowTitle} style={{ marginBottom: 10 }}>
                💎 今日焦點
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>點擊看分析</span>
              </div>
              {FOCUS.map((f) => (
                <Link key={f.code} href={`/stocks/${f.code}`} className={styles.focusStockItem}>
                  <div>
                    <div className={styles.focusStockName}>{f.name} {f.code}</div>
                    <div className={styles.focusStockTag}>{f.tag}</div>
                  </div>
                  <div className={styles.focusStockPrice}>
                    <div className="px">{f.px}</div>
                    <div className={cx("chg", styles[f.dir])}>{f.chg}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 🦆 呱呱這週挑的(帶信心度) */}
        <div className={styles.sectionTitle}>
          <h2>🦆 呱呱這週挑的</h2>
          <div className={styles.divider}></div>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>題材熱度 + 供應鏈位置</span>
        </div>
        <div style={{ padding: "12px 0" }}>
          <QuackPicksLive />
        </div>

        {/* 📰 今日重點(AI 分類新聞) */}
        <div className={styles.sectionTitle}>
          <h2>📰 今日重點</h2>
          <div className={styles.divider}></div>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>AI 分類 · 近 24 小時</span>
        </div>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(201, 169, 97, 0.08)",
            borderRadius: 6,
            padding: "16px 20px",
            marginTop: 8,
          }}
        >
          <HeadlinesLive />
        </div>

        {/* 🏔️ 供應鏈金字塔 */}
        <div className={styles.sectionTitle}>
          <h2>🏔️ 供應鏈金字塔 · CCL 漲價循環</h2>
          <div className={styles.divider}></div>
          <Link className={styles.moreLink} href="/pond/ccl_price_increase_2026">其他題材鏈 →</Link>
        </div>

        <div className={styles.pyramidCard}>
          <div className={styles.pyramidHint}>
            💡 點任何個股直接進入分析頁 · 🔥 為補漲機會
          </div>
          <div className={styles.pyramid}>
            {PYRAMID.map((row, i) => (
              <div key={i} className={cx(styles.pyramidRow, row.hot && styles.hot)}>
                {i > 0 && <span className={styles.arrow}>↑</span>}
                <div className={styles.pyramidTierLabel}>{row.label}</div>
                <div className={styles.pyramidStocks}>
                  {row.stocks.map((s) => {
                    const m = s.code.match(/(\d{4,6})/);
                    const href = m && !s.foreign ? `/stocks/${m[1]}` : "#";
                    return <StockChip key={s.code} code={s.code} change={s.change} href={href} />;
                  })}
                </div>
                <div className={styles.pyramidStatus}>{row.status}</div>
              </div>
            ))}
          </div>
          <div className={styles.pyramidLegend}>
            <span>🔥 補漲機會(推薦)</span>
            <span>🟢 主升段(正在漲)</span>
            <span>🟡 已漲完</span>
            <span>🔴 避開</span>
          </div>
        </div>

        {/* 💰 三大法人 */}
        <div className={styles.sectionTitle}>
          <h2>💰 三大法人資金流向</h2>
          <div className={styles.divider}></div>
          <Link className={styles.moreLink} href="/market">完整明細 →</Link>
        </div>
        <div className={styles.threeCol}>
          <div className={styles.flowCard}>
            <div className={styles.flowTitle}>
              🌍 外資
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>盤中估算</span>
            </div>
            <div className={cx(styles.flowAmount, styles.fall)}>-185.3 億</div>
            <div className={styles.flowTrend}>5 日均 +85 億 · 今日 -2.2x</div>
            <span className={cx(styles.flowStatus, styles.sell)}>大幅賣超 ⚠️</span>
            <div className={styles.flowPicks}>賣超前 3:台積電、創意、南亞科</div>
          </div>

          <div className={styles.flowCard}>
            <div className={styles.flowTitle}>
              🏦 投信
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>盤中估算</span>
            </div>
            <div className={cx(styles.flowAmount, styles.rise)}>+28.5 億</div>
            <div className={styles.flowTrend}>連 4 日買超 · 累計 +112 億</div>
            <span className={cx(styles.flowStatus, styles.buy)}>小幅買超</span>
            <div className={styles.flowPicks}>買超前 3:富喬、旺宏、昇達科</div>
          </div>

          <div className={styles.flowCard}>
            <div className={styles.flowTitle}>
              🏛️ 自營商
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>盤中估算</span>
            </div>
            <div className={cx(styles.flowAmount, styles.neutral)}>-8.2 億</div>
            <div className={styles.flowTrend}>震盪 · 5 日淨 +12 億</div>
            <span className={cx(styles.flowStatus, styles.neutralBg)}>小幅賣超</span>
            <div className={styles.flowPicks}>偏好:避險工具、選擇權對沖</div>
          </div>
        </div>

        {/* 🗺️ 產業熱力圖 */}
        <div className={styles.sectionTitle}>
          <h2>🗺️ 產業熱力圖 · 今日</h2>
          <div className={styles.divider}></div>
          <Link className={styles.moreLink} href="/map">進入產業地圖 →</Link>
        </div>
        <div className={styles.heatmapGrid}>
          {SECTORS.map((s) => (
            <Link key={s.name} href="/map" className={cx(styles.heatmapCell, styles[s.tier])}>
              <div className={styles.cellName}>{s.name}</div>
              <div className={cx(styles.cellChange, styles[s.dir])}>{s.chg}</div>
              <div className={styles.cellAmount}>{s.amount}</div>
            </Link>
          ))}
        </div>

        {/* 🔄 產業輪動 */}
        <div className={styles.rotationCard}>
          <div className={styles.rotationHead}>
            <h3>🔄 今日資金輪動方向</h3>
            <span className={styles.rotationHint}>錢從防禦轉向補漲</span>
          </div>
          <div className={styles.rotationGrid}>
            <div className={styles.rotationCol}>
              <h4>🔥 資金流入 TOP 5</h4>
              {INFLOW.map((r, i) => (
                <div key={i} className={styles.rotationItem}>
                  <span className={styles.rotationName}>{i + 1}. {r.name}</span>
                  <span className={cx(styles.rotationAmount, styles.rise)}>
                    {r.amount}
                    <span className={styles.rotationBar}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <span key={j} className={j < r.filled ? styles.filledIn : styles.empty} />
                      ))}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className={styles.rotationCol}>
              <h4>❄️ 資金流出 TOP 5</h4>
              {OUTFLOW.map((r, i) => (
                <div key={i} className={styles.rotationItem}>
                  <span className={styles.rotationName}>{i + 1}. {r.name}</span>
                  <span className={cx(styles.rotationAmount, styles.fall)}>
                    {r.amount}
                    <span className={styles.rotationBar}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <span key={j} className={j < r.filled ? styles.filledOut : styles.empty} />
                      ))}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.rotationReading}>
            🦆 <strong>呱呱解讀</strong>:今天資金明顯從「AI 高本益比」撤退,流向「低基期補漲」(CCL、衛星、傳產)。這是典型的 Risk-off 輪動。如果你手上 AI 部位較重,今天可以考慮減碼 20-30% 換成 CCL 或衛星族群平衡。
          </div>
        </div>

        {/* 📊 自選股空狀態 */}
        <div className={styles.sectionTitle}>
          <h2>📊 我的自選股</h2>
          <div className={styles.divider}></div>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>0 檔</span>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🦆💤</div>
          <div className={styles.emptyTitle}>筆記本還是空白的</div>
          <div className={styles.emptySubtitle}>呱呱幫你準備了幾個開始的方式</div>
          <div className={styles.emptyActions}>
            <Link className={cx(styles.btn, styles.primary)} href="/pond">🔥 從今日熱門題材開始</Link>
            <Link className={styles.btn} href="/pond/ecosystem/2330">🏆 看台股龍頭生態系</Link>
            <Link className={styles.btn} href="/stocks">📖 快速導覽(30 秒)</Link>
          </div>
        </div>

        {/* 🔔 小鈴鐺 */}
        <div className={styles.sectionTitle}>
          <h2>🔔 小鈴鐺</h2>
          <div className={styles.divider}></div>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>近 3 日 · 0 則</span>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔕</div>
          <div className={styles.emptyTitle}>近 3 日市場平穩,無警示觸發</div>
          <div className={styles.emptySubtitle}>設定自選股後,呱呱會幫你盯著</div>
          <div className={styles.emptyActions}>
            <Link className={styles.btn} href="/alerts">⚙️ 設定警示規則</Link>
            <Link className={styles.btn} href="/alerts">📜 看歷史警示</Link>
          </div>
        </div>

        {/* footer */}
        <div className={styles.footer}>
          <div className={styles.warning}>⚠ 教你思考,不是給你答案</div>
          <div>本系統為資訊整理與量化評分,非投資建議。股市有風險,投資需謹慎。</div>
          <div className={styles.footerSrc}>
            資料源:FinMind · FMP · Claude Sonnet 4.5 · 呱呱招待所 v2.0
          </div>
        </div>
      </div>
    </div>
  );
}
