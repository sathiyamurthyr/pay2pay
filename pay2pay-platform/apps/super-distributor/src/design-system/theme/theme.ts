import { createTheme, ThemeOptions } from "@mui/material/styles";
import { tokens } from "../tokens/design-tokens";

const baseOptions: ThemeOptions = {
  typography: {
    fontFamily: tokens.typography.fontFamily,
    h1: { fontSize: "36px", fontWeight: 800, lineHeight: 1.2 }, // Large KPI values 36-42px bold
    h2: { fontSize: "28px", fontWeight: 800, lineHeight: 1.25 },
    h3: { fontSize: "22px", fontWeight: 800, lineHeight: 1.3 }, // Section headings: 22px
    subtitle1: { fontSize: "18px", fontWeight: 700, lineHeight: 1.4 }, // KPI titles: 18px
    subtitle2: { fontSize: "17px", fontWeight: 600, lineHeight: 1.4 }, // Menu items: 17px medium
    body1: { fontSize: "16px", fontWeight: 500, lineHeight: 1.6 }, // Minimum body text: 16px
    body2: { fontSize: "16px", fontWeight: 400, lineHeight: 1.6 }, // Minimum body text: 16px
    caption: { fontSize: "14px", fontWeight: 600, lineHeight: 1.4 },
    button: { fontSize: "17px", textTransform: "none", fontWeight: 600, lineHeight: 1.2 }, // Button text: 17px semibold
  },
  shape: {
    borderRadius: 16,
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 1280,
      md: 1536,
      lg: 1920,
      xl: 2560,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: "17px",
          fontWeight: 600,
          borderRadius: "12px",
          textTransform: "none",
          padding: "14px 28px",
          minHeight: "50px",
          transition: tokens.transitions.fast,
        },
        contained: {
          background: tokens.colors.gradients.brand,
          color: "#FFFFFF",
          boxShadow: tokens.shadows.glow,
          "&:hover": {
            boxShadow: "0 8px 24px rgba(37, 99, 235, 0.5)",
            color: "#FFFFFF",
          },
        },
        outlined: {
          color: "#FFFFFF",
          borderColor: "rgba(255, 255, 255, 0.30)",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.10)",
            borderColor: "rgba(255, 255, 255, 0.50)",
            color: "#FFFFFF",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: "16px",
          fontWeight: 800,
          color: "#FFFFFF",
          backgroundColor: "#0F172A",
          padding: "18px 20px",
        },
        body: {
          fontSize: "16px",
          fontWeight: 500,
          color: "#E2E8F0",
          padding: "18px 20px",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          fontSize: "16px",
          color: "#FFFFFF",
          "&::placeholder": {
            color: "rgba(255, 255, 255, 0.75)",
            opacity: 1,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "16px",
          color: "rgba(255, 255, 255, 0.90)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          padding: "28px", // Card padding 24-32px
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontSize: "13px",
          fontWeight: 700,
          borderRadius: "8px",
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
