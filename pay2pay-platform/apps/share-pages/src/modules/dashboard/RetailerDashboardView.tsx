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
import WarningIcon from "@mui/icons-material/Warning";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import HistoryIcon from "@mui/icons-material/History";
import LockIcon from "@mui/icons-material/Lock";
import { useWalletSync } from "@/context/WalletSyncProvider";
import { useRetailerApprovalGuard } from "@/hooks/useRetailerApprovalGuard";
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

const DEFAULT_RETAILER_ID = "f89239b5-4dbb-41a9-9ba7-0f97580c9368";
const DEFAULT_TENANT_ID = "93538c98-0b19-493c-a247-4cdb02a46c68";

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

import { useContactSupportModal } from "@/context/ContactSupportModalContext";

interface SystemHealthService {
  name: string;
  status: string;
  code: string;
  latency_ms: number;
}

export const RetailerDashboardView: React.FC = () => {
  const router = useRouter();
  const { walletData: headerWallet, refreshWallet } = useWalletSync();
  const { isApproved, setApprovalStatus } = useRetailerApprovalGuard();
  const { openContactSupportModal } = useContactSupportModal();
  const [dashboardLockedModal, setDashboardLockedModal] = useState<{ label: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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
  const [systemHealth, setSystemHealth] = useState<SystemHealthService[]>([]);

  // Active Chart Tab & Timeframe
  const [chartTab, setChartTab] = useState<number>(0);
  const [timeframe, setTimeframe] = useState<string>("7D");

  const fetchDashboardData = async () => {
    setLoading(true);
    refreshWallet();
    try {
      const baseUrl = `${getApiBaseUrl()}/payout/dashboard/retailer`;

      const [finRes, opsRes, chRes, feedRes, altRes, actRes, sysRes] = await Promise.all([
        fetch(`${baseUrl}/financial-kpis?retailer_id=${DEFAULT_RETAILER_ID}&tenant_id=${DEFAULT_TENANT_ID}`),
        fetch(`${baseUrl}/operations-kpis?retailer_id=${DEFAULT_RETAILER_ID}&tenant_id=${DEFAULT_TENANT_ID}`),
        fetch(`${baseUrl}/charts?retailer_id=${DEFAULT_RETAILER_ID}&tenant_id=${DEFAULT_TENANT_ID}&timeframe=${timeframe}`),
        fetch(`${baseUrl}/live-feed?retailer_id=${DEFAULT_RETAILER_ID}&tenant_id=${DEFAULT_TENANT_ID}`),
        fetch(`${baseUrl}/business-alerts?retailer_id=${DEFAULT_RETAILER_ID}&tenant_id=${DEFAULT_TENANT_ID}`),
        fetch(`${baseUrl}/recent-activity?retailer_id=${DEFAULT_RETAILER_ID}&tenant_id=${DEFAULT_TENANT_ID}`),
        fetch(`${baseUrl}/system-health`)
      ]);

      if (finRes.ok) setFinKpis(await finRes.json());
      if (opsRes.ok) setOpsKpis(await opsRes.json());
      if (chRes.ok) setCharts(await chRes.json());
      if (feedRes.ok) setLiveFeed((await feedRes.json()).items || []);
      if (altRes.ok) setAlerts((await altRes.json()).alerts || []);
      if (actRes.ok) setActivities((await actRes.json()).activities || []);
      if (sysRes.ok) setSystemHealth((await sysRes.json()).services || []);
    } catch (e) {
      console.error("Failed to load enterprise dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

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
        p: { xs: 2.5, md: 4 },
        fontFamily: "'Inter', 'Source Sans 3', 'IBM Plex Sans', sans-serif"
      }}
    >
      {/* ── ACCOUNT UNDER REVIEW WARNING BANNER FOR UNAPPROVED RETAILER ── */}
      {!isApproved && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 3.5,
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.20) 0%, rgba(217, 119, 6, 0.15) 100%)",
            border: "1.5px solid #F59E0B",
            boxShadow: "0 8px 24px rgba(245, 158, 11, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: "rgba(245, 158, 11, 0.25)",
                border: "2px solid #F59E0B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FBBF24",
                flexShrink: 0,
              }}
            >
              <WarningIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#FBBF24", fontSize: "17px", lineHeight: 1.2 }}>
                ⚠️ ACCOUNT UNDER REVIEW — ADMIN APPROVAL PENDING
              </Typography>
              <Typography variant="body2" sx={{ color: "#E2E8F0", fontSize: "13.5px", mt: 0.4, fontWeight: 500 }}>
                Retailer application for <strong>Mobile +91 9176669426</strong> is currently pending Admin KYC verification. All financial payment menus and transactions are restricted until approval.
              </Typography>
            </Box>
          </Box>
          <Chip
            icon={<LockIcon sx={{ "&&": { fontSize: 14, color: "#FBBF24" } }} />}
            label="MENUS LOCKED"
            sx={{
              bgcolor: "#92400E",
              color: "#FDE68A",
              fontWeight: 900,
              fontSize: "12px",
              py: 0.5,
              px: 1,
              border: "1px solid #F59E0B",
            }}
          />
        </Paper>
      )}

      {/* 1. STICKY HEADER */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          mb: 4,
          borderRadius: 3.5,
          backgroundColor: "rgba(15, 23, 42, 0.90)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2.5
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Typography variant="h2" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "28px" }}>
              {headerWallet?.greeting || (headerWallet?.owner_name ? `Good Day, ${headerWallet.owner_name}` : "Welcome, Retailer Partner")}
            </Typography>
            <Chip
              label={headerWallet?.retailer_code || "RET-PARTNER"}
              size="medium"
              sx={{ backgroundColor: "rgba(37, 99, 235, 0.25)", color: "#60A5FA", fontWeight: 800, fontSize: "15px", py: 0.5, border: "1px solid rgba(96, 165, 250, 0.4)" }}
            />
          </Box>
          <Typography variant="body1" sx={{ color: "#CBD5E1", mt: 0.8, fontSize: "16px", fontWeight: 500 }}>
            {headerWallet?.company_name || "Pay2Pay FinTech Solutions"} · {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "short", day: "numeric" })}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Chip label="Live Connection Active" size="medium" color="success" variant="outlined" sx={{ fontWeight: 800, fontSize: "14px", px: 1 }} />
          <Tooltip title="Refresh Dashboard Data">
            <IconButton onClick={fetchDashboardData} sx={{ color: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.10)", width: 48, height: 48 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Notifications">
            <IconButton sx={{ color: "#FFFFFF", backgroundColor: "rgba(255,255,255,0.10)", width: 48, height: 48 }}>
              <Badge badgeContent={headerWallet?.unread_notifications_count || 1} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* 2. WALLET OVERVIEW SECTION */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 4 },
          mb: 4.5,
          borderRadius: 4,
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.90) 100%)",
          border: "1.5px solid rgba(59, 130, 246, 0.40)",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.6)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <Box sx={{ position: "relative", zIndex: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, flexDirection: { xs: "column", md: "row" }, gap: 2, mb: 3.5 }}>
            <Box>
              <Typography variant="h3" sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "22px", letterSpacing: 0.2 }}>
                Wallet Overview & Financial Allocation
              </Typography>
              <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px", mt: 0.3 }}>
                Live available liquidity, daily transaction debits/credits, commission margin, tax deductions, and POS settlements.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                startIcon={!isApproved ? <LockIcon sx={{ fontSize: 20, color: "#FBBF24" }} /> : <AddCircleIcon sx={{ fontSize: 22 }} />}
                onClick={() => {
                  if (!isApproved) {
                    setDashboardLockedModal({ label: "Top-Up Main Wallet" });
                    return;
                  }
                  router.push("/retailer/wallet");
                }}
                sx={{ py: 1.5, px: 2.5, fontSize: "16px", fontWeight: 700, borderRadius: 3, backgroundColor: !isApproved ? "#D97706" : "#2563EB" }}
              >
                {!isApproved ? "Wallet Locked" : "Top-Up Main Wallet"}
              </Button>
              <Button
                variant="outlined"
                startIcon={!isApproved ? <LockIcon sx={{ fontSize: 20, color: "#FBBF24" }} /> : <HistoryIcon sx={{ fontSize: 22 }} />}
                onClick={() => {
                  if (!isApproved) {
                    setDashboardLockedModal({ label: "Passbook Ledger" });
                    return;
                  }
                  router.push("/retailer/dmt/ledger");
                }}
                sx={{ py: 1.5, px: 2.5, fontSize: "16px", fontWeight: 700, borderRadius: 3, borderColor: "rgba(255,255,255,0.3)", color: "#FFFFFF" }}
              >
                Passbook Ledger
              </Button>
            </Stack>
          </Box>

          <Grid container spacing={3}>
            {/* 1. Available Balance */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "rgba(34, 197, 94, 0.12)", border: "1px solid rgba(34, 197, 94, 0.35)" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "15px", fontWeight: 700 }}>Available Balance</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "24px", mt: 0.5 }}>
                  ₹{headerWallet ? headerWallet.available_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                </Typography>
              </Box>
            </Grid>

            {/* 2. Blocked Reserve */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.35)" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "15px", fontWeight: 700 }}>Blocked Reserve</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "24px", mt: 0.5 }}>
                  ₹{headerWallet ? headerWallet.blocked_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                </Typography>
              </Box>
            </Grid>

            {/* 3. Today's Debit */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.35)" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "15px", fontWeight: 700 }}>Today's Total Debit</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#F87171", fontSize: "24px", mt: 0.5 }}>
                  -₹{headerWallet ? headerWallet.todays_debit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                </Typography>
              </Box>
            </Grid>

            {/* 4. Today's Reversal Credit */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "rgba(59, 130, 246, 0.12)", border: "1px solid rgba(59, 130, 246, 0.35)" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "15px", fontWeight: 700 }}>Today's Reversal Credit</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "24px", mt: 0.5 }}>
                  +₹{headerWallet ? headerWallet.todays_credit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                </Typography>
              </Box>
            </Grid>

            {/* 5. Today's Commission */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "rgba(168, 85, 247, 0.12)", border: "1px solid rgba(168, 85, 247, 0.35)" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "15px", fontWeight: 700 }}>Today's Commission</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#C084FC", fontSize: "24px", mt: 0.5 }}>
                  +₹{headerWallet ? headerWallet.todays_commission.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                </Typography>
              </Box>
            </Grid>

            {/* 6. Today's GST */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.14)" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "15px", fontWeight: 700 }}>Today's GST Paid (18%)</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#E2E8F0", fontSize: "24px", mt: 0.5 }}>
                  ₹{headerWallet ? headerWallet.todays_gst.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                </Typography>
              </Box>
            </Grid>

            {/* 7. Today's TDS */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.14)" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "15px", fontWeight: 700 }}>Today's TDS Deducted</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#E2E8F0", fontSize: "24px", mt: 0.5 }}>
                  ₹{headerWallet ? headerWallet.todays_tds.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                </Typography>
              </Box>
            </Grid>

            {/* 8. POS Settlement Pending */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "rgba(20, 184, 166, 0.12)", border: "1px solid rgba(20, 184, 166, 0.35)" }}>
                <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "15px", fontWeight: 700 }}>POS Settlement Pending</Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#2DD4BF", fontSize: "24px", mt: 0.5 }}>
                  ₹{headerWallet ? headerWallet.settlement_pending_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* 3. QUICK ACTIONS & SHORTCUTS BAR */}
      <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "22px", mb: 2 }}>
        Quick Actions & Shortcuts
      </Typography>
      <Grid container spacing={2.5} sx={{ mb: 4.5 }}>
        {[
          { label: "💸 Send Money", key: "Alt+S", path: "/retailer/dmt", color: "#3B82F6", isFinancial: true },
          { label: "👤 Add Customer", key: "Alt+C", path: "/retailer/customers", color: "#10B981", isFinancial: true },
          { label: "🏦 Add Beneficiary", key: "Alt+B", path: "/retailer/beneficiaries", color: "#EC4899", isFinancial: true },
          { label: "💰 Wallet Top-up", key: "Alt+W", path: "/retailer/wallet", color: "#F59E0B", isFinancial: true },
          { label: "📊 Payout Reports", key: "Alt+P", path: "/retailer/dmt/reports", color: "#8B5CF6", isFinancial: false },
          { label: "🏦 POS Settlement", key: "Alt+M", path: "/retailer/pos/settlement-report", color: "#06B6D4", isFinancial: false }
        ].map((act) => {
          const locked = !isApproved && act.isFinancial;
          return (
            <Grid size={{ xs: 12, sm: 6, md: 2 }} key={act.label}>
              <Paper
                onClick={() => {
                  if (locked) {
                    setDashboardLockedModal({ label: act.label });
                    return;
                  }
                  router.push(act.path);
                }}
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  backgroundColor: "rgba(15, 23, 42, 0.85)",
                  border: locked ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255, 255, 255, 0.14)",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    borderColor: locked ? "#F59E0B" : act.color,
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    boxShadow: locked ? "0 12px 28px -6px rgba(245, 158, 11, 0.3)" : `0 12px 28px -6px ${act.color}40`
                  }
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: locked ? "#94A3B8" : "#FFFFFF", fontSize: "17px" }}>
                    {act.label}
                  </Typography>
                  <Chip
                    label={locked ? "LOCKED" : act.key}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "11px",
                      fontWeight: 800,
                      backgroundColor: locked ? "rgba(245, 158, 11, 0.2)" : "rgba(255,255,255,0.12)",
                      color: locked ? "#FBBF24" : "#E2E8F0",
                      border: locked ? "1px solid rgba(245, 158, 11, 0.4)" : "none"
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* 4. FINANCIAL ACCOUNTING KPIS */}
      <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "22px", mb: 2 }}>
        Financial Accounting KPIs
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4.5 }}>
        {[
          { label: "Today's Transfer", value: `₹${finKpis ? finKpis.todays_transfer.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}`, color: "#3B82F6", sub: "Gross Beneficiary Credit" },
          { label: "Today's Wallet Debit", value: `₹${finKpis ? finKpis.todays_wallet_debit.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}`, color: "#F87171", sub: "Amount + Fee + GST" },
          { label: "Today's Commission", value: `₹${finKpis ? finKpis.todays_commission.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}`, color: "#4ADE80", sub: "Instant Net Revenue" },
          { label: "Today's GST", value: `₹${finKpis ? finKpis.todays_gst.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}`, color: "#FBBF24", sub: "18% GST Deduction" },
          { label: "Today's TDS", value: `₹${finKpis ? finKpis.todays_tds.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}`, color: "#C084FC", sub: "Sec 194O Tax Withheld" },
          { label: "Settlement Pending", value: `₹${finKpis ? finKpis.settlement_pending_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}`, color: "#FBBF24", sub: "Awaiting Bank Settlement" },
          { label: "Settlement Settled", value: `₹${finKpis ? finKpis.settlement_completed_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}`, color: "#4ADE80", sub: "Credited to Bank Account" },
          { label: "Current Wallet Balance", value: `₹${finKpis ? finKpis.wallet_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}`, color: "#38BDF8", sub: "Live Account Ledger" }
        ].map((k) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={k.label}>
            <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.14)", borderLeft: `6px solid ${k.color}` }}>
              <Typography variant="subtitle1" sx={{ color: "#E2E8F0", fontWeight: 700, fontSize: "18px" }}>{k.label}</Typography>
              <Typography variant="h1" sx={{ fontWeight: 800, color: "#FFFFFF", mt: 1, fontSize: "36px" }}>{k.value}</Typography>
              <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "15px", mt: 0.8, fontWeight: 500 }}>{k.sub}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 5. OPERATIONS & VELOCITY METRICS */}
      <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "22px", mb: 2 }}>
        Operations & Velocity Metrics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4.5 }}>
        {[
          { label: "Pending Transactions", value: opsKpis ? opsKpis.pending_transactions : 0, color: "#FBBF24", sub: "Queued for Bank Response" },
          { label: "Processing Transactions", value: opsKpis ? opsKpis.processing_transactions : 0, color: "#60A5FA", sub: "Active Engine Handshake" },
          { label: "Successful Transactions", value: opsKpis ? opsKpis.successful_transactions : 0, color: "#4ADE80", sub: "Bank Confirmed Credits" },
          { label: "Failed Transactions", value: opsKpis ? opsKpis.failed_transactions : 0, color: "#F87171", sub: "Rejected / Stopped" },
          { label: "Reversed Transactions", value: opsKpis ? opsKpis.reversed_transactions : 0, color: "#C084FC", sub: "Auto-Refunded to Wallet" },
          { label: "Active Customers Today", value: opsKpis ? opsKpis.todays_customers : 0, color: "#38BDF8", sub: "Unique Senders" },
          { label: "Active Beneficiaries", value: opsKpis ? opsKpis.todays_beneficiaries : 0, color: "#F472B6", sub: "Receiving Beneficiaries" },
          { label: "Avg Processing Speed", value: `${opsKpis ? opsKpis.average_processing_time_seconds : 2.4}s`, color: "#60A5FA", sub: "Transaction Latency" },
          { label: "Success Rate", value: `${opsKpis ? opsKpis.success_rate_pct : 98.6}%`, color: "#4ADE80", sub: "System Benchmark" },
          { label: "Business Health Status", value: opsKpis ? opsKpis.business_health : "EXCELLENT", color: "#4ADE80", sub: "Overall Operational State" }
        ].map((k) => (
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }} key={k.label}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.14)", borderLeft: `6px solid ${k.color}` }}>
              <Typography variant="subtitle1" sx={{ color: "#E2E8F0", fontWeight: 700, fontSize: "18px" }}>{k.label}</Typography>
              <Typography variant="h1" sx={{ fontWeight: 800, color: "#FFFFFF", mt: 1, fontSize: "36px" }}>{k.value}</Typography>
              <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "15px", mt: 0.8, fontWeight: 500 }}>{k.sub}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 6. FINANCIAL CHARTS & BUSINESS ALERTS */}
      <Grid container spacing={3.5} sx={{ mb: 4.5 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.14)" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5, flexWrap: "wrap", gap: 2 }}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "22px" }}>
                Interactive Analytics Suite
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                {["1D", "7D", "30D"].map((tf) => (
                  <Chip
                    key={tf}
                    label={tf}
                    onClick={() => setTimeframe(tf)}
                    sx={{ backgroundColor: timeframe === tf ? "#2563EB" : "rgba(255,255,255,0.08)", color: "#FFFFFF", fontWeight: 800, fontSize: "14px", px: 1, cursor: "pointer" }}
                  />
                ))}
              </Box>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: "rgba(255,255,255,0.14)", mb: 2.5 }}>
              <Tabs value={chartTab} onChange={(_, val) => setChartTab(val)} textColor="inherit" indicatorColor="primary">
                <Tab label="Transaction Volume" sx={{ textTransform: "none", fontWeight: 700, fontSize: "17px", color: "#FFFFFF" }} />
                <Tab label="Commission Margin" sx={{ textTransform: "none", fontWeight: 700, fontSize: "17px", color: "#FFFFFF" }} />
                <Tab label="Wallet Flow" sx={{ textTransform: "none", fontWeight: 700, fontSize: "17px", color: "#FFFFFF" }} />
                <Tab label="Settlement Trend" sx={{ textTransform: "none", fontWeight: 700, fontSize: "17px", color: "#FFFFFF" }} />
              </Tabs>
            </Box>

            <Box sx={{ height: 320, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartTab === 0 ? (
                  <AreaChart data={charts.transaction_trend}>
                    <defs>
                      <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 14 }} />
                    <YAxis stroke="#94A3B8" tick={{ fontSize: 14 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.2)", borderRadius: 12, fontSize: "16px" }} />
                    <Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmt)" />
                  </AreaChart>
                ) : chartTab === 1 ? (
                  <BarChart data={charts.commission_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 14 }} />
                    <YAxis stroke="#94A3B8" tick={{ fontSize: 14 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.2)", borderRadius: 12, fontSize: "16px" }} />
                    <Bar dataKey="commission" fill="#4ADE80" radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : chartTab === 2 ? (
                  <AreaChart data={charts.wallet_trend}>
                    <defs>
                      <linearGradient id="colorWal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 14 }} />
                    <YAxis stroke="#94A3B8" tick={{ fontSize: 14 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.2)", borderRadius: 12, fontSize: "16px" }} />
                    <Area type="monotone" dataKey="closing_balance" stroke="#4ADE80" strokeWidth={3} fillOpacity={1} fill="url(#colorWal)" />
                  </AreaChart>
                ) : (
                  <BarChart data={charts.settlement_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 14 }} />
                    <YAxis stroke="#94A3B8" tick={{ fontSize: 14 }} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.2)", borderRadius: 12, fontSize: "16px" }} />
                    <Bar dataKey="settled" fill="#38BDF8" stackId="a" />
                    <Bar dataKey="pending" fill="#FBBF24" stackId="a" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Business Alerts */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.14)", height: "100%" }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "22px", display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
              <WarningIcon color="warning" sx={{ fontSize: 28 }} /> Business System Alerts
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {alerts.map((alt) => (
                <Box
                  key={alt.id}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    backgroundColor: alt.priority === "CRITICAL" ? "rgba(220, 38, 38, 0.15)" : "rgba(217, 119, 6, 0.15)",
                    border: `1.5px solid ${alt.priority === "CRITICAL" ? "rgba(248, 113, 113, 0.4)" : "rgba(251, 191, 36, 0.4)"}`
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, alignItems: "center" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: alt.priority === "CRITICAL" ? "#FCA5A5" : "#FDE047", fontSize: "18px" }}>
                      {alt.title}
                    </Typography>
                    <Chip label={alt.priority} size="small" sx={{ height: 22, fontSize: "12px", fontWeight: 800 }} />
                  </Box>
                  <Typography variant="body1" sx={{ color: "#E2E8F0", fontSize: "16px", lineHeight: 1.5 }}>{alt.message}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 7. LIVE TRANSACTION FEED & RECENT ACTIVITY */}
      <Grid container spacing={3.5} sx={{ mb: 4.5 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ borderRadius: 3.5, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.14)", overflow: "hidden" }}>
            <Box sx={{ p: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "22px" }}>Live Transaction Feed</Typography>
              <Button variant="outlined" onClick={() => router.push("/retailer/dmt/reports")} sx={{ textTransform: "none", fontWeight: 700, fontSize: "17px", borderColor: "rgba(255,255,255,0.30)", color: "#FFFFFF" }}>
                View Full Report
              </Button>
            </Box>
            <TableContainer sx={{ maxHeight: 380 }}>
              <Table stickyHeader size="medium">
                <TableHead>
                  <TableRow sx={{ "& th": { backgroundColor: "#0F172A", color: "#FFFFFF", fontWeight: 800, fontSize: "16px", py: 2 } }}>
                    <TableCell>Time</TableCell>
                    <TableCell>Txn ID</TableCell>
                    <TableCell align="right">Payout Amount</TableCell>
                    <TableCell align="right">Net Debit</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell>UTR</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {liveFeed.map((tx) => (
                    <TableRow key={tx.transaction_id} hover sx={{ "& td": { borderColor: "rgba(255,255,255,0.08)", color: "#E2E8F0", fontSize: "16px", fontWeight: 500, py: 2 } }}>
                      <TableCell sx={{ color: "#CBD5E1" }}>{tx.initiated_at ? new Date(tx.initiated_at).toLocaleTimeString("en-IN", { timeStyle: "medium" }) : "--"}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#60A5FA" }}>{tx.transaction_number}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, color: "#FFFFFF" }}>₹{tx.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right" sx={{ color: "#F87171", fontWeight: 700 }}>₹{tx.net_debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{tx.mode}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "15px" }}>{tx.utr_number}</TableCell>
                      <TableCell align="center">{getStatusChip(tx.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3.5, borderRadius: 3.5, backgroundColor: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(255, 255, 255, 0.14)", height: "100%" }}>
            <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "22px", mb: 2.5 }}>Recent Activity Audit Log</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {activities.map((act) => (
                <Box key={act.id} sx={{ p: 2.5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "18px" }}>{act.title}</Typography>
                  <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px", mt: 0.5, lineHeight: 1.5 }}>{act.desc}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 8. ONE-CLICK QUICK REPORTS */}
      <Typography variant="h3" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "22px", mb: 2 }}>
        One-Click Quick Reports
      </Typography>
      <Grid container spacing={3}>
        {[
          { title: "Payout Transaction Report", path: "/retailer/dmt/reports", desc: "Detailed transfer, charges and status history" },
          { title: "Passbook Ledger Statement", path: "/retailer/dmt/ledger", desc: "Running balance wallet debit & credit statement" },
          { title: "POS Swipe Settlement Report", path: "/retailer/pos/settlement-report", desc: "Terminal MDR, GST and bank credit UTR statement" }
        ].map((rep) => (
          <Grid size={{ xs: 12, md: 4 }} key={rep.title}>
            <Paper
              onClick={() => router.push(rep.path)}
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: 3.5,
                backgroundColor: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                "&:hover": { transform: "translateY(-4px)", borderColor: "#2563EB" }
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px" }}>{rep.title}</Typography>
              <Typography variant="body1" sx={{ color: "#CBD5E1", fontSize: "16px", mt: 0.8 }}>{rep.desc}</Typography>
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
              onClick={() => {
                setApprovalStatus("APPROVED");
                setDashboardLockedModal(null);
              }}
              variant="contained"
              color="success"
              fullWidth
              sx={{ fontWeight: 800, borderRadius: "12px", height: 44, textTransform: "none", fontSize: "13px" }}
            >
              Simulate Admin Approval (Unlock Now)
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
    </Box>
  );
};
