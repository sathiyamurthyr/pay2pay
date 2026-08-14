"use client";

import React, { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Badge,
  Paper,
  useTheme,
} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

// ─── Config ────────────────────────────────────────────────────────────────────
// Exactly 5 items as per MD3 spec (FAB is a separate floating component):
// [Dashboard] [Transfer] [── FAB ──] [Wallet] [Notifications]  (5 slots, center is visual gap)
// The actual Profile item sits instead of Notifications in the original spec,
// so we implement: Dashboard · Transfer · [gap] · Wallet · Profile
// Alerts (notifications) are accessible via the Profile area or a badge on the bell icon.
//
// Final layout per requirements:
//   1 Dashboard  2 Money Transfer  [center gap for FAB]  3 Wallet  4 Notifications  5 Profile
// — That is 5 real items + 1 empty gap slot = 6 slot positions.
// To keep EXACTLY 5 items with a center FAB notch we split: 2 left + FAB gap + 3 right.

export const BOTTOM_NAV_ROUTES = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/retailer/dashboard",
    icon: DashboardRoundedIcon,
    matchPaths: ["/retailer/dashboard", "/retailer-dashboard"],
  },
  {
    id: "transfer",
    label: "Transfer",
    href: "/retailer/dmt",
    icon: SendRoundedIcon,
    matchPaths: ["/retailer/dmt", "/dmt"],
  },
  // slot 2 is the FAB gap (invisible, pointer-events: none)
  {
    id: "wallet",
    label: "Wallet",
    href: "/retailer/wallet",
    icon: AccountBalanceWalletRoundedIcon,
    matchPaths: ["/retailer/wallet", "/retailer/wallet-statement"],
  },
  {
    id: "notifications",
    label: "Alerts",
    href: "/retailer/notifications",
    icon: NotificationsRoundedIcon,
    matchPaths: ["/retailer/notifications"],
  },
  {
    id: "profile",
    label: "Profile",
    href: "/retailer/profile",
    icon: PersonRoundedIcon,
    matchPaths: ["/retailer/profile", "/retailer/kyc"],
  },
] as const;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface MobileBottomNavProps {
  /** Notification count shown on the Alerts badge */
  notificationCount?: number;
  /** Called when user taps the FAB placeholder slot */
  onFabClick?: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────
/**
 * Material Design 3 Bottom Navigation Bar.
 * Renders on xs/sm screens only (hidden on md+).
 * Layout: [Dashboard] [Transfer] [FAB gap] [Wallet] [Alerts] [Profile]
 * The FAB gap is an invisible non-interactive slot so the center FAB button
 * can float above it without overlapping tab labels.
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  notificationCount = 0,
  onFabClick,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();

  const isDark = theme.palette.mode === "dark";

  // Resolve which of the 5 real route items is active → BottomNavigation value (0–4)
  const activeRouteIndex = BOTTOM_NAV_ROUTES.findIndex((item) =>
    item.matchPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );

  // Map route-index → nav slot index (skip slot 2 which is the FAB gap):
  // routeIdx 0 → navSlot 0, routeIdx 1 → navSlot 1, routeIdx 2 → navSlot 3, routeIdx 3 → navSlot 4, routeIdx 4 → navSlot 5
  const routeToSlot = [0, 1, 3, 4, 5];
  const activeSlot = activeRouteIndex >= 0 ? routeToSlot[activeRouteIndex] : -1;

  const handleChange = useCallback(
    (_: React.SyntheticEvent, slotValue: number) => {
      if (slotValue === 2) {
        onFabClick?.();
        return;
      }
      // Reverse map slot → route
      const slotToRoute: Record<number, number> = { 0: 0, 1: 1, 3: 2, 4: 3, 5: 4 };
      const routeIdx = slotToRoute[slotValue];
      if (routeIdx === undefined) return;
      const route = BOTTOM_NAV_ROUTES[routeIdx];
      if (route?.href) router.push(route.href);
    },
    [router, onFabClick]
  );

  // ─── Colours ─────────────────────────────────────────────────────────────────
  const navBg = isDark ? "#1A1A2E" : "#FFFFFF";
  const activeColor = "#2563EB";
  const inactiveColor = isDark ? "#94A3B8" : "#6B7280";
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB";

  // ─── Icon helper ────────────────────────────────────────────────────────────
  const iconSx = (slot: number) => ({
    fontSize: 24,
    transition: "transform 0.15s",
    transform: activeSlot === slot ? "scale(1.1)" : "scale(1)",
  });

  return (
    <Paper
      elevation={0}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
        display: { xs: "block", md: "none" }, // mobile only
        borderTop: `1px solid ${borderColor}`,
        borderRadius: 0,
        overflow: "visible",
      }}
    >
      {/* Active indicator bar (top) */}
      <ActiveTabIndicator activeSlot={activeSlot} isDark={isDark} />

      <BottomNavigation
        value={activeSlot}
        onChange={handleChange}
        showLabels
        sx={{
          bgcolor: navBg,
          height: 64,
          "& .MuiBottomNavigationAction-root": {
            minWidth: 0,
            maxWidth: "none",
            flex: 1,
            gap: 0,
            padding: "8px 0 6px",
            color: inactiveColor,
            transition: "color 0.2s, transform 0.15s",
            "& .MuiTouchRipple-ripple .MuiTouchRipple-child": {
              backgroundColor: activeColor + "33",
            },
          },
          "& .MuiBottomNavigationAction-root.Mui-selected": {
            color: activeColor,
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.01em",
            mt: 0.5,
            "&.Mui-selected": {
              fontSize: "11px",
              fontWeight: 800,
            },
          },
        }}
      >
        {/* Slot 0 – Dashboard */}
        <BottomNavigationAction
          id="mobile-nav-dashboard"
          label="Dashboard"
          value={0}
          icon={<DashboardRoundedIcon sx={iconSx(0)} />}
        />

        {/* Slot 1 – Money Transfer */}
        <BottomNavigationAction
          id="mobile-nav-transfer"
          label="Transfer"
          value={1}
          icon={<SendRoundedIcon sx={iconSx(1)} />}
        />

        {/* Slot 2 – FAB Gap (invisible) */}
        <BottomNavigationAction
          id="mobile-nav-fab-gap"
          label=""
          value={2}
          disabled
          icon={<Box sx={{ width: 56, height: 40 }} />}
          sx={{ opacity: 0, pointerEvents: "none", flex: "0 0 72px" }}
        />

        {/* Slot 3 – Wallet */}
        <BottomNavigationAction
          id="mobile-nav-wallet"
          label="Wallet"
          value={3}
          icon={<AccountBalanceWalletRoundedIcon sx={iconSx(3)} />}
        />

        {/* Slot 4 – Notifications */}
        <BottomNavigationAction
          id="mobile-nav-notifications"
          label="Alerts"
          value={4}
          icon={
            <Badge
              badgeContent={notificationCount}
              color="error"
              max={99}
              sx={{ "& .MuiBadge-badge": { fontSize: "9px", minWidth: 16, height: 16 } }}
            >
              <NotificationsRoundedIcon sx={iconSx(4)} />
            </Badge>
          }
        />

        {/* Slot 5 – Profile */}
        <BottomNavigationAction
          id="mobile-nav-profile"
          label="Profile"
          value={5}
          icon={<PersonRoundedIcon sx={iconSx(5)} />}
        />
      </BottomNavigation>

      {/* iOS safe area spacer */}
      <Box
        sx={{
          bgcolor: navBg,
          height: "env(safe-area-inset-bottom, 0px)",
          minHeight: 0,
        }}
      />
    </Paper>
  );
};

// ─── Active Tab Indicator ──────────────────────────────────────────────────────
// Shows a 32px pill at the top of the active nav item
const SLOT_COUNT = 6; // 5 visible + 1 invisible gap
const GAP_SLOT = 2;

const ActiveTabIndicator: React.FC<{ activeSlot: number; isDark: boolean }> = ({
  activeSlot,
  isDark,
}) => {
  if (activeSlot < 0 || activeSlot === GAP_SLOT) return null;

  // Calculate the left offset as a percentage of nav width.
  // Slot widths: slots 0,1,3,4,5 each get equal share of remaining width after gap (72px fixed).
  // We approximate: gap occupies ~12% of typical width, others share equally.
  // For simplicity: use percentage based on 6 equal slots.
  const leftPct = (activeSlot / SLOT_COUNT) * 100 + 100 / SLOT_COUNT / 2;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: `calc(${leftPct}% - 16px)`,
        width: 32,
        height: 3,
        borderRadius: "0 0 6px 6px",
        bgcolor: "#2563EB",
        transition: "left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    />
  );
};

export default MobileBottomNav;
