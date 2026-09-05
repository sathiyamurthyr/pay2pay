"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";
import {
  Terminal,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  Eye,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Server,
  Layers,
  Code,
  ExternalLink,
  ChevronRight,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  FileCode,
  ShieldAlert,
  ArrowRight,
  Database,
  Cpu,
  Zap,
  Globe,
  Radio,
  Building,
  Shield,
  Send
} from "lucide-react";

interface ApiLogItem {
  id: string;
  log_id: string;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  service: string;
  api_name: string;
  endpoint: string;
  http_method: string;
  client_name?: string;
  provider_name?: string;
  transaction_id?: string;
  request_id: string;
  correlation_id?: string;
  client_reference_id?: string;
  provider_reference_id?: string;
  http_status: number;
  response_status: string;
  duration_ms: number;
  environment: string;
  retailer_id?: string;
  error_code?: string;
  error_message?: string;
  payload_truncated?: boolean;
  timestamp: string;
  request_timestamp?: string;
  response_timestamp?: string;
}

interface ApiLogDetail extends ApiLogItem {
  base_url_reference?: string;
  client_ip?: string;
  customer_id?: string;
  performed_by?: string;
  parent_request_id?: string;
  provider_response_code?: string;
  provider_response_message?: string;
  error_type?: string;
  stack_trace?: string;
  retry_attempt?: number;
  failure_reason?: string;
  request_headers?: Record<string, any>;
  request_query?: Record<string, any>;
  request_body?: any;
  request_body_raw?: string;
  response_headers?: Record<string, any>;
  response_body?: any;
  response_body_raw?: string;
  original_size_bytes?: number;
  stored_size_bytes?: number;
  created_date?: string;
}

interface TraceStep {
  step_number: number;
  id: string;
  log_id: string;
  direction: "INBOUND" | "OUTBOUND" | "INTERNAL";
  service: string;
  api_name: string;
  endpoint: string;
  http_method: string;
  client_name?: string;
  provider_name?: string;
  transaction_id?: string;
  request_id?: string;
  correlation_id?: string;
  http_status: number;
  response_status: string;
  duration_ms: number;
  error_message?: string;
  timestamp: string;
}

interface ApiLogMetrics {
  total_calls_today: number;
  inbound_count: number;
  outbound_count: number;
  internal_count: number;
  error_count: number;
  error_rate_pct: number;
  avg_duration_ms: number;
  timestamp?: string;
}

type ViewTab = "ALL" | "VENDOR" | "INTERNAL" | "PAYOUT_FAILURES";

function EnterpriseApiLogsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Primary View Tab
  const [activeTab, setActiveTab] = useState<ViewTab>("ALL");

  // State
  const [logs, setLogs] = useState<ApiLogItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [servicesList, setServicesList] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<ApiLogMetrics | null>(null);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("ALL");
  const [selectedDirection, setSelectedDirection] = useState<string>("ALL");
  const [selectedMethod, setSelectedMethod] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedHttpStatus, setSelectedHttpStatus] = useState<string>("ALL");
  const [selectedProvider, setSelectedProvider] = useState<string>("ALL");
  const [selectedDatePreset, setSelectedDatePreset] = useState<string>("TODAY");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isErrorOnly, setIsErrorOnly] = useState<boolean>(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(0);

  // Active Deep Link Context
  const [activeDeepLinkTxn, setActiveDeepLinkTxn] = useState<string | null>(null);

  // Detail Drawer State
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [logDetail, setLogDetail] = useState<ApiLogDetail | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"overview" | "request" | "response" | "error" | "trace">("overview");
  const [traceLoading, setTraceLoading] = useState<boolean>(false);
  const [traceSteps, setTraceSteps] = useState<TraceStep[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. Copy Helper
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 2. Parse URL Search Params on Mount or Change
  useEffect(() => {
    if (!searchParams) return;

    const tabParam = searchParams.get("tab")?.toUpperCase();
    const serviceParam = searchParams.get("service")?.toUpperCase();
    const dirParam = searchParams.get("direction")?.toUpperCase();
    const isErrParam = searchParams.get("is_error");
    const txnParam = searchParams.get("transaction_id");
    const providerParam = searchParams.get("provider_name");
    const searchParam = searchParams.get("search");

    if (
      tabParam === "PAYOUT_FAILURES" ||
      (serviceParam === "PAYOUT" && (isErrParam === "true" || dirParam === "OUTBOUND"))
    ) {
      if (isErrParam === "true" || tabParam === "PAYOUT_FAILURES") {
        setActiveTab("PAYOUT_FAILURES");
        setSelectedService("PAYOUT");
        setSelectedDirection("OUTBOUND");
        setIsErrorOnly(true);
        setSelectedDatePreset("ALL");
      } else {
        setActiveTab("VENDOR");
        setSelectedService("PAYOUT");
        setSelectedDirection("OUTBOUND");
      }
    } else if (tabParam === "VENDOR" || dirParam === "OUTBOUND") {
      setActiveTab("VENDOR");
      setSelectedDirection("OUTBOUND");
      if (serviceParam) setSelectedService(serviceParam);
      if (isErrParam === "true") setIsErrorOnly(true);
    } else if (tabParam === "INTERNAL" || dirParam === "INBOUND") {
      setActiveTab("INTERNAL");
      setSelectedDirection("INBOUND");
      if (serviceParam) setSelectedService(serviceParam);
      if (isErrParam === "true") setIsErrorOnly(true);
    } else {
      setActiveTab("ALL");
      if (serviceParam) setSelectedService(serviceParam);
      if (dirParam) setSelectedDirection(dirParam);
      if (isErrParam === "true") setIsErrorOnly(true);
    }

    if (providerParam) {
      setSelectedProvider(providerParam);
    }

    if (txnParam) {
      setSearch(txnParam);
      setActiveDeepLinkTxn(txnParam);
      setSelectedDatePreset("ALL");
    } else if (searchParam) {
      setSearch(searchParam);
    }
  }, [searchParams]);

  // 3. Tab Switching Handler
  const handleTabChange = (tab: ViewTab) => {
    setActiveTab(tab);
    setPage(1);

    if (tab === "ALL") {
      setSelectedDirection("ALL");
      setIsErrorOnly(false);
      if (selectedService === "PAYOUT" && !searchParams?.get("service")) {
        setSelectedService("ALL");
      }
    } else if (tab === "VENDOR") {
      setSelectedDirection("OUTBOUND");
      setIsErrorOnly(false);
    } else if (tab === "INTERNAL") {
      setSelectedDirection("INBOUND");
      setIsErrorOnly(false);
    } else if (tab === "PAYOUT_FAILURES") {
      setSelectedService("PAYOUT");
      setSelectedDirection("OUTBOUND");
      setIsErrorOnly(true);
      setSelectedDatePreset("ALL");
    }
  };

  // 4. Load Services
  const fetchServices = async () => {
    try {
      const res = await api.get("/api-logs/services");
      if (res.data?.services) {
        setServicesList(res.data.services);
      }
    } catch (err) {
      console.warn("Failed to load distinct services:", err);
    }
  };

  // 5. Load Metrics
  const fetchMetrics = async () => {
    try {
      const res = await api.get("/api-logs/metrics");
      if (res.data) {
        setMetrics(res.data);
      }
    } catch (err) {
      console.warn("Failed to load API metrics:", err);
    }
  };

  // 6. Load API Logs List
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };

      if (search.trim()) params.search = search.trim();
      if (selectedService !== "ALL") params.service = selectedService;
      if (selectedDirection !== "ALL") params.direction = selectedDirection;
      if (selectedMethod !== "ALL") params.http_method = selectedMethod;
      if (selectedStatus !== "ALL") params.response_status = selectedStatus;
      if (selectedHttpStatus !== "ALL") params.http_status = parseInt(selectedHttpStatus, 10);
      if (selectedProvider !== "ALL") params.provider_name = selectedProvider;
      if (selectedDatePreset !== "ALL") params.date_preset = selectedDatePreset;
      if (selectedDatePreset === "CUSTOM") {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      }
      if (isErrorOnly) params.is_error = true;

      const res = await api.get("/api-logs", { params });
      if (res.data) {
        setLogs(res.data.items || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err) {
      console.error("Error fetching API logs:", err);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    search,
    selectedService,
    selectedDirection,
    selectedMethod,
    selectedStatus,
    selectedHttpStatus,
    selectedProvider,
    selectedDatePreset,
    startDate,
    endDate,
    isErrorOnly,
  ]);

  // Initial Load
  useEffect(() => {
    fetchServices();
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto Refresh Interval
  useEffect(() => {
    if (autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      fetchLogs();
      fetchMetrics();
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec, fetchLogs]);

  // 7. Open Log Detail Drawer
  const openDetailDrawer = async (logId: string) => {
    setSelectedLogId(logId);
    setDetailLoading(true);
    setActiveDrawerTab("overview");
    setTraceSteps([]);
    try {
      const res = await api.get(`/api-logs/${logId}`);
      setLogDetail(res.data);

      if (res.data?.transaction_id || res.data?.correlation_id) {
        fetchTrace(res.data.transaction_id || res.data.correlation_id);
      }
    } catch (err) {
      console.error("Failed to load API log detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  // 8. Fetch Trace for Transaction
  const fetchTrace = async (txnId: string) => {
    if (!txnId) return;
    setTraceLoading(true);
    try {
      const res = await api.get(`/api-logs/trace/${txnId}`);
      if (res.data?.steps) {
        setTraceSteps(res.data.steps);
      }
    } catch (err) {
      console.error("Failed to load transaction trace:", err);
    } finally {
      setTraceLoading(false);
    }
  };

  // 9. Export CSV
  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (selectedService !== "ALL") params.append("service", selectedService);
    if (selectedDirection !== "ALL") params.append("direction", selectedDirection);
    if (selectedMethod !== "ALL") params.append("http_method", selectedMethod);
    if (selectedStatus !== "ALL") params.append("response_status", selectedStatus);
    if (selectedProvider !== "ALL") params.append("provider_name", selectedProvider);
    if (selectedDatePreset !== "ALL") params.append("date_preset", selectedDatePreset);
    if (selectedDatePreset === "CUSTOM") {
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
    }
    if (isErrorOnly) params.append("is_error", "true");

    const exportUrl = `${api.defaults.baseURL || ""}/api-logs/export/csv?${params.toString()}`;
    window.open(exportUrl, "_blank");
  };

  // Render Formatted JSON
  const renderFormattedJson = (data: any, isError = false) => {
    if (!data) return <span className="text-slate-500 italic text-xs">No payload content</span>;
    try {
      const jsonStr =
        typeof data === "string" ? JSON.stringify(JSON.parse(data), null, 2) : JSON.stringify(data, null, 2);
      return (
        <pre
          className={`p-4 bg-slate-950 font-mono text-xs rounded-lg overflow-x-auto border leading-relaxed ${
            isError
              ? "text-rose-300 border-rose-500/30 selection:bg-rose-900 selection:text-white"
              : "text-emerald-400 border-slate-800 selection:bg-emerald-900 selection:text-white"
          }`}
        >
          {jsonStr}
        </pre>
      );
    } catch (e) {
      return (
        <pre
          className={`p-4 bg-slate-950 font-mono text-xs rounded-lg overflow-x-auto border leading-relaxed ${
            isError ? "text-rose-300 border-rose-500/30" : "text-slate-300 border-slate-800"
          }`}
        >
          {String(data)}
        </pre>
      );
    }
  };

  // Helper: Provider Pill Color
  const getProviderBadge = (provider?: string) => {
    const p = (provider || "").toLowerCase();
    if (p.includes("bulkpe")) {
      return {
        bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
        label: "BulkPe Switch",
      };
    }
    if (p.includes("wowpe")) {
      return {
        bg: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        label: "WowPe Gateway",
      };
    }
    if (p.includes("utkal")) {
      return {
        bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        label: "UtkalDigital Switch",
      };
    }
    if (p.includes("cashfree")) {
      return {
        bg: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        label: "Cashfree Payouts",
      };
    }
    if (p.includes("icici") || p.includes("yesbank") || p.includes("bank")) {
      return {
        bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        label: provider || "Bank Gateway",
      };
    }
    return {
      bg: "bg-slate-700/30 text-slate-300 border-slate-700/50",
      label: provider || "Vendor Gateway",
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Enterprise API &amp; Vendor Gateway Logs
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Super Admin Live Audit
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                End-to-end technical telemetry: outbound bank switches (BulkPe/WowPe), inbound merchant API traffic, and failure diagnostics.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Auto Refresh Dropdown */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Auto Refresh:</span>
            <select
              value={autoRefreshSec}
              onChange={(e) => setAutoRefreshSec(Number(e.target.value))}
              className="bg-transparent border-none text-indigo-400 font-medium focus:ring-0 cursor-pointer pr-2 text-xs"
            >
              <option value={0} className="bg-slate-900 text-slate-300">Off</option>
              <option value={5} className="bg-slate-900 text-slate-300">5s</option>
              <option value={10} className="bg-slate-900 text-slate-300">10s</option>
              <option value={30} className="bg-slate-900 text-slate-300">30s</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchLogs();
              fetchMetrics();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            Refresh
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* 2. Top-Level Distinct View Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-inner">
        {/* Tab 1: All Logs */}
        <button
          onClick={() => handleTabChange("ALL")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
            activeTab === "ALL"
              ? "bg-slate-800 text-white shadow-lg border border-slate-700"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span>All API Logs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950/80 text-slate-300 border border-slate-800">
            {metrics ? (metrics.total_calls_today).toLocaleString() : "Live"}
          </span>
        </button>

        {/* Tab 2: Vendor API (Outbound) */}
        <button
          onClick={() => handleTabChange("VENDOR")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
            activeTab === "VENDOR"
              ? "bg-purple-600/20 text-purple-200 shadow-lg border border-purple-500/40"
              : "text-slate-400 hover:text-purple-300 hover:bg-purple-950/20"
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-purple-400" />
          <span>Vendor API Logs (Outbound)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
            {metrics ? metrics.outbound_count : "Gateways"}
          </span>
        </button>

        {/* Tab 3: Internal API (Inbound) */}
        <button
          onClick={() => handleTabChange("INTERNAL")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
            activeTab === "INTERNAL"
              ? "bg-blue-600/20 text-blue-200 shadow-lg border border-blue-500/40"
              : "text-slate-400 hover:text-blue-300 hover:bg-blue-950/20"
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-blue-400" />
          <span>Internal API Logs (Inbound)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
            {metrics ? metrics.inbound_count : "Portals"}
          </span>
        </button>

        {/* Tab 4: Payout Vendor Failures */}
        <button
          onClick={() => handleTabChange("PAYOUT_FAILURES")}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ml-auto ${
            activeTab === "PAYOUT_FAILURES"
              ? "bg-rose-600/30 text-rose-100 shadow-lg border border-rose-500/50 ring-2 ring-rose-500/20"
              : "text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 border border-rose-500/20"
          }`}
        >
          <div className="relative">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          </div>
          <span>Payout Vendor Failures</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold">
            Audit
          </span>
        </button>
      </div>

      {/* Deep Link Active Transaction Alert Banner */}
      {activeDeepLinkTxn && (
        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-indigo-200 text-sm block">
                Filtered by Payout Transaction: {activeDeepLinkTxn}
              </span>
              <span className="text-slate-400">
                Displaying all correlated Inbound retailer requests, Outbound vendor attempts, and gateway responses for this transfer.
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveDeepLinkTxn(null);
              setSearch("");
              setSelectedDatePreset("TODAY");
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition-all"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Payout Vendor Failure Context Banner */}
      {activeTab === "PAYOUT_FAILURES" && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-rose-200 text-sm flex items-center gap-2">
                Payout Vendor API Failure Telemetry
                <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">
                  BulkPe • WowPe • Bank Gateways
                </span>
              </h3>
              <p className="text-xs text-rose-300/80 mt-1">
                Displaying outbound bank transfer attempts that returned rejections, invalid beneficiary bank codes, timeout exceptions, or insufficient switch balances. Full request &amp; response payloads are retained for reconciliation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setSelectedProvider("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedProvider === "ALL"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              All Providers
            </button>
            <button
              onClick={() => setSelectedProvider("BulkPe")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedProvider === "BulkPe"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              BulkPe Failures
            </button>
            <button
              onClick={() => setSelectedProvider("WowPe")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedProvider === "WowPe"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              WowPe Failures
            </button>
          </div>
        </div>
      )}

      {/* 3. Real-Time Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Calls Today */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total API Volume Today</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {(metrics?.total_calls_today || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">requests</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
            <span className="text-blue-400 font-medium">{metrics?.inbound_count || 0} Inbound (Retailer)</span>
            <span>•</span>
            <span className="text-purple-400 font-medium">{metrics?.outbound_count || 0} Outbound (Vendor)</span>
          </div>
        </div>

        {/* Success vs Error Rate */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Error Rate &amp; Gateway Failures</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${(metrics?.error_rate_pct || 0) > 5 ? "text-rose-400" : "text-emerald-400"}`}>
              {metrics?.error_rate_pct ?? 0}%
            </span>
            <span className="text-xs text-slate-400">error rate</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
            <span className={`font-medium ${(metrics?.error_count || 0) > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {metrics?.error_count || 0} Failed API Calls
            </span>
            <span>•</span>
            <span className="text-emerald-400">
              {((metrics?.total_calls_today || 0) - (metrics?.error_count || 0)).toLocaleString()} Healthy
            </span>
          </div>
        </div>

        {/* Avg Latency */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Avg Provider Round-Trip Time</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-cyan-400">
              {metrics?.avg_duration_ms ? `${metrics.avg_duration_ms} ms` : "0 ms"}
            </span>
            <span className="text-xs text-slate-400">avg latency</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
            <span className="text-slate-300 font-medium">BulkPe / WowPe SLA Target: &lt; 800 ms</span>
          </div>
        </div>

        {/* Filtered Logs Active */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {activeTab === "PAYOUT_FAILURES"
                ? "Failed Payout Transfers"
                : activeTab === "VENDOR"
                ? "Outbound Vendor Calls"
                : activeTab === "INTERNAL"
                ? "Inbound Merchant Calls"
                : "Active Filtered Records"}
            </span>
            <SlidersHorizontal className="w-4 h-4 text-violet-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {total.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">records</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400 border-t border-slate-800/60 pt-2">
            <span>Page {page} of {totalPages}</span>
            <span>•</span>
            <span className="text-indigo-400">{pageSize} per page</span>
          </div>
        </div>
      </div>

      {/* 4. Search & Multi-Filters Bar */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        {/* Search & Main Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search Log ID, Txn ID, Req ID, Endpoint, Provider..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 transition-all font-mono"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setActiveDeepLinkTxn(null);
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Service Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
            >
              <option value="ALL">All Services</option>
              {servicesList.map((srv) => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>
          </div>

          {/* Direction Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={selectedDirection}
              onChange={(e) => {
                setSelectedDirection(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
            >
              <option value="ALL">All Directions</option>
              <option value="OUTBOUND">OUTBOUND (Us → Provider/Gateway)</option>
              <option value="INBOUND">INBOUND (Retailer → Us)</option>
              <option value="INTERNAL">INTERNAL (System/Workers)</option>
            </select>
          </div>

          {/* Provider / Gateway Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
            >
              <option value="ALL">All Providers</option>
              <option value="BulkPe">BulkPe</option>
              <option value="WowPe">WowPe</option>
              <option value="Utkal">UtkalDigital</option>
              <option value="Cashfree">Cashfree</option>
            </select>
          </div>

          {/* Response Status Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
              <option value="TIMEOUT">TIMEOUT</option>
              <option value="VALIDATION_ERROR">VALIDATION_ERROR</option>
              <option value="HTTP_ERROR">HTTP_ERROR</option>
            </select>
          </div>
        </div>

        {/* Secondary Row: Date Presets & Options */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Date Range:
            </span>
            {[
              { id: "TODAY", label: "Today" },
              { id: "YESTERDAY", label: "Yesterday" },
              { id: "LAST_7_DAYS", label: "Last 7 Days" },
              { id: "LAST_30_DAYS", label: "Last 30 Days" },
              { id: "THIS_MONTH", label: "This Month" },
              { id: "ALL", label: "All Time" },
              { id: "CUSTOM", label: "Custom" },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedDatePreset(preset.id);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                  selectedDatePreset === preset.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {preset.label}
              </button>
            ))}

            {selectedDatePreset === "CUSTOM" && (
              <div className="flex items-center gap-2 ml-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-slate-200 text-xs"
                />
                <span className="text-slate-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-slate-200 text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Error Only Checkbox */}
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isErrorOnly}
                onChange={(e) => {
                  setIsErrorOnly(e.target.checked);
                  setPage(1);
                }}
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
              />
              <span className={isErrorOnly ? "text-rose-400 font-bold" : "text-slate-400"}>
                Show Errors &amp; Failures Only
              </span>
            </label>

            {/* Reset Filters */}
            <button
              onClick={() => {
                setSearch("");
                setActiveDeepLinkTxn(null);
                setSelectedService("ALL");
                setSelectedDirection("ALL");
                setSelectedMethod("ALL");
                setSelectedStatus("ALL");
                setSelectedHttpStatus("ALL");
                setSelectedProvider("ALL");
                setSelectedDatePreset("TODAY");
                setStartDate("");
                setEndDate("");
                setIsErrorOnly(false);
                setActiveTab("ALL");
                setPage(1);
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline transition-all"
            >
              Reset All
            </button>
          </div>
        </div>
      </div>

      {/* 5. Enterprise Logs Data Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400 uppercase font-semibold tracking-wider">
                <th className="py-3.5 px-4">Log ID</th>
                <th className="py-3.5 px-3">Direction</th>
                <th className="py-3.5 px-3">Service</th>
                <th className="py-3.5 px-3">
                  {activeTab === "VENDOR" || activeTab === "PAYOUT_FAILURES" ? "Target Gateway / Provider" : "Client / Provider"}
                </th>
                <th className="py-3.5 px-4">API Route / Target Endpoint</th>
                <th className="py-3.5 px-3">Transaction / Req ID</th>
                <th className="py-3.5 px-3 text-center">HTTP</th>
                <th className="py-3.5 px-3">Response Status</th>
                <th className="py-3.5 px-3 text-right">Duration</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                      <span>Loading Enterprise API Logs...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Terminal className="w-8 h-8 text-slate-600" />
                      <span className="font-medium text-slate-400">No API logs found matching current filters</span>
                      <span className="text-xs text-slate-600">Try adjusting your search criteria, provider filter, or date range.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSuccess = log.http_status >= 200 && log.http_status < 400 && log.response_status === "SUCCESS";
                  const isError =
                    log.http_status >= 400 ||
                    log.response_status === "FAILED" ||
                    log.response_status === "HTTP_ERROR" ||
                    log.response_status === "TIMEOUT" ||
                    log.response_status === "VALIDATION_ERROR";

                  const providerBadge = getProviderBadge(log.provider_name);

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-800/50 transition-colors group cursor-pointer ${
                        isError ? "bg-rose-950/10" : ""
                      }`}
                      onClick={() => openDetailDrawer(log.id)}
                    >
                      {/* Log ID */}
                      <td className="py-3 px-4 font-mono font-medium text-indigo-400">
                        <div className="flex items-center gap-1.5">
                          <span>{log.log_id}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(log.log_id, `log_${log.id}`);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity"
                            title="Copy Log ID"
                          >
                            {copiedKey === `log_${log.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Direction Badge */}
                      <td className="py-3 px-3">
                        {log.direction === "OUTBOUND" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/25">
                            <ArrowUpRight className="w-3 h-3 text-purple-400" />
                            OUTBOUND
                          </span>
                        ) : log.direction === "INBOUND" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/25">
                            <ArrowDownLeft className="w-3 h-3 text-blue-400" />
                            INBOUND
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/20 text-slate-300 border border-slate-700/30">
                            INTERNAL
                          </span>
                        )}
                      </td>

                      {/* Service */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            log.service === "PAYOUT"
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/25"
                              : "bg-slate-800 text-slate-200 border-slate-700"
                          }`}
                        >
                          {log.service}
                        </span>
                      </td>

                      {/* Client / Provider */}
                      <td className="py-3 px-3">
                        {log.direction === "OUTBOUND" ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${providerBadge.bg}`}>
                            <Globe className="w-3 h-3" />
                            {log.provider_name || providerBadge.label}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                            <Building className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate max-w-[120px]" title={log.client_name || log.retailer_id || "Retailer Portal"}>
                              {log.client_name || (log.retailer_id ? `Retailer: ${log.retailer_id}` : "Retailer Portal")}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* API / Endpoint */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              log.http_method === "POST"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : log.http_method === "GET"
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {log.http_method}
                          </span>
                          <span className="font-mono text-slate-300 truncate" title={log.endpoint}>
                            {log.endpoint}
                          </span>
                        </div>

                        {/* If Failed, render clear error snippet right here for fast troubleshooting */}
                        {isError && (log.error_message || log.error_code) && (
                          <div className="mt-1 flex items-center gap-1 text-[10.5px] text-rose-400 font-mono truncate" title={log.error_message}>
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{log.error_code ? `[${log.error_code}] ` : ""}{log.error_message || "Gateway Error"}</span>
                          </div>
                        )}
                      </td>

                      {/* Txn ID / Request ID */}
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {log.transaction_id ? (
                          <div className="flex items-center gap-1 text-slate-200">
                            <span className="truncate max-w-[110px]" title={log.transaction_id}>
                              {log.transaction_id}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearch(log.transaction_id!);
                                setActiveDeepLinkTxn(log.transaction_id!);
                                setSelectedDatePreset("ALL");
                                setPage(1);
                              }}
                              className="text-indigo-400 hover:text-indigo-300"
                              title="Filter all logs for this Transaction"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 truncate max-w-[110px] block" title={log.request_id}>
                            {log.request_id}
                          </span>
                        )}
                      </td>

                      {/* HTTP Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                            log.http_status >= 200 && log.http_status < 300
                              ? "bg-emerald-500/10 text-emerald-400"
                              : log.http_status < 500
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {log.http_status || "-"}
                        </span>
                      </td>

                      {/* Response Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : log.response_status === "TIMEOUT"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {isError && <AlertCircle className="w-2.5 h-2.5" />}
                          {log.response_status}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-3 text-right font-mono">
                        <span
                          className={`font-semibold ${
                            log.duration_ms < 500
                              ? "text-emerald-400"
                              : log.duration_ms < 2000
                              ? "text-amber-400"
                              : "text-rose-400"
                          }`}
                        >
                          {log.duration_ms} ms
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: false,
                            })
                          : "-"}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openDetailDrawer(log.id)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-medium transition-all flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3 h-3 text-indigo-400" />
                          View
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
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing {logs.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
              {Math.min(page * pageSize, total)} of {total.toLocaleString()} records
            </span>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-200"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <span className="font-medium text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 6. Comprehensive API Log Detail & Diagnostic Drawer */}
      {selectedLogId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">
                    {logDetail?.log_id || selectedLogId}
                  </span>

                  {/* Direction Badge */}
                  {logDetail?.direction === "OUTBOUND" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      VENDOR OUTBOUND CALL
                    </span>
                  ) : logDetail?.direction === "INBOUND" ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                      <ArrowDownLeft className="w-3 h-3" />
                      INTERNAL INBOUND CALL
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700/20 text-slate-300 border border-slate-700/30">
                      INTERNAL SERVICE
                    </span>
                  )}

                  {/* Status Badge */}
                  {logDetail?.response_status && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        logDetail.response_status === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {logDetail.response_status}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-1">
                  {logDetail?.provider_name
                    ? `Vendor Gateway: ${logDetail.provider_name} • Service: ${logDetail.service}`
                    : `${logDetail?.api_name || "API Execution"} • Service: ${logDetail?.service || "GENERAL"}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(logDetail?.log_id || selectedLogId, "drawer_log_id")}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
                  title="Copy Log ID"
                >
                  {copiedKey === "drawer_log_id" ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedLogId(null);
                    setLogDetail(null);
                  }}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-slate-800 bg-slate-950/50 px-5 text-xs">
              {[
                { id: "overview", label: "Overview & Identifiers" },
                { id: "request", label: "Request Payload" },
                { id: "response", label: "Response Payload" },
                { id: "error", label: "Error & Rejection Reason" },
                { id: "trace", label: `Full Transaction Trace (${traceSteps.length || 0})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDrawerTab(tab.id as any)}
                  className={`py-3 px-3 font-medium border-b-2 transition-all ${
                    activeDrawerTab === tab.id
                      ? "border-indigo-500 text-indigo-400 bg-slate-900/60 font-semibold"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 text-sm">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                  <span>Loading API payload and telemetry...</span>
                </div>
              ) : !logDetail ? (
                <div className="text-center py-20 text-slate-500 text-sm">
                  Failed to load log details
                </div>
              ) : (
                <>
                  {/* TAB 1: OVERVIEW */}
                  {activeDrawerTab === "overview" && (
                    <div className="space-y-6">
                      {/* Gateway Call Alert if Outbound */}
                      {logDetail.direction === "OUTBOUND" && (
                        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-purple-200">
                            <Globe className="w-4 h-4 text-purple-400" />
                            <span>
                              This is an external call dispatched to Gateway / Switch:{" "}
                              <strong className="text-white font-mono">{logDetail.provider_name || "Third Party"}</strong>
                            </span>
                          </div>
                          {logDetail.provider_reference_id && (
                            <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                              Vendor UTR: {logDetail.provider_reference_id}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Basic Metadata */}
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Execution Metadata
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-slate-500">Service Category:</span>
                            <div className="font-semibold text-slate-200 mt-0.5">{logDetail.service}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">HTTP Method &amp; Code:</span>
                            <div className="font-mono font-semibold text-slate-200 mt-0.5">
                              {logDetail.http_method} • {logDetail.http_status}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-500">Target Endpoint / URL:</span>
                            <div className="font-mono text-slate-300 mt-0.5 break-all bg-slate-900/60 p-2 rounded border border-slate-800">
                              {logDetail.endpoint}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Execution Latency:</span>
                            <div className="font-mono font-bold text-emerald-400 mt-0.5">
                              {logDetail.duration_ms} ms
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Target Switch / Provider:</span>
                            <div className="text-slate-200 font-semibold mt-0.5">
                              {logDetail.provider_name || "Enterprise API Core"}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Client / Initiator:</span>
                            <div className="text-slate-200 mt-0.5">
                              {logDetail.client_name || "Retailer Portal"} ({logDetail.client_ip || "127.0.0.1"})
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Retailer ID:</span>
                            <div className="font-mono text-amber-400 mt-0.5">
                              {logDetail.retailer_id || "System Direct"}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Correlation Identifiers */}
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Correlation &amp; Distributed Tracing
                        </h3>
                        <div className="space-y-2 text-xs">
                          {/* Transaction ID */}
                          <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                            <div>
                              <span className="text-slate-500 block text-[10px]">Transaction ID:</span>
                              <span className="font-mono font-medium text-indigo-400">
                                {logDetail.transaction_id || "None"}
                              </span>
                            </div>
                            {logDetail.transaction_id && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCopy(logDetail.transaction_id!, "txn_copy")}
                                  className="p-1 text-slate-400 hover:text-slate-200"
                                >
                                  {copiedKey === "txn_copy" ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setActiveDrawerTab("trace")}
                                  className="px-2 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded text-[10px] font-semibold hover:bg-indigo-600/30"
                                >
                                  View Flow Trace
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Request ID */}
                          <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                            <div>
                              <span className="text-slate-500 block text-[10px]">Request ID:</span>
                              <span className="font-mono text-slate-300">{logDetail.request_id}</span>
                            </div>
                            <button
                              onClick={() => handleCopy(logDetail.request_id, "req_copy")}
                              className="p-1 text-slate-400 hover:text-slate-200"
                            >
                              {copiedKey === "req_copy" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Provider Reference / UTR */}
                          {logDetail.provider_reference_id && (
                            <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                              <div>
                                <span className="text-slate-500 block text-[10px]">Provider Ref / UTR:</span>
                                <span className="font-mono text-emerald-400 font-bold">
                                  {logDetail.provider_reference_id}
                                </span>
                              </div>
                              <button
                                onClick={() => handleCopy(logDetail.provider_reference_id!, "prov_copy")}
                                className="p-1 text-slate-400 hover:text-slate-200"
                              >
                                {copiedKey === "prov_copy" ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Timestamp Breakdown
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-500">Request Dispatched:</span>
                            <div className="font-mono text-slate-300 mt-0.5">
                              {logDetail.request_timestamp || logDetail.timestamp}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Response Received:</span>
                            <div className="font-mono text-slate-300 mt-0.5">
                              {logDetail.response_timestamp || "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: REQUEST PAYLOAD */}
                  {activeDrawerTab === "request" && (
                    <div className="space-y-5">
                      {/* Masked Headers */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Request Headers
                          </h3>
                          <button
                            onClick={() =>
                              handleCopy(JSON.stringify(logDetail.request_headers || {}, null, 2), "req_hdr_copy")
                            }
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy Headers
                          </button>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto">
                          {logDetail.request_headers && Object.keys(logDetail.request_headers).length > 0 ? (
                            <table className="w-full text-xs font-mono">
                              <tbody>
                                {Object.entries(logDetail.request_headers).map(([k, v]) => (
                                  <tr key={k} className="border-b border-slate-900 last:border-0">
                                    <td className="py-1 pr-3 text-slate-500 font-semibold">{k}:</td>
                                    <td className="py-1 text-slate-300 break-all">{String(v)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <span className="text-xs text-slate-500 italic">No custom request headers</span>
                          )}
                        </div>
                      </div>

                      {/* Request Query Parameters */}
                      {logDetail.request_query && Object.keys(logDetail.request_query).length > 0 && (
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                            Query Parameters
                          </h3>
                          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                            <table className="w-full text-xs font-mono">
                              <tbody>
                                {Object.entries(logDetail.request_query).map(([k, v]) => (
                                  <tr key={k} className="border-b border-slate-900 last:border-0">
                                    <td className="py-1 pr-3 text-indigo-400 font-semibold">{k}:</td>
                                    <td className="py-1 text-slate-300">{String(v)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Request Body */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              Request Body Payload
                            </h3>
                            {logDetail.payload_truncated && (
                              <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-semibold">
                                Truncated (&gt;256KB)
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              handleCopy(
                                typeof logDetail.request_body === "string"
                                  ? logDetail.request_body
                                  : JSON.stringify(logDetail.request_body || {}, null, 2),
                                "req_body_copy"
                              )
                            }
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy Body
                          </button>
                        </div>
                        {renderFormattedJson(logDetail.request_body || logDetail.request_body_raw)}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: RESPONSE PAYLOAD */}
                  {activeDrawerTab === "response" && (
                    <div className="space-y-5">
                      {/* HTTP Status & Provider Code */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                          <span className="text-slate-500 block">HTTP Status:</span>
                          <span className="font-mono text-base font-bold text-emerald-400 mt-1 block">
                            {logDetail.http_status}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                          <span className="text-slate-500 block">Response Code:</span>
                          <span className="font-mono text-base font-bold text-indigo-400 mt-1 block">
                            {logDetail.provider_response_code || logDetail.response_status}
                          </span>
                        </div>
                      </div>

                      {/* Response Headers */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Response Headers
                          </h3>
                          <button
                            onClick={() =>
                              handleCopy(JSON.stringify(logDetail.response_headers || {}, null, 2), "res_hdr_copy")
                            }
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy Headers
                          </button>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-x-auto">
                          {logDetail.response_headers && Object.keys(logDetail.response_headers).length > 0 ? (
                            <table className="w-full text-xs font-mono">
                              <tbody>
                                {Object.entries(logDetail.response_headers).map(([k, v]) => (
                                  <tr key={k} className="border-b border-slate-900 last:border-0">
                                    <td className="py-1 pr-3 text-slate-500 font-semibold">{k}:</td>
                                    <td className="py-1 text-slate-300 break-all">{String(v)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <span className="text-xs text-slate-500 italic">No custom response headers</span>
                          )}
                        </div>
                      </div>

                      {/* Response Body */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Response Body Payload
                          </h3>
                          <button
                            onClick={() => {
                              const effPayload =
                                logDetail.response_body ||
                                logDetail.response_body_raw ||
                                (logDetail.http_status >= 400 || logDetail.response_status === "FAILED" || logDetail.error_message || logDetail.stack_trace
                                  ? {
                                      status: logDetail.response_status || "FAILED",
                                      statusCode: logDetail.http_status || 500,
                                      error: logDetail.error_type || "InternalServerError",
                                      errorCode: logDetail.error_code || "ERR_500",
                                      message: logDetail.error_message || logDetail.provider_response_message || "Internal server error occurred during request execution.",
                                      failureReason: logDetail.failure_reason || "Unhandled Exception",
                                      endpoint: logDetail.endpoint,
                                      requestId: logDetail.request_id,
                                      timestamp: logDetail.response_timestamp || logDetail.timestamp,
                                      stackTrace: logDetail.stack_trace || "No server stack trace provided."
                                    }
                                  : null);
                              handleCopy(
                                typeof effPayload === "string"
                                  ? effPayload
                                  : JSON.stringify(effPayload || {}, null, 2),
                                "res_body_copy"
                              );
                            }}
                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Copy Body
                          </button>
                        </div>

                        {(logDetail.http_status >= 400 || logDetail.response_status === "FAILED") && (
                          <div className="mb-2.5 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              <span>
                                Failure Captured (HTTP {logDetail.http_status}): {logDetail.error_type || logDetail.error_code || "Internal Server Error"}
                              </span>
                            </div>
                            {logDetail.stack_trace && (
                              <button
                                onClick={() => setActiveDrawerTab("error")}
                                className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-medium rounded border border-rose-500/30 transition-colors shrink-0"
                              >
                                View Stack Trace
                              </button>
                            )}
                          </div>
                        )}

                        {(() => {
                          const effPayload =
                            logDetail.response_body ||
                            logDetail.response_body_raw ||
                            (logDetail.http_status >= 400 || logDetail.response_status === "FAILED" || logDetail.error_message || logDetail.stack_trace
                              ? {
                                  status: logDetail.response_status || "FAILED",
                                  statusCode: logDetail.http_status || 500,
                                  error: logDetail.error_type || "InternalServerError",
                                  errorCode: logDetail.error_code || "ERR_500",
                                  message: logDetail.error_message || logDetail.provider_response_message || "Internal server error occurred during request execution.",
                                  failureReason: logDetail.failure_reason || "Unhandled Exception",
                                  endpoint: logDetail.endpoint,
                                  requestId: logDetail.request_id,
                                  timestamp: logDetail.response_timestamp || logDetail.timestamp,
                                  stackTrace: logDetail.stack_trace || "No server stack trace provided."
                                }
                              : null);
                          return renderFormattedJson(effPayload, logDetail.http_status >= 400 || logDetail.response_status === "FAILED");
                        })()}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: ERROR & DIAGNOSTICS */}
                  {activeDrawerTab === "error" && (
                    <div className="space-y-5">
                      {logDetail.error_message ||
                      logDetail.error_code ||
                      logDetail.stack_trace ||
                      logDetail.failure_reason ||
                      logDetail.provider_response_message ? (
                        <>
                          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2.5">
                            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                              <AlertCircle className="w-4 h-4" />
                              <span>{logDetail.error_type || "Vendor / API Execution Failure"}</span>
                            </div>

                            {logDetail.error_code && (
                              <div className="text-xs text-slate-300">
                                <span className="text-slate-500">Error Code:</span>{" "}
                                <span className="font-mono text-rose-300 font-bold">{logDetail.error_code}</span>
                              </div>
                            )}

                            {logDetail.provider_response_message && (
                              <div className="text-xs text-slate-300">
                                <span className="text-slate-500">Provider Message:</span>{" "}
                                <span className="font-mono text-amber-300">{logDetail.provider_response_message}</span>
                              </div>
                            )}

                            {logDetail.error_message && (
                              <p className="text-xs text-rose-200 mt-1 font-mono bg-slate-950/60 p-2.5 rounded border border-rose-500/20 leading-relaxed">
                                {logDetail.error_message}
                              </p>
                            )}
                          </div>

                          {/* Stack Trace */}
                          {logDetail.stack_trace && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                  Server Stack Trace (Admin Protected)
                                </h3>
                                <button
                                  onClick={() => handleCopy(logDetail.stack_trace || "", "stack_copy")}
                                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" /> Copy Stack Trace
                                </button>
                              </div>
                              <pre className="p-4 bg-slate-950 text-rose-300 font-mono text-xs rounded-lg overflow-x-auto border border-rose-500/20 leading-relaxed max-h-80">
                                {logDetail.stack_trace}
                              </pre>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-16 text-slate-500 space-y-2">
                          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                          <p className="font-medium text-slate-300 text-sm">No Errors Recorded</p>
                          <p className="text-xs text-slate-500">
                            This API request completed cleanly with no rejections or exceptions.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 5: TRANSACTION TRACE TIMELINE */}
                  {activeDrawerTab === "trace" && (
                    <div className="space-y-6">
                      <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                        <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                          End-to-End Payout Transaction Flow
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">
                          Sequential lifecycle trace linking the Inbound merchant request with Outbound vendor gateway calls (primary &amp; failovers):{" "}
                          <span className="font-mono text-indigo-400 font-semibold">
                            {logDetail.transaction_id || logDetail.correlation_id || "N/A"}
                          </span>
                        </p>
                      </div>

                      {traceLoading ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-slate-400 text-xs">
                          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                          <span>Tracing transaction lifecycle across services...</span>
                        </div>
                      ) : traceSteps.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs">
                          No linked trace steps found for this transaction ID.
                        </div>
                      ) : (
                        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                          {traceSteps.map((step, idx) => {
                            const isCurrent = step.log_id === logDetail.log_id;
                            const isStepFailed =
                              step.http_status >= 400 ||
                              step.response_status === "FAILED" ||
                              step.response_status === "TIMEOUT";

                            return (
                              <div
                                key={step.id}
                                className={`relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                                  isCurrent
                                    ? "bg-indigo-600/15 border-indigo-500/40 shadow-lg ring-1 ring-indigo-500/30"
                                    : isStepFailed
                                    ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50"
                                    : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                                }`}
                                onClick={() => openDetailDrawer(step.id)}
                              >
                                {/* Step Indicator Bubble */}
                                <div
                                  className={`absolute -left-6 top-3.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                                    isCurrent
                                      ? "bg-indigo-600 border-indigo-400 text-white"
                                      : isStepFailed
                                      ? "bg-rose-600 border-rose-400 text-white"
                                      : "bg-slate-900 border-slate-700 text-slate-400"
                                  }`}
                                >
                                  {step.step_number}
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        step.direction === "INBOUND"
                                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                          : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                      }`}
                                    >
                                      {step.direction}
                                    </span>
                                    <span className="font-semibold text-slate-200">{step.service}</span>
                                    <span className="font-mono text-slate-400">{step.http_method}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                        isStepFailed ? "text-rose-400 bg-rose-500/10" : "text-emerald-400 bg-emerald-500/10"
                                      }`}
                                    >
                                      {step.response_status}
                                    </span>
                                    <span className="font-mono text-emerald-400 font-semibold">
                                      {step.duration_ms} ms
                                    </span>
                                  </div>
                                </div>

                                <div className="font-mono text-xs text-slate-300 mt-1.5 truncate">
                                  {step.endpoint}
                                </div>

                                {step.error_message && (
                                  <div className="text-rose-400 text-[11px] font-mono mt-1 truncate">
                                    Error: {step.error_message}
                                  </div>
                                )}

                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900 text-[11px] text-slate-400">
                                  <span>{step.provider_name || step.client_name || "Enterprise"}</span>
                                  <span className="text-slate-500 font-mono">
                                    {step.timestamp ? new Date(step.timestamp).toLocaleTimeString("en-IN") : ""}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EnterpriseApiLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="flex items-center gap-3 text-indigo-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">Loading Enterprise API Logs...</span>
          </div>
        </div>
      }
    >
      <EnterpriseApiLogsContent />
    </Suspense>
  );
}
