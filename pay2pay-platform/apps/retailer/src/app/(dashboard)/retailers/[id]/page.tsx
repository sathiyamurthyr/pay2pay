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

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/retailers/${retailerId}`);
      setData(res.data);
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

  if (loading || !data) {
    return (
      <div className="flex h-96 items-center justify-center py-20 gap-3 text-sm font-semibold text-[#64748B]">
        <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" /> Loading Retailer Profile…
      </div>
    );
  }

  const { retailer, contacts, addresses, banks, kyc, documents, wallet, status_history } = data;

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

        {/* ROW 2: Primary Contact & Address Details */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#16A34A]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                2. Owner Contact & Physical Outlet Address
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

        {/* ROW 3: Settlement Bank Account */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#F59E0B]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                3. Settlement Banking & Payout Details
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

        {/* ROW 4: KYC Verification & B2 Document Storage */}
        <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#DBEAFE] pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#2563EB]" />
              <h2 className="text-sm font-extrabold text-[#1E40AF] uppercase tracking-wider">
                4. KYC Identifiers & Uploaded Documents (Backblaze B2 Storage)
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
                    className={`flex flex-col bg-white rounded-2xl border transition-all duration-200 overflow-hidden group ${
                      isUploaded
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
                        className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border shrink-0 ${
                          !isUploaded
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
                      className={`relative h-36 w-full overflow-hidden flex items-center justify-center select-none ${
                        isUploaded ? "bg-[#0F172A] cursor-pointer" : "bg-[#F8FAFC]"
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

        {/* ROW 5: Wallet Balances & Operating Limits */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#16A34A]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                5. Wallet Balances & Operating Limits
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

        {/* ROW 6: Status Audit History */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#64748B]" />
              <h2 className="text-sm font-extrabold text-[#0F172A] uppercase tracking-wider">
                6. Status Audit History
              </h2>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {status_history && status_history.length > 0 ? (
              status_history.map((h: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                  <div>
                    <span className="font-bold text-[#334155]">{h.previous || "DRAFT"}</span> → <span className="font-bold text-[#16A34A]">{h.new || h.status}</span>
                    <div className="text-[#64748B] mt-0.5 font-medium">{h.reason || "Status updated"}</div>
                  </div>
                  <div className="text-right text-[#64748B] font-mono text-[11px]">
                    <div>{h.by || "system"}</div>
                    <div>{new Date(h.date || Date.now()).toLocaleString()}</div>
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
      </div>
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
