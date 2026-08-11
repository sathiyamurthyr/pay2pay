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
}

interface WalletSyncContextType {
  walletData: WalletDataPayload | null;
  isLoading: boolean;
  error: string | null;
  refreshWallet: () => Promise<void>;
}

const DEFAULT_RETAILER_ID = "f89239b5-4dbb-41a9-9ba7-0f97580c9368";
const DEFAULT_TENANT_ID = "93538c98-0b19-493c-a247-4cdb02a46c68";

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
      const res = await axios.get<WalletDataPayload>("/api/v1/payout/dashboard/retailer/header-wallet", {
        params: {
          retailer_id: DEFAULT_RETAILER_ID,
          tenant_id: DEFAULT_TENANT_ID,
        },
      });
      setWalletData(res.data);
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
