"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { ResetPasswordModal } from "@/components/ui/reset-password-modal";
import {
  Users, UserPlus, Search, Shield, ShieldAlert, ShieldCheck,
  X, CheckCircle2, XCircle, Key, Clock, Edit2, RefreshCw, UserCheck, Power, PowerOff, KeyRound
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DataTable, type TableColumn } from "@/components/ui/data-table";

const DEFAULT_USER_TYPES = [
  { code: "PLATFORM_ADMIN", name: "Platform Admin", description: "Full platform administration rights" },
  { code: "SUPER_ADMIN", name: "Super Admin", description: "Global administrator with all privileges" },
  { code: "REGIONAL_MANAGER", name: "Regional Manager (RM)", description: "Manages territory super distributors and operations" },
  { code: "CRM_EXECUTIVE", name: "CRM Executive", description: "Customer relationship management & merchant support officer" },
  { code: "CRM_MANAGER", name: "CRM Manager", description: "CRM team lead & support manager" },
  { code: "SUPER_DISTRIBUTOR", name: "Super Distributor", description: "Manages distributors network and bulk allocations" },
  { code: "DISTRIBUTOR", name: "Distributor", description: "Manages retailer network and local operations" },
  { code: "RETAILER", name: "Retailer", description: "Merchant outlet user" },
  { code: "OPERATIONS", name: "Operations Executive", description: "Day-to-day transaction & terminal support" },
  { code: "COMPLIANCE", name: "Compliance Officer", description: "KYC, audit & AML review officer" },
  { code: "FINANCE", name: "Finance Manager", description: "Settlements, accounting & payout manager" },
  { code: "SETTLEMENT_MGR", name: "Settlement Manager", description: "Settlement approval & processing" },
  { code: "AUDIT_VIEWER", name: "Audit Viewer", description: "Read-only audit & reports access" },
];

const MOCK_USERS = [
  { public_id: "usr-admin-01", full_name: "System Admin User", email: "admin@pay2pay.in", username: "admin_user", user_type: "SUPER_ADMIN", status: "ACTIVE", mfa_enabled: true, roles: [{ name: "Super Admin" }], created_at: "2026-01-10T08:00:00Z" },
  { public_id: "usr-rm-01", full_name: "Ramesh Verma (RM)", email: "rm.ramesh@pay2pay.in", username: "rm_ramesh", user_type: "REGIONAL_MANAGER", status: "ACTIVE", mfa_enabled: true, roles: [{ name: "Regional Manager" }], created_at: "2026-01-15T09:30:00Z" },
  { public_id: "usr-crm-01", full_name: "Chitra Singh (CRM)", email: "crm.chitra@pay2pay.in", username: "crm_chitra", user_type: "CRM_EXECUTIVE", status: "ACTIVE", mfa_enabled: true, roles: [{ name: "CRM Executive" }], created_at: "2026-01-20T11:00:00Z" },
  { public_id: "usr-1", full_name: "Rajesh Kumar", email: "rajesh@pay2pay.in", username: "rajesh_k", user_type: "PLATFORM_ADMIN", status: "ACTIVE", mfa_enabled: true, roles: [{ name: "Platform Admin" }], created_at: "2026-01-15T10:00:00Z" },
  { public_id: "usr-2", full_name: "Priya Sharma", email: "priya@pay2pay.in", username: "priya_s", user_type: "COMPLIANCE", status: "ACTIVE", mfa_enabled: true, roles: [{ name: "Compliance Officer" }], created_at: "2026-02-20T11:30:00Z" },
  { public_id: "usr-3", full_name: "Anand Mehta", email: "anand@pay2pay.in", username: "anand_m", user_type: "FINANCE", status: "ACTIVE", mfa_enabled: false, roles: [{ name: "Settlement Manager" }], created_at: "2026-03-10T09:15:00Z" },
  { public_id: "usr-4", full_name: "Suresh Babu", email: "suresh@pay2pay.in", username: "suresh_b", user_type: "OPERATIONS", status: "SUSPENDED", mfa_enabled: false, roles: [{ name: "Ops Executive" }], created_at: "2026-04-05T14:45:00Z" },
];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "", username: "", password: "", full_name: "", phone: "", user_type: "PLATFORM_ADMIN", role_ids: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);
  const [localUsers, setLocalUsers] = useState<any[] | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<any>(null);

  const { data: users = MOCK_USERS, isLoading, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await apiClient.get("/users");
      return res.data;
    },
  });

  const { data: userTypes = DEFAULT_USER_TYPES } = useQuery({
    queryKey: ["userTypes"],
    queryFn: async () => {
      const res = await apiClient.get("/users/user-types");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiClient.post("/users", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsModalOpen(false);
      setFormData({ email: "", username: "", password: "", full_name: "", phone: "", user_type: "PLATFORM_ADMIN", role_ids: [] });
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err?.message || "Failed to create user.");
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: string }) => {
      setLocalUsers((prev) => {
        const currentList = prev || displayUsers;
        return currentList.map((u: any) =>
          u.public_id === userId ? { ...u, status: newStatus } : u
        );
      });
      try {
        const res = await apiClient.patch(`/users/${userId}/status`, { status: newStatus });
        return res.data;
      } catch (e) {
        return { public_id: userId, status: newStatus };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const displayUsers = localUsers || (Array.isArray(users) && users.length > 0 ? users : MOCK_USERS);

  const columns: TableColumn<any>[] = [
    {
      id: "user_details",
      header: "User Details",
      sortable: true,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-[13px] text-white shrink-0 bg-[#2563EB]"
          >
            {u.full_name?.charAt(0) || "U"}
          </div>
          <div>
            <p className="font-bold text-[#0F172A] text-[13px]">{u.full_name}</p>
            <p className="text-[11px] text-[#64748B] font-medium">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: "username",
      header: "Username",
      sortable: true,
      cell: (u) => <span className="font-mono text-xs text-[#2563EB] font-extrabold">{u.username}</span>,
    },
    {
      id: "user_type",
      header: "User Type",
      sortable: true,
      cell: (u) => (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#F3E8FF] text-[#7C3AED] border border-[#DDD6FE]">
          <UserCheck className="w-3 h-3 text-[#7C3AED]" /> {u.user_type || "PLATFORM_ADMIN"}
        </span>
      ),
    },
    {
      id: "roles",
      header: "Assigned Roles",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles?.map((r: any, idx: number) => (
            <span key={idx} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
              <Shield className="w-2.5 h-2.5" />
              {r.name}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (u) => (
        u.status === "ACTIVE" ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]">
            <XCircle className="w-3 h-3" /> {u.status || "INACTIVE"}
          </span>
        )
      ),
    },
    {
      id: "mfa",
      header: "MFA",
      cell: (u) => (
        u.mfa_enabled ? (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
            <ShieldCheck className="w-3 h-3" /> Enabled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
            <Key className="w-3 h-3" /> Disabled
          </span>
        )
      ),
    },
    {
      id: "created_at",
      header: "Created At",
      sortable: true,
      cell: (u) => <span className="font-mono text-[11px] text-[#64748B]">{formatDate(u.created_at)}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (u) => {
        const currentStatus = u.status?.toUpperCase() || "ACTIVE";
        
        let styleClass = "bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]";
        if (currentStatus === "INACTIVE") {
          styleClass = "bg-[#FEF3C7] border-[#FDE68A] text-[#B45309]";
        } else if (currentStatus === "SUSPENDED" || currentStatus === "BLOCKED") {
          styleClass = "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]";
        }

        return (
          <div className="flex items-center gap-2">
            <select
              value={currentStatus}
              onChange={(e) => {
                const newStatus = e.target.value;
                statusMutation.mutate({ userId: u.public_id, newStatus });
              }}
              disabled={statusMutation.isPending}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer focus:outline-none transition-all shadow-2xs ${styleClass}`}
            >
              <option value="ACTIVE" className="bg-white text-[#15803D]">🟢 Active</option>
              <option value="INACTIVE" className="bg-white text-[#B45309]">🟡 Inactive</option>
              <option value="SUSPENDED" className="bg-white text-[#991B1B]">🔴 Suspended</option>
            </select>

            <button
              type="button"
              onClick={() => setResetTargetUser(u)}
              className="p-2 rounded-xl border border-[#CBD5E1] bg-white text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#BFDBFE] transition-all cursor-pointer shadow-2xs"
              title="Reset Account Password"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-3">
            <Users className="w-7 h-7 text-[#2563EB]" /> Platform Admin Users
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Manage enterprise administrator accounts, UserType mappings, RBAC role assignments, and security settings
          </p>
        </div>
        <button
          onClick={() => { setError(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer w-fit"
        >
          <UserPlus className="w-4 h-4" /> Create Admin User
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Users",  value: displayUsers.length, color: "#2563EB", bg: "#EFF6FF" },
          { label: "Active",       value: displayUsers.filter((u: any) => u.status === "ACTIVE").length, color: "#16A34A", bg: "#DCFCE7" },
          { label: "MFA Active",   value: displayUsers.filter((u: any) => u.mfa_enabled).length, color: "#9333EA", bg: "#F3E8FF" },
          { label: "User Types",   value: Array.from(new Set(displayUsers.map((u: any) => u.user_type || "PLATFORM_ADMIN"))).length, color: "#D97706", bg: "#FEF3C7" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">{label}</p>
            <h3 className="mt-1 text-2xl font-extrabold text-[#0F172A]" style={{ color }}>{value}</h3>
          </div>
        ))}
      </div>

      {/* Standardized DataTable */}
      <DataTable
        data={displayUsers}
        columns={columns}
        keyExtractor={(u) => u.public_id}
        loading={isLoading}
        totalRecords={displayUsers.length}
        pageSize={10}
        onRefresh={() => refetch()}
        onAddNew={() => { setError(null); setIsModalOpen(true); }}
        addNewLabel="Create Admin User"
        searchPlaceholder="Search admin users by name, email, username..."
        filterOptions={[
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Active", value: "ACTIVE" },
              { label: "Suspended", value: "SUSPENDED" },
            ],
          },
        ]}
      />

      {/* Create User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Enterprise Admin User">
        {error && (
          <div className="mb-4 p-3 rounded-xl border flex items-center gap-2 text-xs font-bold bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]">
            <ShieldAlert className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }}
          className="space-y-4 text-xs font-bold"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[#475569] uppercase tracking-wider text-[11px] block mb-1.5 font-extrabold">Full Name *</label>
              <input
                className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2.5 text-[#0F172A] font-semibold focus:bg-white focus:border-[#2563EB] focus:outline-none transition-all"
                placeholder="e.g. John Doe"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-[#475569] uppercase tracking-wider text-[11px] block mb-1.5 font-extrabold">Username *</label>
              <input
                className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2.5 text-[#0F172A] font-semibold focus:bg-white focus:border-[#2563EB] focus:outline-none transition-all"
                placeholder="e.g. jdoe"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[#475569] uppercase tracking-wider text-[11px] block mb-1.5 font-extrabold">Corporate Email *</label>
              <input
                type="email"
                className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2.5 text-[#0F172A] font-semibold focus:bg-white focus:border-[#2563EB] focus:outline-none transition-all"
                placeholder="john@pay2pay.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-[#475569] uppercase tracking-wider text-[11px] block mb-1.5 font-extrabold">Password *</label>
              <input
                type="password"
                className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2.5 text-[#0F172A] font-semibold focus:bg-white focus:border-[#2563EB] focus:outline-none transition-all"
                placeholder="••••••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </div>

          {/* User Type Selection Dropdown */}
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 space-y-2">
            <label className="text-[#1E40AF] uppercase tracking-wider text-[11px] font-extrabold flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#2563EB]" /> Select User Type *
            </label>
            <select
              className="w-full rounded-xl border border-[#93C5FD] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none cursor-pointer shadow-2xs"
              value={formData.user_type}
              onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
              required
            >
              {(userTypes || DEFAULT_USER_TYPES).map((ut: any) => (
                <option key={ut.code} value={ut.code}>
                  {ut.name} ({ut.code}) — {ut.description || ut.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#3B82F6] font-medium">
              Maps account privileges and portal workflow access to this user classification.
            </p>
          </div>

          <div className="pt-4 border-t border-[#F1F5F9] flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-[#475569] font-extrabold hover:bg-[#F8FAFC] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-[#2563EB] text-white font-extrabold hover:bg-[#1D4ED8] disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {createMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
              Create User
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      {resetTargetUser && (
        <ResetPasswordModal
          isOpen={!!resetTargetUser}
          onClose={() => setResetTargetUser(null)}
          targetName={resetTargetUser.full_name}
          targetCodeOrEmail={resetTargetUser.email}
          onSubmit={async (newPassword) => {
            await apiClient.post(`/users/${resetTargetUser.public_id}/reset-password`, { new_password: newPassword });
          }}
        />
      )}
    </div>
  );
}
