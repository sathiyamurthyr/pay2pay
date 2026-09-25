import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#94003A",
          "primary-hover": "#78002F",
          "primary-light": "#F8E6EE",
          gold: "#E7B631",
          "gold-hover": "#D3A51F",
          accent: "#EDC11E",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#FAFAFC",
        },
        app: {
          bg: "#F5F6FA",
        },
        text: {
          primary: "#1F2937",
          secondary: "#4B5563",
          muted: "#6B7280",
          disabled: "#9CA3AF",
          gold: "#B8860B",
        },
        status: {
          success: "#16A34A",
          "success-light": "#DCFCE7",
          "success-border": "#86EFAC",
          "success-text": "#166534",
          error: "#DC2626",
          "error-light": "#FEE2E2",
          "error-border": "#FCA5A5",
          "error-text": "#991B1B",
          warning: "#D97706",
          "warning-light": "#FEF3C7",
          "warning-border": "#FCD34D",
          "warning-text": "#92400E",
          info: "#2563EB",
          "info-light": "#DBEAFE",
          "info-border": "#93C5FD",
          "info-text": "#1E40AF",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
