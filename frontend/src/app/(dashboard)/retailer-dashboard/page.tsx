"use client";

import React from "react";
import Link from "next/link";
import {
  Box, Paper, Typography, Button, Chip, IconButton, Avatar, Divider, Stack
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import QrCodeIcon from "@mui/icons-material/QrCode";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AddIcon from "@mui/icons-material/Add";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SpeedIcon from "@mui/icons-material/Speed";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import HistoryIcon from "@mui/icons-material/History";
import CallIcon from "@mui/icons-material/Call";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";

import { useRetailerStore } from "@/stores/use-retailer-store";
import { EnterpriseDataGrid, DataGridColumn } from "@/components/ui/enterprise-data-grid";
import { M3StatusChip } from "@/components/ui/m3-components";
import { KpiCardCarousel } from "@/components/ui/kpi-card-carousel";

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
  { id: "TXN-90124", type: "DMT Transfer", recipient: "Kavitha Sharma (HDFC - 501009)", amount: 5000, charge: 10, margin: 6.50, status: "SUCCESS", utr: "UTR202608039012", time: "18:24 PM" },
  { id: "TXN-90123", type: "AEPS Cash Out", recipient: "Ramesh Kumar (Aadhaar **4412)", amount: 2000, charge: 0, margin: 5.00, status: "SUCCESS", utr: "RRN202608037719", time: "18:10 PM" },
  { id: "TXN-90122", type: "UPI QR Load", recipient: "Direct Wallet Top-up", amount: 10000, charge: 0, margin: 0.00, status: "SUCCESS", utr: "UPI202608036601", time: "17:45 PM" },
  { id: "TXN-90121", type: "BBPS Bill Pay", recipient: "TNEB Electricity (049281)", amount: 1450, charge: 0, margin: 3.50, status: "SUCCESS", utr: "BBPS202608034412", time: "17:15 PM" },
  { id: "TXN-90120", type: "Mobile Recharge", recipient: "Airtel Prepaid (9840192837)", amount: 299, charge: 0, margin: 7.45, status: "SUCCESS", utr: "OP8839201", time: "16:50 PM" },
  { id: "TXN-90119", type: "DMT Transfer", recipient: "Suresh Patel (SBI - 204918)", amount: 12000, charge: 20, margin: 14.00, status: "PENDING", utr: "UTR202608033321", time: "16:20 PM" },
];

const RECENT_ACTIVITIES = [
  { text: "DMT ₹5,000 to Kavitha (HDFC)", time: "18:24 PM", type: "SUCCESS" },
  { text: "AEPS Cash Out ₹2,000", time: "18:10 PM", type: "SUCCESS" },
  { text: "Dynamic UPI QR Generated", time: "17:45 PM", type: "INFO" },
  { text: "Soundbox Voice Alert Enabled", time: "16:30 PM", type: "SYSTEM" },
];

const now = new Date();

export default function RetailerDashboardPage() {
  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return "Good Morning 👋";
    if (hour < 17) return "Good Afternoon 👋";
    return "Good Evening 👋";
  };

  const quickServices = [
    { title: "Money Transfer", sub: "Instant DMT via IMPS / NEFT", icon: SendIcon, path: "/retailer/dmt", color: "#2563EB", bg: "#EFF6FF" },
    { title: "Card To Cash", sub: "Micro-ATM & POS Swipe", icon: CreditCardIcon, path: "/retailer/card-to-cash", color: "#7C3AED", bg: "#F3E8FF" },
    { title: "UPI Services", sub: "Dynamic QR & Collect", icon: QrCodeIcon, path: "/retailer/upi", color: "#16A34A", bg: "#DCFCE7" },
    { title: "AEPS Cash Out", sub: "Aadhaar Biometric Withdrawal", icon: FingerprintIcon, path: "/retailer/aeps", color: "#D97706", bg: "#FEF3C7" },
    { title: "Recharge", sub: "Mobile & DTH Instant Top-Up", icon: PhoneAndroidIcon, path: "/retailer/recharge", color: "#0EA5E9", bg: "#E0F2FE" },
    { title: "Bill Payment", sub: "BBPS All Utilities & Gas", icon: ReceiptIcon, path: "/retailer/bbps", color: "#DC2626", bg: "#FEE2E2" },
  ];

  const serviceGateways = [
    { name: "DMT Gateway", status: "ONLINE", latency: "18ms" },
    { name: "AEPS NPCI", status: "ONLINE", latency: "24ms" },
    { name: "UPI QR Clear", status: "ONLINE", latency: "12ms" },
    { name: "BBPS Switch", status: "ONLINE", latency: "35ms" },
    { name: "Settlement Engine", status: "ONLINE", latency: "15ms" },
  ];

  const columns: DataGridColumn<TransactionRecord>[] = [
    {
      id: "id", label: "Txn ID", minWidth: 110,
      format: (val) => <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#2563EB" }}>{val}</Typography>
    },
    {
      id: "type", label: "Service", minWidth: 130,
      format: (val) => <Typography variant="body2" sx={{ fontWeight: 600, color: "#111827", fontSize: "14px" }}>{val}</Typography>
    },
    { id: "recipient", label: "Recipient / Details", minWidth: 220 },
    {
      id: "amount", label: "Amount", align: "right",
      format: (val) => <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#111827", fontSize: "14px" }}>₹{(val as number).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
    },
    {
      id: "margin", label: "Commission", align: "right",
      format: (val) => <Typography variant="body2" sx={{ fontWeight: 700, color: "#16A34A", fontSize: "14px" }}>+₹{(val as number).toFixed(2)}</Typography>
    },
    { id: "status", label: "Status", align: "center", format: (val) => <M3StatusChip status={val as string} /> },
    {
      id: "utr", label: "Bank UTR", minWidth: 160,
      format: (val) => <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#4B5563", fontSize: "12px" }}>{val}</Typography>
    },
    { id: "time", label: "Time", align: "right" },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "24px", pb: 2 }}>

      {/* ── Welcome Section (Height Under 90px, 32px Title) ──────── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, minHeight: 60, maxHeight: 88 }}>
        <Box>
          <Typography variant="h1" sx={{ fontSize: "32px", fontWeight: 800, color: "#111827", lineHeight: 1.15, mb: 0.25 }}>
            {getGreeting()}
          </Typography>
          <Typography variant="body1" sx={{ fontSize: "14px", color: "#6B7280", fontWeight: 500 }}>
            Today's Business Summary
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            component={Link}
            href="/retailer/wallet"
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            sx={{
              borderRadius: "12px",
              fontWeight: 700,
              height: 40,
              px: 2.5,
              backgroundColor: "#2563EB",
              "&:hover": { backgroundColor: "#1D4ED8" },
              fontSize: "13px",
            }}
          >
            Add Wallet Funds
          </Button>
          <Button
            component={Link}
            href="/retailer/settlement"
            variant="outlined"
            size="small"
            startIcon={<AccountBalanceIcon sx={{ fontSize: 18 }} />}
            sx={{
              borderRadius: "12px",
              fontWeight: 700,
              height: 40,
              px: 2.5,
              borderColor: "#E5E7EB",
              color: "#374151",
              "&:hover": { borderColor: "#D1D5DB", backgroundColor: "#F8FAFC" },
              fontSize: "13px",
            }}
          >
            Move To Bank
          </Button>
        </Stack>
      </Box>

      {/* ── KPI Cards Section (Height: 170px, Gap: 16px, Padding: 20px) ── */}
      <KpiCardCarousel />

      {/* ── Main Workspace Split (Left Main Grid + Right Panel) ───── */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", xl: "row" }, gap: "24px" }}>

        {/* ── LEFT MAIN COLUMN ───────────────────────────────────── */}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* Quick Services Grid (4 per row on Desktop, 2 per row on Tablet) */}
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: "16px" }}>
              <Box>
                <Typography variant="h2" sx={{ fontSize: "24px", fontWeight: 800, color: "#111827" }}>
                  Quick Services
                </Typography>
                <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, fontSize: "12px" }}>
                  Financial operations & transaction services
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: "16px" }}>
              {quickServices.map((service) => {
                const Icon = service.icon;
                return (
                  <Paper
                    key={service.title}
                    component={Link}
                    href={service.path}
                    elevation={0}
                    sx={{
                      p: "16px",
                      borderRadius: "16px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E5E7EB",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      textDecoration: "none",
                      cursor: "pointer",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: service.color,
                        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    {/* Icon */}
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 3,
                        backgroundColor: service.bg,
                        color: service.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon sx={{ fontSize: 24 }} />
                    </Box>

                    {/* Label */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#111827", fontSize: "14px" }}>
                        {service.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, display: "block", fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {service.sub}
                      </Typography>
                    </Box>

                    {/* Arrow */}
                    <ArrowForwardIcon sx={{ color: "#9CA3AF", fontSize: 18, flexShrink: 0 }} />
                  </Paper>
                );
              })}
            </Box>
          </Box>

          {/* Recent Transactions Data Grid */}
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: "16px" }}>
              <Box>
                <Typography variant="h2" sx={{ fontSize: "24px", fontWeight: 800, color: "#111827" }}>
                  Recent Transactions
                </Typography>
                <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, fontSize: "12px" }}>
                  Live audit ledger &bull; auto-refreshes every 30s
                </Typography>
              </Box>
              <Button
                component={Link}
                href="/retailer/transactions"
                variant="outlined"
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                sx={{ borderRadius: "10px", fontWeight: 700, height: 36, borderColor: "#E5E7EB", color: "#374151", display: { xs: "none", sm: "inline-flex" }, fontSize: "13px" }}
              >
                View All
              </Button>
            </Box>
            <EnterpriseDataGrid
              title=""
              columns={columns}
              rows={MOCK_RECENT_TXNS}
              keyExtractor={(r) => r.id}
              searchPlaceholder="Search by Txn ID, Recipient, UTR…"
              actionButton={
                <Button
                  component={Link}
                  href="/retailer/transactions"
                  size="small"
                  variant="contained"
                  sx={{ borderRadius: 2, fontWeight: 700, display: { xs: "flex", sm: "none" }, fontSize: "12px" }}
                >
                  View All
                </Button>
              }
            />
          </Box>

          {/* Gateway Health Status */}
          <Paper elevation={0} sx={{ p: "20px", borderRadius: "16px", backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB", boxShadow: "0 4px 16px rgba(0,0,0,0.04)" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: "16px", flexWrap: "wrap", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Box sx={{ p: 1, borderRadius: 2, backgroundColor: "#DCFCE7" }}>
                  <SpeedIcon sx={{ color: "#16A34A", fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#111827", fontSize: "14px" }}>
                    Bank Gateways & NPCI Switch Status
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#6B7280", fontSize: "12px" }}>Live system health</Typography>
                </Box>
              </Box>
              <Chip
                label="100% Operational"
                sx={{ backgroundColor: "#DCFCE7", color: "#16A34A", fontWeight: 800, height: 24, fontSize: "0.72rem" }}
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: 1.5 }}>
              {serviceGateways.map((gw) => (
                <Box
                  key={gw.name}
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    backgroundColor: "#F8FAFC",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#374151", display: "block", mb: 0.5, fontSize: "12px" }}>
                    {gw.name}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#16A34A", flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: "#16A34A", fontWeight: 800, fontSize: "11px" }}>
                      {gw.status}
                    </Typography>
                    <Divider orientation="vertical" flexItem sx={{ height: 10, my: "auto", mx: 0.25 }} />
                    <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600, fontSize: "11px" }}>
                      {gw.latency}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>

        </Box>

        {/* ── RIGHT PANEL (340px) ─────────────────────────────────── */}
        <Box sx={{ width: { xs: "100%", xl: 340 }, flexShrink: 0, display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* 1. Premium Retailer Banner with Gold Ribbon */}
          <Paper
            elevation={0}
            sx={{
              p: "20px",
              borderRadius: "16px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Gold Ribbon Tag */}
            <Box
              sx={{
                position: "absolute",
                top: 14,
                right: -32,
                transform: "rotate(45deg)",
                backgroundColor: "#D4AF37",
                color: "#1E3A8A",
                fontWeight: 900,
                fontSize: "0.65rem",
                letterSpacing: "0.08em",
                py: 0.25,
                px: 3.5,
                boxShadow: "0 2px 6px rgba(212, 175, 55, 0.3)",
              }}
            >
              GOLD
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
              <Avatar sx={{ backgroundColor: "#FEF9C3", color: "#D4AF37", border: "1px solid #FDE047", width: 38, height: 38 }}>
                <WorkspacePremiumIcon sx={{ fontSize: 22 }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#111827", fontSize: "14px" }}>
                  VIP Retailer Club
                </Typography>
                <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600, fontSize: "12px" }}>
                  Tier Gold Merchant
                </Typography>
              </Box>
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", mb: 1.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: "#4B5563", fontWeight: 700, fontSize: "12px" }}>
                  Rewards Balance
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <MonetizationOnIcon sx={{ color: "#D4AF37", fontSize: 16 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#B45309", fontSize: "13px" }}>
                    8,450 Coins
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" sx={{ color: "#6B7280", display: "block", fontSize: "12px" }}>
                Commission Bonus: <strong style={{ color: "#16A34A" }}>+1.2x Extra Margin</strong>
              </Typography>
            </Box>

            <Button
              component={Link}
              href="/retailer/reports"
              fullWidth
              size="small"
              variant="outlined"
              sx={{
                borderRadius: "10px",
                height: 38,
                fontWeight: 700,
                color: "#1E3A8A",
                borderColor: "#D4AF37",
                "&:hover": { borderColor: "#B45309", backgroundColor: "#FEF9C3" },
                textTransform: "none",
                fontSize: "12px",
              }}
            >
              View VIP Commission Slab
            </Button>
          </Paper>

          {/* 2. Important Notifications */}
          <Paper
            elevation={0}
            sx={{
              p: "20px",
              borderRadius: "16px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <NotificationsActiveIcon sx={{ color: "#2563EB", fontSize: 20 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#111827", fontSize: "14px" }}>
                  Important Alerts
                </Typography>
              </Box>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#DC2626" }} />
            </Box>

            <Stack spacing={1.25}>
              <Box sx={{ p: 1.25, borderRadius: 2, backgroundColor: "#EFF6FF", borderLeft: "3px solid #2563EB" }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#1E3A8A", display: "block", fontSize: "12px" }}>
                  NPCI IMPS Switch Status
                </Typography>
                <Typography variant="caption" sx={{ color: "#374151", fontSize: "11px" }}>
                  100% instant settlement operational across 140+ banks.
                </Typography>
              </Box>
              <Box sx={{ p: 1.25, borderRadius: 2, backgroundColor: "#DCFCE7", borderLeft: "3px solid #16A34A" }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#14532D", display: "block", fontSize: "12px" }}>
                  TDS Certificate Ready
                </Typography>
                <Typography variant="caption" sx={{ color: "#374151", fontSize: "11px" }}>
                  Section 194O TDS form for Q1 FY26 ready to download.
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* 3. Dedicated Relationship Manager & Support */}
          <Paper
            elevation={0}
            sx={{
              p: "20px",
              borderRadius: "16px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
              <Box sx={{ p: 1, borderRadius: 2.5, backgroundColor: "#EFF6FF" }}>
                <SupportAgentIcon sx={{ color: "#2563EB", fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#111827", fontSize: "14px" }}>
                  24x7 Retailer Support
                </Typography>
                <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600, fontSize: "12px" }}>
                  Assigned Account Lead
                </Typography>
              </Box>
            </Box>

            <Box sx={{ p: 1.5, borderRadius: 2.5, backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB", mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#111827", fontSize: "14px" }}>
                Anand Sharma
              </Typography>
              <Typography variant="caption" sx={{ color: "#6B7280", display: "block", fontSize: "12px" }}>
                Senior Lead Specialist &bull; Retailer Desk
              </Typography>
              <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700, mt: 0.25, display: "block", fontSize: "12px" }}>
                Toll Free: 1800-200-9988
              </Typography>
            </Box>

            <Button
              fullWidth
              size="small"
              variant="contained"
              startIcon={<CallIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderRadius: "10px",
                height: 38,
                fontWeight: 700,
                backgroundColor: "#16A34A",
                "&:hover": { backgroundColor: "#15803D" },
                textTransform: "none",
                fontSize: "12px",
              }}
              onClick={() => alert("Connecting to Retailer Helpline: 1800-200-9988")}
            >
              Call Relationship Manager
            </Button>
          </Paper>

          {/* 4. Recent Activity Stream */}
          <Paper
            elevation={0}
            sx={{
              p: "20px",
              borderRadius: "16px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <HistoryIcon sx={{ color: "#4B5563", fontSize: 20 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#111827", fontSize: "14px" }}>
                Terminal Audit Stream
              </Typography>
            </Box>

            <Stack spacing={1.5}>
              {RECENT_ACTIVITIES.map((act, i) => (
                <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: act.type === "SUCCESS" ? "#16A34A" : "#2563EB" }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "#374151", fontSize: "12px" }}>
                      {act.text}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "#9CA3AF", fontSize: "0.68rem", fontFamily: "monospace" }}>
                    {act.time}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>

        </Box>

      </Box>

    </Box>
  );
}
