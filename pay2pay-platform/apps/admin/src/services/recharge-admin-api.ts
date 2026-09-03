/**
 * Admin Recharge Report API Service.
 * Connects to /api/v1/recharge/reports/admin backed by SP sp_recharge_get_admin_report.
 */
import axios from "axios";
import { getApiBaseUrl } from "@/lib/api-config";

export interface AdminRechargeTransaction {
  transaction_id: string;
  reference_id: string;
  retailer_code: string;
  retailer_name: string;
  mobile_number: string;
  operator_code: string;
  operator_name: string;
  recharge_amount: number;
  commission_amount: number;
  tax_amount: number;
  net_wallet_debit: number;
  status: string;
  operator_ref?: string;
  vendor_name?: string;
  created_at: string;
}

export interface AdminRechargeReportResponse {
  transactions: AdminRechargeTransaction[];
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
    total_success: number;
    total_failed: number;
  };
}

export async function fetchAdminRechargeReport(params: {
  status?: string;
  operator_code?: string;
  retailer_code?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}): Promise<AdminRechargeReportResponse> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token") ||
        localStorage.getItem("access_token") ||
        localStorage.getItem("admin_token") ||
        localStorage.getItem("pay2pay_auth_token")
      : "";

  const res = await axios.get(`${getApiBaseUrl()}/api/v1/recharge/reports/admin`, {
    params,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data?.data || {
    transactions: [],
    pagination: { page: 1, page_size: 20, total_count: 0, total_pages: 1 },
    summary: { total_volume: 0, total_commission: 0, total_tax: 0, total_success: 0, total_failed: 0 },
  };
}
