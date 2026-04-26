"use client";

/**
 * UI 共用元件庫 — 辦公室
 *
 * NEXT_TASK_009 階段 1.3
 *
 * 跟前台元件 API 一致（Button / Card / Badge / Modal / Tooltip /
 * LoadingSpinner / EmptyState / ErrorState）。
 */

import React from "react";
import { color, radius, spacing, transition, fontSize, shadow } from "@/styles/tokens";

/* ───── Button ───── */

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
  sm: { padding: `${spacing.xs}px ${spacing.sm}px`, fontSize: fontSize.caption.size, minHeight: 26 },
  md: { padding: `${spacing.sm - 2}px ${spacing.md}px`, fontSize: fontSize.body.size, minHeight: 34 },
  lg: { padding: `${spacing.sm + 2}px ${spacing.lg}px`, fontSize: fontSize.body.size + 1, minHeight: 42 },
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

  return (
    <button
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
        ...buttonVariantStyle[variant],
        ...buttonSizeStyle[size],
        width: fullWidth ? "100%" : undefined,
        borderRadius: radius.md,
        fontFamily: "inherit",
        fontWeight: 500,
        cursor: rest.disabled ? "not-allowed" : "pointer",
        opacity: rest.disabled ? 0.5 : hover ? 0.9 : 1,
        transition: transition(["opacity", "background"], "fast"),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.xs,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ───── Card ───── */

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
        padding: padded ? spacing.md + 2 : 0,
        boxShadow: hoverable && hover ? shadow.md : shadow.sm,
        transform: hoverable && hover ? "translateY(-1px)" : undefined,
        transition: transition(["box-shadow", "transform"], "normal"),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ───── Badge ───── */

type BadgeTone = "default" | "success" | "danger" | "warning" | "info" | "accent";

const badgeToneStyle: Record<BadgeTone, React.CSSProperties> = {
  default: { background: "rgba(168, 152, 120, 0.12)", color: color.secondaryText, borderColor: "rgba(168, 152, 120, 0.3)" },
  success: { background: "rgba(93, 122, 74, 0.15)", color: color.success, borderColor: "rgba(93, 122, 74, 0.4)" },
  danger: { background: "rgba(184, 84, 80, 0.12)", color: color.danger, borderColor: "rgba(184, 84, 80, 0.35)" },
  warning: { background: "rgba(184, 137, 61, 0.15)", color: color.warning, borderColor: "rgba(184, 137, 61, 0.4)" },
  info: { background: "rgba(74, 107, 124, 0.12)", color: color.info, borderColor: "rgba(74, 107, 124, 0.35)" },
  accent: { background: "rgba(184, 84, 80, 0.16)", color: color.accent, borderColor: "rgba(184, 84, 80, 0.4)" },
};

export function Badge({
  tone = "default",
  size = "md",
  style,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone; size?: "sm" | "md" }) {
  const t = badgeToneStyle[tone];
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
        border: `1px solid ${t.borderColor as string}`,
        background: t.background,
        color: t.color,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ───── Modal ───── */

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
        background: "rgba(45, 38, 32, 0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.md,
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
        }}
      >
        {title && (
          <div
            style={{
              padding: `${spacing.md - 2}px ${spacing.md + 2}px`,
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
        <div style={{ padding: spacing.md + 2 }}>{children}</div>
      </div>
    </div>
  );
}

/* ───── Tooltip ───── */

export function Tooltip({
  content,
  children,
  placement = "top",
}: {
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: "top" | "bottom";
}) {
  const [show, setShow] = React.useState(false);
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  const ref = React.useRef<HTMLSpanElement>(null);

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={() => {
          if (ref.current) {
            const r = ref.current.getBoundingClientRect();
            setPos({ x: r.left + r.width / 2, y: placement === "top" ? r.top : r.bottom });
          }
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
            background: "rgba(45, 38, 32, 0.95)",
            color: "#F5EFE0",
            padding: "5px 9px",
            borderRadius: radius.sm,
            fontSize: 11,
            lineHeight: 1.5,
            maxWidth: 240,
            whiteSpace: "normal",
            pointerEvents: "none",
            zIndex: 1100,
            boxShadow: shadow.md,
          }}
        >
          {content}
        </span>
      )}
    </>
  );
}

/* ───── LoadingSpinner ───── */

export function LoadingSpinner({ size = 28, label }: { size?: number; label?: string }) {
  const dotSize = Math.max(4, Math.floor(size / 5));
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: spacing.sm }}>
      <div style={{ display: "flex", gap: 4, height: size, alignItems: "flex-end" }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: "50%",
              background: color.accent,
              opacity: 0.7,
              animation: `office-bounce 0.9s ${i * 0.12}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
      {label && <div style={{ fontSize: 12, color: color.secondaryText, fontStyle: "italic" }}>{label}</div>}
      <style jsx global>{`
        @keyframes office-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-50%); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ───── EmptyState ───── */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
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
      <div style={{ fontSize: 30, marginBottom: spacing.sm, opacity: 0.7 }}>{icon ?? "🪷"}</div>
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
        <p style={{ color: color.secondaryText, fontSize: 12, margin: 0, lineHeight: 1.6 }}>{description}</p>
      )}
      {action && <div style={{ marginTop: spacing.md }}>{action}</div>}
    </div>
  );
}

/* ───── ErrorState ───── */

export function ErrorState({
  title = "資料暫時取不到",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
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
      <div style={{ fontSize: 26, marginBottom: spacing.sm }}>⚠️</div>
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
        <p style={{ color: color.secondaryText, fontSize: 12, margin: 0, marginBottom: spacing.md }}>{message}</p>
      )}
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          重試
        </Button>
      )}
    </div>
  );
}
