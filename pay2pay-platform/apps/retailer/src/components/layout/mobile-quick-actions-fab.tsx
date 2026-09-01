"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Fab,
  Box,
  Drawer,
  Typography,
  ButtonBase,
  useTheme,
  alpha,
  IconButton,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import FingerprintRoundedIcon from "@mui/icons-material/FingerprintRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import SparklesIcon from "@mui/icons-material/AutoAwesome";

// ─── Complete 11 Services for Quick Actions Bottom Sheet ───────────────────────
export const QUICK_ACTIONS = [
  {
    id: "payout",
    label: "Payout",
    sublabel: "Initiate payout",
    href: "/retailer/dmt",
    icon: SendRoundedIcon,
    accentColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.35)",
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.12) 100%)",
    iconBg: "#F59E0B",
    iconColor: "#0B0E14",
    badge: "Fast",
  },
  {
    id: "po-report",
    label: "PO Report",
    sublabel: "Purchase order report",
    href: "/retailer/pos/settlement-report",
    icon: AssessmentRoundedIcon,
    accentColor: "#38BDF8",
    glowColor: "rgba(56, 189, 248, 0.3)",
    gradient: "linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(2, 132, 199, 0.1) 100%)",
    iconBg: "#38BDF8",
    iconColor: "#0B0E14",
  },
  {
    id: "txn-report",
    label: "Transaction Report",
    sublabel: "View transactions",
    href: "/retailer/dmt/reports",
    icon: ReceiptLongRoundedIcon,
    accentColor: "#4ADE80",
    glowColor: "rgba(74, 222, 128, 0.3)",
    gradient: "linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(22, 163, 74, 0.1) 100%)",
    iconBg: "#4ADE80",
    iconColor: "#0B0E14",
  },
  {
    id: "upi",
    label: "UPI",
    sublabel: "Collect payment",
    href: "/retailer/upi",
    icon: QrCodeScannerRoundedIcon,
    accentColor: "#A855F7",
    glowColor: "rgba(168, 85, 247, 0.3)",
    gradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(126, 34, 206, 0.1) 100%)",
    iconBg: "#A855F7",
    iconColor: "#FFFFFF",
  },
  {
    id: "aeps",
    label: "AEPS",
    sublabel: "Biometric cash",
    href: "/retailer/aeps",
    icon: FingerprintRoundedIcon,
    accentColor: "#10B981",
    glowColor: "rgba(16, 185, 129, 0.3)",
    gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)",
    iconBg: "#10B981",
    iconColor: "#FFFFFF",
  },
  {
    id: "card-to-cash",
    label: "Card to Cash",
    sublabel: "Payout request",
    href: "/retailer/card-to-cash",
    icon: CreditCardRoundedIcon,
    accentColor: "#F97316",
    glowColor: "rgba(249, 115, 22, 0.3)",
    gradient: "linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(194, 65, 12, 0.1) 100%)",
    iconBg: "#F97316",
    iconColor: "#FFFFFF",
  },
  {
    id: "recharge",
    label: "Recharge",
    sublabel: "Mobile & DTH",
    href: "/retailer/recharge",
    icon: PhoneIphoneRoundedIcon,
    accentColor: "#3B82F6",
    glowColor: "rgba(59, 130, 246, 0.3)",
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(29, 78, 216, 0.1) 100%)",
    iconBg: "#3B82F6",
    iconColor: "#FFFFFF",
  },
  {
    id: "dmt",
    label: "DMT",
    sublabel: "Money transfer",
    href: "/retailer/dmt",
    icon: AccountBalanceWalletRoundedIcon,
    accentColor: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.3)",
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(180, 83, 9, 0.1) 100%)",
    iconBg: "#F59E0B",
    iconColor: "#0B0E14",
  },
  {
    id: "bbps",
    label: "BBPS",
    sublabel: "Bill payment",
    href: "/retailer/bbps",
    icon: ElectricBoltRoundedIcon,
    accentColor: "#EF4444",
    glowColor: "rgba(239, 68, 68, 0.3)",
    gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.1) 100%)",
    iconBg: "#EF4444",
    iconColor: "#FFFFFF",
  },
  {
    id: "pos",
    label: "Swipe Machine",
    sublabel: "POS terminal",
    href: "/retailer/pos",
    icon: PointOfSaleRoundedIcon,
    accentColor: "#06B6D4",
    glowColor: "rgba(6, 182, 212, 0.3)",
    gradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(14, 116, 144, 0.1) 100%)",
    iconBg: "#06B6D4",
    iconColor: "#0B0E14",
  },
  {
    id: "qr-pay",
    label: "QR Pay",
    sublabel: "Scan & collect",
    href: "/retailer/upi",
    icon: QrCode2RoundedIcon,
    accentColor: "#EC4899",
    glowColor: "rgba(236, 72, 153, 0.3)",
    gradient: "linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(190, 24, 93, 0.1) 100%)",
    iconBg: "#EC4899",
    iconColor: "#FFFFFF",
  },
] as const;

interface MobileQuickActionsFABProps {
  bottomOffset?: number;
}

export const MobileQuickActionsFAB: React.FC<MobileQuickActionsFABProps> = ({
  bottomOffset = 34,
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleAction = useCallback(
    (href: string) => {
      setOpen(false);
      setTimeout(() => router.push(href), 150);
    },
    [router]
  );

  // Close with escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      {/* ── Floating Action Button (FAB) ────────────────────────────────── */}
      <Fab
        id="mobile-quick-actions-fab"
        aria-label="Quick Actions Menu"
        onClick={handleToggle}
        sx={{
          position: "fixed",
          bottom: bottomOffset,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1450,
          display: { xs: "flex", md: "none" },
          width: 58,
          height: 58,
          background: "linear-gradient(135deg, #FCD34D 0%, #F59E0B 50%, #D97706 100%)",
          color: "#0B0E14",
          boxShadow: "0 8px 24px rgba(245, 158, 11, 0.45), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.6)",
          border: "2px solid rgba(255, 255, 255, 0.35)",
          transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
          "&:hover": {
            background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #B45309 100%)",
            transform: "translateX(-50%) scale(1.06)",
            boxShadow: "0 12px 32px rgba(245, 158, 11, 0.6)",
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
            transform: open ? "rotate(135deg)" : "rotate(0deg)",
          }}
        >
          <AddRoundedIcon sx={{ fontSize: 32, color: "#0B0E14", strokeWidth: 1.5 }} />
        </Box>
      </Fab>

      {/* ── Luxury Glassmorphism Bottom Sheet Modal ────────────────────── */}
      <Drawer
        anchor="bottom"
        open={open}
        onClose={handleClose}
        ModalProps={{
          keepMounted: true,
          disableScrollLock: false,
        }}
        sx={{
          display: { xs: "block", md: "none" },
          zIndex: 1400,
          "& .MuiBackdrop-root": {
            backgroundColor: "rgba(3, 7, 18, 0.75)",
            backdropFilter: "blur(8px)",
          },
          "& .MuiDrawer-paper": {
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            backgroundColor: "rgba(11, 14, 20, 0.95)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderBottom: "none",
            boxShadow: "0 -16px 48px rgba(0, 0, 0, 0.8), 0 0 32px rgba(245, 158, 11, 0.15)",
            color: "#F8FAFC",
            overflowX: "hidden",
            overflowY: "auto",
            maxHeight: "88vh",
            pb: "calc(env(safe-area-inset-bottom, 16px) + 70px)",
          },
        }}
      >
        {/* Top Gold Gradient Bar */}
        <Box
          sx={{
            height: 3,
            width: "100%",
            background: "linear-gradient(90deg, transparent 0%, #F59E0B 50%, transparent 100%)",
          }}
        />

        {/* Drag Handle Bar */}
        <Box sx={{ display: "flex", justifyContent: "center", pt: 1.5, pb: 1 }}>
          <Box
            sx={{
              width: 44,
              height: 5,
              borderRadius: 3,
              background: "linear-gradient(90deg, rgba(245, 158, 11, 0.5), rgba(252, 211, 77, 0.8), rgba(245, 158, 11, 0.5))",
              boxShadow: "0 0 8px rgba(245, 158, 11, 0.4)",
            }}
          />
        </Box>

        {/* Header with Title and Explicit Close Button */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2.5,
            pt: 1,
            pb: 1.5,
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  fontSize: "17px",
                  background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 60%, #FBBF24 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.3px",
                  lineHeight: 1.2,
                }}
              >
                Quick Actions
              </Typography>
              <Box
                sx={{
                  px: 1.2,
                  py: 0.2,
                  borderRadius: "10px",
                  bgcolor: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <SparklesIcon sx={{ fontSize: 11, color: "#FBBF24" }} />
                <Typography sx={{ fontSize: "10px", fontWeight: 800, color: "#FDE68A" }}>
                  11 Services
                </Typography>
              </Box>
            </Box>
            <Typography
              variant="caption"
              sx={{ color: "#94A3B8", fontSize: "12px", mt: 0.25, display: "block" }}
            >
              Select a service to get started
            </Typography>
          </Box>

          {/* Explicit Close Button */}
          <IconButton
            onClick={handleClose}
            aria-label="Close Quick Actions"
            sx={{
              width: 36,
              height: 36,
              borderRadius: "12px",
              bgcolor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#CBD5E1",
              transition: "all 0.2s",
              "&:hover": {
                bgcolor: "rgba(239, 68, 68, 0.2)",
                borderColor: "rgba(239, 68, 68, 0.4)",
                color: "#F87171",
              },
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* ── 11 Services Responsive Mobile Grid ───────────────────────────── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(3, 1fr)", sm: "repeat(4, 1fr)" },
            gap: 1.5,
            p: 2,
          }}
        >
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <ButtonBase
                key={action.id}
                onClick={() => handleAction(action.href)}
                aria-label={action.label}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  p: 1.5,
                  borderRadius: "18px",
                  bgcolor: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover, &:focus": {
                    bgcolor: "rgba(30, 41, 59, 0.85)",
                    borderColor: action.accentColor,
                    transform: "translateY(-2px)",
                    boxShadow: `0 6px 16px ${action.glowColor}`,
                  },
                  "&:active": {
                    transform: "scale(0.95)",
                  },
                }}
              >
                {/* Subtle Card Gradient Glow on Top */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: `linear-gradient(90deg, transparent, ${action.accentColor}, transparent)`,
                    opacity: 0.7,
                  }}
                />

                {/* Badge if present */}
                {"badge" in action && action.badge && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      px: 0.8,
                      py: 0.1,
                      borderRadius: "6px",
                      bgcolor: "rgba(245, 158, 11, 0.2)",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      color: "#FDE68A",
                      fontSize: "8.5px",
                      fontWeight: 900,
                      lineHeight: 1.2,
                    }}
                  >
                    {action.badge}
                  </Box>
                )}

                {/* Icon Container */}
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "14px",
                    bgcolor: action.iconBg,
                    color: action.iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 14px ${action.glowColor}`,
                    mb: 1,
                  }}
                >
                  <Icon sx={{ fontSize: 24, color: action.iconColor }} />
                </Box>

                {/* Service Name */}
                <Typography
                  sx={{
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#FFFFFF",
                    textAlign: "center",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%",
                  }}
                >
                  {action.label}
                </Typography>

                {/* Subtitle / Description */}
                <Typography
                  sx={{
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "#94A3B8",
                    textAlign: "center",
                    lineHeight: 1.2,
                    mt: 0.4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%",
                  }}
                >
                  {action.sublabel}
                </Typography>
              </ButtonBase>
            );
          })}
        </Box>
      </Drawer>
    </>
  );
};

export default MobileQuickActionsFAB;
