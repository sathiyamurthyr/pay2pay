// Shared TypeScript Type & DTO Definitions for Pay2Pay Platform

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  COMPANY_ADMIN = "COMPANY_ADMIN",
  SUPER_DISTRIBUTOR = "SUPER_DISTRIBUTOR",
  DISTRIBUTOR = "DISTRIBUTOR",
  RETAILER = "RETAILER",
  GUEST = "GUEST"
}

export interface AuthUser {
  id: string;
  mobile_number: string;
  name?: string;
  email?: string;
  role: UserRole;
  tenant_id?: string;
  company_id?: string;
  store_id?: string;
  is_verified?: boolean;
  wallet_balance?: number;
}

export interface CustomerDTO {
  id: string;
  mobile_number: string;
  full_name: string;
  city?: string;
  state?: string;
  pincode?: string;
  kyc_status?: string;
  customer_code?: string;
  monthly_limit?: number;
  remaining_limit?: number;
  created_at?: string;
}

export interface BeneficiaryDTO {
  id: string;
  customer_id: string;
  beneficiary_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  branch_name?: string;
  verification_status?: "VERIFIED" | "PENDING" | "UNVERIFIED" | "FAILED";
  is_pinned?: boolean;
  created_at?: string;
}

export interface PayoutTransactionDTO {
  id: string;
  reference_id: string;
  retailer_id: string;
  customer_id: string;
  beneficiary_id: string;
  amount: number;
  charges: number;
  net_amount: number;
  transfer_mode: "IMPS" | "NEFT" | "RTGS" | "UPI";
  status: "SUCCESS" | "PENDING" | "FAILED" | "REVERSED";
  bank_ref_no?: string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  code?: string;
  message?: string;
  data?: T;
  error?: string;
}
