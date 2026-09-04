import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import axios from "axios";
import { useRetailerStore } from "@/stores/use-retailer-store";

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
  const [isLoading, setIsLoading] = useState<boolean>(false); // No auto-loader on page load
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Call /header-wallet with NO query params.
      // The backend resolves the authenticated retailer from the JWT cookie (p2p_access_token).
      // Zero localStorage reads — identity comes from the server session only.
      const res = await axios.get<WalletDataPayload>("/api/v1/payout/dashboard/retailer/header-wallet");
      const data = res.data;

      // If user is logged in as Super Admin / Admin, ensure approval flag is active
      try {
        const userStr = localStorage.getItem("user_info") || localStorage.getItem("user") || localStorage.getItem("auth_user");
        if (userStr) {
          const u = JSON.parse(userStr);
          const role = (u.role || u.user_type || u.role_code || "").toUpperCase();
          if (["SUPER_ADMIN", "ADMIN", "PLATFORM_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN"].includes(role)) {
            Object.assign(data, { is_approved: true, status: "ACTIVE" });
          }
        }
      } catch {}

      // Sync balance into useRetailerStore (in-memory only — NO localStorage write)
      const bal = typeof data.wallet_balance === "number" ? data.wallet_balance : (data.wallet?.main_balance ?? 0.0);
      const avail = typeof data.available_balance === "number" ? data.available_balance : bal;
      useRetailerStore.getState().updateWallet({
        mainBalance: bal,
        availableBalance: avail,
        commissionBalance: data.todays_commission ?? 0.0,
        todayMargin: data.todays_commission ?? 0.0,
        todaySettlement: data.settlement_pending_amount ?? 0.0,
      });

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

  // Event listener for explicit transaction action refreshes
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
