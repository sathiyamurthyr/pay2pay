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
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const memCust = useTransactionMemoryStore.getState().selectedCustomer;
      if (!memCust) return null;
      if (
        memCust.name?.includes("Verified Payout Customer") ||
        memCust.full_name?.includes("Verified Payout Customer") ||
        memCust.customerCode === "CUST-65374" ||
        memCust.customerCode === "CUST-7374" ||
        memCust.customer_number === "CUST-65374" ||
        memCust.customer_number === "CUST-7374" ||
        memCust.mobile === "9884465374" ||
        memCust.mobile === "9884467374" ||
        memCust.mobile_number === "9884465374" ||
        memCust.mobile_number === "9884467374"
      ) {
        useTransactionMemoryStore.getState().setSelectedCustomer(null);
        try {
          localStorage.removeItem("pay2pay_transaction_memory");
          localStorage.removeItem("pay2pay_registered_customers");
        } catch {}
        return null;
      }
      return {
        id: memCust.id || memCust.public_id || `CUST-${memCust.mobile_number?.slice(-4) || memCust.mobile?.slice(-4) || "0000"}`,
        customerCode: memCust.customerCode || memCust.customer_code || memCust.customer_number || `CUST-${memCust.mobile || memCust.mobile_number || "0245"}`,
        name: memCust.name || memCust.full_name || "Customer",
        mobile: memCust.mobile || memCust.mobile_number || "",
        kycStatus: memCust.kycStatus === "APPROVED" || memCust.kycStatus === "VERIFIED" || memCust.kyc_status === "VERIFIED" ? "VERIFIED" : "VERIFIED",
        dailyLimitRemaining: Number(memCust.dailyLimitRemaining ?? memCust.daily_remaining ?? 25000),
        monthlyLimitRemaining: Number(memCust.monthlyLimitRemaining ?? memCust.monthly_remaining ?? 200000),
        preferredBank: memCust.preferredBank || memCust.bank_name || "HDFC Bank",
        riskRating: memCust.riskRating || "LOW",
        walletBalance: Number(useRetailerStore.getState().wallet.mainBalance),
        relationshipManager: memCust.relationshipManager || "Vikram Singh",
      };
    } catch {
      return null;
    }
  });
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return Boolean(useTransactionMemoryStore.getState().selectedCustomer);
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const searchCustomer = useCallback(async (query: string) => {
    const trimmedQuery = query ? query.trim() : "";
    if (!trimmedQuery) return;

    setIsSearching(true);
    setHasSearched(true);
    setError(null);

    try {
      // 1. Execute API search call to retailerApi.searchPayoutCustomer
      const searchRes = await retailerApi.searchPayoutCustomer(trimmedQuery);
      
      const customers = searchRes && Array.isArray(searchRes.data) ? searchRes.data : [];

      console.log("customers match count:", customers.length);

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
