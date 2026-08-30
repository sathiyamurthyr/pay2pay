"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  Percent,
  Receipt,
  Layers,
  RefreshCw,
  Zap,
  ArrowRight
} from "lucide-react";

interface ConfigMetrics {
  total_configs_count: number;
  pending_approvals_count: number;
  overrides_count: number;
  avg_mdr_percentage: number;
  standard_gst_rate: number;
  tds_section_code: string;
}

export default function FinancialConfigDashboardPage() {
  const [metrics, setMetrics] = useState<ConfigMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/financial-config/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch financial config metrics", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading Financial Configuration Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Active Configurations", value: metrics.total_configs_count, icon: Sliders, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30" },
    { label: "Pending Maker-Checker Approvals", value: metrics.pending_approvals_count, icon: AlertCircle, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "Hierarchy Priority Overrides", value: metrics.overrides_count, icon: Layers, color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30" },
    { label: "Company Default MDR Rate", value: `${metrics.avg_mdr_percentage}%`, icon: Percent, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Standard GST Rate", value: `${metrics.standard_gst_rate}%`, icon: Receipt, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "TDS Section Code", value: metrics.tds_section_code, icon: CheckCircle2, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
  ];

  const priorityChain = [
    { step: 1, name: "Machine Level", desc: "TID Specific Override" },
    { step: 2, name: "Retailer Level", desc: "Merchant Specific Rate" },
    { step: 3, name: "Distributor Level", desc: "Distributor Network Pool" },
    { step: 4, name: "Super Distributor Level", desc: "Regional Hub Matrix" },
    { step: 5, name: "Regional Manager Level", desc: "RM State Zone Rule" },
    { step: 6, name: "Company Default", desc: "Tenant Enterprise Standard" },
    { step: 7, name: "Platform Default", desc: "Global Fallback Rule" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Sliders className="h-8 w-8 text-emerald-400" />
            Financial Configuration Telemetry
          </h1>
          <p className="mt-1 text-slate-400">
            Centralized 7-tier priority override resolution, MDR matrix, GST/TDS tax rules, and approval queue
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

      {/* 7-Tier Priority Override Chain Visualizer */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <h3 className="font-semibold text-slate-200 text-lg">7-Tier Dynamic Priority Resolution Cascade</h3>
        </div>
        <p className="text-xs text-slate-400">
          The platform evaluates financial parameters by inspecting the nearest entity level first. Specific rules at lower numbers override standard defaults.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {priorityChain.map((p) => (
            <div key={p.step} className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 relative flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">Priority #{p.step}</span>
                <div className="mt-1 font-bold text-sm text-slate-100">{p.name}</div>
                <div className="mt-1 text-[11px] text-slate-400">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
