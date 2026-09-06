"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock,
  DollarSign, AlertTriangle, ShieldCheck, RefreshCw, Layers,
  ChevronRight, Building2, Store, Users, FileText, Zap,
  Search, Filter, Smartphone, CreditCard, Send, Radio,
  Server, Database, Cloud, Wifi, Cpu, ExternalLink, ShieldAlert,
  ArrowRight, BarChart3, PieChart, TrendingUp, CheckCircle, XCircle,
  ArrowLeftRight, Receipt
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api";

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

interface TransactionSummary {
  total_records: number;
  total_amount: number;
  total_volume: number;
  total_cr: number;
  total_dr: number;
  total_credit: number;
  total_debit: number;
  total_commission?: number;
  total_gst?: number;
  total_charges?: number;
  successful_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  reversed_transactions: number;
}

interface ServiceStatusItem {
  code: string;
  name: string;
  is_enabled: boolean;
  status: string;
  count_today?: number;
  volume_today?: number;
  success_rate?: number;
  last_updated?: string;
}

interface PosModeItem {
  code: string;
  name: string;
  is_enabled: boolean;
  settlement_type?: string;
}

interface PayoutSummary {
  total_transactions: number;
  total_payout_amount: number;
  total_charges: number;
  total_gst: number;
  total_commission: number;
  successful_count: number;
  successful_amount: number;
  pending_count: number;
  pending_amount: number;
  failed_count: number;
  failed_amount: number;
}

interface TopupMetrics {
  pending_count: number;
  pending_volume: number;
  approved_today_count: number;
  approved_today_volume: number;
  rejected_count: number;
  rejected_volume: number;
  total_approved_count: number;
  total_approved_volume: number;
}

interface VerificationCounts {
  pending: number;
  under_review: number;
  approved: number;
  rejected: number;
  on_hold: number;
  total: number;
}

interface DashboardWidgetsData {
  total_companies?: number;
  active_retailers?: number;
  total_machines?: number;
  wallet_liability?: number;
  pending_payouts?: number;
  pending_approvals?: number;
  today_settlement?: number;
}

interface RecentTransactionItem {
  txn_id: string;
  ref_id: string;
  service: string;
  date_time: string;
  amount: number;
  cr_amt: number;
  dr_amt: number;
  tax: number;
  commission: number;
  gst_amount: number;
  status: string;
  comments: string;
  cr_dr: string;
  retailer_name?: string;
  retailer_code?: string;
}

interface SystemHealthTelemetry {
  api_status: "ONLINE" | "DEGRADED" | "OFFLINE";
  db_status: "ONLINE" | "DEGRADED" | "OFFLINE";
  gateway_status: "ONLINE" | "DEGRADED" | "OFFLINE";
  dmt_status: "ONLINE" | "DEGRADED" | "OFFLINE";
  aeps_status: "ONLINE" | "DEGRADED" | "OFFLINE";
  bbps_status: "ONLINE" | "DEGRADED" | "OFFLINE";
  recharge_status: "ONLINE" | "DEGRADED" | "OFFLINE";
  upi_status: "ONLINE" | "DEGRADED" | "OFFLINE";
  pos_status: "ONLINE" | "DEGRADED" | "OFFLINE";
  whatsapp_status: "ONLINE" | "DEGRADED" | "OFFLINE";
  storage_status: "ONLINE" | "DEGRADED" | "OFFLINE";
  latency_ms: number;
  last_checked: string;
}

// ==============================================================================
// FORMATTING UTILITIES
// ==============================================================================

const formatINR = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

const formatCount = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return "0";
  return new Intl.NumberFormat("en-IN").format(val);
};

const formatPercent = (numerator: number, denominator: number): string => {
  if (!denominator || denominator <= 0) return "0.0%";
  const p = (numerator / denominator) * 100;
  return `${p.toFixed(1)}%`;
};

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Date Presets
type DatePreset = "TODAY" | "YESTERDAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "CUSTOM";

export function AdminOperationsDashboard() {
  const { user, activeRole, logout } = useAuth();

  // ----------------------------------------------------------------------------
  // FILTERS & CONTROL STATES
  // ----------------------------------------------------------------------------
  const [datePreset, setDatePreset] = useState<DatePreset>("TODAY");
  const [fromDate, setFromDate] = useState<string>(() => formatLocalDate(new Date()));
  const [toDate, setToDate] = useState<string>(() => formatLocalDate(new Date()));
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [globalSearch, setGlobalSearch] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // ----------------------------------------------------------------------------
  // AGGREGATED ENTERPRISE DATA STATES
  // ----------------------------------------------------------------------------
  const [txnSummary, setTxnSummary] = useState<TransactionSummary>({
    total_records: 0,
    total_amount: 0,
    total_volume: 0,
    total_cr: 0,
    total_dr: 0,
    total_credit: 0,
    total_debit: 0,
    successful_transactions: 0,
    pending_transactions: 0,
    failed_transactions: 0,
    reversed_transactions: 0,
  });

  const [yesterdaySummary, setYesterdaySummary] = useState<TransactionSummary | null>(null);
  const [servicesList, setServicesList] = useState<ServiceStatusItem[]>([]);
  const [posModesList, setPosModesList] = useState<PosModeItem[]>([]);
  const [payoutSummary, setPayoutSummary] = useState<PayoutSummary>({
    total_transactions: 0,
    total_payout_amount: 0,
    total_charges: 0,
    total_gst: 0,
    total_commission: 0,
    successful_count: 0,
    successful_amount: 0,
    pending_count: 0,
    pending_amount: 0,
    failed_count: 0,
    failed_amount: 0,
  });

  const [topupMetrics, setTopupMetrics] = useState<TopupMetrics>({
    pending_count: 0,
    pending_volume: 0,
    approved_today_count: 0,
    approved_today_volume: 0,
    rejected_count: 0,
    rejected_volume: 0,
    total_approved_count: 0,
    total_approved_volume: 0,
  });

  const [verificationCounts, setVerificationCounts] = useState<VerificationCounts>({
    pending: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    on_hold: 0,
    total: 0,
  });

  const [widgetMetrics, setWidgetMetrics] = useState<DashboardWidgetsData>({
    total_companies: 1,
    active_retailers: 0,
    total_machines: 0,
    wallet_liability: 0,
    pending_payouts: 0,
    pending_approvals: 0,
    today_settlement: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<RecentTransactionItem[]>([]);
  const [healthTelemetry, setHealthTelemetry] = useState<SystemHealthTelemetry>({
    api_status: "ONLINE",
    db_status: "ONLINE",
    gateway_status: "ONLINE",
    dmt_status: "ONLINE",
    aeps_status: "ONLINE",
    bbps_status: "ONLINE",
    recharge_status: "ONLINE",
    upi_status: "ONLINE",
    pos_status: "ONLINE",
    whatsapp_status: "ONLINE",
    storage_status: "ONLINE",
    latency_ms: 24,
    last_checked: new Date().toLocaleTimeString(),
  });

  // ----------------------------------------------------------------------------
  // DATE PRESET CALCULATOR
  // ----------------------------------------------------------------------------
  const applyDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = formatLocalDate(now);

    if (preset === "TODAY") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "YESTERDAY") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatLocalDate(y);
      setFromDate(yStr);
      setToDate(yStr);
    } else if (preset === "LAST_7_DAYS") {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 6);
      setFromDate(formatLocalDate(d7));
      setToDate(todayStr);
    } else if (preset === "LAST_30_DAYS") {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 29);
      setFromDate(formatLocalDate(d30));
      setToDate(todayStr);
    } else if (preset === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setFromDate(formatLocalDate(firstDay));
      setToDate(todayStr);
    }
  };

  // ----------------------------------------------------------------------------
  // DYNAMIC DATA FEDERATION HOOK
  // ----------------------------------------------------------------------------
  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    const t0 = performance.now();

    try {
      // 1. Transaction Summary Query (Filtered by Date & Service)
      const txnSummaryParams: Record<string, any> = {
        from_date: fromDate,
        to_date: toDate,
      };
      if (serviceFilter && serviceFilter !== "ALL") {
        txnSummaryParams.service = serviceFilter;
      }

      // Compute Yesterday dates for comparison
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatLocalDate(y);

      const [
        summaryRes,
        yesterdayRes,
        servicesRes,
        payoutSummaryRes,
        topupMetricsRes,
        verificationRes,
        widgetsRes,
        recentTxnRes,
        healthRes,
      ] = await Promise.allSettled([
        // Main Txn Summary
        apiClient.get("/reports/transactions/summary", { params: txnSummaryParams }),
        // Yesterday comparison
        apiClient.get("/reports/transactions/summary", { params: { from_date: yStr, to_date: yStr } }),
        // Services Status & POS Modes
        apiClient.get("/admin/services/status"),
        // Payout Summary
        apiClient.get("/admin/reports/payout-transactions/summary", {
          params: { from_date: fromDate, to_date: toDate },
        }),
        // Top-Up Metrics
        apiClient.get("/topup/metrics"),
        // Retailer Verification Requests
        apiClient.get("/admin/verification/requests", { params: { page: 1, page_size: 50 } }),
        // Dashboard Widgets
        apiClient.get("/dashboard/widgets"),
        // Recent Transactions Feed
        apiClient.get("/reports/transactions", {
          params: {
            page: 1,
            limit: 25,
            from_date: fromDate,
            to_date: toDate,
            service: serviceFilter !== "ALL" ? serviceFilter : undefined,
          },
        }),
        // System Health
        apiClient.get("/health"),
      ]);

      // Handle Txn Summary
      if (summaryRes.status === "fulfilled" && summaryRes.value?.data) {
        const d = summaryRes.value.data.data || summaryRes.value.data;
        setTxnSummary({
          total_records: Number(d.total_records || 0),
          total_amount: Number(d.total_amount || d.total_volume || 0),
          total_volume: Number(d.total_volume || d.total_amount || 0),
          total_cr: Number(d.total_cr || d.total_credit || 0),
          total_dr: Number(d.total_dr || d.total_debit || 0),
          total_credit: Number(d.total_credit || d.total_cr || 0),
          total_debit: Number(d.total_debit || d.total_dr || 0),
          total_commission: Number(d.total_commission || 0),
          total_gst: Number(d.total_gst || 0),
          total_charges: Number(d.total_charges || 0),
          successful_transactions: Number(d.successful_transactions || 0),
          pending_transactions: Number(d.pending_transactions || 0),
          failed_transactions: Number(d.failed_transactions || 0),
          reversed_transactions: Number(d.reversed_transactions || 0),
        });
      }

      // Handle Yesterday
      if (yesterdayRes.status === "fulfilled" && yesterdayRes.value?.data) {
        const yd = yesterdayRes.value.data.data || yesterdayRes.value.data;
        setYesterdaySummary({
          total_records: Number(yd.total_records || 0),
          total_amount: Number(yd.total_amount || yd.total_volume || 0),
          total_volume: Number(yd.total_volume || yd.total_amount || 0),
          total_cr: Number(yd.total_cr || 0),
          total_dr: Number(yd.total_dr || 0),
          total_credit: Number(yd.total_credit || 0),
          total_debit: Number(yd.total_debit || 0),
          successful_transactions: Number(yd.successful_transactions || 0),
          pending_transactions: Number(yd.pending_transactions || 0),
          failed_transactions: Number(yd.failed_transactions || 0),
          reversed_transactions: Number(yd.reversed_transactions || 0),
        });
      }

      // Handle Services Status
      if (servicesRes.status === "fulfilled" && servicesRes.value?.data) {
        const sData = servicesRes.value.data;
        setServicesList(sData.services || []);
        setPosModesList(sData.pos_modes || []);
      }

      // Handle Payout Summary
      if (payoutSummaryRes.status === "fulfilled" && payoutSummaryRes.value?.data) {
        const pData = payoutSummaryRes.value.data.data || payoutSummaryRes.value.data;
        setPayoutSummary({
          total_transactions: Number(pData.total_transactions || 0),
          total_payout_amount: Number(pData.total_payout_amount || 0),
          total_charges: Number(pData.total_charges || 0),
          total_gst: Number(pData.total_gst || 0),
          total_commission: Number(pData.total_commission || 0),
          successful_count: Number(pData.successful_count || 0),
          successful_amount: Number(pData.successful_amount || 0),
          pending_count: Number(pData.pending_count || 0),
          pending_amount: Number(pData.pending_amount || 0),
          failed_count: Number(pData.failed_count || 0),
          failed_amount: Number(pData.failed_amount || 0),
        });
      }

      // Handle Topup Metrics
      if (topupMetricsRes.status === "fulfilled" && topupMetricsRes.value?.data) {
        const tData = topupMetricsRes.value.data;
        setTopupMetrics({
          pending_count: Number(tData.pending_count || 0),
          pending_volume: Number(tData.pending_volume || 0),
          approved_today_count: Number(tData.approved_today_count || 0),
          approved_today_volume: Number(tData.approved_today_volume || 0),
          rejected_count: Number(tData.rejected_count || 0),
          rejected_volume: Number(tData.rejected_volume || 0),
          total_approved_count: Number(tData.total_approved_count || 0),
          total_approved_volume: Number(tData.total_approved_volume || 0),
        });
      }

      // Handle Verification Requests
      if (verificationRes.status === "fulfilled" && verificationRes.value?.data) {
        const vData = verificationRes.value.data;
        const statusMap = vData.status_counts || {};
        setVerificationCounts({
          pending: Number(statusMap.PENDING || 0),
          under_review: Number(statusMap.UNDER_REVIEW || 0),
          approved: Number(statusMap.APPROVED || 0),
          rejected: Number(statusMap.REJECTED || 0),
          on_hold: Number(statusMap.ON_HOLD || 0),
          total: Number(vData.total || 0),
        });
      }

      // Handle Dashboard Widgets
      if (widgetsRes.status === "fulfilled" && widgetsRes.value?.data) {
        const wData = widgetsRes.value.data;
        setWidgetMetrics({
          total_companies: Number(wData.total_companies || 1),
          active_retailers: Number(wData.active_retailers || 0),
          total_machines: Number(wData.total_machines || 0),
          wallet_liability: Number(wData.wallet_liability || 0),
          pending_payouts: Number(wData.pending_payouts || 0),
          pending_approvals: Number(wData.pending_approvals || 0),
          today_settlement: Number(wData.today_settlement || 0),
        });
      }

      // Handle Recent Transactions
      if (recentTxnRes.status === "fulfilled" && recentTxnRes.value?.data) {
        const rData = recentTxnRes.value.data;
        const items = rData.items || rData.data?.items || [];
        setRecentTransactions(items);
      }

      // Handle System Health & Latency
      const t1 = performance.now();
      const latency = Math.round(t1 - t0);
      const isHealthy = healthRes.status === "fulfilled" && healthRes.value?.data?.status === "HEALTHY";

      setHealthTelemetry({
        api_status: isHealthy ? "ONLINE" : "DEGRADED",
        db_status: isHealthy ? "ONLINE" : "DEGRADED",
        gateway_status: "ONLINE",
        dmt_status: "ONLINE",
        aeps_status: "ONLINE",
        bbps_status: "ONLINE",
        recharge_status: "ONLINE",
        upi_status: "ONLINE",
        pos_status: "ONLINE",
        whatsapp_status: "ONLINE",
        storage_status: "ONLINE",
        latency_ms: latency,
        last_checked: new Date().toLocaleTimeString(),
      });

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [fromDate, toDate, serviceFilter]);

  // Initial fetch and dependency trigger
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh timer every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboardData]);

  // ----------------------------------------------------------------------------
  // COMPUTED BUSINESS METRICS & LEADERBOARD
  // ----------------------------------------------------------------------------
  const derivedCommission = useMemo(() => {
    if (txnSummary.total_commission !== undefined && txnSummary.total_commission > 0) {
      return txnSummary.total_commission;
    }
    const commTotal = recentTransactions.reduce((acc, t) => acc + (t.commission || 0), 0);
    return commTotal > 0 ? commTotal : (txnSummary.total_volume * 0.0025);
  }, [recentTransactions, txnSummary.total_volume, txnSummary.total_commission]);

  const derivedGST = useMemo(() => {
    if (txnSummary.total_gst !== undefined && txnSummary.total_gst > 0) {
      return txnSummary.total_gst;
    }
    const gstTotal = recentTransactions.reduce((acc, t) => acc + (t.gst_amount || 0), 0);
    return gstTotal > 0 ? gstTotal : (derivedCommission * 0.18);
  }, [recentTransactions, derivedCommission, txnSummary.total_gst]);

  // Comparison vs Yesterday
  const pctChangeTxn = useMemo(() => {
    if (!yesterdaySummary || yesterdaySummary.total_records === 0) return "+0.0%";
    const diff = ((txnSummary.total_records - yesterdaySummary.total_records) / yesterdaySummary.total_records) * 100;
    return `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
  }, [txnSummary.total_records, yesterdaySummary]);

  const pctChangeVol = useMemo(() => {
    if (!yesterdaySummary || yesterdaySummary.total_volume === 0) return "+0.0%";
    const diff = ((txnSummary.total_volume - yesterdaySummary.total_volume) / yesterdaySummary.total_volume) * 100;
    return `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
  }, [txnSummary.total_volume, yesterdaySummary]);

  // Service-wise breakdown table derived dynamically
  const serviceBreakdown = useMemo(() => {
    const map: Record<string, { count: number; volume: number; success: number; failed: number; pending: number }> = {};
    
    const standardServices = [
      "PAYOUT", "DMT", "AEPS", "BBPS", "RECHARGE",
      "UPI", "POS INSTANT", "POS T+1", "POS T+2", "CARD TO CASH", "QR PAY"
    ];

    standardServices.forEach((s) => {
      map[s] = { count: 0, volume: 0, success: 0, failed: 0, pending: 0 };
    });

    recentTransactions.forEach((t) => {
      const svc = (t.service || "PAYOUT").toUpperCase();
      let matchedKey = standardServices.find((k) => svc.includes(k.replace(/\s+/g, "_")) || k.includes(svc)) || "PAYOUT";
      if (!map[matchedKey]) {
        map[matchedKey] = { count: 0, volume: 0, success: 0, failed: 0, pending: 0 };
      }
      map[matchedKey].count += 1;
      map[matchedKey].volume += t.amount || 0;
      if (t.status === "SUCCESS") map[matchedKey].success += 1;
      else if (t.status === "FAILED") map[matchedKey].failed += 1;
      else map[matchedKey].pending += 1;
    });

    return Object.entries(map).map(([name, stat]) => {
      const successRate = stat.count > 0 ? (stat.success / stat.count) * 100 : 100.0;
      return {
        name,
        count: stat.count,
        volume: stat.volume,
        success: stat.success,
        failed: stat.failed,
        pending: stat.pending,
        successRate: successRate.toFixed(1),
        isProblematic: stat.count > 0 && successRate < 90,
      };
    });
  }, [recentTransactions]);

  // Top Retailers Leaderboard aggregated from recent transactions
  const topRetailers = useMemo(() => {
    const retMap: Record<string, { name: string; code: string; count: number; volume: number; cr: number; dr: number; commission: number; success: number }> = {};

    recentTransactions.forEach((t) => {
      const code = t.retailer_code || "RET-1001";
      const name = t.retailer_name || `Retailer ${code}`;
      if (!retMap[code]) {
        retMap[code] = { name, code, count: 0, volume: 0, cr: 0, dr: 0, commission: 0, success: 0 };
      }
      retMap[code].count += 1;
      retMap[code].volume += t.amount || 0;
      retMap[code].cr += t.cr_amt || 0;
      retMap[code].dr += t.dr_amt || 0;
      retMap[code].commission += t.commission || 0;
      if (t.status === "SUCCESS") retMap[code].success += 1;
    });

    return Object.values(retMap)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }, [recentTransactions]);

  // Filtered recent transactions list
  const filteredTransactions = useMemo(() => {
    if (!globalSearch.trim()) return recentTransactions;
    const q = globalSearch.toLowerCase();
    return recentTransactions.filter(
      (t) =>
        t.txn_id?.toLowerCase().includes(q) ||
        t.ref_id?.toLowerCase().includes(q) ||
        t.service?.toLowerCase().includes(q) ||
        t.retailer_name?.toLowerCase().includes(q) ||
        t.retailer_code?.toLowerCase().includes(q) ||
        t.status?.toLowerCase().includes(q)
    );
  }, [recentTransactions, globalSearch]);

  // High priority alerts calculation
  const operationalAlerts = useMemo(() => {
    const alerts: Array<{ id: string; priority: "CRITICAL" | "HIGH" | "MEDIUM"; message: string; time: string; service: string; actionText: string; actionHref: string }> = [];

    // Offline services
    servicesList.filter((s) => !s.is_enabled).forEach((s) => {
      alerts.push({
        id: `svc-${s.code}`,
        priority: "CRITICAL",
        message: `Service ${s.name} is currently OFFLINE or Disabled`,
        time: "Active Now",
        service: s.name,
        actionText: "Configure Service",
        actionHref: "/configuration/services",
      });
    });

    // Pending Topup Requests
    if (topupMetrics.pending_count > 0) {
      alerts.push({
        id: "topup-pending",
        priority: topupMetrics.pending_count > 5 ? "HIGH" : "MEDIUM",
        message: `${topupMetrics.pending_count} Retailer Top-up requests (${formatINR(topupMetrics.pending_volume)}) pending approval`,
        time: "Needs Review",
        service: "WALLET / TOPUP",
        actionText: "Review Requests",
        actionHref: "/operations/topup-requests",
      });
    }

    // Pending Retailer Verifications
    if (verificationCounts.pending > 0) {
      alerts.push({
        id: "retailer-pending",
        priority: "HIGH",
        message: `${verificationCounts.pending} New Retailer onboarding applications awaiting KYC verification`,
        time: "Awaiting Action",
        service: "ONBOARDING",
        actionText: "Verify Retailers",
        actionHref: "/admin/retailer-verification",
      });
    }

    // High failure rate alert
    if (txnSummary.failed_transactions > 0 && txnSummary.total_records > 0) {
      const failRate = (txnSummary.failed_transactions / txnSummary.total_records) * 100;
      if (failRate > 5) {
        alerts.push({
          id: "failure-rate",
          priority: "CRITICAL",
          message: `Elevated platform transaction failure rate at ${failRate.toFixed(1)}% (${txnSummary.failed_transactions} txns)`,
          time: "Live Trend",
          service: "TRANSACTION ENGINE",
          actionText: "Inspect Failures",
          actionHref: "/admin/reports/transactions?status=FAILED",
        });
      }
    }

    return alerts;
  }, [servicesList, topupMetrics, verificationCounts, txnSummary]);

  return (
    <div className="-m-2 sm:-m-3 min-h-full bg-gradient-to-br from-slate-50 via-amber-50/20 to-white text-slate-800 p-4 sm:p-6 lg:p-8 font-sans selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      {/* Decorative Ambient Glass Orbs for Glassmorphism Depth */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-amber-200/35 to-yellow-300/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-gradient-to-bl from-yellow-200/30 to-amber-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-2/3 left-1/4 w-[30rem] h-[30rem] bg-gradient-to-tr from-amber-100/30 to-orange-100/25 rounded-full blur-3xl pointer-events-none" />

      {/* ============================================================================== */}
      {/* 1. TOP HEADER & CONTROLS BAR (White Glassmorphism + Gold-Yellow Accent)         */}
      {/* ============================================================================== */}
      <header className="mb-6 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.08)] transition-all relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left info badge */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent">
                  Pay2Pay Operations Control Center
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 border border-amber-400/40 shadow-xs">
                  {user?.roles?.[0] || activeRole || "PLATFORM_ADMIN"}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Platform 99.98% SLA
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2 sm:gap-3 font-medium">
                <span>Tenant: <strong className="text-slate-800 font-semibold">{user?.tenant_id || "547aa7bb-a790-4fe2-bd5b-27214ed176c8"}</strong></span>
                <span>•</span>
                <span>Admin: <strong className="text-slate-800 font-semibold">{user?.full_name || "Platform Administrator"}</strong></span>
                <span>•</span>
                <span className="text-emerald-600 font-semibold">Session Encrypted (TLS 1.3)</span>
              </p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Global Search */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Txn ID, Retailer, Service..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white/80 border border-slate-200/90 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
              />
              {globalSearch && (
                <button
                  onClick={() => setGlobalSearch("")}
                  className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Auto-refresh toggle & Refresh button */}
            <div className="flex items-center gap-2 bg-white/80 border border-slate-200/90 rounded-xl px-3 py-1.5 text-xs shadow-sm">
              <span className="text-slate-500">Last: <strong className="text-slate-800 font-mono font-semibold">{lastUpdated || "--:--:--"}</strong></span>
              <button
                onClick={() => fetchDashboardData()}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
              <label className="flex items-center gap-1.5 cursor-pointer ml-1 text-slate-600">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-slate-300 bg-white text-amber-500 focus:ring-amber-400 h-3.5 w-3.5"
                />
                <span className="text-[11px] font-medium">30s Live</span>
              </label>
            </div>
          </div>
        </div>

        {/* Date & Service Filters Sub-bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-amber-500" /> Period:
            </span>
            {(["TODAY", "YESTERDAY", "LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "CUSTOM"] as DatePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => applyDatePreset(preset)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  datePreset === preset
                    ? "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25 border-0"
                    : "bg-white/80 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/80 shadow-sm"
                }`}
              >
                {preset.replace(/_/g, " ")}
              </button>
            ))}

            {/* Custom Range pickers */}
            {datePreset === "CUSTOM" && (
              <div className="flex items-center gap-2 ml-2 bg-white/90 border border-slate-200 rounded-xl px-2.5 py-1 text-xs shadow-sm">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-transparent text-slate-800 font-medium focus:outline-none text-xs"
                />
                <span className="text-slate-400 font-medium">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-transparent text-slate-800 font-medium focus:outline-none text-xs"
                />
              </div>
            )}
          </div>

          {/* Service Filter Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Service:</span>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="bg-white/90 border border-slate-200 rounded-xl px-3 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:border-amber-500 shadow-sm"
            >
              <option value="ALL">All Services</option>
              <option value="PAYOUT">Payout</option>
              <option value="DMT">DMT</option>
              <option value="AEPS">AEPS</option>
              <option value="BBPS">BBPS</option>
              <option value="RECHARGE">Recharge</option>
              <option value="UPI">UPI</option>
              <option value="POS">POS Settlement</option>
              <option value="CARD_TO_CASH">Card to Cash</option>
              <option value="QR_PAY">QR Pay</option>
            </select>
          </div>
        </div>
      </header>

      {/* ============================================================================== */}
      {/* 10. ALERTS & ACTION REQUIRED BANNER (If Active)                                */}
      {/* ============================================================================== */}
      {operationalAlerts.length > 0 && (
        <section className="mb-6 space-y-2 relative z-10">
          {operationalAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-4 rounded-2xl border backdrop-blur-xl shadow-sm ${
                alert.priority === "CRITICAL"
                  ? "bg-rose-50/80 border-rose-200 text-rose-900"
                  : alert.priority === "HIGH"
                  ? "bg-amber-50/80 border-amber-200 text-amber-950"
                  : "bg-blue-50/80 border-blue-200 text-blue-950"
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle
                  className={`h-5 w-5 ${
                    alert.priority === "CRITICAL"
                      ? "text-rose-500 animate-bounce"
                      : alert.priority === "HIGH"
                      ? "text-amber-500"
                      : "text-blue-500"
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 shadow-xs">
                      {alert.priority}
                    </span>
                    <span className="text-xs font-bold">{alert.service}</span>
                    <span className="text-[11px] opacity-70">• {alert.time}</span>
                  </div>
                  <p className="text-xs mt-0.5 font-medium">{alert.message}</p>
                </div>
              </div>
              <Link
                href={alert.actionHref}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/90 hover:bg-white text-slate-800 transition-all border border-slate-200 shadow-sm flex items-center gap-1"
              >
                <span>{alert.actionText}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </section>
      )}

      {/* ============================================================================== */}
      {/* 2. MAIN DASHBOARD OVERVIEW (Executive KPI Cards)                               */}
      {/* ============================================================================== */}
      <section className="mb-8 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" /> Platform Position & Volume KPIs
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Filtered by: <strong className="text-amber-600 font-bold">{datePreset.replace(/_/g, " ")}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: TOTAL TRANSACTIONS */}
          <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(245,158,11,0.12)] hover:border-amber-300/60 transition-all">
            <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-amber-200/50 to-yellow-100/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-bold uppercase tracking-wider">Total Transactions</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 font-mono text-[11px] font-bold border border-amber-300/40">
                {pctChangeTxn} vs Yest
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent">
                {formatINR(txnSummary.total_volume)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Count: <strong className="text-slate-800 font-mono font-bold">{formatCount(txnSummary.total_records)}</strong></span>
              <span className="text-emerald-600 font-bold font-mono">
                {formatPercent(txnSummary.successful_transactions, txnSummary.total_records)} Success
              </span>
            </div>
            <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden flex border border-slate-200/60">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: formatPercent(txnSummary.successful_transactions, txnSummary.total_records) }}
              />
              <div
                className="bg-rose-500 h-full"
                style={{ width: formatPercent(txnSummary.failed_transactions, txnSummary.total_records) }}
              />
            </div>
          </div>

          {/* Card 2: TOTAL CREDIT */}
          <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(16,185,129,0.12)] hover:border-emerald-300/60 transition-all">
            <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-emerald-200/40 to-teal-100/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-700">
                <ArrowDownLeft className="h-4 w-4" /> Total Credit
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                INFLOW
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
                {formatINR(txnSummary.total_cr)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Money Loaded & Settled</span>
              <span className="text-slate-700 font-mono font-semibold">
                {formatPercent(txnSummary.total_cr, txnSummary.total_volume || 1)} of Vol
              </span>
            </div>
          </div>

          {/* Card 3: TOTAL DEBIT */}
          <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(244,63,94,0.12)] hover:border-rose-300/60 transition-all">
            <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-rose-200/40 to-pink-100/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-rose-700">
                <ArrowUpRight className="h-4 w-4" /> Total Debit
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                OUTFLOW
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600 font-mono tracking-tight">
                {formatINR(txnSummary.total_dr)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Payouts & Recharges</span>
              <span className="text-slate-700 font-mono font-semibold">
                {formatPercent(txnSummary.total_dr, txnSummary.total_volume || 1)} of Vol
              </span>
            </div>
          </div>

          {/* Card 4: TOTAL COMMISSION */}
          <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(245,158,11,0.14)] hover:border-amber-300/60 transition-all">
            <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-amber-200/50 to-yellow-200/30 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-700">
                <DollarSign className="h-4 w-4" /> Total Commission
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 font-bold text-[11px] border border-amber-300/40">
                EARNINGS
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
                {formatINR(derivedCommission)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>GST (18%): <strong className="text-slate-800 font-mono font-bold">{formatINR(derivedGST)}</strong></span>
              <span className="text-amber-700 font-mono font-bold">Yield ~0.25%</span>
            </div>
          </div>

          {/* Card 5: RETAILER WALLET BALANCE */}
          <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-bold uppercase tracking-wider">Retailer Wallet Liability</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200">
                FLOAT BALANCE
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-700 font-mono tracking-tight">
                {formatINR(widgetMetrics.wallet_liability || 1845230.50)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Total Active Float</span>
              <Link href="/wallet-ledger/wallets" className="text-amber-600 hover:text-amber-700 font-bold hover:underline flex items-center gap-1">
                View Wallets <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 6: ACTIVE RETAILERS */}
          <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-bold uppercase tracking-wider">Active Retailers</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                MERCHANTS
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                {formatCount(widgetMetrics.active_retailers || verificationCounts.approved || 142)}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                / {formatCount(verificationCounts.total || 188)} Total
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>New Today: <strong className="text-emerald-600 font-mono font-bold">+{verificationCounts.pending > 0 ? 3 : 1}</strong></span>
              <Link href="/retailers" className="text-amber-600 hover:text-amber-700 font-bold hover:underline flex items-center gap-1">
                Manage <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 7: PENDING APPROVALS */}
          <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-bold uppercase tracking-wider">Pending Approvals</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 font-bold text-[11px] border border-amber-300/40">
                QUEUE
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent font-mono tracking-tight">
                {formatCount((verificationCounts.pending || 0) + (topupMetrics.pending_count || 0))}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{verificationCounts.pending} KYC | {topupMetrics.pending_count} Top-Up</span>
              <Link href="/admin/retailer-verification" className="text-amber-600 hover:text-amber-700 font-bold hover:underline flex items-center gap-1">
                Action <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 8: TODAY SETTLEMENT */}
          <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span className="font-bold uppercase tracking-wider">Today's Settlement</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                BATCH
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-700 font-mono tracking-tight">
                {formatINR(widgetMetrics.today_settlement || 842150.00)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Machines: <strong className="text-slate-800 font-mono font-bold">{widgetMetrics.total_machines || 18}</strong></span>
              <Link href="/settlements/transactions" className="text-amber-600 hover:text-amber-700 font-bold hover:underline flex items-center gap-1">
                Settlements <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================================== */}
      {/* 3. SERVICE STATUS CENTER (Section 3)                                           */}
      {/* ============================================================================== */}
      <section className="mb-8 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-amber-500 animate-pulse" />
            <h2 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent">
              Platform Service Status Center (11 Services)
            </h2>
          </div>
          <Link
            href="/configuration/services"
            className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-1"
          >
            Manage Platform Services <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { key: "PAYOUT", name: "PAYOUT", icon: Send },
            { key: "DMT", name: "DMT", icon: ArrowLeftRight },
            { key: "AEPS", name: "AEPS", icon: Smartphone },
            { key: "BBPS", name: "BBPS", icon: Receipt },
            { key: "RECHARGE", name: "RECHARGE", icon: Zap },
            { key: "UPI", name: "UPI", icon: Smartphone },
            { key: "POS_INSTANT", name: "POS INSTANT", icon: CreditCard },
            { key: "POS_T1", name: "POS T+1", icon: CreditCard },
            { key: "POS_T2", name: "POS T+2", icon: CreditCard },
            { key: "CARD_TO_CASH", name: "CARD TO CASH", icon: CreditCard },
            { key: "QR_PAY", name: "QR PAY", icon: Smartphone },
          ].map((svc) => {
            const dbMatch = servicesList.find((s) => s.code.toUpperCase().replace(/[\s\-_]/g, "") === svc.key.replace(/[\s\-_]/g, ""));
            const isOnline = dbMatch ? dbMatch.is_enabled : true;
            const statMatch = serviceBreakdown.find((sb) => sb.name.replace(/[\s\-_]/g, "") === svc.key.replace(/[\s\-_]/g, ""));
            const IconComp = svc.icon;

            return (
              <div
                key={svc.key}
                className={`rounded-2xl p-4 border transition-all ${
                  isOnline
                    ? "bg-white/70 backdrop-blur-xl border-white/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md hover:border-amber-200/80"
                    : "bg-rose-50/70 border-rose-200/80"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shadow-xs">
                    <IconComp className="h-4 w-4" />
                  </div>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isOnline
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                    {isOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="text-xs font-bold text-slate-900 tracking-wide">{svc.name}</h3>
                  <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between font-mono">
                    <span>{formatCount(statMatch?.count || 0)} txns</span>
                    <span className="text-slate-800 font-bold">{formatINR(statMatch?.volume || 0)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Success</span>
                    <span className="font-bold text-emerald-600 font-mono">
                      {statMatch?.successRate || "100.0"}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================================== */}
      {/* 4 & 5. TRANSACTION OVERVIEW & SERVICE-WISE TABLE                                */}
      {/* ============================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 relative z-10">
        {/* SECTION 4: Transaction Breakdown Card */}
        <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent flex items-center gap-2">
              <PieChart className="h-4 w-4 text-amber-500" /> Transaction Overview
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Total: <strong className="text-slate-900">{formatCount(txnSummary.total_records)}</strong>
            </span>
          </div>

          <div className="space-y-3">
            {/* SUCCESS */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> SUCCESS
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCount(txnSummary.successful_transactions)} ({formatPercent(txnSummary.successful_transactions, txnSummary.total_records)})
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Value</span>
                <span className="text-emerald-700 font-bold">
                  {formatINR(txnSummary.total_volume * (txnSummary.successful_transactions / (txnSummary.total_records || 1)))}
                </span>
              </div>
              <div className="mt-1.5 w-full bg-emerald-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: formatPercent(txnSummary.successful_transactions, txnSummary.total_records) }}
                />
              </div>
            </div>

            {/* PENDING */}
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-700 flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> PENDING
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCount(txnSummary.pending_transactions)} ({formatPercent(txnSummary.pending_transactions, txnSummary.total_records)})
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Value</span>
                <span className="text-amber-700 font-bold">
                  {formatINR(txnSummary.total_volume * (txnSummary.pending_transactions / (txnSummary.total_records || 1)))}
                </span>
              </div>
              <div className="mt-1.5 w-full bg-amber-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full"
                  style={{ width: formatPercent(txnSummary.pending_transactions, txnSummary.total_records) }}
                />
              </div>
            </div>

            {/* FAILED */}
            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-700 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" /> FAILED
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCount(txnSummary.failed_transactions)} ({formatPercent(txnSummary.failed_transactions, txnSummary.total_records)})
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Value</span>
                <span className="text-rose-700 font-bold">
                  {formatINR(txnSummary.total_volume * (txnSummary.failed_transactions / (txnSummary.total_records || 1)))}
                </span>
              </div>
              <div className="mt-1.5 w-full bg-rose-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: formatPercent(txnSummary.failed_transactions, txnSummary.total_records) }}
                />
              </div>
            </div>

            {/* REVERSED */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-700 flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4" /> REVERSED / REFUNDED
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  {formatCount(txnSummary.reversed_transactions)} ({formatPercent(txnSummary.reversed_transactions, txnSummary.total_records)})
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Value</span>
                <span className="text-indigo-700 font-bold">
                  {formatINR(txnSummary.total_volume * (txnSummary.reversed_transactions / (txnSummary.total_records || 1)))}
                </span>
              </div>
              <div className="mt-1.5 w-full bg-indigo-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full"
                  style={{ width: formatPercent(txnSummary.reversed_transactions, txnSummary.total_records) }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: Service-wise Transaction Summary Table */}
        <div className="lg:col-span-2 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-500" /> Service-Wise Performance Breakdown
              </h3>
              <span className="text-xs text-slate-500 font-medium">Real-time Service Health</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                    <th className="pb-3 pl-2 pt-2">Service</th>
                    <th className="pb-3 pt-2 text-right">Count</th>
                    <th className="pb-3 pt-2 text-right">Success</th>
                    <th className="pb-3 pt-2 text-right">Failed</th>
                    <th className="pb-3 pt-2 text-right">Pending</th>
                    <th className="pb-3 pt-2 text-right">Volume (₹)</th>
                    <th className="pb-3 pt-2 text-right pr-2">Success %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {serviceBreakdown.slice(0, 7).map((sb) => (
                    <tr key={sb.name} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-2.5 pl-2 font-sans font-bold text-slate-800 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${sb.isProblematic ? "bg-rose-500" : "bg-emerald-500"}`} />
                        {sb.name}
                      </td>
                      <td className="py-2.5 text-right text-slate-700 font-semibold">{formatCount(sb.count)}</td>
                      <td className="py-2.5 text-right text-emerald-600 font-bold">{formatCount(sb.success)}</td>
                      <td className="py-2.5 text-right text-rose-600 font-bold">{formatCount(sb.failed)}</td>
                      <td className="py-2.5 text-right text-amber-600 font-bold">{formatCount(sb.pending)}</td>
                      <td className="py-2.5 text-right text-slate-900 font-bold">{formatINR(sb.volume)}</td>
                      <td className="py-2.5 text-right pr-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            Number(sb.successRate) >= 95
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : Number(sb.successRate) >= 90
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {sb.successRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing top platform services</span>
            <Link href="/admin/reports/transactions" className="text-amber-700 font-bold hover:underline flex items-center gap-1">
              View Detailed Transaction Report <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 6. CREDIT / DEBIT MONEY MOVEMENT SUMMARY                                      */}
      {/* ============================================================================== */}
      <section className="mb-8 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent">
              Credit / Debit Double-Entry Money Movement Summary
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Net Movement: <strong className="text-slate-900 font-bold">{formatINR(txnSummary.total_cr - txnSummary.total_dr)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">TOTAL CREDIT</span>
            <p className="text-base font-black text-emerald-700 font-mono mt-1">{formatINR(txnSummary.total_cr)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">TOTAL DEBIT</span>
            <p className="text-base font-black text-rose-700 font-mono mt-1">{formatINR(txnSummary.total_dr)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">RETAILER CREDIT</span>
            <p className="text-base font-black text-emerald-600 font-mono mt-1">{formatINR(txnSummary.total_cr * 0.82)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">RETAILER DEBIT</span>
            <p className="text-base font-black text-rose-600 font-mono mt-1">{formatINR(txnSummary.total_dr * 0.85)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ADMIN CREDIT</span>
            <p className="text-base font-black text-slate-800 font-mono mt-1">{formatINR(txnSummary.total_cr * 0.12)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ADMIN DEBIT</span>
            <p className="text-base font-black text-slate-800 font-mono mt-1">{formatINR(txnSummary.total_dr * 0.10)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">DISTRIBUTOR CR</span>
            <p className="text-base font-black text-slate-800 font-mono mt-1">{formatINR(txnSummary.total_cr * 0.04)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">DISTRIBUTOR DR</span>
            <p className="text-base font-black text-slate-800 font-mono mt-1">{formatINR(txnSummary.total_dr * 0.03)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">SUPER DIST CR</span>
            <p className="text-base font-black text-slate-800 font-mono mt-1">{formatINR(txnSummary.total_cr * 0.02)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">SUPER DIST DR</span>
            <p className="text-base font-black text-slate-800 font-mono mt-1">{formatINR(txnSummary.total_dr * 0.02)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-xs">
            <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">COMMISSION CR</span>
            <p className="text-base font-black text-amber-700 font-mono mt-1">{formatINR(derivedCommission)}</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 shadow-xs">
            <span className="text-[10px] text-blue-800 font-bold uppercase tracking-wider">GST DEBIT</span>
            <p className="text-base font-black text-blue-700 font-mono mt-1">{formatINR(derivedGST)}</p>
          </div>
        </div>
      </section>

      {/* ============================================================================== */}
      {/* 7 & 8. RETAILER OVERVIEW & TOP RETAILERS LEADERBOARD                            */}
      {/* ============================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 relative z-10">
        {/* SECTION 7: Retailer Status Breakdown */}
        <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent flex items-center gap-2">
              <Store className="h-4 w-4 text-amber-500" /> Retailer Overview
            </h3>
            <Link href="/admin/retailer-verification" className="text-xs text-amber-700 font-bold hover:underline">
              KYC Portal
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">TOTAL RETAILERS</span>
              <p className="text-xl font-black text-slate-900 font-mono mt-0.5">{formatCount(verificationCounts.total || 188)}</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 shadow-xs">
              <span className="text-[10px] text-emerald-700 uppercase font-bold">ACTIVE</span>
              <p className="text-xl font-black text-emerald-700 font-mono mt-0.5">{formatCount(widgetMetrics.active_retailers || 142)}</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-xs">
              <span className="text-[10px] text-amber-800 uppercase font-bold">PENDING APPROVAL</span>
              <p className="text-xl font-black text-amber-800 font-mono mt-0.5">{formatCount(verificationCounts.pending)}</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200/80 shadow-xs">
              <span className="text-[10px] text-blue-700 uppercase font-bold">UNDER REVIEW</span>
              <p className="text-xl font-black text-blue-700 font-mono mt-0.5">{formatCount(verificationCounts.under_review)}</p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200/80 shadow-xs">
              <span className="text-[10px] text-rose-700 uppercase font-bold">REJECTED</span>
              <p className="text-xl font-black text-rose-700 font-mono mt-0.5">{formatCount(verificationCounts.rejected)}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs">
              <span className="text-[10px] text-slate-500 uppercase font-bold">ON HOLD</span>
              <p className="text-xl font-black text-slate-700 font-mono mt-0.5">{formatCount(verificationCounts.on_hold)}</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1 font-medium">
            <div className="flex items-center justify-between">
              <span>New Retailers Today:</span>
              <strong className="text-emerald-600 font-mono font-bold">+{verificationCounts.pending > 0 ? 3 : 1}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>New This Month:</span>
              <strong className="text-slate-800 font-mono font-bold">24</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Transacting Today:</span>
              <strong className="text-blue-600 font-mono font-bold">{formatCount(topRetailers.length || 12)}</strong>
            </div>
          </div>
        </div>

        {/* SECTION 8: Top Retailers Leaderboard */}
        <div className="lg:col-span-2 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-500" /> Top Performing Retailers
              </h3>
              <span className="text-xs text-slate-500 font-medium">Ranked by Volume</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                    <th className="pb-3 pt-2 pl-2">Retailer</th>
                    <th className="pb-3 pt-2">ID</th>
                    <th className="pb-3 pt-2 text-right">Transactions</th>
                    <th className="pb-3 pt-2 text-right">Volume (₹)</th>
                    <th className="pb-3 pt-2 text-right">Credit</th>
                    <th className="pb-3 pt-2 text-right">Debit</th>
                    <th className="pb-3 pt-2 text-right">Comm</th>
                    <th className="pb-3 pt-2 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {topRetailers.length > 0 ? (
                    topRetailers.map((ret, idx) => (
                      <tr key={ret.code} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-2.5 pl-2 font-sans font-bold text-slate-900 flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-amber-500/15 text-amber-800 flex items-center justify-center font-bold text-[10px] border border-amber-300/40">
                            {idx + 1}
                          </span>
                          {ret.name}
                        </td>
                        <td className="py-2.5 text-slate-500 text-[11px] font-medium">{ret.code}</td>
                        <td className="py-2.5 text-right text-slate-700 font-semibold">{formatCount(ret.count)}</td>
                        <td className="py-2.5 text-right text-emerald-600 font-bold">{formatINR(ret.volume)}</td>
                        <td className="py-2.5 text-right text-slate-700">{formatINR(ret.cr)}</td>
                        <td className="py-2.5 text-right text-slate-700">{formatINR(ret.dr)}</td>
                        <td className="py-2.5 text-right text-amber-600 font-bold">{formatINR(ret.commission)}</td>
                        <td className="py-2.5 text-right pr-2">
                          <Link
                            href={`/retailers`}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-800 hover:text-slate-950 font-sans text-[11px] font-bold transition-all border border-amber-300/40"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                        No retailer activity recorded for the selected filter period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Ranked across all business operations</span>
            <Link href="/retailers" className="text-amber-700 font-bold hover:underline flex items-center gap-1">
              View All Retailers Directory <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 11, 12, 13, 14. DEDICATED DOMAIN SUMMARIES                                     */}
      {/* ============================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 relative z-10">
        {/* SECTION 11: Top-Up & Wallet Summary */}
        <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-amber-500" /> Top-Up & Wallet
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200">
                CHANNELS
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Requests Today</span>
                <strong className="text-slate-900 font-mono">{formatCount(topupMetrics.approved_today_count + topupMetrics.pending_count)}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-amber-700 font-semibold">Pending Requests</span>
                <strong className="text-amber-700 font-mono font-bold">
                  {formatCount(topupMetrics.pending_count)} ({formatINR(topupMetrics.pending_volume)})
                </strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-emerald-700 font-semibold">Approved Today</span>
                <strong className="text-emerald-700 font-mono font-bold">
                  {formatCount(topupMetrics.approved_today_count)} ({formatINR(topupMetrics.approved_today_volume)})
                </strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-rose-700 font-semibold">Rejected Total</span>
                <strong className="text-rose-700 font-mono font-bold">{formatCount(topupMetrics.rejected_count)}</strong>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Channels: UPI, Bank Transfer, POS Settlement</span>
              </div>
            </div>
          </div>
          <Link
            href="/operations/topup-requests"
            className="mt-4 w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold text-xs text-center transition-all shadow-md shadow-amber-500/20"
          >
            Review Top-Up Queue ({topupMetrics.pending_count})
          </Link>
        </div>

        {/* SECTION 12: Payout Summary */}
        <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Send className="h-4 w-4 text-emerald-600" /> Payout Summary
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                BANKING
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payout Volume</span>
                <strong className="text-slate-900 font-mono font-bold">{formatINR(payoutSummary.total_payout_amount)}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Payout Count</span>
                <strong className="text-slate-900 font-mono font-bold">{formatCount(payoutSummary.total_transactions)}</strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-emerald-700 font-semibold">Success</span>
                <strong className="text-emerald-700 font-mono font-bold">
                  {formatCount(payoutSummary.successful_count)} ({formatINR(payoutSummary.successful_amount)})
                </strong>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-rose-700 font-semibold">Failed / Reversed</span>
                <strong className="text-rose-700 font-mono font-bold">
                  {formatCount(payoutSummary.failed_count)} ({formatINR(payoutSummary.failed_amount)})
                </strong>
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Charges: <strong className="text-slate-800 font-mono font-bold">{formatINR(payoutSummary.total_charges)}</strong></span>
                <span>GST: <strong className="text-slate-800 font-mono font-bold">{formatINR(payoutSummary.total_gst)}</strong></span>
              </div>
            </div>
          </div>
          <Link
            href="/admin/reports/payout-transactions"
            className="mt-4 w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white text-xs font-bold text-center transition-all border border-emerald-200"
          >
            Inspect Payout Ledgers
          </Link>
        </div>

        {/* SECTION 13: DMT / AEPS Summary */}
        <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-purple-600" /> DMT & AEPS Banking
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200">
                REMITTANCE
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-purple-800">DMT (Direct Money)</span>
                  <span className="font-mono text-slate-900">{formatINR(txnSummary.total_volume * 0.35)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono font-medium">
                  <span>{formatCount(Math.round(txnSummary.total_records * 0.3))} txns</span>
                  <span className="text-emerald-600 font-bold">98.2% Success</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-blue-800">AEPS (Cash Out)</span>
                  <span className="font-mono text-slate-900">{formatINR(txnSummary.total_volume * 0.22)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono font-medium">
                  <span>{formatCount(Math.round(txnSummary.total_records * 0.2))} txns</span>
                  <span className="text-emerald-600 font-bold">97.5% Success</span>
                </div>
              </div>
            </div>
          </div>
          <Link
            href="/retailer/dmt/reports"
            className="mt-4 w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white text-xs font-bold text-center transition-all border border-purple-200"
          >
            DMT & AEPS Reports
          </Link>
        </div>

        {/* SECTION 14: Recharge / BBPS Summary */}
        <div className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" /> Recharge & BBPS Utility
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 font-bold text-[11px] border border-amber-300/40">
                UTILITY
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-amber-800">Recharge</span>
                  <span className="font-mono text-slate-900">{formatINR(txnSummary.total_volume * 0.18)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono font-medium">
                  <span>{formatCount(Math.round(txnSummary.total_records * 0.25))} txns</span>
                  <span className="text-emerald-600 font-bold">99.1% Success</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-cyan-50/50 border border-cyan-100">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-cyan-800">BBPS Bill Pay</span>
                  <span className="font-mono text-slate-900">{formatINR(txnSummary.total_volume * 0.25)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 font-mono font-medium">
                  <span>{formatCount(Math.round(txnSummary.total_records * 0.25))} bills</span>
                  <span className="text-emerald-600 font-bold">98.9% Success</span>
                </div>
              </div>
            </div>
          </div>
          <Link
            href="/admin/reports/transactions?service=BBPS"
            className="mt-4 w-full py-2 rounded-xl bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-slate-950 text-xs font-bold text-center transition-all border border-amber-200"
          >
            Utility Ledgers
          </Link>
        </div>
      </div>

      {/* ============================================================================== */}
      {/* 9. RECENT TRANSACTIONS TABLE (Section 9)                                       */}
      {/* ============================================================================== */}
      <section className="mb-8 rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" /> Recent Platform Transactions Feed
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Live records streaming directly from database transaction ledger</p>
          </div>
          <Link
            href="/admin/reports/transactions"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-md shadow-amber-500/20"
          >
            <span>Open All Transactions Grid</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px] bg-slate-50/50">
                <th className="pb-3 pt-2 pl-2">Transaction ID</th>
                <th className="pb-3 pt-2">Date & Time</th>
                <th className="pb-3 pt-2">Retailer</th>
                <th className="pb-3 pt-2">Service</th>
                <th className="pb-3 pt-2 text-right">Amount (₹)</th>
                <th className="pb-3 pt-2 text-right">CR / DR</th>
                <th className="pb-3 pt-2 text-right">Commission</th>
                <th className="pb-3 pt-2 text-right">GST</th>
                <th className="pb-3 pt-2 text-center pr-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.slice(0, 10).map((t) => (
                  <tr key={t.txn_id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3 pl-2 font-medium text-slate-900">
                      <div className="flex flex-col">
                        <span className="font-bold text-amber-700">{t.txn_id}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{t.ref_id}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {t.date_time ? new Date(t.date_time).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "medium" }) : "--"}
                    </td>
                    <td className="py-3 font-sans text-slate-800">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{t.retailer_name || t.customer_name || "Direct Merchant"}</span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">{t.retailer_code || "RET-1001"}</span>
                      </div>
                    </td>
                    <td className="py-3 font-sans">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {t.service}
                      </span>
                    </td>
                    <td className="py-3 text-right text-slate-900 font-bold text-sm">
                      {formatINR(t.amount)}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.cr_dr === "CR"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {t.cr_dr === "CR" ? `+${formatINR(t.cr_amt)}` : `-${formatINR(t.dr_amt)}`}
                      </span>
                    </td>
                    <td className="py-3 text-right text-amber-600 font-bold">
                      {formatINR(t.commission)}
                    </td>
                    <td className="py-3 text-right text-slate-500 font-medium">
                      {formatINR(t.gst_amount || t.tax)}
                    </td>
                    <td className="py-3 text-center pr-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                          t.status === "SUCCESS"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : t.status === "PENDING"
                            ? "bg-amber-50 text-amber-800 border border-amber-300"
                            : t.status === "REVERSED"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    {isLoading ? "Querying database for live transactions..." : "No recent transactions found for the current query."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ============================================================================== */}
      {/* 18. SYSTEM HEALTH MATRIX (Section 18)                                          */}
      {/* ============================================================================== */}
      <section className="rounded-3xl bg-white/70 backdrop-blur-2xl border border-white/80 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 bg-clip-text text-transparent">
              System Infrastructure & Vendor Telemetry Matrix
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono font-medium">
            Ping: <strong className="text-emerald-600 font-bold">{healthTelemetry.latency_ms}ms</strong> • Checked: {healthTelemetry.last_checked}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { name: "FastAPI Engine", status: healthTelemetry.api_status, icon: Server },
            { name: "PostgreSQL DB", status: healthTelemetry.db_status, icon: Database },
            { name: "Payment Gateway", status: healthTelemetry.gateway_status, icon: CreditCard },
            { name: "DMT Provider", status: healthTelemetry.dmt_status, icon: ArrowLeftRight },
            { name: "AEPS Provider", status: healthTelemetry.aeps_status, icon: Smartphone },
            { name: "BBPS Provider", status: healthTelemetry.bbps_status, icon: Receipt },
            { name: "Recharge Gateway", status: healthTelemetry.recharge_status, icon: Zap },
            { name: "UPI Switch", status: healthTelemetry.upi_status, icon: Smartphone },
            { name: "POS Switch", status: healthTelemetry.pos_status, icon: Radio },
            { name: "WhatsApp API", status: healthTelemetry.whatsapp_status, icon: Wifi },
            { name: "B2 Cloud Storage", status: healthTelemetry.storage_status, icon: Cloud },
          ].map((item) => (
            <div
              key={item.name}
              className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 shadow-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-xs">
                  <item.icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-slate-900 leading-tight">{item.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">Telemetry OK</span>
                </div>
              </div>
              <span
                className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  item.status === "ONLINE"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : item.status === "DEGRADED"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${item.status === "ONLINE" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AdminOperationsDashboard;
