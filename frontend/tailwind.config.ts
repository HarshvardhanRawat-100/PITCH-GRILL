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
      colors: {
        background: "#0B0D14",
        surface: "#111420",
        "surface-elevated": "#171B2B",
        "surface-card": "#131726",
        border: "#1E2337",
        "border-subtle": "#161B2E",
        violet: {
          glow: "rgba(139, 92, 246, 0.35)",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
        },
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
        glow: "0 0 25px rgba(124, 58, 237, 0.25)",
        "glow-sm": "0 0 15px rgba(124, 58, 237, 0.18)",
        "glow-lg": "0 0 35px rgba(139, 92, 246, 0.35)",
        "glow-green": "0 0 20px rgba(16, 185, 129, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
