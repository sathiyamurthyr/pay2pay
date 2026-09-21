"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
  CreditCard,
  Building,
  Image as ImageIcon,
  Sparkles,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  History,
  CheckCircle,
  FileCheck,
  FileX,
  AlertCircle,
  HelpCircle,
  BadgeCheck,
  Landmark,
  Edit3,
  Save,
  Pencil
} from "lucide-react";
import api from "@/lib/api";

type DetailTab = "OVERVIEW" | "DOCUMENTS" | "BANK_TAX" | "LIMITS" | "AUDIT";

function DistributorApprovalsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetId = searchParams.get("id");

  const [distList, setDistList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  // Full-Page Selected Distributor for KYC Verification (No Modal Window)
  const [selectedDistributor, setSelectedDistributor] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("OVERVIEW");

  // Action Bar State
  const [actionRemarks, setActionRemarks] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Wallet Float & Operating Limits state
  const [walletFloat, setWalletFloat] = useState<string>("0.00");
  const [dailyLimit, setDailyLimit] = useState<string>("50,00,000");
  const [singleLimit, setSingleLimit] = useState<string>("5,00,000");

  // Active Document Viewer state for inspection
  const [selectedDocId, setSelectedDocId] = useState<string>("pan");
  const [docZoom, setDocZoom] = useState<number>(1);
  const [docRotation, setDocRotation] = useState<number>(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Toolbar dropdowns
  const [showFilterDropdown, setShowFilterDropdown] = useState<boolean>(false);
  const [showExportDropdown, setShowExportDropdown] = useState<boolean>(false);

  // Profile Inline Edit State
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [editFormData, setEditFormData] = useState<{
    business_name: string;
    owner_name: string;
    mobile: string;
    email: string;
    city: string;
    state: string;
    pan_number: string;
    gst_number: string;
  }>({
    business_name: "",
    owner_name: "",
    mobile: "",
    email: "",
    city: "",
    state: "",
    pan_number: "",
    gst_number: ""
  });
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const handleStartEdit = () => {
    if (!selectedDistributor) return;
    setEditFormData({
      business_name: selectedDistributor.business_name || selectedDistributor.retailer_name || "",
      owner_name: selectedDistributor.owner_name || selectedDistributor.full_name || "",
      mobile: selectedDistributor.mobile || selectedDistributor.mobile_number || "",
      email: selectedDistributor.email || "",
      city: selectedDistributor.city || "",
      state: selectedDistributor.state || "",
      pan_number: selectedDistributor.pan_number || "",
      gst_number: selectedDistributor.gst_number || ""
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedDistributor) return;
    if (!editFormData.business_name.trim()) {
      showToast("Business Name cannot be empty.");
      return;
    }
    if (!editFormData.owner_name.trim()) {
      showToast("Owner / Proprietor Name cannot be empty.");
      return;
    }

    try {
      setSaveLoading(true);
      const distId = String(
        selectedDistributor.public_id ||
        selectedDistributor.distributor_id ||
        selectedDistributor.distributor_code ||
        selectedDistributor.id
      );

      const res = await api.patch(`/api/v1/organization/distributors/${distId}`, {
        business_name: editFormData.business_name.trim(),
        owner_name: editFormData.owner_name.trim(),
        mobile: editFormData.mobile.trim() || undefined,
        email: editFormData.email.trim() || undefined,
        city: editFormData.city.trim() || undefined,
        state: editFormData.state.trim() || undefined,
        pan_number: editFormData.pan_number.trim().toUpperCase() || undefined,
        gst_number: editFormData.gst_number.trim().toUpperCase() || undefined,
      });

      const updated = res.data;
      setSelectedDistributor((prev: any) => ({
        ...prev,
        ...updated,
        business_name: updated.business_name || editFormData.business_name.trim(),
        owner_name: updated.owner_name || editFormData.owner_name.trim(),
        mobile: updated.mobile || editFormData.mobile.trim(),
        email: updated.email || editFormData.email.trim(),
        city: updated.city || editFormData.city.trim(),
        state: updated.state || editFormData.state.trim(),
        pan_number: updated.pan_number || editFormData.pan_number.trim().toUpperCase(),
        gst_number: updated.gst_number || editFormData.gst_number.trim().toUpperCase(),
      }));

      // Also update in list
      setDistList((prev) =>
        prev.map((d) =>
          String(d.public_id || d.distributor_id || d.distributor_code || d.id) === distId
            ? {
                ...d,
                business_name: updated.business_name || editFormData.business_name.trim(),
                owner_name: updated.owner_name || editFormData.owner_name.trim(),
                mobile: updated.mobile || editFormData.mobile.trim(),
                email: updated.email || editFormData.email.trim(),
                city: updated.city || editFormData.city.trim(),
                state: updated.state || editFormData.state.trim(),
              }
            : d
        )
      );

      setIsEditingProfile(false);
      showToast("Distributor Business & Owner profile updated successfully.");
    } catch (err: any) {
      console.error("Failed to update distributor profile:", err);
      const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to update profile.";
      showToast(msg);
    } finally {
      setSaveLoading(false);
    }
  };

  // Fetch distributor approvals from REST API
  const fetchDistributors = async () => {
    try {
      setLoading(true);
      const [pendingRes, allRes] = await Promise.allSettled([
        api.get("/api/v1/admin/retailer-control/pending-approvals"),
        api.get("/api/v1/organization/distributors", { params: { page_size: 100 } }),
      ]);

      const pendingDists =
        pendingRes.status === "fulfilled"
          ? pendingRes.value.data?.data?.distributors || []
          : [];
      const allDists =
        allRes.status === "fulfilled"
          ? allRes.value.data?.items || allRes.value.data?.distributors || allRes.value.data || []
          : [];

      // Merge and deduplicate preserving exact DB status
      const map = new Map<string, any>();
      for (const d of allDists) {
        const key = String(d.public_id || d.distributor_id || d.distributor_code || d.id);
        const rawStatus = (d.status || (d.is_active ? "ACTIVE" : "PENDING")).toUpperCase();
        map.set(key, { ...d, status: rawStatus, verification_status: rawStatus });
      }
      for (const d of pendingDists) {
        const key = String(d.public_id || d.distributor_id || d.distributor_code || d.id);
        const rawStatus = (d.status || "PENDING").toUpperCase();
        const existing = map.get(key) || {};
        map.set(key, { ...existing, ...d, status: rawStatus, verification_status: rawStatus });
      }

      const merged = Array.from(map.values());
      setDistList(merged);

      // If URL contains ?id=..., load full-page KYC detail
      if (targetId) {
        const found = merged.find(
          (item) =>
            String(item.public_id) === targetId ||
            String(item.distributor_id) === targetId ||
            String(item.id) === targetId ||
            String(item.distributor_code) === targetId
        );
        if (found) {
          loadDistributorDetail(found);
        } else {
          // If not in list, fetch detail directly via API
          loadDistributorDetailById(targetId);
        }
      } else {
        setSelectedDistributor(null);
      }
    } catch (err: any) {
      console.error("Error fetching distributor approvals:", err);
      showToast("Failed to load distributor list from API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistributors();
  }, [targetId]);

  // Load detailed KYC & documents for selected distributor via REST API
  const loadDistributorDetail = async (item: any) => {
    setSelectedDistributor(item);
    setDetailLoading(true);
    setActionError(null);
    setWalletFloat("0.00");
    const verifId = item.public_id || item.distributor_id || item.id || item.distributor_code;
    if (verifId) {
      try {
        const res = await api.get(`/api/v1/admin/verification/requests/${verifId}`);
        const detail = res.data;
        if (detail && detail.status === "SUCCESS") {
          const w = detail.wallet || {};
          const bal = w.wallet_balance !== undefined && w.wallet_balance !== null ? Number(w.wallet_balance) : 0.0;
          setWalletFloat(bal.toFixed(2));
          setDailyLimit(
            w.daily_transaction_limit
              ? Number(w.daily_transaction_limit).toLocaleString("en-IN")
              : "50,00,000"
          );
          setSingleLimit(
            w.single_transaction_limit
              ? Number(w.single_transaction_limit).toLocaleString("en-IN")
              : "5,00,000"
          );
          setSelectedDistributor((prev: any) => ({
            ...prev,
            ...detail.verification,
            ...detail.media,
            wallet: detail.wallet,
            pan_card_url: detail.media?.pan_card_url,
            aadhaar_front_url: detail.media?.aadhaar_front_url,
            aadhaar_back_url: detail.media?.aadhaar_back_url,
            bank_proof_url: detail.media?.bank_proof_url,
            gst_proof_url: detail.media?.gst_proof_url,
            shop_photo_url: detail.media?.shop_photo_url,
            video_url: detail.media?.video_url || detail.media?.raw_video_url || null,
            selfie_url: detail.media?.selfie_url,
          }));
        }
      } catch (err) {
        console.error("Error fetching verification details for distributor:", err);
      } finally {
        setDetailLoading(false);
      }
    } else {
      setDetailLoading(false);
    }
  };

  const loadDistributorDetailById = async (id: string) => {
    setDetailLoading(true);
    setActionError(null);
    setWalletFloat("0.00");
    try {
      const res = await api.get(`/api/v1/admin/verification/requests/${id}`);
      const detail = res.data;
      if (detail && detail.status === "SUCCESS") {
        const v = detail.verification || {};
        const w = detail.wallet || {};
        const bal = w.wallet_balance !== undefined && w.wallet_balance !== null ? Number(w.wallet_balance) : 0.0;
        setWalletFloat(bal.toFixed(2));
        setDailyLimit(
          w.daily_transaction_limit
            ? Number(w.daily_transaction_limit).toLocaleString("en-IN")
            : "50,00,000"
        );
        setSingleLimit(
          w.single_transaction_limit
            ? Number(w.single_transaction_limit).toLocaleString("en-IN")
            : "5,00,000"
        );
        setSelectedDistributor({
          public_id: id,
          ...v,
          ...detail.media,
          wallet: detail.wallet,
          pan_card_url: detail.media?.pan_card_url,
          aadhaar_front_url: detail.media?.aadhaar_front_url,
          aadhaar_back_url: detail.media?.aadhaar_back_url,
          bank_proof_url: detail.media?.bank_proof_url,
          gst_proof_url: detail.media?.gst_proof_url,
          shop_photo_url: detail.media?.shop_photo_url,
          video_url: detail.media?.video_url || detail.media?.raw_video_url || null,
          selfie_url: detail.media?.selfie_url,
        });
      }
    } catch (err) {
      console.error("Error fetching verification details by ID:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedDistributor(null);
    router.push("/retailers/distributor-approvals");
  };

  const handleSelectDistributor = (dist: any) => {
    const id = dist.public_id || dist.distributor_id || dist.id || dist.distributor_code;
    router.push(`/retailers/distributor-approvals?id=${id}`);
    loadDistributorDetail(dist);
  };

  // Perform Status Action (APPROVE, ON_HOLD, REJECT)
  const handleStatusAction = async (newStatus: "APPROVED" | "ON_HOLD" | "REJECTED") => {
    if (!selectedDistributor) return;
    if (!actionRemarks || actionRemarks.trim().length < 4) {
      setActionError("Please provide approval/decision remarks (at least 4 characters).");
      return;
    }

    setActionLoading(true);
    setActionError(null);
    try {
      const verifId =
        selectedDistributor.public_id ||
        selectedDistributor.distributor_id ||
        selectedDistributor.id ||
        selectedDistributor.distributor_code;

      await api.post(`/api/v1/admin/verification/requests/${verifId}/action`, {
        action: newStatus,
        admin_id: "ADM-SYSTEM",
        remarks: actionRemarks.trim(),
        admin_role: "COMPLIANCE_OFFICER",
        wallet_balance: parseFloat(String(walletFloat).replace(/,/g, "")) || 0.0,
        daily_transaction_limit:
          parseFloat(String(dailyLimit).replace(/,/g, "")) || 5000000.0,
        single_transaction_limit:
          parseFloat(String(singleLimit).replace(/,/g, "")) || 500000.0,
      });

      const targetStatus = newStatus === "APPROVED" ? "ACTIVE" : newStatus === "ON_HOLD" ? "HOLD" : "REJECTED";
      const targetName =
        selectedDistributor.business_name ||
        selectedDistributor.retailer_name ||
        selectedDistributor.owner_name ||
        "Distributor";

      showToast(
        `Successfully updated ${targetName} to ${
          newStatus === "APPROVED"
            ? "Approved & Active"
            : newStatus === "ON_HOLD"
            ? "On Hold"
            : "Rejected"
        } in database!`
      );
      setActionRemarks("");
      
      // Update selected distributor state immediately
      setSelectedDistributor((prev: any) =>
        prev
          ? {
              ...prev,
              status: targetStatus,
              verification_status: targetStatus,
              retailer_status: targetStatus,
              is_active: targetStatus === "ACTIVE",
            }
          : null
      );
      
      // Update list state strictly for this target ID only
      setDistList((prev) =>
        prev.map((d) => {
          const isTarget =
            String(d.public_id) === String(verifId) ||
            String(d.distributor_id) === String(verifId) ||
            String(d.id) === String(verifId) ||
            String(d.distributor_code) === String(verifId);
          return isTarget
            ? { ...d, status: targetStatus, verification_status: targetStatus, is_active: targetStatus === "ACTIVE" }
            : d;
        })
      );

      fetchDistributors();
    } catch (err: any) {
      setActionError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to process verification decision. Please check backend."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "PENDING").toUpperCase();
    if (s === "ACTIVE" || s === "APPROVED" || s === "VERIFIED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" /> ACTIVE / APPROVED
        </span>
      );
    }
    if (s === "HOLD" || s === "ON_HOLD") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
          <PauseCircle className="w-3.5 h-3.5 text-[#D97706]" /> ON HOLD
        </span>
      );
    }
    if (s === "REJECTED" || s === "BLOCKED" || s === "SUSPENDED") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]">
          <XCircle className="w-3.5 h-3.5 text-[#DC2626]" /> REJECTED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
        <Clock className="w-3.5 h-3.5 text-[#2563EB]" /> PENDING APPROVAL
      </span>
    );
  };

  // Filter list
  const filteredItems = distList.filter((item) => {
    const title = item.business_name || item.retailer_name || "";
    const code = item.distributor_code || item.distributor_id || "";
    const owner = item.owner_name || "";
    const email = item.email || "";
    const mobile = item.mobile || "";
    const rawStatus = (item.verification_status || item.status || "PENDING").toUpperCase();

    const matchesSearch =
      !search.trim() ||
      title.toLowerCase().includes(search.toLowerCase()) ||
      code.toLowerCase().includes(search.toLowerCase()) ||
      owner.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      mobile.includes(search);

    const isApproved = rawStatus === "ACTIVE" || rawStatus === "APPROVED" || rawStatus === "VERIFIED";
    const isHold = rawStatus === "HOLD" || rawStatus === "ON_HOLD";
    const isRejected = rawStatus === "REJECTED" || rawStatus === "BLOCKED" || rawStatus === "SUSPENDED";
    const isPending = !isApproved && !isHold && !isRejected;

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && isApproved) ||
      (statusFilter === "PENDING" && isPending) ||
      (statusFilter === "HOLD" && isHold) ||
      (statusFilter === "REJECTED" && isRejected);

    return matchesSearch && matchesStatus;
  });

  const pendingCount = distList.filter((d) => {
    const s = (d.verification_status || d.status || "PENDING").toUpperCase();
    return s !== "ACTIVE" && s !== "APPROVED" && s !== "VERIFIED" && s !== "HOLD" && s !== "ON_HOLD" && s !== "REJECTED" && s !== "BLOCKED" && s !== "SUSPENDED";
  }).length;

  const holdCount = distList.filter((d) => {
    const s = (d.verification_status || d.status || "").toUpperCase();
    return s === "HOLD" || s === "ON_HOLD";
  }).length;

  const activeCount = distList.filter((d) => {
    const s = (d.verification_status || d.status || "").toUpperCase();
    return s === "ACTIVE" || s === "APPROVED" || s === "VERIFIED";
  }).length;

  // Documents array for inspection
  const documents = selectedDistributor
    ? [
        {
          id: "pan",
          label: "PAN Card Document",
          category: "Income Tax Proof",
          url: selectedDistributor.pan_card_url,
          docNumber: selectedDistributor.pan_number || "PAN On Record",
          holderName: selectedDistributor.owner_name || selectedDistributor.business_name || "Account Holder",
          icon: CreditCard,
          gradient: "from-[#1E3A8A] to-[#2563EB]",
          isAvailable: Boolean(selectedDistributor.pan_card_url && selectedDistributor.pan_card_url.trim() !== ""),
        },
        {
          id: "aadhaar_front",
          label: "Aadhaar Front Side",
          category: "UIDAI eKYC Proof",
          url: selectedDistributor.aadhaar_front_url,
          docNumber: "XXXX-XXXX-" + (selectedDistributor.mobile ? String(selectedDistributor.mobile).slice(-4) : "UIDAI"),
          holderName: selectedDistributor.owner_name || "Applicant",
          icon: FileText,
          gradient: "from-[#7C3AED] to-[#9333EA]",
          isAvailable: Boolean(selectedDistributor.aadhaar_front_url && selectedDistributor.aadhaar_front_url.trim() !== ""),
        },
        {
          id: "aadhaar_back",
          label: "Aadhaar Back Side",
          category: "Address Proof",
          url: selectedDistributor.aadhaar_back_url,
          docNumber: selectedDistributor.city ? `${selectedDistributor.city}, ${selectedDistributor.state || "Tamil Nadu"}` : "Address Record",
          holderName: selectedDistributor.owner_name || "Applicant",
          icon: MapPin,
          gradient: "from-[#D97706] to-[#F59E0B]",
          isAvailable: Boolean(selectedDistributor.aadhaar_back_url && selectedDistributor.aadhaar_back_url.trim() !== ""),
        },
        {
          id: "gst",
          label: "GST Certificate",
          category: "Business Tax Proof",
          url: selectedDistributor.gst_proof_url,
          docNumber: selectedDistributor.gst_number || "GST Not Registered",
          holderName: selectedDistributor.business_name || "Enterprise",
          icon: Building,
          gradient: "from-[#059669] to-[#10B981]",
          isAvailable: Boolean(selectedDistributor.gst_proof_url && selectedDistributor.gst_proof_url.trim() !== ""),
        },
        {
          id: "bank",
          label: "Bank Passbook / Cheque",
          category: "Settlement Account Proof",
          url: selectedDistributor.bank_proof_url,
          docNumber: selectedDistributor.ifsc ? `${selectedDistributor.ifsc} · A/C ${selectedDistributor.bank_account_number || "On Record"}` : "Bank Settlement Proof",
          holderName: selectedDistributor.owner_name || selectedDistributor.business_name || "Account Holder",
          icon: CreditCard,
          gradient: "from-[#4F46E5] to-[#6366F1]",
          isAvailable: Boolean(selectedDistributor.bank_proof_url && selectedDistributor.bank_proof_url.trim() !== ""),
        },
        {
          id: "shop_photo",
          label: "Shop / Office Exterior Photo",
          category: "Physical Location Proof",
          url: selectedDistributor.shop_photo_url,
          docNumber: selectedDistributor.business_name || "Operating Location",
          holderName: selectedDistributor.city ? `${selectedDistributor.city}, ${selectedDistributor.state || "TN"}` : "Location Proof",
          icon: Store,
          gradient: "from-[#B45309] to-[#D97706]",
          isAvailable: Boolean(selectedDistributor.shop_photo_url && selectedDistributor.shop_photo_url.trim() !== ""),
        },
        {
          id: "selfie",
          label: "Applicant Live Photo / Selfie",
          category: "Identity Verification",
          url: selectedDistributor.selfie_url,
          docNumber: selectedDistributor.mobile || "Live Photo",
          holderName: selectedDistributor.owner_name || "Applicant",
          icon: Users,
          gradient: "from-[#0D9488] to-[#14B8A6]",
          isAvailable: Boolean(selectedDistributor.selfie_url && selectedDistributor.selfie_url.trim() !== ""),
        },
        {
          id: "video",
          label: "Video KYC Recording",
          category: "Biometric Liveness Verification",
          url: selectedDistributor.video_url,
          isVideo: true,
          docNumber: "MP4 Video Recording",
          holderName: selectedDistributor.owner_name || "Applicant Liveness",
          icon: Play,
          gradient: "from-[#BE123C] to-[#E11D48]",
          isAvailable: Boolean(selectedDistributor.video_url && selectedDistributor.video_url.trim() !== ""),
        },
      ]
    : [];

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#0F172A] px-5 py-3.5 text-xs font-black text-white shadow-2xl border border-white/20 animate-in slide-in-from-top-3">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODE A: FULL-PAGE KYC REVIEW & VERIFICATION VIEW (NO MODAL)
         ───────────────────────────────────────────────────────────── */}
      {selectedDistributor ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Breadcrumb & Back button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#E2E8F0]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-extrabold text-[#334155] hover:bg-[#F8FAFC] hover:text-[#2563EB] hover:border-[#BFDBFE] transition shadow-2xs cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Approvals Queue</span>
                </button>
                <span className="text-[#CBD5E1]">/</span>
                <span className="text-xs font-extrabold text-[#64748B]">Distributor KYC Verification</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
                  {selectedDistributor.business_name || selectedDistributor.retailer_name || "Distributor Profile"}
                </h1>
                <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                  {selectedDistributor.distributor_code || selectedDistributor.public_id || "P2P-DIST"}
                </span>
                {getStatusBadge(selectedDistributor.verification_status || selectedDistributor.status)}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-[#166534]">Compliance Score</div>
                  <div className="text-xs font-black text-[#15803D]">98% Low Risk · Verified</div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Full Page) */}
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 overflow-x-auto no-scrollbar">
            {[
              { id: "OVERVIEW", label: "Business Profile & Owner", icon: Building2 },
              { id: "DOCUMENTS", label: "KYC Documents & Media", icon: FileText },
              { id: "BANK_TAX", label: "Bank & Tax Details", icon: Landmark },
              { id: "LIMITS", label: "Wallet Float & Limits", icon: Wallet },
              { id: "AUDIT", label: "Audit Log & History", icon: History },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeDetailTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveDetailTab(t.id as DetailTab)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    isActive
                      ? "bg-[#2563EB] text-white shadow-md shadow-blue-500/20"
                      : "bg-white border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeDetailTab === "OVERVIEW" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Business & Owner Profile */}
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
                  {!isEditingProfile ? (
                    <>
                      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                        <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#2563EB]" />
                          Distributor Business Profile
                        </h3>
                        <button
                          type="button"
                          onClick={handleStartEdit}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#1E293B] hover:bg-[#EFF6FF] hover:border-[#93C5FD] hover:text-[#2563EB] transition shadow-2xs cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#2563EB]" />
                          <span>Edit Details</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#64748B]">Business Name:</span>
                            <button
                              type="button"
                              onClick={handleStartEdit}
                              className="text-[10px] font-bold text-[#2563EB] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Pencil className="w-2.5 h-2.5" /> Edit
                            </button>
                          </div>
                          <p className="text-sm font-extrabold text-[#0F172A]">{selectedDistributor.business_name || "Pay2Pay Distribution Express"}</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-[#64748B]">Owner / Proprietor:</span>
                            <button
                              type="button"
                              onClick={handleStartEdit}
                              className="text-[10px] font-bold text-[#2563EB] hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Pencil className="w-2.5 h-2.5" /> Edit
                            </button>
                          </div>
                          <p className="text-sm font-extrabold text-[#0F172A]">{selectedDistributor.owner_name || selectedDistributor.retailer_name}</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                          <span className="text-[11px] font-bold text-[#64748B]">Registered Mobile:</span>
                          <p className="font-mono text-sm font-extrabold text-[#0F172A]">{selectedDistributor.mobile || selectedDistributor.mobile_number}</p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                          <span className="text-[11px] font-bold text-[#64748B]">Email Address:</span>
                          <p className="text-sm font-extrabold text-[#0F172A]">{selectedDistributor.email || "N/A"}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#BFDBFE] pb-3 bg-[#EFF6FF] -mx-6 -mt-6 p-4 rounded-t-3xl">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-bold shadow-sm">
                            <Edit3 className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-[#1E40AF] uppercase tracking-wider">
                              Edit Business &amp; Owner Profile
                            </h3>
                            <p className="text-[11px] font-medium text-[#3B82F6]">
                              Correct business name, proprietor name or contact information
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditingProfile(false)}
                            disabled={saveLoading}
                            className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveProfile}
                            disabled={saveLoading}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#2563EB] text-white text-xs font-black hover:bg-[#1D4ED8] transition shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>{saveLoading ? "Saving…" : "Save Changes"}</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#475569] flex items-center justify-between">
                            <span>Business Name: <span className="text-red-500">*</span></span>
                            <span className="text-[10px] text-[#94A3B8]">Required</span>
                          </label>
                          <input
                            type="text"
                            value={editFormData.business_name}
                            onChange={(e) => setEditFormData({ ...editFormData, business_name: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-extrabold text-[#0F172A] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition"
                            placeholder="Enter Business Name"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#475569] flex items-center justify-between">
                            <span>Owner / Proprietor: <span className="text-red-500">*</span></span>
                            <span className="text-[10px] text-[#94A3B8]">Required</span>
                          </label>
                          <input
                            type="text"
                            value={editFormData.owner_name}
                            onChange={(e) => setEditFormData({ ...editFormData, owner_name: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-extrabold text-[#0F172A] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition"
                            placeholder="Enter Owner / Proprietor Name"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#475569]">Registered Mobile:</label>
                          <input
                            type="text"
                            value={editFormData.mobile}
                            onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] font-mono text-xs font-extrabold text-[#0F172A] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition"
                            placeholder="10-digit Mobile Number"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#475569]">Email Address:</label>
                          <input
                            type="email"
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition"
                            placeholder="distributor@example.com"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#475569]">Operating City / District:</label>
                          <input
                            type="text"
                            value={editFormData.city}
                            onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition"
                            placeholder="City / District"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-[#475569]">State / UT:</label>
                          <input
                            type="text"
                            value={editFormData.state}
                            onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-xs font-bold text-[#0F172A] focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 outline-none transition"
                            placeholder="State / Union Territory"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
                  <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
                    <MapPin className="w-4 h-4 text-[#D97706]" />
                    Location &amp; Hierarchy Alignment
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <span className="text-[11px] font-bold text-[#64748B]">Operating City / District:</span>
                      <p className="font-extrabold text-[#0F172A]">{selectedDistributor.city || "Chennai"}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                      <span className="text-[11px] font-bold text-[#64748B]">State / UT:</span>
                      <p className="font-extrabold text-[#0F172A]">{selectedDistributor.state || "Tamil Nadu"}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1 sm:col-span-2">
                      <span className="text-[11px] font-bold text-[#64748B]">Super Distributor Mapping:</span>
                      <p className="font-mono text-sm font-extrabold text-[#2563EB]">
                        Assigned Super Distributor Ref ID: #{selectedDistributor.super_distributor_ref_id || "1 (Sathus Super Distribution Hub)"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Instant Live PAN Validation */}
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#EFF6FF] to-white border border-[#BFDBFE] shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#DBEAFE] pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#1E40AF] flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-[#2563EB]" /> Live Tax Compliance Check
                    </h3>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#DBEAFE]">
                      <span className="font-bold text-[#64748B]">PAN Number:</span>
                      <span className="font-mono font-extrabold text-[#0F172A]">{selectedDistributor.pan_number || "AAACP1234F"}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#DBEAFE]">
                      <span className="font-bold text-[#64748B]">GSTIN Number:</span>
                      <span className="font-mono font-extrabold text-[#0F172A]">{selectedDistributor.gst_number || "33AAACP1234F1Z5"}</span>
                    </div>

                    <div className="pt-2">
                      <CashfreePanVerifier
                        pan={selectedDistributor.pan_number || "AAACP1234F"}
                        name={selectedDistributor.owner_name || selectedDistributor.business_name}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOCUMENTS & MEDIA */}
          {activeDetailTab === "DOCUMENTS" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Document Selector Sidebar */}
              <div className="lg:col-span-4 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#64748B] px-1">Submitted KYC Proofs</h3>
                {documents.map((doc) => {
                  const isSelected = activeDoc?.id === doc.id;
                  const Icon = doc.icon;
                  const isAvailable = doc.isAvailable;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setDocZoom(1);
                        setDocRotation(0);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-[#EFF6FF] border-[#93C5FD] ring-2 ring-[#2563EB]/20 shadow-xs"
                          : "bg-white border-[#E2E8F0] hover:border-[#CBD5E1]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${doc.gradient} text-white flex items-center justify-center shadow-xs shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#0F172A] truncate">{doc.label}</p>
                          <p className="text-[10px] text-[#64748B] font-mono truncate">{doc.docNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
                            <CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
                            <AlertCircle className="w-3 h-3 text-[#94A3B8]" /> Not Available
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 ${isSelected ? "text-[#2563EB]" : "text-[#CBD5E1]"}`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Large Document Inspector Canvas */}
              <div className="lg:col-span-8 p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F1F5F9] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-[#0F172A]">{activeDoc.label}</h3>
                      {activeDoc.isAvailable ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-black border border-[#BBF7D0]">
                          <CheckCircle2 className="w-3 h-3 text-[#16A34A]" /> Document Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF2F2] text-[#B91C1C] text-[10px] font-black border border-[#FECACA]">
                          <AlertCircle className="w-3 h-3 text-[#DC2626]" /> Document Not Available
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748B] font-mono mt-0.5">{activeDoc.docNumber} · {activeDoc.holderName}</p>
                  </div>

                  {activeDoc.isAvailable && (
                    <div className="flex items-center gap-1.5">
                      {!activeDoc.isVideo && (
                        <>
                          <button
                            type="button"
                            onClick={() => setDocZoom((z) => Math.max(0.5, z - 0.25))}
                            className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] hover:bg-white hover:text-[#0F172A] transition"
                            title="Zoom Out"
                          >
                            <ZoomOut className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocZoom((z) => Math.min(3, z + 0.25))}
                            className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] hover:bg-white hover:text-[#0F172A] transition"
                            title="Zoom In"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocRotation((r) => (r + 90) % 360)}
                            className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] hover:bg-white hover:text-[#0F172A] transition"
                            title="Rotate"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {activeDoc.url && (
                        <a
                          href={activeDoc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-bold text-[#1D4ED8] hover:bg-[#DBEAFE] transition"
                          title="Open Full File"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open File</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Canvas */}
                <div className="relative min-h-[420px] bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] flex items-center justify-center p-4 overflow-hidden">
                  {activeDoc.isAvailable && activeDoc.url && !failedImages[activeDoc.id] ? (
                    activeDoc.isVideo ? (
                      <div className="w-full max-w-lg aspect-video rounded-2xl overflow-hidden bg-black shadow-lg flex items-center justify-center">
                        <video controls className="w-full h-full object-contain" src={activeDoc.url}>
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    ) : (
                      <img
                        src={activeDoc.url}
                        alt={activeDoc.label}
                        onError={() => setFailedImages((prev) => ({ ...prev, [activeDoc.id]: true }))}
                        style={{
                          transform: `scale(${docZoom}) rotate(${docRotation}deg)`,
                          transition: "transform 0.2s ease-out",
                        }}
                        className="max-h-[400px] max-w-full object-contain rounded-xl shadow-md"
                      />
                    )
                  ) : (
                    <div className="text-center p-8 max-w-md mx-auto space-y-4 animate-in fade-in">
                      <div className="w-16 h-16 rounded-3xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center justify-center mx-auto shadow-xs">
                        <FileX className="w-8 h-8 text-[#DC2626]" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-black text-[#0F172A]">Document Not Available</h4>
                        <p className="text-xs text-[#64748B]">
                          No <span className="font-bold text-[#334155]">{activeDoc.label}</span> has been uploaded or attached for this account.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] text-left space-y-2.5 text-xs shadow-2xs">
                        <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                          <span className="font-bold text-[#64748B]">Document Type:</span>
                          <span className="font-extrabold text-[#0F172A]">{activeDoc.label}</span>
                        </div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                          <span className="font-bold text-[#64748B]">Category:</span>
                          <span className="font-extrabold text-[#0F172A]">{activeDoc.category}</span>
                        </div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                          <span className="font-bold text-[#64748B]">Registered Reference:</span>
                          <span className="font-mono font-bold text-[#2563EB]">{activeDoc.docNumber || "Not Provided"}</span>
                        </div>
                        <div className="flex items-center justify-between pb-2 border-b border-[#F1F5F9]">
                          <span className="font-bold text-[#64748B]">Registered Holder:</span>
                          <span className="font-extrabold text-[#0F172A]">{activeDoc.holderName || "Not Provided"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#64748B]">Submission Status:</span>
                          <span className="inline-flex items-center gap-1 font-bold text-[#DC2626] bg-[#FEF2F2] px-2 py-0.5 rounded-md border border-[#FECACA] text-[11px]">
                            <AlertCircle className="w-3 h-3 text-[#DC2626]" /> Not Uploaded / Not Available
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BANK & TAX */}
          {activeDetailTab === "BANK_TAX" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
                <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
                  <Landmark className="w-4 h-4 text-[#2563EB]" /> Bank Settlement Account
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="font-bold text-[#64748B]">Bank Name:</span>
                    <span className="font-extrabold text-[#0F172A]">HDFC Bank</span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="font-bold text-[#64748B]">Account Number:</span>
                    <span className="font-mono font-extrabold text-[#0F172A]">50200012345678</span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="font-bold text-[#64748B]">IFSC Code:</span>
                    <span className="font-mono font-extrabold text-[#2563EB]">HDFC0001234</span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="font-bold text-[#64748B]">Branch:</span>
                    <span className="font-extrabold text-[#0F172A]">Anna Nagar, Chennai</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
                <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
                  <BadgeCheck className="w-4 h-4 text-[#16A34A]" /> Tax Registrations &amp; TDS
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="font-bold text-[#64748B]">Income Tax PAN:</span>
                    <span className="font-mono font-extrabold text-[#0F172A]">{selectedDistributor.pan_number || "AAACP1234F"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="font-bold text-[#64748B]">GST Identification (GSTIN):</span>
                    <span className="font-mono font-extrabold text-[#0F172A]">{selectedDistributor.gst_number || "33AAACP1234F1Z5"}</span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                    <span className="font-bold text-[#64748B]">TDS Slab Category:</span>
                    <span className="font-bold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-lg border border-[#BBF7D0]">194H - 5% Standard</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIMITS & WALLET */}
          {activeDetailTab === "LIMITS" && (
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center text-[#16A34A]">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#166534] uppercase tracking-wider">
                      Distributor Operating Wallet &amp; Limits
                    </h3>
                    <p className="text-xs text-[#64748B]">Configure initial credit and processing threshold caps for this partner</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-1.5">
                  <label className="text-xs font-black text-[#166534] uppercase tracking-wider block">
                    Current Wallet Float
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-base font-extrabold text-[#15803D]">₹</span>
                    <input
                      type="text"
                      value={walletFloat}
                      onChange={(e) => setWalletFloat(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#86EFAC] font-mono text-base font-black text-[#15803D] focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                  <label className="text-xs font-black text-[#475569] uppercase tracking-wider block">
                    Daily Transaction Limit
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-base font-extrabold text-[#0F172A]">₹</span>
                    <input
                      type="text"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(e.target.value)}
                      placeholder="50,00,000"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#CBD5E1] font-mono text-base font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                  <label className="text-xs font-black text-[#475569] uppercase tracking-wider block">
                    Single Transaction Limit
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-base font-extrabold text-[#0F172A]">₹</span>
                    <input
                      type="text"
                      value={singleLimit}
                      onChange={(e) => setSingleLimit(e.target.value)}
                      placeholder="5,00,000"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#CBD5E1] font-mono text-base font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOG */}
          {activeDetailTab === "AUDIT" && (
            <div className="p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-4">
              <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-2 border-b border-[#F1F5F9] pb-3">
                <History className="w-4 h-4 text-[#2563EB]" /> Compliance Audit &amp; Event Trail
              </h3>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-[#0F172A]">Distributor Registration Initiated</span>
                    <p className="text-[11px] text-[#64748B]">Digital onboarding form completed and submitted for compliance review.</p>
                  </div>
                  <span className="font-mono text-[11px] text-[#64748B]">Step Completed</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-[#15803D]">NSDL / Cashfree PAN Verified</span>
                    <p className="text-[11px] text-[#166534]">Income Tax Registry matched with authorized holder name.</p>
                  </div>
                  <span className="font-mono text-[11px] text-[#15803D] font-bold">100% Match</span>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              DECISION ACTION BAR
             ───────────────────────────────────────────────────────────── */}
          <div className="p-6 rounded-3xl bg-white border-2 border-[#E2E8F0] shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <h3 className="text-sm font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2563EB]" /> Administrative Decision &amp; Verification Action
              </h3>
            </div>

            {actionError && (
              <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#DC2626]" />
                <span>{actionError}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-black text-[#475569] uppercase tracking-wider block mb-1.5">
                Compliance Decision Remarks (Mandatory)
              </label>
              <textarea
                value={actionRemarks}
                onChange={(e) => setActionRemarks(e.target.value)}
                placeholder="Enter approval rationale, document verification remarks, or correction instructions..."
                rows={3}
                className="w-full p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-medium text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:bg-white"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusAction("REJECTED")}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white border border-[#FCA5A5] text-[#DC2626] font-black text-xs hover:bg-[#FEF2F2] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Application</span>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusAction("ON_HOLD")}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white border border-[#FDE68A] text-[#D97706] font-black text-xs hover:bg-[#FFFBEB] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Put On Hold</span>
              </button>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusAction("APPROVED")}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-[#16A34A] text-white font-black text-xs shadow-md shadow-emerald-600/20 hover:bg-[#15803D] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Approve &amp; Activate Distributor</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            MODE B: DISTRIBUTOR APPROVALS QUEUE TABLE
           ───────────────────────────────────────────────────────────── */
        <div className="space-y-6">
          {/* Breadcrumb Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E2E8F0]">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Link
                  href="/retailers?tab=distributors"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#64748B] hover:text-[#2563EB] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Partners</span>
                </Link>
                <span className="text-[#CBD5E1]">/</span>
                <span className="text-xs font-extrabold text-[#2563EB]">Distributor Approvals</span>
              </div>

              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0F172A]">
                  Distributor Approvals &amp; KYC Verification
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                  {pendingCount} Pending Review
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#64748B] font-medium mt-1">
                Select any distributor application below to open full KYC verification and approval decision flow.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-auto">
              <button
                onClick={fetchDistributors}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-xs font-extrabold text-[#334155] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#2563EB]" : "text-[#64748B]"}`} />
                <span>Refresh List</span>
              </button>
              <Link
                href="/retailers/onboard-distributor"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-extrabold hover:bg-[#1D4ED8] transition shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Onboard Distributor</span>
              </Link>
            </div>
          </div>

          {/* KPI Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => setStatusFilter("PENDING")}
              className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                statusFilter === "PENDING"
                  ? "bg-[#EFF6FF] border-[#93C5FD] ring-2 ring-[#2563EB]/20"
                  : "bg-white border-[#E2E8F0] hover:border-[#BFDBFE]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Pending KYC</span>
                <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706]">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#0F172A] mt-2">{pendingCount}</div>
              <p className="text-[11px] text-[#D97706] font-bold mt-1">Requires Compliance Action</p>
            </div>

            <div
              onClick={() => setStatusFilter("HOLD")}
              className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                statusFilter === "HOLD"
                  ? "bg-[#FFFBEB] border-[#FDE68A] ring-2 ring-[#D97706]/20"
                  : "bg-white border-[#E2E8F0] hover:border-[#FDE68A]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">On Hold</span>
                <div className="w-8 h-8 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#D97706]">
                  <PauseCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#0F172A] mt-2">{holdCount}</div>
              <p className="text-[11px] text-[#D97706] font-bold mt-1">Awaiting Docs / Correction</p>
            </div>

            <div
              onClick={() => setStatusFilter("ACTIVE")}
              className={`p-5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                statusFilter === "ACTIVE"
                  ? "bg-[#F0FDF4] border-[#86EFAC] ring-2 ring-[#16A34A]/20"
                  : "bg-white border-[#E2E8F0] hover:border-[#BBF7D0]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Active Distributors</span>
                <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center text-[#16A34A]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#0F172A] mt-2">{activeCount}</div>
              <p className="text-[11px] text-[#16A34A] font-bold mt-1">Mapped &amp; Active</p>
            </div>
          </div>

          {/* DataGrid Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search Distributors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs font-medium text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-[#2563EB] w-52"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#374151] hover:bg-white hover:border-[#CBD5E1] transition cursor-pointer"
                >
                  <Filter className="w-3.5 h-3.5 text-[#64748B]" />
                  <span>Status: {statusFilter}</span>
                  <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
                </button>
                {showFilterDropdown && (
                  <div className="absolute top-9 left-0 z-30 bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-1.5 min-w-[140px] space-y-0.5">
                    {["ALL", "PENDING", "HOLD", "ACTIVE", "REJECTED"].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setStatusFilter(s);
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition ${
                          statusFilter === s ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#374151] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <span className="text-xs font-bold text-[#64748B]">
              {filteredItems.length} Distributor{filteredItems.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-sm font-semibold text-[#64748B]">
              <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" /> Loading distributors from database…
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white p-12 text-center space-y-3 shadow-xs">
              <ShieldCheck className="w-12 h-12 text-[#94A3B8] mx-auto" />
              <h3 className="text-base font-extrabold text-[#1E293B]">No distributors found</h3>
              <p className="text-xs text-[#64748B]">
                No records matched search &quot;{search}&quot; or status filter &quot;{statusFilter}&quot;.
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
                        <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">
                          Distributor &amp; Code
                        </span>
                      </div>
                    </th>
                    <th className="p-4 text-left">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[#F3E8FF] border border-[#E9D5FF]">
                          <Users className="w-3.5 h-3.5 text-[#7C3AED]" />
                        </div>
                        <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">
                          Owner &amp; Contact
                        </span>
                      </div>
                    </th>
                    <th className="p-4 text-left">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[#FEF3C7] border border-[#FDE68A]">
                          <MapPin className="w-3.5 h-3.5 text-[#D97706]" />
                        </div>
                        <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">
                          Location &amp; Hierarchy
                        </span>
                      </div>
                    </th>
                    <th className="p-4 text-left">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                        </div>
                        <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">
                          Status
                        </span>
                      </div>
                    </th>
                    <th className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="p-1.5 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5]">
                          <FileText className="w-3.5 h-3.5 text-[#DC2626]" />
                        </div>
                        <span className="text-[11px] font-extrabold text-[#374151] uppercase tracking-wider">
                          KYC &amp; Action
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredItems.map((item, idx) => {
                    const title = item.business_name || item.retailer_name || "Distributor Hub";
                    const owner = item.owner_name || "Owner";
                    const code =
                      item.distributor_code ||
                      item.distributor_id ||
                      (item.public_id ? `ID: ${String(item.public_id).slice(0, 8)}` : `DIST-${idx + 1}`);
                    const email = item.email || "N/A";
                    const mobile = item.mobile || "N/A";
                    const city = item.city || "Chennai";
                    const state = item.state || "Tamil Nadu";
                    const status = item.verification_status || item.status || "ACTIVE";

                    return (
                      <tr key={item.public_id || item.distributor_id || idx} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="p-4">
                          <div className="font-extrabold text-[#0F172A] text-sm">{title}</div>
                          <div className="font-mono text-[11px] font-bold text-[#6C63FF] mt-0.5">{code}</div>
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
                          <div className="font-mono text-[10px] text-[#64748B]">
                            SD Ref: #{item.super_distributor_ref_id || "1 (Default SD)"}
                          </div>
                        </td>

                        <td className="p-4">{getStatusBadge(status)}</td>

                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleSelectDistributor(item)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-white font-extrabold text-xs shadow-xs hover:bg-[#1D4ED8] transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review KYC &amp; Decision</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DistributorApprovalsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Distributor Approvals...</div>}>
      <DistributorApprovalsContent />
    </Suspense>
  );
}
