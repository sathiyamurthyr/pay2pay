"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, UserCheck, ShieldAlert, Clock, Ban, RefreshCw, 
  CheckCircle2, CreditCard, Building2, Shield, TrendingUp, Sparkles
} from "lucide-react";
import apiClient from "@/lib/api";

interface BeneficiaryMetrics {
  total_beneficiaries: number;
  today_registrations: number;
  pending_verification: number;
  cooling_period_active: number;
  active_beneficiaries: number;
  blocked_beneficiaries: number;
  high_risk_beneficiaries: number;
  favourite_count: number;
  monthly_growth_pct: number;
  category_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
}

export default function BeneficiaryDashboardPage() {
  const [metrics, setMetrics] = useState<BeneficiaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/beneficiaries/dashboard");
      setMetrics(res.data.data);
    } catch (err) {
      console.error("Failed to fetch beneficiary metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-400" /> Beneficiary Management Telemetry
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Enterprise Recipient Directory, Penny Drop Verification & Cooling Period Engine
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-sm font-medium transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Telemetry
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-2xs relative overflow-hidden text-[#111827]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-wider">Total Beneficiaries</p>
              <h3 className="text-2xl font-extrabold text-[#111827] mt-1">
                {metrics?.total_beneficiaries ?? 0}
              </h3>
              <p className="text-xs text-[#166534] font-bold flex items-center gap-1 mt-2">
                <TrendingUp className="w-3.5 h-3.5" /> +{metrics?.today_registrations ?? 0} registered today
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#DBEAFE] border border-[#BFDBFE] flex items-center justify-center text-[#1D4ED8]">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-2xs relative overflow-hidden text-[#111827]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-wider">Active &amp; Verified</p>
              <h3 className="text-2xl font-extrabold text-[#166534] mt-1">
                {metrics?.active_beneficiaries ?? 0}
              </h3>
              <p className="text-xs text-[#6B7280] font-medium mt-2">Passed Penny Drop &amp; Name Match</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center text-[#166534]">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-2xs relative overflow-hidden text-[#111827]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-wider">Cooling Period Queue</p>
              <h3 className="text-2xl font-extrabold text-[#D97706] mt-1">
                {metrics?.cooling_period_active ?? 0}
              </h3>
              <p className="text-xs text-[#92400E] font-bold mt-2">24h transfer restriction window</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706]">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E5E7EB] shadow-2xs relative overflow-hidden text-[#111827]">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#6B7280] text-xs font-bold uppercase tracking-wider">Blocked / High Risk</p>
              <h3 className="text-2xl font-extrabold text-[#DC2626] mt-1">
                {(metrics?.blocked_beneficiaries ?? 0) + (metrics?.high_risk_beneficiaries ?? 0)}
              </h3>
              <p className="text-xs text-[#991B1B] font-bold mt-2">Blacklisted accounts &amp; AML alerts</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5] flex items-center justify-center text-[#DC2626]">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Breakdowns & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-2xs text-[#111827]">
          <h3 className="text-base font-extrabold text-[#111827] mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#166534]" /> Status Distribution
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAFBFC] border border-[#E5E7EB]">
              <span className="text-sm font-semibold text-[#374151]">Active</span>
              <span className="text-sm font-extrabold text-[#166534]">{metrics?.active_beneficiaries ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAFBFC] border border-[#E5E7EB]">
              <span className="text-sm font-semibold text-[#374151]">Cooling Period</span>
              <span className="text-sm font-extrabold text-[#D97706]">{metrics?.cooling_period_active ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAFBFC] border border-[#E5E7EB]">
              <span className="text-sm font-semibold text-[#374151]">Pending Verification</span>
              <span className="text-sm font-extrabold text-[#2563EB]">{metrics?.pending_verification ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAFBFC] border border-[#E5E7EB]">
              <span className="text-sm font-semibold text-[#374151]">Blocked</span>
              <span className="text-sm font-extrabold text-[#DC2626]">{metrics?.blocked_beneficiaries ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-2xs text-[#111827]">
          <h3 className="text-base font-extrabold text-[#111827] mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#2563EB]" /> Verification Methods
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FAFBFC] border border-[#E5E7EB]">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#111827]">Penny Drop API</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#DCFCE7] text-[#166534]">Online</span>
              </div>
              <p className="text-xs text-[#6B7280] font-medium mt-1">₹1 credit verification with name match algorithm</p>
            </div>
            <div className="p-4 rounded-xl bg-[#FAFBFC] border border-[#E5E7EB]">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#111827]">UPI VPA Lookup</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#DCFCE7] text-[#166534]">Online</span>
              </div>
              <p className="text-xs text-[#6B7280] font-medium mt-1">Real-time NPCI VPA handle validation</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-2xs text-[#111827]">
          <h3 className="text-base font-extrabold text-[#111827] mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#2563EB]" /> Risk &amp; Cooling Controls
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FAFBFC] border border-[#E5E7EB]">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#111827]">Default Cooling Hours</span>
                <span className="text-sm font-bold text-[#D97706]">24 Hours</span>
              </div>
              <p className="text-xs text-[#6B7280] font-medium mt-1">Prevents immediate high-value transfers after add</p>
            </div>
            <div className="p-4 rounded-xl bg-[#FAFBFC] border border-[#E5E7EB]">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-[#111827]">Name Match Threshold</span>
                <span className="text-sm font-bold text-[#166534]">80.0%</span>
              </div>
              <p className="text-xs text-[#6B7280] font-medium mt-1">SequenceMatcher string similarity cutoff</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
