"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { getApiBaseUrl } from "@/lib/api-config";
import {
  Calendar, Search, Filter, SlidersHorizontal, Download, RefreshCw, Clock,
  Maximize2, Minimize2, Columns, ChevronDown, Check, X, FileText, FileSpreadsheet,
  FileCode, Printer, Share2, Mail, ExternalLink, Eye, Copy, ArrowUpDown,
  CheckCircle2, AlertTriangle, Receipt, Landmark, ChevronLeft, ChevronRight,
  TrendingUp, ArrowUpRight, ArrowDownLeft, ShieldCheck, HelpCircle, AlignJustify,
  Rows, List
} from "lucide-react";
import { PayoutTransactionDetailDrawer, PayoutTransactionDetail } from "@/components/reports/PayoutTransactionDetailDrawer";

interface SummaryData {
  total_transactions: number;
  total_payout_amount: number;
  total_charges: number;
  total_gst: number;
  total_commission: number;
  successful_count: number;
  successful_amount: number;
  pending_count: number;
  pending_amount: number;
  failed_count: number;
  failed_amount: number;
  date_range?: { from: string; to: string };
}

interface PayoutReportRow {
  s_no?: number;
  id: string;
  transaction_id: string;
  payout_id: string;
  transaction_date: string;
  transaction_time: string;
  tenant_id: string;
  company_id: string;
  service: string;
  amount: number;
  charges: number;
  gst: number;
  tax: number;
  commission: number;
  net_amount: number;
  payout_amount: number;
  bene_name: string;
  account_number: string;
  account_masked: string;
  bank_name: string;
  ifsc: string;
  utr: string;
  payment_mode: string;
  status: string;
  settlement_status: string;
  retailer_name: string;
  retailer_code: string;
  created_at: string;
  updated_at: string;
  audit?: {
    created_by?: string;
    vendor_name?: string;
    mode?: string;
    gateway_ref?: string;
    bank_ref?: string;
    created_at?: string;
  };
}

type DatePreset = "today" | "yesterday" | "7d" | "30d" | "60d" | "90d" | "all" | "custom";
type Density = "compact" | "medium" | "comfortable";

const DENSITY_CONFIG: Record<Density, { label: string; icon: any; py: string; text: string }> = {
  compact: { label: "Compact", icon: AlignJustify, py: "py-1.5 px-3", text: "text-[11.5px]" },
  medium: { label: "Medium", icon: Rows, py: "py-2.5 px-3", text: "text-[12px]" },
  comfortable: { label: "Comfortable", icon: List, py: "py-3.5 px-3", text: "text-[13px]" },
};

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PayoutTransactionsReportPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [rows, setRows] = useState<PayoutReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Date Preset & Range
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [fromDate, setFromDate] = useState<string>(() => formatLocalDate(new Date()));
  const [toDate, setToDate] = useState<string>(() => formatLocalDate(new Date()));

  // Filters & Search
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [modeFilter, setModeFilter] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);

  // Pagination & Sorting
  const [page, setPage] = useState<number>(0);
  const [limit, setLimit] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [sortField, setSortField] = useState<string>("created_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection & Density
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [density, setDensity] = useState<Density>("medium");
  const [showDensity, setShowDensity] = useState<boolean>(false);
  const [showColumnChooser, setShowColumnChooser] = useState<boolean>(false);
  const [showExport, setShowExport] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Column Visibility
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  // Detail Drawer
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [drawerData, setDrawerData] = useState<PayoutTransactionDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const tableColumns = [
    { id: "s_no", label: "S.No" },
    { id: "transaction_id", label: "Txn ID & Ref ID" },
    { id: "amount", label: "Amount" },
    { id: "tax", label: "Tax & Charges" },
    { id: "net_amount", label: "Net Amount" },
    { id: "bene_name", label: "Bene Name" },
    { id: "account", label: "Account & Bank" },
    { id: "utr", label: "UTR" },
    { id: "status", label: "Status" },
    { id: "retailer", label: "Retailer Name" },
    { id: "audit", label: "Audit" },
    { id: "action", label: "Action" },
  ];

  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (preset === "today") {
      // today
    } else if (preset === "yesterday") {
      start.setDate(now.getDate() - 1);
      end.setDate(now.getDate() - 1);
    } else if (preset === "7d") {
      start.setDate(now.getDate() - 6);
    } else if (preset === "30d") {
      start.setDate(now.getDate() - 29);
    } else if (preset === "60d") {
      start.setDate(now.getDate() - 59);
    } else if (preset === "90d") {
      start.setDate(now.getDate() - 89);
    } else if (preset === "all") {
      start = new Date(2020, 0, 1);
    }

    setFromDate(formatLocalDate(start));
    setToDate(formatLocalDate(end));
    setPage(0);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeFiltersCount = [
    statusFilter,
    modeFilter,
    minAmount,
    maxAmount
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setStatusFilter("");
    setModeFilter("");
    setMinAmount("");
    setMaxAmount("");
    setSearch("");
    setPage(0);
  };

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", (page + 1).toString());
      params.append("limit", limit.toString());
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
      if (modeFilter && modeFilter !== "ALL") params.append("payment_mode", modeFilter);
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);
      if (minAmount) params.append("min_amount", minAmount);
      if (maxAmount) params.append("max_amount", maxAmount);

      const [sumRes, listRes] = await Promise.all([
        axios.get(`${getApiBaseUrl()}/admin/reports/payout-transactions/summary?${params.toString()}`),
        axios.get(`${getApiBaseUrl()}/admin/reports/payout-transactions?${params.toString()}`)
      ]);

      if (sumRes.data?.data) {
        setSummary(sumRes.data.data);
      }
      if (listRes.data?.data) {
        setRows(listRes.data.data.items || []);
        setTotalPages(listRes.data.data.pagination?.total_pages || 1);
        setTotalRecords(listRes.data.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to load payout transactions report", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, modeFilter, fromDate, toDate, minAmount, maxAmount]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchReportData();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchReportData]);

  const handleExport = async (format: "csv" | "excel" | "json" | "print") => {
    if (format === "print") {
      window.print();
      return;
    }

    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);
      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
      if (modeFilter && modeFilter !== "ALL") params.append("payment_mode", modeFilter);
      if (search.trim()) params.append("search", search.trim());

      const response = await axios.get(
        `${getApiBaseUrl()}/admin/reports/payout-transactions/export?${params.toString()}`,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Payout_Transaction_Report_${fromDate}_to_${toDate}.${format === "json" ? "json" : "csv"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExporting(false);
      setShowExport(false);
    }
  };

  const openRowDetails = async (txId: string) => {
    setSelectedTxId(txId);
    setDrawerLoading(true);
    try {
      const res = await axios.get(`${getApiBaseUrl()}/admin/reports/payout-transactions/${txId}/details`);
      if (res.data?.data) {
        setDrawerData(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch transaction details", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === rows.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(rows.map((r) => r.id || r.transaction_id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedKeys);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedKeys(next);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const formatCurrency = (val: number) => {
    return "₹" + Number(val || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const densityConf = DENSITY_CONFIG[density];

  return (
    <div
      ref={containerRef}
      className={`p-4 sm:p-5 lg:p-6 space-y-4 min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans ${
        isFullscreen ? "fixed inset-0 z-50 overflow-y-auto bg-white p-6" : ""
      }`}
    >
      
      {/* ─────────────────────────────────────────────────────────────
          1. DATE RANGE BAR (EXACT DESIGN MATCHING ATTACHED SCREENSHOT)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-[#475569] flex items-center gap-1.5 mr-1.5">
            <Calendar className="w-4 h-4 text-[#2563EB]" /> Date Range:
          </span>

          {([
            { key: "today", label: "Today" },
            { key: "yesterday", label: "Yesterday" },
            { key: "7d", label: "7D" },
            { key: "30d", label: "30D" },
            { key: "60d", label: "60D" },
            { key: "90d", label: "90D" },
            { key: "all", label: "All Time" },
          ] as Array<{ key: DatePreset; label: string }>).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => applyDatePreset(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                datePreset === key
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
              }`}
            >
              {label}
            </button>
          ))}

          <button
            onClick={() => setDatePreset("custom")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              datePreset === "custom"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Active Date Indicator / Custom Date Inputs */}
        {datePreset === "custom" ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              className="px-2.5 py-1 text-xs font-semibold border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none focus:border-[#2563EB]"
            />
            <span className="text-xs text-[#94A3B8]">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              className="px-2.5 py-1 text-xs font-semibold border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        ) : (
          <div className="text-xs font-semibold text-[#64748B]">
            {fromDate && toDate ? (
              fromDate === toDate ? (
                <span>Showing records for <strong className="text-[#0F172A] font-bold">{fromDate}</strong></span>
              ) : (
                <span>Showing records for <strong className="text-[#0F172A] font-bold">{fromDate}</strong> to <strong className="text-[#0F172A] font-bold">{toDate}</strong></span>
              )
            ) : (
              <span>All Historical Records</span>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. KPI SUMMARY METRIC CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] mb-1">
            <span>Total Payout Volume</span>
            <span className="p-1 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xl font-extrabold text-[#0F172A] tracking-tight">
            {summary ? formatCurrency(summary.total_payout_amount) : "₹0.00"}
          </span>
          <span className="text-[11px] text-[#64748B] block mt-0.5 font-mono font-medium">
            {summary?.total_transactions || 0} Total Transactions
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] border-l-4 border-l-[#16A34A] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] mb-1">
            <span>Successful / Settled</span>
            <span className="p-1 rounded-lg bg-[#DCFCE7] text-[#16A34A]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xl font-extrabold text-[#16A34A] tracking-tight">
            {summary ? formatCurrency(summary.successful_amount) : "₹0.00"}
          </span>
          <span className="text-[11px] text-[#166534] block mt-0.5 font-mono font-medium">
            {summary?.successful_count || 0} Settled
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] border-l-4 border-l-[#D97706] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] mb-1">
            <span>Pending / Processing</span>
            <span className="p-1 rounded-lg bg-[#FEF3C7] text-[#D97706]">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xl font-extrabold text-[#D97706] tracking-tight">
            {summary ? formatCurrency(summary.pending_amount) : "₹0.00"}
          </span>
          <span className="text-[11px] text-[#B45309] block mt-0.5 font-mono font-medium">
            {summary?.pending_count || 0} In Flight
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] border-l-4 border-l-[#DC2626] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] mb-1">
            <span>Failed / Reversed</span>
            <span className="p-1 rounded-lg bg-[#FEE2E2] text-[#DC2626]">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xl font-extrabold text-[#DC2626] tracking-tight">
            {summary ? formatCurrency(summary.failed_amount) : "₹0.00"}
          </span>
          <span className="text-[11px] text-[#991B1B] block mt-0.5 font-mono font-medium">
            {summary?.failed_count || 0} Failed / Reversed
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-[#64748B] mb-1">
            <span>Charges & Tax</span>
            <span className="p-1 rounded-lg bg-[#F1F5F9] text-[#475569]">
              <Landmark className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-xl font-extrabold text-[#0F172A] tracking-tight">
            {summary ? formatCurrency(summary.total_charges + summary.total_gst) : "₹0.00"}
          </span>
          <span className="text-[11px] text-[#64748B] block mt-0.5 font-mono font-medium">
            Fee: ₹{summary ? Number(summary.total_charges).toFixed(2) : "0.00"} | GST: ₹{summary ? Number(summary.total_gst).toFixed(2) : "0.00"}
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. MASTER TOOLBAR CONTAINER (MATCHING ATTACHED SCREENSHOT)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden shadow-2xs">
        {/* TOOLBAR HEADER ROW */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3 border-b border-[#E2E8F0] bg-white">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            
            {/* Global Search Box */}
            <div className="relative flex-1 min-w-[240px] max-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search Serial Number, Mobile, Txn ID, UTR..."
                className="w-full pl-8 pr-8 py-1.5 text-xs font-medium bg-white border border-[#D6DEE8] rounded-xl text-[#334155] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
              />
              {search && (
                <button
                  onClick={() => { setSearch(""); setPage(0); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#334155] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilterDrawer((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                activeFiltersCount > 0
                  ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"
                  : "bg-white border-[#D1D5DB] text-[#475569] hover:bg-[#F8FAFC]"
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white text-[10px] flex items-center justify-center font-extrabold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Density Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowDensity((p) => !p);
                  setShowColumnChooser(false);
                  setShowExport(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#475569] bg-white border border-[#D1D5DB] rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <densityConf.icon className="w-3.5 h-3.5" />
                <span>{densityConf.label}</span>
              </button>
              {showDensity && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 min-w-[140px]">
                  {(["compact", "medium", "comfortable"] as Density[]).map((d) => {
                    const Conf = DENSITY_CONFIG[d];
                    return (
                      <button
                        key={d}
                        onClick={() => { setDensity(d); setShowDensity(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                          density === d ? "bg-[#EFF6FF] text-[#1D4ED8]" : "text-[#475569] hover:bg-[#F1F5F9]"
                        }`}
                      >
                        <Conf.icon className="w-3.5 h-3.5" />
                        {Conf.label}
                        {density === d && <Check className="w-3.5 h-3.5 ml-auto text-[#2563EB]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Columns Chooser */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowColumnChooser((p) => !p);
                  setShowDensity(false);
                  setShowExport(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#475569] bg-white border border-[#D1D5DB] rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Columns</span>
              </button>
              {showColumnChooser && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-2 min-w-[200px] max-h-[320px] overflow-y-auto">
                  <p className="text-[11px] font-bold text-[#64748B] px-2 py-1 uppercase">Toggle Columns</p>
                  {tableColumns.map((col) => {
                    const isChecked = !hiddenColumns.has(col.id);
                    return (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F1F5F9] rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setHiddenColumns((prev) => {
                              const next = new Set(prev);
                              if (isChecked) next.add(col.id);
                              else next.delete(col.id);
                              return next;
                            });
                          }}
                          className="rounded text-[#2563EB] focus:ring-0"
                        />
                        {col.label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowExport((p) => !p);
                  setShowDensity(false);
                  setShowColumnChooser(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#475569] bg-white border border-[#D1D5DB] rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
              </button>
              {showExport && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 min-w-[170px]">
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#2563EB]" /> Export CSV
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A]" /> Export Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExport("json")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[#D97706]" /> Export JSON
                  </button>
                  <div className="border-t border-[#E2E8F0] my-1" />
                  <button
                    onClick={() => handleExport("print")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#64748B]" /> Print Report
                  </button>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-[#E2E8F0] mx-0.5" />

            {/* Refresh Button */}
            <button
              onClick={() => fetchReportData()}
              title="Refresh records"
              className="p-1.5 rounded-xl border border-[#D1D5DB] text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#2563EB]" : ""}`} />
            </button>

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh((p) => !p)}
              title="Auto-refresh every 30s"
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold rounded-xl border transition-colors cursor-pointer ${
                autoRefresh
                  ? "bg-[#DCFCE7] border-[#86EFAC] text-[#166534]"
                  : "bg-white border-[#D1D5DB] text-[#64748B] hover:bg-[#F8FAFC]"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Auto</span>
              {autoRefresh && <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-ping" />}
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={() => setIsFullscreen((p) => !p)}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
              className="p-1.5 rounded-xl border border-[#D1D5DB] text-[#475569] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Right Record Count Indicator */}
          <div className="flex items-center gap-2">
            {selectedKeys.size > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                {selectedKeys.size} Selected
              </span>
            )}
            <span className="text-xs font-bold text-[#64748B]">
              {totalRecords.toLocaleString()} records
            </span>
          </div>
        </div>

        {/* EXPANDABLE FILTER DRAWER */}
        {showFilterDrawer && (
          <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-[#475569] flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#2563EB]" /> Advanced Filter Parameters
              </span>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-[#DC2626] hover:underline cursor-pointer"
                  >
                    Reset All ({activeFiltersCount})
                  </button>
                )}
                <button
                  onClick={() => setShowFilterDrawer(false)}
                  className="p-1 text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                  className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REVERSED">REVERSED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Payment Mode</label>
                <select
                  value={modeFilter}
                  onChange={(e) => { setModeFilter(e.target.value); setPage(0); }}
                  className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="">All Modes</option>
                  <option value="IMPS">IMPS</option>
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="UPI">UPI</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Min Amount (₹)</label>
                <input
                  type="number"
                  value={minAmount}
                  onChange={(e) => { setMinAmount(e.target.value); setPage(0); }}
                  placeholder="0.00"
                  className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg focus:border-[#2563EB] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Max Amount (₹)</label>
                <input
                  type="number"
                  value={maxAmount}
                  onChange={(e) => { setMaxAmount(e.target.value); setPage(0); }}
                  placeholder="100000.00"
                  className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-lg focus:border-[#2563EB] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            4. MAIN TABLE (ORDERED STRICTLY AS REQUESTED)
            s.no, txn_id, amount, tax, netamount, bene name, account, utr,
            status, retailer, audit, and action
        ───────────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] text-[#475569] font-bold border-b border-[#E2E8F0] uppercase tracking-wider text-[11.5px] select-none">
                {/* Select All Checkbox */}
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedKeys.size === rows.length}
                    onChange={toggleSelectAll}
                    className="rounded text-[#2563EB] focus:ring-0 cursor-pointer"
                  />
                </th>

                {/* 1. S.NO */}
                {!hiddenColumns.has("s_no") && (
                  <th className="py-3 px-3 w-12 text-center">S.NO</th>
                )}

                {/* 2. TXN ID & REF ID */}
                {!hiddenColumns.has("transaction_id") && (
                  <th
                    onClick={() => handleSort("transaction_number")}
                    className="py-3 px-3 cursor-pointer hover:bg-[#EDF2F7] transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>TXN ID & REF ID</span>
                      <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                    </div>
                  </th>
                )}

                {/* 3. AMOUNT */}
                {!hiddenColumns.has("amount") && (
                  <th
                    onClick={() => handleSort("amount")}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-[#EDF2F7] transition-colors whitespace-nowrap text-[#0F172A]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>AMOUNT (₹)</span>
                      <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                    </div>
                  </th>
                )}

                {/* 4. TAX & CHARGES */}
                {!hiddenColumns.has("tax") && (
                  <th className="py-3 px-3 text-right whitespace-nowrap text-[#64748B]">
                    TAX & CHARGES
                  </th>
                )}

                {/* 5. NET AMOUNT */}
                {!hiddenColumns.has("net_amount") && (
                  <th
                    onClick={() => handleSort("net_amount")}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-[#EDF2F7] transition-colors whitespace-nowrap text-[#2563EB]"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>NET AMOUNT (₹)</span>
                      <ArrowUpDown className="w-3 h-3 text-[#2563EB]" />
                    </div>
                  </th>
                )}

                {/* 6. BENE NAME */}
                {!hiddenColumns.has("bene_name") && (
                  <th className="py-3 px-3 whitespace-nowrap">BENE NAME</th>
                )}

                {/* 7. ACCOUNT & BANK */}
                {!hiddenColumns.has("account") && (
                  <th className="py-3 px-3 whitespace-nowrap">ACCOUNT & BANK</th>
                )}

                {/* 8. UTR */}
                {!hiddenColumns.has("utr") && (
                  <th
                    onClick={() => handleSort("utr_number")}
                    className="py-3 px-3 cursor-pointer hover:bg-[#EDF2F7] transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>UTR</span>
                      <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                    </div>
                  </th>
                )}

                {/* 9. STATUS */}
                {!hiddenColumns.has("status") && (
                  <th
                    onClick={() => handleSort("status")}
                    className="py-3 px-3 cursor-pointer hover:bg-[#EDF2F7] transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>STATUS</span>
                      <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                    </div>
                  </th>
                )}

                {/* 10. RETAILER */}
                {!hiddenColumns.has("retailer") && (
                  <th className="py-3 px-3 whitespace-nowrap">RETAILER NAME</th>
                )}

                {/* 11. AUDIT */}
                {!hiddenColumns.has("audit") && (
                  <th
                    onClick={() => handleSort("created_date")}
                    className="py-3 px-3 cursor-pointer hover:bg-[#EDF2F7] transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <span>DATE & TIME</span>
                      <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                    </div>
                  </th>
                )}

                {/* 12. ACTION */}
                {!hiddenColumns.has("action") && (
                  <th className="py-3 px-3 text-center whitespace-nowrap">ACTION</th>
                )}
              </tr>
            </thead>

            <tbody className={`divide-y divide-[#F1F5F9] font-medium text-[#334155] ${densityConf.text}`}>
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-semibold text-[#475569]">Loading payout transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-[#CBD5E1] stroke-[1.5]" />
                      <span className="text-sm font-bold text-[#334155]">No records found</span>
                      <span className="text-xs text-[#94A3B8]">Try selecting a different date preset or clearing active filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const isSelected = selectedKeys.has(row.id || row.transaction_id);
                  const sNo = row.s_no || page * limit + idx + 1;

                  return (
                    <tr
                      key={row.id || row.transaction_id}
                      onClick={() => openRowDetails(row.transaction_id)}
                      className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer group ${
                        isSelected ? "bg-[#EFF6FF]/60" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className={`${densityConf.py} text-center`} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(row.id || row.transaction_id)}
                          className="rounded text-[#2563EB] focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* 1. S.No */}
                      {!hiddenColumns.has("s_no") && (
                        <td className={`${densityConf.py} text-center font-mono font-bold text-[#64748B]`}>
                          {sNo}
                        </td>
                      )}

                      {/* 2. Txn ID */}
                      {!hiddenColumns.has("transaction_id") && (
                        <td className={densityConf.py}>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                              {row.transaction_id}
                            </span>
                            <button
                              title="Copy Txn ID"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(row.transaction_id, `tx-${row.transaction_id}`);
                              }}
                              className="p-0.5 rounded hover:bg-[#E2E8F0] text-[#94A3B8] hover:text-[#334155] transition-colors"
                            >
                              {copiedId === `tx-${row.transaction_id}` ? (
                                <Check className="w-3 h-3 text-[#16A34A]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                              {row.payment_mode || "IMPS"}
                            </span>
                            <span className="text-[10.5px] text-[#94A3B8] font-mono truncate max-w-[120px]">
                              {row.payout_id}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* 3. Amount */}
                      {!hiddenColumns.has("amount") && (
                        <td className={`${densityConf.py} text-right font-mono font-bold text-[#0F172A]`}>
                          {formatCurrency(row.amount)}
                        </td>
                      )}

                      {/* 4. Tax & Charges */}
                      {!hiddenColumns.has("tax") && (
                        <td className={`${densityConf.py} text-right font-mono text-[#64748B]`}>
                          <div>{formatCurrency(row.charges + row.gst)}</div>
                          <div className="text-[10px] text-[#94A3B8]">
                            Chg: {formatCurrency(row.charges)} | GST: {formatCurrency(row.gst)}
                          </div>
                        </td>
                      )}

                      {/* 5. Net Amount */}
                      {!hiddenColumns.has("net_amount") && (
                        <td className={`${densityConf.py} text-right font-mono font-black text-[#2563EB]`}>
                          {formatCurrency(row.net_amount || (row.amount + row.charges + row.gst))}
                        </td>
                      )}

                      {/* 6. Bene Name */}
                      {!hiddenColumns.has("bene_name") && (
                        <td className={densityConf.py}>
                          <div className="font-bold text-[#0F172A]">{row.bene_name || "N/A"}</div>
                          <div className="text-[11px] text-[#94A3B8] font-medium">Beneficiary</div>
                        </td>
                      )}

                      {/* 7. Account & Bank */}
                      {!hiddenColumns.has("account") && (
                        <td className={densityConf.py}>
                          <div className="font-mono font-bold text-[#334155]">
                            {row.account_masked || row.account_number || "N/A"}
                          </div>
                          <div className="text-[11px] text-[#64748B] flex items-center gap-1">
                            <span>{row.bank_name || "Bank"}</span>
                            <span>•</span>
                            <span className="font-mono text-[#94A3B8]">{row.ifsc || "IFSC"}</span>
                          </div>
                        </td>
                      )}

                      {/* 8. UTR */}
                      {!hiddenColumns.has("utr") && (
                        <td className={densityConf.py}>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[#334155]">
                              {row.utr || "PENDING"}
                            </span>
                            {row.utr && row.utr !== "PENDING" && (
                              <button
                                title="Copy UTR"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(row.utr, `utr-${row.transaction_id}`);
                                }}
                                className="p-0.5 rounded hover:bg-[#E2E8F0] text-[#94A3B8] hover:text-[#334155] transition-colors"
                              >
                                {copiedId === `utr-${row.transaction_id}` ? (
                                  <Check className="w-3 h-3 text-[#16A34A]" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 9. Status */}
                      {!hiddenColumns.has("status") && (
                        <td className={densityConf.py}>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold tracking-wide border ${
                              row.status === "SUCCESS"
                                ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
                                : row.status === "REVERSED"
                                ? "bg-[#EEF2FF] text-[#3730A3] border-[#C7D2FE]"
                                : row.status === "PENDING" || row.status === "INITIATED" || row.status === "PROCESSING"
                                ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                                : "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                row.status === "SUCCESS"
                                  ? "bg-[#16A34A]"
                                  : row.status === "REVERSED"
                                  ? "bg-[#4F46E5]"
                                  : row.status === "PENDING" || row.status === "INITIATED"
                                  ? "bg-[#D97706] animate-pulse"
                                  : "bg-[#DC2626]"
                              }`}
                            />
                            {row.status}
                          </span>
                        </td>
                      )}

                      {/* 10. Retailer */}
                      {!hiddenColumns.has("retailer") && (
                        <td className={densityConf.py}>
                          <div className="font-bold text-[#0F172A]">{row.retailer_name || "Direct Retailer"}</div>
                          <div className="text-[10.5px] font-mono text-[#64748B]">{row.retailer_code || "RET-DIRECT"}</div>
                        </td>
                      )}

                      {/* 11. Audit */}
                      {!hiddenColumns.has("audit") && (
                        <td className={`${densityConf.py} whitespace-nowrap`}>
                          <div className="text-xs text-[#0F172A] font-semibold">{row.transaction_date || "--"}</div>
                          <div className="text-[10.5px] text-[#94A3B8] font-mono">{row.transaction_time || "--"}</div>
                        </td>
                      )}

                      {/* 12. Action */}
                      {!hiddenColumns.has("action") && (
                        <td className={`${densityConf.py} text-center`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openRowDetails(row.transaction_id);
                            }}
                            className="p-1.5 rounded-lg bg-[#F1F5F9] hover:bg-[#2563EB] hover:text-white text-[#475569] border border-[#E2E8F0] shadow-2xs transition-all cursor-pointer"
                            title="View Transaction Audit Trail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            5. PAGINATION FOOTER
        ───────────────────────────────────────────────────────────── */}
        <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748B] font-semibold">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-[#0F172A]">{rows.length}</strong> of <strong className="text-[#0F172A]">{totalRecords}</strong> records
            </span>
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}
                className="px-2 py-1 bg-white border border-[#CBD5E1] rounded-lg text-xs font-bold text-[#334155] focus:outline-none"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9] disabled:opacity-40 shadow-2xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 bg-white border border-[#CBD5E1] rounded-lg font-bold text-[#0F172A] shadow-2xs">
              Page {page + 1} of {totalPages}
            </span>

            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F1F5F9] disabled:opacity-40 shadow-2xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          6. TRANSACTION AUDIT DETAIL DRAWER
      ───────────────────────────────────────────────────────────── */}
      <PayoutTransactionDetailDrawer
        open={!!selectedTxId}
        onClose={() => { setSelectedTxId(null); setDrawerData(null); }}
        data={drawerData}
        loading={drawerLoading}
      />

    </div>
  );
}
