// Shared Design Tokens & Theme Configs for Pay2Pay Platform

export const themeTokens = {
  colors: {
    brand: {
      primary: "#4F46E5",
      secondary: "#06B6D4",
      accent: "#10B981"
    },
    dark: {
      bg: "#0B0F19",
      surface: "rgba(17, 24, 39, 0.75)",
      border: "rgba(255, 255, 255, 0.12)",
      textPrimary: "#FFFFFF",
      textSecondary: "#9CA3AF"
    }
  },
  glassmorphism: {
    card: "backdrop-blur-md bg-slate-900/80 border border-slate-800 shadow-xl rounded-xl",
    modal: "backdrop-blur-lg bg-slate-950/90 border border-slate-700 shadow-2xl rounded-2xl"
  }
} as const;
