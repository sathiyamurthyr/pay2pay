"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Network,
  Users,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
  TrendingUp,
  RefreshCw,
  PieChart as PieIcon,
  Layers,
  ShieldAlert,
  UserCheck
} from "lucide-react";

interface OrgMetrics {
  total_rms: number;
  total_super_distributors: number;
  total_distributors: number;
  mapped_entities: number;
  unmapped_entities: number;
  suspended_entities: number;
  pending_transfers: number;
  growth_chart: { month: string; rms: number; super_distributors: number; distributors: number }[];
  tier_distribution: Record<string, number>;
}

export default function OrganizationDashboardPage() {
  const [metrics, setMetrics] = useState<OrgMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/organization/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch organization dashboard metrics", err);
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
          <span className="text-lg font-medium">Loading Organization Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Regional Managers (RM)", value: metrics.total_rms, icon: UserCheck, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30" },
    { label: "Super Distributors (SD)", value: metrics.total_super_distributors, icon: Network, color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30" },
    { label: "Distributors", value: metrics.total_distributors, icon: Users, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Mapped Relationships", value: metrics.mapped_entities, icon: CheckCircle2, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Unmapped Entities", value: metrics.unmapped_entities, icon: AlertTriangle, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "Suspended Entities", value: metrics.suspended_entities, icon: ShieldAlert, color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30" },
    { label: "Pending Transfers", value: metrics.pending_transfers, icon: ArrowLeftRight, color: "from-teal-500/20 to-emerald-500/10 text-teal-400 border-teal-500/30" },
    { label: "Total Network Nodes", value: metrics.total_rms + metrics.total_super_distributors + metrics.total_distributors, icon: Layers, color: "from-indigo-500/20 to-purple-500/10 text-indigo-300 border-indigo-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Network className="h-8 w-8 text-emerald-400" />
            Organization & Hierarchy Telemetry
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time sales hierarchy network topology, mapping coverage & transfer telemetry
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

      {/* KPI Cards Grid */}
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

      {/* Visualizers Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tier Distribution */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <PieIcon className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-200 text-lg">Sales Network Tier Breakdown</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(metrics.tier_distribution).map(([tier, count]) => {
              const total = metrics.total_rms + metrics.total_super_distributors + metrics.total_distributors;
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <div key={tier} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-medium">{tier.replace("_", " ")}</span>
                    <span className="font-mono text-slate-400">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        tier === "REGIONAL_MANAGERS" ? "bg-blue-400" :
                        tier === "SUPER_DISTRIBUTORS" ? "bg-purple-400" : "bg-emerald-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hierarchy Growth Trend */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-slate-200 text-lg">Network Expansion Trend</h3>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded">2026 Telemetry</span>
          </div>
          <div className="flex h-48 items-end gap-3 pt-6 border-b border-slate-800 pb-2">
            {metrics.growth_chart.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  style={{ height: `${Math.max(15, ((item.rms + item.super_distributors + item.distributors) / Math.max(1, metrics.total_rms + metrics.total_super_distributors + metrics.total_distributors)) * 100)}%` }}
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
