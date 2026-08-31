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
  Wallet,
  PlusCircle,
  ShieldAlert,
  ArrowUpRight,
  Lock,
  Building2
} from "lucide-react";

interface AdminOperationWallet {
  id: string;
  public_id: string;
  service_code: string;
  service_name: string;
  vendor_code: string;
  vendor_name: string;
  wallet_number: string;
  available_balance: number;
  hold_balance: number;
  currency: string;
  is_active: boolean;
  updated_date?: string;
}

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
  service?: string;
  service_code?: string;
  vendor?: string;
  vendor_code?: string;
  admin_wallet_id?: string;
  admin_available_balance?: number;
  pos_type?: string;
  is_pos_t1?: boolean;
  is_pos_instant?: boolean;
  is_date_eligible?: boolean;
  is_balance_eligible?: boolean;
  is_wallet_eligible?: boolean;
  can_approve?: boolean;
  approval_block_reason?: string;
  shortfall_amount?: number;
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

export default function AdminTopupRequestsLegacyPage() {
  const [requests, setRequests] = useState<TopupItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(true);

  // Admin Service + Vendor Operation Wallets
  const [adminWallets, setAdminWallets] = useState<AdminOperationWallet[]>([]);
  const [walletsLoading, setWalletsLoading] = useState<boolean>(true);
  const [showAddFundModal, setShowAddFundModal] = useState<boolean>(false);
  const [selectedWalletForFund, setSelectedWalletForFund] = useState<AdminOperationWallet | null>(null);
  const [fundAmount, setFundAmount] = useState<string>("50000");
  const [fundRemarks, setFundRemarks] = useState<string>("Operational fund added for POS payout settlement");
  const [addingFund, setAddingFund] = useState<boolean>(false);
  const [fundSuccessMsg, setFundSuccessMsg] = useState<string | null>(null);

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

  // Fetch Admin Operation Wallets (Dynamic Service + Vendor mapping)
  const fetchAdminWallets = useCallback(async () => {
    setWalletsLoading(true);
    try {
      const res = await api.get("/api/v1/admin/operation-wallets");
      if (res.data?.success) {
        setAdminWallets(res.data.items || []);
      }
    } catch (err) {
      console.error("Failed to load admin operation wallets:", err);
    } finally {
      setWalletsLoading(false);
    }
  }, []);

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
    fetchAdminWallets();
    fetchMetrics();
  }, [fetchAdminWallets, fetchMetrics]);

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

  // Quick Topup Admin Service+Vendor Wallet
  const handleAddFund = async () => {
    if (!selectedWalletForFund) return;
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid fund amount greater than 0");
      return;
    }
    setAddingFund(true);
    setFundSuccessMsg(null);
    try {
      const res = await api.put(`/api/v1/admin/operation-wallets/${selectedWalletForFund.id}/topup`, {
        amount: amount,
        remarks: fundRemarks || undefined
      });
      if (res.data?.success) {
        setFundSuccessMsg(`Successfully added ₹${amount.toLocaleString("en-IN")} to ${selectedWalletForFund.service_name} - ${selectedWalletForFund.vendor_name} wallet.`);
        fetchAdminWallets();
        fetchRequests();
        setTimeout(() => {
          setShowAddFundModal(false);
          setFundSuccessMsg(null);
        }, 1500);
      } else {
        alert(res.data?.message || "Failed to add funds.");
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || err.message || "Failed to add funds to Admin wallet.");
    } finally {
      setAddingFund(false);
    }
  };

  const openFundModalForWallet = (w: AdminOperationWallet) => {
    setSelectedWalletForFund(w);
    setFundAmount("50000");
    setFundRemarks(`Operational fund added for ${w.service_name} (${w.vendor_name}) payout clearance`);
    setShowAddFundModal(true);
  };

  const payoutUtkalWallet = adminWallets.find(
    (w) => w.service_code.toUpperCase() === "PAYOUT" && w.vendor_name.toUpperCase().includes("UTKAL")
  ) || adminWallets.find((w) => w.service_code.toUpperCase() === "PAYOUT") || adminWallets[0];

  const handleApprove = async () => {
    if (!selectedRequest) return;
    if (selectedRequest.can_approve === false) {
      setActionErrorMsg(selectedRequest.approval_block_reason || "Approval blocked due to policy validation.");
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

      // Execute PUT / POST to approve
      const res = await api.put(`/api/v1/topup/requests/${selectedRequest.id}/approve`, {
        approved_amount: amount,
        received_amount: amount,
        admin_notes: adminNotes.trim() || undefined,
      });

      if (res.data?.success) {
        setActionSuccessMsg(
          `Successfully approved & credited Received Amount ₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} to ${
            selectedRequest.retailer?.retailer_name || "Retailer"
          }.`
        );
        setShowApproveModal(false);
        fetchRequests();
        fetchMetrics();
        fetchAdminWallets();
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

  return (
    <div className="space-y-5 pb-12 font-sans min-h-screen bg-slate-50 text-slate-900">
      {/* ── Top Header Cockpit ── */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs shrink-0">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  POS Top-up Request Approvals
                </h1>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1.5 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Dual-Rule Governance
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-blue-600" />
                  Service + Vendor Wallet
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1 max-w-3xl leading-relaxed">
                Approve POS machine top-up requests with strict enforcement of <strong>POS Approval Date Rule</strong> (Instant vs T+1) and <strong>Admin Service/Vendor Wallet Balance</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                fetchAdminWallets();
                fetchMetrics();
                fetchRequests();
              }}
              disabled={loading || metricsLoading || walletsLoading}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading || metricsLoading || walletsLoading ? "animate-spin text-amber-600" : "text-slate-500"}`} />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* ── ADMIN SERVICE + VENDOR OPERATION WALLET CARDS ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-slate-700/60 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">
                  ADMIN OPERATION WALLET
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE DB MAPPING
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Top-up request approval balance validation is mapped dynamically by <strong>Service + Vendor</strong>.
              </p>
            </div>
          </div>

          {payoutUtkalWallet && (
            <button
              onClick={() => openFundModalForWallet(payoutUtkalWallet)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              + Add Fund to Admin Wallet
            </button>
          )}
        </div>

        {/* Dynamic Service + Vendor Wallets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {adminWallets.map((w) => {
            const isPayoutUtkal = w.service_code.toUpperCase() === "PAYOUT" && w.vendor_name.toUpperCase().includes("UTKAL");
            return (
              <div
                key={w.id}
                className={`rounded-xl p-4 border transition-all ${
                  isPayoutUtkal
                    ? "bg-slate-800/90 border-amber-400/50 shadow-md ring-1 ring-amber-400/30"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                    Service: <strong className="text-amber-400">{w.service_name}</strong>
                  </span>
                  {isPayoutUtkal && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      PRIMARY POS
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Vendor: <strong className="text-white">{w.vendor_name}</strong></span>
                  <span className="text-[10px] text-slate-400 font-mono">{w.wallet_number}</span>
                </div>

                <div className="mt-2.5 flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Available Balance</span>
                    <div className="text-xl font-black text-emerald-400 tracking-tight font-mono">
                      ₹{w.available_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <button
                    onClick={() => openFundModalForWallet(w)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-amber-300 border border-slate-600 transition-colors"
                  >
                    + Add Fund
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* ── Table & Data View ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/90 text-slate-700 uppercase font-black text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-black">REQUEST ID</th>
                <th className="py-3.5 px-4 font-black">RETAILER</th>
                <th className="py-3.5 px-4 font-black">SERVICE / VENDOR</th>
                <th className="py-3.5 px-4 font-black">MODE &amp; REF</th>
                <th className="py-3.5 px-4 text-right font-black">TRANSACTION AMOUNT (₹)</th>
                <th className="py-3.5 px-4 text-right font-black">MDR / CHARGES</th>
                <th className="py-3.5 px-4 text-right font-black text-emerald-800">RECEIVED AMOUNT (₹)</th>
                <th className="py-3.5 px-4 text-center font-black">ADMIN WALLET BAL</th>
                <th className="py-3.5 px-4 text-center font-black">ELIGIBILITY</th>
                <th className="py-3.5 px-4 text-center font-black">STATUS</th>
                <th className="py-3.5 px-4 text-right font-black">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-20 text-center text-slate-500">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-amber-500" />
                    <p className="font-bold text-sm text-slate-800">Loading live topup requests...</p>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-20 text-center text-slate-500">
                    <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-base text-slate-800">No topup requests found</p>
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

                  return (
                    <tr
                      key={item.id}
                      onClick={() => openDrawer(item)}
                      className={`cursor-pointer transition-colors group ${
                        selectedRequest?.id === item.id ? "bg-amber-50/50" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {item.topup_request_id}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm group-hover:text-amber-600 transition-colors">
                          {item.retailer?.retailer_name || "Unknown Retailer"}
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">{item.retailer?.retailer_code || "RET-N/A"}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <span className="text-amber-600 font-black">{item.service || "Payout"}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-900 font-extrabold">{item.vendor || "Utkal"}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[11px] text-slate-800">{item.payment_mode || item.payment_method || "POS - Instant"}</span>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        ₹{item.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-4 text-right font-medium">
                        {totalDeductions > 0 ? (
                          <span className="text-amber-800 font-mono font-bold text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                            -₹{totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">₹0.00</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black">
                        <span className="text-emerald-700 text-sm bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block font-mono">
                          ₹{displayReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          ₹{(item.admin_available_balance ?? payoutUtkalWallet?.available_balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {item.status !== "PENDING" ? (
                          <span className="text-slate-400 text-[11px] font-medium">—</span>
                        ) : item.can_approve ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Eligible
                          </span>
                        ) : item.is_date_eligible === false ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                            <Lock className="h-3 w-3 text-amber-700" />
                            POS T1 Locked
                          </span>
                        ) : item.is_balance_eligible === false ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-900 border border-rose-300">
                            <AlertCircle className="h-3 w-3 text-rose-600" />
                            Balance Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            Locked
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border uppercase tracking-wider ${
                            isPending
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : isApproved
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openDrawer(item)}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all inline-flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Fund Modal ── */}
      {showAddFundModal && selectedWalletForFund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddFundModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Add Operational Funds</h3>
                <p className="text-xs text-slate-500">
                  {selectedWalletForFund.service_name} · {selectedWalletForFund.vendor_name} ({selectedWalletForFund.wallet_number})
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-800 font-black mb-1">
                  Fund Amount to Add (INR) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-amber-700 text-sm">₹</span>
                  <input
                    type="number"
                    step="any"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border-2 border-amber-300 rounded-xl text-base font-black text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 font-mono shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Remarks / Reference</label>
                <textarea
                  value={fundRemarks}
                  onChange={(e) => setFundRemarks(e.target.value)}
                  placeholder="e.g. Bank transfer from HDFC Master Pool account"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-amber-500 h-16 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowAddFundModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFund}
                disabled={addingFund || !fundAmount}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {addingFund && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Add ₹{(parseFloat(fundAmount) || 0).toLocaleString("en-IN")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
