import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";
import {
  MarketPulseLive,
  TopicsLive,
  QuackPicksLive,
  HeadlinesLive,
  QuackMorningLive,
  SupplyChainLive,
  USConnectLive,
  FocusStocksLive,
  InstitutionalLive,
  PeopleStatementsLive,
} from "./home-data";
import { HeroDate } from "@/components/hero/HeroDate";
import { HeroFloats } from "@/components/hero/HeroFloats";
import { FloatingGuagua } from "@/components/hero/FloatingGuagua";
import { HeroHeadline } from "@/components/hero/HeroHeadline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ===== helpers =====
// Bug 4 修: 刪除所有寫死假資料 (MARKET/TOPICS/US_EVENTS/FOCUS/PYRAMID/SECTORS/INFLOW/OUTFLOW)
// 改以 XxxLive client component 從後端 API 拉。
// CLAUDE.md 鐵則 4: 資料為空整塊隱藏,不顯示「——」或假資料。
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
  const dateEn = tpe.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Taipei",
  }).replace(",", " ·").replace(",", " ·");
  return { greet, session, date: `${date} 週${weekday}`, dateEn, time };
}

// ===== 頁面 =====

export default function Home() {
  const now = tpeNow();

  return (
    <div className={styles.root}>
      {/* Top nav — 禪風 v3 照 18_ZEN HTML */}
      <div className={styles.topnav}>
        <div className={styles.topnavInner}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoQuack}>
              <Image
                src="/characters/guagua_official_v1.png"
                alt="呱呱投資招待所"
                width={40}
                height={40}
                priority
                draggable={false}
              />
            </span>
            <div className={styles.logoTextBlock}>
              <span className={styles.logoJp}>クワック・ハウス</span>
              <span className={styles.logoText}>呱呱投資招待所</span>
            </div>
            <span className={styles.logoUnderline}></span>
          </Link>
          <nav className={styles.navLinks}>
            <Link className={cx(styles.navLink, styles.active)} href="/">今日重點</Link>
            <Link className={styles.navLink} href="/pond">題材熱度</Link>
            <Link className={styles.navLink} href="/analysts">分析師團隊</Link>
            <Link className={styles.navLink} href="/meetings">會議記錄</Link>
            <Link className={styles.navLink} href="/speeches">關鍵發言</Link>
            <Link className={styles.navLink} href="/stocks">自選股</Link>
            <Link className={styles.navLink} href="/chat">AI 對話</Link>
            <Link className={styles.navLink} href="/intel">情報</Link>
          </nav>
        </div>
      </div>

      <div className={styles.container}>
        {/* Hero — 照 18_ZEN_HOMEPAGE_v3.html */}
        <section className={styles.heroQuack}>
          <div className={styles.heroLeft}>
            <div className={styles.heroDate}>
              <HeroDate />
            </div>
            {/* NEXT_TASK_007 修正 #1: 動態狀態詞 + 副標 */}
            <HeroHeadline />
            <div className={styles.heroActions}>
              <Link className={cx(styles.btnZen, styles.btnZenPrimary)} href="#quack-morning">
                📄 看完整晨報
              </Link>
              <Link className={styles.btnZen} href="/chat">
                💬 問呱呱
              </Link>
              <Link className={styles.btnZen} href="/intel">
                🔗 相關情報
              </Link>
            </div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.quackCircle}>
              {/* 呱呱本尊 v1.0 — 從 emoji 升級為官方視覺,點擊跳 /chat */}
              <FloatingGuagua />
            </div>
            <HeroFloats />
          </div>
        </section>

        {/* 🌡️ 市場脈動 */}
        <div className={styles.sectionTitle}>
          <h2>🌡️ 今日市場脈動</h2>
          <div className={styles.divider}></div>
          <Link className={styles.moreLink} href="/market">大盤詳情 →</Link>
        </div>
        {/* 即時 30 秒更新 */}
        <MarketPulseLive />

        {/* 呱呱今日功課(即時資料生成) */}
        <QuackMorningLive />

        {/* 🎤 今日關鍵發言 — 空時整塊隱藏 (PeopleStatementsLive 自管標題) */}
        <PeopleStatementsLive />

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
            {/* 美股連動(即時) */}
            <div className={styles.usConnect} style={{ marginBottom: 16 }}>
              <div className={styles.flowTitle} style={{ marginBottom: 10 }}>
                🌏 昨夜美股 → 今日台股
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>即時</span>
              </div>
              <USConnectLive />
            </div>

            {/* 焦點股(從題材抽出) */}
            <div className={styles.focusStocks}>
              <div className={styles.flowTitle} style={{ marginBottom: 10 }}>
                💎 今日焦點
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>來自熱門題材 · 點擊看分析</span>
              </div>
              <FocusStocksLive />
            </div>
          </div>
        </div>

        {/* 呱呱這週挑的 — NEXT_TASK_008a 階段 2 縮水:走呱呱中樞 AI 推理(10 檔精準)
            Bug #3:標題 emoji 換 PNG */}
        <div className={styles.sectionTitle}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image
              src="/characters/guagua_official_v1.png"
              alt="呱呱"
              width={32}
              height={32}
              style={{ display: "inline-block", verticalAlign: "middle" }}
            />
            呱呱這週挑的
          </h2>
          <div className={styles.divider}></div>
          <Link className={styles.moreLink} href="/weekly_picks">完整列表 →</Link>
          <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 12 }}>
            呱呱中樞 AI · 精準推薦(穩健 / 進攻 / 逆勢 / 題材)
          </span>
        </div>
        <div style={{ padding: "12px 0" }}>
          <QuackPicksLive />
        </div>

        {/* 📰 今日重點(AI 分類新聞) */}
        <div className={styles.sectionTitle}>
          <h2>📰 今日重點</h2>
          <div className={styles.divider}></div>
          <Link className={styles.moreLink} href="/news">新聞時間線 →</Link>
          <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 12 }}>AI 分類 · 近 24 小時</span>
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

        {/* 🏔️ 供應鏈(即時:最熱題材的供應鏈) */}
        <div className={styles.sectionTitle}>
          <h2>🏔️ 最熱題材供應鏈</h2>
          <div className={styles.divider}></div>
          <Link className={styles.moreLink} href="/pond">其他題材鏈 →</Link>
        </div>

        <div className={styles.pyramidCard}>
          <SupplyChainLive />
        </div>

        {/* 💰 三大法人 */}
        <div className={styles.sectionTitle}>
          <h2>💰 三大法人資金流向</h2>
          <div className={styles.divider}></div>
          <Link className={styles.moreLink} href="/market">完整明細 →</Link>
        </div>
        <div className={styles.threeCol}>
          <InstitutionalLive />
        </div>

        {/* 🗺️ 產業熱力圖 — Bug 4 修: 後端尚未提供 sector heatmap / fund rotation API
             依 CLAUDE.md 鐵則 4「資料為空整塊隱藏」, 暫時移除寫死的假資料區塊。
             TODO: 等後端建 /api/sectors/heatmap + /api/market/fund-rotation 再加回。
             參考 /sectors 子頁提供部份此類資料。 */}

        {/* 📊 我的自選股區塊 — NEXT_TASK_007 修正 #6 移除（DB 資料保留、/stocks 路由保留） */}

        {/* 🔔 小鈴鐺 — 階段 1 刪 (CLAUDE.md 鐵則 4: 空狀態整塊隱藏)
             Phase 3 接 /api/quack/alerts 有資料時再整塊 return 出來 */}

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
