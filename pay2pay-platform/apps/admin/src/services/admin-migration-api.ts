/**
 * Admin Migration API Service
 * Handles Retailer -> Distributor and Distributor -> Super Distributor migrations.
 * Strictly admin-only, auditable, and preserves original source accounts with INR 0.00 opening balance.
 */
import { apiClient } from "@/lib/api";

export type MigrationType = "RETAILER_TO_DISTRIBUTOR" | "DISTRIBUTOR_TO_SUPER_DISTRIBUTOR";

export interface SourceAccountItem {
  id: string;
  account_ref_id: number;
  code: string;
  name: string;
  business_name: string;
  mobile: string;
  email: string;
  role: "RETAILER" | "DISTRIBUTOR";
  status: string;
  kyc_status: string;
  pan_number: string | null;
  gst_number: string | null;
  bank_account: string | null;
  ifsc: string | null;
  city: string;
  state: string;
  pincode: string;
  current_wallet_balance: number;
  already_migrated: boolean;
  migration_reference_no: string | null;
  destination_code: string | null;
}

export interface SearchSourceResponse {
  success: boolean;
  migration_type: MigrationType;
  total_found: number;
  data: SourceAccountItem[];
}

export interface ValidateContactsRequest {
  migration_type: MigrationType;
  mobile: string;
  email: string;
}

export interface ValidateContactsResponse {
  success: boolean;
  valid: boolean;
  clean_mobile: string;
  clean_email: string;
  message: string;
}

export interface ExecuteMigrationRequest {
  migration_type: MigrationType;
  source_identifier: string;
  new_mobile: string;
  new_email: string;
  confirmation_ack: boolean;
}

export interface DestinationAccountResult {
  role: "DISTRIBUTOR" | "SUPER_DISTRIBUTOR";
  code: string;
  ref_id: number;
  id: string;
  mobile: string;
  email: string;
  opening_balance: string;
  status: string;
  auto_approved: boolean;
  temporary_password?: string;
}

export interface ExecuteMigrationResponse {
  success: boolean;
  migration_reference_no: string;
  migration_type: MigrationType;
  status: "COMPLETED" | "FAILED";
  source_account: {
    role: string;
    code: string;
    name: string;
    ref_id: number;
    preserved_balance: number;
  };
  destination_account: DestinationAccountResult;
  message: string;
}

export interface MigrationHistoryItem {
  migration_history_ref_id: number;
  migration_reference_no: string;
  migration_type: MigrationType;
  source_account_ref_id: number;
  source_account_id: string;
  source_account_code: string;
  source_role: string;
  destination_account_ref_id: number | null;
  destination_account_id: string | null;
  destination_account_code: string | null;
  destination_role: string;
  admin_username: string;
  destination_mobile: string;
  destination_email: string;
  kyc_reference: string;
  status: "COMPLETED" | "FAILED" | "PENDING";
  auto_approval_status: string;
  opening_balance: number;
  failure_reason: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface MigrationHistoryResponse {
  success: boolean;
  page: number;
  limit: number;
  total_records: number;
  total_pages: number;
  items: MigrationHistoryItem[];
}

export const adminMigrationApi = {
  /**
   * Search source accounts (Retailers or Distributors) for migration.
   */
  async searchSource(migrationType: MigrationType, query?: string, limit: number = 50): Promise<SearchSourceResponse> {
    const res = await apiClient.get<SearchSourceResponse>("/api/v1/admin/migration/search-source", {
      params: {
        migration_type: migrationType,
        query: query?.trim() || undefined,
        limit
      }
    });
    return res.data;
  },

  /**
   * Validate destination mobile and email for format and platform uniqueness.
   */
  async validateContacts(data: ValidateContactsRequest): Promise<ValidateContactsResponse> {
    const res = await apiClient.post<ValidateContactsResponse>("/api/v1/admin/migration/validate-contacts", data);
    return res.data;
  },

  /**
   * Atomically execute the migration workflow.
   */
  async executeMigration(data: ExecuteMigrationRequest): Promise<ExecuteMigrationResponse> {
    const res = await apiClient.post<ExecuteMigrationResponse>("/api/v1/admin/migration/execute", data);
    return res.data;
  },

  /**
   * Query paginated migration history and audit trail.
   */
  async getHistory(params?: {
    migration_type?: MigrationType;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<MigrationHistoryResponse> {
    const res = await apiClient.get<MigrationHistoryResponse>("/api/v1/admin/migration/history", {
      params: {
        migration_type: params?.migration_type || undefined,
        status: params?.status || undefined,
        search: params?.search || undefined,
        page: params?.page || 1,
        limit: params?.limit || 15
      }
    });
    return res.data;
  }
};
