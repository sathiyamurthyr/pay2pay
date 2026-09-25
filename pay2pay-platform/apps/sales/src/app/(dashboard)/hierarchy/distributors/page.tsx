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
    <div className="space-y-6 w-full max-w-[1400px] 2xl:max-w-[1500px] mx-auto pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#94003A] via-[#78002F] to-[#550020] border border-[#94003A]/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          {sdFilter && (
            <Link
              href="/hierarchy/distributors"
              className="inline-flex items-center gap-1.5 text-xs text-[#E7B631] hover:underline mb-2 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Clear Super Distributor filter
            </Link>
          )}
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E7B631] mb-2">
            <Layers className="w-4 h-4" />
            Distributor Network Hub ({filtered.length})
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Distributors Directory</h1>
          <p className="text-[#F8E6EE]/80 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            Distributors managing localized merchant networks, retailer onboarding, POS assignment, and retail transactional liquidity.
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
        <Search className="w-4 h-4 text-[#9CA3AF]" />
        <input
          type="text"
          placeholder="Search by Distributor name, reference code, parent Super Dist, mobile..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none"
        />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 py-12 text-center text-[#6B7280] flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#94003A]" />
            <span className="font-semibold">Loading distributors...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-[#9CA3AF] text-xs bg-white rounded-2xl border border-[#E5E7EB] p-8">
            No Distributors found in your authorized scope.
          </div>
        ) : (
          filtered.map((dist: any) => (
            <div
              key={dist.id}
              className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-6 shadow-xs space-y-6 hover:border-[#94003A]/30 transition flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] flex items-center justify-center font-black text-base">
                      {(dist.name || "D").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1F2937] text-base">{dist.name}</h3>
                      <div className="text-[11px] font-mono text-[#94003A] font-bold mt-0.5">
                        Code: {dist.code}
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] text-[10px] font-bold">
                    {dist.status || "ACTIVE"}
                  </span>
                </div>

                {/* Mapped Super Distributor & Contact */}
                <div className="space-y-2 text-xs bg-[#FAFAFC] p-3.5 rounded-2xl border border-[#E5E7EB]">
                  <div className="flex items-center gap-2 text-[#4B5563]">
                    <Building2 className="w-3.5 h-3.5 text-[#94003A] shrink-0" />
                    <span className="font-semibold text-[#1F2937]">Super Dist:</span>
                    <span className="truncate">{dist.super_distributor_name || "Direct Hub"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E5E7EB] text-[11px]">
                    <div className="flex items-center gap-1.5 truncate text-[#6B7280]">
                      <Mail className="w-3 h-3 text-[#9CA3AF] shrink-0" />
                      <span className="truncate">{dist.email || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#6B7280]">
                      <Phone className="w-3 h-3 text-[#9CA3AF] shrink-0" />
                      <span>{dist.mobile || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Counts & Volume */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-[#FAFAFC] rounded-xl border border-[#E5E7EB] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#6B7280]">Retailers</div>
                    <div className="text-lg font-black text-[#94003A] mt-0.5">{dist.retailer_count || 0}</div>
                  </div>

                  <div className="p-3 bg-[#FAFAFC] rounded-xl border border-[#E5E7EB] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#6B7280]">POS Machines</div>
                    <div className="text-lg font-black text-[#D97706] mt-0.5">{dist.pos_count || 0}</div>
                  </div>

                  <div className="p-3 bg-[#FAFAFC] rounded-xl border border-[#E5E7EB] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#6B7280]">Volume</div>
                    <div className="text-xs font-black text-[#16A34A] mt-1 font-mono">
                      {formatCurrency(dist.total_volume)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Links */}
              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                <Link
                  href={`/hierarchy/retailers?dist_id=${dist.id}`}
                  className="text-xs font-bold text-[#94003A] hover:underline flex items-center gap-1 transition"
                >
                  <span>View Mapped Retailers ({dist.retailer_count || 0})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href={`/pos-mdr?dist_id=${dist.id}`}
                  className="text-xs font-semibold text-[#4B5563] hover:text-[#1F2937] flex items-center gap-1 transition"
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
