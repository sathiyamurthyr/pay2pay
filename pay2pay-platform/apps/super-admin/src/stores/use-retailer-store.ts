"use client";

import { create } from "zustand";
import { retailerApi } from "@/services/retailer-api";

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

export type KpiTheme = "classic-blue" | "royal-gold" | "emerald-green" | "purple" | "dark" | "corporate-white";

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
  debitWallet: (amount: number) => number;
  syncBalance: () => Promise<void>;
  toggleSoundbox: () => void;
  setUnreadNotifications: (count: number) => void;
  setActiveDrawer: (drawer: string | null) => void;
  setKpiTheme: (theme: KpiTheme) => void;
  setApprovalStatus: (status: "APPROVED" | "PENDING" | "REJECTED" | "UNDER_REVIEW") => void;
}

const getInitialMainBalance = (): number => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("p2p_active_retailer_wallet_balance");
    if (saved && !isNaN(parseFloat(saved))) {
      return parseFloat(saved);
    }
  }
  return 48250.75;
};

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

export const useRetailerStore = create<RetailerStoreState>((set, get) => {
  const initApproval = getInitialApprovalStatus();
  return {
    outlet: {
      id: "RET-10829",
      code: "RET-0CFE2B",
      name: "Sri Venkateswara Telecom & FinTech",
      ownerName: "Sathiya Murthy",
      mobile: "+91 70139 14767",
      email: "sathiya@pay2pay.in",
      location: "Anna Salai, Chennai, TN",
      status: initApproval === "APPROVED" ? "ACTIVE" : "PENDING_KYC",
      kycStatus: initApproval === "APPROVED" ? "VERIFIED" : "PENDING",
      approvalStatus: initApproval,
      soundboxActive: true,
      soundboxLang: "en",
    },
    wallet: {
      mainBalance: getInitialMainBalance(),
      commissionBalance: 3420.50,
      todayMargin: 1480.00,
      todayTxnCount: 42,
      todaySettlement: 25000.00,
    },
    isSyncing: false,
    unreadNotifications: 3,
    soundboxEnabled: true,
    activeDrawer: null,
    kpiTheme: "classic-blue",

    setSyncing: (syncing) => set({ isSyncing: syncing }),
    
    updateWallet: (part) => {
      set((state) => {
        const updatedWallet = { ...state.wallet, ...part };
        if (part.mainBalance !== undefined && typeof window !== "undefined") {
          localStorage.setItem("p2p_active_retailer_wallet_balance", part.mainBalance.toString());
        }
        return { wallet: updatedWallet };
      });
    },

    debitWallet: (amount: number) => {
      const current = get().wallet.mainBalance;
      const newBal = Math.max(0, current - amount);
      if (typeof window !== "undefined") {
        localStorage.setItem("p2p_active_retailer_wallet_balance", newBal.toString());
      }
      set((state) => ({
        wallet: { ...state.wallet, mainBalance: newBal },
      }));
      retailerApi.debitWallet(amount).catch(() => {});
      return newBal;
    },

    syncBalance: async () => {
      set({ isSyncing: true });
      try {
        const data = await retailerApi.getWalletBalance();
        let newBalance = data && data.mainBalance !== undefined ? data.mainBalance : getInitialMainBalance();
        if (typeof window !== "undefined") {
          const saved = localStorage.getItem("p2p_active_retailer_wallet_balance");
          if (saved && !isNaN(parseFloat(saved))) {
            newBalance = parseFloat(saved);
          }
        }
        set((state) => ({
          wallet: {
            ...state.wallet,
            mainBalance: newBalance,
            commissionBalance: data?.commissionBalance ?? state.wallet.commissionBalance,
            todayMargin: data?.todayMargin ?? state.wallet.todayMargin,
            todayTxnCount: data?.todayTxnCount ?? state.wallet.todayTxnCount,
            todaySettlement: data?.todaySettlement ?? state.wallet.todaySettlement,
          },
        }));
      } catch {
        // Preserve local storage balance on API error
        const savedBalance = getInitialMainBalance();
        set((state) => ({
          wallet: { ...state.wallet, mainBalance: savedBalance },
        }));
      } finally {
        set({ isSyncing: false });
      }
    },

    toggleSoundbox: () => set((state) => ({ soundboxEnabled: !state.soundboxEnabled })),
    setUnreadNotifications: (count) => set({ unreadNotifications: count }),
    setActiveDrawer: (drawer) => set({ activeDrawer: drawer }),
    setKpiTheme: (theme) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("kpi_card_theme", theme);
      }
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
