import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        // 依 CLAUDE.md 規則 5 的色彩語言
        bull: "#10b981",   // 看多 / 上漲
        bear: "#ef4444",   // 看空 / 下跌
        warn: "#f59e0b",   // 警示
        info: "#3b82f6",   // 資訊
        neutral: "#6b7280",
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
