"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  TrendingUp,
  CreditCard,
  Building2,
  PieChart as PieIcon,
  RefreshCw,
  Clock,
  Coins,
  Receipt,
  CheckCircle2,
  Percent
} from "lucide-react";

interface SettlementMetrics {
  total_processed_volume: number;
  total_settled_amount: number;
  pending_settlement_volume: number;
  total_mdr_earned: number;
  total_gst_liability: number;
  total_distributor_commissions: number;
  total_payouts_dispatched: number;
  volume_by_mode: Record<string, number>;
  hourly_trend: Array<{ hour: string; volume: number }>;
}

export default function SettlementDashboardPage() {
  const [metrics, setMetrics] = useState<SettlementMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/settlements/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch settlement dashboard metrics", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading Settlement Engine Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Total Gross Volume", value: `₹${metrics.total_processed_volume.toLocaleString("en-IN")}`, icon: TrendingUp, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30" },
    { label: "Total Settled Amount", value: `₹${metrics.total_settled_amount.toLocaleString("en-IN")}`, icon: CheckCircle2, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Pending Settlement Volume", value: `₹${metrics.pending_settlement_volume.toLocaleString("en-IN")}`, icon: Clock, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "Gross MDR Revenue", value: `₹${metrics.total_mdr_earned.toLocaleString("en-IN")}`, icon: Coins, color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30" },
    { label: "GST Liability (18%)", value: `₹${metrics.total_gst_liability.toLocaleString("en-IN")}`, icon: Receipt, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Distributor Commissions", value: `₹${metrics.total_distributor_commissions.toLocaleString("en-IN")}`, icon: Percent, color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-emerald-400" />
            Settlement Engine & MDR Telemetry
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time transaction settlement batches, MDR fee splits, GST liabilities, and bank payouts
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 border border-slate-700 hover:bg-slate-700/80 transition-all"
        >
          <RefreshCw className={`h-4 w-4 text-emerald-400 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] shadow-lg ${kpi.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">{kpi.label}</span>
                <Icon className="h-5 w-5 opacity-80" />
              </div>
              <div className="mt-3 text-3xl font-extrabold text-white">{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Volume by Mode Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-200 text-lg">Volume Breakdown by Payment Mode</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(metrics.volume_by_mode).map(([mode, vol]) => {
              const total = metrics.total_processed_volume || 1;
              const pct = Math.round((vol / total) * 100);
              return (
                <div key={mode} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-medium">{mode}</span>
                    <span className="font-mono text-slate-400">₹{vol.toLocaleString("en-IN")} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly Volume Trend */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-slate-200 text-lg">Hourly Cumulative Settlement Trend</h3>
          </div>
          <div className="space-y-4">
            {metrics.hourly_trend.map((item) => {
              const maxVol = metrics.total_processed_volume || 1;
              const pct = Math.min(100, Math.round((item.volume / maxVol) * 100));
              return (
                <div key={item.hour} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-mono">{item.hour} IST</span>
                    <span className="font-mono text-slate-400">₹{item.volume.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
