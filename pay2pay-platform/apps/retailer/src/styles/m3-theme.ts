import { createTheme } from "@mui/material/styles";
import { colors, typography, radius, shadows } from "./design-tokens";

export const m3Theme = createTheme({
  palette: {
    mode: "light",
    primary:    { main: colors.primary, dark: colors.primaryHover, light: colors.primaryLight, contrastText: "#FFFFFF" },
    secondary:  { main: colors.purple, light: colors.purpleLight },
    success:    { main: colors.success, light: colors.successLight, contrastText: "#FFFFFF" },
    warning:    { main: colors.warning, light: colors.warningLight },
    error:      { main: colors.danger, light: colors.dangerLight },
    background: { default: colors.bg, paper: colors.surface },
    divider:    colors.divider,
    text: { primary: colors.textPrimary, secondary: colors.textSecondary, disabled: colors.textDisabled },
  },
  typography: {
    fontFamily: typography.fontFamily,
    h1: { fontSize: "36px", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", color: colors.textPrimary },
    h2: { fontSize: "28px", fontWeight: 700, lineHeight: 1.25, letterSpacing: "-0.01em", color: colors.textPrimary },
    h3: { fontSize: "22px", fontWeight: 700, lineHeight: 1.3, color: colors.textPrimary },
    h4: { fontSize: "32px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", color: colors.textPrimary },
    h5: { fontSize: "20px", fontWeight: 700, lineHeight: 1.35, color: colors.textPrimary },
    h6: { fontSize: "17px", fontWeight: 700, lineHeight: 1.4, color: colors.textPrimary },
    subtitle1: { fontSize: "15px", fontWeight: 600, lineHeight: 1.5, color: colors.textPrimary },
    subtitle2: { fontSize: "13px", fontWeight: 700, lineHeight: 1.4, color: colors.textPrimary },
    body1: { fontSize: "15px", fontWeight: 500, lineHeight: 1.6, color: colors.textPrimary },
    body2: { fontSize: "14px", fontWeight: 400, lineHeight: 1.55, color: colors.textSecondary },
    caption: { fontSize: "13px", fontWeight: 400, lineHeight: 1.4, color: colors.textSecondary },
    overline: { fontSize: "12px", fontWeight: 700, letterSpacing: "0.07em", lineHeight: 1.6, color: colors.textMuted, textTransform: "uppercase" },
    button: { fontSize: "15px", fontWeight: 700, textTransform: "none", letterSpacing: "0.01em" },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.bg,
          fontFamily: typography.fontFamily,
          overflowX: "hidden",
          maxWidth: "100vw",
        },
        "*, *::before, *::after": { boxSizing: "border-box" },
        "@keyframes spin": { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
        "@keyframes pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.5 } },
        "@keyframes shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "@keyframes fadeIn": { from: { opacity: 0, transform: "translateY(8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          height: 48,
          borderRadius: radius.button,
          padding: "0 24px",
          boxShadow: shadows.button,
          fontWeight: 700,
          fontSize: "15px",
          transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
          textTransform: "none",
          "&:hover": { boxShadow: "none" },
        },
        contained: {
          backgroundColor: colors.primary,
          color: "#FFFFFF",
          "&:hover": { backgroundColor: colors.primaryHover, boxShadow: shadows.buttonHover },
        },
        outlined: {
          borderColor: colors.border,
          color: colors.textPrimary,
          "&:hover": { borderColor: colors.primary, backgroundColor: colors.primaryLighter, color: colors.primary },
        },
        sizeSmall: { height: 36, padding: "0 16px", fontSize: "13px", borderRadius: "10px" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderRadius: radius.card,
        },
        elevation0: {
          boxShadow: "none",
        },
        elevation1: { boxShadow: shadows.card },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radius.card,
          boxShadow: shadows.card,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.surface,
          transition: "box-shadow 0.22s cubic-bezier(0.4,0,0.2,1), transform 0.22s cubic-bezier(0.4,0,0.2,1)",
          "&:hover": { boxShadow: shadows.cardHover },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radius.chip,
          fontWeight: 700,
          fontSize: "12px",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.input,
          backgroundColor: colors.surface,
          "& fieldset": { borderColor: colors.border, transition: "border-color 0.15s" },
          "&:hover fieldset": { borderColor: colors.borderStrong },
          "&.Mui-focused fieldset": { borderColor: colors.primary, borderWidth: 2 },
        },
        input: { fontSize: "15px", fontWeight: 500 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: radius.dialog, boxShadow: shadows.dialog, border: `1px solid ${colors.border}` },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
          transition: "all 0.18s cubic-bezier(0.4,0,0.2,1)",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.textPrimary,
          fontSize: "12px",
          fontWeight: 600,
          borderRadius: "8px",
          padding: "6px 12px",
        },
        arrow: { color: colors.textPrimary },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: { fontSize: "10px", fontWeight: 800, minWidth: 18, height: 18 },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: colors.divider } },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: colors.divider,
          "&::after": {
            background: `linear-gradient(90deg, transparent, ${colors.bg}, transparent)`,
          },
        },
      },
    },
  },
});
