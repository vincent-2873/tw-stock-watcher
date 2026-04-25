"use client";

/**
 * /analysts/[slug] — 個別分析師個人頁（前台）
 *
 * NEXT_TASK_007 Stage 3：占位佈局，第二波接真實資料。
 *
 * 由上而下的區塊：
 *   1. 頭部 Hero（大頭像 + 三個關鍵數字 + 訂閱按鈕）
 *   2. 個人介紹（我是誰 / 我的信念 / 我的風格）
 *   3. 績效報告（勝率走勢 / 最佳最差標的 / 辯論勝負）
 *   4. 當前持倉（占位表格）
 *   5. 大盤觀點（占位卡片）
 *   6. 推薦個股（占位 grid）
 *   7. 歷史會議發言（連 quack-office /meetings）
 *   8. 學習筆記（失敗檢討）
 *   9. 底部訂閱區
 */

import Link from "next/link";
import Image from "next/image";
import { use } from "react";
import { ANALYSTS, AnalystSlug, AnalystAvatar } from "@/components/AnalystAvatar";
import { ANALYST_INTROS } from "./intros";

export const dynamic = "force-dynamic";

export default function AnalystDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const a = ANALYSTS[slug as AnalystSlug];

  if (!a) {
    return (
      <div style={{ background: "var(--bg, #F2E8D5)", minHeight: "100vh" }}>
        <TopNav />
        <main style={{ maxWidth: 800, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-serif, serif)", fontSize: 28 }}>
            找不到這位分析師
          </h1>
          <p style={{ marginTop: 12, color: "#888" }}>
            slug「{slug}」不在團隊名冊。
          </p>
          <Link
            href="/analysts"
            style={{
              display: "inline-block",
              marginTop: 24,
              padding: "10px 16px",
              background: "#5d4a3e",
              color: "#fff",
              textDecoration: "none",
              borderRadius: 6,
            }}
          >
            ← 回團隊總覽
          </Link>
        </main>
      </div>
    );
  }

  const intro = ANALYST_INTROS[slug as AnalystSlug];

  return (
    <div style={{ background: "var(--bg, #F2E8D5)", minHeight: "100vh" }}>
      <TopNav />

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px 80px" }}>
        <div style={{ marginBottom: 16 }}>
          <Link href="/analysts" style={{ color: "#888", fontSize: 13, textDecoration: "none" }}>
            ← 分析師團隊
          </Link>
        </div>

        {/* 1. Hero */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 32,
            padding: 28,
            background: "rgba(255,255,255,0.55)",
            borderRadius: 10,
            marginBottom: 24,
            alignItems: "center",
          }}
        >
          <AnalystAvatar slug={a.slug} size="lg" />

          <div>
            <div style={{ fontSize: 12, color: a.primary, fontWeight: 600, marginBottom: 6 }}>
              {a.school}
            </div>
            <h1
              style={{
                fontFamily: "var(--font-serif, serif)",
                fontSize: 38,
                fontWeight: 500,
                margin: 0,
              }}
            >
              {a.name}
              <span
                style={{
                  fontSize: 16,
                  color: "#888",
                  marginLeft: 12,
                  fontWeight: 400,
                }}
              >
                {a.pinyin}
              </span>
            </h1>
            <p
              style={{
                marginTop: 10,
                fontSize: 14,
                color: "#5d4a3e",
                lineHeight: 1.7,
              }}
            >
              {a.personality.join(" · ")}
            </p>
            <blockquote
              style={{
                marginTop: 14,
                padding: "10px 14px",
                background: `${a.primary}11`,
                borderLeft: `3px solid ${a.primary}`,
                fontFamily: "var(--font-serif, serif)",
                fontStyle: "italic",
                fontSize: 15,
                color: "#5d4a3e",
              }}
            >
              「{a.oneLine}」
            </blockquote>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                marginTop: 18,
              }}
            >
              <KeyStat label="總預測數" value="—" />
              <KeyStat label="勝率" value="—" />
              <KeyStat label="平均報酬" value="—" />
            </div>

            <button
              type="button"
              disabled
              title="即將開放 — 樣本累積到一定數量後解鎖訂閱"
              style={{
                marginTop: 18,
                padding: "10px 20px",
                background: "#bbb",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                cursor: "not-allowed",
                fontFamily: "var(--font-serif, serif)",
              }}
            >
              🔔 訂閱（即將開放）
            </button>
          </div>
        </section>

        {/* 2. 個人介紹 */}
        <Section title="關於 我">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <IntroCard title="我是誰" body={intro.who} />
            <IntroCard title="我的信念" body={intro.belief} />
            <IntroCard title="我的風格" body={intro.style} />
          </div>
        </Section>

        {/* 3. 績效報告 */}
        <Section title="績效報告">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            <Placeholder
              title="勝率走勢"
              note="數據累積中"
              hint="預測樣本到 30 筆後，這裡會出現一條曲線。"
            />
            <Placeholder title="最佳標的" note="—" hint="勝率最高的個股。" />
            <Placeholder title="最差標的" note="—" hint="勝率最低的個股。" />
            <Placeholder title="辯論勝負" note="—" hint="對其他分析師的辯論紀錄。" />
          </div>
        </Section>

        {/* 4. 當前持倉 */}
        <Section title="當前持倉（active 預測）">
          <div
            style={{
              padding: 20,
              background: "rgba(255,255,255,0.5)",
              borderRadius: 8,
              border: "1px dashed rgba(93, 74, 62, 0.2)",
              textAlign: "center",
              color: "#888",
              fontSize: 13,
            }}
          >
            持倉資料整理中，預計第二波上線。
            <br />
            <span style={{ fontSize: 11 }}>欄位：標的 · 方向 · 目標價 · 時限 · 信心度 · 依據</span>
          </div>
        </Section>

        {/* 5. 大盤觀點 */}
        <Section title="本週大盤觀點">
          <div
            style={{
              padding: 20,
              background: "rgba(255,255,255,0.5)",
              borderRadius: 8,
              border: "1px dashed rgba(93, 74, 62, 0.2)",
              textAlign: "center",
              color: "#888",
              fontSize: 13,
            }}
          >
            大盤觀點整理中，第二波會接每週週末產出的觀點摘要。
          </div>
        </Section>

        {/* 6. 推薦個股 */}
        <Section title="推薦個股">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  padding: 16,
                  background: "rgba(255,255,255,0.5)",
                  borderRadius: 8,
                  border: "1px dashed rgba(93, 74, 62, 0.18)",
                  textAlign: "center",
                  color: "#999",
                  fontSize: 12,
                  minHeight: 90,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                推薦清單整理中
              </div>
            ))}
          </div>
        </Section>

        {/* 7. 歷史會議發言 */}
        <Section title="歷史會議發言">
          <div
            style={{
              padding: 20,
              background: "rgba(255,255,255,0.5)",
              borderRadius: 8,
              border: "1px dashed rgba(93, 74, 62, 0.2)",
              fontSize: 13,
              color: "#5d4a3e",
            }}
          >
            <p style={{ margin: 0, marginBottom: 10 }}>
              辦公室留有完整會議記錄，第二波會把 {a.name} 的發言抽出來在這裡列。
            </p>
            <a
              href="https://quack-office.zeabur.app/meetings"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: a.primary, fontSize: 12 }}
            >
              先去辦公室看完整會議記錄 →
            </a>
          </div>
        </Section>

        {/* 8. 學習筆記 */}
        <Section title="失敗檢討與修正">
          <div
            style={{
              padding: 20,
              background: "rgba(255,255,255,0.5)",
              borderRadius: 8,
              border: "1px dashed rgba(93, 74, 62, 0.2)",
              textAlign: "center",
              color: "#888",
              fontSize: 13,
            }}
          >
            每次預測失敗，{a.name} 會寫下教訓。<br />
            這裡會列最近 10 條學習筆記，第二波上線。
          </div>
        </Section>

        {/* 9. 底部 */}
        <section
          style={{
            marginTop: 48,
            padding: 24,
            background: "rgba(255,255,255,0.4)",
            borderRadius: 8,
            border: "1px dashed rgba(93, 74, 62, 0.2)",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-serif, serif)",
              fontSize: 17,
              fontWeight: 500,
              margin: 0,
              marginBottom: 6,
            }}
          >
            願意把錢交給 {a.name} 嗎？
          </h3>
          <p style={{ fontSize: 13, color: "#5d4a3e", margin: "8px 0 16px" }}>
            訂閱功能還在準備。先看完一兩場會議，確認這位分析師的風格適合你。
          </p>
          <Link
            href="/analysts"
            style={{
              display: "inline-block",
              padding: "8px 16px",
              border: "1px solid #5d4a3e",
              color: "#5d4a3e",
              textDecoration: "none",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            ← 回團隊總覽
          </Link>
        </section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontFamily: "var(--font-serif, serif)",
          fontSize: 18,
          fontWeight: 500,
          margin: "0 0 12px",
          paddingBottom: 8,
          borderBottom: "1px solid rgba(93, 74, 62, 0.12)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function KeyStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        background: "rgba(255,255,255,0.6)",
        borderRadius: 6,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{label}</div>
      <div
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 18,
          fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function IntroCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        padding: 16,
        background: "rgba(255,255,255,0.55)",
        borderRadius: 8,
      }}
    >
      <h3
        style={{
          fontFamily: "var(--font-serif, serif)",
          fontSize: 14,
          fontWeight: 500,
          margin: 0,
          marginBottom: 8,
          color: "#5d4a3e",
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: 13, lineHeight: 1.75, color: "#5d4a3e", margin: 0 }}>{body}</p>
    </div>
  );
}

function Placeholder({ title, note, hint }: { title: string; note: string; hint: string }) {
  return (
    <div
      style={{
        padding: 16,
        background: "rgba(255,255,255,0.5)",
        borderRadius: 8,
        border: "1px dashed rgba(93, 74, 62, 0.18)",
      }}
    >
      <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{title}</div>
      <div
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 22,
          fontWeight: 500,
          color: "#5d4a3e",
          marginBottom: 6,
        }}
      >
        {note}
      </div>
      <div style={{ fontSize: 11, color: "#888" }}>{hint}</div>
    </div>
  );
}

function TopNav() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.6)",
        borderBottom: "1px solid rgba(93, 74, 62, 0.1)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "#5d4a3e",
          }}
        >
          <Image
            src="/characters/guagua_official_v1.png"
            alt="呱呱投資招待所"
            width={32}
            height={32}
          />
          <span style={{ fontFamily: "var(--font-serif, serif)", fontSize: 16, fontWeight: 500 }}>
            呱呱投資招待所
          </span>
        </Link>
        <nav style={{ display: "flex", gap: 16, fontSize: 13 }}>
          <Link href="/" style={navLink}>
            今日重點
          </Link>
          <Link href="/pond" style={navLink}>
            題材熱度
          </Link>
          <Link href="/analysts" style={{ ...navLink, color: "#C84B3C", fontWeight: 600 }}>
            分析師團隊
          </Link>
          <Link href="/chat" style={navLink}>
            AI 對話
          </Link>
          <Link href="/intel" style={navLink}>
            情報
          </Link>
        </nav>
      </div>
    </div>
  );
}

const navLink: React.CSSProperties = {
  textDecoration: "none",
  color: "#5d4a3e",
};
