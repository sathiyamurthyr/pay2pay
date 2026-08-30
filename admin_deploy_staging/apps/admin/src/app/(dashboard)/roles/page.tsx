"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import {
  ShieldCheck, Plus, Check, X, Lock, Key, Grid3X3, List,
  AlertTriangle, Users, Eye,
} from "lucide-react";

const MODULE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Company:    { bg: "#EDE9FE", text: "#4C1D95", border: "#DDD6FE" },
  Settlement: { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  Wallet:     { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  Compliance: { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  Audit:      { bg: "#F3E8FF", text: "#6D28D9", border: "#DDD6FE" },
  Users:      { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" },
  Config:     { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" },
};

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"matrix" | "roles">("matrix");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", code: "", description: "" });

  const { data: matrixData, isLoading } = useQuery({
    queryKey: ["permission-matrix"],
    queryFn: async () => {
      const res = await apiClient.get("/roles/matrix");
      return res.data;
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiClient.post("/roles", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permission-matrix"] });
      setIsModalOpen(false);
      setFormData({ name: "", code: "", description: "" });
    },
  });

  const roles = Array.isArray(matrixData?.roles) ? matrixData.roles : [];
  const permissions = Array.isArray(matrixData?.permissions) ? matrixData.permissions : [];
  const matrix = matrixData?.matrix || {};

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="ent-page-title">Roles & Permission Matrix</h1>
          <p className="ent-caption mt-1">Enterprise access control & granular RBAC permission management</p>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Tab Switcher */}
          <div className="flex p-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
            <button
              onClick={() => setActiveTab("matrix")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                activeTab === "matrix"
                  ? "bg-white text-[#6C63FF] shadow-sm border border-[#E2E8F0]"
                  : "text-[#64748B] hover:text-[#334155]"
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Permission Matrix
            </button>
            <button
              onClick={() => setActiveTab("roles")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                activeTab === "roles"
                  ? "bg-white text-[#6C63FF] shadow-sm border border-[#E2E8F0]"
                  : "text-[#64748B] hover:text-[#334155]"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Role List
            </button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="ent-btn ent-btn-primary">
            <Plus className="w-4 h-4" />
            Add Custom Role
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Roles",       value: roles.length,       color: "#6C63FF", bg: "#EDE9FE", icon: ShieldCheck },
          { label: "System Roles",      value: roles.filter((r: any) => r.is_system).length, color: "#3B82F6", bg: "#DBEAFE", icon: Lock },
          { label: "Custom Roles",      value: roles.filter((r: any) => !r.is_system).length, color: "#10B981", bg: "#D1FAE5", icon: Key },
          { label: "Permissions",       value: permissions.length,  color: "#F59E0B", bg: "#FEF3C7", icon: Eye },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="ent-card p-4" style={{ borderLeft: `3px solid ${color}` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                <Icon className="w-4.5 h-4.5" style={{ color, width: "18px", height: "18px" }} />
              </div>
            </div>
            <div className="font-mono text-[24px] font-extrabold text-[#0F172A] tabular-nums">{value}</div>
            <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Permission Matrix ── */}
      {activeTab === "matrix" ? (
        <div className="ent-card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#FAFBFF]">
            <h3 className="ent-card-title flex items-center gap-2">
              <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center bg-[#EDE9FE]">
                <Grid3X3 className="w-3.5 h-3.5 text-[#6C63FF]" />
              </span>
              Enterprise RBAC Permission Matrix
            </h3>
            <p className="ent-caption mt-0.5">Granular permission mapping across Platform Roles</p>
          </div>

          {isLoading ? (
            <div className="py-14 text-center">
              <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-[12px] text-[#94A3B8] mt-3">Loading permission matrix…</p>
            </div>
          ) : (
            <div className="ent-table-container border-0 rounded-none">
              <table className="ent-table">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-[#F3F6FB] min-w-[200px]">Permission Code</th>
                    <th className="min-w-[110px]">Module</th>
                    {roles.map((r: any) => (
                      <th key={r.code} className="text-center min-w-[130px]">
                        <div className="font-bold text-[#0F172A]">{r.name}</div>
                        <div className="text-[10px] font-mono text-[#64748B] font-normal mt-0.5">{r.code}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((p: any) => {
                    const mc = MODULE_COLORS[p.module] || MODULE_COLORS.Config;
                    return (
                      <tr key={p.code}>
                        <td className="sticky left-0 z-10 bg-inherit">
                          <span className="font-mono text-[12px] font-semibold text-[#334155]">{p.code}</span>
                        </td>
                        <td>
                          <span
                            className="ent-badge text-[10px]"
                            style={{ background: mc.bg, color: mc.text, border: `1px solid ${mc.border}` }}
                          >
                            {p.module}
                          </span>
                        </td>
                        {roles.map((r: any) => {
                          const isAssigned = (matrix as any)[r.code]?.includes(p.code) || r.code === "PLATFORM_ADMIN";
                          return (
                            <td key={r.code} className="text-center">
                              {isAssigned ? (
                                <div className="inline-flex w-6 h-6 rounded-full items-center justify-center"
                                  style={{ background: "#D1FAE5", border: "1px solid #6EE7B7" }}>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                </div>
                              ) : (
                                <div className="inline-flex w-6 h-6 rounded-full items-center justify-center bg-[#F1F5F9]">
                                  <X className="w-3 h-3 text-[#CBD5E1]" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ── Role Cards ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((r: any) => (
            <div
              key={r.code}
              className="ent-card p-5 hover:shadow-md transition-all cursor-default"
              style={{ borderLeft: "3px solid #6C63FF" }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#EDE9FE" }}>
                  <ShieldCheck className="w-5 h-5 text-[#6C63FF]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#0F172A] text-[14px] leading-tight">{r.name}</h3>
                  <p className="text-[11px] font-mono text-[#6C63FF] mt-0.5">{r.code}</p>
                </div>
              </div>
              <p className="text-[12px] text-[#64748B] mt-3 leading-relaxed">
                {r.description || "Enterprise standard role definition."}
              </p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#E2E8F0]">
                <span className="font-mono text-[10px] text-[#94A3B8]">v{r.version}</span>
                {r.is_system ? (
                  <span className="ent-badge ent-badge-processing">
                    <Lock className="w-2.5 h-2.5" /> System Role
                  </span>
                ) : (
                  <span className="ent-badge ent-badge-inactive">Custom Role</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create Role Modal ── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Enterprise Role">
        <form
          onSubmit={(e) => { e.preventDefault(); createRoleMutation.mutate(formData); }}
          className="space-y-4"
        >
          <div>
            <label className="ent-label">Role Name</label>
            <input
              className="ent-input"
              placeholder="e.g. Regional Risk Officer"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="ent-label">Role Code</label>
            <input
              className="ent-input font-mono"
              placeholder="e.g. REGIONAL_RISK_OFFICER"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, "_") })}
              required
            />
          </div>
          <div>
            <label className="ent-label">Description</label>
            <textarea
              className="ent-input resize-none h-20"
              placeholder="Role duties and scope…"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
            <button type="button" onClick={() => setIsModalOpen(false)} className="ent-btn ent-btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={createRoleMutation.isPending} className="ent-btn ent-btn-primary">
              {createRoleMutation.isPending ? "Creating…" : "Save Role"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
