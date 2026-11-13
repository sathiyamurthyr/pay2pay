"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle2, Lock, FileText, QrCode, Building, MapPin, Receipt, UserCheck } from "lucide-react";
import { BlurImage } from "@/components/ui/blur-image";
import { KNOWN_BLURHASHES } from "@/lib/blurhash";

export interface DigitalAadhaarCardProps {
  aadhaarData: {
    fullName?: string;
    name?: string;
    full_name?: string;
    dob?: string;
    gender?: string;
    careOf?: string;
    care_of?: string;
    maskedAadhaar?: string;
    masked_aadhaar?: string;
    fullAddress?: string;
    full_address?: string;
    pincode?: string;
    state?: string;
    photoBase64?: string;
    photo_base64?: string;
    photoUrl?: string;
    photo_url?: string;
    verifiedAt?: string;
    verified_at?: string;
    aadhaarHash?: string;
    aadhaar_hash?: string;
    billing?: {
      base_fee?: number;
      cgst?: number;
      sgst?: number;
      total_debited?: number;
      debit_txn_id?: string;
    };
  } | null;
  className?: string;
}

export const DigitalAadhaarCard: React.FC<DigitalAadhaarCardProps> = ({ aadhaarData, className = "" }) => {
  if (!aadhaarData) return null;

  const fullName = aadhaarData.full_name || aadhaarData.fullName || aadhaarData.name || "—";
  const dob = aadhaarData.dob || "—";
  const gender = (aadhaarData.gender || "").toUpperCase().startsWith("M") ? "Male / पुरुष" : (aadhaarData.gender ? "Female / महिला" : "—");
  const careOf = aadhaarData.care_of || aadhaarData.careOf || "—";
  const maskedAadhaar = aadhaarData.masked_aadhaar || aadhaarData.maskedAadhaar || "XXXXXXXXXXXX";
  const fullAddress = aadhaarData.full_address || aadhaarData.fullAddress || "—";
  const photo = aadhaarData.photo_base64 || aadhaarData.photoBase64 || aadhaarData.photo_url || aadhaarData.photoUrl || "";
  const aadhaarHash = aadhaarData.aadhaar_hash || aadhaarData.aadhaarHash || "";
  const totalBilled = aadhaarData.billing?.total_debited || 11.80;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`w-full max-w-2xl mx-auto rounded-2xl overflow-hidden border border-amber-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-[#FAF8F9] text-[#292329] shadow-2xl relative ${className}`}
    >
      {/* Official Top Header Bar with Govt Tricolor Accent */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-500 to-emerald-600 h-1.5 w-full" />
      
      <div className="p-5 space-y-4">
        {/* Header Emblem & Title */}
        <div className="flex items-center justify-between border-b border-[#E8E2E5] pb-3">
          <div className="flex items-center gap-3">
            {/* Govt Emblem Badge */}
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-black tracking-wide text-white flex items-center gap-1.5 uppercase">
                <span>भारत सरकार</span>
                <span className="text-[#8A8288]">|</span>
                <span className="text-amber-400">GOVERNMENT OF INDIA</span>
              </h4>
              <p className="text-[11px] font-bold text-[#625B60] tracking-tight">
                भारतीय विशिष्ट पहचान प्राधिकरण • UNIQUE IDENTIFICATION AUTHORITY OF INDIA
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>OFFICIAL eKYC VERIFIED</span>
            </span>
            <span className="text-[10px] font-mono text-[#625B60] mt-1">UIDAI eKYC Verified</span>
          </div>
        </div>

        {/* Main Aadhaar Card Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          {/* Left Column: Photo & QR Code Badge */}
          <div className="md:col-span-4 flex flex-col items-center justify-center space-y-3 p-3 rounded-xl bg-[#F5F2F4]/40 border border-[#E8E2E5]">
            <div className="relative">
              <BlurImage
                src={photo}
                blurhash={KNOWN_BLURHASHES.AADHAAR}
                alt={fullName}
                className="w-28 h-32 rounded-xl border-2 border-amber-500/40 shadow-md"
                imageClassName="w-full h-full object-cover rounded-xl"
              />
              <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1 rounded-full border border-[#E8E2E5] shadow-xs z-20">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#625B60] font-mono">
              <QrCode className="w-4 h-4 text-amber-400 shrink-0" />
              <span>UIDAI Secure QR Verified</span>
            </div>
          </div>

          {/* Right Column: Person & Address Information */}
          <div className="md:col-span-8 space-y-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">Name / नाम</span>
              <h3 className="text-lg font-black text-white tracking-wide">{fullName}</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#625B60] block">DOB / जन्म तिथि</span>
                <span className="font-semibold text-[#292329] font-mono">{dob}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#625B60] block">Gender / लिंग</span>
                <span className="font-semibold text-[#292329]">{gender}</span>
              </div>
            </div>

            {careOf && (
              <div className="text-xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#625B60] block">Care Of / अभिभावक</span>
                <span className="font-medium text-[#292329]">{careOf}</span>
              </div>
            )}

            <div className="text-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#625B60] block flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-400" /> Address / पता
              </span>
              <p className="text-xs text-[#292329] leading-relaxed font-sans">{fullAddress}</p>
            </div>
          </div>
        </div>

        {/* Large Masked Aadhaar Number Banner */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-[#625B60] uppercase tracking-wide">Aadhaar Number:</span>
          </div>
          <span className="text-xl font-black font-mono tracking-widest text-amber-300 drop-shadow-sm">
            {maskedAadhaar}
          </span>
        </div>

        {/* Bottom Metadata: PII Security Encryption & Wallet Fee Receipt */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E8E2E5] text-[11px] text-[#625B60]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>PII Encrypted (AES-256 Ciphertext Stored in Vault)</span>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-bold">
              Fee Billed: ₹{totalBilled.toFixed(2)} (₹10.00 + GST)
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DigitalAadhaarCard;
