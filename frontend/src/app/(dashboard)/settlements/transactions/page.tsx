"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  TrendingUp,
  Search,
  Plus,
  RefreshCw,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  X
} from "lucide-react";

export default function TransactionsPage() {
  const [txns, setTxns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [retailers, setRetailers] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    transaction_id: "",
    rrn: "",
    auth_code: "",
    amount: 10000.0,
    payment_mode: "VISA_CREDIT",
    card_number_masked: "4111xxxxxx1111",
    mapped_tid: "TID1000101",
    mapped_retailer_id: "",
    company_id: ""
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/settlements/transactions", {
        params: { search, payment_mode: modeFilter }
      });
      setTxns(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSetupData = async () => {
    try {
      const compRes = await api.get("/api/v1/companies");
      setCompanies(compRes.data.items);

      const retRes = await api.get("/api/v1/retailers");
      setRetailers(retRes.data.items);

      if (compRes.data.items.length > 0) {
        setFormData(prev => ({ ...prev, company_id: compRes.data.items[0].public_id }));
      }
      if (retRes.data.items.length > 0) {
        setFormData(prev => ({ ...prev, mapped_retailer_id: retRes.data.items[0].public_id }));
      }
    } catch (err) {
      console.error("Failed to load setup data", err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchSetupData();
  }, [search, modeFilter]);

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/settlements/transactions", formData);
      setShowModal(false);
      fetchTransactions();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Transaction ingestion failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-emerald-400" />
            Swipe Transaction Ledger
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time card & UPI transactions, RRN references, and MDR fee split calculations
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          Ingest Swipe Transaction
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Txn ID, RRN, Auth Code, TID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Payment Modes</option>
          <option value="VISA_CREDIT">VISA_CREDIT</option>
          <option value="VISA_DEBIT">VISA_DEBIT</option>
          <option value="MASTERCARD_CREDIT">MASTERCARD_CREDIT</option>
          <option value="RUPAY_DEBIT">RUPAY_DEBIT</option>
          <option value="UPI">UPI</option>
        </select>
      </div>

      {/* Grid Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 uppercase font-mono text-xs text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Transaction ID & RRN</th>
                <th className="px-5 py-4">Gross Amount</th>
                <th className="px-5 py-4">MDR & Net Payout</th>
                <th className="px-5 py-4">TID / Mode</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    Loading Transaction Ledger...
                  </td>
                </tr>
              ) : txns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    No transaction records found matching query.
                  </td>
                </tr>
              ) : (
                txns.map((t) => (
                  <tr key={t.public_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-emerald-400 font-semibold">{t.transaction_id}</div>
                      <div className="font-mono text-[10px] text-slate-400">RRN: {t.rrn}</div>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-slate-100">₹{t.amount.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-rose-400 font-semibold">-₹{t.fee_split?.mdr_fee || 0} MDR</div>
                      <div className="font-mono text-xs text-emerald-400 font-semibold">Net: ₹{t.fee_split?.net_payout || t.amount}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-slate-200 font-semibold">{t.mapped_tid}</div>
                      <div className="text-[10px] text-blue-400">{t.payment_mode}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {t.settlement_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingestion Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                Ingest POS Swipe Transaction
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleIngestSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-slate-300">Target Retailer Outlet *</label>
                <select
                  value={formData.mapped_retailer_id}
                  onChange={(e) => setFormData({ ...formData, mapped_retailer_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {retailers.map((r) => (
                    <option key={r.public_id} value={r.public_id}>{r.store_name} ({r.retailer_code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Transaction ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="TXN202698765"
                    value={formData.transaction_id}
                    onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">RRN Reference *</label>
                  <input
                    type="text"
                    required
                    placeholder="RRN2026123456"
                    value={formData.rrn}
                    onChange={(e) => setFormData({ ...formData, rrn: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="font-medium text-slate-300">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Auth Code</label>
                  <input
                    type="text"
                    required
                    placeholder="AUTH987"
                    value={formData.auth_code}
                    onChange={(e) => setFormData({ ...formData, auth_code: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-medium text-slate-300">Payment Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="VISA_CREDIT">VISA_CREDIT</option>
                    <option value="VISA_DEBIT">VISA_DEBIT</option>
                    <option value="MASTERCARD_CREDIT">MASTERCARD_CREDIT</option>
                    <option value="RUPAY_DEBIT">RUPAY_DEBIT</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg"
                >
                  Ingest Transaction & Process MDR Split
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
