import apiClient from "@/lib/api";

export interface RetailerCardTypeOption {
  card_type_ref_id?: number | null;
  card_type_code: string;
  card_type_name: string;
  card_network?: string;
}

export interface RetailerCardBankOption {
  bank_id?: number | null;
  bank_name: string;
  short_code?: string | null;
  is_credit_card?: boolean;
}

export interface RetailerSavedCard {
  ref_id: number;
  public_id: string;
  tenant_id?: string | null;
  company_ref_id: number;
  retailer_ref_id: number;
  card_name: string;
  mobile_no: string;
  masked_card_no: string;
  card_last4: string;
  card_type: string;
  bank_id?: number | null;
  bank_name: string;
  bank_short_code?: string | null;
  bill_gen_day: number;
  bill_due_day: number;
  bill_amount: number;
  last_paid_cycle?: string | null;
  is_paid_current_cycle: boolean;
  payment_status: "PAID" | "UNPAID";
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
  bill_status: "OVERDUE" | "DUE_TODAY" | "UPCOMING";
  status_label: string;
  is_generated_today: boolean;
  is_due_today: boolean;
  is_overdue: boolean;
  days_overdue: number;
  days_remaining: number;
  days_until_generation: number;
  current_cycle_key: string;
  bill_generation_date: string;
  bill_due_date: string;
  next_bill_generation_date: string;
  next_bill_due_date: string;
}

export interface RetailerCardsDashboardResponse {
  status: string;
  reference_date: string;
  company_ref_id: number;
  retailer_ref_id: number;
  summary: {
    total_cards: number;
    bills_generated_today_count: number;
    bills_due_today_count: number;
    upcoming_7_days_count: number;
    upcoming_30_days_count: number;
    overdue_bills_count: number;
  };
  bills_generated_today: RetailerSavedCard[];
  bills_due_today: RetailerSavedCard[];
  upcoming_bill_generation: RetailerSavedCard[];
  upcoming_bill_due: RetailerSavedCard[];
  overdue_bills: RetailerSavedCard[];
  cards: RetailerSavedCard[];
  total_filtered: number;
  page: number;
  page_size: number;
  banks_in_use: string[];
}

export interface CreateRetailerCardPayload {
  card_name: string;
  mobile_no: string;
  card_number: string;
  card_type: string;
  bank_name: string;
  bank_id?: number | null;
  bill_gen_day: number | string;
  bill_due_day: number | string;
  bill_amount?: number;
}

export interface UpdateRetailerCardPayload {
  card_name?: string;
  mobile_no?: string;
  bank_name?: string;
  bank_id?: number | null;
  bill_gen_day?: number | string;
  bill_due_day?: number | string;
  bill_amount?: number;
}

export interface CardPaymentItemInput {
  card_ref_id: number;
  bill_amount?: number;
}

export interface CardPaymentBreakdownItem {
  card_ref_id: number;
  card_name: string;
  mobile_no: string;
  bank_name: string;
  bank_short_code?: string | null;
  masked_card_no: string;
  card_type: string;
  bill_generation_date: string;
  bill_due_date: string;
  bill_status: string;
  bill_amount: number;
  service_charge: number;
  charge_pct: number;
  gst_rate_pct: number;
  gst_amount: number;
  other_charges: number;
  total_payable: number;
}

export interface CardPaymentQuoteResponse {
  status: string;
  mode: "SINGLE" | "BULK";
  items: CardPaymentBreakdownItem[];
  summary: {
    selected_cards_count: number;
    total_bill_amount: number;
    total_service_charges: number;
    total_gst: number;
    total_other_charges: number;
    grand_total: number;
  };
}

export interface CardPaymentConfirmResponse {
  status: string;
  provider_configured: boolean;
  message: string;
  quote: CardPaymentQuoteResponse;
}

export interface DashboardFilterParams {
  range_filter?: string;
  from_date?: string;
  to_date?: string;
  bank_name?: string;
  card_status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export const retailerCardsApi = {
  getMetadata: async (): Promise<{
    card_types: RetailerCardTypeOption[];
    banks: RetailerCardBankOption[];
  }> => {
    const res = await apiClient.get("/retailer/cards/metadata");
    return {
      card_types: res.data?.card_types || [{ card_type_code: "CREDIT_CARD", card_type_name: "Credit Card" }],
      banks: res.data?.banks || [],
    };
  },

  getDashboard: async (params: DashboardFilterParams = {}): Promise<RetailerCardsDashboardResponse> => {
    const res = await apiClient.get("/retailer/cards", { params });
    return res.data;
  },

  createCard: async (payload: CreateRetailerCardPayload): Promise<{
    status: string;
    message: string;
    card: RetailerSavedCard;
  }> => {
    const res = await apiClient.post("/retailer/cards", payload);
    return res.data;
  },

  updateCard: async (
    refId: number,
    payload: UpdateRetailerCardPayload
  ): Promise<{ status: string; message: string; card: RetailerSavedCard }> => {
    const res = await apiClient.put(`/retailer/cards/${refId}`, payload);
    return res.data;
  },

  markCyclePaid: async (refId: number): Promise<{ status: string; message: string; card: RetailerSavedCard }> => {
    const res = await apiClient.post(`/retailer/cards/${refId}/mark-paid`);
    return res.data;
  },

  deleteCard: async (refId: number): Promise<{ status: string; message: string }> => {
    const res = await apiClient.delete(`/retailer/cards/${refId}`);
    return res.data;
  },

  quotePayments: async (items: CardPaymentItemInput[]): Promise<CardPaymentQuoteResponse> => {
    const res = await apiClient.post("/retailer/cards/payment/quote", { items });
    return res.data;
  },

  confirmPayments: async (
    items: CardPaymentItemInput[],
    confirmed: boolean,
    mode: "SINGLE" | "BULK"
  ): Promise<CardPaymentConfirmResponse> => {
    const res = await apiClient.post("/retailer/cards/payment/confirm", {
      items,
      confirmed,
      mode,
    });
    return res.data;
  },
};
