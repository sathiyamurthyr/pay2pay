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
  kyc_status?: string;
  dailyLimitRemaining: number;
  monthlyLimitRemaining: number;
  preferredBank?: string;
  riskRating?: "LOW" | "MEDIUM" | "HIGH";
  walletBalance: number;
  relationshipManager?: string;
  mpin_enabled?: boolean;
  category?: string;
  customer_category?: string;
  kycLevel?: string;
  kyc_level?: string;
  photo_url?: string;
  photo_avatar?: string;
  aadhaar_verified?: boolean;
  aadhaarVerificationStatus?: "VERIFIED" | "PENDING" | "FAILED" | "NOT_VERIFIED";
  aadhaar_verification_status?: string;
  aadhaar_status?: string;
  aadhaarMasked?: string;
  aadhaar_masked?: string;
  full_address?: string;
  beneficiaries?: any[];
  monthly_remaining?: number;
  daily_remaining?: number;
}

export function useCustomer() {
  // Pure in-memory state: always start with null customer on load
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);


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
        const isAadhaarVerified = Boolean(
          c.aadhaar_verified === true ||
          String(c.aadhaar_verified).toLowerCase() === "true" ||
          (typeof c.aadhaar_verification_status === "string" && c.aadhaar_verification_status.toUpperCase() === "VERIFIED") ||
          (typeof c.aadhaarVerificationStatus === "string" && c.aadhaarVerificationStatus.toUpperCase() === "VERIFIED") ||
          (typeof c.aadhaar_status === "string" && c.aadhaar_status.toUpperCase() === "VERIFIED") ||
          (typeof c.kyc_status === "string" && (c.kyc_status.toUpperCase() === "VERIFIED" || c.kyc_status.toUpperCase() === "APPROVED")) ||
          (typeof c.kycStatus === "string" && (c.kycStatus.toUpperCase() === "VERIFIED" || c.kycStatus.toUpperCase() === "APPROVED")) ||
          (typeof c.kyc_level === "string" && c.kyc_level.toUpperCase() === "FULL_KYC") ||
          (typeof c.kycLevel === "string" && c.kycLevel.toUpperCase() === "FULL_KYC")
        );

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
          photo_url: c.photo_url || c.photo_avatar || c.profile_image_url || "",
          photo_avatar: c.photo_url || c.photo_avatar || c.profile_image_url || "",
          kycStatus: c.kyc_status === "APPROVED" || c.kyc_status === "VERIFIED" ? "VERIFIED" : (c.kyc_status || "VERIFIED"),
          kyc_status: c.kyc_status || "VERIFIED",
          kycLevel: c.kyc_level || "FULL_KYC",
          kyc_level: c.kyc_level || "FULL_KYC",
          category: c.customer_category || c.category || "REGULAR",
          dailyLimitRemaining: Number(c.daily_limit_remaining ?? c.daily_remaining ?? 25000),
          monthlyLimitRemaining: Number(c.monthly_limit_remaining ?? c.monthly_remaining ?? 200000),
          preferredBank: c.preferred_bank || c.bank_name || "IDBI Bank",
          riskRating: c.risk_category || "LOW",
          walletBalance: Number(currentWalletBal),
          relationshipManager: c.relationship_manager || c.rm_name || "Account Manager",
          mpin_enabled: c.mpin_enabled !== false,
          aadhaar_verified: isAadhaarVerified,
          aadhaarVerificationStatus: (isAadhaarVerified ? "VERIFIED" : "NOT_VERIFIED") as any,
          aadhaar_verification_status: isAadhaarVerified ? "VERIFIED" : "NOT_VERIFIED",
          aadhaar_status: isAadhaarVerified ? "VERIFIED" : "NOT_VERIFIED",
          aadhaarMasked: c.aadhaar_masked || c.masked_aadhaar || "",
          aadhaar_masked: c.aadhaar_masked || c.masked_aadhaar || "",
          full_address: c.full_address || "",
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
