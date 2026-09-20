"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Receipt,
  Users,
  Download,
  Calendar,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { DistributorAPI } from "@/services/distributor-api";

export default function DistributorReportsPage() {
  const [report, setReport] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchReports = async () => {
    try {
      setRefreshing(true);
      const data = await DistributorAPI.getBusinessReport();
      setReport(data);
    } catch (err: any) {
      console.error("Reports error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const overall = report?.overall_business || {};
  const services = report?.service_breakdown || [];
  const retailers = report?.retailer_breakdown || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
            Distributor Business Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Consolidated business reporting, service analytics, and retailer performance visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top Aggregates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-xl">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
            Network Gross Volume
          </span>
          <div className="text-3xl font-black text-amber-300">
            ₹{Number(overall.total_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Processed across all mapped retailers</span>
        </div>

        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-xl">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
            Total Transactions
          </span>
          <div className="text-3xl font-black text-white">
            {Number(overall.total_transactions || 0).toLocaleString("en-IN")}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
            <span className="text-emerald-400 font-medium">{overall.success_count || 0} Success</span>
            <span className="text-rose-400 font-medium">{overall.failed_count || 0} Failed</span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-xl">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
            Active Channel Services
          </span>
          <div className="text-3xl font-black text-blue-400">
            {services.length}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">POS, DMT, Recharge & BBPS Channels</span>
        </div>
      </div>

      {/* Service Performance Table */}
      <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Channel-Wise Summary
        </h3>

        {services.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No service performance data available yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.08] bg-white/[0.02]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Service</th>
                  <th className="py-3 px-4 font-semibold text-right">Transactions</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Amount (INR)</th>
                  <th className="py-3 px-4 font-semibold text-center">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-200 font-medium">
                {services.map((s: any, idx: number) => {
                  const rate = s.transaction_count > 0 ? ((s.success_count / s.transaction_count) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={idx} className="hover:bg-white/[0.03]">
                      <td className="py-3.5 px-4 font-bold text-white">{s.service_name}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {s.transaction_count.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-300">
                        ₹{Number(s.transaction_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Retailer-Wise Performance Table */}
      <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 sm:p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-400" />
          Retailer-Wise Business Breakdown
        </h3>

        {retailers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No mapped retailer business data available yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/[0.08] bg-white/[0.02]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Retailer</th>
                  <th className="py-3 px-4 font-semibold">Code</th>
                  <th className="py-3 px-4 font-semibold text-right">Transactions</th>
                  <th className="py-3 px-4 font-semibold text-right">Gross Volume (INR)</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-200 font-medium">
                {retailers.map((r: any) => (
                  <tr key={r.retailer_ref_id} className="hover:bg-white/[0.03]">
                    <td className="py-3.5 px-4 font-bold text-white">{r.owner_name}</td>
                    <td className="py-3.5 px-4 font-mono text-amber-300">{r.retailer_code}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">{r.total_transactions}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      ₹{Number(r.total_volume).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
