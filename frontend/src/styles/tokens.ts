/**
 * Design Tokens — 前台
 *
 * NEXT_TASK_009 階段 1：建立統一視覺系統
 *
 * 原則：
 *  - 顏色透過 CSS variables 提供（globals.css）— 這裡是 TS facade
 *  - 字型 / 間距 / 陰影 / 圓角 / 動畫直接給數值，不打 CSS vars（避免 build-time 不可解析）
 *  - 所有 UI 元件統一從這份引用，不寫死數字
 *
 * 既有 CSS variables（globals.css）:
 *   --washi / --sumi / --shu / --kin / --matcha / --ao 等
 */

export const color = {
  // 主要文字（深墨）
  primaryText: 'var(--sumi)',
  secondaryText: 'var(--sumi-mist)',
  heading: 'var(--sumi)',
  // 重點 / 強調
  accent: 'var(--shu)',
  accentLight: 'var(--shu-light)',
  gold: 'var(--kin)',
  // 狀態
  success: 'var(--matcha)',
  danger: 'var(--shu)',
  warning: 'var(--kin)',
  info: 'var(--ao)',
  // 背景
  bgPrimary: 'var(--washi)',
  bgCard: 'var(--washi-warm)',
  bgRaised: 'var(--washi-warm)',
  bgElevated: 'var(--washi-deep)',
  // 邊框
  borderSubtle: 'var(--border)',
  borderStrong: 'var(--border-strong)',
  // 股市紅綠（台股紅漲綠跌）
  rise: 'var(--rise-zen)',
  riseLight: 'var(--rise-zen-light)',
  fall: 'var(--fall-zen)',
  fallLight: 'var(--fall-zen-light)',
} as const;

// 間距 scale（px）
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

// 字級 scale（px / line-height）
export const fontSize = {
  micro: { size: 12, lineHeight: 1.4 },
  caption: { size: 14, lineHeight: 1.5 },
  body: { size: 16, lineHeight: 1.6 },
  h3: { size: 20, lineHeight: 1.4 },
  h2: { size: 24, lineHeight: 1.3 },
  h1: { size: 32, lineHeight: 1.2 },
} as const;

// 圓角 scale（px）
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

// 陰影 scale（透過 CSS vars，glob 已定義）
export const shadow = {
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  gold: 'var(--shadow-gold)',
} as const;

// 動畫 duration（ms）
export const duration = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// 動畫 easing
export const easing = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
} as const;

// 字體
export const font = {
  serif: 'var(--font-serif)',
  sans: 'var(--font-sans)',
  mono: 'var(--font-mono)',
  latin: 'var(--font-latin)',
} as const;

// 共用 helper
export const transition = (props: string | string[] = 'all', d: keyof typeof duration = 'normal') => {
  const list = Array.isArray(props) ? props : [props];
  return list.map((p) => `${p} ${duration[d]}ms ${easing.default}`).join(', ');
};

export type SpacingKey = keyof typeof spacing;
export type FontSizeKey = keyof typeof fontSize;
export type RadiusKey = keyof typeof radius;
export type ShadowKey = keyof typeof shadow;
