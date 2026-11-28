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

  const sheetBg = isDark ? "#1A1A2E" : "#FFFFFF";
  const pillBg = isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9";

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
          background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
          boxShadow: "0 6px 20px rgba(37,99,235,0.5), 0 2px 8px rgba(0,0,0,0.2)",
          border: "3px solid white",
          transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s",
          "&:hover": {
            background: "linear-gradient(135deg, #1D4ED8 0%, #6D28D9 100%)",
            transform: "translateX(-50%) scale(1.08)",
            boxShadow: "0 8px 28px rgba(37,99,235,0.55), 0 3px 12px rgba(0,0,0,0.25)",
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

      {/* ── Quick Actions Bottom Sheet ────────────────────────────────────── */}
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onOpen={handleOpen}
        onClose={handleClose}
        disableSwipeToOpen
        swipeAreaWidth={32}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          zIndex: 1350,
          "& .MuiDrawer-paper": {
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            bgcolor: sheetBg,
            overflow: "hidden",
            pb: "env(safe-area-inset-bottom, 12px)",
            maxHeight: "85vh",
          },
        }}
      >
        {/* Drag Handle */}
        <Box sx={{ display: "flex", justifyContent: "center", pt: 1.5, pb: 0.5 }}>
          <Box
            sx={{
              width: 36,
              height: 4,
              borderRadius: 2,
              bgcolor: pillBg,
            }}
          />
        </Box>

        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            py: 1.5,
          }}
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 800,
                fontSize: "16px",
                color: isDark ? "#F1F5F9" : "#0F172A",
                lineHeight: 1.2,
              }}
            >
              Quick Actions
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: isDark ? "#94A3B8" : "#6B7280", fontSize: "12px" }}
            >
              {favorites.length > 0 ? "Favorites first • Select a service" : "Select a service to get started"}
            </Typography>
          </Box>
          <ButtonBase
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            aria-label="Close Quick Actions"
            sx={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              bgcolor: pillBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s",
              "&:hover": { bgcolor: isDark ? "rgba(255,255,255,0.14)" : "#E2E8F0" },
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: 18, color: isDark ? "#94A3B8" : "#6B7280" }} />
          </ButtonBase>
        </Box>

        {/* Action Grid – 4 columns */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 0,
            px: 1.5,
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

// ─── Individual Quick Action Tile ───────────────────────────────────────────────
interface QuickActionItemProps {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
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
      gap: 0.75,
      p: 1.25,
      borderRadius: 3,
      transition: "background 0.15s, transform 0.15s",
      "&:active": { transform: "scale(0.94)", bgcolor: isDark ? "rgba(255,255,255,0.06)" : alpha(color, 0.06) },
      "& .MuiTouchRipple-ripple .MuiTouchRipple-child": {
        backgroundColor: alpha(color, 0.15),
      },
    }}
  >
    {/* Icon circle */}
    <Box
      sx={{
        position: "relative",
        width: 52,
        height: 52,
        borderRadius: "16px",
        bgcolor: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 2px 8px ${alpha(color, 0.2)}`,
        transition: "transform 0.15s, box-shadow 0.15s",
        ".MuiButtonBase-root:hover &": {
          transform: "translateY(-2px)",
          boxShadow: `0 4px 14px ${alpha(color, 0.3)}`,
        },
      }}
    >
      <Icon sx={{ fontSize: 26, color }} />
      {isFavorite && (
        <Box
          sx={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 18,
            height: 18,
            borderRadius: "50%",
            bgcolor: "#F59E0B",
            border: "2px solid",
            borderColor: isDark ? "#1A1A2E" : "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StarRoundedIcon sx={{ fontSize: 11, color: "#FFFFFF" }} />
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
          fontWeight: 800,
          color: isDark ? "#F1F5F9" : "#0F172A",
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
          color: isDark ? "#94A3B8" : "#6B7280",
          lineHeight: 1.2,
          mt: 0.25,
        }}
      >
        {sublabel}
      </Typography>
    </Box>
  </ButtonBase>
);

export default MobileQuickActionsFAB;
