"use client";

import React, { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Fab,
  Box,
  SwipeableDrawer,
  Typography,
  ButtonBase,
  Backdrop,
  useTheme,
  alpha,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import FingerprintRoundedIcon from "@mui/icons-material/FingerprintRounded";
import CreditCardOffRoundedIcon from "@mui/icons-material/CreditCardOffRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import AddCardRoundedIcon from "@mui/icons-material/AddCardRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PeopleRoundedIcon from "@mui/icons-material/PeopleRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";

// ─── Quick Action Types & Catalog ───────────────────────────────────────────────
export interface QuickActionConfig {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  darkBg: string;
  gradient?: string;
  darkGradient?: string;
  isFavorite?: boolean;
}

export interface FavoriteMenuInput {
  menu_ref_id?: number;
  menu_href: string;
  menu_label?: string;
}

const DEFAULT_QUICK_ACTIONS: QuickActionConfig[] = [
  {
    id: "payin",
    label: "PayIn",
    sublabel: "Add money",
    href: "/retailer/payin",
    icon: AddCardRoundedIcon,
    color: "#2563EB",
    bg: "#DBEAFE",
    darkBg: "#1E3A8A",
    gradient: "linear-gradient(135deg, rgba(219,234,254,0.95) 0%, rgba(191,219,254,0.8) 100%)",
    darkGradient: "linear-gradient(135deg, rgba(37,99,235,0.32) 0%, rgba(30,58,138,0.45) 100%)",
  },
  {
    id: "payout",
    label: "Payout",
    sublabel: "DMT transfer",
    href: "/retailer/dmt",
    icon: SendRoundedIcon,
    color: "#7C3AED",
    bg: "#EDE9FE",
    darkBg: "#3B1F73",
    gradient: "linear-gradient(135deg, rgba(237,233,254,0.95) 0%, rgba(221,214,254,0.8) 100%)",
    darkGradient: "linear-gradient(135deg, rgba(124,58,237,0.32) 0%, rgba(59,31,115,0.45) 100%)",
  },
  {
    id: "reports",
    label: "Reports",
    sublabel: "Transactions",
    href: "/retailer/reports/transactions",
    icon: AssessmentRoundedIcon,
    color: "#0D9488",
    bg: "#CCFBF1",
    darkBg: "#134E4A",
    gradient: "linear-gradient(135deg, rgba(204,251,241,0.95) 0%, rgba(153,246,228,0.8) 100%)",
    darkGradient: "linear-gradient(135deg, rgba(13,148,136,0.32) 0%, rgba(19,78,74,0.45) 100%)",
  },
  {
    id: "bbps",
    label: "Bill Payment",
    sublabel: "BBPS bills",
    href: "/retailer/bbps",
    icon: ElectricBoltRoundedIcon,
    color: "#DC2626",
    bg: "#FEE2E2",
    darkBg: "#3D1414",
    gradient: "linear-gradient(135deg, rgba(254,226,226,0.95) 0%, rgba(254,202,202,0.8) 100%)",
    darkGradient: "linear-gradient(135deg, rgba(220,38,38,0.32) 0%, rgba(61,20,20,0.45) 100%)",
  },
  {
    id: "cards",
    label: "Card Mgmt",
    sublabel: "Credit cards",
    href: "/retailer/cards",
    icon: CreditCardRoundedIcon,
    color: "#D97706",
    bg: "#FEF3C7",
    darkBg: "#3D2E0A",
    gradient: "linear-gradient(135deg, rgba(254,243,199,0.95) 0%, rgba(253,230,138,0.8) 100%)",
    darkGradient: "linear-gradient(135deg, rgba(217,119,6,0.32) 0%, rgba(61,46,10,0.45) 100%)",
  },
  {
    id: "upi",
    label: "UPI",
    sublabel: "Collect payment",
    href: "/retailer/upi",
    icon: QrCodeScannerRoundedIcon,
    color: "#9333EA",
    bg: "#F3E8FF",
    darkBg: "#2E1245",
    gradient: "linear-gradient(135deg, rgba(243,232,255,0.95) 0%, rgba(233,213,255,0.8) 100%)",
    darkGradient: "linear-gradient(135deg, rgba(147,51,234,0.32) 0%, rgba(46,18,69,0.45) 100%)",
  },
  {
    id: "aeps",
    label: "AEPS",
    sublabel: "Biometric cash",
    href: "/retailer/aeps",
    icon: FingerprintRoundedIcon,
    color: "#16A34A",
    bg: "#DCFCE7",
    darkBg: "#1A3D28",
    gradient: "linear-gradient(135deg, rgba(220,252,231,0.95) 0%, rgba(187,247,208,0.8) 100%)",
    darkGradient: "linear-gradient(135deg, rgba(22,163,74,0.32) 0%, rgba(26,61,40,0.45) 100%)",
  },
  {
    id: "recharge",
    label: "Recharge",
    sublabel: "Mobile & DTH",
    href: "/retailer/recharge",
    icon: PhoneIphoneRoundedIcon,
    color: "#0284C7",
    bg: "#E0F2FE",
    darkBg: "#0C4A6E",
    gradient: "linear-gradient(135deg, rgba(224,242,254,0.95) 0%, rgba(186,230,253,0.8) 100%)",
    darkGradient: "linear-gradient(135deg, rgba(2,132,199,0.32) 0%, rgba(12,74,110,0.45) 100%)",
  },
];

const MENU_CATALOG_BY_HREF: Record<string, Omit<QuickActionConfig, "id" | "isFavorite">> = {
  "/retailer/dashboard": {
    label: "Dashboard",
    sublabel: "Overview",
    href: "/retailer/dashboard",
    icon: DashboardRoundedIcon,
    color: "#2563EB",
    bg: "#DBEAFE",
    darkBg: "#1E3A8A",
  },
  "/retailer/payin": DEFAULT_QUICK_ACTIONS[0],
  "/retailer/dmt": DEFAULT_QUICK_ACTIONS[1],
  "/retailer/reports/transactions": DEFAULT_QUICK_ACTIONS[2],
  "/retailer/reports": DEFAULT_QUICK_ACTIONS[2],
  "/retailer/reports/payin-transactions": {
    label: "PayIn Report",
    sublabel: "PayIn history",
    href: "/retailer/reports/payin-transactions",
    icon: AssessmentRoundedIcon,
    color: "#2563EB",
    bg: "#DBEAFE",
    darkBg: "#1E3A8A",
  },
  "/retailer/reports/payout-transactions": {
    label: "Payout Report",
    sublabel: "Payout history",
    href: "/retailer/reports/payout-transactions",
    icon: ReceiptLongRoundedIcon,
    color: "#7C3AED",
    bg: "#EDE9FE",
    darkBg: "#3B1F73",
  },
  "/retailer/reports/gst": {
    label: "GST Report",
    sublabel: "Tax statements",
    href: "/retailer/reports/gst",
    icon: ReceiptLongRoundedIcon,
    color: "#0D9488",
    bg: "#CCFBF1",
    darkBg: "#134E4A",
  },
  "/retailer/reports/settlement": {
    label: "Settlement",
    sublabel: "Settlements",
    href: "/retailer/reports/settlement",
    icon: PointOfSaleRoundedIcon,
    color: "#0891B2",
    bg: "#CFFAFE",
    darkBg: "#0A2E36",
  },
  "/retailer/bbps": DEFAULT_QUICK_ACTIONS[3],
  "/retailer/cards": DEFAULT_QUICK_ACTIONS[4],
  "/retailer/card-to-cash": {
    label: "Card to Cash",
    sublabel: "Payout request",
    href: "/retailer/card-to-cash",
    icon: CreditCardOffRoundedIcon,
    color: "#D97706",
    bg: "#FEF3C7",
    darkBg: "#3D2E0A",
  },
  "/retailer/upi": DEFAULT_QUICK_ACTIONS[5],
  "/retailer/aeps": DEFAULT_QUICK_ACTIONS[6],
  "/retailer/recharge": DEFAULT_QUICK_ACTIONS[7],
  "/retailer/pos": {
    label: "Swipe Machine",
    sublabel: "POS terminal",
    href: "/retailer/pos",
    icon: PointOfSaleRoundedIcon,
    color: "#0891B2",
    bg: "#CFFAFE",
    darkBg: "#0A2E36",
  },
  "/retailer/wallet": {
    label: "Wallet",
    sublabel: "Balance & logs",
    href: "/retailer/wallet",
    icon: AccountBalanceWalletRoundedIcon,
    color: "#16A34A",
    bg: "#DCFCE7",
    darkBg: "#1A3D28",
  },
  "/retailer/wallet-topup": {
    label: "Wallet Top-up",
    sublabel: "Add funds",
    href: "/retailer/wallet-topup",
    icon: AddCardRoundedIcon,
    color: "#2563EB",
    bg: "#DBEAFE",
    darkBg: "#1E3A8A",
  },
  "/retailer/wallet-ledger": {
    label: "Wallet Ledger",
    sublabel: "Passbook",
    href: "/retailer/wallet-ledger",
    icon: ReceiptLongRoundedIcon,
    color: "#0D9488",
    bg: "#CCFBF1",
    darkBg: "#134E4A",
  },
  "/retailer/customers": {
    label: "Customers",
    sublabel: "Customer list",
    href: "/retailer/customers",
    icon: PeopleRoundedIcon,
    color: "#4F46E5",
    bg: "#E0E7FF",
    darkBg: "#312E81",
  },
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MobileQuickActionsFABProps {
  /** Bottom offset so FAB floats above the bottom nav bar (default: 36) */
  bottomOffset?: number;
  /** User's favorited menus; shown first before default quick actions */
  favorites?: FavoriteMenuInput[];
}

// ─── Component ─────────────────────────────────────────────────────────────────
export const MobileQuickActionsFAB: React.FC<MobileQuickActionsFABProps> = ({
  bottomOffset = 36,
  favorites = [],
}) => {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [open, setOpen] = React.useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);
  const handleToggle = useCallback(() => setOpen((prev) => !prev), []);

  const quickActions = useMemo<QuickActionConfig[]>(() => {
    const seen = new Set<string>();
    const favActions: QuickActionConfig[] = [];

    for (const fav of favorites) {
      const href = (fav.menu_href || "").trim();
      if (!href || seen.has(href)) continue;
      seen.add(href);

      const known = MENU_CATALOG_BY_HREF[href];
      if (known) {
        favActions.push({
          ...known,
          id: `fav-${href}`,
          label: fav.menu_label?.trim() || known.label,
          isFavorite: true,
        });
      } else {
        const fallbackLabel =
          fav.menu_label?.trim() ||
          href
            .split("/")
            .filter(Boolean)
            .pop()
            ?.replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()) ||
          "Quick Link";
        favActions.push({
          id: `fav-${href}`,
          label: fallbackLabel,
          sublabel: "Favorite",
          href,
          icon: AppsRoundedIcon,
          color: "#2563EB",
          bg: "#DBEAFE",
          darkBg: "#1E3A8A",
          isFavorite: true,
        });
      }
    }

    const remainingDefaults = DEFAULT_QUICK_ACTIONS.filter((a) => !seen.has(a.href));
    return [...favActions, ...remainingDefaults];
  }, [favorites]);

  const handleAction = useCallback(
    (href: string) => {
      setOpen(false);
      // Small delay lets the drawer animate shut before navigation
      setTimeout(() => router.push(href), 220);
    },
    [router]
  );

  const sheetBg = isDark
    ? "linear-gradient(160deg, rgba(17, 24, 39, 0.84) 0%, rgba(24, 24, 48, 0.88) 100%)"
    : "linear-gradient(160deg, rgba(255, 255, 255, 0.82) 0%, rgba(248, 250, 255, 0.78) 50%, rgba(245, 243, 255, 0.82) 100%)";
  const pillBg = isDark ? "rgba(255,255,255,0.14)" : "rgba(148,163,184,0.35)";

  return (
    <>
      {/* ── Center-Docked FAB ─────────────────────────────────────────────── */}
      <Fab
        id="mobile-quick-actions-fab"
        aria-label={open ? "Close Quick Actions" : "Quick Actions"}
        onClick={handleToggle}
        sx={{
          position: "fixed",
          bottom: bottomOffset,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1400,
          display: { xs: "flex", md: "none" },
          width: 56,
          height: 56,
          background: open
            ? "linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)"
            : "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
          boxShadow: open
            ? "0 8px 28px rgba(124,58,237,0.55), 0 0 18px rgba(37,99,235,0.4)"
            : "0 6px 20px rgba(37,99,235,0.5), 0 2px 8px rgba(0,0,0,0.2)",
          border: "2.5px solid rgba(255,255,255,0.9)",
          transition: "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s, background 0.22s",
          "&:hover": {
            background: "linear-gradient(135deg, #6D28D9 0%, #1D4ED8 100%)",
            transform: "translateX(-50%) scale(1.08)",
            boxShadow: "0 10px 30px rgba(124,58,237,0.6), 0 3px 12px rgba(37,99,235,0.35)",
          },
          "&:active": {
            transform: "translateX(-50%) scale(0.94)",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: open ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          <AddRoundedIcon sx={{ fontSize: 28, color: "#FFFFFF" }} />
        </Box>
      </Fab>

      {/* ── Quick Actions Bottom Sheet (Glassmorphism) ────────────────────── */}
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onOpen={handleOpen}
        onClose={handleClose}
        disableSwipeToOpen
        swipeAreaWidth={32}
        transitionDuration={{ enter: 280, exit: 220 }}
        ModalProps={{
          keepMounted: true,
          slotProps: {
            backdrop: {
              sx: {
                bgcolor: isDark ? "rgba(2, 6, 23, 0.55)" : "rgba(15, 23, 42, 0.24)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              },
            },
          },
        }}
        sx={{
          display: { xs: "block", md: "none" },
          zIndex: 1350,
          "& .MuiDrawer-paper": {
            position: "relative",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            background: sheetBg,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderTop: isDark
              ? "1px solid rgba(255, 255, 255, 0.16)"
              : "1px solid rgba(255, 255, 255, 0.8)",
            boxShadow: isDark
              ? "0 -12px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255,255,255,0.12)"
              : "0 -12px 48px rgba(37, 99, 235, 0.12), 0 -4px 24px rgba(124, 58, 237, 0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
            overflowX: "hidden",
            overflowY: "auto",
            pb: "env(safe-area-inset-bottom, 12px)",
            maxHeight: "86vh",
          },
        }}
      >
        {/* Ambient Pastel Gradient Lighting */}
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: 0,
            background: isDark
              ? "radial-gradient(circle at 12% 18%, rgba(37,99,235,0.22) 0%, transparent 45%), radial-gradient(circle at 88% 12%, rgba(168,85,247,0.2) 0%, transparent 42%), radial-gradient(circle at 20% 85%, rgba(20,184,166,0.16) 0%, transparent 45%), radial-gradient(circle at 82% 80%, rgba(236,72,153,0.14) 0%, transparent 42%)"
              : "radial-gradient(circle at 12% 18%, rgba(96,165,250,0.22) 0%, transparent 46%), radial-gradient(circle at 88% 12%, rgba(192,132,252,0.22) 0%, transparent 44%), radial-gradient(circle at 18% 85%, rgba(94,234,212,0.2) 0%, transparent 46%), radial-gradient(circle at 84% 82%, rgba(244,114,182,0.16) 0%, transparent 44%)",
          }}
        />

        {/* Drag Handle */}
        <Box sx={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", pt: 1.5, pb: 0.5 }}>
          <Box
            sx={{
              width: 40,
              height: 4,
              borderRadius: 2,
              bgcolor: pillBg,
            }}
          />
        </Box>

        {/* Header */}
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.25,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: "12px",
                background: isDark
                  ? "linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(37,99,235,0.3) 100%)"
                  : "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(238,242,255,0.85) 100%)",
                border: isDark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.95)",
                boxShadow: isDark
                  ? "0 4px 12px rgba(0,0,0,0.3)"
                  : "0 4px 12px rgba(99,102,241,0.14), inset 0 1px 0 rgba(255,255,255,0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BoltRoundedIcon sx={{ fontSize: 22, color: "#6366F1" }} />
            </Box>
            <Box
              sx={{
                pl: 1.25,
                borderLeft: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(15,23,42,0.1)",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  fontSize: "16px",
                  letterSpacing: "-0.01em",
                  color: isDark ? "#F8FAFC" : "#0F172A",
                  lineHeight: 1.2,
                }}
              >
                Quick Actions
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: isDark ? "#CBD5E1" : "#64748B", fontSize: "11.5px", fontWeight: 500 }}
              >
                {favorites.length > 0 ? "Favorites first • Select a service" : "Select a service to get started"}
              </Typography>
            </Box>
          </Box>
          <ButtonBase
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            aria-label="Close Quick Actions"
            sx={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              bgcolor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: isDark ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(255,255,255,0.9)",
              boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.18s, transform 0.18s",
              "&:hover": {
                bgcolor: isDark ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.95)",
                transform: "scale(1.06)",
              },
              "&:active": { transform: "scale(0.94)" },
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: 18, color: isDark ? "#E2E8F0" : "#475569" }} />
          </ButtonBase>
        </Box>

        {/* Action Grid – compact 4 columns (existing height) */}
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1,
            px: 1.5,
            pt: 0.5,
            pb: 8,
          }}
        >
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <QuickActionItem
                key={action.id}
                icon={Icon}
                label={action.label}
                sublabel={action.sublabel}
                color={action.color}
                bg={isDark ? action.darkBg : action.bg}
                gradient={isDark ? action.darkGradient : action.gradient}
                onClick={() => handleAction(action.href)}
                isDark={isDark}
                isFavorite={action.isFavorite}
              />
            );
          })}
        </Box>
      </SwipeableDrawer>
    </>
  );
};

// ─── Individual Quick Action Card (Glassmorphism) ───────────────────────────────
interface QuickActionItemProps {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  gradient?: string;
  onClick: () => void;
  isDark: boolean;
  isFavorite?: boolean;
}

const QuickActionItem: React.FC<QuickActionItemProps> = ({
  icon: Icon,
  label,
  sublabel,
  color,
  bg,
  gradient,
  onClick,
  isDark,
  isFavorite,
}) => (
  <ButtonBase
    onClick={onClick}
    aria-label={label}
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: 0.65,
      px: 0.5,
      py: 1.1,
      borderRadius: "18px",
      cursor: "pointer",
      background: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.56)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(255, 255, 255, 0.78)",
      boxShadow: isDark
        ? "0 4px 14px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)"
        : "0 4px 14px rgba(15, 23, 42, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.85)",
      transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s, background 0.2s, border-color 0.2s",
      "&:hover": {
        transform: "translateY(-2px) scale(1.02)",
        background: isDark ? "rgba(255, 255, 255, 0.11)" : "rgba(255, 255, 255, 0.82)",
        borderColor: alpha(color, 0.35),
        boxShadow: `0 8px 20px ${alpha(color, 0.18)}, 0 0 14px ${alpha(color, 0.1)}`,
      },
      "&:active": {
        transform: "scale(0.95)",
        background: isDark ? "rgba(255, 255, 255, 0.1)" : alpha(color, 0.08),
      },
      "& .MuiTouchRipple-ripple .MuiTouchRipple-child": {
        backgroundColor: alpha(color, 0.18),
      },
    }}
  >
    {/* Pastel Gradient Icon Container */}
    <Box
      sx={{
        position: "relative",
        width: 44,
        height: 44,
        borderRadius: "14px",
        background: gradient || bg,
        border: isDark ? `1px solid ${alpha(color, 0.35)}` : "1px solid rgba(255,255,255,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 4px 12px ${alpha(color, 0.22)}, inset 0 1px 1px rgba(255,255,255,0.6)`,
        transition: "transform 0.2s, box-shadow 0.2s",
        ".MuiButtonBase-root:hover &": {
          transform: "scale(1.06)",
          boxShadow: `0 6px 16px ${alpha(color, 0.32)}`,
        },
      }}
    >
      <Icon sx={{ fontSize: 22, color }} />
      {isFavorite && (
        <Box
          sx={{
            position: "absolute",
            top: -5,
            right: -5,
            width: 16,
            height: 16,
            borderRadius: "50%",
            bgcolor: "#F59E0B",
            border: "2px solid",
            borderColor: isDark ? "#1A1A2E" : "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(245,158,11,0.45)",
          }}
        >
          <StarRoundedIcon sx={{ fontSize: 10, color: "#FFFFFF" }} />
        </Box>
      )}
    </Box>

    {/* Label */}
    <Box sx={{ textAlign: "center", width: "100%", px: 0.25 }}>
      <Typography
        component="span"
        sx={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          fontSize: "11px",
          fontWeight: 700,
          color: isDark ? "#F8FAFC" : "#0F172A",
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      <Typography
        component="span"
        sx={{
          display: "block",
          fontSize: "9.5px",
          fontWeight: 500,
          color: isDark ? "#94A3B8" : "#64748B",
          lineHeight: 1.15,
          mt: 0.2,
        }}
      >
        {sublabel}
      </Typography>
    </Box>
  </ButtonBase>
);

export default MobileQuickActionsFAB;
