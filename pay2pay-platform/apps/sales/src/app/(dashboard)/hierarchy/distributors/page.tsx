"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  Layers, Store, QrCode, Search, RefreshCw, Mail, Phone,
  Building2, ChevronRight, ArrowRight, ArrowLeft
} from "lucide-react";

export default function DistributorsPage() {
  const searchParams = useSearchParams();
  const sdFilter = searchParams.get("sd_id");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: distributors = [], isLoading, refetch } = useQuery({
    queryKey: ["sales-distributors", sdFilter],
    queryFn: async () => {
      let url = "/sales/hierarchy/distributors";
      if (sdFilter) url += `?sd_id=${sdFilter}`;
      const res = await apiClient.get(url);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const filtered = distributors.filter((d: any) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (d.name || "").toLowerCase().includes(q);
    const codeMatch = (d.code || "").toLowerCase().includes(q);
    const sdMatch = (d.super_distributor_name || "").toLowerCase().includes(q);
    const mobileMatch = (d.mobile || "").toLowerCase().includes(q);
    return nameMatch || codeMatch || sdMatch || mobileMatch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          {sdFilter && (
            <Link
              href="/hierarchy/distributors"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Clear Super Distributor filter
            </Link>
          )}
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
            <Layers className="w-4 h-4" />
            Distributor Network Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Distributors Directory</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Distributors managing localized merchant networks, retailer onboarding, POS assignment, and retail transactional liquidity.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          Refresh Directory
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Distributor name, reference code, parent Super Dist, mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
        />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 py-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
            <span>Loading distributors...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-500 text-xs">
            No Distributors found in your authorized scope.
          </div>
        ) : (
          filtered.map((dist: any) => (
            <div
              key={dist.id}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-base">
                    {(dist.name || "D").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{dist.name}</h3>
                    <div className="text-[11px] font-mono text-blue-400 mt-0.5">
                      Code: {dist.code}
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  {dist.status || "ACTIVE"}
                </span>
              </div>

              {/* Mapped Super Distributor & Contact */}
              <div className="space-y-2 text-xs text-slate-400 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
                <div className="flex items-center gap-2 text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-semibold text-white">Super Dist:</span>
                  <span className="truncate">{dist.super_distributor_name || "Direct Hub"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{dist.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>{dist.mobile || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Counts & Volume */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Retailers</div>
                  <div className="text-lg font-black text-white mt-0.5">{dist.retailer_count || 0}</div>
                </div>

                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">POS Machines</div>
                  <div className="text-lg font-black text-amber-300 mt-0.5">{dist.pos_count || 0}</div>
                </div>

                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-500">Volume</div>
                  <div className="text-xs font-black text-emerald-400 mt-1">
                    {formatCurrency(dist.total_volume)}
                  </div>
                </div>
              </div>

              {/* Footer Links */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <Link
                  href={`/hierarchy/retailers?dist_id=${dist.id}`}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition"
                >
                  <span>View Mapped Retailers ({dist.retailer_count || 0})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href={`/pos-mdr?dist_id=${dist.id}`}
                  className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition"
                >
                  <span>Configure MDR</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
