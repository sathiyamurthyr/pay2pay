"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Store,
  Users,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Wallet,
  TrendingUp,
  RefreshCw,
  PieChart as PieIcon,
  ShoppingBag,
  Building
} from "lucide-react";

interface RetailerMetrics {
  total_retailers: number;
  active_retailers: number;
  pending_kyc: number;
  suspended_retailers: number;
  created_today: number;
  total_wallet_balance: number;
  growth_chart: { month: string; retailers: number }[];
  category_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
}

export default function RetailerDashboardPage() {
  const [metrics, setMetrics] = useState<RetailerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/retailers/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch retailer dashboard metrics", err);
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
          <span className="text-lg font-medium">Loading Retailer Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Total Retailers", value: metrics.total_retailers, icon: Store, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30" },
    { label: "Active Merchant Outlets", value: metrics.active_retailers, icon: CheckCircle2, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Pending KYC Verification", value: metrics.pending_kyc, icon: AlertCircle, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "Suspended / Blocked", value: metrics.suspended_retailers, icon: ShieldAlert, color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30" },
    { label: "Onboarded Today", value: metrics.created_today, icon: ShoppingBag, color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30" },
    { label: "Total Wallet Float", value: `₹${metrics.total_wallet_balance.toLocaleString("en-IN")}`, icon: Wallet, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Store className="h-8 w-8 text-emerald-400" />
            Retailer Enterprise Telemetry
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time merchant onboarding metrics, KYC status breakdown, and wallet liabilities
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-200 text-lg">Merchant Business Categories</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(metrics.category_distribution).map(([cat, count]) => {
              const total = metrics.total_retailers || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={cat} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-medium">{cat}</span>
                    <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Onboarding Growth */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-slate-200 text-lg">Retailer Acquisition Growth</h3>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded">2026 Telemetry</span>
          </div>
          <div className="flex h-48 items-end gap-3 pt-6 border-b border-slate-800 pb-2">
            {metrics.growth_chart.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  style={{ height: `${Math.max(15, (item.retailers / Math.max(1, metrics.total_retailers)) * 100)}%` }}
                  className="w-full rounded-t bg-gradient-to-t from-blue-600 to-emerald-400 transition-all duration-500 hover:brightness-125"
                />
                <span className="text-xs font-mono text-slate-400">{item.month}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
