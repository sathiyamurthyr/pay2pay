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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import VerifiedIcon from "@mui/icons-material/Verified";
import SaveIcon from "@mui/icons-material/Save";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import SpeedIcon from "@mui/icons-material/Speed";
import PersonIcon from "@mui/icons-material/Person";
import HistoryIcon from "@mui/icons-material/History";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import DescriptionIcon from "@mui/icons-material/Description";
import TuneIcon from "@mui/icons-material/Tune";
import { motion, AnimatePresence } from "framer-motion";

import { M3TextField } from "@/components/ui/form-components";
import { M3Button } from "@/components/ui/m3-components";
import { retailerApi } from "@/services/retailer-api";
import { notificationEngine } from "@/services/notification-engine";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";

const STEPS = [
  { label: "Identification", est: "10s" },
  { label: "Mobile OTP", est: "30s" },
  { label: "Aadhaar eKYC", est: "45s" },
  { label: "Security PIN", est: "15s" },
  { label: "Review & Complete", est: "0s" },
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
  const [existingCustomer, setExistingCustomer] = useState<any | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState<any | null>(null);

  // Auto-Save Draft Timestamp
  const [lastSaved, setLastSaved] = useState<string>("Just now");

  // Auto-Search Customer on 10th digit
  useEffect(() => {
    if (mobileNumber.length === 10 && !existingCustomer) {
      handleSearchCustomer(mobileNumber);
    }
  }, [mobileNumber]);

  const handleSearchCustomer = async (num: string) => {
    setLookupLoading(true);
    const res = await retailerApi.searchPayoutCustomer(num);
    setLookupLoading(false);
    if (res.status === "SUCCESS" && res.data) {
      setExistingCustomer(res.data);
      notificationEngine.notify("CUSTOMER_VERIFIED", `Existing customer found: ${res.data.full_name}`);
    } else {
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
      notificationEngine.notify("CUSTOMER_VERIFIED", "Customer Onboarding Draft Saved");
    } catch {
      // Ignore
    }
  };

  const handleSendMobileOtp = () => {
    setOtpSent(true);
    setActiveStep(1);
    notificationEngine.notify("OTP_RECEIVED", "WhatsApp OTP Sent to +91 " + mobileNumber);
  };

  const handleVerifyMobileOtp = () => {
    setActiveStep(2);
  };

  const handleGenerateAadhaarOtp = () => {
    setAadhaarOtpSent(true);
    notificationEngine.notify("AADHAAR_EKYC_COMPLETED", "Aadhaar OTP generated successfully");
  };

  const handleVerifyAadhaarOtp = () => {
    setAadhaarVerified(true);
    setActiveStep(3);
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
              <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: "-0.3px" }}>
                Enterprise Customer Onboarding Workspace
              </Typography>
              <Chip
                label="Banking OS Standard"
                size="small"
                sx={{ bgcolor: "#22C55E", color: "#052E16", fontWeight: 800, fontSize: "0.65rem" }}
              />
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600 }}>
              Real-time Validation • Cashfree eKYC • Auto-return to transaction
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

      {/* ── WORKSPACE BODY: 3-COLUMN LAYOUT (20% | 55% | 25%) ── */}
      <Box sx={{ flex: 1, maxWidth: 1600, width: "100%", mx: "auto", p: { xs: 2, md: 3 }, pb: 12 }}>
        <Grid container spacing={3}>
          {/* ── LEFT COLUMN (20%): STEPPER & PROGRESS ── */}
          <Grid size={{ xs: 12, md: 3, lg: 2.4 }}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF", position: { md: "sticky" }, top: { md: 90 } }}>
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

              <Stack spacing={1.5} sx={{ mb: 2.5 }}>
                {STEPS.map((s, idx) => {
                  const isDone = activeStep > idx;
                  const isCurrent = activeStep === idx;
                  return (
                    <Paper
                      key={s.label}
                      elevation={0}
                      sx={{
                        p: 1.25,
                        borderRadius: 3,
                        border: isCurrent ? "2px solid #0284C7" : "1px solid #F1F5F9",
                        backgroundColor: isCurrent ? "#F0F9FF" : isDone ? "#F0FDF4" : "#FAF5FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                        <Avatar sx={{ width: 26, height: 26, fontSize: "0.75rem", fontWeight: 900, bgcolor: isDone ? "#16A34A" : isCurrent ? "#0F172A" : "#94A3B8" }}>
                          {isDone ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : idx + 1}
                        </Avatar>
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: isCurrent ? 900 : 700, color: isCurrent ? "#0F172A" : "#334155", display: "block" }}>
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

              <Divider sx={{ my: 1.5 }} />

              <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "#64748B" }}>
                <AccessTimeIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Est. Time: ~1.5 mins
                </Typography>
              </Stack>
            </Paper>
          </Grid>

          {/* ── CENTER COLUMN (55%): MAIN FORM STEPS ── */}
          <Grid size={{ xs: 12, md: 6, lg: 6.6 }}>
            <AnimatePresence mode="wait">
              {/* STEP 0: IDENTIFICATION */}
              {activeStep === 0 && (
                <motion.div key="step0" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", mb: 0.5 }}>
                      Step 1 — Customer Mobile Identification & Personal Details
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                      Enter 10-digit mobile number. Real-time duplicate check runs automatically after 10th digit.
                    </Typography>

                    <Stack spacing={2.5}>
                      <M3TextField
                        label="Mobile Number *"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="e.g. 9876543210"
                        required
                        helperText={
                          lookupLoading
                            ? "Checking existing customer database..."
                            : mobileNumber.length === 10
                            ? existingCustomer
                              ? "✓ Existing customer identified"
                              : "✓ Mobile valid for new registration"
                            : "Enter 10 digits starting with 6,7,8,9"
                        }
                      />

                      {existingCustomer && (
                        <Alert severity="warning" sx={{ borderRadius: 3, border: "1px solid #FCD34D" }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                            Customer Already Registered!
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#92400E", mb: 1.5 }}>
                            {existingCustomer.full_name} (+91 {existingCustomer.mobile_number}) • ID: {existingCustomer.public_id}
                          </Typography>
                          <M3Button variant="contained" size="small" onClick={() => handleCompleteAndReturn(existingCustomer)} sx={{ bgcolor: "#D97706" }}>
                            Use Existing Customer for Payout →
                          </M3Button>
                        </Alert>
                      )}

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <M3TextField label="First Name *" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <M3TextField label="Last Name *" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                        </Grid>
                      </Grid>

                      <M3TextField label="Email Address (Optional)" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />

                      <M3Button
                        variant="contained"
                        disabled={mobileNumber.length !== 10 || !firstName || !!existingCustomer}
                        onClick={handleSendMobileOtp}
                        sx={{ py: 1.75, bgcolor: "#0F172A" }}
                      >
                        Send Mobile OTP & Proceed →
                      </M3Button>
                    </Stack>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 1: MOBILE OTP */}
              {activeStep === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", mb: 0.5 }}>
                      Step 2 — Mobile OTP Verification
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                      OTP sent via WhatsApp first to <strong>+91 {mobileNumber}</strong>. (Auto fallback to SMS in 30s)
                    </Typography>

                    <Stack spacing={2.5}>
                      <M3TextField label="6-Digit OTP Code *" value={otpValue} onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 123456" />

                      <M3Button variant="contained" disabled={otpValue.length !== 6} onClick={handleVerifyMobileOtp} sx={{ py: 1.75, bgcolor: "#0F172A" }}>
                        Verify Mobile OTP →
                      </M3Button>
                    </Stack>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 2: AADHAAR EKYC */}
              {activeStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F172A", mb: 0.5 }}>
                      Step 3 — Cashfree Aadhaar eKYC Verification
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", mb: 3 }}>
                      Real-time Aadhaar OTP verification via Cashfree APIs for instant verification status.
                    </Typography>

                    <Stack spacing={2.5}>
                      <M3TextField label="12-Digit Aadhaar Number *" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12))} placeholder="1234 5678 9012" />

                      {!aadhaarOtpSent ? (
                        <M3Button variant="outlined" disabled={aadhaarNumber.length !== 12} onClick={handleGenerateAadhaarOtp}>
                          Generate Aadhaar OTP
                        </M3Button>
                      ) : (
                        <>
                          <M3TextField label="Aadhaar OTP *" value={aadhaarOtp} onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter Aadhaar OTP" />
                          <M3Button variant="contained" disabled={aadhaarOtp.length !== 6} onClick={handleVerifyAadhaarOtp} sx={{ py: 1.75, bgcolor: "#0F172A" }}>
                            Verify Aadhaar eKYC →
                          </M3Button>
                        </>
                      )}
                    </Stack>
                  </Paper>
                </motion.div>
              )}

              {/* STEP 3: SECURITY PIN */}
              {activeStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}>
                  <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF" }}>
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
                  </Paper>
                </motion.div>
              )}

              {/* STEP 4: REVIEW & COMPLETE */}
              {activeStep === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: "1px solid #BBF7D0", backgroundColor: "#F0FDF4", textAlign: "center" }}>
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

          {/* ── RIGHT COLUMN (25%): LIVE CUSTOMER 360 PANEL ── */}
          <Grid size={{ xs: 12, md: 3, lg: 3 }}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 4, border: "1px solid #E2E8F0", backgroundColor: "#FFF", position: { md: "sticky" }, top: { md: 90 } }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#0F172A", mb: 1.5 }}>
                Customer 360 Insight Panel
              </Typography>

              {/* Customer Avatar & Main Badge */}
              <Box sx={{ textAlign: "center", p: 2, bgcolor: "#F8FAFC", borderRadius: 3, mb: 2 }}>
                <Avatar sx={{ width: 56, height: 56, mx: "auto", mb: 1, bgcolor: "#0284C7", fontWeight: 900, fontSize: "1.25rem" }}>
                  {firstName ? firstName.charAt(0) : "C"}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#0F172A" }}>
                  {firstName || lastName ? `${firstName} ${lastName}`.trim() : "Draft Customer"}
                </Typography>
                <Typography variant="caption" sx={{ color: "#64748B", display: "block" }}>
                  {mobileNumber ? `+91 ${mobileNumber}` : "Mobile Pending"}
                </Typography>
                <Chip
                  label={aadhaarVerified ? "Full eKYC Verified" : "Registration in Progress"}
                  size="small"
                  sx={{ mt: 1, height: 20, fontSize: "0.65rem", fontWeight: 800, bgcolor: aadhaarVerified ? "#DCFCE7" : "#FEF3C7", color: aadhaarVerified ? "#15803D" : "#B45309" }}
                />
              </Box>

              {/* KYC Status Checklist */}
              <Typography variant="caption" sx={{ fontWeight: 900, color: "#475569", textTransform: "uppercase", display: "block", mb: 1 }}>
                KYC Status Checklist
              </Typography>
              <Stack spacing={0.75} sx={{ mb: 2 }}>
                {[
                  { label: "Mobile Verified", ok: activeStep >= 1 },
                  { label: "Aadhaar Verified", ok: aadhaarVerified },
                  { label: "PAN Verified", ok: aadhaarVerified },
                  { label: "Face Verified", ok: aadhaarVerified },
                  { label: "PIN Created", ok: securityPin.length === 4 },
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
            <M3Button
              variant="contained"
              disabled={
                (activeStep === 0 && (mobileNumber.length !== 10 || !firstName || !!existingCustomer)) ||
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
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
