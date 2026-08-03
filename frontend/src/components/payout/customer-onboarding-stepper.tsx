"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Dialog,
  Divider,
  Stepper,
  Step,
  StepLabel,
  Alert,
  IconButton,
  Avatar,
  CircularProgress,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { motion, AnimatePresence } from "framer-motion";

// Icons
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import SecurityIcon from "@mui/icons-material/Security";
import LockIcon from "@mui/icons-material/Lock";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SmsIcon from "@mui/icons-material/Sms";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ReplayIcon from "@mui/icons-material/Replay";

import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { notificationEngine } from "@/services/notification-engine";

interface CustomerOnboardingStepperProps {
  open: boolean;
  onClose: () => void;
  onCustomerCompleted: (customer: any) => void;
}

const STEPS = [
  "Registration",
  "Mobile OTP",
  "Aadhaar eKYC",
  "Transaction PIN",
  "Completion",
];

export function CustomerOnboardingStepper({
  open,
  onClose,
  onCustomerCompleted,
}: CustomerOnboardingStepperProps) {
  const [activeStep, setActiveStep] = useState(0);

  // Step 1: Customer Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [duplicateCustomer, setDuplicateCustomer] = useState<any | null>(null);
  const [step1Loading, setStep1Loading] = useState(false);

  // Step 2: Mobile OTP
  const [otpChannel, setOtpChannel] = useState<"WHATSAPP" | "SMS">("WHATSAPP");
  const [mobileOtp, setMobileOtp] = useState("123456");
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(3);
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 mins
  const [step2Loading, setStep2Loading] = useState(false);

  // Step 3: Aadhaar eKYC
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [aadhaarOtp, setAadhaarOtp] = useState("654321");
  const [aadhaarRefNum, setAadhaarRefNum] = useState("");
  const [maskedAadhaar, setMaskedAadhaar] = useState("");
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);
  const [step3Loading, setStep3Loading] = useState(false);

  // Step 4: Transaction PIN
  const [pin, setPin] = useState("1234");
  const [confirmPin, setConfirmPin] = useState("1234");
  const [pinError, setPinError] = useState("");
  const [step4Loading, setStep4Loading] = useState(false);

  // Created Customer Object
  const [createdCustomer, setCreatedCustomer] = useState<any | null>(null);

  // Mobile Validation & Duplicate Auto-Check State
  const [mobileStatusState, setMobileStatusState] = useState<
    "IDLE" | "INVALID" | "CHECKING" | "NEW_CUSTOMER" | "EXISTING_CUSTOMER"
  >("IDLE");
  const [mobileStatusMessage, setMobileStatusMessage] = useState(
    "Enter 10-digit mobile number starting with 6, 7, 8, or 9"
  );

  // Format Display: e.g. "98765 43210"
  const formatMobileDisplay = (clean: string) => {
    if (clean.length <= 5) return clean;
    return `${clean.slice(0, 5)} ${clean.slice(5, 10)}`;
  };

  // Enterprise Mobile Number Change Handler with Auto Duplicate Check
  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(clean);
    setDuplicateCustomer(null);

    if (clean.length === 0) {
      setMobileStatusState("IDLE");
      setMobileStatusMessage("Enter 10-digit mobile number starting with 6, 7, 8, or 9");
      return;
    }

    if (!/^[6-9]/.test(clean)) {
      setMobileStatusState("INVALID");
      setMobileStatusMessage("Invalid Mobile Number: First digit must be 6, 7, 8, or 9");
      return;
    }

    if (clean.length < 10) {
      setMobileStatusState("INVALID");
      setMobileStatusMessage(`Incomplete: 10 digits required (${clean.length}/10)`);
      return;
    }

    // Exactly 10 digits & valid prefix (6/7/8/9) -> Trigger Auto Duplicate Check
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
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // Trigger Mobile OTP via WhatsApp first after successful validation & duplicate check
      triggerMobileOtp("WHATSAPP");
      setActiveStep(1);
    }
  };

  // Trigger Mobile OTP (WhatsApp first with SMS fallback)
  const triggerMobileOtp = async (channel: "WHATSAPP" | "SMS") => {
    setOtpChannel(channel);
    await retailerApi.generateMobileOtp(mobileNumber, channel);
    notificationEngine.notify("OTP_RECEIVED");
  };

  // Step 2: Verify Mobile OTP
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      alert(res.detail || "Invalid Mobile OTP code");
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
  const handleVerifyAadhaarOtp = async (e: React.FormEvent) => {
    e.preventDefault();
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
      alert("Invalid Aadhaar OTP code");
    }
  };

  // Step 4: Create & Hash Transaction PIN
  const handleStep4Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      setPinError("PIN must be 4 or 6 digits");
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

  // Step 5: Finalize Onboarding & Transition to Move To Bank
  const handleFinalComplete = () => {
    onCustomerCompleted({
      ...createdCustomer,
      full_name: `${firstName} ${lastName}`,
      mobile_number: mobileNumber,
      kyc_status: "VERIFIED",
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            p: 3,
            backgroundColor: "#FFFFFF",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          },
        },
      }}
    >
      {/* Top Header */}
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <Avatar sx={{ bgcolor: "#4F46E5", width: 44, height: 44 }}>
            <PersonAddIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
              Customer Registration & eKYC Flow
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B" }}>
              Enterprise Guided Onboarding • Step {activeStep + 1} of 5
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Stack>

      {/* Horizontal MD3 Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {STEPS.map((label, idx) => (
          <Step key={label} completed={activeStep > idx}>
            <StepLabel>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: activeStep === idx ? 900 : 600,
                  color: activeStep === idx ? "#4F46E5" : activeStep > idx ? "#16A34A" : "#64748B",
                }}
              >
                {label}
              </Typography>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Animated Step Container */}
      <Box sx={{ minHeight: 320 }}>
        <AnimatePresence mode="wait">
          {/* ── STEP 1: CUSTOMER REGISTRATION & DUPLICATE CHECK ── */}
          {activeStep === 0 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <form onSubmit={handleStep1Submit}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: "#1E1B4B" }}>
                  Step 1: Enter Customer Information
                </Typography>

                {duplicateCustomer ? (
                  <Alert
                    severity="warning"
                    icon={<VerifiedUserIcon />}
                    sx={{ mb: 3, borderRadius: 3 }}
                    action={
                      <Button
                        color="warning"
                        size="small"
                        variant="contained"
                        onClick={() => {
                          onCustomerCompleted(duplicateCustomer);
                          onClose();
                        }}
                        sx={{ fontWeight: 800 }}
                      >
                        Open Existing Customer
                      </Button>
                    }
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Customer Already Exists!
                    </Typography>
                    <Typography variant="caption">
                      Found {duplicateCustomer.full_name} (+91 {duplicateCustomer.mobile_number}) registered under this tenant/company.
                    </Typography>
                  </Alert>
                ) : null}

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <M3TextField
                      label="First Name *"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <M3TextField
                      label="Last Name *"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <M3TextField
                      label="10-Digit Mobile Number *"
                      value={formatMobileDisplay(mobileNumber)}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      placeholder="98765 43210"
                      required
                      error={mobileStatusState === "INVALID"}
                      helperText={
                        <span id="mobile-validation-helper" style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                          <span style={{ color: mobileStatusState === "INVALID" ? "#DC2626" : mobileStatusState === "NEW_CUSTOMER" ? "#16A34A" : "#64748B" }}>
                            {mobileStatusMessage}
                          </span>
                        </span>
                      }
                      endAdornment={
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", pr: 0.5 }}>
                          {mobileStatusState === "CHECKING" && (
                            <Chip
                              size="small"
                              icon={<CircularProgress size={12} color="inherit" />}
                              label="Checking..."
                              sx={{ bgcolor: "#EFF6FF", color: "#1D4ED8", fontWeight: 700, fontSize: "0.7rem" }}
                            />
                          )}
                          {mobileStatusState === "NEW_CUSTOMER" && (
                            <Chip
                              size="small"
                              icon={<CheckCircleIcon sx={{ fontSize: "14px !important", color: "#16A34A" }} />}
                              label="New Customer"
                              sx={{ bgcolor: "#F0FDF4", color: "#15803D", fontWeight: 800, fontSize: "0.7rem" }}
                            />
                          )}
                          {mobileStatusState === "EXISTING_CUSTOMER" && (
                            <Chip
                              size="small"
                              icon={<VerifiedUserIcon sx={{ fontSize: "14px !important", color: "#D97706" }} />}
                              label="Existing Customer"
                              sx={{ bgcolor: "#FFFBEB", color: "#B45309", fontWeight: 800, fontSize: "0.7rem" }}
                            />
                          )}
                          {mobileStatusState === "INVALID" && (
                            <Chip
                              size="small"
                              label="Invalid"
                              sx={{ bgcolor: "#FEF2F2", color: "#DC2626", fontWeight: 800, fontSize: "0.7rem" }}
                            />
                          )}
                          <Typography
                            variant="caption"
                            sx={{
                              color: mobileNumber.length === 10 ? "#16A34A" : "#64748B",
                              fontWeight: 800,
                            }}
                          >
                            {mobileNumber.length}/10
                          </Typography>
                        </Stack>
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <M3TextField
                      label="Email Address (Optional)"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </Grid>
                </Grid>

                <M3Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  loading={step1Loading}
                  disabled={!firstName || !lastName || mobileNumber.length !== 10 || mobileStatusState !== "NEW_CUSTOMER"}
                  sx={{ mt: 3, py: 1.5, borderRadius: 3 }}
                >
                  Verify Mobile & Send OTP →
                </M3Button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 2: MOBILE OTP VERIFICATION (WHATSAPP FIRST / SMS FALLBACK) ── */}
          {activeStep === 1 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <form onSubmit={handleStep2Submit}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: "#1E1B4B" }}>
                  Step 2: Mobile OTP Verification
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 2 }}>
                  6-digit verification code dispatched to +91 {mobileNumber} via {otpChannel}. (Expiry: 5 mins)
                </Typography>

                <Alert
                  severity="info"
                  icon={otpChannel === "WHATSAPP" ? <WhatsAppIcon sx={{ color: "#25D366" }} /> : <SmsIcon sx={{ color: "#0284C7" }} />}
                  sx={{ mb: 3, borderRadius: 3 }}
                  action={
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => triggerMobileOtp(otpChannel === "WHATSAPP" ? "SMS" : "WHATSAPP")}
                    >
                      Switch to {otpChannel === "WHATSAPP" ? "SMS OTP" : "WhatsApp OTP"}
                    </Button>
                  }
                >
                  OTP sent via <strong>{otpChannel}</strong>. Android Auto-Read support active.
                </Alert>

                <M3TextField
                  label="Enter 6-Digit Mobile OTP *"
                  value={mobileOtp}
                  onChange={(e) => setMobileOtp(e.target.value)}
                  placeholder="123456"
                  required
                />

                <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                  <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700 }}>
                    Retries Left: {otpAttemptsLeft} / 3
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<ReplayIcon />}
                    onClick={() => triggerMobileOtp(otpChannel)}
                    disabled={otpAttemptsLeft <= 0}
                  >
                    Resend OTP
                  </Button>
                </Stack>

                <M3Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  loading={step2Loading}
                  disabled={mobileOtp.length < 4 || otpAttemptsLeft <= 0}
                  sx={{ mt: 3, py: 1.5, borderRadius: 3 }}
                >
                  Verify Mobile OTP & Proceed to eKYC →
                </M3Button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 3: AADHAAR eKYC (CASHFREE API INTEGRATION) ── */}
          {activeStep === 2 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: "#1E1B4B" }}>
                Step 3: Cashfree Aadhaar eKYC Verification
              </Typography>
              <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 2.5 }}>
                Enter Aadhaar number to trigger Cashfree verification API. Only masked Aadhaar (XXXX-XXXX-1234) is stored securely.
              </Typography>

              {!aadhaarOtpSent ? (
                <Stack spacing={2}>
                  <M3TextField
                    label="12-Digit Aadhaar Number *"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456789012"
                    required
                  />

                  <M3Button
                    variant="contained"
                    fullWidth
                    loading={step3Loading}
                    disabled={aadhaarNumber.replace(/\D/g, "").length !== 12}
                    onClick={handleGenerateAadhaarOtp}
                    sx={{ py: 1.5, borderRadius: 3 }}
                  >
                    Generate Aadhaar eKYC OTP →
                  </M3Button>
                </Stack>
              ) : (
                <form onSubmit={handleVerifyAadhaarOtp}>
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 3 }}>
                    Aadhaar OTP sent for <strong>{maskedAadhaar}</strong> (Ref: {aadhaarRefNum})
                  </Alert>

                  <M3TextField
                    label="Enter Aadhaar OTP *"
                    value={aadhaarOtp}
                    onChange={(e) => setAadhaarOtp(e.target.value)}
                    placeholder="654321"
                    required
                  />

                  <M3Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    loading={step3Loading}
                    disabled={aadhaarOtp.length < 4}
                    sx={{ mt: 3, py: 1.5, borderRadius: 3 }}
                  >
                    Verify Aadhaar eKYC →
                  </M3Button>
                </form>
              )}
            </motion.div>
          )}

          {/* ── STEP 4: CUSTOMER TRANSACTION PIN ── */}
          {activeStep === 3 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <form onSubmit={handleStep4Submit}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, color: "#1E1B4B" }}>
                  Step 4: Create Transaction Security PIN
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 2.5 }}>
                  Set a 4-digit or 6-digit transaction PIN required for approving all payout transfers. Stored encrypted.
                </Typography>

                {pinError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
                    {pinError}
                  </Alert>
                )}

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <M3TextField
                      label="Create PIN *"
                      type="password"
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        setPinError("");
                      }}
                      placeholder="••••"
                      required
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <M3TextField
                      label="Confirm PIN *"
                      type="password"
                      value={confirmPin}
                      onChange={(e) => {
                        setConfirmPin(e.target.value);
                        setPinError("");
                      }}
                      placeholder="••••"
                      required
                    />
                  </Grid>
                </Grid>

                <M3Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  loading={step4Loading}
                  disabled={pin.length < 4 || pin !== confirmPin}
                  sx={{ mt: 3, py: 1.5, borderRadius: 3 }}
                >
                  Save PIN & Complete Onboarding →
                </M3Button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 5: ONBOARDING COMPLETION ── */}
          {activeStep === 4 && (
            <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Box sx={{ textAlign: "center", py: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 64, color: "#16A34A", mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 900, color: "#14532D" }}>
                  Customer Onboarding Completed!
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B", display: "block", mb: 3 }}>
                  Customer {firstName} {lastName} is ready for Move To Bank payout operations.
                </Typography>

                <Grid container spacing={1.5} sx={{ mb: 3 }}>
                  <Grid size={{ xs: 6 }}>
                    <Paper elevation={0} sx={{ p: 1.8, borderRadius: 3, bgcolor: "#F0FDF4", border: "1px solid #BBF7D0", textAlign: "left" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#15803D" }}>✓ Customer Created</Typography>
                      <Typography variant="caption" sx={{ color: "#166534" }}>ID: {createdCustomer?.customer_number || "CUST10001"}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Paper elevation={0} sx={{ p: 1.8, borderRadius: 3, bgcolor: "#F0FDF4", border: "1px solid #BBF7D0", textAlign: "left" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#15803D" }}>✓ Mobile Verified</Typography>
                      <Typography variant="caption" sx={{ color: "#166534" }}>+91 {mobileNumber}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Paper elevation={0} sx={{ p: 1.8, borderRadius: 3, bgcolor: "#F0FDF4", border: "1px solid #BBF7D0", textAlign: "left" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#15803D" }}>✓ Aadhaar Verified</Typography>
                      <Typography variant="caption" sx={{ color: "#166534" }}>{maskedAadhaar || "XXXX-XXXX-1234"}</Typography>
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Paper elevation={0} sx={{ p: 1.8, borderRadius: 3, bgcolor: "#F0FDF4", border: "1px solid #BBF7D0", textAlign: "left" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#15803D" }}>✓ PIN Created</Typography>
                      <Typography variant="caption" sx={{ color: "#166534" }}>Encrypted Hash Stored</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <M3Button
                  variant="contained"
                  fullWidth
                  onClick={handleFinalComplete}
                  sx={{ py: 1.5, borderRadius: 3, backgroundColor: "#16A34A", "&:hover": { backgroundColor: "#15803D" } }}
                >
                  Continue to Beneficiary Selection & Payout →
                </M3Button>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Dialog>
  );
}
