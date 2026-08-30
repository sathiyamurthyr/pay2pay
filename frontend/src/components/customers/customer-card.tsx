"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Star,
  Clock,
  ChevronDown,
  ArrowUpRight,
  Building2,
  Verified as VerifiedIcon,
} from "lucide-react";
import { BlurImage } from "@/components/ui/blur-image";
import { KNOWN_BLURHASHES } from "@/lib/blurhash";

export interface CustomerCardData {
  id: string;
  name: string;
  mobile: string;
  email: string;
  photoUrl?: string;
  kycStatus: "VERIFIED" | "PENDING";
  aadhaarStatus: "VERIFIED" | "PENDING";
  totalTxns: number;
  totalVolume: number;
  dailyLimitUsed: number;
  dailyLimitTotal: number;
  monthlyLimitUsed: number;
  monthlyLimitTotal: number;
  lastVisit: string;
  lastTxnDate: string;
  linkedBeneficiaries: number;
  riskScore: "LOW" | "MEDIUM" | "HIGH";
  bankName: string;
  accountMasked: string;
  ifsc: string;
  statusTag: "⭐ Frequent" | "NEW" | "VIP" | "Recently Used";
  isBlocked?: boolean;
  isFavourite?: boolean;
  customerSince?: string;
  aadhaarMasked?: string;
  dob?: string;
  gender?: string;
  fullAddress?: string;
}

export interface CustomerCardProps {
  customer: CustomerCardData;
  isSelected?: boolean;
  isMenuOpen?: boolean;
  onSelect?: (customer: CustomerCardData) => void;
  onStartPayout?: (customer: CustomerCardData) => void;
  onViewProfile?: (customer: CustomerCardData) => void;
  onChangeMpin?: (customer: CustomerCardData) => void;
  onToggleFavourite?: (id: string, e: React.MouseEvent) => void;
  onToggleMenu?: (id: string, e: React.MouseEvent) => void;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  isSelected = false,
  isMenuOpen = false,
  onSelect,
  onStartPayout,
  onViewProfile,
  onChangeMpin,
  onToggleFavourite,
  onToggleMenu,
}) => {
  const limitUsagePct = Math.min(
    Math.round((customer.monthlyLimitUsed / customer.monthlyLimitTotal) * 100),
    100
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22 }}
      onClick={() => onSelect?.(customer)}
      className={`w-full max-w-[420px] mx-auto h-full flex flex-col justify-between p-5 rounded-[18px] border transition-all cursor-pointer relative space-y-4 ${
        isSelected
          ? "bg-slate-900 border-[#2563EB] ring-2 ring-blue-500/30 shadow-xl shadow-blue-500/10 text-white"
          : customer.isBlocked
          ? "bg-slate-900/60 border-slate-800 text-slate-300 opacity-75"
          : "bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-100 shadow-lg hover:-translate-y-1 hover:shadow-2xl"
      }`}
    >
      {/* Top Content Section */}
      <div className="space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3.5">
          
          {/* Header Row: 48x48 Circular Avatar, Full Name (18px), Mobile (15px), Customer ID (13px), Star & Status Badge */}
          <div className="flex items-start gap-3 min-w-0">
            {/* Left: 48x48 Circular Avatar */}
            <div className="shrink-0 pt-0.5">
              {customer.photoUrl ? (
                <BlurImage
                  src={customer.photoUrl}
                  blurhash={KNOWN_BLURHASHES.AVATAR_USER}
                  alt={customer.name}
                  className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs"
                  imageClassName="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md">
                  {customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
              )}
            </div>

            {/* Center Details: Full Customer Name (18px, full width), Mobile Number (15px), Customer ID (13px) */}
            <div className="min-w-0 flex-1 space-y-1">
              {/* Line 1: Full Customer Name + Star Favourite Button */}
              <div className="flex items-start justify-between gap-2">
                <h3
                  className="text-[17px] sm:text-[18px] font-bold text-white leading-snug break-words"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {customer.name}
                </h3>

                <button
                  onClick={(e) => onToggleFavourite?.(customer.id, e)}
                  aria-label="Toggle favourite customer"
                  className="p-1 rounded-full text-yellow-500 hover:bg-yellow-950/50 transition-colors shrink-0 -mt-0.5"
                >
                  <Star
                    className={`w-4.5 h-4.5 ${
                      customer.isFavourite ? "fill-yellow-400 text-yellow-500" : "text-slate-600"
                    }`}
                  />
                </button>
              </div>

              {/* Line 2: Mobile Number */}
              <p className="text-[14px] sm:text-[15px] font-semibold text-slate-300 font-mono whitespace-nowrap overflow-hidden text-ellipsis">
                {customer.mobile}
              </p>

              {/* Line 3: Customer ID + Status Tag Badge */}
              <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                <span className="text-[12px] sm:text-[13px] font-mono font-bold text-slate-300 bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 rounded-md inline-block whitespace-nowrap">
                  ID: {customer.id}
                </span>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide bg-blue-950/80 text-blue-300 border border-blue-800 whitespace-nowrap shrink-0">
                  {customer.statusTag}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Row: eKYC Status Badge + Risk Badge */}
          <div className="flex items-center justify-between gap-2 text-[12px] pt-1 font-bold">
            {customer.kycStatus === "VERIFIED" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800 whitespace-nowrap shrink-0">
                <VerifiedIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>✓ eKYC Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800 whitespace-nowrap shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Pending eKYC</span>
              </span>
            )}

            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-wider border whitespace-nowrap shrink-0 ${
                customer.riskScore === "LOW"
                  ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                  : customer.riskScore === "MEDIUM"
                  ? "bg-amber-950 text-amber-300 border-amber-800"
                  : "bg-red-950 text-red-300 border-red-800"
              }`}
            >
              {customer.riskScore} RISK
            </span>
          </div>

          {/* Verified Aadhaar & PII Details Box */}
          {(customer.aadhaarMasked || customer.fullAddress || customer.dob) && (
            <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-800/60 text-[11px] space-y-1 text-slate-300">
              {customer.aadhaarMasked && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Masked Aadhaar:</span>
                  <span className="font-mono font-bold text-amber-300">{customer.aadhaarMasked}</span>
                </div>
              )}
              {customer.dob && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">DOB / Gender:</span>
                  <span className="font-semibold text-slate-200">{customer.dob} ({customer.gender || 'M'})</span>
                </div>
              )}
              {customer.fullAddress && (
                <div className="pt-1 border-t border-blue-900/50 mt-1">
                  <span className="text-slate-400 block font-semibold text-[10px] uppercase tracking-wider">Verified Address</span>
                  <span className="text-slate-200 font-medium text-[11px] leading-tight block">{customer.fullAddress}</span>
                </div>
              )}
            </div>
          )}

          {/* Redesigned Monthly Limit Section */}
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
            {/* Line 1: Label & Amount */}
            <div className="flex items-center justify-between text-[12px] font-bold text-slate-300">
              <span>Monthly Limit</span>
              <span className="font-mono text-white">
                ₹{customer.monthlyLimitUsed.toLocaleString("en-IN")} / ₹{customer.monthlyLimitTotal.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Line 2: Percentage Usage Indicator */}
            <div className="flex items-center justify-between text-[12px] font-bold text-slate-500 dark:text-slate-400">
              <span>Usage</span>
              <span className={`font-mono font-extrabold px-2 py-0.5 rounded-md text-[11px] ${
                limitUsagePct > 90
                  ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  : limitUsagePct > 70
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              }`}>
                {limitUsagePct}% Used
              </span>
            </div>

            {/* Line 3: Progress Bar */}
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${limitUsagePct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  limitUsagePct > 90
                    ? "bg-red-500"
                    : limitUsagePct > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
              />
            </div>
          </div>

          {/* Last Transaction Indicator */}
          <div className="flex items-center justify-between text-[12px] font-bold text-slate-500 dark:text-slate-400 pt-0.5">
            <span>Last Txn: <strong className="text-slate-700 dark:text-slate-300">{customer.lastTxnDate || "Today, 02:45 PM"}</strong></span>
            <span>Txns: <strong className="text-slate-700 dark:text-slate-300 font-mono">{customer.totalTxns || 12}</strong></span>
          </div>

        </div>
      </div>

      {/* Pinned Bottom Actions using flex-direction column & margin-top: auto */}
      <div className="mt-auto pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartPayout?.(customer);
          }}
          aria-label={`Start payout for ${customer.name}`}
          className="flex-1 h-11 min-h-[44px] px-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-[12px] shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 focus:ring-2 focus:ring-blue-600 focus:outline-none"
        >
          <span>Start Payout</span>
          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewProfile?.(customer);
          }}
          aria-label={`View profile of ${customer.name}`}
          className="h-11 min-h-[44px] px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-[12px] transition-colors focus:ring-2 focus:ring-blue-600 focus:outline-none shrink-0"
        >
          View Profile
        </button>

        {/* Overflow Chevron Menu Button */}
        <div className="relative card-action-menu shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu?.(customer.id, e);
            }}
            aria-label="More options"
            className="h-11 min-h-[44px] w-11 min-w-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-[12px] transition-colors focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default CustomerCard;
