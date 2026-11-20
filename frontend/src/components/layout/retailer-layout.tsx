"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NotificationCenter } from "@/app-shell/components/NotificationCenter";
import {
  AppBar, Toolbar, Drawer, Box, Typography, IconButton, Badge, Menu,
  MenuItem, Divider, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Button, Avatar, Chip, Tooltip, Stack, Paper, InputBase,
  Popover, TextField, InputAdornment, Dialog, Snackbar, Alert
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
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useAuth } from "@/lib/auth";
import apiClient from "@/lib/api";
import { useRetailerStore, KpiTheme, THEME_CONFIGS } from "@/stores/use-retailer-store";
import { useTheme } from "@/context/ThemeContext";
import { retailerApi } from "@/services/retailer-api";

import { useRetailerApprovalGuard } from "@/hooks/useRetailerApprovalGuard";
import { useSessionSecurity } from "@/context/SessionSecurityProvider";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

import { MobileBottomNav } from "./mobile-bottom-nav";
import { MobileQuickActionsFAB } from "./mobile-quick-actions-fab";
import { UniversalSearchDialog } from "@/components/common/universal-search-dialog";
import { RightContextPanel } from "./right-context-panel";
import { ApprovalGuardOverlay } from "@/components/common/ApprovalGuardOverlay";
import { ServiceDownMaintenance } from "@/components/common/ServiceDownMaintenance";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";

const FULL_DRAWER_WIDTH = 270;
const COLLAPSED_DRAWER_WIDTH = 72;

const KPI_THEMES: { id: KpiTheme; label: string; swatch: string }[] = [
  { id: "classic-blue", label: "Classic Blue", swatch: "#2563EB" },
  { id: "royal-gold", label: "Royal Gold", swatch: "#FFD54F" },
  { id: "emerald-green", label: "Emerald Green", swatch: "#16A34A" },
  { id: "purple", label: "Purple Velvet", swatch: "#7C3AED" },
  { id: "dark", label: "Dark Onyx", swatch: "#FFFFFF" },
  { id: "corporate-white", label: "Corporate White", swatch: "#FFFFFF" },
];

export const RetailerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { themeMode, effectiveTheme, setThemeMode } = useTheme();
  const { outlet, wallet, isSyncing, syncBalance, soundboxEnabled, toggleSoundbox, unreadNotifications, setUnreadNotifications, kpiTheme, setKpiTheme } = useRetailerStore();
  const { isApproved, approvalStatus, isPathLocked, setApprovalStatus } = useRetailerApprovalGuard();
  const { openContactSupportModal } = useContactSupportModal();
  const { lockSession } = useSessionSecurity();
  const branding = useCompanyBranding();

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
        pathname.includes("/reset-password") ||
        pathname.startsWith("/retailer/payin/status") ||
        pathname.startsWith("/retailer/payin/callback") ||
        pathname.startsWith("/retailer/payin/checkout");
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

  const isPayInPage = pathname === "/retailer/payin";

  // Multi-brand Financial Applications: Pay2Pay, Near4You, SMSPAY
  const currentHost = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
  const currentPort = typeof window !== "undefined" ? window.location.port : "";

  const isSmsPay =
    branding?.company_code === "SMSPAY" ||
    currentPort === "4002" ||
    currentHost.includes("smspay") ||
    (!branding?.company_code && !currentHost.includes("pay2pay") && !currentHost.includes("near4you") && (user as any)?.company_ref_id === 2);

  const isNear4You =
    !isSmsPay &&
    (branding?.company_code === "NEAR4YOU" ||
     currentPort === "4001" ||
     currentHost.includes("near4you") ||
     (!branding?.company_code && !currentHost.includes("pay2pay") && (user as any)?.company_ref_id === 1));

  const isPay2Pay =
    !isSmsPay &&
    !isNear4You &&
    (branding?.company_code === "PAY2PAY" ||
     currentPort === "3000" ||
     currentPort === "4003" ||
     currentHost.includes("pay2pay") ||
     (user as any)?.company_ref_id === 47);

  const isFinancialApp = isPay2Pay || isNear4You || isSmsPay;

  const appName = branding?.display_name || branding?.company_name || (isPay2Pay ? "Pay2Pay" : isNear4You ? "Near 4 You" : isSmsPay ? "SMSPAY" : "FinTech Platform");
  const appSubtitle = `${appName} Operations`;
  const appLogo = branding?.logo_url || (isPay2Pay ? "/branding/pay2pay-logo.png" : isNear4You ? "/branding/logo.svg" : "/branding/smspay-logo.svg");

  const brandPrimary = branding?.primary_colour || (isPay2Pay ? "#2563EB" : isNear4You ? "#A20A3A" : "#059669");
  const brandSecondary = branding?.secondary_colour || (isPay2Pay ? "#1E40AF" : isNear4You ? "#85072F" : "#047857");
  const brandLight = isPay2Pay ? "#EFF6FF" : isNear4You ? "#FFF0F4" : "#ECFDF5";

  const headerGradient = isPay2Pay
    ? "linear-gradient(110deg, #0F172A 0%, #2563EB 60%, #38BDF8 100%)"
    : isNear4You
    ? "linear-gradient(110deg, #6B0525 0%, #A20A3A 60%, #EDC11E 100%)"
    : isSmsPay
    ? "linear-gradient(110deg, #102A43 0%, #1D4ED8 65%, #0D9488 100%)"
    : `linear-gradient(110deg, ${brandSecondary} 0%, ${brandPrimary} 65%, #0D9488 100%)`;

  const [lockedModalItem, setLockedModalItem] = useState<{ label: string; path: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Default sidebar state must ALWAYS be COLLAPSED on initial load, refresh, and route navigation (P0 Requirement)
  const [desktopCollapsed, setDesktopCollapsed] = useState(true);

  // Clear any legacy persisted state on mount to ensure default is collapsed after refresh
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("p2p_retailer_sidebar_collapsed");
        sessionStorage.removeItem("p2p_retailer_sidebar_collapsed");
      } catch {}
    }
    setDesktopCollapsed(true);
  }, []);

  // When navigating between pages: sidebar remains collapsed by default
  useEffect(() => {
    setDesktopCollapsed(true);
  }, [pathname]);
  const [smspayDrawerOpen, setSmspayDrawerOpen] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);
  const [kpiThemeAnchor, setKpiThemeAnchor] = useState<null | HTMLElement>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [universalSearchOpen, setUniversalSearchOpen] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [servicesStatus, setServicesStatus] = useState<Record<string, boolean>>({
    DMT: true,
    RECHARGE: true,
    AEPS: true,
    BBPS: true,
    POS_TOPUP: true,
    UPI: true,
    PAYIN: true,
  });
  const [disabledSubmenus, setDisabledSubmenus] = useState<string[]>([]);

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
    company_name?: string;
    loading?: boolean;
    error?: boolean;
  }>(() => {
    let initialOwner = null;
    let initialRetailer = null;
    let initialCode = null;
    let initialCompany = null;
    if (typeof window !== "undefined") {
      try {
        const host = window.location.hostname.toLowerCase();
        const port = window.location.port;
        const isSmspay = host.includes("smspay") || port === "4002";
        const isPay2pay = host.includes("pay2pay") || port === "3000" || port === "4003";

        const uStr = localStorage.getItem("p2p_retailer_user") || localStorage.getItem("user_info") || localStorage.getItem("user");
        if (uStr) {
          const u = JSON.parse(uStr);
          const uCompRef = u.company_ref_id;
          const uCompCode = (u.company_code || "").toUpperCase();
          const isMismatch =
            (isSmspay && (uCompRef === 47 || uCompCode === "PAY2PAY" || (u.retailer_code && String(u.retailer_code).startsWith("P2P-")))) ||
            (isPay2pay && (uCompRef === 2 || uCompCode === "SMSPAY" || (u.retailer_code && String(u.retailer_code).startsWith("SMSP-"))));

          if (!isMismatch) {
            initialOwner = u.owner_name || u.name || u.full_name || null;
            initialRetailer = u.store_name || u.retailer_name || null;
            initialCode = u.retailer_code || u.code || u.retailer_id || null;
            initialCompany = u.company_name || null;
          }
        }
      } catch {}
    }
    return {
      owner_name: initialOwner || "",
      retailer_name: initialRetailer || "",
      retailer_code: initialCode || "",
      company_name: initialCompany || "",
      loading: false,
      error: false,
    };
  });

  const hasInitializedRef = useRef(false);

  const [refreshErrorToast, setRefreshErrorToast] = useState<string | null>(null);

  // Restore last known wallet balance strictly scoped to active retailer
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const activeCode = localStorage.getItem("p2p_active_retailer_code");
        if (activeCode) {
          const savedBal = localStorage.getItem(`p2p_cached_wallet_balance_${activeCode}`);
          const savedAvail = localStorage.getItem(`p2p_cached_available_balance_${activeCode}`);
          if (savedBal && !isNaN(Number(savedBal))) {
            const bal = Number(savedBal);
            const avail = savedAvail && !isNaN(Number(savedAvail)) ? Number(savedAvail) : bal;
            useRetailerStore.getState().updateWallet({
              mainBalance: bal,
              availableBalance: avail,
            });
          }
        }
      } catch {}
    }
  }, []);

  const fetchProfileDetails = useCallback(async () => {
    setProfileDetails((prev) => ({ ...prev, loading: true, error: false }));
    try {
      const res = await retailerApi.getProfile();
      const data = res?.data || res || {};
      const personal = data.personal || {};
      const photo = data.photo || {};
      const company = data.company || {};
      const kyc = data.kyc || {};
      const currentOutlet = useRetailerStore.getState().outlet;

      const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";
      const port = typeof window !== "undefined" ? window.location.port : "";
      const isSmspay = host.includes("smspay") || port === "4002";
      const isNear4you = host.includes("near4you") || port === "4001";
      const isPay2pay = host.includes("pay2pay") || port === "3000" || port === "4003";

      const fallbackOwner = (typeof window !== "undefined" && (() => {
        try {
          const uStr = localStorage.getItem("p2p_retailer_user") || localStorage.getItem("user_info") || localStorage.getItem("user");
          if (uStr) {
            const u = JSON.parse(uStr);
            const uCompRef = u.company_ref_id;
            const uCompCode = (u.company_code || "").toUpperCase();
            if ((isSmspay && (uCompRef === 47 || uCompCode === "PAY2PAY" || (u.retailer_code && String(u.retailer_code).startsWith("P2P-")))) ||
                (isPay2pay && (uCompRef === 2 || uCompCode === "SMSPAY" || (u.retailer_code && String(u.retailer_code).startsWith("SMSP-"))))) {
              return null;
            }
            return u.owner_name || u.name || u.full_name;
          }
        } catch {}
        return null;
      })()) || "";

      const fallbackCode = (typeof window !== "undefined" && (() => {
        try {
          const uStr = localStorage.getItem("p2p_retailer_user") || localStorage.getItem("user_info") || localStorage.getItem("user");
          if (uStr) {
            const u = JSON.parse(uStr);
            const uCompRef = u.company_ref_id;
            const uCompCode = (u.company_code || "").toUpperCase();
            if ((isSmspay && (uCompRef === 47 || uCompCode === "PAY2PAY" || (u.retailer_code && String(u.retailer_code).startsWith("P2P-")))) ||
                (isPay2pay && (uCompRef === 2 || uCompCode === "SMSPAY" || (u.retailer_code && String(u.retailer_code).startsWith("SMSP-"))))) {
              return null;
            }
            return u.retailer_code || u.code || u.retailer_id;
          }
        } catch {}
        return null;
      })()) || "";

      const defaultCompanyName = isSmspay ? "SMSPAY" : isNear4you ? "Near4You" : (branding?.company_name || branding?.display_name || "Pay2Pay");
      let resolvedCompany = company.company_name || company.legal_name || defaultCompanyName;
      if (isSmspay && resolvedCompany.toLowerCase().includes("pay2pay")) {
        resolvedCompany = "SMSPAY";
      } else if (isPay2pay && resolvedCompany.toLowerCase().includes("smspay")) {
        resolvedCompany = "Pay2Pay";
      }

      const resolvedOwner = personal.owner_name || (personal.first_name ? `${personal.first_name} ${personal.last_name || ""}`.trim() : personal.retailer_name) || fallbackOwner;
      const resolvedRetailer = personal.retailer_name || personal.store_name || fallbackOwner || "Retailer Store";
      const resolvedCode = personal.retailer_id || personal.application_reference || fallbackCode || "";
      const photoUrl = photo.photo_url || currentOutlet.avatar || currentOutlet.photo_url || "";
      const approvalStatus = personal.status === "ACTIVE" ? "ACTIVE" : (currentOutlet.approvalStatus || "ACTIVE");

      const targetStatus = approvalStatus === "ACTIVE" ? "APPROVED" : "PENDING";
      if (currentOutlet.approvalStatus !== targetStatus) {
        useRetailerStore.getState().setApprovalStatus?.(targetStatus);
      }

      setProfileDetails((prev) => ({
        ...prev,
        owner_name: resolvedOwner,
        retailer_name: resolvedRetailer,
        company_name: resolvedCompany,
        retailer_code: resolvedCode,
        photo_url: photoUrl,
        approval_status: approvalStatus,
        kyc_status: kyc.pan?.kyc_status || currentOutlet.kycStatus || "VERIFIED",
        location: data.location?.display_address || currentOutlet.location || "",
        last_login_at: data.security?.last_login_at || null,
        plan_name: personal.plan_name || "",
        loading: false,
        error: false,
      }));
    } catch (err) {
      console.warn("Profile details fetch notice:", err);
      setProfileDetails((prev) => ({ ...prev, loading: false, error: false }));
    }
  }, []);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    fetchProfileDetails();
    // Authoritative balance sync on mount so header and popup immediately show live wallet balance
    useRetailerStore.getState().syncBalance?.();
  }, []);

  // Synchronize profile and notification if manual wallet refresh occurs
  useEffect(() => {
    const handleWalletRefreshed = (e: any) => {
      const data = e.detail;
      if (!data) return;
      const rInfo = data.retailer_info || data;
      if (rInfo.retailer_name || rInfo.owner_name) {
        setProfileDetails((prev) => ({
          ...prev,
          owner_name: rInfo.owner_name || prev.owner_name,
          retailer_name: rInfo.store_name || rInfo.retailer_name || prev.retailer_name,
          company_name: rInfo.company_name || prev.company_name,
          retailer_code: rInfo.retailer_code || rInfo.retailer_id || prev.retailer_code,
          photo_url: rInfo.photo_url || rInfo.avatar_url || prev.photo_url,
        }));
      }
    };
    const handleRefreshError = (e: any) => {
      setRefreshErrorToast(e.detail?.message || "Failed to refresh wallet balance.");
    };

    window.addEventListener("p2p_wallet_refreshed", handleWalletRefreshed);
    window.addEventListener("p2p_wallet_refresh_error", handleRefreshError);
    return () => {
      window.removeEventListener("p2p_wallet_refreshed", handleWalletRefreshed);
      window.removeEventListener("p2p_wallet_refresh_error", handleRefreshError);
    };
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

  // ── Company-Scoped Live Service Availability Status ──
  const fetchServicesStatus = useCallback(async () => {
    try {
      const res = await apiClient.get("/services/status");
      if (res.data?.services) {
        setServicesStatus(res.data.services);
      }
      if (Array.isArray(res.data?.disabled_submenus)) {
        setDisabledSubmenus(res.data.disabled_submenus);
      }
    } catch (err) {
      console.warn("Notice: Services status fetch notice:", err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticatedSession) {
      fetchServicesStatus();
    }
  }, [isAuthenticatedSession, fetchServicesStatus]);

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

  const PATH_SERVICE_MAP: Record<string, string> = {
    "/retailer/dmt": "DMT",
    "/retailer/beneficiary": "DMT",
    "/retailer/beneficiaries": "DMT",
    "/retailer/reports/payout-transactions": "DMT",
    "/retailer/card-to-cash": "POS_TOPUP",
    "/retailer/settlement": "POS_TOPUP",
    "/retailer/reports/settlement": "POS_TOPUP",
    "/retailer/aeps": "AEPS",
    "/retailer/upi": "UPI",
    "/retailer/bbps": "BBPS",
    "/retailer/payin": "PAYIN",
    "/retailer/reports/payin-transactions": "PAYIN",
    "/retailer/reports/payin": "PAYIN",
    "/retailer/recharge": "RECHARGE",
  };

  const isItemEnabled = useCallback(
    (item: { path: string; serviceCode?: string; parentServiceCode?: string }) => {
      const directCode = item.serviceCode || PATH_SERVICE_MAP[item.path];
      if (directCode && servicesStatus[directCode] === false) {
        return false;
      }
      if (item.parentServiceCode && servicesStatus[item.parentServiceCode] === false) {
        return false;
      }
      if (disabledSubmenus && disabledSubmenus.some((p) => item.path === p || (p !== "/retailer" && item.path.startsWith(p)))) {
        return false;
      }
      return true;
    },
    [servicesStatus, disabledSubmenus]
  );

  const toggleFavorite = (path: string, e: React.MouseEvent, itemLabel?: string, itemCategory?: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isItemEnabled({ path })) {
      return;
    }
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

  const navCategories = useMemo(() => [
    {
      title: "MAIN",
      items: [{ label: "Dashboard", path: "/retailer/dashboard", icon: DashboardIcon }],
    },
    {
      title: "PAYMENTS",
      items: [
        { label: "DMT", path: "/retailer/dmt", icon: SendIcon, serviceCode: "DMT" },
        { label: "Card to Cash", path: "/retailer/card-to-cash", icon: CreditCardIcon, serviceCode: "POS_TOPUP" },
        { label: "AEPS", path: "/retailer/aeps", icon: FingerprintIcon, serviceCode: "AEPS" },
        { label: "UPI", path: "/retailer/upi", icon: QrCodeIcon, serviceCode: "UPI" },
        { label: "BBPS", path: "/retailer/bbps", icon: ReceiptIcon, serviceCode: "BBPS" },
        { label: "PayIn (Add Money)", path: "/retailer/payin", icon: AddCardIcon, serviceCode: "PAYIN" },
        { label: "Recharge", path: "/retailer/recharge", icon: PhoneAndroidIcon, serviceCode: "RECHARGE" },
      ],
    },
    {
      title: "WALLET",
      items: [
        { label: "Wallet", path: "/retailer/wallet", icon: AccountBalanceWalletIcon },
        { label: "Wallet Top-up", path: "/retailer/wallet-topup", icon: AddCardIcon },
        { label: "Topup Request", path: "/retailer/topup-request", icon: CloudUploadIcon },
        { label: "Wallet Ledger", path: "/retailer/wallet-ledger", icon: ReceiptLongIcon },
      ],
    },
    {
      title: "CUSTOMERS & REPORTS",
      items: [
        { label: "Customers", path: "/retailer/customers", icon: PersonIcon },
        { label: "Beneficiaries", path: "/retailer/beneficiary", icon: ContactsIcon, parentServiceCode: "DMT" },
        { label: "PayIn Report", path: "/retailer/reports/payin-transactions", icon: AssessmentIcon, parentServiceCode: "PAYIN" },
        { label: "Payout Report", path: "/retailer/reports/payout-transactions", icon: ReceiptLongIcon, parentServiceCode: "DMT" },
        { label: "Transactions", path: "/retailer/reports/transactions", icon: AssessmentIcon },
        { label: "Settlement", path: "/retailer/reports/settlement", icon: PointOfSaleIcon, parentServiceCode: "POS_TOPUP" },
      ],
    },
    {
      title: "ACCOUNT",
      items: [
        { label: "Profile", path: "/retailer/profile", icon: PersonIcon },
        { label: "Settings", path: "/retailer/security", icon: ShieldIcon },
        { label: "Logout", path: "/logout", icon: LogoutIcon },
      ],
    },
  ], []);

  const visibleNavCategories = useMemo(() => {
    return navCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => isItemEnabled(item)),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [navCategories, isItemEnabled]);

  const handleDrawerToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1200) {
      setDesktopCollapsed((prev) => !prev);
    } else {
      setMobileOpen(!mobileOpen);
    }
  };

  const allNavItems = useMemo(() => visibleNavCategories.flatMap((c) => c.items), [visibleNavCategories]);
  const activeMenuItem = allNavItems.find((item) =>
    pathname === item.path || (item.path !== "/retailer-dashboard" && pathname?.startsWith(item.path))
  );

  const isCurrentPathDisabled = useMemo(() => {
    if (!pathname) return { disabled: false, serviceName: "" };
    for (const [path, code] of Object.entries(PATH_SERVICE_MAP)) {
      if (pathname === path || (path !== "/retailer" && pathname.startsWith(path))) {
        if (servicesStatus[code] === false) {
          return { disabled: true, serviceName: code };
        }
      }
    }
    if (disabledSubmenus && disabledSubmenus.some((p) => pathname === p || (p !== "/retailer" && pathname.startsWith(p)))) {
      const code = PATH_SERVICE_MAP[pathname] || "Service";
      return { disabled: true, serviceName: code };
    }
    return { disabled: false, serviceName: "" };
  }, [pathname, servicesStatus, disabledSubmenus]);

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
      {/* Brand Logo Header (72px) */}
      <Box
        sx={{
          height: 72,
          px: isCollapsed ? 1.5 : 2,
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          borderBottom: "1px solid #E2E8F0",
          bgcolor: "#FFFFFF",
        }}
      >
        <Link
          href="/retailer/dashboard"
          style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", minWidth: 0 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, cursor: "pointer" }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                bgcolor: "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              <Box
                component="img"
                src={appLogo}
                alt={appName}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  const target = e.currentTarget;
                  if (isSmsPay && !target.src.includes("smspay-logo.svg")) {
                    target.src = "/branding/smspay-logo.svg";
                  } else if (isPay2Pay && !target.src.includes("pay2pay-logo.png")) {
                    target.src = "/branding/pay2pay-logo.png";
                  } else if (isNear4You && !target.src.includes("logo.svg")) {
                    target.src = "/branding/logo.svg";
                  }
                }}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </Box>
            {!isCollapsed && (
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 900,
                    color: brandPrimary,
                    fontSize: "20px",
                    lineHeight: 1.15,
                    whiteSpace: "nowrap",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {appName.toUpperCase()}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#64748B",
                    fontWeight: 600,
                    fontSize: "12px",
                    display: "block",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.2px",
                  }}
                >
                  {appSubtitle}
                </Typography>
              </Box>
            )}
          </Box>
        </Link>

        {!isCollapsed && (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Tooltip title="Collapse Sidebar (72px)">
              <IconButton
                onClick={() => setDesktopCollapsed(true)}
                size="small"
                sx={{
                  display: { xs: "none", lg: "flex" },
                  color: "#64748B",
                  "&:hover": { backgroundColor: "#F1F5F9", color: "#0F172A" },
                }}
              >
                <ChevronLeftIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
            {/* Mobile Drawer Close Button */}
            <IconButton
              onClick={() => setMobileOpen(false)}
              size="small"
              aria-label="close drawer"
              sx={{
                display: { xs: "flex", lg: "none" },
                color: "#64748B",
                p: 0.5,
                "&:hover": { backgroundColor: "#F1F5F9", color: "#0F172A" },
              }}
            >
              <ClearIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* ── SEARCH MENU INPUT BAR ── */}
      {!isCollapsed && (
        <Box sx={{ px: 1.5, pb: 1, pt: 1 }}>
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
                    <SearchIcon sx={{ color: brandPrimary, fontSize: 16 }} />
                  </InputAdornment>
                ),
                endAdornment: menuSearchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setMenuSearchQuery("")} sx={{ p: 0.2, color: "#64748B" }}>
                      <ClearIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  height: 36,
                  fontSize: "12.5px",
                  color: "#0F172A",
                  borderRadius: "8px",
                  bgcolor: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  "& fieldset": { border: "none" },
                  "&:hover": { borderColor: brandPrimary },
                  "&.Mui-focused": { borderColor: brandPrimary, boxShadow: `0 0 0 2px ${brandPrimary}25`, bgcolor: "#FFFFFF" },
                },
              },
            }}
          />
        </Box>
      )}

      {/* Categorized Enterprise Navigation List */}
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
          const allItems = visibleNavCategories.flatMap((cat) => cat.items);
          const favItems = allItems.filter((i) => favorites.includes(i.path));
          if (favItems.length === 0) return null;

          return (
            <Box sx={{ mb: 1.5 }}>
              {!isCollapsed && (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", px: "14px", mb: 0.5 }}>
                  <StarIcon sx={{ color: "#F59E0B", fontSize: 13 }} />
                  <Typography variant="caption" sx={{ color: "#F59E0B", fontWeight: 800, fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px" }}>
                    FAVORITES
                  </Typography>
                </Stack>
              )}
              <Stack spacing={0.4}>
                {favItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = pathname === item.path || (item.path !== "/retailer-dashboard" && item.path !== "/retailer/dashboard" && pathname?.startsWith(item.path));
                  const favLocked = isPathLocked(item.path);

                  return (
                    <Tooltip key={`fav-${item.path}`} title={favLocked ? "Locked: Account verification pending admin approval" : isCollapsed ? item.label : ""} placement="right" arrow>
                      <Box
                        component={Link}
                        href={item.path}
                        prefetch={false}
                        onClick={(e: React.MouseEvent) => {
                          if (item.path === "/logout") {
                            e.preventDefault();
                            e.stopPropagation();
                            setMobileOpen(false);
                            setSmspayDrawerOpen(false);
                            logout();
                            return;
                          }
                          if (favLocked) {
                            e.preventDefault();
                            e.stopPropagation();
                            setLockedModalItem({ label: item.label, path: item.path });
                            return;
                          }
                          router.push(item.path);
                          setMobileOpen(false);
                          setSmspayDrawerOpen(false);
                        }}
                        sx={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                          height: 42,
                          borderRadius: "8px",
                          px: isCollapsed ? 0 : "12px",
                          justifyContent: isCollapsed ? "center" : "space-between",
                          backgroundColor: isActive ? brandLight : "transparent",
                          color: isActive ? brandPrimary : "#0F172A",
                          textDecoration: "none",
                          borderLeft: isActive ? `3.5px solid ${brandPrimary}` : "3.5px solid transparent",
                          transition: "all 0.15s ease",
                          "&:hover": { backgroundColor: isActive ? brandLight : "#F8FAFC", color: brandPrimary },
                          "&:hover .fav-star": { opacity: 1 },
                        }}
                      >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                          <IconComponent sx={{ fontSize: 20, color: isActive ? brandPrimary : "#F59E0B" }} />
                          {!isCollapsed && (
                            <Typography sx={{ fontSize: "13.5px", fontWeight: isActive ? 800 : 600, lineHeight: "20px", whiteSpace: "nowrap", color: isActive ? brandPrimary : "#0F172A" }}>
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
                                  backgroundColor: "#FEF3C7",
                                  color: "#D97706",
                                  border: "1px solid #FDE68A",
                                }}
                              />
                            )}
                            <IconButton
                              size="small"
                              className="fav-star"
                              onClick={(e) => toggleFavorite(item.path, e)}
                              sx={{ p: 0.3, color: "#F59E0B" }}
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
        {visibleNavCategories
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
                <Typography
                  variant="caption"
                  sx={{
                    color: "#64748B",
                    fontWeight: 800,
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    px: "14px",
                    display: "block",
                    mb: 0.5,
                  }}
                >
                  {cat.title}
                </Typography>
              )}
              <Stack spacing={0.4}>
                {cat.items.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = pathname === item.path || (item.path !== "/retailer/dashboard" && item.path !== "/retailer-dashboard" && pathname?.startsWith(item.path));
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
                          if (item.path === "/logout") {
                            e.preventDefault();
                            e.stopPropagation();
                            setMobileOpen(false);
                            setSmspayDrawerOpen(false);
                            logout();
                            return;
                          }
                          if (itemLocked) {
                            e.preventDefault();
                            e.stopPropagation();
                            setLockedModalItem({ label: item.label, path: item.path });
                            return;
                          }
                          router.push(item.path);
                          setMobileOpen(false);
                          setSmspayDrawerOpen(false);
                        }}
                        sx={{
                          position: "relative",
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                          height: 42,
                          borderRadius: "8px",
                          px: isCollapsed ? 0 : "12px",
                          justifyContent: isCollapsed ? "center" : "space-between",
                          backgroundColor: isActive ? brandLight : "transparent",
                          color: isActive ? brandPrimary : itemLocked ? "#94A3B8" : "#0F172A",
                          textDecoration: "none",
                          boxShadow: "none",
                          borderLeft: isActive ? `3.5px solid ${brandPrimary}` : "3.5px solid transparent",
                          transition: "all 0.15s ease",
                          "&:hover": {
                            backgroundColor: isActive ? brandLight : "#F8FAFC",
                            color: brandPrimary,
                          },
                          "&:hover .fav-star": { opacity: 1 },
                        }}
                      >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", minWidth: 0 }}>
                          <IconComponent sx={{ fontSize: 20, color: isActive ? brandPrimary : itemLocked ? "#CBD5E1" : "#475569" }} />
                          {!isCollapsed && (
                            <Typography
                              sx={{
                                fontSize: "13.5px",
                                fontWeight: isActive ? 800 : 600,
                                lineHeight: "20px",
                                whiteSpace: "nowrap",
                                color: isActive ? brandPrimary : itemLocked ? "#94A3B8" : "#0F172A",
                              }}
                            >
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
                                  backgroundColor: "#FEF3C7",
                                  color: "#D97706",
                                  border: "1px solid #FDE68A",
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
                                  backgroundColor: isActive ? brandPrimary : "#E2E8F0",
                                  color: isActive ? "#FFFFFF" : "#475569",
                                }}
                              />
                            )}

                            {item.path !== "/logout" && (
                              <IconButton
                                size="small"
                                className="fav-star"
                                onClick={(e) => toggleFavorite(item.path, e, item.label, cat.title)}
                                sx={{
                                  p: 0.3,
                                  color: isFav ? "#F59E0B" : "#CBD5E1",
                                  opacity: isFav ? 1 : 0.25,
                                  "&:hover": { opacity: 1, color: "#F59E0B" },
                                }}
                              >
                                {isFav ? <StarIcon sx={{ fontSize: 16 }} /> : <StarBorderIcon sx={{ fontSize: 16 }} />}
                              </IconButton>
                            )}
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

      <Divider sx={{ borderColor: "#E2E8F0" }} />

      {/* ── Logged-in Retailer Profile Footer at Bottom of Sidebar ── */}
      {!isCollapsed ? (
        <Box sx={{ p: 1.5, bgcolor: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
          <Paper
            elevation={0}
            onClick={(e) => setProfileAnchor(e.currentTarget)}
            sx={{
              p: 1.25,
              borderRadius: "10px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: brandPrimary,
                boxShadow: `0 2px 8px ${brandPrimary}20`,
              },
            }}
          >
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Avatar
                src={profileDetails.photo_url || outlet.avatar || undefined}
                sx={{
                  bgcolor: brandPrimary,
                  color: "#FFFFFF",
                  width: 38,
                  height: 38,
                  fontWeight: 900,
                  fontSize: "15px",
                  border: "2px solid #FFFFFF",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                }}
              >
                {(profileDetails.owner_name || profileDetails.retailer_name || outlet.ownerName || outlet.name || "S").charAt(0).toUpperCase()}
              </Avatar>
              <Box
                sx={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: "#10B981",
                  border: "2px solid #FFFFFF",
                }}
              />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  color: "#0F172A",
                  fontSize: "13px",
                  lineHeight: 1.25,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {profileDetails.owner_name && profileDetails.owner_name !== "Retailer Partner"
                  ? profileDetails.owner_name
                  : (outlet.ownerName && outlet.ownerName !== "Retailer Partner" ? outlet.ownerName : "Sathus Retailer 3")}
              </Typography>
              <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", mt: 0.2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "11px",
                    color: brandPrimary,
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  Online Retailer
                </Typography>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "10px" }}>•</Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "10.5px",
                    color: "#64748B",
                    fontWeight: 600,
                    fontFamily: "var(--font-geist-mono), monospace",
                    lineHeight: 1.2,
                  }}
                >
                  {profileDetails.retailer_code && profileDetails.retailer_code !== "RET-UNKNOWN"
                    ? profileDetails.retailer_code
                    : (outlet.code && outlet.code !== "RET-UNKNOWN" ? outlet.code : "P2P-R264322")}
                </Typography>
              </Stack>
            </Box>
          </Paper>
        </Box>
      ) : (
        <Box sx={{ py: 1.5, display: "flex", justifyContent: "center", borderTop: "1px solid #E2E8F0" }}>
          <Tooltip title={`${profileDetails.owner_name || "Retailer"} (${profileDetails.retailer_code || "P2P-R264322"})`} placement="right">
            <IconButton onClick={(e) => setProfileAnchor(e.currentTarget)} size="small">
              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={profileDetails.photo_url || outlet.avatar || undefined}
                  sx={{
                    bgcolor: brandPrimary,
                    color: "#FFFFFF",
                    width: 36,
                    height: 36,
                    fontWeight: 900,
                    fontSize: "14px",
                    border: "2px solid #FFFFFF",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  {(profileDetails.owner_name || profileDetails.retailer_name || outlet.ownerName || outlet.name || "S").charAt(0).toUpperCase()}
                </Avatar>
                <Box
                  sx={{
                    position: "absolute",
                    bottom: -1,
                    right: -1,
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    bgcolor: "#10B981",
                    border: "2px solid #FFFFFF",
                  }}
                />
              </Box>
            </IconButton>
          </Tooltip>
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
          width: { xs: "100%", lg: `calc(100% - ${activeDrawerWidth}px)` },
          ml: { xs: 0, lg: `${activeDrawerWidth}px` },
          background: isFinancialApp
            ? `${headerGradient} !important`
            : "#FFFFFF",
          backdropFilter: "blur(20px)",
          color: isFinancialApp ? "#FFFFFF" : "#0F172A",
          borderBottom: isFinancialApp ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #E2E8F0",
          zIndex: { xs: 1100, lg: (theme) => theme.zIndex.drawer + 1 },
          justifyContent: "center",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
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
          {/* Left: Menu Toggle + Brand Logo (SMSPAY) + Page Title + Search Input */}
          <Stack direction="row" spacing={{ xs: 0.5, sm: 1.5 }} sx={{ alignItems: "center", minWidth: 0, flexShrink: 1 }}>
            <Tooltip title={mobileOpen || smspayDrawerOpen ? "Close Menu" : "Open Menu"}>
              <IconButton
                edge="start"
                color="inherit"
                aria-label="toggle drawer"
                onClick={handleDrawerToggle}
                size="small"
                sx={{
                  p: { xs: 0.5, sm: 0.75 },
                  color: isSmsPay ? "#FFFFFF" : brandPrimary,
                  "&:hover": {
                    backgroundColor: isSmsPay ? "rgba(255, 255, 255, 0.15)" : brandLight,
                  },
                }}
              >
                <MenuIcon sx={{ fontSize: 22 }} />
              </IconButton>
            </Tooltip>

            {/* Brand Logo & Name (Shown in AppBar on mobile or when desktop drawer is collapsed for all 3 financial apps) */}
            {isFinancialApp && (
              <Link
                href="/retailer/dashboard"
                style={{ textDecoration: "none", color: "inherit", display: "contents" }}
              >
                <Box sx={{ display: { xs: "flex", lg: desktopCollapsed ? "flex" : "none" }, alignItems: "center", gap: 1.2, minWidth: 0, cursor: "pointer" }}>
                  <Box
                    component="img"
                    src={appLogo}
                    alt={appName}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      const target = e.currentTarget;
                      if (isSmsPay && !target.src.includes("smspay-logo.svg")) {
                        target.src = "/branding/smspay-logo.svg";
                      } else if (isPay2Pay && !target.src.includes("pay2pay-logo.png")) {
                        target.src = "/branding/pay2pay-logo.png";
                      } else if (isNear4You && !target.src.includes("logo.svg")) {
                        target.src = "/branding/logo.svg";
                      }
                    }}
                    sx={{
                      width: 30,
                      height: 30,
                      objectFit: "contain",
                      flexShrink: 0,
                    }}
                  />
                  <Box sx={{ display: { xs: "none", sm: "block" }, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        color: "#FFFFFF",
                        fontSize: "17px",
                        lineHeight: 1.15,
                        letterSpacing: "-0.5px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {appName}
                    </Typography>
                    <Typography
                      sx={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontWeight: 600,
                        fontSize: "10.5px",
                        lineHeight: 1.1,
                        letterSpacing: "0.2px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {appSubtitle}
                    </Typography>
                  </Box>
                </Box>
              </Link>
            )}

            {/* Universal Search Input Bar */}
            <Paper
              elevation={0}
              onClick={() => setUniversalSearchOpen(true)}
              sx={{
                p: "2px 10px",
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                width: 230,
                height: 34,
                borderRadius: "8px",
                backgroundColor: isFinancialApp ? "rgba(255, 255, 255, 0.12)" : "#F8FAFC",
                border: isFinancialApp ? "1px solid rgba(255, 255, 255, 0.22)" : "1px solid #E2E8F0",
                cursor: "pointer",
                backdropFilter: "none",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: isFinancialApp ? "rgba(255, 255, 255, 0.20)" : "#FFFFFF",
                  borderColor: isFinancialApp ? "#38BDF8" : brandPrimary,
                },
              }}
            >
              <SearchIcon sx={{ color: isFinancialApp ? "#FFFFFF" : brandPrimary, fontSize: 17, mr: 0.75 }} />
              <Typography variant="caption" sx={{ fontSize: "12px", color: isFinancialApp ? "rgba(255, 255, 255, 0.85)" : "#64748B", flex: 1, fontWeight: 500 }}>
                Universal Search...
              </Typography>
              <Chip
                label="Ctrl+K"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  bgcolor: isFinancialApp ? "rgba(255, 255, 255, 0.2)" : brandLight,
                  color: isFinancialApp ? "#FFFFFF" : brandPrimary,
                  border: isFinancialApp ? "1px solid rgba(255, 255, 255, 0.3)" : `1px solid ${brandPrimary}33`,
                }}
              />
            </Paper>
          </Stack>

          {/* Right: Soundbox, Wallet Balance, Notifications, Theme, Profile */}
          <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} sx={{ alignItems: "center", flexShrink: 0 }}>
            {/* Live Soundbox Toggle Button */}
            <Tooltip title="Live Soundbox Voice Alerts">
              <Button
                size="small"
                variant="contained"
                startIcon={<VolumeUpIcon sx={{ fontSize: 15 }} />}
                onClick={toggleSoundbox}
                sx={{
                  borderRadius: "20px",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  px: 1.5,
                  height: 32,
                  display: { xs: "none", lg: "inline-flex" },
                  backgroundColor: soundboxEnabled ? "#059669" : "#64748B",
                  color: "#FFFFFF",
                  border: "none",
                  boxShadow: soundboxEnabled ? "0 2px 4px rgba(5, 150, 105, 0.2)" : "none",
                  "&:hover": {
                    backgroundColor: soundboxEnabled ? "#047857" : "#475569",
                    boxShadow: "none",
                  },
                }}
              >
                {soundboxEnabled ? "SOUNDBOX ON" : "MUTED"}
              </Button>
            </Tooltip>

            {/* Wallet Balance Indicator Pill */}
            <Paper
              elevation={0}
              sx={{
                px: { xs: 0.8, sm: 1.4 },
                py: 0.3,
                borderRadius: "20px",
                bgcolor: isFinancialApp ? "rgba(255, 255, 255, 0.15)" : "#ECFDF5",
                border: isFinancialApp ? "1px solid rgba(255, 255, 255, 0.25)" : "1px solid #A7F3D0",
                backdropFilter: "none",
                display: "flex",
                alignItems: "center",
                gap: { xs: 0.5, sm: 0.8 },
                flexShrink: 0,
                height: { xs: 32, sm: 36 },
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                transition: "all 0.25s ease",
                "&:hover": {
                  bgcolor: isFinancialApp ? "rgba(255, 255, 255, 0.22)" : "#D1FAE5",
                  borderColor: isFinancialApp ? "#38BDF8" : "#059669",
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
                      width: { xs: 22, sm: 24 },
                      height: { xs: 22, sm: 24 },
                      borderRadius: "50%",
                      bgcolor: isFinancialApp ? "rgba(255, 255, 255, 0.2)" : "rgba(5, 150, 105, 0.12)",
                      border: isFinancialApp ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(5, 150, 105, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AccountBalanceWalletIcon sx={{ color: isFinancialApp ? "#FFFFFF" : "#059669", fontSize: { xs: 12, sm: 14 } }} />
                  </Box>

                  <Typography
                    variant="subtitle1"
                    suppressHydrationWarning
                    sx={{
                      fontWeight: 800,
                      color: isFinancialApp ? "#FFFFFF" : "#059669",
                      fontSize: { xs: "12px", sm: "14px" },
                      lineHeight: 1.1,
                      letterSpacing: "-0.2px",
                      fontFamily: "var(--font-geist-mono), 'Inter', monospace, sans-serif",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ₹{(wallet?.mainBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>

                  <KeyboardArrowDownIcon sx={{ color: isFinancialApp ? "rgba(255, 255, 255, 0.7)" : "#059669", fontSize: 16 }} />
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
                    color: isFinancialApp ? "#A7F3D0" : "#059669",
                    borderRadius: "50%",
                    "&:hover": {
                      bgcolor: isFinancialApp ? "rgba(255, 255, 255, 0.2)" : "rgba(5, 150, 105, 0.15)",
                    },
                  }}
                >
                  <RefreshIcon
                    sx={{
                      fontSize: 15,
                      animation: isSyncing ? "spin 1s linear infinite" : "none",
                      "@keyframes spin": { "100%": { transform: "rotate(360deg)" } },
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
                    color: isSmsPay ? "rgba(255, 255, 255, 0.85)" : "#64748B",
                    "&:hover": { color: "#FFFFFF", bgcolor: isSmsPay ? "rgba(255, 255, 255, 0.15)" : "#F1F5F9" },
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
                    color: isSmsPay ? "rgba(255, 255, 255, 0.85)" : effectiveTheme === "dark" ? "#94A3B8" : "#64748B",
                    p: 0.75,
                    "&:hover": {
                      color: "#F59E0B",
                      backgroundColor: isSmsPay ? "rgba(255, 255, 255, 0.15)" : effectiveTheme === "dark" ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.1)",
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
                    bgcolor: "#059669",
                    color: "#FFFFFF",
                    width: { xs: 30, sm: 34 },
                    height: { xs: 30, sm: 34 },
                    fontWeight: 800,
                    fontSize: { xs: "0.75rem", sm: "0.85rem" },
                    border: "2px solid #FFFFFF",
                    boxShadow: "0 2px 6px rgba(5, 150, 105, 0.4)",
                  }}
                >
                  {(profileDetails.owner_name || profileDetails.retailer_name || outlet.ownerName || outlet.name || "S").charAt(0).toUpperCase()}
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
                    borderRadius: "16px",
                    width: 320,
                    mt: 1.5,
                    p: "18px",
                    bgcolor: "#FFFFFF",
                    color: "#0F172A",
                    boxShadow: "0 12px 36px rgba(0, 0, 0, 0.12)",
                    border: "1px solid #E2E8F0",
                  },
                },
              }}
            >
              {/* Top Row: Avatar + Name & Badges */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                <Avatar
                  src={profileDetails.photo_url || outlet.avatar || undefined}
                  sx={{
                    width: 46,
                    height: 46,
                    bgcolor: brandPrimary,
                    color: "#FFFFFF",
                    fontWeight: 800,
                    fontSize: "1.2rem",
                    border: "2px solid #FFFFFF",
                    boxShadow: `0 4px 12px ${brandPrimary}33`,
                    flexShrink: 0,
                  }}
                >
                  {(profileDetails.retailer_name || profileDetails.owner_name || outlet.name || outlet.ownerName || "R").charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontSize: "15px", fontWeight: 800, color: "#0F172A", lineHeight: 1.2 }}>
                    {profileDetails.retailer_name || profileDetails.owner_name || outlet.name || outlet.ownerName || "—"}
                  </Typography>
                  {(profileDetails.company_name || branding?.display_name) && (
                    <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 700, color: brandPrimary, display: "block", mt: 0.25 }}>
                      {profileDetails.company_name || branding?.display_name}
                    </Typography>
                  )}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                    {profileDetails.plan_name && (
                      <Chip
                        icon={<WorkspacePremiumIcon sx={{ "&&": { color: "#F59E0B", fontSize: 13 } }} />}
                        label={profileDetails.plan_name}
                        size="small"
                        sx={{
                          backgroundColor: "#FEF3C7",
                          color: "#D97706",
                          fontWeight: 800,
                          fontSize: "0.65rem",
                          height: 20,
                          border: "1px solid #FDE68A",
                        }}
                      />
                    )}
                    <Chip
                      label="● Active Session"
                      size="small"
                      sx={{
                        backgroundColor: brandLight,
                        color: brandPrimary,
                        border: `1px solid ${brandPrimary}33`,
                        fontWeight: 800,
                        fontSize: "0.65rem",
                        height: 20,
                      }}
                    />
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ my: 1.5, borderColor: "#E2E8F0" }} />

              {/* Wallet Balance Display */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  WALLET BALANCE
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="h5" suppressHydrationWarning sx={{ fontSize: "22px", fontWeight: 800, color: brandPrimary, fontFamily: "monospace", lineHeight: 1.1 }}>
                    ₹{(wallet?.mainBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <IconButton size="small" onClick={() => syncBalance()} disabled={isSyncing} sx={{ p: 0.25 }}>
                    <RefreshIcon sx={{ fontSize: 16, color: brandPrimary, animation: isSyncing ? "spin 1s linear infinite" : "none" }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Details List */}
              <Stack spacing={1} sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Retailer ID</Typography>
                  <Chip
                    label={
                      profileDetails.retailer_code || outlet.code || "—"
                    }
                    size="small"
                    sx={{
                      backgroundColor: brandLight,
                      color: brandPrimary,
                      border: `1px solid ${brandPrimary}33`,
                      fontWeight: 800,
                      height: 20,
                      fontSize: "0.68rem",
                    }}
                  />
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Company</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#0F172A", fontWeight: 700, textAlign: "right", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {profileDetails.company_name || branding?.company_name || branding?.display_name || "Enterprise"}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Merchant Outlet</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#0F172A", fontWeight: 700, textAlign: "right", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {profileDetails.retailer_name || outlet.name || "—"}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Account Approval</Typography>
                  {(() => {
                    const statusVal = profileDetails.approval_status || outlet.approvalStatus || (isApproved ? "APPROVED" : "PENDING");
                    const isAppr = statusVal.toUpperCase() === "ACTIVE" || statusVal.toUpperCase() === "APPROVED";
                    return (
                      <Chip
                        icon={isAppr ? <ShieldIcon sx={{ "&&": { color: brandPrimary, fontSize: 12 } }} /> : <LockIcon sx={{ "&&": { color: "#F59E0B", fontSize: 12 } }} />}
                        label={statusVal}
                        size="small"
                        sx={{
                          backgroundColor: isAppr ? brandLight : "#FEF3C7",
                          color: isAppr ? brandPrimary : "#D97706",
                          border: isAppr ? `1px solid ${brandPrimary}33` : "1px solid #FDE68A",
                          fontWeight: 800,
                          height: 22,
                          fontSize: "0.68rem",
                        }}
                      />
                    );
                  })()}
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>KYC Status</Typography>
                  {(() => {
                    const kycVal = profileDetails.kyc_status || outlet.kycStatus || (isApproved ? "VERIFIED" : "PENDING");
                    const isKyc = kycVal.toUpperCase() === "VERIFIED" || kycVal.toUpperCase() === "APPROVED";
                    return (
                      <Chip
                        icon={<ShieldIcon sx={{ "&&": { color: isKyc ? brandPrimary : "#F59E0B", fontSize: 12 } }} />}
                        label={kycVal}
                        size="small"
                        sx={{
                          backgroundColor: isKyc ? brandLight : "#FEF3C7",
                          color: isKyc ? brandPrimary : "#D97706",
                          border: isKyc ? `1px solid ${brandPrimary}33` : "1px solid #FDE68A",
                          fontWeight: 800,
                          height: 20,
                          fontSize: "0.68rem",
                        }}
                      />
                    );
                  })()}
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Location</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#0F172A", fontWeight: 600, textAlign: "right", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {profileDetails.location || outlet.location || "—"}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#64748B", fontWeight: 600 }}>Last Login</Typography>
                  <Typography variant="caption" sx={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600 }}>
                    {formatLastLogin(profileDetails.last_login_at)}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ my: 1.5, borderColor: "#E2E8F0" }} />

              {/* Action Buttons */}
              <Stack spacing={1}>
                <Button
                  component={Link}
                  href="/retailer/profile"
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<PersonIcon sx={{ fontSize: 18, color: brandPrimary }} />}
                  onClick={() => {
                    setProfileAnchor(null);
                    router.push("/retailer/profile");
                  }}
                  sx={{
                    borderRadius: "10px",
                    height: 36,
                    fontWeight: 700,
                    textTransform: "none",
                    fontSize: "12px",
                    borderColor: brandPrimary,
                    color: brandPrimary,
                    "&:hover": {
                      borderColor: brandSecondary,
                      backgroundColor: brandLight,
                    },
                  }}
                >
                  View Full Profile
                </Button>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<LockIcon sx={{ fontSize: 18, color: "#F59E0B" }} />}
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
                    borderColor: "#F59E0B",
                    color: "#D97706",
                    backgroundColor: "#FEF3C7",
                    "&:hover": {
                      borderColor: "#D97706",
                      backgroundColor: "#FDE68A",
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
                    backgroundColor: brandPrimary,
                    color: "#FFFFFF",
                    "&:hover": {
                      backgroundColor: brandSecondary,
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
        {/* Slide-out Overlay Navigation Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", lg: "none" },
            zIndex: 1400,
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: { xs: 280, sm: 300 },
              maxWidth: "85vw",
              border: "none",
              boxShadow: "4px 0 24px rgba(0, 0, 0, 0.15)",
              zIndex: 1400,
            },
          }}
        >
          {renderDrawerContent(false)}
        </Drawer>

        {/* Desktop Permanent Collapsible Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", lg: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: activeDrawerWidth,
              border: "none",
              borderRight: "1px solid #E2E8F0",
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
          p: (pathname === "/retailer/dmt" || isPayInPage) ? 0 : { xs: 1.5, sm: 2.5, md: 3 },
          width: { xs: "100%", lg: `calc(100% - ${activeDrawerWidth}px)` },
          maxWidth: "100%",
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
          ) : isCurrentPathDisabled.disabled ? (
            <ServiceDownMaintenance
              service={isCurrentPathDisabled.serviceName}
              onRetry={fetchServicesStatus}
            />
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
                © {new Date().getFullYear()} {branding.legal_name || branding.company_name} · {branding.display_name} Retailer Portal
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

    {/* ── Manual Wallet Refresh Error Notification ─────────────────────────── */}
    <Snackbar
      open={Boolean(refreshErrorToast)}
      autoHideDuration={4000}
      onClose={() => setRefreshErrorToast(null)}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Alert onClose={() => setRefreshErrorToast(null)} severity="warning" variant="filled" sx={{ width: "100%", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
        {refreshErrorToast}
      </Alert>
    </Snackbar>
  </Box>
  );
};

export default RetailerLayout;

