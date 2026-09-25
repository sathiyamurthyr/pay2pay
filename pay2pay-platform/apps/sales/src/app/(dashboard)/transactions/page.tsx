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
    <div className="space-y-6 w-full max-w-[1400px] 2xl:max-w-[1500px] mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#94003A] via-[#78002F] to-[#550020] border border-[#94003A]/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E7B631] mb-2">
            <Receipt className="w-4 h-4" />
            Central Transaction Hub ({filtered.length})
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Authorized Transactions Ledger</h1>
          <p className="text-[#F8E6EE]/80 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            Real-time multi-service transaction records strictly scoped to your tenant and mapped distribution tree.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/transactions/pos"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E7B631] hover:bg-[#D3A51F] text-[#1F2937] text-xs font-bold shadow-sm transition"
          >
            <CreditCard className="w-4 h-4" />
            POS Ledger & MDR
          </Link>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#E7B631]" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search by Txn ID, merchant store name, distributor, service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-xs text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20 focus:border-[#94003A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#6B7280] font-medium">Service:</span>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="px-3 py-2 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-xs font-medium text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
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
            <span className="text-[#6B7280] font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-xs font-medium text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
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
      <div className="flex items-center justify-between text-xs text-[#6B7280] px-1">
        <div>
          Showing <strong className="text-[#1F2937]">{filtered.length}</strong> transactions
        </div>
        <div>
          Total Filtered Volume: <strong className="text-[#16A34A] font-mono text-sm font-bold">{formatCurrency(totalAmount)}</strong>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#FAFAFC] text-[#4B5563] uppercase font-bold tracking-wider">
                <th className="py-4 px-6">Transaction ID & Time</th>
                <th className="py-4 px-4">Service</th>
                <th className="py-4 px-4">Merchant / Retailer</th>
                <th className="py-4 px-4">Distributor</th>
                <th className="py-4 px-4 text-right">Gross Amount</th>
                <th className="py-4 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7280]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#94003A]" />
                      <span className="font-semibold">Loading authorized transaction ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#9CA3AF]">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((t: any) => (
                  <tr
                    key={t.id || t.txn_id}
                    className="hover:bg-[#FDF3F7] transition group"
                  >
                    {/* Txn ID & Time */}
                    <td className="py-3.5 px-6">
                      <div className="font-mono font-bold text-[#1F2937] group-hover:text-[#94003A] transition">
                        {t.txn_id}
                      </div>
                      <div className="text-[10px] text-[#6B7280] mt-0.5">
                        {formatDate(t.created_at)}
                      </div>
                    </td>

                    {/* Service */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-[#F8E6EE] border border-[#94003A]/20 font-mono text-[10px] font-bold text-[#94003A]">
                        {t.service}
                      </span>
                    </td>

                    {/* Retailer */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1F2937] truncate max-w-[180px]">
                        {t.retailer_name || "Merchant"}
                      </div>
                      <div className="text-[10px] text-[#6B7280] font-mono">
                        {t.retailer_code || "RET"}
                      </div>
                    </td>

                    {/* Distributor */}
                    <td className="py-3.5 px-4">
                      <div className="text-[#4B5563] font-medium truncate max-w-[180px]">
                        {t.distributor_name || "Direct Distributor"}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-[#1F2937] font-mono">{formatCurrency(t.amount)}</div>
                      {t.commission > 0 && (
                        <div className="text-[10px] text-[#16A34A] font-mono font-semibold">
                          Comm: +{formatCurrency(t.commission)}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      {t.status === "SUCCESS" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Success
                        </span>
                      ) : t.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[10px] font-bold">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] text-[10px] font-bold">
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
