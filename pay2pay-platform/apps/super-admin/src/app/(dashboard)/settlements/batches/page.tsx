"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Receipt,
  Plus,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  X
} from "lucide-react";

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  const [companies, setCompanies] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);

  const [batchCompanyId, setBatchCompanyId] = useState("");
  const [batchForm, setBatchForm] = useState({
    company_id: "",
    batch_date: new Date().toISOString().split("T")[0],
  });
  const [payoutForm, setPayoutForm] = useState({
    retailer_id: "",
    amount: 5000.0,
    payout_method: "IMPS",
    bank_account_number: "50100112233",
    ifsc: "HDFC0001234"
  });

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/settlements/batches");
      setBatches(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Failed to fetch settlement batches", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSetupData = async () => {
    try {
      const compRes = await api.get("/api/v1/companies");
      setCompanies(compRes.data.items);
      if (compRes.data.items.length > 0) setBatchCompanyId(compRes.data.items[0].public_id);

      const retRes = await api.get("/api/v1/retailers");
      setRetailers(retRes.data.items);
      if (retRes.data.items.length > 0) setPayoutForm(prev => ({ ...prev, retailer_id: retRes.data.items[0].public_id }));
    } catch (err) {
      console.error("Failed to load setup data", err);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchSetupData();
  }, []);

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/settlements/batches/generate", { company_id: batchCompanyId });
      setShowBatchModal(false);
      fetchBatches();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Settlement batch generation failed");
    }
  };

  const handleProcessPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/settlements/payouts/process", payoutForm);
      setShowPayoutModal(false);
      alert("Bank Payout instruction dispatched successfully with UTR reference!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Bank payout dispatch failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827] flex items-center gap-3">
            <Receipt className="h-7 w-7 text-[#2563EB]" />
            Settlement Batches & Bank Payouts
          </h1>
          <p className="mt-1 text-xs text-[#64748B] font-semibold">
            Daily merchant batch settlements, net payout aggregation, and IMPS/NEFT bank dispatches
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Generate Settlement Batch
          </button>
          <button
            onClick={() => setShowPayoutModal(true)}
            className="flex items-center gap-2 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
          >
            <ArrowUpRight className="h-4 w-4" />
            Dispatch Bank Payout
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#0F172A]">
            <thead className="bg-[#F8FAFC] uppercase font-mono text-xs text-[#111827] border-b border-[#E2E8F0]">
              <tr>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Batch Number & Date</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Gross Volume</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Total MDR & GST</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Net Payout Amount</th>
                <th className="px-5 py-4 font-extrabold text-[#111827]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-[#64748B] font-medium">
                    Loading Settlement Batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-[#64748B] font-medium">
                    No settlement batches generated yet. Click 'Generate Settlement Batch' to process.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.public_id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-[#2563EB] font-extrabold">{b.batch_number}</div>
                      <div className="text-[10px] text-[#64748B] font-semibold">{b.batch_date} ({b.transaction_count} txns)</div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-[#0F172A]">₹{b.gross_volume.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 font-mono text-xs">
                      <span className="text-[#7C3AED] font-bold">MDR: ₹{b.total_mdr}</span> | <span className="text-[#0284C7] font-bold">GST: ₹{b.total_gst}</span>
                    </td>
                    <td className="px-5 py-4 font-mono font-extrabold text-[#15803D]">₹{b.net_payout_amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h2 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#2563EB]" />
                Generate Settlement Batch
              </h2>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-[#64748B] hover:text-[#111827] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1">Company / Merchant ID</label>
                <input
                  type="text"
                  required
                  value={batchForm.company_id}
                  onChange={(e) => setBatchForm({ ...batchForm, company_id: e.target.value })}
                  placeholder="Enter target tenant public_id"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#374151] mb-1">Target Cutoff Settlement Date</label>
                <input
                  type="date"
                  required
                  value={batchForm.batch_date}
                  onChange={(e) => setBatchForm({ ...batchForm, batch_date: e.target.value })}
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs font-mono text-[#111827] focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-bold text-[#374151] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#16A34A] px-4 py-2 text-xs font-bold text-white hover:bg-[#15803D] shadow-xs"
                >
                  Aggregate & Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Process Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-blue-400" />
                Dispatch Bank Payout (IMPS/NEFT)
              </h2>
              <button onClick={() => setShowPayoutModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProcessPayout} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-300">Beneficiary Retailer *</label>
                <select
                  value={payoutForm.retailer_id}
                  onChange={(e) => setPayoutForm({ ...payoutForm, retailer_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {retailers.map((r) => (
                    <option key={r.public_id} value={r.public_id}>{r.store_name} ({r.retailer_code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Payout Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={payoutForm.amount}
                    onChange={(e) => setPayoutForm({ ...payoutForm, amount: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Payout Mode</label>
                  <select
                    value={payoutForm.payout_method}
                    onChange={(e) => setPayoutForm({ ...payoutForm, payout_method: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="IMPS">IMPS (Instant)</option>
                    <option value="NEFT">NEFT (Batch)</option>
                    <option value="WALLET_FLOAT">Wallet Float</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Bank Account Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="50100112233"
                    value={payoutForm.bank_account_number}
                    onChange={(e) => setPayoutForm({ ...payoutForm, bank_account_number: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">IFSC Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="HDFC0001234"
                    value={payoutForm.ifsc}
                    onChange={(e) => setPayoutForm({ ...payoutForm, ifsc: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 shadow-lg"
                >
                  Dispatch Payout Instruction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
