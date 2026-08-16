"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NotificationCenter } from "@/app-shell/components/NotificationCenter";
import {
  AppBar, Toolbar, Drawer, Box, Typography, IconButton, Badge, Menu,
  MenuItem, Divider, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Button, Avatar, Chip, Tooltip, Stack, Paper, InputBase,
  Popover, TextField, InputAdornment, Dialog
} from "@mui/material";
import ClearIcon from "@mui/icons-material/Clear";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
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
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
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
import { useRetailerStore, KpiTheme, THEME_CONFIGS } from "@/stores/use-retailer-store";
import { useTheme } from "@/context/ThemeContext";

import { useRetailerApprovalGuard } from "@/hooks/useRetailerApprovalGuard";

import { MobileBottomNav } from "./mobile-bottom-nav";
import { MobileQuickActionsFAB } from "./mobile-quick-actions-fab";
import { UniversalSearchDialog } from "@/components/common/universal-search-dialog";
import { RightContextPanel } from "./right-context-panel";
import { UnapprovedRetailerFullPageModal } from "@/components/common/UnapprovedRetailerFullPageModal";
import { ApprovalGuardOverlay } from "@/components/common/ApprovalGuardOverlay";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";

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

let cachedHeaderWalletData: any = null;
let lastHeaderWalletFetchTime = 0;
let inFlightHeaderWalletPromise: Promise<any> | null = null;

async function getCachedHeaderWalletData(forceRefresh = false): Promise<any> {
  const now = Date.now();
  if (!forceRefresh && cachedHeaderWalletData && now - lastHeaderWalletFetchTime < 30000) {
    return cachedHeaderWalletData;
  }
  if (inFlightHeaderWalletPromise) {
    return inFlightHeaderWalletPromise;
  }

  inFlightHeaderWalletPromise = (async () => {
    try {
      let activeRetailerId = "";
      if (typeof window !== "undefined") {
        activeRetailerId = localStorage.getItem("p2p_active_retailer_id") || localStorage.getItem("pay2pay_reg_id") || "";
      }
      const queryParam = activeRetailerId ? `?retailer_id=${activeRetailerId}` : "";
      const res = await fetch(
        `/api/v1/payout/dashboard/retailer/header-wallet${queryParam}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cachedHeaderWalletData = data;
      lastHeaderWalletFetchTime = Date.now();
      return data;
    } finally {
      inFlightHeaderWalletPromise = null;
    }
  })();

  return inFlightHeaderWalletPromise;
}

export const RetailerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { themeMode, effectiveTheme, setThemeMode } = useTheme();
  const { outlet, wallet, isSyncing, syncBalance, soundboxEnabled, toggleSoundbox, unreadNotifications, setUnreadNotifications, kpiTheme, setKpiTheme } = useRetailerStore();
  const { isApproved, approvalStatus, isPathLocked, setApprovalStatus } = useRetailerApprovalGuard();
  const { openContactSupportModal } = useContactSupportModal();

  const [lockedModalItem, setLockedModalItem] = useState<{ label: string; path: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [kpiThemeAnchor, setKpiThemeAnchor] = useState<null | HTMLElement>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [universalSearchOpen, setUniversalSearchOpen] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);

  const [profileDetails, setProfileDetails] = useState<{
    owner_name?: string | null;
    retailer_name?: string | null;
    retailer_code?: string | null;
    approval_status?: string | null;
    kyc_status?: string | null;
    location?: string | null;
    last_login_at?: string | null;
    plan_name?: string | null;
    loading?: boolean;
    error?: boolean;
  }>({ loading: true });

  const hasInitializedRef = useRef(false);

  const fetchProfileDetails = useCallback(async (force = false) => {
    setProfileDetails((prev) => ({ ...prev, loading: true, error: false }));
    try {
      const data = await getCachedHeaderWalletData(force);
      const rInfo = data.retailer_info || data;
      if (rInfo.approval_status && typeof setApprovalStatus === "function") {
        setApprovalStatus(rInfo.approval_status as any);
      }
      setProfileDetails({
        owner_name: rInfo.owner_name || null,
        retailer_name: rInfo.retailer_name || rInfo.store_name || null,
        retailer_code: rInfo.retailer_code || null,
        approval_status: rInfo.approval_status || null,
        kyc_status: rInfo.kyc_status || null,
        location: rInfo.location || null,
        last_login_at: data.quick_stats?.last_login_at || data.last_login_at || null,
        plan_name: rInfo.plan_name || null,
        loading: false,
        error: false,
      });
    } catch (err) {
      console.warn("Profile details fetch error:", err);
      setProfileDetails({ loading: false, error: true });
    }
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
    }
  }, []);

  const formatLastLogin = (isoString?: string | null) => {
    if (!isoString) return "Not available";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "Not available";
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

      if (isToday) {
        return `Today, ${timeStr}`;
      }
      return `${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}, ${timeStr}`;
    } catch {
      return "Not available";
    }
  };

  // recent-activity auto-fetch REMOVED — was firing on every layout mount with no consumer.
  // Activity data is loaded on-demand from the dashboard page when the user requests it.

  useEffect(() => {
    try {
      const saved = localStorage.getItem("p2p_sidebar_favorites");
      if (saved) {
        setFavorites(JSON.parse(saved));
      } else {
        setFavorites(["/retailer-dashboard", "/retailer/dmt", "/retailer/wallet"]);
      }
    } catch {
      setFavorites(["/retailer-dashboard", "/retailer/dmt", "/retailer/wallet"]);
    }
  }, []);

  const toggleFavorite = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setFavorites((prev) => {
      const updated = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      try {
        localStorage.setItem("p2p_sidebar_favorites", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);



  const activeDrawerWidth = desktopCollapsed ? COLLAPSED_DRAWER_WIDTH : FULL_DRAWER_WIDTH;

  const navCategories = [
    {
      title: "MAIN",
      items: [{ label: "Dashboard", path: "/retailer/dashboard", icon: DashboardIcon }],
    },
    {
      title: "PAYMENTS",
      items: [
        { label: "DMT", path: "/retailer/dmt", icon: SendIcon },
        { label: "Card to Cash", path: "/retailer/card-to-cash", icon: CreditCardIcon },
        { label: "AEPS", path: "/retailer/aeps", icon: FingerprintIcon },
        { label: "UPI", path: "/retailer/upi", icon: QrCodeIcon },
        { label: "BBPS", path: "/retailer/bbps", icon: ReceiptIcon },
        { label: "Recharge", path: "/retailer/recharge", icon: PhoneAndroidIcon },
      ],
    },
    {
      title: "CUSTOMERS",
      items: [
        { label: "Customers", path: "/retailer/customers", icon: PersonIcon },
        { label: "Beneficiaries", path: "/retailer/beneficiaries", icon: ContactsIcon },
      ],
    },
    {
      title: "WALLET",
      items: [
        { label: "Wallet", path: "/retailer/wallet", icon: AccountBalanceWalletIcon },
        { label: "Wallet Top-up", path: "/retailer/wallet-topup", icon: AccountBalanceWalletIcon },
        { label: "Wallet Ledger", path: "/retailer/wallet-ledger", icon: ReceiptLongIcon },
      ],
    },
    {
      title: "REPORTS",
      items: [
        { label: "Transactions", path: "/retailer/reports/transactions", icon: AssessmentIcon },
        { label: "Payouts", path: "/retailer/reports/payouts", icon: ReceiptLongIcon },
        { label: "Tax", path: "/retailer/reports/tax", icon: AssessmentIcon },
        { label: "Settlement", path: "/retailer/reports/settlement", icon: PointOfSaleIcon },
      ],
    },
    {
      title: "ACCOUNT",
      items: [
        { label: "Profile", path: "/retailer/profile", icon: PersonIcon },
        { label: "Security", path: "/retailer/security", icon: ShieldIcon },
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

      {/* ── SEARCH MENU INPUT BAR ── */}
      {!isCollapsed && (
        <Box sx={{ px: 1.5, pb: 1, pt: 0.5 }}>
          <TextField
            fullWidth
            size="small"
            value={menuSearchQuery}
            onChange={(e) => setMenuSearchQuery(e.target.value)}
            placeholder="Search menu items..."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#60A5FA", fontSize: 16 }} />
                  </InputAdornment>
                ),
                endAdornment: menuSearchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setMenuSearchQuery("")} sx={{ p: 0.2, color: "rgba(255, 255, 255, 0.5)" }}>
                      <ClearIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  height: 34,
                  fontSize: "12px",
                  color: "#FFFFFF",
                  borderRadius: "8px",
                  bgcolor: "rgba(255, 255, 255, 0.05)",
                  "& fieldset": { borderColor: "rgba(255, 255, 255, 0.12)" },
                  "&:hover fieldset": { borderColor: "#3B82F6" },
                  "&.Mui-focused fieldset": { borderColor: "#2563EB" },
                },
              },
            }}
          />
        </Box>
      )}

      {/* Categorized Enterprise Dark Navigation List */}
      <Box
        sx={{
          flex: 1,
          py: 1,
          px: isCollapsed ? 1 : 1.5,
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {/* ── 1. FAVORITES CATEGORY ── */}
        {!menuSearchQuery && (() => {
          const allItems = navCategories.flatMap((cat) => cat.items);
          const favItems = allItems.filter((i) => favorites.includes(i.path));
          if (favItems.length === 0) return null;

          return (
            <Box sx={{ mb: 1.5 }}>
              {!isCollapsed && (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", px: "14px", mb: 0.5 }}>
                  <StarIcon sx={{ color: "#FFD54F", fontSize: 13 }} />
                  <Typography variant="caption" sx={{ color: "#FFD54F", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
                    FAVORITES
                  </Typography>
                </Stack>
              )}
              <Stack spacing={0.4}>
                {favItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = pathname === item.path || (item.path !== "/retailer-dashboard" && pathname?.startsWith(item.path));
                  const favLocked = isPathLocked(item.path);

                  return (
                    <Tooltip key={`fav-${item.path}`} title={favLocked ? "Locked: Account verification pending admin approval" : isCollapsed ? item.label : ""} placement="right" arrow>
                      <Box
                        component={Link}
                        href={item.path}
                        prefetch={false}
                        onClick={(e: React.MouseEvent) => {
                          if (favLocked) {
                            e.preventDefault();
                            e.stopPropagation();
                            setLockedModalItem({ label: item.label, path: item.path });
                            return;
                          }
                          setMobileOpen(false);
                        }}
                        sx={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          height: 44,
                          borderRadius: "10px",
                          px: isCollapsed ? 0 : "14px",
                          justifyContent: isCollapsed ? "center" : "space-between",
                          backgroundColor: isActive ? "#2563EB" : "rgba(255, 213, 79, 0.08)",
                          color: isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.90)",
                          textDecoration: "none",
                          boxShadow: isActive ? "0 4px 12px rgba(37, 99, 235, 0.35)" : "none",
                          transition: "all 0.15s ease",
                          "&:hover": { backgroundColor: isActive ? "#1D4ED8" : "rgba(255, 255, 255, 0.12)", color: "#FFFFFF" },
                          "&:hover .fav-star": { opacity: 1 },
                        }}
                      >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                          <IconComponent sx={{ fontSize: 20, color: isActive ? "#FFFFFF" : "#FFD54F" }} />
                          {!isCollapsed && (
                            <Typography sx={{ fontSize: "13.5px", fontWeight: isActive ? 700 : 600, lineHeight: "20px", whiteSpace: "nowrap", color: "#FFFFFF" }}>
                              {item.label}
                            </Typography>
                          )}
                        </Stack>

                        {!isCollapsed && (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                            {favLocked && (
                              <Chip
                                icon={<LockIcon sx={{ "&&": { fontSize: 10, color: "#F59E0B" } }} />}
                                label="LOCKED"
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "8.5px",
                                  fontWeight: 800,
                                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                                  color: "#F59E0B",
                                  border: "1px solid rgba(245, 158, 11, 0.3)",
                                }}
                              />
                            )}
                            <IconButton
                              size="small"
                              className="fav-star"
                              onClick={(e) => toggleFavorite(item.path, e)}
                              sx={{ p: 0.3, color: "#FFD54F" }}
                            >
                              <StarIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Stack>
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Stack>
            </Box>
          );
        })()}

        {/* ── 2. CATEGORIZED MENU LIST ── */}
        {navCategories
          .map((cat) => ({
            ...cat,
            items: cat.items.filter(
              (item) =>
                item.label.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
                cat.title.toLowerCase().includes(menuSearchQuery.toLowerCase())
            ),
          }))
          .filter((cat) => cat.items.length > 0)
          .map((cat) => (
            <Box key={cat.title} sx={{ mb: 1.5 }}>
              {!isCollapsed && (
                <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", px: "14px", display: "block", mb: 0.5 }}>
                  {cat.title}
                </Typography>
              )}
              <Stack spacing={0.4}>
                {cat.items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = pathname === item.path || (item.path !== "/retailer-dashboard" && pathname?.startsWith(item.path));
                  const isFav = favorites.includes(item.path);
                  const itemLocked = isPathLocked(item.path);

                  return (
                    <Tooltip
                      key={item.path}
                      title={itemLocked ? "Locked: Account verification pending admin approval" : isCollapsed ? item.label : ""}
                      placement="right"
                      arrow
                    >
                      <Box
                        component={Link}
                        href={item.path}
                        prefetch={false}
                        onClick={(e: React.MouseEvent) => {
                          if (itemLocked) {
                            e.preventDefault();
                            e.stopPropagation();
                            setLockedModalItem({ label: item.label, path: item.path });
                            return;
                          }
                          setMobileOpen(false);
                        }}
                        sx={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          height: 44,
                          borderRadius: "10px",
                          px: isCollapsed ? 0 : "14px",
                          justifyContent: isCollapsed ? "center" : "space-between",
                          backgroundColor: isActive ? "rgba(37, 99, 235, 0.35)" : "transparent",
                          color: isActive ? "#FFFFFF" : itemLocked ? "rgba(255, 255, 255, 0.50)" : "rgba(255, 255, 255, 0.90)",
                          textDecoration: "none",
                          boxShadow: isActive ? "0 4px 12px rgba(37, 99, 235, 0.35)" : "none",
                          transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&::before": isActive
                            ? {
                                content: '""',
                                position: "absolute",
                                left: 0,
                                top: "6px",
                                bottom: "6px",
                                width: "3px",
                                borderRadius: "2px",
                                backgroundColor: "#2563EB",
                              }
                            : {},
                          "&:hover": {
                            backgroundColor: isActive ? "rgba(37, 99, 235, 0.45)" : "rgba(255, 255, 255, 0.08)",
                            color: "#FFFFFF",
                          },
                          "&:hover .fav-star": { opacity: 1 },
                        }}
                      >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                          <IconComponent sx={{ fontSize: 20, color: isActive ? "#60A5FA" : itemLocked ? "#F59E0B" : "rgba(255, 255, 255, 0.88)" }} />
                          {!isCollapsed && (
                            <Typography sx={{ fontSize: "13.5px", fontWeight: isActive ? 700 : 500, lineHeight: "20px", whiteSpace: "nowrap", color: isActive ? "#FFFFFF" : itemLocked ? "rgba(255, 255, 255, 0.60)" : "rgba(255, 255, 255, 0.90)" }}>
                              {item.label}
                            </Typography>
                          )}
                        </Stack>

                        {!isCollapsed && (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                            {itemLocked && (
                              <Chip
                                icon={<LockIcon sx={{ "&&": { fontSize: 10, color: "#F59E0B" } }} />}
                                label="LOCKED"
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "8.5px",
                                  fontWeight: 800,
                                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                                  color: "#F59E0B",
                                  border: "1px solid rgba(245, 158, 11, 0.3)",
                                }}
                              />
                            )}

                            {(item as any).badge && !itemLocked && (
                              <Chip
                                label={(item as any).badge}

                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "9px",
                                  fontWeight: 800,
                                  backgroundColor: isActive ? "#2563EB" : "rgba(255,255,255,0.12)",
                                  color: "#FFFFFF",
                                }}
                              />
                            )}

                            <IconButton
                              size="small"
                              className="fav-star"
                              onClick={(e) => toggleFavorite(item.path, e)}
                              sx={{
                                p: 0.3,
                                color: isFav ? "#FFD54F" : "rgba(255, 255, 255, 0.4)",
                                opacity: isFav ? 1 : 0.3,
                                "&:hover": { opacity: 1, color: "#FFD54F" },
                              }}
                            >
                              {isFav ? <StarIcon sx={{ fontSize: 16 }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
                            </IconButton>
                          </Stack>
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

  const activeTheme = THEME_CONFIGS[kpiTheme] || THEME_CONFIGS["classic-blue"];

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: activeTheme.pageBg,
        color: activeTheme.textColor,
        transition: "background-color 0.3s ease",
      }}
    >
      {/* ── Sticky Header (Height: 56px Exact) ── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          height: 56,
          width: { lg: `calc(100% - ${activeDrawerWidth}px)` },
          ml: { lg: `${activeDrawerWidth}px` },
          backgroundColor: activeTheme.headerBg,
          backdropFilter: "blur(20px)",
          color: activeTheme.headerText,
          borderBottom: `1px solid ${activeTheme.cardBorder}`,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          justifyContent: "center",
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), margin 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease",
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
                sx={{ p: 0.75, color: "#60A5FA" }}
              >
                {desktopCollapsed ? <MenuOpenIcon sx={{ fontSize: 24 }} /> : <MenuIcon sx={{ fontSize: 24 }} />}
              </IconButton>
            </Tooltip>

            {/* Page Title */}
            <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#FFFFFF" }}>
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
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                cursor: "pointer",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.08)", borderColor: "rgba(255, 255, 255, 0.25)" },
              }}
            >
              <SearchIcon sx={{ color: "#60A5FA", fontSize: 18, mr: 0.75 }} />
              <Typography variant="caption" sx={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.70)", flex: 1, fontWeight: 700 }}>
                Universal Search...
              </Typography>
              <Chip label="Ctrl+K" size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 800, bgcolor: "rgba(255, 255, 255, 0.12)", color: "#FFFFFF" }} />
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

            {/* Prominent Wallet Balance Card Pill */}
            <Paper
              elevation={0}
              sx={{
                px: { xs: 1.4, sm: 2 },
                py: 0.6,
                borderRadius: "14px",
                bgcolor: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                display: "flex",
                alignItems: "center",
                gap: { xs: 1, sm: 1.5 },
                flexShrink: 0,
                height: { xs: 44, sm: 46 },
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  bgcolor: "rgba(30, 58, 138, 0.35)",
                  borderColor: "rgba(96, 165, 250, 0.7)",
                  boxShadow: "0 6px 20px rgba(37, 99, 235, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Tooltip title="Wallet Details & Top-Up" arrow placement="bottom">
                <Box
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.location.href = "/retailer/wallet";
                    }
                  }}

                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1, sm: 1.5 },
                    cursor: "pointer",
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "10px",
                      bgcolor: "rgba(37, 99, 235, 0.25)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AccountBalanceWalletIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
                  </Box>

                  <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#94A3B8",
                        fontWeight: 800,
                        fontSize: "11px",
                        letterSpacing: "0.5px",
                        lineHeight: 1,
                        textTransform: "uppercase",
                        display: { xs: "none", sm: "block" },
                      }}
                    >
                      MAIN WALLET
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 900,
                        color: "#4ADE80",
                        fontSize: { xs: "15px", sm: "17px" },
                        lineHeight: 1.15,
                        letterSpacing: "-0.2px",
                        textShadow: "0 0 12px rgba(74, 222, 128, 0.25)",
                      }}
                    >
                      ₹{(wallet?.mainBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Box>
              </Tooltip>

              <Tooltip title="Refresh Balance" arrow placement="bottom">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    syncBalance();
                  }}
                  disabled={isSyncing}
                  sx={{
                    p: 0.5,
                    ml: 0.5,
                    color: "#94A3B8",
                    borderRadius: "8px",
                    "&:hover": {
                      color: "#FFFFFF",
                      bgcolor: "rgba(255, 255, 255, 0.15)",
                    },
                  }}
                >
                  <RefreshIcon
                    sx={{
                      fontSize: 18,
                      color: "#60A5FA",
                      animation: isSyncing ? "spin 1s linear infinite" : "none",
                    }}
                  />
                </IconButton>
              </Tooltip>
            </Paper>

            {/* Header Theme Quick Switch Control */}
            <Tooltip title="Theme (Auto / Light / Dark)">
              <IconButton
                color="inherit"
                onClick={(e) => setKpiThemeAnchor(e.currentTarget)}
                size="small"
                sx={{ p: 0.75, color: effectiveTheme === "dark" ? "#94A3B8" : "#4B5563" }}
              >
                <PaletteIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={kpiThemeAnchor}
              open={Boolean(kpiThemeAnchor)}
              onClose={() => setKpiThemeAnchor(null)}
              slotProps={{
                paper: {
                  sx: {
                    borderRadius: "10px",
                    width: 180,
                    mt: 1,
                    p: 0.5,
                    bgcolor: effectiveTheme === "dark" ? "#0F172A" : "#FFFFFF",
                    color: effectiveTheme === "dark" ? "#F8FAFC" : "#0F172A",
                    border: effectiveTheme === "dark" ? "1px solid #1E293B" : "1px solid #E2E8F0",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                  },
                },
              }}
            >
              <Box sx={{ p: 1, px: 1.5, borderBottom: effectiveTheme === "dark" ? "1px solid #1E293B" : "1px solid #F1F5F9" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "12px", color: effectiveTheme === "dark" ? "#F8FAFC" : "#0F172A" }}>
                  Theme
                </Typography>
              </Box>

              {[
                { mode: "AUTO", label: "Auto", desc: "Follows your local day/night schedule" },
                { mode: "LIGHT", label: "Light", desc: "Always use light mode" },
                { mode: "DARK", label: "Dark", desc: "Always use dark mode" },
              ].map((item) => {
                const isSelected = themeMode === item.mode;
                return (
                  <MenuItem
                    key={item.mode}
                    onClick={() => {
                      setThemeMode(item.mode as any);
                      setKpiThemeAnchor(null);
                    }}
                    sx={{
                      py: 1,
                      px: 1.5,
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: isSelected ? 700 : 400,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      bgcolor: isSelected
                        ? effectiveTheme === "dark"
                          ? "rgba(59, 130, 246, 0.15)"
                          : "rgba(37, 99, 235, 0.08)"
                        : "transparent",
                      color: isSelected
                        ? effectiveTheme === "dark"
                          ? "#60A5FA"
                          : "#2563EB"
                        : effectiveTheme === "dark"
                        ? "#CBD5E1"
                        : "#334155",
                      "&:hover": {
                        bgcolor: effectiveTheme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: isSelected ? 800 : 500, fontSize: "13px" }}>
                      {isSelected ? `✓ ${item.label}` : `   ${item.label}`}
                    </Typography>
                  </MenuItem>
                );
              })}
            </Menu>


            {/* Dynamic DB-Backed Notification Center */}
            <NotificationCenter />

            {/* User Profile Avatar Icon (Clicking this opens the full Retailer Profile Card!) */}
            <Tooltip title="View Retailer Profile Info">
              <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} size="small" sx={{ p: 0.25 }}>
                <Avatar sx={{ bgcolor: "#1E3A8A", width: 36, height: 36, fontWeight: 800, fontSize: "0.85rem", boxShadow: "0 2px 6px rgba(30,58,138,0.25)" }}>
                  {(profileDetails.owner_name || outlet.ownerName || "R").charAt(0).toUpperCase()}
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
                    width: 330,
                    mt: 1.5,
                    p: "20px",
                    bgcolor: effectiveTheme === "dark" ? "#111B2B" : "#FFFFFF",
                    color: effectiveTheme === "dark" ? "#F8FAFC" : "#0F172A",
                    boxShadow: effectiveTheme === "dark" ? "0 16px 48px rgba(0,0,0,0.5)" : "0 12px 36px rgba(0,0,0,0.12)",
                    border: effectiveTheme === "dark" ? "1px solid rgba(148, 163, 184, 0.2)" : "1px solid rgba(15, 23, 42, 0.12)",
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
                    boxShadow: "0 4px 12px rgba(30, 58, 138, 0.3)",
                    flexShrink: 0,
                  }}
                >
                  {(profileDetails.owner_name || outlet.ownerName || user?.full_name || "R").charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontSize: "16px", fontWeight: 800, color: effectiveTheme === "dark" ? "#F8FAFC" : "#0F172A", lineHeight: 1.2 }}>
                    {profileDetails.owner_name || outlet.ownerName || user?.full_name || "Retailer Agent"}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                    {profileDetails.plan_name && (
                      <Chip
                        icon={<WorkspacePremiumIcon sx={{ "&&": { color: "#D4AF37", fontSize: 13 } }} />}
                        label={profileDetails.plan_name}
                        size="small"
                        sx={{
                          backgroundColor: effectiveTheme === "dark" ? "rgba(234, 179, 8, 0.15)" : "#FEF9C3",
                          color: effectiveTheme === "dark" ? "#FACC15" : "#854D0E",
                          fontWeight: 800,
                          fontSize: "0.65rem",
                          height: 20,
                          border: effectiveTheme === "dark" ? "1px solid rgba(250, 204, 21, 0.3)" : "1px solid #FDE047",
                        }}
                      />
                    )}
                    <Chip
                      label="● Active Session"
                      size="small"
                      sx={{
                        backgroundColor: effectiveTheme === "dark" ? "rgba(34, 197, 94, 0.15)" : "#DCFCE7",
                        color: effectiveTheme === "dark" ? "#4ADE80" : "#16A34A",
                        border: effectiveTheme === "dark" ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid #BBF7D0",
                        fontWeight: 800,
                        fontSize: "0.65rem",
                        height: 20,
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 1.5, borderColor: effectiveTheme === "dark" ? "rgba(148, 163, 184, 0.2)" : "rgba(15, 23, 42, 0.12)" }} />

              {/* Wallet Balance Display */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: effectiveTheme === "dark" ? "#94A3B8" : "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  WALLET BALANCE
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="h5" sx={{ fontSize: "22px", fontWeight: 800, color: effectiveTheme === "dark" ? "#FFFFFF" : "#0F172A", fontFamily: "monospace", lineHeight: 1.1 }}>
                    ₹{(wallet?.mainBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <IconButton size="small" onClick={syncBalance} disabled={isSyncing} sx={{ p: 0.25 }}>
                    <RefreshIcon sx={{ fontSize: 16, color: effectiveTheme === "dark" ? "#60A5FA" : "#2563EB", animation: isSyncing ? "spin 1s linear infinite" : "none" }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Details List */}
              <Stack spacing={1} sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: effectiveTheme === "dark" ? "#94A3B8" : "#64748B", fontWeight: 600 }}>Retailer ID</Typography>
                  <Chip
                    label={profileDetails.retailer_code || outlet.code || "RET-0CFE2B"}
                    size="small"
                    sx={{
                      backgroundColor: effectiveTheme === "dark" ? "rgba(59, 130, 246, 0.15)" : "#EFF6FF",
                      color: effectiveTheme === "dark" ? "#60A5FA" : "#2563EB",
                      border: effectiveTheme === "dark" ? "1px solid rgba(96, 165, 250, 0.3)" : "1px solid #BFDBFE",
                      fontWeight: 800,
                      height: 20,
                      fontSize: "0.68rem",
                    }}
                  />
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: effectiveTheme === "dark" ? "#94A3B8" : "#64748B", fontWeight: 600 }}>Merchant Outlet</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: effectiveTheme === "dark" ? "#F8FAFC" : "#0F172A", fontWeight: 700, textAlign: "right", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {profileDetails.retailer_name || outlet.name || "Pay2Pay Verified Merchant"}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: effectiveTheme === "dark" ? "#94A3B8" : "#64748B", fontWeight: 600 }}>Account Approval</Typography>
                  {(() => {
                    const isAppr = profileDetails.approval_status === "ACTIVE" || profileDetails.approval_status === "APPROVED" || isApproved;
                    return (
                      <Chip
                        icon={isAppr ? <ShieldIcon sx={{ "&&": { color: effectiveTheme === "dark" ? "#4ADE80" : "#16A34A", fontSize: 12 } }} /> : <LockIcon sx={{ "&&": { color: effectiveTheme === "dark" ? "#FBBF24" : "#D97706", fontSize: 12 } }} />}
                        label={profileDetails.approval_status ? (isAppr ? "Approved & Active" : profileDetails.approval_status) : (isApproved ? "Approved & Active" : "Pending Admin Review")}
                        size="small"
                        sx={{
                          backgroundColor: isAppr ? (effectiveTheme === "dark" ? "rgba(34, 197, 94, 0.15)" : "#DCFCE7") : (effectiveTheme === "dark" ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7"),
                          color: isAppr ? (effectiveTheme === "dark" ? "#4ADE80" : "#16A34A") : (effectiveTheme === "dark" ? "#FBBF24" : "#D97706"),
                          border: isAppr ? (effectiveTheme === "dark" ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid #BBF7D0") : (effectiveTheme === "dark" ? "1px solid rgba(251, 191, 36, 0.3)" : "1px solid #FDE68A"),
                          fontWeight: 800,
                          height: 22,
                          fontSize: "0.68rem",
                        }}
                      />
                    );
                  })()}
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: effectiveTheme === "dark" ? "#94A3B8" : "#64748B", fontWeight: 600 }}>KYC Status</Typography>
                  {(() => {
                    const isKyc = profileDetails.kyc_status === "VERIFIED" || (isApproved && profileDetails.kyc_status !== "PENDING");
                    return (
                      <Chip
                        icon={<ShieldIcon sx={{ "&&": { color: isKyc ? (effectiveTheme === "dark" ? "#4ADE80" : "#16A34A") : (effectiveTheme === "dark" ? "#FBBF24" : "#D97706"), fontSize: 12 } }} />}
                        label={profileDetails.kyc_status ? (profileDetails.kyc_status === "VERIFIED" ? "KYC Verified" : profileDetails.kyc_status) : (isApproved ? "KYC Verified" : "Pending Review")}
                        size="small"
                        sx={{
                          backgroundColor: isKyc ? (effectiveTheme === "dark" ? "rgba(34, 197, 94, 0.15)" : "#DCFCE7") : (effectiveTheme === "dark" ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7"),
                          color: isKyc ? (effectiveTheme === "dark" ? "#4ADE80" : "#16A34A") : (effectiveTheme === "dark" ? "#FBBF24" : "#D97706"),
                          border: isKyc ? (effectiveTheme === "dark" ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid #BBF7D0") : (effectiveTheme === "dark" ? "1px solid rgba(251, 191, 36, 0.3)" : "1px solid #FDE68A"),
                          fontWeight: 800,
                          height: 20,
                          fontSize: "0.68rem",
                        }}
                      />
                    );
                  })()}
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: effectiveTheme === "dark" ? "#94A3B8" : "#64748B", fontWeight: 600 }}>Location</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: effectiveTheme === "dark" ? "#F8FAFC" : "#0F172A", fontWeight: 600, textAlign: "right", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {profileDetails.location || outlet.location || "Chennai, TN"}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: effectiveTheme === "dark" ? "#94A3B8" : "#64748B", fontWeight: 600 }}>Last Login</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: effectiveTheme === "dark" ? "#94A3B8" : "#64748B", fontWeight: 600 }}>
                    {formatLastLogin(profileDetails.last_login_at)}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5, borderColor: effectiveTheme === "dark" ? "rgba(148, 163, 184, 0.2)" : "rgba(15, 23, 42, 0.12)" }} />

              {/* Action Buttons */}
              <Stack spacing={1}>
                <Button
                  component={Link}
                  href="/retailer/profile"
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<PersonIcon sx={{ fontSize: 18, color: effectiveTheme === "dark" ? "#60A5FA" : "#2563EB" }} />}
                  onClick={() => setProfileAnchor(null)}
                  sx={{
                    borderRadius: "10px",
                    height: 36,
                    fontWeight: 700,
                    textTransform: "none",
                    fontSize: "12px",
                    borderColor: effectiveTheme === "dark" ? "rgba(59, 130, 246, 0.5)" : "#3B82F6",
                    color: effectiveTheme === "dark" ? "#60A5FA" : "#2563EB",
                    "&:hover": {
                      borderColor: "#3B82F6",
                      backgroundColor: effectiveTheme === "dark" ? "rgba(59, 130, 246, 0.12)" : "#EFF6FF",
                    },
                  }}
                >
                  View Full Profile
                </Button>
                <Button
                  fullWidth
                  size="small"
                  variant="contained"
                  startIcon={<LogoutIcon sx={{ fontSize: 18, color: "#FFFFFF" }} />}
                  onClick={logout}
                  sx={{
                    borderRadius: "10px",
                    height: 36,
                    fontWeight: 700,
                    textTransform: "none",
                    fontSize: "12px",
                    backgroundColor: "#DC2626",
                    color: "#FFFFFF",
                    "&:hover": {
                      backgroundColor: "#B91C1C",
                    },
                  }}
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
          p: pathname === "/retailer/dmt" ? 0 : { xs: 2, sm: 3 },
          width: { xs: "100%", lg: `calc(100% - ${activeDrawerWidth}px)` },
          maxWidth: "100vw",
          overflowX: "hidden",
          overflowY: pathname === "/retailer/dmt" ? "hidden" : "auto",
          mt: "56px",
          pb: pathname === "/retailer/dmt" ? 0 : { xs: "80px", md: 0 },
          minHeight: "calc(100vh - 56px)",
          maxHeight: pathname === "/retailer/dmt" ? "calc(100vh - 56px)" : "none",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Box sx={{ flex: 1, width: "100%", maxWidth: "100%", overflow: pathname === "/retailer/dmt" ? "hidden" : "visible" }}>
          {/* Account Verification Warning Banner for Unapproved Retailer */}
          {!isApproved && (
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 2,
                borderRadius: "16px",
                background: "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.10) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 2,
                boxShadow: "0 6px 20px rgba(245, 158, 11, 0.12)",
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box sx={{ p: 1, borderRadius: "12px", bgcolor: "rgba(245, 158, 11, 0.2)", color: "#FBBF24" }}>
                  <LockIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "12px", fontWeight: 500 }}>
                    Your retailer account (Mobile: <strong>{outlet.mobile ? `+91 ${outlet.mobile.replace(/\D/g, "")}` : "your registered mobile"}</strong>) is currently <strong>PENDING ADMIN APPROVAL</strong>. All financial services (DMT, Card to Cash, AEPS, UPI, BBPS, Recharge, Wallet Top-Up) are restricted until Admin approves your application.
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                <Button
                  component={Link}
                  href="/register/submitted"
                  size="small"
                  variant="contained"
                  sx={{ bgcolor: "#F59E0B", color: "#000", fontWeight: 800, textTransform: "none", fontSize: "12px", "&:hover": { bgcolor: "#D97706" } }}
                >
                  Check KYC Status
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => openContactSupportModal()}
                  sx={{ borderColor: "rgba(255,255,255,0.3)", color: "#FFFFFF", fontWeight: 800, textTransform: "none", fontSize: "12px", "&:hover": { borderColor: "#FFFFFF", bgcolor: "rgba(255,255,255,0.1)" } }}
                >
                  Contact Admin Support
                </Button>
              </Stack>
            </Paper>
          )}

          {/* HARD LOCKED ROUTE ENFORCEMENT: Block page content if unapproved & path is locked */}
          {isPathLocked(pathname) ? (
            <ApprovalGuardOverlay featureName={activeMenuItem?.label || "Financial Service"}>
              <Box sx={{ p: 4, textAlign: "center", color: "#94A3B8" }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Service Restricted</Typography>
              </Box>
            </ApprovalGuardOverlay>
          ) : (
            children
          )}
        </Box>

        {/* Enterprise Footer (Hidden on DMT Workspace to prevent height overflow) */}
        {pathname !== "/retailer/dmt" && (
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
        )}
      </Box>

    {/* ── Mobile Bottom Navigation (xs / sm only) ────────────────────────── */}
    <MobileBottomNav
      notificationCount={unreadNotifications}
      onFabClick={() => setQuickActionsOpen(true)}
    />

    {/* ── Mobile FAB + Quick Actions Sheet (xs / sm only) ─────────────────── */}
    <MobileQuickActionsFAB bottomOffset={36} />

    {/* ── Locked Feature Dialog Modal ────────────────────────────────────────── */}
    <Dialog
      open={Boolean(lockedModalItem)}
      onClose={() => setLockedModalItem(null)}
      slotProps={{
        paper: {
          sx: {
            borderRadius: "24px",
            bgcolor: "#0F172A",
            color: "#FFFFFF",
            p: 3.5,
            maxWidth: 440,
            width: "100%",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
          },
        },
      }}
    >
      <Box sx={{ textCenter: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Box sx={{ w: 14, h: 14, p: 1.5, borderRadius: "50%", bgcolor: "rgba(245, 158, 11, 0.15)", border: "2px solid rgba(245, 158, 11, 0.4)", color: "#FBBF24", mb: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LockIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 900, color: "#FFFFFF", textAlign: "center" }}>
          {lockedModalItem?.label || "Feature"} Restricted
        </Typography>
        <Typography variant="body2" sx={{ color: "#CBD5E1", mt: 1.5, textAlign: "center", fontSize: "13px", lineHeight: 1.5 }}>
          Your retailer account (Mobile: <strong>{outlet.mobile ? `+91 ${outlet.mobile.replace(/\D/g, "")}` : "your registered mobile"}</strong>) is currently <strong>PENDING ADMIN APPROVAL</strong>. All financial services, wallet top-ups, and transaction tools remain locked until Admin completes verification.
        </Typography>

        <Stack spacing={1.5} sx={{ mt: 3, width: "100%" }}>
          <Button
            component={Link}
            href="/register/submitted"
            onClick={() => setLockedModalItem(null)}
            variant="contained"
            fullWidth
            sx={{ bgcolor: "#2563EB", color: "#FFF", fontWeight: 800, borderRadius: "12px", height: 44, textTransform: "none", fontSize: "13px" }}
          >
            Check Application & KYC Status
          </Button>
          <Button
            onClick={() => {
              setLockedModalItem(null);
              openContactSupportModal();
            }}
            variant="outlined"
            fullWidth
            sx={{ borderColor: "#3B82F6", color: "#60A5FA", fontWeight: 800, borderRadius: "12px", height: 44, textTransform: "none", fontSize: "13px", "&:hover": { bgcolor: "rgba(59, 130, 246, 0.1)" } }}
          >
            Contact Admin Support
          </Button>
          <Button
            onClick={() => setLockedModalItem(null)}
            variant="text"
            fullWidth
            sx={{ color: "#94A3B8", fontWeight: 700, borderRadius: "12px", height: 38, textTransform: "none", fontSize: "13px" }}
          >
            Close Window
          </Button>
        </Stack>
      </Box>
    </Dialog>

    {/* ── Universal Search Dialog (Ctrl+K) ────────────────────────────────── */}
    <UniversalSearchDialog open={universalSearchOpen} onClose={() => setUniversalSearchOpen(false)} />
  </Box>
  );
};

export default RetailerLayout;

