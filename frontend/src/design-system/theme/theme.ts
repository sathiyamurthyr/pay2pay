import { createTheme, ThemeOptions } from "@mui/material/styles";
import { tokens } from "../tokens/design-tokens";

const baseOptions: ThemeOptions = {
  typography: {
    fontFamily: tokens.typography.fontFamily,
    h1: { fontSize: tokens.typography.fontSizes.h1, fontWeight: tokens.typography.fontWeights.bold },
    h2: { fontSize: tokens.typography.fontSizes.h2, fontWeight: tokens.typography.fontWeights.bold },
    h3: { fontSize: tokens.typography.fontSizes.h3, fontWeight: tokens.typography.fontWeights.semibold },
    subtitle1: { fontSize: tokens.typography.fontSizes.lg, fontWeight: tokens.typography.fontWeights.semibold },
    subtitle2: { fontSize: tokens.typography.fontSizes.md, fontWeight: tokens.typography.fontWeights.medium },
    body1: { fontSize: tokens.typography.fontSizes.md, fontWeight: tokens.typography.fontWeights.regular },
    body2: { fontSize: tokens.typography.fontSizes.sm, fontWeight: tokens.typography.fontWeights.regular },
    caption: { fontSize: tokens.typography.fontSizes.xs, fontWeight: tokens.typography.fontWeights.medium },
    button: { textTransform: "none", fontWeight: tokens.typography.fontWeights.semibold },
  },
  shape: {
    borderRadius: 12,
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 1366,
      md: 1600,
      lg: 1920,
      xl: 2560,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radii.md,
          textTransform: "none",
          fontWeight: tokens.typography.fontWeights.semibold,
          padding: "10px 20px",
          transition: tokens.transitions.fast,
        },
        contained: {
          background: tokens.colors.gradients.brand,
          color: "#FFFFFF",
          boxShadow: tokens.shadows.glow,
          "&:hover": {
            boxShadow: "0 6px 20px rgba(37, 99, 235, 0.5)",
            color: "#FFFFFF",
          },
        },
        outlined: {
          color: "#FFFFFF",
          borderColor: "rgba(255, 255, 255, 0.25)",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            borderColor: "rgba(255, 255, 255, 0.40)",
            color: "#FFFFFF",
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          color: "#FFFFFF",
          "&::placeholder": {
            color: "rgba(255, 255, 255, 0.70)",
            opacity: 1,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "rgba(255, 255, 255, 0.85)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: tokens.typography.fontWeights.bold,
          borderRadius: tokens.radii.sm,
        },
      },
    },
  },
};

export const enterpriseDarkTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: "dark",
    background: {
      default: tokens.colors.neutral.dark.bg,
      paper: tokens.colors.neutral.dark.surfaceSolid,
    },
    primary: {
      main: tokens.colors.brand.primary,
      light: tokens.colors.brand.secondary,
      dark: tokens.colors.brand.primaryActive,
      contrastText: "#FFFFFF",
    },
    text: {
      primary: tokens.colors.neutral.dark.textPrimary,
      secondary: tokens.colors.neutral.dark.textSecondary,
    },
    divider: tokens.colors.neutral.dark.border,
  },
});

export const enterpriseLightTheme = createTheme({
  ...baseOptions,
  palette: {
    mode: "light",
    background: {
      default: tokens.colors.neutral.light.bg,
      paper: tokens.colors.neutral.light.surfaceSolid,
    },
    primary: {
      main: tokens.colors.brand.primary,
      light: tokens.colors.brand.secondary,
      dark: tokens.colors.brand.primaryActive,
      contrastText: "#FFFFFF",
    },
    text: {
      primary: tokens.colors.neutral.light.textPrimary,
      secondary: tokens.colors.neutral.light.textSecondary,
    },
    divider: tokens.colors.neutral.light.border,
  },
});
