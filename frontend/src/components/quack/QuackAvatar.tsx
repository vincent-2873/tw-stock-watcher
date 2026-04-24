"use client";

import { motion, type Transition } from "framer-motion";
import Image from "next/image";
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
const SIZE_PX: Record<"sm" | "md" | "lg" | "xl", number> = {
  sm: 24,
  md: 48,
  lg: 96,
  xl: 160,
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
  const px = SIZE_PX[size];
  return (
    <motion.span
      aria-label={title ?? "呱呱"}
      role={onClick ? "button" : "img"}
      onClick={onClick}
      className={className}
      style={{
        width: SIZES[size],
        height: SIZES[size],
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        ...style,
      }}
      animate={spec.animate}
      transition={spec.transition}
      whileHover={onClick ? { scale: 1.08 } : undefined}
      title={title}
    >
      <Image
        src="/characters/guagua_official_v1.png"
        alt={title ?? "呱呱"}
        width={px}
        height={px}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </motion.span>
  );
}

export default QuackAvatar;
