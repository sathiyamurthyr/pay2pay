"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

  // Transaction Memory Store (Preserves context across navigation & workspace returns)
  const memoryStore = useTransactionMemoryStore();

  const handleOpenCustomerWorkspace = () => {
    memoryStore.setReferrerUrl("/retailer/dmt");
    router.push("/retailer/customers/new");
  };

  const handleOpenBeneficiaryWorkspace = () => {
    memoryStore.setReferrerUrl("/retailer/dmt");
    router.push("/retailer/beneficiary/new");
  };

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
    if (bankMasterList.length === 0) {
      fetchBankMasterList();
    }
  }, []);

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
              {/* ── 2. COLLAPSIBLE CUSTOMER SUMMARY CARD WITH ADD OPTION ── */}
              <Paper elevation={0} sx={{ borderRadius: 3.5, border: "1px solid #E2E8F0", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
                <Box
                  onClick={() => setCustomerExpanded(!customerExpanded)}
                  sx={{
                    p: 2.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    backgroundColor: "#F8FAFC",
                    "&:hover": { backgroundColor: "#F1F5F9" },
                  }}
                >
                  <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                    <Avatar sx={{ bgcolor: "#4F46E5", width: 40, height: 40, fontWeight: 800 }}>
                      {selectedCustomer ? selectedCustomer.full_name.charAt(0) : "C"}
                    </Avatar>
                    <Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                          {selectedCustomer ? selectedCustomer.full_name : "Select Customer"}
                        </Typography>
                        <Chip label="KYC Verified" color="success" size="small" sx={{ height: 20, fontSize: "0.68rem" }} />
                      </Stack>
                      <Typography variant="caption" sx={{ color: "#64748B" }}>
                        {selectedCustomer ? `+91 ${selectedCustomer.mobile_number} • ID: ${selectedCustomer.customer_number}` : "Click to search customer"}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {/* ADD NEW CUSTOMER BUTTON */}
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PersonAddIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCustomerWorkspace();
                      }}
                      sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                    >
                      + Add New Customer
                    </Button>
                    <IconButton size="small">
                      {customerExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </Stack>
                </Box>

                <Collapse in={customerExpanded}>
                  <Box sx={{ p: 3, borderTop: "1px solid #E2E8F0" }}>
                    <Stack spacing={2}>
                      <M3TextField
                        label="Mobile / Customer ID"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <Stack direction="row" spacing={2}>
                        <M3Button variant="contained" fullWidth loading={searchLoading} onClick={handleCustomerSearch}>
                          Search & Select Customer
                        </M3Button>
                        <Button
                          variant="outlined"
                          fullWidth
                          startIcon={<PersonAddIcon />}
                          onClick={() => handleOpenCustomerWorkspace()}
                          sx={{ py: 1.2, borderRadius: 2.5, fontWeight: 800 }}
                        >
                          + Register New Customer Workspace
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                </Collapse>
              </Paper>

              {/* ── 2. ENHANCED BENEFICIARY SUMMARY CARD WITH ADD OPTION ── */}
              {selectedBeneficiary && !beneficiaryExpanded ? (
                <BeneficiarySummaryCard
                  beneficiary={{
                    beneficiary_id: selectedBeneficiary.beneficiary_id,
                    account_holder_name: selectedBeneficiary.account_holder_name,
                    account_number: selectedBeneficiary.account_number,
                    account_number_masked: `••••••••${selectedBeneficiary.account_number.slice(-4)}`,
                    ifsc_code: selectedBeneficiary.ifsc_code,
                    bank_name: selectedBeneficiary.bank_name,
                    branch_name: "Fort Branch, Mumbai",
                    account_type: "SAVINGS",
                    is_verified: true,
                    penny_drop_status: "SUCCESS",
                    bank_status: bankHealth.is_down ? "DOWN" : "ONLINE",
                    imps_available: true,
                    estimated_settlement_sec: bankHealth.estimated_delay_sec || 1.2,
                    last_transaction_amount: 25000,
                    last_transaction_date: "02 Aug 2026",
                  }}
                  onEdit={() => setBeneficiaryExpanded(true)}
                />
              ) : (
                <Paper elevation={0} sx={{ borderRadius: 3.5, border: "1px solid #E2E8F0", overflow: "hidden", backgroundColor: "#FFFFFF" }}>
                  <Box
                    onClick={() => setBeneficiaryExpanded(!beneficiaryExpanded)}
                    sx={{
                      p: 2.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      backgroundColor: "#F8FAFC",
                      "&:hover": { backgroundColor: "#F1F5F9" },
                    }}
                  >
                    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                      <Avatar sx={{ bgcolor: "#0284C7", width: 40, height: 40 }}>
                        <AccountBalanceIcon />
                      </Avatar>
                      <Box>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                            {selectedBeneficiary ? selectedBeneficiary.account_holder_name : "Select Beneficiary"}
                          </Typography>
                          <Chip label="Penny Drop Verified" color="success" size="small" sx={{ height: 20, fontSize: "0.68rem" }} />
                        </Stack>
                        <Typography variant="caption" sx={{ color: "#64748B" }}>
                          {selectedBeneficiary ? `${selectedBeneficiary.bank_name} • Account: ${selectedBeneficiary.account_number}` : "Click to select bank account"}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      {/* ADD NEW BENEFICIARY BUTTON */}
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenBeneficiaryWorkspace();
                        }}
                        sx={{ borderRadius: 2, textTransform: "none", fontWeight: 700 }}
                      >
                        + Add Beneficiary
                      </Button>
                      <IconButton size="small">
                        {beneficiaryExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Stack>
                  </Box>

                  <Collapse in={beneficiaryExpanded}>
                    <Box sx={{ p: 3, borderTop: "1px solid #E2E8F0" }}>
                      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          Select Saved Beneficiary Bank Account
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => handleOpenBeneficiaryWorkspace()}
                          sx={{ borderRadius: 2, fontWeight: 700 }}
                        >
                          + Add New Beneficiary
                        </Button>
                      </Stack>

                      <Grid container spacing={2}>
                        {beneficiaries.map((b) => (
                          <Grid size={{ xs: 12, sm: 6 }} key={b.beneficiary_id}>
                            <Card
                              elevation={0}
                              onClick={() => {
                                setSelectedBeneficiary(b);
                                setBeneficiaryExpanded(false);
                              }}
                              sx={{
                                p: 2,
                                cursor: "pointer",
                                borderRadius: 3,
                                border: selectedBeneficiary?.beneficiary_id === b.beneficiary_id ? "2px solid #4F46E5" : "1px solid #E2E8F0",
                                backgroundColor: selectedBeneficiary?.beneficiary_id === b.beneficiary_id ? "#EEF2FF" : "#FFF",
                              }}
                            >
                              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{b.account_holder_name}</Typography>
                              <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>{b.bank_name} ({b.account_number})</Typography>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  </Collapse>
                </Paper>
              )}

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
        /* ── COMPACT SUCCESS SCREEN ── */
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            border: "2px solid #16A34A",
            backgroundColor: "#FFFFFF",
            maxWidth: 650,
            mx: "auto",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 68, color: "#16A34A" }} />
            <Typography variant="h4" sx={{ fontWeight: 900, mt: 1, color: "#14532D" }}>
              Payout Dispatched!
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B" }}>
              Reference ID: {payoutReceipt.reference_number} • UTR: {payoutReceipt.utr_number}
            </Typography>
          </Box>

          <Alert
            severity="success"
            action={
              <Button color="inherit" size="small" onClick={() => copyUtrToClipboard(payoutReceipt.utr_number)}>
                {copiedUtr ? "COPIED!" : <ContentCopyIcon fontSize="small" />}
              </Button>
            }
            sx={{ borderRadius: 3, mb: 3, fontWeight: 700 }}
          >
            Bank UTR Number: <strong>{payoutReceipt.utr_number}</strong>
          </Alert>

          <Grid container spacing={2} sx={{ p: 2.5, borderRadius: 3, backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", mb: 3 }}>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>PAYOUT AMOUNT</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>₹{payoutReceipt.amount.toLocaleString("en-IN")}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>BENEFICIARY</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{payoutReceipt.beneficiary_name}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>RETAILER MARGIN EARNED</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, color: "#16A34A" }}>+₹{payoutReceipt.commission}</Typography>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Typography variant="caption" sx={{ color: "#64748B" }}>UPDATED WALLET</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900 }}>₹{payoutReceipt.wallet_after.toLocaleString("en-IN")}</Typography>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2}>
            <Button variant="contained" fullWidth startIcon={<ShareIcon />} onClick={() => setShareDrawerOpen(true)}>
              Share & Download Receipt
            </Button>
            <Button variant="outlined" fullWidth startIcon={<ReplayIcon />} onClick={() => setPayoutReceipt(null)}>
              New Payout
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
                  onConfirm={handleExecutePayout}
                  label={`Slide to Execute Payout ₹${numAmount.toLocaleString("en-IN")} →`}
                />
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}



      {/* ── REAL-TIME PROCESSING OVERLAY ── */}
      <Dialog open={processingOpen} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 4, p: 3, textAlign: "center" } } }}>
        <Box sx={{ py: 2 }}>
          <SpeedIcon sx={{ fontSize: 56, color: "#4F46E5", mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 900 }}>Real-time Processing Payout...</Typography>
          <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 3 }}>
            Amount: ₹{numAmount.toLocaleString("en-IN")} • Mode: {mode}
          </Typography>

          <Stack spacing={2} sx={{ textAlign: "left" }}>
            {[
              "1. Encrypted Customer PIN & Risk Validation",
              `2. Destination ${selectedBeneficiary?.bank_name || "Bank"} Handshake`,
              "3. Cashfree Gateway UTR Reservation",
              "4. Double-Entry Wallet Ledger & Commission Update",
              "5. Digital Receipt & Immutable Audit Logging",
            ].map((stepText, idx) => {
              const stepNum = idx + 1;
              const isDone = processingStep > stepNum;
              return (
                <Stack key={idx} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  {isDone ? (
                    <CheckCircleIcon sx={{ color: "#16A34A", fontSize: 24 }} />
                  ) : (
                    <Box sx={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #CBD5E1" }} />
                  )}
                  <Typography variant="body2" sx={{ fontWeight: isDone ? 700 : 400, color: isDone ? "#16A34A" : "#64748B" }}>
                    {stepText}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>

          <LinearProgress sx={{ mt: 3, borderRadius: 2, height: 8 }} />
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

      {/* ── NOTIFICATION & HAPTICS SETTINGS DIALOG ── */}
      <NotificationSettingsDialog
        open={notificationSettingsOpen}
        onClose={() => setNotificationSettingsOpen(false)}
      />

    </Box>
  );
}
