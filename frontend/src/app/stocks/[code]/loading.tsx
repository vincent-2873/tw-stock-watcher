import Image from "next/image";

export default function Loading() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "24px",
        background: "var(--bg)",
        color: "var(--fg)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ fontSize: 14, color: "var(--muted-fg)", marginBottom: 16 }}>
          <a href="/" style={{ color: "var(--accent-gold, #C9A961)" }}>
            ← 回主頁
          </a>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "32px 0",
            fontFamily: "var(--font-serif)",
          }}
        >
          <span
            style={{
              animation: "breathe 2s ease-in-out infinite",
              display: "inline-block",
            }}
          >
            <Image
              src="/characters/guagua_official_v1.png"
              alt="呱呱"
              width={40}
              height={40}
            />
          </span>
          <div>
            <div style={{ fontSize: 20, fontWeight: 500, color: "var(--fg)" }}>
              呱呱正在翻資料⋯⋯
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--muted-fg)",
                marginTop: 4,
                fontStyle: "italic",
              }}
            >
              FinMind 股價 + 三大法人 + 新聞 + 分點,約 5-10 秒
            </div>
          </div>
        </div>

        {/* 骨架卡片 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "20px",
                height: 100,
                animation: `shimmer 1.6s ease-in-out ${i * 0.1}s infinite`,
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
            marginTop: 16,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "20px",
                height: 240,
                animation: `shimmer 1.6s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>

        <style>{`
          @keyframes breathe {
            0%, 100% { transform: translateY(0); opacity: 1; }
            50% { transform: translateY(-4px); opacity: 0.85; }
          }
          @keyframes shimmer {
            0%, 100% { opacity: 0.45; }
            50% { opacity: 0.75; }
          }
        `}</style>
      </div>
    </main>
  );
}
