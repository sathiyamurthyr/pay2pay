"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Box, Paper, Typography, Button, TextField, Chip, Tab, Tabs,
  Table, TableBody, TableCell, TableHead, TableRow, Stack, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, IconButton,
  MenuItem, InputAdornment, LinearProgress
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AddIcon from "@mui/icons-material/Add";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import SearchIcon from "@mui/icons-material/Search";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import SendIcon from "@mui/icons-material/Send";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import HistoryIcon from "@mui/icons-material/History";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { M3StatusChip } from "@/components/ui/m3-components";
import ScannableQrCode from "@/components/ui/scannable-qr-code";

interface WalletTxn {
  id: string;
  date: string;
  particulars: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balanceAfter: number;
  utr: string;
  status: "SUCCESS" | "PENDING" | "FAILED";
}

interface SettlementLog {
  id: string;
  date: string;
  bankAccount: string;
  amount: number;
  mode: "IMPS" | "NEFT";
  status: "Completed" | "Processing" | "Pending";
  utr: string;
}

const getActiveRetailerId = () => {
  if (typeof window !== "undefined") {
    try {
      const userStr =
        localStorage.getItem("user_info") ||
        localStorage.getItem("user") ||
        localStorage.getItem("auth_user") ||
        localStorage.getItem("pay2pay_user_data");
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.retailer_code || u.retailer_id || u.id) {
          return u.retailer_code || u.retailer_id || u.id;
        }
      }
    } catch {}
    return (
      localStorage.getItem("p2p_retailer_code") ||
      localStorage.getItem("p2p_active_retailer_id") ||
      localStorage.getItem("pay2pay_reg_code") ||
      localStorage.getItem("pay2pay_reg_id") ||
      ""
    );
  }
  return "";
};

export default function WalletPage() {
  const { wallet, outlet, syncBalance, isSyncing, updateWallet } = useRetailerStore();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("5000");
  const [loading, setLoading] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [walletTxns, setWalletTxns] = useState<WalletTxn[]>([]);
  const [settlementLogs, setSettlementLogs] = useState<SettlementLog[]>([]);
  const [todaysCredit, setTodaysCredit] = useState<number>(0.0);
  const [todaysDebit, setTodaysDebit] = useState<number>(0.0);

  useEffect(() => {
    const fetchTransactionsAndMetrics = async () => {
      try {
        const activeId = getActiveRetailerId();
        const q = new URLSearchParams({ limit: "20" });
        if (activeId) q.append("retailer_id", activeId);

        // Fetch Payout Grid Data
        const res = await fetch(`/api/v1/payout/reports/grid?${q.toString()}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const mapped: WalletTxn[] = (data.items || []).map((it: any) => ({
            id: it.transaction_number || it.transaction_id || `TXN-${it.id}`,
            date: it.initiated_at || it.created_at || "—",
            particulars: `${it.payment_mode || "PAYOUT"} Transfer (${it.beneficiary_name || it.customer_name || "Merchant"})`,
            type: "DEBIT",
            amount: Number(it.transfer_amount || 0),
            balanceAfter: Number(it.wallet_after ?? it.wallet_before ?? 0),
            utr: it.bank_reference || it.utr_number || "—",
            status: it.status === "SUCCESS" ? "SUCCESS" : (it.status === "PENDING" ? "PENDING" : "FAILED"),
          }));
          setWalletTxns(mapped);
        } else {
          setWalletTxns([]);
        }

        // Fetch Today's Metrics
        const sRes = await fetch(`/api/v1/payout/reports/summary?${q.toString()}`, { credentials: "include" });
        if (sRes.ok) {
          const sData = await sRes.json();
          setTodaysDebit(Number(sData.todays_wallet_debit || 0));
        }

        const lRes = await fetch(`/api/v1/payout/reports/ledger/summary?${q.toString()}`, { credentials: "include" });
        if (lRes.ok) {
          const lData = await lRes.json();
          setTodaysCredit(Number(lData.todays_credit || 0));
          if (!sRes.ok) {
            setTodaysDebit(Number(lData.todays_debit || 0));
          }
        }
      } catch {
        setWalletTxns([]);
      }
    };
    fetchTransactionsAndMetrics();
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast(`${label} copied to clipboard!`);
    setTimeout(() => setCopyToast(null), 2000);
  };

  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const numericAmt = parseFloat(topUpAmount) || 0;
      updateWallet({ mainBalance: wallet.mainBalance + numericAmt });
      setTopUpSuccess(true);
      setTimeout(() => {
        setTopUpOpen(false);
        setTopUpSuccess(false);
      }, 1200);
    }, 1000);
  };

  const filteredTxns = walletTxns.filter((txn) => {
    const matchesSearch = txn.id.toLowerCase().includes(searchTerm.toLowerCase()) || txn.particulars.toLowerCase().includes(searchTerm.toLowerCase()) || txn.utr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "ALL" || txn.type === filterType;
    return matchesSearch && matchesType;
  });

  const trendData = [
    { day: "Mon", balance: Math.max(0, wallet.mainBalance - 500) },
    { day: "Tue", balance: Math.max(0, wallet.mainBalance - 350) },
    { day: "Wed", balance: Math.max(0, wallet.mainBalance - 200) },
    { day: "Thu", balance: Math.max(0, wallet.mainBalance - 100) },
    { day: "Fri", balance: Math.max(0, wallet.mainBalance - 50) },
    { day: "Sat", balance: wallet.mainBalance },
    { day: "Sun", balance: wallet.mainBalance },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "24px", pb: 4 }}>

      {/* Toast Notification */}
      {copyToast && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 3, py: 0.5, fontSize: "13px" }}>
          {copyToast}
        </Alert>
      )}

      {/* ── 1. WALLET CARDS (Reduced Height 145px–155px) ───────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: "20px" }}>

        {/* Main Wallet Card: Dark Navy #1E3A8A, Gold Amount #FFD54F */}
        <Paper
          elevation={0}
          sx={{
            p: "18px 24px",
            borderRadius: "20px",
            backgroundColor: "#1E3A8A",
            color: "#FFFFFF",
            boxShadow: "0 4px 20px rgba(30, 58, 138, 0.18)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: 155,
            minHeight: 155,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box sx={{ position: "absolute", top: -20, right: -20, width: 110, height: 110, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)" }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
            <Box>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "13px" }}>
                Main Agent Wallet Balance
              </Typography>
              <Typography variant="h4" sx={{ color: "#FFD54F", fontWeight: 800, fontFamily: "monospace", mt: 0.5, fontSize: "32px", lineHeight: 1.1 }}>
                ₹{wallet.mainBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            </Box>

            <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: "rgba(255, 213, 79, 0.20)", border: "1px solid rgba(255, 213, 79, 0.40)" }}>
              <AccountBalanceWalletIcon sx={{ color: "#FFD54F", fontSize: 24 }} />
            </Box>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.70)", fontWeight: 500, fontSize: "12px" }}>
              Available for DMT, AEPS, BBPS & Recharge operations.
            </Typography>
            <Button
              size="small"
              onClick={() => setTopUpOpen(true)}
              sx={{ color: "#FFD54F", fontWeight: 800, fontSize: "12px", textTransform: "none", p: 0, minWidth: 0 }}
            >
              + Add Funds
            </Button>
          </Box>
        </Paper>

        {/* Commission Wallet Card: Deep Green #166534, White Amount #FFFFFF */}
        <Paper
          elevation={0}
          sx={{
            p: "18px 24px",
            borderRadius: "20px",
            backgroundColor: "#166534",
            color: "#FFFFFF",
            boxShadow: "0 4px 20px rgba(22, 101, 52, 0.18)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: 155,
            minHeight: 155,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box sx={{ position: "absolute", top: -20, right: -20, width: 110, height: 110, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)" }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
            <Box>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "13px" }}>
                Commission & Margin Wallet
              </Typography>
              <Typography variant="h4" sx={{ color: "#FFFFFF", fontWeight: 800, fontFamily: "monospace", mt: 0.5, fontSize: "32px", lineHeight: 1.1 }}>
                ₹{wallet.commissionBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            </Box>

            <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: "rgba(255, 213, 79, 0.20)", border: "1px solid rgba(255, 213, 79, 0.40)" }}>
              <WorkspacePremiumIcon sx={{ color: "#FFD54F", fontSize: 24 }} />
            </Box>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 500, fontSize: "12px" }}>
              Accumulated margins auto-credited per transaction.
            </Typography>
            <Button
              component={Link}
              href="/retailer/commission"
              size="small"
              sx={{ color: "#FFD54F", fontWeight: 800, fontSize: "12px", textTransform: "none", p: 0, minWidth: 0 }}
            >
              View Slabs
            </Button>
          </Box>
        </Paper>

      </Box>

      {/* ── 2. QUICK ACTIONS SECTION ─────────────────────────────────── */}
      <Box>
        <Typography variant="caption" sx={{ fontSize: "12px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", mb: 1.5, display: "block" }}>
          Quick Wallet Actions
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(6, 1fr)" }, gap: "16px" }}>
          
          <Paper
            onClick={() => setTopUpOpen(true)}
            elevation={0}
            sx={{
              p: "16px",
              borderRadius: "16px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": { borderColor: "#2563EB", backgroundColor: "#EFF6FF", transform: "translateY(-2px)" },
            }}
          >
            <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: "#EFF6FF", color: "#2563EB" }}>
              <AddIcon sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13px", color: "#111827", textAlign: "center" }}>
              Add Money
            </Typography>
          </Paper>

          <Paper
            component={Link}
            href="/retailer/topup-request"
            elevation={0}
            sx={{
              p: "16px",
              borderRadius: "16px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": { borderColor: "#F59E0B", backgroundColor: "#FEF3C7", transform: "translateY(-2px)" },
            }}
          >
            <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: "#FEF3C7", color: "#D97706" }}>
              <CloudUploadIcon sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13px", color: "#111827", textAlign: "center" }}>
              Topup Request
            </Typography>
          </Paper>

          <Paper
            component={Link}
            href="/retailer/wallet-statement"
            elevation={0}
            sx={{
              p: "16px",
              borderRadius: "16px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": { borderColor: "#2563EB", backgroundColor: "#EFF6FF", transform: "translateY(-2px)" },
            }}
          >
            <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: "#F3E8FF", color: "#7C3AED" }}>
              <ReceiptLongIcon sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13px", color: "#111827", textAlign: "center" }}>
              Wallet Statement
            </Typography>
          </Paper>

          <Paper
            component={Link}
            href="/retailer/settlement"
            elevation={0}
            sx={{
              p: "16px",
              borderRadius: "16px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": { borderColor: "#2563EB", backgroundColor: "#EFF6FF", transform: "translateY(-2px)" },
            }}
          >
            <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: "#DCFCE7", color: "#16A34A" }}>
              <AccountBalanceIcon sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13px", color: "#111827", textAlign: "center" }}>
              Request Settlement
            </Typography>
          </Paper>

          <Paper
            onClick={() => {
              const el = document.getElementById("virtual-account-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            elevation={0}
            sx={{
              p: "16px",
              borderRadius: "16px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": { borderColor: "#2563EB", backgroundColor: "#EFF6FF", transform: "translateY(-2px)" },
            }}
          >
            <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: "#FEF3C7", color: "#D97706" }}>
              <QrCode2Icon sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13px", color: "#111827", textAlign: "center" }}>
              Virtual Account
            </Typography>
          </Paper>

          <Paper
            component={Link}
            href="/retailer/settlement"
            elevation={0}
            sx={{
              p: "16px",
              borderRadius: "16px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": { borderColor: "#2563EB", backgroundColor: "#EFF6FF", transform: "translateY(-2px)" },
            }}
          >
            <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: "#E0F2FE", color: "#0EA5E9" }}>
              <SendIcon sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13px", color: "#111827", textAlign: "center" }}>
              Transfer To Bank
            </Typography>
          </Paper>

          <Paper
            component={Link}
            href="/retailer/wallet-statement"
            elevation={0}
            sx={{
              p: "16px",
              borderRadius: "16px",
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              textDecoration: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": { borderColor: "#2563EB", backgroundColor: "#EFF6FF", transform: "translateY(-2px)" },
            }}
          >
            <Box sx={{ p: 1.25, borderRadius: 2.5, backgroundColor: "#FEE2E2", color: "#DC2626" }}>
              <DownloadIcon sx={{ fontSize: 22 }} />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "13px", color: "#111827", textAlign: "center" }}>
              Download Statement
            </Typography>
          </Paper>

        </Box>
      </Box>

      {/* ── 3. WALLET STATISTICS BAR ─────────────────────────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: "16px" }}>
        
        <Paper elevation={0} sx={{ p: "16px 20px", borderRadius: "16px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700, textTransform: "uppercase", fontSize: "12px" }}>
            Total Credits Today
          </Typography>
          <Typography variant="h5" sx={{ color: "#16A34A", fontWeight: 800, fontFamily: "monospace", mt: 0.5, fontSize: "22px" }}>
            +₹{todaysCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: "16px 20px", borderRadius: "16px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700, textTransform: "uppercase", fontSize: "12px" }}>
            Total Debits Today
          </Typography>
          <Typography variant="h5" sx={{ color: "#DC2626", fontWeight: 800, fontFamily: "monospace", mt: 0.5, fontSize: "22px" }}>
            -₹{todaysDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: "16px 20px", borderRadius: "16px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700, textTransform: "uppercase", fontSize: "12px" }}>
            Available Balance
          </Typography>
          <Typography variant="h5" sx={{ color: "#2563EB", fontWeight: 800, fontFamily: "monospace", mt: 0.5, fontSize: "22px" }}>
            ₹{wallet.mainBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ p: "16px 20px", borderRadius: "16px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700, textTransform: "uppercase", fontSize: "12px" }}>
            Pending Settlement
          </Typography>
          <Typography variant="h5" sx={{ color: "#7C3AED", fontWeight: 800, fontFamily: "monospace", mt: 0.5, fontSize: "22px" }}>
            ₹{wallet.todaySettlement.toLocaleString("en-IN")}
          </Typography>
        </Paper>

      </Box>

      {/* ── 4. ANALYTICS: 7-DAY TREND & MONTHLY COMMISSION ───────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: "20px" }}>

        {/* 7-Day Balance Trend Visualization */}
        <Paper elevation={0} sx={{ p: "20px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#111827", mb: 2, fontSize: "15px" }}>
            7-Day Wallet Balance Trend
          </Typography>
          <Box sx={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 140, pt: 2, pb: 1, px: 1 }}>
            {trendData.map((t) => {
              const maxVal = Math.max(wallet.mainBalance * 1.1, 1000);
              const heightPercent = Math.min(100, Math.max(20, Math.round((t.balance / maxVal) * 100)));
              return (
                <Box key={t.day} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flex: 1 }}>
                  <Typography variant="caption" sx={{ fontSize: "10px", fontWeight: 700, color: "#6B7280" }}>
                    ₹{(t.balance / 1000).toFixed(1)}k
                  </Typography>
                  <Box
                    sx={{
                      width: 24,
                      height: `${heightPercent}%`,
                      maxHeight: 90,
                      minHeight: 20,
                      backgroundColor: "#2563EB",
                      borderRadius: "6px 6px 0 0",
                      transition: "all 0.3s ease",
                      "&:hover": { backgroundColor: "#1D4ED8" },
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 700, color: "#374151" }}>
                    {t.day}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Paper>

        {/* Monthly Commission Breakdown */}
        <Paper elevation={0} sx={{ p: "20px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#111827", mb: 2, fontSize: "15px" }}>
            Commission Share By Financial Service
          </Typography>
          <Stack spacing={1.75}>
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#374151", fontSize: "13px" }}>Domestic Money Transfer (DMT)</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#2563EB", fontSize: "13px" }}>42% (₹16,149)</Typography>
              </Box>
              <LinearProgress variant="determinate" value={42} sx={{ height: 8, borderRadius: 4, backgroundColor: "#EFF6FF", "& .MuiLinearProgress-bar": { backgroundColor: "#2563EB" } }} />
            </Box>

            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#374151", fontSize: "13px" }}>Aadhaar ATM (AEPS)</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#16A34A", fontSize: "13px" }}>28% (₹10,766)</Typography>
              </Box>
              <LinearProgress variant="determinate" value={28} sx={{ height: 8, borderRadius: 4, backgroundColor: "#DCFCE7", "& .MuiLinearProgress-bar": { backgroundColor: "#16A34A" } }} />
            </Box>

            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#374151", fontSize: "13px" }}>Mobile & DTH Recharge</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#D97706", fontSize: "13px" }}>18% (₹6,921)</Typography>
              </Box>
              <LinearProgress variant="determinate" value={18} sx={{ height: 8, borderRadius: 4, backgroundColor: "#FEF3C7", "& .MuiLinearProgress-bar": { backgroundColor: "#D97706" } }} />
            </Box>

            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: "#374151", fontSize: "13px" }}>BBPS Utility Bill Payment</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#7C3AED", fontSize: "13px" }}>12% (₹4,614)</Typography>
              </Box>
              <LinearProgress variant="determinate" value={12} sx={{ height: 8, borderRadius: 4, backgroundColor: "#F3E8FF", "& .MuiLinearProgress-bar": { backgroundColor: "#7C3AED" } }} />
            </Box>
          </Stack>
        </Paper>

      </Box>

      {/* ── 5. VIRTUAL ACCOUNT & AUTO-TOPUP QR SECTION ───────────────── */}
      <Paper
        id="virtual-account-section"
        elevation={0}
        sx={{
          p: "24px",
          borderRadius: "20px",
          backgroundColor: "#FFFFFF",
          border: "1px solid #E5E7EB",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
      >
        <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#111827", mb: 2 }}>
          Dedicated Virtual Account & UPI QR for Instant Auto Top-Up
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" }, gap: 3, alignItems: "center" }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack spacing={2}>
              <Alert severity="info" sx={{ borderRadius: 3, fontSize: "13px" }}>
                Funds transferred to this dedicated virtual account via NEFT / RTGS / IMPS / UPI are <strong>credited instantly 24x7 to your main wallet</strong> without any manual approval!
              </Alert>

              <Box sx={{ p: 2, borderRadius: 3, backgroundColor: "#F8FAFC", border: "1px solid #E5E7EB" }}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600 }}>Bank Name</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#111827" }}>HDFC Bank Ltd (Pay2Pay Node)</Typography>
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600 }}>Virtual Account Number</Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#2563EB" }}>
                        {`PY2P${outlet.code?.replace(/[^a-zA-Z0-9]/g, "") || "MERCHANT"}`}
                      </Typography>
                      <IconButton size="small" onClick={() => handleCopy(`PY2P${outlet.code?.replace(/[^a-zA-Z0-9]/g, "") || "MERCHANT"}`, "Account Number")}>
                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600 }}>IFSC Code</Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#111827" }}>HDFC0000128</Typography>
                      <IconButton size="small" onClick={() => handleCopy("HDFC0000128", "IFSC Code")}>
                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600 }}>Virtual UPI VPA ID</Typography>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#16A34A" }}>
                        {`pay2pay.${(outlet.code || "merchant").toLowerCase().replace(/[^a-z0-9]/g, "")}@hdfcbank`}
                      </Typography>
                      <IconButton size="small" onClick={() => handleCopy(`pay2pay.${(outlet.code || "merchant").toLowerCase().replace(/[^a-z0-9]/g, "")}@hdfcbank`, "UPI VPA ID")}>
                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Box sx={{ textAlign: "center", display: "flex", justifyContent: "center" }}>
            <ScannableQrCode
              value={`upi://pay?pa=pay2pay.${(outlet.code || "merchant").toLowerCase().replace(/[^a-z0-9]/g, "")}@hdfcbank&pn=${encodeURIComponent(outlet.name || "Pay2Pay Retailer Store")}&mc=0000&tr=WAL9001&tn=Wallet%20Auto%20TopUp&cu=INR`}
              size={170}
              label="Scan with GPay / PhonePe / Paytm"
              subLabel="Zero Fee Instant Auto Wallet Credit"
            />
          </Box>
        </Box>
      </Paper>

      {/* ── 6. WALLET TRANSACTION HISTORY TABLE ─────────────────────── */}
      <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#111827" }}>
              Recent Wallet Transactions
            </Typography>
            <Typography variant="caption" sx={{ color: "#6B7280", fontSize: "13px" }}>
              Live audit ledger of wallet credits & debits
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <TextField
              placeholder="Search Txn ID, Particulars, UTR…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ width: 220 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#9CA3AF", fontSize: 18 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              size="small"
              sx={{ width: 130 }}
            >
              <MenuItem value="ALL">All Types</MenuItem>
              <MenuItem value="CREDIT">Credits</MenuItem>
              <MenuItem value="DEBIT">Debits</MenuItem>
            </TextField>

            <Button
              component={Link}
              href="/retailer/wallet-statement"
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
              sx={{ borderRadius: "10px", fontWeight: 700, height: 36, borderColor: "#E5E7EB", color: "#374151" }}
            >
              Full Statement
            </Button>
          </Stack>
        </Box>

        <Table>
          <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Txn ID / UTR</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Particulars</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Amount</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Balance After</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTxns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6, color: "#64748B" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    No wallet transactions found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredTxns.map((txn) => (
                <TableRow key={txn.id} hover>
                  <TableCell sx={{ fontSize: "12px", color: "#4B5563" }}>{txn.date}</TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "#2563EB", fontFamily: "monospace", display: "block" }}>
                      {txn.id}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#6B7280", fontFamily: "monospace", fontSize: "11px" }}>
                      {txn.utr}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "#111827" }}>{txn.particulars}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontFamily: "monospace", color: txn.type === "CREDIT" ? "#16A34A" : "#DC2626" }}>
                    {txn.type === "CREDIT" ? "+" : "-"}₹{txn.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#111827" }}>
                    ₹{txn.balanceAfter.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="center">
                    <M3StatusChip status={txn.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* ── 7. SETTLEMENT HISTORY SECTION ───────────────────────────── */}
      <Paper elevation={0} sx={{ p: "24px", borderRadius: "20px", border: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: "18px", fontWeight: 800, color: "#111827" }}>
              Settlement History & Bank Transfers
            </Typography>
            <Typography variant="caption" sx={{ color: "#6B7280", fontSize: "13px" }}>
              Move To Bank settlement requests and bank UTR status
            </Typography>
          </Box>
          <Button
            component={Link}
            href="/retailer/settlement"
            size="small"
            variant="contained"
            sx={{ borderRadius: "10px", fontWeight: 700, height: 36, backgroundColor: "#2563EB" }}
          >
            New Settlement Request
          </Button>
        </Box>

        <Table>
          <TableHead sx={{ backgroundColor: "#F8FAFC" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Settlement ID</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Request Date</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Destination Account</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="right">Amount</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Mode</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="center">Status</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Bank UTR</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {settlementLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#64748B" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    No settlement records found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              settlementLogs.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontWeight: 800, color: "#2563EB", fontFamily: "monospace" }}>{s.id}</TableCell>
                  <TableCell sx={{ fontSize: "12px" }}>{s.date}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{s.bankAccount}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontFamily: "monospace" }}>₹{s.amount.toLocaleString("en-IN")}</TableCell>
                  <TableCell><Chip label={s.mode} size="small" sx={{ fontWeight: 800, height: 20 }} /></TableCell>
                  <TableCell align="center"><M3StatusChip status={s.status} /></TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "12px" }}>{s.utr}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Top Up Modal */}
      <Dialog open={topUpOpen} onClose={() => setTopUpOpen(false)} slotProps={{ paper: { sx: { borderRadius: "20px", width: 400, p: 1 } } }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Add Funds to Main Wallet</Typography>
          <form onSubmit={handleTopUpSubmit}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Top-Up Amount (₹)"
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                required
                size="small"
                sx={{ "& .MuiInputBase-input": { fontSize: "18px", fontWeight: 800, fontFamily: "monospace" } }}
              />

              {topUpSuccess && (
                <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2 }}>
                  Wallet Credited Successfully!
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                fullWidth
                sx={{ height: 44, borderRadius: "12px", fontWeight: 800, backgroundColor: "#2563EB" }}
              >
                {loading ? "Processing Top-Up…" : `Proceed to Gateway ₹${parseFloat(topUpAmount || "0").toLocaleString("en-IN")}`}
              </Button>
            </Stack>
          </form>
        </Box>
      </Dialog>

    </Box>
  );
}
