"use client";

import React, { useState, useEffect } from "react";
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import LockIcon from "@mui/icons-material/Lock";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import VerifiedIcon from "@mui/icons-material/Verified";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SmsIcon from "@mui/icons-material/Sms";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
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

const STEPS = [
  "Registration",
  "Mobile OTP",
  "Aadhaar eKYC",
  "Transaction PIN",
  "Complete",
];

export function CustomerMasterSlideOver({
  open,
  onClose,
  onSuccess,
  initialMobile = "",
}: CustomerMasterSlideOverProps) {
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
  const [ekycComplete, setEkycComplete] = useState(false);

  // PIN State
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [step4Loading, setStep4Loading] = useState(false);

  useEffect(() => {
    if (initialMobile) {
      handleMobileChange(initialMobile);
    }
  }, [initialMobile]);

  const resetForm = () => {
    setActiveStep(0);
    setFirstName("");
    setLastName("");
    setMobileNumber("");
    setEmail("");
    setMobileStatusState("IDLE");
    setMobileStatusMessage("");
    setDuplicateCustomer(null);
    setMobileOtp("");
    setCreatedCustomer(null);
    setAadhaarNumber("");
    setAadhaarOtpSent(false);
    setAadhaarOtp("");
    setMaskedAadhaar("");
    setEkycComplete(false);
    setPin("");
    setConfirmPin("");
    setPinError("");
  };

  // Real-Time Mobile Input Validation
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
      setEkycComplete(true);
      notificationEngine.notify("AADHAAR_EKYC_COMPLETED");
      setActiveStep(3);
    } else {
      notificationEngine.notify("TRANSACTION_FAILED", "Invalid Aadhaar OTP code");
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

  // Auto Return & Complete
  const handleCompleteAndReturn = (custToSelect: any) => {
    setSelectedCustomer(custToSelect);
    if (onSuccess) {
      onSuccess(custToSelect);
    }
    onClose();
    resetForm();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "100%", sm: 560 },
            borderTopLeftRadius: { xs: 0, sm: 24 },
            borderBottomLeftRadius: { xs: 0, sm: 24 },
            backgroundColor: "#F8FAFC",
          },
        },
      }}
    >
      {/* Header Bar */}
      <Box
        sx={{
          p: 3,
          background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)",
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
              Customer Master Module
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700 }}>
              Single Source of Truth Registration & eKYC
            </Typography>
          </Box>
        </Stack>

        <IconButton onClick={onClose} sx={{ color: "#FFF" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Stepper Header */}
      <Box sx={{ p: 2.5, backgroundColor: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label, idx) => (
            <Step key={label} completed={activeStep > idx}>
              <StepLabel>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.7rem" }}>
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
          {/* ── STEP 0: REGISTRATION ── */}
          {activeStep === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.5, color: "#1E1B4B" }}>
                  Step 1 — Customer Identification
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                  Enter customer details for instant duplicate checks & onboarding.
                </Typography>

                <form onSubmit={handleStep1Submit}>
                  <Stack spacing={2.5}>
                    <M3TextField
                      label="Mobile Number *"
                      value={mobileNumber}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      placeholder="e.g. 98401 92837"
                      helperText={`${mobileNumber.length}/10 Digits`}
                      endAdornment={
                        mobileStatusState === "CHECKING" ? (
                          <CircularProgress size={20} />
                        ) : mobileStatusState === "NEW_CUSTOMER" ? (
                          <CheckCircleIcon sx={{ color: "#16A34A" }} />
                        ) : undefined
                      }
                    />

                    {/* Live Mobile Validation Status */}
                    {mobileStatusMessage && (
                      <Alert
                        severity={
                          mobileStatusState === "NEW_CUSTOMER"
                            ? "success"
                            : mobileStatusState === "EXISTING_CUSTOMER"
                            ? "warning"
                            : mobileStatusState === "CHECKING"
                            ? "info"
                            : "error"
                        }
                        sx={{ borderRadius: 2.5, fontWeight: 700, py: 0.5 }}
                      >
                        {mobileStatusMessage}
                      </Alert>
                    )}

                    {/* Duplicate Customer Card */}
                    {duplicateCustomer && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: "1px dashed #F59E0B",
                          backgroundColor: "#FEF3C7",
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#92400E" }}>
                          Existing Customer: {duplicateCustomer.first_name} {duplicateCustomer.last_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#78350F", display: "block", mb: 1.5 }}>
                          ID: {duplicateCustomer.public_id} • Mobile: {duplicateCustomer.mobile_number}
                        </Typography>
                        <M3Button
                          variant="contained"
                          size="small"
                          onClick={() => handleCompleteAndReturn(duplicateCustomer)}
                          sx={{ backgroundColor: "#D97706", "&:hover": { backgroundColor: "#B45309" } }}
                        >
                          Select Existing Customer & Return →
                        </M3Button>
                      </Paper>
                    )}

                    <Stack direction="row" spacing={2}>
                      <M3TextField
                        label="First Name *"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        disabled={mobileStatusState !== "NEW_CUSTOMER"}
                      />
                      <M3TextField
                        label="Last Name *"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        disabled={mobileStatusState !== "NEW_CUSTOMER"}
                      />
                    </Stack>

                    <M3TextField
                      label="Email Address (Optional)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      disabled={mobileStatusState !== "NEW_CUSTOMER"}
                    />

                    <M3Button
                      type="submit"
                      variant="contained"
                      loading={step1Loading}
                      disabled={mobileStatusState !== "NEW_CUSTOMER" || !firstName || !lastName}
                      sx={{ py: 1.5, fontSize: "0.95rem" }}
                    >
                      Continue to Mobile OTP Verification →
                    </M3Button>
                  </Stack>
                </form>
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
                <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 0.5, color: "#1E1B4B" }}>
                  Step 2 — Mobile OTP Verification
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748B", mb: 2 }}>
                  Sent 6-digit OTP to <strong>+91 {mobileNumber}</strong> via {otpChannel}.
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                  <Chip
                    icon={<WhatsAppIcon sx={{ color: "#25D366 !important" }} />}
                    label="WhatsApp OTP First"
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

                    <M3Button type="submit" variant="contained" loading={step2Loading} disabled={mobileOtp.length < 4}>
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
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

                      <M3Button type="submit" variant="contained" loading={step3Loading} disabled={aadhaarOtp.length < 4}>
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
                  <LockIcon sx={{ color: "#312E81" }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#1E1B4B" }}>
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

                    <M3Button type="submit" variant="contained" loading={step4Loading} disabled={pin.length < 4}>
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
                  Customer Master Onboarded!
                </Typography>
                <Typography variant="body2" sx={{ color: "#166534", mb: 3 }}>
                  {createdCustomer?.first_name} {createdCustomer?.last_name} ({createdCustomer?.mobile_number}) is verified & registered as Enterprise Master Data.
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
                  Auto Return & Select Customer →
                </M3Button>
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Drawer>
  );
}
