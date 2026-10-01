"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import {
  Calendar,
  Search,
  Filter,
  ListFilter,
  Columns,
  Download,
  RefreshCw,
  Clock,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ShieldCheck,
  Activity,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Copy,
  Check,
  FileText,
  X,
  ExternalLink,
  Building2,
  Users,
  Wallet,
  CreditCard,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Receipt,
  FileImage,
  DollarSign,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";

export interface TopupReportItem {
  id: string;
  topup_request_id: string;
  requested_amount: number;
  approved_amount?: number | null;
  received_amount?: number | null;
  mdr_charge?: number | null;
  gst_amount?: number | null;
  charges?: number | null;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED" | string;
  payment_reference: string;
  payment_method: string;
  payment_mode?: string;
  card_type?: string;
  card_last_4?: string;
  card_last_4_masked?: string;
  payment_date?: string;
  slip_id?: string;
  slip_url?: string;
  slip_original_filename?: string;
  slip_file_size_bytes?: number;
  retailer_remarks?: string;
  admin_notes?: string;
  rejection_reason?: string;
  submitted_at: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejected_by?: string;
  transaction_reference?: string;
  tenant_id?: string;
  company_id?: string;
  company_name?: string;
  user_type_ref_id?: number;
  user_type?: string;
  user_ref_id?: number;
  retailer_id?: string;
  distributor_id?: string;
  user_code?: string;
  user_name?: string;
  entity_code?: string;
  entity_name?: string;
  mobile?: string;
}

export interface TopupReportSummary {
  total_requests: number;
  total_requested_amount: number;
  total_approved_amount: number;
  total_received_amount: number;
  total_mdr: number;
  total_gst: number;
  total_charges: number;
  pending_count: number;
  pending_amount: number;
  approved_count: number;
  approved_amount: number;
  rejected_count: number;
  rejected_amount: number;
}

export interface TopupReportContext {
  tenant_id?: string | null;
  company_id?: string | null;
  company_name?: string | null;
  user_type_ref_id?: number | null;
  user_type?: string | null;
  user_ref_id?: number | null;
  user_code?: string | null;
  user_name?: string | null;
  role?: string | null;
  current_wallet_balance?: number;
}

interface TopupRequestReportViewProps {
  userRole?: "SUPER_DISTRIBUTOR" | "DISTRIBUTOR" | "RETAILER" | "ADMIN";
  theme?: "light" | "dark" | "auto";
  title?: string;
  subtitle?: string;
}

type DatePreset = "TODAY" | "YESTERDAY" | "7D" | "30D" | "60D" | "90D" | "ALL" | "CUSTOM";
type RowDensity = "compact" | "medium" | "comfortable";

export default function TopupRequestReportView({
  userRole = "RETAILER",
  theme = "light",
  title = "Topup Requests Report",
  subtitle = "Authoritative tracking, hierarchy mapping, approval lifecycle, MDR breakdown & payment slip reconciliation."
}: TopupRequestReportViewProps) {
  // ── States ────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<TopupReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"grid" | "services">("grid");

  // Pagination & Counts
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Summary Metrics & Context
  const [summary, setSummary] = useState<TopupReportSummary>({
    total_requests: 0,
    total_requested_amount: 0,
    total_approved_amount: 0,
    total_received_amount: 0,
    total_mdr: 0,
    total_gst: 0,
    total_charges: 0,
    pending_count: 0,
    pending_amount: 0,
    approved_count: 0,
    approved_amount: 0,
    rejected_count: 0,
    rejected_amount: 0,
  });

  const [apiContext, setApiContext] = useState<TopupReportContext | null>(null);

  // Date Filtering
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Toolbar & Advanced Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>("ALL");
  const [userTypeFilter, setUserTypeFilter] = useState<string>("ALL");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");

  // UI Toggles
  const [density, setDensity] = useState<RowDensity>("medium");
  const [showColumnSelector, setShowColumnSelector] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Detail & Slip Modals
  const [selectedSlip, setSelectedSlip] = useState<{ url: string; title: string; filename?: string } | null>(null);
  const [slipZoom, setSlipZoom] = useState<number>(1);
  const [selectedDetailItem, setSelectedDetailItem] = useState<TopupReportItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Table Columns Visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    request_id: true,
    submitted_at: true,
    entity: true,
    requested_amount: true,
    received_amount: true,
    charges: true,
    payment_mode: true,
    reference: true,
    proof_slip: true,
    status: true,
    remarks: true,
    actions: true,
  });

  // Calculate Date Bounds for Presets
  const getDateRangeForPreset = (preset: DatePreset): { from: string; to: string } => {
    const now = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(now);

    switch (preset) {
      case "TODAY":
        return { from: todayStr, to: todayStr };
      case "YESTERDAY": {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        const yestStr = formatDate(yest);
        return { from: yestStr, to: yestStr };
      }
      case "7D": {
        const past = new Date(now);
        past.setDate(past.getDate() - 6);
        return { from: formatDate(past), to: todayStr };
      }
      case "30D": {
        const past = new Date(now);
        past.setDate(past.getDate() - 29);
        return { from: formatDate(past), to: todayStr };
      }
      case "60D": {
        const past = new Date(now);
        past.setDate(past.getDate() - 59);
        return { from: formatDate(past), to: todayStr };
      }
      case "90D": {
        const past = new Date(now);
        past.setDate(past.getDate() - 89);
        return { from: formatDate(past), to: todayStr };
      }
      case "ALL":
      default:
        return { from: "", to: "" };
    }
  };

  const handleDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === "CUSTOM") {
      setPage(1);
      return;
    }
    const bounds = getDateRangeForPreset(preset);
    setFromDate(bounds.from);
    setToDate(bounds.to);
    setPage(1);
  };

  // Formatted Date Range Display Text
  const displayDateText = (() => {
    if (datePreset === "ALL") return "All Available Records";
    if (datePreset === "TODAY") return "Today";
    if (datePreset === "YESTERDAY") return "Yesterday";
    if (datePreset === "7D") return "Last 7 Days";
    if (datePreset === "30D") return "Last 30 Days";
    if (datePreset === "60D") return "Last 60 Days";
    if (datePreset === "90D") return "Last 90 Days";
    if (fromDate && toDate) return `${fromDate} to ${toDate}`;
    if (fromDate) return `From ${fromDate}`;
    if (toDate) return `Up to ${toDate}`;
    return "Custom Date Range";
  })();

  // ── Fetch Data from API ───────────────────────────────────────────────────
  const fetchData = useCallback(
    async (isManualRefresh = false) => {
      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        const params: Record<string, any> = {
          page,
          limit,
        };

        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }

        if (statusFilter && statusFilter !== "ALL") {
          params.status = statusFilter;
        }

        if (paymentModeFilter && paymentModeFilter !== "ALL") {
          params.payment_mode = paymentModeFilter;
        }

        if (userTypeFilter && userTypeFilter !== "ALL") {
          const typeMap: Record<string, number> = {
            SUPER_DISTRIBUTOR: 4,
            SD: 4,
            DISTRIBUTOR: 3,
            DIST: 3,
            RETAILER: 2,
            RET: 2,
          };
          if (typeMap[userTypeFilter]) {
            params.user_type_ref_id = typeMap[userTypeFilter];
          }
        }

        if (fromDate) params.from_date = fromDate;
        if (toDate) params.to_date = toDate;

        // Hit the unified API endpoint
        const res = await api.get("/api/v1/topup/my-requests", { params });

        if (res.data) {
          const fetchedItems: TopupReportItem[] = res.data.items || [];
          setItems(fetchedItems);
          setTotalRecords(res.data.total ?? fetchedItems.length);
          setTotalPages(res.data.total_pages || Math.max(1, Math.ceil((res.data.total || 1) / limit)));

          if (res.data.summary) {
            setSummary(res.data.summary);
          }
          if (res.data.context) {
            setApiContext(res.data.context);
          }
        }
      } catch (err: any) {
        console.error("Topup report fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, searchTerm, statusFilter, paymentModeFilter, userTypeFilter, fromDate, toDate]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval (30s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setPaymentModeFilter("ALL");
    setUserTypeFilter("ALL");
    setMinAmount("");
    setMaxAmount("");
    handleDatePreset("ALL");
    setPage(1);
  };

  // Active filters count for badge
  const activeFiltersCount =
    (statusFilter !== "ALL" ? 1 : 0) +
    (paymentModeFilter !== "ALL" ? 1 : 0) +
    (userTypeFilter !== "ALL" ? 1 : 0) +
    (minAmount ? 1 : 0) +
    (maxAmount ? 1 : 0) +
    (datePreset !== "ALL" ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Copy to clipboard
  const handleCopy = (text: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!items || items.length === 0) return;
    try {
      setExporting(true);
      const headers = [
        "Request ID",
        "Submitted At",
        "User Type",
        "User Code",
        "User / Store Name",
        "Requested Amount",
        "Approved Amount",
        "Received Amount",
        "MDR Charge",
        "GST Amount",
        "Payment Mode",
        "Reference / UTR",
        "Status",
        "Payment Date",
        "Retailer Remarks",
        "Admin Notes",
        "Rejection Reason",
        "Approved By",
        "Approved At",
      ];

      const rows = items.map((item) => [
        `"${item.topup_request_id || ""}"`,
        `"${item.submitted_at || ""}"`,
        `"${item.user_type || ""}"`,
        `"${item.user_code || ""}"`,
        `"${(item.user_name || "").replace(/"/g, '""')}"`,
        item.requested_amount,
        item.approved_amount ?? item.requested_amount,
        item.received_amount ?? item.requested_amount,
        item.mdr_charge ?? 0,
        item.gst_amount ?? 0,
        `"${item.payment_method || item.payment_mode || ""}"`,
        `"${item.payment_reference || ""}"`,
        `"${item.status || ""}"`,
        `"${item.payment_date || ""}"`,
        `"${(item.retailer_remarks || "").replace(/"/g, '""')}"`,
        `"${(item.admin_notes || "").replace(/"/g, '""')}"`,
        `"${(item.rejection_reason || "").replace(/"/g, '""')}"`,
        `"${item.approved_by || ""}"`,
        `"${item.approved_at || ""}"`,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Topup_Requests_Report_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Export error:", e);
    } finally {
      setExporting(false);
    }
  };

  // Currency Formatter
  const formatCurrency = (val?: number | null) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format Date & Time
  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Approved
        </span>
      );
    }
    if (s === "PENDING" || s === "UNDER_REVIEW") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          {s === "UNDER_REVIEW" ? "Under Review" : "Pending"}
        </span>
      );
    }
    if (s === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3 text-rose-600" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <AlertCircle className="w-3 h-3 text-slate-500" />
        {status || "UNKNOWN"}
      </span>
    );
  };

  // Theme styling tokens
  const isDark = theme === "dark";
  const bgMain = isDark ? "bg-[#090D16] text-slate-100" : "bg-slate-50/70 text-slate-900";
  const cardBg = isDark ? "bg-[#131b2e]/90 border-white/[0.08]" : "bg-white border-slate-200";
  const textTitle = isDark ? "text-white" : "text-slate-900";
  const textSub = isDark ? "text-slate-400" : "text-slate-500";
  const borderSub = isDark ? "border-white/[0.08]" : "border-slate-200";
  const hoverRow = isDark ? "hover:bg-white/[0.03]" : "hover:bg-slate-50/80";

  return (
    <div ref={containerRef} className={`space-y-4 p-2 sm:p-4 rounded-2xl ${bgMain} font-sans`}>
      {/* ── TOP BANNER: Exact Transaction Page Header Structure ──────────────── */}
      <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 rounded-xl border shadow-xs ${cardBg}`}>
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-0.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Topup Request & Settlement Audit Engine
            {apiContext?.company_name && (
              <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                {apiContext.company_name}
              </span>
            )}
          </div>
          <h1 className={`text-xl md:text-2xl font-bold flex items-center gap-2 ${textTitle}`}>
            {title}
          </h1>
          <p className={`text-xs mt-0.5 ${textSub}`}>
            {subtitle}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* View Mode Toggle */}
          <div className={`p-1 rounded-xl flex items-center border ${isDark ? "bg-[#0d1424] border-white/[0.08]" : "bg-slate-100 border-slate-200"}`}>
            <button
              onClick={() => setActiveTab("grid")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "grid"
                  ? isDark
                    ? "bg-[#1e293b] text-white shadow-xs"
                    : "bg-white text-slate-900 shadow-xs"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Audit Grid
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "services"
                  ? isDark
                    ? "bg-[#1e293b] text-white shadow-xs"
                    : "bg-white text-slate-900 shadow-xs"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Mode Breakdown
            </button>
          </div>
        </div>
      </div>

      {/* ── HEADER BAR 1: Exact Date Range Pill Bar ──────────────────────────── */}
      <div className={`border rounded-xl p-3 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3 ${cardBg}`}>
        {/* Left Side: Calendar icon + Date Range + Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className={`flex items-center gap-1.5 text-xs font-bold ${textTitle}`}>
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
                  : isDark
                  ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
                  : isDark
                  ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
                  : isDark
                  ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
                  : isDark
                  ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
                  : isDark
                  ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
                  : isDark
                  ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
                  : isDark
                  ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
                  : isDark
                  ? "bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Right Side: Showing records text */}
        <div className={`text-xs ${textSub}`}>
          Showing records for <span className={`font-bold ${textTitle}`}>{displayDateText}</span>
        </div>
      </div>

      {/* ── Custom Range Inputs (collapsible if Custom Range active) ──────────── */}
      {datePreset === "CUSTOM" && (
        <div className={`border rounded-xl p-3 px-4 flex items-center flex-wrap gap-3 animate-in fade-in duration-200 ${cardBg}`}>
          <span className={`text-xs font-semibold ${textSub}`}>Select Custom Bounds:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs rounded-lg border ${
              isDark ? "bg-[#0d1424] border-white/[0.12] text-white" : "bg-white border-slate-300 text-slate-800"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <span className={`text-xs font-medium ${textSub}`}>to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs rounded-lg border ${
              isDark ? "bg-[#0d1424] border-white/[0.12] text-white" : "bg-white border-slate-300 text-slate-800"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button
            onClick={() => handleDatePreset("TODAY")}
            className="px-2.5 py-1 text-xs text-blue-600 hover:underline ml-auto"
          >
            Reset to Today
          </button>
        </div>
      )}

      {/* ── HEADER BAR 2: Search, Filter, Density, Columns, Export Bar ──────── */}
      <div className={`border rounded-xl p-2.5 px-4 shadow-xs flex flex-wrap items-center justify-between gap-3 ${cardBg}`}>
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
              placeholder="Search Request ID, UTR, Mode, Remarks..."
              className={`w-full pl-9 pr-7 py-1.5 text-xs rounded-lg border ${
                isDark
                  ? "bg-[#0d1424] border-white/[0.12] text-white placeholder-slate-500"
                  : "bg-white border-slate-200 text-slate-800 placeholder-slate-400"
              } focus:outline-none focus:ring-2 focus:ring-blue-500 transition`}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
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
                : isDark
                ? "border-white/[0.1] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-2xs ${
              isDark
                ? "border-white/[0.1] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
            title="Toggle Row Density"
          >
            <ListFilter className="w-3.5 h-3.5 text-slate-500" />
            <span className="capitalize">{density}</span>
          </button>

          {/* Columns Button */}
          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-2xs ${
                showColumnSelector
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : isDark
                  ? "border-white/[0.1] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                  : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              }`}
            >
              <Columns className="w-3.5 h-3.5 text-slate-500" />
              <span>Columns</span>
            </button>

            {/* Column Selector Dropdown */}
            {showColumnSelector && (
              <div
                className={`absolute left-0 mt-2 w-56 rounded-xl border p-3 shadow-xl z-50 animate-in fade-in duration-150 ${
                  isDark ? "bg-[#0d1424] border-white/[0.12] text-slate-200" : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                <div className="text-xs font-bold mb-2 pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span>Toggle Columns</span>
                  <button
                    onClick={() => setShowColumnSelector(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto text-xs">
                  {Object.entries({
                    request_id: "Request ID",
                    submitted_at: "Date & Time",
                    entity: "User & Store Info",
                    requested_amount: "Requested Amount",
                    received_amount: "Approved / Received",
                    charges: "MDR & GST",
                    payment_mode: "Payment Mode",
                    reference: "Reference / UTR",
                    proof_slip: "Payment Slip",
                    status: "Status",
                    remarks: "Remarks & Notes",
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-blue-600">
                      <input
                        type="checkbox"
                        checked={visibleColumns[key] ?? true}
                        onChange={(e) =>
                          setVisibleColumns((prev) => ({
                            ...prev,
                            [key]: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <button
            onClick={handleExportCSV}
            disabled={exporting || loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition shadow-2xs ${
              isDark
                ? "border-white/[0.1] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
          >
            {exporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Export CSV</span>
          </button>

          {/* Separator */}
          <div className="h-5 w-px bg-slate-200 mx-0.5 hidden sm:block" />

          {/* Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className={`p-1.5 rounded-lg border transition shadow-2xs ${
              isDark
                ? "border-white/[0.1] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            }`}
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition shadow-2xs ${
              autoRefresh
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : isDark
                ? "border-white/[0.1] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            }`}
            title="Auto Refresh Every 30s"
          >
            <Clock className={`w-3.5 h-3.5 ${autoRefresh ? "text-emerald-600 animate-spin" : "text-slate-500"}`} />
            <span>Auto</span>
          </button>

          {/* Fullscreen Expand */}
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg border transition shadow-2xs ${
              isDark
                ? "border-white/[0.1] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            }`}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Right Side: Total Records Count */}
        <div className={`text-xs font-bold ${textTitle}`}>
          {totalRecords > 0 ? `${totalRecords.toLocaleString("en-IN")} records` : "0 records"}
        </div>
      </div>

      {/* ── Expandable Filter Drawer (when Filter button clicked) ─────────────── */}
      {showFilterDrawer && (
        <div className={`p-4 rounded-xl border shadow-sm space-y-3 animate-in slide-in-from-top-2 duration-200 ${cardBg}`}>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className={`text-xs font-bold flex items-center gap-1.5 ${textTitle}`}>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Status Filter */}
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${textSub}`}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                  isDark ? "bg-[#0d1424] border-white/[0.12] text-white" : "bg-white border-slate-300 text-slate-800"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending Approval</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Payment Mode Filter */}
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${textSub}`}>
                Payment Mode
              </label>
              <select
                value={paymentModeFilter}
                onChange={(e) => {
                  setPaymentModeFilter(e.target.value);
                  setPage(1);
                }}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                  isDark ? "bg-[#0d1424] border-white/[0.12] text-white" : "bg-white border-slate-300 text-slate-800"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="ALL">All Modes</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="IMPS">IMPS Bank Transfer</option>
                <option value="NEFT">NEFT Transfer</option>
                <option value="RTGS">RTGS Transfer</option>
                <option value="BANK_TRANSFER">Bank Transfer (Cash/Dep)</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
              </select>
            </div>

            {/* User Type Filter (For Admins / SD / Dist) */}
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${textSub}`}>
                User Role / Hierarchy
              </label>
              <select
                value={userTypeFilter}
                onChange={(e) => {
                  setUserTypeFilter(e.target.value);
                  setPage(1);
                }}
                className={`w-full px-3 py-1.5 text-xs rounded-lg border ${
                  isDark ? "bg-[#0d1424] border-white/[0.12] text-white" : "bg-white border-slate-300 text-slate-800"
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="ALL">All Users</option>
                <option value="SUPER_DISTRIBUTOR">Super Distributor (SD)</option>
                <option value="DISTRIBUTOR">Distributor</option>
                <option value="RETAILER">Retailer</option>
              </select>
            </div>

            {/* Dynamic Context Tag */}
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${textSub}`}>
                Active Tenant / Company
              </label>
              <div
                className={`px-3 py-1.5 text-xs rounded-lg border font-mono truncate ${
                  isDark ? "bg-white/[0.04] border-white/[0.1] text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                {apiContext?.company_name || apiContext?.company_id || "Multi-Tenant Dynamic"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Volume */}
        <div className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between ${cardBg}`}>
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Requests</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className={`mt-2 text-lg sm:text-xl font-bold ${textTitle}`}>
            {summary.total_requests.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">
            {formatCurrency(summary.total_requested_amount)}
          </div>
        </div>

        {/* Approved Amount */}
        <div className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between ${isDark ? "bg-emerald-950/20 border-emerald-500/20" : "bg-emerald-50/40 border-emerald-200"}`}>
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span>Approved</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-emerald-600">
            {formatCurrency(summary.total_approved_amount)}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1">
            {summary.approved_count.toLocaleString("en-IN")} Approved
          </div>
        </div>

        {/* Pending Requests */}
        <div className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between ${isDark ? "bg-amber-950/20 border-amber-500/20" : "bg-amber-50/40 border-amber-200"}`}>
          <div className="flex items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-400">
            <span>Pending Review</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-amber-600">
            {formatCurrency(summary.pending_amount)}
          </div>
          <div className="text-[11px] text-amber-600/80 mt-1">
            {summary.pending_count.toLocaleString("en-IN")} Pending
          </div>
        </div>

        {/* Rejected Requests */}
        <div className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between ${isDark ? "bg-rose-950/20 border-rose-500/20" : "bg-rose-50/40 border-rose-200"}`}>
          <div className="flex items-center justify-between text-xs font-medium text-rose-700 dark:text-rose-400">
            <span>Rejected</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-rose-600">
            {formatCurrency(summary.rejected_amount)}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-1">
            {summary.rejected_count.toLocaleString("en-IN")} Rejected
          </div>
        </div>

        {/* MDR & GST Deductions */}
        <div className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between ${isDark ? "bg-purple-950/20 border-purple-500/20" : "bg-purple-50/40 border-purple-200"}`}>
          <div className="flex items-center justify-between text-xs font-medium text-purple-700 dark:text-purple-400">
            <span>MDR & GST</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-purple-600">
            {formatCurrency(summary.total_charges || summary.total_mdr + summary.total_gst)}
          </div>
          <div className="text-[11px] text-purple-600/80 mt-1">
            MDR: {formatCurrency(summary.total_mdr)} | GST: {formatCurrency(summary.total_gst)}
          </div>
        </div>

        {/* Net Settlement Received */}
        <div className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between ${isDark ? "bg-cyan-950/20 border-cyan-500/20" : "bg-cyan-50/40 border-cyan-200"}`}>
          <div className="flex items-center justify-between text-xs font-medium text-cyan-700 dark:text-cyan-400">
            <span>Net Received</span>
            <Wallet className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-cyan-600">
            {formatCurrency(summary.total_received_amount)}
          </div>
          <div className="text-[11px] text-cyan-600/80 mt-1">
            Authoritative Wallet Credit
          </div>
        </div>
      </div>

      {/* ── Mode Breakdown / Analytics View (if Services Tab Selected) ────────── */}
      {activeTab === "services" && (
        <div className={`p-5 rounded-xl border shadow-xs space-y-4 ${cardBg}`}>
          <h2 className={`text-sm font-bold flex items-center gap-2 ${textTitle}`}>
            <Receipt className="w-4 h-4 text-blue-600" />
            Topup Payment Channel & Settlement Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${borderSub}`}>
              <div className="text-xs font-bold text-slate-500 uppercase">Settlement Rate</div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-600">
                {summary.total_requests > 0
                  ? `${Math.round((summary.approved_count / summary.total_requests) * 100)}%`
                  : "0%"}
              </div>
              <p className={`text-xs mt-1 ${textSub}`}>
                {summary.approved_count} of {summary.total_requests} requests successfully reconciled.
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${borderSub}`}>
              <div className="text-xs font-bold text-slate-500 uppercase">Average Ticket Size</div>
              <div className="mt-2 text-2xl font-extrabold text-blue-600">
                {summary.total_requests > 0
                  ? formatCurrency(summary.total_requested_amount / summary.total_requests)
                  : "₹0.00"}
              </div>
              <p className={`text-xs mt-1 ${textSub}`}>Average topup value per submission.</p>
            </div>

            <div className={`p-4 rounded-xl border ${borderSub}`}>
              <div className="text-xs font-bold text-slate-500 uppercase">Pending In-Flight Amount</div>
              <div className="mt-2 text-2xl font-extrabold text-amber-500">
                {formatCurrency(summary.pending_amount)}
              </div>
              <p className={`text-xs mt-1 ${textSub}`}>Awaiting gateway confirmation or admin audit.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── DATA GRID / AUDIT TABLE ─────────────────────────────────────────── */}
      {activeTab === "grid" && (
        <div className={`border rounded-xl shadow-xs overflow-hidden ${cardBg}`}>
          <div className="overflow-x-auto min-h-[380px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? "bg-white/[0.04] text-slate-400 border-white/[0.08]" : "bg-slate-50 text-slate-600 border-slate-200"
                }`}>
                  {visibleColumns.request_id && <th className="p-3 pl-4">Request ID</th>}
                  {visibleColumns.submitted_at && <th className="p-3">Submitted At</th>}
                  {visibleColumns.entity && <th className="p-3">User & Store</th>}
                  {visibleColumns.requested_amount && <th className="p-3 text-right">Requested</th>}
                  {visibleColumns.received_amount && <th className="p-3 text-right">Net Received</th>}
                  {visibleColumns.charges && <th className="p-3 text-right">Charges</th>}
                  {visibleColumns.payment_mode && <th className="p-3">Payment Mode</th>}
                  {visibleColumns.reference && <th className="p-3">Reference / UTR</th>}
                  {visibleColumns.proof_slip && <th className="p-3 text-center">Slip Proof</th>}
                  {visibleColumns.status && <th className="p-3 text-center">Status</th>}
                  {visibleColumns.remarks && <th className="p-3">Remarks / Notes</th>}
                  {visibleColumns.actions && <th className="p-3 pr-4 text-center">Audit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-7 h-7 mx-auto animate-spin text-blue-600 mb-2" />
                      <div className="font-semibold text-sm">Fetching Authoritative Topup Records...</div>
                      <div className="text-xs text-slate-400 mt-1">Connecting to live database ledger</div>
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <div className="font-semibold text-sm text-slate-600 dark:text-slate-400">
                        No topup records match the specified filters
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Try clearing search bounds, resetting date presets, or changing status filter.
                      </div>
                      <button
                        onClick={handleResetFilters}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 transition"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const rowPad =
                      density === "compact" ? "py-1.5 px-3" : density === "comfortable" ? "py-4 px-3" : "py-2.5 px-3";

                    return (
                      <tr key={row.id || row.topup_request_id} className={`transition-colors ${hoverRow}`}>
                        {/* Request ID */}
                        {visibleColumns.request_id && (
                          <td className={`${rowPad} pl-4 font-mono font-medium text-blue-600 whitespace-nowrap`}>
                            <div className="flex items-center gap-1.5">
                              <span>{row.topup_request_id}</span>
                              <button
                                onClick={() => handleCopy(row.topup_request_id, row.topup_request_id)}
                                className="text-slate-400 hover:text-blue-600 transition"
                                title="Copy Request ID"
                              >
                                {copiedId === row.topup_request_id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                        )}

                        {/* Submitted At */}
                        {visibleColumns.submitted_at && (
                          <td className={`${rowPad} whitespace-nowrap ${textSub}`}>
                            {formatDateTime(row.submitted_at)}
                          </td>
                        )}

                        {/* User & Store */}
                        {visibleColumns.entity && (
                          <td className={`${rowPad} whitespace-nowrap`}>
                            <div className={`font-semibold ${textTitle}`}>
                              {row.user_name || row.entity_name || "Authorized Partner"}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <span className="font-mono">{row.user_code || "USER-LIVE"}</span>
                              {row.user_type && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-slate-300">
                                  {row.user_type === "SUPER_DISTRIBUTOR"
                                    ? "SD"
                                    : row.user_type === "DISTRIBUTOR"
                                    ? "DIST"
                                    : "RET"}
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Requested Amount */}
                        {visibleColumns.requested_amount && (
                          <td className={`${rowPad} text-right font-bold whitespace-nowrap ${textTitle}`}>
                            {formatCurrency(row.requested_amount)}
                          </td>
                        )}

                        {/* Net Received / Approved Amount */}
                        {visibleColumns.received_amount && (
                          <td className={`${rowPad} text-right whitespace-nowrap font-bold text-emerald-600`}>
                            {formatCurrency(row.received_amount ?? row.approved_amount ?? row.requested_amount)}
                          </td>
                        )}

                        {/* Charges */}
                        {visibleColumns.charges && (
                          <td className={`${rowPad} text-right whitespace-nowrap text-purple-600 font-medium`}>
                            {row.charges || row.mdr_charge || row.gst_amount
                              ? formatCurrency(row.charges || (row.mdr_charge || 0) + (row.gst_amount || 0))
                              : "₹0.00"}
                          </td>
                        )}

                        {/* Payment Mode */}
                        {visibleColumns.payment_mode && (
                          <td className={`${rowPad} whitespace-nowrap`}>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                              <CreditCard className="w-3 h-3 text-slate-500" />
                              <span>{row.payment_method || row.payment_mode || "UPI"}</span>
                            </div>
                            {row.card_last_4_masked && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Card: {row.card_last_4_masked}
                              </div>
                            )}
                          </td>
                        )}

                        {/* Reference / UTR */}
                        {visibleColumns.reference && (
                          <td className={`${rowPad} font-mono whitespace-nowrap text-slate-700 dark:text-slate-300`}>
                            {row.payment_reference ? (
                              <div className="flex items-center gap-1.5">
                                <span className="truncate max-w-[120px]">{row.payment_reference}</span>
                                <button
                                  onClick={() => handleCopy(row.payment_reference, `ref-${row.id}`)}
                                  className="text-slate-400 hover:text-blue-600 transition"
                                  title="Copy UTR / Reference"
                                >
                                  {copiedId === `ref-${row.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        )}

                        {/* Proof Slip */}
                        {visibleColumns.proof_slip && (
                          <td className={`${rowPad} text-center whitespace-nowrap`}>
                            {row.slip_url ? (
                              <button
                                onClick={() =>
                                  setSelectedSlip({
                                    url: row.slip_url!,
                                    title: `Slip Proof: ${row.topup_request_id}`,
                                    filename: row.slip_original_filename,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                              >
                                <FileImage className="w-3 h-3 text-blue-600" />
                                <span>View Slip</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">No Slip</span>
                            )}
                          </td>
                        )}

                        {/* Status */}
                        {visibleColumns.status && (
                          <td className={`${rowPad} text-center whitespace-nowrap`}>
                            {renderStatusBadge(row.status)}
                          </td>
                        )}

                        {/* Remarks / Notes */}
                        {visibleColumns.remarks && (
                          <td className={`${rowPad} max-w-[160px] truncate ${textSub}`}>
                            {row.rejection_reason ? (
                              <span className="text-rose-600 font-medium">Rej: {row.rejection_reason}</span>
                            ) : row.admin_notes ? (
                              <span>Admin: {row.admin_notes}</span>
                            ) : row.retailer_remarks ? (
                              <span>{row.retailer_remarks}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        )}

                        {/* Audit Action Button */}
                        {visibleColumns.actions && (
                          <td className={`${rowPad} pr-4 text-center whitespace-nowrap`}>
                            <button
                              onClick={() => setSelectedDetailItem(row)}
                              className="p-1 rounded-lg border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 transition"
                              title="Audit Trail Details"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
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

          {/* ── PAGINATION BAR ────────────────────────────────────────────────── */}
          <div className={`p-3 px-4 border-t flex flex-wrap items-center justify-between gap-3 ${
            isDark ? "bg-white/[0.02] border-white/[0.08]" : "bg-slate-50/70 border-slate-200"
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${textSub}`}>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className={`text-xs px-2 py-1 rounded-md border ${
                  isDark ? "bg-[#0d1424] border-white/[0.12] text-white" : "bg-white border-slate-300 text-slate-800"
                } focus:outline-none`}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className={`text-xs ${textSub} ml-2`}>
                Showing {totalRecords === 0 ? 0 : (page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalRecords)} of {totalRecords.toLocaleString("en-IN")} entries
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className={`p-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition ${
                  isDark ? "border-white/[0.1] bg-white/[0.04] text-slate-300" : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className={`text-xs px-2 font-semibold ${textTitle}`}>
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className={`p-1.5 rounded-lg border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition ${
                  isDark ? "border-white/[0.1] bg-white/[0.04] text-slate-300" : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYMENT SLIP PREVIEW MODAL ─────────────────────────────────────── */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`relative max-w-3xl w-full rounded-2xl border shadow-2xl p-5 ${cardBg} max-h-[90vh] flex flex-col`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.1]">
              <div className="flex items-center gap-2">
                <FileImage className="w-5 h-5 text-blue-600" />
                <h3 className={`text-sm font-bold ${textTitle}`}>{selectedSlip.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSlipZoom((z) => Math.min(z + 0.25, 3))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSlipZoom((z) => Math.max(z - 0.25, 0.5))}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSlipZoom(1)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <a
                  href={selectedSlip.url}
                  download={selectedSlip.filename || "payment-slip.jpg"}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50"
                  title="Download Slip"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => {
                    setSelectedSlip(null);
                    setSlipZoom(1);
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="mt-3 flex-1 overflow-auto flex items-center justify-center p-2 bg-slate-900/10 rounded-xl min-h-[300px]">
              {selectedSlip.url.endsWith(".pdf") ? (
                <iframe src={selectedSlip.url} className="w-full h-[500px] rounded-lg" />
              ) : (
                <img
                  src={selectedSlip.url}
                  alt="Proof Slip"
                  style={{ transform: `scale(${slipZoom})`, transformOrigin: "center" }}
                  className="max-h-[550px] max-w-full object-contain rounded-lg transition-transform duration-200"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT DETAIL MODAL ─────────────────────────────────────────────── */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`relative max-w-xl w-full rounded-2xl border shadow-2xl p-5 ${cardBg} max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/[0.1]">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className={`text-base font-bold ${textTitle}`}>Topup Request Audit File</h3>
              </div>
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04]">
                <div>
                  <span className="text-slate-400 block">Request ID</span>
                  <span className="font-mono font-bold text-blue-600">{selectedDetailItem.topup_request_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status</span>
                  <span>{renderStatusBadge(selectedDetailItem.status)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Submitted At</span>
                  <span className="font-medium">{formatDateTime(selectedDetailItem.submitted_at)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Payment Mode</span>
                  <span className="font-semibold">{selectedDetailItem.payment_method || "UPI"}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04]">
                <div>
                  <span className="text-slate-400 block">Requested Amount</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(selectedDetailItem.requested_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Charges (MDR+GST)</span>
                  <span className="font-bold text-purple-600">
                    {formatCurrency(selectedDetailItem.charges || (selectedDetailItem.mdr_charge || 0) + (selectedDetailItem.gst_amount || 0))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Net Received</span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(selectedDetailItem.received_amount ?? selectedDetailItem.requested_amount)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] space-y-1">
                <span className="text-slate-400 block">Reference / UTR</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 break-all">
                  {selectedDetailItem.payment_reference || "N/A"}
                </span>
              </div>

              {selectedDetailItem.retailer_remarks && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04]">
                  <span className="text-slate-400 block mb-1">User Remarks</span>
                  <p className="text-slate-700 dark:text-slate-300">{selectedDetailItem.retailer_remarks}</p>
                </div>
              )}

              {selectedDetailItem.admin_notes && (
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                  <span className="text-blue-700 font-bold block mb-1">Admin Audit Notes</span>
                  <p className="text-slate-700">{selectedDetailItem.admin_notes}</p>
                </div>
              )}

              {selectedDetailItem.rejection_reason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                  <span className="text-rose-700 font-bold block mb-1">Rejection Reason</span>
                  <p className="text-rose-800">{selectedDetailItem.rejection_reason}</p>
                </div>
              )}

              {selectedDetailItem.approved_by && (
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-2 border-t">
                  <div>Approved By: <span className="font-bold text-slate-700">{selectedDetailItem.approved_by}</span></div>
                  <div>Approved At: <span className="font-bold text-slate-700">{formatDateTime(selectedDetailItem.approved_at)}</span></div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Close File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
