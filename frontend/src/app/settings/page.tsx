"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * /settings — 使用者偏好與警示規則
 * CLAUDE.md 保留頁之一。目前為 Stub,後續接入:
 *   - Line Bot 綁定(驗證碼)
 *   - 到價警示規則(股票 / 閾值 / 方向)
 *   - AI 成本上限(月預算)
 *   - 免打擾時段覆寫
 *   - 自選股同步(Phase 2)
 */

type DiagResult = {
  ok: boolean;
  level_title?: string;
  user_id?: string;
  api_request_limit_hour?: number;
} | null;

const API =
  process.env.NEXT_PUBLIC_API_URL ?? "https://vsis-api.zeabur.app";

export default function SettingsPage() {
  const [diag, setDiag] = useState<DiagResult>(null);
  const [tpeNow, setTpeNow] = useState<string>("");

  useEffect(() => {
    fetch(`${API}/api/diag/finmind`)
      .then((r) => r.json())
      .then(setDiag)
      .catch(() => setDiag({ ok: false }));
    fetch(`${API}/api/time/now`)
      .then((r) => r.json())
      .then((j) => setTpeNow(j.hero_en ?? ""))
      .catch(() => {});
  }, []);

  return (
    <main
      className="min-h-screen"
      style={{
        background: "var(--washi, #F5EFE0)",
        color: "var(--sumi, #2C2416)",
        padding: "48px 24px",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ fontSize: 12, color: "var(--sumi-mist, #7A6E53)", marginBottom: 16 }}>
          <Link href="/" style={{ color: "inherit" }}>
            今日
          </Link>{" "}
          / 設定
        </div>

        <h1
          style={{
            fontFamily: "'Shippori Mincho', serif",
            fontSize: 36,
            fontWeight: 500,
            marginBottom: 8,
            letterSpacing: "0.04em",
          }}
        >
          ⚙️ 設定
        </h1>
        <p style={{ fontSize: 14, color: "var(--sumi-mist, #7A6E53)", marginBottom: 32 }}>
          個人偏好 · Line 綁定 · 警示規則 · AI 預算
        </p>

        {/* 系統健康 */}
        <section
          style={{
            background: "var(--washi-warm, #FAF5E8)",
            border: "1px solid rgba(168, 152, 120, 0.15)",
            borderRadius: 4,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontFamily: "'Shippori Mincho', serif",
              fontSize: 18,
              fontWeight: 500,
              marginBottom: 16,
              color: "var(--kin, #B8893D)",
            }}
          >
            🩺 系統健康
          </h2>
          <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
            <Row label="伺服器時間 TPE">{tpeNow || "讀取中…"}</Row>
            <Row label="FinMind plan">
              {diag === null
                ? "讀取中…"
                : diag.ok
                  ? `${diag.level_title} · ${diag.api_request_limit_hour} req/hr`
                  : "❌ 連線失敗"}
            </Row>
            <Row label="FinMind user">
              {diag?.user_id ?? "-"}
            </Row>
          </div>
        </section>

        {/* Line 綁定 */}
        <StubSection
          title="📱 Line Bot 綁定"
          desc="綁定 Line 帳號接收到價 / 晨報 / 致命急訊(Phase 3)"
          phase="Phase 3"
        />

        {/* 警示規則 */}
        <StubSection
          title="🔔 警示規則"
          desc="自選股到價 / 法人連買 / 題材突破 / VIP 發言(Phase 3)"
          phase="Phase 3"
        />

        {/* AI 預算 */}
        <StubSection
          title="💰 AI 成本上限"
          desc="Claude API 每月花費預算(spec 24)"
          phase="Phase 3"
        />

        {/* 免打擾時段 */}
        <StubSection
          title="🌙 免打擾時段"
          desc="預設 22:00 ~ 07:00 TPE 不推播(致命急訊除外)"
          phase="Phase 3"
        />

        <div
          style={{
            marginTop: 48,
            fontSize: 12,
            color: "var(--sumi-mist, #7A6E53)",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          ⚠ 教你思考,不是給你答案
        </div>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ color: "var(--sumi-mist, #7A6E53)", fontSize: 13 }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{children}</span>
    </div>
  );
}

function StubSection({
  title,
  desc,
  phase,
}: {
  title: string;
  desc: string;
  phase: string;
}) {
  return (
    <section
      style={{
        background: "var(--washi-warm, #FAF5E8)",
        border: "1px dashed rgba(168, 152, 120, 0.3)",
        borderRadius: 4,
        padding: 20,
        marginBottom: 16,
        opacity: 0.75,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3
          style={{
            fontFamily: "'Shippori Mincho', serif",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          {title}
        </h3>
        <span
          style={{
            fontSize: 10,
            background: "var(--kin, #B8893D)",
            color: "var(--washi, #F5EFE0)",
            padding: "2px 8px",
            borderRadius: 2,
            letterSpacing: "0.1em",
          }}
        >
          {phase}
        </span>
      </div>
      <p style={{ fontSize: 13, color: "var(--sumi-mist, #7A6E53)", marginTop: 8 }}>{desc}</p>
    </section>
  );
}
