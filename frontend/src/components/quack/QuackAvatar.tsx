"use client";

import { motion, type Transition } from "framer-motion";
import type { CSSProperties } from "react";

export type QuackState =
  | "calm"
  | "thinking"
  | "observing"
  | "happy"
  | "sleeping"
  | "dehydrated"
  | "studying"
  | "meditating";

type Spec = {
  animate: Record<string, (number | string)[] | number | string>;
  transition?: Transition;
};

const ANIMATIONS: Record<QuackState, Spec> = {
  calm: {
    animate: { y: [0, -2, 0] },
    transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
  },
  thinking: {
    animate: { rotate: [0, -3, 3, 0] },
    transition: { duration: 2, repeat: Infinity },
  },
  observing: {
    animate: { scale: [1, 1.05, 1] },
    transition: { duration: 1.5, repeat: Infinity },
  },
  happy: {
    animate: { y: [0, -10, 0], rotate: [0, -5, 5, 0] },
    transition: { duration: 0.8, repeat: Infinity },
  },
  sleeping: {
    animate: { opacity: [1, 0.6, 1] },
    transition: { duration: 3, repeat: Infinity },
  },
  dehydrated: {
    animate: { y: [0, 2, 0] },
    transition: { duration: 2, repeat: Infinity },
  },
  studying: {
    animate: { rotate: [-2, 2, -2] },
    transition: { duration: 3, repeat: Infinity },
  },
  meditating: { animate: {} },
};

const SIZES: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "24px",
  md: "48px",
  lg: "96px",
  xl: "160px",
};

type Props = {
  state?: QuackState;
  size?: keyof typeof SIZES;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export function QuackAvatar({
  state = "calm",
  size = "md",
  onClick,
  className,
  style,
  title,
}: Props) {
  const spec = ANIMATIONS[state];
  return (
    <motion.span
      aria-label={title ?? "呱呱"}
      role={onClick ? "button" : "img"}
      onClick={onClick}
      className={className}
      style={{
        fontSize: SIZES[size],
        lineHeight: 1,
        display: "inline-block",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        ...style,
      }}
      animate={spec.animate}
      transition={spec.transition}
      whileHover={onClick ? { scale: 1.08 } : undefined}
      title={title}
    >
      🦆
    </motion.span>
  );
}

export default QuackAvatar;
