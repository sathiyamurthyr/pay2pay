"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { BlurImage } from "@/components/ui/blur-image";
import { KNOWN_BLURHASHES } from "@/lib/blurhash";
import {
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Search,
  RefreshCw,
  Eye,
  FileImage,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Store,
  Wallet,
  Info,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
  Calendar,
  Phone,
  FileText,
  BadgeAlert,
  SlidersHorizontal,
  Download,
  Maximize2,
  Sparkles,
  ArrowUpRight,
  Receipt,
  Building2,
  Hash,
  UserCheck,
  DollarSign,
  Layers,
  HelpCircle,
} from "lucide-react";

interface TopupItem {
  id: string;
  topup_request_id: string;
  requested_amount: number;
  approved_amount?: number;
  currency: string;
  payment_reference: string;
  payment_method: string;
  payment_mode?: string;
  pos_type?: string;
  is_pos_t1?: boolean;
  is_pos_instant?: boolean;
  can_approve?: boolean;
  approval_block_reason?: string;
  request_date?: string;
  current_business_date?: string;
  payment_date?: string;
  slip_id?: string;
  slip_url?: string;
  slip_original_filename?: string;
  slip_mime_type?: string;
  slip_file_size_bytes?: number;
  slip_checksum?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "UNDER_REVIEW";
  retailer_remarks?: string;
  admin_notes?: string;
  rejection_reason?: string;
  submitted_at: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  transaction_reference?: string;
  retailer?: {
    retailer_id: string;
    retailer_code: string;
    retailer_name: string;
    mobile_number?: string;
    company_name?: string;
    wallet_id?: string;
    current_wallet_balance: number;
    is_wallet_frozen: boolean;
  };
}

export function isPosT1Mode(item: TopupItem | null | undefined): boolean {
  if (!item) return false;
  if (item.is_pos_t1 !== undefined) return item.is_pos_t1;
  const mode = (item.payment_mode || item.payment_method || "").toUpperCase().replace(/[\s\-_+]/g, "");
  return mode.includes("T1") || mode === "POST1" || mode === "POS_T1";
}

interface Metrics {
  pending_count: number;
  pending_volume: number;
  approved_today_count: number;
  approved_today_volume: number;
  rejected_count: number;
  rejected_volume?: number;
  total_approved_count: number;
  total_approved_volume: number;
  total_volume?: number;
  timestamp: string;
}

const REJECTION_PRESETS = [
  "Invalid UTR / Reference Number",
  "Payment Proof Duplicate",
  "Amount Not Credited in Bank Account",
  "Amount Discrepancy with Proof",
  "Unreadable / Blurry Image Slip",
  "Incorrect Beneficiary Account",
];

export default function AdminTopupRequestsPage() {
  const [requests, setRequests] = useState<TopupItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(true);

  // Filters & Pagination
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<string>("ALL");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showCustomDateModal, setShowCustomDateModal] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Drawer & Action Modals
  const [selectedRequest, setSelectedRequest] = useState<TopupItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [customApprovedAmount, setCustomApprovedAmount] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [approving, setApproving] = useState<boolean>(false);
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Slip Image Viewer State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch Dashboard Real-Time Metrics
  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    try {
      const res = await api.get("/api/v1/topup/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to load topup metrics:", err);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // Fetch Requests List
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        page_size: pageSize,
      };
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      // Date Presets
      if (datePreset !== "ALL") {
        const now = new Date();
        if (datePreset === "TODAY") {
          params.start_date = new Date(now.setHours(0, 0, 0, 0)).toISOString().split("T")[0];
        } else if (datePreset === "YESTERDAY") {
          const yest = new Date(now);
          yest.setDate(yest.getDate() - 1);
          params.start_date = new Date(yest.setHours(0, 0, 0, 0)).toISOString().split("T")[0];
          params.end_date = new Date(yest.setHours(23, 59, 59, 999)).toISOString().split("T")[0];
        } else if (datePreset === "THIS_WEEK") {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          params.start_date = weekAgo.toISOString().split("T")[0];
        } else if (datePreset === "THIS_MONTH") {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          params.start_date = monthStart.toISOString().split("T")[0];
        } else if (datePreset === "CUSTOM") {
          if (customStartDate) params.start_date = customStartDate;
          if (customEndDate) params.end_date = customEndDate;
        }
      }

      const res = await api.get("/api/v1/topup/requests", { params });
      if (res.data?.success) {
        setRequests(res.data.items || []);
        setTotalCount(res.data.total || 0);
        setTotalPages(res.data.total_pages || 1);
      }
    } catch (err) {
      console.error("Failed to load topup requests:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, datePreset, search, customStartDate, customEndDate]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);



  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openDrawer = (req: TopupItem) => {
    setSelectedRequest(req);
    setCustomApprovedAmount(req.requested_amount.toString());
    setAdminNotes(req.admin_notes || "");
    setRejectionReason("");
    setActionSuccessMsg(null);
    setActionErrorMsg(null);
    setZoomLevel(1);
    setRotation(0);
    setDrawerOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    if (selectedRequest.can_approve === false) {
      setActionErrorMsg(selectedRequest.approval_block_reason || "POS T1 requests can be approved from the next day (T+1).");
      return;
    }
    setApproving(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);
    try {
      const amount = parseFloat(customApprovedAmount);
      if (isNaN(amount) || amount <= 0) {
        setActionErrorMsg("Please specify a valid approval amount (> 0).");
        setApproving(false);
        return;
      }

      const res = await api.post(`/api/v1/topup/requests/${selectedRequest.id}/approve`, {
        approved_amount: amount,
        admin_notes: adminNotes.trim() || undefined,
      });

      if (res.data?.success) {
        setActionSuccessMsg(`Successfully approved & credited ₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} to ${selectedRequest.retailer?.retailer_name || "Retailer"}`);
        setShowApproveModal(false);
        // Refresh list & metrics
        fetchRequests();
        fetchMetrics();
        // Update local selected request
        setSelectedRequest((prev) =>
          prev
            ? {
                ...prev,
                status: "APPROVED",
                approved_amount: amount,
                admin_notes: adminNotes,
                transaction_reference: res.data.data?.transaction_reference,
                approved_at: new Date().toISOString(),
                retailer: prev.retailer
                  ? {
                      ...prev.retailer,
                      current_wallet_balance: (prev.retailer.current_wallet_balance || 0) + amount,
                    }
                  : undefined,
              }
            : null
        );
      } else {
        setActionErrorMsg(res.data?.message || "Failed to approve request.");
      }
    } catch (err: any) {
      console.error("Approval error:", err);
      setActionErrorMsg(err.response?.data?.detail || err.message || "Approval transaction failed.");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      setActionErrorMsg("A rejection reason is mandatory.");
      return;
    }
    setRejecting(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);
    try {
      const res = await api.post(`/api/v1/topup/requests/${selectedRequest.id}/reject`, {
        rejection_reason: rejectionReason.trim(),
        admin_notes: adminNotes.trim() || undefined,
      });

      if (res.data?.success) {
        setActionSuccessMsg(`Topup request ${selectedRequest.topup_request_id} has been marked as REJECTED.`);
        setShowRejectModal(false);
        // Refresh list & metrics
        fetchRequests();
        fetchMetrics();
        // Update local selected request
        setSelectedRequest((prev) =>
          prev
            ? {
                ...prev,
                status: "REJECTED",
                rejection_reason: rejectionReason.trim(),
                rejected_at: new Date().toISOString(),
              }
            : null
        );
      } else {
        setActionErrorMsg(res.data?.message || "Failed to reject request.");
      }
    } catch (err: any) {
      console.error("Rejection error:", err);
      setActionErrorMsg(err.response?.data?.detail || err.message || "Rejection failed.");
    } finally {
      setRejecting(false);
    }
  };

  // Export Table to CSV
  const exportToCSV = () => {
    if (!requests || requests.length === 0) return;
    const headers = [
      "Request ID",
      "Retailer Code",
      "Retailer Name",
      "Mobile",
      "Requested Amount",
      "Approved Amount",
      "Payment Method",
      "Payment Reference (UTR)",
      "Payment Date",
      "Status",
      "Submitted At",
      "Approved At",
      "Transaction Reference",
    ];

    const rows = requests.map((r) => [
      r.topup_request_id,
      r.retailer?.retailer_code || "",
      `"${(r.retailer?.retailer_name || "").replace(/"/g, '""')}"`,
      r.retailer?.mobile_number || "",
      r.requested_amount,
      r.approved_amount || "",
      r.payment_method,
      `"${(r.payment_reference || "").replace(/"/g, '""')}"`,
      r.payment_date ? new Date(r.payment_date).toISOString().split("T")[0] : "",
      r.status,
      r.submitted_at ? new Date(r.submitted_at).toISOString() : "",
      r.approved_at ? new Date(r.approved_at).toISOString() : "",
      r.transaction_reference || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Topup_Requests_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const simulatedClosingBalance =
    (selectedRequest?.retailer?.current_wallet_balance || 0) + (parseFloat(customApprovedAmount) || 0);

  return (
    <div className="space-y-6 pb-16 font-sans min-h-screen text-slate-100 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-2 sm:p-4">
      {/* ── Top Header Cockpit ── */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-slate-800/90 p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 shrink-0">
              <ArrowLeftRight className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Retailer Topup Requests
                </h1>
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Verified Settlement Engine
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Double-Entry Ledger
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1.5 max-w-3xl leading-relaxed">
                Review payment slips, verify bank reference UTRs, adjust approval amounts, and atomically credit retailer wallets with instant transaction ledger posting.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Manual Refresh Button */}
            <button
              onClick={() => {
                fetchMetrics();
                fetchRequests();
              }}
              disabled={loading || metricsLoading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading || metricsLoading ? "animate-spin text-amber-400" : ""}`} />
              Refresh
            </button>

            {/* Export CSV */}
            <button
              onClick={exportToCSV}
              disabled={requests.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Verification */}
        <div
          onClick={() => {
            setStatusFilter("PENDING");
            setPage(1);
          }}
          className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden group shadow-lg ${
            statusFilter === "PENDING"
              ? "bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30"
              : "bg-slate-900/80 border-amber-500/30 hover:border-amber-500/70 hover:bg-slate-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Pending Verification
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xs">
              <Clock className="h-4.5 w-4.5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-3xl font-black text-white tracking-tight">
              {metricsLoading ? "..." : (metrics?.pending_count ?? 0)}
            </div>
            <div className="text-xs text-amber-300 font-semibold mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              ₹{(metrics?.pending_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} awaiting approval
            </div>
          </div>
        </div>

        {/* Approved Today */}
        <div
          onClick={() => {
            setStatusFilter("APPROVED");
            setDatePreset("TODAY");
            setPage(1);
          }}
          className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden group shadow-lg ${
            statusFilter === "APPROVED" && datePreset === "TODAY"
              ? "bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30"
              : "bg-slate-900/80 border-emerald-500/30 hover:border-emerald-500/70 hover:bg-slate-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Approved Today
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-3xl font-black text-white tracking-tight">
              {metricsLoading ? "..." : (metrics?.approved_today_count ?? 0)}
            </div>
            <div className="text-xs text-emerald-300 font-semibold mt-1">
              ₹{(metrics?.approved_today_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} credited today
            </div>
          </div>
        </div>

        {/* Rejected Requests */}
        <div
          onClick={() => {
            setStatusFilter("REJECTED");
            setPage(1);
          }}
          className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden group shadow-lg ${
            statusFilter === "REJECTED"
              ? "bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/30"
              : "bg-slate-900/80 border-rose-500/30 hover:border-rose-500/70 hover:bg-slate-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Rejected Requests
            </span>
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-xs">
              <XCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-3xl font-black text-white tracking-tight">
              {metricsLoading ? "..." : (metrics?.rejected_count ?? 0)}
            </div>
            <div className="text-xs text-rose-300 font-semibold mt-1">
              ₹{(metrics?.rejected_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} rejected volume
            </div>
          </div>
        </div>

        {/* Total Settled Volume */}
        <div
          onClick={() => {
            setStatusFilter("ALL");
            setDatePreset("ALL");
            setPage(1);
          }}
          className="cursor-pointer rounded-2xl p-5 bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 hover:border-indigo-500/70 transition-all relative overflow-hidden group shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              Total Approved Volume
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-xs">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-3xl font-black text-white tracking-tight">
              ₹{(metrics?.total_approved_volume || metrics?.total_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-indigo-300 font-semibold mt-1">
              {metrics?.total_approved_count ?? 0} Verified Wallet Allocations
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Control Bar ── */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Request ID, Retailer Code, Name, UTR / Ref..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-9 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
              {[
                { id: "ALL", label: "All Requests" },
                { id: "PENDING", label: "PENDING", count: metrics?.pending_count },
                { id: "APPROVED", label: "APPROVED", count: metrics?.total_approved_count },
                { id: "REJECTED", label: "REJECTED", count: metrics?.rejected_count },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    setStatusFilter(st.id);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    statusFilter === st.id
                      ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <span>{st.label}</span>
                  {st.count !== undefined && st.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        statusFilter === st.id ? "bg-slate-950 text-amber-400" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {st.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Date Preset Filter */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
              {[
                { id: "ALL", label: "All Time" },
                { id: "TODAY", label: "Today" },
                { id: "YESTERDAY", label: "Yesterday" },
                { id: "THIS_WEEK", label: "7 Days" },
                { id: "THIS_MONTH", label: "This Month" },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setDatePreset(preset.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    datePreset === preset.id
                      ? "bg-slate-800 text-white shadow-sm border border-slate-700"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Table & Data View ── */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-black text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-4 px-4">REQUEST ID</th>
                <th className="py-4 px-4">RETAILER</th>
                <th className="py-4 px-4 text-right">REQUESTED AMT</th>
                <th className="py-4 px-4 text-right">APPROVED AMT</th>
                <th className="py-4 px-4">PAYMENT DETAILS</th>
                <th className="py-4 px-4 text-center">SLIP PROOF</th>
                <th className="py-4 px-4">SUBMITTED AT</th>
                <th className="py-4 px-4 text-center">STATUS</th>
                <th className="py-4 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center text-slate-400">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-amber-400" />
                    <p className="font-bold text-sm text-white">Loading live topup requests...</p>
                    <p className="text-xs text-slate-500 mt-1">Directly retrieving PostgreSQL database records</p>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center text-slate-400">
                    <AlertCircle className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                    <p className="font-bold text-base text-white">No topup requests found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or status filters.</p>
                  </td>
                </tr>
              ) : (
                requests.map((item) => {
                  const initialLetter = (item.retailer?.retailer_name || "R").charAt(0).toUpperCase();
                  const isApproved = item.status === "APPROVED";
                  const isPending = item.status === "PENDING" || item.status === "UNDER_REVIEW";
                  const isRejected = item.status === "REJECTED";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => openDrawer(item)}
                    >
                      {/* Request ID */}
                      <td className="py-4 px-4 font-mono font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white tracking-wide">{item.topup_request_id}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.topup_request_id, item.id);
                            }}
                            className="text-slate-500 hover:text-amber-400 p-1 rounded-md hover:bg-slate-800 transition-colors"
                            title="Copy Request ID"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {item.transaction_reference && (
                          <div className="text-[10px] text-emerald-400/80 font-mono mt-0.5">
                            Ref: {item.transaction_reference}
                          </div>
                        )}
                      </td>

                      {/* Retailer Details */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-blue-500/20 border border-slate-700 flex items-center justify-center font-black text-amber-400 text-sm shrink-0">
                            {initialLetter}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                              {item.retailer?.retailer_name || "Unknown Retailer"}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="Retailer Code">
                                {item.retailer?.retailer_code || "RET-N/A"}
                              </span>
                              {item.retailer?.mobile_number && (
                                <span className="text-slate-300 font-medium flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  {item.retailer.mobile_number}
                                </span>
                              )}
                              {item.retailer?.current_wallet_balance !== undefined && (
                                <span className="text-slate-300 font-semibold">
                                  • Bal: <strong className="text-emerald-400">₹{item.retailer.current_wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Requested Amount */}
                      <td className="py-4 px-4 text-right font-black text-white text-sm tracking-wide">
                        ₹{item.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Approved Amount */}
                      <td className="py-4 px-4 text-right font-black">
                        {item.approved_amount !== undefined && item.approved_amount !== null ? (
                          <span className="text-emerald-400 text-sm bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            ₹{item.approved_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-bold">-</span>
                        )}
                      </td>

                      {/* Payment Details */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-200">
                          <span className="px-2 py-0.5 text-[10px] font-black rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {item.payment_method}
                          </span>
                          <span
                            className="font-mono text-slate-300 truncate max-w-[150px] font-bold"
                            title={item.payment_reference}
                          >
                            {item.payment_reference || "No Ref"}
                          </span>
                        </div>
                        {item.payment_date && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {new Date(item.payment_date).toLocaleDateString("en-IN")}
                          </div>
                        )}
                      </td>

                      {/* Slip Proof Thumbnail / View */}
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {item.slip_url ? (
                          <button
                            onClick={() => openDrawer(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold border border-amber-500/30 transition-all shadow-sm"
                          >
                            <FileImage className="h-3.5 w-3.5 text-amber-400" />
                            View Slip
                          </button>
                        ) : (
                          <span className="text-slate-600 text-[11px] font-semibold">No Slip</span>
                        )}
                      </td>

                      {/* Submitted At */}
                      <td className="py-4 px-4 text-slate-400 text-[11px] whitespace-nowrap font-medium">
                        {item.submitted_at ? (
                          new Date(item.submitted_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        ) : (
                          "N/A"
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border uppercase tracking-wider ${
                            isPending
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-sm"
                              : isApproved
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm"
                              : isRejected
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-sm"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }`}
                        >
                          {isPending && <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />}
                          {isApproved && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                          {isRejected && <X className="h-3.5 w-3.5 text-rose-400" />}
                          {item.status}
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openDrawer(item)}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-md ${
                            isPending
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-amber-500/20"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                          }`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {isPending ? "Verify & Review" : "View Details"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-950/90 border-t border-slate-800 text-xs text-slate-400 font-medium">
          <div>
            Showing <strong className="text-white">{requests.length}</strong> of{" "}
            <strong className="text-white">{totalCount}</strong> topup requests
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-40 transition-colors font-bold shadow-xs flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <span className="px-3.5 py-1 bg-slate-900 border border-slate-800 rounded-xl font-black text-white">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-40 transition-colors font-bold shadow-xs flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Slide-Over Inspection & Verification Drawer ── */}
      {drawerOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity animate-fadeIn"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-4xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between text-slate-200">
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <ArrowLeftRight className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white font-mono">
                        {selectedRequest.topup_request_id}
                      </h2>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase border ${
                          selectedRequest.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : selectedRequest.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        }`}
                      >
                        {selectedRequest.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submitted on {new Date(selectedRequest.submitted_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Alert Messages */}
                {actionSuccessMsg && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span>{actionSuccessMsg}</span>
                  </div>
                )}
                {actionErrorMsg && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{actionErrorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Proof Slip Image Viewer */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <FileImage className="h-4 w-4 text-amber-400" />
                        Uploaded Payment Proof
                      </span>
                      {selectedRequest.slip_url && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                            title="Zoom In"
                          >
                            <ZoomIn className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                            title="Zoom Out"
                          >
                            <ZoomOut className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setRotation((r) => (r + 90) % 360)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                            title="Rotate 90°"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setFullscreenImage(selectedRequest.slip_url || null)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                            title="Fullscreen"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="h-80 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative group p-2">
                      {selectedRequest.slip_url ? (
                        <div className="overflow-auto w-full h-full flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedRequest.slip_url}
                            alt="Payment Slip Proof"
                            style={{
                              transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                              transition: "transform 0.2s ease-in-out",
                            }}
                            className="max-h-full max-w-full object-contain rounded-lg shadow-md cursor-pointer"
                            onClick={() => setFullscreenImage(selectedRequest.slip_url || null)}
                          />
                        </div>
                      ) : (
                        <div className="text-center text-slate-500">
                          <FileImage className="h-10 w-10 mx-auto mb-2 opacity-40" />
                          <p className="text-xs font-bold">No physical slip attached</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">Retailer submitted reference without file</p>
                        </div>
                      )}
                    </div>

                    {selectedRequest.slip_url && (
                      <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono">
                        <span className="truncate max-w-[200px]" title={selectedRequest.slip_original_filename}>
                          {selectedRequest.slip_original_filename || "payment_slip.jpg"}
                        </span>
                        <a
                          href={selectedRequest.slip_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Download Original
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Financial & Entity Audit */}
                  <div className="space-y-4">
                    {/* Retailer Profile Card */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Retailer Profile
                        </span>
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20" title="Retailer Code">
                          {selectedRequest.retailer?.retailer_code || "RET-N/A"}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-white">
                          {selectedRequest.retailer?.retailer_name || "Unknown Retailer"}
                        </h4>
                        {selectedRequest.retailer?.mobile_number && (
                          <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-1.5 font-medium">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-white font-bold">{selectedRequest.retailer.mobile_number}</span>
                          </p>
                        )}
                        {selectedRequest.retailer?.company_name && (
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                            <Store className="h-3.5 w-3.5 text-slate-500" />
                            <span>{selectedRequest.retailer.company_name}</span>
                          </p>
                        )}
                      </div>

                      {/* Current Wallet Balance */}
                      <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">Current Wallet Balance</span>
                        <span className="text-sm font-black text-emerald-400">
                          ₹{(selectedRequest.retailer?.current_wallet_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Payment Details Card */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Payment & Reference Details
                      </span>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Payment Method</span>
                          <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700 inline-block mt-0.5">
                            {selectedRequest.payment_method}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Payment Date</span>
                          <span className="font-bold text-white block mt-0.5">
                            {selectedRequest.payment_date
                              ? new Date(selectedRequest.payment_date).toLocaleDateString("en-IN")
                              : "N/A"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">UTR / Bank Reference</span>
                          <span className="font-mono font-bold text-amber-300 text-sm block mt-0.5">
                            {selectedRequest.payment_reference || "No Reference Provided"}
                          </span>
                        </div>
                        {selectedRequest.retailer_remarks && (
                          <div className="col-span-2 pt-1 border-t border-slate-800">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Retailer Remarks</span>
                            <p className="text-xs text-slate-300 italic mt-0.5">
                              &ldquo;{selectedRequest.retailer_remarks}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Approve Amount & Live Balance Simulation Card */}
                    {selectedRequest.status === "PENDING" && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-slate-950 to-amber-950/20 border border-emerald-500/30 shadow-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-emerald-400" />
                            Credit Amount Configuration
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Requested: <strong className="text-white">₹{selectedRequest.requested_amount.toLocaleString("en-IN")}</strong>
                          </span>
                        </div>

                        {/* Editable Amount Input */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                            <span>Approved Credit Amount (INR)</span>
                            {parseFloat(customApprovedAmount) !== selectedRequest.requested_amount && (
                              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                                ✏️ Modified Amount
                              </span>
                            )}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-emerald-400 text-sm">₹</span>
                            <input
                              type="number"
                              step="any"
                              value={customApprovedAmount}
                              onChange={(e) => setCustomApprovedAmount(e.target.value)}
                              placeholder="Enter amount to credit"
                              className="w-full pl-8 pr-4 py-2.5 bg-slate-900 border-2 border-emerald-500/40 rounded-xl text-base font-black text-emerald-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                            />
                          </div>

                          {/* Quick Adjust Buttons */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setCustomApprovedAmount(selectedRequest.requested_amount.toString())}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                parseFloat(customApprovedAmount) === selectedRequest.requested_amount
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                              }`}
                            >
                              Full (₹{selectedRequest.requested_amount.toLocaleString("en-IN")})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomApprovedAmount((selectedRequest.requested_amount / 2).toString())}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition-colors"
                            >
                              50% (₹{(selectedRequest.requested_amount / 2).toLocaleString("en-IN")})
                            </button>
                            {[500, 1000, 2000, 5000].filter(v => v !== selectedRequest.requested_amount && v <= selectedRequest.requested_amount * 2).map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setCustomApprovedAmount(amt.toString())}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                  parseFloat(customApprovedAmount) === amt
                                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                                }`}
                              >
                                ₹{amt.toLocaleString("en-IN")}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Admin Notes */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-300">
                            Admin Approval Remarks / Reference (Optional)
                          </label>
                          <input
                            type="text"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="e.g. Verified UTR on bank portal, credited approved amount"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>

                        {/* Live Balance Simulation Grid */}
                        <div className="pt-2 border-t border-slate-800/80">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                            Simulated Balance Impact
                          </span>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                              <span className="text-[10px] text-slate-400 block font-bold">Opening</span>
                              <span className="text-xs font-black text-slate-200">
                                ₹{(selectedRequest.retailer?.current_wallet_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40">
                              <span className="text-[10px] text-emerald-400 block font-bold">+ Credit</span>
                              <span className="text-xs font-black text-emerald-400 font-mono">
                                ₹{(parseFloat(customApprovedAmount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-500/40">
                              <span className="text-[10px] text-blue-400 block font-bold">Closing</span>
                              <span className="text-xs font-black text-blue-300 font-mono">
                                ₹{simulatedClosingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Trail for Past Actions */}
                {(selectedRequest.status === "APPROVED" || selectedRequest.status === "REJECTED") && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Audit Trail &amp; Ledger Reference
                    </span>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {selectedRequest.approved_by && (
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Approved By</span>
                          <span className="font-bold text-emerald-400">{selectedRequest.approved_by}</span>
                        </div>
                      )}
                      {selectedRequest.approved_at && (
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Approved At</span>
                          <span className="font-medium text-slate-300">
                            {new Date(selectedRequest.approved_at).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                      {selectedRequest.rejected_by && (
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Rejected By</span>
                          <span className="font-bold text-rose-400">{selectedRequest.rejected_by}</span>
                        </div>
                      )}
                      {selectedRequest.rejected_at && (
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Rejected At</span>
                          <span className="font-medium text-slate-300">
                            {new Date(selectedRequest.rejected_at).toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                      {selectedRequest.rejection_reason && (
                        <div className="col-span-2">
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Rejection Reason</span>
                          <span className="font-bold text-rose-300">{selectedRequest.rejection_reason}</span>
                        </div>
                      )}
                      {selectedRequest.transaction_reference && (
                        <div className="col-span-2 font-mono">
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Transaction Ref</span>
                          <span className="font-bold text-emerald-300">{selectedRequest.transaction_reference}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-4">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Close
                </button>

                {selectedRequest.status === "PENDING" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Request
                    </button>

                    {selectedRequest.can_approve === false ? (
                      <div className="relative group" title={selectedRequest.approval_block_reason || "POS T1 requests can be approved from the next day (T+1)."}>
                        <button
                          type="button"
                          disabled
                          className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-500 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-not-allowed shadow-none"
                        >
                          <Clock className="h-4 w-4 text-slate-500" />
                          Approve Disabled (T+1 Pending)
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowApproveModal(true)}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve &amp; Credit Wallet (₹{(parseFloat(customApprovedAmount) || 0).toLocaleString("en-IN")})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Approval Modal ── */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowApproveModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Approve Topup Request</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedRequest.topup_request_id}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Approval Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    value={customApprovedAmount}
                    onChange={(e) => setCustomApprovedAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-black text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Amount Preset Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "100%", val: selectedRequest.requested_amount },
                  { label: "50%", val: selectedRequest.requested_amount * 0.5 },
                  { label: "₹5,000", val: 5000 },
                  { label: "₹10,000", val: 10000 },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => setCustomApprovedAmount(chip.val.toString())}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Administrative Notes (Optional)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Bank verified via SBI NetBanking UTR confirmation"
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 h-20 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium">
                ⚡ <strong>Atomic DB Lock:</strong> Approving will immediately lock the retailer wallet, add ₹{parseFloat(customApprovedAmount) || 0} to balance, and post a ledger entry.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {approving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm &amp; Credit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Modal ── */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowRejectModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Reject Topup Request</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedRequest.topup_request_id}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Select Rejection Reason</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {REJECTION_PRESETS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setRejectionReason(reason)}
                      className={`w-full text-left p-2 rounded-xl border text-xs font-medium transition-all ${
                        rejectionReason === reason
                          ? "bg-rose-500/20 border-rose-500 text-rose-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Custom Rejection Reason / Note *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide detailed explanation for retailer..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 h-20 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] font-medium">
                ⚠️ Zero financial movement will be recorded. The retailer will be notified of this rejection reason.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting || !rejectionReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {rejecting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Slip Lightbox ── */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-2xl"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreenImage}
            alt="Fullscreen Proof"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
