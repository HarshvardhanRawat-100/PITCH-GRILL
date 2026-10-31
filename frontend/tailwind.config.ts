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
        background: "#090A0F",
        surface: "#12141D",
        "surface-elevated": "#1A1D2B",
        border: "#25293C",
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
    },
  },
  plugins: [],
};

export default config;
