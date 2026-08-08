import { useState, useCallback, useEffect } from "react";
import apiClient from "@/lib/api";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
import { useRetailerStore } from "@/stores/use-retailer-store";

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
      // 1. Execute API search call to backend endpoint
      const response = await apiClient.get("/customers/search", {
        params: { query: trimmedQuery },
      });

      // Requirement Debug Logs
      console.log("response:", response);
      console.log("response.data:", response.data);
      console.log("Array.isArray(response.data):", Array.isArray(response.data));
      
      // Read customers array from response.data.data or response.data
      const customers = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : [];

      console.log("response.data.length:", customers.length);

      // Explicit array length checks only
      if (customers.length > 0) {
        const c = customers[0];
        const custData: CustomerData = {
          id: c.id || c.public_id || `CUST-${c.mobile_number?.slice(-4) || "0000"}`,
          customerCode: c.customer_code || c.customer_number || `CUS-${c.mobile_number?.slice(-4) || "0245"}`,
          name: c.full_name || c.name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Customer",
          mobile: c.mobile_number || c.mobile || trimmedQuery,
          kycStatus: c.kyc_status === "APPROVED" || c.kyc_status === "VERIFIED" ? "VERIFIED" : c.kyc_status || "VERIFIED",
          dailyLimitRemaining: Number(c.daily_limit_remaining ?? c.daily_remaining ?? 25000),
          monthlyLimitRemaining: Number(c.monthly_limit_remaining ?? c.monthly_remaining ?? 200000),
          preferredBank: c.preferred_bank || c.bank_name || "HDFC Bank",
          riskRating: c.risk_category || "LOW",
          walletBalance: Number(useRetailerStore.getState().wallet.mainBalance),
          relationshipManager: c.relationship_manager || c.rm_name || "Vikram Singh",
        };
        setSelectedCustomer(custData);
        useTransactionMemoryStore.getState().setSelectedCustomer(custData);
        setError(null);
      } else if (customers.length === 0) {
        // Hide customer details card & trigger Customer NotFound empty state card
        setSelectedCustomer(null);
        setError("Customer Not Found");
      }
    } catch (err: any) {
      console.warn("Backend customer API lookup error:", err);
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

  // Auto-search customer query set by registration flow without exposing PII in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const autoQuery = sessionStorage.getItem("autoSearchQuery");
      if (autoQuery) {
        sessionStorage.removeItem("autoSearchQuery"); // Clear temporary PII immediately
        searchCustomer(autoQuery);
      }
    }
  }, [searchCustomer]);

  return { selectedCustomer, isSearching, hasSearched, error, searchCustomer, resetCustomer, setSelectedCustomer };
}
