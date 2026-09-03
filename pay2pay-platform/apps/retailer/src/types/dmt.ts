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
  /** Authoritative Aadhaar verification status from backend — VERIFIED | PENDING */
  aadhaarVerificationStatus?: "VERIFIED" | "PENDING";
  aadhaarVerified?: boolean;
  verified: boolean;
  kycStatus?: string;
  riskLevel: "Low" | "Medium" | "High";
  customerSince: string;
  limits: CustomerLimits;
  lastTransaction: LastTransaction;
}

