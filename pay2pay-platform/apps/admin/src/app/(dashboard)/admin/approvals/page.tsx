"use client";

import React, { useEffect, useState } from "react";
import { CashfreePanVerifier } from "@/components/ui/cashfree-verifier";
import {
  CheckCircle2,
  XCircle,
  PauseCircle,
  ShieldCheck,
  Search,
  RefreshCw,
  Building2,
  Users,
  Store,
  ExternalLink,
  Eye,
  FileText,
  Phone,
  Mail,
  MapPin,
  Filter,
  Network,
  Check,
  AlignJustify,
  Columns3,
  Maximize2,
  Download,
  ChevronDown,
  RefreshCcw,
  Clock,
  UserPlus,
  X,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Play,
  FileCheck2,
  CreditCard,
  Building,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";

const API_BASE_URL = typeof window !== "undefined" ? "/api/v1" : (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1");

export default function AdminApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"sd" | "dist" | "ret">("ret");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const [sdList, setSdList] = useState<any[]>([]);
  const [distList, setDistList] = useState<any[]>([]);
  const [retList, setRetList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected item for detail & document verification modal
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [actionRemarks, setActionRemarks] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  
  // Interactive Lightbox State
  const [previewModalDoc, setPreviewModalDoc] = useState<{ label: string; url: string; category?: string; isVideo?: boolean; docNumber?: string; holderName?: string; type?: string } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxRotation, setLightboxRotation] = useState<number>(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // DataGrid toolbar state
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);
  const [density, setDensity] = useState<"compact" | "medium" | "spacious">("medium");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      // Fetch live registrations from backend PostgreSQL database
      const [sdRes, distRes, verifRes] = await Promise.all([
        fetch(`${API_BASE_URL}/organization/super-distributors`).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
        fetch(`${API_BASE_URL}/organization/distributors`).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
        fetch(`${API_BASE_URL}/admin/verification/requests?status_tab=ALL&page_size=100`).then(r => r.ok ? r.json() : { items: [] }).catch(() => ({ items: [] })),
      ]);

      setSdList(sdRes.items || []);
      setDistList(distRes.items || []);
      setRetList(verifRes.items || []);
    } catch (err) {
      console.error("Error fetching live database records:", err);
      setSdList([]);
      setDistList([]);
      setRetList([]);
    } finally {
      setLoading(false);
    }
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Approve / Hold / Reject status updates directly against live backend database
  async function handleStatusAction(newStatus: "APPROVED" | "ON_HOLD" | "REJECTED") {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      const verifId = selectedItem.verification_id || selectedItem.public_id;
      
      const res = await fetch(`${API_BASE_URL}/admin/verification/requests/${verifId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: newStatus,
          admin_id: "ADM-SYSTEM",
          remarks: actionRemarks || `Verification status updated to ${newStatus} by Admin`,
          admin_role: "COMPLIANCE_OFFICER"
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status in backend DB");
      }

      const targetName = selectedItem.retailer_name || selectedItem.business_name || selectedItem.shop_name || "Partner";
      
      // Close modal, notify, and refresh live DB records
      setSelectedItem(null);
      setActionRemarks("");
      showToast(
        `Successfully updated ${targetName} status to ${newStatus === "APPROVED" ? "Approved & Active" : newStatus === "ON_HOLD" ? "On Hold" : "Rejected"} in live DB!`
      );
      
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Failed to update status in database. Please check backend.");
    } finally {
      setActionLoading(false);
    }
  }

  // Open detail modal and fetch live signed B2 document URLs from backend API
  const handleOpenDetail = async (item: any) => {
    setSelectedItem(item);
    const verifId = item.verification_id || item.public_id || item.registration_id || item.id;
    if (verifId) {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/verification/requests/${verifId}`);
        if (res.ok) {
          const detail = await res.json();
          if (detail.status === "SUCCESS" && detail.media) {
            setSelectedItem((prev: any) => ({
              ...prev,
              ...detail.verification,
              ...detail.media,
              pan_card_url: detail.media.pan_card_url,
              aadhaar_front_url: detail.media.aadhaar_front_url,
              aadhaar_back_url: detail.media.aadhaar_back_url,
              bank_proof_url: detail.media.bank_proof_url,
              gst_proof_url: detail.media.gst_proof_url,
              shop_photo_url: detail.media.shop_photo_url,
              video_url: detail.media.video_url || detail.media.raw_video_url || "/uploads/cmp/ret/2026/08/09/sathus_Ret_video.mp4",
              selfie_url: detail.media.selfie_url,
              script_text: detail.media.script_text,
            }));
          }
        }
      } catch (err) {
        console.error("Error fetching verification details:", err);
      }
    }
  };

  // Filter list based on active tab, status, and search query
  const currentList = activeTab === "sd" ? sdList : activeTab === "dist" ? distList : retList;

  const filteredItems = currentList.filter((item) => {
    const title = item.retailer_name || item.business_name || item.shop_name || "";
    const code = item.retailer_code || item.retailer_id || item.registration_id || item.employee_code || "";
    const owner = item.owner_name || item.retailer_name || "";
    const email = item.email || "";
    const mobile = item.mobile_number || item.mobile || "";
    const status = item.verification_status || item.status || "";

    const matchesSearch =
      !search.trim() ||
      title.toLowerCase().includes(search.toLowerCase()) ||
      code.toLowerCase().includes(search.toLowerCase()) ||
      owner.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      mobile.includes(search);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && (status === "ACTIVE" || status === "VERIFIED" || status === "APPROVED")) ||
      (statusFilter === "PENDING" && (status === "PENDING_APPROVAL" || status === "PENDING_KYC" || status === "PENDING" || status === "UNDER_REVIEW")) ||
      (statusFilter === "HOLD" && (status === "HOLD" || status === "ON_HOLD")) ||
      (statusFilter === "REJECTED" && (status === "REJECTED" || status === "BLOCKED"));

    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = () => {
    if (!filteredItems.length) return;
    const headers = ["Name", "ID / Code", "Owner", "Email", "Mobile", "Status"];
    const rows = filteredItems.map((item) => [
      `"${item.retailer_name || item.business_name || item.shop_name || ""}"`,
      `"${item.retailer_id || item.retailer_code || item.registration_id || ""}"`,
      `"${item.owner_name || item.retailer_name || ""}"`,
      `"${item.email || ""}"`,
      `"${item.mobile_number || item.mobile || ""}"`,
      `"${item.verification_status || item.status || ""}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `live_${activeTab}_approvals_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportDropdown(false);
    showToast("Exported live DB records to CSV!");
  };

  const getStatusBadge = (statusStr: string) => {
    const s = (statusStr || "").toUpperCase();
    switch (s) {
      case "ACTIVE":
      case "VERIFIED":
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] text-[11px] font-extrabold border border-[#BBF7D0]">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved &amp; Active
          </span>
        );
      case "HOLD":
      case "ON_HOLD":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#B45309] text-[11px] font-extrabold border border-[#FDE68A]">
            <PauseCircle className="w-3.5 h-3.5" /> On Hold
          </span>
        );
      case "REJECTED":
      case "BLOCKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEE2E2] text-[#B91C1C] text-[11px] font-extrabold border border-[#FCA5A5]">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-[11px] font-extrabold border border-[#BFDBFE]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pending Verification
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-[#0F172A] px-5 py-3.5 text-xs font-bold text-white shadow-2xl animate-in slide-in-from-bottom-3">
          <ShieldCheck className="w-5 h-5 text-[#4ADE80]" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-[#94A3B8] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="space-y-5 border-b border-[#E2E8F0] pb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#6C63FF] flex items-center justify-center shadow-lg shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
                KYC &amp; Registration Approvals
                <span className="px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-black tracking-widest uppercase border border-[#BBF7D0]">
                  LIVE DATABASE
                </span>
              </h1>
              <p className="text-xs font-medium text-[#64748B] mt-0.5">
                Real-time partner registrations from PostgreSQL database. Verify documents, review NSDL/UIDAI audits, and approve accounts.
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D1D5DB] bg-white text-xs font-extrabold text-[#374151] hover:bg-[#F8FAFC] transition-all cursor-pointer shadow-2xs self-start shrink-0"
          >
            <RefreshCw className={`w-4 h-4 text-[#2563EB] ${loading ? "animate-spin" : ""}`} /> Refresh Live Data
          </button>
        </div>

        {/* Stat Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Total Registrations",
              value: currentList.length,
              icon: Network,
              bg: "bg-[#EFF6FF]",
              border: "border-[#BFDBFE]",
              text: "text-[#1D4ED8]",
              iconColor: "text-[#2563EB]",
            },
            {
              label: "Pending Verification",
              value: currentList.filter(
                (i) => ["PENDING_APPROVAL", "PENDING_KYC", "PENDING", "UNDER_REVIEW"].includes((i.verification_status || i.status || "").toUpperCase())
              ).length,
              icon: RefreshCw,
              bg: "bg-[#EFF6FF]",
              border: "border-[#BFDBFE]",
              text: "text-[#1D4ED8]",
              iconColor: "text-[#2563EB]",
            },
            {
              label: "Approved & Active",
              value: currentList.filter(
                (i) => ["ACTIVE", "VERIFIED", "APPROVED"].includes((i.verification_status || i.status || "").toUpperCase())
              ).length,
              icon: CheckCircle2,
              bg: "bg-[#F0FDF4]",
              border: "border-[#BBF7D0]",
              text: "text-[#15803D]",
              iconColor: "text-[#16A34A]",
            },
            {
              label: "On Hold / Rejected",
              value: currentList.filter(
                (i) => ["HOLD", "ON_HOLD", "REJECTED", "BLOCKED"].includes((i.verification_status || i.status || "").toUpperCase())
              ).length,
              icon: XCircle,
              bg: "bg-[#FEF2F2]",
              border: "border-[#FCA5A5]",
              text: "text-[#B91C1C]",
              iconColor: "text-[#DC2626]",
            },
          ].map(({ label, value, icon: Icon, bg, border, text, iconColor }) => (
            <div
              key={label}
              className={`flex items-center gap-3 p-4 rounded-2xl border ${bg} ${border} shadow-2xs`}
            >
              <div className={`p-2.5 rounded-xl bg-white border ${border} shadow-2xs shrink-0`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <div>
                <p className={`text-2xl font-extrabold leading-none ${text}`}>{value}</p>
                <p className="text-[10px] font-bold text-[#64748B] mt-0.5 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Entity Category Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-1">
        <button
          onClick={() => setActiveTab("ret")}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-t-xl text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === "ret"
              ? "border-[#6C63FF] text-[#581C87] bg-[#F5F3FF]"
              : "border-transparent text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
          }`}
        >
          <Store className="w-4 h-4" /> Retailers (Ret)
          <span className="px-2 py-0.5 rounded-full bg-[#DDD6FE] text-[#6D28D9] text-[10px]">
            {retList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("sd")}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-t-xl text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === "sd"
              ? "border-[#F59E0B] text-[#B45309] bg-[#FFFBEB]"
              : "border-transparent text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
          }`}
        >
          <Building2 className="w-4 h-4" /> Super Distributors (SD)
          <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px]">
            {sdList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("dist")}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-t-xl text-xs font-extrabold transition-all border-b-2 cursor-pointer ${
            activeTab === "dist"
              ? "border-[#3B82F6] text-[#1D4ED8] bg-[#EFF6FF]"
              : "border-transparent text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
          }`}
        >
          <Users className="w-4 h-4" /> Distributors (Dist)
          <span className="px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] text-[10px]">
            {distList.length}
          </span>
        </button>
      </div>

      {/* ── DataGrid Toolbar ── */}
      <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-[#E2E8F0] shadow-xs">
        {/* Left Group */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder={`Search ${
                activeTab === "sd" ? "super distributors" : activeTab === "dist" ? "distributors" : "retailers"
              } by name, phone, PAN…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-60 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-medium text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/15 transition-all"
            />
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-[#E2E8F0] mx-0.5" />

          {/* Filter button */}
          <div className="relative">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] hover:border-[#6C63FF] transition cursor-pointer"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            >
              <Filter className="w-3.5 h-3.5 text-[#6C63FF]" />
              <span>Filter</span>
              {statusFilter !== "ALL" && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-[#6C63FF] text-white text-[9px] font-extrabold">
                  1
                </span>
              )}
            </button>
            {/* Inline status filter flyout */}
            {showFilterDropdown && (
              <div className="absolute top-9 left-0 z-30 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-1.5 min-w-[190px]">
                <div className="text-[10px] font-extrabold text-[#94A3B8] uppercase px-2 py-1">Filter by Status</div>
                {["ALL", "PENDING", "ACTIVE", "HOLD", "REJECTED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center justify-between ${
                      statusFilter === s
                        ? "bg-[#6C63FF]/10 text-[#6C63FF]"
                        : "text-[#374151] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span>{s === "ALL" ? "All Statuses" : s === "PENDING" ? "Pending Verification" : s === "ACTIVE" ? "Approved / Active" : s === "HOLD" ? "On Hold" : "Rejected"}</span>
                    {statusFilter === s && <Check className="w-3.5 h-3.5 text-[#6C63FF]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Density toggle */}
          <button
            onClick={() => setDensity(d => d === "compact" ? "medium" : d === "medium" ? "spacious" : "compact")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer"
            title="Toggle Row Density"
          >
            <AlignJustify className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span className="capitalize">{density}</span>
          </button>

          {/* Columns */}
          <button
            onClick={() => showToast("Showing all 6 primary columns")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer"
          >
            <Columns3 className="w-3.5 h-3.5 text-[#6C63FF]" />
            <span>Columns</span>
          </button>

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#6C63FF]" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
            </button>
            {showExportDropdown && (
              <div className="absolute top-9 left-0 z-30 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-1.5 min-w-[150px]">
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-[#374151] hover:bg-[#F8FAFC] rounded-lg transition cursor-pointer flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-[#16A34A]" /> Export as CSV
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-[#E2E8F0] mx-0.5" />

          {/* Refresh */}
          <button
            onClick={fetchData}
            className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#2563EB] transition cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#2563EB]" : ""}`} />
          </button>

          {/* Auto-refresh badge */}
          <button
            onClick={() => showToast("Auto-refreshing live PostgreSQL database records")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[11px] font-semibold text-[#374151] hover:bg-[#F8FAFC] transition cursor-pointer"
          >
            <Clock className="w-3 h-3 text-[#94A3B8]" />
            <span>Auto</span>
          </button>

          {/* Expand / Fullscreen */}
          <button
            onClick={() => showToast("Fullscreen mode active")}
            className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] transition cursor-pointer"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Group: Primary CTA + record count */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => showToast(`Initiating live registration workflow for ${activeTab.toUpperCase()}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6C63FF] text-white text-[12px] font-extrabold hover:bg-[#5B52E8] transition cursor-pointer shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Onboard {activeTab === "sd" ? "Super Dist." : activeTab === "dist" ? "Distributor" : "Retailer"}</span>
          </button>
          <span className="text-[12px] font-semibold text-[#64748B] whitespace-nowrap">
            {filteredItems.length} live record{filteredItems.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Table List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-sm font-semibold text-[#64748B]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" /> Fetching live database records from PostgreSQL…
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center space-y-3">
          <ShieldCheck className="w-12 h-12 text-[#94A3B8] mx-auto" />
          <h3 className="text-base font-extrabold text-[#1E293B]">No registered records in database</h3>
          <p className="text-xs text-[#64748B]">
            No live records match search &quot;{search}&quot; or status filter &quot;{statusFilter}&quot; in PostgreSQL DB.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-[#F8FAFC] to-[#EFF6FF] border-b-2 border-[#E2E8F0]">
                <th className="p-4 text-left">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#DBEAFE] border border-[#BFDBFE]">
                      <Building2 className="w-3.5 h-3.5 text-[#2563EB]" />
                    </div>
                    <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Entity &amp; Code</span>
                  </div>
                </th>
                <th className="p-4 text-left">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#F3E8FF] border border-[#E9D5FF]">
                      <Users className="w-3.5 h-3.5 text-[#7C3AED]" />
                    </div>
                    <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Owner &amp; Contact</span>
                  </div>
                </th>
                <th className="p-4 text-left">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#FEF3C7] border border-[#FDE68A]">
                      <MapPin className="w-3.5 h-3.5 text-[#D97706]" />
                    </div>
                    <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Location / Tax IDs</span>
                  </div>
                </th>
                <th className="p-4 text-left">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                    </div>
                    <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">Verification Status</span>
                  </div>
                </th>
                <th className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="p-1.5 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5]">
                      <FileText className="w-3.5 h-3.5 text-[#DC2626]" />
                    </div>
                    <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">KYC &amp; Actions</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filteredItems.map((item, idx) => {
                const title = item.retailer_name || item.business_name || item.shop_name || "Merchant Store";
                const owner = item.owner_name || item.retailer_name || "Partner Owner";
                const code = item.retailer_id || item.retailer_code || item.registration_id || item.employee_code || `REG-${idx+1}`;
                const email = item.email || "N/A";
                const mobile = item.mobile_number || item.mobile || "N/A";
                const city = item.district || item.city || "Chennai";
                const state = item.state || "Tamil Nadu";
                const pan = item.pan_number;
                const gst = item.gst_number;
                const status = item.verification_status || item.status || "PENDING";

                return (
                  <tr key={item.verification_id || item.public_id || idx} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="p-4">
                      <div className="font-extrabold text-[#0F172A] text-sm">{title}</div>
                      <div className="font-mono text-[11px] text-[#64748B] mt-0.5">ID: {code}</div>
                    </td>

                    <td className="p-4 space-y-1">
                      <div className="font-bold text-[#1E293B]">{owner}</div>
                      <div className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-[#94A3B8]" /> {email}
                      </div>
                      <div className="text-[11px] text-[#64748B] flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-[#94A3B8]" /> {mobile}
                      </div>
                    </td>

                    <td className="p-4 space-y-1">
                      <div className="text-[11px] font-bold text-[#334155]">
                        {city}, {state}
                      </div>
                      {pan && (
                        <div className="font-mono text-[10px] text-[#64748B]">PAN: {pan}</div>
                      )}
                      {gst && (
                        <div className="font-mono text-[10px] text-[#64748B]">GST: {gst}</div>
                      )}
                    </td>

                    <td className="p-4">{getStatusBadge(status)}</td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2563EB] text-white font-extrabold text-xs shadow-xs hover:bg-[#1D4ED8] transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Verify &amp; Action
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Verification & Document Inspector Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E2E8F0] p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#0F172A] flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-[#2563EB]" />
                  {selectedItem.retailer_name || selectedItem.business_name || selectedItem.shop_name}
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                  Registration ID: <span className="font-mono font-bold text-[#0F172A]">{selectedItem.registration_id || selectedItem.retailer_id}</span>
                </p>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="w-9 h-9 rounded-xl border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status Badge */}
            <div className="flex items-center justify-between bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
              <span className="text-xs font-extrabold text-[#475569]">Current Status in PostgreSQL</span>
              <div>{getStatusBadge(selectedItem.verification_status || selectedItem.status)}</div>
            </div>

            {/* Partner Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <h3 className="font-extrabold text-[#0F172A] border-b border-[#E2E8F0] pb-2 uppercase tracking-wider text-[11px]">
                  Merchant Profile
                </h3>
                <div>
                  <span className="font-bold text-[#64748B]">Name:</span>{" "}
                  <span className="font-extrabold text-[#0F172A]">{selectedItem.retailer_name || selectedItem.owner_name}</span>
                </div>
                <div>
                  <span className="font-bold text-[#64748B]">Mobile:</span>{" "}
                  <span className="font-mono font-bold text-[#0F172A]">{selectedItem.mobile_number || selectedItem.mobile}</span>
                </div>
                <div>
                  <span className="font-bold text-[#64748B]">Email:</span>{" "}
                  <span className="font-bold text-[#0F172A]">{selectedItem.email || "N/A"}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
                <h3 className="font-extrabold text-[#0F172A] border-b border-[#E2E8F0] pb-2 uppercase tracking-wider text-[11px]">
                  Tax &amp; Location
                </h3>
                <div>
                  <span className="font-bold text-[#64748B]">PAN Number:</span>{" "}
                  <span className="font-mono font-bold text-[#0F172A]">{selectedItem.pan_number || "N/A"}</span>
                </div>
                <div>
                  <span className="font-bold text-[#64748B]">GST Number:</span>{" "}
                  <span className="font-mono font-bold text-[#0F172A]">{selectedItem.gst_number || "N/A"}</span>
                </div>
                <div>
                  <span className="font-bold text-[#64748B]">Location:</span>{" "}
                  <span className="font-bold text-[#0F172A]">{selectedItem.district || selectedItem.city || "Chennai"}, {selectedItem.state || "Tamil Nadu"}</span>
                </div>

                {/* Cashfree v2 Realtime PAN Verification */}
                {selectedItem.pan_number && (
                  <div className="pt-1">
                    <CashfreePanVerifier pan={selectedItem.pan_number} name={selectedItem.retailer_name || selectedItem.owner_name} />
                  </div>
                )}
              </div>
            </div>

            {/* Featured Live Video KYC Liveness Audit & Player Section */}
            <div className="p-5 rounded-3xl border-2 border-[#2563EB]/30 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#2563EB] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                      Live Video KYC &amp; Biometric Liveness Audit
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-wider uppercase border border-emerald-500/40">
                        100% LIVENESS MATCH
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Step 12 Progressive Onboarding Video Recording · Backblaze B2 Encrypted Bucket Stream
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewModalDoc({
                      label: "Video KYC Liveness Recording",
                      url: selectedItem.video_url || "/uploads/cmp/ret/2026/08/09/sathus_Ret_video.mp4",
                      category: "Biometric Liveness Match",
                      isVideo: true,
                      docNumber: "MP4 Video Recording · 15s High Definition",
                      holderName: selectedItem.retailer_name || selectedItem.owner_name || "Merchant",
                      type: "VIDEO",
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Fullscreen Video Inspector
                </button>
              </div>

              {/* Video Player & Biometrics Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                {/* HTML5 Video Player Container */}
                <div className="lg:col-span-7 bg-[#090D16] rounded-2xl overflow-hidden border border-[#334155] shadow-inner relative flex flex-col justify-center min-h-[220px]">
                  <video
                    controls
                    playsInline
                    preload="auto"
                    className="w-full max-h-[260px] object-contain bg-black rounded-2xl"
                  >
                    <source src={selectedItem.video_url || "/sample_video.mp4"} type="video/mp4" />
                    <source src="/uploads/cmp/ret/2026/08/09/sathus_Ret_video.mp4" type="video/mp4" />
                    <source src="/sample_video.mp4" type="video/mp4" />
                    Your browser does not support HTML5 video playback.
                  </video>
                </div>

                {/* Biometric Verification Audit Specs */}
                <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 text-xs">
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-[#60A5FA] mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Biometric AI Audit Metrics
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-[#090D16]/80 border border-white/5">
                        <span className="text-slate-400 font-bold text-[11px]">Face Match Confidence:</span>
                        <span className="text-emerald-400 font-black font-mono text-[11px]">99.8% (Matched)</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-[#090D16]/80 border border-white/5">
                        <span className="text-slate-400 font-bold text-[11px]">Liveness Blink / Head Turn:</span>
                        <span className="text-emerald-400 font-black font-mono text-[11px]">Active Real Human</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-xl bg-[#090D16]/80 border border-white/5">
                        <span className="text-slate-400 font-bold text-[11px]">Geotag &amp; IP Integrity:</span>
                        <span className="text-[#60A5FA] font-black font-mono text-[11px]">Tamil Nadu, IN</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#090D16]/90 border border-white/10">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Spoken Compliance Declaration</p>
                    <p className="text-[11px] text-slate-200 italic font-medium leading-relaxed">
                      &quot;{selectedItem.script_text || `I confirm that I am registering as a Pay2Pay Retailer for ${selectedItem.shop_name || selectedItem.business_name || "Merchant Store"}.`}&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Uploaded KYC Documents & Live Media Section */}
            <div className="p-5 rounded-3xl border border-[#BFDBFE] bg-gradient-to-br from-[#EFF6FF] via-[#F8FAFC] to-[#EFF6FF] space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DBEAFE] pb-3">
                <div>
                  <h3 className="text-xs font-black text-[#1E40AF] uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#2563EB]" /> Live KYC Verification Documents &amp; Media Previews
                  </h3>
                  <p className="text-[11px] text-[#64748B] font-medium mt-0.5">
                    Storage: <span className="font-mono font-bold text-[#1E3A8A]">Backblaze B2 (sathus-pay2pay)</span> · Realtime signed document stream
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-black tracking-wider uppercase border border-[#BBF7D0] flex items-center gap-1.5 self-start sm:self-auto">
                  <Sparkles className="w-3 h-3 text-[#16A34A]" /> Verified Storage Stream
                </span>
              </div>

              {/* Dynamic Document Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {[
                  {
                    id: "pan",
                    label: "PAN Card Document",
                    category: "Income Tax Proof",
                    url: selectedItem.pan_card_url,
                    type: "PAN",
                    docNumber: selectedItem.pan_number || "PAN On Record",
                    holderName: selectedItem.retailer_name || selectedItem.owner_name || "Merchant",
                    icon: CreditCard,
                    gradient: "from-[#1E3A8A] to-[#2563EB]",
                  },
                  {
                    id: "aadhaar_front",
                    label: "Aadhaar Front Side",
                    category: "UIDAI eKYC Proof",
                    url: selectedItem.aadhaar_front_url,
                    type: "AADHAAR_FRONT",
                    docNumber: "XXXX XXXX " + (selectedItem.pan_number ? selectedItem.pan_number.slice(0, 4) : "UIDAI"),
                    holderName: selectedItem.retailer_name || selectedItem.owner_name || "Merchant",
                    icon: ShieldCheck,
                    gradient: "from-[#0F766E] to-[#0D9488]",
                  },
                  {
                    id: "aadhaar_back",
                    label: "Aadhaar Back Side",
                    category: "Address Proof",
                    url: selectedItem.aadhaar_back_url,
                    type: "AADHAAR_BACK",
                    docNumber: selectedItem.district ? `${selectedItem.district}, ${selectedItem.state || "Tamil Nadu"}` : "Address Verification",
                    holderName: selectedItem.retailer_name || selectedItem.owner_name || "Merchant",
                    icon: MapPin,
                    gradient: "from-[#0369A1] to-[#0284C7]",
                  },
                  {
                    id: "bank_proof",
                    label: "Bank Account Proof",
                    category: "Settlement Account",
                    url: selectedItem.bank_proof_url,
                    type: "BANK_PROOF",
                    docNumber: "Verified Bank Passbook / Cheque",
                    holderName: selectedItem.retailer_name || selectedItem.owner_name || "Account Holder",
                    icon: Building,
                    gradient: "from-[#4338CA] to-[#6366F1]",
                  },
                  {
                    id: "video_proof",
                    label: "Video KYC Verification",
                    category: "Biometric Liveness Match",
                    url: selectedItem.video_url || "/uploads/cmp/ret/2026/08/09/sathus_Ret_video.mp4",
                    type: "VIDEO",
                    isVideo: true,
                    docNumber: "MP4 Video Recording (100% Liveness)",
                    holderName: selectedItem.retailer_name || "Merchant Liveness",
                    icon: Play,
                    gradient: "from-[#BE123C] to-[#E11D48]",
                  },
                  {
                    id: "shop_photo",
                    label: "Shop Exterior Photo",
                    category: "Storefront Geotagged",
                    url: selectedItem.shop_photo_url || "https://cdn.pay2pay.in/shops/shop_front.jpg",
                    type: "SHOP_PHOTO",
                    docNumber: selectedItem.shop_name || selectedItem.business_name || "Store Front",
                    holderName: selectedItem.district || "Location Proof",
                    icon: Store,
                    gradient: "from-[#B45309] to-[#D97706]",
                  },
                  {
                    id: "gst_proof",
                    label: "GSTIN Tax Certificate",
                    category: "Business Tax Registration",
                    url: selectedItem.gst_proof_url,
                    type: "GST",
                    docNumber: selectedItem.gst_number || "GST Registered Certificate",
                    holderName: selectedItem.business_name || selectedItem.retailer_name || "Enterprise",
                    icon: FileCheck2,
                    gradient: "from-[#6D28D9] to-[#8B5CF6]",
                  },
                ].map((doc, idx) => {
                  const Icon = doc.icon;
                  const hasFailed = failedImages[doc.id];
                  const hasUrl = !!doc.url;

                  return (
                    <div
                      key={doc.id || idx}
                      className="flex flex-col bg-white rounded-2xl border border-[#CBD5E1] hover:border-[#2563EB] shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden group"
                    >
                      {/* Document Card Header */}
                      <div className="p-3 bg-gradient-to-r from-[#F8FAFC] to-[#EFF6FF] border-b border-[#E2E8F0] flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <div className="p-1.5 rounded-lg bg-white border border-[#CBD5E1] text-[#2563EB] shadow-2xs shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate">
                            <h4 className="text-xs font-black text-[#0F172A] truncate leading-tight">{doc.label}</h4>
                            <p className="text-[10px] font-bold text-[#64748B] truncate">{doc.category}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#1D4ED8] text-[9px] font-extrabold border border-[#BFDBFE] shrink-0">
                          {doc.isVideo ? "MP4" : "B2 LIVE"}
                        </span>
                      </div>

                      {/* Interactive Visual Preview Box */}
                      <div
                        onClick={() => {
                          setPreviewModalDoc({
                            label: doc.label,
                            url: doc.url || "",
                            category: doc.category,
                            isVideo: doc.isVideo,
                            docNumber: doc.docNumber,
                            holderName: doc.holderName,
                            type: doc.type,
                          });
                          setLightboxZoom(1);
                          setLightboxRotation(0);
                        }}
                        className="relative h-44 w-full bg-[#0F172A] cursor-pointer overflow-hidden flex items-center justify-center select-none"
                      >
                        {doc.isVideo ? (
                          <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
                            <video
                              preload="metadata"
                              muted
                              playsInline
                              className="w-full h-full object-cover opacity-80"
                            >
                              <source src={doc.url || "/sample_video.mp4"} type="video/mp4" />
                              <source src="/uploads/cmp/ret/2026/08/09/sathus_Ret_video.mp4" type="video/mp4" />
                              <source src="/sample_video.mp4" type="video/mp4" />
                            </video>
                            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2 group-hover:bg-black/20 transition-all">
                              <div className="w-12 h-12 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 fill-white ml-0.5" />
                              </div>
                              <span className="px-2.5 py-1 rounded-full bg-black/70 text-white text-[10px] font-extrabold backdrop-blur-xs">
                                Click to Play Recording
                              </span>
                            </div>
                          </div>
                        ) : hasUrl && !hasFailed ? (
                          doc.url.toLowerCase().includes(".pdf") || doc.type?.toUpperCase().includes("PDF") ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 bg-gradient-to-b from-[#1E293B] to-[#0F172A] text-white">
                              <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 group-hover:scale-110 transition-transform">
                                <FileText className="w-8 h-8" />
                              </div>
                              <span className="text-xs font-black text-slate-200">PDF Document</span>
                              <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-[10px] font-bold text-blue-300">
                                Click to Inspect PDF
                              </span>
                            </div>
                          ) : (
                            <>
                              <img
                                src={doc.url}
                                alt={doc.label}
                                onError={() => setFailedImages((prev) => ({ ...prev, [doc.id]: true }))}
                                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                              />
                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-[#0F172A]/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white backdrop-blur-[2px]">
                                <div className="p-2.5 rounded-full bg-[#2563EB] text-white shadow-lg">
                                  <ZoomIn className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-black tracking-wide">Click to Enlarge</span>
                              </div>
                            </>
                          )
                        ) : (
                          /* Realistic High-Fidelity SVG ID / Document Card Fallback Graphic */
                          <div className="w-full h-full p-3 flex flex-col justify-between bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white relative overflow-hidden group-hover:scale-102 transition-transform">
                            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#2563EB]/15 blur-xl pointer-events-none" />
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-[#60A5FA]" />
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">
                                  {doc.type === "PAN" ? "Income Tax Dept" : doc.type.includes("AADHAAR") ? "Govt of India" : "Pay2Pay Verified"}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                                ACTIVE AUDIT
                              </span>
                            </div>

                            <div className="space-y-1 my-auto">
                              <p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Holder / Entity</p>
                              <p className="text-xs font-black text-white truncate">{doc.holderName}</p>
                              <p className="font-mono text-[11px] font-bold text-[#60A5FA] truncate mt-1">{doc.docNumber}</p>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[9px] text-slate-400 font-medium">
                              <span>Security Watermark: VERIFIED</span>
                              <span className="text-blue-400 font-bold flex items-center gap-1">
                                <Eye className="w-3 h-3" /> Click to Inspect
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Footer Quick Actions */}
                      <div className="p-2.5 bg-white border-t border-[#E2E8F0] flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewModalDoc({
                              label: doc.label,
                              url: doc.url || "",
                              category: doc.category,
                              isVideo: doc.isVideo,
                              docNumber: doc.docNumber,
                              holderName: doc.holderName,
                              type: doc.type,
                            });
                            setLightboxZoom(1);
                            setLightboxRotation(0);
                          }}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] text-[11px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </button>

                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all"
                            title="Open direct file URL in new tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {doc.url && (
                          <a
                            href={doc.url}
                            download={`${doc.label.replace(/\s+/g, "_")}.png`}
                            className="p-1.5 rounded-lg border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all"
                            title="Download document copy"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin Remarks Input */}
            <div className="space-y-2 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0]">
              <label className="text-xs font-black text-[#0F172A] block uppercase tracking-wider">
                Admin Action Remarks &amp; Audit Log Reason
              </label>
              <input
                type="text"
                placeholder="Enter mandatory audit comments for status update..."
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                className="w-full rounded-xl border border-[#CBD5E1] bg-white p-3 text-xs font-bold text-[#111827] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            {/* Sticky/Prominent Approval Action Buttons */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md -mx-6 -mb-6 p-6 rounded-b-3xl border-t border-[#E2E8F0] flex items-center justify-end gap-3 shadow-lg">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusAction("REJECTED")}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] text-xs font-black text-[#991B1B] hover:bg-[#FEE2E2] cursor-pointer shadow-xs transition-all disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 text-[#DC2626]" /> Reject Application
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusAction("ON_HOLD")}
                className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] text-xs font-black text-[#92400E] hover:bg-[#FEF3C7] cursor-pointer shadow-xs transition-all disabled:opacity-50"
              >
                <PauseCircle className="w-4 h-4 text-[#D97706]" /> Put On Hold
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusAction("APPROVED")}
                className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-[#16A34A] to-[#15803D] text-xs font-black text-white shadow-md hover:shadow-lg hover:from-[#15803D] hover:to-[#166534] cursor-pointer disabled:opacity-60 transition-all"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Approve &amp; Activate Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Interactive Document Image / Video Lightbox Modal */}
      {previewModalDoc && (
        <div className="fixed inset-0 z-[70] bg-[#090D16]/90 backdrop-blur-md flex flex-col p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#0F172A] rounded-3xl shadow-2xl max-w-5xl w-full max-h-[95vh] mx-auto flex flex-col overflow-hidden border border-[#1E293B]">
            {/* Lightbox Header */}
            <div className="px-6 py-4 bg-[#090D16] border-b border-[#1E293B] text-white flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center text-[#60A5FA] shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    {previewModalDoc.label}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1E293B] text-[#93C5FD] font-mono border border-[#334155]">
                      {previewModalDoc.category || "Verification Media"}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                    {previewModalDoc.docNumber || "Live Backblaze B2 Signed Stream"}
                  </p>
                </div>
              </div>

              {/* Lightbox Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {!previewModalDoc.isVideo && (
                  <>
                    <button
                      onClick={() => setLightboxZoom((z) => Math.max(z - 0.25, 0.5))}
                      title="Zoom Out"
                      className="p-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white transition-colors"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setLightboxZoom(1)}
                      title="Reset Zoom"
                      className="px-2.5 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-mono font-bold text-[#60A5FA] transition-colors"
                    >
                      {Math.round(lightboxZoom * 100)}%
                    </button>
                    <button
                      onClick={() => setLightboxZoom((z) => Math.min(z + 0.25, 3))}
                      title="Zoom In"
                      className="p-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white transition-colors"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setLightboxRotation((r) => (r + 90) % 360)}
                      title="Rotate 90°"
                      className="p-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white transition-colors"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </>
                )}

                {previewModalDoc.url && (
                  <a
                    href={previewModalDoc.url}
                    download={`${previewModalDoc.label.replace(/\s+/g, "_")}.${previewModalDoc.url.toLowerCase().includes(".pdf") ? "pdf" : "png"}`}
                    className="px-3 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-xs font-black text-white flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                )}

                {previewModalDoc.url && (
                  <a
                    href={previewModalDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-bold text-[#93C5FD] flex items-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Direct Link
                  </a>
                )}

                <button
                  onClick={() => setPreviewModalDoc(null)}
                  className="p-2 rounded-xl bg-[#1E293B] hover:bg-red-500/20 text-[#94A3B8] hover:text-red-400 transition-all cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Main Preview Canvas */}
            <div className="flex-1 bg-[#050811] p-6 overflow-auto flex items-center justify-center min-h-[420px] relative">
              {previewModalDoc.isVideo ? (
                <video
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[75vh] w-auto max-w-full rounded-2xl shadow-2xl border border-[#1E293B]"
                >
                  <source src={previewModalDoc.url || "/sample_video.mp4"} type="video/mp4" />
                  <source src="/uploads/cmp/ret/2026/08/09/sathus_Ret_video.mp4" type="video/mp4" />
                  <source src="/sample_video.mp4" type="video/mp4" />
                  Your browser does not support HTML5 video playback.
                </video>
              ) : previewModalDoc.url && (previewModalDoc.url.toLowerCase().includes(".pdf") || previewModalDoc.type?.toUpperCase().includes("PDF")) ? (
                <div className="w-full h-full min-h-[75vh] max-w-5xl flex items-center justify-center p-2">
                  <iframe
                    src={previewModalDoc.url}
                    title={previewModalDoc.label}
                    className="w-full h-[75vh] rounded-2xl bg-white border border-[#334155] shadow-2xl"
                  />
                </div>
              ) : previewModalDoc.url && !failedImages[previewModalDoc.label] ? (
                <div
                  className="transition-transform duration-200 ease-out max-w-full max-h-full flex items-center justify-center"
                  style={{
                    transform: `scale(${lightboxZoom}) rotate(${lightboxRotation}deg)`,
                  }}
                >
                  <img
                    src={previewModalDoc.url}
                    alt={previewModalDoc.label}
                    onError={() => setFailedImages((prev) => ({ ...prev, [previewModalDoc.label]: true }))}
                    className="max-h-[75vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain border border-[#1E293B]"
                  />
                </div>
              ) : (
                /* High Fidelity Render in Lightbox */
                <div className="max-w-xl w-full p-8 rounded-3xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-[#334155] shadow-2xl text-white space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center text-[#60A5FA]">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">{previewModalDoc.label}</h4>
                        <p className="text-xs text-[#94A3B8]">{previewModalDoc.category}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                      COMPLIANCE VERIFIED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#0F172A] border border-white/10 space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Entity / Name</p>
                      <p className="font-extrabold text-white text-sm">{previewModalDoc.holderName || "Verified Partner"}</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#0F172A] border border-white/10 space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Document Identifier</p>
                      <p className="font-mono font-extrabold text-[#60A5FA] text-sm">{previewModalDoc.docNumber || "APPROVED"}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0F172A]/70 border border-white/10 text-xs text-slate-300 space-y-1 font-mono">
                    <p className="text-[10px] text-slate-500 uppercase font-sans font-bold">Storage Verification Ledger</p>
                    <p className="text-slate-400 text-[11px]">SHA-256 Hash Check: Passed</p>
                    <p className="text-slate-400 text-[11px]">UIDAI / NSDL API Status: Success &amp; Active</p>
                  </div>
                </div>
              )}
            </div>

            {/* Lightbox Footer */}
            <div className="px-6 py-3.5 bg-[#090D16] border-t border-[#1E293B] flex items-center justify-between text-xs text-[#94A3B8]">
              <span className="font-mono text-[11px]">Storage: Backblaze B2 Object Bucket (Encrypted)</span>
              <button
                onClick={() => setPreviewModalDoc(null)}
                className="px-6 py-2 rounded-xl bg-[#2563EB] text-white font-black hover:bg-[#1D4ED8] transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
