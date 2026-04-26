"use client";

/**
 * UI 共用元件庫 — 前台
 *
 * NEXT_TASK_009 階段 1.3
 *
 * 提供 8 個元件：Button / Card / Badge / Modal / Tooltip / LoadingSpinner /
 * EmptyState / ErrorState
 *
 * 設計原則：
 *  - 全部用 design tokens（@/styles/tokens）
 *  - 不用第三方 UI lib，純 React + inline style
 *  - 動畫用 CSS transition / keyframes
 *  - 顏色全走 CSS variables，避免寫死
 */

import React from "react";
import { color, radius, spacing, transition, fontSize, shadow } from "@/styles/tokens";

/* ──────────────────────────────────────────────────────────
   Button
   ────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const buttonVariantStyle: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: color.accent, color: "#FFFFFF", border: `1px solid ${color.accent}` },
  secondary: { background: "transparent", color: color.primaryText, border: `1px solid ${color.borderStrong}` },
  ghost: { background: "transparent", color: color.primaryText, border: "1px solid transparent" },
  danger: { background: color.danger, color: "#FFFFFF", border: `1px solid ${color.danger}` },
};

const buttonSizeStyle: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: `${spacing.xs}px ${spacing.sm + 2}px`, fontSize: fontSize.caption.size, minHeight: 28 },
  md: { padding: `${spacing.sm}px ${spacing.md}px`, fontSize: fontSize.body.size, minHeight: 36 },
  lg: { padding: `${spacing.sm + 4}px ${spacing.lg}px`, fontSize: fontSize.body.size + 1, minHeight: 44 },
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  style,
  children,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  return (
    <button
      {...rest}
      onMouseEnter={(e) => {
        setHover(true);
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHover(false);
        setActive(false);
        rest.onMouseLeave?.(e);
      }}
      onMouseDown={(e) => {
        setActive(true);
        rest.onMouseDown?.(e);
      }}
      onMouseUp={(e) => {
        setActive(false);
        rest.onMouseUp?.(e);
      }}
      style={{
        ...buttonVariantStyle[variant],
        ...buttonSizeStyle[size],
        width: fullWidth ? "100%" : undefined,
        borderRadius: radius.md,
        fontFamily: "inherit",
        fontWeight: 500,
        cursor: rest.disabled ? "not-allowed" : "pointer",
        opacity: rest.disabled ? 0.5 : hover ? 0.92 : 1,
        transform: active ? "translateY(1px)" : undefined,
        transition: transition(["opacity", "transform", "background", "border-color"], "fast"),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        letterSpacing: "0.02em",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ──────────────────────────────────────────────────────────
   Card
   ────────────────────────────────────────────────────────── */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padded?: boolean;
}

export function Card({ hoverable, padded = true, style, children, ...rest }: CardProps) {
  const [hover, setHover] = React.useState(false);

  return (
    <div
      {...rest}
      onMouseEnter={(e) => {
        setHover(true);
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHover(false);
        rest.onMouseLeave?.(e);
      }}
      style={{
        background: color.bgCard,
        border: `1px solid ${color.borderSubtle}`,
        borderRadius: radius.lg,
        padding: padded ? spacing.lg : 0,
        boxShadow: hoverable && hover ? shadow.md : shadow.sm,
        transform: hoverable && hover ? "translateY(-1px)" : undefined,
        transition: transition(["box-shadow", "transform", "border-color"], "normal"),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Badge
   ────────────────────────────────────────────────────────── */

type BadgeTone = "default" | "success" | "danger" | "warning" | "info" | "accent";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: "sm" | "md";
}

const badgeToneStyle: Record<BadgeTone, React.CSSProperties> = {
  default: { background: "rgba(168, 152, 120, 0.12)", color: color.secondaryText, borderColor: "rgba(168, 152, 120, 0.3)" },
  success: { background: "rgba(122, 139, 92, 0.15)", color: color.success, borderColor: "rgba(122, 139, 92, 0.4)" },
  danger: { background: "rgba(184, 84, 80, 0.12)", color: color.danger, borderColor: "rgba(184, 84, 80, 0.35)" },
  warning: { background: "rgba(184, 137, 61, 0.15)", color: color.warning, borderColor: "rgba(184, 137, 61, 0.4)" },
  info: { background: "rgba(74, 107, 124, 0.12)", color: color.info, borderColor: "rgba(74, 107, 124, 0.35)" },
  accent: { background: "rgba(184, 84, 80, 0.16)", color: color.accent, borderColor: "rgba(184, 84, 80, 0.4)" },
};

export function Badge({ tone = "default", size = "md", style, children, ...rest }: BadgeProps) {
  const tone_ = badgeToneStyle[tone];
  return (
    <span
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: size === "sm" ? "2px 6px" : "3px 9px",
        fontSize: size === "sm" ? 10 : 11,
        fontWeight: 500,
        letterSpacing: "0.04em",
        borderRadius: radius.sm,
        border: `1px solid ${tone_.borderColor as string}`,
        background: tone_.background,
        color: tone_.color,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────
   Modal
   ────────────────────────────────────────────────────────── */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  width?: number | string;
}

export function Modal({ open, onClose, title, children, width = 560 }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(44, 36, 22, 0.45)",
        backdropFilter: "blur(2px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.md,
        animation: "vsis-modal-fade-in 200ms ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: color.bgCard,
          border: `1px solid ${color.borderSubtle}`,
          borderRadius: radius.xl,
          boxShadow: shadow.lg,
          width,
          maxWidth: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          animation: "vsis-modal-pop 220ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {title && (
          <div
            style={{
              padding: `${spacing.md}px ${spacing.lg}px`,
              borderBottom: `1px solid ${color.borderSubtle}`,
              fontSize: fontSize.h3.size,
              fontWeight: 500,
              color: color.heading,
              fontFamily: "var(--font-serif)",
            }}
          >
            {title}
          </div>
        )}
        <div style={{ padding: spacing.lg }}>{children}</div>
      </div>
      <style jsx global>{`
        @keyframes vsis-modal-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes vsis-modal-pop {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   Tooltip
   ────────────────────────────────────────────────────────── */

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: "top" | "bottom";
}

export function Tooltip({ content, children, placement = "top" }: TooltipProps) {
  const [show, setShow] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const ref = React.useRef<HTMLSpanElement>(null);

  const updatePos = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({
      x: r.left + r.width / 2,
      y: placement === "top" ? r.top : r.bottom,
    });
  };

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={() => {
          updatePos();
          setShow(true);
        }}
        onMouseLeave={() => setShow(false)}
        style={{ display: "inline-block" }}
      >
        {children}
      </span>
      {show && (
        <span
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y + (placement === "top" ? -8 : 8),
            transform: `translate(-50%, ${placement === "top" ? "-100%" : "0"})`,
            background: "rgba(44, 36, 22, 0.95)",
            color: "#F5EFE0",
            padding: "5px 10px",
            borderRadius: radius.sm,
            fontSize: fontSize.micro.size,
            lineHeight: 1.5,
            maxWidth: 240,
            whiteSpace: "normal",
            pointerEvents: "none",
            zIndex: 1100,
            boxShadow: shadow.md,
            animation: "vsis-tip-fade 160ms ease",
          }}
        >
          {content}
          <style jsx>{`
            @keyframes vsis-tip-fade {
              from { opacity: 0; transform: translate(-50%, ${placement === "top" ? "-95%" : "5%"}); }
              to { opacity: 1; transform: translate(-50%, ${placement === "top" ? "-100%" : "0"}); }
            }
          `}</style>
        </span>
      )}
    </>
  );
}

/* ──────────────────────────────────────────────────────────
   LoadingSpinner（呱呱跳跳 — 侘寂風）
   ────────────────────────────────────────────────────────── */

export function LoadingSpinner({ size = 32, label }: { size?: number; label?: string }) {
  const dotSize = Math.max(5, Math.floor(size / 5));
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: spacing.sm,
      }}
    >
      <div
        aria-label="loading"
        style={{
          height: size,
          display: "flex",
          gap: 4,
          alignItems: "flex-end",
        }}
      >
        {/* 三個小圓點輪流跳動，意象「呱呱踏池塘」 */}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              background: color.accent,
              opacity: 0.7,
              animation: `vsis-bounce 0.9s ${i * 0.12}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
      {label && (
        <div style={{ fontSize: fontSize.caption.size, color: color.secondaryText, fontStyle: "italic" }}>
          {label}
        </div>
      )}
      <style jsx global>{`
        @keyframes vsis-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-60%); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   EmptyState
   ────────────────────────────────────────────────────────── */

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: `${spacing["2xl"]}px ${spacing.lg}px`,
        background: color.bgRaised,
        border: `1px dashed ${color.borderSubtle}`,
        borderRadius: radius.lg,
      }}
    >
      <div style={{ fontSize: 32, marginBottom: spacing.sm, opacity: 0.7 }}>
        {icon ?? "🪷"}
      </div>
      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: fontSize.h3.size,
          margin: 0,
          marginBottom: spacing.xs,
          color: color.heading,
        }}
      >
        {title}
      </h3>
      {description && (
        <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, margin: 0, lineHeight: 1.6 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: spacing.md }}>{action}</div>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   ErrorState
   ────────────────────────────────────────────────────────── */

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "資料暫時取不到", message, onRetry }: ErrorStateProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: `${spacing.xl}px ${spacing.lg}px`,
        background: "rgba(184, 84, 80, 0.06)",
        border: `1px solid rgba(184, 84, 80, 0.25)`,
        borderRadius: radius.lg,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: spacing.sm }}>⚠️</div>
      <h3
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: fontSize.h3.size,
          margin: 0,
          marginBottom: spacing.xs,
          color: color.danger,
        }}
      >
        {title}
      </h3>
      {message && (
        <p style={{ color: color.secondaryText, fontSize: fontSize.caption.size, margin: 0, marginBottom: spacing.md }}>
          {message}
        </p>
      )}
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          重試
        </Button>
      )}
    </div>
  );
}
