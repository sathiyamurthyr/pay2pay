"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  Users, UserPlus, Shield, ShieldCheck, ShieldAlert, CheckCircle2,
  XCircle, Search, RefreshCw, Building2, MapPin, Briefcase, Phone,
  Mail, ExternalLink, Network, Sliders, Activity, ArrowRight, UserX
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SalesManagementPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [tenantFilter, setTenantFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Fetch Sales Personnel
  const { data: salesUsers = [], isLoading, refetch } = useQuery({
    queryKey: ["sales-users", tenantFilter, statusFilter],
    queryFn: async () => {
      let url = `/admin/sales-management/users?limit=100`;
      if (tenantFilter !== "ALL") url += `&tenant_id=${tenantFilter}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      const res = await apiClient.get(url);
      return Array.isArray(res.data) ? res.data : (res.data?.items || []);
    },
  });

  // Fetch Tenants for dropdown filter
  const { data: tenants = [] } = useQuery({
    queryKey: ["sales-tenants-list"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/admin/sales-management/tenants-list");
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  // Status toggle mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: string }) => {
      const res = await apiClient.patch(`/admin/sales-management/users/${userId}/status`, {
        status: newStatus,
        reason: `Status changed to ${newStatus} by platform admin`,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-users"] });
    },
  });

  // Filtered sales personnel
  const filteredUsers = salesUsers.filter((u: any) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (u.full_name || "").toLowerCase().includes(q);
    const emailMatch = (u.email || "").toLowerCase().includes(q);
    const codeMatch = (u.employee_code || "").toLowerCase().includes(q);
    const tenantMatch = (u.tenant_name || "").toLowerCase().includes(q);
    const territoryMatch = (u.territory || "").toLowerCase().includes(q);
    return nameMatch || emailMatch || codeMatch || tenantMatch || territoryMatch;
  });

  const activeCount = salesUsers.filter((u: any) => u.status === "ACTIVE").length;
  const totalCount = salesUsers.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Users className="w-6 h-6" />
              </span>
              <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Tenant Hierarchy Governance
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Sales Team Management
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Create, configure, and manage field sales personnel with strict backend tenant isolation and granular Super Distributor / Distributor mapping.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-sm font-medium border border-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <Link
              href="/sales-management/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <UserPlus className="w-4 h-4" />
              Add Sales Person
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
          <div>
            <div className="text-xs font-medium text-slate-400">Total Sales Force</div>
            <div className="text-2xl font-bold text-white mt-1">{totalCount}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-emerald-400">Active Field Force</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{activeCount}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-indigo-400">Tenants Covered</div>
            <div className="text-2xl font-bold text-indigo-300 mt-1">{tenants.length}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-amber-400">Governance Mode</div>
            <div className="text-2xl font-bold text-amber-300 mt-1">Tenant-Scoped</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, employee code, territory, tenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Tenant:</span>
            <select
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Tenants</option>
              {tenants.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.code}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Sales Person</th>
                <th className="py-3.5 px-4">Assigned Tenant</th>
                <th className="py-3.5 px-4">Designation & Territory</th>
                <th className="py-3.5 px-4">Hierarchy Scope</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                      <span>Loading sales personnel directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <div className="font-semibold text-slate-700 dark:text-slate-300">No sales personnel found</div>
                    <p className="text-xs mt-1 text-slate-500">
                      {searchQuery ? "Try refining your search terms" : "Click 'Add Sales Person' above to register the first sales representative."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: any) => (
                  <tr
                    key={user.public_id || user.sales_user_ref_id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* Sales Person Info */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-md">
                          {(user.full_name || "S").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            {user.full_name}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                              {user.employee_code || "EMP"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {user.email}
                            </span>
                            {user.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {user.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Assigned Tenant */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                        <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                        <div>
                          <div className="font-medium text-xs truncate max-w-[160px]">
                            {user.tenant_name || "Tenant"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {user.tenant_id ? user.tenant_id.substring(0, 8) + "..." : "Default"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Designation & Territory */}
                    <td className="py-4 px-4">
                      <div>
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          {user.designation || "Sales Executive"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {user.territory || user.department || "Field Territory"}
                        </div>
                      </div>
                    </td>

                    {/* Hierarchy Scope */}
                    <td className="py-4 px-4">
                      <div>
                        {user.mappings_count === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/60">
                            <Network className="w-3 h-3" />
                            All Tenant Hierarchy
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                            <Network className="w-3 h-3" />
                            {user.mappings_count} Explicit Mappings
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">
                          Strict Backend Enforced
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {user.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Active
                        </span>
                      ) : user.status === "INACTIVE" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                          <UserX className="w-3.5 h-3.5 text-slate-400" />
                          Inactive
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                          Suspended
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/sales-management/${user.public_id}/mapping`}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-medium border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1"
                          title="Configure Hierarchy Scope Mapping"
                        >
                          <Network className="w-3.5 h-3.5" />
                          Mapping
                        </Link>
                        
                        <Link
                          href={`/sales-management/${user.public_id}`}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition flex items-center gap-1"
                        >
                          Edit
                        </Link>

                        {user.status === "ACTIVE" ? (
                          <button
                            onClick={() => toggleStatusMutation.mutate({ userId: user.public_id, newStatus: "INACTIVE" })}
                            disabled={toggleStatusMutation.isPending}
                            className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium border border-rose-200 transition"
                            title="Deactivate Sales User"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleStatusMutation.mutate({ userId: user.public_id, newStatus: "ACTIVE" })}
                            disabled={toggleStatusMutation.isPending}
                            className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200 transition"
                            title="Activate Sales User"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
