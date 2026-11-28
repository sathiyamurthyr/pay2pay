import apiClient from "@/lib/api";

export interface RetailerCardTypeOption {
  card_type_ref_id?: number | null;
  card_type_code: string;
  card_type_name: string;
}

export interface RetailerCardBankOption {
  bank_ifsc_ref_id?: number | null;
  bank_name: string;
  short_code?: string | null;
  is_credit_card?: boolean;
}

export interface RetailerSavedCard {
  card_ref_id: number;
  public_id: string;
  company_ref_id: number;
  retailer_ref_id: number;
  cardholder_name: string;
  mobile_number: string;
  masked_card_number: string;
  card_last4: string;
  card_type_ref_id?: number | null;
  card_type_code: string;
  card_type_name: string;
  bank_ifsc_ref_id?: number | null;
  bank_name: string;
  bank_short_code?: string | null;
  bill_generate_day: number;
  bill_due_day: number;
  status: string;
  created_at?: string | null;
  bill_bucket: "CURRENT_DATE" | "UPCOMING";
  is_due_today: boolean;
  days_remaining: number;
  status_label: string;
  next_due_date: string;
  cycle_generate_date: string;
}

export interface RetailerCardsDashboardResponse {
  status: string;
  reference_date: string;
  company_ref_id: number;
  retailer_ref_id: number;
  summary: {
    total_cards: number;
    current_date_bills_count: number;
    upcoming_bills_count: number;
    due_next_7_days_count: number;
    banks_count: number;
  };
  current_date_bills: RetailerSavedCard[];
  upcoming_bills: RetailerSavedCard[];
  all_cards: RetailerSavedCard[];
}

export interface CreateRetailerCardPayload {
  cardholder_name: string;
  mobile_number: string;
  card_number: string;
  card_type: string;
  card_type_ref_id?: number | null;
  bank_name: string;
  bank_ifsc_ref_id?: number | null;
  bill_generate_date: number | string;
  bill_due_date: number | string;
}

export const retailerCardsApi = {
  getMetadata: async (): Promise<{
    card_types: RetailerCardTypeOption[];
    banks: RetailerCardBankOption[];
  }> => {
    const res = await apiClient.get("/retailer/cards/metadata");
    return {
      card_types: res.data?.card_types || [],
      banks: res.data?.banks || [],
    };
  },

  getDashboard: async (search?: string): Promise<RetailerCardsDashboardResponse> => {
    const res = await apiClient.get("/retailer/cards", {
      params: search?.trim() ? { search: search.trim() } : undefined,
    });
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

  deleteCard: async (cardRefId: number): Promise<{ status: string; message: string }> => {
    const res = await apiClient.delete(`/retailer/cards/${cardRefId}`);
    return res.data;
  },
};
