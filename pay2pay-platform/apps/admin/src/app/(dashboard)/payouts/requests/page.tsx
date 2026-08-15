"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Send,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  X
} from "lucide-react";

export default function PayoutRequestsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [createData, setCreateData] = useState({
    wallet_id: "00000000-0000-0000-0000-000000000000",
    retailer_id: "00000000-0000-0000-0000-000000000000",
    amount: 5000,
    purpose: "MERCHANT_SETTLEMENT_PAYOUT",
    priority: "NORMAL"
  });

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/payouts/requests");
      setPayouts(res.data);
    } catch (err) {
      console.error("Failed to fetch payout requests", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/payouts/requests", createData);
      setShowCreateModal(false);
      fetchPayouts();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Payout request failed");
    }
  };

  const handleApprove = async (payoutId: string, decision: string) => {
    try {
      await api.post(`/api/v1/payouts/requests/${payoutId}/approve`, {
        decision,
        comments: "Maker-checker decision"
      });
      fetchPayouts();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Approval action failed");
    }
  };

  const handleProcessBank = async (payoutId: string) => {
    try {
      const res = await api.post(`/api/v1/payouts/requests/${payoutId}/process`, {
        gateway_code: "HDFC_IMPS",
        mode: "IMPS"
      });
      alert(`Outbound Bank IMPS Payout Dispatched! UTR: ${res.data.utr_number}`);
      fetchPayouts();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Bank payout dispatch failed");
    }
  };

  const handleReverse = async (payoutId: string) => {
    try {
      await api.post(`/api/v1/payouts/requests/${payoutId}/reverse?reason=Bank+return`);
      fetchPayouts();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Reversal failed");
    }
  };

  // Calculate KPI values from actual payouts array
  const totalAmount = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalTxns = payouts.length;

  const successPayouts = payouts.filter((p) => p.status === "SUCCESS");
  const successAmount = successPayouts.reduce((sum, p) => sum + (p.net_amount || p.amount || 0), 0);
  const successTxns = successPayouts.length;

  const pendingPayouts = payouts.filter((p) => ["PENDING", "PENDING_APPROVAL", "APPROVED", "PROCESSING"].includes(p.status));
  const pendingAmount = pendingPayouts.reduce((sum, p) => sum + (p.net_amount || p.amount || 0), 0);
  const pendingTxns = pendingPayouts.length;

  const failedPayouts = payouts.filter((p) => ["FAILED", "REJECTED", "REVERSED"].includes(p.status));
  const failedAmount = failedPayouts.reduce((sum, p) => sum + (p.net_amount || p.amount || 0), 0);
  const failedTxns = failedPayouts.length;

  return (
    <div className="space-y-4 select-none">
      {/* 1. SINGLE INTEGRATED COMPACT HEADER + FINANCIAL TOOLBAR CONTAINER (HEIGHT ~75-90px) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121B28] p-4 px-5 min-h-[82px] flex items-center shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-0 w-full items-center">
          {/* SECTION 1 — PAGE TITLE */}
          <div className="lg:pr-5">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              Payouts
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              View and manage retailer payout transactions
            </p>
          </div>

          {/* SECTION 2 — TOTAL PAYOUTS */}
          <div className="lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-5 lg:pr-4">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
              TOTAL PAYOUTS
            </span>
            <div className="text-lg font-black text-slate-900 dark:text-white my-0.5 leading-none">
              ₹{totalAmount.toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-500">
              {totalTxns} txns
            </span>
          </div>

          {/* SECTION 3 — SUCCESSFUL */}
          <div className="lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-5 lg:pr-4">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              SUCCESSFUL
            </span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 my-0.5 leading-none">
              ₹{successAmount.toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {successTxns} success
            </span>
          </div>

          {/* SECTION 4 — PENDING */}
          <div className="lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-5 lg:pr-4">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              PENDING
            </span>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400 my-0.5 leading-none">
              ₹{pendingAmount.toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {pendingTxns} proc.
            </span>
          </div>

          {/* SECTION 5 — FAILED / REVERSED */}
          <div className="lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                FAILED / REVERSED
              </span>
              <div className="text-lg font-black text-rose-600 dark:text-rose-400 my-0.5 leading-none">
                ₹{failedAmount.toLocaleString("en-IN")}
              </div>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {failedTxns} txns
              </span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="ml-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Request Payout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#0F172A]">
            <thead className="bg-[#F8FAFC] uppercase font-mono text-xs text-[#111827] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Payout #</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Gross Amount</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Net Payout</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">UTR Number</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Requested By</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Status</th>
                <th className="px-5 py-4 font-extrabold text-right text-[#111827]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-[#64748B] font-medium">Loading Payout Requests...</td></tr>
              ) : payouts.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-[#64748B] font-medium">No outbound payout requests created yet.</td></tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.public_id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-[#2563EB] font-extrabold">{p.payout_number}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[#0F172A] font-bold">₹{p.amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 font-mono text-xs font-extrabold text-[#15803D]">₹{p.net_amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[#475569] font-medium">{p.utr_number || "-"}</td>
                    <td className="px-5 py-4 text-xs font-mono text-[#334155] font-semibold">{p.requested_by}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.status === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : p.status === "APPROVED"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : p.status === "PENDING_APPROVAL"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-2">
                      {p.status === "PENDING_APPROVAL" && (
                        <>
                          <button onClick={() => handleApprove(p.public_id, "APPROVED")} className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Approve">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleApprove(p.public_id, "REJECTED")} className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" title="Reject">
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {(p.status === "APPROVED" || p.status === "PENDING_APPROVAL") && (
                        <button onClick={() => handleProcessBank(p.public_id)} className="p-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title="Dispatch Bank IMPS Payout">
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      {p.status === "SUCCESS" && (
                        <button onClick={() => handleReverse(p.public_id)} className="p-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20" title="Post Reversal">
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-400" /> Request Outbound Bank Payout
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-300">Wallet GUID *</label>
                <input
                  type="text"
                  required
                  value={createData.wallet_id}
                  onChange={(e) => setCreateData({ ...createData, wallet_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-slate-300">Retailer GUID *</label>
                <input
                  type="text"
                  required
                  value={createData.retailer_id}
                  onChange={(e) => setCreateData({ ...createData, retailer_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-slate-300">Payout Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={createData.amount}
                  onChange={(e) => setCreateData({ ...createData, amount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button type="submit" className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg">
                  Submit Payout Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
