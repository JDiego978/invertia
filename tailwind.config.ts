import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        card: "#1e293b",
        "card-hover": "#263548",
        border: "#334155",
        green: {
          500: "#22c55e",
          400: "#4ade80",
        },
        gold: {
          500: "#f59e0b",
          400: "#fbbf24",
        },
        red: {
          500: "#ef4444",
          400: "#f87171",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
