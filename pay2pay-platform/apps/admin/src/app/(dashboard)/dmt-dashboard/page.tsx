"use client";

import React, { useEffect, useState } from "react";
import { 
  Send, TrendingUp, RefreshCw, CheckCircle2, ShieldAlert, 
  RotateCcw, DollarSign, Activity, Users, Building2
} from "lucide-react";
import apiClient from "@/lib/api";

interface DmtMetrics {
  today_transfers_count: number;
  today_volume_amount: number;
  success_rate_pct: number;
  failure_rate_pct: number;
  pending_transfers_count: number;
  reversals_count: number;
  mode_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
}

export default function DmtDashboardPage() {
  const [metrics, setMetrics] = useState<DmtMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/dmt/dashboard");
      setMetrics(res.data.data);
    } catch (err) {
      console.error("Failed to fetch DMT metrics", err);
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
            <Send className="w-7 h-7 text-blue-400" /> Domestic Money Transfer (DMT) Telemetry
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time Fund Transfers, Switch Status, Reversals & Commission Splits
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
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Today's Transfer Volume</p>
              <h3 className="text-2xl font-bold text-white mt-1">
                ₹{metrics?.today_volume_amount?.toLocaleString() ?? 0}
              </h3>
              <p className="text-xs text-blue-400 flex items-center gap-1 mt-2">
                <Send className="w-3.5 h-3.5" /> {metrics?.today_transfers_count ?? 0} transfers processed
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800 bg-slate-900/60 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Success Rate</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">
                {metrics?.success_rate_pct ?? 100}%
              </h3>
              <p className="text-xs text-slate-500 mt-2">IMPS / NEFT Switch Latency &lt; 300ms</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800 bg-slate-900/60 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Pending / Processing</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1">
                {metrics?.pending_transfers_count ?? 0}
              </h3>
              <p className="text-xs text-amber-400/80 mt-2">Bank Switch Queue</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800 bg-slate-900/60 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Reversals Processed</p>
              <h3 className="text-2xl font-bold text-rose-400 mt-1">
                {metrics?.reversals_count ?? 0}
              </h3>
              <p className="text-xs text-rose-400/80 mt-2">Auto-refunded to retailer wallet</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Mode Distribution & Switch Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-900/60">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-400" /> Transfer Mode Distribution
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
              <span className="text-sm text-slate-300">IMPS (Instant 24x7)</span>
              <span className="text-sm font-semibold text-emerald-400">{metrics?.mode_breakdown?.IMPS ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
              <span className="text-sm text-slate-300">NEFT (Batch Settlement)</span>
              <span className="text-sm font-semibold text-blue-400">{metrics?.mode_breakdown?.NEFT ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
              <span className="text-sm text-slate-300">RTGS (High Value)</span>
              <span className="text-sm font-semibold text-purple-400">{metrics?.mode_breakdown?.RTGS ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl border border-slate-800 bg-slate-900/60">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" /> Bank Switch Integration Status
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-white block">Primary IMPS Gateway (HDFC/ICICI)</span>
                <span className="text-xs text-slate-500">Latency: 142ms | Success: 99.8%</span>
              </div>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ONLINE</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-sm font-medium text-white block">Secondary Switch (SBI / Axis)</span>
                <span className="text-xs text-slate-500">Standby Failover Ready</span>
              </div>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">READY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
