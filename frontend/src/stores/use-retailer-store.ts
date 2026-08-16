"use client";

import { create } from "zustand";

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

export type KpiTheme = string;


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
  debitWallet: (amount: number) => number;
  syncBalance: () => Promise<void>;
  toggleSoundbox: () => void;
  setUnreadNotifications: (count: number) => void;
  setActiveDrawer: (drawer: string | null) => void;
  setKpiTheme: (theme: KpiTheme) => void;
  setApprovalStatus: (status: "APPROVED" | "PENDING" | "REJECTED" | "UNDER_REVIEW") => void;
}

const DEFAULT_RETAILER_ID = "ec273b33-d38e-4867-ac3b-f8e55ac46dcd";
const DEFAULT_TENANT_ID = "547aa7bb-a790-4fe2-bd5b-27214ed176c8";

const getInitialMainBalance = (): number => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("p2p_active_retailer_wallet_balance");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return 0.00;
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

const getInitialOutlet = (): RetailerOutlet => {
  const initApproval = getInitialApprovalStatus();
  let code = "RET-PENDING";
  let name = "Retailer Store";
  let ownerName = "Retailer Partner";
  let mobile = "";
  let email = "";
  let location = "";
  let id = "";

  if (typeof window !== "undefined") {
    try {
      const uStr = localStorage.getItem("user_info");
      if (uStr) {
        const u = JSON.parse(uStr);
        code = u.retailer_code || u.code || code;
        name = u.retailer_name || u.outlet_name || name;
        ownerName = u.full_name || u.owner_name || ownerName;
        mobile = u.mobile || u.mobile_number || mobile;
        email = u.email || email;
        location = u.location || location;
        id = u.id || u.retailer_id || id;
      }
    } catch {}
    code = localStorage.getItem("p2p_retailer_code") || localStorage.getItem("pay2pay_user_code") || code;
    ownerName = localStorage.getItem("p2p_retailer_name") || localStorage.getItem("pay2pay_user_name") || ownerName;
    mobile = localStorage.getItem("pay2pay_user_mobile") || localStorage.getItem("pay2pay_reg_mobile") || mobile;
    email = localStorage.getItem("pay2pay_user_email") || email;
  }

  return {
    id: id || code,
    code,
    name,
    ownerName,
    mobile,
    email,
    location,
    status: (initApproval === "APPROVED" ? "ACTIVE" : "PENDING_KYC") as "ACTIVE" | "PENDING_KYC" | "SUSPENDED",
    kycStatus: (initApproval === "APPROVED" ? "VERIFIED" : "PENDING") as "VERIFIED" | "PENDING" | "REJECTED",
    approvalStatus: initApproval,
    soundboxActive: true,
    soundboxLang: "en" as "en" | "hi" | "ta",
  };
};

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
  return {
    outlet: getInitialOutlet(),
    wallet: {
      mainBalance: getInitialMainBalance(),
      commissionBalance: 0.00,
      todayMargin: 0.00,
      todayTxnCount: 0,
      todaySettlement: 0.00,
      todaySuccessVol: 0.00,
      posPendingSettlement: 0.00,
      reservedBalance: 0.00,
      todayDebitVol: 0.00,
      todayReversalVol: 0.00,
      todayGstPaid: 0.00,
      todayTdsDeducted: 0.00,
      todayTransferVol: 0.00,
      availableBalance: getInitialMainBalance(),
    },
    isSyncing: false,
    soundboxEnabled: true,
    unreadNotifications: 0,
    activeDrawer: null,
    kpiTheme: getInitialTheme(),

    setSyncing: (syncing) => set({ isSyncing: syncing }),

    updateOutlet: (part: Partial<RetailerOutlet>) =>
      set((state) => ({ outlet: { ...state.outlet, ...part } })),

    updateWallet: (part: Partial<WalletState>) =>
      set((state) => {
        const nextWallet = { ...state.wallet, ...part };
        if (typeof nextWallet.mainBalance === "number" && typeof window !== "undefined") {
          localStorage.setItem("p2p_active_retailer_wallet_balance", nextWallet.mainBalance.toString());
        }
        return { wallet: nextWallet };
      }),

    debitWallet: (amount: number): number => {
      const { wallet } = get();
      if (wallet.mainBalance < amount) {
        throw new Error("Insufficient wallet balance.");
      }
      const newBal = Math.max(0, wallet.mainBalance - amount);
      get().updateWallet({ mainBalance: newBal });
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
