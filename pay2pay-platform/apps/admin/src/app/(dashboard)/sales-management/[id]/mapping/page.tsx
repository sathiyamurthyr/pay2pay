"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  Network, ArrowLeft, Building2, Shield, Plus, Trash2,
  CheckCircle2, AlertCircle, RefreshCw, Store, Users, Layers, Sparkles
} from "lucide-react";

export default function SalesHierarchyMappingPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const salesUserId = params.id as string;

  const [mappingType, setMappingType] = useState<"ALL" | "SUPER_DISTRIBUTOR" | "DISTRIBUTOR" | "RETAILER">("SUPER_DISTRIBUTOR");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch sales user details
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["sales-user-detail", salesUserId],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/sales-management/users/${salesUserId}`);
      return res.data;
    },
    enabled: !!salesUserId,
  });

  // Fetch current mappings
  const { data: mappings = [], isLoading: isLoadingMappings, refetch: refetchMappings } = useQuery({
    queryKey: ["sales-user-mappings", salesUserId],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/sales-management/users/${salesUserId}/mappings`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: !!salesUserId,
  });

  // Fetch tenant hierarchy options (SDs, Distributors, Retailers in that tenant)
  const { data: hierarchyOptions, isLoading: isLoadingHierarchy } = useQuery({
    queryKey: ["sales-tenant-hierarchy-options", user?.tenant_id],
    queryFn: async () => {
      if (!user?.tenant_id) return { super_distributors: [], distributors: [], retailers: [] };
      const res = await apiClient.get(`/admin/sales-management/hierarchy-options?tenant_id=${user.tenant_id}`);
      return res.data;
    },
    enabled: !!user?.tenant_id,
  });

  // Add mapping mutation
  const addMappingMutation = useMutation({
    mutationFn: async (payload: { mapping_type: string; target_ref_id?: string }) => {
      const res = await apiClient.post(`/admin/sales-management/users/${salesUserId}/mappings`, payload);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ type: "success", message: "Hierarchy mapping added successfully!" });
      setSelectedEntityId("");
      queryClient.invalidateQueries({ queryKey: ["sales-user-mappings", salesUserId] });
      queryClient.invalidateQueries({ queryKey: ["sales-user-detail", salesUserId] });
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || "Failed to add mapping";
      setFeedback({ type: "error", message: detail });
    },
  });

  // Delete mapping mutation
  const deleteMappingMutation = useMutation({
    mutationFn: async (mappingId: string) => {
      const res = await apiClient.delete(`/admin/sales-management/users/${salesUserId}/mappings/${mappingId}`);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ type: "success", message: "Mapping removed successfully!" });
      queryClient.invalidateQueries({ queryKey: ["sales-user-mappings", salesUserId] });
      queryClient.invalidateQueries({ queryKey: ["sales-user-detail", salesUserId] });
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || "Failed to delete mapping";
      setFeedback({ type: "error", message: detail });
    },
  });

  const handleAddMapping = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (mappingType !== "ALL" && !selectedEntityId) {
      setFeedback({ type: "error", message: "Please select an entity to map." });
      return;
    }
    addMappingMutation.mutate({
      mapping_type: mappingType,
      target_ref_id: mappingType === "ALL" ? undefined : selectedEntityId,
    });
  };

  const getEntityOptions = () => {
    if (!hierarchyOptions) return [];
    if (mappingType === "SUPER_DISTRIBUTOR") return hierarchyOptions.super_distributors || [];
    if (mappingType === "DISTRIBUTOR") return hierarchyOptions.distributors || [];
    if (mappingType === "RETAILER") return hierarchyOptions.retailers || [];
    return [];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href={`/sales-management/${salesUserId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sales Person Profile
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">
              <Network className="w-4 h-4" />
              Hierarchy Scope & Territory Access Governance
            </div>
            <h1 className="text-2xl font-bold">
              {user ? `Hierarchy Mapping for ${user.full_name}` : "Sales Hierarchy Mapping"}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {user?.tenant_name ? (
                <>
                  Strictly bounded within Tenant:{" "}
                  <strong className="text-white">{user.tenant_name}</strong>
                </>
              ) : (
                "Configure which branches of the hierarchy this sales representative can view and monitor."
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold">
              {user?.employee_code || "SALES-REP"}
            </span>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Mapping Configuration Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Form: Add Mapping */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              Assign Mapping Scope
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Grant visibility to a specific Super Distributor, Distributor, Retailer, or entire tenant.
            </p>
          </div>

          <form onSubmit={handleAddMapping} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                Mapping Scope Level
              </label>
              <select
                value={mappingType}
                onChange={(e) => {
                  setMappingType(e.target.value as any);
                  setSelectedEntityId("");
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="SUPER_DISTRIBUTOR">Super Distributor (Includes all child Dist & Ret)</option>
                <option value="DISTRIBUTOR">Distributor (Includes all child Ret)</option>
                <option value="RETAILER">Specific Retailer Only</option>
                <option value="ALL">All Tenant Entities (Full Access)</option>
              </select>
            </div>

            {mappingType !== "ALL" && (
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Select {mappingType.replace("_", " ")}
                </label>
                <select
                  value={selectedEntityId}
                  onChange={(e) => setSelectedEntityId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Choose Entity --</option>
                  {getEntityOptions().map((opt: any) => (
                    <option key={opt.id || opt.public_id} value={opt.id || opt.public_id}>
                      {opt.name || opt.store_name} ({opt.code || opt.retailer_code || "ID"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={addMappingMutation.isPending}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addMappingMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Add Hierarchy Mapping
            </button>
          </form>

          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <div className="font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Strict Cascade Resolution
            </div>
            <div>
              When you map a Super Distributor, the Sales user automatically gets authorized view of all its current and future Distributors and Retailers.
            </div>
          </div>
        </div>

        {/* Right Table: Active Mappings */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Active Hierarchy Authorizations ({mappings.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Current active scopes applied to this sales representative.
              </p>
            </div>

            <button
              onClick={() => refetchMappings()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Refresh mappings"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {isLoadingMappings ? (
            <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Loading hierarchy mappings...</span>
            </div>
          ) : mappings.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Network className="w-12 h-12 mx-auto mb-3 text-indigo-200 dark:text-indigo-950" />
              <div className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                Default Tenant-Wide Visibility
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                No explicit restrictions are set. This representative has full visibility into all Super Distributors, Distributors, and Retailers belonging to{" "}
                <strong>{user?.tenant_name || "their assigned tenant"}</strong>.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
              {mappings.map((m: any) => (
                <div
                  key={m.public_id || m.mapping_ref_id}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                      {m.mapping_type === "SUPER_DISTRIBUTOR" ? (
                        <Users className="w-4 h-4" />
                      ) : m.mapping_type === "DISTRIBUTOR" ? (
                        <Layers className="w-4 h-4" />
                      ) : (
                        <Store className="w-4 h-4" />
                      )}
                    </span>
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                        {m.target_name || m.target_ref_id || "Full Tenant Scope"}
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {m.mapping_type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        Target ID: {m.target_ref_id || "ALL_HIERARCHY"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteMappingMutation.mutate(m.public_id || m.mapping_ref_id)}
                    disabled={deleteMappingMutation.isPending}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    title="Remove this scope mapping"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
