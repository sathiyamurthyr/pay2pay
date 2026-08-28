"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { ResetPasswordModal } from "@/components/ui/reset-password-modal";
import {
  Store,
  ChevronLeft,
  Building,
  CreditCard,
  FileCheck,
  Wallet,
  History,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  PauseCircle,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Building2,
  FileText,
  UserCheck,
  Copy,
  Check,
  Network,
  KeyRound,
  Settings2,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  X,
  Lock,
  Unlock,
  ShieldAlert,
  AlertTriangle,
  Shield,
} from "lucide-react";

export default function RetailerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const retailerId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [approvalComments, setApprovalComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Interactive Document Lightbox state
  const [previewModalDoc, setPreviewModalDoc] = useState<{ label: string; url: string; category?: string; docNumber?: string } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState<number>(1);
  const [lightboxRotation, setLightboxRotation] = useState<number>(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Organization Hierarchy Mapping State (Company -> Distributor -> RM)
  const [hierarchyModalOpen, setHierarchyModalOpen] = useState(false);
  const [hierarchyOptions, setHierarchyOptions] = useState<any>(null);
  const [mappingData, setMappingData] = useState<any>(null);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>("");
  const [selectedRmId, setSelectedRmId] = useState<string>("");
  const [mappingReason, setMappingReason] = useState<string>("");
  const [mappingSaving, setMappingSaving] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [mappingSuccessMsg, setMappingSuccessMsg] = useState<string | null>(null);

  const fetchMappingData = async () => {
    try {
      setMappingLoading(true);
      const res = await api.get(`/api/v1/admin/retailers/${retailerId}/mapping`);
      setMappingData(res.data);
    } catch (err) {
      console.error("Failed to load hierarchy mapping data", err);
    } finally {
      setMappingLoading(false);
    }
  };

  const openHierarchyModal = async () => {
    try {
      setMappingError(null);
      if (!hierarchyOptions) {
        const res = await api.get("/api/v1/admin/retailers/hierarchy-options");
        setHierarchyOptions(res.data);
      }
      const currComp = mappingData?.hierarchy_path?.company?.public_id || data?.company?.public_id || data?.retailer?.company_id || "";
      const currDist = mappingData?.hierarchy_path?.distributor?.public_id || data?.assigned_distributor?.public_id || data?.retailer?.mapped_distributor_id || "";
      const currRm = mappingData?.hierarchy_path?.rm?.public_id || data?.assigned_rm?.public_id || data?.retailer?.rm_id || "";
      setSelectedCompanyId(currComp);
      setSelectedDistributorId(currDist);
      setSelectedRmId(currRm);
      setMappingReason("");
      setHierarchyModalOpen(true);
    } catch (err) {
      console.error("Failed to load hierarchy options", err);
      alert("Failed to load organization hierarchy options.");
    }
  };

  const handleCompanyChange = (newCompanyId: string) => {
    setSelectedCompanyId(newCompanyId);
    setMappingError(null);
    if (hierarchyOptions && newCompanyId) {
      const comp = hierarchyOptions.companies?.find((c: any) => c.public_id === newCompanyId);
      const dists = comp?.distributors || [];
      if (!dists.some((d: any) => d.public_id === selectedDistributorId)) {
        setSelectedDistributorId("");
      }
      const rms = comp?.regional_managers || [];
      if (!rms.some((r: any) => r.public_id === selectedRmId)) {
        setSelectedRmId("");
      }
    }
  };

  const handleSaveHierarchy = async () => {
    if (!selectedCompanyId) {
      setMappingError("Please select a target Company.");
      return;
    }
    if (!selectedDistributorId) {
      setMappingError("Please select a target Distributor.");
      return;
    }
    try {
      setMappingSaving(true);
      setMappingError(null);
      await api.put(`/api/v1/admin/retailers/${retailerId}/mapping`, {
        company_id: selectedCompanyId,
        distributor_id: selectedDistributorId,
        rm_id: selectedRmId || null,
        reason: mappingReason || "Admin updated retailer organizational hierarchy mapping",
      });
      setMappingSuccessMsg("Retailer hierarchy mapped successfully!");
      setTimeout(() => setMappingSuccessMsg(null), 4000);
      setHierarchyModalOpen(false);
      await fetchDetails();
      await fetchMappingData();
    } catch (err: any) {
      setMappingError(err.response?.data?.detail || "Failed to update hierarchy mapping.");
    } finally {
      setMappingSaving(false);
    }
  };

  // MPIN Security & Lockout State
  const [mpinStatus, setMpinStatus] = useState<any>(null);
  const [mpinLoading, setMpinLoading] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [mpinReason, setMpinReason] = useState("");
  const [mpinActionLoading, setMpinActionLoading] = useState(false);
  const [mpinSuccessMsg, setMpinSuccessMsg] = useState<string | null>(null);

  const fetchMpinStatus = async () => {
    try {
      setMpinLoading(true);
      const res = await api.get(`/api/v1/admin/retailers/${retailerId}/mpin-status`);
      setMpinStatus(res.data);
    } catch (err) {
      console.error("Failed to load MPIN status", err);
    } finally {
      setMpinLoading(false);
    }
  };

  const handleUnlockMpin = async () => {
    try {
      setMpinActionLoading(true);
      const res = await api.post(`/api/v1/admin/retailers/${retailerId}/mpin/unlock`, {
        reason: mpinReason || "Admin unlocked retailer MPIN after verification",
      });
      setMpinSuccessMsg("Retailer MPIN unlocked successfully! Existing MPIN is preserved.");
      setUnlockModalOpen(false);
      setMpinReason("");
      setTimeout(() => setMpinSuccessMsg(null), 4000);
      await fetchMpinStatus();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to unlock MPIN.");
    } finally {
      setMpinActionLoading(false);
    }
  };

  const handleLockMpin = async () => {
    try {
      setMpinActionLoading(true);
      await api.post(`/api/v1/admin/retailers/${retailerId}/mpin/lock`, {
        reason: mpinReason || "Admin manually locked retailer MPIN",
      });
      setMpinSuccessMsg("Retailer MPIN locked successfully.");
      setLockModalOpen(false);
      setMpinReason("");
      setTimeout(() => setMpinSuccessMsg(null), 4000);
      await fetchMpinStatus();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to lock MPIN.");
    } finally {
      setMpinActionLoading(false);
    }
  };

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/retailers/${retailerId}`);
      setData(res.data);
      await fetchMpinStatus();
      await fetchMappingData();
    } catch (err) {
      console.error("Failed to load retailer details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (retailerId) fetchDetails();
  }, [retailerId]);

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApprovalAction = async (action: "APPROVED" | "HOLD" | "REJECTED") => {
    try {
      setActionLoading(true);
      await api.post(`/api/v1/retailers/${retailerId}/approve`, {
        action,
        remarks: approvalComments || `Action ${action} executed by Enterprise Admin`,
      });
      fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.detail || `Failed to execute action ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const availableDistributors = React.useMemo(() => {
    if (!hierarchyOptions) return [];
    if (selectedCompanyId) {
      const matchedCompany = hierarchyOptions.companies?.find((c: any) => c.public_id === selectedCompanyId);
      if (matchedCompany && matchedCompany.distributors) {
        return matchedCompany.distributors;
      }
      return [];
    }
    return hierarchyOptions.distributors || [];
  }, [hierarchyOptions, selectedCompanyId]);

  const availableRms = React.useMemo(() => {
    if (!hierarchyOptions) return [];
    if (selectedCompanyId) {
      const matchedCompany = hierarchyOptions.companies?.find((c: any) => c.public_id === selectedCompanyId);
      if (matchedCompany && matchedCompany.regional_managers) {
        return matchedCompany.regional_managers;
      }
      return [];
    }
    return hierarchyOptions.regional_managers || [];
  }, [hierarchyOptions, selectedCompanyId]);

  const selectedCompanyObj = React.useMemo(() => {
    if (!hierarchyOptions || !selectedCompanyId) return null;
    return hierarchyOptions.companies?.find((c: any) => c.public_id === selectedCompanyId);
  }, [hierarchyOptions, selectedCompanyId]);

  const selectedDistObj = React.useMemo(() => {
    if (!availableDistributors || !selectedDistributorId) return null;
    return availableDistributors.find((d: any) => d.public_id === selectedDistributorId) || hierarchyOptions?.distributors?.find((d: any) => d.public_id === selectedDistributorId);
  }, [availableDistributors, hierarchyOptions, selectedDistributorId]);

  const selectedRmObj = React.useMemo(() => {
    if (!availableRms || !selectedRmId) return null;
    return availableRms.find((r: any) => r.public_id === selectedRmId) || hierarchyOptions?.regional_managers?.find((r: any) => r.public_id === selectedRmId);
  }, [availableRms, hierarchyOptions, selectedRmId]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center py-20 gap-3 text-sm font-semibold text-[#64748B]">
        <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" /> Loading Retailer Profile…
      </div>
    );
  }

  if (!data || !data.retailer) {
    return (
      <div className="flex flex-col h-96 items-center justify-center py-20 gap-4 text-center">
        <div className="p-3 rounded-2xl bg-red-50 text-red-600 border border-red-200">
          <XCircle className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-[#0F172A]">Retailer Profile Not Found</h3>
          <p className="text-xs text-[#64748B] mt-1">Unable to load details for ID: {retailerId}</p>
        </div>
        <button
          onClick={() => fetchDetails()}
          className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-[#1D4ED8] transition-all cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const {
    retailer = {},
    contacts = [],
    addresses = [],
    banks = [],
    kyc = {},
    documents = [],
    wallet = {},
    status_history = [],
    hierarchy = {},
    assigned_distributor = null,
    assigned_sd = null,
    assigned_rm = null,
    company = null,
  } = data;

  const primaryContact = contacts && contacts.length > 0 ? contacts[0] : null;
  const primaryAddress = addresses && addresses.length > 0 ? addresses[0] : null;
  const primaryBank = banks && banks.length > 0 ? banks[0] : null;

  const emailVal = primaryContact?.email || retailer.email || "—";
  const mobileVal = primaryContact?.mobile || retailer.mobile || "—";
  const panVal = kyc?.pan_number || kyc?.pan || retailer.pan_number || "—";
  const gstVal = kyc?.gst_number || kyc?.gst || retailer.gst_number || "—";
  const bankNameVal = primaryBank?.settlement_bank_name || primaryBank?.bank_name || retailer.settlement_bank_name || "—";
  const accNoVal = primaryBank?.account_number || retailer.account_number || "—";
  const ifscVal = primaryBank?.ifsc || retailer.ifsc || "—";

  // Dynamic Document Catalog from DB
  const docList = (documents && documents.length > 0 ? documents : [
    {
      id: "aadhaar_front",
      type: "AADHAAR_FRONT",
      label: "Aadhaar Card Front",
      category: "Identity Proof",
      url: kyc?.aadhaar_front_url || null,
      doc_number: kyc?.aadhaar_number || "—",
      is_uploaded: !!kyc?.aadhaar_front_url
    },
    {
      id: "aadhaar_back",
      type: "AADHAAR_BACK",
      label: "Aadhaar Card Back",
      category: "Address Proof",
      url: kyc?.aadhaar_back_url || null,
      doc_number: kyc?.aadhaar_number || "—",
      is_uploaded: !!kyc?.aadhaar_back_url
    },
    {
      id: "pan_card",
      type: "PAN",
      label: "PAN Card Document",
      category: "Tax Verification",
      url: kyc?.pan_card_url || null,
      doc_number: panVal,
      is_uploaded: !!kyc?.pan_card_url
    },
    {
      id: "business_proof",
      type: "GST_CERT",
      label: "Business / GST Proof",
      category: "Enterprise Proof",
      url: kyc?.business_proof_url || null,
      doc_number: gstVal,
      is_uploaded: !!kyc?.business_proof_url
    },
    {
      id: "bank_proof",
      type: "BANK_PROOF",
      label: "Bank Passbook / Cheque",
      category: "Settlement Account",
      url: kyc?.bank_proof_url || null,
      doc_number: accNoVal,
      is_uploaded: !!kyc?.bank_proof_url
    },
    {
      id: "shop_photo",
      type: "SHOP_PHOTO",
      label: "Shop Exterior Photo",
      category: "Storefront Geotagged",
      url: kyc?.shop_photo_url || null,
      doc_number: retailer.store_name,
      is_uploaded: !!kyc?.shop_photo_url
    },
    {
      id: "video_kyc",
      type: "VIDEO",
      label: "Live Video KYC",
      category: "Biometric Liveness",
      url: kyc?.video_url || null,
      is_video: true,
      doc_number: retailer.retailer_code,
      is_uploaded: !!kyc?.video_url
    },
    {
      id: "selfie",
      type: "SELFIE",
      label: "Selfie / Profile Photo",
      category: "Biometric Identity",
      url: kyc?.selfie_url || null,
      doc_number: retailer.owner_name,
      is_uploaded: !!kyc?.selfie_url
    },
  ]);

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "ACTIVE":
      case "VERIFIED":
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] text-[11px] font-extrabold border border-[#BBF7D0]">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active & Approved
          </span>
        );
      case "HOLD":
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
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pending Approval
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E2E8F0] pb-5">
        <div className="flex items-center gap-4">
          <Link
            href="/retailers"
            className="flex items-center justify-center w-10 h-10 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
                <Store className="w-7 h-7 text-[#2563EB]" /> {retailer.store_name}
              </h1>

              <button
                onClick={() => copyToClipboard(retailer.retailer_code, "retailer_code")}
                className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#2563EB] px-2.5 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] transition-all cursor-pointer"
                title="Click to copy code"
              >
                {retailer.retailer_code}
                {copiedField === "retailer_code" ? (
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#2563EB]" />
                )}
              </button>

              {getStatusBadge(retailer.status)}
            </div>
            <p className="mt-1 text-xs font-medium text-[#64748B]">
              Legal Name: <strong className="text-[#334155]">{retailer.legal_name}</strong> | Owner: <strong className="text-[#334155]">{retailer.owner_name}</strong>
            </p>
          </div>
        </div>

        {/* Approval Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/retailers/${retailerId}/controller`}
            id="open-controller-btn"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#7C3AED] text-xs font-extrabold text-white hover:bg-[#6D28D9] cursor-pointer shadow-sm transition-all"
          >
            <Settings2 className="w-4 h-4" /> Open Controller
          </Link>

          <button
            onClick={() => setResetModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-extrabold text-[#475569] hover:bg-[#EFF6FF] hover:text-[#2563EB] hover:border-[#BFDBFE] cursor-pointer shadow-2xs"
          >
            <KeyRound className="w-4 h-4 text-[#2563EB]" /> Reset Password
          </button>

          {/* MPIN Status & Quick Unlock */}
          {mpinStatus?.mpin_locked ? (
            <button
              onClick={() => {
                setMpinReason("");
                setUnlockModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-black text-white shadow-md animate-pulse cursor-pointer"
              title="Retailer MPIN is locked! Click to unlock."
            >
              <Lock className="w-4 h-4" /> Unlock MPIN (Locked)
            </button>
          ) : (
            <button
              onClick={() => {
                setMpinReason("");
                setLockModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-2xs"
              title="MPIN is active. Click to manually lock if needed."
            >
              <Unlock className="w-4 h-4 text-emerald-600" /> MPIN Active
            </button>
          )}

          <button
            onClick={() => handleApprovalAction("APPROVED")}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#16A34A] text-xs font-extrabold text-white shadow-xs hover:bg-[#15803D] cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> Approve & Activate
          </button>
          <button
            onClick={() => handleApprovalAction("HOLD")}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] text-xs font-extrabold text-[#92400E] hover:bg-[#FEF3C7] cursor-pointer"
          >
            <PauseCircle className="w-4 h-4 text-[#D97706]" /> Hold
          </button>
          <button
            onClick={() => handleApprovalAction("REJECTED")}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] text-xs font-extrabold text-[#991B1B] hover:bg-[#FEE2E2] cursor-pointer"
          >
            <XCircle className="w-4 h-4 text-[#DC2626]" /> Reject
          </button>
        </div>
      </div>

      {/* Row-Wise Sections */}
      <div className="space-y-6">
        {/* ROW 1: Store Profile & Hierarchy Mapping */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                1. Store Identity & Hierarchy Mapping
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Retailer Code</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#2563EB]">{retailer.retailer_code}</span>
                <button
                  onClick={() => copyToClipboard(retailer.retailer_code, "retailer_code")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB]"
                >
                  {copiedField === "retailer_code" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Business Category</span>
              <div className="text-sm font-bold text-[#0F172A]">{retailer.business_category}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Store Type</span>
              <div className="text-sm font-bold text-[#0F172A]">{retailer.store_type}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Registration Date</span>
              <div className="text-sm font-bold text-[#0F172A]">{new Date(retailer.created_date).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* ROW 2: Retailer Hierarchy Mapping (Company -> Distributor -> RM) */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-[#4F46E5]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                2. Retailer Hierarchy Mapping (Company, Distributor, RM)
              </h2>
            </div>
            <button
              onClick={openHierarchyModal}
              id="map-hierarchy-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] transition-all cursor-pointer shadow-md"
            >
              <Building2 className="w-3.5 h-3.5" /> Edit Hierarchy Mapping
            </button>
          </div>

          {mappingSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {mappingSuccessMsg}
            </div>
          )}

          {/* Visual Hierarchy Flow Path */}
          <div className="rounded-xl border border-[#E2E8F0] bg-gradient-to-r from-[#F8FAFC] via-[#EFF6FF] to-[#FAF5FF] p-3.5 flex items-center gap-2 overflow-x-auto text-xs font-extrabold">
            <span className="text-[#64748B] text-[11px] uppercase tracking-wider shrink-0 mr-1">Hierarchy Path:</span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-200 shrink-0 flex items-center gap-1">
              🏢 {mappingData?.hierarchy_path?.company?.company_name || company?.company_name || "Pay2Pay Enterprise"}
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0 flex items-center gap-1">
              🏬 {mappingData?.hierarchy_path?.distributor?.business_name || assigned_distributor?.business_name || "Direct Distributor"}
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0 flex items-center gap-1">
              👔 {mappingData?.hierarchy_path?.rm?.full_name || assigned_rm?.full_name || "Direct / Unassigned RM"}
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 border border-purple-200 shrink-0 flex items-center gap-1">
              🏪 {retailer.store_name}
            </span>
          </div>

          {/* 4 Tier Grid Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            {/* Company */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Parent Company</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  {mappingData?.hierarchy_path?.company?.company_code || company?.company_code || "PAY2PAY"}
                </span>
              </div>
              <div className="text-sm font-bold text-[#0F172A]">{mappingData?.hierarchy_path?.company?.company_name || company?.company_name || "Pay2Pay"}</div>
              <div className="text-[11px] text-[#64748B] truncate">{mappingData?.hierarchy_path?.company?.legal_name || company?.legal_name || "Enterprise Parent"}</div>
            </div>

            {/* Distributor */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Distributor</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Tier 1
                </span>
              </div>
              <div className="text-sm font-bold text-[#0F172A] truncate">{mappingData?.hierarchy_path?.distributor?.business_name || assigned_distributor?.business_name || "Direct Merchant"}</div>
              <div className="text-[11px] text-[#64748B] truncate">{mappingData?.hierarchy_path?.distributor?.owner_name || assigned_distributor?.owner_name || assigned_distributor?.mobile || "—"}</div>
            </div>

            {/* Regional Manager */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Regional Manager (RM)</span>
                {(mappingData?.hierarchy_path?.rm?.employee_code || assigned_rm?.employee_code) && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">
                    {mappingData?.hierarchy_path?.rm?.employee_code || assigned_rm?.employee_code}
                  </span>
                )}
              </div>
              <div className="text-sm font-bold text-[#0F172A] truncate">{mappingData?.hierarchy_path?.rm?.full_name || assigned_rm?.full_name || "Direct / Unassigned"}</div>
              <div className="text-[11px] text-[#64748B] truncate">{mappingData?.hierarchy_path?.rm?.mobile || assigned_rm?.mobile || assigned_rm?.email || "—"}</div>
            </div>

            {/* Retailer Node */}
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Retailer Status</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                  {retailer.retailer_code}
                </span>
              </div>
              <div className="text-sm font-bold text-[#0F172A] truncate">{retailer.store_name}</div>
              <div className="text-[11px] text-[#64748B] truncate">{retailer.owner_name} • {retailer.status}</div>
            </div>
          </div>

          {/* Section 2.1: Assignment & Transfer History */}
          <div className="pt-3 border-t border-[#F1F5F9] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-[#475569] uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#2563EB]" /> Hierarchy Assignment & Transfer History
              </span>
              <span className="text-[11px] font-semibold text-[#64748B]">
                {mappingData?.history?.length || 0} Total Recorded Assignment(s)
              </span>
            </div>

            {mappingData?.history && mappingData.history.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-extrabold text-[#475569] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Effective Period</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Company</th>
                      <th className="py-2.5 px-3">Distributor</th>
                      <th className="py-2.5 px-3">Regional Manager (RM)</th>
                      <th className="py-2.5 px-3">Changed By</th>
                      <th className="py-2.5 px-3">Audit Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9] bg-white">
                    {mappingData.history.map((hist: any, idx: number) => (
                      <tr key={hist.assignment_id || idx} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-[#334155]">
                          <div>{hist.effective_from ? new Date(hist.effective_from).toLocaleDateString() : "—"}</div>
                          <span className="text-[10px] text-[#64748B]">
                            {hist.is_active ? "Current Active" : hist.effective_to ? `until ${new Date(hist.effective_to).toLocaleDateString()}` : "Closed"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {hist.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-extrabold border border-[#BBF7D0]">
                              <CheckCircle2 className="w-3 h-3" /> ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] text-[10px] font-bold border border-[#E2E8F0]">
                              PREVIOUS
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A] whitespace-nowrap">
                          🏢 {hist.company_name}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A] whitespace-nowrap">
                          🏬 {hist.distributor_name}
                        </td>
                        <td className="py-2.5 px-3 text-[#334155] whitespace-nowrap">
                          👔 {hist.rm_name || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#64748B] whitespace-nowrap">
                          {hist.created_by || "System"}
                        </td>
                        <td className="py-2.5 px-3 text-[#475569] max-w-xs truncate">
                          {hist.reason || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-[#94A3B8] italic bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
                No historical hierarchy transfers recorded yet. Current mapping is active.
              </div>
            )}
          </div>
        </div>

        {/* ROW 3: Primary Contact & Address Details */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#16A34A]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                3. Owner Contact & Physical Outlet Address
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Owner Full Name</span>
              <div className="text-sm font-bold text-[#0F172A]">{retailer.owner_name}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Mobile Number</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#0F172A]">{mobileVal}</span>
                <button
                  onClick={() => copyToClipboard(mobileVal, "mobile")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB]"
                >
                  {copiedField === "mobile" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Corporate Email</span>
              <div className="flex items-center justify-between truncate">
                <span className="font-bold text-[#0F172A] truncate">{emailVal}</span>
                <button
                  onClick={() => copyToClipboard(emailVal, "email")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB] shrink-0"
                >
                  {copiedField === "email" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5 text-xs">
            <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#2563EB]" /> Physical Outlet Address
            </span>
            <div className="font-bold text-[#0F172A]">
              {primaryAddress
                ? [primaryAddress.address, primaryAddress.city, primaryAddress.state ? `${primaryAddress.state} - ${primaryAddress.pincode || ""}` : primaryAddress.pincode].filter(Boolean).join(", ")
                : retailer.address
                  ? [retailer.address, retailer.city, retailer.state ? `${retailer.state} - ${retailer.pincode || ""}` : retailer.pincode].filter(Boolean).join(", ")
                  : "—"}
            </div>
          </div>
        </div>

        {/* ROW 4: Settlement Bank Account */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#F59E0B]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                4. Settlement Banking & Payout Details
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Bank Name</span>
              <div className="font-bold text-[#0F172A]">{bankNameVal}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Account Holder</span>
              <div className="font-bold text-[#0F172A]">{primaryBank?.account_holder || retailer.owner_name}</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Account Number</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#2563EB]">{accNoVal}</span>
                <button
                  onClick={() => copyToClipboard(accNoVal, "account_number")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB]"
                >
                  {copiedField === "account_number" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">IFSC Code</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-[#0F172A]">{ifscVal}</span>
                <button
                  onClick={() => copyToClipboard(ifscVal, "ifsc")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB]"
                >
                  {copiedField === "ifsc" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 5: KYC Verification & B2 Document Storage */}
        <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#DBEAFE] pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-extrabold text-[#1E40AF] uppercase tracking-wider">
                5. KYC Identifiers & Uploaded Documents (Backblaze B2 Storage)
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-white border border-[#93C5FD] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">PAN Number</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-extrabold text-[#0F172A]">{panVal}</span>
                <button
                  onClick={() => copyToClipboard(panVal, "pan_number")}
                  className="p-1 text-[#64748B] hover:text-[#2563EB]"
                >
                  {copiedField === "pan_number" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#93C5FD] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">GST Number</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-extrabold text-[#0F172A]">{gstVal || "Not Provided"}</span>
                {gstVal && (
                  <button
                    onClick={() => copyToClipboard(gstVal, "gst_number")}
                    className="p-1 text-[#64748B] hover:text-[#2563EB]"
                  >
                    {copiedField === "gst_number" ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Document Preview & Interactive Inspection Cards */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Verification & Compliance Documents</h3>
              <span className="text-[11px] font-bold text-[#2563EB] bg-[#DBEAFE] px-2.5 py-0.5 rounded-full">
                {docList.filter((d: any) => d.is_uploaded).length} of {docList.length} Uploaded
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {docList.map((doc: any, idx: number) => {
                const isUploaded = Boolean(doc.is_uploaded && doc.url);
                const isPdf = isUploaded && doc.url.toLowerCase().includes(".pdf");
                const isVid = isUploaded && (doc.is_video || doc.url.toLowerCase().includes(".mp4") || doc.url.toLowerCase().includes(".webm"));
                const hasFailed = failedImages[doc.id];

                return (
                  <div
                    key={doc.id || idx}
                    className={`flex flex-col bg-white rounded-2xl border transition-all duration-200 overflow-hidden group ${isUploaded
                        ? "border-[#CBD5E1] hover:border-[#2563EB] shadow-xs hover:shadow-md"
                        : "border-[#E2E8F0] opacity-80"
                      }`}
                  >
                    {/* Header */}
                    <div className="p-3 bg-gradient-to-r from-[#F8FAFC] to-[#EFF6FF] border-b border-[#E2E8F0] flex items-center justify-between">
                      <div className="truncate">
                        <h4 className="text-xs font-black text-[#0F172A] truncate leading-tight">{doc.label}</h4>
                        <p className="text-[10px] font-bold text-[#64748B] truncate">{doc.category}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border shrink-0 ${!isUploaded
                            ? "bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]"
                            : isPdf
                              ? "bg-red-50 text-red-700 border-red-200"
                              : isVid
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]"
                          }`}
                      >
                        {!isUploaded ? "NOT UPLOADED" : isPdf ? "PDF" : isVid ? "VIDEO" : "IMAGE"}
                      </span>
                    </div>

                    {/* Preview Box */}
                    <div
                      onClick={() => {
                        if (!isUploaded) return;
                        setPreviewModalDoc({
                          label: doc.label,
                          url: doc.url,
                          category: doc.category,
                          docNumber: doc.doc_number || doc.docNumber,
                          isVideo: isVid
                        });
                        setLightboxZoom(1);
                        setLightboxRotation(0);
                      }}
                      className={`relative h-36 w-full overflow-hidden flex items-center justify-center select-none ${isUploaded ? "bg-[#0F172A] cursor-pointer" : "bg-[#F8FAFC]"
                        }`}
                    >
                      {!isUploaded ? (
                        <div className="flex flex-col items-center justify-center gap-1.5 p-3 text-[#94A3B8]">
                          <FileText className="w-8 h-8 opacity-40 text-[#94A3B8]" />
                          <span className="text-[11px] font-bold text-[#64748B]">Document Not Uploaded</span>
                          <span className="text-[9px] text-[#94A3B8]">Skipped or Pending</span>
                        </div>
                      ) : isPdf ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3 bg-gradient-to-b from-[#1E293B] to-[#0F172A] text-white">
                          <div className="p-2.5 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 group-hover:scale-110 transition-transform">
                            <FileText className="w-7 h-7" />
                          </div>
                          <span className="text-[11px] font-black text-slate-200">PDF Document</span>
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-[9px] font-bold text-blue-300">
                            Click to Inspect
                          </span>
                        </div>
                      ) : isVid ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                          <video src={doc.url} muted preload="metadata" className="w-full h-full object-cover opacity-70" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <ZoomIn className="w-4 h-4" />
                            </div>
                          </div>
                          <span className="absolute bottom-2 text-[9px] font-bold text-slate-300 bg-black/60 px-2 py-0.5 rounded">
                            Video Recording
                          </span>
                        </div>
                      ) : !hasFailed ? (
                        <>
                          <img
                            src={doc.url}
                            alt={doc.label}
                            onError={() => setFailedImages((prev) => ({ ...prev, [doc.id]: true }))}
                            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-[#0F172A]/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white backdrop-blur-[2px]">
                            <div className="p-2 rounded-full bg-[#2563EB] text-white shadow-lg">
                              <ZoomIn className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black tracking-wide">Enlarge</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full p-3 flex flex-col justify-between bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white">
                          <div className="flex items-center justify-between">
                            <ShieldCheck className="w-4 h-4 text-[#60A5FA]" />
                            <span className="text-[9px] font-bold text-emerald-400">UPLOADED</span>
                          </div>
                          <div className="my-auto">
                            <p className="text-[9px] text-slate-400 uppercase">Document Number</p>
                            <p className="font-mono text-xs font-bold text-blue-300 truncate">{doc.doc_number || doc.docNumber}</p>
                          </div>
                          <span className="text-[9px] text-blue-400 font-bold flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Inspect
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="p-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between gap-1.5">
                      {isUploaded ? (
                        <>
                          <button
                            onClick={() => copyToClipboard(doc.url, doc.id)}
                            className="px-2 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-[#475569] hover:text-[#0F172A] text-[10px] font-bold flex items-center gap-1 hover:bg-[#F1F5F9] transition-all cursor-pointer"
                            title="Copy URL"
                          >
                            {copiedField === doc.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>Copy URL</span>
                          </button>
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[10px] font-extrabold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open</span>
                          </a>
                        </>
                      ) : (
                        <span className="text-[10px] font-medium text-[#94A3B8] italic py-1">
                          No file available
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ROW 6: Wallet Balances & Operating Limits */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#16A34A]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                6. Wallet Balances & Operating Limits
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] space-y-1">
              <span className="text-[11px] font-extrabold text-[#166534] uppercase tracking-wider block">Current Wallet Float</span>
              <div className="font-mono text-2xl font-extrabold text-[#15803D]">
                ₹{wallet?.balance ? wallet.balance.toLocaleString("en-IN") : "0.00"}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Daily Transaction Limit</span>
              <div className="font-mono text-lg font-bold text-[#0F172A]">
                ₹{wallet?.daily_limit ? wallet.daily_limit.toLocaleString("en-IN") : "50,00,000"}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">Single Transaction Limit</span>
              <div className="font-mono text-lg font-bold text-[#0F172A]">
                ₹{wallet?.single_limit ? wallet.single_limit.toLocaleString("en-IN") : "5,00,000"}
              </div>
            </div>
          </div>
        </div>

        {/* ROW 7: Status Audit History */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#64748B]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                7. Status Audit History
              </h2>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {status_history && status_history.length > 0 ? (
              status_history.map((h: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div>
                    <span className="font-bold text-[#334155]">{h.previous_status || h.previous || "DRAFT"}</span> → <span className="font-bold text-[#16A34A]">{h.new_status || h.new || h.status}</span>
                    <div className="text-[#64748B] mt-0.5 font-medium">{h.reason || "Status updated"}</div>
                  </div>
                  <div className="text-right text-[#64748B] font-mono text-[11px]">
                    <div>{h.changed_by_email || h.by || "system"}</div>
                    <div>{new Date(h.created_date || h.date || Date.now()).toLocaleString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#0F172A]">
                No previous status changes recorded. Profile active.
              </div>
            )}
          </div>
        </div>
        {/* ROW 8: MPIN Security & Lockout Management */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                8. MPIN Security & Lockout Management
              </h2>
            </div>
            {mpinSuccessMsg && (
              <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-700 animate-in fade-in">
                {mpinSuccessMsg}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Status Card */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              mpinStatus?.mpin_locked 
                ? "bg-red-50/70 border-red-200 text-red-900" 
                : "bg-emerald-50/70 border-emerald-200 text-emerald-900"
            }`}>
              <span className="text-[11px] font-extrabold uppercase tracking-wider block opacity-75">
                MPIN Authentication Status
              </span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {mpinStatus?.mpin_locked ? (
                    <>
                      <Lock className="w-5 h-5 text-red-600" />
                      <span className="text-base font-black text-red-700 uppercase">LOCKED</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-5 h-5 text-emerald-600" />
                      <span className="text-base font-black text-emerald-700 uppercase">UNLOCKED / ACTIVE</span>
                    </>
                  )}
                </div>
                {mpinStatus?.mpin_locked ? (
                  <button
                    onClick={() => {
                      setMpinReason("");
                      setUnlockModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-xs cursor-pointer"
                  >
                    Unlock MPIN
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMpinReason("");
                      setLockModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-700 text-[11px] font-bold cursor-pointer"
                  >
                    Manual Lock
                  </button>
                )}
              </div>
            </div>

            {/* Failed Attempts Counter */}
            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">
                Failed Attempts Counter
              </span>
              <div className="flex items-center justify-between">
                <div className="font-mono text-xl font-black text-[#0F172A]">
                  {mpinStatus?.mpin_failed_attempts ?? 0} / {mpinStatus?.mpin_max_attempts ?? 5}
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  (mpinStatus?.mpin_failed_attempts ?? 0) >= (mpinStatus?.mpin_max_attempts ?? 5)
                    ? "bg-red-100 text-red-700"
                    : (mpinStatus?.mpin_failed_attempts ?? 0) > 0
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  {(mpinStatus?.mpin_failed_attempts ?? 0) >= (mpinStatus?.mpin_max_attempts ?? 5)
                    ? "Max Reached"
                    : (mpinStatus?.mpin_failed_attempts ?? 0) > 0
                    ? "Warning"
                    : "Normal"}
                </span>
              </div>
            </div>

            {/* Lockout & Unlock Timestamps */}
            <div className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-1.5">
              <span className="text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider block">
                Lockout & Audit Timestamps
              </span>
              <div className="text-[11px] text-[#334155] space-y-1 font-medium">
                <div>
                  <span className="text-[#64748B]">Locked At: </span>
                  <span className="font-mono font-bold">
                    {mpinStatus?.mpin_locked_at ? new Date(mpinStatus.mpin_locked_at).toLocaleString() : "None (Active)"}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B]">Last Unlocked: </span>
                  <span className="font-mono font-bold">
                    {mpinStatus?.mpin_unlocked_at ? new Date(mpinStatus.mpin_unlocked_at).toLocaleString() : "Never"}
                  </span>
                </div>
                {mpinStatus?.mpin_unlocked_by && (
                  <div>
                    <span className="text-[#64748B]">Unlocked By: </span>
                    <span className="font-mono font-bold text-blue-600 truncate">{mpinStatus.mpin_unlocked_by}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Security & MPIN Rule Note */}
          <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 flex items-start gap-2.5 text-xs text-[#1E293B]">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-900 block mb-0.5">Enterprise MPIN Policy</span>
              <p className="text-[#475569] leading-relaxed">
                Unlocking this retailer resets the failed attempts counter to 0 and clears the locked flag. 
                <strong className="text-[#1E293B]"> The retailer's existing MPIN is strictly preserved and not changed or reset.</strong> All unlock and lock actions are recorded in the immutable audit log.
              </p>
            </div>
          </div>

          {/* MPIN Audit Trail */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#334155] uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#64748B]" /> Recent MPIN Security Logs
              </span>
              <button
                onClick={fetchMpinStatus}
                disabled={mpinLoading}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${mpinLoading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            {mpinStatus?.audit_history && mpinStatus.audit_history.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-extrabold text-[#64748B] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Operator / Source</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">IP Address</th>
                      <th className="py-2.5 px-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] font-medium text-[#334155]">
                    {mpinStatus.audit_history.map((log: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            log.action === "UNLOCKED"
                              ? "bg-emerald-100 text-emerald-800"
                              : log.action === "LOCKED" || log.action === "MANUAL_LOCKED"
                              ? "bg-red-100 text-red-800"
                              : log.action === "FAILED_ATTEMPT"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#475569]">
                          {log.performed_by_name || log.performed_by || "System"}
                        </td>
                        <td className="py-2.5 px-3 text-[#1E293B]">
                          {log.reason || "—"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#64748B]">
                          {log.ip_address || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[11px] text-[#64748B]">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-center text-xs text-[#64748B]">
                No security lockout logs recorded for this retailer.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Unlock MPIN Confirmation Modal */}
      {unlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Unlock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">Unlock Retailer MPIN</h3>
                  <p className="text-xs text-[#64748B]">{retailer.store_name} ({retailer.retailer_code})</p>
                </div>
              </div>
              <button
                onClick={() => setUnlockModalOpen(false)}
                className="p-2 text-[#94A3B8] hover:text-[#0F172A] rounded-xl hover:bg-[#F1F5F9] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Unlock Action Summary
                </p>
                <ul className="list-disc pl-5 space-y-1 text-emerald-800 text-[11px]">
                  <li>Failed attempts counter will be reset to <strong>0</strong>.</li>
                  <li>Account lockout flag will be set to <strong>false</strong>.</li>
                  <li>Retailer's <strong>existing MPIN remains unchanged</strong>.</li>
                </ul>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#475569] uppercase tracking-wider mb-1.5">
                  Audit Reason for Unlock *
                </label>
                <textarea
                  rows={2}
                  value={mpinReason}
                  onChange={(e) => setMpinReason(e.target.value)}
                  placeholder="e.g., Retailer verified identity via phone OTP after 5 wrong attempts."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-medium text-[#0F172A] focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setUnlockModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-extrabold text-[#475569] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mpinActionLoading}
                onClick={handleUnlockMpin}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black text-white shadow-md cursor-pointer disabled:opacity-50"
              >
                {mpinActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                <span>Confirm & Unlock MPIN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Manual Lock MPIN Confirmation Modal */}
      {lockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">Lock Retailer MPIN</h3>
                  <p className="text-xs text-[#64748B]">{retailer.store_name} ({retailer.retailer_code})</p>
                </div>
              </div>
              <button
                onClick={() => setLockModalOpen(false)}
                className="p-2 text-[#94A3B8] hover:text-[#0F172A] rounded-xl hover:bg-[#F1F5F9] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-red-50/80 border border-red-200 text-red-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-red-900">
                  <ShieldAlert className="w-4 h-4 text-red-600" /> Lockout Warning
                </p>
                <p className="text-red-800 text-[11px]">
                  The retailer will be blocked from performing all MPIN-authenticated operations until unlocked by an Administrator.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-[#475569] uppercase tracking-wider mb-1.5">
                  Audit Reason for Lockout *
                </label>
                <textarea
                  rows={2}
                  value={mpinReason}
                  onChange={(e) => setMpinReason(e.target.value)}
                  placeholder="e.g., Suspicious device transaction flagged by risk monitoring."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-medium text-[#0F172A] focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setLockModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-extrabold text-[#475569] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mpinActionLoading}
                onClick={handleLockMpin}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-black text-white shadow-md cursor-pointer disabled:opacity-50"
              >
                {mpinActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Lock MPIN Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hierarchy Mapping Modal */}
      {hierarchyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[#0F172A]">Map Organization Hierarchy</h3>
                  <p className="text-xs text-[#64748B]">Assign {retailer.store_name} to a Company & Distributor</p>
                </div>
              </div>
              <button
                onClick={() => setHierarchyModalOpen(false)}
                className="p-2 text-[#94A3B8] hover:text-[#0F172A] rounded-xl hover:bg-[#F1F5F9] transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Company Selection */}
              <div>
                <label className="block text-[11px] font-extrabold text-[#475569] uppercase tracking-wider mb-1.5">
                  Select Company
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    setSelectedDistributorId("");
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                >
                  <option value="">-- Choose Company --</option>
                  {hierarchyOptions?.companies?.map((c: any) => (
                    <option key={c.public_id} value={c.public_id}>
                      {c.company_name} ({c.company_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Distributor Selection */}
              <div>
                <label className="block text-[11px] font-extrabold text-[#475569] uppercase tracking-wider mb-1.5">
                  Select Mapped Distributor
                </label>
                <select
                  value={selectedDistributorId}
                  onChange={(e) => setSelectedDistributorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                >
                  <option value="">-- Choose Distributor --</option>
                  {availableDistributors.map((d: any) => (
                    <option key={d.public_id} value={d.public_id}>
                      {d.business_name} ({d.owner_name} - {d.mobile})
                    </option>
                  ))}
                </select>
                {availableDistributors.length === 0 && selectedCompanyId && (
                  <p className="text-[11px] text-amber-600 font-medium mt-1">
                    No distributors found directly under this company. All available distributors will be listed.
                  </p>
                )}
              </div>

              {/* Live Hierarchy Path Preview */}
              {selectedCompanyObj && (
                <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">Hierarchy Assignment Preview</span>
                  <div className="text-xs font-bold text-[#1E293B] flex items-center gap-1.5 flex-wrap">
                    <span className="text-blue-700">🏢 {selectedCompanyObj.company_name}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-indigo-700">👔 {selectedCompanyObj.regional_managers?.[0]?.full_name || "Regional Manager"}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-amber-700">🏬 {selectedCompanyObj.super_distributors?.[0]?.business_name || "Super Distributor"}</span>
                    <span className="text-slate-400">→</span>
                    <span className="text-emerald-700">🤝 {selectedDistObj?.business_name || "Select Distributor"}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => setHierarchyModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-extrabold text-[#475569] hover:bg-[#F8FAFC]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={mappingSaving || !selectedCompanyId}
                onClick={handleSaveHierarchy}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2563EB] text-xs font-extrabold text-white hover:bg-[#1D4ED8] disabled:opacity-50 shadow-sm cursor-pointer"
              >
                {mappingSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save Hierarchy Mapping</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && retailer && (
        <ResetPasswordModal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          targetName={retailer.store_name || retailer.legal_name || "Retailer"}
          targetCodeOrEmail={retailer.retailer_code || retailer.email}
          onSubmit={async (newPassword) => {
            await api.post(`/api/v1/retailers/${retailerId}/reset-password`, { new_password: newPassword });
          }}
        />
      )}

      {/* Document Inspection Lightbox Modal */}
      {previewModalDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-[#334155] rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-[#334155] flex items-center justify-between bg-[#1E293B]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{previewModalDoc.label}</h3>
                  <p className="text-[11px] text-[#94A3B8]">{previewModalDoc.category} • {previewModalDoc.docNumber}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {!previewModalDoc.url.toLowerCase().includes(".pdf") && (
                  <>
                    <button
                      onClick={() => setLightboxZoom((z) => Math.max(0.5, z - 0.25))}
                      className="p-2 rounded-xl bg-[#0F172A] text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-400 min-w-[40px] text-center">
                      {Math.round(lightboxZoom * 100)}%
                    </span>
                    <button
                      onClick={() => setLightboxZoom((z) => Math.min(3, z + 0.25))}
                      className="p-2 rounded-xl bg-[#0F172A] text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setLightboxRotation((r) => (r + 90) % 360)}
                      className="p-2 rounded-xl bg-[#0F172A] text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Rotate"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </>
                )}

                <a
                  href={previewModalDoc.url}
                  download={`${previewModalDoc.label.replace(/\s+/g, "_")}.${previewModalDoc.url.toLowerCase().includes(".pdf") ? "pdf" : "png"}`}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-black text-white flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                <a
                  href={previewModalDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#0F172A] text-blue-400 hover:text-blue-300 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Direct Link</span>
                </a>

                <button
                  onClick={() => setPreviewModalDoc(null)}
                  className="p-2 rounded-xl bg-[#0F172A] hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all cursor-pointer ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 bg-[#050811] p-4 overflow-auto flex items-center justify-center relative">
              {previewModalDoc.url.toLowerCase().includes(".pdf") ? (
                <iframe
                  src={previewModalDoc.url}
                  title={previewModalDoc.label}
                  className="w-full h-full rounded-2xl bg-white border border-[#334155]"
                />
              ) : (previewModalDoc.isVideo || previewModalDoc.url.toLowerCase().includes(".mp4") || previewModalDoc.url.toLowerCase().includes(".webm")) ? (
                <video
                  src={previewModalDoc.url}
                  controls
                  autoPlay
                  className="max-h-[75vh] w-auto max-w-full rounded-2xl shadow-2xl border border-[#1E293B]"
                />
              ) : !failedImages[previewModalDoc.label] ? (
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
                <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center text-white space-y-4 max-w-md">
                  <ShieldCheck className="w-12 h-12 text-blue-400 mx-auto" />
                  <h4 className="text-base font-black">{previewModalDoc.label}</h4>
                  <p className="text-xs text-slate-400 font-mono">Identifier: {previewModalDoc.docNumber}</p>
                  <a
                    href={previewModalDoc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Full Document
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
