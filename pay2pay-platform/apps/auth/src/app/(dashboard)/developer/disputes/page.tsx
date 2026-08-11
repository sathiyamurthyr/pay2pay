"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  ShieldAlert,
  AlertTriangle,
  Plus,
  RefreshCw,
  FileText,
  CheckCircle2,
  X
} from "lucide-react";

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [retailers, setRetailers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    case_reference: "",
    transaction_id: "",
    retailer_id: "",
    dispute_amount: 15000.0,
    reason_code: "UNAUTHORIZED_TRANSACTION",
    due_date: new Date().toISOString().split("T")[0]
  });

  const fetchDisputes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/developer/disputes");
      setDisputes(res.data);
    } catch (err) {
      console.error("Failed to fetch disputes", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRetailers = async () => {
    try {
      const res = await api.get("/api/v1/retailers");
      setRetailers(res.data.items);
      if (res.data.items.length > 0) {
        setFormData(prev => ({ ...prev, retailer_id: res.data.items[0].public_id }));
      }
    } catch (err) {
      console.error("Failed to fetch retailers", err);
    }
  };

  useEffect(() => {
    fetchDisputes();
    fetchRetailers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/developer/disputes", formData);
      setShowModal(false);
      fetchDisputes();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Chargeback filing failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-rose-400" />
            Chargeback & Dispute Resolution
          </h1>
          <p className="mt-1 text-slate-400">
            File merchant dispute cases, upload proof-of-delivery evidence, and manage reserve holds
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          File Chargeback Case
        </button>
      </div>

      {/* Grid Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Case Reference</th>
                <th className="px-5 py-4">Transaction ID</th>
                <th className="px-5 py-4">Disputed Amount</th>
                <th className="px-5 py-4">Reason Code</th>
                <th className="px-5 py-4">Due Date</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">Loading Chargeback Disputes...</td></tr>
              ) : disputes.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No chargeback disputes filed.</td></tr>
              ) : (
                disputes.map((d) => (
                  <tr key={d.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-rose-400 font-semibold">{d.case_reference}</td>
                    <td className="px-5 py-4 font-mono text-xs text-emerald-400 font-semibold">{d.transaction_id}</td>
                    <td className="px-5 py-4 font-mono font-bold text-slate-100">₹{d.dispute_amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-xs text-slate-300 font-medium">{d.reason_code}</td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-400">{d.due_date}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-400" /> File Chargeback Dispute Case
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-300">Target Retailer *</label>
                <select
                  value={formData.retailer_id}
                  onChange={(e) => setFormData({ ...formData, retailer_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {retailers.map((r) => (
                    <option key={r.public_id} value={r.public_id}>{r.store_name} ({r.retailer_code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Case Reference *</label>
                  <input
                    type="text"
                    required
                    placeholder="CB-2026-987"
                    value={formData.case_reference}
                    onChange={(e) => setFormData({ ...formData, case_reference: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Transaction ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="TXN202612345"
                    value={formData.transaction_id}
                    onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Dispute Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.dispute_amount}
                    onChange={(e) => setFormData({ ...formData, dispute_amount: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-300">Dispute Reason Code</label>
                <select
                  value={formData.reason_code}
                  onChange={(e) => setFormData({ ...formData, reason_code: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="UNAUTHORIZED_TRANSACTION">UNAUTHORIZED_TRANSACTION</option>
                  <option value="SERVICES_NOT_RENDERED">SERVICES_NOT_RENDERED</option>
                  <option value="DUPLICATE_PROCESSING">DUPLICATE_PROCESSING</option>
                  <option value="INCORRECT_AMOUNT">INCORRECT_AMOUNT</option>
                </select>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button type="submit" className="rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 shadow-lg">
                  Open Dispute Case & Freeze Reserve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
