"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  ShieldAlert,
  Zap,
  TrendingUp,
  RefreshCw,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  MapPin,
  CreditCard
} from "lucide-react";

interface DashboardMetrics {
  total_companies: number;
  active_companies: number;
  inactive_companies: number;
  suspended_companies: number;
  created_today: number;
  expiring_soon: number;
  trial_companies: number;
  live_companies: number;
  growth_chart: { month: string; companies: number }[];
  status_distribution: Record<string, number>;
  state_distribution: Record<string, number>;
  subscription_distribution: Record<string, number>;
}

export default function CompanyDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/companies/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch company dashboard metrics", err);
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
          <span className="text-lg font-medium">Loading Company Management Dashboard...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Total Companies", value: metrics.total_companies, icon: Building2, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30" },
    { label: "Active Companies", value: metrics.active_companies, icon: CheckCircle2, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Inactive Companies", value: metrics.inactive_companies, icon: Clock, color: "from-slate-500/20 to-gray-500/10 text-slate-400 border-slate-500/30" },
    { label: "Suspended Companies", value: metrics.suspended_companies, icon: ShieldAlert, color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30" },
    { label: "Created Today", value: metrics.created_today, icon: Calendar, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Expiring Soon", value: metrics.expiring_soon, icon: AlertTriangle, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "Trial Companies", value: metrics.trial_companies, icon: Sparkles, color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30" },
    { label: "Live Companies", value: metrics.live_companies, icon: Zap, color: "from-emerald-500/20 to-green-500/10 text-emerald-300 border-emerald-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-emerald-400" />
            Company (Tenant) Management Dashboard
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time telemetry, tenant onboarding metrics & multi-tenant distribution
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

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* 4 Analytics Visualizers Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Growth Chart Visualizer */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-2xs text-[#111827]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#166534]" />
              <h3 className="font-extrabold text-[#111827] text-lg">Company Growth Trend</h3>
            </div>
            <span className="text-xs font-mono text-[#6B7280] font-bold bg-[#FAFBFC] px-2.5 py-1 rounded border border-[#E5E7EB]">2026 Telemetry</span>
          </div>
          <div className="flex h-48 items-end gap-3 pt-6 border-b border-[#E5E7EB] pb-2">
            {metrics.growth_chart.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  style={{ height: `${Math.max(15, (item.companies / (metrics.total_companies || 1)) * 100)}%` }}
                  className="w-full rounded-t bg-[#2563EB] transition-all duration-500 hover:brightness-125"
                />
                <span className="text-xs font-mono font-bold text-[#6B7280]">{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-2xs text-[#111827]">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="h-5 w-5 text-[#2563EB]" />
            <h3 className="font-extrabold text-[#111827] text-lg">Status Distribution</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(metrics.status_distribution).map(([status, count]) => {
              const pct = metrics.total_companies ? Math.round((count / metrics.total_companies) * 100) : 0;
              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#111827] font-bold">{status.replace("_", " ")}</span>
                    <span className="font-mono font-bold text-[#6B7280]">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#F3F4F6] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        status === "ACTIVE" ? "bg-[#16A34A]" :
                        status === "PENDING_APPROVAL" ? "bg-[#D97706]" :
                        status === "SUSPENDED" ? "bg-[#DC2626]" : "bg-[#6B7280]"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* State-wise Distribution */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-2xs text-[#111827]">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="h-5 w-5 text-[#2563EB]" />
            <h3 className="font-extrabold text-[#111827] text-lg">State-wise Regional Presence</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(metrics.state_distribution).map(([state, count]) => (
              <div key={state} className="rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] p-4">
                <div className="text-xs text-[#6B7280] uppercase font-mono font-bold">{state}</div>
                <div className="text-2xl font-extrabold text-[#111827] mt-1">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription Distribution */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-2xs text-[#111827]">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="h-5 w-5 text-[#2563EB]" />
            <h3 className="font-extrabold text-[#111827] text-lg">Subscription Tier Distribution</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(metrics.subscription_distribution).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#FAFBFC] px-4 py-3">
                <span className="font-bold text-[#111827]">{plan.replace("_", " ")}</span>
                <span className="font-mono text-[#166534] bg-[#DCFCE7] border border-[#BBF7D0] px-3 py-1 rounded-full text-xs font-bold">
                  {count} Companies
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
