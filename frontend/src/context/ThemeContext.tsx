"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { getInitialBrandingByHostname, type CompanyBrandingData } from "@/hooks/useCompanyBranding";

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
 * Applies dynamic CSS variables and DOM data attributes for the active canonical domain brand styling.
 */
export const applyThemeTokensToDOM = (
  _effectiveTheme: EffectiveTheme = "light",
  branding?: CompanyBrandingData | null
) => {
  if (typeof window === "undefined") return;
  const targetBranding = branding ?? getInitialBrandingByHostname();
  if (!targetBranding) return;

  const root = document.documentElement;
  const body = document.body;

  root.setAttribute("data-theme", "light");
  root.setAttribute("data-company", targetBranding.company_code);
  root.classList.add("light");
  root.classList.remove("dark");
  body?.classList.add("light");
  body?.classList.remove("dark");

  const isNear4You = targetBranding.company_code === "NEAR4YOU";
  const isPay2Pay = targetBranding.company_code === "PAY2PAY";
  const isSmsPay = targetBranding.company_code === "SMSPAY";

  const primary = targetBranding.primary_colour || (isPay2Pay ? "#2563EB" : isSmsPay ? "#059669" : "#A20A3A");
  const secondary = targetBranding.secondary_colour || (isPay2Pay ? "#1E40AF" : isSmsPay ? "#047857" : "#EDC11E");

  // Semantic CSS Tokens
  root.style.setProperty("--background-primary", "#FFFFFF");
  root.style.setProperty("--background-secondary", isNear4You ? "#FAF8F9" : "#F8FAFC");
  root.style.setProperty("--surface", "#FFFFFF");
  root.style.setProperty("--surface-elevated", "#FFFFFF");
  root.style.setProperty("--border", isNear4You ? "#E8E2E5" : "#E2E8F0");
  root.style.setProperty("--border-strong", isNear4You ? "#D8D0D4" : "#CBD5E1");
  root.style.setProperty("--text-primary", isNear4You ? "#292329" : "#0F172A");
  root.style.setProperty("--text-secondary", isNear4You ? "#625B60" : "#334155");
  root.style.setProperty("--text-muted", isNear4You ? "#8A8288" : "#64748B");
  root.style.setProperty("--brand-primary", primary);
  root.style.setProperty("--brand-secondary", secondary);
  root.style.setProperty("--accent", primary);
  root.style.setProperty("--accent-hover", isPay2Pay ? "#1D4ED8" : isSmsPay ? "#047857" : "#85072F");
  root.style.setProperty("--accent-gold", secondary);
  root.style.setProperty("--accent-orange", secondary);
  root.style.setProperty("--success", "#16A34A");
  root.style.setProperty("--warning", "#F59E0B");
  root.style.setProperty("--danger", "#DC2626");
  root.style.setProperty("--info", primary);
  root.style.setProperty("--p2p-header-bg", "#FFFFFF");
  root.style.setProperty("--p2p-header-text", isNear4You ? "#292329" : "#0F172A");
  root.style.setProperty("--p2p-page-bg", isNear4You ? "#FFFFFF" : "#F8FAFC");
  root.style.setProperty("--p2p-card-bg", "#FFFFFF");
  root.style.setProperty("--p2p-card-border", isNear4You ? "#E8E2E5" : "#E2E8F0");
  root.style.setProperty("--p2p-text-color", isNear4You ? "#292329" : "#0F172A");
  root.style.setProperty("--p2p-subtext-color", isNear4You ? "#625B60" : "#334155");
};

/**
 * Creates dynamic MUI Theme based on the active domain's brand system
 */
export const createMuiThemeForEffectiveTheme = (
  _effectiveTheme: EffectiveTheme = "light",
  branding: CompanyBrandingData = getInitialBrandingByHostname()
): Theme => {
  const isNear4You = branding.company_code === "NEAR4YOU";
  const isPay2Pay = branding.company_code === "PAY2PAY";
  const isSmsPay = branding.company_code === "SMSPAY";

  const primary = branding.primary_colour || (isPay2Pay ? "#2563EB" : isSmsPay ? "#059669" : "#A20A3A");
  const secondary = branding.secondary_colour || (isPay2Pay ? "#1E40AF" : isSmsPay ? "#047857" : "#EDC11E");

  return createTheme({
    palette: {
      mode: "light",
      primary: {
        main: primary,
        dark: isPay2Pay ? "#1D4ED8" : isSmsPay ? "#047857" : "#85072F",
        light: isPay2Pay ? "#EFF6FF" : isSmsPay ? "#ECFDF5" : "#FFF0F4",
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: secondary,
        dark: isPay2Pay ? "#1E3A8A" : isSmsPay ? "#065F46" : "#D4A915",
        light: isPay2Pay ? "#DBEAFE" : isSmsPay ? "#D1FAE5" : "#FFF3C4",
        contrastText: isNear4You ? "#292329" : "#FFFFFF",
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
        default: isNear4You ? "#FFFFFF" : "#F8FAFC",
        paper: "#FFFFFF",
      },
      divider: isNear4You ? "#E8E2E5" : "#E2E8F0",
      text: {
        primary: isNear4You ? "#292329" : "#0F172A",
        secondary: isNear4You ? "#625B60" : "#334155",
        disabled: isNear4You ? "#B8B0B6" : "#94A3B8",
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
            backgroundColor: isNear4You ? "#FFFFFF" : "#F8FAFC",
            color: isNear4You ? "#292329" : "#0F172A",
            transition: "background-color 0.25s ease, color 0.25s ease",
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: "#FFFFFF",
            borderColor: isNear4You ? "#E8E2E5" : "#E2E8F0",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: "#FFFFFF",
            borderColor: isNear4You ? "#E8E2E5" : "#E2E8F0",
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
  const [branding, setBranding] = useState<CompanyBrandingData>(() => getInitialBrandingByHostname());

  // Sync DOM tokens synchronously on mount and when effectiveTheme updates
  useEffect(() => {
    const current = getInitialBrandingByHostname();
    setBranding(current);
    applyThemeTokensToDOM(effectiveTheme, current);
  }, [effectiveTheme]);

  // Recalculate effective theme whenever mode or timezone changes
  useEffect(() => {
    const newEffective = resolveEffectiveTheme(themeMode, timezone);
    setEffectiveTheme(newEffective);
    const current = getInitialBrandingByHostname();
    setBranding(current);
    applyThemeTokensToDOM(newEffective, current);
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
      const current = getInitialBrandingByHostname();
      setBranding(current);
      applyThemeTokensToDOM(newEffective, current);

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

  const muiTheme = useMemo(
    () => createMuiThemeForEffectiveTheme(effectiveTheme, branding),
    [effectiveTheme, branding]
  );

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
