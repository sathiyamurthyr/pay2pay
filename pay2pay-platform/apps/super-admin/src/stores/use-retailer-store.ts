"use client";

import { create } from "zustand";
import apiClient from "@/lib/api";
import { retailerApi } from "@/services/retailer-api";

export type KpiTheme = "classic-blue" | "royal-gold" | "emerald-green" | "purple" | "dark" | "corporate-white";

export interface RetailerOutlet {
  id: string;
  code: string;
  name: string;
  ownerName: string;
  mobile: string;
  email: string;
  location: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING_KYC";
  kycStatus: "VERIFIED" | "PENDING" | "REJECTED";
  approvalStatus: "APPROVED" | "PENDING" | "REJECTED" | "UNDER_REVIEW";
  soundboxActive: boolean;
  soundboxLang: "hi" | "en" | "ta";
}

export interface WalletState {
  mainBalance: number;
  commissionBalance: number;
  todayMargin: number;
  todayTxnCount: number;
  todaySettlement: number;
}

export interface ThemeConfig {
  id: KpiTheme;
  label: string;
  swatch: string;
  headerBg: string;
  headerText: string;
  primaryColor: string;
  pageBg: string;
  cardBg: string;
  cardBorder: string;
  textColor: string;
  subtextColor: string;
  badgeBg: string;
}

export const THEME_CONFIGS: Record<KpiTheme, ThemeConfig> = {
  "classic-blue": {
    id: "classic-blue",
    label: "Classic Blue",
    swatch: "#2563EB",
    headerBg: "#0B1528",
    headerText: "#FFFFFF",
    primaryColor: "#2563EB",
    pageBg: "#060D1B",
    cardBg: "rgba(18, 27, 48, 0.85)",
    cardBorder: "rgba(255, 255, 255, 0.12)",
    textColor: "#F8FAFC",
    subtextColor: "#94A3B8",
    badgeBg: "rgba(37, 99, 235, 0.2)",
  },
  "royal-gold": {
    id: "royal-gold",
    label: "Royal Gold",
    swatch: "#FFD54F",
    headerBg: "#1C1405",
    headerText: "#FEF3C7",
    primaryColor: "#D97706",
    pageBg: "#120D03",
    cardBg: "rgba(36, 25, 6, 0.85)",
    cardBorder: "rgba(251, 191, 36, 0.25)",
    textColor: "#FEF3C7",
    subtextColor: "#FDE68A",
    badgeBg: "rgba(217, 119, 6, 0.2)",
  },
  "emerald-green": {
    id: "emerald-green",
    label: "Emerald Green",
    swatch: "#16A34A",
    headerBg: "#041B12",
    headerText: "#D1FAE5",
    primaryColor: "#059669",
    pageBg: "#02120B",
    cardBg: "rgba(6, 36, 24, 0.85)",
    cardBorder: "rgba(52, 211, 153, 0.25)",
    textColor: "#ECFDF5",
    subtextColor: "#A7F3D0",
    badgeBg: "rgba(5, 150, 105, 0.2)",
  },
  "purple": {
    id: "purple",
    label: "Purple Velvet",
    swatch: "#7C3AED",
    headerBg: "#160B29",
    headerText: "#EDE9FE",
    primaryColor: "#7C3AED",
    pageBg: "#0D061A",
    cardBg: "rgba(30, 15, 54, 0.85)",
    cardBorder: "rgba(167, 139, 250, 0.25)",
    textColor: "#F5F3FF",
    subtextColor: "#C4B5FD",
    badgeBg: "rgba(124, 58, 237, 0.2)",
  },
  "dark": {
    id: "dark",
    label: "Dark Onyx",
    swatch: "#0F172A",
    headerBg: "#0B0F19",
    headerText: "#FFFFFF",
    primaryColor: "#38BDF8",
    pageBg: "#050810",
    cardBg: "rgba(15, 23, 42, 0.9)",
    cardBorder: "rgba(255, 255, 255, 0.15)",
    textColor: "#F8FAFC",
    subtextColor: "#94A3B8",
    badgeBg: "rgba(56, 189, 248, 0.2)",
  },
  "corporate-white": {
    id: "corporate-white",
    label: "Corporate White",
    swatch: "#FFFFFF",
    headerBg: "#FFFFFF",
    headerText: "#0F172A",
    primaryColor: "#2563EB",
    pageBg: "#F1F5F9",
    cardBg: "#FFFFFF",
    cardBorder: "#E2E8F0",
    textColor: "#0F172A",
    subtextColor: "#64748B",
    badgeBg: "rgba(37, 99, 235, 0.1)",
  },
};

export const applyThemeToDocument = (themeId: KpiTheme) => {
  if (typeof window === "undefined") return;
  const config = THEME_CONFIGS[themeId] || THEME_CONFIGS["classic-blue"];
  const root = document.documentElement;
  root.style.setProperty("--p2p-header-bg", config.headerBg);
  root.style.setProperty("--p2p-header-text", config.headerText);
  root.style.setProperty("--p2p-primary-color", config.primaryColor);
  root.style.setProperty("--p2p-page-bg", config.pageBg);
  root.style.setProperty("--p2p-card-bg", config.cardBg);
  root.style.setProperty("--p2p-card-border", config.cardBorder);
  root.style.setProperty("--p2p-text-color", config.textColor);
  root.style.setProperty("--p2p-subtext-color", config.subtextColor);
  root.setAttribute("data-theme", themeId);
};

interface RetailerStoreState {
  outlet: RetailerOutlet;
  wallet: WalletState;
  isSyncing: boolean;
  unreadNotifications: number;
  soundboxEnabled: boolean;
  activeDrawer: string | null;
  kpiTheme: KpiTheme;
  // Actions
  setSyncing: (syncing: boolean) => void;
  updateWallet: (part: Partial<WalletState>) => void;
  setWalletBalance: (balance: number) => void;
  debitWallet: (amount: number) => number;
  syncBalance: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  toggleSoundbox: () => void;
  setUnreadNotifications: (count: number) => void;
  setActiveDrawer: (drawer: string | null) => void;
  setKpiTheme: (theme: KpiTheme) => void;
  setApprovalStatus: (status: "APPROVED" | "PENDING" | "REJECTED" | "UNDER_REVIEW") => void;
}

// Wallet balance is NOT persisted to localStorage.
// It is always synced live from the API via syncBalance() or WalletSyncProvider.
// This prevents stale cached balances from misleading users or transaction logic.

const DEFAULT_RETAILER_ID = "";
const DEFAULT_TENANT_ID = "93538c98-0b19-493c-a247-4cdb02a46c68";

const getInitialApprovalStatus = (): "APPROVED" | "PENDING" | "REJECTED" | "UNDER_REVIEW" => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("p2p_retailer_approval_status");
    if (saved && ["APPROVED", "PENDING", "REJECTED", "UNDER_REVIEW"].includes(saved)) {
      return saved as any;
    }
    const onboardStatus = localStorage.getItem("pay2pay_onboarding_status");
    if (onboardStatus === "APPROVED") return "APPROVED";
    if (onboardStatus === "REJECTED") return "REJECTED";
    if (onboardStatus === "UNDER_REVIEW") return "UNDER_REVIEW";
  }
  return "PENDING";
};

const getInitialOutlet = (): RetailerOutlet => ({
  id: "",
  code: "",
  name: "Retailer Store",
  ownerName: "Retailer Partner",
  mobile: "",
  email: "",
  location: "India",
  status: "ACTIVE",
  kycStatus: "VERIFIED",
  approvalStatus: "APPROVED",
  soundboxActive: true,
  soundboxLang: "en",
});


const getInitialTheme = (): KpiTheme => {
  if (typeof window !== "undefined") {
    const saved = (localStorage.getItem("kpi_card_theme") || localStorage.getItem("pay2pay_app_theme")) as KpiTheme;
    if (saved && THEME_CONFIGS[saved]) {
      applyThemeToDocument(saved);
      return saved;
    }
  }
  return "classic-blue";
};

export const useRetailerStore = create<RetailerStoreState>((set, get) => {
  const initApproval = getInitialApprovalStatus();
  return {
    outlet: getInitialOutlet(),
    wallet: {
      mainBalance: 0.00, // Always starts at 0; syncBalance() or WalletSyncProvider populates live value
      commissionBalance: 0.00,
      todayMargin: 0.00,
      todayTxnCount: 0,
      todaySettlement: 0.00,
    },
    isSyncing: false,
    unreadNotifications: 0,
    soundboxEnabled: true,
    activeDrawer: null,
    kpiTheme: getInitialTheme(),

    setSyncing: (syncing) => set({ isSyncing: syncing }),
    
    updateOutlet: (part: Partial<RetailerOutlet>) =>
      set((state) => ({ outlet: { ...state.outlet, ...part } })),

    updateWallet: (part) => {
      set((state) => {
        const updatedWallet = { ...state.wallet, ...part };
        // No localStorage write — wallet is always fetched from the live API
        return { wallet: updatedWallet };
      });
    },

    setWalletBalance: (balance: number) => {
      set((state) => ({
        wallet: {
          ...state.wallet,
          mainBalance: balance,
          availableBalance: balance,
        },
      }));
    },

    debitWallet: (amount: number) => {
      const current = get().wallet.mainBalance;
      const newBal = Math.max(0, current - amount);
      set((state) => ({
        wallet: { ...state.wallet, mainBalance: newBal, availableBalance: newBal },
      }));
      return newBal;
    },

    syncBalance: async () => {
      set({ isSyncing: true });
      try {
        // Call /header-wallet with NO params — backend resolves the authenticated retailer
        // from the JWT cookie (p2p_access_token). Zero localStorage reads.
        const res = await apiClient.get("/api/v1/payout/dashboard/retailer/header-wallet");
        const rawData = res.data;
        const walletObj = rawData.wallet || rawData;
        const bal =
          typeof rawData.wallet_balance === "number"
            ? rawData.wallet_balance
            : typeof walletObj.main_balance === "number"
            ? walletObj.main_balance
            : typeof walletObj.wallet_balance === "number"
            ? walletObj.wallet_balance
            : 0.00;
        const avail =
          typeof rawData.available_balance === "number"
            ? rawData.available_balance
            : bal;

        // In-memory only — NO localStorage write
        set((state) => ({
          wallet: {
            ...state.wallet,
            mainBalance: bal,
            availableBalance: avail,
            commissionBalance: rawData.todays_commission ?? state.wallet.commissionBalance,
            todayMargin: rawData.todays_commission ?? state.wallet.todayMargin,
            todaySettlement: rawData.settlement_pending_amount ?? state.wallet.todaySettlement,
          },
        }));
      } catch (err) {
        console.warn("syncBalance fetch error:", err);
      } finally {
        set({ isSyncing: false });
      }
    },
    refreshBalances: async () => {
      try {
        await get().syncBalance();
      } catch (err) {
        console.warn("refreshBalances error:", err);
      }
    },

    toggleSoundbox: () => set((state) => ({ soundboxEnabled: !state.soundboxEnabled })),
    setUnreadNotifications: (count) => set({ unreadNotifications: count }),
    setActiveDrawer: (drawer) => set({ activeDrawer: drawer }),
    setKpiTheme: (theme) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("kpi_card_theme", theme);
        localStorage.setItem("pay2pay_app_theme", theme);
      }
      applyThemeToDocument(theme);
      set({ kpiTheme: theme });
    },
    setApprovalStatus: (newStatus) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("p2p_retailer_approval_status", newStatus);
      }
      set((state) => ({
        outlet: {
          ...state.outlet,
          approvalStatus: newStatus,
          status: newStatus === "APPROVED" ? "ACTIVE" : "PENDING_KYC",
          kycStatus: newStatus === "APPROVED" ? "VERIFIED" : "PENDING",
        },
      }));
    },
  };
});
