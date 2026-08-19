import { useState, useEffect } from "react";
import apiClient from "@/lib/api";
import { retailerApi } from "@/services/retailer-api";
import { CustomerData } from "./useCustomer";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";

export interface TransactionRecord {
  id: string;
  date: string;
  time: string;
  amount: number;
  status: "SUCCESS" | "FAILED" | "PENDING";
  reference: string;
  channel: string;
  settlementTime: string;
}

export interface BeneficiaryData {
  id: string;
  beneficiaryCode?: string;
  name: string;
  relationship?: string;
  accountNumber: string;
  maskedAccountNumber?: string;
  ifsc: string;
  branchName?: string;
  bankName: string;
  isVerified: boolean;
  isFavorite: boolean;
  lastUsedAt?: string;
  transferCount?: number;
  status?: string;
  preferredGateway?: string;
  dailyUsage?: number;
  monthlyUsage?: number;
  dailyRemaining?: number;
  monthlyRemaining?: number;
  monthlyLimit?: number;
  todayReceived?: number;
  todayRemaining?: number;
  riskScore?: number;
  avgTransfer?: number;
  lastTransferAmount?: number;
  lastTransferDate?: string;
  createdDate?: string;
  recentTransactions?: TransactionRecord[];
  notes?: string;
}

export function useBeneficiary(selectedCustomer: CustomerData | null) {
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryData[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Immediately clear beneficiary list when customer changes
    setBeneficiaries([]);
    setSelectedBeneficiary(null);
    setError(null);

    if (!selectedCustomer || !selectedCustomer.id) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchBeneficiaries = async () => {
      try {
        // Multi-tenant parameters: tenant_id, company_id, store_id, customer_id
        const tenantId = typeof window !== "undefined" ? localStorage.getItem("p2p_tenant_id") || "tenant_default" : "tenant_default";
        const companyId = typeof window !== "undefined" ? localStorage.getItem("p2p_company_id") || "company_default" : "company_default";
        const storeId = typeof window !== "undefined" ? localStorage.getItem("p2p_store_id") || "store_default" : "store_default";
        const customerLookupId =
          (selectedCustomer as any).public_id ||
          selectedCustomer.id ||
          (selectedCustomer as any).customer_number ||
          (selectedCustomer as any).mobile_number ||
          selectedCustomer.mobile ||
          "";

        const response = await apiClient.get("/beneficiaries", {
          params: {
            tenant_id: tenantId,
            company_id: companyId,
            store_id: storeId,
            customer_id: customerLookupId,
            status: "ACTIVE",
            is_deleted: false,
          },
        });

        const resData = response.data?.data || response.data;

        if (isMounted) {
          const custId = customerLookupId || "cust-default";
          let userAddedList: BeneficiaryData[] = [];
          try {
            const storedStr =
              localStorage.getItem(`pay2pay_user_added_beneficiaries_${custId}`) ||
              localStorage.getItem(`pay2pay_user_added_beneficiaries_${selectedCustomer.id}`) ||
              localStorage.getItem(`pay2pay_user_added_beneficiaries_${selectedCustomer.mobile}`);
            if (storedStr) userAddedList = JSON.parse(storedStr);
          } catch {
            // Ignore
          }

          if (Array.isArray(resData) && resData.length > 0) {
            const mapped: BeneficiaryData[] = resData.map((b: any, index: number) => {
              const acc = b.account_number || b.accountNumber || "456798121290";
              const masked = b.masked_account_number || b.account_number_masked || (acc.length >= 4 ? `•••• •••• ${acc.slice(-4)}` : acc);
              return {
                id: b.public_id || b.id || `BEN-${index + 1}`,
                beneficiaryCode: b.beneficiary_number || b.beneficiary_code || `BEN-00${index + 1}`,
                name: b.full_name || b.name || b.beneficiary_name || b.account_holder_name || "Beneficiary Account",
                relationship: b.relationship || (index % 2 === 0 ? "Family" : "Business"),
                accountNumber: acc,
                maskedAccountNumber: masked,
                ifsc: b.ifsc || b.ifsc_code || "",
                branchName: b.branch_name || b.branch || "Main Branch",
                bankName: (b.bank_name && b.bank_name !== "Bank Account") ? b.bank_name : (b.bankName && b.bankName !== "Bank Account") ? b.bankName : "Partner Bank",
                isVerified: b.verification_status === "VERIFIED" || b.is_verified === true || b.status === "VERIFIED",
                isFavorite: Boolean(b.is_favourite ?? b.is_favorite ?? false),
                lastUsedAt: b.last_used_at || b.registration_date || "Active",
                transferCount: b.transfer_count ?? 0,
                status: b.beneficiary_status || b.status || "ACTIVE",
                preferredGateway: b.preferred_gateway || "DirectGateway",
                dailyUsage: b.daily_usage ?? 0,
                monthlyUsage: b.monthly_usage ?? 0,
                dailyRemaining: b.daily_remaining ?? 50000,
                monthlyRemaining: b.monthly_remaining ?? 200000,
                notes: b.notes || "",
              };
            });

            // Sort Favourite DESC, Recent DESC, Transfer Count DESC
            mapped.sort((a, b) => {
              if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
              return (b.transferCount || 0) - (a.transferCount || 0);
            });

            const existingAccs = new Set(userAddedList.map((b) => b.accountNumber));
            const filteredMapped = mapped.filter((b) => !existingAccs.has(b.accountNumber));
            const combinedList = [...userAddedList, ...filteredMapped];

            setBeneficiaries(combinedList);

            const memorySelected = useTransactionMemoryStore.getState().selectedBeneficiary;
            if (memorySelected) {
              setSelectedBeneficiary(memorySelected);
            } else if (combinedList.length > 0) {
              setSelectedBeneficiary(combinedList[0]);
            }
          } else {
            setBeneficiaries(userAddedList);
            const memorySelected = useTransactionMemoryStore.getState().selectedBeneficiary;
            if (memorySelected) {
              setSelectedBeneficiary(memorySelected);
            } else if (userAddedList.length > 0) {
              setSelectedBeneficiary(userAddedList[0]);
            } else {
              setSelectedBeneficiary(null);
            }
          }
        }
      } catch (err: any) {
        console.warn("Multi-tenant Beneficiary API fetch warning:", err);
        if (isMounted) {
          const custId =
            (selectedCustomer as any).public_id ||
            selectedCustomer.id ||
            (selectedCustomer as any).mobile_number ||
            selectedCustomer.mobile ||
            "cust-default";
          let userAddedList: BeneficiaryData[] = [];
          try {
            const storedStr =
              localStorage.getItem(`pay2pay_user_added_beneficiaries_${custId}`) ||
              localStorage.getItem(`pay2pay_user_added_beneficiaries_${selectedCustomer.id}`) ||
              localStorage.getItem(`pay2pay_user_added_beneficiaries_${selectedCustomer.mobile}`);
            if (storedStr) {
              userAddedList = JSON.parse(storedStr);
            }
          } catch {
            // Ignore
          }

          setBeneficiaries(userAddedList);

          const memorySelected = useTransactionMemoryStore.getState().selectedBeneficiary;
          if (memorySelected) {
            setSelectedBeneficiary(memorySelected);
          } else if (userAddedList.length > 0) {
            setSelectedBeneficiary(userAddedList[0]);
          } else {
            setSelectedBeneficiary(null);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBeneficiaries();

    return () => {
      isMounted = false;
    };
  }, [
    selectedCustomer?.id,
    (selectedCustomer as any)?.public_id,
    (selectedCustomer as any)?.customer_number,
    (selectedCustomer as any)?.mobile_number,
    selectedCustomer?.mobile,
  ]);

  const deleteBeneficiary = async (beneficiaryId: string, reason?: string) => {
    try {
      const custId = selectedCustomer?.id || (selectedCustomer as any)?.public_id;
      const res = await retailerApi.softDeleteBeneficiary(beneficiaryId, custId, reason);

      setBeneficiaries((prev) => {
        const nextList = prev.filter((b) => b.id !== beneficiaryId && b.beneficiaryCode !== beneficiaryId);
        if (selectedBeneficiary?.id === beneficiaryId || selectedBeneficiary?.beneficiaryCode === beneficiaryId) {
          const newSelected = nextList.length > 0 ? nextList[0] : null;
          setSelectedBeneficiary(newSelected);
          useTransactionMemoryStore.getState().setSelectedBeneficiary(newSelected);
        }
        return nextList;
      });

      return res;
    } catch (err: any) {
      console.error("Failed to delete beneficiary:", err);
      throw err;
    }
  };

  const fetchBeneficiaryLimits = async (beneficiaryId: string) => {
    if (!beneficiaryId) return null;
    try {
      const response = await apiClient.get(`/beneficiaries/${beneficiaryId}/limits`);
      const limitData = response.data?.data || response.data;
      if (limitData) {
        const freshDailyRem = Number(limitData.daily_remaining ?? 50000);
        const freshMonthlyRem = Number(limitData.monthly_remaining ?? 200000);
        const isActive = Boolean(limitData.is_active ?? true);
        const isVerified = Boolean(limitData.is_verified ?? true);

        const logPayload = {
          beneficiary_id: beneficiaryId,
          daily_limit: Number(limitData.daily_limit ?? 50000),
          daily_used: Number(limitData.daily_used ?? 0),
          daily_remaining: freshDailyRem,
          monthly_limit: Number(limitData.monthly_limit ?? 200000),
          monthly_used: Number(limitData.monthly_used ?? 0),
          monthly_remaining: freshMonthlyRem,
          is_active: isActive,
          is_verified: isVerified,
        };

        if (process.env.NODE_ENV !== "production") {
          console.log("[Beneficiary Limit Validation]", logPayload);
        }

        setSelectedBeneficiary((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            dailyUsage: logPayload.daily_used,
            monthlyUsage: logPayload.monthly_used,
            dailyRemaining: freshDailyRem,
            monthlyRemaining: freshMonthlyRem,
            status: isActive ? "ACTIVE" : "INACTIVE",
            isVerified: isVerified,
          };
        });

        return logPayload;
      }
    } catch (err) {
      console.warn("Failed to fetch beneficiary limits from backend, using fallback limits:", err);
      return {
        beneficiary_id: beneficiaryId,
        daily_limit: 50000,
        daily_used: 0,
        daily_remaining: 50000,
        monthly_limit: 200000,
        monthly_used: 0,
        monthly_remaining: 200000,
        is_active: true,
        is_verified: true,
      };
    }
    return null;
  };

  return { beneficiaries, setBeneficiaries, selectedBeneficiary, setSelectedBeneficiary, deleteBeneficiary, fetchBeneficiaryLimits, isLoading, error };
}
