"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { ResetPasswordModal } from "@/components/ui/reset-password-modal";
import {
  Users, UserPlus, Shield, ShieldAlert, ShieldCheck,
  CheckCircle2, XCircle, Key, RefreshCw, UserCheck, KeyRound, AlertCircle
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DataTable, type TableColumn } from "@/components/ui/data-table";

const DEFAULT_USER_TYPES = [
  { code: "ADMIN", name: "Admin / Platform Admin", description: "Full platform administration rights and governance" },
  { code: "RM", name: "Regional Manager (RM)", description: "Manages territory network, transactions, and reports" },
  { code: "CRM", name: "CRM Executive / Manager", description: "Customer relationship, wallet & merchant support operations" },
  { code: "AUDIT", name: "Audit & Compliance", description: "Audit logs, compliance review, and reporting" },
  { code: "OPERATIONS", name: "Operations Executive", description: "Terminal operations, service control & transactions" },
  { code: "FINANCE", name: "Finance Manager", description: "Settlements, wallet balances, accounts & payouts" },
  { code: "SUPPORT", name: "Support Executive", description: "Helpdesk and customer operations support" },
];

export default function UsersPage({ initialOpenModal = false }: { initialOpenModal?: boolean } = {}) {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(initialOpenModal);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const isCreateUrl =
        window.location.pathname.endsWith("/create") ||
        window.location.search.includes("action=create") ||
        window.location.search.includes("create=true");
      if (isCreateUrl) {
        setIsModalOpen(true);
      }
    }
  }, []);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    full_name: "",
    phone: "",
    user_type: "ADMIN",
    role_ids: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);
  const [resetTargetUser, setResetTargetUser] = useState<any>(null);

  // Fetch admin users via backend API (calls sp_list_admin_users)
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await apiClient.get("/users");
      return Array.isArray(res.data) ? res.data : (res.data?.items || []);
    },
  });

  // Fetch user types via backend API (calls sp_list_user_types)
  const { data: userTypes = DEFAULT_USER_TYPES } = useQuery({
    queryKey: ["userTypes"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/users/user-types");
        return Array.isArray(res.data) && res.data.length > 0 ? res.data : DEFAULT_USER_TYPES;
      } catch {
        return DEFAULT_USER_TYPES;
      }
    },
  });

  // Fetch available roles for mapping via backend API
  const { data: availableRoles = [] } = useQuery({
    queryKey: ["availableRoles"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/roles");
        return Array.isArray(res.data) ? res.data : (res.data?.items || []);
      } catch {
        return [];
      }
    },
  });

  // Create admin user mutation (calls sp_create_admin_user)
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiClient.post("/users", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsModalOpen(false);
      setFormData({
        email: "",
        username: "",
        password: "",
        full_name: "",
        phone: "",
        user_type: "ADMIN",
        role_ids: [],
      });
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message || err?.response?.data?.detail || err?.message || "Failed to create user.");
    },
  });

  // Update user status mutation (calls sp_update_admin_user_status)
  const statusMutation = useMutation({
    mutationFn: async ({ userId, newStatus }: { userId: string; newStatus: string }) => {
      const res = await apiClient.patch(`/users/${userId}/status`, { status: newStatus });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      console.error("Failed to update user status", err);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const displayUsers = Array.isArray(users) ? users : [];

  const getUserTypeBadge = (userType: string) => {
    const typeCode = (userType || "ADMIN").toUpperCase();
    let badgeClass = "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
    if (typeCode === "ADMIN" || typeCode === "PLATFORM_ADMIN") {
      badgeClass = "bg-[#F3E8FF] text-[#7C3AED] border-[#DDD6FE]";
    } else if (typeCode === "RM" || typeCode === "REGIONAL_MANAGER") {
      badgeClass = "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]";
    } else if (typeCode === "CRM" || typeCode === "CRM_EXECUTIVE") {
      badgeClass = "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]";
    } else if (typeCode === "AUDIT" || typeCode === "AUDITOR") {
      badgeClass = "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]";
    } else if (typeCode === "OPERATIONS") {
      badgeClass = "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
    } else if (typeCode === "FINANCE") {
      badgeClass = "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]";
    } else if (typeCode === "SUPPORT") {
      badgeClass = "bg-[#F8FAFC] text-[#475569] border-[#CBD5E1]";
    }
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${badgeClass}`}>
        <UserCheck className="w-3 h-3" /> {typeCode}
      </span>
    );
  };

  const columns: TableColumn<any>[] = [
    {
      id: "user_details",
      header: "User Details",
      sortable: true,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-[13px] text-white shrink-0 bg-[#2563EB]">
            {u.full_name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <p className="font-bold text-[#0F172A] text-[13px]">{u.full_name || "—"}</p>
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
      cell: (u) => getUserTypeBadge(u.user_type),
    },
    {
      id: "roles",
      header: "Assigned Roles",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles && u.roles.length > 0 ? (
            u.roles.map((r: any, idx: number) => (
              <span key={idx} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                <Shield className="w-2.5 h-2.5" />
                {r.name || r.code}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-[#94A3B8] font-medium">Auto Mapped</span>
          )}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      cell: (u) => {
        const s = (u.status || "ACTIVE").toUpperCase();
        if (s === "ACTIVE") {
          return (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          );
        }
        if (s === "INACTIVE") {
          return (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
              <AlertCircle className="w-3 h-3" /> Inactive
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5]">
            <XCircle className="w-3 h-3" /> {s}
          </span>
        );
      },
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
      header: "Created Date",
      sortable: true,
      cell: (u) => <span className="font-mono text-[11px] text-[#64748B]">{formatDate(u.created_date || u.created_at)}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (u) => {
        const currentStatus = (u.status || "ACTIVE").toUpperCase();
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
              <option value="BLOCKED" className="bg-white text-[#991B1B]">⛔ Blocked</option>
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
            <Users className="w-7 h-7 text-[#2563EB]" /> Platform Admin & Portal Users
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Create and manage administrative accounts for Admin, RM, CRM, Audit, Operations, and Finance with auto menu access
          </p>
        </div>
        <button
          onClick={() => { setError(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer w-fit"
        >
          <UserPlus className="w-4 h-4" /> Create User
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: displayUsers.length, color: "#2563EB", bg: "#EFF6FF" },
          { label: "Active", value: displayUsers.filter((u: any) => u.status === "ACTIVE").length, color: "#16A34A", bg: "#DCFCE7" },
          { label: "MFA Active", value: displayUsers.filter((u: any) => u.mfa_enabled).length, color: "#9333EA", bg: "#F3E8FF" },
          { label: "User Classifications", value: Array.from(new Set(displayUsers.map((u: any) => u.user_type || "ADMIN"))).length, color: "#D97706", bg: "#FEF3C7" },
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
        addNewLabel="Create User"
        searchPlaceholder="Search admin users by name, email, username..."
        filterOptions={[
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
              { label: "Suspended", value: "SUSPENDED" },
              { label: "Blocked", value: "BLOCKED" },
            ],
          },
        ]}
      />

      {/* Create User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Portal Administrative User">
        {error && (
          <div className="mb-4 p-3 rounded-xl border flex items-center gap-2 text-xs font-bold bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]">
            <ShieldAlert className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="space-y-4 text-xs font-bold"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[#475569] uppercase tracking-wider text-[11px] block mb-1.5 font-extrabold">Full Name *</label>
              <input
                className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2.5 text-[#0F172A] font-semibold focus:bg-white focus:border-[#2563EB] focus:outline-none transition-all"
                placeholder="e.g. Ramesh Kumar"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-[#475569] uppercase tracking-wider text-[11px] block mb-1.5 font-extrabold">Username *</label>
              <input
                className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2.5 text-[#0F172A] font-semibold focus:bg-white focus:border-[#2563EB] focus:outline-none transition-all"
                placeholder="e.g. ramesh_rm"
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
                placeholder="ramesh@pay2pay.in"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-[#475569] uppercase tracking-wider text-[11px] block mb-1.5 font-extrabold">Initial Password *</label>
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

          <div>
            <label className="text-[#475569] uppercase tracking-wider text-[11px] block mb-1.5 font-extrabold">Phone Number</label>
            <input
              type="text"
              className="w-full rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-2.5 text-[#0F172A] font-semibold focus:bg-white focus:border-[#2563EB] focus:outline-none transition-all"
              placeholder="e.g. +91 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          {/* User Type Selection Dropdown */}
          <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 space-y-2">
            <label className="text-[#1E40AF] uppercase tracking-wider text-[11px] font-extrabold flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#2563EB]" /> Select User Type (Auto-Access Menus) *
            </label>
            <select
              className="w-full rounded-xl border border-[#93C5FD] bg-white p-2.5 text-[#0F172A] font-bold focus:border-[#2563EB] focus:outline-none cursor-pointer shadow-2xs"
              value={formData.user_type}
              onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
              required
            >
              {(userTypes || DEFAULT_USER_TYPES).map((ut: any) => {
                const code = ut.code || ut.user_type_code;
                const name = ut.name || ut.user_type_name;
                const desc = ut.description || name;
                return (
                  <option key={code} value={code}>
                    {name} ({code}) — {desc}
                  </option>
                );
              })}
            </select>
            <p className="text-[11px] text-[#3B82F6] font-medium">
              Automatically configures left-navigation access menus (Admin, RM, CRM, Audit, Operations, Finance) based on role policies.
            </p>
          </div>

          {/* Optional Role Assignment */}
          {availableRoles.length > 0 && (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2">
              <label className="text-[#475569] uppercase tracking-wider text-[11px] font-extrabold flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#64748B]" /> Assign RBAC Roles (Optional)
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {availableRoles.map((r: any) => {
                  const roleId = r.public_id || r.id;
                  const isChecked = formData.role_ids.includes(roleId);
                  return (
                    <label
                      key={roleId}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                        isChecked
                          ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"
                          : "bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, role_ids: [...formData.role_ids, roleId] });
                          } else {
                            setFormData({ ...formData, role_ids: formData.role_ids.filter((id) => id !== roleId) });
                          }
                        }}
                        className="rounded text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <span className="truncate">{r.name || r.code}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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
            queryClient.invalidateQueries({ queryKey: ["users"] });
          }}
        />
      )}
    </div>
  );
}
