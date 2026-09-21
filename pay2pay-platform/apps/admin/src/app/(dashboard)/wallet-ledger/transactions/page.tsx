"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import api from "@/lib/api";
import { SearchableSelect, SelectOption } from "@/components/ui/searchable-select";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  X,
  Layers,
  Building2,
  Users,
  Store,
  Wallet,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Copy,
  Check,
  Calendar,
  DollarSign,
  Activity,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Columns,
  ListFilter,
  Maximize2,
  Minimize2,
  SlidersHorizontal
} from "lucide-react";

interface AuditItem {
  id: number;
  date_time: string;
  created_at: string;
  txn_id: string;
  ref_id: string;
  ledger_id: string;
  all_ledger_ids: string;
  user_type: string;
  user_name: string;
  company: string;
  super_distributor: string;
  super_distributor_code: string;
  distributor: string;
  distributor_code: string;
  retailer: string;
  retailer_code: string;
  service: string;
  transaction_type: string;
  entry_type: string;
  cr_dr: "CR" | "DR";
  amount: number;
  ledger_amount: number;
  mdr_percent: number;
  mdr_amount: number;
  commission_percent: number;
  commission_amount: number;
  opening_balance: number;
  closing_balance: number;
  wallet: string;
  status: string;
  reconciliation: "MATCHED" | "MISMATCH" | "PENDING" | "NOT_APPLICABLE";
  mismatch_reasons: string[];
  created_by: string;
  user_ref_id?: number;
  user_type_ref_id?: number;
}

interface SummaryData {
  total_transactions: number;
  total_credit: number;
  total_debit: number;
  net_movement: number;
  matched_count: number;
  mismatch_count: number;
  pending_count: number;
  total_mdr: number;
  total_commission: number;
  services_summary?: Array<{
    service: string;
    transactions: number;
    total_cr: number;
    total_dr: number;
    net_movement: number;
    mdr: number;
    commission: number;
  }>;
}

interface UserTypeOption {
  user_type_ref_id: number;
  code: string;
  name: string;
}

interface EntityOption {
  id: number;
  code: string;
  name: string;
  user_type: string;
}

export default function WalletLedgerTransactionsAuditPage() {
  // ── States ──────────────────────────────────────────────────────────────────
  const [data, setData] = useState<AuditItem[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    total_transactions: 0,
    total_credit: 0,
    total_debit: 0,
    net_movement: 0,
    matched_count: 0,
    mismatch_count: 0,
    pending_count: 0,
    total_mdr: 0,
    total_commission: 0,
    services_summary: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Filters
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [datePreset, setDatePreset] = useState<string>("TODAY");
  const [userType, setUserType] = useState<string>("ALL");
  const [selectedUserRefId, setSelectedUserRefId] = useState<string>("");
  const [service, setService] = useState<string>("ALL");
  const [entryType, setEntryType] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [reconFilter, setReconFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Toolbar toggles & UI state
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [density, setDensity] = useState<"compact" | "medium" | "comfortable">("medium");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);

  // Masters
  const [userTypes, setUserTypes] = useState<UserTypeOption[]>([]);
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [loadingEntities, setLoadingEntities] = useState<boolean>(false);

  // Drawer / Inspection Trace
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [traceDetail, setTraceDetail] = useState<any | null>(null);
  const [loadingTrace, setLoadingTrace] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // View Mode: grid or service breakdown
  const [activeTab, setActiveTab] = useState<"grid" | "services">("grid");

  // Format today's date for display
  const todayFormatted = useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);

  // Set default TODAY date preset on mount
  useEffect(() => {
    setFromDate(todayFormatted);
    setToDate(todayFormatted);
  }, [todayFormatted]);

  // ── Formatters ─────────────────────────────────────────────────────────────
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const copyToClipboard = (textToCopy: string, key: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // ── Load User Types Dynamically ────────────────────────────────────────────
  useEffect(() => {
    const fetchUserTypes = async () => {
      try {
        const res = await api.get("/users/user-types");
        const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        if (list.length > 0) {
          setUserTypes(
            list.map((u: any) => ({
              user_type_ref_id: u.user_type_ref_id || u.id,
              code: u.code || u.user_type_code,
              name: u.name || u.user_type_name
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load user types:", err);
      }
    };
    fetchUserTypes();
  }, []);

  // ── Load Entities Dynamically Cascading on User Type ────────────────────────
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        setLoadingEntities(true);
        const res = await api.get("/wallet-ledger/entities", {
          params: { user_type: userType === "ALL" ? "" : userType }
        });
        const items = res.data?.items || [];
        setEntities(items);
      } catch (err) {
        console.error("Failed to load entities:", err);
        setEntities([]);
      } finally {
        setLoadingEntities(false);
      }
    };
    fetchEntities();
    setSelectedUserRefId(""); // Reset user selection when user type changes
  }, [userType]);

  // ── Dropdown Options with Auto-Search ──────────────────────────────────────
  const userTypeOptions: SelectOption[] = useMemo(() => [
    { value: "ALL", label: "All User Types" },
    { value: "SUPER_DISTRIBUTOR", label: "Super Distributor (SD)" },
    { value: "DISTRIBUTOR", label: "Distributor" },
    { value: "RETAILER", label: "Retailer" },
  ], []);

  const userEntityOptions: SelectOption[] = useMemo(() => [
    { value: "", label: loadingEntities ? "Loading users..." : "All Users in Type" },
    ...entities.map((ent) => ({
      value: String(ent.id),
      label: `${ent.code} — ${ent.name}`,
      subtext: ent.user_type,
    })),
  ], [entities, loadingEntities]);

  const serviceOptions: SelectOption[] = useMemo(() => [
    { value: "ALL", label: "All Services" },
    { value: "PAYOUT", label: "Payout" },
    { value: "TOPUP", label: "Top-up" },
    { value: "DMT", label: "DMT" },
    { value: "AEPS", label: "AEPS" },
    { value: "BBPS", label: "BBPS" },
    { value: "RECHARGE", label: "Recharge" },
    { value: "BENE_VERIFY", label: "Penny Drop Verification" },
    { value: "Aadhaar Verification", label: "Aadhaar eKYC" },
    { value: "POS_COMMISSION", label: "POS Commission" },
    { value: "General Wallet Allocation", label: "Wallet Allocation" },
  ], []);

  const entryTypeOptions: SelectOption[] = useMemo(() => [
    { value: "ALL", label: "All Entries (CR & DR)" },
    { value: "CREDIT", label: "Credit (+CR)" },
    { value: "DEBIT", label: "Debit (-DR)" },
  ], []);

  const statusOptions: SelectOption[] = useMemo(() => [
    { value: "ALL", label: "All Statuses" },
    { value: "SUCCESS", label: "Success" },
    { value: "PENDING", label: "Pending / Processing" },
    { value: "FAILED", label: "Failed" },
    { value: "REVERSED", label: "Reversed / Refunded" },
  ], []);

  const reconOptions: SelectOption[] = useMemo(() => [
    { value: "ALL", label: "All Reconciliation" },
    { value: "MATCHED", label: "Matched Only" },
    { value: "MISMATCH", label: "⚠ Mismatches Only" },
    { value: "PENDING", label: "Pending Confirmation" },
  ], []);

  // ── Date Presets ────────────────────────────────────────────────────────────
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const formatDateStr = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "TODAY") {
      const todayStr = formatDateStr(now);
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "YESTERDAY") {
      const yest = new Date();
      yest.setDate(now.getDate() - 1);
      const yestStr = formatDateStr(yest);
      setFromDate(yestStr);
      setToDate(yestStr);
    } else if (preset === "7D") {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setFromDate(formatDateStr(past));
      setToDate(formatDateStr(now));
    } else if (preset === "30D") {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      setFromDate(formatDateStr(past));
      setToDate(formatDateStr(now));
    } else if (preset === "60D") {
      const past = new Date();
      past.setDate(now.getDate() - 60);
      setFromDate(formatDateStr(past));
      setToDate(formatDateStr(now));
    } else if (preset === "90D") {
      const past = new Date();
      past.setDate(now.getDate() - 90);
      setFromDate(formatDateStr(past));
      setToDate(formatDateStr(now));
    } else if (preset === "ALL") {
      setFromDate("");
      setToDate("");
    }
    setPage(1);
  };

  // ── Fetch Audit Transactions ────────────────────────────────────────────────
  const fetchAuditData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        limit,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        user_type: userType !== "ALL" ? userType : undefined,
        user_ref_id: selectedUserRefId ? parseInt(selectedUserRefId) : undefined,
        service: service !== "ALL" ? service : undefined,
        entry_type: entryType !== "ALL" ? entryType : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        reconciliation: reconFilter !== "ALL" ? reconFilter : undefined,
        search: searchTerm.trim() || undefined,
        sort_by: "created_at",
        sort_order: "DESC"
      };

      const res = await api.get("/wallet-ledger/transactions", { params });
      if (res.data?.success) {
        setData(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.total_pages || 1);
          setTotalRecords(res.data.pagination.total_records || 0);
        }
      }
    } catch (err) {
      console.error("Failed to load audit transactions:", err);
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    page,
    limit,
    fromDate,
    toDate,
    userType,
    selectedUserRefId,
    service,
    entryType,
    statusFilter,
    reconFilter,
    searchTerm
  ]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // Auto-refresh interval (every 30 seconds if enabled)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAuditData();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAuditData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAuditData();
  };

  const handleResetFilters = () => {
    const todayStr = todayFormatted;
    setFromDate(todayStr);
    setToDate(todayStr);
    setDatePreset("TODAY");
    setUserType("ALL");
    setSelectedUserRefId("");
    setService("ALL");
    setEntryType("ALL");
    setStatusFilter("ALL");
    setReconFilter("ALL");
    setSearchTerm("");
    setPage(1);
  };

  // ── CSV Export Handler ──────────────────────────────────────────────────────
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);
      if (userType !== "ALL") params.append("user_type", userType);
      if (selectedUserRefId) params.append("user_ref_id", selectedUserRefId);
      if (service !== "ALL") params.append("service", service);
      if (entryType !== "ALL") params.append("entry_type", entryType);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (reconFilter !== "ALL") params.append("reconciliation", reconFilter);
      if (searchTerm.trim()) params.append("search", searchTerm.trim());

      const url = `/api/v1/wallet-ledger/transactions/export?${params.toString()}`;
      window.open(url, "_blank");
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  // ── Deep Inspection Trace Drawer Handler ────────────────────────────────────
  const openTransactionDetail = async (txnId: string, primaryId?: number) => {
    setSelectedTxnId(txnId);
    setLoadingTrace(true);
    setTraceDetail(null);

    try {
      const url = primaryId
        ? `/wallet-ledger/transactions/${encodeURIComponent(txnId)}?primary_id=${primaryId}`
        : `/wallet-ledger/transactions/${encodeURIComponent(txnId)}`;
      const res = await api.get(url);
      setTraceDetail(res.data);
    } catch (err) {
      console.error("Failed to load trace detail:", err);
    } finally {
      setLoadingTrace(false);
    }
  };

  const closeDetailDrawer = () => {
    setSelectedTxnId(null);
    setTraceDetail(null);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Display date status string
  const displayDateText = useMemo(() => {
    if (fromDate && toDate && fromDate === toDate) {
      return fromDate;
    }
    if (fromDate && toDate) {
      return `${fromDate} to ${toDate}`;
    }
    if (fromDate) {
      return `From ${fromDate}`;
    }
    if (toDate) {
      return `Until ${toDate}`;
    }
    return "All Time";
  }, [fromDate, toDate]);

  const activeFiltersCount = useMemo(() => {
    let cnt = 0;
    if (userType !== "ALL") cnt++;
    if (selectedUserRefId) cnt++;
    if (service !== "ALL") cnt++;
    if (entryType !== "ALL") cnt++;
    if (statusFilter !== "ALL") cnt++;
    if (reconFilter !== "ALL") cnt++;
    return cnt;
  }, [userType, selectedUserRefId, service, entryType, statusFilter, reconFilter]);

  return (
    <div className={`min-h-screen bg-white text-slate-900 p-4 md:p-6 space-y-4 pb-20 ${isFullscreen ? "fixed inset-0 z-50 overflow-y-auto bg-white p-6" : ""}`}>
      {/* ── Page Header Banner ───────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-0.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Financial Audit & Ledger Engine
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
            Wallet Ledger & Financial Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative CR/DR tracking, hierarchy mapping, balance progression audit, and gateway reconciliation.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setActiveTab("grid")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "grid"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Audit Grid
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "services"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Service Breakdown
            </button>
          </div>
        </div>
      </div>

      {/* ── HEADER BAR 1: Exact Date Range Pill Bar ──────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Calendar icon + Date Range + Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Date Range:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Today */}
            <button
              onClick={() => handleDatePreset("TODAY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                datePreset === "TODAY"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200/80"
              }`}
            >
              Today
            </button>

            {/* Yesterday */}
            <button
              onClick={() => handleDatePreset("YESTERDAY")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                datePreset === "YESTERDAY"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200/80"
              }`}
            >
              Yesterday
            </button>

            {/* 7D */}
            <button
              onClick={() => handleDatePreset("7D")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                datePreset === "7D"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200/80"
              }`}
            >
              7D
            </button>

            {/* 30D */}
            <button
              onClick={() => handleDatePreset("30D")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                datePreset === "30D"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200/80"
              }`}
            >
              30D
            </button>

            {/* 60D */}
            <button
              onClick={() => handleDatePreset("60D")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                datePreset === "60D"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200/80"
              }`}
            >
              60D
            </button>

            {/* 90D */}
            <button
              onClick={() => handleDatePreset("90D")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                datePreset === "90D"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200/80"
              }`}
            >
              90D
            </button>

            {/* All Time */}
            <button
              onClick={() => handleDatePreset("ALL")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                datePreset === "ALL"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200/80"
              }`}
            >
              All Time
            </button>

            {/* Custom Range */}
            <button
              onClick={() => setDatePreset("CUSTOM")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                datePreset === "CUSTOM"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "bg-slate-100/90 text-slate-700 hover:bg-slate-200/80"
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Right Side: Showing records text */}
        <div className="text-xs text-slate-500 font-normal">
          Showing records for <span className="font-bold text-slate-800">{displayDateText}</span>
        </div>
      </div>

      {/* ── Custom Range Inputs (collapsible if Custom Range active) ──────────── */}
      {datePreset === "CUSTOM" && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 px-4 flex items-center gap-3 animate-in fade-in duration-200">
          <span className="text-xs font-semibold text-slate-600">Select Custom Bounds:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-400 font-medium">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => handleDatePreset("TODAY")}
            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 underline ml-auto"
          >
            Reset to Today
          </button>
        </div>
      )}

      {/* ── HEADER BAR 2: Search, Filter, Density, Columns, Export Bar ──────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-2.5 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative w-64 md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search Serial Number, Mobile, Txn ID, UTR..."
              className="w-full pl-9 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-2xs ${
              showFilterDrawer || activeFiltersCount > 0
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Filter</span>
            {activeFiltersCount > 0 && (
              <span className="ml-0.5 bg-blue-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Density Button */}
          <button
            onClick={() => {
              if (density === "compact") setDensity("medium");
              else if (density === "medium") setDensity("comfortable");
              else setDensity("compact");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs"
            title="Toggle Row Density"
          >
            <ListFilter className="w-3.5 h-3.5 text-slate-500" />
            <span className="capitalize">{density}</span>
          </button>

          {/* Columns Button */}
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-2xs ${
              showColumnSelector ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            <Columns className="w-3.5 h-3.5 text-slate-500" />
            <span>Columns</span>
          </button>

          {/* Export Dropdown */}
          <button
            onClick={handleExportCSV}
            disabled={exporting || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs"
          >
            {exporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {/* Separator */}
          <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition shadow-2xs ${
              autoRefresh ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
            title="Auto Refresh Every 30s"
          >
            <Clock className={`w-3.5 h-3.5 ${autoRefresh ? "text-emerald-600 animate-spin" : "text-slate-500"}`} />
            <span>Auto</span>
          </button>

          {/* Fullscreen Expand */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition shadow-2xs"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Right Side: Total Records Count */}
        <div className="text-xs font-bold text-slate-800">
          {totalRecords > 0 ? `${totalRecords.toLocaleString("en-IN")} records` : "0 records"}
        </div>
      </div>

      {/* ── Expandable Filter Panel (when Filter button clicked) ─────────────── */}
      {showFilterDrawer && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              Advanced Filters & User Hierarchy Scoping
            </span>
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
            >
              Reset All Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* User Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                User Type
              </label>
              <SearchableSelect
                size="sm"
                options={userTypeOptions}
                value={userType}
                onChange={(val) => {
                  setUserType(val);
                  setPage(1);
                }}
              />
            </div>

            {/* User Cascading Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                {userType === "SUPER_DISTRIBUTOR"
                  ? "Select SD"
                  : userType === "DISTRIBUTOR"
                  ? "Select Distributor"
                  : userType === "RETAILER"
                  ? "Select Retailer"
                  : "Select User"}
              </label>
              <SearchableSelect
                size="sm"
                options={userEntityOptions}
                value={selectedUserRefId}
                onChange={(val) => {
                  setSelectedUserRefId(val);
                  setPage(1);
                }}
                disabled={loadingEntities}
                placeholder={loadingEntities ? "Loading..." : "All Users in Type"}
                searchPlaceholder="Search by code or name..."
              />
            </div>

            {/* Service */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Service
              </label>
              <SearchableSelect
                size="sm"
                options={serviceOptions}
                value={service}
                onChange={(val) => {
                  setService(val);
                  setPage(1);
                }}
                searchPlaceholder="Search service..."
              />
            </div>

            {/* CR / DR */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                CR / DR
              </label>
              <SearchableSelect
                size="sm"
                options={entryTypeOptions}
                value={entryType}
                onChange={(val) => {
                  setEntryType(val);
                  setPage(1);
                }}
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Txn Status
              </label>
              <SearchableSelect
                size="sm"
                options={statusOptions}
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              />
            </div>

            {/* Reconciliation Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                Reconciliation
              </label>
              <SearchableSelect
                size="sm"
                options={reconOptions}
                value={reconFilter}
                onChange={(val) => {
                  setReconFilter(val);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Summary KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {/* Total Transactions */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Transactions</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900">
            {summary.total_transactions.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Full filtered volume</div>
        </div>

        {/* Total Credits */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
            <span>Total Credits (+CR)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600">
            {formatCurrency(summary.total_credit)}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1">Wallet allocations & top-ups</div>
        </div>

        {/* Total Debits */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-rose-700">
            <span>Total Debits (-DR)</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-rose-600">
            {formatCurrency(summary.total_debit)}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-1">Payouts, utilities & fees</div>
        </div>

        {/* Net Movement */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Net Movement (CR - DR)</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div
            className={`mt-2 text-xl font-bold ${
              summary.net_movement >= 0 ? "text-emerald-600" : "text-slate-900"
            }`}
          >
            {formatCurrency(summary.net_movement)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Net wallet balance flow</div>
        </div>

        {/* Matched Count */}
        <div
          onClick={() => setReconFilter("MATCHED")}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-300 shadow-xs cursor-pointer transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
            <span>Recon: Matched</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600">
            {summary.matched_count.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-emerald-600/70 mt-1">
            {summary.total_transactions > 0
              ? `${((summary.matched_count / summary.total_transactions) * 100).toFixed(1)}% verified`
              : "100% verified"}
          </div>
        </div>

        {/* Mismatches Count */}
        <div
          onClick={() => setReconFilter("MISMATCH")}
          className={`p-4 rounded-xl border shadow-xs cursor-pointer transition flex flex-col justify-between ${
            summary.mismatch_count > 0
              ? "bg-rose-50/70 border-rose-300 text-rose-700"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-rose-600">
            <span>Discrepancies</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <div className="mt-2 text-xl font-bold text-rose-600 flex items-center gap-1.5">
            {summary.mismatch_count.toLocaleString("en-IN")}
            {summary.mismatch_count > 0 && (
              <span className="text-[10px] font-semibold bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded-full">
                Review
              </span>
            )}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-1">Audit variances detected</div>
        </div>
      </div>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      {activeTab === "grid" ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Table Header Info */}
          <div className="px-5 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-900">{data.length}</span> of{" "}
              <span className="font-semibold text-slate-900">
                {totalRecords.toLocaleString("en-IN")}
              </span>{" "}
              financial ledger transactions
            </div>
            <div className="flex items-center gap-2">
              <span>Per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setPage(1);
                }}
                className="text-xs py-1 px-2 rounded border border-slate-200 bg-white text-slate-700 font-medium focus:ring-1 focus:ring-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold tracking-wider uppercase text-[10.5px]">
                  {/* 1. Date / Time */}
                  <th className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Date / Time (IST)</th>
                  {/* 2. Transaction ID */}
                  <th className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Transaction ID</th>
                  {/* 3. User Type */}
                  <th className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>User Type</th>
                  {/* 4. User Name */}
                  <th className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>User Name</th>
                  {/* 5. Service */}
                  <th className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Service</th>
                  {/* 6. CR / DR */}
                  <th className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>CR / DR</th>
                  {/* 7. Txn Amount */}
                  <th className={`px-3.5 whitespace-nowrap text-right ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Txn Amount</th>
                  {/* 8. Ledger Amount */}
                  <th className={`px-3.5 whitespace-nowrap text-right ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Ledger Amount</th>
                  {/* 9. MDR / Comm */}
                  <th className={`px-3.5 whitespace-nowrap text-right ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>MDR / Comm</th>
                  {/* 10. Opening Bal */}
                  <th className={`px-3.5 whitespace-nowrap text-right ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Opening Bal</th>
                  {/* 11. Closing Bal */}
                  <th className={`px-3.5 whitespace-nowrap text-right ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Closing Bal</th>
                  {/* 12. Status */}
                  <th className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Status</th>
                  {/* 13. Ledger ID */}
                  <th className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Ledger ID</th>
                  {/* 14. Ref ID */}
                  <th className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Ref ID</th>
                  {/* 15. Hierarchy */}
                  <th className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Hierarchy (Company &rarr; SD &rarr; Dist &rarr; Ret)</th>
                  {/* 16. Reconciliation */}
                  <th className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Reconciliation</th>
                  {/* 17. Action */}
                  <th className={`px-3.5 whitespace-nowrap text-center ${density === "compact" ? "py-2" : density === "comfortable" ? "py-4" : "py-3"}`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                        <span>Querying financial transaction ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <HelpCircle className="w-8 h-8 text-slate-300" />
                        <span className="font-semibold text-slate-600">
                          No audit records found matching your filters.
                        </span>
                        <span className="text-xs text-slate-400">
                          Try adjusting your date range or clearing specific filter options.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((item) => {
                    const isCredit = item.cr_dr === "CR";
                    const isMismatch = item.reconciliation === "MISMATCH";

                    return (
                      <tr
                        key={`${item.txn_id}-${item.id}-${item.ledger_id}`}
                        onClick={() => openTransactionDetail(item.txn_id, item.id)}
                        className={`hover:bg-slate-50 cursor-pointer transition ${
                          isMismatch ? "bg-rose-50/50 border-l-4 border-l-rose-500" : ""
                        }`}
                      >
                        {/* 1. Date / Time */}
                        <td className={`px-3.5 whitespace-nowrap font-mono text-slate-600 ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          {item.date_time}
                        </td>

                        {/* 2. Transaction ID */}
                        <td className={`px-3.5 whitespace-nowrap font-mono font-medium text-slate-900 ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          <div className="flex items-center gap-1.5">
                            <span>{item.txn_id}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(item.txn_id, `txn-${item.id}`);
                              }}
                              className="text-slate-400 hover:text-slate-600"
                              title="Copy Txn ID"
                            >
                              {copiedKey === `txn-${item.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* 3. User Type */}
                        <td className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.user_type === "RETAILER"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : item.user_type === "DISTRIBUTOR"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : item.user_type === "SUPER_DISTRIBUTOR" || item.user_type === "SD"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.user_type}
                          </span>
                        </td>

                        {/* 4. User Name */}
                        <td className={`px-3.5 whitespace-nowrap font-medium text-slate-900 ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          {item.user_name}
                        </td>

                        {/* 5. Service */}
                        <td className={`px-3.5 whitespace-nowrap text-slate-700 font-medium ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          {item.service}
                        </td>

                        {/* 6. CR / DR */}
                        <td className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          <span
                            className={`px-2 py-0.5 rounded text-[10.5px] font-bold inline-flex items-center gap-1 ${
                              isCredit
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3 text-rose-600" />
                            )}
                            {item.cr_dr} ({item.entry_type})
                          </span>
                        </td>

                        {/* 7. Txn Amount */}
                        <td className={`px-3.5 whitespace-nowrap text-right font-mono font-bold text-slate-900 ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          {formatCurrency(item.amount)}
                        </td>

                        {/* 8. Ledger Amount */}
                        <td className={`px-3.5 whitespace-nowrap text-right font-mono text-slate-700 ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          {formatCurrency(item.ledger_amount)}
                        </td>

                        {/* 9. MDR / Comm */}
                        <td className={`px-3.5 whitespace-nowrap text-right font-mono text-slate-600 ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          {item.mdr_amount > 0 && (
                            <div className="text-amber-700 font-semibold">
                              MDR: {formatCurrency(item.mdr_amount)} ({item.mdr_percent}%)
                            </div>
                          )}
                          {item.commission_amount > 0 && (
                            <div className="text-emerald-700 font-semibold">
                              Comm: {formatCurrency(item.commission_amount)} ({item.commission_percent}%)
                            </div>
                          )}
                          {item.mdr_amount === 0 && item.commission_amount === 0 && (
                            <span className="text-slate-400">₹0.00</span>
                          )}
                        </td>

                        {/* 10. Opening Bal */}
                        <td className={`px-3.5 whitespace-nowrap text-right font-mono text-slate-500 ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          {formatCurrency(item.opening_balance)}
                        </td>

                        {/* 11. Closing Bal */}
                        <td className={`px-3.5 whitespace-nowrap text-right font-mono font-semibold text-slate-800 ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          {formatCurrency(item.closing_balance)}
                        </td>

                        {/* 12. Status */}
                        <td className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          <span
                            className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${
                              item.status === "SUCCESS" || item.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 animate-pulse"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>

                        {/* 13. Ledger ID */}
                        <td className={`px-3.5 whitespace-nowrap font-mono text-slate-600 ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          #{item.ledger_id}
                        </td>

                        {/* 14. Ref ID */}
                        <td className={`px-3.5 whitespace-nowrap font-mono text-slate-500 ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          {item.ref_id ? item.ref_id.substring(0, 18) + (item.ref_id.length > 18 ? "..." : "") : "N/A"}
                        </td>

                        {/* 15. Hierarchy */}
                        <td className={`px-3.5 whitespace-nowrap text-slate-500 ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          <div className="flex items-center gap-1 text-[11px]">
                            <span>{item.company}</span>
                            <span className="text-slate-300">&rarr;</span>
                            <span>{item.super_distributor}</span>
                            <span className="text-slate-300">&rarr;</span>
                            <span>{item.distributor}</span>
                            <span className="text-slate-300">&rarr;</span>
                            <span className="font-semibold text-slate-800">{item.retailer}</span>
                          </div>
                        </td>

                        {/* 16. Reconciliation */}
                        <td className={`px-3.5 whitespace-nowrap ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          {item.reconciliation === "MATCHED" ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10.5px] font-bold inline-flex items-center gap-1 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              MATCHED
                            </span>
                          ) : item.reconciliation === "MISMATCH" ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 text-[10.5px] font-bold inline-flex items-center gap-1 border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                MISMATCH
                              </span>
                              {item.mismatch_reasons.length > 0 && (
                                <span className="text-[10px] text-rose-600 font-medium max-w-[180px] truncate" title={item.mismatch_reasons.join("\n")}>
                                  {item.mismatch_reasons[0]}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10.5px] font-bold inline-flex items-center gap-1 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              PENDING
                            </span>
                          )}
                        </td>

                        {/* 17. Action */}
                        <td className={`px-3.5 whitespace-nowrap text-center ${density === "compact" ? "py-1.5" : density === "comfortable" ? "py-3.5" : "py-2.5"}`}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openTransactionDetail(item.txn_id, item.id);
                            }}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                            title="Audit Investigation Trace"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-600">
              Showing page <span className="font-bold text-slate-900">{page}</span> of{" "}
              <span className="font-bold text-slate-900">{totalPages || 1}</span> ({totalRecords.toLocaleString("en-IN")} total records)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1 || loading}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-40 transition shadow-2xs"
              >
                First
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-semibold text-slate-800">
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 transition shadow-2xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages || loading}
                className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold disabled:opacity-40 transition shadow-2xs"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Service Breakdown View ────────────────────────────────────────── */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Service-wise Financial Breakdown</h2>
              <p className="text-xs text-slate-500">Volume, Credit/Debit distribution, net cashflow, MDR and commissions per service.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10.5px]">
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4 text-right">Transactions</th>
                  <th className="py-3 px-4 text-right">Total Credit (+CR)</th>
                  <th className="py-3 px-4 text-right">Total Debit (-DR)</th>
                  <th className="py-3 px-4 text-right">Net Cashflow</th>
                  <th className="py-3 px-4 text-right">MDR Collected</th>
                  <th className="py-3 px-4 text-right">Commission Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(summary.services_summary || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No service breakdown data available for active filter criteria.
                    </td>
                  </tr>
                ) : (
                  summary.services_summary?.map((svc) => (
                    <tr key={svc.service} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{svc.service}</td>
                      <td className="py-3 px-4 text-right font-mono">{svc.transactions.toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">{formatCurrency(svc.total_cr)}</td>
                      <td className="py-3 px-4 text-right font-mono text-rose-600 font-semibold">{formatCurrency(svc.total_dr)}</td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${svc.net_movement >= 0 ? "text-emerald-600" : "text-slate-900"}`}>
                        {formatCurrency(svc.net_movement)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-700 font-medium">{formatCurrency(svc.mdr)}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-medium">{formatCurrency(svc.commission)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Slide-Over Inspection Drawer ───────────────────────────────────── */}
      {selectedTxnId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  <span>Audit Investigation</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded">Success</span>
                </div>
                <h2 className="text-lg font-mono font-bold text-white mt-0.5">{selectedTxnId}</h2>
              </div>
              <button
                onClick={closeDetailDrawer}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingTrace ? (
                <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  <span>Loading full atomic financial audit trace...</span>
                </div>
              ) : traceDetail ? (
                <>
                  {/* Entity Hierarchy Chain */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      Entity Hierarchy Chain
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Company</span>
                        <span className="font-bold text-slate-900">{traceDetail.hierarchy?.company || "Pay2Pay"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Super Distributor</span>
                        <span className="font-medium text-slate-800">{traceDetail.hierarchy?.super_distributor || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Distributor</span>
                        <span className="font-medium text-slate-800">{traceDetail.hierarchy?.distributor || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Retailer</span>
                        <span className="font-bold text-slate-900">{traceDetail.hierarchy?.retailer || "Store"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Movement Trace */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Financial Movement Trace
                    </div>
                    <div className="flex items-center justify-between gap-3 text-center">
                      <div className="flex-1 bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">Service</span>
                        <span className="font-bold text-slate-900 text-xs">{traceDetail.service}</span>
                      </div>
                      <span className="text-slate-300 font-bold">&rarr;</span>
                      <div className="flex-1 bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">Business Total</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">{formatCurrency(traceDetail.total_business_amount)}</span>
                      </div>
                      <span className="text-slate-300 font-bold">&rarr;</span>
                      <div className="flex-1 bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">Ledger Rows</span>
                        <span className="font-bold text-emerald-700 text-xs">{traceDetail.ledger_postings?.length || 0} Posted</span>
                      </div>
                    </div>
                  </div>

                  {/* Atomic Transaction Ledger Lines */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-blue-600" />
                      Atomic Transaction Ledger Lines
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
                            <th className="py-2 px-3">Line Component</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                            <th className="py-2 px-3 text-right">Balance Progression</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {traceDetail.components?.map((c: any) => (
                            <tr key={c.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">
                                <div>{c.narration}</div>
                                {c.retailer && (
                                  <div className="text-[10px] text-slate-400 font-normal">Account: {c.retailer}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-1.5 py-0.5 text-[9.5px] font-bold rounded ${c.entry_type === "CREDIT" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                  {c.entry_type}
                                </span>
                              </td>
                              <td className={`py-2.5 px-3 text-right font-mono font-bold ${c.entry_type === "CREDIT" ? "text-emerald-600" : "text-rose-600"}`}>
                                {c.entry_type === "CREDIT" ? "+" : "-"}{formatCurrency(c.amount)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[11px]">
                                ₹{c.balance_before?.toLocaleString("en-IN")} &rarr; ₹{c.balance_after?.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Posted Double-Entry Wallet Ledger */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                      Posted Double-Entry Wallet Ledger Entries
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 font-semibold uppercase text-[10px]">
                            <th className="py-2 px-3">Ledger ID</th>
                            <th className="py-2 px-3">User Ref ID</th>
                            <th className="py-2 px-3 text-right">Debit (-DR)</th>
                            <th className="py-2 px-3 text-right">Credit (+CR)</th>
                            <th className="py-2 px-3 text-right">Closing Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {traceDetail.ledger_postings?.map((l: any) => (
                            <tr key={l.id} className="hover:bg-slate-50 font-mono">
                              <td className="py-2 px-3 font-bold text-slate-800">#{l.id}</td>
                              <td className="py-2 px-3 text-slate-600">{l.user_ref_id}</td>
                              <td className="py-2 px-3 text-right text-rose-600 font-semibold">{formatCurrency(l.debit_amount)}</td>
                              <td className="py-2 px-3 text-right text-emerald-600 font-semibold">{formatCurrency(l.credit_amount)}</td>
                              <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(l.balance_after)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-slate-400">No trace detail found.</div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={closeDetailDrawer}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition shadow-xs"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
