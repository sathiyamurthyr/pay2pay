"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Users, Layers, Store, Search, RefreshCw, Mail, Phone,
  Building2, CheckCircle2, ChevronRight, ArrowRight, ShieldCheck,
  TrendingUp, Wallet
} from "lucide-react";

export default function SuperDistributorsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: superDistributors = [], isLoading, refetch } = useQuery({
    queryKey: ["sales-super-distributors"],
    queryFn: async () => {
      const res = await apiClient.get("/sales/hierarchy/super-distributors");
      return Array.isArray(res.data) ? res.data : (res.data?.items || []);
    },
  });

  const filtered = superDistributors.filter((sd: any) => {
    const q = searchQuery.toLowerCase();
    const name = sd.business_name || sd.name || sd.owner_name || "";
    const code = sd.super_distributor_code || sd.code || "";
    const email = sd.email || "";
    const mobile = sd.mobile || "";
    const owner = sd.owner_name || "";
    return (
      name.toLowerCase().includes(q) ||
      code.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      mobile.toLowerCase().includes(q) ||
      owner.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
            <Users className="w-4 h-4" />
            Top-Tier Master Distribution Hubs ({filtered.length})
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
            Super Distributors Directory
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Super Distribution partners managing downstream distributor networks, retail merchant chains, and regional liquidity.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          Refresh Directory
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by Super Distributor business name, owner name, code, mobile, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
        />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-sm font-medium">Loading super distributors...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-slate-500 text-xs bg-slate-900/40 rounded-3xl border border-slate-800/60 p-8">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <div className="font-semibold text-slate-400 text-sm">No Super Distributors Found</div>
            <p className="text-slate-500 mt-1">No matching Super Distribution entities found in your authorized tenant scope.</p>
          </div>
        ) : (
          filtered.map((sd: any) => {
            const sdId = sd.public_id || sd.id;
            const businessName = sd.business_name || sd.name || "Super Distributor Hub";
            const code = sd.super_distributor_code || sd.code || "P2P-SD";
            const distCount = sd.distributor_count ?? sd.mapped_distributors_count ?? 0;
            const retCount = sd.retailer_count ?? sd.mapped_retailers_count ?? 0;
            const volume = sd.transaction_volume ?? sd.total_volume ?? 0;
            const wallet = sd.wallet_balance ?? 0;

            return (
              <div
                key={sdId}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-lg shrink-0">
                        {businessName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-snug">{businessName}</h3>
                        <div className="text-[11px] font-mono text-amber-400 mt-0.5 font-semibold">
                          {code}
                        </div>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold shrink-0">
                      {sd.status || "ACTIVE"}
                    </span>
                  </div>

                  {/* Owner & Contact Info */}
                  <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/60">
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <span className="font-semibold text-slate-300">Owner:</span>
                      <span className="text-white font-medium">{sd.owner_name || "Enterprise Partner"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate text-slate-400">{sd.email || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="text-slate-400">{sd.mobile || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Counts & Volume Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800/60 text-center">
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Distributors</div>
                      <div className="text-lg font-black text-white mt-0.5">{distCount}</div>
                    </div>

                    <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800/60 text-center">
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Retailers</div>
                      <div className="text-lg font-black text-indigo-300 mt-0.5">{retCount}</div>
                    </div>

                    <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-800/60 text-center">
                      <div className="text-[10px] uppercase font-semibold text-slate-500">Volume</div>
                      <div className="text-xs font-black text-emerald-400 mt-1 font-mono">
                        {formatCurrency(volume)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Links */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <Link
                    href={`/hierarchy/distributors?sd_id=${sdId}`}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  >
                    <span>View Distributors ({distCount})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href={`/hierarchy/retailers?sd_id=${sdId}`}
                    className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 transition"
                  >
                    <span>View Retailers ({retCount})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
