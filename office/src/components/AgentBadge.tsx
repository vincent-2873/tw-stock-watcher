"use client";

/**
 * AgentBadge — 統一顯示 12 位 agent 的視覺(NEXT_TASK_009 階段 2.4)
 *
 * 5 位投資分析師 → AnalystAvatar(SVG geometry + 個性顏色)
 * 7 位部門/監督 agent → emoji + 主題色 + 同樣 7 status 光暈
 *
 * 使用方式:
 *   <AgentBadge agentId="analyst_a" status="thinking" statusDetail="..." />
 *   <AgentBadge agentId="owl_fundamentalist" status="meeting" />
 */

import React from "react";
import {
  AnalystAvatar,
  ANALYSTS,
  type AnalystSlug,
  type AvatarSize,
  type AvatarStatus,
  STATUS_LABEL,
} from "./AnalystAvatar";

const ANALYST_ID_TO_SLUG: Record<string, AnalystSlug> = {
  analyst_a: "chenxu",
  analyst_b: "jingyuan",
  analyst_c: "guanqi",
  analyst_d: "shouzhuo",
  analyst_e: "mingchuan",
};

// 7 位部門 / 監督 agent
type DepartmentAgent = {
  id: string;
  name: string;
  role: string;
  emoji: string;
  primary: string; // 框邊色
  secondary: string; // 底色
};

export const DEPARTMENT_AGENTS: Record<string, DepartmentAgent> = {
  guagua: {
    id: "guagua",
    name: "呱呱",
    role: "所主",
    emoji: "🦆",
    primary: "#8B5A3C",
    secondary: "#E8D9B0",
  },
  owl_fundamentalist: {
    id: "owl_fundamentalist",
    name: "評級師",
    role: "基本面部門",
    emoji: "🦉",
    primary: "#5D4A3E",
    secondary: "#D4C5A8",
  },
  hedgehog_technical: {
    id: "hedgehog_technical",
    name: "技術分析師",
    role: "技術面部門",
    emoji: "📊",
    primary: "#2C2C2C",
    secondary: "#B8B8B8",
  },
  squirrel_chip: {
    id: "squirrel_chip",
    name: "籌碼觀察家",
    role: "籌碼面部門",
    emoji: "📡",
    primary: "#7A5C2E",
    secondary: "#D4B584",
  },
  meerkat_quant: {
    id: "meerkat_quant",
    name: "量化科學家",
    role: "量化部門",
    emoji: "🧑‍🔬",
    primary: "#445C7A",
    secondary: "#C4D0E0",
  },
  fox_skeptic: {
    id: "fox_skeptic",
    name: "質疑官",
    role: "逆向部門",
    emoji: "🦊",
    primary: "#B85450",
    secondary: "#E8C4C0",
  },
  pangolin_risk: {
    id: "pangolin_risk",
    name: "風險管理師",
    role: "風控部門",
    emoji: "🧘",
    primary: "#5D7A4A",
    secondary: "#C8D5BC",
  },
};

const SIZE_PX: Record<AvatarSize, number> = {
  sm: 48,
  md: 96,
  lg: 200,
};

function deptStatusBoxShadow(status?: AvatarStatus, primary?: string): string | undefined {
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

function deptStatusFilter(status?: AvatarStatus): string | undefined {
  if (status === "resting") return "grayscale(0.55) opacity(0.85)";
  return undefined;
}

function deptStatusAnimation(status?: AvatarStatus): string | undefined {
  switch (status) {
    case "thinking":
      return "office-status-pulse 2.6s ease-in-out infinite";
    case "meeting":
      return "office-status-shake 1.8s ease-in-out infinite";
    case "writing":
      return "office-status-write 1.4s ease-in-out infinite";
    case "predicting":
      return "office-status-glow 2.2s ease-in-out infinite";
    case "debating":
      return "office-status-debate 1.2s ease-in-out infinite";
    case "learning":
      return "office-status-learn 3.2s ease-in-out infinite";
    default:
      return undefined;
  }
}

function DepartmentAvatar({
  meta,
  size = "md",
  status,
  statusDetail,
  showLabel,
}: {
  meta: DepartmentAgent;
  size?: AvatarSize;
  status?: AvatarStatus;
  statusDetail?: string;
  showLabel?: boolean;
}) {
  const px = SIZE_PX[size];
  const tooltip = status
    ? `${meta.name} · ${meta.role}\n${STATUS_LABEL[status]}${statusDetail ? `:${statusDetail}` : ""}`
    : `${meta.name} · ${meta.role}`;

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: px,
          height: px,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${meta.secondary}66 0%, ${meta.secondary}AA 100%)`,
          border: `1px solid ${meta.primary}66`,
          boxShadow: deptStatusBoxShadow(status, meta.primary),
          filter: deptStatusFilter(status),
          position: "relative",
          overflow: "hidden",
          transition: "box-shadow 360ms ease, filter 360ms ease",
          animation: deptStatusAnimation(status),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size === "lg" ? 80 : size === "md" ? 40 : 24,
        }}
        title={tooltip}
        aria-label={`${meta.name}（${meta.role}）`}
      >
        {meta.emoji}
      </div>
      {showLabel && (
        <div style={{ textAlign: "center", lineHeight: 1.2 }}>
          <div style={{ fontSize: size === "lg" ? 16 : 12, fontWeight: 500 }}>{meta.name}</div>
          <div style={{ fontSize: size === "lg" ? 11 : 10, color: "var(--muted-fg)" }}>{meta.role}</div>
          {status && statusDetail && (
            <div
              style={{
                fontSize: 10,
                color: "var(--muted-fg)",
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
    </div>
  );
}

export interface AgentBadgeProps {
  agentId: string;
  size?: AvatarSize;
  status?: AvatarStatus;
  statusDetail?: string;
  showLabel?: boolean;
}

export function AgentBadge({ agentId, ...rest }: AgentBadgeProps) {
  // 5 位投資分析師
  const slug = ANALYST_ID_TO_SLUG[agentId];
  if (slug && ANALYSTS[slug]) {
    return <AnalystAvatar slug={slug} {...rest} />;
  }

  // 7 位部門 / 監督
  const dept = DEPARTMENT_AGENTS[agentId];
  if (dept) {
    return <DepartmentAvatar meta={dept} {...rest} />;
  }

  return null;
}

// 12 位 agent 的順序(展示用)
export const ALL_AGENT_IDS = [
  "guagua",
  "analyst_a",
  "analyst_b",
  "analyst_c",
  "analyst_d",
  "analyst_e",
  "owl_fundamentalist",
  "hedgehog_technical",
  "squirrel_chip",
  "meerkat_quant",
  "fox_skeptic",
  "pangolin_risk",
];

// 取得 agent 顯示名(不依賴 backend API)
export function getAgentDisplayName(agentId: string): string {
  const slug = ANALYST_ID_TO_SLUG[agentId];
  if (slug && ANALYSTS[slug]) return ANALYSTS[slug].name;
  return DEPARTMENT_AGENTS[agentId]?.name ?? agentId;
}
