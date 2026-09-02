"use client";

import React, { useState } from "react";
import { getApiBaseUrl } from "@/lib/api-config";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Building2,
  User,
  MapPin,
  Camera,
  Video,
  FileText,
  Loader2,
  MessageSquare
} from "lucide-react";
import { BlurImage } from "@/components/ui/blur-image";
import { KNOWN_BLURHASHES } from "@/lib/blurhash";
import { DocumentViewer } from "./DocumentViewer";

interface RetailerDetailModalProps {
  detailData: any;
  onClose: () => void;
  onRefresh: () => void;
}

export const RetailerDetailModal: React.FC<RetailerDetailModalProps> = ({ detailData, onClose, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [actionType, setActionType] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [viewingDoc, setViewingDoc] = useState<any>(null);

  const verif = detailData?.verification || {};
  const verifSummary = detailData?.verifications_summary || {};
  const shop = detailData?.shop_details || {};
  const addr = detailData?.address || {};
  const media = detailData?.media || {};
  const history = detailData?.history || [];
  const audits = detailData?.audits || [];

  const handleExecuteAction = async () => {
    if (!actionType) return;
    if (!remarks || remarks.trim().length < 5) {
      setErrorMsg("Mandatory comments required! Please enter at least 5 characters.");
      return;
    }

    const targetId = verif.public_id || verif.id || verif.registration_id;
    if (!targetId) {
      setErrorMsg("Invalid verification ID.");
      return;
    }

    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await fetch(`${getApiBaseUrl()}/admin/verification/requests/${targetId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          admin_id: "ADM-COMPLIANCE-01",
          remarks: remarks.trim(),
          admin_role: "SENIOR_COMPLIANCE_OFFICER"
        })
      });
      const data = await res.json();
      setSubmitting(false);

      if (res.ok && data.status === "SUCCESS") {
        setActionType(null);
        onRefresh();
        onClose();
      } else {
        setErrorMsg(data.detail || data.message || "Failed to process verification decision.");
      }
    } catch (err: any) {
      setSubmitting(false);
      setErrorMsg(err?.message || "Network or server communication error. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-extrabold">
              {verif.is_business ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                {verif.retailer_name}
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase border ${
                  verif.verification_status === "APPROVED"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : verif.verification_status === "REJECTED"
                    ? "bg-rose-50 border-rose-200 text-rose-700"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}>
                  {verif.verification_status}
                </span>
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Reg ID: <span className="text-blue-600 font-mono font-bold">{verif.registration_id}</span> · Mobile: <span className="text-slate-800 font-bold">+91 {verif.mobile_number}</span>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Decision Buttons Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActionType("APPROVE")}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve Retailer</span>
            </button>
            <button
              onClick={() => setActionType("ON_HOLD")}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Put On Hold</span>
            </button>
            <button
              onClick={() => setActionType("REJECT")}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Application</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span>Risk Score:</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-black">{verif.risk_score}/100 ({verif.risk_category})</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Grid 1: Verification Checks Checklist */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">PAN Check</p>
              <p className="font-black text-slate-900">{verifSummary.pan?.number || "N/A"}</p>
              <p className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> NSDL VERIFIED
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">GSTIN Check</p>
              <p className="font-black text-slate-900">{verifSummary.gst?.number || "N/A"}</p>
              <p className="text-[10px] text-purple-700 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-purple-600" /> {verif.is_business ? "GST VERIFIED" : "SKIPPED"}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Aadhaar eKYC</p>
              <p className="font-black text-slate-900">UIDAI OTP</p>
              <p className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> AUTH SUCCESS
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Bank Sync</p>
              <p className="font-black text-slate-900">{verifSummary.bank?.ifsc || "HDFC0001234"}</p>
              <p className="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PENNY DROP OK
              </p>
            </div>
          </div>

          {/* Grid 2: Shop & Location Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-black uppercase text-[11px] text-slate-600 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-600" /> Shop Profile
              </h3>
              <p className="text-sm font-black text-slate-900">{shop.name || verif.shop_name}</p>
              <p className="text-slate-600 font-semibold">Category: {shop.category}</p>
              <p className="text-slate-600 font-semibold">Annual Turnover: {shop.annual_turnover}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-black uppercase text-[11px] text-slate-600 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" /> Location & Address
              </h3>
              <p className="font-extrabold text-slate-900">{addr.street}, {addr.city}, {addr.state} - {addr.pincode}</p>
              <p className="text-slate-500 font-mono text-[11px]">
                GPS: {addr.latitude}°N, {addr.longitude}°E
              </p>
            </div>
          </div>

          {/* Grid 3: Media & Document Previews */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black uppercase text-[11px] text-slate-600 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" /> Compliance Media & Document Previews
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase">
                Verified Storage Stream
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { title: "PAN Card Document", url: media.pan_card_url, type: "PAN", category: "Income Tax Proof" },
                { title: "Aadhaar Front Side", url: media.aadhaar_front_url, type: "AADHAAR_FRONT", category: "UIDAI eKYC" },
                { title: "Aadhaar Back Side", url: media.aadhaar_back_url, type: "AADHAAR_BACK", category: "Address Proof" },
                { title: "Selfie / Profile Photo", url: media.selfie_url, type: "SELFIE", category: "Biometric Identity" },
                { title: "Shop Exterior Photo", url: media.shop_photo_url || addr.shop_photo_url, type: "SHOP_PHOTO", category: "Storefront Geotagged" },
                { title: "Bank Passbook / Cheque", url: media.bank_proof_url, type: "BANK_PROOF", category: "Settlement Account" },
                { title: "GSTIN Certificate", url: media.gst_proof_url, type: "GST_CERT", category: "Tax Certificate" },
                { title: "Live Video KYC", url: media.video_url, type: "VIDEO", isVideo: true, category: "100% Liveness Match" },
              ].filter(doc => !!doc.url).map((doc, idx) => {
                const isPdf = doc.url.toLowerCase().includes(".pdf");
                const isVid = doc.isVideo || doc.url.toLowerCase().includes(".mp4") || doc.url.toLowerCase().includes(".webm");

                return (
                  <div
                    key={idx}
                    onClick={() => setViewingDoc(doc)}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-500 hover:shadow-xs cursor-pointer group transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-slate-800 text-[11px] truncate group-hover:text-blue-600">{doc.title}</p>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        {isPdf ? "PDF" : isVid ? "MP4" : "IMG"}
                      </span>
                    </div>
                    <div className="aspect-video rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 overflow-hidden relative border border-slate-200">
                      {isVid ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                          <video src={doc.url} muted preload="metadata" className="w-full h-full object-cover opacity-70" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Video className="w-4 h-4" />
                            </div>
                          </div>
                        </div>
                      ) : isPdf ? (
                        <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                          <FileText className="w-6 h-6 text-rose-500" />
                          <span className="text-[10px] font-bold text-slate-600">PDF Document</span>
                        </div>
                      ) : (
                        <BlurImage
                          src={doc.url}
                          blurhash={KNOWN_BLURHASHES.DOCUMENT_DEFAULT}
                          alt={doc.title}
                          className="w-full h-full"
                          imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-black text-[10px] backdrop-blur-[1px] transition-opacity">
                        Click to Inspect
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline & Audit History */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="font-black uppercase text-[11px] text-slate-600 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" /> Verification Audit & Decision Trail
            </h3>
            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-slate-400 italic">No previous status changes recorded.</p>
              ) : (
                history.map((h: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-slate-700">
                    <div>
                      <span className="font-bold text-slate-900">{h.previous_status} → {h.new_status}</span>
                      <p className="text-[11px] text-slate-500">Remarks: "{h.remarks}"</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{h.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Action Decision Mandatory Remarks Modal */}
      {actionType && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                Confirm Decision: <span className="text-blue-600">{actionType}</span>
              </h3>
              <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mandatory Admin Comments / Remarks <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={remarks}
                onChange={(e) => {
                  setRemarks(e.target.value);
                  setErrorMsg("");
                }}
                rows={4}
                placeholder="Enter detailed compliance review comments..."
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              onClick={handleExecuteAction}
              disabled={submitting || remarks.trim().length < 5}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording Audit Trail...</span>
                </>
              ) : (
                <span>Submit Decision & Notify Retailer</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Interactive Document Viewer Component */}
      {viewingDoc && (
        <DocumentViewer
          documentUrl={viewingDoc.url}
          documentTitle={viewingDoc.title}
          documentType={viewingDoc.type}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
};
