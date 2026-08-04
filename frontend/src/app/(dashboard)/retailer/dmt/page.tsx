"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Alert,
  Dialog,
  Divider,
  IconButton,
  Card,
  CardContent,
  LinearProgress,
  Drawer,
  Avatar,
  Collapse,
  Grid,
  Autocomplete,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { motion } from "framer-motion";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorIcon from "@mui/icons-material/Error";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PrintIcon from "@mui/icons-material/Print";
import ShareIcon from "@mui/icons-material/Share";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SmsIcon from "@mui/icons-material/Sms";
import EmailIcon from "@mui/icons-material/Email";
import TelegramIcon from "@mui/icons-material/Telegram";
import ReplayIcon from "@mui/icons-material/Replay";
import SpeedIcon from "@mui/icons-material/Speed";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import ShieldIcon from "@mui/icons-material/Shield";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import AssessmentIcon from "@mui/icons-material/Assessment";

import { M3TextField, M3CurrencyInput } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { BeneficiarySummaryCard } from "@/components/payout/beneficiary-summary-card";
import { CustomerMasterSlideOver } from "@/components/master/customer-master-slide-over";
import { BeneficiaryMasterSlideOver } from "@/components/master/beneficiary-master-slide-over";
import { TransactionIntelligencePanel } from "@/components/payout/transaction-intelligence-panel";
import { notificationEngine } from "@/services/notification-engine";
import { NotificationSettingsDialog } from "@/components/payout/notification-settings-dialog";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";

// Custom Draggable Slide to Send Component
function SlideToSend({ onConfirm, disabled, label = "Slide to Execute Payout →" }: { onConfirm: () => void; disabled?: boolean; label?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderWidth, setSliderWidth] = useState(280);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      setSliderWidth(containerRef.current.clientWidth - 56);
    }
  }, []);

  const handleDragEnd = () => {
    if (disabled || unlocked) return;
    setUnlocked(true);
    onConfirm();
    setTimeout(() => {
      setUnlocked(false);
    }, 3000);
  };

  return (
    <Box
      ref={containerRef}
      onClick={handleDragEnd}
      sx={{
        position: "relative",
        height: 54,
        borderRadius: 27,
        backgroundColor: disabled ? "#E2E8F0" : unlocked ? "#16A34A" : "#1E1B4B",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 1,
        overflow: "hidden",
        userSelect: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background-color 0.3s ease",
        boxShadow: disabled ? "none" : "0 4px 14px rgba(30, 27, 75, 0.25)",
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 800,
          color: disabled ? "#94A3B8" : "#FFFFFF",
          letterSpacing: "0.5px",
          pointerEvents: "none",
          fontSize: "0.9rem",
        }}
      >
        {unlocked ? "✓ DISPATCHING PAYOUT..." : label}
      </Typography>

      {!disabled && (
        <Box
          sx={{
            position: "absolute",
            right: 8,
            width: 38,
            height: 38,
            borderRadius: "50%",
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {unlocked ? <CheckIcon sx={{ color: "#16A34A" }} /> : <ArrowForwardIcon sx={{ color: "#1E1B4B" }} />}
        </Box>
      )}
    </Box>
  );
}

// Interfaces
interface Customer {
  public_id: string;
  customer_number: string;
  full_name: string;
  mobile_number: string;
  kyc_status: string;
  monthly_limit: number;
  monthly_used: number;
  monthly_remaining: number;
  risk_score: number;
}

interface Beneficiary {
  beneficiary_id: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  is_verified: boolean;
  penny_drop_status: string;
}

export default function DmtPage() {
  const { wallet, updateWallet } = useRetailerStore();

  // Collapsible Card States
  const [customerExpanded, setCustomerExpanded] = useState(false);
  const [beneficiaryExpanded, setBeneficiaryExpanded] = useState(false);

  // Customer & Beneficiary Data
  const [searchQuery, setSearchQuery] = useState("9876543210");
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);

  // Transaction Memory Store (Preserves context across navigation & slide-over returns)
  const memoryStore = useTransactionMemoryStore();

  const [customerMasterSlideOverOpen, setCustomerMasterSlideOverOpen] = useState(false);
  const [beneficiaryMasterSlideOverOpen, setBeneficiaryMasterSlideOverOpen] = useState(false);

  // Restore transaction memory state if present
  useEffect(() => {
    if (memoryStore.selectedCustomer && !selectedCustomer) {
      setSelectedCustomer(memoryStore.selectedCustomer);
    }
    if (memoryStore.selectedBeneficiary && !selectedBeneficiary) {
      setSelectedBeneficiary(memoryStore.selectedBeneficiary);
    }
  }, [memoryStore.selectedCustomer, memoryStore.selectedBeneficiary]);

  // Bank Master Search & Dynamic IFSC Binding State
  const [bankMasterList, setBankMasterList] = useState<Array<{ bank_id: number; bank_name: string; ifsc: string; ifsc_prefix: string }>>([]);
  const [bankSearchLoading, setBankSearchLoading] = useState(false);
  const [selectedBankObj, setSelectedBankObj] = useState<{ bank_id: number; bank_name: string; ifsc: string; ifsc_prefix: string } | null>(null);

  useEffect(() => {
    if (beneficiaryMasterSlideOverOpen && bankMasterList.length === 0) {
      fetchBankMasterList();
    }
  }, [beneficiaryMasterSlideOverOpen]);

  const fetchBankMasterList = async (query?: string) => {
    setBankSearchLoading(true);
    const res = await retailerApi.getBankMasterList(query);
    setBankSearchLoading(false);
    if (res.status === "SUCCESS" && res.data) {
      setBankMasterList(res.data);
    }
  };

  // Amount & Transfer Mode
  const [amount, setAmount] = useState("10000");
  const [mode, setMode] = useState<"IMPS" | "NEFT">("IMPS");
  const [customerPin, setCustomerPin] = useState("1234");

  // Bank Health Status
  const [bankHealth, setBankHealth] = useState({
    status: "AVAILABLE",
    bank_name: "HDFC BANK",
    success_rate_pct: 99.4,
    estimated_delay_sec: 1.2,
    is_down: false,
  });

  // Processing & Success State
  const [processingOpen, setProcessingOpen] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [payoutReceipt, setPayoutReceipt] = useState<any | null>(null);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const [shareDrawerOpen, setShareDrawerOpen] = useState(false);
  const [copiedUtr, setCopiedUtr] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [payoutFailed, setPayoutFailed] = useState<any | null>(null);
  const [receiptDrawerOpen, setReceiptDrawerOpen] = useState(false);

  // Load initial customer
  useEffect(() => {
    handleCustomerSearch();
  }, []);

  const handleCustomerSearch = async () => {
    setSearchLoading(true);
    const res = await retailerApi.searchPayoutCustomer(searchQuery);
    setSearchLoading(false);
    if (res.status === "SUCCESS" && res.data.length > 0) {
      const cust = res.data[0];
      setSelectedCustomer(cust);
      fetchBeneficiaries(cust.public_id);
    }
  };

  const fetchBeneficiaries = async (custPublicId: string) => {
    const res = await retailerApi.getBeneficiaries(custPublicId);
    if (res.status === "SUCCESS" && res.data.length > 0) {
      setBeneficiaries(res.data);
      setSelectedBeneficiary(res.data[0]);
    }
  };

  // Financial Calculations
  const numAmount = parseFloat(amount) || 0;
  const charges = mode === "IMPS" ? (numAmount <= 25000 ? 10.0 : 15.0) : 3.0;
  const gst = round2(charges * 0.18);
  const totalFee = charges + gst;
  const commission = round2(numAmount * 0.0015);
  const netDebit = numAmount + totalFee;
  const walletBefore = wallet.mainBalance;
  const walletAfter = walletBefore - netDebit + commission;
  const dailyLimitRemaining = Math.max(0, 50000 - numAmount);
  const monthlyLimitRemaining = selectedCustomer ? Math.max(0, selectedCustomer.monthly_remaining - numAmount) : 75000;

  function round2(val: number) {
    return Math.round(val * 100) / 100;
  }

  // Handle Slide to Send Execution
  const handleExecutePayout = async () => {
    if (!selectedCustomer || !selectedBeneficiary || numAmount <= 0) return;

    const pinRes = await retailerApi.verifyCustomerPin(selectedCustomer.public_id, customerPin);
    if (pinRes.status !== "SUCCESS") {
      alert("Invalid Customer PIN!");
      return;
    }

    setProcessingOpen(true);
    setProcessingStep(1);

    await new Promise((r) => setTimeout(r, 500));
    setProcessingStep(2);

    await new Promise((r) => setTimeout(r, 600));
    setProcessingStep(3);

    const res = await retailerApi.executePayout({
      customer_id: selectedCustomer.public_id,
      beneficiary_id: selectedBeneficiary.beneficiary_id,
      amount: numAmount,
      transfer_mode: mode,
      customer_pin: customerPin,
      wallet_balance: walletBefore,
    });

    await new Promise((r) => setTimeout(r, 600));
    setProcessingStep(4);

    await new Promise((r) => setTimeout(r, 500));
    setProcessingStep(5);

    if (res.status === "SUCCESS") {
      setPayoutReceipt(res.data);
      updateWallet({
        mainBalance: res.data.wallet_after,
        todayMargin: wallet.todayMargin + res.data.commission,
      });

      setTimeout(() => {
        setProcessingOpen(false);
      }, 700);
    } else {
      setProcessingOpen(false);
      alert(res.detail || "Payout failed");
    }
  };

  const copyUtrToClipboard = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(true);
    setTimeout(() => setCopiedUtr(false), 2500);
  };

  // Validation Flags
  const isCustomerValid = !!selectedCustomer;
  const isMobileOtpValid = true;
  const isAadhaarValid = true;
  const isBeneficiaryValid = !!selectedBeneficiary;
  const isWalletValid = walletBefore >= netDebit;
  const isLimitValid = monthlyLimitRemaining >= 0;
  const isPinValid = customerPin.length >= 4;
  const isBankHealthValid = !bankHealth.is_down;
  const isAllValid = isCustomerValid && isBeneficiaryValid && isWalletValid && isLimitValid && isPinValid && isBankHealthValid;

  return (
    <Box sx={{ pb: 14, maxWidth: 1240, mx: "auto" }}>
      {/* ── 1. COMPACT 72PX TRANSACTION HEADER ── */}
      <Paper
        elevation={0}
        sx={{
          height: 72,
          px: 3,
          mb: 3,
          borderRadius: 3.5,
          background: "linear-gradient(90deg, #1E1B4B 0%, #312E81 100%)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 4px 20px rgba(30, 27, 75, 0.15)",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <FlashOnIcon sx={{ color: "#FDE047", fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: "-0.3px" }}>
            Move To Bank
          </Typography>
          <Chip label="Enterprise Payout" size="small" sx={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#FFF", fontWeight: 700 }} />
        </Stack>

        <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
          {/* Live Wallet */}
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="caption" sx={{ opacity: 0.75, fontWeight: 700, display: "block" }}>
              LIVE WALLET BALANCE
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#4ADE80" }}>
              ₹{wallet.mainBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

          {/* Destination Bank Health */}
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.75, fontWeight: 700, display: "block" }}>
              DESTINATION BANK HEALTH
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: bankHealth.is_down ? "#EF4444" : "#4ADE80" }}>
              🟢 {bankHealth.bank_name} ({bankHealth.success_rate_pct}%)
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

          {/* IMPS Status */}
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.75, fontWeight: 700, display: "block" }}>
              IMPS NETWORK
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#4ADE80" }}>
              🟢 24/7 Operational
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

          {/* Sound & Haptic Feedback Settings Button */}
          <Tooltip title="Configure Sound, Haptic & Voice Feedback Settings">
            <IconButton
              onClick={() => setNotificationSettingsOpen(true)}
              sx={{ color: "#FFFFFF", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}
            >
              <VolumeUpIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* ── 5. LIVE VALIDATION TIMELINE CHECKLIST BAR ── */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: "1px solid #E2E8F0", backgroundColor: "#F8FAFC" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between", overflowX: "auto" }}>
          {[
            { label: "Customer", ok: isCustomerValid },
            { label: "Mobile OTP", ok: isMobileOtpValid },
            { label: "Aadhaar eKYC", ok: isAadhaarValid },
            { label: "Beneficiary", ok: isBeneficiaryValid },
            { label: "Wallet", ok: isWalletValid },
            { label: "Limits", ok: isLimitValid },
            { label: "PIN", ok: isPinValid },
            { label: "Bank Health", ok: isBankHealthValid },
            { label: "Payout", ok: isAllValid },
          ].map((item, idx, arr) => (
            <React.Fragment key={idx}>
              <Stack direction="row" spacing={0.8} sx={{ alignItems: "center", flexShrink: 0 }}>
                <Chip
                  icon={item.ok ? <CheckCircleIcon sx={{ fontSize: "16px !important", color: "#16A34A !important" }} /> : undefined}
                  label={item.label}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    backgroundColor: item.ok ? "#DCFCE7" : "#F1F5F9",
                    color: item.ok ? "#15803D" : "#64748B",
                    border: item.ok ? "1px solid #86EFAC" : "1px solid #CBD5E1",
                  }}
                />
              </Stack>
              {idx < arr.length - 1 && (
                <Typography key={`sep-${idx}`} variant="caption" sx={{ color: "#CBD5E1", fontWeight: 700 }}>
                  →
                </Typography>
              )}
            </React.Fragment>
          ))}
        </Stack>
      </Paper>

      {!payoutReceipt ? (
        <Grid container spacing={3}>
          {/* ── LEFT COLUMN: CARDS & MODAL TRIGGERS ── */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={2.5}>
              {/* ── 1. SELECT CUSTOMER CARD (DESIGN MATCHING USER MOCKUP) ── */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF" }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B", letterSpacing: "0.5px", display: "block", mb: 1.5 }}>
                  SELECT CUSTOMER
                </Typography>

                {/* Search Box */}
                <Box sx={{ mb: 2.5 }}>
                  <M3TextField
                    label="Search Customer"
                    placeholder="Search by mobile or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    startAdornment={<SearchIcon sx={{ color: "#64748B" }} />}
                  />
                </Box>

                {/* Recent Customers Section */}
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B", letterSpacing: "0.5px" }}>
                    RECENT CUSTOMERS
                  </Typography>
                  <Button
                    size="small"
                    onClick={handleCustomerSearch}
                    sx={{ fontSize: "0.75rem", fontWeight: 800, color: "#2563EB", textTransform: "none", p: 0 }}
                  >
                    VIEW ALL
                  </Button>
                </Stack>

                {/* Recent Customers Avatars Row */}
                <Stack direction="row" spacing={2.5} sx={{ overflowX: "auto", pb: 1, alignItems: "center" }}>
                  {[
                    { initials: "SK", name: "Sathiya M.", mobile: "9876543210", id: "cust-101", full_name: "Sathiya Murthy" },
                    { initials: "AK", name: "Amit K.", mobile: "9876543211", id: "cust-102", full_name: "Amit Kumar" },
                    { initials: "SM", name: "Sanjay M.", mobile: "9876543212", id: "cust-103", full_name: "Sanjay Mehta" },
                    { initials: "RJ", name: "Rahul J.", mobile: "9876543213", id: "cust-104", full_name: "Rahul Joshi" },
                  ].map((cust, idx) => {
                    const isSelected = selectedCustomer?.mobile_number === cust.mobile || (idx === 0 && !selectedCustomer);
                    return (
                      <Stack
                        key={idx}
                        spacing={0.5}
                        onClick={() => {
                          setSelectedCustomer({
                            public_id: cust.id,
                            customer_number: `CUST982${idx}`,
                            full_name: cust.full_name,
                            mobile_number: cust.mobile,
                            kyc_status: "VERIFIED",
                            monthly_limit: 200000,
                            monthly_used: 125000,
                            monthly_remaining: 75000,
                            risk_score: 10,
                          });
                          fetchBeneficiaries(cust.id);
                        }}
                        sx={{ cursor: "pointer", flexShrink: 0, alignItems: "center" }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: isSelected ? "#2563EB" : "#DBEAFE",
                            color: isSelected ? "#FFFFFF" : "#1E40AF",
                            width: 48,
                            height: 48,
                            fontWeight: 800,
                            fontSize: "0.9rem",
                            border: isSelected ? "3px solid #2563EB" : "2px solid transparent",
                            boxShadow: isSelected ? "0 4px 12px rgba(37, 99, 235, 0.3)" : "none",
                            transition: "all 0.2s ease",
                            "&:hover": { transform: "scale(1.08)" },
                          }}
                        >
                          {cust.initials}
                        </Avatar>
                        <Typography variant="caption" sx={{ fontWeight: isSelected ? 800 : 600, color: isSelected ? "#1E1B4B" : "#64748B", fontSize: "0.75rem" }}>
                          {cust.name}
                        </Typography>
                      </Stack>
                    );
                  })}

                  {/* + New Customer Button */}
                  <Stack
                    spacing={0.5}
                    onClick={() => setCustomerMasterSlideOverOpen(true)}
                    sx={{ cursor: "pointer", flexShrink: 0, alignItems: "center" }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: "#1E1B4B",
                        color: "#FFFFFF",
                        width: 48,
                        height: 48,
                        fontWeight: 800,
                        transition: "all 0.2s ease",
                        "&:hover": { transform: "scale(1.08)", bgcolor: "#2563EB" },
                      }}
                    >
                      <AddIcon />
                    </Avatar>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "#1E1B4B", fontSize: "0.75rem" }}>
                      New
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>

              {/* ── 2. RECEIVER (DMT BENEFICIARIES) SECTION (DESIGN MATCHING USER MOCKUP) ── */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF" }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B", letterSpacing: "0.5px" }}>
                    RECEIVER (DMT BENEFICIARIES)
                  </Typography>
                  <Chip label="ACTIVE DMT" color="success" size="small" sx={{ height: 22, fontWeight: 800, fontSize: "0.68rem", backgroundColor: "#DCFCE7", color: "#15803D" }} />
                </Stack>

                <Stack spacing={2}>
                  {/* Beneficiary Card 1 (LAST USED / ACTIVE) */}
                  {(() => {
                    const activeBen = selectedBeneficiary || (beneficiaries.length > 0 ? beneficiaries[0] : {
                      beneficiary_id: "ben-101",
                      account_holder_name: "Priya S",
                      account_number: "5010099884521",
                      bank_name: "HDFC Bank",
                      ifsc_code: "HDFC0000123",
                      is_verified: true,
                      penny_drop_status: "SUCCESS"
                    });

                    return (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: 3.5,
                          border: "1px solid #E2E8F0",
                          borderLeft: "5px solid #16A34A",
                          backgroundColor: "#FFFFFF",
                          boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                        }}
                      >
                        <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                            <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <AccountBalanceIcon sx={{ color: "#2563EB", fontSize: 24 }} />
                            </Box>
                            <Box>
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                                  {activeBen.account_holder_name || "Priya S"}
                                </Typography>
                                <Chip label="LAST USED" size="small" sx={{ height: 20, bgcolor: "#16A34A", color: "#FFFFFF", fontWeight: 800, fontSize: "0.65rem" }} />
                              </Stack>
                              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>
                                {activeBen.bank_name || "HDFC Bank"} • XXXX{activeBen.account_number.slice(-4)}
                              </Typography>
                            </Box>
                          </Stack>

                          <IconButton size="small" onClick={() => setBeneficiaryMasterSlideOverOpen(true)}>
                            <EditIcon sx={{ color: "#64748B", fontSize: 20 }} />
                          </IconButton>
                        </Stack>

                        <Divider sx={{ my: 1.5, borderColor: "#F1F5F9" }} />

                        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="caption" sx={{ color: "#16A34A", fontWeight: 700 }}>
                            Last transfer ₹5000 on Jun 10
                          </Typography>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => setSelectedBeneficiary(activeBen as any)}
                            sx={{
                              bgcolor: "#1E1B4B",
                              color: "#FFFFFF",
                              fontWeight: 900,
                              px: 3,
                              py: 0.8,
                              borderRadius: 2.5,
                              textTransform: "none",
                              "&:hover": { bgcolor: "#2563EB" },
                            }}
                          >
                            {selectedBeneficiary?.beneficiary_id === activeBen.beneficiary_id ? "SELECTED ✓" : "SELECT"}
                          </Button>
                        </Stack>
                      </Paper>
                    );
                  })()}

                  {/* Beneficiary Card 2 (Vikram Rathore) */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3.5,
                      border: "1px solid #E2E8F0",
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <AccountBalanceIcon sx={{ color: "#64748B", fontSize: 24 }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                            Vikram Rathore
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, display: "block" }}>
                            ICICI Bank • XXXX8892
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setBeneficiaryMasterSlideOverOpen(true)}
                          sx={{
                            borderColor: "#1E1B4B",
                            color: "#1E1B4B",
                            fontWeight: 800,
                            px: 2,
                            borderRadius: 2,
                            textTransform: "none",
                          }}
                        >
                          EDIT
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            const b = {
                              beneficiary_id: "ben-102",
                              account_holder_name: "Vikram Rathore",
                              account_number: "918238128892",
                              bank_name: "ICICI Bank",
                              ifsc_code: "ICIC0000293",
                              is_verified: true,
                              penny_drop_status: "SUCCESS"
                            };
                            setSelectedBeneficiary(b as any);
                          }}
                          sx={{
                            bgcolor: "#1E1B4B",
                            color: "#FFFFFF",
                            fontWeight: 900,
                            px: 2.5,
                            borderRadius: 2,
                            textTransform: "none",
                            "&:hover": { bgcolor: "#2563EB" },
                          }}
                        >
                          SELECT
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>

                  {/* Beneficiary Card 3 (Meena Kumari) */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: 3.5,
                      border: "1px solid #E2E8F0",
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <AccountBalanceIcon sx={{ color: "#64748B", fontSize: 24 }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                            Meena Kumari
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, display: "block" }}>
                            SBI Bank • XXXX1102
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setBeneficiaryMasterSlideOverOpen(true)}
                          sx={{
                            borderColor: "#1E1B4B",
                            color: "#1E1B4B",
                            fontWeight: 800,
                            px: 2,
                            borderRadius: 2,
                            textTransform: "none",
                          }}
                        >
                          EDIT
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            const b = {
                              beneficiary_id: "ben-103",
                              account_holder_name: "Meena Kumari",
                              account_number: "309182381102",
                              bank_name: "SBI Bank",
                              ifsc_code: "SBIN0001092",
                              is_verified: true,
                              penny_drop_status: "SUCCESS"
                            };
                            setSelectedBeneficiary(b as any);
                          }}
                          sx={{
                            bgcolor: "#1E1B4B",
                            color: "#FFFFFF",
                            fontWeight: 900,
                            px: 2.5,
                            borderRadius: 2,
                            textTransform: "none",
                            "&:hover": { bgcolor: "#2563EB" },
                          }}
                        >
                          SELECT
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>

                  {/* ── 3. ADD NEW BENEFICIARY DOTTED BOX ── */}
                  <Paper
                    elevation={0}
                    onClick={() => setBeneficiaryMasterSlideOverOpen(true)}
                    sx={{
                      p: 2.5,
                      borderRadius: 3.5,
                      border: "2px dashed #CBD5E1",
                      backgroundColor: "#F8FAFC",
                      textAlign: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": { backgroundColor: "#EEF2FF", borderColor: "#4F46E5" },
                    }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
                      <PersonAddIcon sx={{ color: "#1E1B4B", fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#1E1B4B", letterSpacing: "0.5px" }}>
                        + ADD NEW BENEFICIARY
                      </Typography>
                    </Stack>
                  </Paper>
                </Stack>
              </Paper>

              {/* ── 4. SELECTABLE SERVICE CARDS FOR IMPS vs NEFT ── */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: "#1E1B4B" }}>
                  Select Settlement Service Mode
                </Typography>

                <Grid container spacing={2}>
                  {/* IMPS Service Card */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Paper
                      elevation={0}
                      onClick={() => setMode("IMPS")}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        border: mode === "IMPS" ? "2px solid #4F46E5" : "1px solid #E2E8F0",
                        backgroundColor: mode === "IMPS" ? "#EEF2FF" : "#FFFFFF",
                        cursor: "pointer",
                        position: "relative",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Chip
                        label="★ RECOMMENDED"
                        size="small"
                        sx={{ backgroundColor: "#4F46E5", color: "#FFF", fontWeight: 800, fontSize: "0.65rem", mb: 1 }}
                      />
                      <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>⚡ IMPS Transfer</Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>Speed: &lt; 2 seconds (Instant 24/7)</Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>Charges: ₹10 + GST (18%)</Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>Limit: Up to ₹5,00,000 / txn</Typography>
                    </Paper>
                  </Grid>

                  {/* NEFT Service Card */}
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Paper
                      elevation={0}
                      onClick={() => setMode("NEFT")}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        border: mode === "NEFT" ? "2px solid #4F46E5" : "1px solid #E2E8F0",
                        backgroundColor: mode === "NEFT" ? "#EEF2FF" : "#FFFFFF",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Chip
                        label="BULK TRANSFERS"
                        size="small"
                        sx={{ backgroundColor: "#64748B", color: "#FFF", fontWeight: 800, fontSize: "0.65rem", mb: 1 }}
                      />
                      <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>🏦 NEFT Transfer</Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>Speed: 30 - 60 mins (Batch)</Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>Charges: ₹3 + GST (18%)</Typography>
                      <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>Limit: Unlimited</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>

              {/* Payout Amount & PIN Inputs */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: "#1E1B4B" }}>
                  Payout Amount & Customer PIN
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 7 }}>
                    <M3CurrencyInput
                      label="Payout Amount (INR)"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <M3TextField
                      label="Customer PIN"
                      type="password"
                      value={customerPin}
                      onChange={(e) => setCustomerPin(e.target.value)}
                      placeholder="••••"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Stack>
          </Grid>

          {/* ── RIGHT COLUMN: ENTERPRISE TRANSACTION INTELLIGENCE PANEL ── */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Box sx={{ position: "sticky", top: 20 }}>
              <TransactionIntelligencePanel
                amount={numAmount}
                transferMode={mode as any}
                walletBalance={48250.75}
                selectedCustomer={selectedCustomer}
                selectedBeneficiary={selectedBeneficiary}
                isPinVerified={customerPin.length >= 4}
              />
            </Box>
          </Grid>
        </Grid>
      ) : (
        /* ── 1. TRANSFER SUCCESSFUL VIEW (MATCHING USER MOCKUP SCREEN 1) ── */
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            border: "1px solid #E2E8F0",
            backgroundColor: "#FFFFFF",
            maxWidth: 520,
            mx: "auto",
            position: "relative",
            boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          }}
        >
          {/* Header Bar */}
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
              Velocity Finance
            </Typography>
            <IconButton size="small" onClick={() => setPayoutReceipt(null)}>
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Stack>

          {/* Green Check Circle Badge */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                bgcolor: "#DCFCE7",
                color: "#16A34A",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 48 }} />
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
              ₹{Math.max(0, (payoutReceipt.amount || 10000) - (payoutReceipt.charge || 295)).toLocaleString("en-IN")}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#1E1B4B", mt: 0.5 }}>
              Sent Successfully
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.5 }}>
              Beneficiary synced to DMT system
            </Typography>
          </Box>

          {/* Commission Earned Banner */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: "#F0FDF4",
              border: "1px solid #BBF7D0",
              mb: 3,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: "#16A34A", letterSpacing: "0.5px", display: "block" }}>
              💵 COMMISSION EARNED
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: "#15803D", mt: 0.5 }}>
              🎉 ₹{payoutReceipt.commission || 80} commission credited instantly
            </Typography>
          </Paper>

          {/* Bank Partner & Time Info */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0", mb: 3 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block" }}>
                  BANK PARTNER
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#1E1B4B", textTransform: "uppercase" }}>
                  {payoutReceipt.bank_name || selectedBeneficiary?.bank_name || "HDFC BANK"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }} sx={{ textAlign: "right" }}>
                <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block" }}>
                  TIME
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* TXN ID & UTR NUMBER Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6 }}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B" }}>
                    TXN ID
                  </Typography>
                  <IconButton size="small" onClick={() => copyUtrToClipboard(payoutReceipt.reference_number || "CTB48392")}>
                    <ContentCopyIcon sx={{ fontSize: 14, color: "#64748B" }} />
                  </IconButton>
                </Stack>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                  {payoutReceipt.reference_number || "CTB48392"}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF" }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B" }}>
                    UTR NUMBER
                  </Typography>
                  <IconButton size="small" onClick={() => copyUtrToClipboard(payoutReceipt.utr_number || "93847293")}>
                    <ContentCopyIcon sx={{ fontSize: 14, color: "#64748B" }} />
                  </IconButton>
                </Stack>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                  {payoutReceipt.utr_number || "93847293"}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Stack spacing={1.5}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<ShareIcon />}
              onClick={() => setReceiptDrawerOpen(true)}
              sx={{
                bgcolor: "#1E1B4B",
                color: "#FFFFFF",
                fontWeight: 900,
                py: 1.4,
                borderRadius: 3,
                textTransform: "none",
                fontSize: "0.95rem",
                "&:hover": { bgcolor: "#2563EB" },
              }}
            >
              Share Receipt
            </Button>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 6 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<ReplayIcon />}
                  onClick={() => setPayoutReceipt(null)}
                  sx={{ borderColor: "#CBD5E1", color: "#1E1B4B", fontWeight: 800, py: 1.2, borderRadius: 3, textTransform: "none" }}
                >
                  Repeat
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<AssessmentIcon />}
                  onClick={() => alert("Report issue submitted")}
                  sx={{ borderColor: "#CBD5E1", color: "#1E1B4B", fontWeight: 800, py: 1.2, borderRadius: 3, textTransform: "none" }}
                >
                  Report
                </Button>
              </Grid>
            </Grid>
            <Button
              variant="contained"
              fullWidth
              onClick={() => setPayoutReceipt(null)}
              sx={{
                bgcolor: "#15803D",
                color: "#FFFFFF",
                fontWeight: 900,
                py: 1.4,
                borderRadius: 3,
                textTransform: "none",
                fontSize: "1rem",
                "&:hover": { bgcolor: "#166534" },
              }}
            >
              Done
            </Button>
          </Stack>
        </Paper>
      )}

      {/* ── STICKY FOOTER WITH SLIDE TO SEND ── */}
      {!payoutReceipt && (
        <Paper
          elevation={4}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            py: 2,
            px: 4,
            backgroundColor: "#FFFFFF",
            borderTop: "1px solid #E2E8F0",
            zIndex: 1000,
            boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
          }}
        >
          <Box sx={{ maxWidth: 1240, mx: "auto" }}>
            <Grid container spacing={3} sx={{ alignItems: "center" }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Stack direction="row" spacing={3} sx={{ alignItems: "center" }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block" }}>
                      TOTAL NET DEBIT
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                      ₹{netDebit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>

                  <Divider orientation="vertical" flexItem />

                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block" }}>
                      ESTIMATED WALLET AFTER
                    </Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: isWalletValid ? "#16A34A" : "#DC2626" }}>
                      ₹{walletAfter.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <SlideToSend
                  disabled={!isAllValid}
                  onConfirm={() => setConfirmModalOpen(true)}
                  label={`Slide to Execute Payout ₹${numAmount.toLocaleString("en-IN")} →`}
                />
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {/* ── 1. CONFIRM TRANSFER MODAL (MATCHING USER MOCKUP SCREEN 1) ── */}
      <Dialog
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, p: 3, backgroundColor: "#FFFFFF" } } }}
      >
        {/* Header */}
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <IconButton size="small" onClick={() => setConfirmModalOpen(false)}>
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
              Confirm Transfer
            </Typography>
          </Stack>
          <Avatar sx={{ bgcolor: "#2563EB", width: 36, height: 36, fontWeight: 800, fontSize: "0.85rem" }}>
            {((selectedCustomer?.full_name || "") as string).charAt(0).toUpperCase() || "C"}
          </Avatar>
        </Stack>

        {/* Transfer Amount Card */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", mb: 2 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B", letterSpacing: "0.5px" }}>
              TRANSFER AMOUNT
            </Typography>
            <Chip
              label={`🟢 ₹${commission || 80} Earned`}
              size="small"
              sx={{ bgcolor: "#DCFCE7", color: "#15803D", fontWeight: 800, fontSize: "0.7rem", height: 22 }}
            />
          </Stack>
          <Typography variant="h4" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
            ₹{numAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
        </Paper>

        {/* Sender Details Box */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B", letterSpacing: "0.5px", display: "block", mb: 1 }}>
            SENDER
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
            {selectedCustomer?.full_name || "Ravi Kumar"}
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
            📱 +91 {selectedCustomer?.mobile_number || "9876543210"}
          </Typography>
          <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700, display: "block", mt: 0.5 }}>
            💳 Pay2Pay Main Wallet (Balance: ₹{walletBefore.toLocaleString("en-IN")})
          </Typography>
        </Paper>

        {/* Beneficiary Details Box */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", mb: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B", letterSpacing: "0.5px", display: "block", mb: 1 }}>
            BENEFICIARY
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
            {selectedBeneficiary?.account_holder_name || "Priya S"}
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 1 }}>
            {selectedBeneficiary?.bank_name || "HDFC Bank"}
          </Typography>
          <Chip
            label={`ACC NO. XXXX${selectedBeneficiary?.account_number.slice(-4) || "4521"}`}
            size="small"
            sx={{ bgcolor: "#FFFFFF", border: "1px solid #E2E8F0", fontWeight: 800, color: "#1E1B4B", fontSize: "0.72rem" }}
          />
        </Paper>

        {/* Transaction Charges & Final Credit Amount */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF", mb: 2 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600 }}>
              Transaction Charges
            </Typography>
            <Typography variant="body2" sx={{ color: "#DC2626", fontWeight: 800 }}>
              + ₹{totalFee.toFixed(2)}
            </Typography>
          </Stack>

          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: "#F0FDF4", border: "1px solid #BBF7D0", textAlign: "center" }}>
            <Typography variant="caption" sx={{ color: "#16A34A", fontWeight: 800, letterSpacing: "0.5px" }}>
              FINAL CREDIT AMOUNT
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, color: "#15803D" }}>
              ₹{Math.max(0, numAmount - totalFee).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </Typography>
          </Paper>
        </Paper>

        {/* Security Badges Row */}
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6 }}>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: "1px solid #DCFCE7", bgcolor: "#F0FDF4", textAlign: "center" }}>
              <CheckCircleIcon sx={{ color: "#16A34A", fontSize: 20, mb: 0.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#15803D", display: "block", fontSize: "0.7rem" }}>
                Verified Beneficiary
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, border: "1px solid #DCFCE7", bgcolor: "#F0FDF4", textAlign: "center" }}>
              <VerifiedUserIcon sx={{ color: "#16A34A", fontSize: 20, mb: 0.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#15803D", display: "block", fontSize: "0.7rem" }}>
                Fraud Scan Completed
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* High Transaction Alert (if amount >= 10000) */}
        {numAmount >= 10000 && (
          <Alert severity="warning" icon={<WarningAmberIcon sx={{ color: "#DC2626" }} />} sx={{ mb: 2.5, borderRadius: 3, borderLeft: "5px solid #DC2626", bgcolor: "#FEF2F2" }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#991B1B" }}>
              High transaction amount
            </Typography>
            <Typography variant="caption" sx={{ color: "#991B1B" }}>
              Please verify customer identity before proceeding to prevent money laundering or unauthorized access.
            </Typography>
          </Alert>
        )}

        {/* Action Buttons */}
        <Stack spacing={1.5}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              setConfirmModalOpen(false);
              handleExecutePayout();
            }}
            startIcon={<FlashOnIcon />}
            sx={{
              bgcolor: "#1E1B4B",
              color: "#FFFFFF",
              fontWeight: 900,
              py: 1.4,
              borderRadius: 3,
              fontSize: "1rem",
              textTransform: "none",
              boxShadow: "0 4px 14px rgba(30, 27, 75, 0.3)",
              "&:hover": { bgcolor: "#2563EB" },
            }}
          >
            ⚡ Confirm & Process
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => setConfirmModalOpen(false)}
            sx={{
              borderColor: "#CBD5E1",
              color: "#64748B",
              fontWeight: 800,
              py: 1.2,
              borderRadius: 3,
              textTransform: "none",
            }}
          >
            Cancel
          </Button>
        </Stack>
      </Dialog>

      {/* ── 2. REAL-TIME TRANSFER PROCESSING OVERLAY (MATCHING USER MOCKUP SCREEN 2) ── */}
      <Dialog
        open={processingOpen}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, p: 3, textAlign: "center", backgroundColor: "#FFFFFF" } } }}
      >
        <Box sx={{ py: 2 }}>
          {/* Header Bar */}
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="caption" sx={{ fontWeight: 900, color: "#1E1B4B", letterSpacing: "0.5px" }}>
              ≡ Pay2Pay Retailer Platform
            </Typography>
            <Avatar sx={{ bgcolor: "#2563EB", width: 32, height: 32, fontWeight: 800, fontSize: "0.75rem" }}>
              {((selectedCustomer?.full_name || "") as string).charAt(0).toUpperCase() || "C"}
            </Avatar>
          </Stack>

          {/* Animated Circular Green Shield Icon Logo */}
          <Box sx={{ position: "relative", width: 90, height: 90, mx: "auto", mb: 2 }}>
            <Box
              sx={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                border: "4px solid #16A34A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F0FDF4",
                boxShadow: "0 0 20px rgba(22, 163, 74, 0.25)",
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: "#1E1B4B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldIcon sx={{ fontSize: 36, color: "#FFFFFF" }} />
              </Box>
            </Box>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 900, color: "#1E1B4B", mb: 0.5 }}>
            {processingStep >= 5 ? "Payment Successful" : "Processing Transfer..."}
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 3 }}>
            Securing your transaction • ₹{numAmount.toLocaleString("en-IN")} ({mode})
          </Typography>

          {/* Live Step Checklist */}
          <Stack spacing={1.5} sx={{ textAlign: "left", px: 1, mb: 3 }}>
            {[
              "Validating Card & Customer PIN",
              "Processing Payment",
              "Verifying Bank Account",
              "Initiating Transfer",
              "Completing Settlement",
            ].map((stepText, idx) => {
              const stepNum = idx + 1;
              const isDone = processingStep > stepNum;
              const isActive = processingStep === stepNum;
              return (
                <Stack key={idx} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    {isDone ? (
                      <CheckCircleIcon sx={{ color: "#16A34A", fontSize: 20 }} />
                    ) : (
                      <Box sx={{ width: 20, height: 20, borderRadius: "50%", border: isActive ? "2px solid #2563EB" : "2px solid #CBD5E1" }} />
                    )}
                    <Typography variant="body2" sx={{ fontWeight: isDone || isActive ? 800 : 500, color: isDone ? "#16A34A" : isActive ? "#1E1B4B" : "#64748B" }}>
                      {stepText}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: isDone ? "#16A34A" : isActive ? "#2563EB" : "#94A3B8" }}>
                    {isDone ? "Completed" : isActive ? "Active" : "Pending"}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>

          <LinearProgress sx={{ borderRadius: 2, height: 6, mb: 2 }} />

          {/* Encrypted Gateway Footer */}
          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block", fontSize: "0.7rem" }}>
            🔒 End-to-End Encrypted Gateway
          </Typography>
          <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", fontSize: "0.68rem" }}>
            Pay2Pay Retailer Network (ID: VEL-99281)
          </Typography>
        </Box>
      </Dialog>

      {/* ── SHARE BOTTOM SHEET DRAWER ── */}
      <Drawer
        anchor="bottom"
        open={shareDrawerOpen}
        onClose={() => setShareDrawerOpen(false)}
        slotProps={{ paper: { sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, p: 3, maxWidth: 600, mx: "auto" } } }}
      >
        <Stack direction="row" sx={{ justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>Receipt & Share Actions</Typography>
          <IconButton onClick={() => setShareDrawerOpen(false)}><CloseIcon /></IconButton>
        </Stack>

        <Grid container spacing={2}>
          {[
            { label: "WhatsApp", icon: <WhatsAppIcon sx={{ color: "#25D366" }} />, action: () => window.open(`https://wa.me/?text=Payout%20Receipt:%20UTR%20${payoutReceipt?.utr_number}`) },
            { label: "SMS", icon: <SmsIcon sx={{ color: "#0284C7" }} />, action: () => window.open(`sms:?body=Payout%20Successful!%20UTR:${payoutReceipt?.utr_number}`) },
            { label: "Email", icon: <EmailIcon sx={{ color: "#DC2626" }} />, action: () => window.open(`mailto:?subject=Payout%20Receipt`) },
            { label: "Print", icon: <PrintIcon sx={{ color: "#475569" }} />, action: () => window.print() },
          ].map((item, i) => (
            <Grid size={{ xs: 6 }} key={i}>
              <Paper elevation={0} onClick={item.action} sx={{ p: 2, borderRadius: 3, border: "1px solid #E2E8F0", textAlign: "center", cursor: "pointer" }}>
                {item.icon}
                <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mt: 1 }}>{item.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Drawer>

      {/* ── 2. TRANSFER INTERRUPTED / FAILED MODAL (MATCHING USER MOCKUP SCREEN 2) ── */}
      <Dialog
        open={Boolean(payoutFailed)}
        onClose={() => setPayoutFailed(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 4, p: 3, backgroundColor: "#FFFFFF" } } }}
      >
        {/* Header */}
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <IconButton size="small" onClick={() => setPayoutFailed(null)}>
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
              Velocity Finance
            </Typography>
          </Stack>
          <Avatar sx={{ bgcolor: "#2563EB", width: 32, height: 32, fontWeight: 800, fontSize: "0.75rem" }}>
            {((selectedCustomer?.full_name || "") as string).charAt(0).toUpperCase() || "C"}
          </Avatar>
        </Stack>

        {/* Red Exclamation Circle Badge */}
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "#FEF2F2",
              color: "#EF4444",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 1.5,
            }}
          >
            <ErrorIcon sx={{ fontSize: 44 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
            Transfer Interrupted
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748B", display: "block", mt: 0.5 }}>
            Transaction failed due to external provider
          </Typography>
        </Box>

        {/* Transaction Details Box */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #FCA5A5", bgcolor: "#FFFFFF", mb: 2 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748B", letterSpacing: "0.5px" }}>
              TRANSACTION AMOUNT
            </Typography>
            <Chip label="FAILED" size="small" sx={{ bgcolor: "#FEF2F2", color: "#DC2626", fontWeight: 800, fontSize: "0.68rem" }} />
          </Stack>
          <Typography variant="h4" sx={{ fontWeight: 900, color: "#1E1B4B", mb: 2 }}>
            ₹{(payoutFailed?.amount || numAmount || 10000).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>

          <Stack spacing={1} sx={{ pt: 1, borderTop: "1px solid #F1F5F9" }}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>Reason</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#1E1B4B" }}>Bank Timeout</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>Refund Status</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#16A34A" }}>Processing</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600 }}>Estimated ETA</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "#1E1B4B" }}>15 mins</Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* Auto Retry Banner */}
        <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2.5, bgcolor: "#1E1B4B", color: "#FFFFFF", mb: 2.5, textAlign: "center" }}>
          <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
            🔄 System retrying automatically...
          </Typography>
          <Typography variant="caption" sx={{ fontSize: "0.68rem", color: "#93C5FD", fontWeight: 800, letterSpacing: "1px" }}>
            NEXT ATTEMPT IN 20S
          </Typography>
        </Paper>

        {/* Action Buttons */}
        <Stack spacing={1.5}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              setPayoutFailed(null);
              setConfirmModalOpen(true);
            }}
            startIcon={<ReplayIcon />}
            sx={{
              bgcolor: "#1E1B4B",
              color: "#FFFFFF",
              fontWeight: 900,
              py: 1.3,
              borderRadius: 3,
              textTransform: "none",
            }}
          >
            Retry Transfer Manually
          </Button>
          <Button
            variant="outlined"
            fullWidth
            onClick={() => alert("Tracking Refund Status...")}
            sx={{ borderColor: "#CBD5E1", color: "#1E1B4B", fontWeight: 800, py: 1.2, borderRadius: 3, textTransform: "none" }}
          >
            Track Refund Status
          </Button>
          <Button
            variant="text"
            fullWidth
            onClick={() => window.open("https://wa.me/support")}
            sx={{ color: "#64748B", fontWeight: 700, textTransform: "none", fontSize: "0.85rem" }}
          >
            💬 Contact Support
          </Button>
        </Stack>

        <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", textAlign: "center", mt: 2, fontSize: "0.68rem" }}>
          🛡️ PCI DSS Compliant & Secure
        </Typography>
      </Dialog>

      {/* ── 3. TRANSACTION RECEIPT DRAWER / FULL VIEW (MATCHING USER MOCKUP SCREEN 3) ── */}
      <Drawer
        anchor="right"
        open={receiptDrawerOpen}
        onClose={() => setReceiptDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 460 }, p: 3, backgroundColor: "#F8FAFC" } } }}
      >
        {/* Header */}
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
            Transaction Receipt
          </Typography>
          <IconButton onClick={() => setReceiptDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Stack>

        {/* Soft Green Top Banner */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: "#F0FDF4", border: "1px solid #BBF7D0", textAlign: "center", mb: 3 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              bgcolor: "#16A34A",
              color: "#FFFFFF",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 1.5,
              mx: "auto",
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 36 }} />
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 900, color: "#16A34A", letterSpacing: "1px", display: "block" }}>
            PAYMENT SUCCESSFUL
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, color: "#14532D", my: 0.5 }}>
            ₹{(payoutReceipt?.amount ? payoutReceipt.amount - 295 : 9705).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
            {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Paper>

        {/* Key-Value Details Table Card */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #E2E8F0", bgcolor: "#FFFFFF", mb: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600 }}>Retailer</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#1E1B4B" }}>Sathiya Digital</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600 }}>Customer</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#1E1B4B" }}>{payoutReceipt?.customer_name || selectedCustomer?.full_name || "Ravi Kumar"}</Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600 }}>UTR Number</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#2563EB", cursor: "pointer" }} onClick={() => copyUtrToClipboard(payoutReceipt?.utr_number || "93847293")}>
                {payoutReceipt?.utr_number || "93847293"}
              </Typography>
            </Stack>
            <Divider />
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600 }}>Transfer Amount</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#1E1B4B" }}>
                ₹{(payoutReceipt?.amount ? payoutReceipt.amount - 295 : 9705).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            </Stack>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 600 }}>Convenience Fee</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: "#DC2626" }}>₹295.00</Typography>
            </Stack>
            <Divider />
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1E1B4B" }}>Total Paid</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                ₹{(payoutReceipt?.amount || 10000).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, display: "block", textAlign: "center", mb: 3 }}>
          Velocity Finance • RBI Licensed Money Transfer Agency
        </Typography>

        {/* Quick Action Bar */}
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          <Grid size={{ xs: 4 }}>
            <Paper elevation={0} onClick={() => window.print()} sx={{ p: 1.5, borderRadius: 3, border: "1px solid #E2E8F0", textAlign: "center", cursor: "pointer", bgcolor: "#FFFFFF" }}>
              <PrintIcon sx={{ color: "#475569", mb: 0.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, display: "block" }}>Print</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Paper elevation={0} onClick={() => alert("Downloading PDF...")} sx={{ p: 1.5, borderRadius: 3, border: "1px solid #E2E8F0", textAlign: "center", cursor: "pointer", bgcolor: "#FFFFFF" }}>
              <PictureAsPdfIcon sx={{ color: "#DC2626", mb: 0.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, display: "block" }}>PDF</Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Paper elevation={0} onClick={() => copyUtrToClipboard(payoutReceipt?.utr_number || "93847293")} sx={{ p: 1.5, borderRadius: 3, border: "1px solid #E2E8F0", textAlign: "center", cursor: "pointer", bgcolor: "#FFFFFF" }}>
              <ContentCopyIcon sx={{ color: "#2563EB", mb: 0.5 }} />
              <Typography variant="caption" sx={{ fontWeight: 800, display: "block" }}>{copiedUtr ? "Copied!" : "Copy UTR"}</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Main CTA */}
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<WhatsAppIcon />}
            onClick={() => window.open(`https://wa.me/?text=DMT%20Receipt%20UTR:${payoutReceipt?.utr_number || "93847293"}`)}
            sx={{
              bgcolor: "#15803D",
              color: "#FFFFFF",
              fontWeight: 900,
              py: 1.4,
              borderRadius: 3,
              textTransform: "none",
              fontSize: "1rem",
              "&:hover": { bgcolor: "#166534" },
            }}
          >
            Share to WhatsApp
          </Button>
          <Button
            variant="text"
            fullWidth
            onClick={() => {
              setReceiptDrawerOpen(false);
              setPayoutReceipt(null);
            }}
            sx={{ color: "#2563EB", fontWeight: 800, textTransform: "none" }}
          >
            + New Transaction
          </Button>
        </Stack>

        {/* Gamified Retailer Bonus Banner */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 4, bgcolor: "#1E1B4B", color: "#FFFFFF", mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.5 }}>
            Earn ₹50 Extra
          </Typography>
          <Typography variant="caption" sx={{ color: "#93C5FD", display: "block", mb: 2 }}>
            Process 5 more transfers today to unlock your daily retailer bonus.
          </Typography>
          <LinearProgress variant="determinate" value={60} sx={{ borderRadius: 2, height: 6, mb: 1, bgcolor: "#3730A3", "& .MuiLinearProgress-bar": { bgcolor: "#22C55E" } }} />
          <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 800, display: "block", textAlign: "right", fontSize: "0.7rem" }}>
            3/5 Completed
          </Typography>
        </Paper>

        {/* Footer */}
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Chip label="✔ Verified by NPCI" size="small" sx={{ bgcolor: "#F0FDF4", color: "#16A34A", fontWeight: 800, fontSize: "0.7rem" }} />
          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, cursor: "pointer" }} onClick={() => window.open("https://wa.me/support")}>
            Need Help?
          </Typography>
        </Stack>
      </Drawer>

      {/* ── NOTIFICATION & HAPTICS SETTINGS DIALOG ── */}
      <NotificationSettingsDialog
        open={notificationSettingsOpen}
        onClose={() => setNotificationSettingsOpen(false)}
      />

      {/* ── ENTERPRISE CUSTOMER MASTER SLIDE-OVER PANEL ── */}
      <CustomerMasterSlideOver
        open={customerMasterSlideOverOpen}
        onClose={() => setCustomerMasterSlideOverOpen(false)}
        onSuccess={(customer) => {
          setSelectedCustomer(customer);
          setCustomerExpanded(false);
        }}
      />

      {/* ── ENTERPRISE BENEFICIARY MASTER SLIDE-OVER PANEL ── */}
      <BeneficiaryMasterSlideOver
        open={beneficiaryMasterSlideOverOpen}
        onClose={() => setBeneficiaryMasterSlideOverOpen(false)}
        customerId={selectedCustomer?.customer_number}
        onSuccess={(beneficiary) => {
          setSelectedBeneficiary(beneficiary);
          setBeneficiaryExpanded(false);
        }}
      />
    </Box>
  );
}
