import { apiClient } from "@/lib/api";

export interface SuperDistributorDashboardData {
  super_distributor: {
    super_distributor_ref_id: number;
    super_distributor_code: string;
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
    credit_limit: number;
  };
  distributors: {
    total: number;
    active: number;
    pending: number;
    inactive: number;
  };
  retailers: {
    total: number;
    active: number;
  };
  business: {
    total_transactions: number;
    total_business_volume: number;
    success_count: number;
    pending_count: number;
    failed_count: number;
    today_volume: number;
    today_transactions: number;
    commission_earned: number;
  };
  services: Array<{
    service_name: string;
    transaction_count: number;
    transaction_amount: number;
    success_count: number;
    pending_count: number;
    failed_count: number;
  }>;
}

export interface MappedDistributorItem {
  distributor_ref_id: number;
  sd_distributor_ref_id?: number;
  distributor_code: string;
  business_name: string;
  owner_name: string;
  mobile: string;
  email: string;
  status: string;
  is_active: boolean;
  city: string;
  state: string;
  wallet_balance: number;
  credit_limit: number;
  retailers_count: number;
  total_transactions: number;
  total_volume: number;
  created_at: string;
}

export interface DistributorDetailData {
  distributor: MappedDistributorItem;
  retailers: Array<{
    retailer_ref_id: number;
    retailer_code: string;
    store_name: string;
    owner_name: string;
    mobile: string;
    status: string;
    wallet_balance: number;
    created_at: string;
  }>;
  recent_transactions: Array<any>;
}

export interface OnboardDistributorPayload {
  business_name: string;
  owner_name: string;
  mobile: string;
  email: string;
  password: string;
  state: string;
  city: string;
  address: string;
  pincode: string;
  gst_number?: string;
  pan_number?: string;
  bank_account_number?: string;
  ifsc?: string;
  credit_limit?: number;
}

export interface SuperDistributorMdrItem {
  super_distributor_mdr_ref_id: number;
  distributor_ref_id: number;
  distributor_name?: string;
  distributor_code?: string;
  service_name: string;
  payment_mode: string;
  mdr: number;
  mdr_type: string;
  gst_rate: number;
  status: string;
  updated_at: string;
}

export interface SetMdrPayload {
  distributor_ref_id: number;
  payment_mode: string;
  mdr: number;
  mdr_type?: string;
  gst_rate?: number;
  service_name?: string;
}

export interface SuperDistributorTransactionItem {
  id: number | string;
  txn_id: string;
  ref_id?: string;
  transaction_amount: number;
  status: "SUCCESS" | "FAILED" | "PENDING" | "INITIATED";
  payment_mode?: string;
  service_name?: string;
  card_type?: string;
  distributor_ref_id?: number;
  distributor_name?: string;
  retailer_ref_id?: number;
  retailer_name?: string;
  mdr_rate?: number;
  mdr_charge?: number;
  commission_earned?: number;
  created_at: string;
}

export interface SuperDistributorProfileData {
  super_distributor_ref_id: number;
  super_distributor_code: string;
  business_name: string;
  owner_name: string;
  mobile: string;
  email: string;
  gst_number?: string;
  pan_number?: string;
  state: string;
  city: string;
  address: string;
  pincode: string;
  bank_account_number?: string;
  ifsc?: string;
  wallet_balance: number;
  credit_limit: number;
  status: string;
  is_active: boolean;
  company_name?: string;
  tenant_name?: string;
}

export const SuperDistributorAPI = {
  // 1. Dashboard
  getDashboard: async (): Promise<SuperDistributorDashboardData> => {
    const res = await apiClient.get("/super-distributor/dashboard");
    return res.data?.data || res.data;
  },

  // 2. Profile
  getProfile: async (): Promise<SuperDistributorProfileData> => {
    const res = await apiClient.get("/super-distributor/profile");
    return res.data?.data || res.data;
  },

  // 3. Mapped Distributors List
  listDistributors: async (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
  }): Promise<{
    items: MappedDistributorItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    const res = await apiClient.get("/super-distributor/distributors", { params });
    return res.data;
  },

  // 4. Distributor Detail (IDOR Protected)
  getDistributorDetail: async (distributor_ref_id: number): Promise<DistributorDetailData> => {
    const res = await apiClient.get(`/super-distributor/distributors/${distributor_ref_id}`);
    return res.data?.data || res.data;
  },

  // 5. Onboard New Distributor
  onboardDistributor: async (payload: OnboardDistributorPayload) => {
    const res = await apiClient.post("/super-distributor/distributors", payload);
    return res.data;
  },

  // 6. MDR Configurations
  getMdrConfigs: async (params?: {
    distributor_ref_id?: number;
    payment_mode?: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    items: SuperDistributorMdrItem[];
    total: number;
  }> => {
    const res = await apiClient.get("/super-distributor/mdr", { params });
    return res.data;
  },

  // 7. Set MDR
  setMdrConfig: async (payload: SetMdrPayload) => {
    const res = await apiClient.post("/super-distributor/mdr", payload);
    return res.data;
  },

  // 8. Transactions Report
  getTransactions: async (params?: {
    page?: number;
    page_size?: number;
    distributor_ref_id?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
    txn_id?: string;
    min_amount?: number;
    max_amount?: number;
    service_name?: string;
  }): Promise<{
    items: SuperDistributorTransactionItem[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    summary?: {
      total_volume: number;
      total_commission: number;
      success_count: number;
      failed_count: number;
    };
  }> => {
    const res = await apiClient.get("/super-distributor/transactions", { params });
    return res.data;
  },

  // 9. Wallet Summary
  getWalletSummary: async (): Promise<SuperDistributorWalletSummary> => {
    const res = await apiClient.get("/super-distributor/wallet");
    return res.data?.data || res.data;
  },

  // 10. Wallet Ledger History
  getWalletLedger: async (params?: {
    page?: number;
    page_size?: number;
    entry_type?: string;
    service_name?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{
    items: SuperDistributorWalletLedgerItem[];
    total: number;
    page: number;
    page_size: number;
    pages: number;
  }> => {
    const res = await apiClient.get("/super-distributor/wallet/ledger", { params });
    return res.data;
  },
};

export interface SuperDistributorWalletSummary {
  super_distributor_ref_id: number;
  super_distributor_code?: string;
  business_name: string;
  wallet_id?: number;
  available_balance: number;
  locked_amount: number;
  currency: string;
  status: string;
  total_credits: number;
  total_debits: number;
  last_updated: string;
}

export interface SuperDistributorWalletLedgerItem {
  id: number;
  txn_id: string;
  ref_id?: string;
  pos_transaction_ref?: string;
  is_commission: boolean;
  service_name: string;
  entry_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  narration?: string;
  retailer_ref_id?: number;
  retailer_name?: string;
  distributor_ref_id?: number;
  distributor_name?: string;
  created_at: string;
}

