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
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-emerald-400" />
            Settlement Batches & Bank Payouts
          </h1>
          <p className="mt-1 text-slate-400">
            Daily merchant batch settlements, net payout aggregation, and IMPS/NEFT bank dispatches
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            Generate Settlement Batch
          </button>
          <button
            onClick={() => setShowPayoutModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all"
          >
            <ArrowUpRight className="h-4 w-4" />
            Dispatch Bank Payout
          </button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Batch Number & Date</th>
                <th className="px-5 py-4">Gross Volume</th>
                <th className="px-5 py-4">Total MDR & GST</th>
                <th className="px-5 py-4">Net Payout Amount</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    Loading Settlement Batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    No settlement batches generated yet. Click 'Generate Settlement Batch' to process.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-emerald-400 font-semibold">{b.batch_number}</div>
                      <div className="text-[10px] text-slate-400">{b.batch_date} ({b.transaction_count} txns)</div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-slate-100">₹{b.gross_volume.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 font-mono text-xs">
                      <span className="text-purple-400">MDR: ₹{b.total_mdr}</span> | <span className="text-cyan-400">GST: ₹{b.total_gst}</span>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-emerald-400">₹{b.net_payout_amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-400" />
                Generate Settlement Batch
              </h2>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateBatch} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-300">Target Company (Tenant) *</label>
                <select
                  value={batchCompanyId}
                  onChange={(e) => setBatchCompanyId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {companies.map((c) => (
                    <option key={c.public_id} value={c.public_id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg"
                >
                  Run Batch Aggregator
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
