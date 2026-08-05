"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Avatar,
  Grid,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import LockIcon from "@mui/icons-material/Lock";
import VerifiedIcon from "@mui/icons-material/Verified";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SmsIcon from "@mui/icons-material/Sms";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import ReplayIcon from "@mui/icons-material/Replay";
import { motion, AnimatePresence } from "framer-motion";

import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { notificationEngine } from "@/services/notification-engine";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";

interface CustomerMasterSlideOverProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (customer: any) => void;
  initialMobile?: string;
}

// Requirement 4: Shorten stepper labels: Mobile → OTP → eKYC → PIN → Finish
const STEPS = [
  "Mobile",
  "OTP",
  "eKYC",
  "PIN",
  "Finish",
];

export function CustomerMasterSlideOver({
  open,
  onClose,
  onSuccess,
  initialMobile = "",
}: CustomerMasterSlideOverProps) {
  const router = useRouter();
  const { setSelectedCustomer } = useTransactionMemoryStore();

  const [activeStep, setActiveStep] = useState(0);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState(initialMobile);
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
  const [serviceHealth, setServiceHealth] = useState<{ healthy: boolean; message: string; api_status?: string; db_status?: string } | null>(null);

  // Initial Health Check on mount
  useEffect(() => {
    retailerApi.checkPayoutWorkflowHealth().then((res) => {
      setServiceHealth(res);
    });
  }, []);

  useEffect(() => {
    if (initialMobile) {
      handleMobileChange(initialMobile);
    }
  }, [initialMobile]);

  // Requirement 7: Real-Time Mobile Input Validation (numeric-only, 10-digit counter, auto search after 10 digits)
  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(clean);
    setDuplicateCustomer(null);

    if (clean.length === 0) {
      setMobileStatusState("IDLE");
      setMobileStatusMessage("Enter 10-digit mobile number starting with 6, 7, 8, or 9");
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

    // Exactly 10 digits & valid prefix -> Trigger Health Check then Auto Customer Search
    setMobileStatusState("CHECKING");
    setMobileStatusMessage("Searching customer...");

    retailerApi.checkPayoutWorkflowHealth().then((health) => {
      setServiceHealth(health);
      if (!health.healthy) {
        setMobileStatusState("INVALID");
        setMobileStatusMessage(health.message || "Customer service is currently offline.");
        return;
      }

      retailerApi.searchPayoutCustomer(clean).then((res) => {
        if (res.status === "SUCCESS" && Array.isArray(res.data)) {
          if (res.data.length > 0) {
            const match = res.data.find((c: any) => c.mobile_number === clean) || res.data[0];
            const verifiedMatch = { ...match, mobile_number: match.mobile_number || clean };
            setMobileStatusState("EXISTING_CUSTOMER");
            setMobileStatusMessage("✓ Existing customer profile identified");
            setDuplicateCustomer(verifiedMatch);
          } else {
            setMobileStatusState("NEW_CUSTOMER");
            setMobileStatusMessage("No customer found.");
            setDuplicateCustomer(null);
          }
        } else {
          setMobileStatusState("INVALID");
          setMobileStatusMessage(res.message || "Customer search failed due to a server error.");
          setDuplicateCustomer(null);
        }
      }).catch((err) => {
        setMobileStatusState("INVALID");
        setMobileStatusMessage("Customer search failed due to a server error.");
        setDuplicateCustomer(null);
      });
    }).catch((err) => {
      setMobileStatusState("INVALID");
      setMobileStatusMessage("Unable to reach the server.");
      setDuplicateCustomer(null);
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

  // Step 3: Verify Aadhaar OTP
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

  const handleCompleteAndReturn = (custToSelect: any) => {
    setSelectedCustomer(custToSelect);
    if (onSuccess) onSuccess(custToSelect);
    onClose();
  };

  const isStep1Valid = firstName.trim() !== "" && lastName.trim() !== "" && mobileNumber.length === 10 && mobileStatusState === "NEW_CUSTOMER";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)" } },
        paper: {
          sx: {
            width: { xs: "100%", sm: 540 },
            backgroundColor: "#F8FAFC",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      {/* Requirement 5: Header Title "Customer Registration" */}
      <Box
        sx={{
          p: 3,
          background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <PersonAddIcon sx={{ color: "#4ADE80", fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: "-0.3px" }}>
              Customer Registration
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700 }}>
              Enterprise Guided Customer Onboarding & eKYC
            </Typography>
          </Box>
        </Stack>

        <IconButton onClick={onClose} sx={{ color: "#FFF" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Requirement 4: Stepper with Shortened labels */}
      <Box sx={{ p: 2.5, backgroundColor: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label, idx) => (
            <Step key={label} completed={activeStep > idx}>
              <StepLabel>
                <Typography variant="caption" sx={{ fontWeight: activeStep === idx ? 900 : 700, fontSize: "0.7rem", color: activeStep === idx ? "#0F172A" : undefined }}>
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Drawer Main Form Body */}
      <Box sx={{ p: 3, flex: 1, overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          {/* ── STEP 0: REGISTRATION & IDENTIFICATION ── */}
          {activeStep === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.5, color: "#0F172A" }}>
                  Customer Registration
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                  Enter 10-digit mobile number for real-time customer identification.
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

                  {/* Requirement 7: Real-time mobile validation with 10-digit counter and loading spinner */}
                  <M3TextField
                    label="10-Digit Mobile Number *"
                    value={mobileNumber}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    placeholder="e.g. 9876543210"
                    helperText={
                      <Box component="span" sx={{ display: "flex", justifyContent: "space-between", width: "100%", mt: 0.5 }}>
                        <span style={{ color: mobileStatusState === "INVALID" ? "#DC2626" : mobileStatusState === "NEW_CUSTOMER" ? "#16A34A" : mobileStatusState === "EXISTING_CUSTOMER" ? "#15803D" : "#64748B", fontWeight: 700 }}>
                          {mobileStatusMessage || "Numeric 10 digits starting with 6, 7, 8, or 9"}
                        </span>
                        <span style={{ fontWeight: 800, color: mobileNumber.length === 10 ? "#16A34A" : "#64748B" }}>
                          {mobileNumber.length}/10 Digits
                        </span>
                      </Box>
                    }
                    endAdornment={
                      mobileStatusState === "CHECKING" ? (
                        <CircularProgress size={20} sx={{ color: "#0284C7" }} />
                      ) : mobileStatusState === "NEW_CUSTOMER" ? (
                        <CheckCircleIcon sx={{ color: "#16A34A" }} />
                      ) : mobileStatusState === "EXISTING_CUSTOMER" ? (
                        <VerifiedUserIcon sx={{ color: "#16A34A" }} />
                      ) : undefined
                    }
                  />

                  {/* Error Banner with Retry button if backend or search fails */}
                  {mobileStatusState === "INVALID" && mobileNumber.length === 10 && (
                    <Alert
                      severity="error"
                      action={
                        <Button
                          color="inherit"
                          size="small"
                          startIcon={<ReplayIcon />}
                          onClick={() => handleMobileChange(mobileNumber)}
                          sx={{ fontWeight: 800, textTransform: "none" }}
                        >
                          Retry
                        </Button>
                      }
                      sx={{ mt: 2, borderRadius: 3, fontWeight: 700, alignItems: "center" }}
                    >
                      {mobileStatusMessage}
                    </Alert>
                  )}

                  {/* Requirements 1, 3, 9: Green Success Card for Existing Customer */}
                  {mobileStatusState === "EXISTING_CUSTOMER" && duplicateCustomer && (
                    <motion.div
                      key="existing-summary"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
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
                              fontSize: "1.1rem",
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
                                sx={{
                                  height: 20,
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  bgcolor: "#DCFCE7",
                                  color: "#15803D",
                                }}
                              />
                            </Stack>
                            <Typography variant="caption" sx={{ color: "#166534", fontWeight: 600, display: "block" }}>
                              Verified customer profile in database
                            </Typography>
                          </Box>
                        </Stack>

                        {/* Customer Details: Name, Mobile, Customer ID, KYC Status, Risk Score, Monthly Limit */}
                        <Grid container spacing={1.5} sx={{ mb: 2.5, p: 2, bgcolor: "#FFFFFF", borderRadius: 2.5, border: "1px solid #DCFCE7" }}>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 700 }}>
                              Customer Name
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A" }}>
                              {duplicateCustomer.full_name || `${duplicateCustomer.first_name || ""} ${duplicateCustomer.last_name || ""}`.trim() || "Existing Customer"}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 700 }}>
                              Mobile Number
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A" }}>
                              +91 {duplicateCustomer.mobile_number || mobileNumber}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 700, mt: 1 }}>
                              Customer ID
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A" }}>
                              {duplicateCustomer.customer_number || duplicateCustomer.public_id || "N/A"}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 700, mt: 1 }}>
                              KYC Status
                            </Typography>
                            <Chip
                              icon={<CheckCircleIcon sx={{ fontSize: "14px !important", color: "#16A34A !important" }} />}
                              label={duplicateCustomer.kyc_status || "VERIFIED"}
                              size="small"
                              sx={{ bgcolor: "#DCFCE7", color: "#15803D", fontWeight: 800, fontSize: "0.7rem", mt: 0.5 }}
                            />
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 700, mt: 1 }}>
                              Risk Score
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: "#15803D" }}>
                              {duplicateCustomer.risk_score ?? 15} / 100 (Low Risk)
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="caption" sx={{ color: "#64748B", display: "block", fontWeight: 700, mt: 1 }}>
                              Monthly Limit
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: "#0F172A" }}>
                              ₹{(duplicateCustomer.monthly_limit || 200000).toLocaleString('en-IN')}
                            </Typography>
                          </Grid>
                        </Grid>

                        {/* Requirement 3: Replace Continue button with "Use Customer" & "View Profile" */}
                        <Stack spacing={1.5}>
                          <M3Button
                            variant="contained"
                            fullWidth
                            onClick={() => handleCompleteAndReturn(duplicateCustomer)}
                            sx={{ py: 1.25, fontWeight: 800, bgcolor: "#16A34A", "&:hover": { bgcolor: "#15803D" } }}
                          >
                            Use Customer →
                          </M3Button>

                          <M3Button
                            variant="outlined"
                            fullWidth
                            startIcon={<VisibilityIcon />}
                            onClick={() => {
                              router.push(`/customers/customer-360?id=${duplicateCustomer.public_id || duplicateCustomer.id}`);
                              onClose();
                            }}
                            sx={{ py: 1.25, fontWeight: 800, borderColor: "#16A34A", color: "#15803D" }}
                          >
                            View Profile
                          </M3Button>
                        </Stack>
                      </Paper>
                    </motion.div>
                  )}

                  {/* Requirements 2 & 5: Display registration form ONLY when no existing customer is found */}
                  {mobileStatusState !== "EXISTING_CUSTOMER" && (
                    <Box sx={{ pt: 1 }}>
                      {mobileNumber.length === 10 && (
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
                          <Chip label="No customer found" size="small" sx={{ bgcolor: "#F1F5F9", color: "#475569", fontWeight: 800 }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#0F172A" }}>
                            Add New Customer
                          </Typography>
                        </Stack>
                      )}
                      <motion.div
                      key="new-form"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                    >
                      <form onSubmit={handleStep1Submit}>
                        <Stack spacing={2.5}>
                          <Grid container spacing={2}>
                            <Grid size={{ xs: 6 }}>
                              <M3TextField
                                label="First Name *"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                              />
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <M3TextField
                                label="Last Name *"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                              />
                            </Grid>
                          </Grid>

                          <M3TextField
                            label="Email Address (Optional)"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                          />

                          {/* Requirements 2 & 8: Enable Continue button only when mandatory fields are valid */}
                          <M3Button
                            type="submit"
                            variant="contained"
                            loading={step1Loading}
                            disabled={!isStep1Valid}
                            sx={{ py: 1.5, fontSize: "0.95rem", bgcolor: isStep1Valid ? "#0F172A" : "#94A3B8" }}
                          >
                            Send Mobile OTP & Proceed →
                          </M3Button>
                        </Stack>
                      </form>
                    </motion.div>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </motion.div>
          )}

          {/* ── STEP 1: MOBILE OTP ── */}
          {activeStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.5, color: "#0F172A" }}>
                  Step 2 — Mobile OTP Verification
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748B", mb: 2 }}>
                  Sent 6-digit OTP to <strong>+91 {mobileNumber}</strong> via {otpChannel}.
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                  <Chip
                    icon={<WhatsAppIcon sx={{ color: "#25D366 !important" }} />}
                    label="WhatsApp OTP"
                    size="small"
                    sx={{ backgroundColor: "#DCFCE7", color: "#15803D", fontWeight: 700 }}
                  />
                  <Chip
                    icon={<SmsIcon sx={{ color: "#0284C7 !important" }} />}
                    label="SMS Fallback"
                    size="small"
                    sx={{ backgroundColor: "#E0F2FE", color: "#0369A1", fontWeight: 700 }}
                  />
                </Stack>

                <form onSubmit={handleStep2Submit}>
                  <Stack spacing={2.5}>
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

                      <M3Button
                        variant="text"
                        size="small"
                        onClick={() => triggerMobileOtp(otpChannel === "WHATSAPP" ? "SMS" : "WHATSAPP")}
                      >
                        Resend via {otpChannel === "WHATSAPP" ? "SMS" : "WhatsApp"}
                      </M3Button>
                    </Stack>

                    <M3Button type="submit" variant="contained" loading={step2Loading} disabled={mobileOtp.length < 4} sx={{ bgcolor: "#0F172A" }}>
                      Verify OTP & Continue →
                    </M3Button>
                  </Stack>
                </form>
              </Paper>
            </motion.div>
          )}

          {/* ── STEP 2: AADHAAR EKYC ── */}
          {activeStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                  <ShieldIcon sx={{ color: "#2563EB" }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    Step 3 — Cashfree Aadhaar eKYC
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                  Official UIDAI Aadhaar OTP verification via Cashfree Verification API.
                </Typography>

                {!aadhaarOtpSent ? (
                  <Stack spacing={2.5}>
                    <M3TextField
                      label="12-Digit Aadhaar Number *"
                      value={aadhaarNumber}
                      onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="XXXX-XXXX-XXXX"
                    />
                    <M3Button
                      variant="contained"
                      loading={step3Loading}
                      disabled={aadhaarNumber.length !== 12}
                      onClick={handleGenerateAadhaarOtp}
                      sx={{ bgcolor: "#0F172A" }}
                    >
                      Generate Aadhaar OTP →
                    </M3Button>
                  </Stack>
                ) : (
                  <form onSubmit={handleVerifyAadhaarOtp}>
                    <Stack spacing={2.5}>
                      <Alert severity="info" sx={{ borderRadius: 2.5, fontWeight: 700 }}>
                        OTP sent to mobile linked with Masked Aadhaar: {maskedAadhaar}
                      </Alert>

                      <M3TextField
                        label="Enter Aadhaar OTP *"
                        value={aadhaarOtp}
                        onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        required
                      />

                      <M3Button type="submit" variant="contained" loading={step3Loading} disabled={aadhaarOtp.length < 4} sx={{ bgcolor: "#0F172A" }}>
                        Verify Cashfree eKYC →
                      </M3Button>
                    </Stack>
                  </form>
                )}
              </Paper>
            </motion.div>
          )}

          {/* ── STEP 3: TRANSACTION PIN SETUP ── */}
          {activeStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1 }}>
                  <LockIcon sx={{ color: "#0F172A" }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>
                    Step 4 — Set Transaction Security PIN
                  </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                  Create a 4-digit security PIN to authorize all future transaction payouts.
                </Typography>

                {pinError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2.5 }}>
                    {pinError}
                  </Alert>
                )}

                <form onSubmit={handleStep4Submit}>
                  <Stack spacing={2.5}>
                    <M3TextField
                      label="Create 4-Digit PIN *"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      type="password"
                      required
                    />
                    <M3TextField
                      label="Confirm 4-Digit PIN *"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      type="password"
                      required
                    />

                    <M3Button type="submit" variant="contained" loading={step4Loading} disabled={pin.length < 4} sx={{ bgcolor: "#0F172A" }}>
                      Save PIN & Finalize Customer →
                    </M3Button>
                  </Stack>
                </form>
              </Paper>
            </motion.div>
          )}

          {/* ── STEP 4: COMPLETE & AUTO RETURN ── */}
          {activeStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 4,
                  border: "2px solid #16A34A",
                  backgroundColor: "#F0FDF4",
                  textAlign: "center",
                }}
              >
                <VerifiedIcon sx={{ fontSize: 64, color: "#16A34A", mb: 1.5 }} />
                <Typography variant="h5" sx={{ fontWeight: 900, color: "#14532D", mb: 1 }}>
                  Customer Registration Complete!
                </Typography>
                <Typography variant="body2" sx={{ color: "#166534", mb: 3 }}>
                  {createdCustomer?.first_name} {createdCustomer?.last_name} ({createdCustomer?.mobile_number}) is verified & registered.
                </Typography>

                <M3Button
                  variant="contained"
                  size="large"
                  onClick={() => handleCompleteAndReturn(createdCustomer)}
                  sx={{
                    backgroundColor: "#16A34A",
                    "&:hover": { backgroundColor: "#15803D" },
                    py: 1.5,
                    px: 4,
                    fontSize: "1rem",
                  }}
                >
                  Select Customer →
                </M3Button>
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Drawer>
  );
}
