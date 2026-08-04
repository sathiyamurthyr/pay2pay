"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Avatar,
  Divider,
  Stack,
  Tooltip,
  Badge,
  Grid
} from "@mui/material";

// Material Icons
import SendIcon from "@mui/icons-material/Send";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import ReceiptIcon from "@mui/icons-material/Receipt";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import QrCodeIcon from "@mui/icons-material/QrCode";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import AddIcon from "@mui/icons-material/Add";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SpeedIcon from "@mui/icons-material/Speed";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import HistoryIcon from "@mui/icons-material/History";
import CallIcon from "@mui/icons-material/Call";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import RefreshIcon from "@mui/icons-material/Refresh";

import { useRetailerStore } from "@/stores/use-retailer-store";
import { EnterpriseDataGrid, DataGridColumn } from "@/components/ui/enterprise-data-grid";
import { M3StatusChip } from "@/components/ui/m3-components";

interface TransactionRecord {
  id: string;
  type: string;
  recipient: string;
  amount: number;
  charge: number;
  margin: number;
  status: string;
  utr: string;
  time: string;
}

const MOCK_RECENT_TXNS: TransactionRecord[] = [
  { id: "TXN-90124", type: "DMT Transfer", recipient: "Kavitha Sharma (HDFC - 501009)", amount: 5000, charge: 10, margin: 6.50, status: "SUCCESS", utr: "93847293", time: "18:24 PM" },
  { id: "TXN-90123", type: "AEPS Cash Out", recipient: "Ramesh Kumar (Aadhaar **4412)", amount: 2000, charge: 0, margin: 5.00, status: "SUCCESS", utr: "77192049", time: "18:10 PM" },
  { id: "TXN-90122", type: "UPI QR Load", recipient: "Direct Wallet Top-up", amount: 10000, charge: 0, margin: 0.00, status: "SUCCESS", utr: "66019482", time: "17:45 PM" },
  { id: "TXN-90121", type: "BBPS Bill Pay", recipient: "TNEB Electricity (049281)", amount: 1450, charge: 0, margin: 3.50, status: "SUCCESS", utr: "44129038", time: "17:15 PM" },
  { id: "TXN-90120", type: "Mobile Recharge", recipient: "Airtel Prepaid (9840192837)", amount: 299, charge: 0, margin: 7.45, status: "SUCCESS", utr: "88392019", time: "16:50 PM" },
  { id: "TXN-90119", type: "DMT Transfer", recipient: "Suresh Patel (SBI - 204918)", amount: 12000, charge: 20, margin: 14.00, status: "PENDING", utr: "33219084", time: "16:20 PM" },
];

const RECENT_ACTIVITIES = [
  { text: "DMT ₹5,000 to Kavitha (HDFC)", time: "18:24 PM", type: "SUCCESS" },
  { text: "AEPS Cash Out ₹2,000", time: "18:10 PM", type: "SUCCESS" },
  { text: "Dynamic UPI QR Generated", time: "17:45 PM", type: "INFO" },
  { text: "Soundbox Voice Alert Enabled", time: "16:30 PM", type: "SYSTEM" },
];

export default function RetailerDashboardPage() {
  const { wallet, syncBalance, isSyncing } = useRetailerStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning 👋";
    if (hour < 17) return "Good Afternoon 👋";
    return "Good Evening 👋";
  };

  // Quick Services Grid Data (7 Core Services)
  const quickServices = [
    { title: "DMT Transfer", sub: "Instant IMPS / NEFT", icon: SendIcon, path: "/retailer/dmt", color: "#1E4ED8", bg: "#EFF6FF" },
    { title: "Card to Cash", sub: "Micro-ATM & Cashout", icon: CreditCardIcon, path: "/retailer/card-to-cash", color: "#7C3AED", bg: "#F3E8FF" },
    { title: "Swipe Machine", sub: "mPOS Terminal & POS", icon: PointOfSaleIcon, path: "/retailer/pos", color: "#2563EB", bg: "#DBEAFE" },
    { title: "AEPS Cash Out", sub: "Aadhaar Biometric Out", icon: FingerprintIcon, path: "/retailer/aeps", color: "#D97706", bg: "#FEF3C7" },
    { title: "BBPS Bill Pay", sub: "Utilities, Gas & Water", icon: ReceiptIcon, path: "/retailer/bbps", color: "#DC2626", bg: "#FEE2E2" },
    { title: "Recharge", sub: "Mobile & DTH Instant", icon: PhoneAndroidIcon, path: "/retailer/recharge", color: "#0EA5E9", bg: "#E0F2FE" },
    { title: "UPI Services", sub: "Dynamic QR & Collect", icon: QrCodeIcon, path: "/retailer/upi", color: "#10B981", bg: "#D1FAE5" },
  ];

  // Gateways & Infrastructure Health Status
  const systemHealth = [
    { name: "Cashfree Gateway", status: "Operational", latency: "12ms", ok: true },
    { name: "NPCI Switch", status: "Operational", latency: "18ms", ok: true },
    { name: "Partner Bank", status: "Operational", latency: "99.8%", ok: true },
    { name: "SMS Gateway", status: "Operational", latency: "99.9%", ok: true },
    { name: "WhatsApp Bot", status: "Connected", latency: "Active", ok: true },
  ];

  const columns: DataGridColumn<TransactionRecord>[] = [
    {
      id: "id",
      label: "Txn ID",
      minWidth: 110,
      format: (val) => (
        <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#1E4ED8" }}>
          {val}
        </Typography>
      ),
    },
    {
      id: "type",
      label: "Service",
      minWidth: 130,
      format: (val) => (
        <Typography variant="body2" sx={{ fontWeight: 700, color: "#0F172A", fontSize: "13px" }}>
          {val}
        </Typography>
      ),
    },
    { id: "recipient", label: "Recipient / Details", minWidth: 220 },
    {
      id: "amount",
      label: "Amount",
      align: "right",
      format: (val) => (
        <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#0F172A", fontSize: "14px" }}>
          ₹{(val as number).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
        </Typography>
      ),
    },
    {
      id: "margin",
      label: "Commission",
      align: "right",
      format: (val) => (
        <Typography variant="body2" sx={{ fontWeight: 800, color: "#10B981", fontSize: "13px" }}>
          +₹{(val as number).toFixed(2)}
        </Typography>
      ),
    },
    { id: "status", label: "Status", align: "center", format: (val) => <M3StatusChip status={val as string} /> },
    {
      id: "utr",
      label: "Bank UTR",
      minWidth: 140,
      format: (val) => (
        <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#475569", fontWeight: 700, fontSize: "12px" }}>
          {val}
        </Typography>
      ),
    },
    { id: "time", label: "Time", align: "right" },
  ];

  const glassCardStyle = {
    p: "20px",
    borderRadius: "18px",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(226, 232, 240, 0.8)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  };

  return (
    <Box sx={{ pb: { xs: 12, md: 6 }, maxWidth: 1280, mx: "auto" }}>

      {/* ── 1. ENTERPRISE HEADER BAR ── */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          px: 3,
          mb: 3,
          borderRadius: "18px",
          background: "linear-gradient(135deg, #1E4ED8 0%, #1D4ED8 100%)",
          color: "#FFFFFF",
          boxShadow: "0 8px 24px rgba(30, 78, 216, 0.25)",
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          
          {/* Logo & Wallet Balance Pill */}
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Avatar sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#FFFFFF", fontWeight: 900, width: 42, height: 42 }}>
              P2P
            </Avatar>
            <Box>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 700, letterSpacing: "0.5px", display: "block" }}>
                WALLET BALANCE
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#FFFFFF" }}>
                ₹{wallet.mainBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            </Box>
            <Button
              component={Link}
              href="/retailer/wallet"
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                bgcolor: "#F59E0B",
                color: "#1E1B4B",
                fontWeight: 900,
                borderRadius: "12px",
                fontSize: "0.75rem",
                px: 2,
                "&:hover": { bgcolor: "#D97706" },
              }}
            >
              Top Up
            </Button>
          </Stack>

          {/* Right Controls: Soundbox, Notifications & Profile */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            {/* Soundbox Status Pill */}
            <Chip
              icon={<VolumeUpIcon sx={{ color: "#10B981 !important", fontSize: "16px !important" }} />}
              label="Soundbox 100% Active"
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.15)",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: "0.75rem",
                borderRadius: "12px",
                px: 0.5,
              }}
            />

            {/* Notification Icon */}
            <Tooltip title="Notifications">
              <IconButton component={Link} href="/retailer/notifications" sx={{ color: "#FFFFFF", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}>
                <Badge badgeContent={3} color="error">
                  <NotificationsActiveIcon sx={{ fontSize: 20 }} />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Profile Avatar */}
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", cursor: "pointer" }} component={Link} href="/retailer/profile">
              <Avatar sx={{ bgcolor: "#F59E0B", color: "#1E1B4B", fontWeight: 900, width: 40, height: 40, border: "2px solid #FFFFFF" }}>
                SD
              </Avatar>
            </Stack>
          </Stack>

        </Stack>
      </Paper>

      {/* ── 2. GREETING & TODAY'S BUSINESS SUMMARY ── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: "#0F172A", letterSpacing: "-0.5px" }}>
            {getGreeting()}
          </Typography>
          <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600, mt: 0.5 }}>
            Today's Business Summary • {mounted ? new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : ""}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            component={Link}
            href="/retailer/wallet"
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              borderRadius: "14px",
              fontWeight: 800,
              px: 2.5,
              py: 1,
              bgcolor: "#1E4ED8",
              "&:hover": { bgcolor: "#1D4ED8" },
              fontSize: "0.85rem",
              textTransform: "none",
            }}
          >
            Add Wallet Funds
          </Button>
          <Button
            component={Link}
            href="/retailer/settlement"
            variant="outlined"
            startIcon={<AccountBalanceIcon />}
            sx={{
              borderRadius: "14px",
              fontWeight: 800,
              px: 2.5,
              py: 1,
              borderColor: "#CBD5E1",
              color: "#1E1B4B",
              "&:hover": { borderColor: "#94A3B8", bgcolor: "#F8FAFC" },
              fontSize: "0.85rem",
              textTransform: "none",
            }}
          >
            Move To Bank
          </Button>
        </Stack>
      </Box>

      {/* ── 3. KPI CARDS (5 ROUNDED 18PX CARDS) ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        
        {/* KPI 1: Wallet Balance */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: "18px",
              background: "linear-gradient(135deg, #1E4ED8 0%, #1E3A8A 100%)",
              color: "#FFFFFF",
              boxShadow: "0 6px 20px rgba(30, 78, 216, 0.2)",
              height: "100%",
            }}
          >
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "rgba(255,255,255,0.8)", letterSpacing: "0.5px" }}>
                WALLET BALANCE
              </Typography>
              <IconButton size="small" onClick={() => syncBalance()} sx={{ color: "#F59E0B" }}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 900, color: "#FFFFFF", my: 0.5 }}>
              ₹{wallet.mainBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", display: "block", fontSize: "0.72rem" }}>
              Available for instant payouts
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 2: Today's Volume */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Paper elevation={0} sx={glassCardStyle}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B", letterSpacing: "0.5px" }}>
                TODAY'S VOLUME
              </Typography>
              <Box sx={{ p: 1, borderRadius: "12px", bgcolor: "#EFF6FF", color: "#1E4ED8" }}>
                <TrendingUpIcon sx={{ fontSize: 20 }} />
              </Box>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 900, color: "#0F172A", my: 0.5 }}>
              ₹1,45,280.00
            </Typography>
            <Typography variant="caption" sx={{ color: "#10B981", fontWeight: 800, display: "block", fontSize: "0.72rem" }}>
              🟢 +18.4% vs yesterday (84 Txns)
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 3: Commission Earned */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Paper elevation={0} sx={glassCardStyle}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B", letterSpacing: "0.5px" }}>
                COMMISSION
              </Typography>
              <Box sx={{ p: 1, borderRadius: "12px", bgcolor: "#DCFCE7", color: "#10B981" }}>
                <MonetizationOnIcon sx={{ fontSize: 20 }} />
              </Box>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 900, color: "#10B981", my: 0.5 }}>
              ₹482.50
            </Typography>
            <Typography variant="caption" sx={{ color: "#059669", fontWeight: 800, display: "block", fontSize: "0.72rem" }}>
              🎉 +₹64.20 daily bonus credited
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 4: Success Rate */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Paper elevation={0} sx={glassCardStyle}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B", letterSpacing: "0.5px" }}>
                SUCCESS RATE
              </Typography>
              <Box sx={{ p: 1, borderRadius: "12px", bgcolor: "#ECFDF5", color: "#10B981" }}>
                <CheckCircleIcon sx={{ fontSize: 20 }} />
              </Box>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 900, color: "#0F172A", my: 0.5 }}>
              99.4%
            </Typography>
            <Typography variant="caption" sx={{ color: "#10B981", fontWeight: 800, display: "block", fontSize: "0.72rem" }}>
              🟢 83 / 84 Txns Dispatched
            </Typography>
          </Paper>
        </Grid>

        {/* KPI 5: Pending Settlement */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Paper elevation={0} sx={glassCardStyle}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B", letterSpacing: "0.5px" }}>
                PENDING SETTLEMENT
              </Typography>
              <Box sx={{ p: 1, borderRadius: "12px", bgcolor: "#FEF3C7", color: "#D97706" }}>
                <HourglassEmptyIcon sx={{ fontSize: 20 }} />
              </Box>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 900, color: "#0F172A", my: 0.5 }}>
              ₹12,450.00
            </Typography>
            <Typography variant="caption" sx={{ color: "#D97706", fontWeight: 800, display: "block", fontSize: "0.72rem" }}>
              ⏳ 2 Batches in queue
            </Typography>
          </Paper>
        </Grid>

      </Grid>

      {/* ── 4. AI RECOMMENDATION CARD ── */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: "18px",
          background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)",
          color: "#FFFFFF",
          boxShadow: "0 8px 24px rgba(30, 27, 75, 0.2)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Avatar sx={{ bgcolor: "#F59E0B", color: "#1E1B4B", width: 44, height: 44 }}>
              <AutoAwesomeIcon />
            </Avatar>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#FFFFFF" }}>
                  Pay2Pay AI Business Insight
                </Typography>
                <Chip label="HIGH ROI OPPORTUNITY" size="small" sx={{ bgcolor: "#F59E0B", color: "#1E1B4B", fontWeight: 900, fontSize: "0.65rem", height: 20 }} />
              </Stack>
              <Typography variant="body2" sx={{ color: "#CBD5E1", mt: 0.5, maxWidth: 850 }}>
                ⚡ <strong>Peak DMT Volume Alert:</strong> High money transfer volume is predicted between <strong>5:00 PM – 8:00 PM</strong> in your retail zone. Top up your wallet balance by <strong>₹15,000</strong> now to ensure zero transaction dropouts and earn an estimated <strong>₹120 extra commission</strong> today.
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Button
              component={Link}
              href="/retailer/wallet"
              variant="contained"
              size="small"
              sx={{
                bgcolor: "#10B981",
                color: "#FFFFFF",
                fontWeight: 900,
                borderRadius: "12px",
                px: 2.5,
                py: 1,
                textTransform: "none",
                "&:hover": { bgcolor: "#059669" },
              }}
            >
              ⚡ Auto Top-Up Wallet
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ── 5. MAIN WORKSPACE SPLIT (LEFT SERVICES & GRID + RIGHT PANELS) ── */}
      <Grid container spacing={3}>
        
        {/* LEFT COLUMN */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            
            {/* Quick Services Grid (7 Core Services) */}
            <Paper elevation={0} sx={glassCardStyle}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", mb: 0.5 }}>
                Quick Financial Services
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, display: "block", mb: 2.5 }}>
                High-speed retail banking & transaction engines
              </Typography>

              <Grid container spacing={2}>
                {quickServices.map((service) => {
                  const Icon = service.icon;
                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={service.title}>
                      <Paper
                        component={Link}
                        href={service.path}
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: "18px",
                          border: "1px solid #E2E8F0",
                          backgroundColor: "#FFFFFF",
                          textDecoration: "none",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: 1.5,
                          transition: "all 0.2s ease-in-out",
                          cursor: "pointer",
                          "&:hover": {
                            transform: "translateY(-3px)",
                            borderColor: service.color,
                            boxShadow: `0 8px 20px ${service.color}20`,
                          },
                        }}
                      >
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: "14px",
                            backgroundColor: service.bg,
                            color: service.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon sx={{ fontSize: 24 }} />
                        </Box>
                        <Box sx={{ width: "100%" }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A", fontSize: "0.88rem" }}>
                            {service.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, display: "block", fontSize: "0.72rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {service.sub}
                          </Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>

            {/* System Health Status Panel */}
            <Paper elevation={0} sx={glassCardStyle}>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <SpeedIcon sx={{ color: "#10B981" }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    Bank Gateways & System Health Status
                  </Typography>
                </Stack>
                <Chip label="100% Operational" size="small" sx={{ bgcolor: "#DCFCE7", color: "#10B981", fontWeight: 800, fontSize: "0.72rem" }} />
              </Stack>

              <Grid container spacing={1.5}>
                {systemHealth.map((item) => (
                  <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={item.name}>
                    <Paper elevation={0} sx={{ p: 1.5, borderRadius: "14px", border: "1px solid #E2E8F0", bgcolor: "#F8FAFC" }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "#475569", display: "block", fontSize: "0.72rem", mb: 0.5 }}>
                        {item.name}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10B981" }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "#10B981", fontSize: "0.7rem" }}>
                          {item.status}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "0.68rem" }}>
                          • {item.latency}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* Recent Transactions Data Grid */}
            <Paper elevation={0} sx={glassCardStyle}>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    Recent Terminal Transactions
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
                    Live audit ledger • auto-refreshes every 30s
                  </Typography>
                </Box>
                <Button
                  component={Link}
                  href="/retailer/transactions"
                  variant="outlined"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  sx={{ borderRadius: "12px", fontWeight: 800, textTransform: "none" }}
                >
                  View All
                </Button>
              </Stack>

              <EnterpriseDataGrid
                title=""
                columns={columns}
                rows={MOCK_RECENT_TXNS}
                keyExtractor={(r) => r.id}
                searchPlaceholder="Search by Txn ID, Recipient, UTR…"
              />
            </Paper>

          </Stack>
        </Grid>

        {/* RIGHT COLUMN PANELS */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            
            {/* VIP Retailer Gold Club Banner */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: "18px", bgcolor: "#FFFFFF", border: "1px solid #E2E8F0", position: "relative", overflow: "hidden" }}>
              <Box
                sx={{
                  position: "absolute",
                  top: 14,
                  right: -30,
                  transform: "rotate(45deg)",
                  backgroundColor: "#F59E0B",
                  color: "#1E1B4B",
                  fontWeight: 900,
                  fontSize: "0.65rem",
                  py: 0.3,
                  px: 4,
                }}
              >
                GOLD
              </Box>

              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
                <Avatar sx={{ bgcolor: "#FEF3C7", color: "#D97706", width: 44, height: 44 }}>
                  <WorkspacePremiumIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    VIP Retailer Club
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
                    Tier Gold Merchant
                  </Typography>
                </Box>
              </Stack>

              <Paper elevation={0} sx={{ p: 2, borderRadius: "14px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", mb: 2 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
                    Rewards Balance
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <MonetizationOnIcon sx={{ color: "#F59E0B", fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#D97706" }}>
                      8,450 Coins
                    </Typography>
                  </Stack>
                </Stack>
                <Typography variant="caption" sx={{ color: "#10B981", fontWeight: 800, display: "block" }}>
                  Commission Bonus: +1.2x Extra Margin Active
                </Typography>
              </Paper>

              <Button
                component={Link}
                href="/retailer/reports"
                fullWidth
                variant="outlined"
                sx={{ borderRadius: "12px", borderColor: "#F59E0B", color: "#D97706", fontWeight: 800, textTransform: "none" }}
              >
                View VIP Commission Slab
              </Button>
            </Paper>

            {/* Support & Relationship Manager */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: "18px", bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
                <Avatar sx={{ bgcolor: "#EFF6FF", color: "#1E4ED8", width: 44, height: 44 }}>
                  <SupportAgentIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    24x7 Retailer Helpdesk
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
                    Assigned Account Lead
                  </Typography>
                </Box>
              </Stack>

              <Paper elevation={0} sx={{ p: 2, borderRadius: "14px", bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#0F172A" }}>
                  Anand Sharma
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                  Senior Specialist • Retailer Desk
                </Typography>
                <Typography variant="caption" sx={{ color: "#1E4ED8", fontWeight: 800, mt: 0.5, display: "block" }}>
                  Toll Free: 1800-200-9988
                </Typography>
              </Paper>

              <Button
                fullWidth
                variant="contained"
                startIcon={<CallIcon />}
                onClick={() => alert("Calling Helpline: 1800-200-9988")}
                sx={{ bgcolor: "#10B981", color: "#FFFFFF", fontWeight: 900, borderRadius: "12px", textTransform: "none", "&:hover": { bgcolor: "#059669" } }}
              >
                Call Relationship Manager
              </Button>
            </Paper>

            {/* Audit Stream */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: "18px", bgcolor: "#FFFFFF", border: "1px solid #E2E8F0" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                <HistoryIcon sx={{ color: "#64748B" }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                  Terminal Audit Stream
                </Typography>
              </Stack>

              <Stack spacing={1.5}>
                {RECENT_ACTIVITIES.map((act, i) => (
                  <Stack key={i} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: act.type === "SUCCESS" ? "#10B981" : "#1E4ED8" }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "#334155" }}>
                        {act.text}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" sx={{ color: "#94A3B8", fontFamily: "monospace" }}>
                      {act.time}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>

          </Stack>
        </Grid>

      </Grid>

      {/* ── 6. MOBILE-FIRST STICKY BOTTOM NAVIGATION BAR ── */}
      <Paper
        elevation={8}
        sx={{
          display: { xs: "block", md: "none" },
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          bgcolor: "#FFFFFF",
          borderTop: "1px solid #E2E8F0",
          py: 1,
          px: 2,
        }}
      >
        <Grid container spacing={1} sx={{ textAlign: "center" }}>
          {[
            { label: "Dashboard", icon: DashboardIcon, path: "/retailer-dashboard", active: true },
            { label: "Transfer", icon: SendIcon, path: "/retailer/dmt", active: false },
            { label: "Customers", icon: PeopleIcon, path: "/retailer/customers", active: false },
            { label: "History", icon: HistoryIcon, path: "/retailer/transactions", active: false },
            { label: "More", icon: MoreHorizIcon, path: "/retailer/profile", active: false },
          ].map((nav, idx) => {
            const Icon = nav.icon;
            return (
              <Grid size={{ xs: 2.4 }} key={idx}>
                <Box
                  component={Link}
                  href={nav.path}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textDecoration: "none",
                    color: nav.active ? "#1E4ED8" : "#64748B",
                  }}
                >
                  <Icon sx={{ fontSize: 22, color: nav.active ? "#1E4ED8" : "#64748B" }} />
                  <Typography variant="caption" sx={{ fontWeight: nav.active ? 900 : 600, fontSize: "0.68rem", mt: 0.25 }}>
                    {nav.label}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

    </Box>
  );
}
