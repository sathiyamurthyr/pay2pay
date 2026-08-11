export interface CustomerLimits {
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  usedPercent: number;
  remainingPercent: number;
}

export interface LastTransaction {
  timestamp: string;
  displayLabel: string;
  mode: "IMPS" | "NEFT" | "RTGS" | "UPI";
  amount: number;
}

export interface Customer {
  customerId: string;
  fullName: string;
  initials: string;
  mobile: string;
  aadhaarMasked: string;
  verified: boolean;
  riskLevel: "Low" | "Medium" | "High";
  customerSince: string;
  limits: CustomerLimits;
  lastTransaction: LastTransaction;
}
