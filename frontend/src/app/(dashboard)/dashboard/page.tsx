"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import {
  Building2, Users, HardDrive, IndianRupee, Wallet, ArrowUpRight, ArrowDownRight,
  RefreshCw, Activity, AlertTriangle, Clock, CheckCircle2, TrendingUp, ShieldCheck,
  Download, Filter, FileSpreadsheet, Zap, BarChart3, Globe, Server, CreditCard, Store,
  Hash, Landmark, Layers, FileText, AlignJustify, Columns3, ChevronDown, Maximize2,
  RefreshCcw, Search, Check, SlidersHorizontal, Eye, EyeOff
} from "lucide-react";

const KPI_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  total_companies:   { label: "Companies",          icon: Building2,    color: "#6C63FF", bg: "#EDE9FE", border: "#DDD6FE" },
  active_retailers:  { label: "Active Retailers",   icon: Store,        color: "#3B82F6", bg: "#DBEAFE", border: "#93C5FD" },
  total_machines:    { label: "POS Machines",        icon: CreditCard,   color: "#0EA5E9", bg: "#E0F2FE", border: "#7DD3FC" },
  todays_settlement: { label: "Today Settlement",   icon: TrendingUp,   color: "#10B981", bg: "#D1FAE5", border: "#6EE7B7" },
  wallet_liability:  { label: "Wallet Liability",   icon: Wallet,       color: "#F59E0B", bg: "#FEF3C7", border: "#FCD34D" },
  pending_payouts:   { label: "Pending Payouts",    icon: Clock,        color: "#8B5CF6", bg: "#F3E8FF", border: "#DDD6FE" },
  todays_profit:     { label: "Today Profit",       icon: IndianRupee,  color: "#059669", bg: "#D1FAE5", border: "#6EE7B7" },
  failed_settlement: { label: "Failed Settlement",  icon: AlertTriangle,color: "#EF4444", bg: "#FEE2E2", border: "#FECACA" },
  pending_approvals: { label: "Pending Approvals",  icon: ShieldCheck,  color: "#F59E0B", bg: "#FEF3C7", border: "#FCD34D" },
};

export default function DashboardPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // DataGrid Toolbar states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [density, setDensity] = useState<"compact" | "medium" | "spacious">("medium");

  const [visibleColumns, setVisibleColumns] = useState({
    batch_id: true,
    bank: true,
    volume: true,
    gross: true,
    net: true,
    status: true,
    executed: true,
    actions: true,
  });

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close flyouts on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
        setShowExportDropdown(false);
        setShowColumnsDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["dashboard-widgets"],
    queryFn: async () => {
      const res = await apiClient.get("/dashboard/widgets");
      return res.data;
    },
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const widgetKeys = [
    "total_companies", "active_retailers", "total_machines", "todays_settlement",
    "wallet_liability", "pending_payouts", "todays_profit", "failed_settlement", "pending_approvals"
  ];

  const batches = [
    { id: "SET-20260730-001", bank: "HDFC Bank Nodal", txns: "1,245", gross: "₹14,50,000.00", net: "₹14,35,500.00", status: "SETTLED", time: "2026-07-30 11:45:00", badge: "success" },
    { id: "SET-20260730-002", bank: "ICICI Bank Nodal", txns: "890", gross: "₹9,20,000.00", net: "₹9,10,800.00", status: "CLEARING", time: "2026-07-30 12:05:12", badge: "warning" },
    { id: "SET-20260730-003", bank: "State Bank of India", txns: "2,150", gross: "₹28,40,000.00", net: "₹28,11,600.00", status: "SETTLED", time: "2026-07-30 10:15:30", badge: "success" },
    { id: "SET-20260730-004", bank: "Axis Bank Nodal", txns: "540", gross: "₹5,80,000.00", net: "₹5,74,200.00", status: "FAILED", time: "2026-07-30 09:30:00", badge: "error" },
  ];

  const filteredBatches = batches.filter((b) => {
    const q = search.toLowerCase().trim();
    const matchQ = !q || b.id.toLowerCase().includes(q) || b.bank.toLowerCase().includes(q);
    const matchS = statusFilter === "ALL" || b.status === statusFilter;
    return matchQ && matchS;
  });

  const handleExportCSV = () => {
    if (!filteredBatches.length) return;
    const headers = ["Batch ID", "Bank Gateway", "Transactions", "Gross Settlement", "Net Liability", "Status", "Executed Time"];
    const rows = filteredBatches.map((b) => [
      `"${b.id}"`,
      `"${b.bank}"`,
      `"${b.txns}"`,
      `"${b.gross}"`,
      `"${b.net}"`,
      `"${b.status}"`,
      `"${b.time}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `live_settlement_batches_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDropdown(false);
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const cellPadding = density === "compact" ? "py-2 px-3" : density === "spacious" ? "py-4.5 px-5" : "py-3 px-4";

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="ent-page-title">Operations Command Center</h1>
          <p className="ent-caption mt-1">
            Real-time settlement, wallet liability &amp; multi-tenant telemetry monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="ent-btn ent-btn-secondary text-xs py-2 px-3 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span>{autoRefresh ? "Auto: 10s" : "Auto: Off"}</span>
          </button>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="ent-btn ent-btn-primary text-xs py-2 px-4 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Sync Now</span>
          </button>
        </div>
      </div>

      {/* ── SLA / System Banner ── */}
      <div
        className="rounded-xl px-5 py-3 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)",
          boxShadow: "0 4px 20px rgba(108,99,255,0.2)"
        }}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Production Environment — Asia South 1</p>
            <p className="text-indigo-300 text-xs mt-0.5">All systems operational · Last sync: just now</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {[
            { label: "Uptime", value: "99.99%" },
            { label: "Avg Latency", value: "48ms" },
            { label: "Active Sessions", value: "1,247" },
          ].map(({ label, value }) => (
            <div key={label} className="text-center hidden sm:block">
              <p className="text-indigo-300 text-[10px] uppercase font-semibold tracking-wider">{label}</p>
              <p className="text-white font-bold text-[15px] font-mono mt-0.5">{value}</p>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 live-pulse" />
            <span className="text-emerald-400 text-[11px] font-bold">Live</span>
          </div>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {widgetKeys.map((key) => {
          const meta = KPI_META[key];
          const item = data?.[key];
          const Icon = meta?.icon || Activity;
          const isDanger = key === "failed_settlement";
          const isWarning = key === "pending_approvals" || key === "pending_payouts";

          return (
            <div
              key={key}
              className="ent-card p-4 cursor-pointer hover:shadow-md transition-all"
              style={{ borderLeft: `3px solid ${meta?.color || "#6C63FF"}` }}
            >
              {/* Icon + Badge */}
              <div className="flex items-center justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: meta?.bg || "#EDE9FE" }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: meta?.color || "#6C63FF", width: "18px", height: "18px" }} />
                </div>
                {isDanger ? (
                  <span className="ent-badge ent-badge-error">Alert</span>
                ) : isWarning ? (
                  <span className="ent-badge ent-badge-warning">Pending</span>
                ) : (
                  <span className="ent-badge ent-badge-success">Normal</span>
                )}
              </div>

              {/* Value */}
              <div className="font-mono text-[22px] font-extrabold text-[#0F172A] tabular-nums leading-tight">
                {isLoading ? (
                  <div className="w-16 h-6 bg-[#F1F5F9] rounded animate-pulse" />
                ) : (
                  (item?.value ?? "—").toString().replace(/^\$/, "₹")
                )}
              </div>

              {/* Label */}
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mt-1.5">
                {meta?.label || item?.title || key.replace(/_/g, " ")}
              </p>
            </div>
          );
        })}
      </div>

      {/* ── DataGrid Toolbar ── */}
      <div ref={toolbarRef} className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#E2E8F0] shadow-xs">
        {/* Left Group */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search batch ID, bank gateway…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-52 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/15 transition-all"
            />
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-[#E2E8F0] mx-0.5" />

          {/* Filter button */}
          <div className="relative">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-semibold transition cursor-pointer ${
                statusFilter !== "ALL"
                  ? "bg-[#6C63FF]/10 border-[#6C63FF] text-[#6C63FF]"
                  : "bg-white border-[#E2E8F0] text-[#374151] hover:bg-[#F8FAFC]"
              }`}
              onClick={() => {
                setShowFilterDropdown(!showFilterDropdown);
                setShowExportDropdown(false);
                setShowColumnsDropdown(false);
              }}
            >
              <Filter className="w-3.5 h-3.5 text-[#6C63FF]" />
              <span>Filter</span>
              {statusFilter !== "ALL" && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#6C63FF] text-white text-[9px] font-extrabold">
                  1
                </span>
              )}
            </button>
            {/* Inline status filter flyout */}
            {showFilterDropdown && (
              <div className="absolute top-9 left-0 z-30 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-1.5 min-w-[170px]">
                <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase px-2 py-1">Filter Status</div>
                {[
                  { id: "ALL", label: "All Statuses" },
                  { id: "SETTLED", label: "Settled" },
                  { id: "CLEARING", label: "Clearing" },
                  { id: "FAILED", label: "Failed" },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setStatusFilter(s.id);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center justify-between ${
                      statusFilter === s.id
                        ? "bg-[#6C63FF]/10 text-[#6C63FF]"
                        : "text-[#374151] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span>{s.label}</span>
                    {statusFilter === s.id && <Check className="w-3.5 h-3.5 text-[#6C63FF]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Density toggle */}
          <button
            onClick={() => setDensity((d) => (d === "compact" ? "medium" : d === "medium" ? "spacious" : "compact"))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer"
            title="Toggle Row Density"
          >
            <AlignJustify className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span className="capitalize">{density}</span>
          </button>

          {/* Columns Visibility Toggle Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowColumnsDropdown(!showColumnsDropdown);
                setShowFilterDropdown(false);
                setShowExportDropdown(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer"
            >
              <Columns3 className="w-3.5 h-3.5 text-[#6C63FF]" />
              <span>Columns</span>
            </button>

            {showColumnsDropdown && (
              <div className="absolute top-9 left-0 z-30 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-2 min-w-[200px] space-y-1">
                <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase px-2 py-1 border-b border-[#F1F5F9] mb-1">
                  Toggle Columns
                </div>
                {[
                  { key: "batch_id", label: "Batch ID" },
                  { key: "bank", label: "Bank Gateway" },
                  { key: "volume", label: "Volume" },
                  { key: "gross", label: "Gross Settlement" },
                  { key: "net", label: "Net Liability" },
                  { key: "status", label: "Status" },
                  { key: "executed", label: "Executed" },
                  { key: "actions", label: "Actions" },
                ].map((col) => {
                  const isVisible = visibleColumns[col.key as keyof typeof visibleColumns];
                  return (
                    <button
                      key={col.key}
                      onClick={() => toggleColumn(col.key as keyof typeof visibleColumns)}
                      className="w-full text-left px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center justify-between text-[#374151] hover:bg-[#F8FAFC]"
                    >
                      <span className="flex items-center gap-2">
                        {isVisible ? (
                          <Eye className="w-3.5 h-3.5 text-[#6C63FF]" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-[#94A3B8]" />
                        )}
                        <span>{col.label}</span>
                      </span>
                      {isVisible && <Check className="w-3 h-3 text-[#6C63FF]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => {
                setShowExportDropdown(!showExportDropdown);
                setShowFilterDropdown(false);
                setShowColumnsDropdown(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#6C63FF]" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
            </button>
            {showExportDropdown && (
              <div className="absolute top-9 left-0 z-30 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-1.5 min-w-[150px]">
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-[#374151] hover:bg-[#F8FAFC] rounded-lg transition cursor-pointer flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-[#16A34A]" /> Export as CSV
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-[#E2E8F0] mx-0.5" />

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#6C63FF] transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin text-[#6C63FF]" : ""}`} />
          </button>

          {/* Expand / Fullscreen */}
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.();
              } else {
                document.exitFullscreen?.();
              }
            }}
            className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition cursor-pointer"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Group: record count */}
        <span className="text-[12px] font-semibold text-[#64748B] whitespace-nowrap shrink-0">
          {filteredBatches.length} batch{filteredBatches.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* ── Live Settlement Batches Table ── */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-[#F8FAFC] to-[#EEF2FF]">
          <div>
            <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
              <span className="inline-flex w-7 h-7 rounded-lg items-center justify-center bg-[#EDE9FE]">
                <TrendingUp className="w-3.5 h-3.5 text-[#6C63FF]" />
              </span>
              Live Settlement Batches &amp; Clearing Queue
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5 font-medium">Real-time settlement processing for connected bank gateways</p>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#F8FAFC] to-[#EEF2FF] border-b-2 border-[#E2E8F0]">
                {visibleColumns.batch_id && (
                  <th className={`${cellPadding} text-left whitespace-nowrap`}>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                        <Hash className="w-3.5 h-3.5 text-[#2563EB]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Batch ID</span>
                    </div>
                  </th>
                )}
                {visibleColumns.bank && (
                  <th className={`${cellPadding} text-left whitespace-nowrap`}>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#F5F3FF] border border-[#DDD6FE]">
                        <Landmark className="w-3.5 h-3.5 text-[#7C3AED]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Bank Gateway</span>
                    </div>
                  </th>
                )}
                {visibleColumns.volume && (
                  <th className={`${cellPadding} text-left whitespace-nowrap`}>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                        <Layers className="w-3.5 h-3.5 text-[#16A34A]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Volume</span>
                    </div>
                  </th>
                )}
                {visibleColumns.gross && (
                  <th className={`${cellPadding} text-left whitespace-nowrap`}>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#FFFBEB] border border-[#FDE68A]">
                        <IndianRupee className="w-3.5 h-3.5 text-[#D97706]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Gross Settlement</span>
                    </div>
                  </th>
                )}
                {visibleColumns.net && (
                  <th className={`${cellPadding} text-left whitespace-nowrap`}>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE]">
                        <Wallet className="w-3.5 h-3.5 text-[#2563EB]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Net Liability</span>
                    </div>
                  </th>
                )}
                {visibleColumns.status && (
                  <th className={`${cellPadding} text-left whitespace-nowrap`}>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#FDF4FF] border border-[#E9D5FF]">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#9333EA]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Status</span>
                    </div>
                  </th>
                )}
                {visibleColumns.executed && (
                  <th className={`${cellPadding} text-left whitespace-nowrap`}>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5]">
                        <Clock className="w-3.5 h-3.5 text-[#DC2626]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Executed</span>
                    </div>
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className={`${cellPadding} text-right whitespace-nowrap`}>
                    <div className="flex items-center justify-end gap-2">
                      <div className="p-1.5 rounded-lg bg-[#F1F5F9] border border-[#CBD5E1]">
                        <FileText className="w-3.5 h-3.5 text-[#475569]" />
                      </div>
                      <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Actions</span>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredBatches.map((row) => (
                <tr key={row.id} className="hover:bg-[#FAFBFF] transition-colors">
                  {visibleColumns.batch_id && (
                    <td className={cellPadding}>
                      <span className="font-mono text-[12px] font-bold text-[#6C63FF]">{row.id}</span>
                    </td>
                  )}
                  {visibleColumns.bank && (
                    <td className={`${cellPadding} font-bold text-[#0F172A]`}>{row.bank}</td>
                  )}
                  {visibleColumns.volume && (
                    <td className={`${cellPadding} font-mono text-[12px] text-[#475569]`}>{row.txns} Txns</td>
                  )}
                  {visibleColumns.gross && (
                    <td className={`${cellPadding} font-mono text-[12px] font-extrabold text-[#0F172A]`}>{row.gross}</td>
                  )}
                  {visibleColumns.net && (
                    <td className={`${cellPadding} font-mono text-[12px] text-[#475569]`}>{row.net}</td>
                  )}
                  {visibleColumns.status && (
                    <td className={cellPadding}>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        row.status === "SETTLED" ? "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]" :
                        row.status === "CLEARING" ? "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]" :
                        "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]"
                      }`}>
                        {row.status === "SETTLED" && <CheckCircle2 className="w-3 h-3" />}
                        {row.status === "CLEARING" && <Clock className="w-3 h-3 animate-spin" />}
                        {row.status === "FAILED" && <AlertTriangle className="w-3 h-3" />}
                        {row.status}
                      </span>
                    </td>
                  )}
                  {visibleColumns.executed && (
                    <td className={`${cellPadding} font-mono text-[11px] text-[#64748B]`}>{row.time}</td>
                  )}
                  {visibleColumns.actions && (
                    <td className={`${cellPadding} text-right`}>
                      <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-extrabold text-[#374151] hover:bg-[#F8FAFC] hover:border-[#6C63FF] hover:text-[#6C63FF] transition-all cursor-pointer">
                        View Audit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
