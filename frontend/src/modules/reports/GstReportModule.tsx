"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "@/lib/api";
import {
  FileText,
  Download,
  Filter,
  RotateCcw,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileCheck,
  Building,
  User,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  Scale
} from "lucide-react";

interface GstSummary {
  financial_year: string;
  period: string;
  company_name: string;
  company_gstin: string;
  company_state: string;
  total_transactions: number;
  total_taxable_value: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  total_gst: number;
  total_service_charges: number;
  total_volume: number;
  total_reversals_count: number;
  total_reversals_amount: number;
  status_reconciliation: string;
}

interface ServiceBreakdown {
  service_name: string;
  sac_code: string;
  count: number;
  taxable_value: number;
  gst_rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_gst: number;
  service_charges: number;
  total_amount: number;
}

interface RetailerBreakdown {
  retailer_id: number;
  retailer_code: string;
  retailer_name: string;
  company_name: string;
  count: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_gst: number;
  service_charges: number;
  total_amount: number;
}

interface GstTransaction {
  s_no: number;
  id: string;
  transaction_id: string;
  reference_id: string;
  retailer_id: number;
  retailer_code: string;
  retailer_name: string;
  company_id: number;
  company_name: string;
  service_name: string;
  sac_code: string;
  transaction_date: string;
  transaction_amount: number;
  taxable_value: number;
  gst_rate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_gst: number;
  service_charges: number;
  status: string;
  is_taxable: boolean;
  is_reversal: boolean;
}

interface FilterOptionItem {
  id?: number;
  code?: string;
  name?: string;
  value?: string;
  label?: string;
}

interface GstReportProps {
  portalType: "admin" | "retailer";
  title?: string;
  subtitle?: string;
}

export const GstReportModule: React.FC<GstReportProps> = ({
  portalType,
  title = "Enterprise Service-Wise GST Report",
  subtitle = "Statutory Service-Wise GST Reconciliation & Tax Filing Statement (SAC 997159)"
}) => {
  // Filter States
  const [financialYear, setFinancialYear] = useState<string>("FY 2026-27");
  const [month, setMonth] = useState<string>("ALL");
  const [companyId, setCompanyId] = useState<string>("ALL");
  const [retailerId, setRetailerId] = useState<string>("ALL");
  const [service, setService] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Options State
  const [fyOptions, setFyOptions] = useState<string[]>(["FY 2026-27", "FY 2025-26", "FY 2024-25"]);
  const [monthOptions, setMonthOptions] = useState<Array<{ value: string; label: string }>>([
    { value: "ALL", label: "All Months (Full Year)" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" }
  ]);
  const [serviceOptions, setServiceOptions] = useState<Array<{ code: string; name: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<Array<{ code: string; name: string }>>([]);
  const [companyOptions, setCompanyOptions] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [retailerOptions, setRetailerOptions] = useState<Array<{ id: number; code: string; name: string }>>([]);

  // Data States
  const [summary, setSummary] = useState<GstSummary | null>(null);
  const [serviceBreakdown, setServiceBreakdown] = useState<ServiceBreakdown[]>([]);
  const [retailerBreakdown, setRetailerBreakdown] = useState<RetailerBreakdown[]>([]);
  const [transactions, setTransactions] = useState<GstTransaction[]>([]);
  const [reversals, setReversals] = useState<GstTransaction[]>([]);
  const [metadata, setMetadata] = useState<Record<string, any>>({});

  // UI / Pagination States
  const [activeTab, setActiveTab] = useState<"service" | "retailer" | "transactions" | "reversals">("service");
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [exportingType, setExportingType] = useState<string | null>(null);

  // Auth Helper
  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token =
      localStorage.getItem("p2p_access_token") ||
      localStorage.getItem("pay2pay_access_token") ||
      localStorage.getItem("p2p_admin_token") ||
      localStorage.getItem("p2p_retailer_token") ||
      localStorage.getItem("access_token") ||
      document.cookie.split("; ").find(r => r.startsWith("p2p_access_token=") || r.startsWith("pay2pay_access_token="))?.split("=")[1] ||
      "";

    const headers: Record<string, string> = {};
    if (token && token.trim().length > 10) {
      headers["Authorization"] = `Bearer ${token.trim()}`;
    }
    return headers;
  };

  // 1. Load Filter Options
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await apiClient.get("/reports/gst/filters");
        const json = res.data;
        if (json?.data) {
          if (json.data.financial_years) setFyOptions(json.data.financial_years);
          if (json.data.months) setMonthOptions(json.data.months);
          if (json.data.services) setServiceOptions(json.data.services);
          if (json.data.statuses) setStatusOptions(json.data.statuses);
          if (json.data.companies) setCompanyOptions(json.data.companies);
          if (json.data.retailers) setRetailerOptions(json.data.retailers);
          if (json.data.default_fy) setFinancialYear(json.data.default_fy);
        }
      } catch (err) {
        console.error("Failed to load GST filters", err);
      }
    };
    loadFilters();
  }, []);

  // 2. Load Report Summary & Service Breakdown
  const fetchSummaryAndBreakdown = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (financialYear) q.append("financial_year", financialYear);
      if (month && month !== "ALL") q.append("month", month);
      if (portalType === "admin") {
        if (companyId && companyId !== "ALL") q.append("company_id", companyId);
        if (retailerId && retailerId !== "ALL") q.append("retailer_id", retailerId);
      }
      if (service && service !== "ALL") q.append("service", service);
      if (statusFilter && statusFilter !== "ALL") q.append("status", statusFilter);

      const res = await apiClient.get(`/reports/gst/summary?${q.toString()}`);
      const json = res.data;
      if (json?.data) {
        setSummary(json.data.summary);
        setServiceBreakdown(json.data.service_breakdown || []);
        setRetailerBreakdown(json.data.retailer_breakdown || []);
        setMetadata(json.data.metadata || {});
      }
    } catch (err) {
      console.error("Failed to fetch GST summary", err);
    } finally {
      setLoading(false);
    }
  }, [financialYear, month, companyId, retailerId, service, statusFilter, portalType]);

  // 3. Load Paginated Transactions
  const fetchTransactions = useCallback(async (targetPage: number = 1) => {
    setTableLoading(true);
    try {
      const q = new URLSearchParams();
      q.append("page", targetPage.toString());
      q.append("limit", limit.toString());
      if (financialYear) q.append("financial_year", financialYear);
      if (month && month !== "ALL") q.append("month", month);
      if (portalType === "admin") {
        if (companyId && companyId !== "ALL") q.append("company_id", companyId);
        if (retailerId && retailerId !== "ALL") q.append("retailer_id", retailerId);
      }
      if (service && service !== "ALL") q.append("service", service);
      if (statusFilter && statusFilter !== "ALL") q.append("status", statusFilter);

      const res = await apiClient.get(`/reports/gst/transactions?${q.toString()}`);
      const json = res.data;
      if (json?.data) {
        const items: GstTransaction[] = json.data.items || [];
        setTransactions(items);
        setTotalRecords(json.data.pagination?.total || 0);
        setTotalPages(json.data.pagination?.total_pages || 1);
        setPage(targetPage);

        // Extract reversals for the reversals tab
        const revs = items.filter(t => t.is_reversal);
        setReversals(revs);
      }
    } catch (err) {
      console.error("Failed to fetch GST transactions", err);
    } finally {
      setTableLoading(false);
    }
  }, [financialYear, month, companyId, retailerId, service, statusFilter, limit, portalType]);

  // Initial & Apply load
  useEffect(() => {
    fetchSummaryAndBreakdown();
    fetchTransactions(1);
  }, [fetchSummaryAndBreakdown, fetchTransactions]);

  const handleApplyFilters = () => {
    setPage(1);
    fetchSummaryAndBreakdown();
    fetchTransactions(1);
  };

  const handleResetFilters = () => {
    setFinancialYear("FY 2026-27");
    setMonth("ALL");
    setCompanyId("ALL");
    setRetailerId("ALL");
    setService("ALL");
    setStatusFilter("ALL");
    setPage(1);
  };

  // Export Trigger
  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    setExportingType(format);
    try {
      const q = new URLSearchParams();
      if (financialYear) q.append("financial_year", financialYear);
      if (month && month !== "ALL") q.append("month", month);
      if (portalType === "admin") {
        if (companyId && companyId !== "ALL") q.append("company_id", companyId);
        if (retailerId && retailerId !== "ALL") q.append("retailer_id", retailerId);
      }
      if (service && service !== "ALL") q.append("service", service);
      if (statusFilter && statusFilter !== "ALL") q.append("status", statusFilter);

      const endpoint = `/reports/gst/export/${format}?${q.toString()}`;
      const res = await apiClient.get(endpoint, {
        responseType: "blob",
      });

      const blob = res.data;
      const ext = format === "excel" ? "xlsx" : format;
      const fyClean = (financialYear || "FY").replace(/[^a-zA-Z0-9]/g, "_");
      const mClean = (month || "ALL").replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `GST_Report_${portalType.toUpperCase()}_${fyClean}_${mClean}.${ext}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(`Export failed for format ${format}`, err);
      alert(`Failed to export ${format.toUpperCase()}. Please check your connection and try again.`);
    } finally {
      setExportingType(null);
    }
  };

  const formatINR = (val: number | undefined | null) => {
    const num = Number(val || 0);
    return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 p-4 md:p-6 space-y-6">
      {/* ------------------------------------------------------------------- */}
      {/* 1. MODULE HEADER & EXPORT ACTIONS */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Receipt className="w-6 h-6 text-emerald-700" />
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                {title}
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Statutory 18% GST (SAC 997159)
            </span>
            <span>
              Company GSTIN: <strong className="text-slate-800">{summary?.company_gstin || "33AALCS4455F1Z5"}</strong>
            </span>
            <span>|</span>
            <span>
              Period: <strong className="text-slate-800">{summary?.period || "All Months"}</strong> ({summary?.financial_year || financialYear})
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleExport("pdf")}
            disabled={exportingType !== null}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Download Official Tax Statement PDF"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            {exportingType === "pdf" ? "Exporting..." : "Download PDF"}
          </button>

          <button
            onClick={() => handleExport("excel")}
            disabled={exportingType !== null}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Download 4-Sheet Reconciled Excel Workbook"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            {exportingType === "excel" ? "Exporting..." : "Download Excel"}
          </button>

          <button
            onClick={() => handleExport("csv")}
            disabled={exportingType !== null}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Download CSV Ledger"
          >
            <Download className="w-4 h-4 text-slate-600" />
            {exportingType === "csv" ? "Exporting..." : "Download CSV"}
          </button>

          <button
            onClick={() => {
              fetchSummaryAndBreakdown();
              fetchTransactions(page);
            }}
            disabled={loading || tableLoading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading || tableLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. REUSABLE FILTER BAR (TOP OF REPORT) */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-emerald-600" />
          Report Parameters & Scope Filters
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Financial Year */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Financial Year
            </label>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {fyOptions.map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Month (April to March)
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Admin Company Filter */}
          {portalType === "admin" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Company / Tenant
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="ALL">All Companies (Consolidated)</option>
                {companyOptions.map((c) => (
                  <option key={c.id} value={c.id.toString()}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Admin Retailer Filter */}
          {portalType === "admin" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Retailer Outlets
              </label>
              <select
                value={retailerId}
                onChange={(e) => setRetailerId(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="ALL">All Retailers</option>
                {retailerOptions.map((r) => (
                  <option key={r.id} value={r.id.toString()}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Service Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Fintech Service
            </label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="ALL">All Services</option>
              <option value="PAYIN">PayIn (Payment Gateway Aggregation)</option>
              <option value="PAYOUT">PayOut (Disbursement Transfer)</option>
              <option value="DMT">DMT (Domestic Money Transfer)</option>
              <option value="AEPS">AEPS (Aadhaar Enabled Banking)</option>
              <option value="BBPS">BBPS (Bill Payment System)</option>
              <option value="RECHARGE">Mobile & DTH Recharge</option>
              <option value="WALLET_TOPUP">Wallet Top-Up</option>
            </select>
          </div>

          {/* Transaction Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Transaction Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">SUCCESS (Taxable Turnover)</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED (Non-taxable)</option>
              <option value="REFUNDED">REFUNDED / REVERSED</option>
            </select>
          </div>

          {/* Filter Action Buttons */}
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
            <button
              onClick={handleApplyFilters}
              disabled={loading || tableLoading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              Generate / Apply Filters
            </button>
            <button
              onClick={handleResetFilters}
              disabled={loading || tableLoading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. EXECUTIVE KPI CARDS GRID */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* Total Txns */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Txns
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg md:text-xl font-bold text-slate-900">
              {summary ? summary.total_transactions.toLocaleString() : "--"}
            </span>
            <span className="text-slate-400">
              <Layers className="w-4 h-4 text-emerald-600" />
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Processed Volume</span>
        </div>

        {/* Total Volume */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Gross Volume
          </span>
          <div className="mt-1">
            <span className="text-base md:text-lg font-bold text-slate-900">
              {summary ? formatINR(summary.total_volume) : "--"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Throughput</span>
        </div>

        {/* Taxable Value */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Taxable Value
          </span>
          <div className="mt-1">
            <span className="text-base md:text-lg font-bold text-slate-900">
              {summary ? formatINR(summary.total_taxable_value) : "--"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Net Base Charges</span>
        </div>

        {/* CGST */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Central GST (9%)
          </span>
          <div className="mt-1">
            <span className="text-base md:text-lg font-bold text-emerald-700">
              {summary ? formatINR(summary.total_cgst) : "--"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Intra-State CGST</span>
        </div>

        {/* SGST */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            State GST (9%)
          </span>
          <div className="mt-1">
            <span className="text-base md:text-lg font-bold text-emerald-700">
              {summary ? formatINR(summary.total_sgst) : "--"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Tamil Nadu (33)</span>
        </div>

        {/* IGST */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Integrated GST
          </span>
          <div className="mt-1">
            <span className="text-base md:text-lg font-bold text-sky-700">
              {summary ? formatINR(summary.total_igst) : "--"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Inter-State (18%)</span>
        </div>

        {/* Total GST */}
        <div className="bg-emerald-50 p-3.5 rounded-xl border-2 border-emerald-500 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
            Total GST Liability
          </span>
          <div className="mt-1">
            <span className="text-base md:text-lg font-extrabold text-emerald-950">
              {summary ? formatINR(summary.total_gst) : "--"}
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1">100% Reconciled</span>
        </div>

        {/* Total Service Charges */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Charges
          </span>
          <div className="mt-1">
            <span className="text-base md:text-lg font-bold text-slate-900">
              {summary ? formatINR(summary.total_service_charges) : "--"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1">Taxable + GST</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 4. TAB NAVIGATION */}
      {/* ------------------------------------------------------------------- */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("service")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "service"
              ? "border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <Scale className="w-4 h-4 text-emerald-600" />
          Service-Wise GST Breakdown
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
            P0 Core
          </span>
        </button>

        {portalType === "admin" && (
          <button
            onClick={() => setActiveTab("retailer")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "retailer"
                ? "border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
            }`}
          >
            <User className="w-4 h-4 text-slate-600" />
            Retailer-Wise GST Summary
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
              {retailerBreakdown.length}
            </span>
          </button>
        )}

        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "transactions"
              ? "border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <FileText className="w-4 h-4 text-slate-600" />
          Transaction Details Ledger
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
            {totalRecords}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("reversals")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "reversals"
              ? "border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          <AlertCircle className="w-4 h-4 text-amber-600" />
          Reversals & Adjustments
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
            {summary?.total_reversals_count || 0}
          </span>
        </button>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 5. TAB PANELS */}
      {/* ------------------------------------------------------------------- */}

      {/* TAB 1: SERVICE-WISE BREAKDOWN TABLE */}
      {activeTab === "service" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Statutory Service-Wise GST Matrix (SAC 997159)
              </h2>
              <p className="text-xs text-slate-500">
                Detailed tax liability breakdown per service. Every service is individually auditable.
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Place of Supply: <strong className="text-emerald-700">{summary?.company_state || "Tamil Nadu"} (33)</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Service Name</th>
                  <th className="px-3 py-3 text-center">SAC Code</th>
                  <th className="px-3 py-3 text-right">Transactions</th>
                  <th className="px-4 py-3 text-right">Gross Volume (₹)</th>
                  <th className="px-4 py-3 text-right">Taxable Value (₹)</th>
                  <th className="px-3 py-3 text-center">GST Rate</th>
                  <th className="px-3 py-3 text-right">CGST 9% (₹)</th>
                  <th className="px-3 py-3 text-right">SGST 9% (₹)</th>
                  <th className="px-3 py-3 text-right">IGST 18% (₹)</th>
                  <th className="px-4 py-3 text-right text-emerald-800 bg-emerald-50/50">Total GST (₹)</th>
                  <th className="px-4 py-3 text-right">Total Charges (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {serviceBreakdown.map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {s.service_name}
                    </td>
                    <td className="px-3 py-3 text-center text-slate-500 font-mono">
                      {s.sac_code}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {s.count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {s.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                      {s.taxable_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {s.gst_rate}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-700">
                      {s.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-700">
                      {s.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sky-700">
                      {s.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-900 bg-emerald-50/30">
                      {s.total_gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {s.service_charges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-emerald-50/80 font-bold text-slate-900 border-t-2 border-emerald-600">
                <tr>
                  <td className="px-4 py-3.5">CONSOLIDATED TOTAL</td>
                  <td className="px-3 py-3.5 text-center text-slate-500">--</td>
                  <td className="px-3 py-3.5 text-right font-mono">
                    {summary?.total_transactions.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono">
                    {summary?.total_volume.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-950">
                    {summary?.total_taxable_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-3.5 text-center">18%</td>
                  <td className="px-3 py-3.5 text-right font-mono text-emerald-800">
                    {summary?.total_cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono text-emerald-800">
                    {summary?.total_sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono text-sky-800">
                    {summary?.total_igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-emerald-950 font-extrabold text-sm">
                    {summary?.total_gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono">
                    {summary?.total_service_charges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RETAILER-WISE BREAKDOWN TABLE (ADMIN ONLY) */}
      {activeTab === "retailer" && portalType === "admin" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Retailer Outlets Tax Contribution Matrix
              </h2>
              <p className="text-xs text-slate-500">
                Consolidated volume, taxable charges, and GST generated per retailer.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Retailer Code</th>
                  <th className="px-4 py-3">Store / Outlet Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-3 py-3 text-right">Transactions</th>
                  <th className="px-4 py-3 text-right">Gross Volume (₹)</th>
                  <th className="px-4 py-3 text-right">Taxable Value (₹)</th>
                  <th className="px-3 py-3 text-right">CGST (₹)</th>
                  <th className="px-3 py-3 text-right">SGST (₹)</th>
                  <th className="px-3 py-3 text-right">IGST (₹)</th>
                  <th className="px-4 py-3 text-right font-bold text-emerald-900 bg-emerald-50/50">Total GST (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {retailerBreakdown.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {r.retailer_code}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {r.retailer_name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {r.company_name}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {r.count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {r.total_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                      {r.taxable_value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-700">
                      {r.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-700">
                      {r.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sky-700">
                      {r.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-900 bg-emerald-50/30">
                      {r.total_gst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTION DETAILS LEDGER */}
      {activeTab === "transactions" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Transaction-Level Statutory Audit Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Showing {transactions.length} of {totalRecords} records for active filters.
              </p>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchTransactions(page - 1)}
                disabled={page <= 1 || tableLoading}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => fetchTransactions(page + 1)}
                disabled={page >= totalPages || tableLoading}
                className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-center">S.No</th>
                  <th className="px-3 py-3">Transaction ID</th>
                  <th className="px-3 py-3">Reference / Order ID</th>
                  {portalType === "admin" && <th className="px-3 py-3">Retailer</th>}
                  <th className="px-3 py-3">Service</th>
                  <th className="px-3 py-3">Date & Time</th>
                  <th className="px-3 py-3 text-right">Amount (₹)</th>
                  <th className="px-3 py-3 text-right">Taxable (₹)</th>
                  <th className="px-2 py-3 text-center">Rate</th>
                  <th className="px-3 py-3 text-right">CGST (₹)</th>
                  <th className="px-3 py-3 text-right">SGST (₹)</th>
                  <th className="px-3 py-3 text-right font-bold text-emerald-900 bg-emerald-50/50">Total GST (₹)</th>
                  <th className="px-3 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {tableLoading ? (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                      Loading transaction records...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-slate-400">
                      No matching GST transactions found for the selected period and filters.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id || t.transaction_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 text-center text-slate-400 font-mono">
                        {t.s_no}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {t.transaction_id}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                        {t.reference_id}
                      </td>
                      {portalType === "admin" && (
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">{t.retailer_code}</span>
                          <span className="text-[10px] text-slate-400 block">{t.retailer_name}</span>
                        </td>
                      )}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{t.service_name}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">SAC {t.sac_code}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {t.transaction_date}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800">
                        {t.transaction_amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                        {t.taxable_value.toFixed(2)}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-[10px] text-slate-600">
                        {t.gst_rate}%
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-700">
                        {t.cgst.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-emerald-700">
                        {t.sgst.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-900 bg-emerald-50/30">
                        {t.total_gst.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === "SUCCESS"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : t.status === "PENDING"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REVERSALS & ADJUSTMENTS */}
      {activeTab === "reversals" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Reversals, Refunds & Non-Taxable Adjustments
              </h2>
              <p className="text-xs text-slate-500">
                Failed, reversed, or refunded transactions are strictly excluded from taxable turnover.
              </p>
            </div>
            <div className="text-xs text-amber-800 font-semibold bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              Total Non-Taxable: {formatINR(summary?.total_reversals_amount)} ({summary?.total_reversals_count || 0} Records)
            </div>
          </div>

          <div className="p-4">
            {reversals.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                No failed or reversed transactions in this period. All processed transactions are in order.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Transaction ID</th>
                      <th className="px-3 py-2.5">Reference ID</th>
                      <th className="px-3 py-2.5">Retailer</th>
                      <th className="px-3 py-2.5">Service</th>
                      <th className="px-3 py-2.5">Date & Time</th>
                      <th className="px-3 py-2.5 text-right">Attempted Amount (₹)</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5">Tax Treatment Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {reversals.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-mono font-semibold text-slate-900">{r.transaction_id}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{r.reference_id}</td>
                        <td className="px-3 py-2.5">{r.retailer_code} ({r.retailer_name})</td>
                        <td className="px-3 py-2.5">{r.service_name}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-500 text-[11px]">{r.transaction_date}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-800">{r.transaction_amount.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                          Excluded from taxable turnover under GST statutory rules.
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
