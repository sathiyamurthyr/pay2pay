"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Scale,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X
} from "lucide-react";

export default function TrialBalancePage() {
  const [tbData, setTbData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [debitAccount, setDebitAccount] = useState("1001_BANK_HDFC");
  const [creditAccount, setCreditAccount] = useState("3001_MDR_REVENUE");
  const [amount, setAmount] = useState(10000);
  const [narration, setNarration] = useState("");

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/finance/trial-balance");
      setTbData(res.data);
    } catch (err) {
      console.error("Failed to fetch trial balance", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
  }, []);

  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/v1/finance/journals", {
        debit_account_code: debitAccount,
        credit_account_code: creditAccount,
        amount,
        narration
      });
      setShowModal(false);
      setNarration("");
      fetchTrialBalance();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Journal posting failed");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#292329] flex items-center gap-3">
            <Scale className="h-8 w-8 text-emerald-400" />
            Double-Entry Trial Balance Explorer & GL Inspector
          </h1>
          <p className="mt-1 text-[#625B60]">
            Inspect real-time general ledger account debit & credit balances with double-entry integrity
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
        >
          <Plus className="h-4 w-4" /> Post Manual Journal Entry
        </button>
      </div>

      {/* Trial Balance Table */}
      <div className="rounded-xl border border-[#E8E2E5] bg-[#FAF8F9]/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-[#E8E2E5] flex items-center justify-between bg-[#FFFFFF]/40">
          <span className="font-bold text-[#292329]">Accounting Period: {tbData?.period_name || "July 2026"}</span>
          {tbData?.is_balanced ? (
            <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <CheckCircle2 className="h-3.5 w-3.5" /> BALANCED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-bold bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
              <AlertTriangle className="h-3.5 w-3.5" /> UNBALANCED
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#292329]">
            <thead className="bg-[#FFFFFF]/80 uppercase font-mono text-xs text-[#625B60] border-b border-[#E8E2E5]">
              <tr>
                <th className="px-5 py-4">Account Code</th>
                <th className="px-5 py-4">General Ledger Account Name</th>
                <th className="px-5 py-4 text-right">Debit Balance (₹)</th>
                <th className="px-5 py-4 text-right">Credit Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2E5]/60 font-mono text-xs">
              {loading ? (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-[#625B60]">Loading Trial Balance...</td></tr>
              ) : (
                tbData?.rows.map((r: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#F5F2F4]/40 transition-colors">
                    <td className="px-5 py-4 text-emerald-400 font-bold">{r.account_code}</td>
                    <td className="px-5 py-4 font-sans text-xs font-semibold text-[#292329]">{r.account_name}</td>
                    <td className="px-5 py-4 text-right text-[#292329]">{r.debit_amount > 0 ? `₹${r.debit_amount.toLocaleString("en-IN")}` : "-"}</td>
                    <td className="px-5 py-4 text-right text-[#292329]">{r.credit_amount > 0 ? `₹${r.credit_amount.toLocaleString("en-IN")}` : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-[#FFFFFF]/90 font-mono font-bold text-xs text-[#292329] border-t border-[#E8E2E5]">
              <tr>
                <td colSpan={2} className="px-5 py-4 text-emerald-400 uppercase">TOTAL GENERAL LEDGER SUMMARY</td>
                <td className="px-5 py-4 text-right text-emerald-400 text-sm">₹{tbData?.total_debits.toLocaleString("en-IN")}</td>
                <td className="px-5 py-4 text-right text-emerald-400 text-sm">₹{tbData?.total_credits.toLocaleString("en-IN")}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Manual Journal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FFFFFF]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[#E8E2E5] bg-[#FAF8F9] p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#292329] flex items-center gap-2">
                <Scale className="h-5 w-5 text-emerald-400" /> Post Double-Entry Journal
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#625B60] hover:text-[#292329]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handlePostJournal} className="space-y-4 text-sm">
              <div>
                <label className="block text-[#625B60] text-xs mb-1">Debit GL Account</label>
                <input type="text" required value={debitAccount} onChange={(e) => setDebitAccount(e.target.value)} className="w-full rounded-lg bg-[#FFFFFF] border border-[#E8E2E5] p-2.5 text-[#292329] focus:border-emerald-500 focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[#625B60] text-xs mb-1">Credit GL Account</label>
                <input type="text" required value={creditAccount} onChange={(e) => setCreditAccount(e.target.value)} className="w-full rounded-lg bg-[#FFFFFF] border border-[#E8E2E5] p-2.5 text-[#292329] focus:border-emerald-500 focus:outline-none font-mono" />
              </div>
              <div>
                <label className="block text-[#625B60] text-xs mb-1">Journal Amount (₹)</label>
                <input type="number" required value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full rounded-lg bg-[#FFFFFF] border border-[#E8E2E5] p-2.5 text-[#292329] focus:border-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[#625B60] text-xs mb-1">Audit Narration</label>
                <textarea required rows={3} value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="State audit justification for manual GL posting..." className="w-full rounded-lg bg-[#FFFFFF] border border-[#E8E2E5] p-2.5 text-[#292329] focus:border-emerald-500 focus:outline-none" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border border-[#E8E2E5] text-[#292329]">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400">Post Journal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
