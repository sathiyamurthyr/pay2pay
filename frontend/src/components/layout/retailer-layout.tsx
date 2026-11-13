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
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddCardIcon from "@mui/icons-material/AddCard";
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
import apiClient from "@/lib/api";
import { useRetailerStore, KpiTheme, THEME_CONFIGS } from "@/stores/use-retailer-store";
import { useTheme } from "@/context/ThemeContext";
import { retailerApi } from "@/services/retailer-api";

import { useRetailerApprovalGuard } from "@/hooks/useRetailerApprovalGuard";
import { useSessionSecurity } from "@/context/SessionSecurityProvider";

import { MobileBottomNav } from "./mobile-bottom-nav";
import { MobileQuickActionsFAB } from "./mobile-quick-actions-fab";
import { UniversalSearchDialog } from "@/components/common/universal-search-dialog";
import { RightContextPanel } from "./right-context-panel";
import { ApprovalGuardOverlay } from "@/components/common/ApprovalGuardOverlay";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";

const FULL_DRAWER_WIDTH = 310;
const COLLAPSED_DRAWER_WIDTH = 72;

const KPI_THEMES: { id: KpiTheme; label: string; swatch: string }[] = [
  { id: "classic-blue", label: "Classic Blue", swatch: "#2563EB" },
  { id: "royal-gold", label: "Royal Gold", swatch: "#FFD54F" },
  { id: "emerald-green", label: "Emerald Green", swatch: "#16A34A" },
  { id: "purple", label: "Purple Velvet", swatch: "#7C3AED" },
  { id: "dark", label: "Dark Onyx", swatch: "#FFFFFF" },
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
      // Call /header-wallet with NO query params.
      // The backend resolves the authenticated retailer from the JWT cookie or Authorization header.
      // Zero localStorage reads — identity comes from the server session only.
      const res = await apiClient.get(`/api/v1/payout/dashboard/retailer/header-wallet`);
      const data = res.data;
      cachedHeaderWalletData = data;
      lastHeaderWalletFetchTime = Date.now();

      // Sync into useRetailerStore in-memory state ONLY — NO localStorage write
      const bal = typeof data.wallet_balance === "number" ? data.wallet_balance : (data.wallet?.main_balance ?? 0.0);
      const avail = typeof data.available_balance === "number" ? data.available_balance : bal;
      const rInfo = data.retailer_info || data;
      const retCode = data.retailer_code || data.retailer_id || rInfo.retailer_code || rInfo.retailer_id || "";
      const photoUrl = data.photo_url || data.avatar_url || rInfo.photo_url || rInfo.avatar_url || "";

      useRetailerStore.getState().updateWallet({
        mainBalance: bal,
        availableBalance: avail,
        commissionBalance: data.todays_commission || 0.0,
        todayMargin: data.todays_commission || 0.0,
        todaySettlement: data.settlement_pending_amount || 0.0,
      });
      useRetailerStore.getState().updateOutlet({
        code: retCode || useRetailerStore.getState().outlet.code,
        name: rInfo.company_name || rInfo.retailer_name || data.retailer_name || useRetailerStore.getState().outlet.name,
        ownerName: rInfo.owner_name || data.owner_name || useRetailerStore.getState().outlet.ownerName,
        avatar: photoUrl || useRetailerStore.getState().outlet.avatar,
        photo_url: photoUrl || useRetailerStore.getState().outlet.photo_url,
        status: (rInfo.status || data.status || (rInfo.approval_status === "ACTIVE" ? "ACTIVE" : undefined)) || useRetailerStore.getState().outlet.status,
        kycStatus: (rInfo.kyc_status || data.kyc_status) || useRetailerStore.getState().outlet.kycStatus,
        approvalStatus: (rInfo.approval_status || data.approval_status || (rInfo.approve_status ? "APPROVED" : undefined)) || useRetailerStore.getState().outlet.approvalStatus,
        location: rInfo.location || data.location || useRetailerStore.getState().outlet.location,
      });

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
  const { lockSession } = useSessionSecurity();

  // ── P0 Session Security Check ──────────────────────────────
  const checkSessionToken = useCallback(() => {
    if (typeof document === "undefined") return false;
    const cookies = document.cookie.split("; ");
    const tokenCookie = cookies.find((row) =>
      row.startsWith("p2p_access_token=") ||
      row.startsWith("pay2pay_access_token=") ||
      row.startsWith("pay2pay_auth_token=") ||
      row.startsWith("p2p_sales_token=") ||
      row.startsWith("pay2pay_sales_token=") ||
      row.startsWith("access_token=") ||
      row.startsWith("token=")
    );
    if (tokenCookie && tokenCookie.split("=")[1]?.trim().length > 10) {
      return true;
    }
    if (typeof localStorage !== "undefined") {
      const lsToken =
        localStorage.getItem("p2p_access_token") ||
        localStorage.getItem("pay2pay_access_token") ||
        localStorage.getItem("pay2pay_auth_token") ||
        localStorage.getItem("p2p_sales_token") ||
        localStorage.getItem("pay2pay_sales_token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");
      if (lsToken && lsToken.trim().length > 10) return true;
    }
    return Boolean(user);
  }, [user]);

  const [isAuthenticatedSession, setIsAuthenticatedSession] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return checkSessionToken();
  });

  const verifyAndEnforceSession = useCallback(() => {
    if (typeof window === "undefined") return;
    const isValid = checkSessionToken();
    if (!isValid) {
      setIsAuthenticatedSession(false);
      const isAuthPage =
        pathname.includes("/login") ||
        pathname.includes("/register") ||
        pathname.includes("/reset-password");
      if (!isAuthPage) {
        // Double check cookies before redirecting to avoid false positives on reload
        const cks = typeof document !== "undefined" ? document.cookie : "";
        if (
          !cks.includes("p2p_access_token=") &&
          !cks.includes("pay2pay_access_token=") &&
          !cks.includes("pay2pay_auth_token=") &&
          !cks.includes("access_token=")
        ) {
          window.location.replace(`/retailer/login?redirect=${encodeURIComponent(pathname)}`);
        }
      }
    } else {
      setIsAuthenticatedSession(true);
    }
  }, [pathname, checkSessionToken]);

  useEffect(() => {
    verifyAndEnforceSession();
    // Intentionally NO window 'focus' or 'pageshow' listener to prevent aggressive auto-refresh/logout
  }, [verifyAndEnforceSession]);

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
    photo_url?: string | null;
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
      const resolvedCode = rInfo.retailer_code || data.retailer_code || rInfo.retailer_id || data.retailer_id || outlet.code || "";
      const photoUrl = rInfo.photo_url || rInfo.avatar_url || data.photo_url || data.avatar_url || outlet.avatar || outlet.photo_url || "";

      setProfileDetails((prev) => ({
        ...prev,
        owner_name: rInfo.owner_name || data.owner_name || outlet.ownerName || "",
        retailer_name: rInfo.company_name || rInfo.retailer_name || data.company_name || data.retailer_name || outlet.name || "",
        retailer_code: resolvedCode,
        photo_url: photoUrl,
        approval_status: rInfo.approval_status || data.approval_status || (rInfo.approve_status ? "ACTIVE" : "") || outlet.approvalStatus || "",
        kyc_status: rInfo.kyc_status || data.kyc_status || outlet.kycStatus || "",
        location: rInfo.location || data.location || outlet.location || "",
        last_login_at: data.quick_stats?.last_login_at || data.last_login_at || null,
        plan_name: rInfo.plan_name || data.plan_name || "",
        loading: false,
        error: false,
      }));
    } catch (err) {
      console.warn("Profile details fetch error:", err);
      setProfileDetails((prev) => ({ ...prev, loading: false, error: true }));
    }
  }, [setApprovalStatus, outlet.code, outlet.avatar, outlet.photo_url, outlet.ownerName, outlet.name, outlet.location, outlet.approvalStatus, outlet.kycStatus]);

  useEffect(() => {
    if (!isAuthenticatedSession) return;
    fetchProfileDetails(true);
    syncBalance();

    const handleWalletUpdate = () => {
      syncBalance();
    };
    window.addEventListener("p2p_wallet_update", handleWalletUpdate);

    // Also load verified profile photo directly from profile endpoint
    const loadVerifiedPhoto = async () => {
      try {
        const res = await retailerApi.getProfile();
        const pUrl = res?.data?.photo?.photo_url;
        if (pUrl) {
          setProfileDetails((prev) => ({ ...prev, photo_url: pUrl }));
        }
      } catch (e) {
        console.warn("Verified photo fetch notice:", e);
      }
    };
    loadVerifiedPhoto();

    return () => {
      window.removeEventListener("p2p_wallet_update", handleWalletUpdate);
    };
  }, [isAuthenticatedSession, fetchProfileDetails, syncBalance]);

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

  // ── DB-Backed User Favorites (PostgreSQL Stored Procedures & DB APIs) ──
  // Backend resolves user identity from JWT Bearer token — no userRefId needed from frontend.
  // Do NOT preload from localStorage: stale data from previous user session causes wrong favorites to appear after login.
  useEffect(() => {
    let isSubscribed = true;

    const fetchDbFavorites = async () => {
      try {
        // Call without userRefId — backend authoritative identity resolution via JWT
        const res = await retailerApi.getFavoriteMenus();
        if (res && res.favorites && Array.isArray(res.favorites) && isSubscribed) {
          const hrefs = res.favorites.map((f: any) => f.menu_href || f.path).filter(Boolean);
          setFavorites(hrefs); // Set even if empty — clears stale state
          try {
            localStorage.setItem("p2p_sidebar_favorites", JSON.stringify(hrefs));
          } catch {}
        }
      } catch (err) {
        console.warn("Notice: DB favorites fetch notice:", err);
      }
    };

    if (isAuthenticatedSession) {
      fetchDbFavorites();
    }
    return () => {
      isSubscribed = false;
    };
  }, [isAuthenticatedSession]);

  // Global Lock Screen Keyboard Shortcut (Ctrl+L / Cmd+L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") {
        e.preventDefault();
        lockSession();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lockSession]);

  const toggleFavorite = (path: string, e: React.MouseEvent, itemLabel?: string, itemCategory?: string) => {
    e.stopPropagation();
    e.preventDefault();
    const isCurrentlyFav = favorites.includes(path);
    const updated = isCurrentlyFav ? favorites.filter((p) => p !== path) : [...favorites, path];

    // Optimistic UI state update
    setFavorites(updated);
    try {
      localStorage.setItem("p2p_sidebar_favorites", JSON.stringify(updated));
    } catch {}

    // Asynchronously persist to PostgreSQL DB via Stored Procedure
    // Backend resolves user identity from JWT — no userRefId needed from frontend
    retailerApi
      .toggleFavoriteMenu({
        menu_href: path,
        menu_label: itemLabel || path,
        menu_category: itemCategory || "General",
        user_role: "RETAILER",
      })
      .then((res: any) => {
        if (res && res.favorites && Array.isArray(res.favorites)) {
          const dbHrefs = res.favorites.map((f: any) => f.menu_href || f.path).filter(Boolean);
          setFavorites(dbHrefs);
          try {
            localStorage.setItem("p2p_sidebar_favorites", JSON.stringify(dbHrefs));
          } catch {}
        }
      })
      .catch((err: any) => {
        console.warn("Notice: DB favorite sync:", err);
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
      ],
    },
    {
      title: "WALLET",
      items: [
        { label: "Wallet", path: "/retailer/wallet", icon: AccountBalanceWalletIcon },
        { label: "Topup Request", path: "/retailer/topup-request", icon: CloudUploadIcon },
        { label: "Wallet Top-up", path: "/retailer/wallet-topup", icon: AddCardIcon },
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
        backgroundColor: "#FFFFFF",
        color: "#292329",
        borderRight: "1px solid #E8E2E5",
      }}
    >
      {/* NEAR4YOU Brand Logo Header (72px) */}
      <Box
        sx={{
          height: 72,
          px: isCollapsed ? 1.5 : 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          borderBottom: "1px solid #E8E2E5",
          bgcolor: "#FFFFFF",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.8 }}>
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: "12px",
              p: "3px",
              bgcolor: "#FFFFFF",
              border: "1.5px solid #EDC11E",
              boxShadow: "0 2px 8px rgba(162, 10, 58, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <Box
              component="img"
              src="/branding/logo.svg"
              alt="Near 4 You"
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </Box>
          {!isCollapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#A20A3A", fontSize: "22px", lineHeight: 1.1, whiteSpace: "nowrap" }}>
                NEAR4YOU
              </Typography>
              <Typography variant="caption" sx={{ color: "#625B60", fontWeight: 600, fontSize: "13px", display: "block", whiteSpace: "nowrap" }}>
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
              sx={{ display: { xs: "none", lg: "flex" }, color: "#8A8288", "&:hover": { backgroundColor: "#FAF8F9" } }}
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
                    <SearchIcon sx={{ color: "#A20A3A", fontSize: 16 }} />
                  </InputAdornment>
                ),
                endAdornment: menuSearchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setMenuSearchQuery("")} sx={{ p: 0.2, color: "#8A8288" }}>
                      <ClearIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  height: 34,
                  fontSize: "12px",
                  color: "#292329",
                  borderRadius: "8px",
                  bgcolor: "#FFFFFF",
                  border: "1px solid #E8E2E5",
                  "& fieldset": { border: "none" },
                  "&:hover": { borderColor: "#A20A3A" },
                  "&.Mui-focused": { borderColor: "#A20A3A", boxShadow: "0 0 0 2px rgba(162, 10, 58, 0.15)" },
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
                  <StarIcon sx={{ color: "#EDC11E", fontSize: 13 }} />
                  <Typography variant="caption" sx={{ color: "#EDC11E", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
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
                          backgroundColor: isActive ? "#FFF0F4" : "transparent",
                          color: isActive ? "#A20A3A" : "#292329",
                          textDecoration: "none",
                          borderLeft: isActive ? "3px solid #A20A3A" : "3px solid transparent",
                          transition: "all 0.15s ease",
                          "&:hover": { backgroundColor: isActive ? "#FFF0F4" : "#FAF8F9", color: "#A20A3A" },
                          "&:hover .fav-star": { opacity: 1 },
                        }}
                      >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                          <IconComponent sx={{ fontSize: 20, color: isActive ? "#A20A3A" : "#EDC11E" }} />
                          {!isCollapsed && (
                            <Typography sx={{ fontSize: "13.5px", fontWeight: isActive ? 800 : 600, lineHeight: "20px", whiteSpace: "nowrap", color: isActive ? "#A20A3A" : "#292329" }}>
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
                                  backgroundColor: "#FFF8DC",
                                  color: "#EDC11E",
                                  border: "1px solid #FFF3C4",
                                }}
                              />
                            )}
                            <IconButton
                              size="small"
                              className="fav-star"
                              onClick={(e) => toggleFavorite(item.path, e)}
                              sx={{ p: 0.3, color: "#EDC11E" }}
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
                <Typography variant="caption" sx={{ color: "#A20A3A", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", px: "14px", display: "block", mb: 0.5 }}>
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
                          backgroundColor: isActive ? "#FFF0F4" : "transparent",
                          color: isActive ? "#A20A3A" : itemLocked ? "#B8B0B6" : "#292329",
                          textDecoration: "none",
                          boxShadow: "none",
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
                                backgroundColor: "#A20A3A",
                              }
                            : {},
                          "&:hover": {
                            backgroundColor: isActive ? "#FFF0F4" : "#FAF8F9",
                            color: "#A20A3A",
                          },
                          "&:hover .fav-star": { opacity: 1 },
                        }}
                      >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                          <IconComponent sx={{ fontSize: 20, color: isActive ? "#A20A3A" : itemLocked ? "#EDC11E" : "#625B60" }} />
                          {!isCollapsed && (
                            <Typography sx={{ fontSize: "13.5px", fontWeight: isActive ? 800 : 500, lineHeight: "20px", whiteSpace: "nowrap", color: isActive ? "#A20A3A" : itemLocked ? "#B8B0B6" : "#292329" }}>
                              {item.label}
                            </Typography>
                          )}
                        </Stack>

                        {!isCollapsed && (
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                            {itemLocked && (
                              <Chip
                                icon={<LockIcon sx={{ "&&": { fontSize: 10, color: "#EDC11E" } }} />}
                                label="LOCKED"
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "8.5px",
                                  fontWeight: 800,
                                  backgroundColor: "#FFF8DC",
                                  color: "#EDC11E",
                                  border: "1px solid #FFF3C4",
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
                              onClick={(e) => toggleFavorite(item.path, e, item.label, cat.title)}
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

      <Divider sx={{ borderColor: "#E8E2E5" }} />

      {/* Logged-in Retailer Profile Footer at Bottom of Dark Sidebar */}
      {!isCollapsed ? (
        <Box sx={{ p: 1.5, bgcolor: "#FAF8F9" }}>
          <Paper
            elevation={0}
            onClick={(e) => setProfileAnchor(e.currentTarget)}
            sx={{
              p: 1.2,
              borderRadius: "12px",
              backgroundColor: "rgba(18, 27, 48, 0.72)",
              border: "1px solid #E8E2E5",
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              cursor: "pointer",
              "&:hover": { borderColor: "#2563EB" },
            }}
          >
            <Avatar
              src={profileDetails.photo_url || outlet.avatar || undefined}
              sx={{ bgcolor: "#2563EB", width: 34, height: 34, fontWeight: 900, fontSize: "13px", border: "1.5px solid #3B82F6" }}
            >
              {(profileDetails.owner_name || profileDetails.retailer_name || outlet.ownerName || outlet.name || "").charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#292329", fontSize: "12px", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {profileDetails.owner_name || profileDetails.retailer_name || outlet.ownerName || outlet.name || "—"}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "10px", color: "#4ADE80", fontWeight: 700, display: "block" }}>
                ● Online Retailer {profileDetails.retailer_code || outlet.code ? `(${profileDetails.retailer_code || outlet.code})` : ""}
              </Typography>
            </Box>
          </Paper>
        </Box>
      ) : (
        <Box sx={{ py: 1.5, display: "flex", justifyContent: "center" }}>
          <Avatar
            src={profileDetails.photo_url || outlet.avatar || undefined}
            sx={{ bgcolor: "#A20A3A", width: 34, height: 34, fontWeight: 900, fontSize: "13px", border: "1.5px solid #EDC11E" }}
          >
            {(profileDetails.owner_name || profileDetails.retailer_name || outlet.ownerName || outlet.name || "").charAt(0).toUpperCase()}
          </Avatar>
        </Box>
      )}
    </Box>
  );

  const activeTheme = THEME_CONFIGS[kpiTheme] || THEME_CONFIGS["corporate-white"];

  if (!isAuthenticatedSession && typeof window !== "undefined") {
    const isAuthPage =
      pathname.includes("/login") ||
      pathname.includes("/register") ||
      pathname.includes("/reset-password");
    if (!isAuthPage) {
      return (
        <Box
          sx={{
            width: "100vw",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#FFFFFF",
            color: "#292329",
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              border: "3px solid #FFF0F4",
              borderTopColor: "#A20A3A",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              "@keyframes spin": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" },
              },
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#625B60" }}>
            Verifying secure session...
          </Typography>
        </Box>
      );
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#FFFFFF",
        color: "#292329",
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
          backgroundColor: "#FFFFFF",
          backdropFilter: "blur(20px)",
          color: "#292329",
          borderBottom: "1px solid #E8E2E5",
          zIndex: (theme) => theme.zIndex.drawer + 1,
          justifyContent: "center",
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), margin 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease",
        }}
      >
        <Toolbar
          sx={{
            justifyContent: "space-between",
            px: { xs: 1, sm: 2, md: 3 },
            minHeight: "56px !important",
            height: 56,
            gap: { xs: 0.5, sm: 1 },
          }}
        >
          {/* Left: Menu Toggle + Page Title + Search Input */}
          <Stack direction="row" spacing={{ xs: 0.5, sm: 1.5 }} sx={{ alignItems: "center", minWidth: 0, flexShrink: 1 }}>
            <Tooltip title={desktopCollapsed ? "Expand Sidebar (260px)" : "Collapse Sidebar (72px)"}>
              <IconButton
                edge="start"
                color="inherit"
                aria-label="toggle drawer"
                onClick={handleDrawerToggle}
                size="small"
                sx={{
                  p: { xs: 0.5, sm: 0.75 },
                  color: "#A20A3A",
                  "&:hover": {
                    backgroundColor: "#FFF0F4",
                  },
                }}
              >
                {desktopCollapsed ? <MenuOpenIcon sx={{ fontSize: 22 }} /> : <MenuIcon sx={{ fontSize: 22 }} />}
              </IconButton>
            </Tooltip>

            {/* Page Title */}
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: "15px", sm: "18px" },
                fontWeight: 800,
                color: "#292329",
                letterSpacing: "-0.3px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: { xs: 80, sm: 160, md: "none" },
              }}
            >
              {activeMenuItem?.label || "Dashboard"}
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
                backgroundColor: "#FAF8F9",
                border: "1px solid #E8E2E5",
                cursor: "pointer",
                "&:hover": { backgroundColor: "#FFFFFF", borderColor: "#A20A3A" },
              }}
            >
              <SearchIcon sx={{ color: "#A20A3A", fontSize: 18, mr: 0.75 }} />
              <Typography variant="caption" sx={{ fontSize: "12px", color: "#8A8288", flex: 1, fontWeight: 700 }}>
                Universal Search...
              </Typography>
              <Chip label="Ctrl+K" size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 800, bgcolor: "#FFF0F4", color: "#A20A3A", border: "1px solid #E8E2E5" }} />
            </Paper>
          </Stack>

          {/* Right: Soundbox, Wallet Balance, Notifications, Theme, Profile */}
          <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} sx={{ alignItems: "center", flexShrink: 0 }}>
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

            {/* Compact Gold Glass Wallet Balance Indicator Pill */}
            <Paper
              elevation={0}
              sx={{
                px: { xs: 0.8, sm: 1.5 },
                py: 0.3,
                borderRadius: "10px",
                bgcolor: "#FFFFFF",
                border: "1px solid #E8E2E5",
                display: "flex",
                alignItems: "center",
                gap: { xs: 0.5, sm: 0.8 },
                flexShrink: 0,
                height: { xs: 32, sm: 38 },
                boxShadow: "0 1px 3px rgba(41, 35, 41, 0.05)",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  bgcolor: "#FAF8F9",
                  borderColor: "#EDC11E",
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
                    gap: { xs: 0.5, sm: 0.8 },
                    cursor: "pointer",
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 20, sm: 24 },
                      height: { xs: 20, sm: 24 },
                      borderRadius: "6px",
                      bgcolor: "#FFF8DC",
                      border: "1px solid #FFF3C4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AccountBalanceWalletIcon sx={{ color: "#EDC11E", fontSize: { xs: 12, sm: 14 } }} />
                  </Box>

                  <Typography
                    variant="subtitle1"
                    suppressHydrationWarning
                    sx={{
                      fontWeight: 900,
                      color: "#A20A3A",
                      fontSize: { xs: "12px", sm: "14.5px" },
                      lineHeight: 1.1,
                      letterSpacing: "-0.2px",
                      fontFamily: "var(--font-geist-mono), 'Inter', monospace, sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ₹{(wallet?.mainBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
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
                    p: 0.2,
                    color: "#EDC11E",
                    borderRadius: "4px",
                    "&:hover": {
                      color: "#D4A915",
                      bgcolor: "#FFF8DC",
                    },
                  }}
                >
                  <RefreshIcon
                    sx={{
                      fontSize: { xs: 13, sm: 15 },
                      animation: isSyncing ? "spin 1s linear infinite" : "none",
                    }}
                  />
                </IconButton>
              </Tooltip>
            </Paper>

            {/* Header Theme Quick Switch Control (Desktop only) */}
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Tooltip title="Theme (Auto / Light / Dark)">
                <IconButton
                  color="inherit"
                  onClick={(e) => setKpiThemeAnchor(e.currentTarget)}
                  size="small"
                  sx={{
                    p: 0.75,
                    color: "#625B60",
                    "&:hover": { color: "#A20A3A", bgcolor: "#FFF0F4" },
                  }}
                >
                  <PaletteIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Box>

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
                    bgcolor: "#FFFFFF",
                    color: "#292329",
                    border: "1px solid #E8E2E5",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  },
                },
              }}
            >
              <Box sx={{ p: 1, px: 1.5, borderBottom: "1px solid #E8E2E5" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "12px", color: "#292329" }}>
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
                        ? "#FFF0F4"
                        : "transparent",
                      color: isSelected
                        ? "#A20A3A"
                        : "#292329",
                      "&:hover": {
                        bgcolor: "#FAF8F9",
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
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <NotificationCenter />
            </Box>

            {/* Quick Lock Terminal Icon (Desktop only on md+) */}
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Tooltip title="Lock Terminal (Ctrl+L)">
                <IconButton
                  onClick={lockSession}
                  size="small"
                  sx={{
                    color: effectiveTheme === "dark" ? "#94A3B8" : "#64748B",
                    p: 0.75,
                    "&:hover": {
                      color: "#F59E0B",
                      backgroundColor: effectiveTheme === "dark" ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)",
                    },
                  }}
                >
                  <LockIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* User Profile Avatar Icon */}
            <Tooltip title="View Retailer Profile Info">
              <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} size="small" sx={{ p: 0.25 }}>
                <Avatar
                  src={profileDetails.photo_url || outlet.avatar || undefined}
                  sx={{
                    bgcolor: "#A20A3A",
                    color: "#FFFFFF",
                    width: { xs: 30, sm: 34 },
                    height: { xs: 30, sm: 34 },
                    fontWeight: 800,
                    fontSize: { xs: "0.75rem", sm: "0.85rem" },
                    border: "2px solid #FFF0F4",
                    boxShadow: "0 2px 6px rgba(162,10,58,0.25)",
                  }}
                >
                  {(profileDetails.owner_name || profileDetails.retailer_name || outlet.ownerName || outlet.name || "").charAt(0).toUpperCase()}
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
                    bgcolor: "#FFFFFF",
                    color: "#292329",
                    boxShadow: "0 12px 36px rgba(41, 35, 41, 0.12)",
                    border: "1px solid #E8E2E5",
                  },
                },
              }}
            >
              {/* Top Row: Avatar + Name & Badges */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                <Avatar
                  src={profileDetails.photo_url || outlet.avatar || undefined}
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: "#A20A3A",
                    color: "#FFFFFF",
                    fontWeight: 800,
                    fontSize: "1.2rem",
                    border: "2px solid #FFF0F4",
                    boxShadow: "0 4px 12px rgba(162, 10, 58, 0.25)",
                    flexShrink: 0,
                  }}
                >
                  {(profileDetails.retailer_name || profileDetails.owner_name || outlet.name || outlet.ownerName || "").charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontSize: "16px", fontWeight: 800, color: "#292329", lineHeight: 1.2 }}>
                    {profileDetails.retailer_name || profileDetails.owner_name || outlet.name || outlet.ownerName || "—"}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                    {profileDetails.plan_name && (
                      <Chip
                        icon={<WorkspacePremiumIcon sx={{ "&&": { color: "#EDC11E", fontSize: 13 } }} />}
                        label={profileDetails.plan_name}
                        size="small"
                        sx={{
                          backgroundColor: "#FFF8DC",
                          color: "#D4A915",
                          fontWeight: 800,
                          fontSize: "0.65rem",
                          height: 20,
                          border: "1px solid #FFF3C4",
                        }}
                      />
                    )}
                    <Chip
                      label="● Active Session"
                      size="small"
                      sx={{
                        backgroundColor: "#FFF0F4",
                        color: "#A20A3A",
                        border: "1px solid #FFD6E2",
                        fontWeight: 800,
                        fontSize: "0.65rem",
                        height: 20,
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 1.5, borderColor: "#E8E2E5" }} />

              {/* Wallet Balance Display */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "#625B60", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  WALLET BALANCE
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="h5" suppressHydrationWarning sx={{ fontSize: "22px", fontWeight: 800, color: "#A20A3A", fontFamily: "monospace", lineHeight: 1.1 }}>
                    ₹{(wallet?.mainBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <IconButton size="small" onClick={syncBalance} disabled={isSyncing} sx={{ p: 0.25 }}>
                    <RefreshIcon sx={{ fontSize: 16, color: "#EDC11E", animation: isSyncing ? "spin 1s linear infinite" : "none" }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Details List */}
              <Stack spacing={1} sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#625B60", fontWeight: 600 }}>Retailer ID</Typography>
                  <Chip
                    label={
                      profileDetails.retailer_code || outlet.code || "—"
                    }
                    size="small"
                    sx={{
                      backgroundColor: "#FFF0F4",
                      color: "#A20A3A",
                      border: "1px solid #FFD6E2",
                      fontWeight: 800,
                      height: 20,
                      fontSize: "0.68rem",
                    }}
                  />
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#625B60", fontWeight: 600 }}>Merchant Outlet</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#292329", fontWeight: 700, textAlign: "right", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {profileDetails.retailer_name || outlet.name || "—"}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#625B60", fontWeight: 600 }}>Account Approval</Typography>
                  {(() => {
                    const statusVal = profileDetails.approval_status || outlet.approvalStatus || (isApproved ? "APPROVED" : "PENDING");
                    const isAppr = statusVal.toUpperCase() === "ACTIVE" || statusVal.toUpperCase() === "APPROVED";
                    return (
                      <Chip
                        icon={isAppr ? <ShieldIcon sx={{ "&&": { color: "#A20A3A", fontSize: 12 } }} /> : <LockIcon sx={{ "&&": { color: "#EDC11E", fontSize: 12 } }} />}
                        label={statusVal}
                        size="small"
                        sx={{
                          backgroundColor: isAppr ? "#FFF0F4" : "#FFF8DC",
                          color: isAppr ? "#A20A3A" : "#D4A915",
                          border: isAppr ? "1px solid #FFD6E2" : "1px solid #FFF3C4",
                          fontWeight: 800,
                          height: 22,
                          fontSize: "0.68rem",
                        }}
                      />
                    );
                  })()}
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#625B60", fontWeight: 600 }}>KYC Status</Typography>
                  {(() => {
                    const kycVal = profileDetails.kyc_status || outlet.kycStatus || (isApproved ? "VERIFIED" : "PENDING");
                    const isKyc = kycVal.toUpperCase() === "VERIFIED" || kycVal.toUpperCase() === "APPROVED";
                    return (
                      <Chip
                        icon={<ShieldIcon sx={{ "&&": { color: isKyc ? "#A20A3A" : "#EDC11E", fontSize: 12 } }} />}
                        label={kycVal}
                        size="small"
                        sx={{
                          backgroundColor: isKyc ? "#FFF0F4" : "#FFF8DC",
                          color: isKyc ? "#A20A3A" : "#D4A915",
                          border: isKyc ? "1px solid #FFD6E2" : "1px solid #FFF3C4",
                          fontWeight: 800,
                          height: 20,
                          fontSize: "0.68rem",
                        }}
                      />
                    );
                  })()}
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#625B60", fontWeight: 600 }}>Location</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#292329", fontWeight: 600, textAlign: "right", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {profileDetails.location || outlet.location || "—"}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#625B60", fontWeight: 600 }}>Last Login</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#8A8288", fontWeight: 600 }}>
                    {formatLastLogin(profileDetails.last_login_at)}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5, borderColor: "#E8E2E5" }} />

              {/* Action Buttons */}
              <Stack spacing={1}>
                <Button
                  component={Link}
                  href="/retailer/profile"
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<PersonIcon sx={{ fontSize: 18, color: "#A20A3A" }} />}
                  onClick={() => setProfileAnchor(null)}
                  sx={{
                    borderRadius: "10px",
                    height: 36,
                    fontWeight: 700,
                    textTransform: "none",
                    fontSize: "12px",
                    borderColor: "#A20A3A",
                    color: "#A20A3A",
                    "&:hover": {
                      borderColor: "#85072F",
                      backgroundColor: "#FFF0F4",
                    },
                  }}
                >
                  View Full Profile
                </Button>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<LockIcon sx={{ fontSize: 18, color: "#EDC11E" }} />}
                  onClick={() => {
                    setProfileAnchor(null);
                    lockSession();
                  }}
                  sx={{
                    borderRadius: "10px",
                    height: 36,
                    fontWeight: 700,
                    textTransform: "none",
                    fontSize: "12px",
                    borderColor: "#EDC11E",
                    color: "#EDC11E",
                    backgroundColor: "#FFF8DC",
                    "&:hover": {
                      borderColor: "#D4A915",
                      backgroundColor: "#FFF3C4",
                    },
                  }}
                >
                  Lock Terminal (Ctrl+L)
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
                    backgroundColor: "#A20A3A",
                    color: "#FFFFFF",
                    "&:hover": {
                      backgroundColor: "#85072F",
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
          overflowY: "auto",
          mt: "56px",
          pb: { xs: "80px", md: 0 },
          minHeight: "calc(100vh - 56px)",
          maxHeight: "none",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Box sx={{ flex: 1, width: "100%", maxWidth: "100%", overflow: "visible" }}>
          {/* Account Verification Warning Banner for Unapproved Retailer */}
          {!isApproved && (
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 2,
                borderRadius: "16px",
                background: "#FFF8DC",
                border: "1px solid #FFF3C4",
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                gap: 2,
                boxShadow: "0 2px 8px rgba(237, 193, 30, 0.08)",
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                <Box sx={{ p: 1, borderRadius: "12px", bgcolor: "#FFF3C4", color: "#D4A915" }}>
                  <LockIcon sx={{ fontSize: 24 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: "#292329", fontSize: "12px", fontWeight: 500 }}>
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
                  sx={{ bgcolor: "#EDC11E", color: "#FFFFFF", fontWeight: 800, textTransform: "none", fontSize: "12px", "&:hover": { bgcolor: "#D4A915" } }}
                >
                  Check KYC Status
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => openContactSupportModal()}
                  sx={{ borderColor: "#E8E2E5", color: "#292329", fontWeight: 800, textTransform: "none", fontSize: "12px", "&:hover": { borderColor: "#A20A3A", bgcolor: "#FFF0F4" } }}
                >
                  Contact Admin Support
                </Button>
              </Stack>
            </Paper>
          )}

          {/* HARD LOCKED ROUTE ENFORCEMENT: Block page content if unapproved & path is locked */}
          {isPathLocked(pathname) ? (
            <ApprovalGuardOverlay featureName={activeMenuItem?.label || "Financial Service"}>
              <Box sx={{ p: 4, textAlign: "center", color: "#625B60" }}>
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
              borderTop: "1px solid #E8E2E5",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              color: "#625B60",
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "12px" }}>
                © 2021 Sathus Technology Pvt. Ltd. · Near4You Retailer Portal
              </Typography>
              <Chip label="v2.4.0-ENT" size="small" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />
            </Stack>

            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                <ShieldIcon sx={{ fontSize: 14, color: "#16A34A" }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#292329", fontSize: "12px" }}>
                  256-bit SSL
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                <LockIcon sx={{ fontSize: 14, color: "#EDC11E" }} />
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#292329", fontSize: "12px" }}>
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
            bgcolor: "#FFFFFF",
            color: "#292329",
            p: 3.5,
            maxWidth: 440,
            width: "100%",
            border: "1px solid #E8E2E5",
            boxShadow: "0 16px 40px rgba(41, 35, 41, 0.12)",
          },
        },
      }}
    >
      <Box sx={{ textCenter: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Box sx={{ w: 14, h: 14, p: 1.5, borderRadius: "50%", bgcolor: "#FFF8DC", border: "2px solid #FFF3C4", color: "#EDC11E", mb: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LockIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 900, color: "#292329", textAlign: "center" }}>
          {lockedModalItem?.label || "Feature"} Restricted
        </Typography>
        <Typography variant="body2" sx={{ color: "#625B60", mt: 1.5, textAlign: "center", fontSize: "13px", lineHeight: 1.5 }}>
          Your retailer account (Mobile: <strong>{outlet.mobile ? `+91 ${outlet.mobile.replace(/\D/g, "")}` : "your registered mobile"}</strong>) is currently <strong>PENDING ADMIN APPROVAL</strong>. All financial services, wallet top-ups, and transaction tools remain locked until Admin completes verification.
        </Typography>

        <Stack spacing={1.5} sx={{ mt: 3, width: "100%" }}>
          <Button
            component={Link}
            href="/register/submitted"
            onClick={() => setLockedModalItem(null)}
            variant="contained"
            fullWidth
            sx={{ bgcolor: "#A20A3A", color: "#FFF", fontWeight: 800, borderRadius: "12px", height: 44, textTransform: "none", fontSize: "13px", "&:hover": { bgcolor: "#85072F" } }}
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
            sx={{ borderColor: "#E8E2E5", color: "#292329", fontWeight: 800, borderRadius: "12px", height: 44, textTransform: "none", fontSize: "13px", "&:hover": { borderColor: "#A20A3A", bgcolor: "#FFF0F4" } }}
          >
            Contact Admin Support
          </Button>
          <Button
            onClick={() => setLockedModalItem(null)}
            variant="text"
            fullWidth
            sx={{ color: "#8A8288", fontWeight: 700, borderRadius: "12px", height: 38, textTransform: "none", fontSize: "13px" }}
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

