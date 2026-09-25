"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, User, Phone, Mail, MapPin, Landmark,
  ShieldCheck, FileText, CheckCircle2, XCircle, Clock, Copy,
  Check, ExternalLink, Download, Layers, UserCog, UserPlus,
  Store, RefreshCw, AlertCircle, Calendar, Hash, CreditCard
} from "lucide-react";
import apiClient from "@/lib/api";

export default function RegistrationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const entityType = String(params?.type || "");
  const entityId = String(params?.id || "");

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadEntityDetails() {
      if (!entityType || !entityId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.get(`/sales/registrations/${entityType}/${entityId}`);
        setData(res.data);
      } catch (err: any) {
        console.error("Error loading registration 360 details:", err);
        setError(err.response?.data?.detail || "Failed to load entity details.");
      } finally {
        setLoading(false);
      }
    }
    loadEntityDetails();
  }, [entityType, entityId]);

  const handleCopyVideoKycLink = () => {
    if (data?.video_kyc?.url) {
      navigator.clipboard.writeText(data.video_kyc.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case "SUPER_DISTRIBUTOR":
        return <UserCog className="w-5 h-5 text-[#94003A]" />;
      case "DISTRIBUTOR":
        return <UserPlus className="w-5 h-5 text-[#94003A]" />;
      case "RETAILER":
        return <Store className="w-5 h-5 text-[#94003A]" />;
      default:
        return <Building2 className="w-5 h-5 text-[#94003A]" />;
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#6B7280]">
        <div className="w-12 h-12 rounded-2xl bg-[#F8E6EE] border border-[#94003A]/20 flex items-center justify-center text-[#94003A] animate-pulse">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <span className="text-sm font-bold text-[#1F2937]">Loading Entity 360 Profile...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-sm flex flex-col items-start gap-3">
        <div className="flex items-center gap-2 font-bold text-[#991B1B]">
          <AlertCircle className="w-5 h-5" />
          {error || "Entity record not found or unauthorized"}
        </div>
        <Link
          href="/registrations"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#94003A] text-white text-xs font-bold transition shadow-sm hover:bg-[#78002F]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Registrations Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-[1400px] 2xl:max-w-[1500px] mx-auto pb-12">
      {/* Back Button & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/registrations"
            className="p-2.5 rounded-xl bg-[#FAFAFC] hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#1F2937] border border-[#E5E7EB] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="p-2 rounded-xl bg-[#F8E6EE] border border-[#94003A]/20">
                {getEntityTypeIcon(data.entity_type)}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#1F2937] tracking-tight">
                {data.business_name || data.store_name}
              </h1>
              <span className="font-mono text-xs text-[#94003A] font-bold bg-[#F8E6EE] px-2.5 py-0.5 rounded-full border border-[#94003A]/20">
                {data.code}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1 font-medium">
              {data.entity_type_label} • Registered Ref #{data.reference_id} • Tenant: <strong className="text-[#1F2937]">{data.tenant_name}</strong>
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
              data.approval_status === "APPROVED"
                ? "bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]"
                : data.approval_status === "REJECTED"
                ? "bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]"
                : "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
            }`}
          >
            {data.approval_status === "APPROVED" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : data.approval_status === "REJECTED" ? (
              <XCircle className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
            Admin: {data.approval_status}
          </span>

          <span
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold ${
              data.is_active
                ? "bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]"
                : "bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]"
            }`}
          >
            {data.active_status}
          </span>
        </div>
      </div>

      {/* Rejection Alert if Rejected */}
      {data.rejection_reason && (
        <div className="p-4 rounded-2xl bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-[#991B1B]">Application Rejection Reason:</div>
            <div className="mt-0.5">{data.rejection_reason}</div>
          </div>
        </div>
      )}

      {/* Video KYC Live Status & Copy Link Box */}
      <div className="p-5 rounded-2xl bg-white border border-[#E7B631]/40 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1F2937]">
            <ShieldCheck className="w-4 h-4 text-[#94003A]" />
            Video KYC Verification Link & Live Token
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-[#6B7280]">Status:</span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                data.video_kyc?.status === "COMPLETED"
                  ? "bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]"
                  : "bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]"
              }`}
            >
              {data.video_kyc?.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={data.video_kyc?.url || ""}
            className="flex-1 bg-[#FAFAFC] border border-[#D1D5DB] rounded-xl px-3.5 py-2.5 text-xs font-mono text-[#1F2937] select-all focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyVideoKycLink}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white text-xs font-bold transition shadow-xs shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#E7B631]" />
                Copied Link!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Link
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Hierarchy */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hierarchy Chain */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6B7280]">
              <Layers className="w-4 h-4 text-[#94003A]" />
              Tenant & Organizational Hierarchy Chain
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="px-3 py-1 rounded-xl bg-[#FAFAFC] border border-[#E5E7EB] text-[#4B5563]">
                🏢 Tenant: <strong className="text-[#1F2937]">{data.hierarchy?.tenant || data.tenant_name}</strong>
              </span>
              <span className="text-[#9CA3AF]">→</span>
              <span className="px-3 py-1 rounded-xl bg-[#FAFAFC] border border-[#E5E7EB] text-[#4B5563]">
                🏛️ Company: <strong className="text-[#1F2937]">{data.hierarchy?.company || data.company_name}</strong>
              </span>
              {data.hierarchy?.super_distributor_name && (
                <>
                  <span className="text-[#9CA3AF]">→</span>
                  <span className="px-3 py-1 rounded-xl bg-[#F8E6EE] border border-[#94003A]/20 text-[#94003A] font-bold">
                    👑 SD: {data.hierarchy.super_distributor_name}
                  </span>
                </>
              )}
              {data.hierarchy?.distributor_name && (
                <>
                  <span className="text-[#9CA3AF]">→</span>
                  <span className="px-3 py-1 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] font-bold">
                    📦 Dist: {data.hierarchy.distributor_name}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-3">
              <Building2 className="w-4 h-4 text-[#94003A]" />
              Enterprise & Contact Profile
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#6B7280] text-[11px] block">Business / Store Name</span>
                <span className="text-[#1F2937] font-bold text-sm mt-0.5 block">
                  {data.business_name || data.store_name}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280] text-[11px] block">Owner / Authorized Signatory</span>
                <span className="text-[#1F2937] font-semibold mt-0.5 block">{data.owner_name}</span>
              </div>
              <div>
                <span className="text-[#6B7280] text-[11px] block">Mobile Number</span>
                <span className="text-[#1F2937] font-mono font-semibold mt-0.5 block">{data.mobile}</span>
              </div>
              <div>
                <span className="text-[#6B7280] text-[11px] block">Email Address</span>
                <span className="text-[#1F2937] mt-0.5 block">{data.email}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#6B7280] text-[11px] block">Operating Address</span>
                <span className="text-[#4B5563] mt-0.5 block">
                  {data.address}, {data.city}, {data.state} - {data.pincode}
                </span>
              </div>
            </div>
          </div>

          {/* Banking & Settlement */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-3">
              <Landmark className="w-4 h-4 text-[#94003A]" />
              Settlement Banking Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[#6B7280] text-[11px] block">Settlement Bank</span>
                <span className="text-[#1F2937] font-semibold mt-0.5 block">
                  {data.bank?.bank_name || data.settlement_bank_name || "Primary Bank"}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280] text-[11px] block">Account Number</span>
                <span className="text-[#1F2937] font-mono font-semibold mt-0.5 block">
                  {data.bank?.account_number || data.bank_account_number || "—"}
                </span>
              </div>
              <div>
                <span className="text-[#6B7280] text-[11px] block">IFSC Code</span>
                <span className="text-[#1F2937] font-mono font-semibold mt-0.5 block">
                  {data.bank?.ifsc || data.ifsc || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: KYC, Documents & Timeline */}
        <div className="space-y-6">
          {/* KYC Summary Card */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1F2937]">
                <ShieldCheck className="w-4 h-4 text-[#94003A]" />
                KYC & Tax Registration
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F8E6EE] text-[#94003A] border border-[#94003A]/20">
                {data.kyc?.status || "PENDING"}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAFC] border border-[#E5E7EB]">
                <span className="text-[#6B7280]">PAN Number</span>
                <span className="font-mono font-bold text-[#1F2937]">
                  {data.kyc?.pan || data.pan_number || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAFC] border border-[#E5E7EB]">
                <span className="text-[#6B7280]">GST Number</span>
                <span className="font-mono font-bold text-[#1F2937]">
                  {data.kyc?.gst || data.gst_number || "—"}
                </span>
              </div>
              {data.kyc?.aadhaar_masked && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAFC] border border-[#E5E7EB]">
                  <span className="text-[#6B7280]">Aadhaar (Masked)</span>
                  <span className="font-mono font-bold text-[#1F2937]">
                    •••• •••• {data.kyc.aadhaar_masked}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Uploaded Documents (Backblaze B2 Vault) */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#1F2937]">
                <FileText className="w-4 h-4 text-[#94003A]" />
                Uploaded Documents (B2)
              </div>
              <span className="text-[10px] font-bold text-[#6B7280]">
                {data.documents?.length || 0} Files
              </span>
            </div>

            {(!data.documents || data.documents.length === 0) ? (
              <div className="text-center py-6 text-[#9CA3AF] text-xs">
                No KYC documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {data.documents.map((doc: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#FAFAFC] border border-[#E5E7EB] flex items-center justify-between gap-2 hover:bg-[#FDF3F7] transition"
                  >
                    <div className="truncate">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#94003A] block">
                        {doc.document_type}
                      </span>
                      <span className="text-xs text-[#1F2937] truncate block font-mono">
                        {doc.file_name}
                      </span>
                    </div>
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-white hover:bg-[#F8E6EE] text-[#94003A] border border-[#E5E7EB] transition"
                        title="View Document"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Registration Timeline */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1F2937] border-b border-[#E5E7EB] pb-3">
              <Calendar className="w-4 h-4 text-[#94003A]" />
              Registration Audit Timeline
            </div>

            <div className="space-y-3 relative pl-4 border-l-2 border-[#94003A]/20">
              {(data.timeline || []).map((t: any, idx: number) => (
                <div key={idx} className="relative text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#94003A] absolute -left-[21px] top-1"></div>
                  <div className="font-bold text-[#1F2937]">{t.event}</div>
                  <div className="text-[10px] text-[#6B7280] mt-0.5">
                    Actor: {t.actor} • {t.date ? new Date(t.date).toLocaleDateString() : "Pending"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
