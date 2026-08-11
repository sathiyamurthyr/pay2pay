"use client";

import React, { useCallback } from "react";
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
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";

// ─── Quick Action Config ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    id: "upi",
    label: "UPI",
    sublabel: "Collect payment",
    href: "/retailer/upi",
    icon: QrCodeScannerRoundedIcon,
    color: "#7C3AED",
    bg: "#EDE9FE",
    darkBg: "#3B1F73",
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
    id: "card-to-cash",
    label: "Card to Cash",
    sublabel: "Payout request",
    href: "/retailer/card-to-cash",
    icon: CreditCardOffRoundedIcon,
    color: "#D97706",
    bg: "#FEF3C7",
    darkBg: "#3D2E0A",
  },
  {
    id: "recharge",
    label: "Recharge",
    sublabel: "Mobile & DTH",
    href: "/retailer/recharge",
    icon: PhoneIphoneRoundedIcon,
    color: "#2563EB",
    bg: "#EFF6FF",
    darkBg: "#1A2E5A",
  },
  {
    id: "bbps",
    label: "BBPS",
    sublabel: "Bill payment",
    href: "/retailer/bbps",
    icon: ElectricBoltRoundedIcon,
    color: "#DC2626",
    bg: "#FEE2E2",
    darkBg: "#3D1414",
  },
  {
    id: "pos",
    label: "Swipe Machine",
    sublabel: "POS terminal",
    href: "/retailer/pos",
    icon: PointOfSaleRoundedIcon,
    color: "#0891B2",
    bg: "#CFFAFE",
    darkBg: "#0A2E36",
  },
  {
    id: "qr-pay",
    label: "QR Pay",
    sublabel: "Scan & collect",
    href: "/retailer/upi",
    icon: QrCode2RoundedIcon,
    color: "#9333EA",
    bg: "#F3E8FF",
    darkBg: "#2E1245",
  },
] as const;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MobileQuickActionsFABProps {
  /** Bottom offset so FAB floats above the bottom nav bar (default: 36) */
  bottomOffset?: number;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export const MobileQuickActionsFAB: React.FC<MobileQuickActionsFABProps> = ({
  bottomOffset = 36,
}) => {
  const router = useRouter();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [open, setOpen] = React.useState(false);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

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
        aria-label="Quick Actions"
        onClick={handleOpen}
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
                color: isDark ? "#F1F5F9" : "#111827",
                lineHeight: 1.2,
              }}
            >
              Quick Actions
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: isDark ? "#94A3B8" : "#6B7280", fontSize: "12px" }}
            >
              Select a service to get started
            </Typography>
          </Box>
          <ButtonBase
            onClick={handleClose}
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
            pb: 2.5,
            // Last row: 3 items centred  → override with flex on overflow
          }}
        >
          {QUICK_ACTIONS.map((action) => {
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
}

const QuickActionItem: React.FC<QuickActionItemProps> = ({
  icon: Icon,
  label,
  sublabel,
  color,
  bg,
  onClick,
  isDark,
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
    </Box>

    {/* Label */}
    <Box sx={{ textAlign: "center" }}>
      <Typography
        component="span"
        sx={{
          display: "block",
          fontSize: "11px",
          fontWeight: 800,
          color: isDark ? "#F1F5F9" : "#111827",
          lineHeight: 1.2,
          whiteSpace: "nowrap",
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
