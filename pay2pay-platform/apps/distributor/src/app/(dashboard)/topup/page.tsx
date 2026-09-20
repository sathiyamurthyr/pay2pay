"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  X,
  Upload
} from "lucide-react";
import { DistributorAPI, TopupRequestItem } from "@/services/distributor-api";

export default function DistributorTopupPage() {
  const [requests, setRequests] = useState<TopupRequestItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [walletBalance, setWalletBalance] = useState<number>(0.0);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Top-up Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("IMPS");
  const [reference, setReference] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState<string>("");
  const [slipUrl, setSlipUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [walletRes, topupRes] = await Promise.all([
        DistributorAPI.getWallet(),
        DistributorAPI.getTopupRequests({
          status: filterStatus !== "ALL" ? filterStatus : undefined
        })
      ]);
      if (walletRes) setWalletBalance(Number(walletRes.balance) || 0.0);
      setRequests(topupRes?.data || []);
    } catch (err: any) {
      console.error("Topup load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const handleSubmitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!numAmt || numAmt <= 0) {
      setSubmitError("Please enter a valid requested amount greater than 0.");
      return;
    }
    if (!reference || reference.trim().length < 6) {
      setSubmitError("Please enter a valid UTR / Bank Reference Number (at least 6 characters).");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      await DistributorAPI.submitTopupRequest({
        requested_amount: numAmt,
        payment_mode: paymentMode,
        payment_reference: reference.trim(),
        payment_date: paymentDate,
        slip_url: slipUrl.trim() || undefined,
        remarks: remarks.trim() || undefined
      });
      setSubmitSuccess("Top-up request submitted successfully! Pending Admin verification and approval.");
      setTimeout(() => {
        setModalOpen(false);
        setAmount("");
        setReference("");
        setRemarks("");
        setSlipUrl("");
        setSubmitSuccess(null);
        loadData();
      }, 1500);
    } catch (err: any) {
      setSubmitError(err?.response?.data?.detail || "Failed to submit top-up request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
            Distributor Wallet Top-up
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Submit bank deposit requests to replenish your wallet balance. Approvals are authorized by Admin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            New Top-up Request
          </button>
        </div>
      </div>

      {/* Wallet Balance Status Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#131B2E] via-[#111827] to-[#0E1524] border border-amber-500/30 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-amber-400/90 font-bold block mb-1">
              Current Available Balance
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-lg text-amber-400 font-bold">₹</span>
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Authoritative database source of truth. Funds are credited upon Admin approval.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300 max-w-md">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">Audit-Locked Workflow</span>
              Distributor submits requests with UTR proof. Platform Administrators approve funds into your wallet.
            </div>
          </div>
        </div>
      </div>

      {/* Requests History Toolbar */}
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">Filter Requests:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL" className="bg-[#111827]">All Requests</option>
            <option value="PENDING" className="bg-[#111827]">Pending Review</option>
            <option value="APPROVED" className="bg-[#111827]">Approved</option>
            <option value="REJECTED" className="bg-[#111827]">Rejected</option>
          </select>
        </div>

        <span className="text-xs text-slate-400">
          Total: <strong className="text-white">{requests.length}</strong>
        </span>
      </div>

      {/* Requests Table or Empty State */}
      <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
            Loading top-up request history...
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-white mb-1">No top-up requests yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Submit your first bank deposit top-up request to add working capital to your distributor wallet.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Submit Top-up Request
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.08] bg-white/[0.02]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Request ID</th>
                  <th className="py-3 px-4 font-semibold">Mode</th>
                  <th className="py-3 px-4 font-semibold">UTR / Ref No</th>
                  <th className="py-3 px-4 font-semibold text-right">Requested</th>
                  <th className="py-3 px-4 font-semibold text-right">Approved</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold">Admin Notes / Remarks</th>
                  <th className="py-3 px-4 font-semibold">Date Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-200">
                {requests.map((req) => {
                  const isPending = req.status === "PENDING";
                  const isApproved = req.status === "APPROVED";
                  const isRejected = req.status === "REJECTED";

                  return (
                    <tr key={req.topup_ref_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                        {req.topup_request_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-white/[0.05] text-[10px] font-semibold text-slate-300">
                          {req.payment_mode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {req.payment_reference}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        ₹{Number(req.requested_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        {req.approved_amount ? `₹${Number(req.approved_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isApproved
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : isPending
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {isApproved && <CheckCircle2 className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          {isRejected && <XCircle className="w-3 h-3" />}
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate text-[11px]">
                        {req.rejection_reason || req.admin_notes || req.remarks || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {req.created_at ? new Date(req.created_at).toLocaleDateString("en-IN") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Top-up Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !submitting && setModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-[#111827] border border-amber-500/30 p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                Submit Wallet Top-up Request
              </h3>
              <button
                onClick={() => !submitting && setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-white">{submitSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTopup} className="space-y-4 text-left">
                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Requested Amount (INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="0.01"
                    placeholder="e.g. 50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Payment Mode *
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-amber-500/60"
                    >
                      <option value="IMPS" className="bg-[#111827]">IMPS</option>
                      <option value="NEFT" className="bg-[#111827]">NEFT</option>
                      <option value="RTGS" className="bg-[#111827]">RTGS</option>
                      <option value="UPI" className="bg-[#111827]">UPI</option>
                      <option value="POS - Instant" className="bg-[#111827]">POS - Instant</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bank Reference / UTR Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UTR123456789012"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Deposit Slip URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://... or upload path"
                    value={slipUrl}
                    onChange={(e) => setSlipUrl(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Remarks (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional notes for Admin verifier"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-500/[0.05] border border-amber-500/20 text-[11px] text-amber-300/90">
                  Top-up requests are subject to Admin verification. Once approved, the funds will be automatically credited to your distributor wallet.
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      Submit Top-up Request
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
