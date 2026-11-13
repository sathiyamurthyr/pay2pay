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
  avatar?: string;
  photo_url?: string;
}

export interface WalletState {
  mainBalance: number;
  availableBalance: number;
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

const DEFAULT_WHITE_THEME: ThemeConfig = {
  id: "corporate-white",
  label: "Near4You Enterprise White",
  swatch: "#FFFFFF",
  headerBg: "#FFFFFF",
  headerText: "#292329",
  primaryColor: "#A20A3A",
  pageBg: "#FFFFFF",
  cardBg: "#FFFFFF",
  cardBorder: "#E8E2E5",
  textColor: "#292329",
  subtextColor: "#625B60",
  badgeBg: "#FFF0F4",
};

export const THEME_CONFIGS: Record<KpiTheme, ThemeConfig> = {
  "classic-blue": { ...DEFAULT_WHITE_THEME, id: "classic-blue" },
  "royal-gold": { ...DEFAULT_WHITE_THEME, id: "royal-gold", swatch: "#EDC11E", primaryColor: "#A20A3A" },
  "emerald-green": { ...DEFAULT_WHITE_THEME, id: "emerald-green", swatch: "#16A34A" },
  "purple": { ...DEFAULT_WHITE_THEME, id: "purple" },
  "dark": { ...DEFAULT_WHITE_THEME, id: "dark" },
  "corporate-white": { ...DEFAULT_WHITE_THEME, id: "corporate-white" },
};

export const applyThemeToDocument = (_themeId: KpiTheme) => {
  if (typeof window === "undefined") return;
  const config = DEFAULT_WHITE_THEME;
  const root = document.documentElement;
  root.style.setProperty("--p2p-header-bg", config.headerBg);
  root.style.setProperty("--p2p-header-text", config.headerText);
  root.style.setProperty("--p2p-primary-color", config.primaryColor);
  root.style.setProperty("--p2p-page-bg", config.pageBg);
  root.style.setProperty("--p2p-card-bg", config.cardBg);
  root.style.setProperty("--p2p-card-border", config.cardBorder);
  root.style.setProperty("--p2p-text-color", config.textColor);
  root.style.setProperty("--p2p-subtext-color", config.subtextColor);
  root.setAttribute("data-theme", "light");
  root.classList.add("light");
  root.classList.remove("dark");
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
  updateOutlet: (part: Partial<RetailerOutlet>) => void;
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
  name: "",
  ownerName: "",
  mobile: "",
  email: "",
  location: "",
  status: "ACTIVE",
  kycStatus: "VERIFIED",
  approvalStatus: "APPROVED",
  soundboxActive: true,
  soundboxLang: "en",
  avatar: "",
  photo_url: "",
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
      availableBalance: 0.00,
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
        const rInfo = rawData.retailer_info || rawData;
        const retCode = rawData.retailer_code || rawData.retailer_id || rInfo.retailer_code || rInfo.retailer_id || "";
        const photoUrl = rawData.photo_url || rawData.avatar_url || rInfo.photo_url || rInfo.avatar_url || "";
        const storeName = rawData.company_name || rawData.retailer_name || rInfo.company_name || rInfo.retailer_name || "";
        const ownerName = rawData.owner_name || rInfo.owner_name || "";
        const location = rawData.location || rInfo.location || "";
        const approvalStatus = rawData.approval_status || rInfo.approval_status || (rawData.approve_status ? "APPROVED" : undefined);
        const kycStatus = rawData.kyc_status || rInfo.kyc_status;
        const status = rawData.status || rInfo.status || (approvalStatus === "ACTIVE" || approvalStatus === "APPROVED" ? "ACTIVE" : undefined);

        set((state) => ({
          wallet: {
            ...state.wallet,
            mainBalance: bal,
            availableBalance: avail,
            commissionBalance: rawData.todays_commission ?? state.wallet.commissionBalance,
            todayMargin: rawData.todays_commission ?? state.wallet.todayMargin,
            todaySettlement: rawData.settlement_pending_amount ?? state.wallet.todaySettlement,
          },
          outlet: {
            ...state.outlet,
            code: retCode || state.outlet.code,
            name: storeName || state.outlet.name,
            ownerName: ownerName || state.outlet.ownerName,
            avatar: photoUrl || state.outlet.avatar,
            photo_url: photoUrl || state.outlet.photo_url,
            location: location || state.outlet.location,
            approvalStatus: (approvalStatus as any) || state.outlet.approvalStatus,
            kycStatus: (kycStatus as any) || state.outlet.kycStatus,
            status: (status as any) || state.outlet.status,
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
