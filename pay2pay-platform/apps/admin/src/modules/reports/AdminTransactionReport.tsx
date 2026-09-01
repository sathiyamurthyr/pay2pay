"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  Filter,
  Columns,
  Download,
  RefreshCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  Check,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  FileCode,
  Printer,
  Calendar,
  Clock,
  LayoutList,
  AlignJustify,
  List,
  Layers,
  Building2,
  User,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Copy,
  ExternalLink,
  Share2,
  Mail,
  Receipt,
  Eye,
  SlidersHorizontal,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Wallet,
} from "lucide-react";
import * as XLSX from "xlsx";

import {
  AdminTransactionReportAPI,
  AdminTransactionItem,
  AdminTransactionSummary,
  AdminTransactionFiltersResponse,
  AdminTransactionDetail,
  AdminTransactionQueryParams,
} from "@/services/admin-transaction-report-api";

// Format currency in Indian Rupees
const formatINR = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

type Density = "compact" | "medium" | "comfortable";
type DatePreset = "today" | "yesterday" | "7d" | "30d" | "60d" | "90d" | "custom" | "all";

const DENSITY_CONFIG: Record<Density, { rowH: string; py: string; fontSize: string; label: string; icon: any }> = {
  compact:     { rowH: "h-8",  py: "py-1",   fontSize: "text-[11.5px]", label: "Compact",     icon: List },
  medium:      { rowH: "h-10", py: "py-2",   fontSize: "text-[12.5px]", label: "Medium",      icon: AlignJustify },
  comfortable: { rowH: "h-12", py: "py-3",   fontSize: "text-[13.5px]", label: "Comfortable", icon: LayoutList },
};

export default function AdminTransactionReport() {
  // ── Core Data States ──
  const [items, setItems] = useState<AdminTransactionItem[]>([]);
  const [summary, setSummary] = useState<AdminTransactionSummary | null>(null);
  const [filterOptions, setFilterOptions] = useState<AdminTransactionFiltersResponse>({
    companies: [],
    user_types: [],
    services: [],
    vendors: [],
    sources: [],
    statuses: [],
  });

  // ── Filter States ──
  const [companyId, setCompanyId] = useState<string>("ALL");
  const [userType, setUserType] = useState<string>("ALL");
  const [userId, setUserId] = useState<string>("ALL");
  const [vendorName, setVendorName] = useState<string>("ALL");
  const [serviceName, setServiceName] = useState<string>("ALL");
  const [transactionSource, setTransactionSource] = useState<string>("ALL");
  const [transactionType, setTransactionType] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("today");

  // ── Pagination & Sorting ──
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // ── UI States ──
  const [loading, setLoading] = useState<boolean>(true);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [showDensity, setShowDensity] = useState<boolean>(false);
  const [showColumnChooser, setShowColumnChooser] = useState<boolean>(false);
  const [showExport, setShowExport] = useState<boolean>(false);
  const [density, setDensity] = useState<Density>("medium");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ open: boolean; message: string; severity: "success" | "error" | "info" }>({
    open: false,
    message: "",
    severity: "info",
  });

  // ── Column Visibility State ──
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(["service_reference"]));

  // ── Drawer Detail State ──
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedTxn, setSelectedTxn] = useState<AdminTransactionDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);

  // ── User Search Typeahead ──
  const [userSearchOptions, setUserSearchOptions] = useState<any[]>([]);
  const [userSearchInput, setUserSearchInput] = useState<string>("");
  const [userSearchLoading, setUserSearchLoading] = useState<boolean>(false);
  const [selectedUserObj, setSelectedUserObj] = useState<any | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Date Formatting Helpers ──
  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper to calculate date range for presets
  const applyDatePreset = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();

    if (preset === "today") {
      const str = formatDateStr(now);
      setFromDate(str);
      setToDate(str);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(now.getDate() - 1);
      const str = formatDateStr(y);
      setFromDate(str);
      setToDate(str);
    } else if (preset === "7d") {
      const f = new Date();
      f.setDate(now.getDate() - 7);
      setFromDate(formatDateStr(f));
      setToDate(formatDateStr(now));
    } else if (preset === "30d") {
      const f = new Date();
      f.setDate(now.getDate() - 30);
      setFromDate(formatDateStr(f));
      setToDate(formatDateStr(now));
    } else if (preset === "60d") {
      const f = new Date();
      f.setDate(now.getDate() - 60);
      setFromDate(formatDateStr(f));
      setToDate(formatDateStr(now));
    } else if (preset === "90d") {
      const f = new Date();
      f.setDate(now.getDate() - 90);
      setFromDate(formatDateStr(f));
      setToDate(formatDateStr(now));
    } else if (preset === "all") {
      setFromDate("");
      setToDate("");
    }
    setPage(0);
  }, []);

  // Initialize with Today on first load
  useEffect(() => {
    applyDatePreset("today");
  }, [applyDatePreset]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        fetchData();
        fetchSummary();
      }, 30000);
    } else {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, companyId, userType, userId, selectedUserObj, vendorName, serviceName, transactionSource, transactionType, statusFilter, fromDate, toDate, minAmount, maxAmount, debouncedSearch, sortBy, sortOrder, page, rowsPerPage]);

  // Load initial filter metadata
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await AdminTransactionReportAPI.getFilterOptions();
        if (res.success && res.data) {
          setFilterOptions(res.data);
        }
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    };
    loadFilters();
  }, []);

  // Build Query Object
  const queryParams = useMemo<AdminTransactionQueryParams>(() => {
    return {
      company_id: companyId,
      user_type: userType,
      user_id: selectedUserObj ? selectedUserObj.id : (userId !== "ALL" ? userId : undefined),
      vendor_name: vendorName,
      service_name: serviceName,
      transaction_source: transactionSource,
      transaction_type: transactionType,
      status: statusFilter,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      min_amount: minAmount ? parseFloat(minAmount) : undefined,
      max_amount: maxAmount ? parseFloat(maxAmount) : undefined,
      search: debouncedSearch || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      page: page + 1,
      limit: rowsPerPage,
    };
  }, [
    companyId,
    userType,
    userId,
    selectedUserObj,
    vendorName,
    serviceName,
    transactionSource,
    transactionType,
    statusFilter,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
    debouncedSearch,
    sortBy,
    sortOrder,
    page,
    rowsPerPage,
  ]);

  // Fetch paginated transactions
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminTransactionReportAPI.getTransactions(queryParams);
      if (res.success && res.data) {
        setItems(res.data.items || []);
        setTotalRecords(res.data.total || 0);
      } else {
        setItems([]);
        setTotalRecords(0);
      }
    } catch (err) {
      console.error("Failed to fetch transactions", err);
      setToastMsg({
        open: true,
        message: "Failed to load transaction data from backend.",
        severity: "error",
      });
      setItems([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  // Fetch KPI Summary
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await AdminTransactionReportAPI.getSummary(queryParams);
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch summary", err);
    } finally {
      setSummaryLoading(false);
    }
  }, [queryParams]);

  // Fetch on parameter change
  useEffect(() => {
    fetchData();
    fetchSummary();
  }, [fetchData, fetchSummary]);

  // User search autocomplete debounce
  useEffect(() => {
    if (!userSearchInput || userSearchInput.length < 2) {
      setUserSearchOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const res = await AdminTransactionReportAPI.searchUsers(userSearchInput);
        if (res.success && res.data) {
          setUserSearchOptions(res.data);
        }
      } catch (e) {
        console.error("Error searching users", e);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchInput]);

  // Open Drawer and fetch details
  const handleOpenDetail = async (txnId: string) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    try {
      const res = await AdminTransactionReportAPI.getTransactionDetail(txnId);
      if (res.success && res.data) {
        setSelectedTxn(res.data);
      } else {
        setSelectedTxn(null);
      }
    } catch (err) {
      console.error("Failed to fetch transaction detail", err);
      setSelectedTxn(null);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setCompanyId("ALL");
    setUserType("ALL");
    setUserId("ALL");
    setSelectedUserObj(null);
    setVendorName("ALL");
    setServiceName("ALL");
    setTransactionSource("ALL");
    setTransactionType("ALL");
    setStatusFilter("ALL");
    setMinAmount("");
    setMaxAmount("");
    setSearch("");
    applyDatePreset("today");
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (companyId !== "ALL") count++;
    if (userType !== "ALL") count++;
    if (selectedUserObj || userId !== "ALL") count++;
    if (vendorName !== "ALL") count++;
    if (serviceName !== "ALL") count++;
    if (transactionSource !== "ALL") count++;
    if (transactionType !== "ALL") count++;
    if (statusFilter !== "ALL") count++;
    if (minAmount) count++;
    if (maxAmount) count++;
    if (datePreset === "custom" && (fromDate || toDate)) count++;
    return count;
  }, [
    companyId,
    userType,
    selectedUserObj,
    userId,
    vendorName,
    serviceName,
    transactionSource,
    transactionType,
    statusFilter,
    minAmount,
    maxAmount,
    datePreset,
    fromDate,
    toDate,
  ]);

  // Export Data Handlers
  const handleExport = async (format: "csv" | "excel" | "json" | "print" | "whatsapp" | "email" | "link") => {
    setShowExport(false);

    if (format === "link") {
      navigator.clipboard.writeText(window.location.href);
      setToastMsg({ open: true, message: "🔗 Direct report link copied to clipboard!", severity: "success" });
      return;
    }

    if (format === "print") {
      window.print();
      return;
    }

    if (format === "whatsapp") {
      const text = `📊 Pay2Pay Transaction Report\nPeriod: ${fromDate || 'All'} to ${toDate || 'All'}\nTotal Volume: ${formatINR(summary?.total_amount)}\nTotal Txns: ${summary?.total_count || totalRecords}\nLink: ${window.location.href}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      return;
    }

    if (format === "email") {
      const subject = encodeURIComponent("Pay2Pay Transaction & Ledger Report");
      const body = encodeURIComponent(`Hello Team,\n\nPlease find the transaction ledger report summary:\nTotal Volume: ${formatINR(summary?.total_amount)}\nTotal Count: ${summary?.total_count || totalRecords}\nSuccessful: ${summary?.successful_count || 0}\nFailed: ${summary?.failed_count || 0}\n\nDirect Link: ${window.location.href}\n\nRegards,\nPay2Pay Enterprise Portal`);
      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
      return;
    }

    setExporting(true);
    try {
      const exportRows = selectedKeys.size > 0
        ? items.filter((r) => selectedKeys.has(r.id || r.txn_id))
        : items;

      if (format === "csv") {
        const url = AdminTransactionReportAPI.getExportUrl(queryParams);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transactions_export_${fromDate || 'all'}_${toDate || 'all'}.csv`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setToastMsg({ open: true, message: "Downloading CSV export from authoritative backend...", severity: "success" });
      } else if (format === "excel") {
        const formattedData = exportRows.map((r) => ({
          "Date": r.date,
          "Time": r.time,
          "Transaction ID": r.txn_id,
          "Company": r.company_name,
          "User Name": r.user_name,
          "User Mobile": r.user_mobile,
          "User Type": r.user_type,
          "Vendor": r.vendor_name,
          "Service": r.service_name,
          "Txn Source": r.transaction_source,
          "CR / DR": r.entry_type,
          "Amount (INR)": r.amount,
          "Credit (CR)": r.cr,
          "Debit (DR)": r.dr,
          "Opening Balance": r.opening_balance,
          "Closing Balance": r.closing_balance,
          "Status": r.status,
          "Service Ref": r.service_reference,
          "Narration": r.narration,
        }));
        const ws = XLSX.utils.json_to_sheet(formattedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, `Pay2Pay_Transactions_${fromDate || 'all'}_${toDate || 'all'}.xlsx`);
        setToastMsg({ open: true, message: "Excel sheet exported successfully!", severity: "success" });
      } else if (format === "json") {
        const blob = new Blob([JSON.stringify(exportRows, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transactions_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export error", err);
      setToastMsg({ open: true, message: "Failed to export data.", severity: "error" });
    } finally {
      setExporting(false);
    }
  };

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedKeys.size === items.length && items.length > 0) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(items.map((r) => r.id || r.txn_id)));
    }
  };

  const handleSelectRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Sorting handler
  const handleSort = (colKey: string) => {
    if (sortBy === colKey) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(colKey);
      setSortOrder("desc");
    }
    setPage(0);
  };

  // Status Badge Helper
  const renderStatusBadge = (status: string) => {
    const st = (status || "SUCCESS").toUpperCase();
    if (st === "SUCCESS" || st === "SETTLED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
          <CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> SUCCESS
        </span>
      );
    }
    if (st === "PENDING" || st === "PROCESSING" || st === "INITIATED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
          <Clock className="w-3 h-3 text-[#D97706]" /> {st}
        </span>
      );
    }
    if (st === "REVERSED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F3E8FF] text-[#7E22CE] border border-[#E9D5FF]">
          <RotateCcw className="w-3 h-3 text-[#9333EA]" /> REVERSED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]">
        <XCircle className="w-3 h-3 text-[#DC2626]" /> {st}
      </span>
    );
  };

  // Available Table Columns definition
  const tableColumns = [
    { id: "date", label: "Date / Time", sortable: true },
    { id: "txn_id", label: "Transaction ID", sortable: true },
    { id: "company", label: "Company", sortable: false },
    { id: "user", label: "Retailer / User", sortable: false },
    { id: "user_type", label: "Role", sortable: false },
    { id: "vendor", label: "Vendor", sortable: false },
    { id: "service", label: "Service", sortable: false },
    { id: "source", label: "Source", sortable: false },
    { id: "type", label: "CR / DR", sortable: false },
    { id: "cr", label: "Credit (₹)", sortable: true, align: "right" },
    { id: "dr", label: "Debit (₹)", sortable: true, align: "right" },
    { id: "opening_balance", label: "Opening Bal", sortable: false, align: "right" },
    { id: "closing_balance", label: "Closing Bal", sortable: false, align: "right" },
    { id: "status", label: "Status", sortable: true },
    { id: "service_reference", label: "Service Ref", sortable: false },
  ];

  const densityConf = DENSITY_CONFIG[density];
  const allSelected = items.length > 0 && items.every((r) => selectedKeys.has(r.id || r.txn_id));
  const someSelected = selectedKeys.size > 0 && !allSelected;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));

  return (
    <div
      ref={containerRef}
      className={`space-y-5 ${
        isFullscreen ? "fixed inset-0 z-[200] bg-[#F8FAFC] p-6 overflow-y-auto" : ""
      }`}
    >
      {/* ─────────────────────────────────────────────────────────────
          1. TOP HEADER & OVERVIEW
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-3">
            <Receipt className="w-7 h-7 text-[#2563EB]" /> Enterprise Transaction Report
          </h1>
          <p className="mt-1 text-sm font-medium text-[#64748B]">
            Centralized single-source-of-truth financial ledger across companies, retailers, vendors, services, and gateways.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchData();
              fetchSummary();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs font-bold text-[#334155] hover:bg-[#F8FAFC] shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#2563EB] ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => handleExport("csv")}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. DYNAMIC KPI SUMMARY CARDS
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Volume & Count */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Total Transactions</p>
            {summaryLoading ? (
              <div className="h-7 w-28 bg-[#F1F5F9] animate-pulse rounded mt-1.5" />
            ) : (
              <h3 className="mt-1 text-2xl font-extrabold text-[#0F172A]">
                {(summary?.total_count || totalRecords).toLocaleString()}
              </h3>
            )}
            <p className="mt-0.5 text-xs font-bold text-[#2563EB]">
              Vol: {formatINR(summary?.total_amount)}
            </p>
          </div>
          <div className="rounded-xl p-3 bg-[#EFF6FF] text-[#2563EB]">
            <Layers className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: Total Credit (CR) Inflow */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#166534]">Total Inflow (CR)</p>
            {summaryLoading ? (
              <div className="h-7 w-28 bg-[#F1F5F9] animate-pulse rounded mt-1.5" />
            ) : (
              <h3 className="mt-1 text-2xl font-extrabold text-[#16A34A]">
                {formatINR(summary?.total_credit)}
              </h3>
            )}
            <p className="mt-0.5 text-xs font-medium text-[#64748B]">Wallet inflows & topups</p>
          </div>
          <div className="rounded-xl p-3 bg-[#DCFCE7] text-[#16A34A]">
            <ArrowDownRight className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Total Debit (DR) Outflow */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#991B1B]">Total Outflow (DR)</p>
            {summaryLoading ? (
              <div className="h-7 w-28 bg-[#F1F5F9] animate-pulse rounded mt-1.5" />
            ) : (
              <h3 className="mt-1 text-2xl font-extrabold text-[#DC2626]">
                {formatINR(summary?.total_debit)}
              </h3>
            )}
            <p className="mt-0.5 text-xs font-medium text-[#64748B]">Services & payout execution</p>
          </div>
          <div className="rounded-xl p-3 bg-[#FEE2E2] text-[#DC2626]">
            <ArrowUpRight className="h-6 w-6" />
          </div>
        </div>

        {/* Card 4: Net Movement & Health */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-4.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#B45309]">Net Movement</p>
            {summaryLoading ? (
              <div className="h-7 w-28 bg-[#F1F5F9] animate-pulse rounded mt-1.5" />
            ) : (
              <h3 className={`mt-1 text-2xl font-extrabold ${(summary?.net_movement || 0) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                {formatINR(summary?.net_movement)}
              </h3>
            )}
            <p className="mt-0.5 text-[11px] text-[#64748B]">
              Success: <span className="text-[#16A34A] font-bold">{summary?.successful_count || 0}</span> | Fail: <span className="text-[#DC2626] font-bold">{summary?.failed_count || 0}</span>
            </p>
          </div>
          <div className="rounded-xl p-3 bg-[#FEF3C7] text-[#D97706]">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. DATE PRESETS BAR (TODAY, YESTERDAY, 7D, 30D, 60D, 90D)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[#E2E8F0] bg-white shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-extrabold text-[#475569] flex items-center gap-1.5 mr-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#2563EB]" /> Date Range:
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                datePreset === key
                  ? "bg-[#2563EB] text-white shadow-2xs"
                  : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0] hover:text-[#0F172A]"
              }`}
            >
              {label}
            </button>
          ))}

          <button
            onClick={() => setDatePreset("custom")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              datePreset === "custom"
                ? "bg-[#2563EB] text-white shadow-2xs"
                : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
            }`}
          >
            Custom Range
          </button>
        </div>

        {/* Active Date Indicator / Custom Inputs */}
        {datePreset === "custom" ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
              className="px-2.5 py-1 text-xs font-semibold border border-[#CBD5E1] rounded-md text-[#334155] focus:outline-none focus:border-[#2563EB]"
            />
            <span className="text-xs text-[#94A3B8]">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(0); }}
              className="px-2.5 py-1 text-xs font-semibold border border-[#CBD5E1] rounded-md text-[#334155] focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        ) : (
          <div className="text-xs font-semibold text-[#64748B]">
            {fromDate && toDate ? (
              fromDate === toDate ? (
                <span>Showing records for <strong className="text-[#0F172A]">{fromDate}</strong></span>
              ) : (
                <span>From <strong className="text-[#0F172A]">{fromDate}</strong> to <strong className="text-[#0F172A]">{toDate}</strong></span>
              )
            ) : (
              <span>All Historical Records</span>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MASTER TOOLBAR CONTAINER (MATCHING ATTACHED SCREENSHOT)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-2xs">
        {/* TOOLBAR HEADER ROW */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-b border-[#E2E8F0] bg-white">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Global Search Box */}
            <div className="relative flex-1 min-w-[220px] max-w-[380px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Serial Number, Mobile, Txn ID, UTR..."
                className="w-full pl-8 pr-8 py-1.5 text-[13px] font-medium bg-white border border-[#D6DEE8] rounded-md text-[#334155] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#334155] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilterDrawer((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-md border transition-colors cursor-pointer ${
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
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-bold text-[#475569] bg-white border border-[#D1D5DB] rounded-md hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <densityConf.icon className="w-3.5 h-3.5" />
                <span>{densityConf.label}</span>
              </button>
              {showDensity && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E2E8F0] rounded-md shadow-lg py-1 min-w-[140px]">
                  {(["compact", "medium", "comfortable"] as Density[]).map((d) => {
                    const Conf = DENSITY_CONFIG[d];
                    return (
                      <button
                        key={d}
                        onClick={() => { setDensity(d); setShowDensity(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold transition-colors cursor-pointer ${
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
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-bold text-[#475569] bg-white border border-[#D1D5DB] rounded-md hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Columns</span>
              </button>
              {showColumnChooser && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E2E8F0] rounded-lg shadow-xl p-2 min-w-[200px] max-h-[320px] overflow-y-auto">
                  <p className="text-[11px] font-bold text-[#64748B] px-2 py-1 uppercase">Toggle Columns</p>
                  {tableColumns.map((col) => {
                    const isChecked = !hiddenColumns.has(col.id);
                    return (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 px-2 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#F1F5F9] rounded cursor-pointer"
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
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-bold text-[#475569] bg-white border border-[#D1D5DB] rounded-md hover:bg-[#F8FAFC] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
              </button>
              {showExport && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-[#E2E8F0] rounded-md shadow-lg py-1 min-w-[170px]">
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#2563EB]" /> Export CSV
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#16A34A]" /> Export Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => handleExport("json")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-[#D97706]" /> Export JSON
                  </button>
                  <div className="border-t border-[#E2E8F0] my-1" />
                  <button
                    onClick={() => handleExport("print")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#64748B]" /> Print Report
                  </button>
                  <button
                    onClick={() => handleExport("whatsapp")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#16A34A]" /> Share WhatsApp
                  </button>
                  <button
                    onClick={() => handleExport("email")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#2563EB]" /> Email Summary
                  </button>
                  <button
                    onClick={() => handleExport("link")}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-[#334155] hover:bg-[#F1F5F9] cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#8B5CF6]" /> Copy Link
                  </button>
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-[#E2E8F0] mx-0.5" />

            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchData();
                fetchSummary();
              }}
              title="Refresh records"
              className="p-1.5 rounded-md border border-[#D1D5DB] text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#2563EB]" : ""}`} />
            </button>

            {/* Auto Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh((p) => !p)}
              title="Auto-refresh every 30s"
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-extrabold rounded-md border transition-colors cursor-pointer ${
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
              className="p-1.5 rounded-md border border-[#D1D5DB] text-[#475569] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Right Indicator */}
          <div className="flex items-center gap-2">
            {selectedKeys.size > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                {selectedKeys.size} Selected
              </span>
            )}
            <span className="text-xs font-extrabold text-[#64748B]">
              {totalRecords.toLocaleString()} records
            </span>
          </div>
        </div>

        {/* EXPANDABLE FILTER PANEL */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Company */}
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Company</label>
                <select
                  value={companyId}
                  onChange={(e) => { setCompanyId(e.target.value); setPage(0); }}
                  className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="ALL">All Companies</option>
                  {filterOptions.companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              {/* User Type */}
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">User Type / Role</label>
                <select
                  value={userType}
                  onChange={(e) => { setUserType(e.target.value); setPage(0); }}
                  className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="ALL">All User Types</option>
                  {filterOptions.user_types.map((u) => (
                    <option key={u.code} value={u.code}>{u.name}</option>
                  ))}
                </select>
              </div>

              {/* Service */}
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Service</label>
                <select
                  value={serviceName}
                  onChange={(e) => { setServiceName(e.target.value); setPage(0); }}
                  className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="ALL">All Services</option>
                  {filterOptions.services.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Vendor */}
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Vendor / Partner</label>
                <select
                  value={vendorName}
                  onChange={(e) => { setVendorName(e.target.value); setPage(0); }}
                  className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="ALL">All Vendors</option>
                  {filterOptions.vendors.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Source */}
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Txn Source</label>
                <select
                  value={transactionSource}
                  onChange={(e) => { setTransactionSource(e.target.value); setPage(0); }}
                  className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="ALL">All Sources</option>
                  {filterOptions.sources.map((src) => (
                    <option key={src.code} value={src.code}>{src.name}</option>
                  ))}
                </select>
              </div>

              {/* CR / DR */}
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Entry Type (CR / DR)</label>
                <select
                  value={transactionType}
                  onChange={(e) => { setTransactionType(e.target.value); setPage(0); }}
                  className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="ALL">All Entries</option>
                  <option value="CREDIT">Credit (CR) Only</option>
                  <option value="DEBIT">Debit (DR) Only</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                  className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  {filterOptions.statuses.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              {/* Min - Max Amount */}
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">Amount Range (₹)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minAmount}
                    onChange={(e) => { setMinAmount(e.target.value); setPage(0); }}
                    className="w-1/2 text-xs font-medium px-2 py-1.5 bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:outline-none"
                  />
                  <span className="text-xs text-[#94A3B8]">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxAmount}
                    onChange={(e) => { setMaxAmount(e.target.value); setPage(0); }}
                    className="w-1/2 text-xs font-medium px-2 py-1.5 bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            5. MASTER DATA TABLE
        ───────────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto min-h-[420px] relative">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                {/* Select All Checkbox */}
                <th className="px-3 py-2.5 w-10 text-center sticky left-0 bg-[#F8FAFC] z-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={handleSelectAll}
                    className="rounded text-[#2563EB] focus:ring-0 cursor-pointer"
                  />
                </th>

                {/* Dynamic Columns */}
                {!hiddenColumns.has("date") && (
                  <th
                    onClick={() => handleSort("created_at")}
                    className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#475569] cursor-pointer hover:bg-[#EDF2F7] select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Date / Time</span>
                      <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                    </div>
                  </th>
                )}

                {!hiddenColumns.has("txn_id") && (
                  <th
                    onClick={() => handleSort("txn_id")}
                    className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#475569] cursor-pointer hover:bg-[#EDF2F7] select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Txn ID & Ref</span>
                      <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                    </div>
                  </th>
                )}

                {!hiddenColumns.has("company") && (
                  <th className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#475569]">
                    Company
                  </th>
                )}

                {!hiddenColumns.has("user") && (
                  <th className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#475569]">
                    Retailer / User
                  </th>
                )}

                {!hiddenColumns.has("user_type") && (
                  <th className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#475569]">
                    Role
                  </th>
                )}

                {!hiddenColumns.has("vendor") && (
                  <th className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#475569]">
                    Vendor
                  </th>
                )}

                {!hiddenColumns.has("service") && (
                  <th className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#475569]">
                    Service
                  </th>
                )}

                {!hiddenColumns.has("source") && (
                  <th className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#475569]">
                    Source
                  </th>
                )}

                {!hiddenColumns.has("type") && (
                  <th className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#475569] text-center">
                    CR/DR
                  </th>
                )}

                {!hiddenColumns.has("cr") && (
                  <th
                    onClick={() => handleSort("cr")}
                    className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#166534] text-right cursor-pointer hover:bg-[#EDF2F7] select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>CR (₹)</span>
                      <ArrowUpDown className="w-3 h-3 text-[#16A34A]" />
                    </div>
                  </th>
                )}

                {!hiddenColumns.has("dr") && (
                  <th
                    onClick={() => handleSort("dr")}
                    className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#991B1B] text-right cursor-pointer hover:bg-[#EDF2F7] select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>DR (₹)</span>
                      <ArrowUpDown className="w-3 h-3 text-[#DC2626]" />
                    </div>
                  </th>
                )}

                {!hiddenColumns.has("opening_balance") && (
                  <th className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#64748B] text-right">
                    Opening Bal
                  </th>
                )}

                {!hiddenColumns.has("closing_balance") && (
                  <th className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#0F172A] text-right">
                    Closing Bal
                  </th>
                )}

                {!hiddenColumns.has("status") && (
                  <th
                    onClick={() => handleSort("status")}
                    className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#475569] cursor-pointer hover:bg-[#EDF2F7] select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                    </div>
                  </th>
                )}

                {!hiddenColumns.has("service_reference") && (
                  <th className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#475569]">
                    Service Ref
                  </th>
                )}

                {/* Actions Header */}
                <th className="px-3 py-2.5 text-[11.5px] font-bold uppercase tracking-wider text-[#475569] text-center sticky right-0 bg-[#F8FAFC] z-10">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3 py-3 text-center sticky left-0 bg-white">
                      <div className="w-4 h-4 bg-[#E2E8F0] rounded mx-auto" />
                    </td>
                    <td className="px-3 py-3"><div className="h-3.5 bg-[#E2E8F0] rounded w-24" /></td>
                    <td className="px-3 py-3"><div className="h-3.5 bg-[#E2E8F0] rounded w-28" /></td>
                    <td className="px-3 py-3"><div className="h-3.5 bg-[#E2E8F0] rounded w-20" /></td>
                    <td className="px-3 py-3"><div className="h-3.5 bg-[#E2E8F0] rounded w-32" /></td>
                    <td className="px-3 py-3"><div className="h-3.5 bg-[#E2E8F0] rounded w-16" /></td>
                    <td className="px-3 py-3"><div className="h-3.5 bg-[#E2E8F0] rounded w-20" /></td>
                    <td className="px-3 py-3"><div className="h-3.5 bg-[#E2E8F0] rounded w-20" /></td>
                    <td className="px-3 py-3"><div className="h-3.5 bg-[#E2E8F0] rounded w-16" /></td>
                    <td className="px-3 py-3 text-center"><div className="h-3.5 bg-[#E2E8F0] rounded w-8 mx-auto" /></td>
                    <td className="px-3 py-3 text-right"><div className="h-3.5 bg-[#E2E8F0] rounded w-16 ml-auto" /></td>
                    <td className="px-3 py-3 text-right"><div className="h-3.5 bg-[#E2E8F0] rounded w-16 ml-auto" /></td>
                    <td className="px-3 py-3 text-right"><div className="h-3.5 bg-[#E2E8F0] rounded w-16 ml-auto" /></td>
                    <td className="px-3 py-3 text-right"><div className="h-3.5 bg-[#E2E8F0] rounded w-16 ml-auto" /></td>
                    <td className="px-3 py-3"><div className="h-3.5 bg-[#E2E8F0] rounded w-20" /></td>
                    <td className="px-3 py-3 text-center sticky right-0 bg-white"><div className="h-3.5 bg-[#E2E8F0] rounded w-12 mx-auto" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                        <Receipt className="w-6 h-6 text-[#94A3B8]" />
                      </div>
                      <p className="text-sm font-bold text-[#334155]">No transactions found</p>
                      <p className="text-xs text-[#94A3B8]">
                        Try adjusting your date range, search query, or filter options.
                      </p>
                      {activeFiltersCount > 0 && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-2 px-3.5 py-1.5 text-xs font-bold text-[#2563EB] bg-[#EFF6FF] rounded-lg hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((row, index) => {
                  const key = row.id || row.txn_id || String(index);
                  const isSelected = selectedKeys.has(key);
                  const isCredit = row.entry_type === "CREDIT";

                  return (
                    <tr
                      key={key}
                      className={`transition-colors hover:bg-[#F8FAFC] ${
                        isSelected ? "bg-[#EFF6FF]/60" : index % 2 === 1 ? "bg-[#FAFAFA]" : "bg-white"
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="px-3 py-2 text-center sticky left-0 bg-inherit z-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(key)}
                          className="rounded text-[#2563EB] focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Date / Time */}
                      {!hiddenColumns.has("date") && (
                        <td className={`px-3 ${densityConf.py} whitespace-nowrap`}>
                          <p className={`${densityConf.fontSize} font-bold text-[#0F172A]`}>{row.date}</p>
                          <p className="text-[11px] font-medium text-[#64748B]">{row.time}</p>
                        </td>
                      )}

                      {/* Txn ID */}
                      {!hiddenColumns.has("txn_id") && (
                        <td className={`px-3 ${densityConf.py} whitespace-nowrap`}>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenDetail(row.txn_id)}
                              className="font-mono text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                            >
                              {row.txn_id}
                            </button>
                            <button
                              onClick={() => copyToClipboard(row.txn_id, `txn-${row.txn_id}`)}
                              title="Copy Txn ID"
                              className="text-[#94A3B8] hover:text-[#334155] cursor-pointer"
                            >
                              {copiedKey === `txn-${row.txn_id}` ? (
                                <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {row.ref_id && row.ref_id !== row.txn_id && (
                            <p className="text-[10.5px] font-mono text-[#94A3B8]">Ref: {row.ref_id}</p>
                          )}
                        </td>
                      )}

                      {/* Company */}
                      {!hiddenColumns.has("company") && (
                        <td className={`px-3 ${densityConf.py} whitespace-nowrap`}>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#EFF6FF] text-[#1D4ED8]">
                            <Building2 className="w-3 h-3" /> {row.company_name || "Pay2Pay"}
                          </span>
                        </td>
                      )}

                      {/* Retailer / Store */}
                      {!hiddenColumns.has("user") && (
                        <td className={`px-3 ${densityConf.py} max-w-[180px] truncate`}>
                          <p className={`${densityConf.fontSize} font-bold text-[#0F172A] truncate`}>
                            {row.user_name}
                          </p>
                          <p className="text-[11px] text-[#64748B] font-mono">
                            {row.user_mobile || row.user_code}
                          </p>
                        </td>
                      )}

                      {/* User Type */}
                      {!hiddenColumns.has("user_type") && (
                        <td className={`px-3 ${densityConf.py} whitespace-nowrap`}>
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                            {row.user_type}
                          </span>
                        </td>
                      )}

                      {/* Vendor */}
                      {!hiddenColumns.has("vendor") && (
                        <td className={`px-3 ${densityConf.py} whitespace-nowrap text-xs font-semibold text-[#334155]`}>
                          {row.vendor_name}
                        </td>
                      )}

                      {/* Service */}
                      {!hiddenColumns.has("service") && (
                        <td className={`px-3 ${densityConf.py} whitespace-nowrap text-xs font-extrabold text-[#0F172A]`}>
                          {row.service_name}
                        </td>
                      )}

                      {/* Source */}
                      {!hiddenColumns.has("source") && (
                        <td className={`px-3 ${densityConf.py} whitespace-nowrap`}>
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]">
                            {row.transaction_source}
                          </span>
                        </td>
                      )}

                      {/* Type (CR/DR Badge) */}
                      {!hiddenColumns.has("type") && (
                        <td className={`px-3 ${densityConf.py} text-center whitespace-nowrap`}>
                          <span
                            className={`inline-block w-8 py-0.5 rounded text-[11px] font-black text-center ${
                              isCredit
                                ? "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]"
                                : "bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]"
                            }`}
                          >
                            {isCredit ? "CR" : "DR"}
                          </span>
                        </td>
                      )}

                      {/* Credit (CR) Amount */}
                      {!hiddenColumns.has("cr") && (
                        <td className={`px-3 ${densityConf.py} text-right whitespace-nowrap`}>
                          <span className={`${densityConf.fontSize} font-extrabold ${row.cr > 0 ? "text-[#16A34A]" : "text-[#94A3B8]"}`}>
                            {row.cr > 0 ? formatINR(row.cr) : "—"}
                          </span>
                        </td>
                      )}

                      {/* Debit (DR) Amount */}
                      {!hiddenColumns.has("dr") && (
                        <td className={`px-3 ${densityConf.py} text-right whitespace-nowrap`}>
                          <span className={`${densityConf.fontSize} font-extrabold ${row.dr > 0 ? "text-[#DC2626]" : "text-[#94A3B8]"}`}>
                            {row.dr > 0 ? formatINR(row.dr) : "—"}
                          </span>
                        </td>
                      )}

                      {/* Opening Balance */}
                      {!hiddenColumns.has("opening_balance") && (
                        <td className={`px-3 ${densityConf.py} text-right whitespace-nowrap text-xs font-semibold text-[#64748B]`}>
                          {formatINR(row.opening_balance)}
                        </td>
                      )}

                      {/* Closing Balance */}
                      {!hiddenColumns.has("closing_balance") && (
                        <td className={`px-3 ${densityConf.py} text-right whitespace-nowrap text-xs font-extrabold text-[#0F172A]`}>
                          {formatINR(row.closing_balance)}
                        </td>
                      )}

                      {/* Status */}
                      {!hiddenColumns.has("status") && (
                        <td className={`px-3 ${densityConf.py} whitespace-nowrap`}>
                          {renderStatusBadge(row.status)}
                        </td>
                      )}

                      {/* Service Ref */}
                      {!hiddenColumns.has("service_reference") && (
                        <td className={`px-3 ${densityConf.py} whitespace-nowrap font-mono text-[11px] text-[#64748B]`}>
                          {row.service_reference || "—"}
                        </td>
                      )}

                      {/* Action */}
                      <td className={`px-3 ${densityConf.py} text-center sticky right-0 bg-inherit z-10 whitespace-nowrap`}>
                        <button
                          onClick={() => handleOpenDetail(row.txn_id)}
                          title="View Details & Audit Trail"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] text-xs font-bold transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            6. TABLE FOOTER & PAGINATION
        ───────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0] bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B]">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              className="px-2 py-1 text-xs font-bold border border-[#CBD5E1] rounded bg-white text-[#334155] focus:outline-none"
            >
              {[10, 25, 50, 100].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="text-xs text-[#64748B] ml-2">
              Showing <strong className="text-[#0F172A]">{totalRecords > 0 ? page * rowsPerPage + 1 : 0}</strong> - <strong className="text-[#0F172A]">{Math.min((page + 1) * rowsPerPage, totalRecords)}</strong> of <strong className="text-[#0F172A]">{totalRecords.toLocaleString()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(0)}
              disabled={page === 0 || loading}
              className="p-1.5 rounded border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="p-1.5 rounded border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="text-xs font-bold text-[#334155] px-2">
              Page {page + 1} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
              className="p-1.5 rounded border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page >= totalPages - 1 || loading}
              className="p-1.5 rounded border border-[#CBD5E1] text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          7. SLIDE-OVER TRANSACTION LIFECYCLE DRAWER
      ───────────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[300] flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col space-y-5 border-l border-[#E2E8F0]">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#0F172A]">Transaction Details</h2>
                  <p className="text-xs text-[#64748B] font-medium">{selectedTxn?.date_time || "Loading..."}</p>
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {drawerLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="w-8 h-8 text-[#2563EB] animate-spin" />
                <p className="text-xs font-bold text-[#64748B]">Loading lifecycle details...</p>
              </div>
            ) : !selectedTxn ? (
              <div className="py-20 text-center text-[#EF4444]">
                <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
                <p className="font-bold">Transaction records not found</p>
              </div>
            ) : (
              <div className="space-y-5 flex-1">
                {/* Financial Overview Card */}
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#64748B]">
                        Financial Movement
                      </p>
                      <h3
                        className={`text-2xl font-black mt-0.5 ${
                          selectedTxn.entry_type === "CREDIT" ? "text-[#16A34A]" : "text-[#DC2626]"
                        }`}
                      >
                        {selectedTxn.entry_type === "CREDIT" ? "+" : "-"} {formatINR(selectedTxn.amount)}
                      </h3>
                    </div>
                    <div>
                      {renderStatusBadge(selectedTxn.status)}
                    </div>
                  </div>

                  <div className="border-t border-[#E2E8F0] pt-2.5 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-[#64748B]">Opening Balance</p>
                      <p className="text-xs font-extrabold text-[#334155]">{formatINR(selectedTxn.opening_balance)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-[#64748B]">Closing Balance</p>
                      <p className="text-xs font-extrabold text-[#0F172A]">{formatINR(selectedTxn.closing_balance)}</p>
                    </div>
                  </div>
                </div>

                {/* Core Metadata */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase text-[#2563EB] mb-2">Metadata Details</h4>
                  <div className="rounded-xl border border-[#E2E8F0] bg-white divide-y divide-[#E2E8F0]">
                    <div className="p-3 flex justify-between items-center text-xs">
                      <span className="text-[#64748B]">Transaction ID</span>
                      <span className="font-mono font-bold text-[#0F172A] flex items-center gap-1.5">
                        {selectedTxn.txn_id}
                        <button
                          onClick={() => copyToClipboard(selectedTxn.txn_id, "drawer-txn")}
                          className="text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
                        >
                          {copiedKey === "drawer-txn" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </span>
                    </div>

                    <div className="p-3 flex justify-between items-center text-xs">
                      <span className="text-[#64748B]">Company</span>
                      <span className="font-bold text-[#0F172A]">{selectedTxn.company_name} ({selectedTxn.company_code})</span>
                    </div>

                    <div className="p-3 flex justify-between items-center text-xs">
                      <span className="text-[#64748B]">User / Store</span>
                      <span className="font-bold text-[#0F172A]">{selectedTxn.user_name} ({selectedTxn.user_mobile})</span>
                    </div>

                    <div className="p-3 flex justify-between items-center text-xs">
                      <span className="text-[#64748B]">Service & Vendor</span>
                      <span className="font-bold text-[#0F172A]">{selectedTxn.service_name} • {selectedTxn.vendor_name}</span>
                    </div>

                    <div className="p-3 flex justify-between items-center text-xs">
                      <span className="text-[#64748B]">Wallet Type</span>
                      <span className="font-bold text-[#0F172A]">{selectedTxn.wallet_type || "MAIN"}</span>
                    </div>

                    <div className="p-3 flex justify-between items-center text-xs">
                      <span className="text-[#64748B]">Service Reference</span>
                      <span className="font-mono text-[#475569]">{selectedTxn.service_reference || "—"}</span>
                    </div>

                    <div className="p-3 flex justify-between items-center text-xs">
                      <span className="text-[#64748B]">Narration</span>
                      <span className="text-[#334155] text-right font-medium">{selectedTxn.narration || "—"}</span>
                    </div>
                  </div>
                </div>

                {/* Audit Trail Timeline */}
                <div>
                  <h4 className="text-xs font-extrabold uppercase text-[#2563EB] mb-2.5">
                    Authoritative Lifecycle Audit Trail
                  </h4>
                  <div className="border-l-2 border-[#BFDBFE] ml-3 pl-4 space-y-4">
                    {selectedTxn.audit_trail && selectedTxn.audit_trail.length > 0 ? (
                      selectedTxn.audit_trail.map((step, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-[#2563EB] border-2 border-white ring-2 ring-[#BFDBFE]" />
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-[#0F172A]">{step.action}</p>
                            <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                              {step.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#64748B] mt-0.5">{step.description}</p>
                          <p className="text-[10px] text-[#94A3B8] mt-0.5">
                            By {step.actor} • {step.timestamp}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#94A3B8]">No secondary audit events recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Toast Alert */}
      {toastMsg.open && (
        <div
          className={`fixed bottom-5 right-5 z-[400] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-xs font-bold animate-in slide-in-from-bottom-5 duration-200 ${
            toastMsg.severity === "success"
              ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
              : toastMsg.severity === "error"
              ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
              : "bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]"
          }`}
        >
          {toastMsg.severity === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          ) : toastMsg.severity === "error" ? (
            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
          ) : (
            <Receipt className="w-4 h-4 text-[#2563EB]" />
          )}
          <span>{toastMsg.message}</span>
          <button
            onClick={() => setToastMsg((p) => ({ ...p, open: false }))}
            className="ml-2 p-1 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
