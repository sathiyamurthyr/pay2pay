export type ServiceType = "DMT" | "AEPS" | "CardToCash" | "CashDeposit" | "CashWithdrawal" | "WalletTransfer" | "Payout";

export interface ServiceConfig {
  service: ServiceType;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  supportedSearchTypes: string[];
  allowBeneficiarySelection: boolean;
  requiresBiometric: boolean;
  defaultChargeRatePercentage: number;
  fixedFeeRupees: number;
}

export const SERVICE_CONFIGS: Record<ServiceType, ServiceConfig> = {
  DMT: {
    service: "DMT",
    title: "Direct Money Transfer (DMT)",
    subtitle: "Instant IMPS/NEFT National Money Transfer Platform",
    searchPlaceholder: "Enter Customer Mobile Number (10 digits)...",
    supportedSearchTypes: ["Mobile", "Customer ID", "Aadhaar", "PAN"],
    allowBeneficiarySelection: true,
    requiresBiometric: false,
    defaultChargeRatePercentage: 0.5,
    fixedFeeRupees: 10,
  },
  AEPS: {
    service: "AEPS",
    title: "AEPS Cash Out & Balance Inquiry",
    subtitle: "Aadhaar Enabled Payment System with Biometric Authentication",
    searchPlaceholder: "Enter Customer Aadhaar Number (12 digits)...",
    supportedSearchTypes: ["Aadhaar", "Mobile", "Customer ID"],
    allowBeneficiarySelection: false,
    requiresBiometric: true,
    defaultChargeRatePercentage: 0.25,
    fixedFeeRupees: 5,
  },
  CardToCash: {
    service: "CardToCash",
    title: "Card To Cash POS Withdrawal",
    subtitle: "Swipe / Insert Debit/Credit Card Instant Cash Payout",
    searchPlaceholder: "Swipe Card or Enter Cardholder Mobile Number...",
    supportedSearchTypes: ["Mobile", "Card Serial", "Customer ID"],
    allowBeneficiarySelection: false,
    requiresBiometric: false,
    defaultChargeRatePercentage: 0.75,
    fixedFeeRupees: 15,
  },
  CashDeposit: {
    service: "CashDeposit",
    title: "Instant Cash Deposit Service",
    subtitle: "Direct Bank Account CDM Cash Deposit",
    searchPlaceholder: "Enter Account Number or Mobile...",
    supportedSearchTypes: ["Account Number", "Mobile", "Customer ID"],
    allowBeneficiarySelection: false,
    requiresBiometric: false,
    defaultChargeRatePercentage: 0.3,
    fixedFeeRupees: 8,
  },
  CashWithdrawal: {
    service: "CashWithdrawal",
    title: "Micro-ATM Cash Withdrawal",
    subtitle: "Debit Card ATM Cash Payout at Retail Outlet",
    searchPlaceholder: "Enter Customer Mobile or ATM Card Number...",
    supportedSearchTypes: ["Mobile", "Customer ID"],
    allowBeneficiarySelection: false,
    requiresBiometric: false,
    defaultChargeRatePercentage: 0.2,
    fixedFeeRupees: 5,
  },
  WalletTransfer: {
    service: "WalletTransfer",
    title: "P2P Wallet Top-Up & Transfer",
    subtitle: "Instant Retailer-to-Retailer Wallet Settlement",
    searchPlaceholder: "Enter Target Wallet ID or Retailer Mobile...",
    supportedSearchTypes: ["Wallet ID", "Mobile"],
    allowBeneficiarySelection: false,
    requiresBiometric: false,
    defaultChargeRatePercentage: 0.0,
    fixedFeeRupees: 0,
  },
  Payout: {
    service: "Payout",
    title: "Bulk Merchant Settlement Payout",
    subtitle: "Direct Move-To-Bank Commercial Settlement",
    searchPlaceholder: "Enter Registered Settlement Account Number...",
    supportedSearchTypes: ["Account Number", "IFSC", "Customer ID"],
    allowBeneficiarySelection: true,
    requiresBiometric: false,
    defaultChargeRatePercentage: 0.1,
    fixedFeeRupees: 5,
  },
};
