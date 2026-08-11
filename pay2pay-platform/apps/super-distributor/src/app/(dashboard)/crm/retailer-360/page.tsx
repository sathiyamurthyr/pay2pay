"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  UserCheck,
  RefreshCw,
  Store,
  Wallet,
  CreditCard,
  Ticket,
  ShieldCheck,
  Phone,
  Mail,
  Building2
} from "lucide-react";

export default function Retailer360Page() {
  const [retailers, setRetailers] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [profile360, setProfile360] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchRetailers = async () => {
    try {
      const res = await api.get("/api/v1/retailers/");
      setRetailers(res.data);
      if (res.data.length > 0) {
        setSelectedId(res.data[0].public_id);
        fetch360(res.data[0].public_id);
      }
    } catch (err) {
      console.error("Failed to fetch retailers", err);
    } finally {
      setLoading(false);
    }
  };

  const fetch360 = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/api/v1/crm/retailer-360/${id}`);
      setProfile360(res.data);
    } catch (err) {
      console.error("Failed to fetch 360 view", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailers();
  }, []);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedId(id);
    fetch360(id);
  };

  return (
    <div className="space-y-8">
      {/* Header & Merchant Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-emerald-400" />
            Retailer 360° Profile Inspector
          </h1>
          <p className="mt-1 text-slate-400">
            Comprehensive customer view: business details, terminals, wallet balance, & support tickets
          </p>
        </div>
        <div className="w-full sm:w-72">
          <select
            value={selectedId}
            onChange={handleSelectChange}
            className="w-full rounded-lg bg-slate-900 border border-slate-800 p-2.5 text-sm font-semibold text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            {retailers.map((r) => (
              <option key={r.public_id} value={r.public_id}>
                {r.merchant_name} ({r.business_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Profile 360 Grid */}
      {loading || !profile360 ? (
        <div className="flex h-64 items-center justify-center text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" /> Loading 360° Profile...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-2xl">
                {profile360.merchant_name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-100">{profile360.merchant_name}</h2>
                <p className="text-slate-400 flex items-center gap-2 text-sm mt-0.5">
                  <Building2 className="h-4 w-4 text-slate-500" /> {profile360.business_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 font-mono text-xs font-bold text-emerald-400">
                KYC: {profile360.kyc_status}
              </span>
              <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 font-mono text-xs font-bold text-blue-400">
                Risk Score: {profile360.risk_score} / 100
              </span>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Wallet Balance</span>
                <Wallet className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">₹{profile360.wallet_balance.toLocaleString("en-IN")}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>POS Terminals</span>
                <CreditCard className="h-4 w-4 text-blue-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{profile360.total_terminals} Terminals</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Lifetime Settlement Vol</span>
                <Store className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">₹{profile360.lifetime_volume.toLocaleString("en-IN")}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Open Support Tickets</span>
                <Ticket className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{profile360.open_tickets_count} Tickets</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
