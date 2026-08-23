import { useState, useCallback, useEffect } from "react";
import apiClient from "@/lib/api";
import { retailerApi } from "@/services/retailer-api";
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
  mpin_enabled?: boolean;
  category?: string;
  kycLevel?: string;
}

export function useCustomer() {
  // Pure in-memory state: always start with null customer on load
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear any legacy storage artifacts on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("pay2pay_transaction_memory");
        localStorage.removeItem("pay2pay_registered_customers");
        sessionStorage.removeItem("pay2pay_transaction_memory");
        sessionStorage.removeItem("pay2pay_registered_customers");
      } catch {}
    }
  }, []);

  const searchCustomer = useCallback(async (query: string) => {
    const trimmedQuery = query ? query.trim() : "";
    if (!trimmedQuery) {
      setSelectedCustomer(null);
      setHasSearched(false);
      setError(null);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setError(null);

    try {
      // Execute live API search directly against PostgreSQL backend
      const searchRes = await retailerApi.searchPayoutCustomer(trimmedQuery);
      const customers = searchRes && Array.isArray(searchRes.data) ? searchRes.data : [];

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
      } else {
        // Customer not found in database: show empty state card
        setSelectedCustomer(null);
        useTransactionMemoryStore.getState().setSelectedCustomer(null);
        setError("Customer Not Found");
      }
    } catch (err: any) {
      console.warn("Backend customer API lookup error:", err);
      setSelectedCustomer(null);
      useTransactionMemoryStore.getState().setSelectedCustomer(null);
      setError("Customer Not Found");
    } finally {
      setIsSearching(false);
    }
  }, []);

  const resetCustomer = useCallback(() => {
    setSelectedCustomer(null);
    useTransactionMemoryStore.getState().setSelectedCustomer(null);
    setHasSearched(false);
    setError(null);
  }, []);

  return { selectedCustomer, isSearching, hasSearched, error, searchCustomer, resetCustomer, setSelectedCustomer };
}
