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
 * Resolves effective theme ("light" | "dark") based on ThemeMode and retailer timezone.
 */
export const resolveEffectiveTheme = (
  mode: ThemeMode = "AUTO",
  tz: string = DEFAULT_TIMEZONE
): EffectiveTheme => {
  if (mode === "LIGHT") return "light";
  if (mode === "DARK") return "dark";

  // AUTO Mode: Day (06:00 AM -> 05:59 PM) = light, Night (06:00 PM -> 05:59 AM) = dark
  const currentHour = getLocalHourInTimezone(tz);
  const isDay = currentHour >= DAY_START_HOUR && currentHour < DAY_END_HOUR;
  return isDay ? "light" : "dark";
};

/**
 * Applies dynamic CSS variables and DOM data attributes for seamless theme styling.
 */
export const applyThemeTokensToDOM = (effectiveTheme: EffectiveTheme) => {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute("data-theme", effectiveTheme);

  if (effectiveTheme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    body?.classList.add("dark");
    body?.classList.remove("light");

    // Semantic CSS Tokens - Dark Theme (Deep Navy Enterprise Banking)
    root.style.setProperty("--background-primary", "#060D1B");
    root.style.setProperty("--background-secondary", "#0B1528");
    root.style.setProperty("--surface", "#121B28");
    root.style.setProperty("--surface-elevated", "#1A2638");
    root.style.setProperty("--border", "#1E293B");
    root.style.setProperty("--border-strong", "rgba(255, 255, 255, 0.15)");
    root.style.setProperty("--text-primary", "#F8FAFC");
    root.style.setProperty("--text-secondary", "#CBD5E1");
    root.style.setProperty("--text-muted", "#94A3B8");
    root.style.setProperty("--accent", "#3B82F6");
    root.style.setProperty("--accent-hover", "#2563EB");
    root.style.setProperty("--success", "#4ADE80");
    root.style.setProperty("--warning", "#FBBF24");
    root.style.setProperty("--danger", "#F87171");
    root.style.setProperty("--info", "#60A5FA");
    root.style.setProperty("--p2p-header-bg", "#0B1528");
    root.style.setProperty("--p2p-header-text", "#FFFFFF");
    root.style.setProperty("--p2p-page-bg", "#060D1B");
    root.style.setProperty("--p2p-card-bg", "#121B28");
    root.style.setProperty("--p2p-card-border", "#1E293B");
    root.style.setProperty("--p2p-text-color", "#F8FAFC");
    root.style.setProperty("--p2p-subtext-color", "#94A3B8");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
    body?.classList.add("light");
    body?.classList.remove("dark");

    // Semantic CSS Tokens - Light Theme (Clean Banking Financial Console)
    root.style.setProperty("--background-primary", "#F8FAFC");
    root.style.setProperty("--background-secondary", "#F1F5F9");
    root.style.setProperty("--surface", "#FFFFFF");
    root.style.setProperty("--surface-elevated", "#FFFFFF");
    root.style.setProperty("--border", "#E2E8F0");
    root.style.setProperty("--border-strong", "#CBD5E1");
    root.style.setProperty("--text-primary", "#0F172A");
    root.style.setProperty("--text-secondary", "#334155");
    root.style.setProperty("--text-muted", "#64748B");
    root.style.setProperty("--accent", "#2563EB");
    root.style.setProperty("--accent-hover", "#1D4ED8");
    root.style.setProperty("--success", "#16A34A");
    root.style.setProperty("--warning", "#D97706");
    root.style.setProperty("--danger", "#DC2626");
    root.style.setProperty("--info", "#0EA5E9");
    root.style.setProperty("--p2p-header-bg", "#FFFFFF");
    root.style.setProperty("--p2p-header-text", "#0F172A");
    root.style.setProperty("--p2p-page-bg", "#F8FAFC");
    root.style.setProperty("--p2p-card-bg", "#FFFFFF");
    root.style.setProperty("--p2p-card-border", "#E2E8F0");
    root.style.setProperty("--p2p-text-color", "#0F172A");
    root.style.setProperty("--p2p-subtext-color", "#64748B");
  }
};

/**
 * Creates dynamic MUI Theme based on resolved effectiveTheme
 */
export const createMuiThemeForEffectiveTheme = (effectiveTheme: EffectiveTheme): Theme => {
  const isDark = effectiveTheme === "dark";

  return createTheme({
    palette: {
      mode: effectiveTheme,
      primary: {
        main: isDark ? "#3B82F6" : "#2563EB",
        dark: isDark ? "#2563EB" : "#1D4ED8",
        light: isDark ? "#60A5FA" : "#DBEAFE",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: isDark ? "#A78BFA" : "#7C3AED",
        light: isDark ? "#C4B5FD" : "#F3E8FF",
      },
      success: {
        main: isDark ? "#4ADE80" : "#16A34A",
        light: isDark ? "rgba(74, 222, 128, 0.15)" : "#DCFCE7",
        contrastText: "#FFFFFF",
      },
      warning: {
        main: isDark ? "#FBBF24" : "#D97706",
        light: isDark ? "rgba(251, 191, 36, 0.15)" : "#FEF3C7",
      },
      error: {
        main: isDark ? "#F87171" : "#DC2626",
        light: isDark ? "rgba(248, 113, 113, 0.15)" : "#FEE2E2",
      },
      background: {
        default: isDark ? "#060D1B" : "#F8FAFC",
        paper: isDark ? "#121B28" : "#FFFFFF",
      },
      divider: isDark ? "#1E293B" : "#E2E8F0",
      text: {
        primary: isDark ? "#F8FAFC" : "#0F172A",
        secondary: isDark ? "#CBD5E1" : "#334155",
        disabled: isDark ? "#64748B" : "#94A3B8",
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
            backgroundColor: isDark ? "#060D1B" : "#F8FAFC",
            color: isDark ? "#F8FAFC" : "#0F172A",
            transition: "background-color 0.25s ease, color 0.25s ease",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: isDark ? "#121B28" : "#FFFFFF",
            borderColor: isDark ? "#1E293B" : "#E2E8F0",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? "#121B28" : "#FFFFFF",
            borderColor: isDark ? "#1E293B" : "#E2E8F0",
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
  themeMode: "DARK",
  effectiveTheme: "dark",
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
