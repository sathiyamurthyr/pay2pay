"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  Users, UserCheck, ArrowLeft, Building2, Shield, Mail, Phone,
  Lock, MapPin, Briefcase, Network, CheckCircle2, AlertCircle, RefreshCw,
  Clock, ShieldAlert, FileText, Activity
} from "lucide-react";

export default function SalesPersonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const salesUserId = params.id as string;

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    employee_code: "",
    territory: "",
    department: "",
    designation: "",
    status: "ACTIVE",
    new_password: "",
  });

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Fetch sales user details
  const { data: user, isLoading, refetch } = useQuery({
    queryKey: ["sales-user-detail", salesUserId],
    queryFn: async () => {
      const res = await apiClient.get(`/admin/sales-management/users/${salesUserId}`);
      return res.data;
    },
    enabled: !!salesUserId,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        employee_code: user.employee_code || "",
        territory: user.territory || "",
        department: user.department || "Sales & Distribution",
        designation: user.designation || "Area Sales Manager",
        status: user.status || "ACTIVE",
        new_password: "",
      });
    }
  }, [user]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload: any = {
        full_name: data.full_name,
        phone: data.phone,
        employee_code: data.employee_code,
        territory: data.territory,
        department: data.department,
        designation: data.designation,
      };
      if (data.new_password && data.new_password.trim().length > 0) {
        payload.password = data.new_password.trim();
      }
      const res = await apiClient.put(`/admin/sales-management/users/${salesUserId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ type: "success", message: "Sales person profile updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["sales-user-detail", salesUserId] });
      queryClient.invalidateQueries({ queryKey: ["sales-users"] });
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || "Failed to update profile";
      setFeedback({ type: "error", message: detail });
    },
  });

  // Status toggle
  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await apiClient.patch(`/admin/sales-management/users/${salesUserId}/status`, {
        status: newStatus,
        reason: `Status changed to ${newStatus} from admin console`,
      });
      return res.data;
    },
    onSuccess: () => {
      setFeedback({ type: "success", message: "Account status updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ["sales-user-detail", salesUserId] });
      queryClient.invalidateQueries({ queryKey: ["sales-users"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          <span>Loading sales representative profile...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-500 mb-2" />
        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">Sales User Not Found</div>
        <Link href="/sales-management" className="text-sm text-indigo-600 hover:underline mt-2 inline-block">
          Return to Sales Force Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/sales-management"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sales Force Directory
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/sales-management/${salesUserId}/mapping`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-semibold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
          >
            <Network className="w-4 h-4" />
            Manage Hierarchy Mapping ({user.mappings_count || 0})
          </Link>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-2xl shadow-lg">
            {(user.full_name || "S").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {user.full_name}
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {user.employee_code || "SALES-REP"}
              </span>
              {user.status === "ACTIVE" ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {user.status}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <strong className="text-slate-700 dark:text-slate-300">Tenant:</strong> {user.tenant_name || "Assigned Tenant"}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {user.email}
              </span>
              {user.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {user.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-2">
          {user.status === "ACTIVE" ? (
            <button
              onClick={() => statusMutation.mutate("INACTIVE")}
              disabled={statusMutation.isPending}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-semibold border border-rose-200 transition"
            >
              Deactivate User
            </button>
          ) : (
            <button
              onClick={() => statusMutation.mutate("ACTIVE")}
              disabled={statusMutation.isPending}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold border border-emerald-200 transition"
            >
              Activate User
            </button>
          )}
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

      {/* Edit Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateMutation.mutate(formData);
        }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-500" />
            Edit Sales Profile & Territory
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
              Employee Code
            </label>
            <input
              type="text"
              value={formData.employee_code}
              onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
              Designation
            </label>
            <input
              type="text"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
              Department
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
              Territory / Region
            </label>
            <input
              type="text"
              value={formData.territory}
              onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
              Reset Password (Optional)
            </label>
            <input
              type="password"
              placeholder="Leave blank to keep existing password"
              value={formData.new_password}
              onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Enter a new secure password only if the sales user requested a password reset.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-2"
          >
            {updateMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
