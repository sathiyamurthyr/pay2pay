/**
 * PAY2PAY ENTERPRISE READABILITY & ACCESSIBILITY DESIGN TOKENS
 * Single source of truth tuned for 100% WCAG AAA/AA compliance,
 * 1-meter readability, 150% browser zoom resiliency, and 40+/50+ age retailer usability.
 */

export const tokens = {
  // ── 1. COLOR PALETTE (HIGH CONTRAST WCAG AAA/AA) ──
  colors: {
    brand: {
      primary: "#2563EB",
      primaryHover: "#1D4ED8",
      primaryActive: "#1E40AF",
      primarySubtle: "rgba(37, 99, 235, 0.20)",
      primaryGlow: "rgba(37, 99, 235, 0.40)",
      secondary: "#3B82F6",
      accent: "#60A5FA",
    },
    neutral: {
      dark: {
        bg: "#08111F",
        surface: "rgba(15, 23, 42, 0.85)",
        surfaceSolid: "#0F172A",
        surfaceElevated: "#1E293B",
        border: "rgba(255, 255, 255, 0.14)",
        borderHover: "rgba(255, 255, 255, 0.28)",
        textPrimary: "#FFFFFF",
        textSecondary: "#E2E8F0",
        textMuted: "#CBD5E1",
        textPlaceholder: "#94A3B8",
        textLabel: "#F1F5F9",
        textDisabled: "#64748B",
        sectionHeader: "#60A5FA",
      },
      light: {
        bg: "#F8FAFC",
        surface: "#FFFFFF",
        surfaceSolid: "#FFFFFF",
        surfaceElevated: "#F1F5F9",
        border: "#CBD5E1",
        borderHover: "#94A3B8",
        textPrimary: "#0F172A",
        textSecondary: "#1E293B",
        textMuted: "#475569",
      },
    },
    status: {
      success: "#16A34A",
      successSubtle: "rgba(22, 163, 74, 0.20)",
      successText: "#4ADE80",
      warning: "#D97706",
      warningSubtle: "rgba(217, 119, 6, 0.20)",
      warningText: "#FBBF24",
      error: "#DC2626",
      errorSubtle: "rgba(220, 38, 38, 0.20)",
      errorText: "#F87171",
      info: "#0284C7",
      infoSubtle: "rgba(2, 132, 199, 0.20)",
      infoText: "#38BDF8",
    },
    gradients: {
      brand: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
      glass: "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)",
      darkSurface: "linear-gradient(180deg, rgba(15, 23, 42, 0.90) 0%, rgba(15, 23, 42, 0.85) 100%)",
      accentGlow: "radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.25) 0%, transparent 70%)",
    },
  },

  // ── 2. ACCESSIBILITY & ENTERPRISE TYPOGRAPHY SCALE ──
  typography: {
    fontFamily: '"Inter", "Source Sans 3", "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSizes: {
      xs: "13px",
      sm: "14px",
      md: "16px",     // Minimum body text: 16px
      button: "17px", // Button text: 17px semibold
      menu: "17px",   // Menu items: 17px medium
      lg: "18px",     // KPI titles: 18px
      h3: "22px",     // Section headings: 22px
      h2: "28px",
      h1: "36px",     // KPI values: 36-42px bold
      hero: "42px",   // Large KPI values: 42px bold
    },
    fontWeights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      heavy: 800,
    },
    lineHeights: {
      tight: 1.2,
      compact: 1.35,
      normal: 1.6,
      relaxed: 1.8,
    },
    letterSpacing: {
      tight: "-0.01em",
      normal: "0em",
      wide: "0.03em",
      caps: "0.05em",
    },
  },

  // ── 3. INCREASED SPACING GRID (24-32px Padding & Generous Gap) ──
  spacing: {
    xxs: "4px",
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "20px",
    xl: "24px",     // Card Padding Minimum: 24px
    xxl: "32px",    // Card Padding Generous: 32px
    xxxl: "48px",
  },

  // ── 4. BORDER RADIUSES ──
  radii: {
    xs: "6px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    pill: "9999px",
  },

  // ── 5. SHADOWS & CONTRAST ELEVATIONS ──
  shadows: {
    sm: "0 2px 4px rgba(0, 0, 0, 0.4)",
    md: "0 6px 16px rgba(0, 0, 0, 0.5)",
    lg: "0 12px 32px rgba(0, 0, 0, 0.6)",
    glow: "0 4px 20px rgba(37, 99, 235, 0.40)",
    glowSuccess: "0 4px 20px rgba(22, 163, 74, 0.40)",
    glowError: "0 4px 20px rgba(220, 38, 38, 0.40)",
  },

  // ── 6. ANIMATIONS & TRANSITIONS ──
  transitions: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    normal: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "350ms cubic-bezier(0.4, 0, 0.2, 1)",
  },

  // ── 7. BREAKPOINTS (ZOOM RESILIENCY) ──
  breakpoints: {
    sm: "1280px",
    md: "1536px",
    lg: "1920px",
    xl: "2560px",
    xxl: "3840px",
  },
} as const;

export type DesignTokens = typeof tokens;
