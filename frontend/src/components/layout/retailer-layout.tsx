"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppBar, Toolbar, Drawer, Box, Typography, IconButton, Badge, Menu,
  MenuItem, Divider, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Button, Avatar, Chip, Tooltip, Stack, Paper, InputBase,
  Popover
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import ShieldIcon from "@mui/icons-material/Shield";
import SearchIcon from "@mui/icons-material/Search";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SendIcon from "@mui/icons-material/Send";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import QrCodeIcon from "@mui/icons-material/QrCode";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import ReceiptIcon from "@mui/icons-material/Receipt";
import ContactsIcon from "@mui/icons-material/Contacts";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import NotificationsIcon from "@mui/icons-material/Notifications";
import PersonIcon from "@mui/icons-material/Person";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import StorefrontIcon from "@mui/icons-material/Storefront";
import LockIcon from "@mui/icons-material/Lock";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import PaletteIcon from "@mui/icons-material/Palette";
import { useAuth } from "@/lib/auth";
import { useRetailerStore, KpiTheme } from "@/stores/use-retailer-store";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { MobileQuickActionsFAB } from "./mobile-quick-actions-fab";
import { UniversalSearchDialog } from "@/components/common/universal-search-dialog";
import { RightContextPanel } from "./right-context-panel";

const FULL_DRAWER_WIDTH = 310;
const COLLAPSED_DRAWER_WIDTH = 72;

const KPI_THEMES: { id: KpiTheme; label: string; swatch: string }[] = [
  { id: "classic-blue", label: "Classic Blue", swatch: "#2563EB" },
  { id: "royal-gold", label: "Royal Gold", swatch: "#FFD54F" },
  { id: "emerald-green", label: "Emerald Green", swatch: "#16A34A" },
  { id: "purple", label: "Purple Velvet", swatch: "#7C3AED" },
  { id: "dark", label: "Dark Onyx", swatch: "#0F172A" },
  { id: "corporate-white", label: "Corporate White", swatch: "#FFFFFF" },
];

export const RetailerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { outlet, wallet, isSyncing, syncBalance, soundboxEnabled, toggleSoundbox, unreadNotifications, kpiTheme, setKpiTheme } = useRetailerStore();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [kpiThemeAnchor, setKpiThemeAnchor] = useState<null | HTMLElement>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [universalSearchOpen, setUniversalSearchOpen] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const activeDrawerWidth = desktopCollapsed ? COLLAPSED_DRAWER_WIDTH : FULL_DRAWER_WIDTH;

  const navCategories = [
    {
      title: "MAIN",
      items: [{ label: "Dashboard", path: "/retailer-dashboard", icon: DashboardIcon }],
    },
    {
      title: "PAYMENTS",
      items: [
        { label: "Money Transfer (DMT)", path: "/retailer/dmt", icon: SendIcon, badge: "IMPS" },
        { label: "Card to Cash", path: "/retailer/card-to-cash", icon: CreditCardIcon },
        { label: "AEPS Cash Out", path: "/retailer/aeps", icon: FingerprintIcon, badge: "Biometric" },
        { label: "UPI Services", path: "/retailer/upi", icon: QrCodeIcon },
        { label: "Bill Payment (BBPS)", path: "/retailer/bbps", icon: ReceiptIcon },
        { label: "Recharge", path: "/retailer/recharge", icon: PhoneAndroidIcon },
      ],
    },
    {
      title: "WALLET",
      items: [
        { label: "Wallet & Top-Up", path: "/retailer/wallet", icon: AccountBalanceWalletIcon },
        { label: "Wallet Statement", path: "/retailer/wallet-statement", icon: ReceiptLongIcon },
      ],
    },
    {
      title: "CUSTOMERS",
      items: [
        { label: "Customer Directory", path: "/retailer/customers", icon: PersonIcon },
        { label: "Beneficiaries", path: "/retailer/beneficiaries", icon: PersonIcon },
      ],
    },
    {
      title: "BUSINESS",
      items: [
        { label: "Reports & Tax Forms", path: "/retailer/reports", icon: AssessmentIcon },
        { label: "Commission Slabs", path: "/retailer/commission", icon: AssessmentIcon },
        { label: "Move To Bank", path: "/retailer/settlement", icon: AccountBalanceIcon },
        { label: "Transactions Ledger", path: "/retailer/transactions", icon: ReceiptLongIcon },
      ],
    },
    {
      title: "SUPPORT",
      items: [
        { label: "Notifications", path: "/retailer/notifications", icon: NotificationsIcon },
        { label: "Support Desk", path: "/retailer/support", icon: AssessmentIcon },
        { label: "Settings", path: "/retailer/settings", icon: AssessmentIcon },
        { label: "Retailer Profile", path: "/retailer/profile", icon: PersonIcon },
      ],
    },
  ];

  const handleDrawerToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1200) {
      setDesktopCollapsed(!desktopCollapsed);
    } else {
      setMobileOpen(!mobileOpen);
    }
  };

  const allNavItems = navCategories.flatMap((c) => c.items);
  const activeMenuItem = allNavItems.find((item) =>
    pathname === item.path || (item.path !== "/retailer-dashboard" && pathname?.startsWith(item.path))
  );

  const renderDrawerContent = (isCollapsed: boolean) => (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#08111F",
        color: "#F8FAFC",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* PAY2PAY Brand Logo Header (72px) */}
      <Box
        sx={{
          height: 72,
          px: isCollapsed ? 1.5 : 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          bgcolor: "rgba(15, 23, 42, 0.6)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.8 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "12px",
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 900,
              fontSize: "18px",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
              flexShrink: 0,
            }}
          >
            P2P
          </Box>
          {!isCollapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#F8FAFC", fontSize: "22px", lineHeight: 1.1, whiteSpace: "nowrap" }}>
                PAY2PAY
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "13px", display: "block", whiteSpace: "nowrap" }}>
                Enterprise Operations
              </Typography>
            </Box>
          )}
        </Box>

        {!isCollapsed && (
          <Tooltip title="Collapse Sidebar (72px)">
            <IconButton
              onClick={() => setDesktopCollapsed(true)}
              size="small"
              sx={{ display: { xs: "none", lg: "flex" }, color: "#94A3B8", "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" } }}
            >
              <ChevronLeftIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Categorized Enterprise Dark Navigation List */}
      <Box sx={{ flex: 1, py: 2, px: isCollapsed ? 1 : 1.5, overflowY: "auto" }}>
        {navCategories.map((cat) => (
          <Box key={cat.title} sx={{ mb: 2.5 }}>
            {!isCollapsed && (
              <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", px: "20px", display: "block", mb: 0.8 }}>
                {cat.title}
              </Typography>
            )}
            <Stack spacing={0.6}>
              {cat.items.map((item) => {
                const IconComponent = item.icon;
                const isActive = pathname === item.path || (item.path !== "/retailer-dashboard" && pathname?.startsWith(item.path));

                return (
                  <Tooltip key={item.path} title={isCollapsed ? item.label : ""} placement="right" arrow>
                    <Box
                      component={Link}
                      href={item.path}
                      onClick={() => setMobileOpen(false)}
                      sx={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        height: 56,
                        borderRadius: "12px",
                        px: isCollapsed ? 0 : "20px",
                        justifyContent: isCollapsed ? "center" : "space-between",
                        backgroundColor: isActive ? "rgba(37, 99, 235, 0.25)" : "transparent",
                        color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.90)",
                        textDecoration: "none",
                        boxShadow: isActive ? "0 4px 16px rgba(37, 99, 235, 0.35)" : "none",
                        transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                        "&::before": isActive
                          ? {
                              content: '""',
                              position: "absolute",
                              left: 0,
                              top: "8px",
                              bottom: "8px",
                              width: "4px",
                              borderRadius: "2px",
                              backgroundColor: "#2563EB",
                            }
                          : {},
                        "&:hover": {
                          backgroundColor: isActive ? "rgba(37, 99, 235, 0.35)" : "rgba(255, 255, 255, 0.08)",
                          color: "#FFFFFF",
                        },
                      }}
                    >
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center", minWidth: 0 }}>
                        <IconComponent sx={{ fontSize: 22, color: isActive ? "#60A5FA" : "rgba(255, 255, 255, 0.88)" }} />
                        {!isCollapsed && (
                          <Typography sx={{ fontSize: "16px", fontWeight: isActive ? 700 : 600, lineHeight: "24px", whiteSpace: "nowrap", color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.90)" }}>
                            {item.label}
                          </Typography>
                        )}
                      </Stack>

                      {!isCollapsed && item.badge && (
                        <Chip
                          label={item.badge}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "10px",
                            fontWeight: 800,
                            backgroundColor: isActive ? "#2563EB" : "rgba(255,255,255,0.12)",
                            color: "#FFFFFF",
                          }}
                        />
                      )}
                    </Box>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* Logged-in Retailer Profile Footer at Bottom of Dark Sidebar */}
      {!isCollapsed ? (
        <Box sx={{ p: 1.5, bgcolor: "rgba(15, 23, 42, 0.6)" }}>
          <Paper
            elevation={0}
            onClick={(e) => setProfileAnchor(e.currentTarget)}
            sx={{
              p: 1.2,
              borderRadius: "12px",
              backgroundColor: "rgba(18, 27, 48, 0.72)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              cursor: "pointer",
              "&:hover": { borderColor: "#2563EB" },
            }}
          >
            <Avatar sx={{ bgcolor: "#2563EB", width: 34, height: 34, fontWeight: 900, fontSize: "13px" }}>
              {outlet.ownerName.charAt(0)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#F8FAFC", fontSize: "12px", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {outlet.ownerName}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "10px", color: "#4ADE80", fontWeight: 700, display: "block" }}>
                ● Online Retailer ({outlet.code})
              </Typography>
            </Box>
          </Paper>
        </Box>
      ) : (
        <Box sx={{ py: 1.5, display: "flex", justifyContent: "center" }}>
          <Avatar sx={{ bgcolor: "#2563EB", width: 34, height: 34, fontWeight: 900, fontSize: "13px" }}>
            {outlet.ownerName.charAt(0)}
          </Avatar>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "#F8FAFC" }}>
      {/* ── Sticky Header (Height: 56px Exact) ── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          height: 56,
          width: { lg: `calc(100% - ${activeDrawerWidth}px)` },
          ml: { lg: `${activeDrawerWidth}px` },
          backgroundColor: "#FFFFFF",
          color: "#111827",
          borderBottom: "1px solid #E5E7EB",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          justifyContent: "center",
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), margin 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, sm: 3 }, minHeight: "56px !important", height: 56 }}>
          
          {/* Left: Menu Toggle + Page Title + Search Input */}
          <Stack direction="row" spacing={1.75} sx={{ alignItems: "center" }}>
            <Tooltip title={desktopCollapsed ? "Expand Sidebar (260px)" : "Collapse Sidebar (72px)"}>
              <IconButton
                edge="start"
                color="inherit"
                aria-label="toggle drawer"
                onClick={handleDrawerToggle}
                size="small"
                sx={{ p: 0.75, color: "#1E3A8A" }}
              >
                {desktopCollapsed ? <MenuOpenIcon sx={{ fontSize: 24 }} /> : <MenuIcon sx={{ fontSize: 24 }} />}
              </IconButton>
            </Tooltip>

            {/* Page Title */}
            <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#111827" }}>
              {activeMenuItem?.label || "Retailer Terminal"}
            </Typography>

            {/* Universal Search Input Bar */}
            <Paper
              elevation={0}
              onClick={() => setUniversalSearchOpen(true)}
              sx={{
                p: "2px 10px",
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                width: 260,
                height: 36,
                borderRadius: "10px",
                backgroundColor: "#F8FAFC",
                border: "1px solid #E5E7EB",
                cursor: "pointer",
                "&:hover": { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" },
              }}
            >
              <SearchIcon sx={{ color: "#0284C7", fontSize: 18, mr: 0.75 }} />
              <Typography variant="caption" sx={{ fontSize: "12px", color: "#64748B", flex: 1, fontWeight: 700 }}>
                Universal Search...
              </Typography>
              <Chip label="Ctrl+K" size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 800, bgcolor: "#E2E8F0", color: "#334155" }} />
            </Paper>
          </Stack>

          {/* Right: Soundbox, Wallet Balance, Notifications, Profile Menu */}
          <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} sx={{ alignItems: "center" }}>
            {/* Live Soundbox Toggle Button */}
            <Tooltip title="Live Soundbox Voice Alerts">
              <Button
                size="small"
                variant={soundboxEnabled ? "contained" : "outlined"}
                color={soundboxEnabled ? "success" : "inherit"}
                startIcon={<VolumeUpIcon sx={{ fontSize: 16 }} />}
                onClick={toggleSoundbox}
                sx={{
                  borderRadius: 4,
                  fontSize: "0.72rem",
                  px: 1.5,
                  height: 32,
                  display: { xs: "none", lg: "inline-flex" },
                }}
              >
                {soundboxEnabled ? "Soundbox On" : "Muted"}
              </Button>
            </Tooltip>

            {/* Wallet Balance Display Pill */}
            <Paper
              elevation={0}
              sx={{
                px: { xs: 1, sm: 1.5 },
                py: 0.4,
                borderRadius: 2.5,
                backgroundColor: "#EFF6FF",
                border: "1px solid #BFDBFE",
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexShrink: 0,
                height: 36,
              }}
            >
              <AccountBalanceWalletIcon sx={{ color: "#2563EB", fontSize: 18 }} />
              <Box>
                <Typography variant="caption" sx={{ color: "#1D4ED8", fontWeight: 700, display: { xs: "none", sm: "block" }, lineHeight: 1, fontSize: "10px" }}>
                  WALLET
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#111827", fontFamily: "monospace", fontSize: "13px" }}>
                  ₹{wallet.mainBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              <IconButton size="small" onClick={syncBalance} disabled={isSyncing} sx={{ p: 0.25 }}>
                <RefreshIcon sx={{ fontSize: 15, color: "#2563EB", animation: isSyncing ? "spin 1s linear infinite" : "none" }} />
              </IconButton>
            </Paper>

            {/* KPI Theme Selector Icon & Menu */}
            <Tooltip title="KPI Cards Color Theme">
              <IconButton
                color="inherit"
                onClick={(e) => setKpiThemeAnchor(e.currentTarget)}
                size="small"
                sx={{ p: 0.75, color: "#4B5563" }}
              >
                <PaletteIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={kpiThemeAnchor}
              open={Boolean(kpiThemeAnchor)}
              onClose={() => setKpiThemeAnchor(null)}
              slotProps={{ paper: { sx: { borderRadius: 3, width: 200, mt: 1 } } }}
            >
              <Box sx={{ p: 1.5, borderBottom: "1px solid #E5E7EB" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "13px" }}>KPI Card Theme</Typography>
              </Box>
              {KPI_THEMES.map((theme) => (
                <MenuItem
                  key={theme.id}
                  selected={kpiTheme === theme.id}
                  onClick={() => {
                    setKpiTheme(theme.id);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("kpi_card_theme", theme.id);
                    }
                    setKpiThemeAnchor(null);
                  }}
                  sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}
                >
                  <Box sx={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: theme.swatch, border: "1px solid #CBD5E1" }} />
                  <Typography variant="body2" sx={{ fontWeight: kpiTheme === theme.id ? 800 : 500, fontSize: "13px" }}>
                    {theme.label}
                  </Typography>
                </MenuItem>
              ))}
            </Menu>

            {/* Notification Bell */}
            <IconButton color="inherit" onClick={(e) => setNotifAnchor(e.currentTarget)} size="small" sx={{ p: 0.75 }}>
              <Badge badgeContent={unreadNotifications} color="error">
                <NotificationsIcon sx={{ color: "#4B5563", fontSize: 22 }} />
              </Badge>
            </IconButton>

            <Menu
              anchorEl={notifAnchor}
              open={Boolean(notifAnchor)}
              onClose={() => setNotifAnchor(null)}
              slotProps={{ paper: { sx: { borderRadius: 3, width: 300, mt: 1 } } }}
            >
              <Box sx={{ p: 1.5, borderBottom: "1px solid #E5E7EB" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "13px" }}>Recent Alerts</Typography>
              </Box>
              <MenuItem onClick={() => setNotifAnchor(null)} sx={{ py: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "13px" }}>DMT Transfer Successful</Typography>
                  <Typography variant="caption" sx={{ color: "#6B7280", fontSize: "11px" }}>₹5,000 sent via IMPS · 2 mins ago</Typography>
                </Box>
              </MenuItem>
              <MenuItem onClick={() => setNotifAnchor(null)} sx={{ py: 1 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "13px" }}>AEPS Cash Withdrawal</Typography>
                  <Typography variant="caption" sx={{ color: "#6B7280", fontSize: "11px" }}>₹2,000 credited to wallet · 15 mins ago</Typography>
                </Box>
              </MenuItem>
            </Menu>

            {/* User Profile Avatar Icon (Clicking this opens the full Retailer Profile Card!) */}
            <Tooltip title="View Retailer Profile Info">
              <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} size="small" sx={{ p: 0.25 }}>
                <Avatar sx={{ bgcolor: "#1E3A8A", width: 36, height: 36, fontWeight: 800, fontSize: "0.85rem", boxShadow: "0 2px 6px rgba(30,58,138,0.25)" }}>
                  {outlet.ownerName.charAt(0)}
                </Avatar>
              </IconButton>
            </Tooltip>

            {/* ── RICH ENTERPRISE RETAILER PROFILE POPOVER ──────────────── */}
            <Popover
              open={Boolean(profileAnchor)}
              anchorEl={profileAnchor}
              onClose={() => setProfileAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{
                paper: {
                  sx: {
                    borderRadius: "20px",
                    width: 320,
                    mt: 1.5,
                    p: "20px",
                    boxShadow: "0 12px 36px rgba(0,0,0,0.12)",
                    border: "1px solid #E5E7EB",
                  },
                },
              }}
            >
              {/* Top Row: Avatar + Name & Badges */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: "#1E3A8A",
                    color: "#FFFFFF",
                    fontWeight: 800,
                    fontSize: "1.2rem",
                    boxShadow: "0 4px 12px rgba(30, 58, 138, 0.25)",
                    flexShrink: 0,
                  }}
                >
                  {outlet.ownerName.charAt(0)}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontSize: "15px", fontWeight: 800, color: "#111827", lineHeight: 1.2 }}>
                    {outlet.ownerName}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                    <Chip
                      icon={<WorkspacePremiumIcon sx={{ "&&": { color: "#D4AF37", fontSize: 13 } }} />}
                      label="Premium"
                      size="small"
                      sx={{
                        backgroundColor: "#FEF9C3",
                        color: "#854D0E",
                        fontWeight: 800,
                        fontSize: "0.65rem",
                        height: 20,
                        border: "1px solid #FDE047",
                      }}
                    />
                    <Chip
                      label="● Online"
                      size="small"
                      sx={{
                        backgroundColor: "#DCFCE7",
                        color: "#16A34A",
                        fontWeight: 800,
                        fontSize: "0.65rem",
                        height: 20,
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 1.5 }} />

              {/* Wallet Balance Display */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Wallet Balance
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="h5" sx={{ fontSize: "24px", fontWeight: 800, color: "#111827", fontFamily: "monospace", lineHeight: 1.1 }}>
                    ₹{wallet.mainBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </Typography>
                  <IconButton size="small" onClick={syncBalance} disabled={isSyncing} sx={{ p: 0.25 }}>
                    <RefreshIcon sx={{ fontSize: 16, color: "#2563EB", animation: isSyncing ? "spin 1s linear infinite" : "none" }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Details List */}
              <Stack spacing={1} sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>Retailer ID</Typography>
                  <Chip label={outlet.code} size="small" sx={{ backgroundColor: "#EFF6FF", color: "#2563EB", fontWeight: 800, height: 20, fontSize: "0.68rem" }} />
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>Merchant Outlet</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#111827", fontWeight: 700, textAlign: "right", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {outlet.name}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>KYC Status</Typography>
                  <Chip
                    icon={<ShieldIcon sx={{ "&&": { color: "#16A34A", fontSize: 12 } }} />}
                    label="KYC Verified"
                    size="small"
                    sx={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontWeight: 800, height: 20, fontSize: "0.68rem" }}
                  />
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>Location</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#374151", fontWeight: 600, textAlign: "right", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {outlet.location}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>Last Login</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#374151", fontWeight: 600 }}>
                    Today, 07:56 pm
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              {/* Action Buttons */}
              <Stack spacing={1}>
                <Button
                  component={Link}
                  href="/retailer/profile"
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<PersonIcon sx={{ fontSize: 18 }} />}
                  onClick={() => setProfileAnchor(null)}
                  sx={{ borderRadius: "10px", height: 36, fontWeight: 700, textTransform: "none", fontSize: "12px" }}
                >
                  View Full Profile
                </Button>
                <Button
                  fullWidth
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<LogoutIcon sx={{ fontSize: 18 }} />}
                  onClick={logout}
                  sx={{ borderRadius: "10px", height: 36, fontWeight: 700, textTransform: "none", fontSize: "12px" }}
                >
                  Logout Session
                </Button>
              </Stack>
            </Popover>

          </Stack>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawers */}
      <Box component="nav" sx={{ width: { lg: activeDrawerWidth }, flexShrink: { lg: 0 }, transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        {/* Mobile Temporary Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", lg: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: FULL_DRAWER_WIDTH, border: "none" },
          }}
        >
          {renderDrawerContent(false)}
        </Drawer>

        {/* Desktop Permanent Collapsible Drawer (260px / 72px) */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", lg: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: activeDrawerWidth,
              border: "none",
              transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              overflowX: "hidden",
            },
          }}
          open
        >
          {renderDrawerContent(desktopCollapsed)}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { xs: "100%", lg: `calc(100% - ${activeDrawerWidth}px)` },
          maxWidth: "100vw",
          overflowX: "hidden",
          mt: "56px",
          // On mobile, add bottom padding so content doesn't hide behind the bottom nav
          pb: { xs: "80px", md: 0 },
          minHeight: "calc(100vh - 56px)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Box sx={{ flex: 1, width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
          {children}
        </Box>

        {/* Enterprise Footer */}
        <Box
          component="footer"
          sx={{
            mt: 4,
            pt: 2.5,
            pb: 1.5,
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            color: "#6B7280",
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "12px" }}>
              © 2026 Pay2Pay FinTech Platform. All Rights Reserved.
            </Typography>
            <Chip label="v2.4.0-ENT" size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <ShieldIcon sx={{ fontSize: 14, color: "#16A34A" }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#111827", fontSize: "12px" }}>
                256-bit SSL
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
              <LockIcon sx={{ fontSize: 14, color: "#2563EB" }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#111827", fontSize: "12px" }}>
                NPCI & BBPS Certified
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Box>

    {/* ── Mobile Bottom Navigation (xs / sm only) ────────────────────────── */}
    <MobileBottomNav
      notificationCount={unreadNotifications}
      onFabClick={() => setQuickActionsOpen(true)}
    />

    {/* ── Mobile FAB + Quick Actions Sheet (xs / sm only) ─────────────────── */}
    <MobileQuickActionsFAB bottomOffset={36} />

    {/* ── Universal Search Dialog (Ctrl+K) ────────────────────────────────── */}
    <UniversalSearchDialog open={universalSearchOpen} onClose={() => setUniversalSearchOpen(false)} />
  </Box>
  );
};

export default RetailerLayout;

