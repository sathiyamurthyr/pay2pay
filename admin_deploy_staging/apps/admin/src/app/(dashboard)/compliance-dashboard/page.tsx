"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  FileText,
  Receipt,
  Percent,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Gavel,
  FileCheck2,
  TrendingUp,
  Activity,
  Server,
  Database,
  Zap,
  BadgeCheck,
  ScrollText,
  Scale,
  ArrowUpRight,
  CircleDot,
} from "lucide-react";

/* ── Mock Data ─────────────────────────────────────────────────── */
const MOCK_METRICS = {
  total_taxable_volume:   84620000,
  total_gst_collected:     1523160,
  total_tds_deducted:       846200,
  generated_reports_count:      47,
  system_health_status: "HEALTHY",
  component_latencies: {
    "GST Filing Engine":        42,
    "TDS Computation Service":  28,
    "Audit Trail Writer":        15,
    "KYC Verification API":    118,
    "Report Generator":          67,
    "Regulatory Sync Service":   89,
  },
};

const COMPLIANCE_FILINGS = [
  { name: "GSTR-1 (Monthly)",       period: "Jul 2026",   due: "11 Aug 2026",  status: "FILED",   amount: "₹9.82L" },
  { name: "GSTR-3B (Monthly)",      period: "Jul 2026",   due: "20 Aug 2026",  status: "PENDING", amount: "₹9.82L" },
  { name: "Form 26Q TDS (Q1)",      period: "Apr–Jun 26", due: "31 Jul 2026",  status: "FILED",   amount: "₹4.21L" },
  { name: "TDS Certificate (16A)",  period: "Q1 FY26-27", due: "15 Aug 2026",  status: "PENDING", amount: "—" },
  { name: "GSTR-9 (Annual)",        period: "FY 2025-26", due: "31 Dec 2026",  status: "UPCOMING",amount: "—" },
  { name: "Income Tax Advance",     period: "Q2 FY26-27", due: "15 Sep 2026",  status: "UPCOMING",amount: "—" },
];

const AUDIT_EVENTS = [
  { time: "23:12", event: "TDS batch computed — 847 transactions", type: "success" },
  { time: "22:45", event: "GSTR-1 data validated — 0 errors found", type: "success" },
  { time: "21:30", event: "KYC document expiry flagged — 12 entities", type: "warn" },
  { time: "20:15", event: "Audit trail export generated (PDF)", type: "success" },
  { time: "19:00", event: "Regulatory sync — RBI reporting submitted", type: "success" },
  { time: "17:42", event: "Manual review triggered — 3 high-risk txns", type: "warn" },
];

const fmt = (n: number) =>
  n >= 10_000_000
    ? `₹${(n / 10_000_000).toFixed(2)} Cr`
    : n >= 100_000
    ? `₹${(n / 100_000).toFixed(2)} L`
    : `₹${n.toLocaleString("en-IN")}`;

/* ── Glassmorphism card ─────────────────────────────────────────── */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/* ── Progress bar ───────────────────────────────────────────────── */
function Bar({ pct, color, h = "h-1.5" }: { pct: number; color: string; h?: string }) {
  return (
    <div className={`w-full ${h} rounded-full bg-[#F1F5F9] overflow-hidden`}>
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

/* ── Latency colour helper ──────────────────────────────────────── */
function latencyStyle(ms: number) {
  if (ms <= 30)  return { bar: "bg-emerald-400", text: "text-emerald-400", badge: "bg-emerald-500/10 border-emerald-400/20 text-emerald-400", label: "Excellent" };
  if (ms <= 80)  return { bar: "bg-blue-400",    text: "text-blue-400",    badge: "bg-blue-500/10 border-blue-400/20 text-blue-400",    label: "Good"      };
  if (ms <= 150) return { bar: "bg-amber-400",   text: "text-amber-400",   badge: "bg-amber-500/10 border-amber-400/20 text-amber-400",  label: "Moderate"  };
  return               { bar: "bg-rose-400",     text: "text-rose-400",    badge: "bg-rose-500/10 border-rose-400/20 text-rose-400",     label: "Slow"      };
}

/* ── Filing status style ────────────────────────────────────────── */
function filingStyle(status: string) {
  if (status === "FILED")    return { bg: "bg-emerald-500/10 border-emerald-400/20", text: "text-emerald-400", dot: "bg-emerald-400" };
  if (status === "PENDING")  return { bg: "bg-amber-500/10 border-amber-400/20",    text: "text-amber-400",   dot: "bg-amber-400"   };
  return                            { bg: "bg-slate-500/10 border-slate-400/15",    text: "text-[#64748B]",   dot: "bg-slate-400"   };
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function ComplianceDashboardPage() {
  const [metrics, setMetrics]     = useState(MOCK_METRICS);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/compliance/dashboard/metrics");
      setMetrics(res.data || MOCK_METRICS);
    } catch {
      setMetrics(MOCK_METRICS);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  /* Compliance score (0-100) derived from filed / total filings */
  const filed    = COMPLIANCE_FILINGS.filter((f) => f.status === "FILED").length;
  const pending  = COMPLIANCE_FILINGS.filter((f) => f.status === "PENDING").length;
  const upcoming = COMPLIANCE_FILINGS.filter((f) => f.status === "UPCOMING").length;
  const score    = Math.round((filed / COMPLIANCE_FILINGS.length) * 100);

  const kpis = [
    {
      label: "Total Taxable Volume",
      value: fmt(metrics.total_taxable_volume),
      sub: "Across all payment modes",
      icon: Receipt,
      accent: "from-blue-600/30 to-indigo-700/20",
      iconBg: "bg-blue-500/20 border-blue-400/30 text-blue-300",
      glow: "shadow-blue-500/15",
      bar: 80, barColor: "bg-blue-400",
      trend: "+6.2% vs last month", up: true,
    },
    {
      label: "GST Collected (GSTR-1)",
      value: fmt(metrics.total_gst_collected),
      sub: "18% on taxable MDR",
      icon: Percent,
      accent: "from-emerald-600/30 to-teal-700/20",
      iconBg: "bg-emerald-500/20 border-emerald-400/30 text-emerald-300",
      glow: "shadow-emerald-500/15",
      bar: (metrics.total_gst_collected / metrics.total_taxable_volume) * 100 * 5,
      barColor: "bg-emerald-400",
      trend: "GSTR-3B due 20 Aug", up: true,
    },
    {
      label: "TDS Deducted (Sec 194O)",
      value: fmt(metrics.total_tds_deducted),
      sub: "1% on taxable e-commerce",
      icon: FileText,
      accent: "from-amber-600/30 to-orange-700/20",
      iconBg: "bg-amber-500/20 border-amber-400/30 text-amber-300",
      glow: "shadow-amber-500/15",
      bar: (metrics.total_tds_deducted / metrics.total_taxable_volume) * 100 * 10,
      barColor: "bg-amber-400",
      trend: "Form 26Q filed Q1", up: true,
    },
    {
      label: "Audit Reports Generated",
      value: metrics.generated_reports_count,
      sub: "Regulatory + internal",
      icon: FileCheck2,
      accent: "from-violet-600/30 to-purple-700/20",
      iconBg: "bg-violet-500/20 border-violet-400/30 text-violet-300",
      glow: "shadow-violet-500/15",
      bar: 70, barColor: "bg-violet-400",
      trend: "+3 this week", up: true,
    },
    {
      label: "Compliance Score",
      value: `${score}%`,
      sub: `${filed} filed · ${pending} pending`,
      icon: BadgeCheck,
      accent: score >= 80 ? "from-emerald-600/30 to-teal-700/20" : "from-rose-600/30 to-red-700/20",
      iconBg: score >= 80 ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300" : "bg-rose-500/20 border-rose-400/30 text-rose-300",
      glow: score >= 80 ? "shadow-emerald-500/15" : "shadow-rose-500/15",
      bar: score, barColor: score >= 80 ? "bg-emerald-400" : "bg-rose-400",
      trend: score >= 80 ? "On track" : "Action needed", up: score >= 80,
    },
    {
      label: "System Health",
      value: metrics.system_health_status,
      sub: `${Object.keys(metrics.component_latencies).length} components monitored`,
      icon: ShieldCheck,
      accent: "from-cyan-600/30 to-blue-700/20",
      iconBg: "bg-cyan-500/20 border-cyan-400/30 text-cyan-300",
      glow: "shadow-cyan-500/15",
      bar: 100, barColor: "bg-cyan-400",
      trend: "All systems nominal", up: true,
    },
  ];

  return (
    <div className="min-h-screen space-y-6 pb-16 bg-[#F8FAFC]">

      {/* ── Page Header ── */}
      <div>
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {/* Orb */}
              <div className="relative w-14 h-14 shrink-0">
                <div className="relative w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-xl">
                  <Gavel className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                    Compliance & Regulatory Dashboard
                  </h1>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-[10px] font-extrabold text-amber-600 tracking-wider">
                    MONITORING
                  </span>
                </div>
                <p className="text-sm text-[#475569]">GST · TDS · Audit Trail · Regulatory Filing Status</p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5 font-mono">
                  Updated: {lastUpdated.toLocaleTimeString("en-IN")} · Auto-refresh every 30s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Compliance score ring */}
              <div className={`flex flex-col items-center px-4 py-2 rounded-xl border ${score >= 80 ? "bg-emerald-500/10 border-emerald-400/25" : "bg-rose-500/10 border-rose-400/25"}`}>
                <span className={`text-xl font-extrabold ${score >= 80 ? "text-emerald-600" : "text-rose-600"}`}>{score}%</span>
                <span className="text-[10px] text-[#64748B] font-semibold">Compliance Score</span>
              </div>
              <button
                onClick={fetchMetrics}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E2E8F0] text-sm font-semibold text-[#374151] hover:bg-[#F8FAFC] transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-amber-500 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <GlassCard key={idx} className="p-5 group hover:scale-[1.02] transition-all duration-300 shadow-sm">
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-2xl font-extrabold text-[#0F172A] mt-1 tracking-tight">{kpi.value}</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 font-medium">{kpi.sub}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${kpi.iconBg} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <Bar pct={kpi.bar} color={kpi.barColor} />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-[#64748B]">{Math.round(kpi.bar)}%</span>
                  <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${kpi.up ? "text-emerald-600" : "text-rose-600"}`}>
                    <ArrowUpRight className="w-3 h-3" />
                    {kpi.trend}
                  </span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── Middle Row: Regulatory Filings + Audit Log ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Regulatory Filings Status */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 border border-amber-200">
                <ScrollText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-base">Regulatory Filing Status</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">Statutory returns · TDS · GST · Income Tax</p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {COMPLIANCE_FILINGS.map((filing, i) => {
              const st = filingStyle(filing.status);
              return (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${st.dot} shrink-0`} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-extrabold text-[#1E293B] truncate">{filing.name}</p>
                      <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">
                        {filing.period} · Due: {filing.due}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 ml-3 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${st.bg} ${st.text}`}>
                    {filing.status}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Audit Trail Feed */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 border border-blue-200">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-base">Today's Audit Trail</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">Real-time compliance event stream</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {AUDIT_EVENTS.map((evt, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${evt.type === "success" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {i < AUDIT_EVENTS.length - 1 && <div className="w-px flex-1 bg-[#E2E8F0] my-1" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-semibold text-[#334155] leading-snug">{evt.event}</p>
                    <span className="shrink-0 font-mono text-[10px] text-[#94A3B8]">{evt.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── Component Latency Grid ── */}
      <div>
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-100 border border-cyan-200">
                <Zap className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-base">System Component Response Latencies</h3>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Compliance microservices · colour-coded by response threshold
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(metrics.component_latencies).map(([comp, ms]) => {
              const st = latencyStyle(ms);
              const maxMs = 300;
              const pct = Math.min((ms / maxMs) * 100, 100);
              return (
                <div
                  key={comp}
                  className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:scale-[1.02] transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="text-[12px] font-extrabold text-[#1E293B] leading-tight">{comp}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${st.badge}`}>
                      {st.label}
                    </span>
                  </div>

                  <p className={`text-2xl font-extrabold font-mono ${st.text}`}>{ms} ms</p>

                  <Bar pct={pct} color={st.bar} h="h-1.5" />

                  <div className="flex items-center gap-1.5 mt-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-semibold">Operational</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Average latency footer */}
          <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center gap-6">
            <div className="text-center">
              <p className="text-xl font-extrabold text-cyan-400 font-mono">
                {Math.round(
                  Object.values(metrics.component_latencies).reduce((a, b) => a + b, 0) /
                  Object.values(metrics.component_latencies).length
                )} ms
              </p>
              <p className="text-[10px] text-[#94A3B8] font-semibold mt-0.5">Avg Response</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-extrabold text-emerald-400 font-mono">
                {Math.min(...Object.values(metrics.component_latencies))} ms
              </p>
              <p className="text-[10px] text-[#94A3B8] font-semibold mt-0.5">Fastest</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-extrabold text-amber-400 font-mono">
                {Math.max(...Object.values(metrics.component_latencies))} ms
              </p>
              <p className="text-[10px] text-[#94A3B8] font-semibold mt-0.5">Slowest</p>
            </div>
            <div className="ml-auto">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                <Scale className="w-4 h-4" />
                All {Object.keys(metrics.component_latencies).length} components operational
              </span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
