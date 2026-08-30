/**
 * Pay2Pay Enterprise FinTech — Design Tokens
 * Material Design 3 · Enterprise Banking · Premium Blue + Gold
 */

export const colors = {
  // Brand
  primary: "#2563EB",
  primaryHover: "#1D4ED8",
  primaryLight: "#DBEAFE",
  primaryLighter: "#EFF6FF",
  primaryDark: "#1E40AF",

  // Dark Navy (Wallet card)
  navy: "#1E3A8A",
  navyLight: "#1E40AF",
  navyText: "#FFFFFF",

  // Premium Gold
  gold: "#D4AF37",
  goldLight: "#F8E7A0",
  goldBorder: "rgba(212,175,55,0.35)",
  goldSurface: "rgba(212,175,55,0.08)",

  // Semantic
  success: "#16A34A",
  successLight: "#DCFCE7",
  successBorder: "#86EFAC",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  warningBorder: "#FCD34D",
  danger: "#DC2626",
  dangerLight: "#FEE2E2",
  dangerBorder: "#FCA5A5",
  purple: "#7C3AED",
  purpleLight: "#F3E8FF",
  purpleBorder: "#C4B5FD",
  info: "#0EA5E9",
  infoLight: "#E0F2FE",

  // Neutral
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  border: "#E5E7EB",
  divider: "#F1F5F9",
  borderStrong: "#D1D5DB",

  // Text
  textPrimary: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  textDisabled: "#D1D5DB",

  // Status chips
  statusSuccess: { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC" },
  statusPending: { bg: "#FEF3C7", text: "#B45309", border: "#FCD34D" },
  statusFailed:  { bg: "#FEE2E2", text: "#B91C1C", border: "#FCA5A5" },
  statusInfo:    { bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD" },
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
