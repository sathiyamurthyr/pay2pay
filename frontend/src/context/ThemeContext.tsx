"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { CompanyBrandingHostContext, getInitialBrandingByHostname, type CompanyBrandingData } from "@/hooks/useCompanyBranding";

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

  const primary = targetBranding.primary_colour || (isPay2Pay ? "#2563EB" : isSmsPay ? "#0F3B7D" : "#A20A3A");
  const secondary = targetBranding.secondary_colour || (isPay2Pay ? "#1E40AF" : isSmsPay ? "#D4AF37" : "#EDC11E");

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
  root.style.setProperty("--accent-hover", secondary);
  root.style.setProperty("--accent-gold", secondary);
  root.style.setProperty("--accent-orange", secondary);
  root.style.setProperty("--ent-primary", primary);
  root.style.setProperty("--ent-primary-hover", secondary);
  root.style.setProperty("--ent-primary-light", `${primary}14`);
  root.style.setProperty("--ent-primary-text", primary);
  root.style.setProperty("--ent-sidebar-active", primary);
  root.style.setProperty("--ent-sidebar-active-bg", `${primary}14`);
  root.style.setProperty("--ent-sidebar-category", primary);
  root.style.setProperty("--ent-info", primary);
  root.style.setProperty("--ent-info-text", primary);
  root.style.setProperty("--ent-purple-text", primary);
  root.style.setProperty("--p2p-primary-color", primary);
  root.style.setProperty("--gradient-rich", `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`);
  root.style.setProperty("--gradient-rich-h", `linear-gradient(to right, ${primary} 0%, ${secondary} 100%)`);
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
  branding: CompanyBrandingData | null = getInitialBrandingByHostname()
): Theme => {
  const code = branding?.company_code || "";
  const isNear4You = code === "NEAR4YOU";
  const isPay2Pay = code === "PAY2PAY";
  const isSmsPay = code === "SMSPAY";

  const primary = branding?.primary_colour || (isNear4You ? "#A20A3A" : isSmsPay ? "#0F3B7D" : "#2563EB");
  const secondary = branding?.secondary_colour || (isNear4You ? "#EDC11E" : isSmsPay ? "#D4AF37" : "#1E40AF");

  return createTheme({
    palette: {
      mode: "light",
      primary: {
        main: primary,
        dark: isPay2Pay ? "#1D4ED8" : isSmsPay ? "#0A2A5A" : "#85072F",
        light: `${primary}14`,
        contrastText: "#FFFFFF",
      },
      secondary: {
        main: secondary,
        dark: isPay2Pay ? "#1E3A8A" : isSmsPay ? "#B59328" : "#D4A915",
        light: `${secondary}20`,
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
  const ssrHost = useContext(CompanyBrandingHostContext);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getStoredThemeMode());
  const [timezone, setTimezoneState] = useState<string>(DEFAULT_TIMEZONE);
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() =>
    resolveEffectiveTheme(getStoredThemeMode(), DEFAULT_TIMEZONE)
  );
  const [branding, setBranding] = useState<CompanyBrandingData | null>(() => getInitialBrandingByHostname(ssrHost));

  // Sync DOM tokens synchronously on mount and when effectiveTheme updates
  useEffect(() => {
    const current = getInitialBrandingByHostname(ssrHost);
    setBranding((prev) => (prev?.company_code === current?.company_code && prev?.primary_colour ? prev : current));
    applyThemeTokensToDOM(effectiveTheme, current);
  }, [effectiveTheme, ssrHost]);

  // Listen for dynamic /companies/branding API updates so DB color changes apply live
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleBrandingUpdated = (e: Event) => {
      const detail = (e as CustomEvent<CompanyBrandingData>).detail;
      if (detail?.company_code) {
        setBranding(detail);
        applyThemeTokensToDOM(effectiveTheme, detail);
      }
    };
    window.addEventListener("p2p_branding_updated", handleBrandingUpdated);
    return () => window.removeEventListener("p2p_branding_updated", handleBrandingUpdated);
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
