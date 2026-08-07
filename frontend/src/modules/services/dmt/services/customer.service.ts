import { CustomerData } from "@/modules/transaction-framework";

export class DMTCustomerService {
  static async searchCustomerByMobile(mobile: string): Promise<CustomerData | null> {
    // API Call wrapper simulation / FastAPI backend endpoint integration
    return {
      id: "CUST-9812",
      name: "Ramesh Kumar",
      mobile: mobile || "9876543210",
      kycStatus: "VERIFIED",
      dailyLimitRemaining: 25000,
      monthlyLimitRemaining: 200000,
      preferredBank: "HDFC Bank",
      riskRating: "LOW",
    };
  }

  static async registerCustomer(data: { name: string; mobile: string; dob: string }): Promise<CustomerData> {
    return {
      id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      name: data.name,
      mobile: data.mobile,
      kycStatus: "VERIFIED",
      dailyLimitRemaining: 25000,
      monthlyLimitRemaining: 200000,
      preferredBank: "HDFC Bank",
      riskRating: "LOW",
    };
  }
}
