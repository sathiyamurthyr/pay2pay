"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import api from "@/lib/api";
import {
  ArrowLeftRight,
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
  ExternalLink,
  ChevronRight,
  Calendar,
  Wallet,
  Store,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  FileImage,
  ArrowUpRight,
  TrendingUp,
  XCircle,
  Info,
  CheckSquare
} from "lucide-react";

interface TopupRequestItem {
  id: string;
  topup_request_id: string;
  requested_amount: number;
  approved_amount?: number;
  currency: string;
  payment_reference: string;
  payment_method: string;
  payment_date?: string;
  slip_id?: string;
  slip_url?: string;
  slip_original_filename?: string;
  slip_mime_type?: string;
  slip_file_size_bytes?: number;
  slip_checksum?: string;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
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
    current_wallet_balance?: number;
    is_wallet_frozen?: boolean;
  };
}

interface TopupMetrics {
  pending_count: number;
  pending_volume: number;
  approved_today_count: number;
  approved_today_volume: number;
  rejected_count: number;
  rejected_volume: number;
  total_volume: number;
}

export default function TopupRequestsAdminPage() {
  // ── States ───────────────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<TopupRequestItem[]>([]);
  const [metrics, setMetrics] = useState<TopupMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<string>("ALL");

  // Detail Drawer & Modals
  const [selectedRequest, setSelectedRequest] = useState<TopupRequestItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  
  // Image Viewer
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Approval Flow
  const [customApprovedAmount, setCustomApprovedAmount] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const [showApproveModal, setShowApproveModal] = useState<boolean>(false);
  const [approving, setApproving] = useState<boolean>(false);

  // Rejection Flow
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejecting, setRejecting] = useState<boolean>(false);

  // UI helpers
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // ── Fetch Metrics ────────────────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      const res = await api.get("/api/v1/topup/metrics");
      setMetrics(res.data);
    } catch (err) {
      console.error("Failed to fetch topup metrics:", err);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  // ── Fetch Requests ───────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page,
        limit,
      };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "ALL") params.status = statusFilter;

      // Handle Date Presets
      const now = new Date();
      if (datePreset === "TODAY") {
        params.from_date = now.toISOString().split("T")[0];
        params.to_date = now.toISOString().split("T")[0];
      } else if (datePreset === "YESTERDAY") {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        params.from_date = yest.toISOString().split("T")[0];
        params.to_date = yest.toISOString().split("T")[0];
      } else if (datePreset === "THIS_WEEK") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.from_date = weekAgo.toISOString().split("T")[0];
        params.to_date = now.toISOString().split("T")[0];
      } else if (datePreset === "THIS_MONTH") {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        params.from_date = firstDay.toISOString().split("T")[0];
        params.to_date = now.toISOString().split("T")[0];
      }

      const res = await api.get("/api/v1/topup/requests", { params });
      setRequests(res.data.items || []);
      setTotalCount(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
    } catch (err) {
      console.error("Failed to fetch topup requests:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, datePreset]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ── Open Detail Drawer ───────────────────────────────────────────────────────
  const openDrawer = async (reqItem: TopupRequestItem) => {
    setSelectedRequest(reqItem);
    setCustomApprovedAmount(reqItem.requested_amount.toString());
    setAdminNotes(reqItem.admin_notes || "");
    setZoomLevel(1);
    setDrawerOpen(true);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

    // Fetch fresh detail with live wallet balance
    try {
      setDrawerLoading(true);
      const res = await api.get(`/api/v1/topup/requests/${reqItem.topup_request_id}`);
      if (res.data?.data) {
        setSelectedRequest(res.data.data);
        if (res.data.data.status === "PENDING") {
          setCustomApprovedAmount(res.data.data.requested_amount.toString());
        }
      }
    } catch (e) {
      console.error("Error refreshing detail:", e);
    } finally {
      setDrawerLoading(false);
    }
  };

  // ── Copy Helper ─────────────────────────────────────────────────────────────
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Approve Action ───────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selectedRequest) return;
    const finalAmount = parseFloat(customApprovedAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setActionErrorMsg("Please enter a valid positive approval amount.");
      return;
    }

    try {
      setApproving(true);
      setActionErrorMsg(null);
      const payload = {
        approved_amount: finalAmount,
        admin_notes: adminNotes.trim() || undefined
      };

      const res = await api.post(`/api/v1/topup/requests/${selectedRequest.topup_request_id}/approve`, payload);
      setShowApproveModal(false);
      setActionSuccessMsg(res.data.message || "Topup approved and credited successfully.");

      // Refresh data
      fetchMetrics();
      fetchRequests();
      
      // Update local drawer item
      if (res.data?.data) {
        setSelectedRequest((prev) => prev ? {
          ...prev,
          status: "APPROVED",
          approved_amount: res.data.data.approved_amount,
          approved_by: res.data.data.approved_by,
          approved_at: res.data.data.approved_at,
          transaction_reference: res.data.data.transaction_reference,
          retailer: prev.retailer ? {
            ...prev.retailer,
            current_wallet_balance: res.data.data.current_balance
          } : undefined
        } : null);
      }
    } catch (err: any) {
      console.error("Approval error:", err);
      const detail = err.response?.data?.detail || err.message || "Approval failed.";
      setActionErrorMsg(detail);
      setShowApproveModal(false);
    } finally {
      setApproving(false);
    }
  };

  // ── Reject Action ────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason.trim()) {
      setActionErrorMsg("Please provide a rejection reason.");
      return;
    }

    try {
      setRejecting(true);
      setActionErrorMsg(null);
      const payload = {
        rejection_reason: rejectionReason.trim(),
        admin_notes: adminNotes.trim() || undefined
      };

      const res = await api.post(`/api/v1/topup/requests/${selectedRequest.topup_request_id}/reject`, payload);
      setShowRejectModal(false);
      setActionSuccessMsg(res.data.message || "Topup request rejected.");

      // Refresh data
      fetchMetrics();
      fetchRequests();

      // Update local drawer item
      if (res.data?.data) {
        setSelectedRequest((prev) => prev ? {
          ...prev,
          status: "REJECTED",
          rejection_reason: res.data.data.rejection_reason,
          rejected_by: res.data.data.rejected_by,
          rejected_at: res.data.data.rejected_at
        } : null);
      }
    } catch (err: any) {
      console.error("Rejection error:", err);
      const detail = err.response?.data?.detail || err.message || "Rejection failed.";
      setActionErrorMsg(detail);
      setShowRejectModal(false);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-900/50 min-h-screen text-slate-100 font-sans">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Retailer Topup Requests
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                  Verified Settlement
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Review payment proof slips, verify bank reference UTRs, edit approval amounts, and atomically credit retailer wallets.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchMetrics(); fetchRequests(); }}
            disabled={loading || metricsLoading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading || metricsLoading ? "animate-spin text-amber-400" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Requests */}
        <div className="bg-slate-800/40 border border-amber-500/20 rounded-xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Pending Verification</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {metricsLoading ? "..." : metrics?.pending_count || 0}
            </div>
            <div className="text-xs text-amber-400/80 font-medium mt-1">
              ₹{(metrics?.pending_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} awaiting approval
            </div>
          </div>
        </div>

        {/* Approved Today */}
        <div className="bg-slate-800/40 border border-emerald-500/20 rounded-xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Approved Today</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {metricsLoading ? "..." : metrics?.approved_today_count || 0}
            </div>
            <div className="text-xs text-emerald-400/80 font-medium mt-1">
              ₹{(metrics?.approved_today_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} credited today
            </div>
          </div>
        </div>

        {/* Rejected Requests */}
        <div className="bg-slate-800/40 border border-rose-500/20 rounded-xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-400 uppercase tracking-wider">Rejected Requests</span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              {metricsLoading ? "..." : metrics?.rejected_count || 0}
            </div>
            <div className="text-xs text-rose-400/80 font-medium mt-1">
              ₹{(metrics?.rejected_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })} rejected
            </div>
          </div>
        </div>

        {/* Total Settled Volume */}
        <div className="bg-slate-800/40 border border-cyan-500/20 rounded-xl p-4 relative overflow-hidden backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">Total Approved Volume</span>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white">
              ₹{(metrics?.total_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-cyan-400/80 font-medium mt-1">
              Verified Wallet Allocations
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Request ID, Retailer Code, Name, UTR / Ref..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 border border-slate-700 rounded-lg w-full md:w-auto overflow-x-auto">
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-amber-500 text-slate-950 font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {st === "ALL" ? "All Requests" : st}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 border border-slate-700 rounded-lg w-full md:w-auto overflow-x-auto">
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "YESTERDAY", label: "Yesterday" },
              { id: "THIS_WEEK", label: "7 Days" },
              { id: "THIS_MONTH", label: "This Month" },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => { setDatePreset(preset.id); setPage(1); }}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  datePreset === preset.id
                    ? "bg-slate-700 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Table & Data View ── */}
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-700/80">
              <tr>
                <th className="py-3.5 px-4">Request ID</th>
                <th className="py-3.5 px-4">Retailer</th>
                <th className="py-3.5 px-4 text-right">Requested Amt</th>
                <th className="py-3.5 px-4 text-right">Approved Amt</th>
                <th className="py-3.5 px-4">Payment Details</th>
                <th className="py-3.5 px-4 text-center">Slip Proof</th>
                <th className="py-3.5 px-4">Submitted At</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-amber-400" />
                    Loading topup requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <AlertCircle className="h-7 w-7 text-slate-500 mx-auto mb-2" />
                    No topup requests found matching your filters.
                  </td>
                </tr>
              ) : (
                requests.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                    {/* Request ID */}
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span>{item.topup_request_id}</span>
                        <button
                          onClick={() => copyToClipboard(item.topup_request_id, item.id)}
                          className="text-slate-500 hover:text-slate-300 p-0.5"
                          title="Copy Request ID"
                        >
                          {copiedId === item.id ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Retailer Details */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-medium text-slate-100">
                          {item.retailer?.retailer_name || "Unknown Retailer"}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="font-mono text-amber-400/90">{item.retailer?.retailer_code || "N/A"}</span>
                          {item.retailer?.current_wallet_balance !== undefined && (
                            <span className="text-slate-400">
                              • Bal: ₹{item.retailer.current_wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Requested Amount */}
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-100">
                      ₹{item.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    {/* Approved Amount */}
                    <td className="py-3.5 px-4 text-right font-semibold">
                      {item.approved_amount !== undefined && item.approved_amount !== null ? (
                        <span className="text-emerald-400">
                          ₹{item.approved_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>

                    {/* Payment Details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-700 text-slate-300">
                          {item.payment_method}
                        </span>
                        <span className="font-mono text-slate-300 truncate max-w-[140px]" title={item.payment_reference}>
                          {item.payment_reference}
                        </span>
                      </div>
                      {item.payment_date && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(item.payment_date).toLocaleDateString("en-IN")}
                        </div>
                      )}
                    </td>

                    {/* Slip Proof Thumbnail / View */}
                    <td className="py-3.5 px-4 text-center">
                      {item.slip_url ? (
                        <button
                          onClick={() => openDrawer(item)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-700/60 hover:bg-slate-700 text-amber-300 text-[11px] border border-amber-500/20 transition-colors"
                        >
                          <FileImage className="h-3.5 w-3.5 text-amber-400" />
                          View Slip
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">No Slip</span>
                      )}
                    </td>

                    {/* Submitted At */}
                    <td className="py-3.5 px-4 text-slate-300 text-[11px] whitespace-nowrap">
                      {item.submitted_at ? new Date(item.submitted_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      }) : "N/A"}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                        item.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : item.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : item.status === "REJECTED"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : "bg-slate-700/40 text-slate-400 border-slate-600"
                      }`}>
                        {item.status === "PENDING" && <Clock className="h-3 w-3 animate-pulse" />}
                        {item.status === "APPROVED" && <Check className="h-3 w-3" />}
                        {item.status === "REJECTED" && <X className="h-3 w-3" />}
                        {item.status}
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => openDrawer(item)}
                        className="px-3 py-1.5 text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {item.status === "PENDING" ? "Verify & Review" : "View Details"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900/60 border-t border-slate-700/60 text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{requests.length}</span> of{" "}
            <span className="font-semibold text-slate-200">{totalCount}</span> topup requests
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="px-2 font-medium text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Right-Side Inspection Drawer ── */}
      {drawerOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-white">Topup Request Verification</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                    selectedRequest.status === "PENDING"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : selectedRequest.status === "APPROVED"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : selectedRequest.status === "REJECTED"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : "bg-slate-700 text-slate-300"
                  }`}>
                    {selectedRequest.status}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-1">ID: {selectedRequest.topup_request_id}</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Notifications inside Drawer */}
            {actionSuccessMsg && (
              <div className="m-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}
            {actionErrorMsg && (
              <div className="m-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{actionErrorMsg}</span>
              </div>
            )}

            {/* Drawer Body */}
            <div className="p-5 space-y-6 flex-1">
              {/* 1. Requesting Retailer Profile */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <Store className="h-4 w-4 text-amber-400" />
                    Retailer Profile & Target Wallet
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                    Single Destination Isolation
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Retailer Name</span>
                    <span className="font-semibold text-slate-100">{selectedRequest.retailer?.retailer_name || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Retailer Code</span>
                    <span className="font-mono text-amber-400 font-semibold">{selectedRequest.retailer?.retailer_code || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Current Wallet Balance</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      ₹{(selectedRequest.retailer?.current_wallet_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Target Wallet ID</span>
                    <span className="font-mono text-slate-300 text-[11px] truncate block" title={selectedRequest.retailer?.wallet_id}>
                      {selectedRequest.retailer?.wallet_id || "Resolved by Server"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Topup Details */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <Info className="h-4 w-4 text-cyan-400" />
                    Payment Claim Information
                  </div>
                  <span className="text-xs font-bold text-white bg-slate-700/80 px-2.5 py-1 rounded">
                    Requested: ₹{selectedRequest.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Payment Method</span>
                    <span className="font-medium text-slate-200">{selectedRequest.payment_method}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Bank Reference / UTR</span>
                    <span className="font-mono font-semibold text-slate-100">{selectedRequest.payment_reference}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Payment Date</span>
                    <span className="text-slate-200">
                      {selectedRequest.payment_date ? new Date(selectedRequest.payment_date).toLocaleDateString("en-IN") : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Submitted Timestamp</span>
                    <span className="text-slate-200">
                      {selectedRequest.submitted_at ? new Date(selectedRequest.submitted_at).toLocaleString("en-IN") : "N/A"}
                    </span>
                  </div>
                </div>

                {selectedRequest.retailer_remarks && (
                  <div className="pt-2 border-t border-slate-700/60 text-xs">
                    <span className="text-slate-400 block">Retailer Remarks:</span>
                    <p className="text-slate-300 italic mt-0.5 bg-slate-900/60 p-2 rounded-lg">
                      "{selectedRequest.retailer_remarks}"
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Uploaded Slip Proof Viewer */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <FileImage className="h-4 w-4 text-amber-400" />
                    Payment Slip Proof Document
                  </div>
                  {selectedRequest.slip_url && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                        title="Zoom In"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                        title="Zoom Out"
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setZoomLevel(1)}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200"
                        title="Reset Zoom"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <a
                        href={selectedRequest.slip_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-amber-400"
                        title="Open Full Image in New Tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                {selectedRequest.slip_url ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-80 bg-slate-950 rounded-xl overflow-hidden border border-slate-700/60 flex items-center justify-center p-2">
                      <img
                        src={selectedRequest.slip_url}
                        alt="Payment Slip Proof"
                        style={{ transform: `scale(${zoomLevel})`, transition: "transform 0.15s ease" }}
                        className="max-h-full max-w-full object-contain cursor-zoom-in rounded"
                        onClick={() => setFullscreenImage(selectedRequest.slip_url || null)}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>File: {selectedRequest.slip_original_filename || "Receipt"} ({selectedRequest.slip_file_size_bytes ? `${Math.round(selectedRequest.slip_file_size_bytes / 1024)} KB` : "Image"})</span>
                      {selectedRequest.slip_checksum && (
                        <span className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]" title={selectedRequest.slip_checksum}>
                          SHA256: {selectedRequest.slip_checksum.substring(0, 16)}...
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-950/40 rounded-xl text-slate-500 text-xs">
                    No payment proof slip was uploaded for this request.
                  </div>
                )}
              </div>

              {/* 4. Approval / Rejection Management */}
              {selectedRequest.status === "PENDING" ? (
                <div className="bg-slate-800/40 border border-amber-500/30 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                    <ShieldCheck className="h-4 w-4" />
                    Admin Verification & Approval Control
                  </div>

                  {/* Editable Approval Amount */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300">
                        Final Approval Amount (₹) <span className="text-amber-400">*</span>
                      </label>
                      {parseFloat(customApprovedAmount) !== selectedRequest.requested_amount && (
                        <span className="text-[11px] text-amber-400 font-medium">
                          Modified from requested ₹{selectedRequest.requested_amount.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      value={customApprovedAmount}
                      onChange={(e) => setCustomApprovedAmount(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-base font-bold text-emerald-400 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <p className="text-[11px] text-slate-400">
                      You may adjust the credit amount (e.g. deduct TDS, bank charges, or partial payment).
                    </p>
                  </div>

                  {/* Admin Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Admin Internal Notes / Verification Remarks</label>
                    <textarea
                      rows={2}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="e.g. Verified with SBI NetBanking statement at 11:30 AM."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setShowApproveModal(true)}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Approve & Credit ₹{parseFloat(customApprovedAmount || "0").toLocaleString("en-IN")}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="py-2.5 px-4 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Reject Request
                    </button>
                  </div>
                </div>
              ) : selectedRequest.status === "APPROVED" ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Topup Approved & Credited
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                    <div>
                      <span className="text-slate-400 block">Approved Amount:</span>
                      <span className="font-bold text-white text-sm">
                        ₹{(selectedRequest.approved_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Approved By:</span>
                      <span className="text-slate-200">{selectedRequest.approved_by || "Admin"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Transaction Reference:</span>
                      <span className="font-mono text-emerald-400 font-semibold">{selectedRequest.transaction_reference || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Approved Timestamp:</span>
                      <span className="text-slate-200">
                        {selectedRequest.approved_at ? new Date(selectedRequest.approved_at).toLocaleString("en-IN") : "N/A"}
                      </span>
                    </div>
                  </div>
                  {selectedRequest.admin_notes && (
                    <div className="pt-2 border-t border-emerald-500/20 text-slate-300">
                      <span className="text-slate-400 block">Admin Notes:</span>
                      <p className="italic text-slate-200">{selectedRequest.admin_notes}</p>
                    </div>
                  )}
                </div>
              ) : selectedRequest.status === "REJECTED" ? (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-rose-400">
                    <XCircle className="h-4 w-4" />
                    Topup Request Rejected
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                    <div className="col-span-2">
                      <span className="text-slate-400 block">Rejection Reason:</span>
                      <span className="text-rose-200 font-semibold">{selectedRequest.rejection_reason || "Payment proof mismatch."}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Rejected By:</span>
                      <span className="text-slate-200">{selectedRequest.rejected_by || "Admin"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Rejected Timestamp:</span>
                      <span className="text-slate-200">
                        {selectedRequest.rejected_at ? new Date(selectedRequest.rejected_at).toLocaleString("en-IN") : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Confirmation Modal ── */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Topup Approval</h3>
                <p className="text-xs text-slate-400">Review final wallet destination & credit amount</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl space-y-2.5 text-xs border border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Retailer:</span>
                <span className="font-bold text-white text-right">{selectedRequest.retailer?.retailer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Retailer Code:</span>
                <span className="font-mono font-semibold text-amber-400">{selectedRequest.retailer?.retailer_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Requested Amount:</span>
                <span className="text-slate-300 font-semibold">₹{selectedRequest.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
                <span className="text-emerald-400 font-bold">Credit Amount:</span>
                <span className="text-emerald-400 font-extrabold">₹{parseFloat(customApprovedAmount || "0").toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                <strong>P0 Isolation Rule:</strong> Funds will be atomically credited <strong>ONLY</strong> to this retailer's primary wallet. This operation cannot be reversed automatically.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={approving}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {approving ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Posting Ledger...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Confirm & Credit Wallet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Reason Modal ── */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reject Topup Request</h3>
                <p className="text-xs text-slate-400">Specify why the payment proof could not be verified</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-medium text-slate-300">
                Rejection Reason <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. UTR reference not found in bank statement, slip image unreadable, or duplicate payment claim."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={rejecting}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting || !rejectionReason.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-900/40 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {rejecting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5" />
                    Confirm Rejection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Image Lightbox ── */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={fullscreenImage}
            alt="Full Payment Slip Proof"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
