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
    <div className="space-y-6 w-full max-w-[1400px] 2xl:max-w-[1500px] mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#94003A] via-[#78002F] to-[#550020] border border-[#94003A]/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <Link
            href="/transactions"
            className="inline-flex items-center gap-1.5 text-xs text-[#E7B631] hover:underline mb-2 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to General Transactions
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E7B631] mb-2">
            <CreditCard className="w-4 h-4" />
            POS Terminal Transactions & MDR Ledger ({filtered.length})
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">POS Swipes & MDR Breakdown</h1>
          <p className="text-[#F8E6EE]/80 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            Detailed ledger of all POS card swipes with precise Gross Amount, MDR Deduction, GST, Platform Commission, and Net Payout calculations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/pos-mdr"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E7B631] hover:bg-[#D3A51F] text-[#1F2937] text-xs font-bold shadow-sm transition"
          >
            <Sliders className="w-4 h-4" />
            Configure MDR Slabs
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

      {/* Financial Overview Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="text-xs text-[#6B7280] uppercase font-bold">Total Gross Swipe Volume</div>
          <div className="text-2xl font-black text-[#1F2937] mt-1 font-mono">{formatCurrency(totalGross)}</div>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="text-xs text-[#D97706] uppercase font-bold">Total MDR Deductions</div>
          <div className="text-2xl font-black text-[#D97706] mt-1 font-mono">{formatCurrency(totalMdr)}</div>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="text-xs text-[#16A34A] uppercase font-bold">Net Settlement Volume</div>
          <div className="text-2xl font-black text-[#16A34A] mt-1 font-mono">{formatCurrency(totalNet)}</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder="Search by Txn ID, merchant store, POS terminal ID, or card brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-xs text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20 focus:border-[#94003A]"
          />
        </div>
      </div>

      {/* POS Transactions Table */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#FAFAFC] text-[#4B5563] uppercase font-bold tracking-wider">
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
            <tbody className="divide-y divide-[#E5E7EB]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B7280]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#94003A]" />
                      <span className="font-semibold">Loading POS transaction ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#9CA3AF]">
                    No POS transactions found in authorized scope.
                  </td>
                </tr>
              ) : (
                filtered.map((t: any) => (
                  <tr
                    key={t.id || t.txn_id}
                    className="hover:bg-[#FDF3F7] transition group"
                  >
                    {/* Txn ID & Date */}
                    <td className="py-3.5 px-5">
                      <div className="font-mono font-bold text-[#1F2937] group-hover:text-[#94003A] transition">
                        {t.txn_id}
                      </div>
                      <div className="text-[10px] text-[#6B7280] mt-0.5">
                        {formatDate(t.created_at)}
                      </div>
                    </td>

                    {/* Merchant & POS ID */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#1F2937] truncate max-w-[160px]">
                        {t.retailer_name || "Merchant"}
                      </div>
                      <div className="text-[10px] font-mono text-[#D97706] flex items-center gap-1 mt-0.5 font-bold">
                        <QrCode className="w-3 h-3 text-[#D97706]" />
                        <span>{t.pos_machine_id || "TID-001"}</span>
                      </div>
                    </td>

                    {/* Card Scheme */}
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-[#FAFAFC] border border-[#E5E7EB] text-[10px] font-semibold text-[#4B5563]">
                        {t.card_type || "Visa / Master"}
                      </span>
                    </td>

                    {/* Gross Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#1F2937]">
                      {formatCurrency(t.gross_amount)}
                    </td>

                    {/* MDR */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="text-[#D97706] font-bold">-{formatCurrency(t.mdr_amount)}</div>
                      <div className="text-[10px] text-[#6B7280] font-semibold">{t.mdr_rate_percentage}%</div>
                    </td>

                    {/* GST & Comm */}
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-[#6B7280]">
                      <div>GST: -{formatCurrency(t.gst_amount)}</div>
                      <div className="text-[#16A34A] font-semibold">Comm: +{formatCurrency(t.commission_amount)}</div>
                    </td>

                    {/* Net Amount */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#16A34A]">
                      {formatCurrency(t.net_amount)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[10px] font-bold">
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
