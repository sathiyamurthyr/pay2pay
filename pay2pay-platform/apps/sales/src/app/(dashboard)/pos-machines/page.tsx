"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils";
import {
  QrCode, Store, Layers, Users, Search, RefreshCw,
  CheckCircle2, XCircle, Clock, Sliders, ChevronRight,
  ShieldCheck, AlertCircle, Cpu
} from "lucide-react";

export default function PosMachinesManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: posList = [], isLoading, refetch } = useQuery({
    queryKey: ["sales-pos-machines", statusFilter],
    queryFn: async () => {
      let url = "/sales/pos/machines";
      if (statusFilter !== "ALL") url += `?status=${statusFilter}`;
      const res = await apiClient.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const filtered = posList.filter((p: any) => {
    const q = searchQuery.toLowerCase();
    const tidMatch = (p.terminal_id || "").toLowerCase().includes(q);
    const snMatch = (p.pos_machine_id || "").toLowerCase().includes(q);
    const retMatch = (p.retailer_name || "").toLowerCase().includes(q);
    const distMatch = (p.distributor_name || "").toLowerCase().includes(q);
    return tidMatch || snMatch || retMatch || distMatch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">
            <QrCode className="w-4 h-4" />
            POS Terminal Hardware & Telemetry ({filtered.length})
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">POS Machines Management</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Monitor deployed swipe terminals, merchant assignments, battery telemetry, and transactional activity across your authorized territory.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/pos-mdr"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
          >
            <Sliders className="w-4 h-4" />
            POS MDR Setup Studio
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

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Terminal ID (TID), Serial Number, Merchant store, or Distributor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Terminal Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
      </div>

      {/* POS Machines Grid / Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase font-semibold tracking-wider">
                <th className="py-4 px-6">Terminal ID & Serial</th>
                <th className="py-4 px-4">Mapped Merchant</th>
                <th className="py-4 px-4">Distributor</th>
                <th className="py-4 px-4">Assigned Date</th>
                <th className="py-4 px-4 text-right">Transactions</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Loading POS terminal fleet...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No POS machines found matching criteria in authorized scope.
                  </td>
                </tr>
              ) : (
                filtered.map((pos: any) => (
                  <tr
                    key={pos.pos_machine_id || pos.terminal_id}
                    className="hover:bg-slate-950/50 transition group"
                  >
                    {/* TID & Serial */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold font-mono text-xs shrink-0">
                          <QrCode className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-mono font-bold text-white group-hover:text-amber-300 transition">
                            {pos.terminal_id}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            SN: {pos.pos_machine_id} &bull; Model: {pos.model || "Smart POS"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mapped Merchant */}
                    <td className="py-3.5 px-4">
                      {pos.retailer_id ? (
                        <Link
                          href={`/retailers/${pos.retailer_id}`}
                          className="font-semibold text-white hover:text-indigo-400 transition block truncate max-w-[180px]"
                        >
                          {pos.retailer_name}
                        </Link>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned Pool</span>
                      )}
                    </td>

                    {/* Distributor */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-300 truncate max-w-[160px]">
                        {pos.distributor_name || "Direct Distributor"}
                      </div>
                    </td>

                    {/* Assigned Date */}
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {formatDateShort(pos.assigned_date)}
                    </td>

                    {/* Txn Count & Vol */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono font-bold text-white">
                        {formatCurrency(pos.total_volume)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {pos.total_transactions_count || 0} swipes
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        {pos.status || "ACTIVE"}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-6 text-right">
                      {pos.retailer_id && (
                        <Link
                          href={`/retailers/${pos.retailer_id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                        >
                          <span>Merchant</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
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
