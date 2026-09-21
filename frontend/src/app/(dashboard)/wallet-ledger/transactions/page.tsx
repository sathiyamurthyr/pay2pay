"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import api from "@/lib/api";
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
  ExternalLink
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
  const [datePreset, setDatePreset] = useState<string>("ALL");
  const [userType, setUserType] = useState<string>("ALL");
  const [selectedUserRefId, setSelectedUserRefId] = useState<string>("");
  const [service, setService] = useState<string>("ALL");
  const [entryType, setEntryType] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [reconFilter, setReconFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

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

  // ── Date Presets ────────────────────────────────────────────────────────────
  const handleDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const formatDateStr = (d: Date) => d.toISOString().split("T")[0];

    if (preset === "TODAY") {
      const todayStr = formatDateStr(now);
      setFromDate(todayStr);
      setToDate(todayStr);
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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAuditData();
  };

  const handleResetFilters = () => {
    setFromDate("");
    setToDate("");
    setDatePreset("ALL");
    setUserType("ALL");
    setSelectedUserRefId("");
    setService("ALL");
    setEntryType("ALL");
    setStatusFilter("ALL");
    setReconFilter("ALL");
    setSearchTerm("");
    setPage(1);
  };

  // ── Export CSV ──────────────────────────────────────────────────────────────
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
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("p2p_access_token") || localStorage.getItem("pay2pay_access_token") || ""}`
        }
      });
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `wallet_ledger_audit_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  // ── Fetch Transaction Detail for Slide-Over Drawer ──────────────────────────
  const openTransactionDetail = async (txnId: string, primaryId?: number) => {
    setSelectedTxnId(txnId);
    setLoadingTrace(true);
    try {
      const url = primaryId
        ? `/wallet-ledger/transactions/${encodeURIComponent(txnId)}?primary_id=${primaryId}`
        : `/wallet-ledger/transactions/${encodeURIComponent(txnId)}`;
      const res = await api.get(url);
      setTraceDetail(res.data);
    } catch (err) {
      console.error("Failed to load trace detail:", err);
      setTraceDetail(null);
    } finally {
      setLoadingTrace(false);
    }
  };

  const closeDrawer = () => {
    setSelectedTxnId(null);
    setTraceDetail(null);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ── Top Bar Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Financial Audit & Ledger Engine
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Wallet Ledger & Financial Reconciliation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Authoritative CR/DR tracking, hierarchy mapping, balance progression audit, and gateway reconciliation.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "grid"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Audit Grid
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "services"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Service Breakdown
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={exporting || loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition"
          >
            {exporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            )}
            Export CSV
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {/* Total Transactions */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Total Transactions</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {summary.total_transactions.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Full filtered volume</div>
        </div>

        {/* Total Credits */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-950/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span>Total Credits (+CR)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.total_credit)}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1">Wallet allocations & top-ups</div>
        </div>

        {/* Total Debits */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-100 dark:border-rose-950/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-rose-700 dark:text-rose-400">
            <span>Total Debits (-DR)</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(summary.total_debit)}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-1">Payouts, utilities & fees</div>
        </div>

        {/* Net Movement */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Net Movement (CR - DR)</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div
            className={`mt-2 text-xl font-bold ${
              summary.net_movement >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {formatCurrency(summary.net_movement)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Net wallet balance flow</div>
        </div>

        {/* Matched Count */}
        <div
          onClick={() => setReconFilter("MATCHED")}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-300 shadow-sm cursor-pointer transition flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span>Recon: Matched</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
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
          className={`p-4 rounded-xl border shadow-sm cursor-pointer transition flex flex-col justify-between ${
            summary.mismatch_count > 0
              ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 text-rose-700"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-rose-600 dark:text-rose-400">
            <span>Discrepancies</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <div className="mt-2 text-xl font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            {summary.mismatch_count.toLocaleString("en-IN")}
            {summary.mismatch_count > 0 && (
              <span className="text-[10px] font-semibold bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 px-1.5 py-0.5 rounded-full">
                Review
              </span>
            )}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-1">Audit variances detected</div>
        </div>
      </div>

      {/* ── Filters Section ────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        {/* Row 1: Date Range Presets & Inputs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>Date Range:</span>
            <div className="flex items-center gap-1 ml-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              {["TODAY", "7D", "30D", "ALL"].map((p) => (
                <button
                  key={p}
                  onClick={() => handleDatePreset(p)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                    datePreset === p
                      ? "bg-white dark:bg-slate-700 text-primary font-semibold shadow-xs"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {p === "TODAY" ? "Today" : p === "7D" ? "7 Days" : p === "30D" ? "30 Days" : "All Time"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset("CUSTOM");
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              placeholder="From"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset("CUSTOM");
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              placeholder="To"
            />
          </div>
        </div>

        {/* Row 2: Select Filters */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {/* User Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              User Type
            </label>
            <select
              value={userType}
              onChange={(e) => {
                setUserType(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All User Types</option>
              <option value="SUPER_DISTRIBUTOR">Super Distributor (SD)</option>
              <option value="DISTRIBUTOR">Distributor</option>
              <option value="RETAILER">Retailer</option>
            </select>
          </div>

          {/* User Cascading Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              {userType === "SUPER_DISTRIBUTOR"
                ? "Select SD"
                : userType === "DISTRIBUTOR"
                ? "Select Distributor"
                : userType === "RETAILER"
                ? "Select Retailer"
                : "Select User"}
            </label>
            <select
              value={selectedUserRefId}
              onChange={(e) => {
                setSelectedUserRefId(e.target.value);
                setPage(1);
              }}
              disabled={loadingEntities}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium truncate"
            >
              <option value="">
                {loadingEntities ? "Loading..." : "All Users in Type"}
              </option>
              {entities.map((ent) => (
                <option key={`${ent.user_type}-${ent.id}`} value={ent.id}>
                  {ent.code} — {ent.name}
                </option>
              ))}
            </select>
          </div>

          {/* Service */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Service
            </label>
            <select
              value={service}
              onChange={(e) => {
                setService(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All Services</option>
              <option value="PAYOUT">Payout</option>
              <option value="TOPUP">Top-up</option>
              <option value="DMT">DMT</option>
              <option value="AEPS">AEPS</option>
              <option value="BBPS">BBPS</option>
              <option value="RECHARGE">Recharge</option>
              <option value="BENE_VERIFY">Penny Drop Verification</option>
              <option value="Aadhaar Verification">Aadhaar eKYC</option>
              <option value="POS_COMMISSION">POS Commission</option>
              <option value="General Wallet Allocation">Wallet Top-up Allocation</option>
            </select>
          </div>

          {/* CR / DR */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              CR / DR
            </label>
            <select
              value={entryType}
              onChange={(e) => {
                setEntryType(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All Entries (CR & DR)</option>
              <option value="CREDIT">Credit (+CR)</option>
              <option value="DEBIT">Debit (-DR)</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Txn Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="PENDING">Pending / Processing</option>
              <option value="FAILED">Failed</option>
              <option value="REVERSED">Reversed / Refunded</option>
            </select>
          </div>

          {/* Reconciliation Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Reconciliation
            </label>
            <select
              value={reconFilter}
              onChange={(e) => {
                setReconFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All Reconciliation</option>
              <option value="MATCHED">Matched Only</option>
              <option value="MISMATCH">⚠ Mismatches (Action Needed)</option>
              <option value="PENDING">Pending Confirmation</option>
            </select>
          </div>
        </div>

        {/* Row 3: Search & Reset */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Transaction ID, Reference ID, Retailer Name, Store Code, or Ledger ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={handleResetFilters}
            className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition whitespace-nowrap"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* ── Main Content Area ──────────────────────────────────────────────── */}
      {activeTab === "grid" ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Table Header Info */}
          <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-900 dark:text-white">{data.length}</span> of{" "}
              <span className="font-semibold text-slate-900 dark:text-white">
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
                className="text-xs py-1 px-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1700px]">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold tracking-wider uppercase text-[10.5px]">
                  <th className="py-3 px-3.5 whitespace-nowrap">Date / Time (IST)</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Transaction ID</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Ledger ID</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Ref ID</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">User Type</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">User Name</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Hierarchy (Company &rarr; SD &rarr; Dist &rarr; Ret)</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Service</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">CR / DR</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">Txn Amount</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">Ledger Amount</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">MDR / Comm</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">Opening Bal</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">Closing Bal</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Reconciliation</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                        <span>Querying financial transaction ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <HelpCircle className="w-8 h-8 text-slate-300" />
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
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
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition ${
                          isMismatch
                            ? "bg-rose-50/50 dark:bg-rose-950/20 border-l-4 border-l-rose-500"
                            : ""
                        }`}
                      >
                        {/* Date Time */}
                        <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                          {item.date_time}
                        </td>

                        {/* Txn ID */}
                        <td className="py-3 px-3.5 whitespace-nowrap font-mono font-medium text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-1.5">
                            <span>{item.txn_id}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(item.txn_id, item.txn_id);
                              }}
                              className="text-slate-400 hover:text-slate-600 p-0.5"
                            >
                              {copiedKey === item.txn_id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Ledger ID */}
                        <td className="py-3 px-3.5 whitespace-nowrap font-mono">
                          {item.ledger_id !== "N/A" ? (
                            <span className="px-2 py-0.5 rounded text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold">
                              #{item.ledger_id}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>

                        {/* Ref ID */}
                        <td className="py-3 px-3.5 whitespace-nowrap font-mono text-slate-500 truncate max-w-[140px]" title={item.ref_id}>
                          {item.ref_id || "—"}
                        </td>

                        {/* User Type */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.user_type}
                          </span>
                        </td>

                        {/* User Name */}
                        <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                          <div className="truncate max-w-[160px]" title={item.user_name}>
                            {item.user_name}
                          </div>
                        </td>

                        {/* Hierarchy Path */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{item.company}</span>
                            <span>&rarr;</span>
                            <span className="text-slate-500">{item.super_distributor !== "N/A" ? item.super_distributor : "N/A"}</span>
                            <span>&rarr;</span>
                            <span className="text-slate-500">{item.distributor !== "N/A" ? item.distributor : "N/A"}</span>
                            <span>&rarr;</span>
                            <span className="font-medium text-primary">{item.retailer !== "N/A" ? item.retailer : "N/A"}</span>
                          </div>
                        </td>

                        {/* Service */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                            {item.service}
                          </span>
                        </td>

                        {/* CR / DR Badge */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {isCredit ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <ArrowUpRight className="w-3 h-3" />
                              CR Credit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <ArrowDownRight className="w-3 h-3" />
                              DR Debit
                            </span>
                          )}
                        </td>

                        {/* Transaction Amount */}
                        <td className={`py-3 px-3.5 whitespace-nowrap text-right font-mono font-bold ${
                          isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}>
                          {isCredit ? "+" : "-"}{formatCurrency(item.amount)}
                        </td>

                        {/* Ledger Amount */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono text-slate-700 dark:text-slate-300">
                          {formatCurrency(item.ledger_amount)}
                        </td>

                        {/* MDR / Comm */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                          {item.mdr_amount > 0 ? (
                            <span className="text-amber-600 font-semibold" title={`MDR: ${item.mdr_percent}%`}>
                              MDR: {formatCurrency(item.mdr_amount)}
                            </span>
                          ) : item.commission_amount > 0 ? (
                            <span className="text-indigo-600 font-semibold" title={`Comm: ${item.commission_percent}%`}>
                              Comm: {formatCurrency(item.commission_amount)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Opening Balance */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono text-slate-500">
                          {formatCurrency(item.opening_balance)}
                        </td>

                        {/* Closing Balance */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.closing_balance)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {item.status === "SUCCESS" ? (
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                              SUCCESS
                            </span>
                          ) : item.status === "PENDING" ? (
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                              PENDING
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
                              {item.status}
                            </span>
                          )}
                        </td>

                        {/* Reconciliation Status */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {item.reconciliation === "MATCHED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              MATCHED
                            </span>
                          ) : item.reconciliation === "MISMATCH" ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                title={item.mismatch_reasons.join("\n")}
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                ⚠ MISMATCH
                              </span>
                              {item.mismatch_reasons.length > 0 && (
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 max-w-[130px] truncate" title={item.mismatch_reasons[0]}>
                                  {item.mismatch_reasons[0]}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              PENDING
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openTransactionDetail(item.txn_id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Inspect Audit Trace"
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

          {/* Table Footer & Pagination */}
          <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Page <span className="font-semibold text-slate-900 dark:text-white">{page}</span> of{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Service Breakdown View ─────────────────────────────────────────── */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Service-Wise Financial Summary
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated business volume, ledger credits, debits, MDR, and net balance movement grouped by service.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold tracking-wider uppercase text-[10.5px]">
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4 text-right">Transactions</th>
                  <th className="py-3 px-4 text-right">Total CR</th>
                  <th className="py-3 px-4 text-right">Total DR</th>
                  <th className="py-3 px-4 text-right">Net Movement</th>
                  <th className="py-3 px-4 text-right">MDR / Charges</th>
                  <th className="py-3 px-4 text-right">Commissions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(summary.services_summary || []).map((s) => (
                  <tr key={s.service} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {s.service}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      {s.transactions.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 font-medium">
                      +{formatCurrency(s.total_cr)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-rose-600 font-medium">
                      -{formatCurrency(s.total_dr)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        s.net_movement >= 0 ? "text-emerald-600" : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {formatCurrency(s.net_movement)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-amber-600">
                      {formatCurrency(s.mdr)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-600">
                      {formatCurrency(s.commission)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Slide-Over Transaction Audit Detail Drawer ──────────────────────── */}
      {selectedTxnId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            onClick={closeDrawer}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 h-full flex flex-col z-10 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary tracking-wider uppercase">
                    Audit Investigation
                  </span>
                  {traceDetail?.status && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {traceDetail.status}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                  {selectedTxnId}
                </h2>
              </div>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {loadingTrace ? (
                <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <span>Loading deep audit trace & ledger verification...</span>
                </div>
              ) : traceDetail ? (
                <>
                  {/* Hierarchy Path Card */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Entity Hierarchy Chain
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Company</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {traceDetail.hierarchy.company}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Super Distributor</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {traceDetail.hierarchy.super_distributor}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Distributor</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {traceDetail.hierarchy.distributor}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Retailer</span>
                        <span className="font-semibold text-primary">
                          {traceDetail.hierarchy.retailer}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Financial Flow */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      Financial Movement Trace
                    </h3>
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                        <span className="text-[10px] text-slate-400 block">Service</span>
                        <span className="font-bold text-primary">{traceDetail.service}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                        <span className="text-[10px] text-slate-400 block">Business Total</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(traceDetail.total_business_amount)}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300" />
                      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                        <span className="text-[10px] text-slate-400 block">Ledger Rows</span>
                        <span className="font-bold text-indigo-600">
                          {traceDetail.ledger_postings?.length || 0} Posted
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Component Ledger Rows */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-primary" />
                      Atomic Transaction Ledger Lines
                    </h3>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-800/80 text-[10px] uppercase font-semibold text-slate-500">
                          <tr>
                            <th className="py-2 px-3">Line Component</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                            <th className="py-2 px-3 text-right">Balance Progression</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                          {traceDetail.components?.map((c: any) => (
                            <tr key={c.id}>
                              <td className="py-2.5 px-3 font-sans font-medium text-slate-900 dark:text-white">
                                {c.narration}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  c.entry_type === "CREDIT" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                }`}>
                                  {c.entry_type}
                                </span>
                              </td>
                              <td className={`py-2.5 px-3 text-right font-bold ${
                                c.entry_type === "CREDIT" ? "text-emerald-600" : "text-rose-600"
                              }`}>
                                {c.entry_type === "CREDIT" ? "+" : "-"}{formatCurrency(c.amount)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-[11px] text-slate-500">
                                {formatCurrency(c.balance_before)} &rarr; {formatCurrency(c.balance_after)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Wallet Ledger Postings */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                      Posted Double-Entry Wallet Ledger
                    </h3>
                    {traceDetail.ledger_postings?.length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800/80 text-[10px] uppercase font-semibold text-slate-500">
                            <tr>
                              <th className="py-2 px-3">Ledger ID</th>
                              <th className="py-2 px-3">Reference</th>
                              <th className="py-2 px-3 text-right">Debit</th>
                              <th className="py-2 px-3 text-right">Credit</th>
                              <th className="py-2 px-3 text-right">Closing Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                            {traceDetail.ledger_postings.map((wl: any) => (
                              <tr key={wl.ledger_id}>
                                <td className="py-2.5 px-3 font-semibold text-indigo-600">
                                  #{wl.ledger_id}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500">
                                  {wl.reference_id}
                                </td>
                                <td className="py-2.5 px-3 text-right text-rose-600 font-bold">
                                  {wl.debit > 0 ? `-${formatCurrency(wl.debit)}` : "—"}
                                </td>
                                <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                                  {wl.credit > 0 ? `+${formatCurrency(wl.credit)}` : "—"}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-slate-800 dark:text-slate-200">
                                  {formatCurrency(wl.balance_after)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                        ⚠ No matching wallet ledger record posted for this transaction reference. This is logged as a ledger audit variance.
                      </div>
                    )}
                  </div>

                  {/* Reconciliation Box */}
                  {traceDetail.reconciliation && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                        Gateway & External Reconciliation
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-sans">Status</span>
                          <span className="font-bold text-primary">
                            {traceDetail.reconciliation.recon_status}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block font-sans">Amount Difference</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(traceDetail.reconciliation.amount_difference || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={closeDrawer}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
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
