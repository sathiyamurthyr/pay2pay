"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
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
  AlertCircle,
  Copy,
  Phone,
  Store,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";

interface TopupItem {
  id: string;
  topup_request_id: string;
  requested_amount: number;
  approved_amount?: number;
  received_amount?: number;
  mdr_charge?: number;
  mdr_percentage?: number;
  gst_amount?: number;
  charges?: number;
  mdr_config_id?: string;
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
    email?: string;
    company_name?: string;
    account_status?: string;
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

export function isPosInstantMode(item: TopupItem | null | undefined): boolean {
  if (!item) return false;
  if (item.is_pos_instant !== undefined) return item.is_pos_instant;
  const mode = (item.payment_mode || item.payment_method || "").toUpperCase().replace(/[\s\-_+]/g, "");
  return mode.includes("INSTANT") || mode === "POSINSTANT" || mode === "POS_INSTANT";
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
    const initialReceived = req.received_amount !== undefined && req.received_amount !== null
      ? req.received_amount
      : (req.approved_amount !== undefined && req.approved_amount !== null ? req.approved_amount : req.requested_amount);
    setCustomApprovedAmount(initialReceived.toString());
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
        setActionErrorMsg("Please specify a valid received amount (> 0).");
        setApproving(false);
        return;
      }

      const res = await api.post(`/api/v1/topup/requests/${selectedRequest.id}/approve`, {
        approved_amount: amount,
        received_amount: amount,
        admin_notes: adminNotes.trim() || undefined,
      });

      if (res.data?.success) {
        const emailNotice = res.data.email_sent
          ? ` • Confirmation email sent to ${res.data.recipient_email || selectedRequest.retailer?.email || "retailer"}`
          : "";
        setActionSuccessMsg(
          `Successfully approved & credited Received Amount ₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} to ${
            selectedRequest.retailer?.retailer_name || "Retailer"
          }${emailNotice}`
        );
        setShowApproveModal(false);
        fetchRequests();
        fetchMetrics();
        setSelectedRequest((prev) =>
          prev
            ? {
                ...prev,
                status: "APPROVED",
                approved_amount: amount,
                received_amount: amount,
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
        fetchRequests();
        fetchMetrics();
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

  const exportToCSV = () => {
    if (!requests || requests.length === 0) return;
    const headers = [
      "Request ID",
      "Retailer Code",
      "Retailer Name",
      "Mobile",
      "Requested Amount",
      "MDR (%)",
      "MDR Charge",
      "GST Amount",
      "Total Deductions",
      "Received Amount",
      "Approved Amount",
      "Payment Method",
      "Payment Reference (UTR)",
      "Payment Date",
      "Status",
      "Submitted At",
      "Approved At",
      "Transaction Reference",
    ];

    const rows = requests.map((r) => {
      const rMdrPct = r.mdr_percentage !== undefined && r.mdr_percentage !== null
        ? r.mdr_percentage
        : (r.requested_amount > 0
            ? (r.mdr_charge !== undefined && r.mdr_charge !== null
                ? (r.mdr_charge / r.requested_amount) * 100
                : (r.charges ? ((r.gst_amount ? r.charges - r.gst_amount : r.charges) / r.requested_amount) * 100 : 0))
            : 0);
      const deductions = (r.charges || r.mdr_charge || 0) + (r.gst_amount || 0);
      const received = r.received_amount !== undefined && r.received_amount !== null
        ? r.received_amount
        : (r.approved_amount !== undefined && r.approved_amount !== null ? r.approved_amount : r.requested_amount);

      return [
        r.topup_request_id,
        r.retailer?.retailer_code || "",
        `"${(r.retailer?.retailer_name || "").replace(/"/g, '""')}"`,
        r.retailer?.mobile_number || "",
        r.requested_amount,
        rMdrPct > 0 ? `${rMdrPct.toFixed(2)}%` : "0%",
        r.mdr_charge || (r.charges ? (r.gst_amount ? r.charges - r.gst_amount : r.charges) : 0),
        r.gst_amount || 0,
        deductions,
        received,
        r.approved_amount || "",
        r.payment_method,
        `"${(r.payment_reference || "").replace(/"/g, '""')}"`,
        r.payment_date ? new Date(r.payment_date).toISOString().split("T")[0] : "",
        r.status,
        r.submitted_at ? new Date(r.submitted_at).toISOString() : "",
        r.approved_at ? new Date(r.approved_at).toISOString() : "",
        r.transaction_reference || "",
      ];
    });

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

  const selectedMdrPct = selectedRequest
    ? (selectedRequest.mdr_percentage !== undefined && selectedRequest.mdr_percentage !== null
        ? selectedRequest.mdr_percentage
        : (selectedRequest.requested_amount > 0
            ? (selectedRequest.mdr_charge !== undefined && selectedRequest.mdr_charge !== null
                ? (selectedRequest.mdr_charge / selectedRequest.requested_amount) * 100
                : (selectedRequest.charges ? ((selectedRequest.gst_amount ? selectedRequest.charges - selectedRequest.gst_amount : selectedRequest.charges) / selectedRequest.requested_amount) * 100 : 0))
            : 0))
    : 0;

  return (
    <div className="space-y-4 pb-12 font-sans min-h-screen bg-slate-50 text-slate-900">
      {/* ── Top Header Cockpit ── */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-xs relative overflow-hidden">

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs shrink-0">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  Retailer Topup Requests
                </h1>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1.5 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Verified Settlement Engine
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Double-Entry Ledger
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 max-w-3xl leading-relaxed">
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
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading || metricsLoading ? "animate-spin text-amber-600" : "text-slate-500"}`} />
              Refresh
            </button>

            {/* Export CSV */}
            <button
              onClick={exportToCSV}
              disabled={requests.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
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
          className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden group shadow-xs ${
            statusFilter === "PENDING"
              ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/30"
              : "bg-white border-slate-200 hover:border-amber-400 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Pending Verification
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shadow-xs">
              <Clock className="h-4.5 w-4.5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {metricsLoading ? "..." : (metrics?.pending_count ?? 0)}
            </div>
            <div className="text-xs text-amber-700 font-semibold mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
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
          className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden group shadow-xs ${
            statusFilter === "APPROVED" && datePreset === "TODAY"
              ? "bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/30"
              : "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Approved Today
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {metricsLoading ? "..." : (metrics?.approved_today_count ?? 0)}
            </div>
            <div className="text-xs text-emerald-700 font-semibold mt-1">
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
          className={`cursor-pointer rounded-2xl p-5 border transition-all relative overflow-hidden group shadow-xs ${
            statusFilter === "REJECTED"
              ? "bg-rose-50/70 border-rose-400 ring-2 ring-rose-400/30"
              : "bg-white border-slate-200 hover:border-rose-400 hover:shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
              Rejected Requests
            </span>
            <div className="h-9 w-9 rounded-xl bg-rose-100 border border-rose-200 text-rose-700 flex items-center justify-center shadow-xs">
              <XCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {metricsLoading ? "..." : (metrics?.rejected_count ?? 0)}
            </div>
            <div className="text-xs text-rose-700 font-semibold mt-1">
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
          className="cursor-pointer rounded-2xl p-5 bg-white border border-slate-200 hover:border-indigo-400 transition-all relative overflow-hidden group shadow-xs hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider">
              Total Approved Volume
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-xs">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3.5">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              ₹{(metrics?.total_approved_volume || metrics?.total_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-indigo-700 font-semibold mt-1">
              {metrics?.total_approved_count ?? 0} Verified Wallet Allocations
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Control Bar ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
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
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    statusFilter === st.id
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <span>{st.label}</span>
                  {st.count !== undefined && st.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        statusFilter === st.id ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {st.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Date Preset Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto overflow-x-auto">
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
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
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
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-slate-700 uppercase font-black text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-black">REQUEST ID</th>
                <th className="py-3.5 px-4 font-black">RETAILER</th>
                <th className="py-3.5 px-4 font-black">MODE &amp; REF</th>
                <th className="py-3.5 px-4 text-right font-black">
                  TRANSACTION AMOUNT (₹) <span className="text-rose-500">*</span>
                </th>
                <th className="py-3.5 px-4 text-right font-black">MDR % / CHARGES</th>
                <th className="py-3.5 px-4 text-right font-black text-emerald-800">
                  RECEIVED AMOUNT (₹)
                </th>
                <th className="py-3.5 px-4 text-center font-black">SLIP PROOF</th>
                <th className="py-3.5 px-4 font-black">SUBMITTED AT</th>
                <th className="py-3.5 px-4 text-center font-black">STATUS</th>
                <th className="py-3.5 px-4 text-right font-black">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-slate-500">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-amber-500" />
                    <p className="font-bold text-sm text-slate-800">Loading live topup requests...</p>
                    <p className="text-xs text-slate-400 mt-1">Directly retrieving PostgreSQL database records</p>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-slate-500">
                    <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-base text-slate-800">No topup requests found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or status filters.</p>
                  </td>
                </tr>
              ) : (
                requests.map((item) => {
                  const initialLetter = (item.retailer?.retailer_name || "R").charAt(0).toUpperCase();
                  const isApproved = item.status === "APPROVED";
                  const isPending = item.status === "PENDING" || item.status === "UNDER_REVIEW";
                  const isRejected = item.status === "REJECTED";
                  const totalDeductions = (item.charges || item.mdr_charge || 0) + (item.gst_amount || 0);
                  const displayReceived = item.received_amount !== undefined && item.received_amount !== null
                    ? item.received_amount
                    : (item.approved_amount !== undefined && item.approved_amount !== null ? item.approved_amount : item.requested_amount);
                  const itemMdrPct = item.mdr_percentage !== undefined && item.mdr_percentage !== null
                    ? item.mdr_percentage
                    : (item.requested_amount > 0
                        ? (item.mdr_charge !== undefined && item.mdr_charge !== null
                            ? (item.mdr_charge / item.requested_amount) * 100
                            : (item.charges ? ((item.gst_amount ? item.charges - item.gst_amount : item.charges) / item.requested_amount) * 100 : 0))
                        : 0);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/90 transition-colors group cursor-pointer"
                      onClick={() => openDrawer(item)}
                    >
                      {/* Request ID */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 tracking-wide">{item.topup_request_id}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.topup_request_id, item.id);
                            }}
                            className="text-slate-400 hover:text-amber-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                            title="Copy Request ID"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {item.transaction_reference && (
                          <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                            Ref: {item.transaction_reference}
                          </div>
                        )}
                      </td>

                      {/* Retailer Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-amber-100/70 border border-amber-200 flex items-center justify-center font-black text-amber-800 text-sm shrink-0">
                            {initialLetter}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm group-hover:text-amber-600 transition-colors">
                              {item.retailer?.retailer_name || "Unknown Retailer"}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Retailer Code">
                                {item.retailer?.retailer_code || "RET-N/A"}
                              </span>
                              {item.retailer?.account_status && item.retailer.account_status !== "ACTIVE" && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                                    item.retailer.account_status === "HOLD"
                                      ? "bg-amber-100 text-amber-900 border-amber-300"
                                      : item.retailer.account_status === "REJECTED"
                                      ? "bg-rose-100 text-rose-900 border-rose-300"
                                      : "bg-slate-100 text-slate-800 border-slate-300"
                                  }`}
                                  title={`Retailer KYC / Onboarding Status: ${item.retailer.account_status}`}
                                >
                                  KYC: {item.retailer.account_status}
                                </span>
                              )}
                              {item.retailer?.mobile_number && (
                                <span className="text-slate-600 font-medium flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  {item.retailer.mobile_number}
                                </span>
                              )}
                              {item.retailer?.current_wallet_balance !== undefined && (
                                <span className="text-slate-600 font-semibold">
                                  • Bal: <strong className="text-emerald-700">₹{item.retailer.current_wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Payment Mode & Reference */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-medium text-slate-700">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black rounded border ${
                                isPosT1Mode(item)
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {item.payment_mode || item.payment_method || "POS - Instant"}
                            </span>
                            <span
                              className="font-mono text-slate-800 truncate max-w-[130px] font-bold"
                              title={item.payment_reference}
                            >
                              {item.payment_reference || "No Ref"}
                            </span>
                          </div>
                          {isPending && isPosT1Mode(item) && item.can_approve === false && (
                            <div className="flex items-center gap-1">
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1"
                                title="POS T1 requests can be approved from the next day (T+1)."
                              >
                                <Clock className="h-2.5 w-2.5 text-amber-600" />
                                T+1 Rule: Next Day
                              </span>
                            </div>
                          )}
                          {item.payment_date && (
                            <div className="text-[11px] text-slate-500">
                              {new Date(item.payment_date).toLocaleDateString("en-IN")}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Transaction Amount (Gross Requested) */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm tracking-wide">
                        ₹{item.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* MDR % / Deductions */}
                      <td className="py-3.5 px-4 text-right font-medium">
                        {totalDeductions > 0 ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5 justify-end">
                              {itemMdrPct > 0 && (
                                <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs" title={`Configured MDR Rate: ${itemMdrPct.toFixed(2)}%`}>
                                  {itemMdrPct.toFixed(2)}%
                                </span>
                              )}
                              <span className="text-amber-800 font-mono font-bold text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                                -₹{totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block font-sans">
                              {item.mdr_charge ? `MDR ₹${item.mdr_charge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : ""} {item.gst_amount ? `+ GST` : "incl. GST"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            {itemMdrPct > 0 && (
                              <span className="text-[10px] font-black font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {itemMdrPct.toFixed(2)}%
                              </span>
                            )}
                            <span className="text-slate-400 text-xs font-mono">₹0.00</span>
                          </div>
                        )}
                      </td>

                      {/* Received Amount (Net Credited / Creditable) */}
                      <td className="py-3.5 px-4 text-right font-black">
                        {isApproved ? (
                          <span className="text-emerald-700 text-sm bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block font-mono">
                            ₹{displayReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-blue-700 text-sm bg-blue-50/90 px-2.5 py-1 rounded-lg border border-blue-200 inline-block font-mono font-bold" title="Received Amount (Editable upon approval)">
                            ₹{displayReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Slip Proof Thumbnail / View */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {item.slip_url ? (
                          <button
                            onClick={() => openDrawer(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 transition-all shadow-xs"
                          >
                            <FileImage className="h-3.5 w-3.5 text-amber-600" />
                            View Slip
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-semibold">No Slip</span>
                        )}
                      </td>

                      {/* Submitted At */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap font-medium">
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
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border uppercase tracking-wider ${
                            isPending
                              ? "bg-amber-50 text-amber-800 border-amber-200 shadow-xs"
                              : isApproved
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs"
                              : isRejected
                              ? "bg-rose-50 text-rose-800 border-rose-200 shadow-xs"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {isPending && <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />}
                          {isApproved && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                          {isRejected && <X className="h-3.5 w-3.5 text-rose-600" />}
                          {item.status}
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openDrawer(item)}
                          className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-xs ${
                            isPending
                              ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-amber-500/20"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50/90 border-t border-slate-200 text-xs text-slate-600 font-medium">
          <div>
            Showing <strong className="text-slate-900">{requests.length}</strong> of{" "}
            <strong className="text-slate-900">{totalCount}</strong> topup requests
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 disabled:opacity-40 transition-colors font-bold shadow-xs flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>
            <span className="px-3.5 py-1 bg-white border border-slate-200 rounded-xl font-black text-slate-900 shadow-xs">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 disabled:opacity-40 transition-colors font-bold shadow-xs flex items-center gap-1"
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
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-fadeIn"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-4xl bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between text-slate-800">
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <ArrowLeftRight className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900 font-mono">
                        {selectedRequest.topup_request_id}
                      </h2>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase border ${
                          selectedRequest.status === "PENDING"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : selectedRequest.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        {selectedRequest.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Submitted on {new Date(selectedRequest.submitted_at).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Alert Messages */}
                {actionSuccessMsg && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3 shadow-xs">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>{actionSuccessMsg}</span>
                  </div>
                )}
                {actionErrorMsg && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-3 shadow-xs">
                    <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                    <span>{actionErrorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Proof Slip Image Viewer */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileImage className="h-4 w-4 text-amber-600" />
                        Uploaded Payment Proof
                      </span>
                      {selectedRequest.slip_url && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                            title="Zoom In"
                          >
                            <ZoomIn className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                            title="Zoom Out"
                          >
                            <ZoomOut className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setRotation((r) => (r + 90) % 360)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                            title="Rotate 90°"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setFullscreenImage(selectedRequest.slip_url || null)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                            title="Fullscreen"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="h-80 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center relative group p-2">
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
                            className="max-h-full max-w-full object-contain rounded-lg shadow-sm cursor-pointer"
                            onClick={() => setFullscreenImage(selectedRequest.slip_url || null)}
                          />
                        </div>
                      ) : (
                        <div className="text-center text-slate-400">
                          <FileImage className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          <p className="text-xs font-bold text-slate-600">No physical slip attached</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Retailer submitted reference without file</p>
                        </div>
                      )}
                    </div>

                    {selectedRequest.slip_url && (
                      <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono">
                        <span className="truncate max-w-[200px]" title={selectedRequest.slip_original_filename}>
                          {selectedRequest.slip_original_filename || "payment_slip.jpg"}
                        </span>
                        <a
                          href={selectedRequest.slip_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1"
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
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Retailer Profile
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200" title="Retailer Code">
                            {selectedRequest.retailer?.retailer_code || "RET-N/A"}
                          </span>
                          {selectedRequest.retailer?.account_status && selectedRequest.retailer.account_status !== "ACTIVE" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300">
                              KYC: {selectedRequest.retailer.account_status}
                            </span>
                          )}
                        </div>
                      </div>

                      {selectedRequest.retailer?.account_status && selectedRequest.retailer.account_status !== "ACTIVE" && (
                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>This retailer account is not approved (Status: <strong>{selectedRequest.retailer.account_status}</strong>). The account must be approved before funds can be credited.</span>
                        </div>
                      )}

                      <div>
                        <h4 className="text-base font-black text-slate-900">
                          {selectedRequest.retailer?.retailer_name || "Unknown Retailer"}
                        </h4>
                        {selectedRequest.retailer?.mobile_number && (
                          <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1.5 font-medium">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-800 font-bold">{selectedRequest.retailer.mobile_number}</span>
                          </p>
                        )}
                        {selectedRequest.retailer?.company_name && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                            <Store className="h-3.5 w-3.5 text-slate-400" />
                            <span>{selectedRequest.retailer.company_name}</span>
                          </p>
                        )}
                      </div>

                      {/* Current Wallet Balance */}
                      <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">Current Wallet Balance</span>
                        <span className="text-sm font-black text-emerald-700">
                          ₹{(selectedRequest.retailer?.current_wallet_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Payment Details & Fee Breakdown Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Payment &amp; Calculation Breakdown
                      </span>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Payment Method / Mode</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`font-bold px-2 py-0.5 rounded border ${
                                isPosT1Mode(selectedRequest)
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : "bg-white text-slate-900 border-slate-200"
                              }`}
                            >
                              {selectedRequest.payment_mode || selectedRequest.payment_method || "POS - Instant"}
                            </span>
                            {isPosT1Mode(selectedRequest) ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300">
                                T+1 Settlement
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                Instant
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Payment Date</span>
                          <span className="font-bold text-slate-900 block mt-0.5">
                            {selectedRequest.payment_date
                              ? new Date(selectedRequest.payment_date).toLocaleDateString("en-IN")
                              : "N/A"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">UTR / Bank Reference</span>
                          <span className="font-mono font-bold text-amber-800 text-sm block mt-0.5">
                            {selectedRequest.payment_reference || "No Reference Provided"}
                          </span>
                        </div>

                        {/* POS T1 Approval Rule Notice */}
                        {selectedRequest.status === "PENDING" && isPosT1Mode(selectedRequest) && selectedRequest.can_approve === false && (
                          <div className="col-span-2 p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-xs text-amber-900 font-semibold space-y-1">
                            <div className="flex items-center gap-2 font-bold text-amber-950">
                              <Clock className="h-4 w-4 text-amber-700 shrink-0" />
                              <span>POS T1 requests can be approved from the next day (T+1).</span>
                            </div>
                            <p className="text-[11px] text-amber-800 font-normal pl-6 leading-relaxed">
                              Request Date: <strong>{selectedRequest.request_date ? new Date(selectedRequest.request_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : (selectedRequest.submitted_at ? new Date(selectedRequest.submitted_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Today")}</strong>. Per platform business rule, same-day approval is disabled for POS T1 transactions. The Admin can review details today, and approval will become active tomorrow.
                            </p>
                          </div>
                        )}

                        {/* Amount & Fee Breakdown Summary */}
                        <div className="col-span-2 p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">Transaction Amount (Gross):</span>
                            <span className="font-black text-slate-900">
                              ₹{selectedRequest.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {(selectedRequest.charges || selectedRequest.mdr_charge || 0) > 0 && (
                            <>
                              <div className="flex items-center justify-between text-xs text-amber-800">
                                <span className="flex items-center gap-1.5">
                                  <span>MDR Fee:</span>
                                  {selectedMdrPct > 0 && (
                                    <span className="font-mono text-[10px] font-black bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300">
                                      {selectedMdrPct.toFixed(2)}%
                                    </span>
                                  )}
                                </span>
                                <span className="font-mono font-bold">
                                  -₹{(selectedRequest.mdr_charge || (selectedRequest.gst_amount ? selectedRequest.charges! - selectedRequest.gst_amount : selectedRequest.charges) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              {selectedRequest.gst_amount ? (
                                <div className="flex items-center justify-between text-xs text-amber-800">
                                  <span>GST on MDR (18%):</span>
                                  <span className="font-mono">
                                    -₹{selectedRequest.gst_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ) : null}
                              <div className="flex items-center justify-between text-xs text-amber-900 font-bold pt-1 border-t border-slate-100">
                                <span>Total Deductions:</span>
                                <span className="font-mono">
                                  -₹{((selectedRequest.charges || selectedRequest.mdr_charge || 0) + (selectedRequest.gst_amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs font-black">
                            <span className="text-slate-700">Calculated Received Amount:</span>
                            <span className="text-emerald-700 font-mono text-sm">
                              ₹{(selectedRequest.received_amount || selectedRequest.requested_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>

                        {selectedRequest.retailer_remarks && (
                          <div className="col-span-2 pt-1 border-t border-slate-200">
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Retailer Remarks</span>
                            <p className="text-xs text-slate-700 italic mt-0.5">
                              &ldquo;{selectedRequest.retailer_remarks}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Approve Amount & Live Balance Simulation Card */}
                    {selectedRequest.status === "PENDING" && (
                      <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-emerald-600" />
                            Received Amount Configuration
                          </span>
                          <div className="flex items-center gap-2 text-[10px]">
                            {selectedMdrPct > 0 && (
                              <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                                MDR: {selectedMdrPct.toFixed(2)}%
                              </span>
                            )}
                            <span className="text-slate-600 font-medium">
                              Txn Gross: <strong className="text-slate-900">₹{selectedRequest.requested_amount.toLocaleString("en-IN")}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Editable Received Amount Input */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                            <span>Received Amount to Credit (INR) *</span>
                            {parseFloat(customApprovedAmount) !== (selectedRequest.received_amount || selectedRequest.requested_amount) && (
                              <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                ✏️ Custom Edited Amount
                              </span>
                            )}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-emerald-700 text-sm">₹</span>
                            <input
                              type="number"
                              step="any"
                              value={customApprovedAmount}
                              onChange={(e) => setCustomApprovedAmount(e.target.value)}
                              placeholder="Enter received amount to credit"
                              className="w-full pl-8 pr-4 py-2.5 bg-white border-2 border-emerald-300 rounded-xl text-base font-black text-emerald-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono shadow-xs"
                            />
                          </div>

                          {/* Quick Adjust Buttons */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setCustomApprovedAmount((selectedRequest.received_amount || selectedRequest.requested_amount).toString())}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                parseFloat(customApprovedAmount) === (selectedRequest.received_amount || selectedRequest.requested_amount)
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              Received (₹{(selectedRequest.received_amount || selectedRequest.requested_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomApprovedAmount(selectedRequest.requested_amount.toString())}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                parseFloat(customApprovedAmount) === selectedRequest.requested_amount
                                  ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              Gross (₹{selectedRequest.requested_amount.toLocaleString("en-IN")})
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomApprovedAmount(((selectedRequest.received_amount || selectedRequest.requested_amount) / 2).toString())}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                            >
                              50%
                            </button>
                          </div>
                        </div>

                        {/* Admin Notes */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-700">
                            Admin Approval Remarks / Reference (Optional)
                          </label>
                          <input
                            type="text"
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="e.g. Verified UTR on bank portal, credited received amount"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors shadow-xs"
                          />
                        </div>

                        {/* Live Balance Simulation Grid */}
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            Simulated Balance Impact
                          </span>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
                              <span className="text-[10px] text-slate-500 block font-bold">Opening</span>
                              <span className="text-xs font-black text-slate-900">
                                ₹{(selectedRequest.retailer?.current_wallet_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                              <span className="text-[10px] text-emerald-700 block font-bold">+ Received</span>
                              <span className="text-xs font-black text-emerald-700 font-mono">
                                ₹{(parseFloat(customApprovedAmount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
                              <span className="text-[10px] text-blue-700 block font-bold">Closing</span>
                              <span className="text-xs font-black text-blue-800 font-mono">
                                ₹{simulatedClosingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Automated Email Notice */}
                        <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                          <span className="text-sm">📧</span>
                          <span>An automated email with transaction details, MDR deductions, and updated balance will be sent to the retailer immediately upon approval.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Trail for Past Actions */}
                {(selectedRequest.status === "APPROVED" || selectedRequest.status === "REJECTED") && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Audit Trail &amp; Ledger Reference
                    </span>
                    <div className="space-y-1.5">
                      {selectedRequest.transaction_reference && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Transaction Reference:</span>
                          <span className="font-mono font-bold text-emerald-700">{selectedRequest.transaction_reference}</span>
                        </div>
                      )}
                      {selectedRequest.approved_by && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Approved By:</span>
                          <span className="font-bold text-slate-800">{selectedRequest.approved_by}</span>
                        </div>
                      )}
                      {selectedRequest.approved_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Approved At:</span>
                          <span className="font-medium text-slate-700">{new Date(selectedRequest.approved_at).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {selectedRequest.rejected_by && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Rejected By:</span>
                          <span className="font-bold text-rose-800">{selectedRequest.rejected_by}</span>
                        </div>
                      )}
                      {selectedRequest.rejected_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Rejected At:</span>
                          <span className="font-medium text-slate-700">{new Date(selectedRequest.rejected_at).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {selectedRequest.rejection_reason && (
                        <div className="pt-1.5 border-t border-slate-200">
                          <span className="text-rose-700 font-bold block">Rejection Reason:</span>
                          <p className="text-slate-800 italic mt-0.5">{selectedRequest.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-xs"
                >
                  Close
                </button>

                {selectedRequest.status === "PENDING" && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                    >
                      <XCircle className="h-4 w-4 text-rose-600" />
                      Reject Request
                    </button>

                    {selectedRequest.can_approve === false ? (
                      <div className="relative group" title={selectedRequest.approval_block_reason || "POS T1 requests can be approved from the next day (T+1)."}>
                        <button
                          type="button"
                          disabled
                          className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-400 border border-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-not-allowed shadow-none"
                        >
                          <Clock className="h-4 w-4 text-slate-400" />
                          Approve Disabled (T+1 Pending)
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowApproveModal(true)}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve Received Amount (₹{(parseFloat(customApprovedAmount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })})
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
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowApproveModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Approve Topup Request</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedRequest.topup_request_id}</p>
              </div>
            </div>

            {/* Read-Only Transaction Breakdown */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Transaction Amount (Gross):</span>
                <span className="font-black text-slate-900">
                  ₹{selectedRequest.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Payment Mode:</span>
                <span className="font-bold text-slate-700">{selectedRequest.payment_mode || selectedRequest.payment_method || "POS - Instant"}</span>
              </div>
              {(selectedRequest.charges || selectedRequest.mdr_charge || 0) > 0 && (
                <div className="flex items-center justify-between text-amber-800">
                  <span>MDR / Charges:</span>
                  <span className="font-mono font-bold">
                    -₹{((selectedRequest.charges || selectedRequest.mdr_charge || 0) + (selectedRequest.gst_amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-800 font-black mb-1">
                  Received Amount to Credit (INR) <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mb-1.5">
                  Only the Received Amount can be edited and approved for wallet credit.
                </p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-emerald-700 text-sm">₹</span>
                  <input
                    type="number"
                    step="any"
                    value={customApprovedAmount}
                    onChange={(e) => setCustomApprovedAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border-2 border-emerald-300 rounded-xl text-base font-black text-emerald-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono shadow-xs"
                  />
                </div>
              </div>

              {/* Quick Amount Preset Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    label: `Received (₹${(selectedRequest.received_amount || selectedRequest.requested_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })})`,
                    val: selectedRequest.received_amount || selectedRequest.requested_amount
                  },
                  {
                    label: `Gross (₹${selectedRequest.requested_amount.toLocaleString("en-IN")})`,
                    val: selectedRequest.requested_amount
                  },
                  {
                    label: "50%",
                    val: (selectedRequest.received_amount || selectedRequest.requested_amount) * 0.5
                  },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => setCustomApprovedAmount(chip.val.toString())}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Administrative Notes (Optional)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Bank verified via SBI NetBanking UTR confirmation"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 h-16 resize-none"
                />
              </div>

              {/* Automated Email Notice */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                📧 <strong>Automated Retailer Email:</strong> Once confirmed, an email with full topup verification details, UTR reference, MDR deductions, and new wallet balance will be sent to the retailer.
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                ⚡ <strong>Atomic DB Lock:</strong> Approving will immediately lock the retailer wallet, add ₹{parseFloat(customApprovedAmount) || 0} to balance, and post a ledger entry.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowApproveModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approving || selectedRequest.can_approve === false}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {approving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm &amp; Credit Received Amount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Modal ── */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Reject Topup Request</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedRequest.topup_request_id}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Rejection Reason</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {REJECTION_PRESETS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setRejectionReason(reason)}
                      className={`w-full text-left p-2 rounded-xl border text-xs font-medium transition-all ${
                        rejectionReason === reason
                          ? "bg-rose-50 border-rose-400 text-rose-800 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Custom Rejection Reason / Note *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide detailed explanation for retailer..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-rose-500 h-20 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-medium">
                ⚠️ Zero financial movement will be recorded. The retailer will be notified of this rejection reason.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting || !rejectionReason.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm disabled:opacity-50 flex items-center gap-2"
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
          className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors shadow-2xl"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreenImage}
            alt="Fullscreen Proof"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl bg-white p-2 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
