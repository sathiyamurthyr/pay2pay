import { useState } from "react";

export interface CustomerData {
  id: string;
  name: string;
  mobile: string;
  kycStatus: "VERIFIED" | "PENDING" | "REJECTED";
  dailyLimitRemaining: number;
  monthlyLimitRemaining: number;
  preferredBank: string;
  riskRating: "LOW" | "MEDIUM" | "HIGH";
}

export function useCustomer() {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>({
    id: "CUST-9812",
    name: "Ramesh Kumar",
    mobile: "9876543210",
    kycStatus: "VERIFIED",
    dailyLimitRemaining: 25000,
    monthlyLimitRemaining: 200000,
    preferredBank: "HDFC Bank",
    riskRating: "LOW",
  });
  const [isSearching, setIsSearching] = useState(false);

  const searchCustomer = (query: string) => {
    setIsSearching(true);
    setTimeout(() => {
      setSelectedCustomer({
        id: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        name: "Ramesh Kumar",
        mobile: query.length === 10 ? query : "9876543210",
        kycStatus: "VERIFIED",
        dailyLimitRemaining: 25000,
        monthlyLimitRemaining: 200000,
        preferredBank: "HDFC Bank",
        riskRating: "LOW",
      });
      setIsSearching(false);
    }, 400);
  };

  return { selectedCustomer, isSearching, searchCustomer };
}
