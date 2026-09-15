"use client";

import apiClient from "@/lib/api";
import { useRetailerStore } from "@/stores/use-retailer-store";

let cachedHeaderWalletData: any = null;
let lastHeaderWalletFetchTime = 0;
let inFlightHeaderWalletPromise: Promise<any> | null = null;
let initialLayoutFetchCompleted = false;

/**
 * Singleton Header Wallet Data fetcher with in-flight deduplication & in-memory caching.
 * Prevents multiple components from firing duplicate parallel network requests to /header-wallet.
 * Zero localStorage usage — identity resolved strictly from server session (p2p_access_token).
 */
export async function getCachedHeaderWalletData(forceRefresh = false): Promise<any> {
  const now = Date.now();
  if (!forceRefresh && cachedHeaderWalletData && now - lastHeaderWalletFetchTime < 60000) {
    return cachedHeaderWalletData;
  }
  if (inFlightHeaderWalletPromise) {
    return inFlightHeaderWalletPromise;
  }

  inFlightHeaderWalletPromise = (async () => {
    try {
      // Call /header-wallet with NO query params.
      // The backend resolves the authenticated retailer from the JWT cookie or Authorization header.
      const res = await apiClient.get(`/api/v1/payout/dashboard/retailer/header-wallet`);
      const data = res.data;
      cachedHeaderWalletData = data;
      lastHeaderWalletFetchTime = Date.now();

      // Sync into useRetailerStore in-memory state ONLY — NO localStorage write
      const bal = typeof data.wallet_balance === "number" ? data.wallet_balance : (data.wallet?.main_balance ?? 0.0);
      const avail = typeof data.available_balance === "number" ? data.available_balance : bal;
      const rInfo = data.retailer_info || data;
      const retCode = data.retailer_code || data.retailer_id || rInfo.retailer_code || rInfo.retailer_id || "";
      const photoUrl = data.photo_url || data.avatar_url || rInfo.photo_url || rInfo.avatar_url || "";

      useRetailerStore.getState().updateWallet({
        mainBalance: bal,
        availableBalance: avail,
        commissionBalance: data.todays_commission || 0.0,
        todayMargin: data.todays_commission || 0.0,
        todaySettlement: data.settlement_pending_amount || 0.0,
      });
      useRetailerStore.getState().updateOutlet({
        code: retCode || useRetailerStore.getState().outlet.code,
        name: rInfo.company_name || rInfo.retailer_name || data.retailer_name || useRetailerStore.getState().outlet.name,
        ownerName: rInfo.owner_name || data.owner_name || useRetailerStore.getState().outlet.ownerName,
        avatar: photoUrl || useRetailerStore.getState().outlet.avatar,
        photo_url: photoUrl || useRetailerStore.getState().outlet.photo_url,
        status: (rInfo.status || data.status || (rInfo.approval_status === "ACTIVE" ? "ACTIVE" : undefined)) || useRetailerStore.getState().outlet.status,
        kycStatus: (rInfo.kyc_status || data.kyc_status) || useRetailerStore.getState().outlet.kycStatus,
        approvalStatus: (rInfo.approval_status || data.approval_status || (rInfo.approve_status ? "APPROVED" : undefined)) || useRetailerStore.getState().outlet.approvalStatus,
        location: rInfo.location || data.location || useRetailerStore.getState().outlet.location,
      });

      return data;
    } finally {
      inFlightHeaderWalletPromise = null;
    }
  })();

  return inFlightHeaderWalletPromise;
}

export function isInitialLayoutFetchCompleted(): boolean {
  return initialLayoutFetchCompleted;
}

export function markInitialLayoutFetchCompleted(): void {
  initialLayoutFetchCompleted = true;
}
