"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  BarChart3, RefreshCw, TrendingUp, DollarSign, PieChart,
  Calendar, FileSpreadsheet, Download, Activity, Percent,
  ArrowUpRight, ArrowDownRight, Clock, Search, Filter,
  AlignJustify, Columns3, ChevronDown, Maximize2, RefreshCcw,
  Hash, Banknote, Wallet, Receipt, CreditCard,
} from "lucide-react";

/* ── Mock executive MIS data ─────────────────────────────── */
const MOCK_MIS: ExecutiveMIS = {
  total_settlement_volume: 284600000,
  todays_settlement_volume: 14820000,
  monthly_settlement_volume: 97400000,
  yearly_settlement_volume: 1184000000,
  gross_mdr_revenue: 5692000,
  net_company_revenue: 2846000,
  total_gst_collected: 1024560,
  total_tds_deducted: 455360,
  total_commission_paid: 1123000,
  payout_success_rate: 99.1,
  avg_processing_latency_sec: 0.48,
  growth_rate_percentage: 9.3,
};

const MOCK_SUMMARIES = [
  { summary_date:"2026-08-02", total_transactions:1842, gross_amount:14820000, mdr_revenue:296400, gst_collected:53352, tds_deducted:23712, net_wallet_credit:14446536, outbound_payout_volume:11200000 },
  { summary_date:"2026-08-01", total_transactions:1728, gross_amount:13760000, mdr_revenue:275200, gst_collected:49536, tds_deducted:22016, net_wallet_credit:13413248, outbound_payout_volume:10400000 },
  { summary_date:"2026-07-31", total_transactions:2110, gross_amount:18920000, mdr_revenue:378400, gst_collected:68112, tds_deducted:30272, net_wallet_credit:18443216, outbound_payout_volume:14800000 },
  { summary_date:"2026-07-30", total_transactions:1560, gross_amount:12480000, mdr_revenue:249600, gst_collected:44928, tds_deducted:19968, net_wallet_credit:12165504, outbound_payout_volume:9600000 },
  { summary_date:"2026-07-29", total_transactions:1998, gross_amount:16800000, mdr_revenue:336000, gst_collected:60480, tds_deducted:26880, net_wallet_credit:16376640, outbound_payout_volume:12900000 },
];

interface ExecutiveMIS {
  total_settlement_volume: number;
  todays_settlement_volume: number;
  monthly_settlement_volume: number;
  yearly_settlement_volume: number;
  gross_mdr_revenue: number;
  net_company_revenue: number;
  total_gst_collected: number;
  total_tds_deducted: number;
  total_commission_paid: number;
  payout_success_rate: number;
  avg_processing_latency_sec: number;
  growth_rate_percentage: number;
}

const fmt = (n: number) =>
  n >= 10_000_000 ? `₹${(n/10_000_000).toFixed(2)} Cr`
  : n >= 100_000  ? `₹${(n/100_000).toFixed(2)} L`
  : `₹${n.toLocaleString("en-IN")}`;

const COL_HEADERS = [
  { label:"Date",            icon: Calendar,      bg:"bg-[#FEF3C7] border-[#FDE68A]", ic:"text-[#D97706]" },
  { label:"Txn Count",       icon: Hash,          bg:"bg-[#EFF6FF] border-[#BFDBFE]", ic:"text-[#2563EB]" },
  { label:"Gross Volume",    icon: Banknote,      bg:"bg-[#F5F3FF] border-[#DDD6FE]", ic:"text-[#7C3AED]" },
  { label:"MDR Revenue",     icon: TrendingUp,    bg:"bg-[#DCFCE7] border-[#BBF7D0]", ic:"text-[#16A34A]" },
  { label:"GST 18%",         icon: FileSpreadsheet,bg:"bg-[#FFFBEB] border-[#FDE68A]",ic:"text-[#B45309]" },
  { label:"TDS 194O",        icon: Percent,       bg:"bg-[#FDF4FF] border-[#E9D5FF]", ic:"text-[#9333EA]" },
  { label:"Net Wallet Cr",   icon: Wallet,        bg:"bg-[#F0FDF4] border-[#BBF7D0]", ic:"text-[#059669]" },
  { label:"Outbound Payout", icon: Receipt,       bg:"bg-[#EFF6FF] border-[#BFDBFE]", ic:"text-[#2563EB]" },
];

export default function MISDashboardPage() {
  const [mis, setMis]                   = useState<ExecutiveMIS | null>(null);
  const [dailySummaries, setDailySummaries] = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [lastUpdated, setLastUpdated]   = useState(new Date());

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [misRes, dsRes] = await Promise.all([
        api.get("/api/v1/reporting/executive-summary"),
        api.get("/api/v1/reporting/daily-summaries"),
      ]);
      setMis(misRes.data || MOCK_MIS);
      setDailySummaries(dsRes.data?.length ? dsRes.data : MOCK_SUMMARIES);
    } catch {
      setMis(MOCK_MIS);
      setDailySummaries(MOCK_SUMMARIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 15000);
    return () => clearInterval(iv);
  }, []);

  const m = mis ?? MOCK_MIS;

  const kpis = [
    { label:"Total Settlement Volume",  value:fmt(m.total_settlement_volume),  icon:TrendingUp,      bg:"bg-[#EFF6FF]",border:"border-[#BFDBFE]",text:"text-[#1D4ED8]",ic:"text-[#2563EB]",  sub:"All-time",          trend:"+9.3%",   up:true  },
    { label:"Today's Volume",           value:fmt(m.todays_settlement_volume),  icon:Calendar,        bg:"bg-[#F0FDF4]",border:"border-[#BBF7D0]",text:"text-[#15803D]",ic:"text-[#16A34A]",  sub:"2026-08-02",        trend:"+7.6%",   up:true  },
    { label:"Monthly Volume",           value:fmt(m.monthly_settlement_volume), icon:BarChart3,       bg:"bg-[#F5F3FF]",border:"border-[#DDD6FE]",text:"text-[#5B21B6]",ic:"text-[#7C3AED]",  sub:"Aug 2026",          trend:"+11.2%",  up:true  },
    { label:"Gross MDR Fee Income",     value:fmt(m.gross_mdr_revenue),         icon:DollarSign,      bg:"bg-[#FEF2F2]",border:"border-[#FCA5A5]",text:"text-[#B91C1C]",ic:"text-[#DC2626]",  sub:"Platform revenue",  trend:"+5.1%",   up:true  },
    { label:"Net Platform Margin",      value:fmt(m.net_company_revenue),       icon:PieChart,        bg:"bg-[#ECFDF5]",border:"border-[#A7F3D0]",text:"text-[#047857]",ic:"text-[#059669]",  sub:"After commissions",  trend:"+4.8%",   up:true  },
    { label:"GST 18% Collected",        value:fmt(m.total_gst_collected),       icon:FileSpreadsheet, bg:"bg-[#FFFBEB]",border:"border-[#FDE68A]",text:"text-[#B45309]",ic:"text-[#D97706]",  sub:"Payable to GSTN",   trend:"On track", up:true  },
    { label:"TDS 194O Withheld",        value:fmt(m.total_tds_deducted),        icon:Percent,         bg:"bg-[#FDF4FF]",border:"border-[#E9D5FF]",text:"text-[#7E22CE]",ic:"text-[#9333EA]",  sub:"Form 26Q",          trend:"Filed",    up:true  },
    { label:"Payout Success Rate",      value:`${m.payout_success_rate}%`,      icon:Activity,        bg:"bg-[#F0FDF4]",border:"border-[#BBF7D0]",text:"text-[#15803D]",ic:"text-[#16A34A]",  sub:"Disbursement SLA",  trend:"Excellent",up:true  },
    { label:"Avg Processing Latency",   value:`${m.avg_processing_latency_sec}s`,icon:Clock,          bg:"bg-[#EFF6FF]",border:"border-[#BFDBFE]",text:"text-[#1D4ED8]",ic:"text-[#2563EB]",  sub:"Per transaction",   trend:"< 0.5s",   up:true  },
  ];

  return (
    <div className="space-y-5 pb-16">

      {/* ── Page Header ── */}
      <div className="border-b border-[#E2E8F0] pb-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#6366F1] flex items-center justify-center shadow-lg shrink-0">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Executive Reporting & MIS Platform</h1>
              <p className="text-xs font-medium text-[#64748B] mt-0.5">
                Real-time management dashboard · pre-aggregated daily summaries · financial analytics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={fetchData} disabled={refreshing} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-extrabold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
              <RefreshCcw className={`w-3.5 h-3.5 text-[#3B82F6] ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E2E8F0] bg-white text-xs font-extrabold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
              <Download className="w-3.5 h-3.5 text-[#3B82F6]" /> Export
            </button>
          </div>
        </div>

        {/* Growth badge */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-[#F0FDF4] to-[#EFF6FF] border border-[#BBF7D0]">
          <div className="p-2 rounded-xl bg-white border border-[#BBF7D0]">
            <TrendingUp className="w-4 h-4 text-[#16A34A]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-extrabold text-[#15803D]">Platform Growth Rate</span>
            <span className="text-xl font-extrabold text-[#15803D]">+{m.growth_rate_percentage}%</span>
          </div>
          <span className="text-[11px] text-[#64748B] font-medium ml-2">Month-over-month transaction volume growth</span>
          <span className="text-[10px] font-mono text-[#94A3B8] ml-auto whitespace-nowrap">Updated: {lastUpdated.toLocaleTimeString("en-IN")}</span>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon, bg, border, text, ic, sub, trend, up }) => (
          <div key={label} className={`flex flex-col gap-3 p-4 rounded-2xl border ${bg} ${border} shadow-xs hover:shadow-md transition-all hover:scale-[1.01]`}>
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-xl bg-white border ${border} shrink-0`}>
                <Icon className={`w-4 h-4 ${ic}`} />
              </div>
              <span className={`flex items-center gap-0.5 text-[10px] font-extrabold ${up ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {trend}
              </span>
            </div>
            <div>
              <p className={`text-lg font-extrabold leading-none tracking-tight ${text}`}>{value}</p>
              <p className="text-[10px] font-bold text-[#64748B] mt-1">{label}</p>
              <p className="text-[9px] font-medium text-[#94A3B8] mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Daily Summaries Table ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#3B82F6]" />
          <h2 className="text-sm font-extrabold text-[#0F172A]">Pre-Aggregated Daily Financial Summaries</h2>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center gap-1.5">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
              <Filter className="w-3.5 h-3.5 text-[#3B82F6]" /> Filter
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
              <AlignJustify className="w-3.5 h-3.5 text-[#3B82F6]" /> Medium
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
              <Columns3 className="w-3.5 h-3.5 text-[#3B82F6]" /> Columns
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer">
              <Download className="w-3.5 h-3.5 text-[#3B82F6]" /> Export <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
            </button>
            <button onClick={fetchData} className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#3B82F6] transition cursor-pointer">
              <RefreshCcw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#3B82F6]" : ""}`} />
            </button>
            <button className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition cursor-pointer">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[12px] font-semibold text-[#64748B] whitespace-nowrap shrink-0">
            {dailySummaries.length} day{dailySummaries.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-[#F8FAFC] to-[#EFF6FF] border-b-2 border-[#E2E8F0]">
                  {COL_HEADERS.map(({ label, icon: Icon, bg, ic }) => (
                    <th key={label} className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border ${bg} shrink-0`}>
                          <Icon className={`w-3 h-3 ${ic}`} />
                        </div>
                        <span className="text-[10px] font-extrabold text-[#374151] uppercase tracking-wider">{label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {loading ? (
                  <tr><td colSpan={8} className="py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-[#64748B] text-xs font-semibold">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#3B82F6]" /> Loading MIS summaries…
                    </div>
                  </td></tr>
                ) : (
                  dailySummaries.map((ds, i) => (
                    <tr key={ds.summary_date} className={`hover:bg-[#F9FAFB] transition-colors ${i % 2 === 0 ? "" : "bg-[#FAFBFF]/50"}`}>
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-extrabold text-[#D97706] text-[11px] bg-[#FFFBEB] border border-[#FDE68A] px-2 py-0.5 rounded-lg">{ds.summary_date}</span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-[#1D4ED8] text-[12px]">{ds.total_transactions.toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-mono font-extrabold text-[#0F172A] text-[12px]">{fmt(ds.gross_amount)}</td>
                      <td className="px-4 py-3.5 font-mono font-extrabold text-[#16A34A] text-[12px]">{fmt(ds.mdr_revenue)}</td>
                      <td className="px-4 py-3.5 font-mono text-[#B45309] text-[11px] font-semibold">{fmt(ds.gst_collected)}</td>
                      <td className="px-4 py-3.5 font-mono text-[#9333EA] text-[11px] font-semibold">{fmt(ds.tds_deducted)}</td>
                      <td className="px-4 py-3.5 font-mono font-extrabold text-[#059669] text-[12px]">{fmt(ds.net_wallet_credit)}</td>
                      <td className="px-4 py-3.5 font-mono text-[#2563EB] text-[11px] font-semibold">{fmt(ds.outbound_payout_volume)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {dailySummaries.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-[#F1F5F9] bg-gradient-to-r from-[#F8FAFC] to-[#EFF6FF] text-[11px] font-semibold text-[#64748B]">
              <span>
                Total Gross: <strong className="text-[#0F172A] font-mono">{fmt(dailySummaries.reduce((s, d) => s + d.gross_amount, 0))}</strong>
                <span className="mx-2">·</span>
                Total MDR: <strong className="text-[#16A34A] font-mono">{fmt(dailySummaries.reduce((s, d) => s + d.mdr_revenue, 0))}</strong>
              </span>
              <span className="font-mono text-[10px] text-[#94A3B8]">Updated: {lastUpdated.toLocaleTimeString("en-IN")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
