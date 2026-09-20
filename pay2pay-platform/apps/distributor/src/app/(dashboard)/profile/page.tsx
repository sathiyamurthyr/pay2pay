"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  MapPin,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { DistributorAPI } from "@/services/distributor-api";

export default function DistributorProfilePage() {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const data = await DistributorAPI.getProfile();
        setProfile(data);
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
        Loading distributor profile...
      </div>
    );
  }

  const p = profile || {};

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="pb-2 border-b border-white/[0.06]">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
          Distributor Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Enterprise distributor identity, KYC details, and settlement banking information.
        </p>
      </div>

      {/* Main Identity Banner */}
      <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20">
            {(p.business_name || p.owner_name || "D").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{p.business_name || "Distributor Partner"}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {p.status || "ACTIVE"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Code: <strong className="text-amber-300 font-mono">{p.distributor_code || `DIST-${p.distributor_ref_id}`}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 text-amber-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Verified Enterprise Partner</span>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business & Personal Info */}
        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-xl space-y-3">
          <h3 className="text-xs uppercase tracking-wider font-bold text-amber-400/90 pb-2 border-b border-white/[0.06] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            Business & Ownership
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Owner Name</span>
              <span className="font-semibold text-white">{p.owner_name || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-slate-400">Mobile Number</span>
              <span className="font-mono font-semibold text-white">{p.mobile || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-slate-400">Email Address</span>
              <span className="font-semibold text-white">{p.email || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-slate-400">PAN Number</span>
              <span className="font-mono font-semibold text-amber-300">{p.pan_number || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-slate-400">GST Number</span>
              <span className="font-mono font-semibold text-amber-300">{p.gst_number || "—"}</span>
            </div>
          </div>
        </div>

        {/* Banking & Settlement Info */}
        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-xl space-y-3">
          <h3 className="text-xs uppercase tracking-wider font-bold text-amber-400/90 pb-2 border-b border-white/[0.06] flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-400" />
            Banking & Settlements
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-400">Bank Account</span>
              <span className="font-mono font-semibold text-white">{p.bank_account_number || "••••••••••••"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-slate-400">IFSC Code</span>
              <span className="font-mono font-semibold text-amber-300">{p.ifsc || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-slate-400">City & State</span>
              <span className="font-semibold text-white">{p.city ? `${p.city}, ${p.state}` : "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-slate-400">Pincode</span>
              <span className="font-mono font-semibold text-white">{p.pincode || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-white/[0.04]">
              <span className="text-slate-400">Registered Address</span>
              <span className="font-semibold text-white text-right max-w-[200px] truncate">{p.address || "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
