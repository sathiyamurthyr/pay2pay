import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import apiClient from "@/lib/api";
import { useRetailerStore } from "@/stores/use-retailer-store";

export interface WalletDataPayload {
  retailer_id: string;
  retailer_code: string;
  retailer_name: string;
  owner_name: string;
  short_name: string;
  wallet_balance: number;
  available_balance: number;
  blocked_balance: number;
  todays_debit: number;
  todays_credit: number;
  todays_commission: number;
  todays_gst: number;
  todays_tds: number;
  pending_count: number;
  settlement_pending_amount: number;
  soundbox_active: boolean;
  soundbox_lang: string;
  plan_name: string;
  is_approved: boolean;
  status: string;
  environment: string;
  updated_at: string;
  payout_rates?: any;
}

export interface WalletSyncContextType {
  walletData: WalletDataPayload | null;
  isLoading: boolean;
  error: string | null;
  refreshWallet: () => Promise<void>;
  updateBalanceLocally: (newBalance: number) => void;
}

const WalletSyncContext = createContext<WalletSyncContextType | undefined>(undefined);

export const triggerWalletSync = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("p2p_wallet_update"));
  }
};

export const WalletSyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [walletData, setWalletData] = useState<WalletDataPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // No auto-loader on page load
  const [error, setError] = useState<string | null>(null);

  const updateBalanceLocally = (newBalance: number) => {
    if (walletData) {
      setWalletData({ ...walletData, wallet_balance: newBalance });
    }
  };

  const fetchWalletData = useCallback(async () => {
    setIsLoading(true);
    try {
      let localName = "";
      let localCode = "";
      let activeRetailerId = "";
      if (typeof window !== "undefined") {
        try {
          const userStr =
            localStorage.getItem("user_info") ||
            localStorage.getItem("user") ||
            localStorage.getItem("auth_user") ||
            localStorage.getItem("pay2pay_user_data");
          if (userStr) {
            const u = JSON.parse(userStr);
            localName = u.full_name || u.name || u.owner_name || u.retailer_name || "";
            localCode = u.retailer_code || u.code || "";
            activeRetailerId = u.retailer_code || u.retailer_id || u.mobile || u.mobile_number || u.id || "";
          }
        } catch {}
        if (!localName) {
          localName = localStorage.getItem("p2p_retailer_name") || localStorage.getItem("pay2pay_reg_name") || localStorage.getItem("pay2pay_user_name") || "";
        }
        if (!localCode) {
          localCode = localStorage.getItem("p2p_retailer_code") || localStorage.getItem("pay2pay_user_code") || localStorage.getItem("pay2pay_reg_code") || "";
        }
        if (!activeRetailerId) {
          activeRetailerId =
            localStorage.getItem("p2p_active_retailer_id") ||
            localStorage.getItem("pay2pay_reg_mobile") ||
            localStorage.getItem("pay2pay_reg_id") ||
            "";
        }
      }

      let activeUserRefId: any = null;
      if (typeof window !== "undefined") {
        try {
          const userStr =
            localStorage.getItem("user_info") ||
            localStorage.getItem("user") ||
            localStorage.getItem("auth_user") ||
            localStorage.getItem("pay2pay_user_data");
          if (userStr) {
            const u = JSON.parse(userStr);
            activeUserRefId = u.user_ref_id || u.retailer_ref_id || u.ref_id || null;
          }
        } catch {}
      }

      const params: any = {};
      if (activeRetailerId) {
        params.retailer_id = activeRetailerId;
      }

      const res = await apiClient.get<WalletDataPayload>("/api/v1/payout/dashboard/retailer/header-wallet", {
        params,
      });

      let data = res.data;

      // Integrate standardized user wallet (/api/v1/wallet-ledger/user-wallet)
      try {
        const uParams: any = { user_type_ref_id: 2 };
        if (activeUserRefId) uParams.user_ref_id = activeUserRefId;
        if (activeRetailerId) uParams.retailer_id = activeRetailerId;
        const uWalletRes = await apiClient.get("/api/v1/wallet-ledger/user-wallet", { params: uParams });
        const uData = uWalletRes.data?.data || uWalletRes.data;
        if (uData && typeof uData.wallet_balance === "number") {
          data = {
            ...data,
            wallet_balance: uData.wallet_balance,
            available_balance: uData.wallet_balance,
            wallet_status: uData.wallet_status || "ACTIVE",
          };
        }
      } catch {}

      if (!data.retailer_name && localName) {
        const short = localName.trim().split(" ")[0] || localName;
        data = {
          ...data,
          owner_name: localName,
          retailer_name: localName,
          short_name: short,
        };
      }
      if (!data.retailer_code && localCode) {
        data = {
          ...data,
          retailer_code: localCode,
        };
      }

      // If user is logged in as Super Admin / Admin, ensure approval flag is active
      try {
        const userStr =
          localStorage.getItem("user_info") ||
          localStorage.getItem("user") ||
          localStorage.getItem("auth_user") ||
          localStorage.getItem("pay2pay_user_data");
        if (userStr) {
          const u = JSON.parse(userStr);
          const role = (u.role || u.user_type || u.role_code || "").toUpperCase();
          if (["SUPER_ADMIN", "ADMIN", "PLATFORM_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN"].includes(role)) {
            data = {
              ...data,
              is_approved: true,
              status: "ACTIVE",
            };
          }
        }
      } catch {}

      // Update useRetailerStore (in-memory cache only, no localStorage)
      if (typeof window !== "undefined") {
        const bal = typeof data.wallet_balance === "number" ? data.wallet_balance : (typeof data.available_balance === "number" ? data.available_balance : 0.0);
        const avail = typeof data.available_balance === "number" ? data.available_balance : bal;
        if (data.retailer_code || data.retailer_id) {
          localStorage.setItem("p2p_active_retailer_id", data.retailer_code || data.retailer_id);
        }
        useRetailerStore.getState().updateWallet({
          mainBalance: bal,
          availableBalance: avail,
          commissionBalance: data.todays_commission || 0.0,
          todayMargin: data.todays_commission || 0.0,
          todaySettlement: data.settlement_pending_amount || 0.0,
        });
      }

      setWalletData(data);
      setError(null);
    } catch (err: any) {
      console.warn("Wallet sync fetch error:", err);
      setError("Failed to synchronize wallet balance");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshWalletFast = useCallback(async () => {
    setIsLoading(true);
    try {
      let activeUserRefId: any = null;
      let activeRetailerId = "";
      if (typeof window !== "undefined") {
        try {
          const userStr =
            localStorage.getItem("user_info") ||
            localStorage.getItem("user") ||
            localStorage.getItem("auth_user") ||
            localStorage.getItem("pay2pay_user_data");
          if (userStr) {
            const u = JSON.parse(userStr);
            activeUserRefId = u.user_ref_id || u.retailer_ref_id || u.ref_id || null;
            activeRetailerId = u.retailer_code || u.retailer_id || u.mobile || u.mobile_number || u.id || "";
          }
        } catch {}
        if (!activeRetailerId) {
          activeRetailerId =
            localStorage.getItem("p2p_active_retailer_id") ||
            localStorage.getItem("pay2pay_reg_mobile") ||
            localStorage.getItem("pay2pay_reg_id") ||
            "";
        }
      }

      const params: any = { user_type_ref_id: 2 };
      if (activeUserRefId) params.user_ref_id = activeUserRefId;
      if (activeRetailerId) params.retailer_id = activeRetailerId;

      const res = await apiClient.get("/api/v1/wallet-ledger/user-wallet", { params });
      const rawData = res.data;
      const data = rawData.data || rawData;
      const bal =
        typeof data.wallet_balance === "number"
          ? data.wallet_balance
          : typeof data.balance === "number"
          ? data.balance
          : typeof data.available_balance === "number"
          ? data.available_balance
          : 0.0;
      const avail = typeof data.available_balance === "number" ? data.available_balance : bal;

      if (typeof window !== "undefined") {
        // Update in-memory store only (no localStorage)
        useRetailerStore.getState().updateWallet({
          mainBalance: bal,
          availableBalance: avail,
        });
      }

      setWalletData((prev) =>
        prev
          ? {
              ...prev,
              wallet_balance: bal,
              available_balance: avail,
              wallet_status: data.wallet_status || "ACTIVE",
            }
          : null
      );
      setError(null);
    } catch (err: any) {
      console.warn("Fast wallet sync error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on component mount
  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Event listener for explicit transaction action refreshes
  useEffect(() => {
    const handleCustomUpdate = () => {
      refreshWalletFast();
    };

    window.addEventListener("p2p_wallet_update", handleCustomUpdate);
    return () => window.removeEventListener("p2p_wallet_update", handleCustomUpdate);
  }, [refreshWalletFast]);

  return (
    <WalletSyncContext.Provider
      value={{
        walletData,
        isLoading,
        error,
        refreshWallet: refreshWalletFast,
        updateBalanceLocally,
      }}
    >
      {children}
    </WalletSyncContext.Provider>
  );
};

const DEFAULT_WALLET_FALLBACK: WalletSyncContextType = {
  walletData: null,
  isLoading: false,
  error: null,
  refreshWallet: async () => {},
  updateBalanceLocally: () => {},
};

export const useWalletSync = () => {
  const context = useContext(WalletSyncContext);
  if (!context) {
    return DEFAULT_WALLET_FALLBACK;
  }
  return context;
};
