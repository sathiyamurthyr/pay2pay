"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Users,
  ChevronLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Percent,
  ReceiptText,
  CreditCard,
  RefreshCw,
  ArrowUpRight
} from "lucide-react";
import { SuperDistributorAPI, DistributorDetailData } from "@/services/super-distributor-api";

export default function DistributorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const refId = Number(params.ref_id);

  const [data, setData] = useState<DistributorDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [is403, setIs403] = useState<boolean>(false);

  const fetchDetail = async () => {
    if (!refId || isNaN(refId)) {
      setError("Invalid distributor reference ID.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setIs403(false);
      const res = await SuperDistributorAPI.getDistributorDetail(refId);
      setData(res);
    } catch (err: any) {
      console.error("Error fetching distributor detail:", err);
      if (err?.response?.status === 403) {
        setIs403(true);
        setError("Access Denied: This distributor is not mapped to your Master Distributor account.");
      } else {
        setError(err?.response?.data?.detail || err?.message || "Failed to load distributor details.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [refId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-white/[0.04] rounded-lg w-48" />
        <div className="h-44 bg-white/[0.03] rounded-2xl" />
        <div className="h-72 bg-white/[0.03] rounded-2xl" />
      </div>
    );
  }

  if (is403) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 mt-12">
        <AlertCircle className="w-12 h-12 mx-auto text-rose-400" />
        <h2 className="text-lg font-bold">Unauthorized Hierarchy Access (403)</h2>
        <p className="text-xs text-rose-300/80 leading-relaxed">
          {error || "You are not authorized to view this distributor. Data access is strictly restricted to your authorized downstream network."}
        </p>
        <div className="pt-2">
          <Link
            href="/distributors"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-bold text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Mapped Distributors</span>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !data?.distributor) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
        <span>{error || "Distributor details could not be found."}</span>
        <button onClick={fetchDetail} className="font-bold underline text-rose-200">
          Retry
        </button>
      </div>
    );
  }

  const dist = data.distributor;
  const retailers = data.retailers || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── BREADCRUMB & BACK ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/distributors"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-amber-300 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Distributors</span>
        </Link>

        <Link
          href={`/mdr?distributor_ref_id=${dist.distributor_ref_id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 border border-amber-400/30 text-amber-300 font-bold text-xs hover:bg-amber-400/30 transition-all"
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Configure MDR</span>
        </Link>
      </div>

      {/* ── DISTRIBUTOR PROFILE HERO CARD ── */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400 font-black text-lg">
              {dist.business_name?.charAt(0) || "D"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-100">{dist.business_name}</h1>
                {dist.status === "ACTIVE" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Clock className="w-3 h-3" /> {dist.status}
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-amber-400 mt-0.5">{dist.distributor_code}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Wallet</span>
              <span className="text-base font-extrabold text-emerald-400">
                ₹{(Number(dist.wallet_balance) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Contact & Location Details */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Owner Name</span>
            <span className="text-slate-200 font-medium">{dist.owner_name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Phone Number</span>
            <span className="text-slate-200 font-medium">{dist.mobile}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Email Address</span>
            <span className="text-slate-200 font-medium">{dist.email || "—"}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Location</span>
            <span className="text-slate-200 font-medium">{dist.city || "—"}, {dist.state || "—"}</span>
          </div>
        </div>
      </div>

      {/* ── DOWNSTREAM RETAILERS TABLE ── */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Downstream Retailers ({retailers.length})
            </h2>
          </div>
        </div>

        {retailers.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No retailers currently mapped under this distributor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Retailer Shop</th>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Owner / Contact</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Wallet Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {retailers.map((ret) => (
                  <tr key={ret.retailer_ref_id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-bold text-slate-200">{ret.store_name}</td>
                    <td className="p-3.5 font-mono text-[11px] text-amber-400">{ret.retailer_code}</td>
                    <td className="p-3.5 text-slate-300">
                      <div>{ret.owner_name}</div>
                      <div className="text-[10px] text-slate-500">{ret.mobile}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {ret.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-extrabold text-emerald-400">
                      ₹{(Number(ret.wallet_balance) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
