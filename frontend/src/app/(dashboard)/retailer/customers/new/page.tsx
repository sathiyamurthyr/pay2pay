"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Avatar,
  LinearProgress,
  Grid,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import LockIcon from "@mui/icons-material/Lock";
import VerifiedIcon from "@mui/icons-material/Verified";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SmsIcon from "@mui/icons-material/Sms";
import SaveIcon from "@mui/icons-material/Save";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { motion, AnimatePresence } from "framer-motion";

import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { notificationEngine } from "@/services/notification-engine";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";

const STEPS = [
  { label: "Identification", est: "30s" },
  { label: "Mobile OTP", est: "45s" },
  { label: "Aadhaar eKYC", est: "60s" },
  { label: "Security PIN", est: "30s" },
  { label: "Complete", est: "0s" },
];

export default function NewCustomerWorkspacePage() {
  const router = useRouter();
  const { setSelectedCustomer, referrerUrl } = useTransactionMemoryStore();

  const [activeStep, setActiveStep] = useState(0);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");

  // Validation State
  const [mobileStatusState, setMobileStatusState] = useState<
    "IDLE" | "CHECKING" | "NEW_CUSTOMER" | "EXISTING_CUSTOMER" | "INVALID"
  >("IDLE");
  const [mobileStatusMessage, setMobileStatusMessage] = useState("");
  const [duplicateCustomer, setDuplicateCustomer] = useState<any | null>(null);

  // OTP State
  const [mobileOtp, setMobileOtp] = useState("");
  const [otpChannel, setOtpChannel] = useState<"WHATSAPP" | "SMS">("WHATSAPP");
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(3);
  const [step1Loading, setStep1Loading] = useState(false);
  const [step2Loading, setStep2Loading] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState<any | null>(null);

  // Aadhaar eKYC State
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [aadhaarRefNum, setAadhaarRefNum] = useState("");
  const [maskedAadhaar, setMaskedAadhaar] = useState("");
  const [step3Loading, setStep3Loading] = useState(false);

  // PIN State
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [step4Loading, setStep4Loading] = useState(false);

  // Auto-save state
  const [lastSaved, setLastSaved] = useState<string>("Just now");

  // Load Draft from LocalStorage
  useEffect(() => {
    try {
      const draft = localStorage.getItem("pay2pay_customer_workspace_draft");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.mobileNumber) {
          setMobileNumber(parsed.mobileNumber);
          setFirstName(parsed.firstName || "");
          setLastName(parsed.lastName || "");
          setEmail(parsed.email || "");
          if (parsed.mobileNumber.length === 10) {
            handleMobileChange(parsed.mobileNumber);
          }
        }
      }
    } catch {
      // Ignore draft read errors
    }
  }, []);

  // Save Draft to LocalStorage
  const saveDraft = () => {
    try {
      localStorage.setItem(
        "pay2pay_customer_workspace_draft",
        JSON.stringify({ firstName, lastName, mobileNumber, email, activeStep })
      );
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      notificationEngine.notify("CUSTOMER_VERIFIED", "Onboarding Draft Saved");
    } catch {
      // Ignore draft save errors
    }
  };

  // Keyboard Shortcuts Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveDraft();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [firstName, lastName, mobileNumber, email, activeStep]);

  // Real-Time Mobile Input Validation & Lookup
  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(clean);
    setDuplicateCustomer(null);

    if (clean.length === 0) {
      setMobileStatusState("IDLE");
      setMobileStatusMessage("");
      return;
    }

    if (!/^[6789]/.test(clean)) {
      setMobileStatusState("INVALID");
      setMobileStatusMessage("Mobile number must start with 6, 7, 8, or 9");
      return;
    }

    if (clean.length < 10) {
      setMobileStatusState("INVALID");
      setMobileStatusMessage(`Incomplete: 10 digits required (${clean.length}/10)`);
      return;
    }

    // Exactly 10 digits & valid prefix -> Trigger Auto Duplicate Check
    setMobileStatusState("CHECKING");
    setMobileStatusMessage("Checking database (tenant_id + company_id + mobile_number)...");

    retailerApi.searchPayoutCustomer(clean).then((res) => {
      if (res.status === "SUCCESS" && res.data.length > 0) {
        setMobileStatusState("EXISTING_CUSTOMER");
        setMobileStatusMessage("Existing Customer Found in Database");
        setDuplicateCustomer(res.data[0]);
      } else {
        setMobileStatusState("NEW_CUSTOMER");
        setMobileStatusMessage("✓ New Customer: Valid & Available for Registration");
        setDuplicateCustomer(null);
      }
    });
  };

  // Step 1: Submit Registration
  const handleStep1Submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (mobileStatusState !== "NEW_CUSTOMER" || mobileNumber.length !== 10) return;

    setStep1Loading(true);
    const regRes = await retailerApi.registerPayoutCustomer({
      first_name: firstName,
      last_name: lastName,
      mobile_number: mobileNumber,
      email: email || undefined,
    });
    setStep1Loading(false);

    if (regRes.status === "SUCCESS") {
      setCreatedCustomer(regRes.data);
      triggerMobileOtp("WHATSAPP");
      setActiveStep(1);
    }
  };

  // Trigger Mobile OTP
  const triggerMobileOtp = async (channel: "WHATSAPP" | "SMS") => {
    setOtpChannel(channel);
    await retailerApi.generateMobileOtp(mobileNumber, channel);
    notificationEngine.notify("OTP_RECEIVED");
  };

  // Step 2: Verify Mobile OTP
  const handleStep2Submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (mobileOtp.length < 4) return;

    setStep2Loading(true);
    const res = await retailerApi.verifyMobileOtp(mobileNumber, mobileOtp);
    setStep2Loading(false);

    if (res.status === "SUCCESS") {
      notificationEngine.notify("CUSTOMER_VERIFIED");
      setActiveStep(2);
    } else {
      setOtpAttemptsLeft((prev) => prev - 1);
      notificationEngine.notify("TRANSACTION_FAILED", "Invalid Mobile OTP code");
    }
  };

  // Step 3: Generate Aadhaar OTP
  const handleGenerateAadhaarOtp = async () => {
    const cleanAadhaar = aadhaarNumber.replace(/\D/g, "");
    if (cleanAadhaar.length !== 12) {
      alert("Aadhaar Number must be exactly 12 digits!");
      return;
    }
    setStep3Loading(true);
    const res = await retailerApi.generateAadhaarOtp(cleanAadhaar);
    setStep3Loading(false);

    if (res.status === "SUCCESS") {
      setAadhaarOtpSent(true);
      setAadhaarRefNum(res.data.ref_number);
      setMaskedAadhaar(res.data.masked_aadhaar);
      notificationEngine.notify("OTP_RECEIVED", "Aadhaar eKYC OTP Dispatched");
    }
  };

  // Step 3: Verify Aadhaar OTP (Cashfree eKYC)
  const handleVerifyAadhaarOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (aadhaarOtp.length < 4 || !createdCustomer) return;

    setStep3Loading(true);
    const res = await retailerApi.verifyAadhaarOtp({
      customer_id: createdCustomer.public_id,
      ref_number: aadhaarRefNum,
      otp_code: aadhaarOtp,
      masked_aadhaar: maskedAadhaar,
    });
    setStep3Loading(false);

    if (res.status === "SUCCESS") {
      notificationEngine.notify("AADHAAR_EKYC_COMPLETED");
      setActiveStep(3);
    } else {
      notificationEngine.notify("TRANSACTION_FAILED", "Invalid Aadhaar OTP code");
    }
  };

  // Step 4: Set Security PIN
  const handleStep4Submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length < 4) {
      setPinError("PIN must be 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      setPinError("PINs do not match");
      return;
    }
    if (!createdCustomer) return;

    setStep4Loading(true);
    const res = await retailerApi.setCustomerPin(createdCustomer.public_id, pin);
    setStep4Loading(false);

    if (res.status === "SUCCESS") {
      notificationEngine.notify("CUSTOMER_VERIFIED", "Transaction Security PIN Created");
      setActiveStep(4);
    }
  };

  // Return to Originating Transaction Page
  const handleCompleteAndReturn = (customerToSelect: any) => {
    setSelectedCustomer(customerToSelect);
    localStorage.removeItem("pay2pay_customer_workspace_draft");
    const targetUrl = referrerUrl || "/retailer/dmt";
    router.push(targetUrl);
  };

  // Resume Incomplete Onboarding
  const handleResumeOnboarding = (cust: any) => {
    setCreatedCustomer(cust);
    setFirstName(cust.first_name || cust.full_name?.split(" ")[0] || "");
    setLastName(cust.last_name || cust.full_name?.split(" ")[1] || "");
    setEmail(cust.email || "");

    if (cust.mobile_otp_verified === false) {
      triggerMobileOtp("WHATSAPP");
      setActiveStep(1);
    } else if (cust.aadhaar_status === "PENDING" || cust.kyc_status !== "VERIFIED") {
      setActiveStep(2);
    } else if (cust.pin_status === "NOT_SET") {
      setActiveStep(3);
    } else {
      setActiveStep(2);
    }
  };

  const handleSearchAnother = () => {
    setMobileNumber("");
    setDuplicateCustomer(null);
    setMobileStatusState("IDLE");
    setMobileStatusMessage("");
    setFirstName("");
    setLastName("");
    setEmail("");
  };

  const handleCancel = () => {
    router.push(referrerUrl || "/retailer/dmt");
  };

  const completionPercentage = Math.round(((activeStep + 1) / STEPS.length) * 100);

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#F8FAFC", display: "flex", flexDirection: "column" }}>
      {/* ── STICKY ENTERPRISE HEADER ── */}
      <Paper
        square
        elevation={0}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          px: 3,
          py: 2,
          background: "linear-gradient(90deg, #1E1B4B 0%, #312E81 100%)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <IconButton onClick={handleCancel} sx={{ color: "#FFF", bgcolor: "rgba(255,255,255,0.1)" }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: "-0.3px" }}>
                Enterprise Customer Onboarding Workspace
              </Typography>
              <Chip
                label="Full-Screen Route"
                size="small"
                sx={{ bgcolor: "#4ADE80", color: "#14532D", fontWeight: 800, fontSize: "0.65rem" }}
              />
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600 }}>
              Master Data Registration • Auto-saves draft • Returns to transaction
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box sx={{ textAlign: "right", display: { xs: "none", md: "block" } }}>
            <Typography variant="caption" sx={{ color: "#818CF8", display: "block", fontWeight: 700 }}>
              Draft Saved: {lastSaved}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Press Ctrl+S to save draft
            </Typography>
          </Box>

          <M3Button
            variant="outlined"
            size="small"
            onClick={saveDraft}
            startIcon={<SaveIcon />}
            sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.3)", "&:hover": { borderColor: "#FFF" } }}
          >
            Save Draft
          </M3Button>

          <IconButton onClick={handleCancel} sx={{ color: "#FFF" }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Paper>

      {/* ── WORKSPACE BODY (2-COLUMN RESPONSIVE LAYOUT) ── */}
      <Box sx={{ flex: 1, maxWidth: 1400, width: "100%", mx: "auto", p: { xs: 2, md: 4 }, pb: 12 }}>
        <Grid container spacing={4}>
          {/* ── LEFT PROGRESS SIDEBAR (DESKTOP) ── */}
          <Grid size={{ xs: 12, md: 4, lg: 3 }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                border: "1px solid #E2E8F0",
                backgroundColor: "#FFFFFF",
                position: { md: "sticky" },
                top: { md: 100 },
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#1E1B4B", mb: 0.5 }}>
                Registration Progress
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 2 }}>
                Step {activeStep + 1} of {STEPS.length}
              </Typography>

              {/* Progress Meter */}
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.75 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "#312E81" }}>
                    Completion Status
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: "#16A34A" }}>
                    {completionPercentage}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={completionPercentage}
                  sx={{ height: 8, borderRadius: 4, bgcolor: "#E2E8F0", "& .MuiLinearProgress-bar": { bgcolor: "#16A34A" } }}
                />
              </Box>

              {/* Vertical Stepper List */}
              <Stack spacing={2} sx={{ mb: 3 }}>
                {STEPS.map((s, idx) => {
                  const isDone = activeStep > idx;
                  const isCurrent = activeStep === idx;
                  return (
                    <Paper
                      key={s.label}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        border: isCurrent ? "2px solid #4F46E5" : "1px solid #F1F5F9",
                        backgroundColor: isCurrent ? "#EEF2FF" : isDone ? "#F0FDF4" : "#FAF5FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            fontSize: "0.75rem",
                            fontWeight: 900,
                            bgcolor: isDone ? "#16A34A" : isCurrent ? "#312E81" : "#94A3B8",
                          }}
                        >
                          {isDone ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : idx + 1}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: isCurrent ? 900 : 700, color: isCurrent ? "#1E1B4B" : "#334155" }}>
                            {s.label}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#64748B", fontSize: "0.68rem" }}>
                            Est. {s.est}
                          </Typography>
                        </Box>
                      </Stack>

                      {isDone && <Chip label="Done" size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#DCFCE7", color: "#15803D", fontWeight: 800 }} />}
                    </Paper>
                  );
                })}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "#64748B" }}>
                <AccessTimeIcon sx={{ fontSize: 18 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Est. Remaining: ~2 minutes
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          {/* ── MAIN WORKSPACE CONTENT ── */}
          <Grid size={{ xs: 12, md: 8, lg: 9 }}>
            <AnimatePresence mode="wait">
              {/* STEP 0: SMART IDENTIFICATION & MOBILE LOOKUP */}
              {activeStep === 0 && (
                <motion.div key="ws-step0" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: "#1E1B4B", mb: 0.5 }}>
                      Step 1 — Customer Identification & Duplicate Lookup
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                      Enter 10-digit mobile number to search tenant and company database before creation.
                    </Typography>

                    <Stack spacing={3}>
                      <M3TextField
                        label="Mobile Number *"
                        value={mobileNumber}
                        onChange={(e) => handleMobileChange(e.target.value)}
                        placeholder="e.g. 98765 43210"
                        helperText={`${mobileNumber.length}/10 Digits`}
                        endAdornment={
                          mobileStatusState === "CHECKING" ? (
                            <CircularProgress size={20} />
                          ) : mobileStatusState === "NEW_CUSTOMER" ? (
                            <CheckCircleIcon sx={{ color: "#16A34A" }} />
                          ) : mobileStatusState === "EXISTING_CUSTOMER" ? (
                            <VerifiedIcon sx={{ color: "#2563EB" }} />
                          ) : undefined
                        }
                      />

                      {mobileStatusState === "INVALID" && mobileStatusMessage && (
                        <Alert severity="error" sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                          {mobileStatusMessage}
                        </Alert>
                      )}

                      <AnimatePresence mode="wait">
                        {/* CHECKING STATE */}
                        {mobileStatusState === "CHECKING" && (
                          <motion.div key="ws-checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Paper elevation={0} sx={{ p: 3, textAlign: "center", borderRadius: 3, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                              <CircularProgress size={26} sx={{ mb: 1, color: "#312E81" }} />
                              <Typography variant="body2" sx={{ fontWeight: 700, color: "#334155" }}>
                                Searching customer master database for +91 {mobileNumber}...
                              </Typography>
                            </Paper>
                          </motion.div>
                        )}

                        {/* EXISTING CUSTOMER SUMMARY CARD */}
                        {mobileStatusState === "EXISTING_CUSTOMER" && duplicateCustomer && (
                          <motion.div key="ws-existing" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                            <Paper
                              elevation={0}
                              sx={{
                                p: 3,
                                borderRadius: 4,
                                border: "1px solid #C7D2FE",
                                background: "linear-gradient(180deg, #EEF2FF 0%, #FFFFFF 100%)",
                                boxShadow: "0 4px 20px rgba(49, 46, 129, 0.08)",
                              }}
                            >
                              <Stack direction="row" spacing={2.5} sx={{ alignItems: "center", mb: 2.5 }}>
                                <Avatar
                                  sx={{
                                    width: 60,
                                    height: 60,
                                    background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                                    fontWeight: 900,
                                    fontSize: "1.4rem",
                                    boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
                                  }}
                                >
                                  {(duplicateCustomer.first_name || duplicateCustomer.full_name || "C")[0]}
                                  {(duplicateCustomer.last_name || "")[0]}
                                </Avatar>

                                <Box sx={{ flexGrow: 1 }}>
                                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 0.5 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                                      {duplicateCustomer.full_name || `${duplicateCustomer.first_name} ${duplicateCustomer.last_name}`}
                                    </Typography>
                                    <Chip
                                      label={`Risk Score ${duplicateCustomer.risk_score || 12}`}
                                      size="small"
                                      sx={{
                                        fontWeight: 800,
                                        bgcolor: (duplicateCustomer.risk_score || 12) < 30 ? "#DCFCE7" : "#FEF3C7",
                                        color: (duplicateCustomer.risk_score || 12) < 30 ? "#15803D" : "#B45309",
                                      }}
                                    />
                                  </Stack>
                                  <Typography variant="body2" sx={{ color: "#64748B", fontWeight: 700 }}>
                                    ID: {duplicateCustomer.customer_number || duplicateCustomer.public_id} • Mobile: +91 {duplicateCustomer.mobile_number}
                                  </Typography>
                                </Box>
                              </Stack>

                              <Divider sx={{ my: 2, borderColor: "#E0E7FF" }} />

                              {/* 4 Status Pill Badges Grid */}
                              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                  <Chip
                                    icon={<CheckCircleIcon sx={{ fontSize: "16px !important", color: "#16A34A !important" }} />}
                                    label={`KYC: ${duplicateCustomer.kyc_status || 'VERIFIED'}`}
                                    sx={{ width: "100%", justifyContent: "flex-start", bgcolor: "#DCFCE7", color: "#15803D", fontWeight: 800 }}
                                  />
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                  <Chip
                                    icon={<ShieldIcon sx={{ fontSize: "16px !important", color: "#0284C7 !important" }} />}
                                    label={`Aadhaar: ${duplicateCustomer.aadhaar_status || 'VERIFIED'}`}
                                    sx={{ width: "100%", justifyContent: "flex-start", bgcolor: "#E0F2FE", color: "#0369A1", fontWeight: 800 }}
                                  />
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                  <Chip
                                    icon={<VerifiedIcon sx={{ fontSize: "16px !important", color: "#4F46E5 !important" }} />}
                                    label={`PAN: ${duplicateCustomer.pan_status || 'VERIFIED'}`}
                                    sx={{ width: "100%", justifyContent: "flex-start", bgcolor: "#EEF2FF", color: "#4338CA", fontWeight: 800 }}
                                  />
                                </Grid>
                                <Grid size={{ xs: 6, sm: 3 }}>
                                  <Chip
                                    icon={<LockIcon sx={{ fontSize: "16px !important", color: duplicateCustomer.pin_status === 'SET' ? "#16A34A !important" : "#D97706 !important" }} />}
                                    label={`PIN: ${duplicateCustomer.pin_status || 'SET'}`}
                                    sx={{
                                      width: "100%",
                                      justifyContent: "flex-start",
                                      bgcolor: duplicateCustomer.pin_status === 'SET' ? "#F0FDF4" : "#FEF3C7",
                                      color: duplicateCustomer.pin_status === 'SET' ? "#16A34A" : "#B45309",
                                      fontWeight: 800,
                                    }}
                                  />
                                </Grid>
                              </Grid>

                              {/* Monthly Limit Progress */}
                              <Box sx={{ mb: 3, p: 2, borderRadius: 3, bgcolor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                                <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 800, color: "#475569" }}>
                                    Monthly Transaction Limit Remaining
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 900, color: "#16A34A" }}>
                                    ₹{(duplicateCustomer.monthly_remaining || 75000).toLocaleString("en-IN")}
                                  </Typography>
                                </Stack>
                                <LinearProgress
                                  variant="determinate"
                                  value={((duplicateCustomer.monthly_used || 125000) / (duplicateCustomer.monthly_limit || 200000)) * 100}
                                  sx={{ height: 8, borderRadius: 4, bgcolor: "#E2E8F0", "& .MuiLinearProgress-bar": { bgcolor: "#16A34A" } }}
                                />
                              </Box>

                              <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, display: "block", mb: 3, textAlign: "center" }}>
                                Last Transaction: {duplicateCustomer.last_transaction || "2 mins ago • ₹5,000 (IMPS)"}
                              </Typography>

                              {(!duplicateCustomer.onboarding_complete || duplicateCustomer.pin_status === "NOT_SET" || duplicateCustomer.aadhaar_status === "PENDING") && (
                                <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3, borderRadius: 3, fontWeight: 700 }}>
                                  Incomplete Onboarding Detected: Aadhaar eKYC or PIN setup pending. You can resume setup now.
                                </Alert>
                              )}

                              {/* Actions */}
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                                <M3Button
                                  variant="contained"
                                  fullWidth
                                  onClick={() => handleCompleteAndReturn(duplicateCustomer)}
                                  sx={{ py: 1.5, fontWeight: 800, bgcolor: "#312E81", "&:hover": { bgcolor: "#1E1B4B" } }}
                                >
                                  Select & Return to Transaction →
                                </M3Button>

                                {(!duplicateCustomer.onboarding_complete || duplicateCustomer.pin_status === "NOT_SET" || duplicateCustomer.aadhaar_status === "PENDING") && (
                                  <M3Button
                                    variant="outlined"
                                    color="warning"
                                    fullWidth
                                    onClick={() => handleResumeOnboarding(duplicateCustomer)}
                                    sx={{ py: 1.5, fontWeight: 800 }}
                                  >
                                    Resume Onboarding →
                                  </M3Button>
                                )}

                                <M3Button
                                  variant="text"
                                  fullWidth
                                  onClick={handleSearchAnother}
                                  startIcon={<RestartAltIcon />}
                                  sx={{ color: "#64748B", fontWeight: 700 }}
                                >
                                  Search Another Mobile
                                </M3Button>
                              </Stack>
                            </Paper>
                          </motion.div>
                        )}

                        {/* NEW CUSTOMER FORM */}
                        {mobileStatusState === "NEW_CUSTOMER" && (
                          <motion.div key="ws-newform" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                            <Paper elevation={0} sx={{ p: 3, borderRadius: 3.5, border: "1px solid #BBF7D0", bgcolor: "#F0FDF4", mb: 3 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#166534", display: "flex", alignItems: "center", gap: 1 }}>
                                <CheckCircleIcon />
                                New Mobile Available — Complete Customer Details
                              </Typography>
                            </Paper>

                            <form onSubmit={handleStep1Submit}>
                              <Stack spacing={3}>
                                <Grid container spacing={2}>
                                  <Grid size={{ xs: 12, sm: 6 }}>
                                    <M3TextField label="First Name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                                  </Grid>
                                  <Grid size={{ xs: 12, sm: 6 }}>
                                    <M3TextField label="Last Name *" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                                  </Grid>
                                </Grid>

                                <M3TextField label="Email Address (Optional)" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />

                                <M3Button
                                  type="submit"
                                  variant="contained"
                                  loading={step1Loading}
                                  disabled={!firstName || !lastName}
                                  sx={{ py: 1.75, fontSize: "1rem" }}
                                >
                                  Continue to Mobile OTP Verification →
                                </M3Button>
                              </Stack>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Stack>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 1: MOBILE OTP */}
              {activeStep === 1 && (
                <motion.div key="ws-step1" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: "#1E1B4B", mb: 0.5 }}>
                      Step 2 — Mobile OTP Verification
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                      Sent 6-digit verification code to <strong>+91 {mobileNumber}</strong> via {otpChannel}.
                    </Typography>

                    <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
                      <Chip icon={<WhatsAppIcon sx={{ color: "#25D366 !important" }} />} label="WhatsApp OTP First" sx={{ bgcolor: "#DCFCE7", color: "#15803D", fontWeight: 700 }} />
                      <Chip icon={<SmsIcon sx={{ color: "#0284C7 !important" }} />} label="SMS Fallback" sx={{ bgcolor: "#E0F2FE", color: "#0369A1", fontWeight: 700 }} />
                    </Stack>

                    <form onSubmit={handleStep2Submit}>
                      <Stack spacing={3}>
                        <M3TextField
                          label="Enter 6-Digit Mobile OTP *"
                          value={mobileOtp}
                          onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="123456"
                          required
                        />

                        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
                            Attempts left: {otpAttemptsLeft}/3
                          </Typography>
                          <M3Button variant="text" size="small" onClick={() => triggerMobileOtp(otpChannel === "WHATSAPP" ? "SMS" : "WHATSAPP")}>
                            Resend via {otpChannel === "WHATSAPP" ? "SMS" : "WhatsApp"}
                          </M3Button>
                        </Stack>

                        <M3Button type="submit" variant="contained" loading={step2Loading} disabled={mobileOtp.length < 4} sx={{ py: 1.75, fontSize: "1rem" }}>
                          Verify Mobile OTP & Continue to eKYC →
                        </M3Button>
                      </Stack>
                    </form>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 2: AADHAAR EKYC */}
              {activeStep === 2 && (
                <motion.div key="ws-step2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
                      <ShieldIcon sx={{ color: "#2563EB", fontSize: 28 }} />
                      <Typography variant="h6" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                        Step 3 — Cashfree Aadhaar eKYC Verification
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: "#64748B", mb: 4 }}>
                      Official UIDAI biometric identity verification using Cashfree Aadhaar Verification API.
                    </Typography>

                    {!aadhaarOtpSent ? (
                      <Stack spacing={3}>
                        <M3TextField
                          label="12-Digit Aadhaar Number *"
                          value={aadhaarNumber}
                          onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                          placeholder="XXXX-XXXX-XXXX"
                        />
                        <M3Button variant="contained" loading={step3Loading} disabled={aadhaarNumber.length !== 12} onClick={handleGenerateAadhaarOtp} sx={{ py: 1.75 }}>
                          Generate Aadhaar OTP via Cashfree →
                        </M3Button>
                      </Stack>
                    ) : (
                      <form onSubmit={handleVerifyAadhaarOtp}>
                        <Stack spacing={3}>
                          <Alert severity="info" sx={{ borderRadius: 3, fontWeight: 700 }}>
                            OTP dispatched to mobile linked with Masked Aadhaar: {maskedAadhaar}
                          </Alert>
                          <M3TextField
                            label="Enter 6-Digit Aadhaar OTP *"
                            value={aadhaarOtp}
                            onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="123456"
                            required
                          />
                          <M3Button type="submit" variant="contained" loading={step3Loading} disabled={aadhaarOtp.length < 4} sx={{ py: 1.75 }}>
                            Verify Cashfree eKYC & Proceed →
                          </M3Button>
                        </Stack>
                      </form>
                    )}
                  </Paper>
                </motion.div>
              )}

              {/* STEP 3: TRANSACTION PIN SETUP */}
              {activeStep === 3 && (
                <motion.div key="ws-step3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
                      <LockIcon sx={{ color: "#312E81", fontSize: 28 }} />
                      <Typography variant="h6" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
                        Step 4 — Set Transaction Security PIN
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: "#64748B", mb: 4 }}>
                      Set a secret 4-digit PIN to authorize future payout transactions for this customer.
                    </Typography>

                    <form onSubmit={handleStep4Submit}>
                      <Stack spacing={3}>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <M3TextField
                              label="4-Digit Security PIN *"
                              type="password"
                              value={pin}
                              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                              placeholder="••••"
                              required
                            />
                          </Grid>
                          <Grid size={{ xs: 12, sm: 6 }}>
                            <M3TextField
                              label="Confirm Security PIN *"
                              type="password"
                              value={confirmPin}
                              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                              placeholder="••••"
                              required
                            />
                          </Grid>
                        </Grid>

                        {pinError && <Alert severity="error" sx={{ borderRadius: 2.5, fontWeight: 700 }}>{pinError}</Alert>}

                        <M3Button type="submit" variant="contained" loading={step4Loading} disabled={pin.length < 4} sx={{ py: 1.75 }}>
                          Save Security PIN & Finish Onboarding →
                        </M3Button>
                      </Stack>
                    </form>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 4: ONBOARDING COMPLETE */}
              {activeStep === 4 && (
                <motion.div key="ws-step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <Paper elevation={0} sx={{ p: 5, borderRadius: 4, border: "1px solid #BBF7D0", backgroundColor: "#F0FDF4", textAlign: "center" }}>
                    <CheckCircleIcon sx={{ fontSize: 72, color: "#16A34A", mb: 2 }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, color: "#14532D", mb: 1 }}>
                      Customer Master Record Created!
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#15803D", mb: 4, maxWidth: 500, mx: "auto" }}>
                      Customer <strong>{firstName} {lastName}</strong> (+91 {mobileNumber}) has been registered and verified via Cashfree Aadhaar eKYC.
                    </Typography>

                    <M3Button
                      variant="contained"
                      size="large"
                      onClick={() => handleCompleteAndReturn(createdCustomer)}
                      sx={{ py: 1.75, px: 5, fontWeight: 900, bgcolor: "#15803D", "&:hover": { bgcolor: "#166534" } }}
                    >
                      Return to Transaction & Auto-Select Customer →
                    </M3Button>
                  </Paper>
                </motion.div>
              )}
            </AnimatePresence>
          </Grid>
        </Grid>
      </Box>

      {/* ── STICKY BOTTOM ACTION FOOTER ── */}
      <Paper
        square
        elevation={0}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          px: 4,
          py: 2,
          backgroundColor: "#FFFFFF",
          borderTop: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.05)",
        }}
      >
        <Stack direction="row" spacing={2}>
          <M3Button variant="text" onClick={handleCancel} sx={{ color: "#64748B" }}>
            Cancel
          </M3Button>
          <M3Button variant="outlined" onClick={saveDraft} startIcon={<SaveIcon />}>
            Save Draft
          </M3Button>
        </Stack>

        <Stack direction="row" spacing={2}>
          {activeStep > 0 && (
            <M3Button variant="outlined" onClick={() => setActiveStep((prev) => prev - 1)}>
              ← Previous Step
            </M3Button>
          )}

          {activeStep < 4 && (
            <M3Button
              variant="contained"
              onClick={() => {
                if (activeStep === 0 && mobileStatusState === "NEW_CUSTOMER") handleStep1Submit();
                else if (activeStep === 1) handleStep2Submit();
                else if (activeStep === 2) handleVerifyAadhaarOtp();
                else if (activeStep === 3) handleStep4Submit();
              }}
              disabled={activeStep === 0 && mobileStatusState !== "NEW_CUSTOMER"}
              sx={{ bgcolor: "#312E81", px: 4 }}
            >
              Continue →
            </M3Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
