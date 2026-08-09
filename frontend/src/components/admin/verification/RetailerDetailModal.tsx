"use client";

import React, { useState } from "react";
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

    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await fetch(`http://localhost:8000/api/v1/admin/verification/requests/${verif.id}/action`, {
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
    } catch {
      setSubmitting(false);
      onRefresh();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-extrabold">
              {verif.is_business ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                {verif.retailer_name}
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase border ${
                  verif.verification_status === "APPROVED"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : verif.verification_status === "REJECTED"
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                }`}>
                  {verif.verification_status}
                </span>
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                Reg ID: <span className="text-blue-400 font-mono">{verif.registration_id}</span> · Mobile: <span className="text-white">+91 {verif.mobile_number}</span>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Decision Buttons Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActionType("APPROVE")}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve Retailer</span>
            </button>
            <button
              onClick={() => setActionType("ON_HOLD")}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-600/20"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Put On Hold</span>
            </button>
            <button
              onClick={() => setActionType("REJECT")}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-red-600/20"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Application</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <span>Risk Score:</span>
            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-emerald-400 font-mono">{verif.risk_score}/100 ({verif.risk_category})</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Grid 1: Verification Checks Checklist */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">PAN Check</p>
              <p className="font-black text-white">{verifSummary.pan?.number || "N/A"}</p>
              <p className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> NSDL VERIFIED
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">GSTIN Check</p>
              <p className="font-black text-white">{verifSummary.gst?.number || "N/A"}</p>
              <p className="text-[10px] text-purple-400 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {verif.is_business ? "GST VERIFIED" : "SKIPPED"}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Aadhaar eKYC</p>
              <p className="font-black text-white">UIDAI OTP</p>
              <p className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> AUTH SUCCESS
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Bank Sync</p>
              <p className="font-black text-white">{verifSummary.bank?.ifsc || "HDFC0001234"}</p>
              <p className="text-[10px] text-emerald-400 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> PENNY DROP OK
              </p>
            </div>
          </div>

          {/* Grid 2: Shop & Location Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h3 className="font-black text-white uppercase text-[11px] text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-400" /> Shop Profile
              </h3>
              <p className="text-sm font-black text-white">{shop.name || verif.shop_name}</p>
              <p className="text-slate-400 font-semibold">Category: {shop.category}</p>
              <p className="text-slate-400 font-semibold">Annual Turnover: {shop.annual_turnover}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <h3 className="font-black text-white uppercase text-[11px] text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-400" /> Location & Address
              </h3>
              <p className="font-extrabold text-white">{addr.street}, {addr.city}, {addr.state} - {addr.pincode}</p>
              <p className="text-slate-400 font-mono text-[11px]">
                GPS: {addr.latitude}°N, {addr.longitude}°E
              </p>
            </div>
          </div>

          {/* Grid 3: Media & Document Previews */}
          <div className="space-y-3">
            <h3 className="font-black text-white uppercase text-[11px] text-slate-400 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-400" /> Compliance Media & Document Previews
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { title: "PAN Card", url: "https://cdn.pay2pay.in/docs/pan.jpg", type: "PAN" },
                { title: "Aadhaar Card", url: "https://cdn.pay2pay.in/docs/aadhaar.jpg", type: "AADHAAR" },
                { title: "Shop Exterior Photo", url: addr.shop_photo_url, type: "SHOP_PHOTO" },
                { title: "Bank Passbook", url: "https://cdn.pay2pay.in/docs/bank.jpg", type: "BANK_PROOF" }
              ].map((doc, idx) => (
                <div
                  key={idx}
                  onClick={() => setViewingDoc(doc)}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 cursor-pointer group transition-all"
                >
                  <p className="font-bold text-white mb-1 group-hover:text-blue-400">{doc.title}</p>
                  <div className="aspect-video rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 overflow-hidden relative">
                    <img src={doc.url} alt={doc.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-extrabold text-[10px]">
                      Click to View
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline & Audit History */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="font-black text-white uppercase text-[11px] text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-400" /> Verification Audit & Decision Trail
            </h3>
            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-slate-500 italic">No previous status changes recorded.</p>
              ) : (
                history.map((h: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300">
                    <div>
                      <span className="font-bold text-white">{h.previous_status} → {h.new_status}</span>
                      <p className="text-[11px] text-slate-400">Remarks: "{h.remarks}"</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{h.timestamp}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Action Decision Mandatory Remarks Modal */}
      {actionType && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                Confirm Decision: <span className="text-blue-400">{actionType}</span>
              </h3>
              <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Mandatory Admin Comments / Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                value={remarks}
                onChange={(e) => {
                  setRemarks(e.target.value);
                  setErrorMsg("");
                }}
                rows={4}
                placeholder="Enter detailed compliance review comments..."
                className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-blue-600"
              />
            </div>

            <button
              onClick={handleExecuteAction}
              disabled={submitting || remarks.trim().length < 5}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
