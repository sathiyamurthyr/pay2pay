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
