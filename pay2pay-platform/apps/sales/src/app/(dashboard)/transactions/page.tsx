"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Receipt, Search, RefreshCw, Filter, ArrowDownToLine,
  CreditCard, Store, Layers, Users, CheckCircle2, XCircle, Clock
} from "lucide-react";

export default function TransactionsHubPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [limit, setLimit] = useState(100);

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ["sales-transactions", serviceFilter, statusFilter, limit],
    queryFn: async () => {
      let url = `/sales/transactions?limit=${limit}`;
      if (serviceFilter !== "ALL") url += `&service=${serviceFilter}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      const res = await apiClient.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const filtered = transactions.filter((t: any) => {
    const q = searchQuery.toLowerCase();
    const txnMatch = (t.txn_id || "").toLowerCase().includes(q);
    const retMatch = (t.retailer_name || "").toLowerCase().includes(q);
    const distMatch = (t.distributor_name || "").toLowerCase().includes(q);
    const sdMatch = (t.super_distributor_name || "").toLowerCase().includes(q);
    const srvMatch = (t.service || "").toLowerCase().includes(q);
    return txnMatch || retMatch || distMatch || sdMatch || srvMatch;
  });

  const totalAmount = filtered.reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
            <Receipt className="w-4 h-4" />
            Central Transaction Hub ({filtered.length})
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Authorized Transactions Ledger</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Real-time multi-service transaction records strictly scoped to your tenant and mapped distribution tree.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/transactions/pos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/30 transition"
          >
            <CreditCard className="w-4 h-4" />
            POS Ledger & MDR
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

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Txn ID, merchant store name, distributor, service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Service:</span>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none"
            >
              <option value="ALL">All Services</option>
              <option value="POS">POS / Card</option>
              <option value="DMT">Money Transfer (DMT)</option>
              <option value="AEPS">AEPS / Aadhaar</option>
              <option value="BBPS">Bill Payments (BBPS)</option>
              <option value="PAYOUT">Payout</option>
              <option value="RECHARGE">Recharge</option>
              <option value="TOPUP">Top-Up</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div>
          Showing <strong className="text-white">{filtered.length}</strong> transactions
        </div>
        <div>
          Total Filtered Volume: <strong className="text-emerald-400 font-mono text-sm">{formatCurrency(totalAmount)}</strong>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase font-semibold tracking-wider">
                <th className="py-4 px-6">Transaction ID & Time</th>
                <th className="py-4 px-4">Service</th>
                <th className="py-4 px-4">Merchant / Retailer</th>
                <th className="py-4 px-4">Distributor</th>
                <th className="py-4 px-4 text-right">Gross Amount</th>
                <th className="py-4 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Loading authorized transaction ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((t: any) => (
                  <tr
                    key={t.id || t.txn_id}
                    className="hover:bg-slate-950/50 transition group"
                  >
                    {/* Txn ID & Time */}
                    <td className="py-3.5 px-6">
                      <div className="font-mono font-bold text-white group-hover:text-indigo-400 transition">
                        {t.txn_id}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {formatDate(t.created_at)}
                      </div>
                    </td>

                    {/* Service */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 font-mono text-[10px] font-bold text-indigo-300">
                        {t.service}
                      </span>
                    </td>

                    {/* Retailer */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white truncate max-w-[180px]">
                        {t.retailer_name || "Merchant"}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {t.retailer_code || "RET"}
                      </div>
                    </td>

                    {/* Distributor */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-300 truncate max-w-[180px]">
                        {t.distributor_name || "Direct Distributor"}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-white font-mono">{formatCurrency(t.amount)}</div>
                      {t.commission > 0 && (
                        <div className="text-[10px] text-emerald-400 font-mono">
                          Comm: +{formatCurrency(t.commission)}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {t.status === "SUCCESS" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Success
                        </span>
                      ) : t.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                          <XCircle className="w-3 h-3" />
                          {t.status || "FAILED"}
                        </span>
                      )}
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
