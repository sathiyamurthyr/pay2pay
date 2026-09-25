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
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">
            <Activity className="w-4 h-4" />
            Field Performance & Merchant Retention Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Field Operations & Inactive Tracker</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
            Track sales performance, identify dormant merchants, and trigger targeted merchant reactivation workflows.
          </p>
        </div>

        <button
          onClick={() => refetchInactive()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInactive ? "animate-spin text-indigo-400" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Field Performance KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase font-semibold">Assigned Merch</div>
          <div className="text-2xl font-black text-white mt-1">{metrics.assigned_retailers_count}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Total In Scope</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-indigo-400 uppercase font-semibold">New Merch (30d)</div>
          <div className="text-2xl font-black text-indigo-300 mt-1">{metrics.new_retailers_30d}</div>
          <div className="text-[10px] text-indigo-400/80 mt-0.5">Recent Onboard</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-emerald-400 uppercase font-semibold">Active Merch</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{metrics.active_retailers_count}</div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">Generating Vol</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-amber-400 uppercase font-semibold">POS Active</div>
          <div className="text-2xl font-black text-amber-300 mt-1">{metrics.pos_activated_count}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Terminals Live</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 uppercase font-semibold">POS Swipes</div>
          <div className="text-2xl font-black text-white mt-1">{metrics.pos_transactions_count}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Card Swipes</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-emerald-400 uppercase font-semibold">Monthly Vol</div>
          <div className="text-sm font-black text-emerald-400 mt-2 font-mono">
            {formatCurrency(metrics.monthly_business_volume)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Field Business</div>
        </div>
      </div>

      {/* Inactive Merchant Identification Tracker */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Inactive Merchant Identification & Retention
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Identify merchants who need immediate engagement, field visit, or training support.
            </p>
          </div>

          {/* Criteria Selector */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            {[
              { type: "7_DAYS", label: "No Txn (7 Days)" },
              { type: "30_DAYS", label: "No Txn (30 Days)" },
              { type: "POS_INACTIVE", label: "POS Inactive" },
            ].map((btn) => (
              <button
                key={btn.type}
                onClick={() => setInactiveType(btn.type as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  inactiveType === btn.type
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        {isLoadingInactive ? (
          <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Scanning merchant database...</span>
          </div>
        ) : inactiveRetailers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
            <div className="font-bold text-white text-sm">All Merchants Active!</div>
            <p className="text-slate-400 mt-0.5">
              No merchants match the selected inactive threshold in your authorized territory.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveRetailers.map((r: any) => (
              <div
                key={r.public_id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{r.store_name}</h4>
                      <div className="text-[10px] font-mono text-indigo-400">{r.retailer_code}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                      {r.inactivity_reason || "Inactive"}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400 pt-2 border-t border-slate-900">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{r.mobile}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Store className="w-3 h-3 text-slate-500" />
                      <span className="truncate">Dist: {r.distributor_name || "Direct"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>Last Txn: {formatDateShort(r.last_transaction_date)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-900 flex items-center justify-between">
                  <Link
                    href={`/retailers/${r.public_id}`}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>View Merchant</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <a
                    href={`tel:${r.mobile}`}
                    className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold transition"
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
