"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  CreditCard,
  Wifi,
  Battery,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  PieChart as PieIcon,
  ShieldCheck,
  Cpu,
  Layers
} from "lucide-react";

interface MachineMetrics {
  total_machines: number;
  active_machines: number;
  inventory_stock: number;
  faulty_machines: number;
  offline_24h: number;
  total_daily_volume: number;
  model_distribution: Record<string, number>;
  network_distribution: Record<string, number>;
}

export default function MachineDashboardPage() {
  const [metrics, setMetrics] = useState<MachineMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/machines/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch machine dashboard metrics", err);
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
          <span className="text-lg font-medium">Loading POS Terminal Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Total POS Terminals", value: metrics.total_machines, icon: CreditCard, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30" },
    { label: "Active & Deployed", value: metrics.active_machines, icon: CheckCircle2, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Warehouse Stock Inventory", value: metrics.inventory_stock, icon: Layers, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Faulty / Replacement", value: metrics.faulty_machines, icon: AlertTriangle, color: "from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30" },
    { label: "Offline (>24 hrs)", value: metrics.offline_24h, icon: Wifi, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "Daily Processed Volume", value: `₹${metrics.total_daily_volume.toLocaleString("en-IN")}`, icon: TrendingUp, color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-emerald-400" />
            Swipe Machine & POS Telemetry
          </h1>
          <p className="mt-1 text-slate-400">
            Real-time terminal health, battery levels, network connectivity, and DUKPT encryption status
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

      {/* Visual Distribution Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Model Distribution */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-slate-200 text-lg">POS Model Breakdown</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(metrics.model_distribution).map(([model, count]) => {
              const total = metrics.total_machines || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={model} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-medium">{model}</span>
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

        {/* Network Distribution */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Wifi className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-slate-200 text-lg">Telecom & Network Modes</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(metrics.network_distribution).map(([net, count]) => {
              const total = metrics.total_machines || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={net} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300 font-medium">{net}</span>
                    <span className="font-mono text-slate-400">{count} ({pct}%)</span>
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
