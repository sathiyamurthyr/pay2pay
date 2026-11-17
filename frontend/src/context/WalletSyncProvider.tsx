import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import apiClient from "@/lib/api";
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
  photo_url?: string;
  avatar_url?: string;
  retailer_info?: any;
}

interface WalletSyncContextType {
  walletData: WalletDataPayload | null;
  isLoading: boolean;
  error: string | null;
  refreshWallet: () => Promise<void>;
}

const WalletSyncContext = createContext<WalletSyncContextType | undefined>(undefined);

export const triggerWalletSync = () => {
  // Manual trigger only — invokes the central syncBalance without interval/polling loops
  useRetailerStore.getState().syncBalance().catch(() => {});
};

const getInitialWalletData = (): WalletDataPayload | null => {
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem("p2p_header_wallet_cache");
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}
  }
  return null;
};

export const WalletSyncProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [walletData, setWalletData] = useState<WalletDataPayload | null>(getInitialWalletData);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Client-side hydration from sessionStorage on mount (zero network calls)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("p2p_header_wallet_cache");
        if (cached) {
          setWalletData(JSON.parse(cached));
        }
      } catch {}
    }
  }, []);

  // Synchronize with the central useRetailerStore manual events
  useEffect(() => {
    const handleRefreshed = (e: any) => {
      if (e.detail) {
        setWalletData(e.detail);
        setError(null);
      }
    };
    const handleError = (e: any) => {
      setError(e.detail?.message || "Failed to refresh wallet balance");
    };

    window.addEventListener("p2p_wallet_refreshed", handleRefreshed);
    window.addEventListener("p2p_wallet_refresh_error", handleError);
    return () => {
      window.removeEventListener("p2p_wallet_refreshed", handleRefreshed);
      window.removeEventListener("p2p_wallet_refresh_error", handleError);
    };
  }, []);

  const refreshWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await useRetailerStore.getState().syncBalance();
    } catch (err: any) {
      setError("Failed to synchronize wallet balance");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Intentionally NO useEffect on mount — balance refresh is strictly manual only
  // Intentionally NO automatic polling or setInterval loops
  // Intentionally NO window focus or visibility listeners

  return (
    <WalletSyncContext.Provider
      value={{
        walletData,
        isLoading,
        error,
        refreshWallet,
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
