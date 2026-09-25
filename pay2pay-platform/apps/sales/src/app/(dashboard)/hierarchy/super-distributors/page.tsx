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
    <div className="space-y-6 w-full max-w-[1400px] 2xl:max-w-[1500px] mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#94003A] via-[#78002F] to-[#550020] border border-[#94003A]/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E7B631] mb-2">
            <Users className="w-4 h-4" />
            Top-Tier Master Distribution Hubs ({filtered.length})
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Super Distributors Directory
          </h1>
          <p className="text-[#F8E6EE]/80 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            Super Distribution partners managing downstream distributor networks, retail merchant chains, and regional liquidity.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#E7B631]" : ""}`} />
          Refresh Directory
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-[#9CA3AF] shrink-0" />
        <input
          type="text"
          placeholder="Search by Super Distributor business name, owner name, code, mobile, email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none"
        />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 py-16 text-center text-[#6B7280] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#94003A]" />
            <span className="text-sm font-bold text-[#1F2937]">Loading super distributors...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-[#9CA3AF] text-xs bg-white rounded-2xl border border-[#E5E7EB] p-8">
            <Users className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
            <div className="font-bold text-[#1F2937] text-sm">No Super Distributors Found</div>
            <p className="text-[#6B7280] mt-1">No matching Super Distribution entities found in your authorized tenant scope.</p>
          </div>
        ) : (
          filtered.map((sd: any) => {
            const sdId = sd.public_id || sd.id;
            const businessName = sd.business_name || sd.name || "Super Distributor Hub";
            const code = sd.super_distributor_code || sd.code || "P2P-SD";
            const distCount = sd.distributor_count ?? sd.mapped_distributors_count ?? 0;
            const retCount = sd.retailer_count ?? sd.mapped_retailers_count ?? 0;
            const volume = sd.transaction_volume ?? sd.total_volume ?? 0;

            return (
              <div
                key={sdId}
                className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-6 shadow-xs space-y-5 hover:border-[#94003A]/30 transition flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] flex items-center justify-center font-black text-lg shrink-0">
                        {businessName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1F2937] text-base leading-snug">{businessName}</h3>
                        <div className="text-[11px] font-mono text-[#94003A] mt-0.5 font-bold">
                          {code}
                        </div>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[10px] font-bold shrink-0">
                      {sd.status || "ACTIVE"}
                    </span>
                  </div>

                  {/* Owner & Contact Info */}
                  <div className="space-y-2 text-xs bg-[#FAFAFC] p-3.5 rounded-2xl border border-[#E5E7EB]">
                    <div className="flex items-center gap-2 text-[#4B5563] text-[11px]">
                      <span className="font-semibold text-[#6B7280]">Owner:</span>
                      <span className="text-[#1F2937] font-semibold">{sd.owner_name || "Enterprise Partner"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E5E7EB] text-[11px]">
                      <div className="flex items-center gap-1.5 truncate text-[#6B7280]">
                        <Mail className="w-3 h-3 text-[#9CA3AF] shrink-0" />
                        <span className="truncate">{sd.email || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#6B7280]">
                        <Phone className="w-3 h-3 text-[#9CA3AF] shrink-0" />
                        <span>{sd.mobile || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Counts & Volume Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-[#FAFAFC] rounded-2xl border border-[#E5E7EB] text-center">
                      <div className="text-[10px] uppercase font-bold text-[#6B7280]">Distributors</div>
                      <div className="text-lg font-black text-[#94003A] mt-0.5">{distCount}</div>
                    </div>

                    <div className="p-3 bg-[#FAFAFC] rounded-2xl border border-[#E5E7EB] text-center">
                      <div className="text-[10px] uppercase font-bold text-[#6B7280]">Retailers</div>
                      <div className="text-lg font-black text-[#D97706] mt-0.5">{retCount}</div>
                    </div>

                    <div className="p-3 bg-[#FAFAFC] rounded-2xl border border-[#E5E7EB] text-center">
                      <div className="text-[10px] uppercase font-bold text-[#6B7280]">Volume</div>
                      <div className="text-xs font-black text-[#16A34A] mt-1 font-mono">
                        {formatCurrency(volume)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Links */}
                <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                  <Link
                    href={`/hierarchy/distributors?sd_id=${sdId}`}
                    className="text-xs font-bold text-[#94003A] hover:underline flex items-center gap-1 transition"
                  >
                    <span>View Distributors ({distCount})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href={`/hierarchy/retailers?sd_id=${sdId}`}
                    className="text-xs font-semibold text-[#4B5563] hover:text-[#1F2937] flex items-center gap-1 transition"
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
