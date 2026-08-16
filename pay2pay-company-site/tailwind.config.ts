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
        background: "var(--bg-primary)",
        foreground: "var(--text-primary)",
        brand: {
          blue: "#2563EB",
          indigo: "#4F46E5",
          cyan: "#06B6D4",
          gold: "#FFD700",
        },
      },
    },
  },
  plugins: [],
};
export default config;
