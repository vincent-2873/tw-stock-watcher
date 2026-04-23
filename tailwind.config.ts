import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        bg: "hsl(var(--bg))",
        fg: "hsl(var(--fg))",
        muted: "hsl(var(--muted))",
        "muted-fg": "hsl(var(--muted-fg))",
        border: "hsl(var(--border))",
        card: "hsl(var(--card))",
        primary: "hsl(var(--primary))",
        "primary-fg": "hsl(var(--primary-fg))",
        success: "hsl(var(--success))",
        danger: "hsl(var(--danger))",
        warning: "hsl(var(--warning))",
        up: "hsl(0 75% 50%)",      // 紅漲（淺色配色）
        down: "hsl(142 60% 35%)",  // 綠跌
      },
      boxShadow: {
        "card": "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-hover": "0 4px 12px -2px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans TC", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
