"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

export type ThemeMode = "AUTO" | "LIGHT" | "DARK";
export type EffectiveTheme = "light" | "dark";

// Configurable Day/Night Boundary Hours (in local retailer timezone)
export const DAY_START_HOUR = 6;  // 06:00 AM
export const DAY_END_HOUR = 18;   // 06:00 PM (18:00)
export const DEFAULT_TIMEZONE = "Asia/Kolkata";

interface ThemeContextType {
  themeMode: ThemeMode;
  effectiveTheme: EffectiveTheme;
  timezone: string;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setTimezone: (tz: string) => void;
  isAuto: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Calculates current local hour in the specified retailer timezone.
 */
export const getLocalHourInTimezone = (tz: string = DEFAULT_TIMEZONE): number => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === "hour");
    if (hourPart) {
      const h = parseInt(hourPart.value, 10);
      return isNaN(h) ? new Date().getHours() : h;
    }
  } catch (e) {
    console.warn("Error calculating hour in timezone, falling back to local time:", e);
  }
  return new Date().getHours();
};

/**
 * Resolves effective theme ("light") strictly for Near4You White Brand Design System.
 */
export const resolveEffectiveTheme = (
  _mode: ThemeMode = "LIGHT",
  _tz: string = DEFAULT_TIMEZONE
): EffectiveTheme => {
  // Near4You Strict White Background & Brand Color Enforcement — Always Light
  return "light";
};

/**
 * Applies dynamic CSS variables and DOM data attributes for Near4You strict white brand styling.
 */
export const applyThemeTokensToDOM = (_effectiveTheme: EffectiveTheme = "light") => {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute("data-theme", "light");
  root.classList.add("light");
  root.classList.remove("dark");
  body?.classList.add("light");
  body?.classList.remove("dark");

  // Semantic CSS Tokens - Near4You Strict White Brand System
  root.style.setProperty("--background-primary", "#FFFFFF");
  root.style.setProperty("--background-secondary", "#FAF8F9");
  root.style.setProperty("--surface", "#FFFFFF");
  root.style.setProperty("--surface-elevated", "#FFFFFF");
  root.style.setProperty("--border", "#E8E2E5");
  root.style.setProperty("--border-strong", "#D8D0D4");
  root.style.setProperty("--text-primary", "#292329");
  root.style.setProperty("--text-secondary", "#625B60");
  root.style.setProperty("--text-muted", "#8A8288");
  root.style.setProperty("--accent", "#A20A3A");
  root.style.setProperty("--accent-hover", "#85072F");
  root.style.setProperty("--accent-gold", "#EDC11E");
  root.style.setProperty("--accent-orange", "#EDC11E");
  root.style.setProperty("--success", "#16A34A");
  root.style.setProperty("--warning", "#F59E0B");
  root.style.setProperty("--danger", "#DC2626");
  root.style.setProperty("--info", "#A20A3A");
  root.style.setProperty("--p2p-header-bg", "#FFFFFF");
  root.style.setProperty("--p2p-header-text", "#292329");
  root.style.setProperty("--p2p-page-bg", "#FFFFFF");
  root.style.setProperty("--p2p-card-bg", "#FFFFFF");
  root.style.setProperty("--p2p-card-border", "#E8E2E5");
  root.style.setProperty("--p2p-text-color", "#292329");
  root.style.setProperty("--p2p-subtext-color", "#625B60");
};

/**
 * Creates dynamic MUI Theme based on Near4You brand system
 */
export const createMuiThemeForEffectiveTheme = (_effectiveTheme: EffectiveTheme = "light"): Theme => {
  return createTheme({
    palette: {
      mode: "light",
      primary: {
        main: "#A20A3A",
        dark: "#85072F",
        light: "#FFF0F4",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: "#EDC11E",
        dark: "#D4A915",
        light: "#FFF3C4",
        contrastText: "#292329",
      },
      success: {
        main: "#16A34A",
        light: "#DCFCE7",
        contrastText: "#FFFFFF",
      },
      warning: {
        main: "#F59E0B",
        light: "#FEF3C7",
      },
      error: {
        main: "#DC2626",
        light: "#FEE2E2",
      },
      background: {
        default: "#FFFFFF",
        paper: "#FFFFFF",
      },
      divider: "#E8E2E5",
      text: {
        primary: "#292329",
        secondary: "#625B60",
        disabled: "#B8B0B6",
      },
    },
    typography: {
      fontFamily: "'Plus Jakarta Sans', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: "#FFFFFF",
            color: "#292329",
            transition: "background-color 0.25s ease, color 0.25s ease",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: "#FFFFFF",
            borderColor: "#E8E2E5",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: "#FFFFFF",
            borderColor: "#E8E2E5",
          },
        },
      },
    },
  });
};

const getStoredThemeMode = (): ThemeMode => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("pay2pay_theme_mode") as ThemeMode;
    if (saved && ["AUTO", "LIGHT", "DARK"].includes(saved)) {
      return saved;
    }
  }
  return "AUTO";
};

export const CustomThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getStoredThemeMode());
  const [timezone, setTimezoneState] = useState<string>(DEFAULT_TIMEZONE);
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() =>
    resolveEffectiveTheme(getStoredThemeMode(), DEFAULT_TIMEZONE)
  );

  // Sync DOM tokens synchronously on mount and when effectiveTheme updates
  useEffect(() => {
    applyThemeTokensToDOM(effectiveTheme);
  }, [effectiveTheme]);

  // Recalculate effective theme whenever mode or timezone changes
  useEffect(() => {
    const newEffective = resolveEffectiveTheme(themeMode, timezone);
    setEffectiveTheme(newEffective);
    applyThemeTokensToDOM(newEffective);
  }, [themeMode, timezone]);

  // Pure local storage preference initialization - no timers, no auto-fetching on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("pay2pay_theme_mode") as ThemeMode | null;
      if (savedTheme && ["AUTO", "LIGHT", "DARK"].includes(savedTheme)) {
        setThemeModeState(savedTheme);
      }
    }
  }, []);

  // Update Theme Preference & Persist to Backend + LocalStorage
  const setThemeMode = useCallback(
    async (newMode: ThemeMode) => {
      setThemeModeState(newMode);

      const newEffective = resolveEffectiveTheme(newMode, timezone);
      setEffectiveTheme(newEffective);
      applyThemeTokensToDOM(newEffective);

      if (typeof window !== "undefined") {
        localStorage.setItem("pay2pay_theme_mode", newMode);
      }

      // Persist to backend API
      try {
        await fetch("/api/v1/session/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ theme_mode: newMode, timezone }),
        });
      } catch (e) {
        console.error("Failed to persist theme mode to database via API:", e);
      }
    },
    [timezone]
  );

  const setTimezone = useCallback((tz: string) => {
    setTimezoneState(tz);
  }, []);

  const muiTheme = createMuiThemeForEffectiveTheme(effectiveTheme);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        effectiveTheme,
        timezone,
        setThemeMode,
        setTimezone,
        isAuto: themeMode === "AUTO",
      }}
    >
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

const DEFAULT_THEME_FALLBACK: ThemeContextType = {
  themeMode: "LIGHT",
  effectiveTheme: "light",
  timezone: DEFAULT_TIMEZONE,
  setThemeMode: async () => {},
  setTimezone: () => {},
  isAuto: false,
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return DEFAULT_THEME_FALLBACK;
  }
  return context;
};
