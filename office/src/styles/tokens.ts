/**
 * Design Tokens — 辦公室
 *
 * NEXT_TASK_009 階段 1：建立統一視覺系統
 *
 * 跟 frontend tokens 對齊。office globals.css 補上對應 CSS vars。
 */

export const color = {
  primaryText: 'var(--fg)',
  secondaryText: 'var(--muted-fg)',
  heading: 'var(--fg)',

  accent: 'var(--accent-red)',
  accentLight: 'var(--accent-red-light, #D67670)',
  gold: 'var(--accent-gold)',

  success: 'var(--accent-green)',
  danger: 'var(--accent-red)',
  warning: 'var(--accent-gold)',
  info: 'var(--accent-blue, #4A6B7C)',

  bgPrimary: 'var(--bg)',
  bgCard: 'var(--card)',
  bgRaised: 'var(--bg-raised)',
  bgElevated: 'var(--bg-elevated, #FAF6EC)',

  borderSubtle: 'var(--border)',
  borderStrong: 'var(--border-strong)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const fontSize = {
  micro: { size: 11, lineHeight: 1.4 },
  caption: { size: 13, lineHeight: 1.5 },
  body: { size: 14, lineHeight: 1.6 },
  h3: { size: 18, lineHeight: 1.4 },
  h2: { size: 22, lineHeight: 1.3 },
  h1: { size: 30, lineHeight: 1.2 },
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 10,
  xl: 14,
} as const;

export const shadow = {
  sm: '0 1px 3px rgba(45, 38, 32, 0.06)',
  md: '0 4px 12px rgba(45, 38, 32, 0.08)',
  lg: '0 10px 30px rgba(45, 38, 32, 0.12)',
  gold: '0 8px 24px rgba(184, 137, 61, 0.18)',
} as const;

export const duration = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

export const easing = {
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
} as const;

export const font = {
  serif: 'var(--font-serif)',
  mono: 'var(--font-mono)',
  sans: 'system-ui, -apple-system, "Noto Sans TC", "PingFang TC", sans-serif',
} as const;

export const transition = (props: string | string[] = 'all', d: keyof typeof duration = 'normal') => {
  const list = Array.isArray(props) ? props : [props];
  return list.map((p) => `${p} ${duration[d]}ms ${easing.default}`).join(', ');
};

export type SpacingKey = keyof typeof spacing;
export type FontSizeKey = keyof typeof fontSize;
export type RadiusKey = keyof typeof radius;
export type ShadowKey = keyof typeof shadow;
