"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Wallet,
  Percent,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal
} from "lucide-react";
import { DistributorAPI } from "@/services/distributor-api";

export default function RetailerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const retailerRefId = Number(params?.id);

  const [retailer, setRetailer] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetails() {
      if (!retailerRefId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await DistributorAPI.getRetailerDetails(retailerRefId);
        setRetailer(data);
      } catch (err: any) {
        console.error("Retailer details error:", err);
        setError(err?.response?.data?.detail || "Failed to load retailer profile. Make sure this retailer is mapped to your distributor account.");
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [retailerRefId]);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto mb-2" />
        Loading retailer 360 profile...
      </div>
    );
  }

  if (error || !retailer) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-white mb-1">Access Restricted</h3>
        <p className="text-xs text-rose-300 mb-4">{error || "Retailer not found"}</p>
        <Link
          href="/retailers"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Retailers List
        </Link>
      </div>
    );
  }

  const profile = retailer.profile || {};
  const stats = retailer.business_stats || {};
  const mdrList = retailer.mdr_configurations || [];
  const txns = retailer.recent_transactions || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Link
            href="/retailers"
            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                {profile.store_name || profile.owner_name}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-500/20 font-mono">
                {profile.retailer_code}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Retailer 360 overview, performance, live wallet, and MDR configuration
            </p>
          </div>
        </div>

        <Link
          href={`/mdr?retailer=${retailerRefId}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-bold text-xs hover:brightness-110 shadow-md shadow-amber-500/20 transition-all self-start sm:self-auto"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Configure Retailer MDR
        </Link>
      </div>

      {/* Top Profile & Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-3">
            Profile & Contact
          </span>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Owner: <strong className="text-white">{profile.owner_name}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Mobile: <strong className="text-white font-mono">{profile.mobile}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Email: <strong className="text-white">{profile.email || "—"}</strong></span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Status:</span>
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              {profile.status}
            </span>
          </div>
        </div>

        {/* Live Wallet Card */}
        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
            Retailer Main Wallet
          </span>
          <div className="text-2xl font-black text-white mb-1">
            ₹{Number(retailer.wallet_balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Authoritative real-time balance</p>
          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Services Active:</span>
            <span className="text-amber-300 font-semibold">{retailer.active_services_count || 4} Enabled</span>
          </div>
        </div>

        {/* Business Lifetime Stats */}
        <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-2">
            Lifetime Transaction Volume
          </span>
          <div className="text-2xl font-black text-amber-300 mb-1">
            ₹{Number(stats.total_volume || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-white/[0.06]">
            <span>{stats.total_transactions || 0} Transactions</span>
            <span className="text-emerald-400 font-medium">{stats.success_count || 0} Successful</span>
          </div>
        </div>
      </div>

      {/* Configured MDR Rates */}
      <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-400" />
              Configured MDR Rates for this Retailer
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Distributor custom rates applied exclusively to transactions from this retailer.
            </p>
          </div>
          <Link
            href={`/mdr?retailer=${retailerRefId}`}
            className="text-xs font-semibold text-amber-300 hover:underline"
          >
            Edit MDR Rates
          </Link>
        </div>

        {mdrList.length === 0 ? (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center text-xs text-slate-400">
            No custom MDR configured yet. Default platform rates apply until customized.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06] bg-white/[0.02]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Service</th>
                  <th className="py-2.5 px-3 font-semibold">Mode / Card</th>
                  <th className="py-2.5 px-3 font-semibold text-right">MDR Rate</th>
                  <th className="py-2.5 px-3 font-semibold text-right">GST Rate</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-200">
                {mdrList.map((m: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2.5 px-3 font-bold text-white">{m.service_name}</td>
                    <td className="py-2.5 px-3 text-slate-300">{m.payment_mode}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-300 font-bold">
                      {m.mdr}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                      {m.gst_rate}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Retailer Activity */}
      <div className="rounded-2xl bg-[#111827]/80 backdrop-blur-xl border border-white/[0.08] p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <Receipt className="w-4 h-4 text-blue-400" />
          Recent Retailer Transactions
        </h3>
        {txns.length === 0 ? (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center text-xs text-slate-400">
            No recent transaction history recorded for this retailer.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/[0.06] bg-white/[0.02]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Txn ID</th>
                  <th className="py-2.5 px-3 font-semibold">Service</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-200">
                {txns.map((t: any, i: number) => (
                  <tr key={i}>
                    <td className="py-2.5 px-3 font-mono text-amber-300">{t.transaction_id}</td>
                    <td className="py-2.5 px-3">{t.service_name}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      ₹{Number(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                      {new Date(t.created_at).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
