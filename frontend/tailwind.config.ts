import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"JetBrainsMonoNL NF SemiBold"',
          '"JetBrainsMonoNL NF"',
          '"JetBrains Mono"',
          "var(--font-jetbrains-mono)",
          "ui-monospace",
          "monospace",
        ],
        mono: [
          '"JetBrainsMonoNL NF SemiBold"',
          '"JetBrainsMonoNL NF"',
          '"JetBrains Mono"',
          "var(--font-jetbrains-mono)",
          "ui-monospace",
          "monospace",
        ],
      },
      borderRadius: {
        "squircle-xs": "6px",
        "squircle-sm": "10px",
        squircle: "16px",
        "squircle-lg": "22px",
        "squircle-xl": "28px",
      },
      colors: {
        background: "#090B10",
        surface: "#111420",
        "surface-elevated": "#171B2B",
        "surface-card": "#131726",
        border: "#1E2337",
        "border-subtle": "#161B2E",
        finance: {
          DEFAULT: "#F59E0B",
          glow: "rgba(245, 158, 11, 0.2)",
        },
        market: {
          DEFAULT: "#3B82F6",
          glow: "rgba(59, 130, 246, 0.2)",
        },
        tech: {
          DEFAULT: "#A855F7",
          glow: "rgba(168, 85, 247, 0.2)",
        },
        moderator: {
          DEFAULT: "#9CA3AF",
        },
      },
      boxShadow: {
        glow: "0 0 25px rgba(245, 158, 11, 0.22)",
        "glow-sm": "0 0 15px rgba(245, 158, 11, 0.15)",
        "glow-lg": "0 0 35px rgba(245, 158, 11, 0.3)",
        "glow-green": "0 0 20px rgba(16, 185, 129, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
