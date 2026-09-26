"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useSalesAuth } from "@/lib/auth";
import {
  Sliders, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw,
  Store, Layers, Users, CreditCard, Sparkles, ArrowRight,
  Clock, CheckCircle, XCircle, PauseCircle, Search, Filter,
  FileText, Calendar, Building2, UserCheck, ArrowUpRight,
  History, Send, Eye, ChevronRight, AlertTriangle, Info,
  TrendingDown, TrendingUp, Check, X, ShieldAlert, ClipboardCheck
} from "lucide-react";

interface MdrRates {
  visa?: number | null;
  mastercard?: number | null;
  rupay?: number | null;
  amex_diners?: number | null;
}

interface AuditLogEntry {
  id: number;
  audit_ref_id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  previous_status: string;
  new_status: string;
  action_reason: string;
  created_at: string;
}

interface MdrChangeRequest {
  id: number;
  public_id: string;
  mdr_request_ref_id: string;
  tenant_id: string;
  company_id: string;
  requester_name: string;
  requester_role: string;
  super_distributor_name?: string;
  distributor_name?: string;
  retailer_name?: string;
  pos_serial_number?: string;
  pos_tid?: string;
  asm_name?: string;
  commitment_month: number;
  commitment_year: number;
  commitment_month_str: string;
  expected_monthly_volume: number;
  current_mdr: MdrRates;
  requested_mdr: MdrRates;
  final_mdr?: MdrRates;
  reason: string;
  status: string;
  asm_decision?: string;
  asm_decision_reason?: string;
  asm_decision_at?: string;
  admin_name?: string;
  admin_decision_reason?: string;
  admin_applied_at?: string;
  effective_date?: string;
  created_at: string;
  updated_at: string;
}

export default function PosMdrRequestsWorkflowPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useSalesAuth();

  // Active Main Tab: "ASM_QUEUE" | "CREATE_REQUEST" | "MY_REQUESTS" | "ADMIN_QUEUE"
  const [activeTab, setActiveTab] = useState<"ASM_QUEUE" | "CREATE_REQUEST" | "MY_REQUESTS" | "ADMIN_QUEUE">("ASM_QUEUE");

  // Queue Status Filter
  const [queueFilter, setQueueFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState<MdrChangeRequest | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // ASM Action Modal State
  const [actionModalType, setActionModalType] = useState<"APPROVE" | "REJECT" | "HOLD" | null>(null);
  const [actionReason, setActionReason] = useState<string>("");

  // Admin Apply Modal State
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEffectiveDate, setAdminEffectiveDate] = useState<string>("");
  const [adminNote, setAdminNote] = useState<string>("");

  // Resubmit Modal State
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [resubmitReason, setResubmitReason] = useState<string>("");
  const [resubmitVolume, setResubmitVolume] = useState<string>("");
  const [resubmitRates, setResubmitRates] = useState<MdrRates>({});

  // Notification / Feedback banner
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form State for "Create MDR Request"
  const [formRetailerId, setFormRetailerId] = useState<string>("");
  const [formMonth, setFormMonth] = useState<number>(new Date().getMonth() + 1);
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formVolume, setFormVolume] = useState<string>("2500000");
  const [formReason, setFormReason] = useState<string>("");
  const [formRequestedMdr, setFormRequestedMdr] = useState<MdrRates>({
    visa: 1.00,
    mastercard: 1.00,
    rupay: 0.80,
    amex_diners: 1.75,
  });

  // 1. Fetch Request Options (Months, Years, Card Schemes)
  const { data: optionsData } = useQuery({
    queryKey: ["pos-mdr-request-options"],
    queryFn: async () => {
      const res = await apiClient.get("/pos/mdr-requests/options");
      return res.data;
    },
  });

  // 2. Fetch Retailers List for Target Selection
  const { data: retailersList = [] } = useQuery({
    queryKey: ["sales-hierarchy-retailers-for-mdr"],
    queryFn: async () => {
      const res = await apiClient.get("/sales/hierarchy/retailers?limit=300");
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // 3. Fetch Current Live MDR for Selected Retailer
  const { data: currentMdrData, isLoading: isLoadingCurrentMdr } = useQuery({
    queryKey: ["pos-current-mdr", formRetailerId],
    queryFn: async () => {
      const params = formRetailerId ? `?retailer_id=${formRetailerId}` : "";
      const res = await apiClient.get(`/pos/mdr-requests/current-mdr${params}`);
      return res.data?.current_mdr || {};
    },
    enabled: true,
  });

  // 4. Fetch ASM Approval Queue
  const { data: asmQueueData, isLoading: isLoadingAsmQueue, refetch: refetchAsmQueue } = useQuery({
    queryKey: ["pos-mdr-asm-queue", queueFilter],
    queryFn: async () => {
      const res = await apiClient.get(`/pos/mdr-requests/asm-queue?status_filter=${queueFilter}`);
      return res.data;
    },
  });

  // 5. Fetch My Requests (Requester View)
  const { data: myRequestsData, isLoading: isLoadingMyRequests, refetch: refetchMyRequests } = useQuery({
    queryKey: ["pos-mdr-my-requests"],
    queryFn: async () => {
      const res = await apiClient.get("/pos/mdr-requests/my-requests");
      return res.data;
    },
  });

  // 6. Fetch Admin Update Queue
  const { data: adminQueueData, isLoading: isLoadingAdminQueue, refetch: refetchAdminQueue } = useQuery({
    queryKey: ["pos-mdr-admin-queue"],
    queryFn: async () => {
      const res = await apiClient.get("/pos/mdr-requests/admin-queue?status_filter=ALL");
      return res.data;
    },
  });

  // MUTATIONS
  // Create MDR Request Mutation
  const createRequestMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post("/pos/mdr-requests/create", payload);
      return res.data;
    },
    onSuccess: (data) => {
      setFeedback({ type: "success", message: data.message || "MDR Change Request submitted successfully!" });
      queryClient.invalidateQueries({ queryKey: ["pos-mdr-asm-queue"] });
      queryClient.invalidateQueries({ queryKey: ["pos-mdr-my-requests"] });
      queryClient.invalidateQueries({ queryKey: ["pos-mdr-admin-queue"] });
      setActiveTab("ASM_QUEUE");
      setFormReason("");
    },
    onError: (err: any) => {
      setFeedback({ type: "error", message: err.response?.data?.detail || err.message || "Failed to submit MDR request" });
    },
  });

  // ASM Action Mutation (APPROVE, REJECT, HOLD)
  const asmActionMutation = useMutation({
    mutationFn: async ({ requestId, action, reason }: { requestId: string; action: string; reason?: string }) => {
      const res = await apiClient.post(`/pos/mdr-requests/${requestId}/asm-action`, { action, reason });
      return res.data;
    },
    onSuccess: (data) => {
      setFeedback({ type: "success", message: data.message || "Action processed successfully." });
      setActionModalType(null);
      setActionReason("");
      setSelectedRequest(null);
      refetchAsmQueue();
      refetchAdminQueue();
      refetchMyRequests();
    },
    onError: (err: any) => {
      setFeedback({ type: "error", message: err.response?.data?.detail || err.message || "Failed to execute ASM action." });
    },
  });

  // Resubmit Mutation (from HOLD)
  const resubmitMutation = useMutation({
    mutationFn: async ({ requestId, payload }: { requestId: string; payload: any }) => {
      const res = await apiClient.post(`/pos/mdr-requests/${requestId}/resubmit`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      setFeedback({ type: "success", message: data.message || "Request resubmitted successfully." });
      setResubmitModalOpen(false);
      setSelectedRequest(null);
      refetchMyRequests();
      refetchAsmQueue();
    },
    onError: (err: any) => {
      setFeedback({ type: "error", message: err.response?.data?.detail || err.message || "Failed to resubmit request." });
    },
  });

  // Admin Apply Mutation
  const adminApplyMutation = useMutation({
    mutationFn: async ({ requestId, payload }: { requestId: string; payload: any }) => {
      const res = await apiClient.post(`/pos/mdr-requests/${requestId}/admin-apply`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      setFeedback({ type: "success", message: data.message || "MDR rates applied into live POS engine!" });
      setAdminModalOpen(false);
      setSelectedRequest(null);
      refetchAdminQueue();
      refetchAsmQueue();
      refetchMyRequests();
    },
    onError: (err: any) => {
      setFeedback({ type: "error", message: err.response?.data?.detail || err.message || "Failed to apply MDR." });
    },
  });

  // View Details & Audit Handler
  const handleViewDetails = async (req: MdrChangeRequest) => {
    setSelectedRequest(req);
    setIsLoadingDetails(true);
    try {
      const res = await apiClient.get(`/pos/mdr-requests/${req.public_id || req.id}`);
      if (res.data?.audit_trail) {
        setAuditLogs(res.data.audit_trail);
      }
    } catch {
      setAuditLogs([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Open Resubmit Modal Handler
  const handleOpenResubmit = (req: MdrChangeRequest) => {
    setSelectedRequest(req);
    setResubmitVolume(String(req.expected_monthly_volume || 2500000));
    setResubmitRates(req.requested_mdr || {});
    setResubmitReason("");
    setResubmitModalOpen(true);
  };

  // Open Admin Apply Modal Handler
  const handleOpenAdminApply = (req: MdrChangeRequest) => {
    setSelectedRequest(req);
    // default effective date: 1st of commitment month
    const yr = req.commitment_year || new Date().getFullYear();
    const mo = String(req.commitment_month || new Date().getMonth() + 1).padStart(2, "0");
    setAdminEffectiveDate(`${yr}-${mo}-01`);
    setAdminNote("Approved and activated for commitment period.");
    setAdminModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!formReason || formReason.trim().length < 3) {
      setFeedback({ type: "error", message: "Please provide a valid justification for this MDR change." });
      return;
    }
    createRequestMutation.mutate({
      commitment_month: Number(formMonth),
      commitment_year: Number(formYear),
      expected_monthly_volume: parseFloat(formVolume) || 0,
      requested_mdr: {
        visa: formRequestedMdr.visa ? parseFloat(String(formRequestedMdr.visa)) : null,
        mastercard: formRequestedMdr.mastercard ? parseFloat(String(formRequestedMdr.mastercard)) : null,
        rupay: formRequestedMdr.rupay ? parseFloat(String(formRequestedMdr.rupay)) : null,
        amex_diners: formRequestedMdr.amex_diners ? parseFloat(String(formRequestedMdr.amex_diners)) : null,
      },
      reason: formReason,
      target_retailer_id: formRetailerId || undefined,
    });
  };

  const handleResubmitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    resubmitMutation.mutate({
      requestId: selectedRequest.public_id || String(selectedRequest.id),
      payload: {
        requested_mdr: resubmitRates,
        expected_monthly_volume: parseFloat(resubmitVolume) || 0,
        reason: resubmitReason,
      },
    });
  };

  const handleAdminApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    adminApplyMutation.mutate({
      requestId: selectedRequest.public_id || String(selectedRequest.id),
      payload: {
        effective_date: adminEffectiveDate ? new Date(adminEffectiveDate).toISOString() : undefined,
        decision_reason: adminNote,
      },
    });
  };

  const renderStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case "ASM_PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            ASM PENDING
          </span>
        );
      case "ASM_APPROVED":
      case "ADMIN_PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E0E7FF] text-[#3730A3] border border-[#C7D2FE]">
            <CheckCircle className="w-3.5 h-3.5" />
            ADMIN PENDING
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]">
            <Check className="w-3.5 h-3.5" />
            COMPLETED & ACTIVE
          </span>
        );
      case "ASM_HOLD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E0F2FE] text-[#075985] border border-[#BAE6FD]">
            <PauseCircle className="w-3.5 h-3.5" />
            ON HOLD
          </span>
        );
      case "ASM_REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
            <XCircle className="w-3.5 h-3.5" />
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
            {statusStr}
          </span>
        );
    }
  };

  const queueKPIs = asmQueueData?.kpis || {
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    hold_count: 0,
    total_volume: 0,
  };

  const filteredAsmQueue = useMemo(() => {
    const list: MdrChangeRequest[] = asmQueueData?.requests || [];
    if (!searchTerm) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (r) =>
        r.mdr_request_ref_id?.toLowerCase().includes(term) ||
        r.retailer_name?.toLowerCase().includes(term) ||
        r.distributor_name?.toLowerCase().includes(term) ||
        r.super_distributor_name?.toLowerCase().includes(term) ||
        r.pos_serial_number?.toLowerCase().includes(term) ||
        r.pos_tid?.toLowerCase().includes(term)
    );
  }, [asmQueueData, searchTerm]);

  return (
    <div className="max-w-7xl w-full mx-auto space-y-6 pb-16 text-[#1F2937]">
      {/* ── Top Header Banner ── */}
      <div className="bg-gradient-to-r from-[#94003A] via-[#78002F] to-[#550020] border border-[#94003A]/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E7B631] mb-2">
            <Sliders className="w-4 h-4" />
            Enterprise Rate Governance & Scoped Approvals
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            POS MDR Change Request Hub
          </h1>
          <p className="text-[#F8E6EE]/80 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
            Controlled multi-level workflow with automatic hierarchy & ASM resolution, monthly volume commitment tracking, and live POS configuration activation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/pos-mdr"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 border border-white/10"
          >
            <Sliders className="w-4 h-4 text-[#EDC11E]" />
            MDR Setup Studio
          </Link>
          <button
            onClick={() => {
              refetchAsmQueue();
              refetchMyRequests();
              refetchAdminQueue();
            }}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/10"
            title="Refresh All Queues"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Feedback Banner ── */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 border ${
            feedback.type === "success"
              ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC]"
              : "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]"
          }`}
        >
          <div className="flex items-center gap-3">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-[#16A34A]" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-[#DC2626]" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Primary Workflow Tabs ── */}
      <div className="flex items-center gap-2 p-1.5 bg-[#F3F4F6] rounded-2xl border border-[#E5E7EB] overflow-x-auto">
        {[
          {
            id: "ASM_QUEUE",
            label: "MDR Approval Queue (ASM)",
            icon: ClipboardCheckIcon,
            badge: queueKPIs.pending_count > 0 ? String(queueKPIs.pending_count) : undefined,
          },
          {
            id: "CREATE_REQUEST",
            label: "Create MDR Request",
            icon: Send,
          },
          {
            id: "MY_REQUESTS",
            label: "My Submitted Requests",
            icon: History,
            badge: myRequestsData?.total ? String(myRequestsData.total) : undefined,
          },
          {
            id: "ADMIN_QUEUE",
            label: "Admin MDR Update Queue",
            icon: UserCheck,
            badge: adminQueueData?.requests?.filter((r: any) => r.status === "ADMIN_PENDING" || r.status === "ASM_APPROVED").length || undefined,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setFeedback(null);
              }}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? "bg-[#94003A] text-white shadow-sm"
                  : "text-[#4B5563] hover:text-[#1F2937] hover:bg-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#EDC11E]" : "text-[#6B7280]"}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive
                      ? "bg-white text-[#94003A]"
                      : "bg-[#94003A] text-white"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: ASM APPROVAL QUEUE ── */}
      {activeTab === "ASM_QUEUE" && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#D97706] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Pending Approvals
              </div>
              <div className="text-2xl font-black text-[#1F2937] mt-1">
                {queueKPIs.pending_count}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">Awaiting ASM Action</div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#16A34A] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> ASM Approved
              </div>
              <div className="text-2xl font-black text-[#1F2937] mt-1">
                {queueKPIs.approved_count}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">Moved to Admin Queue</div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#0284C7] uppercase tracking-wider flex items-center gap-1.5">
                <PauseCircle className="w-3.5 h-3.5" /> On Hold
              </div>
              <div className="text-2xl font-black text-[#1F2937] mt-1">
                {queueKPIs.hold_count}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">Awaiting Clarification</div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <div className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> Rejected
              </div>
              <div className="text-2xl font-black text-[#1F2937] mt-1">
                {queueKPIs.rejected_count}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">Closed Requests</div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs col-span-2 sm:col-span-1">
              <div className="text-[11px] font-bold text-[#94003A] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#EDC11E]" /> Total Volume
              </div>
              <div className="text-xl font-black text-[#94003A] mt-1 truncate">
                {formatCurrency(queueKPIs.total_volume || 0)}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">Committed Pipeline</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {["ALL", "PENDING", "APPROVED", "HOLD", "REJECTED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setQueueFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    queueFilter === st
                      ? "bg-[#F8E6EE] text-[#94003A] border border-[#94003A]/30"
                      : "text-[#6B7280] hover:bg-[#FAFAFC] hover:text-[#1F2937]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search ID, Merchant, POS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#FAFAFC] border border-[#E5E7EB] rounded-xl text-xs text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
              />
            </div>
          </div>

          {/* Table of Requests */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
            {isLoadingAsmQueue ? (
              <div className="p-12 text-center text-xs text-[#6B7280] flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#94003A]" />
                <span>Loading ASM Approval Queue...</span>
              </div>
            ) : filteredAsmQueue.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#6B7280] flex flex-col items-center justify-center gap-2">
                <Sliders className="w-8 h-8 text-[#D1D5DB]" />
                <span className="font-bold text-sm text-[#374151]">No MDR Requests Found</span>
                <p className="max-w-sm text-[#9CA3AF]">
                  There are no change requests matching the current status filter in your authorized hierarchy scope.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFC] border-b border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    <tr>
                      <th className="px-5 py-3.5">Request Ref</th>
                      <th className="px-5 py-3.5">Merchant & Hierarchy</th>
                      <th className="px-5 py-3.5">POS / Terminal</th>
                      <th className="px-5 py-3.5">Commitment</th>
                      <th className="px-5 py-3.5">Requested MDR</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {filteredAsmQueue.map((req) => {
                      const isPending = req.status === "ASM_PENDING";
                      return (
                        <tr key={req.id || req.public_id} className="hover:bg-[#F8E6EE]/20 transition">
                          <td className="px-5 py-4">
                            <div className="font-mono font-bold text-[#94003A]">
                              #{req.mdr_request_ref_id}
                            </div>
                            <div className="text-[10px] text-[#6B7280] mt-0.5">
                              {formatDate(req.created_at)}
                            </div>
                            <div className="text-[10px] font-medium text-[#4B5563]">
                              By: {req.requester_name} ({req.requester_role})
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-bold text-[#1F2937]">
                              {req.retailer_name || "General Merchant"}
                            </div>
                            <div className="text-[10px] text-[#6B7280] mt-0.5 truncate max-w-xs">
                              Dist: {req.distributor_name || "Direct Hub"}
                            </div>
                            <div className="text-[10px] text-[#9CA3AF] truncate max-w-xs">
                              SD: {req.super_distributor_name || "Enterprise Master"}
                            </div>
                          </td>

                          <td className="px-5 py-4 font-mono">
                            <div className="font-bold text-[#374151]">
                              {req.pos_serial_number || "POS-ALL"}
                            </div>
                            <div className="text-[10px] text-[#6B7280]">
                              TID: {req.pos_tid || "ALL-TERMINALS"}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-bold text-[#94003A] flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-[#E7B631]" />
                              {req.commitment_month_str || `${req.commitment_month}/${req.commitment_year}`}
                            </div>
                            <div className="font-mono text-[11px] font-bold text-[#16A34A] mt-0.5">
                              {formatCurrency(req.expected_monthly_volume)}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono">
                              <div>
                                <span className="text-[#6B7280]">Visa:</span>{" "}
                                <span className="font-bold text-[#1F2937]">{req.requested_mdr?.visa ?? "-"}%</span>
                              </div>
                              <div>
                                <span className="text-[#6B7280]">MC:</span>{" "}
                                <span className="font-bold text-[#1F2937]">{req.requested_mdr?.mastercard ?? "-"}%</span>
                              </div>
                              <div>
                                <span className="text-[#6B7280]">RuPay:</span>{" "}
                                <span className="font-bold text-[#1F2937]">{req.requested_mdr?.rupay ?? "-"}%</span>
                              </div>
                              <div>
                                <span className="text-[#6B7280]">Amex:</span>{" "}
                                <span className="font-bold text-[#1F2937]">{req.requested_mdr?.amex_diners ?? "-"}%</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {renderStatusBadge(req.status)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleViewDetails(req)}
                                className="px-2.5 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                title="View Request Details & Audit Trail"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Details
                              </button>

                              {isPending && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedRequest(req);
                                      setActionModalType("APPROVE");
                                      setActionReason("Merchant commitment and track record verified.");
                                    }}
                                    className="px-2.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                                    title="Approve & Forward to Admin"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Approve
                                  </button>

                                  <button
                                    onClick={() => {
                                      setSelectedRequest(req);
                                      setActionModalType("HOLD");
                                      setActionReason("");
                                    }}
                                    className="px-2.5 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                    title="Put on Hold for Clarification"
                                  >
                                    <PauseCircle className="w-3.5 h-3.5" />
                                    Hold
                                  </button>

                                  <button
                                    onClick={() => {
                                      setSelectedRequest(req);
                                      setActionModalType("REJECT");
                                      setActionReason("");
                                    }}
                                    className="px-2.5 py-1.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                                    title="Reject Request"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: CREATE MDR REQUEST ── */}
      {activeTab === "CREATE_REQUEST" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form (2 Cols) */}
          <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-xl font-black text-[#1F2937]">Create Controlled POS MDR Request</h2>
              <p className="text-xs text-[#6B7280] mt-1">
                Requester identity, tenant, company, hierarchy mapping, and responsible ASM are automatically resolved server-side.
              </p>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {/* Target Retailer Select */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  1. Target Retailer Merchant (Scoped to your hierarchy)
                </label>
                <select
                  value={formRetailerId}
                  onChange={(e) => setFormRetailerId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#FAFAFC] border border-[#D1D5DB] rounded-2xl text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                >
                  <option value="">-- Auto-Resolve from Logged-in Scope or Select Retailer --</option>
                  {retailersList.map((ret: any) => (
                    <option key={ret.id || ret.public_id} value={ret.id || ret.public_id}>
                      {ret.store_name || ret.name} ({ret.retailer_code || "RET-ID"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Commitment Month, Year & Volume */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    2. Commitment Month *
                  </label>
                  <select
                    value={formMonth}
                    onChange={(e) => setFormMonth(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#FAFAFC] border border-[#D1D5DB] rounded-2xl text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                    required
                  >
                    {[
                      { m: 1, name: "January" },
                      { m: 2, name: "February" },
                      { m: 3, name: "March" },
                      { m: 4, name: "April" },
                      { m: 5, name: "May" },
                      { m: 6, name: "June" },
                      { m: 7, name: "July" },
                      { m: 8, name: "August" },
                      { m: 9, name: "September" },
                      { m: 10, name: "October" },
                      { m: 11, name: "November" },
                      { m: 12, name: "December" },
                    ].map((mo) => (
                      <option key={mo.m} value={mo.m}>
                        {mo.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    3. Commitment Year *
                  </label>
                  <select
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#FAFAFC] border border-[#D1D5DB] rounded-2xl text-xs sm:text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                    required
                  >
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                    <option value={2025}>2025</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    4. Monthly Volume (₹) *
                  </label>
                  <input
                    type="number"
                    step="50000"
                    min="10000"
                    value={formVolume}
                    onChange={(e) => setFormVolume(e.target.value)}
                    placeholder="2500000"
                    className="w-full px-4 py-3 bg-[#FAFAFC] border border-[#D1D5DB] rounded-2xl text-xs sm:text-sm font-mono font-bold text-[#16A34A] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                    required
                  />
                  <div className="text-[10px] text-[#6B7280]">
                    Preview: {formatCurrency(parseFloat(formVolume) || 0)}
                  </div>
                </div>
              </div>

              {/* Side-by-Side MDR Comparison Table */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                    5. Current Live MDR vs Requested MDR Rates
                  </label>
                  {isLoadingCurrentMdr && (
                    <span className="text-[10px] text-[#94003A] flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Loading live rates...
                    </span>
                  )}
                </div>

                <div className="border border-[#E5E7EB] rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAFC] border-b border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                      <tr>
                        <th className="px-4 py-3">Card Scheme</th>
                        <th className="px-4 py-3">Current Live MDR</th>
                        <th className="px-4 py-3">Requested MDR (%)</th>
                        <th className="px-4 py-3">Delta Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] font-mono">
                      {[
                        { key: "visa", label: "Visa Credit & Debit", defCur: 1.45 },
                        { key: "mastercard", label: "Mastercard Credit & Debit", defCur: 1.50 },
                        { key: "rupay", label: "RuPay Platinum & Commercial", defCur: 0.90 },
                        { key: "amex_diners", label: "Amex / Diners Club", defCur: 2.25 },
                      ].map((scheme) => {
                        const curRate = (currentMdrData as any)?.[scheme.key] ?? scheme.defCur;
                        const reqRate = (formRequestedMdr as any)[scheme.key];
                        const delta = reqRate !== undefined && reqRate !== null ? Number((reqRate - curRate).toFixed(2)) : 0;
                        return (
                          <tr key={scheme.key} className="hover:bg-[#FAFAFC]">
                            <td className="px-4 py-3 font-sans font-bold text-[#1F2937]">
                              {scheme.label}
                            </td>
                            <td className="px-4 py-3 font-bold text-[#6B7280]">
                              {curRate.toFixed(2)}%
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative max-w-[140px]">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.10"
                                  max="5.00"
                                  value={reqRate ?? ""}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? null : parseFloat(e.target.value);
                                    setFormRequestedMdr((prev) => ({ ...prev, [scheme.key]: val }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-xs font-bold text-[#94003A] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                                  required
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-xs font-bold">
                                  %
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-sans">
                              {delta < 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A]">
                                  <TrendingDown className="w-3.5 h-3.5" />
                                  {delta}%
                                </span>
                              ) : delta > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D97706]">
                                  <TrendingUp className="w-3.5 h-3.5" />
                                  +{delta}%
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#9CA3AF]">No Change</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Justification / Reason */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  6. Business Justification / Commitment Notes *
                </label>
                <textarea
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Explain the merchant's POS turnover commitment, seasonal volume surge, or competitive matching rationale..."
                  className="w-full px-4 py-3 bg-[#FAFAFC] border border-[#D1D5DB] rounded-2xl text-xs text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={createRequestMutation.isPending}
                  className="px-6 py-3 bg-[#94003A] hover:bg-[#78002F] text-white rounded-2xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  {createRequestMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-[#EDC11E]" />
                  )}
                  <span>Submit MDR Change Request</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Workflow Policy & Automatic Routing Card */}
          <div className="space-y-6">
            <div className="bg-[#F8E6EE]/50 border border-[#F3C4D7] rounded-2xl sm:rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#94003A] text-xs font-black uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-[#94003A]" />
                Server-Side Hierarchy Resolution
              </div>
              <p className="text-xs text-[#4B5563] leading-relaxed">
                Approver selection is 100% automated based on your active authenticated token and tenant hierarchy:
              </p>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-white rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                  <span className="text-[#6B7280]">Logged-in User:</span>
                  <span className="font-bold text-[#1F2937]">{user?.full_name || "Sales / Partner"}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                  <span className="text-[#6B7280]">Scope Type:</span>
                  <span className="font-bold text-[#94003A]">Auto-Mapped Hierarchy</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                  <span className="text-[#6B7280]">Target ASM:</span>
                  <span className="font-bold text-[#16A34A]">Auto-Derived from Scope</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                  <span className="text-[#6B7280]">Next Stage:</span>
                  <span className="font-bold text-[#D97706]">ASM_PENDING</span>
                </div>
              </div>

              <div className="p-3 bg-white/80 rounded-xl text-[11px] text-[#6B7280] space-y-1">
                <div className="font-bold text-[#94003A]">Strict Tenant Isolation:</div>
                <p>Requests are never accessible across disparate tenant boundaries.</p>
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl p-6 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                MDR Lifecycle Milestones
              </h3>
              <div className="space-y-2.5 text-xs text-[#4B5563]">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#F8E6EE] text-[#94003A] font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-[#1F2937]">Request Submitted</span>
                    <p className="text-[11px] text-[#6B7280]">Enters ASM Approval Queue immediately.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#F8E6EE] text-[#94003A] font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-[#1F2937]">ASM Scoped Review</span>
                    <p className="text-[11px] text-[#6B7280]">ASM can Approve, Reject, or place on Hold.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#F8E6EE] text-[#94003A] font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-[#1F2937]">Admin Execution</span>
                    <p className="text-[11px] text-[#6B7280]">Admin applies rates into live POS engine with effective date.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: MY SUBMITTED REQUESTS ── */}
      {activeTab === "MY_REQUESTS" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1F2937]">My MDR Requests</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Track the progress, ASM remarks, and active states of change requests originated by your node.
                </p>
              </div>
              <button
                onClick={() => refetchMyRequests()}
                className="p-2 hover:bg-[#F3F4F6] rounded-xl text-xs transition"
              >
                <RefreshCw className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>

            {isLoadingMyRequests ? (
              <div className="p-12 text-center text-xs text-[#6B7280] flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#94003A]" />
                <span>Loading your requests...</span>
              </div>
            ) : !myRequestsData?.requests || myRequestsData.requests.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#6B7280] flex flex-col items-center justify-center gap-2">
                <History className="w-8 h-8 text-[#D1D5DB]" />
                <span className="font-bold text-sm text-[#374151]">No Requests Found</span>
                <p className="max-w-sm text-[#9CA3AF]">
                  You have not submitted any MDR change requests yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFC] border-b border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    <tr>
                      <th className="px-5 py-3.5">Request Ref</th>
                      <th className="px-5 py-3.5">Commitment</th>
                      <th className="px-5 py-3.5">Requested MDR Rates</th>
                      <th className="px-5 py-3.5">Assigned ASM</th>
                      <th className="px-5 py-3.5">Status & Decision</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {myRequestsData.requests.map((req: MdrChangeRequest) => (
                      <tr key={req.id || req.public_id} className="hover:bg-[#F8E6EE]/20 transition">
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-[#94003A]">
                            #{req.mdr_request_ref_id}
                          </div>
                          <div className="text-[10px] text-[#6B7280] mt-0.5">
                            {formatDate(req.created_at)}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold text-[#1F2937]">
                            {req.commitment_month_str || `${req.commitment_month}/${req.commitment_year}`}
                          </div>
                          <div className="font-mono text-[11px] font-bold text-[#16A34A] mt-0.5">
                            {formatCurrency(req.expected_monthly_volume)}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-mono text-[10px]">
                          <div>Visa: <span className="font-bold">{req.requested_mdr?.visa ?? "-"}%</span></div>
                          <div>MC: <span className="font-bold">{req.requested_mdr?.mastercard ?? "-"}%</span></div>
                          <div>RuPay: <span className="font-bold">{req.requested_mdr?.rupay ?? "-"}%</span></div>
                          <div>Amex: <span className="font-bold">{req.requested_mdr?.amex_diners ?? "-"}%</span></div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold text-[#374151]">
                            {req.asm_name || "Auto-Assigned ASM"}
                          </div>
                          {req.asm_decision_reason && (
                            <div className="text-[10px] text-[#6B7280] mt-0.5 italic max-w-xs truncate">
                              "{req.asm_decision_reason}"
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {renderStatusBadge(req.status)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewDetails(req)}
                              className="px-2.5 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>

                            {req.status === "ASM_HOLD" && (
                              <button
                                onClick={() => handleOpenResubmit(req)}
                                className="px-2.5 py-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                              >
                                <Send className="w-3.5 h-3.5" />
                                Resubmit
                              </button>
                            )}
                          </div>
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

      {/* ── TAB 4: ADMIN MDR UPDATE QUEUE ── */}
      {activeTab === "ADMIN_QUEUE" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1F2937]">Admin MDR Update Execution Queue</h3>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  ASM-approved MDR change requests ready to be applied into the live POS transaction calculation engine.
                </p>
              </div>
              <button
                onClick={() => refetchAdminQueue()}
                className="p-2 hover:bg-[#F3F4F6] rounded-xl text-xs transition"
              >
                <RefreshCw className="w-4 h-4 text-[#6B7280]" />
              </button>
            </div>

            {isLoadingAdminQueue ? (
              <div className="p-12 text-center text-xs text-[#6B7280] flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#94003A]" />
                <span>Loading Admin Queue...</span>
              </div>
            ) : !adminQueueData?.requests || adminQueueData.requests.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#6B7280] flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-[#16A34A]" />
                <span className="font-bold text-sm text-[#374151]">All Approvals Executed</span>
                <p className="max-w-sm text-[#9CA3AF]">
                  There are no pending ASM-approved change requests waiting for Admin execution.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFC] border-b border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    <tr>
                      <th className="px-5 py-3.5">Request Ref</th>
                      <th className="px-5 py-3.5">Merchant & Scope</th>
                      <th className="px-5 py-3.5">Approved Rates</th>
                      <th className="px-5 py-3.5">ASM Endorsement</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {adminQueueData.requests.map((req: MdrChangeRequest) => {
                      const isPendingAdmin = req.status === "ADMIN_PENDING" || req.status === "ASM_APPROVED";
                      return (
                        <tr key={req.id || req.public_id} className="hover:bg-[#F8E6EE]/20 transition">
                          <td className="px-5 py-4">
                            <div className="font-mono font-bold text-[#94003A]">
                              #{req.mdr_request_ref_id}
                            </div>
                            <div className="text-[10px] text-[#6B7280] mt-0.5">
                              {formatDate(req.created_at)}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-bold text-[#1F2937]">
                              {req.retailer_name || "General Retailer"}
                            </div>
                            <div className="text-[10px] text-[#6B7280]">
                              Commitment: {req.commitment_month_str || `${req.commitment_month}/${req.commitment_year}`} (
                              {formatCurrency(req.expected_monthly_volume)})
                            </div>
                          </td>

                          <td className="px-5 py-4 font-mono text-[10px]">
                            <div>Visa: <span className="font-bold text-[#16A34A]">{req.requested_mdr?.visa ?? "-"}%</span></div>
                            <div>MC: <span className="font-bold text-[#16A34A]">{req.requested_mdr?.mastercard ?? "-"}%</span></div>
                            <div>RuPay: <span className="font-bold text-[#16A34A]">{req.requested_mdr?.rupay ?? "-"}%</span></div>
                            <div>Amex: <span className="font-bold text-[#16A34A]">{req.requested_mdr?.amex_diners ?? "-"}%</span></div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="font-bold text-[#374151]">
                              {req.asm_name || "Assigned ASM"}
                            </div>
                            <div className="text-[10px] text-[#16A34A] mt-0.5 italic">
                              "{req.asm_decision_reason || "Approved"}"
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {renderStatusBadge(req.status)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleViewDetails(req)}
                                className="px-2.5 py-1.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded-lg text-[11px] font-bold transition flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Review
                              </button>

                              {isPendingAdmin && (
                                <button
                                  onClick={() => handleOpenAdminApply(req)}
                                  className="px-3 py-1.5 bg-[#94003A] hover:bg-[#78002F] text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                                >
                                  <Sliders className="w-3.5 h-3.5 text-[#EDC11E]" />
                                  Apply to POS Engine
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DETAILS & AUDIT TRAIL MODAL ── */}
      {selectedRequest && !actionModalType && !resubmitModalOpen && !adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 text-[#1F2937]">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E5E7EB] pb-4">
              <div>
                <div className="text-xs font-mono font-bold text-[#94003A] uppercase">
                  MDR Request #{selectedRequest.mdr_request_ref_id}
                </div>
                <h3 className="text-xl font-black text-[#1F2937] mt-0.5">
                  Change Request & Full Audit Inspection
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Side-by-Side MDR Rate Comparison */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                Commercial Rate Comparison
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#FAFAFC] border border-[#E5E7EB] rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-[#6B7280] uppercase">Current Live MDR</div>
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Visa:</span>
                      <span className="font-bold">{selectedRequest.current_mdr?.visa ?? "-"}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Mastercard:</span>
                      <span className="font-bold">{selectedRequest.current_mdr?.mastercard ?? "-"}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">RuPay:</span>
                      <span className="font-bold">{selectedRequest.current_mdr?.rupay ?? "-"}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Amex / Diners:</span>
                      <span className="font-bold">{selectedRequest.current_mdr?.amex_diners ?? "-"}%</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#F8E6EE]/40 border border-[#F3C4D7] rounded-2xl space-y-2">
                  <div className="text-xs font-bold text-[#94003A] uppercase">Requested MDR</div>
                  <div className="space-y-1 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Visa:</span>
                      <span className="font-bold text-[#94003A]">{selectedRequest.requested_mdr?.visa ?? "-"}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Mastercard:</span>
                      <span className="font-bold text-[#94003A]">{selectedRequest.requested_mdr?.mastercard ?? "-"}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">RuPay:</span>
                      <span className="font-bold text-[#94003A]">{selectedRequest.requested_mdr?.rupay ?? "-"}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7280]">Amex / Diners:</span>
                      <span className="font-bold text-[#94003A]">{selectedRequest.requested_mdr?.amex_diners ?? "-"}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Commitment & Scope Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#FAFAFC] border border-[#E5E7EB] rounded-xl">
                <span className="text-[#6B7280] block text-[10px] font-bold uppercase">Commitment Month</span>
                <span className="font-bold text-[#1F2937] mt-0.5 block">
                  {selectedRequest.commitment_month_str || `${selectedRequest.commitment_month}/${selectedRequest.commitment_year}`}
                </span>
              </div>

              <div className="p-3 bg-[#FAFAFC] border border-[#E5E7EB] rounded-xl">
                <span className="text-[#6B7280] block text-[10px] font-bold uppercase">Expected Volume</span>
                <span className="font-bold text-[#16A34A] font-mono mt-0.5 block">
                  {formatCurrency(selectedRequest.expected_monthly_volume)}
                </span>
              </div>

              <div className="p-3 bg-[#FAFAFC] border border-[#E5E7EB] rounded-xl">
                <span className="text-[#6B7280] block text-[10px] font-bold uppercase">Responsible ASM</span>
                <span className="font-bold text-[#1F2937] mt-0.5 block">
                  {selectedRequest.asm_name || "Auto-Assigned"}
                </span>
              </div>

              <div className="p-3 bg-[#FAFAFC] border border-[#E5E7EB] rounded-xl">
                <span className="text-[#6B7280] block text-[10px] font-bold uppercase">Current Status</span>
                <div className="mt-1">{renderStatusBadge(selectedRequest.status)}</div>
              </div>
            </div>

            {/* Reason */}
            <div className="p-3.5 bg-[#FAFAFC] border border-[#E5E7EB] rounded-xl text-xs space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                Justification / Notes
              </div>
              <p className="text-[#374151]">{selectedRequest.reason}</p>
            </div>

            {/* Audit Trail Timeline */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#94003A]" />
                Immutable Audit Trail History
              </h4>

              {isLoadingDetails ? (
                <div className="p-4 text-center text-xs text-[#6B7280] flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#94003A]" /> Loading audit trail...
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="p-4 text-xs text-[#9CA3AF] italic text-center bg-[#FAFAFC] rounded-xl">
                  No additional audit records logged yet.
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB] pl-6">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="relative text-xs space-y-1">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-[#94003A] border-2 border-white shadow-xs" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1F2937]">
                          {log.actor_name} ({log.actor_role})
                        </span>
                        <span className="text-[10px] text-[#9CA3AF] font-mono">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#4B5563] flex items-center gap-1.5">
                        <span className="font-bold text-[#94003A]">{log.action}</span>
                        <span>→</span>
                        <span className="font-mono font-semibold">{log.new_status}</span>
                      </div>
                      {log.action_reason && (
                        <p className="text-[11px] text-[#6B7280] italic bg-[#FAFAFC] p-2 rounded-lg border border-[#E5E7EB]">
                          "{log.action_reason}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-5 py-2.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded-xl text-xs font-bold transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ASM ACTION MODAL (APPROVE / REJECT / HOLD) ── */}
      {actionModalType && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-5 text-[#1F2937]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-black text-[#1F2937]">
                {actionModalType === "APPROVE" && "Approve MDR Change Request"}
                {actionModalType === "HOLD" && "Put Request on Hold for Clarification"}
                {actionModalType === "REJECT" && "Reject MDR Change Request"}
              </h3>
              <button
                onClick={() => setActionModalType(null)}
                className="p-1 text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#4B5563]">
              Request Ref: <span className="font-mono font-bold text-[#94003A]">#{selectedRequest.mdr_request_ref_id}</span>
              <br />
              Merchant: <span className="font-bold">{selectedRequest.retailer_name || "General Merchant"}</span>
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                {actionModalType === "APPROVE" ? "Approval Endorsement Note (Optional)" : "Reason / Required Clarification *"}
              </label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={
                  actionModalType === "APPROVE"
                    ? "Verified turnover track record and approved..."
                    : "Please specify reason..."
                }
                className="w-full px-3.5 py-2.5 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-xs text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                required={actionModalType !== "APPROVE"}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setActionModalType(null)}
                className="px-4 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={asmActionMutation.isPending || (actionModalType !== "APPROVE" && !actionReason.trim())}
                onClick={() => {
                  asmActionMutation.mutate({
                    requestId: selectedRequest.public_id || String(selectedRequest.id),
                    action: actionModalType,
                    reason: actionReason,
                  });
                }}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5 ${
                  actionModalType === "APPROVE"
                    ? "bg-[#16A34A] hover:bg-[#15803D]"
                    : actionModalType === "HOLD"
                    ? "bg-[#0284C7] hover:bg-[#0369A1]"
                    : "bg-[#DC2626] hover:bg-[#B91C1C]"
                }`}
              >
                {asmActionMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm {actionModalType}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESUBMIT MODAL (FROM HOLD) ── */}
      {resubmitModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleResubmitSubmit}
            className="bg-white border border-[#E5E7EB] rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5 text-[#1F2937]"
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-base font-black text-[#1F2937]">Resubmit Held MDR Request</h3>
                <div className="text-xs text-[#6B7280]">
                  Request #{selectedRequest.mdr_request_ref_id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResubmitModalOpen(false)}
                className="p-1 text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedRequest.asm_decision_reason && (
              <div className="p-3 bg-[#F8E6EE] border border-[#F3C4D7] rounded-xl text-xs text-[#94003A]">
                <span className="font-bold">ASM Clarification Request:</span>
                <p className="mt-0.5 italic">"{selectedRequest.asm_decision_reason}"</p>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                Updated Monthly Commitment Volume (₹)
              </label>
              <input
                type="number"
                value={resubmitVolume}
                onChange={(e) => setResubmitVolume(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-xs font-mono font-bold text-[#16A34A] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                Clarification Response / Supporting Explanation *
              </label>
              <textarea
                rows={3}
                value={resubmitReason}
                onChange={(e) => setResubmitReason(e.target.value)}
                placeholder="Provide the required details to address the ASM's hold remarks..."
                className="w-full px-3.5 py-2.5 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-xs text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setResubmitModalOpen(false)}
                className="px-4 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resubmitMutation.isPending}
                className="px-4 py-2 bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {resubmitMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Resubmit to ASM
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── ADMIN APPLY MODAL ── */}
      {adminModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleAdminApplySubmit}
            className="bg-white border border-[#E5E7EB] rounded-3xl max-w-lg w-full shadow-2xl p-6 space-y-5 text-[#1F2937]"
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-base font-black text-[#1F2937]">Apply MDR to Live POS Engine</h3>
                <div className="text-xs text-[#6B7280]">
                  Request #{selectedRequest.mdr_request_ref_id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdminModalOpen(false)}
                className="p-1 text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-[#F8E6EE]/50 border border-[#F3C4D7] rounded-xl text-xs space-y-1">
              <span className="font-bold text-[#94003A]">Final Rates to be Activated:</span>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
                <div>Visa: <span className="font-bold">{selectedRequest.requested_mdr?.visa ?? "-"}%</span></div>
                <div>MC: <span className="font-bold">{selectedRequest.requested_mdr?.mastercard ?? "-"}%</span></div>
                <div>RuPay: <span className="font-bold">{selectedRequest.requested_mdr?.rupay ?? "-"}%</span></div>
                <div>Amex: <span className="font-bold">{selectedRequest.requested_mdr?.amex_diners ?? "-"}%</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                MDR Effective Activation Date *
              </label>
              <input
                type="date"
                value={adminEffectiveDate}
                onChange={(e) => setAdminEffectiveDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-xs font-bold text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
                required
              />
              <p className="text-[10px] text-[#6B7280]">
                MDR becomes effective on this date across all live swipe calculations.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                Admin Execution Notes
              </label>
              <textarea
                rows={2}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl text-xs text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#94003A]/20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setAdminModalOpen(false)}
                className="px-4 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adminApplyMutation.isPending}
                className="px-5 py-2.5 bg-[#94003A] hover:bg-[#78002F] text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {adminApplyMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <Sliders className="w-3.5 h-3.5 text-[#EDC11E]" />
                Execute & Activate MDR
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ClipboardCheckIcon(props: any) {
  return <ClipboardCheck {...props} />;
}
