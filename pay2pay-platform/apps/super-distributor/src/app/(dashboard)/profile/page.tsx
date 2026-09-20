"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Wallet,
  Crown,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { SuperDistributorAPI, SuperDistributorProfileData } from "@/services/super-distributor-api";

export default function SuperDistributorProfilePage() {
  const [profile, setProfile] = useState<SuperDistributorProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await SuperDistributorAPI.getProfile();
      setProfile(res);
    } catch (err: any) {
      console.error("Error loading SD profile:", err);
      setError(err?.response?.data?.detail || err?.message || "Failed to load profile details.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white/[0.04] rounded-lg w-48" />
        <div className="h-44 bg-white/[0.03] rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-white/[0.03] rounded-2xl" />
          <div className="h-64 bg-white/[0.03] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
        <span>{error || "Profile could not be loaded."}</span>
        <button onClick={fetchProfile} className="font-bold underline text-rose-200">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
              Master Hub Profile
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400" /> Tier 2 Partner
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Authoritative organization profile, hierarchy credentials, and banking metadata.
          </p>
        </div>

        <button
          onClick={fetchProfile}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-400" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── HERO PROFILE CARD ── */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-black text-xl">
              <Crown className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-100">{profile.business_name}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Active Partner
                </span>
              </div>
              <p className="font-mono text-xs text-amber-400 mt-0.5">{profile.super_distributor_code}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Wallet Balance</span>
              <span className="text-lg font-extrabold text-emerald-400">
                ₹{(Number(profile.wallet_balance) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Summary Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Authorized Owner</span>
            <span className="text-slate-200 font-medium">{profile.owner_name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Mobile / Login ID</span>
            <span className="text-slate-200 font-medium">{profile.mobile}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Email Address</span>
            <span className="text-slate-200 font-medium">{profile.email || "—"}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Credit Limit</span>
            <span className="text-slate-200 font-bold">₹{(Number(profile.credit_limit) || 0).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* ── METADATA SECTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Location & Registered Office */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] space-y-4">
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Registered Address & Location
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Address</span>
              <p className="text-slate-200 mt-0.5">{profile.address || "—"}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">City</span>
                <span className="text-slate-200 font-medium">{profile.city || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">State</span>
                <span className="text-slate-200 font-medium">{profile.state || "—"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">PIN Code</span>
                <span className="text-slate-200 font-medium">{profile.pincode || "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: KYC & Banking */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] space-y-4">
          <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" /> Compliance & Banking
          </h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">PAN Number</span>
              <span className="text-slate-200 font-mono font-medium">{profile.pan_number || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">GST Number</span>
              <span className="text-slate-200 font-mono font-medium">{profile.gst_number || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Bank Account</span>
              <span className="text-slate-200 font-mono font-medium">{profile.bank_account_number || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold">IFSC Code</span>
              <span className="text-slate-200 font-mono font-medium">{profile.ifsc || "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
