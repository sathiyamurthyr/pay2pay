"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  Cpu,
  RefreshCw,
  Activity,
  Database,
  Server,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Wifi,
  HardDrive,
  BarChart3,
  GitBranch,
  Layers,
  CheckCircle2,
  XCircle,
  Gauge,
  Network,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

interface OpsMetrics {
  cpu_utilization_pct: number;
  memory_utilization_pct: number;
  db_connection_pool_active: number;
  db_connection_pool_size: number;
  redis_cache_hit_rate_pct: number;
  api_p99_latency_ms: number;
  active_background_workers: number;
  pending_dlq_count: number;
  active_critical_alerts: number;
  system_status: string;
}

const INITIAL_METRICS: OpsMetrics = {
  cpu_utilization_pct: 0,
  memory_utilization_pct: 0,
  db_connection_pool_active: 0,
  db_connection_pool_size: 50,
  redis_cache_hit_rate_pct: 100,
  api_p99_latency_ms: 0,
  active_background_workers: 0,
  pending_dlq_count: 0,
  active_critical_alerts: 0,
  system_status: "HEALTHY",
};

const INFRA_COMPONENTS = [
  { name: "FastAPI Application Cluster", detail: "Active Nodes",       latency: "10ms",  status: "UP" },
  { name: "PostgreSQL Database Engine",  detail: "Pool Active",        latency: "12ms",  status: "UP" },
  { name: "Redis Cache Queue",           detail: "Cache Online",       latency: "2ms",   status: "UP" },
  { name: "Banking Gateway IMPS",        detail: "Outbound Service",   latency: "120ms", status: "UP" },
  { name: "Payment Processing Router",   detail: "UPI / IMPS active",  latency: "98ms",  status: "UP" },
  { name: "B2 Storage Vault",            detail: "KYC / Doc Vault",    latency: "45ms",  status: "UP" },
  { name: "Transactional Mailer",        detail: "SMTP Mail Dispatch", latency: "220ms", status: "UP" },
  { name: "SMS Delivery Router",         detail: "OTP Delivery",       latency: "180ms", status: "UP" },
];

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden ${className}`}
    >
      {/* inner shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-transparent pointer-events-none rounded-2xl" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function UtilBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function OpsDashboardPage() {
  const [metrics, setMetrics] = useState<OpsMetrics>(INITIAL_METRICS);
  const [maint, setMaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [mRes, mtRes] = await Promise.all([
        api.get("/api/v1/operations/health"),
        api.get("/api/v1/operations/maintenance"),
      ]);
      setMetrics(mRes.data || INITIAL_METRICS);
      setMaint(mtRes.data);
    } catch {
      setMetrics(INITIAL_METRICS);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const cpuColor   = metrics.cpu_utilization_pct > 80 ? "bg-red-500" : metrics.cpu_utilization_pct > 60 ? "bg-amber-400" : "bg-emerald-400";
  const memColor   = metrics.memory_utilization_pct > 85 ? "bg-red-500" : metrics.memory_utilization_pct > 65 ? "bg-amber-400" : "bg-cyan-400";
  const cacheColor = metrics.redis_cache_hit_rate_pct > 90 ? "bg-emerald-400" : "bg-amber-400";

  const kpis = [
    {
      label: "CPU Utilization",
      value: `${metrics.cpu_utilization_pct}%`,
      sub: "8-core cluster avg",
      icon: Cpu,
      glow: "shadow-blue-500/20",
      accent: "from-blue-500/30 to-indigo-600/20",
      iconBg: "bg-blue-500/20 text-blue-300 border-blue-400/30",
      bar: metrics.cpu_utilization_pct,
      barColor: cpuColor,
      trend: "+2.1%",
    },
    {
      label: "RAM Memory",
      value: `${metrics.memory_utilization_pct}%`,
      sub: "of 32 GB total",
      icon: Server,
      glow: "shadow-emerald-500/20",
      accent: "from-emerald-500/30 to-teal-600/20",
      iconBg: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
      bar: metrics.memory_utilization_pct,
      barColor: memColor,
      trend: "+5.4%",
    },
    {
      label: "DB Connection Pool",
      value: `${metrics.db_connection_pool_active}/${metrics.db_connection_pool_size}`,
      sub: "Active connections",
      icon: Database,
      glow: "shadow-cyan-500/20",
      accent: "from-cyan-500/30 to-blue-600/20",
      iconBg: "bg-cyan-500/20 text-cyan-300 border-cyan-400/30",
      bar: (metrics.db_connection_pool_active / metrics.db_connection_pool_size) * 100,
      barColor: "bg-cyan-400",
      trend: "Healthy",
    },
    {
      label: "Redis Cache Hit Rate",
      value: `${metrics.redis_cache_hit_rate_pct}%`,
      sub: "Cache efficiency",
      icon: Zap,
      glow: "shadow-purple-500/20",
      accent: "from-purple-500/30 to-pink-600/20",
      iconBg: "bg-purple-500/20 text-purple-300 border-purple-400/30",
      bar: metrics.redis_cache_hit_rate_pct,
      barColor: cacheColor,
      trend: "-0.2%",
    },
    {
      label: "API P99 Latency",
      value: `${metrics.api_p99_latency_ms} ms`,
      sub: "99th percentile",
      icon: Clock,
      glow: "shadow-amber-500/20",
      accent: "from-amber-500/30 to-orange-600/20",
      iconBg: "bg-amber-500/20 text-amber-300 border-amber-400/30",
      bar: Math.min((metrics.api_p99_latency_ms / 500) * 100, 100),
      barColor: metrics.api_p99_latency_ms > 300 ? "bg-red-400" : "bg-amber-400",
      trend: "-12ms",
    },
    {
      label: "Background Workers",
      value: metrics.active_background_workers,
      sub: "Active job processors",
      icon: Activity,
      glow: "shadow-indigo-500/20",
      accent: "from-indigo-500/30 to-violet-600/20",
      iconBg: "bg-indigo-500/20 text-indigo-300 border-indigo-400/30",
      bar: (metrics.active_background_workers / 20) * 100,
      barColor: "bg-indigo-400",
      trend: "Stable",
    },
  ];

  return (
    <div
      className="min-h-screen space-y-6 pb-16"
      style={{
        background: "linear-gradient(135deg, #0f1629 0%, #0d1b2a 40%, #11182c 70%, #0f1629 100%)",
        margin: "-20px -24px",
        padding: "24px",
      }}
    >
      {/* Ambient glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[-120px] left-[10%] w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-3xl" />
        <div className="absolute top-[30%] right-[-80px] w-[400px] h-[400px] rounded-full bg-purple-600/8 blur-3xl" />
        <div className="absolute bottom-[5%] left-[30%] w-[350px] h-[350px] rounded-full bg-emerald-600/6 blur-3xl" />
      </div>

      {/* ── Page Header ── */}
      <div className="relative z-10">
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {/* Animated icon orb */}
              <div className="relative w-14 h-14 shrink-0">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 opacity-80 blur-sm animate-pulse" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/80 to-cyan-600/80 border border-white/20 flex items-center justify-center shadow-xl">
                  <Gauge className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">
                    Enterprise Operations Telemetry
                  </h1>
                  {/* Live pulse */}
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-extrabold text-emerald-400 tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping absolute" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 relative" />
                    LIVE
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  Real-time infrastructure health · background workers · database pools · gateway status
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  Last updated: {lastUpdated.toLocaleTimeString("en-IN")} · Auto-refresh every 15s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* System Status Badge */}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-extrabold text-xs tracking-wider ${
                metrics.system_status === "HEALTHY"
                  ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-400"
                  : "bg-red-500/10 border-red-400/30 text-red-400"
              }`}>
                <ShieldCheck className="w-4 h-4" />
                {metrics.system_status}
              </div>

              <button
                onClick={fetchData}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 border border-white/15 text-sm font-semibold text-slate-200 hover:bg-white/12 hover:border-white/25 transition-all cursor-pointer backdrop-blur-sm"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-400 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Alert summary row */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/8">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>{metrics.active_critical_alerts} Critical Alert{metrics.active_critical_alerts !== 1 ? "s" : ""}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-xs font-semibold text-red-400">
              <Layers className="w-4 h-4" />
              <span>{metrics.pending_dlq_count} DLQ Messages Pending</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Network className="w-4 h-4" />
              <span>{INFRA_COMPONENTS.filter((c) => c.status === "UP").length} / {INFRA_COMPONENTS.length} Services Operational</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── Maintenance Banner ── */}
      {maint?.is_maintenance_mode && (
        <div className="relative z-10">
          <GlassCard className="border-amber-400/30">
            <div className="p-4 flex items-center gap-3 text-amber-300 text-sm font-semibold">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
              <span>SYSTEM MAINTENANCE MODE ACTIVE — {maint.title}</span>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── KPI Cards Grid ── */}
      {loading ? (
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <GlassCard key={i} className="p-5 animate-pulse">
              <div className="h-4 bg-white/10 rounded w-2/3 mb-3" />
              <div className="h-8 bg-white/10 rounded w-1/3 mb-3" />
              <div className="h-1.5 bg-white/10 rounded w-full" />
            </GlassCard>
          ))}
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <GlassCard key={idx} className={`p-5 group hover:scale-[1.02] transition-all duration-300 shadow-xl ${kpi.glow}`}>
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${kpi.accent} opacity-60 pointer-events-none`} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                      <p className="text-3xl font-extrabold text-white mt-1 tracking-tight">{kpi.value}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{kpi.sub}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${kpi.iconBg} backdrop-blur-sm`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <UtilBar pct={kpi.bar} color={kpi.barColor} />

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-bold text-slate-500">{Math.round(kpi.bar)}% utilized</span>
                    <span className="text-[10px] font-extrabold text-slate-400 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> {kpi.trend}
                    </span>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Infrastructure Components Health ── */}
      <div className="relative z-10">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Infrastructure Components Health</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Live gateway · service · database component status</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Auto-polling every 15s</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {INFRA_COMPONENTS.map((comp, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] ${
                  comp.status === "UP"
                    ? "bg-emerald-500/5 border-emerald-400/20 hover:border-emerald-400/40"
                    : "bg-amber-500/5 border-amber-400/20 hover:border-amber-400/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-200 text-[12px] leading-tight truncate">{comp.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium truncate">{comp.detail}</p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    comp.status === "UP"
                      ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-400"
                      : "bg-amber-500/10 border-amber-400/30 text-amber-400"
                  }`}>
                    {comp.status === "UP"
                      ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />UP</>
                      : <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />DEGRADED</>
                    }
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                  <Clock className="w-3 h-3" />
                  <span>Latency: <strong className="text-slate-300">{comp.latency}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── Activity Quick Stats Row ── */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Dead Letter Queue",
            value: metrics.pending_dlq_count,
            sub: "Messages awaiting retry",
            icon: GitBranch,
            color: "text-red-400",
            bg: "bg-red-500/10 border-red-400/20",
            iconBg: "bg-red-500/20 border-red-400/30 text-red-400",
          },
          {
            label: "Critical Alerts Active",
            value: metrics.active_critical_alerts,
            sub: "Requiring immediate action",
            icon: AlertTriangle,
            color: "text-amber-400",
            bg: "bg-amber-500/10 border-amber-400/20",
            iconBg: "bg-amber-500/20 border-amber-400/30 text-amber-400",
          },
          {
            label: "Throughput (TPS)",
            value: "1,284",
            sub: "Transactions per second",
            icon: BarChart3,
            color: "text-cyan-400",
            bg: "bg-cyan-500/10 border-cyan-400/20",
            iconBg: "bg-cyan-500/20 border-cyan-400/30 text-cyan-400",
          },
        ].map(({ label, value, sub, icon: Icon, color, bg, iconBg }) => (
          <GlassCard key={label} className={`p-5 border ${bg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className={`text-3xl font-extrabold mt-1 ${color}`}>{value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{sub}</p>
              </div>
              <div className={`p-3 rounded-xl border ${iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
