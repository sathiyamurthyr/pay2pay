"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  TrendingUp,
  CreditCard,
  RefreshCw,
  Clock,
  Coins,
  Receipt,
  CheckCircle2,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Wallet,
  BarChart3,
  PieChart,
  Landmark,
  Zap,
  ShieldCheck,
  Building2,
} from "lucide-react";

/* ── Mock Data ──────────────────────────────────────────────────── */
const MOCK_METRICS = {
  total_processed_volume:      94820500,
  total_settled_amount:        91240300,
  pending_settlement_volume:    3580200,
  total_mdr_earned:              948205,
  total_gst_liability:           170676,
  total_distributor_commissions: 284461,
  total_payouts_dispatched:    87200000,
  volume_by_mode: {
    "UPI":           52140000,
    "IMPS":          22480000,
    "NEFT":          12340000,
    "RTGS":           5860000,
    "Card (Debit)":   1900000,
    "Wallet":          100500,
  },
  hourly_trend: [
    { hour: "08:00", volume: 3820000 },
    { hour: "09:00", volume: 7640000 },
    { hour: "10:00", volume: 12900000 },
    { hour: "11:00", volume: 18200000 },
    { hour: "12:00", volume: 24500000 },
    { hour: "13:00", volume: 31800000 },
    { hour: "14:00", volume: 41200000 },
    { hour: "15:00", volume: 52400000 },
    { hour: "16:00", volume: 67100000 },
    { hour: "17:00", volume: 80300000 },
    { hour: "18:00", volume: 94820500 },
  ],
};

const MODE_COLORS = [
  { bar: "bg-violet-400", dot: "bg-violet-400", text: "text-violet-400" },
  { bar: "bg-blue-400",   dot: "bg-blue-400",   text: "text-blue-400"   },
  { bar: "bg-cyan-400",   dot: "bg-cyan-400",   text: "text-cyan-400"   },
  { bar: "bg-indigo-400", dot: "bg-indigo-400", text: "text-indigo-400" },
  { bar: "bg-purple-400", dot: "bg-purple-400", text: "text-purple-400" },
  { bar: "bg-fuchsia-400",dot: "bg-fuchsia-400",text: "text-fuchsia-400"},
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

/* ── Mini sparkline bar ─────────────────────────────────────────── */
function MiniBar({ pct, color, height = "h-1.5" }: { pct: number; color: string; height?: string }) {
  return (
    <div className={`w-full ${height} rounded-full bg-[#F1F5F9] overflow-hidden`}>
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

/* ── Hourly bar chart ───────────────────────────────────────────── */
function HourlyBarChart({ trend }: { trend: { hour: string; volume: number }[] }) {
  const max = Math.max(...trend.map((t) => t.volume), 1);
  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {trend.map((item, i) => {
        const pct = (item.volume / max) * 100;
        const isLast = i === trend.length - 1;
        return (
          <div key={item.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className={`w-full rounded-t-md transition-all duration-500 ${isLast ? "bg-violet-400" : "bg-violet-400/40 group-hover:bg-violet-400/70"}`}
              style={{ height: `${pct}%`, minHeight: 4 }}
            />
            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
              <div className="bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-[9px] font-mono text-[#334155] whitespace-nowrap shadow-sm">
                {item.hour}<br />{fmt(item.volume)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function SettlementDashboardPage() {
  const [metrics, setMetrics] = useState(MOCK_METRICS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchMetrics = async () => {
    try {
      setRefreshing(true);
      const res = await api.get("/api/v1/settlements/dashboard/metrics");
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
    const interval = setInterval(fetchMetrics, 15000);
    return () => clearInterval(interval);
  }, []);

  const settlementRate =
    metrics.total_processed_volume > 0
      ? Math.round((metrics.total_settled_amount / metrics.total_processed_volume) * 100)
      : 0;

  const pendingRate =
    metrics.total_processed_volume > 0
      ? Math.round((metrics.pending_settlement_volume / metrics.total_processed_volume) * 100)
      : 0;

  const kpis = [
    {
      label: "Total Gross Volume",
      value: fmt(metrics.total_processed_volume),
      sub: "All payment modes combined",
      icon: TrendingUp,
      accent: "from-blue-600/30 to-indigo-700/20",
      iconBg: "bg-blue-500/20 border-blue-400/30 text-blue-300",
      glow: "shadow-blue-500/15",
      bar: 100,
      barColor: "bg-blue-400",
      trend: "+8.4% vs yesterday",
      up: true,
    },
    {
      label: "Total Settled Amount",
      value: fmt(metrics.total_settled_amount),
      sub: `${settlementRate}% of gross volume`,
      icon: CheckCircle2,
      accent: "from-emerald-600/30 to-teal-700/20",
      iconBg: "bg-emerald-500/20 border-emerald-400/30 text-emerald-300",
      glow: "shadow-emerald-500/15",
      bar: settlementRate,
      barColor: "bg-emerald-400",
      trend: "On schedule",
      up: true,
    },
    {
      label: "Pending Settlement",
      value: fmt(metrics.pending_settlement_volume),
      sub: `${pendingRate}% in queue`,
      icon: Clock,
      accent: "from-amber-600/30 to-orange-700/20",
      iconBg: "bg-amber-500/20 border-amber-400/30 text-amber-300",
      glow: "shadow-amber-500/15",
      bar: pendingRate,
      barColor: "bg-amber-400",
      trend: "T+1 cycle",
      up: false,
    },
    {
      label: "Gross MDR Revenue",
      value: fmt(metrics.total_mdr_earned),
      sub: "Interchange & processing fees",
      icon: Coins,
      accent: "from-violet-600/30 to-purple-700/20",
      iconBg: "bg-violet-500/20 border-violet-400/30 text-violet-300",
      glow: "shadow-violet-500/15",
      bar: (metrics.total_mdr_earned / metrics.total_processed_volume) * 100 * 20,
      barColor: "bg-violet-400",
      trend: "+2.1% MDR rate",
      up: true,
    },
    {
      label: "GST Liability (18%)",
      value: fmt(metrics.total_gst_liability),
      sub: "On MDR + platform fees",
      icon: Receipt,
      accent: "from-cyan-600/30 to-blue-700/20",
      iconBg: "bg-cyan-500/20 border-cyan-400/30 text-cyan-300",
      glow: "shadow-cyan-500/15",
      bar: (metrics.total_gst_liability / metrics.total_mdr_earned) * 100,
      barColor: "bg-cyan-400",
      trend: "18% statutory",
      up: false,
    },
    {
      label: "Distributor Commissions",
      value: fmt(metrics.total_distributor_commissions),
      sub: "Payout to distribution network",
      icon: Percent,
      accent: "from-rose-600/30 to-pink-700/20",
      iconBg: "bg-rose-500/20 border-rose-400/30 text-rose-300",
      glow: "shadow-rose-500/15",
      bar: (metrics.total_distributor_commissions / metrics.total_mdr_earned) * 100,
      barColor: "bg-rose-400",
      trend: "30% of MDR",
      up: false,
    },
  ];

  const totalVol = metrics.total_processed_volume || 1;

  return (
    <div
      className="min-h-screen space-y-6 pb-16 bg-[#F8FAFC]"
    >
      {/* ── Page Header ── */}
      <div>
        <GlassCard className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {/* Orb */}
              <div className="relative w-14 h-14 shrink-0">
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-xl">
                  <Landmark className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                    Settlement Engine &amp; MDR Telemetry
                  </h1>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-400/30 text-[10px] font-extrabold text-violet-400 tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping absolute" />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 relative" />
                    LIVE
                  </span>
                </div>
                <p className="text-sm text-[#64748B]">
                  Real-time settlement batches · MDR fee splits · GST liabilities · bank payouts
                </p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5 font-mono">
                  Last updated: {lastUpdated.toLocaleTimeString("en-IN")} · Auto-refresh every 15s
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Settlement rate badge */}
              <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-400/25">
                <span className="text-lg font-extrabold text-emerald-400">{settlementRate}%</span>
                <span className="text-[10px] text-[#94A3B8] font-semibold">Settlement Rate</span>
              </div>
              <button
                onClick={fetchMetrics}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 border border-white/15 text-sm font-semibold text-[#1E293B] hover:bg-[#F8FAFC] hover:border-white/25 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 text-violet-400 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Summary strip */}
          <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-[#E2E8F0]">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-400">
              <TrendingUp className="w-4 h-4" />
              <span>Gross: {fmt(metrics.total_processed_volume)}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settled: {fmt(metrics.total_settled_amount)}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Clock className="w-4 h-4" />
              <span>Pending: {fmt(metrics.pending_settlement_volume)}</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <Coins className="w-4 h-4" />
              <span>MDR: {fmt(metrics.total_mdr_earned)}</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <GlassCard key={idx} className="p-5 hover:scale-[1.02] transition-all duration-300">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-2xl font-extrabold text-[#0F172A] mt-1 tracking-tight leading-tight">{kpi.value}</p>
                    <p className="text-[11px] text-[#94A3B8] mt-0.5 font-medium">{kpi.sub}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${kpi.iconBg} shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <MiniBar pct={kpi.bar} color={kpi.barColor} />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] font-bold text-[#94A3B8]">{Math.round(kpi.bar)}% of target</span>
                  <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${kpi.up ? "text-emerald-600" : "text-rose-600"}`}>
                    {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {kpi.trend}
                  </span>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* ── Bottom Row: Mode Breakdown + Hourly Trend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Volume by Payment Mode */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-400/30">
                <CreditCard className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-base">Volume by Payment Mode</h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">Gross volume split across channels</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#94A3B8] px-2 py-1 rounded-lg bg-[#F1F5F9] border border-white/10">
              Today
            </span>
          </div>

          <div className="space-y-3.5">
            {Object.entries(metrics.volume_by_mode).map(([mode, vol], i) => {
              const pct = Math.round((vol / totalVol) * 100);
              const mc = MODE_COLORS[i % MODE_COLORS.length];
              return (
                <div key={mode}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${mc.dot} shrink-0`} />
                      <span className="text-[12px] font-semibold text-[#334155]">{mode}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-[#94A3B8]">{fmt(vol)}</span>
                      <span className={`text-[11px] font-extrabold w-9 text-right ${mc.text}`}>{pct}%</span>
                    </div>
                  </div>
                  <MiniBar pct={pct} color={mc.bar} height="h-2" />
                </div>
              );
            })}
          </div>

          {/* Payout dispatched footer */}
          <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#64748B] font-semibold">
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>Bank Payouts Dispatched</span>
            </div>
            <span className="font-mono font-extrabold text-emerald-400 text-sm">{fmt(metrics.total_payouts_dispatched)}</span>
          </div>
        </GlassCard>

        {/* Hourly Cumulative Trend */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-400/30">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-base">Hourly Cumulative Settlement Trend</h3>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">Intraday volume accumulation — hover bars for detail</p>
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="mb-3">
            <HourlyBarChart trend={metrics.hourly_trend} />
          </div>

          {/* Hour labels */}
          <div className="flex justify-between px-0.5">
            {metrics.hourly_trend.map((item, i) => (
              (i === 0 || i === Math.floor(metrics.hourly_trend.length / 2) || i === metrics.hourly_trend.length - 1) ? (
                <span key={item.hour} className="text-[9px] font-mono text-[#94A3B8]">{item.hour}</span>
              ) : null
            ))}
          </div>

          {/* Trend summary */}
          <div className="mt-5 pt-4 border-t border-[#E2E8F0] grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-lg font-extrabold text-blue-400">{fmt(metrics.hourly_trend[0]?.volume ?? 0)}</p>
              <p className="text-[9px] text-[#94A3B8] font-semibold mt-0.5">08:00 Opening</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-violet-400">
                {fmt(metrics.hourly_trend[Math.floor(metrics.hourly_trend.length / 2)]?.volume ?? 0)}
              </p>
              <p className="text-[9px] text-[#94A3B8] font-semibold mt-0.5">Mid-day Peak</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-emerald-400">
                {fmt(metrics.hourly_trend[metrics.hourly_trend.length - 1]?.volume ?? 0)}
              </p>
              <p className="text-[9px] text-[#94A3B8] font-semibold mt-0.5">18:00 Close</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── Fee Split Analysis Row ── */}
      <div>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30">
              <PieChart className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#0F172A] text-base">MDR Fee Split Analysis</h3>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">Gross MDR → GST deduction → Distributor commission → Net platform retention</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Gross MDR",
                value: fmt(metrics.total_mdr_earned),
                pct: 100,
                color: "bg-violet-400",
                textColor: "text-violet-400",
                bg: "bg-violet-500/10 border-violet-400/20",
                icon: Coins,
              },
              {
                label: "GST (18%)",
                value: fmt(metrics.total_gst_liability),
                pct: Math.round((metrics.total_gst_liability / metrics.total_mdr_earned) * 100),
                color: "bg-cyan-400",
                textColor: "text-cyan-400",
                bg: "bg-cyan-500/10 border-cyan-400/20",
                icon: Receipt,
              },
              {
                label: "Dist. Commission",
                value: fmt(metrics.total_distributor_commissions),
                pct: Math.round((metrics.total_distributor_commissions / metrics.total_mdr_earned) * 100),
                color: "bg-rose-400",
                textColor: "text-rose-400",
                bg: "bg-rose-500/10 border-rose-400/20",
                icon: Building2,
              },
              {
                label: "Net Platform Retain",
                value: fmt(
                  Math.max(0, metrics.total_mdr_earned - metrics.total_gst_liability - metrics.total_distributor_commissions)
                ),
                pct: Math.max(0, Math.round(
                  ((metrics.total_mdr_earned - metrics.total_gst_liability - metrics.total_distributor_commissions) /
                    metrics.total_mdr_earned) * 100
                )),
                color: "bg-emerald-400",
                textColor: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-400/20",
                icon: Wallet,
              },
            ].map(({ label, value, pct, color, textColor, bg, icon: Icon }) => (
              <div key={label} className={`p-4 rounded-xl border ${bg} flex flex-col gap-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-[#64748B] uppercase tracking-wider">{label}</span>
                  <Icon className={`w-3.5 h-3.5 ${textColor}`} />
                </div>
                <p className={`text-xl font-extrabold ${textColor} leading-tight`}>{value}</p>
                <div>
                  <MiniBar pct={pct} color={color} height="h-1.5" />
                  <span className="text-[10px] font-bold text-[#94A3B8] mt-1 block">{pct}% of MDR</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
