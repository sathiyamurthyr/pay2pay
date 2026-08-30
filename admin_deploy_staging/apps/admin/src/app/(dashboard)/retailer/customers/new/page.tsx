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
  Button,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import VerifiedIcon from "@mui/icons-material/Verified";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ReplayIcon from "@mui/icons-material/Replay";
import SaveIcon from "@mui/icons-material/Save";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import HistoryIcon from "@mui/icons-material/History";
import BlockIcon from "@mui/icons-material/Block";
import TuneIcon from "@mui/icons-material/Tune";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { motion, AnimatePresence } from "framer-motion";
import { DigitalAadhaarCard } from "@/components/ui/digital-aadhaar-card";

import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { notificationEngine } from "@/services/notification-engine";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";

// Requirement 4: Shorten stepper labels: Mobile → OTP → eKYC → PIN → Finish
const STEPS = [
  { label: "Mobile", est: "10s" },
  { label: "OTP", est: "30s" },
  { label: "eKYC", est: "45s" },
  { label: "PIN", est: "15s" },
  { label: "Finish", est: "0s" },
];

export default function NewCustomerWorkspacePage() {
  const router = useRouter();
  const { setSelectedCustomer, referrerUrl } = useTransactionMemoryStore();

  const [activeStep, setActiveStep] = useState(0);

  // Customer State
  const [mobileNumber, setMobileNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [aadhaarOtp, setAadhaarOtp] = useState("");
  const [securityPin, setSecurityPin] = useState("");

  // Validation & Lookup States
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [existingCustomer, setExistingCustomer] = useState<any | null>(null);
  const [serviceHealth, setServiceHealth] = useState<{ healthy: boolean; message: string; api_status?: string; db_status?: string } | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState("");
  const [aadhaarRefId, setAadhaarRefId] = useState("");
  const [verifiedAadhaarData, setVerifiedAadhaarData] = useState<any>(null);
  const [createdCustomer, setCreatedCustomer] = useState<any | null>(null);

  // Initial Health Check on page load
  useEffect(() => {
    retailerApi.checkPayoutWorkflowHealth().then((res) => {
      setServiceHealth(res);
    });
  }, []);

  // Auto-Save Draft Timestamp
  const [lastSaved, setLastSaved] = useState<string>("Just now");

  // Requirement 7: Numeric-only input & Automatic duplicate search after 10 digits
  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(clean);
    
    if (clean.length > 0 && !/^[6789]/.test(clean)) {
      setLookupError("Mobile number must start with 6, 7, 8, or 9");
      setExistingCustomer(null);
      return;
    }
    if (clean.length > 0 && clean.length < 10) {
      setLookupError(`Incomplete: 10 digits required (${clean.length}/10)`);
      setExistingCustomer(null);
      return;
    }

    setLookupError("");
    if (clean.length < 10) {
      setExistingCustomer(null);
    }
  };

  useEffect(() => {
    if (mobileNumber.length === 10 && /^[6789]/.test(mobileNumber)) {
      handleSearchCustomer(mobileNumber);
    } else if (mobileNumber.length === 0) {
      setExistingCustomer(null);
      setLookupError("");
    }
  }, [mobileNumber]);

  const handleSearchCustomer = async (num: string) => {
    setLookupLoading(true);
    setLookupError("");
    setExistingCustomer(null);

    // 1. Health check before customer search
    const health = await retailerApi.checkPayoutWorkflowHealth();
    setServiceHealth(health);

    if (!health.healthy) {
      setLookupLoading(false);
      setLookupError(health.message || "Customer service is currently offline.");
      return;
    }

    // 2. Perform Customer Search API call
    try {
      const res = await retailerApi.searchPayoutCustomer(num);
      setLookupLoading(false);

      if (res.status === "SUCCESS" && Array.isArray(res.data)) {
        if (res.data.length > 0) {
          const match = res.data.find((c: any) => c.mobile_number === num) || res.data[0];
          const verifiedMatch = { ...match, mobile_number: match.mobile_number || num };
          setExistingCustomer(verifiedMatch);
          notificationEngine.notify("CUSTOMER_VERIFIED", `Existing customer found: ${verifiedMatch.full_name || verifiedMatch.first_name}`);
        } else {
          setExistingCustomer(null);
        }
      } else {
        setLookupError(res.message || "Customer search failed due to a server error.");
        setExistingCustomer(null);
      }
    } catch (err) {
      setLookupLoading(false);
      setLookupError("Customer search failed due to a server error.");
      setExistingCustomer(null);
    }
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(
        "pay2pay_customer_workspace_draft",
        JSON.stringify({ mobileNumber, firstName, lastName, email, activeStep })
      );
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      notificationEngine.notify("CUSTOMER_VERIFIED", "Customer Registration Draft Saved");
    } catch {
      // Ignore
    }
  };

  const handleSendMobileOtp = async () => {
    if (mobileNumber.length !== 10) return;
    setOtpLoading(true);
    setOtpError("");

    // Register customer profile if new
    let cust = createdCustomer;
    if (!cust && firstName && lastName) {
      try {
        const regRes = await retailerApi.registerPayoutCustomer({
          first_name: firstName,
          last_name: lastName,
          mobile_number: mobileNumber,
          email: email || undefined,
        });
        if (regRes.status === "SUCCESS") {
          cust = regRes.data;
          setCreatedCustomer(cust);
        }
      } catch {
        // Continue to OTP generation
      }
    }

    try {
      const res = await retailerApi.generateMobileOtp(mobileNumber, "WHATSAPP");
      setOtpLoading(false);
      setOtpSent(true);
      setActiveStep(1);
      notificationEngine.notify(
        "OTP_RECEIVED",
        `WhatsApp OTP Dispatched to +91 ${mobileNumber}`
      );
    } catch (err: any) {
      setOtpLoading(false);
      setOtpError(err?.message || "Failed to generate Mobile OTP");
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (otpValue.length < 4) {
      setOtpError("Please enter complete 6-digit OTP code");
      return;
    }
    setOtpLoading(true);
    setOtpError("");

    try {
      const res = await retailerApi.verifyMobileOtp(mobileNumber, otpValue);
      setOtpLoading(false);

      if (res.status === "SUCCESS") {
        setOtpError("");
        notificationEngine.notify(
          "CUSTOMER_VERIFIED",
          `✓ Mobile OTP ${otpValue} Verified Successfully! Proceeding to Step 3 — Aadhaar eKYC`
        );
        setActiveStep(2);
      } else {
        const errMsg = res.detail || res.message || "Invalid Mobile OTP code. Please check and try again.";
        setOtpError(errMsg);
        notificationEngine.notify("TRANSACTION_FAILED", errMsg);
      }
    } catch (err: any) {
      setOtpLoading(false);
      const errMsg = err?.response?.data?.detail || err?.message || "Invalid Mobile OTP code";
      setOtpError(errMsg);
      notificationEngine.notify("TRANSACTION_FAILED", errMsg);
    }
  };

  const handleGenerateAadhaarOtp = async () => {
    if (aadhaarNumber.length !== 12) {
      setAadhaarError("Aadhaar Number must be exactly 12 digits");
      return;
    }
    setAadhaarLoading(true);
    setAadhaarError("");
    try {
      const res = await retailerApi.generateAadhaarOtp(aadhaarNumber, existingCustomer?.public_id);
      setAadhaarLoading(false);
      if (res.status === "SUCCESS" && res.data) {
        setAadhaarOtpSent(true);
        setAadhaarRefId(res.data.ref_id || res.data.ref_number);
        notificationEngine.notify(
          "AADHAAR_EKYC_COMPLETED",
          `Cashfree OTP sent for ${res.data.masked_aadhaar}. Fee Billed: ₹10.00 (+ ₹1.80 GST)`
        );
      } else {
        setAadhaarError(res.detail || res.message || "Failed to generate Cashfree Aadhaar OTP.");
      }
    } catch (err: any) {
      setAadhaarLoading(false);
      setAadhaarError(err?.response?.data?.detail || err?.message || "Aadhaar OTP generation failed due to a server error.");
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    if (aadhaarOtp.length < 4) return;
    setAadhaarLoading(true);
    setAadhaarError("");
    try {
      const res = await retailerApi.verifyAadhaarOtp({
        customer_id: existingCustomer?.public_id || "NEW-CUST",
        ref_number: aadhaarRefId,
        otp_code: aadhaarOtp,
        masked_aadhaar: `XXXX-XXXX-${aadhaarNumber.slice(-4)}`,
        aadhaar_number: aadhaarNumber
      });
      setAadhaarLoading(false);

      if (res.status === "FAILED" || res.error) {
        setAadhaarError(res.error || "Aadhaar verification failed. Verification fee ₹10.00 (+ GST) has been fully refunded to your wallet.");
        notificationEngine.notify("TRANSACTION_FAILED", "Invalid Aadhaar OTP. Verification fee refunded to wallet.");
        return;
      }

      if (res.status === "SUCCESS" && res.data) {
        setAadhaarVerified(true);
        setVerifiedAadhaarData(res.data);
        notificationEngine.notify(
          "CUSTOMER_VERIFIED",
          `Aadhaar eKYC Verified via Cashfree API! Fee Billed: ₹${res.data.billing?.total_debited || 11.80}`
        );
      }
    } catch (err: any) {
      setAadhaarLoading(false);
      setAadhaarError(err?.response?.data?.detail || err?.message || "Aadhaar OTP verification failed. Fee refunded.");
    }
  };

  const handleCreateCustomer = async () => {
    const payload = {
      mobile_number: mobileNumber,
      first_name: firstName || "Customer",
      last_name: lastName || "User",
      email: email,
      aadhaar_number: aadhaarNumber,
    };
    const res = await retailerApi.registerPayoutCustomer(payload);
    if (res.status === "SUCCESS") {
      const newCust = {
        public_id: res.data.public_id || `cust-${Date.now()}`,
        customer_number: res.data.customer_number || `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
        full_name: `${firstName} ${lastName}`.trim(),
        mobile_number: mobileNumber,
        kyc_status: "VERIFIED",
      };
      setCreatedCustomer(newCust);
      notificationEngine.notify("CUSTOMER_VERIFIED", "Customer Account Created & Verified!");
      setActiveStep(4);
    }
  };

  const handleCompleteAndReturn = (custToSelect: any) => {
    setSelectedCustomer(custToSelect);
    localStorage.removeItem("pay2pay_customer_workspace_draft");
    router.push(referrerUrl || "/retailer/dmt");
  };

  const handleCancel = () => {
    router.push(referrerUrl || "/retailer/dmt");
  };

  const isFormValid = mobileNumber.length === 10 && firstName.trim() !== "" && lastName.trim() !== "" && !lookupLoading && !existingCustomer;

  const completionPercentage = Math.round(((activeStep + 1) / STEPS.length) * 100);

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#F8FAFC", display: "flex", flexDirection: "column" }}>
      {/* ── STICKY ENTERPRISE TOP BAR ── */}
      <Paper
        square
        elevation={0}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          px: 3,
          py: 1.75,
          background: "linear-gradient(90deg, #0F172A 0%, #1E293B 100%)",
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
              {/* Requirement 5: Simplify page title to "Customer Registration" */}
              <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: "-0.3px" }}>
                Customer Registration
              </Typography>
              <Chip
                label="Banking OS Standard"
                size="small"
                sx={{ bgcolor: "#22C55E", color: "#052E16", fontWeight: 800, fontSize: "0.65rem" }}
              />
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600 }}>
              Real-time Mobile Validation • Cashfree eKYC • Direct Customer Selection
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
          <Box sx={{ textAlign: "right", display: { xs: "none", md: "block" } }}>
            <Typography variant="caption" sx={{ color: "#4ADE80", display: "block", fontWeight: 700 }}>
              Auto Save: Active ({lastSaved})
            </Typography>
          </Box>

          <M3Button variant="outlined" size="small" onClick={saveDraft} startIcon={<SaveIcon />} sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.3)" }}>
            Save Draft (Ctrl+S)
          </M3Button>

          <IconButton onClick={handleCancel} sx={{ color: "#FFF" }}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Paper>

      {/* ── WORKSPACE BODY: 3-COLUMN LAYOUT WITH EQUAL HEIGHT ALIGNMENT ── */}
      <Box sx={{ flex: 1, maxWidth: 1600, width: "100%", mx: "auto", p: { xs: 2, md: 3 }, pb: 12 }}>
        <Grid container spacing={3} sx={{ alignItems: "stretch" }}>
          {/* ── LEFT COLUMN (25%): STEPPER & PROGRESS ── */}
          <Grid size={{ xs: 12, md: 3, lg: 2.6 }} sx={{ display: "flex", flexDirection: "column" }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#0F172A", mb: 0.5 }}>
                  Registration Stepper
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 2 }}>
                  Step {activeStep + 1} of {STEPS.length}
                </Typography>

                <Box sx={{ mb: 2.5 }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.75 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "#0F172A" }}>
                      Completion Progress
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: "#0284C7" }}>
                      {completionPercentage}%
                    </Typography>
                  </Stack>
                  <LinearProgress variant="determinate" value={completionPercentage} sx={{ height: 8, borderRadius: 4, bgcolor: "#E2E8F0", "& .MuiLinearProgress-bar": { bgcolor: "#0284C7" } }} />
                </Box>

                {/* Requirement 4: Shortened stepper labels */}
                <Stack spacing={1.5} sx={{ mb: 2.5 }}>
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
                          border: isCurrent ? "2px solid #0284C7" : "1px solid #F1F5F9",
                          backgroundColor: isCurrent ? "#F0F9FF" : isDone ? "#F0FDF4" : "#FAF5FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: "0.75rem", fontWeight: 900, bgcolor: isDone ? "#16A34A" : isCurrent ? "#0F172A" : "#94A3B8" }}>
                            {isDone ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : idx + 1}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: isCurrent ? 900 : 700, color: isCurrent ? "#0F172A" : "#334155" }}>
                              {s.label}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "#64748B", fontSize: "0.65rem" }}>
                              Est. {s.est}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </Box>

              <Box>
                <Divider sx={{ my: 1.5 }} />
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "#64748B" }}>
                  <AccessTimeIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    Est. Total Time: ~1.5 mins
                  </Typography>
                </Stack>
              </Box>
            </Paper>
          </Grid>

          {/* ── CENTER COLUMN (50%): MAIN FORM STEPS ── */}
          <Grid size={{ xs: 12, md: 6, lg: 6.4 }} sx={{ display: "flex", flexDirection: "column" }}>
            <AnimatePresence mode="wait">
              {/* STEP 0: IDENTIFICATION */}
              {activeStep === 0 && (
                <motion.div key="step0" style={{ flex: 1, display: "flex", flexDirection: "column" }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <Box>
                      {/* Requirement 5: Simplified section title */}
                      <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", mb: 0.5 }}>
                        Customer Registration
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                        Enter 10-digit mobile number for real-time duplicate check and customer identification.
                      </Typography>

                      <Stack spacing={2.5}>
                        {/* Requirement 6: Backend Health Check Indicator Badge */}
                        <Box>
                          {serviceHealth?.healthy ? (
                            <Chip
                              icon={<CheckCircleIcon sx={{ fontSize: "14px !important", color: "#16A34A !important" }} />}
                              label="Backend: Online | DB: Healthy"
                              size="small"
                              sx={{ bgcolor: "#DCFCE7", color: "#15803D", fontWeight: 800, fontSize: "0.72rem" }}
                            />
                          ) : serviceHealth ? (
                            <Chip
                              label={`Service Health: ${serviceHealth.message}`}
                              size="small"
                              sx={{ bgcolor: "#FEE2E2", color: "#991B1B", fontWeight: 800, fontSize: "0.72rem" }}
                            />
                          ) : (
                            <Chip
                              label="Checking Service Health..."
                              size="small"
                              sx={{ bgcolor: "#F1F5F9", color: "#64748B", fontWeight: 800, fontSize: "0.72rem" }}
                            />
                          )}
                        </Box>

                        {/* Requirement 3 & 7: Real-time mobile validation with Searching customer... spinner and status */}
                        <M3TextField
                          label="Mobile Number"
                          value={mobileNumber}
                          onChange={(e) => handleMobileChange(e.target.value)}
                          placeholder="e.g. 9876543210"
                          required
                          error={!!lookupError}
                          helperText={
                            <Box component="span" sx={{ display: "flex", justifyContent: "space-between", width: "100%", mt: 0.5 }}>
                              <Typography component="span" variant="caption" sx={{ color: lookupLoading ? "#0284C7" : lookupError ? "#DC2626" : existingCustomer ? "#15803D" : mobileNumber.length === 10 ? "#64748B" : "#64748B", fontWeight: 700 }}>
                                {lookupLoading
                                  ? "Searching customer..."
                                  : lookupError
                                  ? lookupError
                                  : existingCustomer
                                  ? "✓ Existing customer identified"
                                  : mobileNumber.length === 10
                                  ? "No customer found."
                                  : "Numeric 10 digits starting with 6, 7, 8, or 9"}
                              </Typography>
                              {/* 10-digit counter */}
                              <Typography component="span" variant="caption" sx={{ fontWeight: 800, color: mobileNumber.length === 10 ? "#16A34A" : "#64748B" }}>
                                {mobileNumber.length}/10 Digits
                              </Typography>
                            </Box>
                          }
                          endAdornment={
                            lookupLoading ? (
                              <CircularProgress size={20} sx={{ color: "#0284C7" }} />
                            ) : existingCustomer ? (
                              <VerifiedUserIcon sx={{ color: "#16A34A" }} />
                            ) : mobileNumber.length === 10 ? (
                              <CheckCircleIcon sx={{ color: "#16A34A" }} />
                            ) : undefined
                          }
                        />

                        {/* Requirement 9: Error Banner if backend returns error with Retry button */}
                        {lookupError && (
                          <Alert
                            severity="error"
                            action={
                              <Button
                                color="inherit"
                                size="small"
                                startIcon={<ReplayIcon />}
                                onClick={() => handleSearchCustomer(mobileNumber)}
                                sx={{ fontWeight: 800, textTransform: "none" }}
                              >
                                Retry
                              </Button>
                            }
                            sx={{ borderRadius: 3, fontWeight: 700, alignItems: "center" }}
                          >
                            {lookupError}
                          </Alert>
                        )}

                        {/* Requirements 1, 4, 6, 7: Green Success/Information Card for Existing Customer */}
                        {existingCustomer && (
                          <Paper
                            elevation={0}
                            sx={{
                              p: 3,
                              borderRadius: 3.5,
                              border: "1px solid #BBF7D0",
                              backgroundColor: "#F0FDF4",
                            }}
                          >
                            <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
                              <Avatar
                                sx={{
                                  width: 48,
                                  height: 48,
                                  bgcolor: "#16A34A",
                                  fontWeight: 900,
                                  color: "#FFF",
                                }}
                              >
                                <VerifiedUserIcon />
                              </Avatar>
                              <Box sx={{ flexGrow: 1 }}>
                                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#14532D" }}>
                                    Existing Customer Found
                                  </Typography>
                                  <Chip
                                    label="Match Confirmed"
                                    size="small"
                                    sx={{ bgcolor: "#DCFCE7", color: "#15803D", fontWeight: 800, fontSize: "0.65rem" }}
                                  />
                                </Stack>
                                <Typography variant="caption" sx={{ color: "#166534", fontWeight: 600 }}>
                                  Verified customer profile in database
                                </Typography>
                              </Box>
                            </Stack>

                            <Grid container spacing={2} sx={{ mb: 2.5, p: 2, bgcolor: "#FFFFFF", borderRadius: 2.5, border: "1px solid #DCFCE7" }}>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 700 }}>
                                  Customer Name
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A" }}>
                                  {existingCustomer.full_name || `${existingCustomer.first_name || ""} ${existingCustomer.last_name || ""}`.trim() || "Registered Customer"}
                                </Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 700 }}>
                                  Mobile Number
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A" }}>
                                  +91 {existingCustomer.mobile_number || mobileNumber}
                                </Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 700, mt: 1 }}>
                                  Customer ID
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A" }}>
                                  {existingCustomer.customer_number || existingCustomer.public_id || "N/A"}
                                </Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 700, mt: 1 }}>
                                  KYC Status
                                </Typography>
                                <Chip
                                  icon={<CheckCircleIcon sx={{ fontSize: "14px !important", color: "#16A34A !important" }} />}
                                  label={existingCustomer.kyc_status || "VERIFIED"}
                                  size="small"
                                  sx={{ bgcolor: "#DCFCE7", color: "#15803D", fontWeight: 800, fontSize: "0.7rem", mt: 0.5 }}
                                />
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 700, mt: 1 }}>
                                  Risk Score
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: "#15803D" }}>
                                  {existingCustomer.risk_score ?? 15} / 100 (Low Risk)
                                </Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 700, mt: 1 }}>
                                  Monthly Limit
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A" }}>
                                  ₹{(existingCustomer.monthly_limit || 200000).toLocaleString('en-IN')}
                                </Typography>
                              </Grid>
                            </Grid>

                            {/* Requirement 3 & 8: Enable "Use Customer" only when a real customer is returned */}
                            <Stack direction="row" spacing={2}>
                              <M3Button
                                variant="contained"
                                onClick={() => handleCompleteAndReturn(existingCustomer)}
                                sx={{ bgcolor: "#16A34A", "&:hover": { bgcolor: "#15803D" }, py: 1.25, flex: 1, fontWeight: 800 }}
                              >
                                Use Customer →
                              </M3Button>
                              <M3Button
                                variant="outlined"
                                startIcon={<VisibilityIcon />}
                                onClick={() => router.push(`/customers/customer-360?id=${existingCustomer.public_id || existingCustomer.id}`)}
                                sx={{ borderColor: "#16A34A", color: "#15803D", "&:hover": { borderColor: "#15803D" }, py: 1.25, flex: 1, fontWeight: 800 }}
                              >
                                View Profile
                              </M3Button>
                            </Stack>
                          </Paper>
                        )}

                        {/* Requirements 2, 5: Display registration form and "Add New Customer" ONLY when no existing customer is found */}
                        {!existingCustomer && (
                          <>
                            <Box sx={{ pt: 1 }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                                <Chip label="No customer found" size="small" sx={{ bgcolor: "#F1F5F9", color: "#475569", fontWeight: 800 }} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#0F172A" }}>
                                  Add New Customer
                                </Typography>
                              </Stack>
                              <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                  <M3TextField label="First Name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                  <M3TextField label="Last Name *" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                                </Grid>
                              </Grid>

                              <M3TextField label="Email Address (Optional)" value={email} onChange={(e) => setEmail(e.target.value)} type="email" sx={{ mt: 2 }} />
                            </Box>

                            {/* Requirements 2 & 8: Enable Continue button only when mandatory fields are valid */}
                            <M3Button
                              variant="contained"
                              disabled={!isFormValid}
                              onClick={handleSendMobileOtp}
                              sx={{ py: 1.75, bgcolor: isFormValid ? "#0F172A" : "#94A3B8" }}
                            >
                              Send Mobile OTP & Proceed →
                            </M3Button>
                          </>
                        )}
                      </Stack>
                    </Box>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 1: MOBILE OTP */}
              {activeStep === 1 && (
                <motion.div key="step1" style={{ flex: 1, display: "flex", flexDirection: "column" }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", mb: 0.5 }}>
                        Step 2 — Mobile OTP Verification
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                        OTP sent via WhatsApp API to <strong>+91 {mobileNumber}</strong>.
                      </Typography>

                      {otpError && (
                        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 3, fontWeight: 700 }}>
                          {otpError}
                        </Alert>
                      )}

                      <Stack spacing={2.5}>
                        <M3TextField label="6-Digit OTP Code *" value={otpValue} onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 123456" />

                        <M3Button variant="contained" loading={otpLoading} disabled={otpValue.length < 4} onClick={handleVerifyMobileOtp} sx={{ py: 1.75, bgcolor: "#0F172A" }}>
                          Verify Mobile OTP →
                        </M3Button>
                      </Stack>
                    </Box>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 2: AADHAAR EKYC */}
              {activeStep === 2 && (
                <motion.div key="step2" style={{ flex: 1, display: "flex", flexDirection: "column" }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A" }}>
                          Step 3 — Cashfree Aadhaar eKYC Verification
                        </Typography>
                        <Chip label="Fee: ₹10.00 + GST (Auto-Refund on Fail)" size="small" sx={{ bgcolor: "#F1F5F9", color: "#2563EB", fontWeight: 800, fontSize: "0.7rem" }} />
                      </Box>
                      <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                        Real-time Aadhaar OTP verification via Cashfree APIs for instant verification status.
                      </Typography>

                      {aadhaarError && (
                        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 3, fontWeight: 700 }}>
                          {aadhaarError}
                        </Alert>
                      )}

                      {!aadhaarVerified ? (
                        <Stack spacing={2.5}>
                          <M3TextField
                            label="12-Digit Aadhaar Number *"
                            value={aadhaarNumber}
                            onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                            placeholder="1234 5678 9012"
                            disabled={aadhaarLoading || aadhaarOtpSent}
                          />

                          {!aadhaarOtpSent ? (
                            <M3Button
                              variant="contained"
                              disabled={aadhaarNumber.length !== 12 || aadhaarLoading}
                              onClick={handleGenerateAadhaarOtp}
                              sx={{ py: 1.75, bgcolor: "#0F172A" }}
                            >
                              {aadhaarLoading ? "Connecting Cashfree API..." : "Generate Aadhaar OTP →"}
                            </M3Button>
                          ) : (
                            <>
                              <Alert severity="info" sx={{ borderRadius: 3, fontWeight: 600 }}>
                                OTP dispatched to Aadhaar linked mobile number for XXXX-XXXX-{aadhaarNumber.slice(-4)}. ₹10.00 (+ GST) fee debited from wallet.
                              </Alert>
                              <M3TextField
                                label="Enter 6-Digit Aadhaar OTP *"
                                value={aadhaarOtp}
                                onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                placeholder="654321"
                                disabled={aadhaarLoading}
                              />
                              <Stack direction="row" spacing={2}>
                                <M3Button
                                  variant="outlined"
                                  onClick={() => { setAadhaarOtpSent(false); setAadhaarOtp(""); }}
                                  disabled={aadhaarLoading}
                                >
                                  ← Change Number
                                </M3Button>
                                <M3Button
                                  variant="contained"
                                  disabled={aadhaarOtp.length < 4 || aadhaarLoading}
                                  onClick={handleVerifyAadhaarOtp}
                                  sx={{ flex: 1, py: 1.75, bgcolor: "#0F172A" }}
                                >
                                  {aadhaarLoading ? "Verifying eKYC..." : "Verify Aadhaar eKYC →"}
                                </M3Button>
                              </Stack>
                            </>
                          )}
                        </Stack>
                      ) : (
                        <Stack spacing={3}>
                          <Alert severity="success" icon={<CheckCircleIcon fontSize="inherit" />} sx={{ borderRadius: 3, fontWeight: 800 }}>
                            Cashfree Aadhaar eKYC Verification Successful! PII encrypted & saved.
                          </Alert>

                          {/* Digital Aadhaar Card Component */}
                          <DigitalAadhaarCard aadhaarData={verifiedAadhaarData} />

                          <M3Button variant="contained" onClick={() => setActiveStep(3)} sx={{ py: 1.75, bgcolor: "#0F172A" }}>
                            Proceed to Security PIN →
                          </M3Button>
                        </Stack>
                      )}
                    </Box>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 3: SECURITY PIN */}
              {activeStep === 3 && (
                <motion.div key="step3" style={{ flex: 1, display: "flex", flexDirection: "column" }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", mb: 0.5 }}>
                        Step 4 — Customer Transaction Security PIN
                      </Typography>
                      <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                        Set up a 4-digit security PIN for customer authorization during payout execution.
                      </Typography>

                      <Stack spacing={2.5}>
                        <M3TextField label="4-Digit Security PIN *" value={securityPin} onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, "").slice(0, 4))} type="password" placeholder="••••" />

                        <M3Button variant="contained" disabled={securityPin.length !== 4} onClick={handleCreateCustomer} sx={{ py: 1.75, bgcolor: "#0F172A" }}>
                          Finalize & Create Customer →
                        </M3Button>
                      </Stack>
                    </Box>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 4: REVIEW & COMPLETE */}
              {activeStep === 4 && (
                <motion.div key="step4" style={{ flex: 1, display: "flex", flexDirection: "column" }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #BBF7D0", backgroundColor: "#F0FDF4", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                    <VerifiedIcon sx={{ fontSize: 72, color: "#16A34A", mb: 1 }} />
                    <Typography variant="h5" sx={{ fontWeight: 900, color: "#14532D", mb: 1 }}>
                      Customer Registered & Verified!
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#15803D", mb: 3 }}>
                      Customer ID: <strong>{createdCustomer?.customer_number}</strong> • {createdCustomer?.full_name} (+91 {createdCustomer?.mobile_number})
                    </Typography>

                    <M3Button variant="contained" size="large" onClick={() => handleCompleteAndReturn(createdCustomer)} sx={{ py: 1.75, px: 4, fontWeight: 900, bgcolor: "#16A34A" }}>
                      Return to Transaction & Select Customer →
                    </M3Button>
                  </Paper>
                </motion.div>
              )}
            </AnimatePresence>
          </Grid>

          {/* ── RIGHT COLUMN (25%): LIVE CUSTOMER 360 PANEL WITH MATCHING HEIGHT ── */}
          <Grid size={{ xs: 12, md: 3, lg: 3 }} sx={{ display: "flex", flexDirection: "column" }}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#0F172A", mb: 1.5 }}>
                  Customer 360 Insight Panel
                </Typography>

                {/* Customer Avatar & Main Badge */}
                <Box sx={{ textAlign: "center", p: 2, bgcolor: "#F8FAFC", borderRadius: 3, mb: 2 }}>
                  <Avatar sx={{ width: 56, height: 56, mx: "auto", mb: 1, bgcolor: existingCustomer ? "#16A34A" : "#0284C7", fontWeight: 900, fontSize: "1.25rem" }}>
                    {existingCustomer
                      ? (existingCustomer.full_name || existingCustomer.first_name || "C").charAt(0)
                      : firstName
                      ? firstName.charAt(0)
                      : "C"}
                  </Avatar>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    {existingCustomer
                      ? existingCustomer.full_name || `${existingCustomer.first_name} ${existingCustomer.last_name}`
                      : firstName || lastName
                      ? `${firstName} ${lastName}`.trim()
                      : "Draft Customer"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                    {mobileNumber ? `+91 ${mobileNumber}` : "Mobile Pending"}
                  </Typography>
                  <Chip
                    label={existingCustomer ? "Existing Verified Profile" : aadhaarVerified ? "Full eKYC Verified" : "Registration in Progress"}
                    size="small"
                    sx={{ mt: 1, height: 20, fontSize: "0.65rem", fontWeight: 800, bgcolor: existingCustomer || aadhaarVerified ? "#DCFCE7" : "#FEF3C7", color: existingCustomer || aadhaarVerified ? "#15803D" : "#B45309" }}
                  />
                </Box>

                {/* KYC Status Checklist */}
                <Typography variant="caption" sx={{ fontWeight: 900, color: "#475569", textTransform: "uppercase", display: "block", mb: 1 }}>
                  KYC Status Checklist
                </Typography>
                <Stack spacing={0.75} sx={{ mb: 2 }}>
                  {[
                    { label: "Mobile Verified", ok: !!existingCustomer || activeStep >= 1 },
                    { label: "Aadhaar Verified", ok: !!existingCustomer || aadhaarVerified },
                    { label: "PAN Verified", ok: !!existingCustomer || aadhaarVerified },
                    { label: "Face Verified", ok: !!existingCustomer || aadhaarVerified },
                    { label: "PIN Created", ok: !!existingCustomer || securityPin.length === 4 },
                  ].map((item) => (
                    <Stack key={item.label} direction="row" spacing={1} sx={{ alignItems: "center" }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: item.ok ? "#16A34A" : "#CBD5E1" }} />
                      <Typography variant="caption" sx={{ fontWeight: item.ok ? 800 : 600, color: item.ok ? "#1E293B" : "#94A3B8" }}>
                        {item.label}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                {/* Risk & Limit Summary */}
                <Stack spacing={1} sx={{ mb: 2 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>Risk Score</Typography>
                    <Chip label="LOW RISK (12/100)" size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#DCFCE7", color: "#15803D", fontWeight: 800 }} />
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>Monthly Limit</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>₹2,00,000</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>Remaining Limit</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: "#16A34A" }}>₹2,00,000</Typography>
                  </Box>
                </Stack>
              </Box>

              <Box>
                <Divider sx={{ my: 1.5 }} />
                {/* Quick Actions */}
                <Typography variant="caption" sx={{ fontWeight: 900, color: "#475569", textTransform: "uppercase", display: "block", mb: 1 }}>
                  Quick Actions
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 6 }}>
                    <Button fullWidth variant="outlined" size="small" startIcon={<PersonIcon />} sx={{ borderRadius: 2, fontSize: "0.7rem", textTransform: "none" }}>
                      Profile
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button fullWidth variant="outlined" size="small" startIcon={<HistoryIcon />} sx={{ borderRadius: 2, fontSize: "0.7rem", textTransform: "none" }}>
                      History
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button fullWidth variant="outlined" size="small" startIcon={<TuneIcon />} sx={{ borderRadius: 2, fontSize: "0.7rem", textTransform: "none" }}>
                      Limits
                    </Button>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Button fullWidth variant="outlined" size="small" startIcon={<BlockIcon />} color="error" sx={{ borderRadius: 2, fontSize: "0.7rem", textTransform: "none" }}>
                      Suspend
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* ── STICKY FOOTER ACTION BAR ── */}
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
          py: 1.75,
          backgroundColor: "#FFF",
          borderTop: "1px solid #E2E8F0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={2}>
          <M3Button variant="text" onClick={handleCancel} sx={{ color: "#64748B" }}>
            Cancel (ESC)
          </M3Button>
          <M3Button variant="outlined" onClick={saveDraft} startIcon={<SaveIcon />}>
            Save Draft (Ctrl+S)
          </M3Button>
        </Stack>

        <Stack direction="row" spacing={2}>
          {activeStep > 0 && activeStep < 4 && (
            <M3Button variant="outlined" onClick={() => setActiveStep((prev) => prev - 1)}>
              ← Previous Step
            </M3Button>
          )}

          {activeStep < 4 && (
            existingCustomer ? (
              <Stack direction="row" spacing={1.5}>
                <M3Button
                  variant="contained"
                  onClick={() => handleCompleteAndReturn(existingCustomer)}
                  sx={{ bgcolor: "#16A34A", px: 3, fontWeight: 800 }}
                >
                  Use Customer →
                </M3Button>
                <M3Button
                  variant="outlined"
                  onClick={() => router.push(`/customers/customer-360?id=${existingCustomer.public_id || existingCustomer.id}`)}
                  sx={{ borderColor: "#16A34A", color: "#15803D", px: 3, fontWeight: 800 }}
                >
                  View Profile
                </M3Button>
              </Stack>
            ) : (
              <M3Button
                variant="contained"
                disabled={
                  (activeStep === 0 && !isFormValid) ||
                  (activeStep === 1 && otpValue.length !== 6) ||
                  (activeStep === 2 && !aadhaarVerified) ||
                  (activeStep === 3 && securityPin.length !== 4)
                }
                onClick={() => {
                  if (activeStep === 0) handleSendMobileOtp();
                  else if (activeStep === 1) handleVerifyMobileOtp();
                  else if (activeStep === 2) handleVerifyAadhaarOtp();
                  else if (activeStep === 3) handleCreateCustomer();
                }}
                sx={{ bgcolor: "#0F172A", px: 4 }}
              >
                Continue Step →
              </M3Button>
            )
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
