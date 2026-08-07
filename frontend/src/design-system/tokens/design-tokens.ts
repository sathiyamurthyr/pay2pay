/**
 * PAY2PAY ENTERPRISE DESIGN TOKENS
 * Single source of truth for color palettes, typography scale, spacing units,
 * border radiuses, shadow elevations, glassmorphism surfaces, and animation timing.
 */

export const tokens = {
  // ── 1. COLOR PALETTE ──
  colors: {
    brand: {
      primary: "#2563EB",
      primaryHover: "#1D4ED8",
      primaryActive: "#1E40AF",
      primarySubtle: "rgba(37, 99, 235, 0.15)",
      primaryGlow: "rgba(37, 99, 235, 0.35)",
      secondary: "#3B82F6",
      accent: "#60A5FA",
    },
    neutral: {
      dark: {
        bg: "#08111F",
        surface: "rgba(18, 27, 48, 0.75)",
        surfaceSolid: "#0F172A",
        surfaceElevated: "#1E293B",
        border: "rgba(255, 255, 255, 0.08)",
        borderHover: "rgba(255, 255, 255, 0.18)",
        textPrimary: "#FFFFFF",
        textSecondary: "rgba(255, 255, 255, 0.88)",
        textMuted: "rgba(255, 255, 255, 0.65)",
        textPlaceholder: "rgba(255, 255, 255, 0.70)",
        textLabel: "rgba(255, 255, 255, 0.85)",
        textDisabled: "rgba(255, 255, 255, 0.45)",
        sectionHeader: "#60A5FA",
      },
      light: {
        bg: "#F8FAFC",
        surface: "#FFFFFF",
        surfaceSolid: "#FFFFFF",
        surfaceElevated: "#F1F5F9",
        border: "#E2E8F0",
        borderHover: "#CBD5E1",
        textPrimary: "#0F172A",
        textSecondary: "#475569",
        textMuted: "#94A3B8",
      },
    },
    status: {
      success: "#16A34A",
      successSubtle: "rgba(22, 163, 74, 0.15)",
      successText: "#4ADE80",
      warning: "#D97706",
      warningSubtle: "rgba(217, 119, 6, 0.15)",
      warningText: "#FBBF24",
      error: "#DC2626",
      errorSubtle: "rgba(220, 38, 38, 0.15)",
      errorText: "#F87171",
      info: "#0284C7",
      infoSubtle: "rgba(2, 132, 199, 0.15)",
      infoText: "#38BDF8",
    },
    gradients: {
      brand: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
      glass: "linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
      darkSurface: "linear-gradient(180deg, rgba(18, 27, 48, 0.85) 0%, rgba(15, 23, 42, 0.85) 100%)",
      accentGlow: "radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.2) 0%, transparent 70%)",
    },
  },

  // ── 2. TYPOGRAPHY SCALE ──
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSizes: {
      xs: "11px",
      sm: "13px",
      md: "14px",
      lg: "16px",
      xl: "18px",
      h3: "20px",
      h2: "24px",
      h1: "30px",
      hero: "36px",
    },
    fontWeights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      heavy: 900,
    },
    lineHeights: {
      tight: 1.1,
      compact: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: "-0.02em",
      normal: "0em",
      wide: "0.05em",
      caps: "0.1em",
    },
  },

  // ── 3. SPACING GRID (4px / 8px Base) ──
  spacing: {
    xxs: "4px",
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "20px",
    xl: "24px",
    xxl: "32px",
    xxxl: "48px",
  },

  // ── 4. BORDER RADIUSES ──
  radii: {
    xs: "4px",
    sm: "8px",
    md: "10px",
    lg: "12px",
    xl: "16px",
    pill: "9999px",
  },

  // ── 5. ELEVATIONS & SHADOWS ──
  shadows: {
    sm: "0 1px 3px rgba(0, 0, 0, 0.3)",
    md: "0 4px 12px rgba(0, 0, 0, 0.4)",
    lg: "0 8px 24px rgba(0, 0, 0, 0.5)",
    glow: "0 4px 16px rgba(37, 99, 235, 0.35)",
    glowSuccess: "0 4px 16px rgba(22, 163, 74, 0.35)",
    glowError: "0 4px 16px rgba(220, 38, 38, 0.35)",
  },

  // ── 6. ANIMATIONS & TRANSITIONS ──
  transitions: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    normal: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "350ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  // ── 7. BREAKPOINTS ──
  breakpoints: {
    sm: "1366px",
    md: "1600px",
    lg: "1920px",
    xl: "2560px",
    xxl: "3840px",
  },
} as const;

export type DesignTokens = typeof tokens;
