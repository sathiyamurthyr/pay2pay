"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils";
import {
  Activity, Store, AlertTriangle, Clock, QrCode, TrendingUp,
  UserCheck, CheckCircle2, MessageSquare, Plus, RefreshCw,
  Phone, MapPin, ChevronRight, ArrowRight
} from "lucide-react";

export default function FieldActivityPage() {
  const queryClient = useQueryClient();
  const [inactiveType, setInactiveType] = useState<"7_DAYS" | "30_DAYS" | "POS_INACTIVE">("7_DAYS");

  // Fetch Activity Metrics
  const { data: metricsData, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["sales-activity-metrics"],
    queryFn: async () => {
      const res = await apiClient.get("/sales/activity/metrics");
      return res.data;
    },
  });

  // Fetch Inactive Retailers based on criteria
  const { data: inactiveRetailers = [], isLoading: isLoadingInactive, refetch: refetchInactive } = useQuery({
    queryKey: ["sales-inactive-retailers", inactiveType],
    queryFn: async () => {
      const res = await apiClient.get(`/sales/activity/inactive-retailers?criteria=${inactiveType}`);
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const metrics = metricsData || {
    assigned_retailers_count: 0,
    new_retailers_30d: 0,
    active_retailers_count: 0,
    pos_activated_count: 0,
    pos_transactions_count: 0,
    monthly_business_volume: 0,
  };

  return (
    <div className="space-y-8 w-full max-w-[1400px] 2xl:max-w-[1500px] mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#94003A] via-[#78002F] to-[#550020] border border-[#94003A]/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E7B631] mb-2">
            <Activity className="w-4 h-4" />
            Field Performance & Merchant Retention Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Field Operations & Inactive Tracker</h1>
          <p className="text-[#F8E6EE]/80 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            Track sales performance, identify dormant merchants, and trigger targeted merchant reactivation workflows.
          </p>
        </div>

        <button
          onClick={() => refetchInactive()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInactive ? "animate-spin text-[#E7B631]" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Field Performance KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="text-[11px] text-[#6B7280] uppercase font-bold">Assigned Merch</div>
          <div className="text-2xl font-black text-[#1F2937] mt-1">{metrics.assigned_retailers_count}</div>
          <div className="text-[10px] text-[#9CA3AF] mt-0.5">Total In Scope</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="text-[11px] text-[#94003A] uppercase font-bold">New Merch (30d)</div>
          <div className="text-2xl font-black text-[#94003A] mt-1">{metrics.new_retailers_30d}</div>
          <div className="text-[10px] text-[#94003A]/70 mt-0.5 font-medium">Recent Onboard</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="text-[11px] text-[#16A34A] uppercase font-bold">Active Merch</div>
          <div className="text-2xl font-black text-[#16A34A] mt-1">{metrics.active_retailers_count}</div>
          <div className="text-[10px] text-[#16A34A]/70 mt-0.5 font-medium">Generating Vol</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="text-[11px] text-[#D97706] uppercase font-bold">POS Active</div>
          <div className="text-2xl font-black text-[#D97706] mt-1">{metrics.pos_activated_count}</div>
          <div className="text-[10px] text-[#9CA3AF] mt-0.5">Terminals Live</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="text-[11px] text-[#6B7280] uppercase font-bold">POS Swipes</div>
          <div className="text-2xl font-black text-[#1F2937] mt-1">{metrics.pos_transactions_count}</div>
          <div className="text-[10px] text-[#9CA3AF] mt-0.5">Card Swipes</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs">
          <div className="text-[11px] text-[#16A34A] uppercase font-bold">Monthly Vol</div>
          <div className="text-sm font-black text-[#16A34A] mt-2 font-mono">
            {formatCurrency(metrics.monthly_business_volume)}
          </div>
          <div className="text-[10px] text-[#9CA3AF] mt-0.5">Field Business</div>
        </div>
      </div>

      {/* Inactive Merchant Identification Tracker */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs space-y-6 text-[#1F2937]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
          <div>
            <h2 className="text-lg font-black text-[#1F2937] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#D97706]" />
              Inactive Merchant Identification & Retention
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Identify merchants who need immediate engagement, field visit, or training support.
            </p>
          </div>

          {/* Criteria Selector */}
          <div className="flex items-center gap-2 bg-[#FAFAFC] p-1 rounded-2xl border border-[#E5E7EB]">
            {[
              { type: "7_DAYS", label: "No Txn (7 Days)" },
              { type: "30_DAYS", label: "No Txn (30 Days)" },
              { type: "POS_INACTIVE", label: "POS Inactive" },
            ].map((btn) => (
              <button
                key={btn.type}
                onClick={() => setInactiveType(btn.type as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  inactiveType === btn.type
                    ? "bg-[#94003A] text-white shadow-xs"
                    : "text-[#4B5563] hover:text-[#1F2937]"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        {isLoadingInactive ? (
          <div className="py-12 text-center text-[#6B7280] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#94003A]" />
            <span className="font-semibold">Scanning merchant database...</span>
          </div>
        ) : inactiveRetailers.length === 0 ? (
          <div className="py-12 text-center text-[#9CA3AF] text-xs">
            <CheckCircle2 className="w-10 h-10 mx-auto text-[#16A34A] mb-2" />
            <div className="font-bold text-[#1F2937] text-sm">All Merchants Active!</div>
            <p className="text-[#6B7280] mt-0.5">
              No merchants match the selected inactive threshold in your authorized territory.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveRetailers.map((r: any) => (
              <div
                key={r.public_id}
                className="bg-[#FAFAFC] border border-[#E5E7EB] rounded-2xl p-5 space-y-4 hover:border-[#94003A]/30 transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-[#1F2937] text-sm">{r.store_name}</h4>
                      <div className="text-[10px] font-mono text-[#94003A] font-bold">{r.retailer_code}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[10px] font-bold">
                      {r.inactivity_reason || "Inactive"}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#4B5563] pt-2 border-t border-[#E5E7EB]">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-[#9CA3AF]" />
                      <span className="font-mono">{r.mobile}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Store className="w-3 h-3 text-[#9CA3AF]" />
                      <span className="truncate">Dist: {r.distributor_name || "Direct"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-[#9CA3AF]" />
                      <span>Last Txn: {formatDateShort(r.last_transaction_date)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between">
                  <Link
                    href={`/retailers/${r.public_id}`}
                    className="text-xs font-bold text-[#94003A] hover:underline flex items-center gap-1"
                  >
                    <span>View Merchant</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <a
                    href={`tel:${r.mobile}`}
                    className="px-3 py-1 bg-[#F8E6EE] hover:bg-[#94003A] text-[#94003A] hover:text-white rounded-xl text-xs font-bold transition border border-[#94003A]/20"
                  >
                    Call Merchant
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
