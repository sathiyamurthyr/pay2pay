import { apiClient } from "@/lib/api";

export interface DistributorDashboardData {
  distributor: {
    distributor_ref_id: number;
    business_name: string;
    owner_name: string;
    mobile: string;
    email: string;
    status: string;
    is_active: boolean;
  };
  wallet: {
    balance: number;
    currency: string;
    status: string;
    is_active: boolean;
    is_frozen: boolean;
  };
  retailers: {
    total: number;
    active: number;
    pending: number;
    inactive: number;
  };
  business: {
    total_transactions: number;
    total_business_volume: number;
    success_count: number;
    pending_count: number;
    failed_count: number;
  };
  services: Array<{
    service_name: string;
    transaction_count: number;
    transaction_amount: number;
    success_count: number;
    pending_count: number;
    failed_count: number;
  }>;
  topup: {
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    pending_amount: number;
  };
  mdr: {
    configured_retailers_count: number;
  };
}

export interface MappedRetailerItem {
  retailer_ref_id: number;
  distributor_retailer_ref_id: number;
  retailer_code: string;
  owner_name: string;
  store_name: string;
  mobile: string;
  email: string;
  status: string;
  is_active: boolean;
  wallet_balance: number;
  total_transactions: number;
  total_volume: number;
  last_transaction_date: string | null;
  created_at: string;
}

export interface TopupRequestItem {
  topup_ref_id: number;
  topup_request_id: string;
  requested_amount: number;
  approved_amount: number | null;
  payment_mode: string;
  payment_reference: string;
  payment_date: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  slip_url: string | null;
  remarks: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface DistributorMdrItem {
  distributor_mdr_ref_id: number;
  retailer_ref_id: number;
  retailer_name: string;
  retailer_code: string;
  service_name: string;
  payment_mode: string;
  mdr: number;
  mdr_type: string;
  gst_rate: number;
  status: string;
  updated_at: string;
}

export interface DistributorTransactionItem {
  transaction_ref_id: number;
  transaction_id: string;
  reference_id: string | null;
  service_name: string;
  transaction_type: string;
  entry_type: "CR" | "DR";
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  narration: string;
  created_at: string;
}

export const DistributorAPI = {
  getDashboard: async (): Promise<DistributorDashboardData> => {
    const res = await apiClient.get("/distributor/dashboard");
    return res.data.data;
  },

  getWallet: async () => {
    const res = await apiClient.get("/distributor/wallet");
    return res.data.data;
  },

  getRetailers: async (params?: { page?: number; page_size?: number; search?: string; status?: string }) => {
    const res = await apiClient.get("/distributor/retailers", { params });
    return res.data;
  },

  getRetailerDetails: async (retailerRefId: number) => {
    const res = await apiClient.get(`/distributor/retailers/${retailerRefId}`);
    return res.data.data;
  },

  inviteRetailer: async (payload: { retailer_mobile: string; retailer_name?: string; retailer_email?: string }) => {
    const res = await apiClient.post("/distributor/retailers/invite", payload);
    return res.data;
  },

  getTopupRequests: async (params?: { page?: number; page_size?: number; status?: string }) => {
    const res = await apiClient.get("/distributor/topup", { params });
    return res.data;
  },

  submitTopupRequest: async (payload: {
    requested_amount: number;
    payment_mode: string;
    payment_reference: string;
    payment_date?: string;
    slip_url?: string;
    remarks?: string;
  }) => {
    const res = await apiClient.post("/distributor/topup", payload);
    return res.data;
  },

  getMdrConfigurations: async (params?: { retailer_ref_id?: number }) => {
    const res = await apiClient.get("/distributor/mdr", { params });
    return res.data;
  },

  saveMdrConfiguration: async (payload: {
    retailer_ref_id: number;
    service_name: string;
    payment_mode: string;
    mdr: number;
    mdr_type?: string;
    gst_rate?: number;
  }) => {
    const res = await apiClient.post("/distributor/mdr", payload);
    return res.data;
  },

  getTransactions: async (params?: {
    page?: number;
    page_size?: number;
    service_name?: string;
    entry_type?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const res = await apiClient.get("/distributor/transactions", { params });
    return res.data;
  },

  getBusinessReport: async () => {
    const res = await apiClient.get("/distributor/business");
    return res.data.data;
  },

  getProfile: async () => {
    const res = await apiClient.get("/distributor/profile");
    return res.data.data;
  }
};
