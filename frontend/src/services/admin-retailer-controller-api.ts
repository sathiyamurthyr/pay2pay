/**
 * Admin → Retailer Controller API Service
 * Typed wrappers for all 9 endpoints exposed by
 * backend/app/presentation/api/v1/admin_retailer_controller.py
 */
import { apiClient } from "./retailer-api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RetailerControllerListParams {
  status?: "ACTIVE" | "PENDING" | "REJECTED" | "SUSPENDED";
  state?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RetailerControllerListItem {
  id: string;
  retailer_code: string;
  store_name: string;
  retailer_name: string;
  mobile: string;
  email: string | null;
  city: string;
  state: string;
  status: string;
  kyc_status: string;
  wallet_balance: number;
  created_date: string | null;
  active_services: {
    dmt: boolean;
    aeps: boolean;
    bbps: boolean;
    upi: boolean;
    settlements: boolean;
  };
}

export interface RetailerControllerListResponse {
  success: boolean;
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
  retailers: RetailerControllerListItem[];
  onboarding_drafts_count: number;
}

export interface RetailerOverview {
  id: string;
  retailer_code: string;
  store_name: string;
  retailer_name: string;
  mobile: string;
  email: string | null;
  pan_number: string | null;
  aadhaar_masked?: string;
  city: string;
  state: string;
  pincode: string;
  address?: string;
  status: string;
  kyc_status: string;
  wallet_balance: number;
  limits: {
    daily_limit: number;
    monthly_limit: number;
    per_tx_limit: number;
    max_daily_tx_count: number;
  };
  service_toggles: {
    dmt_enabled: boolean;
    aeps_enabled: boolean;
    bbps_enabled: boolean;
    upi_enabled: boolean;
    settlement_enabled: boolean;
    card_to_cash_enabled: boolean;
    recharge_enabled: boolean;
  };
  assigned_distributor?: {
    dist_code: string;
    dist_name: string;
    dist_mobile: string;
  };
  risk_profile?: {
    risk_score: number;
    risk_tier: string;
    compliance_flag: string;
    last_audited: string;
  };
}

export interface ServiceToggles {
  dmt_enabled?: boolean;
  aeps_enabled?: boolean;
  bbps_enabled?: boolean;
  upi_enabled?: boolean;
  settlement_enabled?: boolean;
  card_to_cash_enabled?: boolean;
  recharge_enabled?: boolean;
}

export interface RetailerLimits {
  daily_limit?: number;
  monthly_limit?: number;
  per_tx_limit?: number;
  max_daily_tx_count?: number;
}

export interface ControllerActionResponse {
  success: boolean;
  retailer_id: string;
  audit_timestamp: string;
  message: string;
  [key: string]: unknown;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * 1. List all retailers with optional filters
 */
export async function listRetailersController(
  params: RetailerControllerListParams = {}
): Promise<RetailerControllerListResponse> {
  const { data } = await apiClient.get("/api/v1/admin/retailer-control/list", {
    params: {
      status: params.status,
      state: params.state,
      search: params.search,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
  });
  return data;
}

/**
 * 2. Fetch 360° retailer overview (by UUID or retailer_code)
 */
export async function getRetailerOverview(
  retailerId: string
): Promise<{ success: boolean; retailer: RetailerOverview }> {
  const { data } = await apiClient.get(
    `/api/v1/admin/retailer-control/${retailerId}/overview`
  );
  return data;
}

/**
 * 3. Update retailer status lifecycle (APPROVE | REJECT | SUSPEND | REACTIVATE)
 */
export async function updateRetailerStatus(
  retailerId: string,
  action: "APPROVE" | "REJECT" | "SUSPEND" | "REACTIVATE",
  reason?: string,
  notes?: string
): Promise<ControllerActionResponse> {
  const { data } = await apiClient.post(
    `/api/v1/admin/retailer-control/${retailerId}/status`,
    { action, reason, notes }
  );
  return data;
}

/**
 * 4. Toggle retailer services (DMT, AEPS, BBPS, UPI, etc.)
 */
export async function toggleRetailerServices(
  retailerId: string,
  toggles: ServiceToggles
): Promise<ControllerActionResponse> {
  const { data } = await apiClient.post(
    `/api/v1/admin/retailer-control/${retailerId}/services`,
    toggles
  );
  return data;
}

/**
 * 5. Update transaction velocity limits
 */
export async function updateRetailerLimits(
  retailerId: string,
  limits: RetailerLimits
): Promise<ControllerActionResponse> {
  const { data } = await apiClient.post(
    `/api/v1/admin/retailer-control/${retailerId}/limits`,
    limits
  );
  return data;
}

/**
 * 6. Reset retailer credentials (password / MPIN)
 */
export async function resetRetailerCredentials(
  retailerId: string,
  opts: {
    reset_password?: boolean;
    temp_password?: string;
    reset_mpin?: boolean;
    temp_mpin?: string;
    force_change_on_login?: boolean;
    reason?: string;
  }
): Promise<ControllerActionResponse> {
  const { data } = await apiClient.post(
    `/api/v1/admin/retailer-control/${retailerId}/reset-credentials`,
    {
      reset_password: opts.reset_password ?? false,
      temp_password: opts.temp_password,
      reset_mpin: opts.reset_mpin ?? false,
      temp_mpin: opts.temp_mpin,
      force_change_on_login: opts.force_change_on_login ?? true,
      reason: opts.reason,
    }
  );
  return data;
}

/**
 * 7. Revoke all active sessions and device tokens for a retailer
 */
export async function revokeRetailerSessions(
  retailerId: string
): Promise<ControllerActionResponse & { revoked_sessions_count: number }> {
  const { data } = await apiClient.post(
    `/api/v1/admin/retailer-control/${retailerId}/revoke-sessions`
  );
  return data;
}

/**
 * 8. Generate a time-bound admin support impersonation token
 */
export async function impersonateRetailer(retailerId: string): Promise<
  ControllerActionResponse & {
    delegated_access_token: string;
    expires_in_minutes: number;
    scope: string;
    redirect_url: string;
  }
> {
  const { data } = await apiClient.post(
    `/api/v1/admin/retailer-control/${retailerId}/impersonate`
  );
  return data;
}

/**
 * 9. Adjust retailer wallet (CREDIT or DEBIT)
 */
export async function adjustRetailerWallet(
  retailerId: string,
  type: "CREDIT" | "DEBIT",
  amount: number,
  reason: string,
  referenceId?: string
): Promise<
  ControllerActionResponse & {
    transaction_id: string;
    type: string;
    amount: number;
    new_balance: number;
  }
> {
  const { data } = await apiClient.post(
    `/api/v1/admin/retailer-control/${retailerId}/wallet-adjust`,
    { type, amount, reason, reference_id: referenceId }
  );
  return data;
}
