import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/modules/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        foreground: "#292329",
        brand: {
          burgundy: "#A20A3A",
          burgundyDark: "#85072F",
          burgundyDeep: "#6B0525",
          burgundyWarm: "#C42555",
          burgundyLight: "#FFF0F4",
          burgundyMuted: "#C42555",
          gold: "#EDC11E",
          goldLight: "#FFF3C4",
          goldSubtle: "#FFF8DC",
          // Backwards-compatible aliases mapping to gold
          orange: "#EDC11E",
          orangeDark: "#D4A915",
          orangeLight: "#FFF8DC",
          orangeSoft: "#FFF3C4",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#FAF8F9",
          muted: "#F5F2F4",
          border: "#E8E2E5",
          borderDark: "#D8D0D4",
        },
        neutral: {
          primary: "#292329",
          secondary: "#625B60",
          muted: "#8A8288",
          light: "#B8B0B6",
        },
      },
      backgroundImage: {
        "gradient-rich": "linear-gradient(135deg, #A20A3A 0%, #EDC11E 100%)",
        "gradient-rich-h": "linear-gradient(to right, #A20A3A 0%, #EDC11E 100%)",
        "gradient-soft": "linear-gradient(135deg, #A20A3A 0%, #FFF3C4 100%)",
        "gradient-deep": "linear-gradient(135deg, #6B0525 0%, #EDC11E 100%)",
        "gradient-warm": "linear-gradient(135deg, #C42555 0%, #EDC11E 100%)",
        "gradient-subtle": "linear-gradient(135deg, #FFF0F4 0%, #FFF8DC 100%)",
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(41, 35, 41, 0.05), 0 1px 2px rgba(41, 35, 41, 0.03)",
        card: "0 4px 20px -2px rgba(162, 10, 58, 0.05), 0 2px 6px -1px rgba(41, 35, 41, 0.04)",
        cardHover: "0 10px 25px -4px rgba(162, 10, 58, 0.1), 0 4px 10px -2px rgba(41, 35, 41, 0.05)",
        highlight: "0 0 0 3px rgba(237, 193, 30, 0.35)",
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
