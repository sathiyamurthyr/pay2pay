/**
 * Admin Transaction Report API Service
 * Authoritative single-source-of-truth service querying /api/v1/admin/reports/transactions
 */
import axios from "axios";
import { getApiBaseUrl } from "@/lib/api-config";

export interface AdminTransactionItem {
  id: string;
  txn_id: string;
  ref_id: string;
  date: string;
  time: string;
  date_time: string;
  created_at: string;
  company_id: string;
  company_name: string;
  company_code: string;
  user_id: string;
  user_name: string;
  user_code: string;
  user_mobile: string;
  user_type: string;
  vendor_name: string;
  service_name: string;
  transaction_source: string;
  transaction_type: "CREDIT" | "DEBIT";
  entry_type: "CREDIT" | "DEBIT";
  cr: number;
  dr: number;
  amount: number;
  opening_balance: number;
  closing_balance: number;
  status: "SUCCESS" | "PENDING" | "FAILED" | "REVERSED" | "INITIATED" | "PROCESSING" | "SETTLED" | "CANCELLED" | string;
  service_reference: string;
  vendor_reference: string;
  narration: string;
  wallet_type: string;
  created_by: string;
}

export interface AdminTransactionSummary {
  total_credit: number;
  total_debit: number;
  net_movement: number;
  total_count: number;
  total_amount: number;
  successful_count: number;
  pending_count: number;
  failed_count: number;
  reversed_count: number;
}

export interface AdminTransactionFiltersResponse {
  companies: Array<{ id: string; name: string; code: string }>;
  user_types: Array<{ code: string; name: string }>;
  services: string[];
  vendors: string[];
  sources: Array<{ code: string; name: string }>;
  statuses: string[];
}

export interface AdminTransactionUserSearchItem {
  id: string;
  code: string;
  name: string;
  mobile: string;
  user_type: string;
  display_label: string;
}

export interface TransactionAuditStep {
  step: number;
  action: string;
  status: string;
  description: string;
  timestamp: string;
  actor: string;
}

export interface AdminTransactionDetail extends AdminTransactionItem {
  audit_trail: TransactionAuditStep[];
}

export interface AdminTransactionQueryParams {
  company_id?: string;
  user_type?: string;
  user_id?: string;
  vendor_name?: string;
  service_name?: string;
  transaction_source?: string;
  transaction_type?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  min_amount?: number;
  max_amount?: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

function buildParams(params: AdminTransactionQueryParams): URLSearchParams {
  const q = new URLSearchParams();
  if (params.company_id && params.company_id !== "ALL") q.append("company_id", params.company_id);
  if (params.user_type && params.user_type !== "ALL") q.append("user_type", params.user_type);
  if (params.user_id && params.user_id !== "ALL") q.append("user_id", params.user_id);
  if (params.vendor_name && params.vendor_name !== "ALL") q.append("vendor_name", params.vendor_name);
  if (params.service_name && params.service_name !== "ALL") q.append("service_name", params.service_name);
  if (params.transaction_source && params.transaction_source !== "ALL") q.append("transaction_source", params.transaction_source);
  if (params.transaction_type && params.transaction_type !== "ALL") q.append("transaction_type", params.transaction_type);
  if (params.status && params.status !== "ALL") q.append("status", params.status);
  if (params.from_date) q.append("from_date", params.from_date);
  if (params.to_date) q.append("to_date", params.to_date);
  if (params.min_amount !== undefined && params.min_amount !== null) q.append("min_amount", String(params.min_amount));
  if (params.max_amount !== undefined && params.max_amount !== null) q.append("max_amount", String(params.max_amount));
  if (params.search && params.search.trim()) q.append("search", params.search.trim());
  if (params.sort_by) q.append("sort_by", params.sort_by);
  if (params.sort_order) q.append("sort_order", params.sort_order);
  if (params.page) q.append("page", String(params.page));
  if (params.limit) q.append("limit", String(params.limit));
  return q;
}

export const AdminTransactionReportAPI = {
  getTransactions: async (params: AdminTransactionQueryParams = {}) => {
    const q = buildParams(params);
    const url = `${getApiBaseUrl()}/admin/reports/transactions?${q.toString()}`;
    const res = await axios.get(url);
    return res.data;
  },

  getSummary: async (params: AdminTransactionQueryParams = {}) => {
    const q = buildParams(params);
    const url = `${getApiBaseUrl()}/admin/reports/transactions/summary?${q.toString()}`;
    const res = await axios.get(url);
    return res.data;
  },

  getFilterOptions: async () => {
    const url = `${getApiBaseUrl()}/admin/reports/transactions/filters`;
    const res = await axios.get(url);
    return res.data;
  },

  searchUsers: async (query: string) => {
    const url = `${getApiBaseUrl()}/admin/reports/transactions/users?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url);
    return res.data;
  },

  getTransactionDetail: async (txnId: string) => {
    const url = `${getApiBaseUrl()}/admin/reports/transactions/${encodeURIComponent(txnId)}`;
    const res = await axios.get(url);
    return res.data;
  },

  getExportUrl: (params: AdminTransactionQueryParams = {}) => {
    const q = buildParams(params);
    return `${getApiBaseUrl()}/admin/reports/transactions/export?${q.toString()}`;
  },
};
