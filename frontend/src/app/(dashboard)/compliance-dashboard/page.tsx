"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  FileText,
  Receipt,
  Percent,
  CheckCircle2,
  Activity,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Server
} from "lucide-react";

interface ComplianceMetrics {
  total_taxable_volume: number;
  total_gst_collected: number;
  total_tds_deducted: number;
  generated_reports_count: number;
  system_health_status: string;
  component_latencies: Record<string, number>;
}

export default function ComplianceDashboardPage() {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/compliance/dashboard/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch compliance dashboard metrics", err);
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
          <span className="text-lg font-medium">Loading Compliance & System Health Telemetry...</span>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Total Taxable Volume", value: `₹${metrics.total_taxable_volume.toLocaleString("en-IN")}`, icon: Receipt, color: "from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30" },
    { label: "GST Collected (GSTR-1)", value: `₹${metrics.total_gst_collected.toLocaleString("en-IN")}`, icon: Percent, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
    { label: "TDS Deducted (Sec 194O)", value: `₹${metrics.total_tds_deducted.toLocaleString("en-IN")}`, icon: FileText, color: "from-cyan-500/20 to-blue-500/10 text-cyan-400 border-cyan-500/30" },
    { label: "Generated Audit Reports", value: metrics.generated_reports_count, icon: CheckCircle2, color: "from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30" },
    { label: "System Health Status", value: metrics.system_health_status, icon: Server, color: "from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
            Compliance, Audit & System Health
          </h1>
          <p className="mt-1 text-slate-400">
            GST returns, Form 26Q TDS deductions, security audit trails, and component latencies
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

      {/* Component Latency Breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl space-y-6">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-emerald-400" />
          <h3 className="font-semibold text-slate-200 text-lg">System Component Response Latencies</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(metrics.component_latencies).map(([comp, latency]) => (
            <div key={comp} className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
              <span className="text-xs text-slate-400">{comp}</span>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">{latency} ms</div>
              <div className="mt-1 text-[10px] text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Operational & Healthy
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
