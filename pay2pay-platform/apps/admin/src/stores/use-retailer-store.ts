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
      mobile: "+91 91766 69426",
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
        let activeRetailerId = "";
        let activeTenantId = "";
        if (typeof window !== "undefined") {
          try {
            const userStr = localStorage.getItem("user_info") || localStorage.getItem("user") || localStorage.getItem("auth_user");
            if (userStr) {
              const u = JSON.parse(userStr);
              activeRetailerId = u.retailer_id || u.id || "";
              activeTenantId = u.tenant_id || "";
            }
          } catch {}
          if (!activeRetailerId) {
            activeRetailerId = localStorage.getItem("p2p_active_retailer_id") || localStorage.getItem("pay2pay_reg_id") || "";
          }
          if (!activeTenantId) {
            activeTenantId = localStorage.getItem("p2p_tenant_id") || "";
          }
        }

        const params = new URLSearchParams();
        if (activeRetailerId) params.append("retailer_id", activeRetailerId);
        if (activeTenantId) params.append("tenant_id", activeTenantId);
        const queryStr = params.toString() ? `?${params.toString()}` : "";

        const apiUrl = `/api/v1/payout/dashboard/retailer/header-wallet${queryStr}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          const bal = typeof data.wallet_balance === "number" ? data.wallet_balance : 0.00;
          if (typeof window !== "undefined") {
            localStorage.setItem("p2p_active_retailer_wallet_balance", bal.toString());
          }
          set((state) => ({
            wallet: {
              ...state.wallet,
              mainBalance: bal,
              commissionBalance: data.todays_commission || 0.00,
              todayMargin: data.todays_commission || 0.00,
              todayTxnCount: 0,
              todaySettlement: data.settlement_pending_amount || 0.00,
            },
          }));
        }
      } catch (err) {
        console.warn("syncBalance fetch error:", err);
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
