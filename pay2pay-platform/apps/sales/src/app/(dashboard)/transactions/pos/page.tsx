"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CreditCard, Search, RefreshCw, Filter, QrCode,
  CheckCircle2, XCircle, Clock, ArrowLeft, Sliders
} from "lucide-react";

export default function PosTransactionsLedgerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [limit, setLimit] = useState(100);

  const { data: posTxns = [], isLoading, refetch } = useQuery({
    queryKey: ["sales-pos-transactions", limit],
    queryFn: async () => {
      const res = await apiClient.get(`/sales/transactions/pos?limit=${limit}`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const filtered = posTxns.filter((t: any) => {
    const q = searchQuery.toLowerCase();
    const txnMatch = (t.txn_id || "").toLowerCase().includes(q);
    const retMatch = (t.retailer_name || "").toLowerCase().includes(q);
    const posMatch = (t.pos_machine_id || "").toLowerCase().includes(q);
    const cardMatch = (t.card_type || "").toLowerCase().includes(q);
    return txnMatch || retMatch || posMatch || cardMatch;
  });

  const totalGross = filtered.reduce((acc: number, t: any) => acc + (Number(t.gross_amount) || 0), 0);
  const totalMdr = filtered.reduce((acc: number, t: any) => acc + (Number(t.mdr_amount) || 0), 0);
  const totalNet = filtered.reduce((acc: number, t: any) => acc + (Number(t.net_amount) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Link
            href="/transactions"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to General Transactions
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
            <CreditCard className="w-4 h-4" />
            POS Terminal Transactions & MDR Ledger ({filtered.length})
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">POS Swipes & MDR Breakdown</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Detailed ledger of all POS card swipes with precise Gross Amount, MDR Deduction, GST, Platform Commission, and Net Payout calculations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/pos-mdr"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
          >
            <Sliders className="w-4 h-4" />
            Configure MDR Slabs
          </Link>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Financial Overview Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="text-xs text-slate-400 uppercase font-semibold">Total Gross Swipe Volume</div>
          <div className="text-2xl font-black text-white mt-1 font-mono">{formatCurrency(totalGross)}</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="text-xs text-amber-400 uppercase font-semibold">Total MDR Deductions</div>
          <div className="text-2xl font-black text-amber-300 mt-1 font-mono">{formatCurrency(totalMdr)}</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="text-xs text-emerald-400 uppercase font-semibold">Net Settlement Volume</div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{formatCurrency(totalNet)}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Txn ID, merchant store, POS terminal ID, or card brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* POS Transactions Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase font-semibold tracking-wider">
                <th className="py-4 px-5">Txn ID & Date</th>
                <th className="py-4 px-4">Merchant & POS ID</th>
                <th className="py-4 px-4">Card Scheme</th>
                <th className="py-4 px-4 text-right">Gross Amount</th>
                <th className="py-4 px-4 text-right">MDR Rate & Amount</th>
                <th className="py-4 px-4 text-right">GST & Comm</th>
                <th className="py-4 px-4 text-right">Net Amount</th>
                <th className="py-4 px-5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Loading POS transaction ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No POS transactions found in authorized scope.
                  </td>
                </tr>
              ) : (
                filtered.map((t: any) => (
                  <tr
                    key={t.id || t.txn_id}
                    className="hover:bg-slate-950/50 transition group"
                  >
                    {/* Txn ID & Date */}
                    <td className="py-3.5 px-5">
                      <div className="font-mono font-bold text-white group-hover:text-indigo-400 transition">
                        {t.txn_id}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {formatDate(t.created_at)}
                      </div>
                    </td>

                    {/* Merchant & POS ID */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white truncate max-w-[160px]">
                        {t.retailer_name || "Merchant"}
                      </div>
                      <div className="text-[10px] font-mono text-amber-300 flex items-center gap-1 mt-0.5">
                        <QrCode className="w-3 h-3 text-amber-400" />
                        <span>{t.pos_machine_id || "TID-001"}</span>
                      </div>
                    </td>

                    {/* Card Scheme */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-semibold text-slate-300">
                        {t.card_type || "Visa / Master"}
                      </span>
                    </td>

                    {/* Gross Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      {formatCurrency(t.gross_amount)}
                    </td>

                    {/* MDR */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="text-amber-300 font-bold">-{formatCurrency(t.mdr_amount)}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">{t.mdr_rate_percentage}%</div>
                    </td>

                    {/* GST & Comm */}
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                      <div>GST: -{formatCurrency(t.gst_amount)}</div>
                      <div className="text-emerald-400">Comm: +{formatCurrency(t.commission_amount)}</div>
                    </td>

                    {/* Net Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(t.net_amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Success
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
