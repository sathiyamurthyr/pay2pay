"use client";

import React from "react";
import { useSalesAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import {
  UserCircle, Building2, ShieldCheck, Mail, Phone,
  MapPin, Briefcase, Network, Layers, Store, Key,
  Lock, RefreshCw
} from "lucide-react";

export default function SalesProfilePage() {
  const { user, logout } = useSalesAuth();

  // Fetch Audit Log for current sales user
  const { data: auditLogs = [], isLoading: isLoadingAudit } = useQuery({
    queryKey: ["sales-my-audit-logs"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/sales/audit/my-logs");
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-2xl shadow-xl shadow-indigo-600/30">
            {(user?.full_name || "S").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{user?.full_name}</h1>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {user?.employee_code || "EMP"}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Role: Field Sales Force &bull; Status: Active</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition"
        >
          Sign Out of Session
        </button>
      </div>

      {/* Identity & Tenant Governance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant Isolation Info */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            Assigned Tenant & Company
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <div className="text-slate-400">Assigned Tenant Name:</div>
              <div className="font-bold text-white text-sm mt-0.5">
                {user?.tenant_name || "Tenant"}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                ID: {user?.tenant_id}
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
              <div className="text-slate-400">Governance Policy:</div>
              <div className="text-emerald-400 font-semibold mt-0.5">
                Strict Multi-Tenant Backend Isolation
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                All API requests automatically resolve and restrict database rows to this tenant. Cross-tenant access is blocked at the SQL query layer.
              </div>
            </div>
          </div>
        </div>

        {/* Profile & Territory */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-400" />
            Field Profile & Territory
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center justify-between">
              <span className="text-slate-400">Email:</span>
              <span className="font-semibold text-white">{user?.email}</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center justify-between">
              <span className="text-slate-400">Designation:</span>
              <span className="font-semibold text-white">{user?.designation || "Sales Executive"}</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center justify-between">
              <span className="text-slate-400">Territory:</span>
              <span className="font-semibold text-indigo-300">{user?.territory || "Field Operations"}</span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 flex items-center justify-between">
              <span className="text-slate-400">Explicit Mappings:</span>
              <span className="font-semibold text-white font-mono">
                {user?.mappings_count === 0 ? "Full Tenant Hierarchy" : `${user?.mappings_count} Scoped Nodes`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Governance Notice */}
      <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-slate-400 flex items-start gap-3">
        <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-indigo-300">Administrative Governance Rule</div>
          <div className="mt-0.5">
            Sales personnel are strictly managed from the Central Admin Portal. Profile modifications, password resets, and hierarchy scope re-assignments must be performed by an authorized Platform Administrator.
          </div>
        </div>
      </div>
    </div>
  );
}
