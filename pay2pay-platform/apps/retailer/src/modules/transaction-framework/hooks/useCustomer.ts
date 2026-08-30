import { useState, useCallback, useEffect } from "react";
import apiClient from "@/lib/api";
import { retailerApi } from "@/services/retailer-api";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
import { useRetailerStore } from "@/stores/use-retailer-store";

export interface CustomerData {
  id: string;
  public_id?: string;
  customerCode: string;
  customer_number?: string;
  name: string;
  fullName?: string;
  mobile: string;
  mobile_number?: string;
  email?: string;
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
  beneficiaries?: any[];
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
        const currentWalletBal = useRetailerStore.getState()?.wallet?.mainBalance ?? 0;
        const custData: CustomerData = {
          id: c.public_id || c.id || `CUST-${c.mobile_number?.slice(-4) || "0000"}`,
          public_id: c.public_id || c.id,
          customerCode: c.customer_number || c.customer_code || `CUS-${c.mobile_number?.slice(-4) || "0245"}`,
          customer_number: c.customer_number || c.customer_code,
          name: c.full_name || c.name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Customer",
          fullName: c.full_name || c.name,
          mobile: c.mobile_number || c.mobile || trimmedQuery,
          mobile_number: c.mobile_number || c.mobile || trimmedQuery,
          email: c.email || "",
          kycStatus: c.kyc_status === "APPROVED" || c.kyc_status === "VERIFIED" ? "VERIFIED" : (c.kyc_status || "VERIFIED"),
          kycLevel: c.kyc_level || "FULL_KYC",
          category: c.customer_category || c.category || "REGULAR",
          dailyLimitRemaining: Number(c.daily_limit_remaining ?? c.daily_remaining ?? 25000),
          monthlyLimitRemaining: Number(c.monthly_limit_remaining ?? c.monthly_remaining ?? 200000),
          preferredBank: c.preferred_bank || c.bank_name || "IDBI Bank",
          riskRating: c.risk_category || "LOW",
          walletBalance: Number(currentWalletBal),
          relationshipManager: c.relationship_manager || c.rm_name || "Account Manager",
          mpin_enabled: c.mpin_enabled !== false,
          beneficiaries: c.beneficiaries || [],
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
