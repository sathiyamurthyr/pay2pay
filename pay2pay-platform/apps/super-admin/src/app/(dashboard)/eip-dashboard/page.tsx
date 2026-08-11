"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Network,
  RefreshCw,
  Cpu,
  Webhook,
  Building2,
  Activity,
  Code,
  Zap
} from "lucide-react";

interface EipMetrics {
  requests_per_minute: number;
  active_connectors: number;
  webhook_success_rate: number;
  registered_partners: number;
  total_events_published: number;
  developer_apps_count: number;
  p99_latency_ms: number;
  rate_limit_blocks_today: number;
}

export default function EipDashboardPage() {
  const [metrics, setMetrics] = useState<EipMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/eip/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch EIP telemetry", err);
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
        <div className="flex items-center gap-3 text-cyan-400">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading Enterprise Integration Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "API Gateway Traffic Volume", value: `${metrics.requests_per_minute.toLocaleString()} req/min`, icon: Network, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Active Bank & Gateway Connectors", value: metrics.active_connectors, icon: Cpu, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "Webhook Delivery Reliability", value: `${metrics.webhook_success_rate}%`, icon: Webhook, color: "from-purple-500/20 to-indigo-500/10 text-purple-400 border-purple-500/30" },
    { label: "Registered Integration Partners", value: metrics.registered_partners, icon: Building2, color: "from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30" },
    { label: "API Gateway P99 Latency", value: `${metrics.p99_latency_ms} ms`, icon: Zap, color: "from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30" },
    { label: "Developer Applications", value: metrics.developer_apps_count, icon: Code, color: "from-rose-500/20 to-pink-500/10 text-rose-400 border-rose-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <Network className="h-8 w-8 text-cyan-400" />
            Enterprise Integration Platform (EIP) & API Gateway
          </h1>
          <p className="mt-1 text-slate-400">
            Centralised API management, partner onboarding, bank connectors, webhook delivery, & event bus telemetry
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-200 border border-slate-700 hover:bg-slate-700/80 transition-all"
        >
          <RefreshCw className={`h-4 w-4 text-cyan-400 ${refreshing ? "animate-spin" : ""}`} />
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
    </div>
  );
}
