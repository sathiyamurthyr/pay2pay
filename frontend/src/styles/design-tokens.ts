/**
 * Near 4 You (n4u) Enterprise FinTech — Design Tokens
 * Material Design 3 · Enterprise Banking · Burgundy + Orange
 */

export const colors = {
  // Brand Near4You Burgundy (Primary)
  primary: "#A20A3A",
  primaryHover: "#85072F",
  primaryLight: "#FFF0F4",
  primaryLighter: "#FAF8F9",
  primaryDark: "#6B0525",
  primaryWarm: "#C42555",
  primaryDeep: "#6B0525",

  // Brand Gold Yellow (Accent)
  gold: "#EDC11E",
  goldDark: "#D4A915",
  goldLight: "#FFF3C4",
  goldSubtle: "#FFF8DC",
  goldBorder: "rgba(237, 193, 30, 0.4)",
  goldSurface: "rgba(237, 193, 30, 0.1)",

  // Legacy aliases
  orange: "#EDC11E",
  orangeDark: "#D4A915",
  orangeLight: "#FFF8DC",
  orangeSoft: "#FFF3C4",

  // Dual-Colour Gradients
  gradientRich: "linear-gradient(135deg, #A20A3A 0%, #EDC11E 100%)",
  gradientRichH: "linear-gradient(to right, #A20A3A 0%, #EDC11E 100%)",
  gradientSoft: "linear-gradient(135deg, #A20A3A 0%, #FFF3C4 100%)",
  gradientDeep: "linear-gradient(135deg, #6B0525 0%, #EDC11E 100%)",
  gradientWarm: "linear-gradient(135deg, #C42555 0%, #EDC11E 100%)",
  gradientSubtle: "linear-gradient(135deg, #FFF0F4 0%, #FFF8DC 100%)",

  // Deep Brand Background (Wallet card)
  navy: "#6B0525",
  navyLight: "#85072F",
  navyText: "#FFFFFF",

  // Semantic Status
  success: "#16A34A",
  successLight: "#DCFCE7",
  successBorder: "#86EFAC",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  warningBorder: "#FCD34D",
  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  purple: "#A20A3A",
  purpleLight: "#FFF0F4",
  purpleBorder: "#E8E2E5",
  info: "#A20A3A",
  infoLight: "#FFF0F4",

  // Neutral - Strict White
  bg: "#FFFFFF",
  surface: "#FFFFFF",
  border: "#E8E2E5",
  divider: "#E8E2E5",
  borderStrong: "#D8D0D4",

  // Text
  textPrimary: "#292329",
  textSecondary: "#625B60",
  textMuted: "#8A8288",
  textDisabled: "#B8B0B6",

  // Status chips
  statusSuccess: { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC" },
  statusPending: { bg: "#FEF3C7", text: "#B45309", border: "#FCD34D" },
  statusFailed:  { bg: "#FEE2E2", text: "#B91C1C", border: "#FCA5A5" },
  statusInfo:    { bg: "#FFF0F4", text: "#A20A3A", border: "#E8E2E5" },
} as const;

export const typography = {
  fontFamily: "'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontFamilyMono: "'JetBrains Mono', 'Fira Code', 'Roboto Mono', monospace",

  dashboardTitle: { fontSize: "36px", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em" },
  sectionHeading: { fontSize: "20px", fontWeight: 700, lineHeight: 1.3, letterSpacing: "-0.01em" },
  cardHeading: { fontSize: "15px", fontWeight: 700, lineHeight: 1.4 },
  cardValue: { fontSize: "32px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em" },
  body: { fontSize: "15px", fontWeight: 500, lineHeight: 1.6 },
  bodySmall: { fontSize: "14px", fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: "13px", fontWeight: 400, lineHeight: 1.4 },
  label: { fontSize: "12px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const },
  monospace: { fontFamily: "'JetBrains Mono', 'Roboto Mono', monospace", fontSize: "14px", fontWeight: 600 },
} as const;

export const spacing = {
  sectionGap: 32,
  cardGap: 24,
  cardPadding: 24,
  gridBase: 8,
} as const;

export const radius = {
  card: "20px",
  button: "16px",
  input: "14px",
  dialog: "24px",
  chip: "8px",
  icon: "12px",
  small: "8px",
  tag: "6px",
} as const;

export const shadows = {
  card: "0 8px 24px rgba(0,0,0,0.06)",
  cardHover: "0 12px 32px rgba(0,0,0,0.10)",
  navbar: "0 1px 0 #E5E7EB",
  sidebar: "2px 0 24px rgba(0,0,0,0.04)",
  dialog: "0 20px 60px rgba(0,0,0,0.12)",
  walletCard: "0 12px 32px rgba(30,58,138,0.22)",
  button: "none",
  buttonHover: "0 4px 14px rgba(37,99,235,0.25)",
  goldButton: "0 4px 14px rgba(212,175,55,0.2)",
} as const;

export const transitions = {
  fast: "0.15s cubic-bezier(0.4,0,0.2,1)",
  normal: "0.22s cubic-bezier(0.4,0,0.2,1)",
  slow: "0.35s cubic-bezier(0.4,0,0.2,1)",
} as const;

export const layout = {
  headerHeight: 72,
  sidebarWidth: 280,
  menuItemHeight: 56,
  menuIconSize: 24,
  menuPadding: 20,
} as const;
