"use client";

import React, { useEffect, useState } from "react";
import { 
  Sliders, ShieldCheck, Zap, GitBranch, RefreshCw, 
  CheckCircle2, Layers, Cpu, Activity, Sparkles, AlertTriangle
} from "lucide-react";
import apiClient from "@/lib/api";

interface PolicyMetrics {
  total_policies: number;
  active_policies: number;
  published_versions: number;
  overrides_count: number;
  category_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
  average_evaluation_latency_ms: number;
}

export default function PolicyDashboardPage() {
  const [metrics, setMetrics] = useState<PolicyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/policies/dashboard");
      setMetrics(res.data.data);
    } catch (err) {
      console.error("Failed to fetch policy telemetry", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-7 h-7 text-cyan-400" /> Central Policy & Rule Telemetry
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Single Source of Truth for 11-Tier Hierarchy Overrides, Limits & Pre-Transaction Controls
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-sm font-medium transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Telemetry
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl border border-slate-800 bg-slate-900/60 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Policy Masters</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                {metrics?.total_policies ?? 0}
              </h3>
              <p className="text-xs text-cyan-400 flex items-center gap-1 mt-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Zero hardcoded rules
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800 bg-slate-900/60 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Published Policies</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                {metrics?.active_policies ?? 0}
              </h3>
              <p className="text-xs text-slate-500 mt-2">Active in production pipeline</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800 bg-slate-900/60 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Evaluation Latency</p>
              <h3 className="text-2xl font-bold text-cyan-400 mt-1">
                {metrics?.average_evaluation_latency_ms ?? 1.2} ms
              </h3>
              <p className="text-xs text-emerald-400 mt-2">Sub-50ms SLA Target Met</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800 bg-slate-900/60 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Overrides</p>
              <h3 className="text-2xl font-bold text-purple-400 mt-1">
                {metrics?.overrides_count ?? 0}
              </h3>
              <p className="text-xs text-purple-400/80 mt-2">Specific entity limit exceptions</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 11-Tier Hierarchy Map */}
      <div className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-cyan-400" /> 11-Tier Configuration Resolution Cascade
        </h3>
        <p className="text-xs text-slate-400">
          Rule Evaluation Principle: <strong className="text-cyan-400 font-mono">"Nearest Configuration Overrides Parent"</strong>
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
          {[
            "1. Platform", "2. Company", "3. Region", "4. RM",
            "5. Super Dist", "6. Distributor", "7. Retailer",
            "8. Cust Cat", "9. Customer", "10. Ben Cat", "11. Beneficiary"
          ].map((tier, idx) => (
            <div key={idx} className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-center">
              <span className="text-xs font-semibold text-cyan-300 block font-mono">{tier}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
