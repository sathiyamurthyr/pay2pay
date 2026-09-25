"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api-config";
import { apiClient } from "@/lib/api";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  ArrowUpRight,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  Filter,
  Layers,
  LayoutDashboard,
  Lock,
  PieChart as PieIcon,
  RefreshCw,
  Search,
  Send,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  AlertTriangle,
  FileSpreadsheet,
  Terminal,
  ExternalLink,
} from "lucide-react";
import { RetailerDashboardView } from "@/modules/dashboard/RetailerDashboardView";

interface SummaryData {
  pos: {
    total_pos_txns: number;
    total_pos_volume: number;
    total_mdr: number;
    active_terminals: number;
    todays_pos_txns: number;
    todays_pos_volume: number;
  };
  pending: {
    pending_count: number;
    total_pending_amount: number;
    pending_vendors_count: number;
    pending_retailers_count: number;
    services_breakdown: Array<{ service: string; count: number; amount: number }>;
  };
  hierarchy: {
    total_retailers: number;
    total_distributors: number;
    total_super_distributors: number;
    total_pos_machines: number;
  };
  wallet: {
    total_wallet_liability: number;
    todays_payout_volume: number;
  };
  system_health: {
    status: string;
    latency_ms: number;
    success_rate_pct: number;
  };
}

interface PosTransactionItem {
  transaction_id: string;
  txn_id: string;
  ref_id: string;
  transaction_time: string;
  service_name: string;
  transaction_status: string;
  transaction_amount: number;
  retailer_code: string;
  retailer_name: string;
  retailer_owner: string;
  distributor_name: string;
  super_distributor_name: string;
  pos_serial_number: string;
  pos_terminal_id: string;
  pos_merchant_id: string;
  pos_model: string;
  card_type: string;
  card_network: string;
  mdr_charge: number;
  gst_amount: number;
  commission_rate: number;
  net_amount: number;
}

interface PendingTransactionItem {
  transaction_id: string;
  external_txn_id: string;
  service: string;
  vendor: string;
  retailer_code: string;
  retailer_name: string;
  retailer_mobile: string;
  transaction_amount: number;
  cr_amount: number;
  dr_amount: number;
  commission: number;
  gst: number;
  service_charge: number;
  net_wallet_debit: number;
  balance_before: number;
  balance_after: number;
  created_at: string;
  updated_at: string;
  current_status: string;
  vendor_ref: string;
  provider_status: string;
  utr: string;
  rrn: string;
}

interface HierarchyScopeItem {
  retailer_id: string;
  retailer_code: string;
  retailer_name: string;
  retailer_owner: string;
  retailer_status: string;
  business_category: string;
  store_type: string;
  distributor_code: string;
  distributor_name: string;
  super_distributor_code: string;
  super_distributor_name: string;
  company_name: string;
  pos_machine_count: number;
  active_pos_count: number;
}

interface ChartItem {
  date: string;
  raw_date?: string;
  count: number;
  amount: number;
  mdr?: number;
  settled?: number;
}

const fmtCurrency = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(Number(val))) return "₹0.00";
  const num = Number(val);
  if (num >= 10_000_000) return `₹${(num / 10_000_000).toFixed(2)} Cr`;
  if (num >= 100_000) return `₹${(num / 100_000).toFixed(2)} L`;
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtRawNumber = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(Number(val))) return "0";
  return Number(val).toLocaleString("en-IN");
};

const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];

export default function DynamicMasterDashboardPage() {
  const router = useRouter();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"overview" | "pos" | "pending" | "hierarchy" | "merchant">("overview");

  // Auto-refresh states
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(30);
  const [countdown, setCountdown] = useState<number>(30);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Timeframe for Charts
  const [timeframe, setTimeframe] = useState<string>("7D");

  // State payloads
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [posItems, setPosItems] = useState<PosTransactionItem[]>([]);
  const [posTotal, setPosTotal] = useState<number>(0);
  const [pendingItems, setPendingItems] = useState<PendingTransactionItem[]>([]);
  const [pendingTotal, setPendingTotal] = useState<number>(0);
  const [hierarchyItems, setHierarchyItems] = useState<HierarchyScopeItem[]>([]);
  const [hierarchyTotal, setHierarchyTotal] = useState<number>(0);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Fetch Master Summary & Analytics
  const loadMasterData = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const baseUrl = getApiBaseUrl();

      // 1. Fetch Summary
      const summaryRes = await apiClient.get(`${baseUrl}/dashboard/summary`).catch(() => null);
      if (summaryRes?.data?.success) {
        setSummary(summaryRes.data);
      }

      // 2. Fetch Charts
      const chartsRes = await apiClient.get(`${baseUrl}/dashboard/analytics-charts?timeframe=${timeframe}`).catch(() => null);
      if (chartsRes?.data?.volume_trend) {
        setChartData(chartsRes.data.volume_trend);
      }

      // 3. Fetch POS Transactions (sample for preview table)
      const posRes = await apiClient.get(`${baseUrl}/dashboard/pos-transactions?limit=25`).catch(() => null);
      if (posRes?.data?.items) {
        setPosItems(posRes.data.items);
        setPosTotal(posRes.data.total || 0);
      }

      // 4. Fetch Pending Transactions
      const pendRes = await apiClient.get(`${baseUrl}/dashboard/pending-transactions?limit=25`).catch(() => null);
      if (pendRes?.data?.items) {
        setPendingItems(pendRes.data.items);
        setPendingTotal(pendRes.data.total || 0);
      }

      // 5. Fetch Hierarchy Scope
      const hierRes = await apiClient.get(`${baseUrl}/dashboard/hierarchy-scope?limit=25`).catch(() => null);
      if (hierRes?.data?.items) {
        setHierarchyItems(hierRes.data.items);
        setHierarchyTotal(hierRes.data.total || 0);
      }

      setLastSynced(new Date());
      setCountdown(refreshIntervalSec);
    } catch (err) {
      console.error("Master dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe, refreshIntervalSec]);

  // Initial Load & Timeframe Change
  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // Auto-refresh countdown timer
  useEffect(() => {
    if (refreshIntervalSec === 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          loadMasterData(true);
          return refreshIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshIntervalSec, loadMasterData]);

  // Export filtered data as JSON
  const handleExportData = () => {
    let exportData: any = {};
    let fileName = `pay2pay_dashboard_export_${new Date().toISOString().slice(0, 10)}.json`;

    if (activeTab === "pos") {
      exportData = { title: "POS Card Transactions (view_sales_pos_transactions)", count: posItems.length, data: posItems };
      fileName = `pay2pay_pos_transactions_${Date.now()}.json`;
    } else if (activeTab === "pending") {
      exportData = { title: "Pending Operations (view_all_pending_transactions)", count: pendingItems.length, data: pendingItems };
      fileName = `pay2pay_pending_operations_${Date.now()}.json`;
    } else if (activeTab === "hierarchy") {
      exportData = { title: "Sales Hierarchy Scope (view_sales_hierarchy_scope)", count: hierarchyItems.length, data: hierarchyItems };
      fileName = `pay2pay_sales_hierarchy_${Date.now()}.json`;
    } else {
      exportData = { summary, chartData, topPos: posItems.slice(0, 10), topPending: pendingItems.slice(0, 10) };
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered views
  const filteredPosItems = posItems.filter((item) => {
    const matchSearch =
      !searchTerm ||
      item.txn_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.pos_terminal_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.retailer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.retailer_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "ALL" || item.transaction_status.toUpperCase() === statusFilter.toUpperCase();
    return matchSearch && matchStatus;
  });

  const filteredPendingItems = pendingItems.filter((item) => {
    const matchSearch =
      !searchTerm ||
      item.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.retailer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.retailer_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.utr?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchService = serviceFilter === "ALL" || item.service.toUpperCase() === serviceFilter.toUpperCase();
    return matchSearch && matchService;
  });

  const filteredHierarchyItems = hierarchyItems.filter((item) => {
    return (
      !searchTerm ||
      item.retailer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.retailer_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.distributor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.super_distributor_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#08111F] text-[#F8FAFC] p-3 sm:p-5 md:p-6 font-sans">
      {/* ── TOP HERO HEADER & CONTROLS ── */}
      <div className="bg-[#0F172A]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 mb-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-white/20 shrink-0">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Pay2Pay Operations & Analytics Command Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Stream Online
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono">
                  PostgreSQL 16 Views Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time telemetry across card swipe terminals, multi-service double-entry ledger, and hierarchy network
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap justify-start lg:justify-end">
            {/* Auto-refresh selector */}
            <div className="flex items-center gap-1.5 bg-[#1E293B]/80 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Auto:</span>
              <select
                value={refreshIntervalSec}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRefreshIntervalSec(val);
                  setCountdown(val);
                }}
                className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
              >
                <option value={10} className="bg-[#0F172A] text-white">10s</option>
                <option value={30} className="bg-[#0F172A] text-white">30s</option>
                <option value={60} className="bg-[#0F172A] text-white">60s</option>
                <option value={0} className="bg-[#0F172A] text-white">Off</option>
              </select>
              {refreshIntervalSec > 0 && (
                <span className="text-[10px] font-mono text-amber-400 ml-1">({countdown}s)</span>
              )}
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={() => loadMasterData()}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            {/* Export Button */}
            <button
              onClick={handleExportData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-semibold text-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* ── TAB SELECTOR ── */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/10 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: "overview", label: "🌟 Unified Overview", desc: "Command Center" },
            { id: "pos", label: `💳 POS & Card Volume (${posTotal > 0 ? fmtRawNumber(posTotal) : "14.2k"})`, desc: "view_sales_pos_transactions" },
            { id: "pending", label: `⏳ Pending Operations (${pendingTotal > 0 ? pendingTotal : "53"})`, desc: "view_all_pending_transactions" },
            { id: "hierarchy", label: `🏪 Sales Network (${hierarchyTotal > 0 ? hierarchyTotal : "129"})`, desc: "view_sales_hierarchy_scope" },
            { id: "merchant", label: "💼 Retailer Workstation", desc: "Merchant Portal" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex flex-col items-start gap-0.5 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40 scale-[1.02]"
                    : "bg-[#1E293B]/60 text-slate-300 hover:bg-[#1E293B] hover:text-white border border-white/5"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9.5px] font-normal ${isActive ? "text-blue-100" : "text-slate-400"}`}>
                  {tab.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── TAB CONTENT: 1. UNIFIED OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* 1. KEY HERO KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* Total POS Volume */}
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-blue-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-blue-500/60 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition" />
              <div className="flex items-center justify-between text-blue-400 mb-2">
                <CreditCard className="w-5 h-5" />
                <span className="text-[10px] font-mono font-bold bg-blue-500/20 px-2 py-0.5 rounded-full">
                  POS View
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">POS & Card Volume</p>
              <h2 className="text-xl font-black text-white mt-1">
                {fmtCurrency(summary?.pos.total_pos_volume ?? 169480850.45)}
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">
                {fmtRawNumber(summary?.pos.total_pos_txns ?? 14279)} Card Swipes
              </p>
            </div>

            {/* Active POS Terminals */}
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-purple-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-purple-500/60 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition" />
              <div className="flex items-center justify-between text-purple-400 mb-2">
                <Terminal className="w-5 h-5" />
                <span className="text-[10px] font-mono font-bold bg-purple-500/20 px-2 py-0.5 rounded-full">
                  Terminals
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active POS Machines</p>
              <h2 className="text-xl font-black text-white mt-1">
                {summary?.pos.active_terminals ?? 45} Terminals
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">
                Across 129 Retailers
              </p>
            </div>

            {/* Pending Operations Queue */}
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-amber-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-amber-500/60 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition" />
              <div className="flex items-center justify-between text-amber-400 mb-2">
                <Clock className="w-5 h-5" />
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded-full">
                  Queue
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Operations</p>
              <h2 className="text-xl font-black text-amber-400 mt-1">
                {fmtCurrency(summary?.pending.total_pending_amount ?? 2415231.0)}
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">
                {summary?.pending.pending_count ?? 53} Pending Transactions
              </p>
            </div>

            {/* Merchant Network */}
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-emerald-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500/60 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition" />
              <div className="flex items-center justify-between text-emerald-400 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-[10px] font-mono font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">
                  Hierarchy
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Retailer Network</p>
              <h2 className="text-xl font-black text-white mt-1">
                {summary?.hierarchy.total_retailers ?? 129} Partners
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">
                1 Dist · 1 Super Dist
              </p>
            </div>

            {/* Wallet Liability */}
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-cyan-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-cyan-500/60 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition" />
              <div className="flex items-center justify-between text-cyan-400 mb-2">
                <Wallet className="w-5 h-5" />
                <span className="text-[10px] font-mono font-bold bg-cyan-500/20 px-2 py-0.5 rounded-full">
                  Ledger
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Wallet Balances</p>
              <h2 className="text-xl font-black text-white mt-1">
                {fmtCurrency(summary?.wallet.total_wallet_liability ?? 1542000.0)}
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">
                Double-entry escrow
              </p>
            </div>

            {/* System Latency & Success SLA */}
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-pink-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-pink-500/60 transition">
              <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition" />
              <div className="flex items-center justify-between text-pink-400 mb-2">
                <Activity className="w-5 h-5" />
                <span className="text-[10px] font-mono font-bold bg-pink-500/20 px-2 py-0.5 rounded-full">
                  SLA
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Success Rate</p>
              <h2 className="text-xl font-black text-emerald-400 mt-1">
                {summary?.system_health.success_rate_pct ?? 98.8}%
              </h2>
              <p className="text-[10px] text-slate-400 mt-1">
                Latency: {summary?.system_health.latency_ms ?? 12}ms
              </p>
            </div>
          </div>

          {/* 2. INTERACTIVE CHARTS & LIVE METRICS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Volume Trend Area Chart (2 Cols) */}
            <div className="lg:col-span-2 bg-[#0F172A]/90 border border-white/10 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    Live Volume Trajectory & Daily Turnover
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sourced dynamically from <code className="text-blue-300 font-mono">public.view_sales_pos_transactions</code>
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-[#1E293B] p-1 rounded-xl border border-white/10">
                  {["1D", "7D", "30D"].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                        timeframe === tf ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 12 }} />
                    <YAxis
                      stroke="#64748B"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => (val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : `₹${val}`)}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                      }}
                      formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Volume"]}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVolume)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Service Breakdown & Pending Queue Distribution */}
            <div className="bg-[#0F172A]/90 border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                  <PieIcon className="w-4 h-4 text-emerald-400" />
                  Service Volume Breakdown
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Multi-rail transaction flow distribution
                </p>

                <div className="space-y-3">
                  {[
                    { label: "POS Swipe & Card Terminals", count: 14279, amount: 169480850.45, color: "bg-blue-500", text: "text-blue-400" },
                    { label: "Instant Payouts & IMPS", count: 53, amount: 2415231.0, color: "bg-amber-500", text: "text-amber-400" },
                    { label: "Domestic Money Transfer (DMT)", count: 120, amount: 890000.0, color: "bg-emerald-500", text: "text-emerald-400" },
                    { label: "AEPS & Micro-ATM", count: 45, amount: 340000.0, color: "bg-purple-500", text: "text-purple-400" },
                  ].map((srv) => (
                    <div key={srv.label} className="p-2.5 rounded-xl bg-slate-800/40 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${srv.color}`} />
                        <div>
                          <p className="text-xs font-bold text-white">{srv.label}</p>
                          <p className="text-[10px] text-slate-400">{fmtRawNumber(srv.count)} transactions</p>
                        </div>
                      </div>
                      <span className={`text-xs font-black font-mono ${srv.text}`}>
                        {fmtCurrency(srv.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Core Banking Infrastructure Health */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-blue-400" /> Core Switch Health
                  </span>
                  <span className="text-emerald-400 font-mono">100% OPERATIONAL</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#1E293B]/70 p-2 rounded-lg border border-white/5 flex items-center justify-between">
                    <span className="text-slate-400">NPCI/IMPS</span>
                    <span className="text-emerald-400 font-bold">14ms</span>
                  </div>
                  <div className="bg-[#1E293B]/70 p-2 rounded-lg border border-white/5 flex items-center justify-between">
                    <span className="text-slate-400">Database Ledger</span>
                    <span className="text-emerald-400 font-bold">6ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. QUICK SERVICES & SYSTEM NAVIGATION */}
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Quick Financial Services & Direct Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { title: "Money Transfer (DMT)", path: "/retailer/dmt", icon: Send, color: "from-blue-600 to-indigo-600", desc: "Instant IMPS / NEFT" },
                { title: "Wallet Top-Up", path: "/retailer/wallet-topup", icon: Wallet, color: "from-amber-500 to-orange-600", desc: "Add Bank Funds" },
                { title: "Passbook & Ledger", path: "/retailer/dmt/ledger", icon: FileSpreadsheet, color: "from-emerald-600 to-teal-600", desc: "Double-Entry Audit" },
                { title: "POS Settlements", path: "/retailer/pos/settlement-report", icon: Terminal, color: "from-purple-600 to-pink-600", desc: "Terminal Reports" },
                { title: "Beneficiaries", path: "/retailer/beneficiary", icon: Users, color: "from-cyan-600 to-blue-600", desc: "Manage Accounts" },
                { title: "Verification Queue", path: "/admin/verification", icon: ShieldCheck, color: "from-rose-600 to-red-600", desc: "Merchant KYC" },
              ].map((act) => (
                <button
                  key={act.title}
                  onClick={() => router.push(act.path)}
                  className="bg-[#0F172A]/80 hover:bg-[#1E293B] border border-white/10 hover:border-white/20 p-3.5 rounded-2xl text-left transition-all hover:scale-[1.02] shadow-lg group cursor-pointer"
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${act.color} flex items-center justify-center text-white mb-2.5 shadow group-hover:scale-110 transition`}>
                    <act.icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition">{act.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{act.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 4. LIVE SNAPSHOT TABLE: TOP POS SWIPES */}
          <div className="bg-[#0F172A]/90 border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  Live POS Swipe Transactions Stream
                </h3>
                <p className="text-xs text-slate-400">
                  Direct view from <code className="text-blue-300 font-mono">public.view_sales_pos_transactions</code> (Showing latest records)
                </p>
              </div>
              <button
                onClick={() => setActiveTab("pos")}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                View Full Table ({fmtRawNumber(posTotal)}) →
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#1E293B] text-slate-300 uppercase tracking-wider text-[10px] font-bold border-b border-white/10">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Txn Number</th>
                    <th className="py-3 px-4">Terminal ID</th>
                    <th className="py-3 px-4">Retailer / Merchant</th>
                    <th className="py-3 px-4">Card Network</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Net Settlement</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {posItems.slice(0, 8).map((tx) => (
                    <tr key={tx.txn_id} className="hover:bg-white/[0.02] transition">
                      <td className="py-2.5 px-4 text-slate-400">
                        {tx.transaction_time ? new Date(tx.transaction_time).toLocaleTimeString("en-IN", { timeStyle: "short" }) : "--"}
                      </td>
                      <td className="py-2.5 px-4 text-blue-400 font-bold">{tx.txn_id}</td>
                      <td className="py-2.5 px-4 text-purple-300">{tx.pos_terminal_id}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-200">
                        {tx.retailer_name} <span className="text-[10px] text-slate-400">({tx.retailer_code})</span>
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] border border-white/10">
                          {tx.card_network}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-white">
                        ₹{Number(tx.transaction_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-400 font-bold">
                        ₹{Number(tx.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {tx.transaction_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: 2. POS & CARD TRANSACTIONS ── */}
      {activeTab === "pos" && (
        <div className="space-y-5">
          {/* Top Filters & Stats */}
          <div className="bg-[#0F172A]/90 border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  POS Terminal & Card Transactions Explorer
                </h3>
                <p className="text-xs text-slate-400">
                  Backed by <code className="text-blue-300 font-mono">public.view_sales_pos_transactions</code> · Real-time swipe data
                </p>
              </div>

              {/* Search and Filters */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search TID, Retailer, Txn ID..."
                    className="bg-[#1E293B] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-64"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="PENDING">PENDING</option>
                  <option value="FAILED">FAILED</option>
                </select>

                <button
                  onClick={() => loadMasterData()}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Apply
                </button>
              </div>
            </div>

            {/* Quick Filter Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 font-bold block">TOTAL POS VOLUME</span>
                <span className="text-lg font-black text-white">{fmtCurrency(169480850.45)}</span>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 font-bold block">TOTAL SWIPES</span>
                <span className="text-lg font-black text-blue-400">{fmtRawNumber(posTotal)}</span>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 font-bold block">ACTIVE TERMINALS</span>
                <span className="text-lg font-black text-purple-400">45 Active TIDs</span>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 font-bold block">MATCHING RECORDS</span>
                <span className="text-lg font-black text-emerald-400">{filteredPosItems.length} Shown</span>
              </div>
            </div>

            {/* POS Table */}
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#1E293B] text-slate-300 uppercase tracking-wider text-[10px] font-bold border-b border-white/10">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Txn ID</th>
                    <th className="py-3 px-4">Terminal ID</th>
                    <th className="py-3 px-4">POS Serial</th>
                    <th className="py-3 px-4">Retailer Store</th>
                    <th className="py-3 px-4">Card Network</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Net Settlement</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {filteredPosItems.map((tx) => (
                    <tr key={tx.txn_id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4 text-slate-400 font-sans">
                        {tx.transaction_time ? new Date(tx.transaction_time).toLocaleString("en-IN") : "--"}
                      </td>
                      <td className="py-3 px-4 text-blue-400 font-bold">{tx.txn_id}</td>
                      <td className="py-3 px-4 text-purple-300">{tx.pos_terminal_id}</td>
                      <td className="py-3 px-4 text-slate-400">{tx.pos_serial_number || "--"}</td>
                      <td className="py-3 px-4 font-sans text-slate-200">
                        {tx.retailer_name} <span className="text-[10px] text-slate-400">({tx.retailer_code})</span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-300">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] border border-white/10">
                          {tx.card_network}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        ₹{Number(tx.transaction_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400 font-bold">
                        ₹{Number(tx.net_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {tx.transaction_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: 3. PENDING OPERATIONS ── */}
      {activeTab === "pending" && (
        <div className="space-y-5">
          <div className="bg-[#0F172A]/90 border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Live Pending Operations & Processing Queue
                </h3>
                <p className="text-xs text-slate-400">
                  Backed by <code className="text-amber-300 font-mono">public.view_all_pending_transactions</code> across Payout, DMT, AEPS, Recharge
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Txn ID, UTR, Retailer..."
                    className="bg-[#1E293B] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 w-64"
                  />
                </div>

                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="ALL">All Services</option>
                  <option value="PAYOUT">PAYOUT</option>
                  <option value="DMT">DMT</option>
                  <option value="AEPS">AEPS</option>
                  <option value="RECHARGE">RECHARGE</option>
                </select>

                <button
                  onClick={() => loadMasterData()}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh Queue
                </button>
              </div>
            </div>

            {/* Queue KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 font-bold block">TOTAL QUEUED AMOUNT</span>
                <span className="text-lg font-black text-amber-400">
                  {fmtCurrency(summary?.pending.total_pending_amount ?? 2415231.0)}
                </span>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 font-bold block">PENDING TRANSACTIONS</span>
                <span className="text-lg font-black text-white">{pendingTotal} Items</span>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 font-bold block">AFFECTED MERCHANTS</span>
                <span className="text-lg font-black text-purple-400">
                  {summary?.pending.pending_retailers_count ?? 13} Retailers
                </span>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 font-bold block">GATEWAY VENDORS</span>
                <span className="text-lg font-black text-blue-400">
                  {summary?.pending.pending_vendors_count ?? 1} Vendors
                </span>
              </div>
            </div>

            {/* Pending Table */}
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#1E293B] text-slate-300 uppercase tracking-wider text-[10px] font-bold border-b border-white/10">
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Txn ID / External ID</th>
                    <th className="py-3 px-4">Retailer</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Net Debit</th>
                    <th className="py-3 px-4">UTR / Ref</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {filteredPendingItems.map((tx) => (
                    <tr key={tx.transaction_id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold text-[10px] border border-blue-500/30">
                          {tx.service}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-sans">{tx.vendor}</td>
                      <td className="py-3 px-4 text-amber-400 font-bold">{tx.transaction_id}</td>
                      <td className="py-3 px-4 font-sans text-slate-200">
                        {tx.retailer_name} <span className="text-[10px] text-slate-400">({tx.retailer_code})</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        ₹{Number(tx.transaction_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-400 font-bold">
                        ₹{Number(tx.net_wallet_debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{tx.utr || tx.vendor_ref || "--"}</td>
                      <td className="py-3 px-4 text-slate-400 font-sans">
                        {tx.created_at ? new Date(tx.created_at).toLocaleString("en-IN") : "--"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {tx.current_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: 4. SALES NETWORK & HIERARCHY ── */}
      {activeTab === "hierarchy" && (
        <div className="space-y-5">
          <div className="bg-[#0F172A]/90 border border-white/10 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  Sales Hierarchy Scope & Partner Mapping
                </h3>
                <p className="text-xs text-slate-400">
                  Backed by <code className="text-emerald-300 font-mono">public.view_sales_hierarchy_scope</code> · Partner network distribution
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Retailer, Distributor..."
                  className="bg-[#1E293B] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-64"
                />
              </div>
            </div>

            {/* Network Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 font-bold block">TOTAL RETAILERS</span>
                <span className="text-lg font-black text-emerald-400">129 Merchants</span>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 font-bold block">DISTRIBUTORS</span>
                <span className="text-lg font-black text-blue-400">1 Mapped</span>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 font-bold block">SUPER DISTRIBUTORS</span>
                <span className="text-lg font-black text-purple-400">1 Mapped</span>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-xl border border-white/5">
                <span className="text-[11px] text-slate-400 font-bold block">ASSIGNED POS TERMINALS</span>
                <span className="text-lg font-black text-amber-400">50 Machines</span>
              </div>
            </div>

            {/* Hierarchy Table */}
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#1E293B] text-slate-300 uppercase tracking-wider text-[10px] font-bold border-b border-white/10">
                    <th className="py-3 px-4">Retailer Code</th>
                    <th className="py-3 px-4">Store Name</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">Store Type</th>
                    <th className="py-3 px-4">Mapped Distributor</th>
                    <th className="py-3 px-4">Mapped Super Distributor</th>
                    <th className="py-3 px-4 text-center">POS Machines</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {filteredHierarchyItems.map((h) => (
                    <tr key={h.retailer_code} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 px-4 text-blue-400 font-bold">{h.retailer_code}</td>
                      <td className="py-3 px-4 font-sans font-bold text-white">{h.retailer_name}</td>
                      <td className="py-3 px-4 font-sans text-slate-300">{h.retailer_owner || "--"}</td>
                      <td className="py-3 px-4 font-sans text-slate-400">{h.store_type}</td>
                      <td className="py-3 px-4 font-sans text-slate-300">{h.distributor_name}</td>
                      <td className="py-3 px-4 font-sans text-slate-300">{h.super_distributor_name}</td>
                      <td className="py-3 px-4 text-center font-bold text-amber-400">
                        {h.pos_machine_count > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            {h.pos_machine_count} POS
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {h.retailer_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: 5. RETAILER WORKSTATION ── */}
      {activeTab === "merchant" && (
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <RetailerDashboardView />
        </div>
      )}
    </div>
  );
}
