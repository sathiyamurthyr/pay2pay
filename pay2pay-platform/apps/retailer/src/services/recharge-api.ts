/**
 * Mobile Recharge Retailer API Service.
 *
 * Fully dynamic API client connecting to backend service and stored procedures:
 * Frontend -> Dedicated API -> Service Layer -> Stored Procedure (SP) -> Database.
 */

import { apiClient } from "@/services/retailer-api";

export interface RechargeOperator {
  operator_id: string;
  operator_code: string;
  operator_name: string;
  category: string;
  logo_url: string;
  supported_circles: string[];
  display_order: number;
}

export interface RechargePlan {
  plan_id: string;
  operator_code: string;
  circle: string;
  amount: number;
  validity: string;
  data_quota?: string;
  voice_benefit?: string;
  sms_benefit?: string;
  plan_type: string;
  description: string;
  is_popular: boolean;
  is_best_seller: boolean;
}

export interface RechargeValidationResponse {
  is_valid: boolean;
  error_code?: string;
  error_message?: string;
  opening_balance: number;
  recharge_amount: number;
  commission_amount: number;
  tax_amount: number;
  net_wallet_debit: number;
  closing_balance: number;
  retailer_code?: string;
  retailer_name?: string;
  operator_name?: string;
}

export interface RechargeExecutionResult {
  success: boolean;
  status: "SUCCESS" | "FAILED" | "PENDING" | "REVERSED";
  transaction_id?: string;
  reference_id?: string;
  operator_ref?: string;
  vendor_reference?: string;
  opening_balance?: number;
  closing_balance?: number;
  commission_amount?: number;
  tax_amount?: number;
  recharge_amount?: number;
  reversal_txn_id?: string;
  refunded_amount?: number;
  error_message?: string;
  message?: string;
}

export interface RechargeReportItem {
  transaction_id: string;
  reference_id: string;
  mobile_number: string;
  operator_code: string;
  operator_name: string;
  circle: string;
  plan_type: string;
  recharge_amount: number;
  commission_amount: number;
  tax_amount: number;
  net_wallet_debit: number;
  opening_balance: number;
  closing_balance: number;
  status: string;
  operator_ref?: string;
  vendor_name?: string;
  failure_reason?: string;
  created_at: string;
  completed_at?: string;
}

export interface RechargeReportResponse {
  transactions: RechargeReportItem[];
  pagination: {
    page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
  };
  summary: {
    total_volume: number;
    total_commission: number;
    total_tax: number;
  };
}

export const rechargeApi = {
  /**
   * Fetch telecom operators with logos and circles
   */
  async getOperators(): Promise<RechargeOperator[]> {
    const res = await apiClient.get("/api/v1/recharge/operators");
    return res.data?.data || [];
  },

  /**
   * Fetch dynamic plans catalog
   */
  async getPlans(params: {
    operator_code: string;
    circle?: string;
    plan_type?: string;
    search?: string;
  }): Promise<RechargePlan[]> {
    const res = await apiClient.get("/api/v1/recharge/plans", { params });
    return res.data?.data || [];
  },

  /**
   * Pre-execution validation & dynamic breakdown
   */
  async validateRecharge(data: {
    mobile_number: string;
    operator_code: string;
    recharge_amount: number;
    circle?: string;
  }): Promise<RechargeValidationResponse> {
    const res = await apiClient.post("/api/v1/recharge/validate", data);
    return res.data?.data || res.data;
  },

  /**
   * Full atomic execution with 3-step SP wallet movements
   */
  async confirmRecharge(data: {
    mobile_number: string;
    operator_code: string;
    circle?: string;
    recharge_amount: number;
    plan_id?: string;
    plan_type?: string;
    plan_description?: string;
    idempotency_key?: string;
  }): Promise<RechargeExecutionResult> {
    const res = await apiClient.post("/api/v1/recharge/confirm", data);
    return res.data?.data || res.data;
  },

  /**
   * Retailer recharge transaction statement
   */
  async getRetailerReport(params?: {
    status?: string;
    mobile_number?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<RechargeReportResponse> {
    const res = await apiClient.get("/api/v1/recharge/reports/retailer", { params });
    return res.data?.data || { transactions: [], pagination: { page: 1, page_size: 20, total_count: 0, total_pages: 1 }, summary: { total_volume: 0, total_commission: 0, total_tax: 0 } };
  },

  /**
   * Printable receipt metadata
   */
  async getReceipt(transactionId: string): Promise<any> {
    const res = await apiClient.get(`/api/v1/recharge/receipt/${transactionId}`);
    return res.data?.data;
  }
};
