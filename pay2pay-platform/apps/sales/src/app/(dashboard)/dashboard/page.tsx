"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useSalesAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Users, Layers, Store, CreditCard, Receipt, TrendingUp,
  Activity, ArrowUpRight, ShieldCheck, Building2, RefreshCw,
  QrCode, Zap, Send, Fingerprint, Sliders, ChevronRight,
  Clock, AlertCircle, CheckCircle2
} from "lucide-react";

export default function SalesDashboardPage() {
  const { user } = useSalesAuth();

  // Fetch Dashboard Metrics
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ["sales-dashboard-metrics"],
    queryFn: async () => {
      const res = await apiClient.get("/sales/dashboard/metrics");
      return res.data;
    },
  });

  // Fetch Recent Transactions
  const { data: recentTxns = [] } = useQuery({
    queryKey: ["sales-recent-transactions"],
    queryFn: async () => {
      const res = await apiClient.get("/sales/transactions?limit=6");
      return Array.isArray(res.data) ? res.data : [];
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
    current_month_transaction_amount: 0,
    total_transaction_count: 0,
    total_transaction_volume: 0,
    mdr_pos_volume: 0,
    mdr_estimated_earnings: 0,
  };

  const services = dashboardData?.services_breakdown || {};

  return (
    <div className="space-y-8 pb-12">
      {/* Executive Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Tenant: {user?.tenant_name || "Assigned Tenant"}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {user?.territory || "Field Operations"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.full_name || "Sales Executive"}!
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Live hierarchy monitoring, POS terminal telemetry, and transactional business metrics for your authorized territory.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
              Refresh Data
            </button>
            <Link
              href="/hierarchy/retailers"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
            >
              <Store className="w-4 h-4" />
              Retailer Directory
            </Link>
          </div>
        </div>
      </div>

      {/* Section 1: Hierarchy KPIs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Hierarchy & Network Reach
          </h2>
          <span className="text-xs text-slate-500">Live Database Count</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Super Distributors */}
          <Link
            href="/hierarchy/super-distributors"
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-indigo-500/40 transition group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Super Dist</span>
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-white">{kpis.total_super_distributors}</div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-indigo-400 transition">
              <span>View Hubs</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Distributors */}
          <Link
            href="/hierarchy/distributors"
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-indigo-500/40 transition group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Distributors</span>
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition">
                <Layers className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-white">{kpis.total_distributors}</div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-blue-400 transition">
              <span>View Distributors</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Total Retailers */}
          <Link
            href="/hierarchy/retailers"
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-indigo-500/40 transition group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Total Retailers</span>
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition">
                <Store className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-white">{kpis.total_retailers}</div>
            <div className="text-[11px] text-emerald-400 mt-1 font-medium">
              {kpis.active_retailers} Active ({Math.round((kpis.active_retailers / (kpis.total_retailers || 1)) * 100)}%)
            </div>
          </Link>

          {/* Active Retailers */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Active Merchants</span>
              <span className="p-2 rounded-xl bg-teal-500/10 text-teal-400">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-teal-400">{kpis.active_retailers}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {kpis.inactive_retailers} Inactive / Pending
            </div>
          </div>

          {/* Active POS */}
          <Link
            href="/pos-machines"
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-indigo-500/40 transition group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">POS Terminals</span>
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition">
                <QrCode className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-amber-300">{kpis.total_pos_machines}</div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 group-hover:text-amber-400 transition">
              <span>{kpis.active_pos_machines} Active Devices</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </div>

      {/* Section 2: Financial & Transaction KPIs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Transaction Volumes & MDR Business
          </h2>
          <span className="text-xs text-slate-500">Live Financial Ledger</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Transactions */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-slate-800 shadow-lg">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today&apos;s Volume</div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-2">
              {formatCurrency(kpis.today_transaction_amount)}
            </div>
            <div className="text-xs text-indigo-400 mt-1 font-medium flex items-center gap-1">
              <span>{kpis.today_transaction_count} Transactions Today</span>
            </div>
          </div>

          {/* Current Month Volume */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-blue-950/40 border border-slate-800 shadow-lg">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Month Business</div>
            <div className="text-2xl sm:text-3xl font-black text-blue-300 mt-2">
              {formatCurrency(kpis.current_month_transaction_amount)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Total Recorded Volume in Scope
            </div>
          </div>

          {/* Total Transactions */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-slate-800 shadow-lg">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Transactions</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">
              {kpis.total_transaction_count.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Gross Volume: {formatCurrency(kpis.total_transaction_volume)}
            </div>
          </div>

          {/* MDR Earnings */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-amber-950/40 border border-slate-800 shadow-lg">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">MDR POS Business</div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-2">
              {formatCurrency(kpis.mdr_pos_volume)}
            </div>
            <div className="text-xs text-amber-400/80 mt-1">
              Est. Commission: {formatCurrency(kpis.mdr_estimated_earnings)}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Today's Service Breakdown & Recent Txns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services Breakdown */}
        <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              Service Performance
            </h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              Live Breakdown
            </span>
          </div>

          <div className="space-y-3">
            {[
              { key: "POS", label: "POS Swipe & Card", icon: QrCode, color: "text-amber-400", bg: "bg-amber-400/10" },
              { key: "DMT", label: "Money Transfer (DMT)", icon: Send, color: "text-blue-400", bg: "bg-blue-400/10" },
              { key: "AEPS", label: "Aadhaar Pay (AEPS)", icon: Fingerprint, color: "text-emerald-400", bg: "bg-emerald-400/10" },
              { key: "BBPS", label: "Bill Payments (BBPS)", icon: Receipt, color: "text-indigo-400", bg: "bg-indigo-400/10" },
              { key: "PAYOUT", label: "Vendor Payouts", icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-400/10" },
              { key: "RECHARGE", label: "Mobile Recharges", icon: Zap, color: "text-rose-400", bg: "bg-rose-400/10" },
            ].map((srv) => {
              const data = services[srv.key] || { count: 0, amount: 0 };
              const Icon = srv.icon;
              return (
                <div
                  key={srv.key}
                  className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between hover:bg-slate-950 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className={`p-2 rounded-xl ${srv.bg} ${srv.color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white">{srv.label}</div>
                      <div className="text-[10px] text-slate-400">{data.count} Transactions</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-200">
                      {formatCurrency(data.amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions in Scope */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-indigo-400" />
                Recent Transactions in Authorized Scope
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Real-time activity across your mapped retailers
              </p>
            </div>

            <Link
              href="/transactions"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {recentTxns.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No recent transactions recorded in your scope.
              </div>
            ) : (
              recentTxns.map((txn: any) => (
                <div
                  key={txn.id || txn.txn_id}
                  className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between hover:bg-slate-950 transition text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold font-mono text-[10px]">
                      {txn.service?.substring(0, 3) || "TXN"}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        {txn.retailer_name || "Merchant"}
                        <span className="text-[10px] font-mono text-slate-500">
                          {txn.txn_id}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatDate(txn.created_at)} &bull; {txn.distributor_name || "Direct"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-white">{formatCurrency(txn.amount)}</div>
                    <div className="text-[10px] font-semibold text-emerald-400">
                      {txn.status || "SUCCESS"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
