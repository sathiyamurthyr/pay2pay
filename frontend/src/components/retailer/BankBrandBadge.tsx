"use client";

import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import type { CompanyBrandingData } from "@/lib/company-branding";

export interface BrandThemeTokens {
  primary: string;
  dark: string;
  secondary: string;
  softBg: string;
  softBorder: string;
  shadow: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return `rgba(162, 10, 58, ${alpha})`;
}

export function getBrandThemeTokens(branding?: CompanyBrandingData | null): BrandThemeTokens {
  const primary = branding?.primary_colour || "#A20A3A";
  const secondary = branding?.secondary_colour || "#EDC11E";
  return {
    primary,
    dark: primary,
    secondary,
    softBg: hexToRgba(primary, 0.08),
    softBorder: hexToRgba(primary, 0.28),
    shadow: hexToRgba(primary, 0.24),
  };
}

export interface BankVisualTheme {
  shortLabel: string;
  primary: string;
  secondary: string;
  accent: string;
  cardGradient: string;
}

const BANK_THEMES: Array<{ keywords: string[]; theme: BankVisualTheme }> = [
  {
    keywords: ["HDFC"],
    theme: {
      shortLabel: "HDFC",
      primary: "#004C8F",
      secondary: "#ED232A",
      accent: "#DBEAFE",
      cardGradient: "linear-gradient(135deg, #003366 0%, #004C8F 58%, #B91C1C 100%)",
    },
  },
  {
    keywords: ["ICICI"],
    theme: {
      shortLabel: "ICICI",
      primary: "#B02A30",
      secondary: "#F58220",
      accent: "#FFEDD5",
      cardGradient: "linear-gradient(135deg, #7C1D22 0%, #B02A30 55%, #EA580C 100%)",
    },
  },
  {
    keywords: ["STATE BANK", "SBI"],
    theme: {
      shortLabel: "SBI",
      primary: "#1B4B91",
      secondary: "#00AEEF",
      accent: "#E0F2FE",
      cardGradient: "linear-gradient(135deg, #0F2D5C 0%, #1B4B91 60%, #0284C7 100%)",
    },
  },
  {
    keywords: ["AXIS"],
    theme: {
      shortLabel: "AXIS",
      primary: "#97144D",
      secondary: "#E11D48",
      accent: "#FCE7F3",
      cardGradient: "linear-gradient(135deg, #5B0B2E 0%, #97144D 65%, #BE123C 100%)",
    },
  },
  {
    keywords: ["KOTAK"],
    theme: {
      shortLabel: "KOTAK",
      primary: "#ED1C24",
      secondary: "#003874",
      accent: "#FEE2E2",
      cardGradient: "linear-gradient(135deg, #002752 0%, #003874 55%, #DC2626 100%)",
    },
  },
  {
    keywords: ["INDUSIND"],
    theme: {
      shortLabel: "IBL",
      primary: "#8A1E24",
      secondary: "#C59B27",
      accent: "#FEF3C7",
      cardGradient: "linear-gradient(135deg, #4A0E12 0%, #8A1E24 65%, #A16207 100%)",
    },
  },
  {
    keywords: ["YES BANK", "YESB"],
    theme: {
      shortLabel: "YES",
      primary: "#005A9C",
      secondary: "#E31837",
      accent: "#DBEAFE",
      cardGradient: "linear-gradient(135deg, #003865 0%, #005A9C 65%, #BE123C 100%)",
    },
  },
  {
    keywords: ["IDFC"],
    theme: {
      shortLabel: "IDFC",
      primary: "#9D1D27",
      secondary: "#1E293B",
      accent: "#FEE2E2",
      cardGradient: "linear-gradient(135deg, #1E1B18 0%, #7F1D1D 60%, #9D1D27 100%)",
    },
  },
  {
    keywords: ["RBL"],
    theme: {
      shortLabel: "RBL",
      primary: "#1E3A8A",
      secondary: "#DC2626",
      accent: "#DBEAFE",
      cardGradient: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 65%, #B91C1C 100%)",
    },
  },
  {
    keywords: ["FEDERAL"],
    theme: {
      shortLabel: "FED",
      primary: "#004687",
      secondary: "#F59E0B",
      accent: "#FEF3C7",
      cardGradient: "linear-gradient(135deg, #002952 0%, #004687 65%, #D97706 100%)",
    },
  },
  {
    keywords: ["STANDARD CHARTERED", "SCBL"],
    theme: {
      shortLabel: "SCB",
      primary: "#0072AA",
      secondary: "#21AA47",
      accent: "#DCFCE7",
      cardGradient: "linear-gradient(135deg, #004E75 0%, #0072AA 55%, #15803D 100%)",
    },
  },
  {
    keywords: ["HSBC"],
    theme: {
      shortLabel: "HSBC",
      primary: "#DB0011",
      secondary: "#1E293B",
      accent: "#FEE2E2",
      cardGradient: "linear-gradient(135deg, #111827 0%, #374151 55%, #B91C1C 100%)",
    },
  },
  {
    keywords: ["AMERICAN EXPRESS", "AMEX"],
    theme: {
      shortLabel: "AMEX",
      primary: "#006FCF",
      secondary: "#0EA5E9",
      accent: "#E0F2FE",
      cardGradient: "linear-gradient(135deg, #003A70 0%, #006FCF 60%, #0284C7 100%)",
    },
  },
  {
    keywords: ["AU SMALL", "AUBL"],
    theme: {
      shortLabel: "AU",
      primary: "#6D28D9",
      secondary: "#EA580C",
      accent: "#F3E8FF",
      cardGradient: "linear-gradient(135deg, #3B0764 0%, #6D28D9 65%, #EA580C 100%)",
    },
  },
  {
    keywords: ["BANK OF BARODA", "BARODA", "BOB"],
    theme: {
      shortLabel: "BOB",
      primary: "#F26522",
      secondary: "#1E293B",
      accent: "#FFEDD5",
      cardGradient: "linear-gradient(135deg, #7C2D12 0%, #C2410C 60%, #F26522 100%)",
    },
  },
  {
    keywords: ["PUNJAB NATIONAL", "PNB"],
    theme: {
      shortLabel: "PNB",
      primary: "#A20A3A",
      secondary: "#FACC15",
      accent: "#FCE7F3",
      cardGradient: "linear-gradient(135deg, #580520 0%, #A20A3A 65%, #CA8A04 100%)",
    },
  },
  {
    keywords: ["CANARA"],
    theme: {
      shortLabel: "CNB",
      primary: "#0284C7",
      secondary: "#FACC15",
      accent: "#E0F2FE",
      cardGradient: "linear-gradient(135deg, #0C4A6E 0%, #0284C7 65%, #EAB308 100%)",
    },
  },
  {
    keywords: ["UNION BANK"],
    theme: {
      shortLabel: "UBI",
      primary: "#DC2626",
      secondary: "#1D4ED8",
      accent: "#FEE2E2",
      cardGradient: "linear-gradient(135deg, #1E3A8A 0%, #7F1D1D 60%, #DC2626 100%)",
    },
  },
];

export function resolveBankTheme(bankName?: string | null, shortCode?: string | null): BankVisualTheme {
  const upper = String(bankName || "").toUpperCase();
  for (const entry of BANK_THEMES) {
    if (entry.keywords.some((kw) => upper.includes(kw))) {
      return entry.theme;
    }
  }
  const words = upper
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && w !== "BANK" && w !== "OF" && w !== "INDIA" && w !== "LTD");
  const fallbackShort =
    (shortCode && shortCode.trim().slice(0, 4).toUpperCase()) ||
    words.map((w) => w[0]).join("").slice(0, 4) ||
    upper.slice(0, 3) ||
    "BNK";

  return {
    shortLabel: fallbackShort,
    primary: "#15803D",
    secondary: "#16A34A",
    accent: "#ECFDF5",
    cardGradient: "linear-gradient(135deg, #0F172A 0%, #14532D 65%, #16A34A 100%)",
  };
}

export const BankLogoBadge: React.FC<{
  bankName?: string | null;
  shortCode?: string | null;
  size?: "sm" | "md" | "lg";
}> = ({ bankName, shortCode, size = "md" }) => {
  const theme = resolveBankTheme(bankName, shortCode);
  const dim = size === "sm" ? 28 : size === "lg" ? 42 : 34;
  const fontSize = size === "sm" ? "9px" : size === "lg" ? "11px" : "10px";

  return (
    <Box
      sx={{
        width: dim,
        height: dim,
        borderRadius: "10px",
        background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
        color: "#FFFFFF",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 3px 8px rgba(15, 23, 42, 0.14)",
        border: "1px solid rgba(255,255,255,0.28)",
      }}
      title={bankName || "Bank"}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 36 36"
        style={{ position: "absolute", inset: 0, opacity: 0.18 }}
        aria-hidden="true"
      >
        <circle cx="30" cy="6" r="12" fill="#FFFFFF" />
        <path d="M4 29 H32" stroke="#FFFFFF" strokeWidth="2" />
      </svg>
      <Typography
        component="span"
        sx={{
          fontSize,
          fontWeight: 900,
          letterSpacing: "0.02em",
          lineHeight: 1,
          zIndex: 1,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {theme.shortLabel}
      </Typography>
    </Box>
  );
};

export const CardNetworkBadge: React.FC<{ cardType?: string | null; compact?: boolean }> = ({
  cardType,
  compact = false,
}) => {
  const upper = String(cardType || "").toUpperCase();

  if (upper.includes("MASTER")) {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <svg width="26" height="16" viewBox="0 0 26 16" aria-hidden="true">
          <circle cx="9" cy="8" r="6.5" fill="#EB001B" />
          <circle cx="17" cy="8" r="6.5" fill="#F79E1B" fillOpacity="0.9" />
        </svg>
        {!compact && <span style={{ fontWeight: 700, fontSize: "12px" }}>{cardType}</span>}
      </Stack>
    );
  }

  if (upper.includes("VISA")) {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Box
          sx={{
            px: 0.7,
            py: 0.2,
            borderRadius: "4px",
            bgcolor: "#1A1F71",
            color: "#FFFFFF",
            fontWeight: 900,
            fontSize: "10px",
            fontStyle: "italic",
            letterSpacing: "0.04em",
          }}
        >
          VISA
        </Box>
        {!compact && <span style={{ fontWeight: 700, fontSize: "12px" }}>{cardType}</span>}
      </Stack>
    );
  }

  if (upper.includes("RUPAY")) {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Box
          sx={{
            px: 0.7,
            py: 0.2,
            borderRadius: "4px",
            background: "linear-gradient(90deg, #1E3A8A 0%, #EA580C 70%, #16A34A 100%)",
            color: "#FFFFFF",
            fontWeight: 900,
            fontSize: "10px",
            letterSpacing: "0.03em",
          }}
        >
          RuPay
        </Box>
        {!compact && <span style={{ fontWeight: 700, fontSize: "12px" }}>{cardType}</span>}
      </Stack>
    );
  }

  if (upper.includes("AMEX") || upper.includes("DINERS")) {
    return (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Box
          sx={{
            px: 0.7,
            py: 0.2,
            borderRadius: "4px",
            bgcolor: "#006FCF",
            color: "#FFFFFF",
            fontWeight: 900,
            fontSize: "10px",
          }}
        >
          AMEX
        </Box>
        {!compact && <span style={{ fontWeight: 700, fontSize: "12px" }}>{cardType}</span>}
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box
        sx={{
          px: 0.7,
          py: 0.2,
          borderRadius: "4px",
          bgcolor: "#0F172A",
          color: "#FFFFFF",
          fontWeight: 800,
          fontSize: "10px",
        }}
      >
        CORP
      </Box>
      {!compact && <span style={{ fontWeight: 700, fontSize: "12px" }}>{cardType || "Credit Card"}</span>}
    </Stack>
  );
};
