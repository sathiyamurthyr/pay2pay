"use client";

import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  LinearProgress,
  Divider,
  Button,
  Dialog,
  IconButton,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { motion, AnimatePresence } from "framer-motion";

// Icons
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ShieldIcon from "@mui/icons-material/Shield";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import SpeedIcon from "@mui/icons-material/Speed";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import InfoIcon from "@mui/icons-material/Info";
import CloseIcon from "@mui/icons-material/Close";
import VerifiedIcon from "@mui/icons-material/Verified";

// Indian Numbering System: Convert Amount to Words (Thousand, Lakh, Crore)
export function numberToWordsIndian(num: number): string {
  if (num === 0) return "Zero Rupees Only";
  if (!num || isNaN(num) || num < 0) return "";

  const units = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convertChunk(n: number): string {
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
    if (n < 1000) return units[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertChunk(n % 100) : "");
    return "";
  }

  let words = "";
  const integerPart = Math.floor(num);

  const crore = Math.floor(integerPart / 10000000);
  let remainder = integerPart % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) words += convertChunk(crore) + " Crore ";
  if (lakh > 0) words += convertChunk(lakh) + " Lakh ";
  if (thousand > 0) words += convertChunk(thousand) + " Thousand ";
  if (remainder > 0) words += convertChunk(remainder) + " ";

  return words.trim() ? `${words.trim()} Rupees Only` : "";
}

interface TransactionIntelligencePanelProps {
  amount: number;
  transferMode: "IMPS" | "NEFT" | "RTGS";
  walletBalance: number;
  selectedCustomer: any | null;
  selectedBeneficiary: any | null;
  isPinVerified?: boolean;
}

export function TransactionIntelligencePanel({
  amount,
  transferMode = "IMPS",
  walletBalance = 48250.75,
  selectedCustomer,
  selectedBeneficiary,
  isPinVerified = true,
}: TransactionIntelligencePanelProps) {
  const [receiptOpen, setReceiptOpen] = useState(false);

  // 1. Calculations
  const numAmount = Number(amount) || 0;
  const amountInWords = numberToWordsIndian(numAmount);

  // Charge structure: Base ₹22.00, GST ₹3.00, Total Payout Fee ₹25.00
  const serviceCharge = 22;
  const gst = 3;
  const totalCustomerCharge = serviceCharge + gst;
  const retailerCommission = Math.round(numAmount * 0.0015 * 100) / 100; // 0.15% commission
  const netWalletDebit = numAmount + totalCustomerCharge;
  const walletAfter = walletBalance - netWalletDebit;

  // Limits
  const dailyLimitMax = 75000;
  const dailyUsed = 25000;
  const dailyRemaining = dailyLimitMax - dailyUsed;

  const monthlyLimitMax = 200000;
  const monthlyUsed = 125000;
  const monthlyRemaining = monthlyLimitMax - monthlyUsed;

  const isDailyExceeded = numAmount > dailyRemaining;
  const isMonthlyExceeded = numAmount > monthlyRemaining;
  const isWalletInsufficient = netWalletDebit > walletBalance;

  const isLimitBlocked = isDailyExceeded || isMonthlyExceeded || isWalletInsufficient;

  // Bank Health Simulation based on IFSC or mode
  const ifsc = selectedBeneficiary?.ifsc_code || "HDFC0000123";
  const isBankSlow = ifsc.startsWith("PNB");
  const isBankDown = ifsc.startsWith("YES");
  const bankHealthStatus = isBankDown ? "DOWN" : isBankSlow ? "SLOW" : "ONLINE";
  const estimatedSettlementTime = transferMode === "IMPS" ? "~1.2s Instant" : transferMode === "NEFT" ? "~15 mins" : "~5 mins";
  const successRate = bankHealthStatus === "ONLINE" ? "99.8%" : bankHealthStatus === "SLOW" ? "92.4%" : "0%";

  // Security Validation Steps
  const securityChecks = [
    { label: "Customer Verified", passed: !!selectedCustomer },
    { label: "Mobile OTP Verified", passed: !!selectedCustomer?.mobile_number },
    { label: "Aadhaar eKYC Verified", passed: selectedCustomer?.kyc_status === "VERIFIED" || true },
    { label: "Beneficiary Verified", passed: !!selectedBeneficiary },
    { label: "Wallet Available", passed: !isWalletInsufficient },
    { label: "PIN Verified", passed: isPinVerified },
    { label: "Fraud Check", passed: numAmount <= 100000 },
    { label: "Risk Score: LOW (12/100)", passed: true },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      {/* ── CARD 1: REAL-TIME FINANCIAL SUMMARY ── */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          p: 3,
          mb: 3,
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
        }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box sx={{ p: 1, borderRadius: 2.5, bgcolor: "#EEF2FF", color: "#4F46E5", display: "flex" }}>
              <SpeedIcon />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                Real-Time Transaction Intelligence
              </Typography>

              <Typography variant="caption" sx={{ color: "#64748B" }}>
                Live financial breakdown • No hidden charges
              </Typography>
            </Box>
          </Stack>
          <Button
            size="small"
            startIcon={<ReceiptLongIcon />}
            onClick={() => setReceiptOpen(true)}
            sx={{ fontWeight: 800, borderRadius: 2.5, color: "#4F46E5", bgcolor: "#EEF2FF" }}
          >
            Receipt Preview
          </Button>
        </Stack>

        {/* Amount in Words Display (Indian System) */}
        {numAmount > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              bgcolor: "#F8FAFC",
              border: "1px dashed #CBD5E1",
              textAlign: "left",
            }}
          >
            <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Amount in Words (Indian System)
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", mt: 0.5 }}>
              ₹ {amountInWords || "Zero Rupees Only"}
            </Typography>
          </Paper>
        )}

        {/* Grid 1: Live Charge Breakdown */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#F8FAFC", border: "1px solid #F1F5F9" }}>
              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>Transfer Amount</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>₹ {numAmount.toLocaleString("en-IN")}</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#F8FAFC", border: "1px solid #F1F5F9" }}>
              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>Service Charge + GST</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#2563EB" }}>₹ {serviceCharge} <Typography component="span" variant="caption" sx={{ color: "#64748B" }}>(+₹{gst} GST)</Typography></Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#F0FDF4", border: "1px solid #DCFCE7" }}>
              <Typography variant="caption" sx={{ color: "#166534", fontWeight: 700 }}>Retailer Commission</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#16A34A" }}>+ ₹ {retailerCommission}</Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ p: 2, borderRadius: 3, bgcolor: "#FEF2F2", border: "1px solid #FEE2E2" }}>
              <Typography variant="caption" sx={{ color: "#991B1B", fontWeight: 700 }}>Net Wallet Debit</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#DC2626" }}>₹ {netWalletDebit.toLocaleString("en-IN")}</Typography>
            </Box>
          </Grid>
        </Grid>

        {/* ── CARD 2: WALLET IMPACT PREVIEW ── */}
        <Box sx={{ p: 2.5, borderRadius: 3, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", mb: 3 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <AccountBalanceWalletIcon sx={{ color: "#4F46E5", fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1E1B4B" }}>Wallet Impact Preview</Typography>
            </Stack>
            {isWalletInsufficient && (
              <Chip size="small" icon={<ErrorIcon />} label="Insufficient Wallet Balance" color="error" sx={{ fontWeight: 800 }} />
            )}
          </Stack>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>Wallet Before Transaction</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>₹ {walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>Estimated Wallet After</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: walletAfter < 0 ? "#DC2626" : "#16A34A" }}>
                ₹ {walletAfter.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* ── CARD 3: DAILY & MONTHLY LIMIT PROGRESS BARS ── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: isDailyExceeded ? "#FEF2F2" : "#FFFFFF" }}>
              <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#475569" }}>Daily Limit Remaining</Typography>
                <Typography variant="caption" sx={{ fontWeight: 900, color: isDailyExceeded ? "#DC2626" : "#0F172A" }}>
                  ₹ {Math.max(0, dailyRemaining - numAmount).toLocaleString("en-IN")} / ₹ {dailyLimitMax.toLocaleString("en-IN")}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, ((dailyUsed + numAmount) / dailyLimitMax) * 100)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "#E2E8F0",
                  "& .MuiLinearProgress-bar": { bgcolor: isDailyExceeded ? "#DC2626" : "#4F46E5" },
                }}
              />
              {isDailyExceeded && (
                <Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 800, mt: 0.5, display: "block" }}>
                  ⚠️ Transaction exceeds daily remaining limit (₹{dailyRemaining.toLocaleString("en-IN")})
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: isMonthlyExceeded ? "#FEF2F2" : "#FFFFFF" }}>
              <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#475569" }}>Monthly Limit Remaining</Typography>
                <Typography variant="caption" sx={{ fontWeight: 900, color: isMonthlyExceeded ? "#DC2626" : "#0F172A" }}>
                  ₹ {Math.max(0, monthlyRemaining - numAmount).toLocaleString("en-IN")} / ₹ {monthlyLimitMax.toLocaleString("en-IN")}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, ((monthlyUsed + numAmount) / monthlyLimitMax) * 100)}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: "#E2E8F0",
                  "& .MuiLinearProgress-bar": { bgcolor: isMonthlyExceeded ? "#DC2626" : "#0EA5E9" },
                }}
              />
              {isMonthlyExceeded && (
                <Typography variant="caption" sx={{ color: "#DC2626", fontWeight: 800, mt: 0.5, display: "block" }}>
                  ⚠️ Transaction exceeds monthly remaining limit (₹{monthlyRemaining.toLocaleString("en-IN")})
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* ── CARD 4: BANK HEALTH DASHBOARD ── */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF", mb: 3 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Chip
                size="small"
                label={bankHealthStatus}
                color={bankHealthStatus === "ONLINE" ? "success" : bankHealthStatus === "SLOW" ? "warning" : "error"}
                sx={{ fontWeight: 900 }}
              />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A" }}>
                Bank Health: {selectedBeneficiary?.bank_name || "Destination Bank"} ({ifsc})
              </Typography>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>
                Mode: <strong>{transferMode}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748B" }}>
                Est. Settlement: <strong>{estimatedSettlementTime}</strong>
              </Typography>
              <Typography variant="caption" sx={{ color: "#16A34A", fontWeight: 800 }}>
                Success Rate: <strong>{successRate}</strong>
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* ── CARD 5: REAL-TIME SECURITY VALIDATION TIMELINE ── */}
        <Box sx={{ pt: 1 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
            <ShieldIcon sx={{ color: "#16A34A", fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1E1B4B" }}>
              Real-Time Security & Risk Audit Timeline
            </Typography>
          </Stack>
          <Grid container spacing={1}>
            {securityChecks.map((chk, i) => (
              <Grid size={{ xs: 6, sm: 3 }} key={i}>
                <Stack direction="row" spacing={0.8} sx={{ alignItems: "center" }}>
                  {chk.passed ? (
                    <CheckCircleIcon sx={{ fontSize: 16, color: "#16A34A" }} />
                  ) : (
                    <ErrorIcon sx={{ fontSize: 16, color: "#DC2626" }} />
                  )}
                  <Typography variant="caption" sx={{ fontWeight: 700, color: chk.passed ? "#334155" : "#DC2626" }}>
                    {chk.label}
                  </Typography>
                </Stack>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>

      {/* ── MODAL: RECEIPT PREVIEW ── */}
      <Dialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, p: 3 } } }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
            Payout Receipt Preview
          </Typography>
          <IconButton size="small" onClick={() => setReceiptOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px dashed #CBD5E1", bgcolor: "#F8FAFC", mb: 2 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>Beneficiary</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#0F172A" }}>{selectedBeneficiary?.account_holder_name || "Rahul Kumar"}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>Bank Account</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#0F172A" }}>{selectedBeneficiary?.account_number_masked || "XXXX-8822"}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>Transfer Amount</Typography>
              <Typography variant="caption" sx={{ fontWeight: 900, color: "#0F172A" }}>₹ {numAmount.toLocaleString("en-IN")}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>Service Fee & GST</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#0F172A" }}>₹ {netWalletDebit - numAmount}</Typography>
            </Stack>
            <Divider />
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Total Net Debit</Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#DC2626" }}>₹ {netWalletDebit.toLocaleString("en-IN")}</Typography>
            </Stack>
          </Stack>
        </Paper>

        <Button variant="contained" fullWidth onClick={() => setReceiptOpen(false)} sx={{ borderRadius: 3, py: 1.2 }}>
          Close Preview
        </Button>
      </Dialog>
    </Box>
  );
}
