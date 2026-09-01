"use client";

import React, { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Badge,
  Paper,
} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";

export const BOTTOM_NAV_ROUTES = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/retailer/dashboard",
    icon: DashboardRoundedIcon,
    matchPaths: ["/retailer/dashboard", "/retailer-dashboard", "/dashboard"],
  },
  {
    id: "transfer",
    label: "Transfer",
    href: "/retailer/dmt",
    icon: SendRoundedIcon,
    matchPaths: ["/retailer/dmt", "/dmt"],
  },
  // slot 2 is the FAB gap
  {
    id: "wallet",
    label: "Wallet",
    href: "/retailer/wallet",
    icon: AccountBalanceWalletRoundedIcon,
    matchPaths: ["/retailer/wallet", "/retailer/wallet-statement", "/retailer/topup-request"],
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

interface MobileBottomNavProps {
  notificationCount?: number;
  onFabClick?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  notificationCount = 0,
  onFabClick,
}) => {
  const pathname = usePathname();
  const router = useRouter();

  // Resolve active index
  const activeRouteIndex = BOTTOM_NAV_ROUTES.findIndex((item) =>
    item.matchPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
  );

  const routeToSlot = [0, 1, 3, 4, 5];
  const activeSlot = activeRouteIndex >= 0 ? routeToSlot[activeRouteIndex] : 0;

  const handleChange = useCallback(
    (_: React.SyntheticEvent, slotValue: number) => {
      if (slotValue === 2) {
        onFabClick?.();
        return;
      }
      const slotToRoute: Record<number, number> = { 0: 0, 1: 1, 3: 2, 4: 3, 5: 4 };
      const routeIdx = slotToRoute[slotValue];
      if (routeIdx === undefined) return;
      const route = BOTTOM_NAV_ROUTES[routeIdx];
      if (route?.href) router.push(route.href);
    },
    [router, onFabClick]
  );

  const iconSx = (slot: number) => ({
    fontSize: 22,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    transform: activeSlot === slot ? "scale(1.15) translateY(-2px)" : "scale(1)",
    color: activeSlot === slot ? "#F59E0B" : "#94A3B8",
    filter: activeSlot === slot ? "drop-shadow(0 0 6px rgba(245, 158, 11, 0.5))" : "none",
  });

  return (
    <Paper
      elevation={0}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1350,
        display: { xs: "block", md: "none" },
        backgroundColor: "rgba(8, 11, 17, 0.95)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(245, 158, 11, 0.2)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.6)",
        overflow: "visible",
      }}
    >
      {/* Active Gold Indicator Bar */}
      <ActiveTabIndicator activeSlot={activeSlot} />

      <BottomNavigation
        value={activeSlot}
        onChange={handleChange}
        showLabels
        sx={{
          bgcolor: "transparent",
          height: 60,
          "& .MuiBottomNavigationAction-root": {
            minWidth: 0,
            maxWidth: "none",
            flex: 1,
            gap: 0,
            padding: "6px 0 4px",
            color: "#94A3B8",
            transition: "color 0.2s, transform 0.15s",
          },
          "& .MuiBottomNavigationAction-root.Mui-selected": {
            color: "#FBBF24",
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: "10.5px",
            fontWeight: 600,
            letterSpacing: "0.01em",
            mt: 0.3,
            color: "#94A3B8",
            "&.Mui-selected": {
              fontSize: "11px",
              fontWeight: 800,
              background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
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

        {/* Slot 1 – Transfer */}
        <BottomNavigationAction
          id="mobile-nav-transfer"
          label="Transfer"
          value={1}
          icon={<SendRoundedIcon sx={iconSx(1)} />}
        />

        {/* Slot 2 – Center FAB Gap (Reserved for floating button) */}
        <BottomNavigationAction
          id="mobile-nav-fab-gap"
          label=""
          value={2}
          disabled
          icon={<Box sx={{ width: 56, height: 36 }} />}
          sx={{ opacity: 0, pointerEvents: "none", flex: "0 0 68px" }}
        />

        {/* Slot 3 – Wallet */}
        <BottomNavigationAction
          id="mobile-nav-wallet"
          label="Wallet"
          value={3}
          icon={<AccountBalanceWalletRoundedIcon sx={iconSx(3)} />}
        />

        {/* Slot 4 – Alerts */}
        <BottomNavigationAction
          id="mobile-nav-notifications"
          label="Alerts"
          value={4}
          icon={
            <Badge
              badgeContent={notificationCount}
              color="error"
              max={99}
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "9px",
                  minWidth: 16,
                  height: 16,
                  bgcolor: "#EF4444",
                  color: "#FFFFFF",
                  fontWeight: 900,
                },
              }}
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
          bgcolor: "transparent",
          height: "env(safe-area-inset-bottom, 0px)",
          minHeight: 0,
        }}
      />
    </Paper>
  );
};

const SLOT_COUNT = 6;
const GAP_SLOT = 2;

const ActiveTabIndicator: React.FC<{ activeSlot: number }> = ({ activeSlot }) => {
  if (activeSlot < 0 || activeSlot === GAP_SLOT) return null;

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
        background: "linear-gradient(90deg, #FDE68A 0%, #F59E0B 100%)",
        boxShadow: "0 0 8px rgba(245, 158, 11, 0.8)",
        transition: "left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    />
  );
};

export default MobileBottomNav;
