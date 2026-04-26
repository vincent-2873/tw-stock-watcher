"use client";

/**
 * AnalystAvatar — 5 位投資分析師的占位視覺系統
 *
 * 第一波（NEXT_TASK_007）：純 SVG + CSS，不用任何外部圖檔
 * 第二波：把 <svg> 區塊換成 <Image src={...} />，其他不動即可
 *
 * 5 位分析師（NEXT_TASK_007 命名）：
 *   chenxu     辰旭 · 技術派     朱紅 + 金        ⚡
 *   jingyuan   靜遠 · 基本面     松綠 + 米白      🌳
 *   guanqi     觀棋 · 籌碼派     墨黑 + 灰        ♟️
 *   shouzhuo   守拙 · 量化派     赭石 + 駝色      📐
 *   mingchuan  明川 · 綜合派     藏青 + 水藍      🌊
 *
 * status 視覺指示（光暈動畫）：
 *   thinking    脈動光暈（淡）
 *   meeting     橘色邊框
 *   resting     灰階
 *   predicting  金色光暈
 */

import React from "react";

export type AnalystSlug = "chenxu" | "jingyuan" | "guanqi" | "shouzhuo" | "mingchuan";
export type AvatarSize = "sm" | "md" | "lg";
// NEXT_TASK_009 階段 2.3:status 從 4 個擴充為 7 個(thinking / meeting /
// writing / predicting / debating / learning / resting)
export type AvatarStatus =
  | "thinking"
  | "meeting"
  | "writing"
  | "predicting"
  | "debating"
  | "learning"
  | "resting";

const SIZE_PX: Record<AvatarSize, number> = {
  sm: 48,
  md: 120,
  lg: 240,
};

export type AnalystMeta = {
  slug: AnalystSlug;
  name: string;
  pinyin: string;
  school: string;
  primary: string;
  secondary: string;
  emoji: string;
  agentId: string;
  personality: string[];
  oneLine: string;
};

export const ANALYSTS: Record<AnalystSlug, AnalystMeta> = {
  chenxu: {
    slug: "chenxu",
    name: "辰旭",
    pinyin: "Chénxù",
    school: "激進派",
    primary: "#C84B3C",
    secondary: "#D4A574",
    emoji: "⚡",
    agentId: "analyst_a",
    personality: ["動能優先", "敢進敢退", "重技術籌碼"],
    oneLine: "突破當下就是上車。",
  },
  jingyuan: {
    slug: "jingyuan",
    name: "靜遠",
    pinyin: "Jìngyuǎn",
    school: "保守派",
    primary: "#5D7A4F",
    secondary: "#E8DDC4",
    emoji: "🌳",
    agentId: "analyst_b",
    personality: ["估值優先", "等便宜", "重長期"],
    oneLine: "時間是價值投資最好的朋友。",
  },
  guanqi: {
    slug: "guanqi",
    name: "觀棋",
    pinyin: "Guānqí",
    school: "跟隨派",
    primary: "#2C2C2C",
    secondary: "#8B8B8B",
    emoji: "♟️",
    agentId: "analyst_c",
    personality: ["跟大戶腳印", "看煙霧訊號", "中線"],
    oneLine: "外資連買 5 天,我認為有點東西。",
  },
  shouzhuo: {
    slug: "shouzhuo",
    name: "守拙",
    pinyin: "Shǒuzhuō",
    school: "紀律派",
    primary: "#8B5A3C",
    secondary: "#C4A574",
    emoji: "📐",
    agentId: "analyst_d",
    personality: ["機率思維", "重信賴區間", "嚴格停損"],
    oneLine: "樣本多少?信賴區間多寬?",
  },
  mingchuan: {
    slug: "mingchuan",
    name: "明川",
    pinyin: "Míngchuān",
    school: "靈活派",
    primary: "#1E3A5F",
    secondary: "#7BA7BC",
    emoji: "🌊",
    agentId: "analyst_e",
    personality: ["6 面向均衡", "依市況調權重", "彈性框架"],
    oneLine: "市況變我就調權重。",
  },
};

export const ANALYST_SLUGS: AnalystSlug[] = [
  "chenxu",
  "jingyuan",
  "guanqi",
  "shouzhuo",
  "mingchuan",
];

function GeometryChenxu({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <g>
      <polygon points="50,18 30,52 70,52" fill={primary} opacity={0.85} />
      <polygon points="50,32 32,66 68,66" fill={secondary} opacity={0.75} />
      <polygon points="50,46 34,80 66,80" fill={primary} opacity={0.6} />
    </g>
  );
}

function GeometryJingyuan({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <g>
      <circle cx="50" cy="50" r="30" fill={secondary} stroke={primary} strokeWidth="2" />
      <line x1="50" y1="22" x2="50" y2="78" stroke={primary} strokeWidth="2" />
      <line x1="22" y1="50" x2="78" y2="50" stroke={primary} strokeWidth="2" />
    </g>
  );
}

function GeometryGuanqi({ primary, secondary }: { primary: string; secondary: string }) {
  const cells = [];
  const size = 16;
  const startX = 26;
  const startY = 26;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const filled = (r + c) % 2 === 0;
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={startX + c * size}
          y={startY + r * size}
          width={size - 2}
          height={size - 2}
          fill={filled ? primary : secondary}
          opacity={filled ? 0.9 : 0.5}
        />,
      );
    }
  }
  return <g>{cells}</g>;
}

function GeometryShouzhuo({ primary, secondary }: { primary: string; secondary: string }) {
  const cx = 50;
  const cy = 50;
  const r = 28;
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <g>
      <polygon points={points.join(" ")} fill={secondary} stroke={primary} strokeWidth="2" />
      <text
        x={cx}
        y={cy + 5}
        fontFamily="monospace"
        fontSize="14"
        fill={primary}
        textAnchor="middle"
      >
        Σ
      </text>
    </g>
  );
}

function GeometryMingchuan({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d="M 22 38 Q 35 28, 50 38 T 78 38" stroke={primary} strokeWidth="3" opacity={0.85} />
      <path d="M 22 52 Q 35 42, 50 52 T 78 52" stroke={secondary} strokeWidth="3" opacity={0.85} />
      <path d="M 22 66 Q 35 56, 50 66 T 78 66" stroke={primary} strokeWidth="3" opacity={0.6} />
    </g>
  );
}

const GEOMETRY: Record<AnalystSlug, React.FC<{ primary: string; secondary: string }>> = {
  chenxu: GeometryChenxu,
  jingyuan: GeometryJingyuan,
  guanqi: GeometryGuanqi,
  shouzhuo: GeometryShouzhuo,
  mingchuan: GeometryMingchuan,
};

// NEXT_TASK_009 階段 2.3:7 種 status 各自的視覺效果
//
// thinking    白色脈動光暈
// meeting     橘色邊框 + 跳動
// writing     金色筆觸動畫
// predicting  金色光暈
// debating    朱紅閃爍
// learning    紫色柔光
// resting     灰階低透明度

function statusBoxShadow(status?: AvatarStatus, primary?: string): string | undefined {
  if (!status) return undefined;
  switch (status) {
    case "thinking":
      return `0 0 0 2px ${primary ?? "#888"}33, 0 0 12px 2px rgba(245, 239, 224, 0.5)`;
    case "meeting":
      return `0 0 0 3px #E89B4D`;
    case "writing":
      return `0 0 0 2px #B8893D55, 0 0 14px 2px rgba(212, 165, 116, 0.4)`;
    case "predicting":
      return `0 0 16px 3px #D4A574`;
    case "debating":
      return `0 0 0 2px #B85450, 0 0 14px 2px rgba(184, 84, 80, 0.5)`;
    case "learning":
      return `0 0 0 2px #8B6BB8, 0 0 14px 2px rgba(139, 107, 184, 0.4)`;
    case "resting":
    default:
      return undefined;
  }
}

function statusFilter(status?: AvatarStatus): string | undefined {
  if (status === "resting") return "grayscale(0.55) opacity(0.85)";
  return undefined;
}

function statusAnimation(status?: AvatarStatus): string | undefined {
  switch (status) {
    case "thinking":
      return "vsis-status-pulse 2.6s ease-in-out infinite";
    case "meeting":
      return "vsis-status-shake 1.8s ease-in-out infinite";
    case "writing":
      return "vsis-status-write 1.4s ease-in-out infinite";
    case "predicting":
      return "vsis-status-glow 2.2s ease-in-out infinite";
    case "debating":
      return "vsis-status-debate 1.2s ease-in-out infinite";
    case "learning":
      return "vsis-status-learn 3.2s ease-in-out infinite";
    default:
      return undefined;
  }
}

const STATUS_LABEL: Record<AvatarStatus, string> = {
  thinking: "思考中",
  meeting: "會議中",
  writing: "寫報告中",
  predicting: "下預測中",
  debating: "辯論中",
  learning: "學習中",
  resting: "休息中",
};

export function statusLabel(s: AvatarStatus): string {
  return STATUS_LABEL[s] ?? s;
}

export function AnalystAvatar({
  slug,
  size = "md",
  status,
  statusDetail,
  showLabel = false,
}: {
  slug: AnalystSlug;
  size?: AvatarSize;
  status?: AvatarStatus;
  statusDetail?: string;
  showLabel?: boolean;
}) {
  const meta = ANALYSTS[slug];
  if (!meta) return null;
  const px = SIZE_PX[size];
  const Geometry = GEOMETRY[slug];

  const tooltipText = status
    ? `${meta.name} · ${meta.school}\n${statusLabel(status)}${statusDetail ? `:${statusDetail}` : ""}`
    : `${meta.name} · ${meta.school}`;

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{
          width: px,
          height: px,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${meta.secondary}33 0%, ${meta.secondary}66 100%)`,
          border: `1px solid ${meta.primary}55`,
          boxShadow: statusBoxShadow(status, meta.primary),
          filter: statusFilter(status),
          position: "relative",
          overflow: "hidden",
          transition: "box-shadow 360ms ease, filter 360ms ease",
          animation: statusAnimation(status),
        }}
        title={tooltipText}
        aria-label={`${meta.name}（${meta.school}）`}
      >
        <svg
          viewBox="0 0 100 100"
          width={px}
          height={px}
          style={{ display: "block" }}
          aria-hidden="true"
        >
          <Geometry primary={meta.primary} secondary={meta.secondary} />
        </svg>
        {size !== "sm" && (
          <span
            style={{
              position: "absolute",
              right: 6,
              bottom: 4,
              fontSize: size === "lg" ? 28 : 16,
              opacity: 0.85,
              pointerEvents: "none",
            }}
          >
            {meta.emoji}
          </span>
        )}
      </div>
      {showLabel && (
        <div style={{ textAlign: "center", lineHeight: 1.2 }}>
          <div style={{ fontSize: size === "lg" ? 18 : 13, fontWeight: 500 }}>
            {meta.name}
            <span style={{ color: "#888", fontSize: "0.85em", marginLeft: 4 }}>{meta.pinyin}</span>
          </div>
          <div style={{ fontSize: size === "lg" ? 12 : 10, color: "#888" }}>{meta.school}</div>
          {status && statusDetail && (
            <div
              style={{
                fontSize: 10,
                color: "var(--sumi-mist)",
                fontStyle: "italic",
                marginTop: 2,
                maxWidth: px + 40,
              }}
            >
              {statusDetail}
            </div>
          )}
        </div>
      )}
      <style jsx global>{`
        @keyframes vsis-status-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.08); }
        }
        @keyframes vsis-status-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1px); }
          75% { transform: translateX(1px); }
        }
        @keyframes vsis-status-write {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(0.6deg); }
          75% { transform: rotate(-0.6deg); }
        }
        @keyframes vsis-status-glow {
          0%, 100% { filter: brightness(1) saturate(1); }
          50% { filter: brightness(1.15) saturate(1.2); }
        }
        @keyframes vsis-status-debate {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes vsis-status-learn {
          0%, 100% { filter: brightness(1) hue-rotate(0deg); }
          50% { filter: brightness(1.05) hue-rotate(8deg); }
        }
      `}</style>
    </div>
  );
}

export default AnalystAvatar;
