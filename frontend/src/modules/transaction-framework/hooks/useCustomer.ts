import { useState, useCallback } from "react";
import apiClient from "@/lib/api";

export interface CustomerData {
  id: string;
  customerCode: string;
  name: string;
  mobile: string;
  kycStatus: "VERIFIED" | "PENDING" | "REJECTED";
  dailyLimitRemaining: number;
  monthlyLimitRemaining: number;
  preferredBank?: string;
  riskRating?: "LOW" | "MEDIUM" | "HIGH";
  walletBalance: number;
  relationshipManager?: string;
}

export function useCustomer() {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchCustomer = useCallback(async (query: string) => {
    const trimmedQuery = query ? query.trim() : "";
    if (!trimmedQuery) return;

    setIsSearching(true);
    setHasSearched(true);
    setError(null);

    try {
      // Execute API search call to backend endpoint
      const response = await apiClient.get("/customers/search", {
        params: { query: trimmedQuery },
      });

      const resData = response.data?.data || response.data;
      const c = Array.isArray(resData) && resData.length > 0 ? resData[0] : (resData && typeof resData === "object" && resData.id ? resData : null);

      if (c) {
        setSelectedCustomer({
          id: c.id || c.public_id,
          customerCode: c.customer_code || c.code || `CUS-${c.mobile?.slice(-4) || "0000"}`,
          name: c.full_name || c.name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Customer",
          mobile: c.mobile_number || c.mobile || trimmedQuery,
          kycStatus: c.kyc_status === "APPROVED" || c.kyc_status === "VERIFIED" ? "VERIFIED" : c.kyc_status || "PENDING",
          dailyLimitRemaining: Number(c.daily_limit_remaining ?? 0),
          monthlyLimitRemaining: Number(c.monthly_limit_remaining ?? 0),
          preferredBank: c.preferred_bank || c.bank_name,
          riskRating: c.risk_category || "LOW",
          walletBalance: Number(c.wallet_balance ?? 0),
          relationshipManager: c.relationship_manager || c.rm_name,
        });
      } else {
        setSelectedCustomer(null);
        setError("Customer Not Found");
      }
    } catch (err: any) {
      console.warn("Backend customer API lookup:", err);
      setSelectedCustomer(null);
      setError("Customer Not Found");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const resetCustomer = useCallback(() => {
    setSelectedCustomer(null);
    setHasSearched(false);
    setError(null);
  }, []);

  return { selectedCustomer, isSearching, hasSearched, error, searchCustomer, resetCustomer };
}
