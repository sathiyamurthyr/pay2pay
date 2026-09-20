import { apiClient } from "@/lib/api";

export interface OrgSummary {
  total_tenants: number;
  total_companies: number;
  total_master_distributors: number;
  total_distributors: number;
  total_retailers: number;
  mapped_records: number;
  unmapped_records: number;
  unmapped_distributors: number;
  unmapped_retailers: number;
}

export interface OrgTreeNode {
  id: string;
  type: "TENANT" | "COMPANY_MASTER" | "MASTER_DISTRIBUTOR" | "DISTRIBUTOR" | "RETAILER";
  name: string;
  code: string;
  status: string;
  is_mapped: boolean;
  entity_ref_id?: number | null;
  details?: Record<string, any>;
  children?: OrgTreeNode[];
}

export interface UnmappedItem {
  entity_id: string;
  entity_type: "COMPANY_MASTER" | "MASTER_DISTRIBUTOR" | "DISTRIBUTOR" | "RETAILER";
  name: string;
  code: string;
  status: string;
  tenant_id?: string | null;
  company_id?: string | null;
  super_distributor_id?: string | null;
  distributor_id?: string | null;
  created_at?: string | null;
  reason: string;
}

export interface UnmappedResponse {
  total: number;
  limit: number;
  offset: number;
  items: UnmappedItem[];
}

export interface AuditHistoryItem {
  id: string;
  action: string;
  actor_id?: string | null;
  actor_email?: string | null;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  timestamp?: string | null;
}

export interface AuditHistoryResponse {
  total: number;
  limit: number;
  offset: number;
  items: AuditHistoryItem[];
}

export interface EntityDetailsResponse {
  entity_id: string;
  entity_type: string;
  name: string;
  code: string;
  status: string;
  entity_ref_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  tenant?: { id: string; name: string; code: string } | null;
  company?: { id: string; name: string; code: string } | null;
  master_distributor?: { id: string; name: string; code: string } | null;
  distributor?: { id: string; name: string; code: string } | null;
  counts: Record<string, number>;
  mapped_users: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
  }>;
}

export interface CascadedOptionsResponse {
  tenants: Array<{ id: string; name: string; code: string }>;
  companies: Array<{ id: string; name: string; code: string; tenant_id: string }>;
  master_distributors: Array<{ id: string; name: string; code: string; tenant_id: string; company_id: string }>;
  distributors: Array<{ id: string; name: string; code: string; tenant_id: string; company_id: string; master_distributor_id: string }>;
}

export interface AssignMappingPayload {
  entity_type: "DISTRIBUTOR" | "RETAILER" | "MASTER_DISTRIBUTOR" | "COMPANY_MASTER";
  entity_id: string;
  parent_type: "TENANT" | "COMPANY_MASTER" | "MASTER_DISTRIBUTOR" | "DISTRIBUTOR";
  parent_id: string;
  reason?: string;
}

export interface UnmapPayload {
  entity_type: "DISTRIBUTOR" | "RETAILER" | "MASTER_DISTRIBUTOR" | "COMPANY_MASTER";
  entity_id: string;
  reason?: string;
}

export const adminOrgMappingApi = {
  async getSummary(): Promise<OrgSummary> {
    const res = await apiClient.get<OrgSummary>("/admin/org-mapping/summary");
    return res.data;
  },

  async getTree(params?: {
    search?: string;
    tenant_id?: string;
    company_id?: string;
    master_distributor_id?: string;
    distributor_id?: string;
    status?: string;
    mapped_only?: boolean;
  }): Promise<OrgTreeNode[]> {
    const res = await apiClient.get<OrgTreeNode[]>("/admin/org-mapping/tree", { params });
    return res.data;
  },

  async getUnmapped(params?: {
    entity_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<UnmappedResponse> {
    const res = await apiClient.get<UnmappedResponse>("/admin/org-mapping/unmapped", { params });
    return res.data;
  },

  async getEntityDetails(type: string, id: string): Promise<EntityDetailsResponse> {
    const res = await apiClient.get<EntityDetailsResponse>(`/admin/org-mapping/entity/${type}/${id}`);
    return res.data;
  },

  async getOptions(params?: {
    tenant_id?: string;
    company_id?: string;
    master_distributor_id?: string;
  }): Promise<CascadedOptionsResponse> {
    const res = await apiClient.get<CascadedOptionsResponse>("/admin/org-mapping/options", { params });
    return res.data;
  },

  async assignMapping(payload: AssignMappingPayload): Promise<{ success: boolean; message: string; action: string }> {
    const res = await apiClient.post<{ success: boolean; message: string; action: string }>(
      "/admin/org-mapping/assign",
      payload
    );
    return res.data;
  },

  async unmapEntity(payload: UnmapPayload): Promise<{ success: boolean; message: string; action: string }> {
    const res = await apiClient.post<{ success: boolean; message: string; action: string }>(
      "/admin/org-mapping/unmap",
      payload
    );
    return res.data;
  },

  async getHistory(params?: {
    entity_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditHistoryResponse> {
    const res = await apiClient.get<AuditHistoryResponse>("/admin/org-mapping/history", { params });
    return res.data;
  },
};
