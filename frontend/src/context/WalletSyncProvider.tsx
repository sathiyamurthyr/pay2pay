import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import axios from "axios";

export interface WalletDataPayload {
  greeting: string;
  short_name: string;
  retailer_name: string;
  owner_name: string;
  company_name: string;
  retailer_code: string;
  retailer_id: string;
  current_time_iso: string;
  wallet_balance: number;
  available_balance: number;
  blocked_balance: number;
  todays_debit: number;
  todays_credit: number;
  todays_commission: number;
  todays_gst: number;
  todays_tds: number;
  settlement_pending_amount: number;
  unread_notifications_count: number;
  is_approved?: boolean;
  status?: string;
}

interface WalletSyncContextType {
  walletData: WalletDataPayload | null;
  isLoading: boolean;
  error: string | null;
  refreshWallet: () => Promise<void>;
}

const WalletSyncContext = createContext<WalletSyncContextType | undefined>(undefined);

export const triggerWalletSync = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("p2p_wallet_update"));
  }
};

export const WalletSyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [walletData, setWalletData] = useState<WalletDataPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = useCallback(async () => {
    try {
      let localName = "";
      let localCode = "";
      let activeRetailerId = "";
      if (typeof window !== "undefined") {
        try {
          const userStr = localStorage.getItem("user_info") || localStorage.getItem("user") || localStorage.getItem("auth_user");
          if (userStr) {
            const u = JSON.parse(userStr);
            localName = u.full_name || u.name || u.owner_name || u.retailer_name || "";
            localCode = u.retailer_code || u.code || "";
            activeRetailerId = u.retailer_id || u.id || "";
          }
        } catch {}
        if (!localName) {
          localName = localStorage.getItem("p2p_retailer_name") || localStorage.getItem("pay2pay_reg_name") || localStorage.getItem("pay2pay_user_name") || "";
        }
        if (!localCode) {
          localCode = localStorage.getItem("p2p_retailer_code") || localStorage.getItem("pay2pay_user_code") || localStorage.getItem("pay2pay_reg_code") || "";
        }
        if (!activeRetailerId) {
          activeRetailerId = localStorage.getItem("p2p_active_retailer_id") || localStorage.getItem("pay2pay_reg_id") || "";
        }
      }

      const params: any = {};
      if (activeRetailerId) {
        params.retailer_id = activeRetailerId;
      }

      const res = await axios.get<WalletDataPayload>("/api/v1/payout/dashboard/retailer/header-wallet", {
        params,
      });

      let data = res.data;
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
        const userStr = localStorage.getItem("user_info") || localStorage.getItem("user") || localStorage.getItem("auth_user");
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

      setWalletData(data);
      setError(null);
    } catch (err: any) {
      console.warn("Wallet sync fetch error:", err);
      setError("Failed to synchronize wallet balance");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on component mount
  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Event listener for instant financial action refreshes
  useEffect(() => {
    const handleCustomUpdate = () => {
      fetchWalletData();
    };

    window.addEventListener("p2p_wallet_update", handleCustomUpdate);
    return () => window.removeEventListener("p2p_wallet_update", handleCustomUpdate);
  }, [fetchWalletData]);

  return (
    <WalletSyncContext.Provider
      value={{
        walletData,
        isLoading,
        error,
        refreshWallet: fetchWalletData,
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
};

export const useWalletSync = () => {
  const context = useContext(WalletSyncContext);
  if (!context) {
    return DEFAULT_WALLET_FALLBACK;
  }
  return context;
};
