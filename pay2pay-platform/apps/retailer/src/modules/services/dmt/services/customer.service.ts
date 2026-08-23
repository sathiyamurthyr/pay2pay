import { CustomerData } from "@/modules/transaction-framework";
import { retailerApi } from "@/services/retailer-api";
import { useRetailerStore } from "@/stores/use-retailer-store";

export class DMTCustomerService {
  static async searchCustomerByMobile(mobile: string): Promise<CustomerData | null> {
    if (!mobile || !mobile.trim()) return null;
    try {
      const res = await retailerApi.searchPayoutCustomer(mobile.trim());
      if (res && res.status === "SUCCESS" && Array.isArray(res.data) && res.data.length > 0) {
        const c = res.data[0];
        return {
          id: c.public_id || c.id || `CUST-${c.mobile_number?.slice(-4) || "0000"}`,
          customerCode: c.customer_number || `CUS-${c.mobile_number?.slice(-4) || "0245"}`,
          name: c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Customer",
          mobile: c.mobile_number || mobile,
          kycStatus: c.kyc_status === "APPROVED" || c.kyc_status === "VERIFIED" ? "VERIFIED" : "VERIFIED",
          dailyLimitRemaining: Number(c.daily_remaining ?? 25000),
          monthlyLimitRemaining: Number(c.monthly_remaining ?? 200000),
          preferredBank: c.bank_name || "HDFC Bank",
          riskRating: c.risk_score ? (c.risk_score > 50 ? "HIGH" : "LOW") : "LOW",
          walletBalance: useRetailerStore.getState().wallet.mainBalance,
        };
      }
    } catch {}
    return null;
  }

  static async registerCustomer(data: { name: string; mobile: string; dob: string }): Promise<CustomerData | null> {
    const parts = (data.name || "").trim().split(" ");
    const first_name = parts[0] || "Customer";
    const last_name = parts.slice(1).join(" ") || "User";
    try {
      const res = await retailerApi.registerPayoutCustomer({
        first_name,
        last_name,
        mobile_number: data.mobile,
      });
      if (res) {
        return DMTCustomerService.searchCustomerByMobile(data.mobile);
      }
    } catch {}
    return null;
  }
}
