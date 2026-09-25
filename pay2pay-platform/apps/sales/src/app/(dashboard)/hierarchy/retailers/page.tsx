"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Store, QrCode, Search, RefreshCw, Mail, Phone,
  Building2, ChevronRight, ArrowRight, ArrowLeft,
  CheckCircle2, Sliders, ExternalLink, ShieldCheck, XCircle
} from "lucide-react";

export default function RetailersPage() {
  const searchParams = useSearchParams();
  const distFilter = searchParams.get("dist_id");
  const sdFilter = searchParams.get("sd_id");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: retailers = [], isLoading, refetch } = useQuery({
    queryKey: ["sales-retailers", distFilter, sdFilter, statusFilter],
    queryFn: async () => {
      let url = "/sales/hierarchy/retailers?limit=200";
      if (distFilter) url += `&distributor_id=${distFilter}`;
      if (sdFilter) url += `&super_distributor_id=${sdFilter}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      const res = await apiClient.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const filtered = retailers.filter((r: any) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (r.store_name || "").toLowerCase().includes(q);
    const ownerMatch = (r.owner_name || "").toLowerCase().includes(q);
    const codeMatch = (r.retailer_code || "").toLowerCase().includes(q);
    const mobileMatch = (r.mobile || "").toLowerCase().includes(q);
    const distMatch = (r.distributor_name || "").toLowerCase().includes(q);
    const sdMatch = (r.super_distributor_name || "").toLowerCase().includes(q);
    return nameMatch || ownerMatch || codeMatch || mobileMatch || distMatch || sdMatch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          {(distFilter || sdFilter) && (
            <Link
              href="/hierarchy/retailers"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Clear hierarchy filters
            </Link>
          )}
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
            <Store className="w-4 h-4" />
            Field Merchant Network ({filtered.length})
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Retailers Directory</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Authorized merchant network with real-time POS assignment, transaction volume, and MDR configuration status.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          Refresh Network
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by store name, owner, code, mobile, parent distributor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PENDING">Pending</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
      </div>

      {/* Retailers Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase font-semibold tracking-wider">
                <th className="py-4 px-6">Store & Retailer</th>
                <th className="py-4 px-4">Hierarchy Lineage</th>
                <th className="py-4 px-4 text-center">POS Terminals</th>
                <th className="py-4 px-4 text-right">Transaction Volume</th>
                <th className="py-4 px-4 text-center">MDR Config</th>
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
                      <span>Loading authorized retailers...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No Retailers found matching your criteria in authorized scope.
                  </td>
                </tr>
              ) : (
                filtered.map((r: any) => (
                  <tr
                    key={r.public_id || r.retailer_ref_id}
                    className="hover:bg-slate-950/50 transition group"
                  >
                    {/* Store & Contact */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {(r.store_name || "R").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <Link
                            href={`/retailers/${r.public_id}`}
                            className="font-bold text-white group-hover:text-indigo-400 transition"
                          >
                            {r.store_name}
                          </Link>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span className="font-mono text-indigo-300 font-semibold">{r.retailer_code}</span>
                            <span>&bull;</span>
                            <span>{r.mobile}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Hierarchy Lineage */}
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-slate-300 truncate max-w-[180px]">
                          {r.distributor_name || "Direct Distributor"}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px] mt-0.5">
                          Hub: {r.super_distributor_name || "HQ Master"}
                        </div>
                      </div>
                    </td>

                    {/* POS Terminals */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-amber-300 font-mono font-bold">
                        <QrCode className="w-3 h-3 text-amber-400" />
                        {r.pos_count || 0}
                      </span>
                    </td>

                    {/* Volume */}
                    <td className="py-4 px-4 text-right">
                      <div className="font-bold text-white">{formatCurrency(r.total_volume)}</div>
                      <div className="text-[10px] text-slate-500">{r.total_transactions_count || 0} txns</div>
                    </td>

                    {/* MDR Config Status */}
                    <td className="py-4 px-4 text-center">
                      {r.mdr_configured ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                          Default
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      {r.status === "ACTIVE" ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                          {r.status || "INACTIVE"}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/retailers/${r.public_id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition text-xs font-semibold"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
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
