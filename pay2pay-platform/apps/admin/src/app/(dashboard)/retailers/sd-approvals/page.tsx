"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Crown,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Building2,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  ChevronLeft,
  AlertCircle,
  Loader2
} from "lucide-react";
import { apiClient } from "@/lib/api";

export default function SuperDistributorApprovalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await apiClient.get("/admin/retailer-control/pending-approvals");
      const sds = res.data?.data?.super_distributors || [];
      setItems(sds);
    } catch (err: any) {
      console.error("Error fetching pending SDs:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load pending Super Distributor approvals.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (sdId: string, action: "APPROVE" | "REJECT") => {
    try {
      setProcessingId(sdId);
      setActionSuccess(null);
      await apiClient.post(`/admin/retailer-control/sd-approvals/${sdId}`, {
        action,
        reason: `Administrative ${action.toLowerCase()} action`,
      });

      setActionSuccess(`Super Distributor successfully ${action === "APPROVE" ? "approved and activated" : "rejected"}.`);
      fetchPending();
    } catch (err: any) {
      console.error(`Error performing ${action}:`, err);
      alert(err?.response?.data?.detail || err?.message || `Failed to ${action} Super Distributor.`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── BREADCRUMB ── */}
      <Link
        href="/retailers"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-amber-300 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Partners</span>
      </Link>

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              Master Distributor Approvals
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-500/20">
              {items.length} Pending
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Review and approve Master / Super Distributor partner registrations.
          </p>
        </div>

        <button
          onClick={fetchPending}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchPending} className="font-bold underline text-rose-200">
            Retry
          </button>
        </div>
      )}

      {/* ── LIST / TABLE ── */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/[0.02] border border-white/[0.04] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500/50 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">All Master Distributor Approvals Clear!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no Super Distributor partners currently pending administrative KYC or approval.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Super Distributor</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Created At</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {items.map((sd) => (
                  <tr key={sd.super_distributor_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-slate-200">{sd.business_name}</p>
                        <p className="font-mono text-[10px] text-amber-400">{sd.super_distributor_code}</p>
                      </div>
                    </td>

                    <td className="p-4 text-slate-300">
                      <div>{sd.owner_name}</div>
                      <div className="text-[10px] text-slate-500">{sd.mobile} • {sd.email}</div>
                    </td>

                    <td className="p-4 text-slate-300">
                      {sd.city || "—"}, {sd.state || "—"}
                    </td>

                    <td className="p-4 text-slate-400 text-[11px]">
                      {sd.created_at ? new Date(sd.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleAction(sd.super_distributor_id, "APPROVE")}
                          disabled={processingId === sd.super_distributor_id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                        >
                          {processingId === sd.super_distributor_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => handleAction(sd.super_distributor_id, "REJECT")}
                          disabled={processingId === sd.super_distributor_id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500/30 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
