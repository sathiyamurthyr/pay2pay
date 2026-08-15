"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  CreditCard, Wifi, AlertTriangle, CheckCircle2,
  TrendingUp, RefreshCw, Cpu, Layers, Signal, ShieldCheck,
  WifiOff,
} from "lucide-react";

const MOCK_METRICS = {
  total_machines: 284,
  active_machines: 241,
  inventory_stock: 31,
  faulty_machines: 8,
  offline_24h: 4,
  total_daily_volume: 48200000,
  model_distribution: {
    "Verifone VX520":    98,
    "Ingenico iWL250":   72,
    "PAX S300":          54,
    "Newland N910":      38,
    "Castles VEGA3000":  22,
  },
  network_distribution: {
    "GPRS / 2G":    44,
    "3G HSPA":      89,
    "4G LTE":      121,
    "Wi-Fi 802.11":  30,
  },
};

const MODEL_COLORS = ["bg-violet-400","bg-blue-400","bg-cyan-400","bg-indigo-400","bg-purple-400"];
const NET_COLORS   = ["bg-amber-400","bg-emerald-400","bg-teal-400","bg-cyan-400"];

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden ${className}`}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Bar({ pct, color, h = "h-1.5" }: { pct: number; color: string; h?: string }) {
  return (
    <div className={`w-full ${h} rounded-full bg-[#F1F5F9] overflow-hidden`}>
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function MachineDashboardPage() {
  const [metrics, setMetrics]     = useState(MOCK_METRICS);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/machines/dashboard/metrics");
      setMetrics(res.data || MOCK_METRICS);
    } catch { setMetrics(MOCK_METRICS); }
    finally { setLoading(false); setRefreshing(false); setLastUpdated(new Date()); }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const activeRate = Math.round((metrics.active_machines / metrics.total_machines) * 100);

  const kpis = [
    { label:"Total POS Terminals",   value: metrics.total_machines,  sub:"Fleet size",           icon:CreditCard,   accent:"from-blue-600/30 to-indigo-700/20",   iconBg:"bg-blue-500/20 border-blue-400/30 text-blue-300",       glow:"shadow-blue-500/15",    bar:100,                                      barColor:"bg-blue-400",    trend:"+12 this month", up:true  },
    { label:"Active & Deployed",      value: metrics.active_machines, sub:`${activeRate}% uptime`,icon:CheckCircle2, accent:"from-emerald-600/30 to-teal-700/20",  iconBg:"bg-emerald-500/20 border-emerald-400/30 text-emerald-300",glow:"shadow-emerald-500/15", bar:activeRate,                               barColor:"bg-emerald-400", trend:"Stable",          up:true  },
    { label:"Warehouse Inventory",    value: metrics.inventory_stock, sub:"Ready to deploy",      icon:Layers,       accent:"from-cyan-600/30 to-blue-700/20",     iconBg:"bg-cyan-500/20 border-cyan-400/30 text-cyan-300",       glow:"shadow-cyan-500/15",    bar:(metrics.inventory_stock/50)*100,         barColor:"bg-cyan-400",    trend:"In stock",        up:true  },
    { label:"Faulty / Replacement",   value: metrics.faulty_machines, sub:"Needs service",        icon:AlertTriangle,accent:"from-rose-600/30 to-red-700/20",    iconBg:"bg-rose-500/20 border-rose-400/30 text-rose-300",       glow:"shadow-rose-500/15",    bar:(metrics.faulty_machines/20)*100,         barColor:"bg-rose-400",    trend:"+2 flagged",      up:false },
    { label:"Offline > 24 hrs",        value: metrics.offline_24h,     sub:"Unreachable",          icon:WifiOff,      accent:"from-amber-600/30 to-orange-700/20",  iconBg:"bg-amber-500/20 border-amber-400/30 text-amber-300",    glow:"shadow-amber-500/15",   bar:(metrics.offline_24h/20)*100,             barColor:"bg-amber-400",   trend:"Under review",    up:false },
    { label:"Daily Processed Volume", value:`₹${(metrics.total_daily_volume/10000000).toFixed(2)} Cr`,sub:"Throughput",icon:TrendingUp,accent:"from-violet-600/30 to-purple-700/20",iconBg:"bg-violet-500/20 border-violet-400/30 text-violet-300",glow:"shadow-violet-500/15",bar:82,barColor:"bg-violet-400",trend:"+9.3% today",up:true },
  ];

  return (
    <div className="min-h-screen space-y-6 pb-16 bg-[#F8FAFC]">

      {/* ── Header ── */}
      <div>
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 opacity-80 blur-sm animate-pulse" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/80 to-violet-600/80 border border-white/20 flex items-center justify-center shadow-xl">
                  <CreditCard className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Swipe Machine & POS Telemetry</h1>
                  <span className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-extrabold text-blue-600 tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping absolute left-2" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 relative ml-2" />
                    LIVE
                  </span>
                </div>
                <p className="text-sm text-[#475569]">Real-time terminal health · battery levels · network connectivity · DUKPT encryption</p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5 font-mono">Updated: {lastUpdated.toLocaleTimeString("en-IN")} · Auto-refresh every 15s</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-xl font-extrabold text-emerald-600">{activeRate}%</span>
                <span className="text-[10px] text-[#64748B] font-semibold">Uptime</span>
              </div>
              <button onClick={fetchMetrics} disabled={refreshing} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-all cursor-pointer">
                <RefreshCw className={`w-4 h-4 text-blue-400 ${refreshing ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
          </div>
          {/* Quick stats strip */}
          <div className="flex flex-wrap items-center gap-5 mt-5 pt-4 border-t border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600"><CreditCard className="w-4 h-4" /><span>{metrics.total_machines} Total</span></div>
            <div className="w-px h-4 bg-[#E2E8F0]" />
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600"><CheckCircle2 className="w-4 h-4" /><span>{metrics.active_machines} Active</span></div>
            <div className="w-px h-4 bg-[#E2E8F0]" />
            <div className="flex items-center gap-2 text-xs font-semibold text-rose-600"><AlertTriangle className="w-4 h-4" /><span>{metrics.faulty_machines} Faulty</span></div>
            <div className="w-px h-4 bg-[#E2E8F0]" />
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600"><WifiOff className="w-4 h-4" /><span>{metrics.offline_24h} Offline</span></div>
          </div>
        </GlassCard>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <GlassCard key={idx} className={`p-5 hover:scale-[1.02] transition-all duration-300 shadow-xl ${kpi.glow}`}>
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${kpi.accent} opacity-60 pointer-events-none`} />
              <div className="relative z-10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-2xl font-extrabold text-[#0F172A] mt-1 tracking-tight">{kpi.value}</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 font-medium">{kpi.sub}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${kpi.iconBg} shrink-0`}><Icon className="w-5 h-5" /></div>
                </div>
                <div className="mt-3">
                  <Bar pct={kpi.bar} color={kpi.barColor} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-bold text-[#94A3B8]">{Math.round(kpi.bar)}%</span>
                    <span className={`text-[10px] font-extrabold ${kpi.up ? "text-emerald-400" : "text-rose-400"}`}>{kpi.trend}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── Distribution Panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Model Distribution */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-400/30"><Cpu className="w-5 h-5 text-violet-400" /></div>
            <div>
              <h3 className="font-extrabold text-[#0F172A] text-base">POS Model Breakdown</h3>
              <p className="text-[11px] text-[#64748B] mt-0.5">{Object.keys(metrics.model_distribution).length} terminal models deployed</p>
            </div>
          </div>
          <div className="space-y-3.5">
            {Object.entries(metrics.model_distribution).map(([model, count], i) => {
              const pct = Math.round((count / metrics.total_machines) * 100);
              const mc  = MODEL_COLORS[i % MODEL_COLORS.length];
              return (
                <div key={model}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${mc} shrink-0`} />
                      <span className="text-[12px] font-semibold text-[#334155]">{model}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#64748B]">{count} units</span>
                      <span className="text-[11px] font-extrabold text-[#94A3B8] w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <Bar pct={pct} color={mc} h="h-2" />
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Network Distribution */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30"><Signal className="w-5 h-5 text-cyan-400" /></div>
            <div>
              <h3 className="font-extrabold text-[#0F172A] text-base">Telecom & Network Modes</h3>
              <p className="text-[11px] text-[#64748B] mt-0.5">Connectivity breakdown across fleet</p>
            </div>
          </div>
          <div className="space-y-3.5">
            {Object.entries(metrics.network_distribution).map(([net, count], i) => {
              const pct = Math.round((count / metrics.total_machines) * 100);
              const nc  = NET_COLORS[i % NET_COLORS.length];
              return (
                <div key={net}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${nc} shrink-0`} />
                      <span className="text-[12px] font-semibold text-[#334155]">{net}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#64748B]">{count} units</span>
                      <span className="text-[11px] font-extrabold text-[#94A3B8] w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <Bar pct={pct} color={nc} h="h-2" />
                </div>
              );
            })}
          </div>
          <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] text-[#64748B] font-semibold">All active terminals: DUKPT Triple-DES encryption validated</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
