"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api-config";
import Link from "next/link";
import {
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Divider,
  Tooltip,
  Badge,
  Tab,
  Tabs,
  Stack,
  Dialog
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { DashboardAnnouncementModal } from "@/components/common/DashboardAnnouncementModal";
import WarningIcon from "@mui/icons-material/Warning";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import HistoryIcon from "@mui/icons-material/History";
import LockIcon from "@mui/icons-material/Lock";
import { useWalletSync } from "@/context/WalletSyncProvider";
import { useRetailerStore, THEME_CONFIGS } from "@/stores/use-retailer-store";
import { useRetailerApprovalGuard } from "@/hooks/useRetailerApprovalGuard";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";
import NotificationCenter from "@/app-shell/components/NotificationCenter";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";



interface HeaderWalletData {
  greeting: string;
  retailer_name: string;
  owner_name: string;
  company_name: string;
  retailer_code: string;
  wallet_balance: number;
  available_balance: number;
  blocked_balance: number;
  todays_debit: number;
  todays_credit: number;
  todays_commission: number;
  unread_notifications_count: number;
}

interface FinancialKPIData {
  todays_transfer: number;
  todays_wallet_debit: number;
  todays_commission: number;
  todays_gst: number;
  todays_tds: number;
  settlement_pending_amount: number;
  settlement_completed_amount: number;
  wallet_balance: number;
}

interface OperationsKPIData {
  pending_transactions: number;
  processing_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  reversed_transactions: number;
  todays_customers: number;
  todays_beneficiaries: number;
  average_processing_time_seconds: number;
  success_rate_pct: number;
  business_health: string;
}

interface ChartItem {
  date: string;
  amount?: number;
  count?: number;
  commission?: number;
  credits?: number;
  debits?: number;
  closing_balance?: number;
  settled?: number;
  pending?: number;
}

interface LiveFeedItem {
  transaction_id: string;
  transaction_number: string;
  vendor_ref: string;
  amount: number;
  net_debit: number;
  mode: string;
  utr_number: string;
  status: string;
  initiated_at: string;
}

interface AlertItem {
  id: string;
  priority: string;
  title: string;
  message: string;
  timestamp: string;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  desc: string;
  time: string;
}

interface SystemHealthService {
  name: string;
  status: string;
  code: string;
  latency_ms: number;
}

const formatAmount = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(Number(val))) return "0.00";
  return Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const RetailerDashboardView: React.FC = () => {
  const router = useRouter();
  const { walletData: headerWallet } = useWalletSync();
  const { isApproved, setApprovalStatus } = useRetailerApprovalGuard();
  const { openContactSupportModal } = useContactSupportModal();
  const { kpiTheme, wallet, outlet } = useRetailerStore();
  const activeTheme = THEME_CONFIGS[kpiTheme] || THEME_CONFIGS["classic-blue"];
  const [dashboardLockedModal, setDashboardLockedModal] = useState<{ label: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // API State Data
  const [finKpis, setFinKpis] = useState<FinancialKPIData | null>(null);
  const [opsKpis, setOpsKpis] = useState<OperationsKPIData | null>(null);
  const [charts, setCharts] = useState<{ transaction_trend: ChartItem[]; commission_trend: ChartItem[]; wallet_trend: ChartItem[]; settlement_trend: ChartItem[] }>({
    transaction_trend: [],
    commission_trend: [],
    wallet_trend: [],
    settlement_trend: []
  });
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthService[]>([]);

  // Active Chart Tab & Timeframe
  const [chartTab, setChartTab] = useState<number>(0);
  const [timeframe, setTimeframe] = useState<string>("7D");

  const fetchDashboardData = async () => {
    setLoading(true);
    setHasLoaded(true);
    try {
      const baseUrl = `${getApiBaseUrl()}/payout/dashboard/retailer`;
      let activeRetailerId = "";
      let resolvedUserId = "";
      if (typeof window !== "undefined") {
        try {
          const userStr =
            localStorage.getItem("user_info") ||
            localStorage.getItem("user") ||
            localStorage.getItem("auth_user") ||
            localStorage.getItem("pay2pay_user_data");
          if (userStr) {
            const u = JSON.parse(userStr);
            resolvedUserId = u.id || u.public_id || u.retailer_id || "";
          }
        } catch {}
        activeRetailerId = localStorage.getItem("p2p_active_retailer_id") || localStorage.getItem("pay2pay_reg_id") || "";
        if (!resolvedUserId) {
          resolvedUserId = activeRetailerId || localStorage.getItem("p2p_user_id") || "";
        }
      }
      const queryParam = activeRetailerId ? `retailer_id=${activeRetailerId}` : "";
      const qPrefix = queryParam ? `?${queryParam}` : "";
      const qAnd = queryParam ? `&${queryParam}` : "";

      const notifParams = new URLSearchParams();
      if (resolvedUserId) notifParams.set("user_id", resolvedUserId);
      notifParams.set("limit", "15");

      const [finRes, opsRes, chRes, feedRes, altRes, actRes, sysRes, notifRes] = await Promise.allSettled([
        fetch(`${baseUrl}/financial-kpis${qPrefix}`),
        fetch(`${baseUrl}/operations-kpis${qPrefix}`),
        fetch(`${baseUrl}/charts?timeframe=${timeframe}${qAnd}`),
        fetch(`${baseUrl}/live-feed${qPrefix}`),
        fetch(`${baseUrl}/business-alerts${qPrefix}`),
        fetch(`${baseUrl}/recent-activity${qPrefix}`),
        fetch(`${baseUrl}/system-health`),
        fetch(`/api/v1/notifications/recent?${notifParams.toString()}`)
      ]);

      if (finRes.status === "fulfilled" && finRes.value.ok) setFinKpis(await finRes.value.json());
      if (opsRes.status === "fulfilled" && opsRes.value.ok) setOpsKpis(await opsRes.value.json());
      if (chRes.status === "fulfilled" && chRes.value.ok) setCharts(await chRes.value.json());
      if (feedRes.status === "fulfilled" && feedRes.value.ok) setLiveFeed((await feedRes.value.json()).items || []);
      if (altRes.status === "fulfilled" && altRes.value.ok) setAlerts((await altRes.value.json()).alerts || []);
      if (actRes.status === "fulfilled" && actRes.value.ok) setActivities((await actRes.value.json()).activities || []);
      if (sysRes.status === "fulfilled" && sysRes.value.ok) setSystemHealth((await sysRes.value.json()).services || []);
      if (notifRes.status === "fulfilled" && notifRes.value.ok) {
        const notifJson = await notifRes.value.json();
        const items = Array.isArray(notifJson?.data)
          ? notifJson.data
          : Array.isArray(notifJson)
          ? notifJson
          : Array.isArray(notifJson?.items)
          ? notifJson.items
          : [];
        setNotifications(items);
      }
    } catch (e) {
      console.error("Failed to load enterprise dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch immediately on mount and when timeframe changes
  useEffect(() => {
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  // Real-time synchronization from NotificationCenter header component
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail?.notifications && Array.isArray(e.detail.notifications)) {
        setNotifications(e.detail.notifications);
      }
    };
    window.addEventListener("pay2pay:notifications_synced", handleSync);
    return () => {
      window.removeEventListener("pay2pay:notifications_synced", handleSync);
    };
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key.toLowerCase() === "s") {
          e.preventDefault();
          router.push("/retailer/dmt");
        } else if (e.key.toLowerCase() === "p") {
          e.preventDefault();
          router.push("/retailer/dmt/reports");
        } else if (e.key.toLowerCase() === "l") {
          e.preventDefault();
          router.push("/retailer/dmt/ledger");
        } else if (e.key.toLowerCase() === "m") {
          e.preventDefault();
          router.push("/retailer/pos/settlement-report");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const getStatusChip = (st: string) => {
    let color = "#3B82F6";
    let bg = "rgba(59, 130, 246, 0.20)";
    const u = st.toUpperCase();

    if (u === "SUCCESS") {
      color = "#4ADE80";
      bg = "rgba(22, 163, 74, 0.20)";
    } else if (u === "PENDING" || u === "PROCESSING" || u === "INITIATED") {
      color = "#FBBF24";
      bg = "rgba(217, 119, 6, 0.20)";
    } else if (u === "FAILED") {
      color = "#F87171";
      bg = "rgba(220, 38, 38, 0.20)";
    } else if (u === "REVERSED") {
      color = "#C084FC";
      bg = "rgba(168, 85, 247, 0.20)";
    }

    return (
      <Chip
        label={u}
        size="small"
        style={{
          backgroundColor: bg,
          color: color,
          fontWeight: 800,
          fontSize: "14px",
          padding: "4px 8px",
          border: `1px solid ${color}60`
        }}
      />
    );
  };

  return (
    <Box
      sx={{
        backgroundColor: "#08111F",
        color: "#F8FAFC",
        minHeight: "100vh",
        p: { xs: 2, md: 3 },
        fontFamily: "'Inter', 'Source Sans 3', 'IBM Plex Sans', sans-serif"
      }}
    >
      {/* 1. COMPACT DASHBOARD HEADER */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, md: 2 },
          mb: 2.5,
          borderRadius: 2.5,
          backgroundColor: activeTheme.cardBg || "#0F172A",
          backdropFilter: "blur(16px)",
          border: `1px solid ${activeTheme.cardBorder || "rgba(255, 255, 255, 0.1)"}`,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 1.5,
          transition: "background-color 0.3s ease, border-color 0.3s ease",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="h1" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "20px", letterSpacing: "-0.5px" }}>
            Pay2Pay
          </Typography>
          <Box sx={{ width: "1px", height: 16, bgcolor: "rgba(255,255,255,0.2)", display: { xs: "none", sm: "block" } }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#E2E8F0", fontSize: "14px" }}>
            {headerWallet?.retailer_name || headerWallet?.owner_name || outlet.ownerName || outlet.name || (typeof window !== "undefined" && (localStorage.getItem("p2p_retailer_name") || localStorage.getItem("pay2pay_user_name"))) || "Sathiya Murthy"}
          </Typography>
          <Chip
            label={headerWallet?.retailer_code || outlet.code || "RET-10928"}
            size="small"
            sx={{
              backgroundColor: "rgba(37, 99, 235, 0.2)",
              color: "#60A5FA",
              fontWeight: 700,
              fontSize: "11px",
              height: 22,
              border: "1px solid rgba(96, 165, 250, 0.3)",
            }}
          />
          <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "12px", display: { xs: "none", md: "inline" } }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Chip
            icon={<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#22C55E", ml: 1 }} />}
            label="Live"
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: "11px",
              height: 24,
              color: "#4ADE80",
              bgcolor: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
            }}
          />
          <Tooltip title={hasLoaded ? "Refresh Dashboard Data" : "Click to Load Dashboard Data"}>
            <IconButton
              onClick={fetchDashboardData}
              disabled={loading}
              size="small"
              sx={{
                color: hasLoaded ? "#CBD5E1" : "#60A5FA",
                backgroundColor: hasLoaded ? "rgba(255,255,255,0.06)" : "rgba(37, 99, 235, 0.15)",
                border: hasLoaded ? "none" : "1px solid rgba(59, 130, 246, 0.4)",
                width: 34,
                height: 34,
              }}
            >
              <RefreshIcon sx={{ fontSize: 18, animation: loading ? "spin 1s linear infinite" : "none" }} />
            </IconButton>
          </Tooltip>
          <NotificationCenter />
        </Box>
      </Paper>

      {/* 2. WALLET OVERVIEW SECTION */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.10)",
          boxShadow: "0 12px 28px -6px rgba(0,0,0,0.4)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
          <Box>
            <Typography variant="h2" sx={{ color: "#FFFFFF", fontWeight: 700, fontSize: "18px" }}>
              Wallet
            </Typography>
            <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "12px", mt: 0.2 }}>
              Balance & today's movement
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddCircleIcon sx={{ fontSize: 16 }} />}
              onClick={() => router.push("/retailer/wallet")}
              sx={{
                py: 0.8,
                px: 2,
                fontSize: "13px",
                fontWeight: 700,
                borderRadius: "8px",
                backgroundColor: "#F59E0B",
                color: "#000000",
                "&:hover": { backgroundColor: "#D97706", color: "#FFFFFF" },
                textTransform: "none",
              }}
            >
              ＋ Top Up
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
              onClick={() => router.push("/retailer/dmt/ledger")}
              sx={{
                py: 0.8,
                px: 2,
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "8px",
                borderColor: "rgba(255,255,255,0.2)",
                color: "#E2E8F0",
                "&:hover": { borderColor: "rgba(255,255,255,0.4)", bgcolor: "rgba(255,255,255,0.05)" },
                textTransform: "none",
              }}
            >
              ↻ Passbook
            </Button>
          </Stack>
        </Box>

        {/* PRIMARY ROW (4 Cards) */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {/* AVAILABLE */}
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "rgba(34, 197, 94, 0.08)",
                border: "1px solid rgba(34, 197, 94, 0.25)",
                height: "100%",
              }}
            >
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", display: "block" }}>
                AVAILABLE
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "22px", mt: 0.5 }}>
                ₹{formatAmount(headerWallet?.available_balance ?? wallet.availableBalance ?? wallet.mainBalance)}
              </Typography>
            </Box>
          </Grid>

          {/* RESERVED */}
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                height: "100%",
              }}
            >
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", display: "block" }}>
                RESERVED
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "22px", mt: 0.5 }}>
                ₹{formatAmount(headerWallet?.blocked_balance)}
              </Typography>
            </Box>
          </Grid>

          {/* DEBIT */}
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                height: "100%",
              }}
            >
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", display: "block" }}>
                DEBIT
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#F87171", fontSize: "22px", mt: 0.5 }}>
                -₹{formatAmount(headerWallet?.todays_debit)}
              </Typography>
            </Box>
          </Grid>

          {/* REVERSAL */}
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.25)",
                height: "100%",
              }}
            >
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", display: "block" }}>
                REVERSAL
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "22px", mt: 0.5 }}>
                +₹{formatAmount(headerWallet?.todays_credit)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* SECONDARY ROW (4 Cards) */}
        <Grid container spacing={2}>
          {/* COMMISSION */}
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "rgba(168, 85, 247, 0.08)",
                border: "1px solid rgba(168, 85, 247, 0.25)",
                height: "100%",
              }}
            >
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", display: "block" }}>
                COMMISSION
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#C084FC", fontSize: "20px", mt: 0.5 }}>
                +₹{formatAmount(headerWallet?.todays_commission)}
              </Typography>
            </Box>
          </Grid>

          {/* GST */}
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                height: "100%",
              }}
            >
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", display: "block" }}>
                GST
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#E2E8F0", fontSize: "20px", mt: 0.5 }}>
                ₹{formatAmount(headerWallet?.todays_gst)}
              </Typography>
            </Box>
          </Grid>

          {/* TDS */}
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                height: "100%",
              }}
            >
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", display: "block" }}>
                TDS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#E2E8F0", fontSize: "20px", mt: 0.5 }}>
                ₹{formatAmount(headerWallet?.todays_tds)}
              </Typography>
            </Box>
          </Grid>

          {/* POS PENDING */}
          <Grid size={{ xs: 6, sm: 3 }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: "rgba(20, 184, 166, 0.08)",
                border: "1px solid rgba(20, 184, 166, 0.25)",
                height: "100%",
              }}
            >
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", display: "block" }}>
                POS PENDING
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#2DD4BF", fontSize: "20px", mt: 0.5 }}>
                ₹{formatAmount(headerWallet?.settlement_pending_amount)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 4. FINANCIAL ACCOUNTING KPIS */}
      <Typography variant="h3" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "16px", mb: 1.5, letterSpacing: "0.2px" }}>
        Financial Accounting KPIs
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "TODAY'S TRANSFER", value: `₹${formatAmount(finKpis?.todays_transfer)}`, color: "#3B82F6", sub: "Gross Beneficiary Credit" },
          { label: "TODAY'S WALLET DEBIT", value: `₹${formatAmount(finKpis?.todays_wallet_debit)}`, color: "#F87171", sub: "Amount + Fee + GST" },
          { label: "TODAY'S COMMISSION", value: `₹${formatAmount(finKpis?.todays_commission)}`, color: "#4ADE80", sub: "Instant Net Revenue" },
          { label: "TODAY'S GST", value: `₹${formatAmount(finKpis?.todays_gst)}`, color: "#FBBF24", sub: "18% GST Deduction" },
          { label: "TODAY'S TDS", value: `₹${formatAmount(finKpis?.todays_tds)}`, color: "#C084FC", sub: "Sec 194O Tax Withheld" },
          { label: "SETTLEMENT PENDING", value: `₹${formatAmount(finKpis?.settlement_pending_amount)}`, color: "#FBBF24", sub: "Awaiting Bank Settlement" },
          { label: "SETTLEMENT SETTLED", value: `₹${formatAmount(finKpis?.settlement_completed_amount)}`, color: "#4ADE80", sub: "Credited to Bank Account" },
          { label: "CURRENT WALLET BALANCE", value: `₹${formatAmount(finKpis?.wallet_balance)}`, color: "#38BDF8", sub: "Live Account Ledger" }
        ].map((k) => (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={k.label}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.08)", borderLeft: `4px solid ${k.color}` }}>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "11px", letterSpacing: "0.4px" }}>{k.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#FFFFFF", mt: 0.5, fontSize: "20px" }}>{k.value}</Typography>
              <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px", mt: 0.3, display: "block" }}>{k.sub}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 5. OPERATIONS & VELOCITY METRICS */}
      <Typography variant="h3" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "16px", mb: 1.5, letterSpacing: "0.2px" }}>
        Operations & Velocity
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "PENDING", value: opsKpis ? opsKpis.pending_transactions : 0, color: "#FBBF24", sub: "Queued" },
          { label: "PROCESSING", value: opsKpis ? opsKpis.processing_transactions : 0, color: "#60A5FA", sub: "Active Handshake" },
          { label: "SUCCESSFUL", value: opsKpis ? opsKpis.successful_transactions : 0, color: "#4ADE80", sub: "Confirmed" },
          { label: "FAILED", value: opsKpis ? opsKpis.failed_transactions : 0, color: "#F87171", sub: "Rejected" },
          { label: "REVERSED", value: opsKpis ? opsKpis.reversed_transactions : 0, color: "#C084FC", sub: "Auto-Refunded" },
          { label: "CUSTOMERS TODAY", value: opsKpis ? opsKpis.todays_customers : 0, color: "#38BDF8", sub: "Unique Senders" },
          { label: "BENEFICIARIES", value: opsKpis ? opsKpis.todays_beneficiaries : 0, color: "#F472B6", sub: "Receivers" },
          { label: "AVG SPEED", value: `${opsKpis ? opsKpis.average_processing_time_seconds : 2.4}s`, color: "#60A5FA", sub: "Latency" },
          { label: "SUCCESS RATE", value: `${opsKpis ? opsKpis.success_rate_pct : 98.6}%`, color: "#4ADE80", sub: "Benchmark" },
          { label: "HEALTH STATUS", value: opsKpis ? opsKpis.business_health : "EXCELLENT", color: "#4ADE80", sub: "State" }
        ].map((k) => (
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={k.label}>
            <Paper elevation={0} sx={{ p: 1.75, borderRadius: 2.5, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.08)", borderLeft: `4px solid ${k.color}` }}>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "11px", letterSpacing: "0.4px" }}>{k.label}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "#FFFFFF", mt: 0.5, fontSize: "20px" }}>{k.value}</Typography>
              <Typography variant="caption" sx={{ color: "#64748B", fontSize: "11px", mt: 0.2, display: "block" }}>{k.sub}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 6. FINANCIAL CHARTS & BUSINESS ALERTS */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "16px" }}>
                Interactive Analytics
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {["1D", "7D", "30D"].map((tf) => (
                  <Chip
                    key={tf}
                    label={tf}
                    size="small"
                    onClick={() => setTimeframe(tf)}
                    sx={{ backgroundColor: timeframe === tf ? "#2563EB" : "rgba(255,255,255,0.06)", color: "#FFFFFF", fontWeight: 700, fontSize: "12px", px: 0.5, cursor: "pointer" }}
                  />
                ))}
              </Box>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: "rgba(255,255,255,0.08)", mb: 2 }}>
              <Tabs value={chartTab} onChange={(_, val) => setChartTab(val)} textColor="inherit" indicatorColor="primary">
                <Tab label="Volume" sx={{ textTransform: "none", fontWeight: 600, fontSize: "13px", color: "#E2E8F0" }} />
                <Tab label="Commission" sx={{ textTransform: "none", fontWeight: 600, fontSize: "13px", color: "#E2E8F0" }} />
                <Tab label="Wallet Flow" sx={{ textTransform: "none", fontWeight: 600, fontSize: "13px", color: "#E2E8F0" }} />
                <Tab label="Settlement" sx={{ textTransform: "none", fontWeight: 600, fontSize: "13px", color: "#E2E8F0" }} />
              </Tabs>
            </Box>

            <Box sx={{ height: 260, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartTab === 0 ? (
                  <AreaChart data={charts.transaction_trend}>
                    <defs>
                      <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 12 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.1)", borderRadius: 8, fontSize: "13px" }} />
                    <Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorAmt)" />
                  </AreaChart>
                ) : chartTab === 1 ? (
                  <BarChart data={charts.commission_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 12 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.1)", borderRadius: 8, fontSize: "13px" }} />
                    <Bar dataKey="commission" fill="#4ADE80" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : chartTab === 2 ? (
                  <AreaChart data={charts.wallet_trend}>
                    <defs>
                      <linearGradient id="colorWal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 12 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.1)", borderRadius: 8, fontSize: "13px" }} />
                    <Area type="monotone" dataKey="closing_balance" stroke="#4ADE80" strokeWidth={2} fillOpacity={1} fill="url(#colorWal)" />
                  </AreaChart>
                ) : (
                  <BarChart data={charts.settlement_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 12 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.1)", borderRadius: 8, fontSize: "13px" }} />
                    <Bar dataKey="settled" fill="#38BDF8" stackId="a" />
                    <Bar dataKey="pending" fill="#FBBF24" stackId="a" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Business Alerts & System Notifications */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.08)", height: "100%", display: "flex", flexDirection: "column" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "16px", display: "flex", alignItems: "center", gap: 1 }}>
                <WarningIcon color="warning" sx={{ fontSize: 20 }} /> Live Alerts & Updates
                {(alerts.length > 0 || notifications.length > 0) && (
                  <Chip
                    label={alerts.length + notifications.length}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: "10px",
                      fontWeight: 900,
                      bgcolor: "rgba(251, 191, 36, 0.2)",
                      color: "#FDE047",
                      border: "1px solid rgba(251, 191, 36, 0.4)",
                    }}
                  />
                )}
              </Typography>
              <Button
                size="small"
                onClick={() => router.push("/retailer/notifications")}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "11.5px",
                  color: "#FDE047",
                  minWidth: 0,
                  p: "2px 6px",
                  "&:hover": { color: "#FEF08A", backgroundColor: "rgba(251, 191, 36, 0.12)" },
                }}
              >
                View All →
              </Button>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, flex: 1, overflowY: "auto", maxHeight: 290, pr: 0.5 }}>
              {alerts.length === 0 && notifications.length === 0 ? (
                <Typography sx={{ color: "#64748B", fontSize: "12px", textAlign: "center", py: 4 }}>
                  All systems operating normally.
                </Typography>
              ) : (
                <>
                  {alerts.map((alt) => (
                    <Box
                      key={alt.id}
                      sx={{
                        p: 1.75,
                        borderRadius: 2,
                        backgroundColor: alt.priority === "CRITICAL" ? "rgba(220, 38, 38, 0.1)" : "rgba(217, 119, 6, 0.1)",
                        border: `1px solid ${alt.priority === "CRITICAL" ? "rgba(248, 113, 113, 0.3)" : "rgba(251, 191, 36, 0.3)"}`
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5, alignItems: "center" }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: alt.priority === "CRITICAL" ? "#FCA5A5" : "#FDE047", fontSize: "13px" }}>
                          {alt.title}
                        </Typography>
                        <Chip label={alt.priority} size="small" sx={{ height: 18, fontSize: "10px", fontWeight: 700 }} />
                      </Box>
                      <Typography variant="body2" sx={{ color: "#CBD5E1", fontSize: "12px", lineHeight: 1.4 }}>{alt.message}</Typography>
                    </Box>
                  ))}

                  {notifications.map((notif: any) => {
                    const isSuccess = (notif.status || "").toUpperCase() === "SUCCESS";
                    const isTxn = (notif.type || "").toUpperCase() === "TRANSACTION";
                    const isCredit = (notif.type || "").toUpperCase() === "CREDIT";

                    return (
                      <Box
                        key={notif.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: isSuccess ? "rgba(34, 197, 94, 0.12)" : "rgba(56, 189, 248, 0.12)",
                          border: isSuccess ? "1px solid rgba(74, 222, 128, 0.3)" : "1px solid rgba(56, 189, 248, 0.3)",
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4, alignItems: "center" }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: isSuccess ? "#86EFAC" : "#7DD3FC", fontSize: "13px" }}>
                            {notif.title}
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                            {notif.amount && Number(notif.amount) > 0 && (
                              <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "12px", fontFamily: "monospace" }}>
                                {isCredit || isTxn ? "+" : ""}₹{formatAmount(notif.amount)}
                              </Typography>
                            )}
                            <Chip
                              label={notif.status || notif.type || "INFO"}
                              size="small"
                              sx={{
                                height: 17,
                                fontSize: "9px",
                                fontWeight: 800,
                                bgcolor: isSuccess ? "rgba(34, 197, 94, 0.2)" : "rgba(56, 189, 248, 0.2)",
                                color: isSuccess ? "#4ADE80" : "#38BDF8",
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography variant="body2" sx={{ color: "#CBD5E1", fontSize: "12px", lineHeight: 1.35 }}>
                          {notif.message}
                        </Typography>
                        {notif.reference && (
                          <Box sx={{ mt: 0.5, pt: 0.4, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between" }}>
                            <Chip
                              label={notif.reference}
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(notif.reference);
                              }}
                              sx={{
                                height: 18,
                                fontSize: "9.5px",
                                fontFamily: "monospace",
                                bgcolor: "rgba(251, 191, 36, 0.12)",
                                color: "#FDE68A",
                                cursor: "pointer",
                              }}
                            />
                            <Typography sx={{ color: "#94A3B8", fontSize: "10px" }}>
                              {notif.created_at ? new Date(notif.created_at).toLocaleTimeString("en-IN", { timeStyle: "short" }) : ""}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 7. LIVE TRANSACTION FEED & RECENT ACTIVITY */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ borderRadius: 3, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.08)", overflow: "hidden" }}>
            <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h3" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "16px" }}>Live Transaction Feed</Typography>
              <Button size="small" variant="outlined" onClick={() => router.push("/retailer/dmt/reports")} sx={{ textTransform: "none", fontWeight: 600, fontSize: "12px", borderColor: "rgba(255,255,255,0.2)", color: "#E2E8F0" }}>
                Full Report
              </Button>
            </Box>
            <TableContainer sx={{ maxHeight: 320 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { backgroundColor: "#0F172A", color: "#94A3B8", fontWeight: 700, fontSize: "11px", py: 1.2, textTransform: "uppercase" } }}>
                    <TableCell>Time</TableCell>
                    <TableCell>Txn ID</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Debit</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell>UTR</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {liveFeed.map((tx) => (
                    <TableRow key={tx.transaction_id} hover sx={{ "& td": { borderColor: "rgba(255,255,255,0.06)", color: "#E2E8F0", fontSize: "13px", fontWeight: 500, py: 1 } }}>
                      <TableCell sx={{ color: "#94A3B8" }}>{tx.initiated_at ? new Date(tx.initiated_at).toLocaleTimeString("en-IN", { timeStyle: "short" }) : "--"}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "#60A5FA" }}>{tx.transaction_number}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>₹{formatAmount(tx?.amount)}</TableCell>
                      <TableCell align="right" sx={{ color: "#F87171", fontWeight: 600 }}>₹{formatAmount(tx?.net_debit)}</TableCell>
                      <TableCell>{tx.mode}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "12px", color: "#94A3B8" }}>{tx.utr_number}</TableCell>
                      <TableCell align="center">{getStatusChip(tx.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.08)", height: "100%" }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "16px", mb: 2 }}>Activity Log</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {activities.length === 0 && notifications.length === 0 ? (
                <Typography sx={{ color: "#64748B", fontSize: "12px", textAlign: "center", py: 3 }}>
                  No recent activities recorded.
                </Typography>
              ) : activities.length > 0 ? (
                activities.map((act) => (
                  <Box key={act.id} sx={{ p: 1.75, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#60A5FA", fontSize: "13px" }}>{act.title}</Typography>
                    <Typography variant="body2" sx={{ color: "#CBD5E1", fontSize: "12px", mt: 0.3, lineHeight: 1.4 }}>{act.desc}</Typography>
                  </Box>
                ))
              ) : (
                notifications.slice(0, 4).map((notif: any) => (
                  <Box key={notif.id} sx={{ p: 1.5, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#60A5FA", fontSize: "13px" }}>{notif.title}</Typography>
                      <Typography sx={{ color: "#94A3B8", fontSize: "10px" }}>
                        {notif.created_at ? new Date(notif.created_at).toLocaleTimeString("en-IN", { timeStyle: "short" }) : ""}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ color: "#CBD5E1", fontSize: "12px", mt: 0.3, lineHeight: 1.4 }}>{notif.message}</Typography>
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 8. ONE-CLICK QUICK REPORTS */}
      <Typography variant="h3" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "16px", mb: 1.5 }}>
        Quick Reports
      </Typography>
      <Grid container spacing={2}>
        {[
          { title: "Payout Report", path: "/retailer/dmt/reports", desc: "Transfer and status history" },
          { title: "Passbook Ledger", path: "/retailer/dmt/ledger", desc: "Wallet debit & credit statement" },
          { title: "POS Settlement Report", path: "/retailer/pos/settlement-report", desc: "Terminal MDR & bank credit statement" }
        ].map((rep) => (
          <Grid size={{ xs: 12, md: 4 }} key={rep.title}>
            <Paper
              onClick={() => router.push(rep.path)}
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                backgroundColor: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                "&:hover": { transform: "translateY(-2px)", borderColor: "#F59E0B" }
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "14px" }}>{rep.title}</Typography>
              <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "12px", mt: 0.3 }}>{rep.desc}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
      {/* ── Dashboard Locked Feature Modal ────────────────────────────────────── */}
      <Dialog
        open={Boolean(dashboardLockedModal)}
        onClose={() => setDashboardLockedModal(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "24px",
              bgcolor: "#0F172A",
              color: "#FFFFFF",
              p: 3.5,
              maxWidth: 440,
              width: "100%",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
            },
          },
        }}
      >
        <Box sx={{ textCenter: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Box sx={{ w: 14, h: 14, p: 1.5, borderRadius: "50%", bgcolor: "rgba(245, 158, 11, 0.15)", border: "2px solid rgba(245, 158, 11, 0.4)", color: "#FBBF24", mb: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LockIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#FFFFFF", textAlign: "center" }}>
            {dashboardLockedModal?.label || "Action"} Restricted
          </Typography>
          <Typography variant="body2" sx={{ color: "#CBD5E1", mt: 1.5, textAlign: "center", fontSize: "13px", lineHeight: 1.5 }}>
            Your retailer account is currently <strong>PENDING ADMIN APPROVAL</strong>. Financial services, wallet top-ups, and transaction actions are restricted until Admin approves your application.
          </Typography>

          <Stack spacing={1.5} sx={{ mt: 3, width: "100%" }}>
            <Button
              component={Link}
              href="/register/submitted"
              onClick={() => setDashboardLockedModal(null)}
              variant="contained"
              fullWidth
              sx={{ bgcolor: "#2563EB", color: "#FFF", fontWeight: 800, borderRadius: "12px", height: 44, textTransform: "none", fontSize: "13px" }}
            >
              View Application Status
            </Button>
            <Button
              onClick={() => {
                setDashboardLockedModal(null);
                openContactSupportModal();
              }}
              variant="outlined"
              fullWidth
              sx={{ borderColor: "#3B82F6", color: "#60A5FA", fontWeight: 800, borderRadius: "12px", height: 44, textTransform: "none", fontSize: "13px", "&:hover": { bgcolor: "rgba(59, 130, 246, 0.1)" } }}
            >
              Contact Admin Support
            </Button>
            <Button
              onClick={() => setDashboardLockedModal(null)}
              variant="text"
              fullWidth
              sx={{ color: "#94A3B8", fontWeight: 700, textTransform: "none", fontSize: "13px" }}
            >
              Dismiss
            </Button>
          </Stack>
        </Box>
      </Dialog>

      {/* Dynamic Database & Backblaze B2 Driven Announcement Modal */}
      <DashboardAnnouncementModal audience="RETAILER" />
    </Box>
  );
};
