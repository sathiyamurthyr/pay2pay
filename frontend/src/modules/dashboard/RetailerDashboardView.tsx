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
  Dialog,
  Skeleton
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import NotificationsIcon from "@mui/icons-material/Notifications";
import WarningIcon from "@mui/icons-material/Warning";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import HistoryIcon from "@mui/icons-material/History";
import LockIcon from "@mui/icons-material/Lock";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PercentIcon from "@mui/icons-material/Percent";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SendIcon from "@mui/icons-material/Send";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import QrCodeIcon from "@mui/icons-material/QrCode";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import ReceiptIcon from "@mui/icons-material/Receipt";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SearchIcon from "@mui/icons-material/Search";
import { DashboardAnnouncementModal } from "@/components/common/DashboardAnnouncementModal";
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
  current_time_iso?: string;
  retailer_info?: {
    role_title?: string;
    approval_status?: string;
  };
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

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "--";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
};

const DualCurveSwoosh: React.FC = () => (
  <svg
    viewBox="0 0 120 45"
    preserveAspectRatio="none"
    fill="none"
    style={{
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 96,
      height: 38,
      pointerEvents: "none",
      userSelect: "none",
      borderBottomRightRadius: "16px",
      overflow: "hidden",
    }}
  >
    {/* Gold Yellow Accent Ribbon */}
    <path
      d="M 5,45 C 45,42 70,25 120,0 L 120,16 C 75,36 45,45 5,45 Z"
      fill="#EDC11E"
    />
    {/* Primary Burgundy Wave */}
    <path
      d="M 20,45 C 60,45 80,32 120,14 L 120,45 Z"
      fill="#A20A3A"
    />
  </svg>
);

const QUICK_SERVICES = [
  {
    id: "dmt",
    title: "DMT",
    subtitle: "Direct Money Transfer",
    route: "/retailer/dmt",
    requiresApproval: true,
    icon: <SendIcon sx={{ fontSize: 20 }} />,
    iconBg: "#FFF0F4",
    iconColor: "#A20A3A",
  },
  {
    id: "aeps",
    title: "AEPS",
    subtitle: "Aadhaar ATM & MicroATM",
    route: "/retailer/aeps",
    requiresApproval: true,
    icon: <FingerprintIcon sx={{ fontSize: 20 }} />,
    iconBg: "#FFF8DC",
    iconColor: "#D4A915",
  },
  {
    id: "upi",
    title: "UPI",
    subtitle: "Dynamic QR & Collect",
    route: "/retailer/upi",
    requiresApproval: true,
    icon: <QrCodeIcon sx={{ fontSize: 20 }} />,
    iconBg: "#FFF0F4",
    iconColor: "#A20A3A",
  },
  {
    id: "recharge",
    title: "Recharge",
    subtitle: "Prepaid, Postpaid, DTH",
    route: "/retailer/recharge",
    requiresApproval: false,
    icon: <PhoneAndroidIcon sx={{ fontSize: 20 }} />,
    iconBg: "#FFF8DC",
    iconColor: "#D4A915",
  },
  {
    id: "bbps",
    title: "BBPS",
    subtitle: "Electricity, Water, Gas",
    route: "/retailer/bbps",
    requiresApproval: false,
    icon: <ReceiptIcon sx={{ fontSize: 20 }} />,
    iconBg: "#FFF0F4",
    iconColor: "#A20A3A",
  },
  {
    id: "pos",
    title: "Card to Cash",
    subtitle: "mPOS / POS Swipe Cashout",
    route: "/retailer/card-to-cash",
    requiresApproval: true,
    icon: <CreditCardIcon sx={{ fontSize: 20 }} />,
    iconBg: "#FFF8DC",
    iconColor: "#D4A915",
  },
];

export const RetailerDashboardView: React.FC = () => {
  const router = useRouter();
  const { walletData: headerWallet } = useWalletSync();
  const { isApproved } = useRetailerApprovalGuard();
  const { openContactSupportModal } = useContactSupportModal();
  const { wallet, outlet } = useRetailerStore();
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
    try {
      let authHeader: Record<string, string> = {};
      if (typeof window !== "undefined") {
        const cookies = document.cookie ? document.cookie.split("; ") : [];
        const tokenCookie = cookies.find(
          (row) =>
            row.startsWith("p2p_access_token=") ||
            row.startsWith("pay2pay_access_token=") ||
            row.startsWith("pay2pay_auth_token=") ||
            row.startsWith("access_token=") ||
            row.startsWith("token=")
        );
        const token =
          (tokenCookie ? tokenCookie.split("=").slice(1).join("=") : null) ||
          localStorage.getItem("p2p_access_token") ||
          localStorage.getItem("access_token") ||
          localStorage.getItem("pay2pay_access_token") ||
          localStorage.getItem("pay2pay_auth_token") ||
          localStorage.getItem("retailer_token") ||
          localStorage.getItem("token") ||
          "";
        if (token && token.trim().length > 10) {
          authHeader = { Authorization: `Bearer ${token.trim()}` };
        }
      }

      const fetchAuth = (url: string) =>
        fetch(url, { credentials: "include", headers: { ...authHeader } });

      const baseUrl = `${getApiBaseUrl()}/payout/dashboard/retailer`;
      const qPrefix = "?user_type_ref_id=2";
      const qAnd = "&user_type_ref_id=2";

      const notifParams = new URLSearchParams({ limit: "15" });

      const [finRes, opsRes, chRes, feedRes, altRes, actRes, sysRes, notifRes] = await Promise.allSettled([
        fetchAuth(`${baseUrl}/financial-kpis${qPrefix}`),
        fetchAuth(`${baseUrl}/operations-kpis${qPrefix}`),
        fetchAuth(`${baseUrl}/charts?timeframe=${timeframe}${qAnd}`),
        fetchAuth(`${baseUrl}/live-feed${qPrefix}`),
        fetchAuth(`${baseUrl}/business-alerts${qPrefix}`),
        fetchAuth(`${baseUrl}/recent-activity${qPrefix}`),
        fetchAuth(`${baseUrl}/system-health`),
        fetchAuth(`/api/v1/notifications/recent?${notifParams.toString()}`)
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
      console.error("Failed to load retailer dashboard data", e);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

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
    const u = (st || "SUCCESS").toUpperCase();
    if (u === "SUCCESS" || u === "COMPLETED") {
      return (
        <Chip
          label="SUCCESS"
          size="small"
          sx={{
            bgcolor: "#DCFCE7",
            color: "#166534",
            fontWeight: 700,
            fontSize: "12px",
            height: "24px",
            border: "1px solid #BBF7D0",
          }}
        />
      );
    } else if (u === "PENDING" || u === "PROCESSING" || u === "INITIATED") {
      return (
        <Chip
          label={u}
          size="small"
          sx={{
            bgcolor: "#FFF8DC",
            color: "#B45309",
            fontWeight: 700,
            fontSize: "12px",
            height: "24px",
            border: "1px solid #FDE68A",
          }}
        />
      );
    } else if (u === "FAILED") {
      return (
        <Chip
          label="FAILED"
          size="small"
          sx={{
            bgcolor: "#FEE2E2",
            color: "#991B1B",
            fontWeight: 700,
            fontSize: "12px",
            height: "24px",
            border: "1px solid #FECACA",
          }}
        />
      );
    } else if (u === "REVERSED") {
      return (
        <Chip
          label="REVERSED"
          size="small"
          sx={{
            bgcolor: "#FFF0F4",
            color: "#A20A3A",
            fontWeight: 700,
            fontSize: "12px",
            height: "24px",
            border: "1px solid #FCD3DE",
          }}
        />
      );
    }
    return (
      <Chip
        label={u}
        size="small"
        sx={{
          bgcolor: "#F1F5F9",
          color: "#334155",
          fontWeight: 700,
          fontSize: "12px",
          height: "24px",
        }}
      />
    );
  };

  const retailerName =
    headerWallet?.retailer_name ||
    headerWallet?.owner_name ||
    outlet.ownerName ||
    outlet.name ||
    (typeof window !== "undefined" && (localStorage.getItem("p2p_retailer_name") || localStorage.getItem("pay2pay_user_name"))) ||
    "Retailer Partner";

  const retailerCode =
    headerWallet?.retailer_code ||
    outlet.code ||
    (typeof window !== "undefined" && (localStorage.getItem("p2p_retailer_code") || localStorage.getItem("retailer_code"))) ||
    "RET-10928";

  const accountType =
    headerWallet?.retailer_info?.role_title || "Enterprise Retailer";

  const currentDate = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const totTxns = opsKpis
    ? (opsKpis.successful_transactions + opsKpis.pending_transactions + opsKpis.processing_transactions + opsKpis.failed_transactions + opsKpis.reversed_transactions)
    : 0;

  return (
    <Box
      sx={{
        backgroundColor: "#FFFFFF",
        color: "#0F172A",
        minHeight: "100vh",
        p: { xs: 2, sm: 2.5, md: 3 },
        fontFamily: "'Inter', 'Source Sans 3', 'IBM Plex Sans', sans-serif"
      }}
    >
      <DashboardAnnouncementModal />

      {/* SECTION A: COMPACT HEADER & RETAILER INFORMATION */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.25 },
          mb: 3,
          borderRadius: "18px",
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 1.5,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography
            variant="h1"
            sx={{
              fontWeight: 800,
              color: "#0F172A",
              fontSize: { xs: "20px", sm: "22px", md: "24px" },
              letterSpacing: "-0.5px"
            }}
          >
            Retailer Dashboard
          </Typography>
          <Box sx={{ width: "1px", height: 20, bgcolor: "#E2E8F0", display: { xs: "none", sm: "block" } }} />
          <Typography variant="body1" sx={{ fontWeight: 700, color: "#1E293B", fontSize: "14px" }}>
            {retailerName}
          </Typography>
          <Chip
            label={retailerCode}
            size="small"
            sx={{
              backgroundColor: "#FFF0F4",
              color: "#A20A3A",
              fontWeight: 700,
              fontSize: "12px",
              height: 24,
              border: "1px solid #FCD3DE",
            }}
          />
          <Chip
            label={accountType}
            size="small"
            sx={{
              backgroundColor: "#FFF8DC",
              color: "#B45309",
              fontWeight: 700,
              fontSize: "12px",
              height: 24,
              border: "1px solid #FDE68A",
              display: { xs: "none", md: "inline-flex" }
            }}
          />
          <Typography variant="body2" sx={{ color: "#475569", fontSize: "13px", fontWeight: 500, display: { xs: "none", md: "inline" } }}>
            {currentDate}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Chip
            icon={<Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#16A34A", ml: 1 }} />}
            label="Live"
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: "12px",
              height: 26,
              color: "#166534",
              bgcolor: "#DCFCE7",
              border: "1px solid #BBF7D0",
            }}
          />
          <Tooltip title={hasLoaded ? "Refresh Dashboard Data" : "Click to Load Dashboard Data"}>
            <IconButton
              onClick={fetchDashboardData}
              disabled={loading}
              size="small"
              sx={{
                color: "#475569",
                backgroundColor: "#F8FAFC",
                border: "1px solid #E2E8F0",
                width: 36,
                height: 36,
                borderRadius: "10px",
                "&:hover": { backgroundColor: "#FFF0F4", color: "#A20A3A", borderColor: "#FCD3DE" }
              }}
            >
              <RefreshIcon sx={{ fontSize: 18, animation: loading ? "spin 1s linear infinite" : "none" }} />
            </IconButton>
          </Tooltip>
          <NotificationCenter />
        </Box>
      </Paper>

      {/* SECTION B & C: PROMINENT WALLET SUMMARY & QUICK ACTIONS */}
      <Grid container spacing={2.5} sx={{ mb: 3, alignItems: "stretch" }}>
        {/* SECTION B: PROMINENT WALLET SUMMARY CARD */}
        <Grid size={{ xs: 12, lg: 5 }} sx={{ display: "flex" }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: "20px",
              background: "linear-gradient(135deg, #A20A3A 0%, #6B0525 60%, #B8860B 100%)",
              color: "#FFFFFF",
              position: "relative",
              overflow: "hidden",
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 8px 28px rgba(162, 10, 58, 0.22)",
            }}
          >
            {/* Subtle decorative glow */}
            <Box
              sx={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 150,
                height: 150,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(237, 193, 30, 0.35) 0%, rgba(237, 193, 30, 0) 70%)",
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: -40,
                left: -20,
                width: 130,
                height: 130,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0) 70%)",
                pointerEvents: "none",
              }}
            />

            <Box sx={{ position: "relative", zIndex: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.95)", fontSize: "13px", fontWeight: 800, letterSpacing: "0.6px", textTransform: "uppercase" }}>
                    Available Wallet Balance
                  </Typography>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "12px", mt: 0.3 }}>
                    Near4You Settlement & Liquidity Ledger
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.1,
                    borderRadius: "12px",
                    bgcolor: "rgba(255, 255, 255, 0.15)",
                    backdropFilter: "blur(8px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AccountBalanceWalletIcon sx={{ fontSize: 24, color: "#FFFFFF" }} />
                </Box>
              </Box>

              {loading && !hasLoaded ? (
                <Skeleton variant="text" width={220} height={60} sx={{ bgcolor: "rgba(255, 255, 255, 0.2)" }} />
              ) : (
                <Typography
                  variant="h2"
                  sx={{
                    color: "#FFFFFF",
                    fontWeight: 900,
                    fontSize: { xs: "34px", sm: "40px", md: "44px" },
                    lineHeight: 1.05,
                    letterSpacing: "-0.8px",
                    my: 1.5,
                    textShadow: "0 2px 8px rgba(0,0,0,0.25)",
                  }}
                >
                  ₹{formatAmount(headerWallet?.available_balance ?? wallet.availableBalance ?? wallet.mainBalance)}
                </Typography>
              )}

              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.95)", fontSize: "13px" }}>
                  Reserved: <strong>₹{formatAmount(headerWallet?.blocked_balance)}</strong>
                </Typography>
                <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "rgba(255, 255, 255, 0.6)", display: { xs: "none", sm: "block" } }} />
                <Typography sx={{ color: "rgba(255, 255, 255, 0.95)", fontSize: "13px" }}>
                  Today's Debit: <strong>-₹{formatAmount(headerWallet?.todays_debit)}</strong>
                </Typography>
              </Box>
            </Box>

            {/* Buttons & Realtime status */}
            <Box sx={{ position: "relative", zIndex: 1, mt: 3, pt: 2.2, borderTop: "1px solid rgba(255, 255, 255, 0.20)" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    size="medium"
                    startIcon={<AddCircleIcon sx={{ fontSize: 18 }} />}
                    onClick={() => {
                      if (!isApproved) {
                        setDashboardLockedModal({ label: "Wallet Top-Up" });
                        return;
                      }
                      router.push("/retailer/wallet-topup");
                    }}
                    sx={{
                      py: 1,
                      px: 3,
                      fontSize: "13px",
                      fontWeight: 800,
                      borderRadius: "9999px",
                      backgroundColor: "#FFFFFF",
                      color: "#A20A3A",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
                      "&:hover": {
                        backgroundColor: "#FFF8DC",
                        color: "#6B0525",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
                      },
                      textTransform: "none",
                    }}
                  >
                    ＋ Top Up
                  </Button>
                  <Button
                    variant="outlined"
                    size="medium"
                    startIcon={<HistoryIcon sx={{ fontSize: 18 }} />}
                    onClick={() => router.push("/retailer/dmt/ledger")}
                    sx={{
                      py: 1,
                      px: 3,
                      fontSize: "13px",
                      fontWeight: 700,
                      borderRadius: "9999px",
                      borderColor: "rgba(255, 255, 255, 0.85)",
                      color: "#FFFFFF",
                      backgroundColor: "rgba(255, 255, 255, 0.12)",
                      "&:hover": {
                        borderColor: "#FFFFFF",
                        backgroundColor: "rgba(255, 255, 255, 0.24)",
                      },
                      textTransform: "none",
                    }}
                  >
                    Passbook
                  </Button>
                </Stack>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.80)", fontSize: "12px", fontWeight: 600 }}>
                  ● Realtime sync
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* SECTION C: QUICK ACTIONS (6 SERVICE SHORTCUTS) */}
        <Grid size={{ xs: 12, lg: 7 }} sx={{ display: "flex" }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.2, sm: 2.5 },
              borderRadius: "20px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E2E8F0",
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 800, color: "#0F172A", fontSize: { xs: "18px", sm: "20px" }, letterSpacing: "-0.3px" }}>
                  Quick Actions
                </Typography>
                <Typography sx={{ color: "#475569", fontSize: "13px", mt: 0.25 }}>
                  Instant access to high-velocity financial services
                </Typography>
              </Box>
              <Chip
                label="6 Services Active"
                size="small"
                sx={{
                  bgcolor: "#FFF8DC",
                  color: "#B45309",
                  fontWeight: 700,
                  fontSize: "12px",
                  border: "1px solid #FDE68A",
                  height: 24,
                }}
              />
            </Box>

            <Grid container spacing={1.5} sx={{ flexGrow: 1 }}>
              {QUICK_SERVICES.map((s) => (
                <Grid size={{ xs: 6, sm: 4 }} key={s.id} sx={{ display: "flex" }}>
                  <Box
                    onClick={() => {
                      if (!isApproved && s.requiresApproval) {
                        setDashboardLockedModal({ label: s.title });
                        return;
                      }
                      router.push(s.route);
                    }}
                    sx={{
                      width: "100%",
                      p: { xs: 1.75, sm: 2 },
                      borderRadius: "16px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: { xs: 104, sm: 112 },
                      "&:hover": {
                        borderColor: "#EDC11E",
                        transform: "translateY(-3px)",
                        boxShadow: "0 8px 20px rgba(162, 10, 58, 0.08)",
                        backgroundColor: "#FAF8F9",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: s.iconBg,
                          color: s.iconColor,
                        }}
                      >
                        {s.icon}
                      </Box>
                      <ArrowForwardIcon sx={{ fontSize: 18, color: "#64748B" }} />
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      <Typography sx={{ fontWeight: 800, color: "#0F172A", fontSize: "15px" }}>
                        {s.title}
                      </Typography>
                      <Typography sx={{ color: "#475569", fontSize: "13px", mt: 0.2, fontWeight: 500, lineHeight: 1.35 }}>
                        {s.subtitle}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* SECTION D: TODAY'S BUSINESS (4 ESSENTIAL KPI CARDS) */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 800, color: "#0F172A", fontSize: { xs: "18px", sm: "20px" }, letterSpacing: "-0.3px" }}>
              Today's Business
            </Typography>
            <Typography sx={{ color: "#475569", fontSize: "13px", mt: 0.25 }}>
              Real-time business summary for {new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2.5}>
          {/* 1. TOTAL TRANSACTIONS */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.2, md: 2.5 },
                borderRadius: "18px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                position: "relative",
                overflow: "hidden",
                height: "100%",
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.2s ease",
                "&:hover": { borderColor: "#A20A3A", boxShadow: "0 6px 18px rgba(162, 10, 58, 0.06)" }
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#FFF0F4",
                    color: "#A20A3A",
                  }}
                >
                  <ReceiptLongIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ color: "#475569", fontSize: "14px", fontWeight: 700 }}>
                    Total Transactions
                  </Typography>
                  <Typography sx={{ color: "#64748B", fontSize: "12px" }}>
                    Completed & Queued
                  </Typography>
                </Box>
              </Box>
              {loading && !hasLoaded ? (
                <Skeleton variant="text" width={90} height={48} />
              ) : (
                <Typography variant="h3" sx={{ fontWeight: 900, color: "#0F172A", fontSize: { xs: "28px", sm: "30px", md: "32px" }, letterSpacing: "-0.5px", mt: 0.5, zIndex: 1 }}>
                  {totTxns}
                </Typography>
              )}
              <DualCurveSwoosh />
            </Paper>
          </Grid>

          {/* 2. TOTAL TRANSACTION AMOUNT */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.2, md: 2.5 },
                borderRadius: "18px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                position: "relative",
                overflow: "hidden",
                height: "100%",
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.2s ease",
                "&:hover": { borderColor: "#EDC11E", boxShadow: "0 6px 18px rgba(237, 193, 30, 0.12)" }
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#FFF8DC",
                    color: "#B45309",
                  }}
                >
                  <TrendingUpIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ color: "#475569", fontSize: "14px", fontWeight: 700 }}>
                    Transaction Amount
                  </Typography>
                  <Typography sx={{ color: "#64748B", fontSize: "12px" }}>
                    Gross Throughput Volume
                  </Typography>
                </Box>
              </Box>
              {loading && !hasLoaded ? (
                <Skeleton variant="text" width={130} height={48} />
              ) : (
                <Typography variant="h3" sx={{ fontWeight: 900, color: "#0F172A", fontSize: { xs: "28px", sm: "30px", md: "32px" }, letterSpacing: "-0.5px", mt: 0.5, zIndex: 1 }}>
                  ₹{formatAmount(finKpis?.todays_transfer ?? headerWallet?.todays_debit)}
                </Typography>
              )}
              <DualCurveSwoosh />
            </Paper>
          </Grid>

          {/* 3. COMMISSION */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.2, md: 2.5 },
                borderRadius: "18px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                position: "relative",
                overflow: "hidden",
                height: "100%",
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.2s ease",
                "&:hover": { borderColor: "#A20A3A", boxShadow: "0 6px 18px rgba(162, 10, 58, 0.06)" }
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#FFF0F4",
                    color: "#A20A3A",
                  }}
                >
                  <PercentIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ color: "#475569", fontSize: "14px", fontWeight: 700 }}>
                    Commission
                  </Typography>
                  <Typography sx={{ color: "#64748B", fontSize: "12px" }}>
                    Instant Net Earnings
                  </Typography>
                </Box>
              </Box>
              {loading && !hasLoaded ? (
                <Skeleton variant="text" width={110} height={48} />
              ) : (
                <Typography variant="h3" sx={{ fontWeight: 900, color: "#16A34A", fontSize: { xs: "28px", sm: "30px", md: "32px" }, letterSpacing: "-0.5px", mt: 0.5, zIndex: 1 }}>
                  +₹{formatAmount(headerWallet?.todays_commission ?? finKpis?.todays_commission)}
                </Typography>
              )}
              <DualCurveSwoosh />
            </Paper>
          </Grid>

          {/* 4. PENDING SETTLEMENT */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.2, md: 2.5 },
                borderRadius: "18px",
                backgroundColor: "#FFFFFF",
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                position: "relative",
                overflow: "hidden",
                height: "100%",
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.2s ease",
                "&:hover": { borderColor: "#EDC11E", boxShadow: "0 6px 18px rgba(237, 193, 30, 0.12)" }
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#FFF8DC",
                    color: "#B45309",
                  }}
                >
                  <AccountBalanceIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ color: "#475569", fontSize: "14px", fontWeight: 700 }}>
                    Pending Settlement
                  </Typography>
                  <Typography sx={{ color: "#64748B", fontSize: "12px" }}>
                    Awaiting Bank Payout
                  </Typography>
                </Box>
              </Box>
              {loading && !hasLoaded ? (
                <Skeleton variant="text" width={120} height={48} />
              ) : (
                <Typography variant="h3" sx={{ fontWeight: 900, color: "#0F172A", fontSize: { xs: "28px", sm: "30px", md: "32px" }, letterSpacing: "-0.5px", mt: 0.5, zIndex: 1 }}>
                  ₹{formatAmount(headerWallet?.settlement_pending_amount ?? finKpis?.settlement_pending_amount)}
                </Typography>
              )}
              <DualCurveSwoosh />
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* SECTION E: RECENT TRANSACTIONS (LATEST 5 RECORDS) */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.2, sm: 2.5 },
          mb: 3,
          borderRadius: "20px",
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography variant="h2" sx={{ fontWeight: 800, color: "#0F172A", fontSize: { xs: "18px", sm: "20px" }, letterSpacing: "-0.3px" }}>
              Recent Transactions
            </Typography>
            <Typography sx={{ color: "#475569", fontSize: "13px", mt: 0.25 }}>
              Latest 5 records from your live business ledger
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            onClick={() => router.push("/retailer/reports/transactions")}
            sx={{
              borderColor: "#E2E8F0",
              color: "#A20A3A",
              fontWeight: 700,
              fontSize: "13px",
              borderRadius: "9999px",
              px: 2.2,
              py: 0.7,
              textTransform: "none",
              "&:hover": {
                borderColor: "#A20A3A",
                backgroundColor: "#FFF0F4",
              },
            }}
          >
            View All
          </Button>
        </Box>

        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    backgroundColor: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "12px",
                    py: 1.6,
                    letterSpacing: "0.3px",
                    textTransform: "uppercase",
                    borderBottom: "1px solid #E2E8F0",
                  },
                }}
              >
                <TableCell sx={{ width: 60 }}>#</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && !hasLoaded ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton width={20} /></TableCell>
                    <TableCell><Skeleton width={90} /></TableCell>
                    <TableCell><Skeleton width={120} /></TableCell>
                    <TableCell align="right"><Skeleton width={80} /></TableCell>
                    <TableCell align="center"><Skeleton width={70} /></TableCell>
                  </TableRow>
                ))
              ) : liveFeed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: "#64748B", fontSize: "14px" }}>
                    No transactions recorded today. Use Quick Actions above to begin transacting.
                  </TableCell>
                </TableRow>
              ) : (
                liveFeed.slice(0, 5).map((tx, idx) => (
                  <TableRow
                    key={tx.transaction_id || idx}
                    sx={{
                      "&:hover": { backgroundColor: "#F8FAFC" },
                      "& td": { borderBottom: "1px solid #F1F5F9", py: 1.6 },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, color: "#64748B", fontSize: "13px" }}>
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700, color: "#0F172A", fontSize: "14px" }}>
                        {tx.mode || "DMT / IMPS"}
                      </Typography>
                      <Typography sx={{ color: "#64748B", fontSize: "12px" }}>
                        {tx.transaction_number || tx.vendor_ref || "--"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: "#334155", fontSize: "13px", fontWeight: 500 }}>
                      {formatDateTime(tx.initiated_at)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "15px" }}>
                      ₹{formatAmount(tx.amount)}
                    </TableCell>
                    <TableCell align="center">
                      {getStatusChip(tx.status)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ADDITIONAL SECTIONS: INTERACTIVE ANALYTICS & BUSINESS INSIGHTS */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: "20px", backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: "#0F172A", fontSize: { xs: "18px", sm: "20px" }, letterSpacing: "-0.3px" }}>
                Interactive Analytics
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {["1D", "7D", "30D"].map((tf) => (
                  <Chip
                    key={tf}
                    label={tf}
                    size="small"
                    onClick={() => setTimeframe(tf)}
                    sx={{
                      backgroundColor: timeframe === tf ? "#A20A3A" : "#F8FAFC",
                      color: timeframe === tf ? "#FFFFFF" : "#475569",
                      fontWeight: 700,
                      fontSize: "12px",
                      px: 0.5,
                      cursor: "pointer",
                      border: timeframe === tf ? "1px solid #A20A3A" : "1px solid #E2E8F0"
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Tabs
              value={chartTab}
              onChange={(_, v) => setChartTab(v)}
              sx={{
                mb: 2,
                minHeight: 36,
                "& .MuiTab-root": {
                  minHeight: 36,
                  py: 0.5,
                  px: 2,
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "none",
                  color: "#475569",
                  "&.Mui-selected": { color: "#A20A3A" }
                },
                "& .MuiTabs-indicator": { backgroundColor: "#A20A3A" }
              }}
            >
              <Tab label="Transaction Volume" />
              <Tab label="Commission Earnings" />
              <Tab label="Settlements" />
            </Tabs>

            <Box sx={{ height: 260, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartTab === 0 ? (
                  <AreaChart data={charts.transaction_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#A20A3A" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#A20A3A" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", color: "#0F172A", fontSize: "12px" }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#A20A3A" strokeWidth={2.5} fillOpacity={1} fill="url(#txGradient)" />
                  </AreaChart>
                ) : chartTab === 1 ? (
                  <BarChart data={charts.commission_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", color: "#0F172A", fontSize: "12px" }}
                    />
                    <Bar dataKey="commission" fill="#EDC11E" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={charts.settlement_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="settleGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EDC11E" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EDC11E" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: "10px", color: "#0F172A", fontSize: "12px" }}
                    />
                    <Area type="monotone" dataKey="settled" stroke="#EDC11E" strokeWidth={2.5} fillOpacity={1} fill="url(#settleGradient)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: "20px", backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0", height: "100%" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: "#0F172A", fontSize: { xs: "18px", sm: "20px" }, letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: 1 }}>
                <WarningIcon sx={{ fontSize: 20, color: "#EDC11E" }} />
                Business Alerts
              </Typography>
              <Chip label={`${alerts.length} Active`} size="small" sx={{ bgcolor: "#FFF0F4", color: "#A20A3A", fontWeight: 700, fontSize: "12px", border: "1px solid #FCD3DE", height: 24 }} />
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 290, overflowY: "auto", pr: 0.5 }}>
              {alerts.length === 0 ? (
                <Box sx={{ p: 3, textAlign: "center", bgcolor: "#F8FAFC", borderRadius: "12px", border: "1px solid #E2E8F0" }}>
                  <Typography variant="body2" sx={{ color: "#475569", fontSize: "13px" }}>
                    All financial pipes and switches are operating nominally. Zero alerts.
                  </Typography>
                </Box>
              ) : (
                alerts.map((alt) => (
                  <Box
                    key={alt.id}
                    sx={{
                      p: 1.75,
                      borderRadius: "12px",
                      bgcolor: alt.priority === "HIGH" ? "#FFF0F4" : "#F8FAFC",
                      border: alt.priority === "HIGH" ? "1px solid #FCD3DE" : "1px solid #E2E8F0",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: "13px", color: alt.priority === "HIGH" ? "#A20A3A" : "#0F172A" }}>
                        {alt.title}
                      </Typography>
                      <Typography sx={{ fontSize: "11px", color: "#64748B" }}>
                        {alt.timestamp ? new Date(alt.timestamp).toLocaleTimeString("en-IN", { timeStyle: "short" }) : ""}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "12px", color: "#475569", lineHeight: 1.45 }}>
                      {alt.message}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* DASHBOARD LOCKED FEATURE MODAL */}
      <Dialog
        open={Boolean(dashboardLockedModal)}
        onClose={() => setDashboardLockedModal(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "24px",
              bgcolor: "#FFFFFF",
              color: "#0F172A",
              p: 3.5,
              maxWidth: 440,
              width: "100%",
              border: "1px solid #E2E8F0",
              boxShadow: "0 24px 48px rgba(0,0,0,0.15)",
            },
          },
        }}
      >
        <Box sx={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Box sx={{ width: 56, height: 56, p: 1.5, borderRadius: "50%", bgcolor: "#FFF0F4", border: "2px solid #FCD3DE", color: "#A20A3A", mb: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LockIcon sx={{ fontSize: 28 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", textAlign: "center" }}>
            {dashboardLockedModal?.label || "Action"} Restricted
          </Typography>
          <Typography variant="body2" sx={{ color: "#475569", mt: 1.5, textAlign: "center", fontSize: "13px", lineHeight: 1.5 }}>
            Your retailer account is currently <strong>PENDING ADMIN APPROVAL</strong>. Financial services, wallet top-ups, and transaction actions are restricted until Admin approves your application.
          </Typography>

          <Box sx={{ width: "100%", mt: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Button
              onClick={() => {
                setDashboardLockedModal(null);
                openContactSupportModal("Account Approval Assistance");
              }}
              variant="contained"
              fullWidth
              sx={{
                bgcolor: "#A20A3A",
                color: "#FFFFFF",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "9999px",
                py: 1,
                "&:hover": { bgcolor: "#85072F" }
              }}
            >
              Contact Support
            </Button>
            <Button
              onClick={() => setDashboardLockedModal(null)}
              variant="text"
              fullWidth
              sx={{ color: "#475569", fontWeight: 700, textTransform: "none", fontSize: "13px" }}
            >
              Dismiss
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default RetailerDashboardView;
