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
        return <UserCog className="w-5 h-5 text-purple-400" />;
      case "DISTRIBUTOR":
        return <UserPlus className="w-5 h-5 text-blue-400" />;
      case "RETAILER":
        return <Store className="w-5 h-5 text-emerald-400" />;
      default:
        return <Building2 className="w-5 h-5 text-indigo-400" />;
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-bold text-slate-300">Loading Entity 360 Profile...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-sm flex flex-col items-start gap-3">
        <div className="flex items-center gap-2 font-bold text-rose-200">
          <AlertCircle className="w-5 h-5" />
          {error || "Entity record not found or unauthorized"}
        </div>
        <Link
          href="/registrations"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-slate-200 text-xs font-bold border border-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Registrations Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back Button & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/registrations"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-slate-800">
                {getEntityTypeIcon(data.entity_type)}
              </div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                {data.business_name || data.store_name}
              </h1>
              <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {data.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {data.entity_type_label} • Registered Ref #{data.reference_id} • Tenant: {data.tenant_name}
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
              data.approval_status === "APPROVED"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : data.approval_status === "REJECTED"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
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
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            {data.active_status}
          </span>
        </div>
      </div>

      {/* Rejection Alert if Rejected */}
      {data.rejection_reason && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-200">Application Rejection Reason:</div>
            <div className="mt-0.5">{data.rejection_reason}</div>
          </div>
        </div>
      )}

      {/* Video KYC Live Status & Copy Link Box */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Video KYC Verification Link & Live Token
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                data.video_kyc?.status === "COMPLETED"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
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
            className="flex-1 bg-slate-950 border border-indigo-900/50 rounded-xl px-3.5 py-2.5 text-xs font-mono text-indigo-200 select-all focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopyVideoKycLink}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md shadow-indigo-600/30 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
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
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Layers className="w-4 h-4 text-indigo-400" />
              Tenant & Organizational Hierarchy Chain
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                🏢 Tenant: <strong className="text-white">{data.hierarchy?.tenant || data.tenant_name}</strong>
              </span>
              <span className="text-slate-600">→</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                🏛️ Company: <strong className="text-white">{data.hierarchy?.company || data.company_name}</strong>
              </span>
              {data.hierarchy?.super_distributor_name && (
                <>
                  <span className="text-slate-600">→</span>
                  <span className="px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-300">
                    👑 SD: <strong>{data.hierarchy.super_distributor_name}</strong>
                  </span>
                </>
              )}
              {data.hierarchy?.distributor_name && (
                <>
                  <span className="text-slate-600">→</span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-950/40 border border-blue-800/40 text-blue-300">
                    📦 Dist: <strong>{data.hierarchy.distributor_name}</strong>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Enterprise & Contact Profile
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Business / Store Name</span>
                <span className="text-white font-bold text-sm mt-0.5 block">
                  {data.business_name || data.store_name}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Owner / Authorized Signatory</span>
                <span className="text-slate-200 font-semibold mt-0.5 block">{data.owner_name}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Mobile Number</span>
                <span className="text-slate-200 font-mono font-semibold mt-0.5 block">{data.mobile}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Email Address</span>
                <span className="text-slate-200 mt-0.5 block">{data.email}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 text-[11px] block">Operating Address</span>
                <span className="text-slate-300 mt-0.5 block">
                  {data.address}, {data.city}, {data.state} - {data.pincode}
                </span>
              </div>
            </div>
          </div>

          {/* Banking & Settlement */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
              <Landmark className="w-4 h-4 text-indigo-400" />
              Settlement Banking Details
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block">Settlement Bank</span>
                <span className="text-white font-semibold mt-0.5 block">
                  {data.bank?.bank_name || data.settlement_bank_name || "Primary Bank"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Account Number</span>
                <span className="text-slate-200 font-mono font-semibold mt-0.5 block">
                  {data.bank?.account_number || data.bank_account_number || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">IFSC Code</span>
                <span className="text-slate-200 font-mono font-semibold mt-0.5 block">
                  {data.bank?.ifsc || data.ifsc || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: KYC, Documents & Timeline */}
        <div className="space-y-6">
          {/* KYC Summary Card */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                KYC & Tax Registration
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {data.kyc?.status || "PENDING"}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400">PAN Number</span>
                <span className="font-mono font-bold text-white">
                  {data.kyc?.pan || data.pan_number || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="text-slate-400">GST Number</span>
                <span className="font-mono font-bold text-white">
                  {data.kyc?.gst || data.gst_number || "—"}
                </span>
              </div>
              {data.kyc?.aadhaar_masked && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-400">Aadhaar (Masked)</span>
                  <span className="font-mono font-bold text-white">
                    •••• •••• {data.kyc.aadhaar_masked}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Uploaded Documents (Backblaze B2 Vault) */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <FileText className="w-4 h-4 text-indigo-400" />
                Uploaded Documents (B2)
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                {data.documents?.length || 0} Files
              </span>
            </div>

            {(!data.documents || data.documents.length === 0) ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                No KYC documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {data.documents.map((doc: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="truncate">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                        {doc.document_type}
                      </span>
                      <span className="text-xs text-slate-300 truncate block font-mono">
                        {doc.file_name}
                      </span>
                    </div>
                    {doc.file_url && (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
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
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Registration Audit Timeline
            </div>

            <div className="space-y-3 relative pl-4 border-l border-slate-800">
              {(data.timeline || []).map((t: any, idx: number) => (
                <div key={idx} className="relative text-xs">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 absolute -left-[21px] top-1"></div>
                  <div className="font-bold text-white">{t.event}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
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
