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
    <div className="max-w-4xl w-full mx-auto space-y-6 pb-12">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-[#94003A] via-[#78002F] to-[#550020] border border-[#94003A]/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E7B631] to-[#D3A51F] text-[#1F2937] flex items-center justify-center font-black text-2xl shadow-md">
            {(user?.full_name || "S").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-white">{user?.full_name}</h1>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                {user?.employee_code || "EMP"}
              </span>
            </div>
            <div className="text-xs text-[#F8E6EE]/80 mt-1 flex items-center gap-2 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E7B631]" />
              <span>Role: Field Sales Force &bull; Status: Active</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-5 py-2.5 rounded-xl bg-[#FEE2E2] hover:bg-[#FEE2E2]/90 text-[#991B1B] border border-[#FECACA] text-xs font-bold transition shadow-xs"
        >
          Sign Out of Session
        </button>
      </div>

      {/* Identity & Tenant Governance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant Isolation Info */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-6 shadow-xs space-y-4 text-[#1F2937]">
          <h2 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#94003A]" />
            Assigned Tenant & Company
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-[#FAFAFC] rounded-xl border border-[#E5E7EB]">
              <div className="text-[#6B7280]">Assigned Tenant Name:</div>
              <div className="font-black text-[#1F2937] text-sm mt-0.5">
                {user?.tenant_name || "Tenant"}
              </div>
              <div className="text-[10px] text-[#6B7280] font-mono mt-1">
                ID: {user?.tenant_id}
              </div>
            </div>

            <div className="p-3.5 bg-[#FAFAFC] rounded-xl border border-[#E5E7EB]">
              <div className="text-[#6B7280]">Governance Policy:</div>
              <div className="text-[#16A34A] font-bold mt-0.5">
                Strict Multi-Tenant Backend Isolation
              </div>
              <div className="text-[11px] text-[#6B7280] mt-1 leading-relaxed">
                All API requests automatically resolve and restrict database rows to this tenant. Cross-tenant access is blocked at the SQL query layer.
              </div>
            </div>
          </div>
        </div>

        {/* Profile & Territory */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-6 shadow-xs space-y-4 text-[#1F2937]">
          <h2 className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#94003A]" />
            Field Profile & Territory
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-[#FAFAFC] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[#6B7280]">Email:</span>
              <span className="font-semibold text-[#1F2937]">{user?.email}</span>
            </div>

            <div className="p-3.5 bg-[#FAFAFC] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[#6B7280]">Designation:</span>
              <span className="font-semibold text-[#1F2937]">{user?.designation || "Sales Executive"}</span>
            </div>

            <div className="p-3.5 bg-[#FAFAFC] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[#6B7280]">Territory:</span>
              <span className="font-bold text-[#94003A]">{user?.territory || "Field Operations"}</span>
            </div>

            <div className="p-3.5 bg-[#FAFAFC] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
              <span className="text-[#6B7280]">Explicit Mappings:</span>
              <span className="font-bold text-[#1F2937] font-mono">
                {user?.mappings_count === 0 ? "Full Tenant Hierarchy" : `${user?.mappings_count} Scoped Nodes`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Security Governance Notice */}
      <div className="p-4 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/20 text-xs text-[#94003A] flex items-start gap-3">
        <Lock className="w-5 h-5 text-[#94003A] shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-[#94003A]">Administrative Governance Rule</div>
          <div className="mt-0.5 text-[#1F2937] leading-relaxed">
            Sales personnel are strictly managed from the Central Admin Portal. Profile modifications, password resets, and hierarchy scope re-assignments must be performed by an authorized Platform Administrator.
          </div>
        </div>
      </div>
    </div>
  );
}
