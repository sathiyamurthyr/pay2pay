"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "@/lib/api";
import {
  RefreshCw,
  Clock,
  Wallet,
  Building2,
  Store,
  TrendingUp,
  AlertTriangle,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  ExternalLink,
  Receipt,
  FileText,
  HelpCircle,
  Layers,
  ArrowLeftRight,
  Info
} from "lucide-react";

interface KPISummary {
  pending_transactions: number;
  total_pending_amount: number;
  pending_vendors: number;
  pending_retailers: number;
  todays_pending: number;
  oldest_pending_transaction: string | null;
}

interface PendingTransaction {
  transaction_id: string;
  external_txn_id: string;
  service: string;
  vendor: string;
  retailer_id: string;
  retailer_code: string;
  retailer_name: string;
  retailer_mobile: string;
  company_id: string;
  tenant_id: string;
  transaction_amount: number;
  cr_amount: number;
  dr_amount: number;
  commission: number;
  gst: number;
  service_charge: number;
  net_wallet_debit: number;
  wallet_impact: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
  updated_at: string;
  current_status: string;
  vendor_ref: string;
  provider_status: string;
  provider_response: string;
  utr: string;
  rrn: string;
  is_reversed: boolean;
}

interface LedgerEntry {
  id: number;
  txn_id: string;
  ref_id: string;
  entry_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  narration: string;
  service_name: string;
  wallet_type: string;
  created_at: string;
}

interface AuditLog {
  public_id: string;
  transaction_reference: string;
  action: string;
  previous_status: string;
  new_status: string;
  actor_type: string;
  actor_id: string;
  details: any;
  created_at: string;
}

interface TransactionDetails {
  transaction: {
    transaction_id: string;
    external_txn_id: string;
    service: string;
    vendor: string;
    transaction_type: string;
    current_status: string;
    created_at: string;
    updated_at: string;
    is_reversed: boolean;
  };
  retailer: {
    retailer_id: string;
    retailer_code: string;
    retailer_name: string;
    company_id: string;
    mobile_number: string;
  };
  financial_details: {
    transaction_amount: number;
    debit_amount: number;
    credit_amount: number;
    commission: number;
    gst: number;
    service_charge: number;
    wallet_debit: number;
    wallet_credit: number;
    wallet_impact: string;
    balance_before: number;
    balance_after: number;
  };
  provider_details: {
    vendor: string;
    vendor_reference: string;
    provider_status: string;
    provider_response_raw: string;
    provider_response_json: any;
    utr: string;
    rrn: string;
  };
  accounting_entries: LedgerEntry[];
  audit_trail: AuditLog[];
}

export default function TransactionStatusUpdatePage() {
  // ── State: KPIs & Filters ──
  const [kpi, setKpi] = useState<KPISummary>({
    pending_transactions: 0,
    total_pending_amount: 0,
    pending_vendors: 0,
    pending_retailers: 0,
    todays_pending: 0,
    oldest_pending_transaction: null,
  });
  const [loadingKpi, setLoadingKpi] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [retailerFilter, setRetailerFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  // Pagination & Sort
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Dynamic filter dropdown options
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [availableVendors, setAvailableVendors] = useState<string[]>([]);
  const [failureReasons, setFailureReasons] = useState<string[]>([
    "Vendor Failed",
    "Provider Timeout",
    "Provider Rejected",
    "Technical Failure",
    "Transaction Not Processed",
    "Other"
  ]);

  // Table items & loading
  const [items, setItems] = useState<PendingTransaction[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // ── State: Details Drawer ──
  const [selectedTxnId, setSelectedTxnId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [details, setDetails] = useState<TransactionDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"overview" | "financial" | "provider" | "timeline">("overview");

  // ── State: Confirmation Modals ──
  const [actionTxn, setActionTxn] = useState<PendingTransaction | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [successUtr, setSuccessUtr] = useState("");
  const [successRemarks, setSuccessRemarks] = useState("");
  const [failureReason, setFailureReason] = useState("Vendor Failed");
  const [customFailureReason, setCustomFailureReason] = useState("");
  const [failureRemarks, setFailureRemarks] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Toast alert
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // ── Fetch KPIs ──
  const fetchKpi = useCallback(async () => {
    setLoadingKpi(true);
    try {
      const res = await api.get("/api/v1/admin/transactions/pending/summary");
      if (res.data?.success && res.data?.data) {
        setKpi(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load KPI metrics:", err);
    } finally {
      setLoadingKpi(false);
    }
  }, []);

  // ── Fetch Failure Reasons ──
  const fetchFailureReasons = useCallback(async () => {
    try {
      const res = await api.get("/api/v1/admin/transactions/pending/failure-reasons");
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setFailureReasons(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load failure reasons:", err);
    }
  }, []);

  // ── Fetch Pending Transactions List ──
  const fetchTransactions = useCallback(async () => {
    setLoadingItems(true);
    try {
      const params: any = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (serviceFilter) params.service = serviceFilter;
      if (vendorFilter) params.vendor = vendorFilter;
      if (retailerFilter) params.retailer = retailerFilter;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;
      if (minAmount) params.min_amount = parseFloat(minAmount);
      if (maxAmount) params.max_amount = parseFloat(maxAmount);

      const res = await api.get("/api/v1/admin/transactions/pending", { params });
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setItems(d.items || []);
        setTotalCount(d.total || 0);
        setTotalPages(d.total_pages || 1);
        if (Array.isArray(d.available_services) && d.available_services.length > 0) {
          setAvailableServices(d.available_services);
        }
        if (Array.isArray(d.available_vendors) && d.available_vendors.length > 0) {
          setAvailableVendors(d.available_vendors);
        }
      }
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error("Failed to fetch pending transactions:", err);
      showToast(err.response?.data?.detail || "Failed to load pending transactions", "error");
    } finally {
      setLoadingItems(false);
    }
  }, [
    page,
    pageSize,
    sortBy,
    sortOrder,
    debouncedSearch,
    serviceFilter,
    vendorFilter,
    retailerFilter,
    fromDate,
    toDate,
    minAmount,
    maxAmount,
  ]);

  // Initial load
  useEffect(() => {
    fetchKpi();
    fetchFailureReasons();
  }, [fetchKpi, fetchFailureReasons]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ── Fetch Transaction Details for Drawer ──
  const openDetailsDrawer = async (txn: PendingTransaction) => {
    setSelectedTxnId(txn.transaction_id);
    setDrawerOpen(true);
    setLoadingDetails(true);
    setDrawerTab("overview");
    try {
      const res = await api.get(`/api/v1/admin/transactions/pending/${txn.transaction_id}`);
      if (res.data?.success && res.data?.data) {
        setDetails(res.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch details:", err);
      showToast(err.response?.data?.detail || "Failed to load transaction details", "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Copy helper
  const handleCopy = (textVal: string, id: string) => {
    navigator.clipboard.writeText(textVal);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open modals
  const initiateSuccess = (txn: PendingTransaction) => {
    setActionTxn(txn);
    setSuccessUtr(txn.utr && txn.utr !== "0" ? txn.utr : "");
    setSuccessRemarks("");
    setShowSuccessModal(true);
  };

  const initiateFailed = (txn: PendingTransaction) => {
    setActionTxn(txn);
    setFailureReason("Vendor Failed");
    setCustomFailureReason("");
    setFailureRemarks("");
    setShowFailedModal(true);
  };

  // ── Submit MARK AS SUCCESS ──
  const handleConfirmSuccess = async () => {
    if (!actionTxn) return;
    setSubmittingAction(true);
    try {
      const body: any = {
        status: "SUCCESS",
        remarks: successRemarks.trim() || undefined,
        utr_number: successUtr.trim() || undefined,
      };
      const res = await api.post(`/api/v1/admin/transactions/pending/${actionTxn.transaction_id}/update-status`, body);
      if (res.data?.success) {
        showToast(`Transaction ${actionTxn.transaction_id} marked as SUCCESS. Original accounting preserved.`);
        setShowSuccessModal(false);
        if (drawerOpen && selectedTxnId === actionTxn.transaction_id) {
          setDrawerOpen(false);
        }
        fetchTransactions();
        fetchKpi();
      }
    } catch (err: any) {
      console.error("Error marking SUCCESS:", err);
      showToast(err.response?.data?.detail || "Failed to mark transaction as SUCCESS", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  // ── Submit MARK AS FAILED (REVERSAL) ──
  const handleConfirmFailed = async () => {
    if (!actionTxn) return;
    const finalReason = failureReason === "Other" ? customFailureReason.trim() : failureReason;
    if (!finalReason) {
      showToast("Please enter a valid failure reason.", "error");
      return;
    }

    setSubmittingAction(true);
    try {
      const body: any = {
        status: "FAILED",
        failure_reason: finalReason,
        remarks: failureRemarks.trim() || undefined,
      };
      const res = await api.post(`/api/v1/admin/transactions/pending/${actionTxn.transaction_id}/update-status`, body);
      if (res.data?.success) {
        const revRef = res.data.reversal_reference || actionTxn.transaction_id;
        const revAmt = res.data.reversed_amount ?? actionTxn.dr_amount;
        const newBal = res.data.new_wallet_balance ? ` New wallet balance: ₹${res.data.new_wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "";
        showToast(`Transaction marked as FAILED. Refund of ₹${revAmt.toLocaleString("en-IN", { minimumFractionDigits: 2 })} credited (Ref: ${revRef}).${newBal}`);
        setShowFailedModal(false);
        if (drawerOpen && selectedTxnId === actionTxn.transaction_id) {
          setDrawerOpen(false);
        }
        fetchTransactions();
        fetchKpi();
      }
    } catch (err: any) {
      console.error("Error marking FAILED:", err);
      showToast(err.response?.data?.detail || "Failed to mark transaction as FAILED & reverse", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Format date helper
  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "--";
    try {
      const dt = new Date(isoStr);
      return dt.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 ${
          toast.type === "success"
            ? "bg-emerald-50 border-emerald-400 text-emerald-800"
            : "bg-rose-50 border-rose-400 text-rose-800"
        }`}>
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-amber-400/40">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              Transaction Status Update
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Live Operations Console
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Manually resolve currently pending transactions across all gateways & services with verified CR/DR reversal accounting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-500 text-right hidden sm:block">
            <div>Last Synced:</div>
            <div className="text-slate-700 font-mono">{lastRefreshed.toLocaleTimeString("en-IN")}</div>
          </div>
          <button
            onClick={() => {
              fetchKpi();
              fetchTransactions();
            }}
            disabled={loadingItems}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-amber-50 border border-amber-400 text-amber-600 text-sm font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingItems ? "animate-spin text-amber-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Top Dynamic KPI Cards Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {/* Card 1: Pending Count */}
        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm relative overflow-hidden group hover:border-amber-400 hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full pointer-events-none group-hover:bg-amber-100 transition-colors"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-600 border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-600 tracking-tight">
            {loadingKpi ? "..." : kpi.pending_transactions}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Across all services</p>

        </div>

        {/* Card 2: Total Amount */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm relative overflow-hidden group hover:border-emerald-400 hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full pointer-events-none group-hover:bg-emerald-100 transition-colors"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Amount</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-200">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-xl font-black text-emerald-600 tracking-tight truncate" title={formatCurrency(kpi.total_pending_amount)}>
            {loadingKpi ? "..." : formatCurrency(kpi.total_pending_amount)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">In vendor queues</p>
        </div>

        {/* Card 3: Pending Vendors */}
        <div className="bg-white rounded-2xl p-4 border border-purple-200 shadow-sm relative overflow-hidden group hover:border-purple-400 hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full pointer-events-none group-hover:bg-purple-100 transition-colors"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendors</span>
            <div className="p-2 rounded-xl bg-purple-100 text-purple-600 border border-purple-200">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-purple-600 tracking-tight">
            {loadingKpi ? "..." : kpi.pending_vendors}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Active switches</p>

        </div>

        {/* Card 4: Pending Retailers */}
        <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-sm relative overflow-hidden group hover:border-blue-400 hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full pointer-events-none group-hover:bg-blue-100 transition-colors"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Retailers</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600 border border-blue-200">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-blue-600 tracking-tight">
            {loadingKpi ? "..." : kpi.pending_retailers}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Impacted merchants</p>
        </div>

        {/* Card 5: Today's Pending */}
        <div className="bg-white rounded-2xl p-4 border border-cyan-200 shadow-sm relative overflow-hidden group hover:border-cyan-400 hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-50 rounded-bl-full pointer-events-none group-hover:bg-cyan-100 transition-colors"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's New</span>
            <div className="p-2 rounded-xl bg-cyan-100 text-cyan-600 border border-cyan-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-cyan-600 tracking-tight">
            {loadingKpi ? "..." : kpi.todays_pending}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Initiated today</p>
        </div>

        {/* Card 6: Oldest Pending */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-sm relative overflow-hidden group hover:border-rose-400 hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-bl-full pointer-events-none group-hover:bg-rose-100 transition-colors"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Oldest Pending</span>
            <div className="p-2 rounded-xl bg-rose-100 text-rose-600 border border-rose-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-sm font-bold text-rose-600 tracking-tight truncate" title={formatDate(kpi.oldest_pending_transaction)}>
            {loadingKpi
              ? "..."
              : kpi.oldest_pending_transaction
              ? new Date(kpi.oldest_pending_transaction).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
              : "None"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Priority resolution</p>
        </div>
      </div>

      {/* ── Enterprise Filter & Search Bar ── */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Txn ID, Ext ID, Retailer, Vendor, UTR..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Service Filter */}
          <div className="md:col-span-2">
            <select
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Services</option>
              {availableServices.map((svc) => (
                <option key={svc} value={svc}>
                  {svc}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Filter */}
          <div className="md:col-span-2">
            <select
              value={vendorFilter}
              onChange={(e) => {
                setVendorFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="">All Vendors</option>
              {availableVendors.map((vnd) => (
                <option key={vnd} value={vnd}>
                  {vnd}
                </option>
              ))}
            </select>
          </div>

          {/* Date Pickers */}
          <div className="md:col-span-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500"
              title="From Date"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500"
              title="To Date"
            />
            {(serviceFilter || vendorFilter || fromDate || toDate || minAmount || maxAmount || search) && (
              <button
                onClick={() => {
                  setSearch("");
                  setServiceFilter("");
                  setVendorFilter("");
                  setRetailerFilter("");
                  setFromDate("");
                  setToDate("");
                  setMinAmount("");
                  setMaxAmount("");
                  setPage(1);
                }}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300"
                title="Reset Filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Amount Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 text-xs text-slate-500">
          <span className="font-semibold text-slate-600">Amount Filter:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min ₹"
              value={minAmount}
              onChange={(e) => {
                setMinAmount(e.target.value);
                setPage(1);
              }}
              className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 text-xs"
            />
            <span>to</span>
            <input
              type="number"
              placeholder="Max ₹"
              value={maxAmount}
              onChange={(e) => {
                setMaxAmount(e.target.value);
                setPage(1);
              }}
              className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 text-xs"
            />
          </div>

          <div className="ml-auto text-xs text-slate-500">
            Showing <span className="font-bold text-amber-600">{items.length}</span> of{" "}
            <span className="font-bold text-slate-800">{totalCount}</span> pending records
          </div>
        </div>
      </div>

      {/* ── Pending Transactions Master Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Sticky Table Header */}
            <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 shadow-sm">
              <tr className="text-slate-500 uppercase tracking-wider font-semibold">
                <th className="px-3.5 py-3 whitespace-nowrap">Transaction ID</th>
                <th className="px-3 py-3 whitespace-nowrap">Service</th>
                <th className="px-3 py-3 whitespace-nowrap">Vendor / Provider</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Retailer Code & ID</th>
                <th className="px-3.5 py-3 whitespace-nowrap">Retailer Store</th>
                <th className="px-3.5 py-3 whitespace-nowrap text-right">Txn Amount</th>
                <th className="px-3.5 py-3 whitespace-nowrap text-right">CR Amount</th>
                <th className="px-3.5 py-3 whitespace-nowrap text-right">DR Amount</th>
                <th className="px-3 py-3 whitespace-nowrap text-right">Comm</th>
                <th className="px-3 py-3 whitespace-nowrap text-right">GST</th>
                <th className="px-3.5 py-3 whitespace-nowrap text-right">Wallet Impact</th>
                <th className="px-3 py-3 whitespace-nowrap">Date & Time</th>
                <th className="px-3 py-3 whitespace-nowrap text-center">Status</th>
                <th className="px-4 py-3 whitespace-nowrap text-center">Actions</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loadingItems ? (
                // Skeleton Rows
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse bg-slate-50">
                    <td colSpan={14} className="px-4 py-4 text-center text-slate-400">
                      Loading pending records...
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="text-base font-semibold text-slate-700">No Pending Transactions Found</div>
                      <p className="text-xs text-slate-400 max-w-md">
                        All transactions across all service providers and vendors have been processed or no records match your filter criteria.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((txn) => (
                  <tr
                    key={txn.transaction_id}
                    className="hover:bg-amber-50/60 transition-colors group cursor-pointer"
                    onClick={() => openDetailsDrawer(txn)}
                  >
                    {/* Transaction ID */}
                    <td className="px-3.5 py-3.5 font-mono text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-amber-600 hover:underline">{txn.transaction_id}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(txn.transaction_id, txn.transaction_id);
                          }}
                          className="text-slate-400 hover:text-slate-700 p-0.5"
                          title="Copy Txn ID"
                        >
                          {copiedId === txn.transaction_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      {txn.external_txn_id && txn.external_txn_id !== txn.transaction_id && (
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]" title={txn.external_txn_id}>
                          Ref: {txn.external_txn_id}
                        </div>
                      )}
                    </td>

                    {/* Service */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        txn.service === "PAYOUT"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : txn.service === "RECHARGE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : txn.service === "DMT"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {txn.service}
                      </span>
                    </td>

                    {/* Vendor */}
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {txn.vendor}
                      </span>
                    </td>

                    {/* Retailer Code & ID */}
                    <td className="px-3.5 py-3.5 whitespace-nowrap font-mono text-slate-600">
                      <div className="font-semibold text-slate-800">{txn.retailer_code}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[110px]" title={txn.retailer_id}>
                        {txn.retailer_id}
                      </div>
                    </td>

                    {/* Retailer Name */}
                    <td className="px-3.5 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-slate-800 max-w-[140px] truncate" title={txn.retailer_name}>
                        {txn.retailer_name}
                      </div>
                      {txn.retailer_mobile && txn.retailer_mobile !== "--" && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          {txn.retailer_mobile}
                        </div>
                      )}
                    </td>

                    {/* Transaction Amount */}
                    <td className="px-3.5 py-3.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      ₹{txn.transaction_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    {/* CR Amount */}
                    <td className="px-3.5 py-3.5 text-right font-mono text-emerald-600 whitespace-nowrap">
                      {txn.cr_amount > 0 ? `₹${txn.cr_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "--"}
                    </td>

                    {/* DR Amount */}
                    <td className="px-3.5 py-3.5 text-right font-mono text-rose-600 font-semibold whitespace-nowrap">
                      {txn.dr_amount > 0 ? `₹${txn.dr_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "--"}
                    </td>

                    {/* Commission */}
                    <td className="px-3 py-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      {txn.commission > 0 ? `₹${txn.commission.toFixed(2)}` : "--"}
                    </td>

                    {/* GST */}
                    <td className="px-3 py-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      {txn.gst > 0 ? `₹${txn.gst.toFixed(2)}` : "--"}
                    </td>

                    {/* Wallet Impact */}
                    <td className="px-3.5 py-3.5 text-right font-mono whitespace-nowrap font-bold">
                      <span className={txn.dr_amount > 0 ? "text-rose-400" : txn.cr_amount > 0 ? "text-emerald-400" : "text-slate-400"}>
                        {txn.wallet_impact}
                      </span>
                    </td>

                    {/* Date & Time */}
                    <td className="px-3.5 py-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {formatDate(txn.created_at)}
                    </td>

                    {/* Current Status */}
                    <td className="px-3 py-3.5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                        {txn.current_status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => initiateSuccess(txn)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 text-xs font-semibold shadow-sm transition-all"
                          title="Mark as SUCCESS"
                        >
                          SUCCESS
                        </button>
                        <button
                          onClick={() => initiateFailed(txn)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-semibold shadow-sm transition-all"
                          title="Mark as FAILED & Execute Reversal"
                        >
                          FAILED
                        </button>
                        <button
                          onClick={() => openDetailsDrawer(txn)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                          title="View Full Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Footer ── */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPage(1);
              }}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 text-xs focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              Page <span className="font-bold text-slate-800">{page}</span> of{" "}
              <span className="font-bold text-slate-800">{totalPages}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-600 border border-slate-300"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-600 border border-slate-300"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-mono font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded-lg">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-600 border border-slate-300"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-600 border border-slate-300"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Slide-Over Transaction Details Drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white border-l border-slate-200 shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-slate-800">Transaction Details</h2>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      PENDING
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
                    <span>{selectedTxnId}</span>
                    <button
                      onClick={() => selectedTxnId && handleCopy(selectedTxnId, "drawer-id")}
                      className="text-slate-400 hover:text-slate-800"
                      title="Copy ID"
                    >
                      {copiedId === "drawer-id" ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {details && (
                    <>
                      <button
                        onClick={() => {
                          const item = items.find((i) => i.transaction_id === selectedTxnId);
                          if (item) initiateSuccess(item);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 text-xs font-bold transition-all"
                      >
                        SUCCESS
                      </button>
                      <button
                        onClick={() => {
                          const item = items.find((i) => i.transaction_id === selectedTxnId);
                          if (item) initiateFailed(item);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold transition-all"
                      >
                        FAILED
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50 px-4">
                <button
                  onClick={() => setDrawerTab("overview")}
                  className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                    drawerTab === "overview"
                      ? "border-amber-500 text-amber-700 bg-amber-50"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Overview & Merchant
                </button>
                <button
                  onClick={() => setDrawerTab("financial")}
                  className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                    drawerTab === "financial"
                      ? "border-amber-500 text-amber-700 bg-amber-50"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Accounting & Ledger ({details?.accounting_entries?.length || 0})
                </button>
                <button
                  onClick={() => setDrawerTab("provider")}
                  className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                    drawerTab === "provider"
                      ? "border-amber-500 text-amber-700 bg-amber-50"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Provider Technical Data
                </button>
                <button
                  onClick={() => setDrawerTab("timeline")}
                  className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                    drawerTab === "timeline"
                      ? "border-amber-500 text-amber-700 bg-amber-50"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Audit Timeline ({details?.audit_trail?.length || 0})
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {loadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                    <p className="text-sm">Fetching complete financial & provider details...</p>
                  </div>
                ) : !details ? (
                  <div className="text-center py-12 text-slate-400">No details available.</div>
                ) : (
                  <>
                    {/* TAB 1: OVERVIEW & RETAILER */}
                    {drawerTab === "overview" && (
                      <div className="space-y-5">
                        {/* Transaction Card */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Receipt className="w-4 h-4" /> Transaction Information
                          </h3>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-slate-500">Transaction ID:</span>
                              <div className="font-mono font-bold text-slate-800 mt-0.5">{details.transaction.transaction_id}</div>
                            </div>
                            <div>
                              <span className="text-slate-500">External/Vendor ID:</span>
                              <div className="font-mono font-bold text-slate-800 mt-0.5">{details.transaction.external_txn_id || "--"}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">Service:</span>
                              <div className="font-bold text-blue-300 mt-0.5">{details.transaction.service}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">Vendor / Switch:</span>
                              <div className="font-bold text-purple-300 mt-0.5">{details.transaction.vendor}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">Created At:</span>
                              <div className="font-mono text-slate-300 mt-0.5">{formatDate(details.transaction.created_at)}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">Last Updated At:</span>
                              <div className="font-mono text-slate-300 mt-0.5">{formatDate(details.transaction.updated_at)}</div>
                            </div>
                          </div>
                        </div>

                        {/* Retailer Profile Card */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                          <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Store className="w-4 h-4" /> Retailer Merchant Profile
                          </h3>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-slate-400">Retailer Code:</span>
                              <div className="font-mono font-bold text-amber-300 mt-0.5">{details.retailer.retailer_code}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">Store / Merchant Name:</span>
                              <div className="font-bold text-slate-800 mt-0.5">{details.retailer.retailer_name}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">Mobile Number:</span>
                              <div className="font-mono text-slate-700 mt-0.5">{details.retailer.mobile_number}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">Company ID:</span>
                              <div className="font-mono text-slate-400 mt-0.5 truncate">{details.retailer.company_id || "--"}</div>
                            </div>
                            <div className="col-span-2">
                              <span className="text-slate-400">Retailer UUID:</span>
                              <div className="font-mono text-[11px] text-slate-400 mt-0.5 truncate">{details.retailer.retailer_id}</div>
                            </div>
                          </div>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                          <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Wallet className="w-4 h-4" /> Financial Snapshot
                          </h3>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                              <span className="text-[10px] text-slate-400 uppercase">Txn Amount</span>
                              <div className="text-sm font-bold text-slate-800 mt-1">₹{details.financial_details.transaction_amount.toFixed(2)}</div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                              <span className="text-[10px] text-slate-400 uppercase">Debit Amount</span>
                              <div className="text-sm font-bold text-rose-300 mt-1">₹{details.financial_details.debit_amount.toFixed(2)}</div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                              <span className="text-[10px] text-slate-400 uppercase">Wallet Impact</span>
                              <div className="text-sm font-bold text-rose-400 mt-1">{details.financial_details.wallet_impact}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 2: FINANCIAL & LEDGER ENTRIES */}
                    {drawerTab === "financial" && (
                      <div className="space-y-5">
                        {/* Financial Metrics Summary */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400">Total Debit</span>
                            <div className="text-sm font-bold text-rose-300 mt-1">₹{details.financial_details.debit_amount.toFixed(2)}</div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400">Service Charge</span>
                            <div className="text-sm font-bold text-slate-700 mt-1">₹{details.financial_details.service_charge.toFixed(2)}</div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400">GST</span>
                            <div className="text-sm font-bold text-slate-700 mt-1">₹{details.financial_details.gst.toFixed(2)}</div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <span className="text-[10px] text-slate-400">Commission</span>
                            <div className="text-sm font-bold text-emerald-300 mt-1">₹{details.financial_details.commission.toFixed(2)}</div>
                          </div>
                        </div>

                        {/* Balance Before & After */}
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="text-slate-500">Balance Before:</span>
                            <span className="ml-2 font-bold text-slate-800">₹{details.financial_details.balance_before.toFixed(2)}</span>
                          </div>
                          <ArrowDownRight className="w-4 h-4 text-rose-400" />
                          <div>
                            <span className="text-slate-500">Balance After:</span>
                            <span className="ml-2 font-bold text-amber-300">₹{details.financial_details.balance_after.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Full Accounting Ledger Table */}
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                            Double-Entry Ledger Records ({details.accounting_entries.length})
                          </h4>
                          <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-100 text-slate-500 border-b border-slate-200 font-semibold">
                                <tr>
                                  <th className="px-3 py-2">Type</th>
                                  <th className="px-3 py-2">Narration</th>
                                  <th className="px-3 py-2 text-right">Amount</th>
                                  <th className="px-3 py-2 text-right">Before</th>
                                  <th className="px-3 py-2 text-right">After</th>
                                  <th className="px-3 py-2">Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                                {details.accounting_entries.map((entry) => (
                                  <tr key={entry.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        entry.entry_type === "DEBIT"
                                          ? "bg-rose-950 text-rose-300 border border-rose-500/30"
                                          : "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                                      }`}>
                                        {entry.entry_type}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-sans text-slate-700 text-[11px]">
                                      {entry.narration}
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold text-slate-800">
                                      ₹{entry.amount.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-slate-400">
                                      ₹{entry.balance_before.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-amber-300">
                                      ₹{entry.balance_after.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 text-[10px] text-slate-400">
                                      {formatDate(entry.created_at)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: PROVIDER TECHNICAL DATA */}
                    {drawerTab === "provider" && (
                      <div className="space-y-4">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
                          <h4 className="font-bold text-purple-300 uppercase tracking-wider">
                            Gateway & Provider Metadata
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-slate-400">Gateway Vendor:</span>
                              <div className="font-bold text-slate-800 mt-0.5">{details.provider_details.vendor}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">Vendor Reference:</span>
                              <div className="font-mono font-bold text-amber-300 mt-0.5">{details.provider_details.vendor_reference || "--"}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">UTR / Bank Ref:</span>
                              <div className="font-mono font-bold text-emerald-300 mt-0.5">{details.provider_details.utr || "--"}</div>
                            </div>
                            <div>
                              <span className="text-slate-400">RRN:</span>
                              <div className="font-mono text-slate-300 mt-0.5">{details.provider_details.rrn || "--"}</div>
                            </div>
                          </div>
                        </div>

                        {/* Raw JSON Viewer */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                              Provider Raw Response Payload
                            </span>
                            {details.provider_details.provider_response_raw && (
                              <button
                                onClick={() => handleCopy(details.provider_details.provider_response_raw, "raw-json")}
                                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                              >
                                {copiedId === "raw-json" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>Copy JSON</span>
                              </button>
                            )}
                          </div>
                          <pre className="bg-slate-800 p-3.5 rounded-xl border border-slate-300 text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-80 whitespace-pre-wrap">
                            {details.provider_details.provider_response_json
                              ? JSON.stringify(details.provider_details.provider_response_json, null, 2)
                              : details.provider_details.provider_response_raw || "No provider response payload recorded."}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: AUDIT TIMELINE */}
                    {drawerTab === "timeline" && (
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Transaction Status & Audit History
                        </h4>
                        {details.audit_trail.length === 0 ? (
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                            No manual admin status updates recorded yet for this transaction. Transaction is currently in its initial PENDING state.
                          </div>
                        ) : (
                          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
                            {details.audit_trail.map((audit) => (
                              <div key={audit.public_id} className="relative group">
                                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-white"></div>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-800">{audit.action}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{formatDate(audit.created_at)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-700">
                                      {audit.previous_status}
                                    </span>
                                    <span className="text-slate-500">→</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      audit.new_status === "SUCCESS"
                                        ? "bg-emerald-950 text-emerald-300"
                                        : "bg-rose-950 text-rose-300"
                                    }`}>
                                      {audit.new_status}
                                    </span>
                                  </div>
                                  <div className="text-slate-500 text-[11px]">
                                    Actor: <span className="text-slate-800 font-medium">{audit.details?.admin_name || audit.actor_id}</span>
                                  </div>
                                  {audit.details?.failure_reason && (
                                    <div className="text-rose-300 text-[11px]">
                                      Reason: <span className="font-semibold">{audit.details.failure_reason}</span>
                                    </div>
                                  )}
                                  {audit.details?.reversal_amount > 0 && (
                                    <div className="text-emerald-300 text-[11px]">
                                      Reversal: ₹{audit.details.reversal_amount} credited (Ref: {audit.details.reversal_reference})
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal: MARK AS SUCCESS ── */}
      {showSuccessModal && actionTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-emerald-300 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Confirm Transaction Success</h3>
                <p className="text-xs text-slate-500">Manual resolution to status SUCCESS</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-bold text-amber-300">{actionTxn.transaction_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Service / Vendor:</span>
                <span className="font-semibold text-slate-800">{actionTxn.service} ({actionTxn.vendor})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Retailer:</span>
                <span className="font-semibold text-slate-800">{actionTxn.retailer_name} ({actionTxn.retailer_code})</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                <span className="text-slate-600">Transaction Amount:</span>
                <span className="text-emerald-400">₹{actionTxn.transaction_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Financial Note */}
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Accounting Preservation:</strong> Original debit entry and accounting records will be preserved. No additional wallet debit/credit will be performed, and commission/GST will not be duplicated.
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Bank UTR / Reference (Optional):</label>
                <input
                  type="text"
                  value={successUtr}
                  onChange={(e) => setSuccessUtr(e.target.value)}
                  placeholder="Enter Bank UTR if available..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Admin Remarks (Optional):</label>
                <textarea
                  value={successRemarks}
                  onChange={(e) => setSuccessRemarks(e.target.value)}
                  placeholder="Reason for manual verification or notes..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSuccessModal(false)}
                disabled={submittingAction}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSuccess}
                disabled={submittingAction}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
              >
                {submittingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Confirm & Mark as SUCCESS</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal: MARK AS FAILED (REVERSAL) ── */}
      {showFailedModal && actionTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-rose-300 shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Confirm Failure & Accounting Reversal</h3>
                <p className="text-xs text-slate-500">Manual resolution to status FAILED</p>
              </div>
            </div>

            {/* Critical Reversal Warning */}
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-rose-300 mb-0.5">CRITICAL REVERSAL WARNING</div>
                Marking this transaction as FAILED will reverse the applicable financial entries and return the appropriate amount back to the retailer wallet.
              </div>
            </div>

            {/* Financial Reversal Preview Box */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
              <div className="flex justify-between font-sans">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono font-bold text-slate-800">{actionTxn.transaction_id}</span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-slate-400">Merchant:</span>
                <span className="font-semibold text-slate-800">{actionTxn.retailer_name}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                <span className="text-slate-600">Wallet Reversal Amount:</span>
                <span className="text-emerald-400">+₹{actionTxn.dr_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (CR)</span>
              </div>
            </div>

            {/* Mandatory Failure Reason */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Failure Reason <span className="text-rose-400">*</span>:
                </label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-rose-500"
                >
                  {failureReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {failureReason === "Other" && (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Specific Reason <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text"
                    value={customFailureReason}
                    onChange={(e) => setCustomFailureReason(e.target.value)}
                    placeholder="Enter explicit failure reason..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Admin Remarks (Optional):</label>
                <textarea
                  value={failureRemarks}
                  onChange={(e) => setFailureRemarks(e.target.value)}
                  placeholder="Additional audit notes..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowFailedModal(false)}
                disabled={submittingAction}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFailed}
                disabled={submittingAction || (failureReason === "Other" && !customFailureReason.trim())}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submittingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span>Confirm Failure & Execute Reversal</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
