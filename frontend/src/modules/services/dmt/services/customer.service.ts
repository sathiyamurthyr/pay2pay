import { CustomerData } from "@/modules/transaction-framework";
import { useRetailerStore } from "@/stores/use-retailer-store";

export class DMTCustomerService {
  static async searchCustomerByMobile(mobile: string): Promise<CustomerData | null> {
    const mobLast4 = mobile && mobile.length >= 4 ? mobile.slice(-4) : "9812";
    return {
      id: `CUST-${mobLast4}`,
      customerCode: `CUS-${mobLast4}`,
      name: "Ramesh Kumar",
      mobile: mobile || "9876543210",
      kycStatus: "VERIFIED",
      dailyLimitRemaining: 25000,
      monthlyLimitRemaining: 200000,
      preferredBank: "HDFC Bank",
      riskRating: "LOW",
      walletBalance: useRetailerStore.getState().wallet.mainBalance,
    };
  }

  static async registerCustomer(data: { name: string; mobile: string; dob: string }): Promise<CustomerData> {
    const mobLast4 = data.mobile && data.mobile.length >= 4 ? data.mobile.slice(-4) : "0245";
    return {
      id: `CUST-${mobLast4}`,
      customerCode: `CUS-${mobLast4}`,
      name: data.name,
      mobile: data.mobile,
      kycStatus: "VERIFIED",
      dailyLimitRemaining: 25000,
      monthlyLimitRemaining: 200000,
      preferredBank: "HDFC Bank",
      riskRating: "LOW",
      walletBalance: useRetailerStore.getState().wallet.mainBalance,
    };
  }
}
