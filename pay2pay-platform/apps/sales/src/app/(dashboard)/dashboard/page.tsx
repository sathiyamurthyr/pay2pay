"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useSalesAuth } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateShort } from "@/lib/utils";
import {
  Users, Layers, Store, CreditCard, Receipt, TrendingUp,
  Activity, ArrowUpRight, ShieldCheck, Building2, RefreshCw,
  QrCode, Zap, Send, Fingerprint, Sliders, ChevronRight,
  Clock, AlertCircle, CheckCircle2, UserPlus, ClipboardCheck,
  ArrowRight, FileCheck, AlertTriangle
} from "lucide-react";

export default function SalesDashboardPage() {
  const { user } = useSalesAuth();

  // Extract first name (e.g. Vikram from Vikram Rathore, preferring Vikram over system string ASMPay2Pay)
  const firstName =
    user?.full_name && !user.full_name.toLowerCase().includes("asmpay2pay")
      ? user.full_name.trim().split(" ")[0]
      : "Vikram";

  // Fetch Dashboard Metrics
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ["sales-dashboard-metrics"],
    queryFn: async () => {
      const res = await apiClient.get("/sales/dashboard/metrics");
      return res.data;
    },
  });

  // Fetch Recent Transactions
  const { data: recentTxnsData = [] } = useQuery({
    queryKey: ["sales-recent-transactions"],
    queryFn: async () => {
      const res = await apiClient.get("/sales/transactions?limit=6");
      if (Array.isArray(res.data)) return res.data;
      if (res.data && Array.isArray(res.data.items)) return res.data.items;
      return [];
    },
  });

  const kpis = dashboardData?.kpis || {
    total_super_distributors: 0,
    total_distributors: 0,
    total_retailers: 0,
    active_retailers: 0,
    inactive_retailers: 0,
    total_pos_machines: 0,
    active_pos_machines: 0,
    inactive_pos_machines: 0,
    today_transaction_count: 0,
    today_transaction_amount: 0,
    yesterday_transaction_count: 0,
    yesterday_transaction_amount: 0,
    current_month_transaction_amount: 0,
    current_month_transaction_count: 0,
    total_transaction_count: 0,
    total_transaction_volume: 0,
    mdr_pos_volume: 0,
    mdr_estimated_earnings: 0,
    pending_registrations: {
      total: 0,
      kyc_pending: 0,
      video_kyc_pending: 0,
      admin_approval: 0,
    },
    my_registrations: {
      today: 0,
      this_month: 0,
      pending: 0,
      approved: 0,
    },
  };

  const pendingReg = kpis.pending_registrations || {
    total: 0,
    kyc_pending: 0,
    video_kyc_pending: 0,
    admin_approval: 0,
  };

  const myReg = kpis.my_registrations || {
    today: 0,
    this_month: 0,
    pending: 0,
    approved: 0,
  };

  const services = dashboardData?.services_breakdown || dashboardData?.today_service_breakdown || {};
  const recentTxns = Array.isArray(recentTxnsData) ? recentTxnsData : [];

  return (
    <div className="space-y-7 pb-12 font-sans text-[#1F2937]">
      {/* ── Top Executive Welcome Banner ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-7 shadow-sm relative overflow-hidden">
        {/* Subtle decorative background accent */}
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-[#F8E6EE]/60 to-transparent pointer-events-none rounded-r-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              {user?.company_name ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-amber-300 text-xs font-bold">
                  <Building2 className="w-3.5 h-3.5 text-[#D97706]" />
                  Company: {user.company_name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8E6EE] text-[#94003A] border border-pink-200 text-xs font-bold">
                  <Building2 className="w-3.5 h-3.5 text-[#94003A]" />
                  Tenant: {user?.tenant_name || "Enterprise Platform"}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Company Isolated
              </span>
            </div>

            {/* Title & Subtitle */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2937] tracking-tight">
              Welcome back, <span className="text-[#94003A]">{firstName}!</span>
            </h1>
            <p className="text-[#6B7280] text-xs sm:text-sm max-w-2xl font-normal">
              Monitor your authorized business network, POS activity, transactions and MDR performance.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold border border-gray-300 shadow-sm transition active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#94003A] ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Data</span>
            </button>

            <Link
              href="/hierarchy/retailers"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#94003A] hover:bg-[#78002F] text-white text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Store className="w-4 h-4 text-[#E7B631]" />
              <span>Retailer Directory</span>
            </Link>

            <Link
              href="/registrations"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E7B631] hover:bg-[#D3A51F] text-[#1F2937] text-xs font-bold shadow-sm transition active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-[#94003A]" />
              <span>Register Customer</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Section 1: Network Overview (Hierarchy) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#94003A]" />
            Network Overview
          </h2>
          <span className="text-xs text-[#6B7280] font-medium">Live Authorized Hierarchy</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
          {/* Super Distributors */}
          <Link
            href="/hierarchy/super-distributors"
            className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200 hover:border-[#94003A]/50 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between text-[#6B7280] mb-1.5">
              <span className="text-xs font-semibold">Super Distributors</span>
              <span className="p-1.5 rounded-lg bg-[#F8E6EE] text-[#94003A] group-hover:bg-[#94003A] group-hover:text-white transition">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#94003A]">
              {kpis.total_super_distributors}
            </div>
            <div className="text-[11px] text-[#6B7280] mt-1 flex items-center gap-1 group-hover:text-[#94003A] transition font-medium">
              <span>View Hubs</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Distributors */}
          <Link
            href="/hierarchy/distributors"
            className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200 hover:border-[#94003A]/50 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between text-[#6B7280] mb-1.5">
              <span className="text-xs font-semibold">Distributors</span>
              <span className="p-1.5 rounded-lg bg-[#F8E6EE] text-[#94003A] group-hover:bg-[#94003A] group-hover:text-white transition">
                <Layers className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#94003A]">
              {kpis.total_distributors}
            </div>
            <div className="text-[11px] text-[#6B7280] mt-1 flex items-center gap-1 group-hover:text-[#94003A] transition font-medium">
              <span>View Channel</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Retailers */}
          <Link
            href="/hierarchy/retailers"
            className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200 hover:border-[#94003A]/50 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between text-[#6B7280] mb-1.5">
              <span className="text-xs font-semibold">Retailers</span>
              <span className="p-1.5 rounded-lg bg-[#F8E6EE] text-[#94003A] group-hover:bg-[#94003A] group-hover:text-white transition">
                <Store className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#94003A]">
              {kpis.total_retailers}
            </div>
            <div className="text-[11px] text-[#16A34A] mt-1 font-bold">
              {kpis.active_retailers} Active
            </div>
          </Link>

          {/* Active Retailers */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-[#6B7280] mb-1.5">
              <span className="text-xs font-semibold">Active Retailers</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#16A34A]">
              {kpis.active_retailers}
            </div>
            <div className="text-[11px] text-[#6B7280] mt-1 font-medium">
              {kpis.inactive_retailers} Inactive / Pending
            </div>
          </div>

          {/* POS Terminals */}
          <Link
            href="/pos-machines"
            className="p-4 sm:p-5 rounded-2xl bg-white border border-gray-200 hover:border-[#94003A]/50 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex items-center justify-between text-[#6B7280] mb-1.5">
              <span className="text-xs font-semibold">POS Terminals</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-[#D97706] group-hover:bg-[#E7B631] group-hover:text-[#1F2937] transition">
                <QrCode className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#94003A]">
              {kpis.total_pos_machines}
            </div>
            <div className="text-[11px] text-[#6B7280] mt-1 flex items-center gap-1 group-hover:text-[#94003A] transition font-medium">
              <span>{kpis.active_pos_machines} Active Devices</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </div>

      {/* ── Section 2: Registrations & Onboarding Suite ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pending Registrations Card */}
        <Link
          href="/registrations"
          className="lg:col-span-1 p-5 rounded-2xl bg-white border border-gray-200 hover:border-[#94003A]/50 shadow-sm hover:shadow-md transition flex flex-col justify-between group"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-[#94003A]" />
                Pending Registrations
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold">
                Action Required
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <div className="text-3xl sm:text-4xl font-black text-[#94003A]">
                {pendingReg.total}
              </div>
              <span className="text-xs text-[#6B7280]">in verification queue</span>
            </div>

            <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B7280] flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-blue-500" />
                  KYC Pending
                </span>
                <span className="font-bold text-[#1F2937]">{pendingReg.kyc_pending}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B7280] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-purple-500" />
                  Video KYC Pending
                </span>
                <span className="font-bold text-[#1F2937]">{pendingReg.video_kyc_pending}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6B7280] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  Admin Approval
                </span>
                <span className="font-bold text-[#1F2937]">{pendingReg.admin_approval}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-[#94003A] group-hover:text-[#78002F]">
            <span>Open Registration List</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </Link>

        {/* My Registrations Section */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#94003A]" />
                  My Registrations
                </h3>
                <p className="text-[11px] text-[#6B7280] mt-0.5">
                  Directly measures your field onboarding activity and conversion rate
                </p>
              </div>

              <Link
                href="/registrations"
                className="text-xs font-bold text-[#94003A] hover:text-[#78002F] flex items-center gap-1 transition"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Today */}
              <div className="p-4 rounded-xl bg-[#F5F6FA] border border-gray-200/80 text-center">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Today</div>
                <div className="text-2xl sm:text-3xl font-black text-[#94003A] mt-1.5">
                  {myReg.today}
                </div>
                <div className="text-[10px] text-[#6B7280] mt-0.5">New Submissions</div>
              </div>

              {/* This Month */}
              <div className="p-4 rounded-xl bg-[#F5F6FA] border border-gray-200/80 text-center">
                <div className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">This Month</div>
                <div className="text-2xl sm:text-3xl font-black text-[#94003A] mt-1.5">
                  {myReg.this_month}
                </div>
                <div className="text-[10px] text-[#6B7280] mt-0.5">Month Volume</div>
              </div>

              {/* Pending */}
              <div className="p-4 rounded-xl bg-[#FEF3C7]/40 border border-amber-200 text-center">
                <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending</div>
                <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1.5">
                  {myReg.pending}
                </div>
                <div className="text-[10px] text-amber-700/80 mt-0.5">In Verification</div>
              </div>

              {/* Approved */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Approved</div>
                <div className="text-2xl sm:text-3xl font-black text-[#16A34A] mt-1.5">
                  {myReg.approved}
                </div>
                <div className="text-[10px] text-emerald-700/80 mt-0.5">Active Merchants</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-[#6B7280]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
              Authorized for Super Distributor, Distributor &amp; Retailer KYC
            </span>
            <Link
              href="/register/retailer"
              className="font-bold text-[#94003A] hover:underline"
            >
              + Quick Onboard Retailer
            </Link>
          </div>
        </div>
      </div>

      {/* ── Section 3: Financial & Transaction Business ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#94003A]" />
            Transaction &amp; MDR Business
          </h2>
          <span className="text-xs text-[#6B7280] font-medium">Live Financial Ledger</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Business */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Today&apos;s Business
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#94003A] mt-2">
                {formatCurrency(kpis.today_transaction_amount)}
              </div>
              <div className="text-xs font-bold text-[#1F2937] mt-1">
                {kpis.today_transaction_count} Transactions
              </div>
            </div>
            <div className="text-[11px] text-[#6B7280] mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
              <span>vs Yesterday</span>
              <span className="font-semibold text-gray-500">—</span>
            </div>
          </div>

          {/* Current Month Business */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Current Month Business
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#94003A] mt-2">
                {formatCurrency(kpis.current_month_transaction_amount)}
              </div>
              <div className="text-xs font-bold text-[#1F2937] mt-1">
                {kpis.current_month_transaction_count || kpis.total_transaction_count} Transactions
              </div>
            </div>
            <div className="text-[11px] text-[#6B7280] mt-3 pt-2.5 border-t border-gray-100">
              Total Recorded Volume in Scope
            </div>
          </div>

          {/* Total Transactions */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                Total Transactions
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#94003A] mt-2">
                {kpis.total_transaction_count.toLocaleString()}
              </div>
              <div className="text-xs text-[#6B7280] mt-1 font-medium">
                Gross Volume: <span className="font-bold text-[#1F2937]">{formatCurrency(kpis.total_transaction_volume)}</span>
              </div>
            </div>
            <div className="text-[11px] text-[#16A34A] font-semibold mt-3 pt-2.5 border-t border-gray-100 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% Tenant Isolated
            </div>
          </div>

          {/* MDR POS Business */}
          <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                MDR POS Business
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#94003A] mt-2">
                {formatCurrency(kpis.mdr_pos_volume)}
              </div>
              <div className="text-xs font-bold text-[#D97706] mt-1">
                Est. Commission: {formatCurrency(kpis.mdr_estimated_earnings)}
              </div>
            </div>
            <div className="text-[11px] text-[#6B7280] mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
              <span>Card Swipes</span>
              <span className="font-bold text-[#94003A]">1.5% Avg Rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 4: Service Performance & Recent Transactions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Performance */}
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#94003A]" />
              Service Performance
            </h3>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#F8E6EE] text-[#94003A]">
              Live Breakdown
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              { key: "POS", label: "POS / Card", icon: QrCode, color: "text-[#94003A]", bg: "bg-[#F8E6EE]" },
              { key: "DMT", label: "Money Transfer", icon: Send, color: "text-blue-700", bg: "bg-blue-50" },
              { key: "AEPS", label: "AEPS", icon: Fingerprint, color: "text-emerald-700", bg: "bg-emerald-50" },
              { key: "BBPS", label: "BBPS", icon: Receipt, color: "text-purple-700", bg: "bg-purple-50" },
              { key: "PAYOUT", label: "Vendor Payout", icon: TrendingUp, color: "text-amber-700", bg: "bg-amber-50" },
              { key: "RECHARGE", label: "Mobile Recharge", icon: Zap, color: "text-rose-700", bg: "bg-rose-50" },
            ].map((srv) => {
              const data = services[srv.key] || { count: 0, amount: 0 };
              const Icon = srv.icon;
              return (
                <div
                  key={srv.key}
                  className="p-3 rounded-xl bg-[#F5F6FA] border border-gray-200/70 flex items-center justify-between hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`p-1.5 rounded-lg ${srv.bg} ${srv.color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-[#1F2937]">{srv.label}</div>
                      <div className="text-[10px] text-[#6B7280]">{data.count} Txns</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-[#94003A]">
                      {formatCurrency(data.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions in Scope */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B7280] flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#94003A]" />
                Recent Transactions
              </h3>
              <p className="text-[11px] text-[#6B7280] mt-0.5">
                Authorized network transactions in your scope
              </p>
            </div>

            <Link
              href="/transactions"
              className="text-xs font-bold text-[#94003A] hover:text-[#78002F] flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentTxns.length === 0 ? (
            <div className="py-16 text-center text-[#6B7280] text-xs">
              <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <div className="font-semibold text-gray-600">No recent transactions recorded in your scope.</div>
              <div className="text-[11px] text-gray-400 mt-1">Live customer transactions from your mapped network will appear here automatically.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-[#6B7280] uppercase text-[10px] font-bold tracking-wider">
                    <th className="py-2.5 px-3">Transaction ID</th>
                    <th className="py-2.5 px-3">Retailer</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentTxns.map((txn: any, idx: number) => (
                    <tr
                      key={txn.transaction_id || txn.public_id || txn.id || `${txn.txn_id || "txn"}-${idx}`}
                      className="hover:bg-[#F5F6FA] transition"
                    >
                      <td className="py-3 px-3 font-mono font-bold text-[#1F2937]">
                        {txn.txn_id || txn.id || "TXN"}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#1F2937]">
                          {txn.retailer_name || "Merchant Store"}
                        </div>
                        <div className="text-[10px] text-[#6B7280]">
                          {txn.distributor_name || "Direct Channel"}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#F8E6EE] text-[#94003A]">
                          {txn.service_name || txn.service || "POS"}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-extrabold text-[#94003A]">
                        {formatCurrency(txn.amount)}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          (txn.status || "SUCCESS").toUpperCase() === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {txn.status || "SUCCESS"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-[#6B7280] font-medium text-[11px]">
                        {formatDateShort(txn.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
