"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Tooltip,
  Tab,
  Tabs,
  Stack,
  ButtonBase,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import HistoryIcon from "@mui/icons-material/History";
import LockIcon from "@mui/icons-material/Lock";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import FingerprintRoundedIcon from "@mui/icons-material/FingerprintRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ElectricBoltRoundedIcon from "@mui/icons-material/ElectricBoltRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

import { useWalletSync } from "@/context/WalletSyncProvider";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { useRetailerApprovalGuard } from "@/hooks/useRetailerApprovalGuard";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";
import { DashboardAnnouncementModal } from "@/components/common/DashboardAnnouncementModal";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface HeaderWalletData {
  greeting?: string;
  retailer_name?: string;
  owner_name?: string;
  company_name?: string;
  retailer_code?: string;
  wallet_balance?: number;
  available_balance?: number;
  blocked_balance?: number;
  todays_debit?: number;
  todays_credit?: number;
  todays_commission?: number;
  todays_gst?: number;
  todays_tds?: number;
  settlement_pending_amount?: number;
  unread_notifications_count?: number;
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

const formatAmount = (val?: number | null): string => {
  if (val === undefined || val === null || isNaN(Number(val))) return "0.00";
  return Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const RetailerDashboardView: React.FC = () => {
  const router = useRouter();
  const { walletData: headerWallet } = useWalletSync();
  const { isApproved } = useRetailerApprovalGuard();
  const { wallet, outlet, syncBalance, isSyncing } = useRetailerStore();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // API State Data
  const [finKpis, setFinKpis] = useState<FinancialKPIData | null>(null);
  const [opsKpis, setOpsKpis] = useState<OperationsKPIData | null>(null);
  const [charts, setCharts] = useState<{
    transaction_trend: ChartItem[];
    commission_trend: ChartItem[];
    wallet_trend: ChartItem[];
    settlement_trend: ChartItem[];
  }>({
    transaction_trend: [],
    commission_trend: [],
    wallet_trend: [],
    settlement_trend: [],
  });
  const [liveFeed, setLiveFeed] = useState<LiveFeedItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Active Chart Tab & Timeframe
  const [chartTab, setChartTab] = useState<number>(0);
  const [timeframe, setTimeframe] = useState<string>("7D");

  const copyRetailerId = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setHasLoaded(true);
    try {
      const baseUrl = `${getApiBaseUrl()}/payout/dashboard/retailer`;
      let userRefId: any = null;
      let userTypeRefId: any = 2;
      if (typeof window !== "undefined") {
        try {
          const userStr =
            localStorage.getItem("user_info") ||
            localStorage.getItem("user") ||
            localStorage.getItem("auth_user") ||
            localStorage.getItem("pay2pay_user_data");
          if (userStr) {
            const u = JSON.parse(userStr);
            userRefId = u.user_ref_id || u.retailer_ref_id || u.ref_id || null;
            userTypeRefId = u.user_type_ref_id || 2;
          }
        } catch {}
      }

      const qParams = new URLSearchParams();
      qParams.set("user_type_ref_id", String(userTypeRefId || 2));
      if (userRefId) {
        qParams.set("user_ref_id", String(userRefId));
      }
      const qPrefix = `?${qParams.toString()}`;
      const qAnd = `&${qParams.toString()}`;

      const [finRes, opsRes, chRes, feedRes, altRes, actRes] = await Promise.all([
        fetch(`${baseUrl}/financial-kpis${qPrefix}`),
        fetch(`${baseUrl}/operations-kpis${qPrefix}`),
        fetch(`${baseUrl}/charts?timeframe=${timeframe}${qAnd}`),
        fetch(`${baseUrl}/live-feed${qPrefix}`),
        fetch(`${baseUrl}/business-alerts${qPrefix}`),
        fetch(`${baseUrl}/recent-activity${qPrefix}`),
      ]);

      if (finRes.ok) setFinKpis(await finRes.json());
      if (opsRes.ok) setOpsKpis(await opsRes.json());
      if (chRes.ok) setCharts(await chRes.json());
      if (feedRes.ok) setLiveFeed((await feedRes.json()).items || []);
      if (altRes.ok) setAlerts((await altRes.json()).alerts || []);
      if (actRes.ok) setActivities((await actRes.json()).activities || []);
    } catch (e) {
      console.error("Failed to load enterprise dashboard data", e);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    if (hasLoaded) {
      fetchDashboardData();
    }
  }, [timeframe, hasLoaded, fetchDashboardData]);

  // Status Chip helper
  const getStatusChip = (st: string) => {
    let color = "#38BDF8";
    let bg = "rgba(56, 189, 248, 0.15)";
    const u = (st || "").toUpperCase();

    if (u === "SUCCESS") {
      color = "#4ADE80";
      bg = "rgba(34, 197, 94, 0.15)";
    } else if (u === "PENDING" || u === "PROCESSING" || u === "INITIATED") {
      color = "#FBBF24";
      bg = "rgba(245, 158, 11, 0.15)";
    } else if (u === "FAILED") {
      color = "#F87171";
      bg = "rgba(239, 68, 68, 0.15)";
    } else if (u === "REVERSED") {
      color = "#C084FC";
      bg = "rgba(168, 85, 247, 0.15)";
    }

    return (
      <span
        style={{
          backgroundColor: bg,
          color: color,
          fontWeight: 800,
          fontSize: "11px",
          padding: "2px 8px",
          borderRadius: "6px",
          border: `1px solid ${color}40`,
          display: "inline-block",
        }}
      >
        {u}
      </span>
    );
  };

  const retailerCode =
    headerWallet?.retailer_code ||
    outlet.code ||
    (typeof window !== "undefined" && localStorage.getItem("p2p_active_retailer_id")) ||
    "P2P-R404667";

  const retailerName =
    headerWallet?.retailer_name ||
    headerWallet?.owner_name ||
    outlet.ownerName ||
    outlet.name ||
    "Retailer Partner";

  return (
    <Box
      sx={{
        backgroundColor: "#080B11",
        color: "#F8FAFC",
        minHeight: "100vh",
        pb: { xs: 14, md: 6 },
        px: { xs: 1.5, sm: 2.5, md: 3 },
        pt: { xs: 1.5, sm: 2 },
        maxWidth: "100vw",
        overflowX: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* ── 1. RETAILER PROFILE GLASSMORPHISM HERO CARD ─────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 2.5,
          borderRadius: "20px",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(11, 14, 20, 0.95) 100%)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle Gold Ambient Glow in background */}
        <Box
          sx={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0) 70%)",
            pointerEvents: "none",
          }}
        />

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1.5,
          }}
        >
          {/* Left: Branding + Retailer Name + ID */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: "14px",
                background: "linear-gradient(135deg, #FCD34D 0%, #F59E0B 50%, #D97706 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.4)",
                flexShrink: 0,
              }}
            >
              <StorefrontRoundedIcon sx={{ fontSize: 24, color: "#0B0E14" }} />
            </Box>

            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography
                  variant="h1"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: "18px", sm: "20px" },
                    background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #FBBF24 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "-0.4px",
                    lineHeight: 1.1,
                  }}
                >
                  Pay2Pay
                </Typography>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>•</span>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: "#F8FAFC", fontSize: "14px" }}
                >
                  {retailerName}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", fontWeight: 600 }}>
                  Retailer Partner:
                </Typography>
                <ButtonBase
                  onClick={() => copyRetailerId(retailerCode)}
                  sx={{
                    px: 1,
                    py: 0.2,
                    borderRadius: "6px",
                    bgcolor: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Typography
                    sx={{
                      color: "#FDE68A",
                      fontFamily: "monospace",
                      fontWeight: 800,
                      fontSize: "11px",
                    }}
                  >
                    {retailerCode}
                  </Typography>
                  {copiedId ? (
                    <CheckCircleRoundedIcon sx={{ fontSize: 12, color: "#4ADE80" }} />
                  ) : (
                    <ContentCopyIcon sx={{ fontSize: 11, color: "#FBBF24" }} />
                  )}
                </ButtonBase>
              </Box>
            </Box>
          </Box>

          {/* Right: Live Badge + Quick Refresh */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, width: { xs: "100%", sm: "auto" }, justifyContent: "space-between" }}>
            <Box
              sx={{
                px: 1.5,
                py: 0.4,
                borderRadius: "20px",
                bgcolor: "rgba(34, 197, 94, 0.12)",
                border: "1px solid rgba(34, 197, 94, 0.35)",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  bgcolor: "#22C55E",
                  boxShadow: "0 0 8px #22C55E",
                }}
              />
              <Typography sx={{ color: "#4ADE80", fontWeight: 800, fontSize: "11px", letterSpacing: "0.5px" }}>
                Live
              </Typography>
            </Box>

            <Tooltip title="Refresh Dashboard & Metrics">
              <IconButton
                onClick={fetchDashboardData}
                disabled={loading}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  bgcolor: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#FBBF24",
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: "rgba(245, 158, 11, 0.2)",
                  },
                }}
              >
                <RefreshIcon sx={{ fontSize: 18, animation: loading ? "spin 1s linear infinite" : "none" }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* ── 2. WALLET OVERVIEW SECTION WITH GOLD ACCENTS ───────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          borderRadius: "22px",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(8, 11, 17, 0.9) 100%)",
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(245, 158, 11, 0.25)",
          boxShadow: "0 16px 36px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header: Title + Action Buttons */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "center" },
            gap: 1.5,
            mb: 2.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                bgcolor: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AccountBalanceWalletRoundedIcon sx={{ fontSize: 20, color: "#F59E0B" }} />
            </Box>
            <Box>
              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  fontSize: "17px",
                  background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.2px",
                }}
              >
                Wallet
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px", display: "block" }}>
                Balance &amp; today&apos;s movement
              </Typography>
            </Box>
          </Box>

          {/* 3 Prominent Wallet Actions */}
          <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", sm: "auto" }, flexWrap: "wrap" }}>
            {/* Topup Request (Primary Gold-Yellow Gradient Button) */}
            <Button
              variant="contained"
              size="small"
              startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
              onClick={() => router.push("/retailer/topup-request")}
              sx={{
                flex: { xs: "1 1 auto", sm: "none" },
                py: 0.9,
                px: 2,
                fontSize: "12.5px",
                fontWeight: 900,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #FCD34D 0%, #F59E0B 50%, #D97706 100%)",
                color: "#0B0E14",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.35)",
                textTransform: "none",
                "&:hover": {
                  background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 50%, #B45309 100%)",
                  boxShadow: "0 6px 18px rgba(245, 158, 11, 0.5)",
                },
                "&:active": { transform: "scale(0.96)" },
              }}
            >
              Topup Request
            </Button>

            {/* + Wallet Top-up (Sleek Dark Glass with Gold Border) */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddCircleIcon sx={{ fontSize: 16 }} />}
              onClick={() => router.push("/retailer/wallet")}
              sx={{
                flex: { xs: "1 1 auto", sm: "none" },
                py: 0.9,
                px: 1.75,
                fontSize: "12.5px",
                fontWeight: 700,
                borderRadius: "10px",
                borderColor: "rgba(245, 158, 11, 0.4)",
                color: "#FDE68A",
                bgcolor: "rgba(245, 158, 11, 0.08)",
                textTransform: "none",
                "&:hover": {
                  borderColor: "rgba(245, 158, 11, 0.7)",
                  bgcolor: "rgba(245, 158, 11, 0.16)",
                },
              }}
            >
              + Wallet Top-up
            </Button>

            {/* Refresh */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 16, animation: isSyncing ? "spin 1s linear infinite" : "none" }} />}
              onClick={syncBalance}
              disabled={isSyncing}
              sx={{
                py: 0.9,
                px: 1.5,
                fontSize: "12.5px",
                fontWeight: 700,
                borderRadius: "10px",
                borderColor: "rgba(255, 255, 255, 0.15)",
                color: "#CBD5E1",
                bgcolor: "rgba(255, 255, 255, 0.04)",
                textTransform: "none",
                "&:hover": {
                  borderColor: "rgba(245, 158, 11, 0.4)",
                  color: "#FDE68A",
                },
              }}
            >
              {isSyncing ? "Syncing..." : "Refresh"}
            </Button>
          </Stack>
        </Box>

        {/* ── WALLET SUMMARY CARDS GRID (AVAILABLE, RESERVED, DEBIT, REVERSAL, COMMISSION, GST) ── */}
        <Grid container spacing={1.5}>
          {/* 1. AVAILABLE (Emerald / Green Accent) */}
          <Grid item xs={6} sm={4} md={2}>
            <Box
              sx={{
                p: 1.75,
                borderRadius: "16px",
                bgcolor: "rgba(34, 197, 94, 0.08)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 4px 14px rgba(34, 197, 94, 0.1)",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ color: "#86EFAC", fontSize: "10px", fontWeight: 800, letterSpacing: "0.5px" }}>
                  AVAILABLE
                </Typography>
                <IconButton
                  size="small"
                  onClick={syncBalance}
                  disabled={isSyncing}
                  sx={{ p: 0.2, color: "#4ADE80" }}
                >
                  <RefreshIcon sx={{ fontSize: 13, animation: isSyncing ? "spin 1s linear infinite" : "none" }} />
                </IconButton>
              </Box>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: "#4ADE80",
                  fontSize: { xs: "16px", sm: "18px" },
                  mt: 0.5,
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                ₹{formatAmount(headerWallet?.available_balance ?? wallet.availableBalance ?? wallet.mainBalance)}
              </Typography>
            </Box>
          </Grid>

          {/* 2. RESERVED (Amber / Yellow Accent) */}
          <Grid item xs={6} sm={4} md={2}>
            <Box
              sx={{
                p: 1.75,
                borderRadius: "16px",
                bgcolor: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.1)",
              }}
            >
              <Typography sx={{ color: "#FDE68A", fontSize: "10px", fontWeight: 800, letterSpacing: "0.5px" }}>
                RESERVED
              </Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: "#FBBF24",
                  fontSize: { xs: "16px", sm: "18px" },
                  mt: 0.5,
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                ₹{formatAmount(headerWallet?.blocked_balance)}
              </Typography>
            </Box>
          </Grid>

          {/* 3. DEBIT (Rose / Red Accent) */}
          <Grid item xs={6} sm={4} md={2}>
            <Box
              sx={{
                p: 1.75,
                borderRadius: "16px",
                bgcolor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.1)",
              }}
            >
              <Typography sx={{ color: "#FCA5A5", fontSize: "10px", fontWeight: 800, letterSpacing: "0.5px" }}>
                DEBIT
              </Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: "#F87171",
                  fontSize: { xs: "16px", sm: "18px" },
                  mt: 0.5,
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                -₹{formatAmount(headerWallet?.todays_debit)}
              </Typography>
            </Box>
          </Grid>

          {/* 4. REVERSAL (Sky / Blue Accent) */}
          <Grid item xs={6} sm={4} md={2}>
            <Box
              sx={{
                p: 1.75,
                borderRadius: "16px",
                bgcolor: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 4px 14px rgba(56, 189, 248, 0.1)",
              }}
            >
              <Typography sx={{ color: "#BAE6FD", fontSize: "10px", fontWeight: 800, letterSpacing: "0.5px" }}>
                REVERSAL
              </Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: "#38BDF8",
                  fontSize: { xs: "16px", sm: "18px" },
                  mt: 0.5,
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                +₹{formatAmount(headerWallet?.todays_credit)}
              </Typography>
            </Box>
          </Grid>

          {/* 5. COMMISSION (Purple / Violet Accent) */}
          <Grid item xs={6} sm={4} md={2}>
            <Box
              sx={{
                p: 1.75,
                borderRadius: "16px",
                bgcolor: "rgba(168, 85, 247, 0.08)",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 4px 14px rgba(168, 85, 247, 0.1)",
              }}
            >
              <Typography sx={{ color: "#E9D5FF", fontSize: "10px", fontWeight: 800, letterSpacing: "0.5px" }}>
                COMMISSION
              </Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: "#C084FC",
                  fontSize: { xs: "16px", sm: "18px" },
                  mt: 0.5,
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                +₹{formatAmount(headerWallet?.todays_commission)}
              </Typography>
            </Box>
          </Grid>

          {/* 6. GST (Cool Slate Accent) */}
          <Grid item xs={6} sm={4} md={2}>
            <Box
              sx={{
                p: 1.75,
                borderRadius: "16px",
                bgcolor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Typography sx={{ color: "#94A3B8", fontSize: "10px", fontWeight: 800, letterSpacing: "0.5px" }}>
                GST
              </Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: "#E2E8F0",
                  fontSize: { xs: "16px", sm: "18px" },
                  mt: 0.5,
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                ₹{formatAmount(headerWallet?.todays_gst)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* ── 3. FIRST-CLASS REPORT SERVICES & QUICK LAUNCHERS ───────────────── */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              fontSize: "15px",
              color: "#FFFFFF",
              letterSpacing: "0.2px",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <AutoAwesomeRoundedIcon sx={{ fontSize: 17, color: "#F59E0B" }} />
            Quick Service Actions
          </Typography>
          <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "11px" }}>
            Instant Access
          </Typography>
        </Box>

        <Grid container spacing={1.5}>
          {[
            {
              id: "payout",
              title: "Payout",
              desc: "Initiate instant payout",
              path: "/retailer/dmt",
              icon: SendRoundedIcon,
              accent: "#F59E0B",
            },
            {
              id: "po-report",
              title: "PO Report",
              desc: "Purchase order report",
              path: "/retailer/pos/settlement-report",
              icon: AssessmentRoundedIcon,
              accent: "#38BDF8",
            },
            {
              id: "txn-report",
              title: "Transaction Report",
              desc: "View transfer statements",
              path: "/retailer/dmt/reports",
              icon: ReceiptLongRoundedIcon,
              accent: "#4ADE80",
            },
            {
              id: "passbook",
              title: "Passbook Ledger",
              desc: "Wallet debit/credit flow",
              path: "/retailer/dmt/ledger",
              icon: HistoryIcon,
              accent: "#A855F7",
            },
          ].map((srv) => {
            const Icon = srv.icon;
            return (
              <Grid item xs={6} sm={3} key={srv.id}>
                <Paper
                  onClick={() => router.push(srv.path)}
                  elevation={0}
                  sx={{
                    p: 1.75,
                    borderRadius: "18px",
                    bgcolor: "rgba(15, 23, 42, 0.7)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    cursor: "pointer",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      bgcolor: "rgba(30, 41, 59, 0.85)",
                      borderColor: srv.accent,
                      transform: "translateY(-2px)",
                      boxShadow: `0 6px 20px ${srv.accent}33`,
                    },
                    "&:active": {
                      transform: "scale(0.96)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "12px",
                      bgcolor: `${srv.accent}20`,
                      border: `1px solid ${srv.accent}50`,
                      color: srv.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 1,
                    }}
                  >
                    <Icon sx={{ fontSize: 22 }} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px", lineHeight: 1.2 }}>
                    {srv.title}
                  </Typography>
                  <Typography sx={{ color: "#94A3B8", fontSize: "10.5px", mt: 0.3, lineHeight: 1.2 }}>
                    {srv.desc}
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* ── 4. FINANCIAL ACCOUNTING KPIS ───────────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px", mb: 1.5, letterSpacing: "0.2px" }}>
          Financial Accounting Movement
        </Typography>

        <Grid container spacing={1.5}>
          {[
            { label: "TODAY'S TRANSFER", value: `₹${formatAmount(finKpis?.todays_transfer)}`, color: "#38BDF8", sub: "Gross Beneficiary Credit" },
            { label: "TODAY'S WALLET DEBIT", value: `₹${formatAmount(finKpis?.todays_wallet_debit)}`, color: "#F87171", sub: "Amount + Fee + GST" },
            { label: "TODAY'S COMMISSION", value: `₹${formatAmount(finKpis?.todays_commission)}`, color: "#4ADE80", sub: "Instant Net Revenue" },
            { label: "TODAY'S GST", value: `₹${formatAmount(finKpis?.todays_gst)}`, color: "#FBBF24", sub: "18% GST Deduction" },
            { label: "TODAY'S TDS", value: `₹${formatAmount(finKpis?.todays_tds)}`, color: "#C084FC", sub: "Sec 194O Tax Withheld" },
            { label: "SETTLEMENT PENDING", value: `₹${formatAmount(finKpis?.settlement_pending_amount)}`, color: "#FBBF24", sub: "Awaiting Bank Settlement" },
            { label: "SETTLEMENT SETTLED", value: `₹${formatAmount(finKpis?.settlement_completed_amount)}`, color: "#4ADE80", sub: "Credited to Bank Account" },
            { label: "WALLET BALANCE", value: `₹${formatAmount(finKpis?.wallet_balance ?? wallet.mainBalance)}`, color: "#F59E0B", sub: "Live Account Ledger" },
          ].map((k) => (
            <Grid item xs={6} sm={4} md={3} key={k.label}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.75,
                  borderRadius: "16px",
                  backgroundColor: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderLeft: `4px solid ${k.color}`,
                }}
              >
                <Typography sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "10px", letterSpacing: "0.5px" }}>
                  {k.label}
                </Typography>
                <Typography sx={{ fontWeight: 800, color: "#FFFFFF", mt: 0.4, fontSize: { xs: "15px", sm: "17px" }, fontFamily: "var(--font-geist-mono), monospace" }}>
                  {k.value}
                </Typography>
                <Typography sx={{ color: "#64748B", fontSize: "10px", mt: 0.2, display: "block" }}>
                  {k.sub}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── 5. OPERATIONS & VELOCITY METRICS ───────────────────────────────── */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px", mb: 1.5, letterSpacing: "0.2px" }}>
          Operations &amp; Processing Velocity
        </Typography>

        <Grid container spacing={1.5}>
          {[
            { label: "PENDING", value: opsKpis ? opsKpis.pending_transactions : 0, color: "#FBBF24", sub: "Queued" },
            { label: "PROCESSING", value: opsKpis ? opsKpis.processing_transactions : 0, color: "#38BDF8", sub: "Active Handshake" },
            { label: "SUCCESSFUL", value: opsKpis ? opsKpis.successful_transactions : 0, color: "#4ADE80", sub: "Confirmed" },
            { label: "FAILED", value: opsKpis ? opsKpis.failed_transactions : 0, color: "#F87171", sub: "Rejected" },
            { label: "REVERSED", value: opsKpis ? opsKpis.reversed_transactions : 0, color: "#C084FC", sub: "Auto-Refunded" },
            { label: "CUSTOMERS TODAY", value: opsKpis ? opsKpis.todays_customers : 0, color: "#FDE68A", sub: "Unique Senders" },
            { label: "BENEFICIARIES", value: opsKpis ? opsKpis.todays_beneficiaries : 0, color: "#F472B6", sub: "Receivers" },
            { label: "AVG SPEED", value: `${opsKpis ? opsKpis.average_processing_time_seconds : 2.4}s`, color: "#38BDF8", sub: "Latency" },
            { label: "SUCCESS RATE", value: `${opsKpis ? opsKpis.success_rate_pct : 98.6}%`, color: "#4ADE80", sub: "Benchmark" },
            { label: "SYSTEM STATE", value: opsKpis ? opsKpis.business_health : "OPTIMAL", color: "#4ADE80", sub: "Health" },
          ].map((k) => (
            <Grid item xs={6} sm={4} md={2.4} key={k.label}>
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: "14px",
                  backgroundColor: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderLeft: `3px solid ${k.color}`,
                }}
              >
                <Typography sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "10px", letterSpacing: "0.4px" }}>
                  {k.label}
                </Typography>
                <Typography sx={{ fontWeight: 800, color: "#FFFFFF", mt: 0.3, fontSize: "16px", fontFamily: "var(--font-geist-mono), monospace" }}>
                  {k.value}
                </Typography>
                <Typography sx={{ color: "#64748B", fontSize: "9.5px", mt: 0.2, display: "block" }}>
                  {k.sub}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* ── 6. INTERACTIVE ANALYTICS & SYSTEM ALERTS ──────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: "20px",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px" }}>
                Interactive Analytics
              </Typography>
              <Box sx={{ display: "flex", gap: 0.75 }}>
                {["1D", "7D", "30D"].map((tf) => (
                  <Chip
                    key={tf}
                    label={tf}
                    size="small"
                    onClick={() => setTimeframe(tf)}
                    sx={{
                      backgroundColor: timeframe === tf ? "#F59E0B" : "rgba(255,255,255,0.06)",
                      color: timeframe === tf ? "#0B0E14" : "#FFFFFF",
                      fontWeight: 800,
                      fontSize: "11px",
                      px: 0.5,
                      cursor: "pointer",
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: "rgba(255,255,255,0.08)", mb: 2 }}>
              <Tabs
                value={chartTab}
                onChange={(_, val) => setChartTab(val)}
                textColor="inherit"
                TabIndicatorProps={{ style: { backgroundColor: "#F59E0B" } }}
                sx={{
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "12px",
                    color: "#94A3B8",
                    minWidth: "auto",
                    px: 1.5,
                    "&.Mui-selected": {
                      color: "#FDE68A",
                    },
                  },
                }}
              >
                <Tab label="Volume" />
                <Tab label="Commission" />
                <Tab label="Wallet Flow" />
                <Tab label="Settlement" />
              </Tabs>
            </Box>

            <Box sx={{ height: 240, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartTab === 0 ? (
                  <AreaChart data={charts.transaction_trend}>
                    <defs>
                      <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(245,158,11,0.3)", borderRadius: 8, fontSize: "12px" }} />
                    <Area type="monotone" dataKey="amount" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#goldGradient)" />
                  </AreaChart>
                ) : chartTab === 1 ? (
                  <BarChart data={charts.commission_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(74,222,128,0.3)", borderRadius: 8, fontSize: "12px" }} />
                    <Bar dataKey="commission" fill="#4ADE80" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : chartTab === 2 ? (
                  <AreaChart data={charts.wallet_trend}>
                    <defs>
                      <linearGradient id="colorWal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(56,189,248,0.3)", borderRadius: 8, fontSize: "12px" }} />
                    <Area type="monotone" dataKey="closing_balance" stroke="#38BDF8" strokeWidth={2} fillOpacity={1} fill="url(#colorWal)" />
                  </AreaChart>
                ) : (
                  <BarChart data={charts.settlement_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#64748B" tick={{ fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(245,158,11,0.3)", borderRadius: 8, fontSize: "12px" }} />
                    <Bar dataKey="settled" fill="#4ADE80" stackId="a" />
                    <Bar dataKey="pending" fill="#FBBF24" stackId="a" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Business Alerts */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: "20px",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              height: "100%",
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px", display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <WarningIcon sx={{ fontSize: 18, color: "#FBBF24" }} /> System Alerts
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              {alerts.length === 0 ? (
                <Typography sx={{ color: "#64748B", fontSize: "12px", textAlign: "center", py: 4 }}>
                  All systems operating normally.
                </Typography>
              ) : (
                alerts.map((alt) => (
                  <Box
                    key={alt.id}
                    sx={{
                      p: 1.5,
                      borderRadius: "12px",
                      backgroundColor: alt.priority === "CRITICAL" ? "rgba(220, 38, 38, 0.12)" : "rgba(217, 119, 6, 0.12)",
                      border: `1px solid ${alt.priority === "CRITICAL" ? "rgba(248, 113, 113, 0.35)" : "rgba(251, 191, 36, 0.35)"}`,
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4, alignItems: "center" }}>
                      <Typography sx={{ fontWeight: 800, color: alt.priority === "CRITICAL" ? "#FCA5A5" : "#FDE047", fontSize: "12.5px" }}>
                        {alt.title}
                      </Typography>
                      <Chip label={alt.priority} size="small" sx={{ height: 18, fontSize: "9.5px", fontWeight: 800 }} />
                    </Box>
                    <Typography sx={{ color: "#CBD5E1", fontSize: "11.5px", lineHeight: 1.4 }}>{alt.message}</Typography>
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ── 7. LIVE TRANSACTION FEED & RECENT ACTIVITY ────────────────────── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: "20px",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px" }}>
                Live Transaction Feed
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => router.push("/retailer/dmt/reports")}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "11.5px",
                  borderColor: "rgba(245, 158, 11, 0.35)",
                  color: "#FDE68A",
                  borderRadius: "8px",
                  "&:hover": { borderColor: "#F59E0B" },
                }}
              >
                Full Report
              </Button>
            </Box>

            <TableContainer sx={{ maxHeight: 300, overflowX: "auto" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow sx={{ "& th": { backgroundColor: "#0F172A", color: "#94A3B8", fontWeight: 800, fontSize: "10.5px", py: 1.2, textTransform: "uppercase" } }}>
                    <TableCell>Time</TableCell>
                    <TableCell>Txn ID</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Debit</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {liveFeed.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ textAlign: "center", py: 3, color: "#64748B", fontSize: "12px" }}>
                        No transactions recorded today.
                      </TableCell>
                    </TableRow>
                  ) : (
                    liveFeed.map((tx) => (
                      <TableRow key={tx.transaction_id} hover sx={{ "& td": { borderColor: "rgba(255,255,255,0.06)", color: "#E2E8F0", fontSize: "12px", py: 1 } }}>
                        <TableCell sx={{ color: "#94A3B8" }}>
                          {tx.initiated_at ? new Date(tx.initiated_at).toLocaleTimeString("en-IN", { timeStyle: "short" }) : "--"}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: "#FDE68A", fontFamily: "monospace" }}>
                          {tx.transaction_number}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: "#FFFFFF", fontFamily: "monospace" }}>
                          ₹{formatAmount(tx?.amount)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: "#F87171", fontWeight: 700, fontFamily: "monospace" }}>
                          ₹{formatAmount(tx?.net_debit)}
                        </TableCell>
                        <TableCell sx={{ fontSize: "11px", color: "#CBD5E1" }}>{tx.mode}</TableCell>
                        <TableCell align="center">{getStatusChip(tx.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Activity Log */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderRadius: "20px",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              height: "100%",
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "15px", mb: 2 }}>
              Activity Log
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              {activities.length === 0 ? (
                <Typography sx={{ color: "#64748B", fontSize: "12px", textAlign: "center", py: 3 }}>
                  No recent activities recorded.
                </Typography>
              ) : (
                activities.map((act) => (
                  <Box key={act.id} sx={{ p: 1.5, borderRadius: "12px", backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Typography sx={{ fontWeight: 800, color: "#38BDF8", fontSize: "12px" }}>{act.title}</Typography>
                    <Typography sx={{ color: "#CBD5E1", fontSize: "11.5px", mt: 0.2, lineHeight: 1.3 }}>{act.desc}</Typography>
                  </Box>
                ))
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Dynamic Database & Backblaze B2 Driven Announcement Modal */}
      <DashboardAnnouncementModal audience="RETAILER" />
    </Box>
  );
};

export default RetailerDashboardView;
