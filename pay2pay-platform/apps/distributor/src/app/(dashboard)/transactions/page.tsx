"use client";

import React, { useState, useEffect } from "react";
import {
  ReceiptText,
  Filter,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  Search,
  Download
} from "lucide-react";
import { DistributorAPI, DistributorTransactionItem } from "@/services/distributor-api";

export default function DistributorTransactionsPage() {
  const [transactions, setTransactions] = useState<DistributorTransactionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [entryType, setEntryType] = useState<string>("ALL");
  const [serviceName, setServiceName] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchTransactions = async () => {
    try {
      setRefreshing(true);
      const res = await DistributorAPI.getTransactions({
        page,
        page_size: 25,
        entry_type: entryType !== "ALL" ? entryType : undefined,
        service_name: serviceName !== "ALL" ? serviceName : undefined
      });
      setTransactions(res?.data || []);
      setTotalCount(res?.meta?.total_count || res?.data?.length || 0);
    } catch (err: any) {
      console.error("Transactions load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, entryType, serviceName]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
            Transaction History
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Central platform audit ledger recording all credit (CR) and debit (DR) transactions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransactions}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08]">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Type:</span>
            <select
              value={entryType}
              onChange={(e) => {
                setEntryType(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value="ALL" className="bg-[#111827]">All (CR & DR)</option>
              <option value="CR" className="bg-[#111827]">Credit (CR)</option>
              <option value="DR" className="bg-[#111827]">Debit (DR)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Service:</span>
            <select
              value={serviceName}
              onChange={(e) => {
                setServiceName(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value="ALL" className="bg-[#111827]">All Services</option>
              <option value="TOPUP" className="bg-[#111827]">Wallet Top-up</option>
              <option value="COMMISSION" className="bg-[#111827]">Commission</option>
              <option value="POS" className="bg-[#111827]">POS</option>
              <option value="DMT" className="bg-[#111827]">DMT</option>
              <option value="RECHARGE" className="bg-[#111827]">Recharge</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-slate-400">
          Showing <strong className="text-white">{transactions.length}</strong> records
        </span>
      </div>

      {/* Transactions Table or Empty State */}
      <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
            Loading transaction ledger...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ReceiptText className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-white mb-1">No transactions recorded yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Your wallet ledger entries and retailer commission distributions will be displayed here in real time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.08] bg-white/[0.02]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Transaction ID</th>
                  <th className="py-3 px-4 font-semibold">Service</th>
                  <th className="py-3 px-4 font-semibold text-center">Type</th>
                  <th className="py-3 px-4 font-semibold text-right">Amount (INR)</th>
                  <th className="py-3 px-4 font-semibold text-right">Before</th>
                  <th className="py-3 px-4 font-semibold text-right">After</th>
                  <th className="py-3 px-4 font-semibold">Narration</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-200">
                {transactions.map((tx) => {
                  const isCredit = tx.entry_type === "CR";
                  return (
                    <tr key={tx.transaction_ref_id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString("en-IN") : "—"}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-amber-300">
                        {tx.transaction_id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-white">
                        {tx.service_name || tx.transaction_type || "FINANCIAL"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isCredit
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {isCredit ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {tx.entry_type}
                        </span>
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold ${
                          isCredit ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isCredit ? "+" : "-"}₹{Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                        ₹{Number(tx.balance_before || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-200 font-semibold text-[11px]">
                        ₹{Number(tx.balance_after || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] max-w-xs truncate" title={tx.narration}>
                        {tx.narration || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
