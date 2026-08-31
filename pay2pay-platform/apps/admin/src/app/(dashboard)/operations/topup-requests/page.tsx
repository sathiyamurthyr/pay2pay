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

export default function AdminTopupRequestsPage() {
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
  const [search, setSearch] = useState<string>("" );
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

  // Primary Payout + Utkal wallet
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

  const exportToCSV = () => {
    if (!requests || requests.length === 0) return;
    const headers = [
      "Request ID",
      "Retailer Code",
      "Retailer Name",
      "Service",
      "Vendor",
      "Mobile",
      "Requested Amount",
      "MDR (%)",
      "MDR Charge",
      "GST Amount",
      "Total Deductions",
      "Received Amount",
      "Admin Wallet Balance",
      "Payment Method",
      "Payment Reference (UTR)",
      "Status",
      "Approval Eligibility",
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
        r.service || "Payout",
        r.vendor || "Utkal",
        r.retailer?.mobile_number || "",
        r.requested_amount,
        rMdrPct > 0 ? `${rMdrPct.toFixed(2)}%` : "0%",
        r.mdr_charge || (r.charges ? (r.gst_amount ? r.charges - r.gst_amount : r.charges) : 0),
        r.gst_amount || 0,
        deductions,
        received,
        r.admin_available_balance || 0,
        r.payment_method,
        `"${(r.payment_reference || "").replace(/"/g, '""')}"`,
        r.status,
        r.can_approve ? "Eligible" : `Blocked (${r.approval_block_reason || "Rule Lock"})`,
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
            {/* Manual Refresh Button */}
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

            {/* Export CSV */}
            <button
              onClick={exportToCSV}
              disabled={requests.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* ── ADMIN SERVICE + VENDOR OPERATION WALLET CARDS (LIVE DATABASE MAPPING) ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white border border-slate-700/60 shadow-lg relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -top-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

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
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                      Service: <strong className="text-amber-400">{w.service_name}</strong>
                    </span>
                  </div>
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
              placeholder="Search by Request ID, Retailer Code, Name, UTR / Ref, Vendor..."
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
                <th className="py-3.5 px-4 font-black">SERVICE / VENDOR</th>
                <th className="py-3.5 px-4 font-black">MODE &amp; REF</th>
                <th className="py-3.5 px-4 text-right font-black">
                  TRANSACTION AMOUNT (₹)
                </th>
                <th className="py-3.5 px-4 text-right font-black">MDR / CHARGES</th>
                <th className="py-3.5 px-4 text-right font-black text-emerald-800">
                  RECEIVED AMOUNT (₹)
                </th>
                <th className="py-3.5 px-4 text-center font-black">ADMIN WALLET BAL</th>
                <th className="py-3.5 px-4 text-center font-black">ELIGIBILITY</th>
                <th className="py-3.5 px-4 text-center font-black">SLIP</th>
                <th className="py-3.5 px-4 text-center font-black">STATUS</th>
                <th className="py-3.5 px-4 text-right font-black">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-20 text-center text-slate-500">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-amber-500" />
                    <p className="font-bold text-sm text-slate-800">Loading live topup requests...</p>
                    <p className="text-xs text-slate-400 mt-1">Directly querying PostgreSQL database with dual-rule governance</p>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-20 text-center text-slate-500">
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

                  const isT1 = isPosT1Mode(item);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => openDrawer(item)}
                      className={`cursor-pointer transition-colors group ${
                        selectedRequest?.id === item.id ? "bg-amber-50/50" : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Request ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{item.topup_request_id}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.topup_request_id, item.id);
                            }}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                            title="Copy Request ID"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Retailer Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
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
                              {item.retailer?.mobile_number && (
                                <span className="text-slate-600 font-medium flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  {item.retailer.mobile_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Service & Vendor Mapping */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <span className="text-amber-600 font-black">{item.service || "Payout"}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-900 font-extrabold">{item.vendor || "Utkal"}</span>
                          </span>
                        </div>
                      </td>

                      {/* Payment Mode & Reference */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-medium text-slate-700">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black rounded border ${
                                isT1
                                  ? "bg-purple-50 text-purple-800 border-purple-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {item.payment_mode || item.payment_method || "POS - Instant"}
                            </span>
                          </div>
                          <span
                            className="font-mono text-slate-800 truncate max-w-[130px] font-bold text-[11px]"
                            title={item.payment_reference}
                          >
                            {item.payment_reference || "No Ref"}
                          </span>
                        </div>
                      </td>

                      {/* Transaction Amount */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm tracking-wide">
                        ₹{item.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>

                      {/* MDR / Deductions */}
                      <td className="py-3.5 px-4 text-right font-medium">
                        {totalDeductions > 0 ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-amber-800 font-mono font-bold text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                              -₹{totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-slate-500 font-sans">
                              {itemMdrPct > 0 ? `${itemMdrPct.toFixed(2)}% MDR` : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">₹0.00</span>
                        )}
                      </td>

                      {/* Received Amount */}
                      <td className="py-3.5 px-4 text-right font-black">
                        {isApproved ? (
                          <span className="text-emerald-700 text-sm bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block font-mono">
                            ₹{displayReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-blue-700 text-sm bg-blue-50/90 px-2.5 py-1 rounded-lg border border-blue-200 inline-block font-mono font-bold">
                            ₹{displayReceived.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </td>

                      {/* Admin Wallet Available Balance */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            ₹{(item.admin_available_balance ?? payoutUtkalWallet?.available_balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {item.vendor || "Utkal"}
                          </span>
                        </div>
                      </td>

                      {/* Approval Eligibility Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {item.status !== "PENDING" ? (
                          <span className="text-slate-400 text-[11px] font-medium">—</span>
                        ) : item.can_approve ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Eligible
                          </span>
                        ) : item.is_date_eligible === false ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs" title={item.approval_block_reason}>
                            <Lock className="h-3 w-3 text-amber-700" />
                            POS T1 Locked
                          </span>
                        ) : item.is_balance_eligible === false ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-900 border border-rose-300 shadow-2xs" title={`Low Admin Balance. Shortfall: ₹${item.shortfall_amount || 0}`}>
                            <AlertCircle className="h-3 w-3 text-rose-600" />
                            Balance Low
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            Locked
                          </span>
                        )}
                      </td>

                      {/* Slip Proof Thumbnail / View */}
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {item.slip_url ? (
                          <button
                            onClick={() => openDrawer(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 transition-all shadow-xs"
                          >
                            <FileImage className="h-3.5 w-3.5 text-amber-600" />
                            Slip
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] font-semibold">—</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border uppercase tracking-wider ${
                            isPending
                              ? "bg-amber-50 text-amber-800 border-amber-200 shadow-xs"
                              : isApproved
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs"
                              : isRejected
                              ? "bg-rose-50 text-rose-800 border-rose-200 shadow-xs"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {isPending && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />}
                          {isApproved && <Check className="h-3 w-3 text-emerald-600" />}
                          {isRejected && <X className="h-3 w-3 text-rose-600" />}
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
                          {isPending ? "Review" : "View"}
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
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-xs"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-bold text-slate-800 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors shadow-xs"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT-SIDE INSPECTION & APPROVAL DRAWER ── */}
      {drawerOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 text-xs animate-slideLeft">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center font-black">
                    <ArrowLeftRight className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">Topup Request Verification</h2>
                    <p className="text-[11px] text-slate-500 font-mono">{selectedRequest.topup_request_id}</p>
                  </div>
                </div>

                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Feedback Alerts */}
                {actionSuccessMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{actionSuccessMsg}</span>
                  </div>
                )}
                {actionErrorMsg && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 font-bold text-xs flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>{actionErrorMsg}</span>
                  </div>
                )}

                {/* ── 2-RULE GOVERNANCE & APPROVAL ELIGIBILITY CHECKCARD ── */}
                <div className="rounded-2xl bg-slate-900 text-white p-5 border border-slate-700 space-y-4 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-400" />
                      <span className="font-black text-xs uppercase tracking-wider text-amber-300">
                        Dual Approval Governance
                      </span>
                    </div>
                    <span
                      id="approval_eligibility"
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        selectedRequest.status !== "PENDING"
                          ? "bg-slate-800 text-slate-300 border-slate-600"
                          : selectedRequest.can_approve
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                      }`}
                    >
                      {selectedRequest.status !== "PENDING"
                        ? selectedRequest.status
                        : selectedRequest.can_approve
                        ? "ELIGIBLE TO APPROVE"
                        : "APPROVAL LOCKED"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Condition 1: POS Date Eligibility */}
                    <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-bold">1. POS Approval Date</span>
                        {selectedRequest.is_date_eligible !== false ? (
                          <span className="text-emerald-400 font-black flex items-center gap-1">
                            <Check className="h-3 w-3" /> PASS
                          </span>
                        ) : (
                          <span className="text-amber-400 font-black flex items-center gap-1">
                            <Lock className="h-3 w-3" /> LOCKED
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-white">
                        {isPosT1Mode(selectedRequest) ? "POS T+1 Settlement Rule" : "POS Instant Rule"}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        {isPosT1Mode(selectedRequest)
                          ? "Strictly locked on same-day (T+0). Unlocks on calendar date T+1 (tomorrow)."
                          : "Eligible for same-day immediate approval."}
                      </p>
                    </div>

                    {/* Condition 2: Admin Service + Vendor Wallet Balance */}
                    <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-bold">2. Admin Wallet Balance</span>
                        {selectedRequest.is_balance_eligible !== false ? (
                          <span className="text-emerald-400 font-black flex items-center gap-1">
                            <Check className="h-3 w-3" /> SUFFICIENT
                          </span>
                        ) : (
                          <span className="text-rose-400 font-black flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> LOW BALANCE
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-white font-mono flex items-center justify-between">
                        <span>Avail: ₹{(selectedRequest.admin_available_balance ?? payoutUtkalWallet?.available_balance ?? 0).toLocaleString("en-IN")}</span>
                        <span className="text-[10px] text-amber-400 font-sans">{selectedRequest.service || "Payout"} · {selectedRequest.vendor || "Utkal"}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        {selectedRequest.is_balance_eligible !== false
                          ? `Wallet balance is sufficient to settle ₹${(parseFloat(customApprovedAmount) || selectedRequest.requested_amount).toLocaleString("en-IN")}.`
                          : `Admin balance is low. Shortfall: ₹${(selectedRequest.shortfall_amount || 0).toLocaleString("en-IN")}. Please add funds to continue.`}
                      </p>
                    </div>
                  </div>

                  {/* Low Balance Alert Banner */}
                  {selectedRequest.status === "PENDING" && selectedRequest.is_balance_eligible === false && (
                    <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-black text-rose-100 flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4 text-rose-400" />
                          Admin balance is low. Please add funds to continue the approval.
                        </div>
                        <div className="text-[11px] text-rose-300 mt-0.5">
                          Available: ₹{(selectedRequest.admin_available_balance ?? 0).toLocaleString("en-IN")} | Required: ₹{(selectedRequest.received_amount || selectedRequest.requested_amount).toLocaleString("en-IN")} | Shortfall: ₹{(selectedRequest.shortfall_amount || 0).toLocaleString("en-IN")}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (payoutUtkalWallet) openFundModalForWallet(payoutUtkalWallet);
                        }}
                        className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs rounded-lg shadow-sm whitespace-nowrap self-start sm:self-auto"
                      >
                        + Add Fund
                      </button>
                    </div>
                  )}

                  {/* POS T1 Date Lock Banner */}
                  {selectedRequest.status === "PENDING" && selectedRequest.is_date_eligible === false && (
                    <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs">
                      <div className="font-black text-amber-100 flex items-center gap-1.5">
                        <Lock className="h-4 w-4 text-amber-400" />
                        POS T1 Settlement Lock
                      </div>
                      <div className="text-[11px] text-amber-300 mt-0.5">
                        {selectedRequest.approval_block_reason || "POS T1 requests can be approved from T+1 only."}
                      </div>
                    </div>
                  )}
                </div>

                {/* Slip Proof Viewer */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <FileImage className="h-4 w-4 text-amber-600" />
                      Uploaded Payment Slip
                    </span>
                    {selectedRequest.slip_url && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                          title="Zoom In"
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                          title="Zoom Out"
                        >
                          <ZoomOut className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setRotation((r) => (r + 90) % 360)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                          title="Rotate 90°"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setFullscreenImage(selectedRequest.slip_url || null)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                          title="Fullscreen"
                        >
                          <Maximize2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedRequest.slip_url ? (
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-900 p-2 overflow-hidden flex items-center justify-center min-h-[260px] max-h-[360px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedRequest.slip_url}
                        alt="Payment Slip Proof"
                        style={{
                          transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                          transition: "transform 0.2s ease-in-out",
                        }}
                        className="max-h-[320px] max-w-full object-contain rounded-xl select-none"
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-400">
                      <FileImage className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold">No payment proof image attached</p>
                    </div>
                  )}
                </div>

                {/* Retailer & Account Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="h-4 w-4 text-slate-600" />
                    Retailer Account Profile
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px]">Retailer Name:</span>
                      <p className="font-bold text-slate-900">{selectedRequest.retailer?.retailer_name || "Unknown"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px]">Retailer Code:</span>
                      <p className="font-mono font-bold text-amber-800">{selectedRequest.retailer?.retailer_code || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px]">Mobile Number:</span>
                      <p className="font-medium text-slate-800">{selectedRequest.retailer?.mobile_number || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px]">Current Wallet Balance:</span>
                      <p className="font-mono font-black text-emerald-700">
                        ₹{(selectedRequest.retailer?.current_wallet_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Amount & MDR Calculation */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Financial Summary
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Transaction Amount (Gross):</span>
                      <span className="font-bold text-slate-900 font-mono">
                        ₹{selectedRequest.requested_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {(selectedRequest.charges || selectedRequest.mdr_charge || 0) > 0 && (
                      <div className="flex items-center justify-between text-amber-800">
                        <span>Total Deductions (MDR + GST):</span>
                        <span className="font-mono font-bold">
                          -₹{((selectedRequest.charges || selectedRequest.mdr_charge || 0) + (selectedRequest.gst_amount || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="font-black text-slate-800">Received Amount (Net Credited):</span>
                      <span className="font-mono font-black text-emerald-700 text-sm">
                        ₹{(selectedRequest.received_amount || selectedRequest.requested_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Historical Audit Info if already Processed */}
                {selectedRequest.status !== "PENDING" && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Audit Trail
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {selectedRequest.approved_by && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Approved By:</span>
                          <span className="font-medium text-slate-700">{selectedRequest.approved_by}</span>
                        </div>
                      )}
                      {selectedRequest.approved_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Approved At:</span>
                          <span className="font-medium text-slate-700">{new Date(selectedRequest.approved_at).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {selectedRequest.transaction_reference && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Transaction Ref:</span>
                          <span className="font-mono font-bold text-emerald-700">{selectedRequest.transaction_reference}</span>
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
              <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
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
                      Reject
                    </button>

                    {selectedRequest.can_approve === false ? (
                      <div className="flex items-center gap-2">
                        {selectedRequest.is_balance_eligible === false && (
                          <button
                            onClick={() => {
                              if (payoutUtkalWallet) openFundModalForWallet(payoutUtkalWallet);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <PlusCircle className="h-4 w-4" />
                            Add Fund
                          </button>
                        )}
                        <button
                          type="button"
                          disabled
                          className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-400 border border-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-not-allowed shadow-none"
                          title={selectedRequest.approval_block_reason || "Approval blocked by policy"}
                        >
                          <Lock className="h-4 w-4 text-slate-400" />
                          Approve Blocked
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowApproveModal(true)}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve (₹{(parseFloat(customApprovedAmount) || selectedRequest.requested_amount).toLocaleString("en-IN")})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Approval Confirmation Modal ── */}
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
                <span className="text-slate-500 font-medium">Mapped Admin Wallet:</span>
                <span className="font-bold text-slate-800">
                  {selectedRequest.service || "Payout"} · {selectedRequest.vendor || "Utkal"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Admin Available Balance:</span>
                <span className="font-mono font-black text-emerald-700">
                  ₹{(selectedRequest.admin_available_balance ?? payoutUtkalWallet?.available_balance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Payment Mode:</span>
                <span className="font-bold text-slate-700">{selectedRequest.payment_mode || selectedRequest.payment_method || "POS - Instant"}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-800 font-black mb-1">
                  Received Amount to Credit (INR) <span className="text-rose-500">*</span>
                </label>
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

              <div>
                <label className="block text-slate-700 font-bold mb-1">Admin Notes (Optional)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Approved via SP against Utkal Payout Operation Wallet"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 h-16 resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium leading-relaxed">
                ⚡ <strong>Atomic SP Settlement:</strong> Deducts ₹{parseFloat(customApprovedAmount) || 0} from Admin <strong>{selectedRequest.service || "Payout"} ({selectedRequest.vendor || "Utkal"})</strong> wallet, credits retailer wallet, and posts ledger transaction.
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
                ⚠️ Zero financial movement will be recorded.
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

      {/* ── Add Fund Modal for Admin Service + Vendor Wallet ── */}
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

            {fundSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{fundSuccessMsg}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Current Available Balance:</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  ₹{selectedWalletForFund.available_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
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

              {/* Quick Amount Chips */}
              <div className="flex flex-wrap gap-1.5">
                {["10000", "25000", "50000", "100000", "250000"].map((val) => (
                  <button
                    key={val}
                    onClick={() => setFundAmount(val)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200"
                  >
                    +₹{parseInt(val).toLocaleString("en-IN")}
                  </button>
                ))}
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
