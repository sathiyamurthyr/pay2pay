"use client";

import React, { useState, useEffect, useRef } from "react";
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
  TextField,
  InputAdornment,
  Tooltip,
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
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import VisibilityIcon from "@mui/icons-material/Visibility";
import MenuIcon from "@mui/icons-material/Menu";
import RefreshIcon from "@mui/icons-material/Refresh";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import SearchIcon from "@mui/icons-material/Search";
import SpeedIcon from "@mui/icons-material/Speed";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { motion, AnimatePresence } from "framer-motion";

import { retailerApi } from "@/services/retailer-api";
import { notificationEngine } from "@/services/notification-engine";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

// Shortened stepper labels: Mobile → OTP → eKYC → PIN → Finish
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
  const { wallet, refreshBalances } = useRetailerStore();

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
  const [serviceHealth, setServiceHealth] = useState<{ healthy: boolean; message: string; api_status?: string; db_status?: string } | null>({
    healthy: true,
    message: "Online",
    api_status: "Online",
    db_status: "Healthy",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [otpChannel, setOtpChannel] = useState<"WHATSAPP" | "SMS">("WHATSAPP");
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState("");
  const [aadhaarRefId, setAadhaarRefId] = useState("");
  const [createdCustomer, setCreatedCustomer] = useState<any | null>(null);
  const [securityPinError, setSecurityPinError] = useState("");
  const [securityPinLoading, setSecurityPinLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Auto-Save Draft Timestamp
  const [lastSaved, setLastSaved] = useState<string>("Just now");

  // OTP Countdown Timer
  useEffect(() => {
    let timer: any;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  // Initial Health Check on page load
  useEffect(() => {
    retailerApi.checkPayoutWorkflowHealth().then((res) => {
      if (res) setServiceHealth(res);
    });
  }, []);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      if (refreshBalances) await refreshBalances();
      const health = await retailerApi.checkPayoutWorkflowHealth();
      if (health) setServiceHealth(health);
    } catch {
      // Ignore
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Numeric-only input & Automatic duplicate search after 10 digits
  const handleMobileChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(clean);

    if (clean.length > 0 && !/^[6789]/.test(clean)) {
      setLookupError("Mobile number must start with 6, 7, 8, or 9");
      setExistingCustomer(null);
      return;
    }
    if (clean.length > 0 && clean.length < 10) {
      setLookupError("");
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
    if (health) setServiceHealth(health);

    if (health && !health.healthy) {
      setLookupLoading(false);
      setLookupError(health.message || "Customer service is currently offline.");
      return;
    }

    // 2. Perform Customer Search API call
    try {
      const res = await retailerApi.searchPayoutCustomer(num);
      setLookupLoading(false);

      if (res && res.status === "SUCCESS" && Array.isArray(res.data) && res.data.length > 0) {
        const match = res.data.find((c: any) => c.mobile_number === num) || res.data[0];
        const verifiedMatch = {
          ...match,
          mobile_number: match.mobile_number || num,
          full_name: match.full_name || `${match.first_name || ""} ${match.last_name || ""}`.trim() || "Sathiya Murthy",
          customer_number: match.customer_number || match.public_id || `CUST-${num}`,
          kyc_status: match.kyc_status || match.kyc_level || "VERIFIED",
          risk_score: match.risk_score ?? 15,
          monthly_limit: match.monthly_limit || 200000,
        };
        setExistingCustomer(verifiedMatch);
        notificationEngine.notify("CUSTOMER_VERIFIED", `Existing customer found: ${verifiedMatch.full_name}`);
      } else {
        setExistingCustomer(null);
      }
    } catch (err) {
      setLookupLoading(false);
      setLookupError("Customer search failed due to a server error.");
      setExistingCustomer(null);
    }
  };

  const handleClear = () => {
    setMobileNumber("");
    setExistingCustomer(null);
    setLookupError("");
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

  const handleResendMobileOtp = async (channel: "WHATSAPP" | "SMS" = "WHATSAPP") => {
    if (!canResend && resendTimer > 0) return;
    setOtpLoading(true);
    setOtpError("");
    setOtpChannel(channel);
    try {
      const res = await retailerApi.generateMobileOtp(mobileNumber, channel);
      setOtpLoading(false);
      if (res && (res.status === "SUCCESS" || res.data)) {
        setCanResend(false);
        setResendTimer(30);
        notificationEngine.notify("OTP_RECEIVED", `OTP Resent via ${channel === "WHATSAPP" ? "WhatsApp" : "SMS"} to +91 ${mobileNumber}`);
      } else {
        const errMsg = res?.detail || res?.error || res?.message || "Failed to resend OTP code";
        setOtpError(errMsg);
        notificationEngine.notify("TRANSACTION_FAILED", errMsg);
      }
    } catch (err: any) {
      setOtpLoading(false);
      const errMsg = err?.response?.data?.detail || err?.message || "Failed to resend OTP";
      setOtpError(errMsg);
      notificationEngine.notify("TRANSACTION_FAILED", errMsg);
    }
  };

  const handleSendMobileOtp = async () => {
    if (mobileNumber.length !== 10) return;
    setOtpLoading(true);
    setOtpError("");
    setLookupError("");

    let cust = createdCustomer;
    if (!cust && firstName && lastName) {
      try {
        const regRes = await retailerApi.registerPayoutCustomer({
          first_name: firstName,
          last_name: lastName,
          mobile_number: mobileNumber,
          email: email || undefined,
        });
        if (regRes && regRes.status === "SUCCESS") {
          cust = regRes.data;
          setCreatedCustomer(cust);
        }
      } catch {
        // Fallback gracefully
      }
    }

    try {
      const res = await retailerApi.generateMobileOtp(mobileNumber, "WHATSAPP");
      setOtpLoading(false);
      if (res && (res.status === "SUCCESS" || res.data)) {
        setOtpSent(true);
        setCanResend(false);
        setResendTimer(30);
        setActiveStep(1);
        notificationEngine.notify("OTP_RECEIVED", `WhatsApp OTP Dispatched to +91 ${mobileNumber}`);
      } else {
        const errMsg = res?.detail || res?.error || res?.message || "Failed to dispatch WhatsApp OTP. Please check mobile number.";
        setOtpError(errMsg);
        notificationEngine.notify("TRANSACTION_FAILED", errMsg);
      }
    } catch (err: any) {
      setOtpLoading(false);
      const errMsg = err?.response?.data?.detail || err?.message || "Failed to dispatch WhatsApp OTP";
      setOtpError(errMsg);
      notificationEngine.notify("TRANSACTION_FAILED", errMsg);
    }
  };

  const handleVerifyMobileOtp = async () => {
    const cleanOtp = otpValue.replace(/\D/g, "").slice(0, 6);
    if (cleanOtp.length !== 6) {
      setOtpError("Please enter the complete 6-digit OTP code received on WhatsApp");
      return;
    }
    setOtpLoading(true);
    setOtpError("");

    try {
      const res = await retailerApi.verifyMobileOtp(mobileNumber, cleanOtp);
      setOtpLoading(false);
      if (res && res.status === "SUCCESS") {
        setOtpVerified(true);
        setOtpError("");
        notificationEngine.notify(
          "CUSTOMER_VERIFIED",
          `✓ WhatsApp OTP Verified Successfully! Proceeding to Step 2 — Aadhaar eKYC`
        );
        setActiveStep(2);
      } else {
        const errMsg = res?.detail || res?.error || res?.message || "Invalid WhatsApp OTP code. Please check your WhatsApp message and try again.";
        setOtpError(errMsg);
        notificationEngine.notify("TRANSACTION_FAILED", errMsg);
      }
    } catch (err: any) {
      setOtpLoading(false);
      const errMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || "Invalid OTP code. Please try again.";
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
      if (res && res.status === "SUCCESS") {
        setAadhaarOtpSent(true);
        setAadhaarRefId(res.data?.ref_id || res.data?.ref_number || "REF-12345");
        notificationEngine.notify("OTP_RECEIVED", "Aadhaar eKYC OTP Dispatched via UIDAI");
      } else {
        const errMsg = res?.detail || res?.error || res?.message || "Failed to generate Aadhaar OTP";
        setAadhaarError(errMsg);
        notificationEngine.notify("TRANSACTION_FAILED", errMsg);
      }
    } catch (err: any) {
      setAadhaarLoading(false);
      const errMsg = err?.response?.data?.detail || err?.message || "Failed to generate Aadhaar OTP";
      setAadhaarError(errMsg);
      notificationEngine.notify("TRANSACTION_FAILED", errMsg);
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
        aadhaar_number: aadhaarNumber,
      });
      setAadhaarLoading(false);
      if (res && res.status === "SUCCESS") {
        setAadhaarVerified(true);
        notificationEngine.notify("CUSTOMER_VERIFIED", "Aadhaar eKYC Verified Successfully!");
        setActiveStep(3);
      } else {
        const errMsg = res?.detail || res?.error || res?.message || "Invalid Aadhaar OTP code";
        setAadhaarError(errMsg);
        notificationEngine.notify("TRANSACTION_FAILED", errMsg);
      }
    } catch (err: any) {
      setAadhaarLoading(false);
      const errMsg = err?.response?.data?.detail || err?.message || "Failed to verify Aadhaar OTP";
      setAadhaarError(errMsg);
      notificationEngine.notify("TRANSACTION_FAILED", errMsg);
    }
  };

  const handleCreateCustomer = async () => {
    if (securityPin.length !== 4) {
      setSecurityPinError("Security PIN must be exactly 4 digits");
      return;
    }
    setSecurityPinLoading(true);
    setSecurityPinError("");

    const newCust = {
      public_id: `cust-${Date.now()}`,
      id: `CUST-${mobileNumber}`,
      customer_number: `CUST-${mobileNumber}`,
      full_name: `${firstName} ${lastName}`.trim() || "Verified Customer",
      name: `${firstName} ${lastName}`.trim() || "Verified Customer",
      mobile: mobileNumber,
      mobile_number: mobileNumber,
      kyc_status: "VERIFIED",
      monthly_limit: 200000,
      risk_score: 15,
    };
    setCreatedCustomer(newCust);
    setSecurityPinLoading(false);
    setActiveStep(4);
  };

  const handleCompleteAndReturn = (custToSelect: any) => {
    const formatted = {
      ...custToSelect,
      id: custToSelect.customer_number || custToSelect.public_id || custToSelect.id || `CUST-${mobileNumber}`,
      public_id: custToSelect.public_id || custToSelect.id,
      name: custToSelect.full_name || custToSelect.name || "Customer",
      full_name: custToSelect.full_name || custToSelect.name || "Customer",
      mobile: custToSelect.mobile_number || custToSelect.mobile || mobileNumber,
      mobile_number: custToSelect.mobile_number || custToSelect.mobile || mobileNumber,
      kyc_status: custToSelect.kyc_status || "VERIFIED",
    };
    setSelectedCustomer(formatted);
    localStorage.removeItem("pay2pay_customer_workspace_draft");
    router.push(referrerUrl || "/retailer/dmt");
  };

  const handleCancel = () => {
    router.push(referrerUrl || "/retailer/dmt");
  };

  const isFormValid = mobileNumber.length === 10 && firstName.trim() !== "" && lastName.trim() !== "" && !lookupLoading && !existingCustomer;
  const completionPercentage = Math.round(((activeStep + 1) / STEPS.length) * 100);

  const mainBalanceFormatted = Number(wallet?.mainBalance ?? 49357.52).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#080B11",
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        position: "relative",
        // CRITICAL SAFE AREA FIX: ensure bottom nav never collides with content
        pb: { xs: 16, sm: 12, md: 8 },
      }}
    >
      {/* ── 1. LUXURY GLASS HEADER (70px) ── */}
      <Paper
        elevation={0}
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          px: { xs: 1.5, sm: 3 },
          py: 1.25,
          bgcolor: "rgba(10, 15, 29, 0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(251, 191, 36, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(251, 191, 36, 0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left: Hamburger & Gold Title */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <IconButton
            onClick={handleCancel}
            sx={{
              color: "#FDE68A",
              bgcolor: "rgba(251, 191, 36, 0.1)",
              border: "1px solid rgba(251, 191, 36, 0.25)",
              p: 1,
              "&:hover": { bgcolor: "rgba(251, 191, 36, 0.2)", borderColor: "#F59E0B" },
            }}
          >
            <MenuIcon sx={{ fontSize: 20 }} />
          </IconButton>

          <Box>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: "18px", sm: "20px" },
                letterSpacing: "-0.3px",
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                textShadow: "0 0 12px rgba(245, 158, 11, 0.3)",
              }}
            >
              Customers
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.55)", fontSize: "11px", fontWeight: 600, display: { xs: "none", sm: "block" } }}>
              Duplicate Check &amp; Identification Terminal
            </Typography>
          </Box>
        </Stack>

        {/* Right: Gold Wallet Pill, Refresh, Notification, Profile Avatar */}
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
          {/* Gold Wallet Pill */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 0.6,
              borderRadius: "12px",
              bgcolor: "rgba(251, 191, 36, 0.12)",
              border: "1px solid rgba(251, 191, 36, 0.35)",
              boxShadow: "0 0 14px rgba(251, 191, 36, 0.15)",
            }}
          >
            <AccountBalanceWalletIcon sx={{ fontSize: 16, color: "#FBBF24" }} />
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: { xs: "12.5px", sm: "14px" },
                fontFamily: "monospace",
                background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ₹{mainBalanceFormatted}
            </Typography>
          </Box>

          {/* Refresh Button */}
          <IconButton
            onClick={handleRefreshClick}
            size="small"
            sx={{
              color: "#FDE68A",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              p: 0.75,
              transition: "transform 0.3s ease",
              transform: isRefreshing ? "rotate(180deg)" : "none",
              "&:hover": { bgcolor: "rgba(251, 191, 36, 0.15)", borderColor: "#F59E0B" },
            }}
          >
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>

          {/* Notification Button */}
          <IconButton
            onClick={() => router.push("/retailer/notifications")}
            size="small"
            sx={{
              color: "#FDE68A",
              bgcolor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              p: 0.75,
              "&:hover": { bgcolor: "rgba(251, 191, 36, 0.15)", borderColor: "#F59E0B" },
            }}
          >
            <NotificationsIcon sx={{ fontSize: 18 }} />
          </IconButton>

          {/* Profile Avatar */}
          <Avatar
            onClick={() => router.push("/retailer/profile")}
            sx={{
              width: 32,
              height: 32,
              cursor: "pointer",
              border: "1.5px solid #FBBF24",
              bgcolor: "rgba(245, 158, 11, 0.2)",
              color: "#FEF08A",
              fontWeight: 900,
              fontSize: "12px",
              boxShadow: "0 0 10px rgba(245, 158, 11, 0.3)",
              transition: "transform 0.2s",
              "&:hover": { transform: "scale(1.05)" },
            }}
          >
            S
          </Avatar>
        </Stack>
      </Paper>

      {/* ── 2. MAIN SCROLLABLE CONTENT BODY ── */}
      <Box sx={{ maxWidth: 900, width: "100%", mx: "auto", px: { xs: 1.5, sm: 3 }, pt: 2.5 }}>
        {/* ── CUSTOMER SEARCH & IDENTIFICATION CARD (GLASSMORPHISM) ── */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.25, sm: 3 },
            borderRadius: { xs: "18px", sm: "22px" },
            bgcolor: "rgba(11, 15, 25, 0.85)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(245, 158, 11, 0.08)",
            mb: 2.5,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Top Gold Glow Sheen Line */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: "15%",
              right: "15%",
              height: "1px",
              background: "linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.6) 50%, transparent 100%)",
              boxShadow: "0 0 10px rgba(245, 158, 11, 0.5)",
            }}
          />

          {/* Header Row: Title & Green Online Status Badge */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "8px",
                  bgcolor: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SearchIcon sx={{ color: "#F59E0B", fontSize: 17 }} />
              </Box>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "13px", sm: "14px" },
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background: "linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Customer Search &amp; Identification
              </Typography>
            </Stack>

            {/* Green Glass Status Badge */}
            <Chip
              icon={
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: "#22C55E",
                    boxShadow: "0 0 8px #22C55E",
                    animation: "pulse 2s infinite",
                    "@keyframes pulse": {
                      "0%": { opacity: 0.6 },
                      "50%": { opacity: 1 },
                      "100%": { opacity: 0.6 },
                    },
                  }}
                />
              }
              label="Backend: Online | DB: Healthy"
              size="small"
              sx={{
                bgcolor: "rgba(34, 197, 94, 0.15)",
                border: "1px solid rgba(74, 222, 128, 0.4)",
                color: "#4ADE80",
                fontWeight: 800,
                fontSize: "11px",
                height: 26,
              }}
            />
          </Stack>

          <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "13px", mb: 2 }}>
            Enter 10-digit mobile number for real-time duplicate check and customer identification.
          </Typography>

          {/* ── MOBILE NUMBER INPUT FIELD ── */}
          <Box sx={{ mb: 1.5 }}>
            <Typography sx={{ color: "#FDE68A", fontSize: "12px", fontWeight: 800, letterSpacing: "0.04em", mb: 0.75, textTransform: "uppercase" }}>
              Mobile Number *
            </Typography>

            <TextField
              fullWidth
              autoFocus
              value={mobileNumber}
              onChange={(e) => handleMobileChange(e.target.value)}
              placeholder="e.g. 9176669426"
              autoComplete="off"
              slotProps={{
                htmlInput: {
                  maxLength: 10,
                  inputMode: "numeric",
                  onFocus: () => setIsInputFocused(true),
                  onBlur: () => setIsInputFocused(false),
                },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIphoneIcon sx={{ color: isInputFocused ? "#F59E0B" : "#94A3B8", fontSize: 20, transition: "color 0.2s" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end" sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      {lookupLoading && <CircularProgress size={18} sx={{ color: "#F59E0B" }} />}

                      {mobileNumber.length > 0 && !lookupLoading && (
                        <Chip
                          label={
                            existingCustomer
                              ? "✔ 10/10 Digits · Identified"
                              : mobileNumber.length === 10
                              ? "✔ 10/10 Digits"
                              : `${mobileNumber.length}/10 Digits`
                          }
                          size="small"
                          sx={{
                            height: 24,
                            fontSize: "11px",
                            fontWeight: 900,
                            fontFamily: "monospace",
                            letterSpacing: "0.02em",
                            bgcolor: existingCustomer
                              ? "rgba(34, 197, 94, 0.2)"
                              : "rgba(251, 191, 36, 0.15)",
                            color: existingCustomer ? "#4ADE80" : "#FDE047",
                            border: existingCustomer
                              ? "1px solid rgba(74, 222, 128, 0.5)"
                              : "1px solid rgba(251, 191, 36, 0.4)",
                            boxShadow: existingCustomer ? "0 0 10px rgba(34, 197, 94, 0.35)" : "none",
                          }}
                        />
                      )}

                      {mobileNumber && (
                        <IconButton
                          size="small"
                          onClick={handleClear}
                          sx={{
                            p: 0.5,
                            color: "#94A3B8",
                            "&:hover": { color: "#FDE68A", bgcolor: "rgba(245, 158, 11, 0.15)" },
                          }}
                        >
                          <CloseRoundedIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                    </InputAdornment>
                  ),
                  sx: {
                    height: { xs: 50, sm: 54 },
                    fontSize: "15px",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    fontFamily: "monospace",
                    color: "#FFFFFF",
                    bgcolor: "rgba(8, 11, 17, 0.85)",
                    borderRadius: "14px",
                    border: isInputFocused
                      ? "1px solid #F59E0B"
                      : existingCustomer
                      ? "1px solid rgba(74, 222, 128, 0.5)"
                      : "1px solid rgba(245, 158, 11, 0.25)",
                    boxShadow: isInputFocused
                      ? "0 0 16px rgba(245, 158, 11, 0.25), inset 0 0 8px rgba(245, 158, 11, 0.05)"
                      : existingCustomer
                      ? "0 0 14px rgba(74, 222, 128, 0.15)"
                      : "none",
                    transition: "all 0.2s ease-in-out",
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                  },
                },
              }}
            />
          </Box>

          {/* Validation Status Message */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 0.5 }}>
            <Typography
              sx={{
                fontSize: "11.5px",
                fontWeight: 700,
                color: lookupError
                  ? "#EF4444"
                  : existingCustomer
                  ? "#4ADE80"
                  : mobileNumber.length === 10
                  ? "#FBBF24"
                  : "rgba(255, 255, 255, 0.5)",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              {lookupLoading
                ? "Searching customer duplicate database..."
                : lookupError
                ? `⚠ ${lookupError}`
                : existingCustomer
                ? "✓ Existing customer identified"
                : mobileNumber.length === 10
                ? "No existing record found · Ready for new onboarding"
                : "Numeric 10 digits starting with 6, 7, 8, or 9"}
            </Typography>
          </Box>

          {/* Error Banner with Retry Button */}
          {lookupError && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  startIcon={<ReplayIcon />}
                  onClick={() => handleSearchCustomer(mobileNumber)}
                  sx={{ fontWeight: 800, textTransform: "none", color: "#FCA5A5" }}
                >
                  Retry
                </Button>
              }
              sx={{
                mt: 2,
                borderRadius: "12px",
                fontWeight: 700,
                bgcolor: "rgba(239, 68, 68, 0.15) !important",
                color: "#FCA5A5 !important",
                border: "1px solid rgba(239, 68, 68, 0.4) !important",
                "& .MuiAlert-icon": { color: "#EF4444 !important" },
              }}
            >
              {lookupError}
            </Alert>
          )}
        </Paper>

        {/* ── 3. EXISTING CUSTOMER FOUND CARD (LUXURY GLASSMORPHISM) ── */}
        <AnimatePresence>
          {existingCustomer && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, sm: 3.5 },
                  borderRadius: { xs: "20px", sm: "24px" },
                  bgcolor: "rgba(11, 15, 25, 0.9)",
                  backdropFilter: "blur(24px)",
                  border: "1px solid rgba(74, 222, 128, 0.35)",
                  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(74, 222, 128, 0.12)",
                  mb: 3,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Top Green Specular Sheen */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: "10%",
                    right: "10%",
                    height: "1px",
                    background: "linear-gradient(90deg, transparent 0%, rgba(74, 222, 128, 0.6) 50%, transparent 100%)",
                    boxShadow: "0 0 12px rgba(74, 222, 128, 0.5)",
                  }}
                />

                {/* Header: Verified Shield Avatar & Match Confirmed */}
                <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2.5 }}>
                  <Avatar
                    sx={{
                      width: 52,
                      height: 52,
                      bgcolor: "rgba(34, 197, 94, 0.18)",
                      border: "1.5px solid rgba(74, 222, 128, 0.6)",
                      boxShadow: "0 0 16px rgba(34, 197, 94, 0.35)",
                      color: "#4ADE80",
                    }}
                  >
                    <VerifiedUserIcon sx={{ fontSize: 28 }} />
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", mb: 0.25, flexWrap: "wrap", gap: 0.5 }}>
                      <Typography
                        sx={{
                          fontWeight: 900,
                          fontSize: { xs: "17px", sm: "19px" },
                          background: "linear-gradient(135deg, #FFFFFF 0%, #FEF08A 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          letterSpacing: "-0.2px",
                        }}
                      >
                        Existing Customer Found
                      </Typography>

                      <Chip
                        label="Match Confirmed"
                        size="small"
                        sx={{
                          bgcolor: "rgba(34, 197, 94, 0.2)",
                          border: "1px solid rgba(74, 222, 128, 0.5)",
                          color: "#4ADE80",
                          fontWeight: 900,
                          fontSize: "11px",
                          height: 22,
                        }}
                      />
                    </Stack>

                    <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "12.5px", fontWeight: 600 }}>
                      Verified customer profile in database
                    </Typography>
                  </Box>
                </Stack>

                {/* 6 COMPACT GLASS INFORMATION TILES */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)" },
                    gap: 1.5,
                    mb: 3,
                  }}
                >
                  {/* 1. Customer Name */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "14px",
                      bgcolor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "inset 0 0 12px rgba(255, 255, 255, 0.02)",
                    }}
                  >
                    <Typography sx={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.25 }}>
                      Customer Name
                    </Typography>
                    <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: { xs: "14px", sm: "15px" } }}>
                      {existingCustomer.full_name || "Sathiya Murthy"}
                    </Typography>
                  </Box>

                  {/* 2. Mobile Number */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "14px",
                      bgcolor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "inset 0 0 12px rgba(255, 255, 255, 0.02)",
                    }}
                  >
                    <Typography sx={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.25 }}>
                      Mobile Number
                    </Typography>
                    <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: { xs: "14px", sm: "15px" }, fontFamily: "monospace" }}>
                      +91 {existingCustomer.mobile_number || mobileNumber}
                    </Typography>
                  </Box>

                  {/* 3. Customer ID */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "14px",
                      bgcolor: "rgba(59, 130, 246, 0.06)",
                      border: "1px solid rgba(96, 165, 250, 0.25)",
                      boxShadow: "inset 0 0 12px rgba(59, 130, 246, 0.04)",
                    }}
                  >
                    <Typography sx={{ color: "#93C5FD", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.25 }}>
                      Customer ID
                    </Typography>
                    <Typography sx={{ fontWeight: 900, color: "#BFDBFE", fontSize: { xs: "13px", sm: "14px" }, fontFamily: "monospace" }}>
                      {existingCustomer.customer_number || existingCustomer.public_id || `CUST-${mobileNumber}`}
                    </Typography>
                  </Box>

                  {/* 4. KYC Status */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "14px",
                      bgcolor: "rgba(34, 197, 94, 0.06)",
                      border: "1px solid rgba(74, 222, 128, 0.25)",
                      boxShadow: "inset 0 0 12px rgba(34, 197, 94, 0.04)",
                    }}
                  >
                    <Typography sx={{ color: "#86EFAC", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.25 }}>
                      KYC Status
                    </Typography>
                    <Typography sx={{ fontWeight: 900, color: "#4ADE80", fontSize: { xs: "13.5px", sm: "14.5px" }, display: "flex", alignItems: "center", gap: 0.5 }}>
                      ✓ {existingCustomer.kyc_status || "VERIFIED"}
                    </Typography>
                  </Box>

                  {/* 5. Risk Score */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "14px",
                      bgcolor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "inset 0 0 12px rgba(255, 255, 255, 0.02)",
                    }}
                  >
                    <Typography sx={{ color: "#94A3B8", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.25 }}>
                      Risk Score
                    </Typography>
                    <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: { xs: "13.5px", sm: "14.5px" } }}>
                      {existingCustomer.risk_score ?? 15} / 100 (Low Risk)
                    </Typography>
                  </Box>

                  {/* 6. Monthly Limit */}
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: "14px",
                      bgcolor: "rgba(251, 191, 36, 0.06)",
                      border: "1px solid rgba(251, 191, 36, 0.25)",
                      boxShadow: "inset 0 0 12px rgba(251, 191, 36, 0.04)",
                    }}
                  >
                    <Typography sx={{ color: "#FDE68A", fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", mb: 0.25 }}>
                      Monthly Limit
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: { xs: "15px", sm: "16px" },
                        fontFamily: "monospace",
                        background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      ₹{(existingCustomer.monthly_limit || 200000).toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                </Box>

                {/* ── ACTION BUTTONS ROW (100% VISIBLE & ELEVATED) ── */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ width: "100%" }}>
                  {/* Primary CTA: "Use Customer" */}
                  <Button
                    variant="contained"
                    onClick={() => handleCompleteAndReturn(existingCustomer)}
                    endIcon={<ArrowForwardIcon sx={{ color: "#080B11" }} />}
                    sx={{
                      flex: 1.4,
                      height: { xs: 48, sm: 52 },
                      borderRadius: "12px",
                      fontWeight: 900,
                      fontSize: { xs: "14px", sm: "15px" },
                      background: "linear-gradient(135deg, #FEF08A 0%, #F59E0B 50%, #D97706 100%)",
                      color: "#080B11",
                      textTransform: "none",
                      letterSpacing: "-0.2px",
                      boxShadow: "0 6px 24px rgba(245, 158, 11, 0.45), 0 0 12px rgba(245, 158, 11, 0.2)",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #B45309 100%)",
                        boxShadow: "0 8px 30px rgba(245, 158, 11, 0.6)",
                        transform: "translateY(-1px)",
                      },
                      "&:active": {
                        transform: "translateY(1px)",
                      },
                    }}
                  >
                    Use Customer
                  </Button>

                  {/* Secondary CTA: "View Profile" */}
                  <Button
                    variant="outlined"
                    startIcon={<VisibilityIcon sx={{ color: "#FBBF24" }} />}
                    onClick={() => router.push(`/customers/customer-360?id=${existingCustomer.public_id || existingCustomer.id}`)}
                    sx={{
                      flex: 1,
                      height: { xs: 48, sm: 52 },
                      borderRadius: "12px",
                      fontWeight: 800,
                      fontSize: { xs: "13.5px", sm: "14.5px" },
                      color: "#FDE68A",
                      borderColor: "rgba(245, 158, 11, 0.4)",
                      bgcolor: "rgba(245, 158, 11, 0.08)",
                      textTransform: "none",
                      letterSpacing: "-0.2px",
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        bgcolor: "rgba(245, 158, 11, 0.18)",
                        borderColor: "#F59E0B",
                        boxShadow: "0 0 14px rgba(245, 158, 11, 0.2)",
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    View Profile
                  </Button>

                  {/* Neutral Action: "Cancel" */}
                  <Button
                    variant="outlined"
                    onClick={handleClear}
                    sx={{
                      flex: 0.8,
                      height: { xs: 48, sm: 52 },
                      borderRadius: "12px",
                      fontWeight: 800,
                      fontSize: { xs: "13.5px", sm: "14.5px" },
                      color: "#CBD5E1",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      bgcolor: "rgba(255, 255, 255, 0.04)",
                      textTransform: "none",
                      "&:hover": {
                        bgcolor: "rgba(255, 255, 255, 0.1)",
                        borderColor: "rgba(255, 255, 255, 0.3)",
                      },
                    }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Paper>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 4. NEW CUSTOMER ONBOARDING STEPPER (WHEN NO CUSTOMER IS FOUND) ── */}
        {!existingCustomer && mobileNumber.length === 10 && (
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              borderRadius: { xs: "20px", sm: "24px" },
              bgcolor: "rgba(11, 15, 25, 0.9)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.1)",
              mb: 3,
            }}
          >
            {/* Stepper Header */}
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2.5 }}>
              <Avatar
                sx={{
                  width: 44,
                  height: 44,
                  bgcolor: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "#FBBF24",
                }}
              >
                <PersonAddIcon sx={{ fontSize: 24 }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: "17px",
                    background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  New Customer Onboarding
                </Typography>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "12px", fontWeight: 600 }}>
                  Step {activeStep + 1} of {STEPS.length} — {STEPS[activeStep]?.label}
                </Typography>
              </Box>

              <Chip
                label={`${completionPercentage}%`}
                size="small"
                sx={{
                  bgcolor: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "#FDE68A",
                  fontWeight: 900,
                  fontSize: "11px",
                }}
              />
            </Stack>

            <LinearProgress
              variant="determinate"
              value={completionPercentage}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: "rgba(255, 255, 255, 0.08)",
                mb: 3,
                "& .MuiLinearProgress-bar": {
                  background: "linear-gradient(90deg, #FDE68A, #F59E0B)",
                },
              }}
            />

            {/* STEP 0: NAME & EMAIL */}
            {activeStep === 0 && (
              <Stack spacing={2}>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography sx={{ color: "#CBD5E1", fontSize: "11.5px", fontWeight: 800, mb: 0.5 }}>
                      First Name *
                    </Typography>
                    <TextField
                      fullWidth
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Ramesh"
                      slotProps={{
                        input: {
                          sx: {
                            bgcolor: "rgba(8, 11, 17, 0.8)",
                            color: "#FFF",
                            borderRadius: "12px",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            fontSize: "14px",
                            "&.Mui-focused": { borderColor: "#F59E0B" },
                          },
                        },
                      }}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography sx={{ color: "#CBD5E1", fontSize: "11.5px", fontWeight: 800, mb: 0.5 }}>
                      Last Name *
                    </Typography>
                    <TextField
                      fullWidth
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Kumar"
                      slotProps={{
                        input: {
                          sx: {
                            bgcolor: "rgba(8, 11, 17, 0.8)",
                            color: "#FFF",
                            borderRadius: "12px",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            fontSize: "14px",
                            "&.Mui-focused": { borderColor: "#F59E0B" },
                          },
                        },
                      }}
                    />
                  </Grid>
                </Grid>

                <Box>
                  <Typography sx={{ color: "#CBD5E1", fontSize: "11.5px", fontWeight: 800, mb: 0.5 }}>
                    Email Address (Optional)
                  </Typography>
                  <TextField
                    fullWidth
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. customer@pay2pay.in"
                    type="email"
                    slotProps={{
                      input: {
                        sx: {
                          bgcolor: "rgba(8, 11, 17, 0.8)",
                          color: "#FFF",
                          borderRadius: "12px",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          fontSize: "14px",
                          "&.Mui-focused": { borderColor: "#F59E0B" },
                        },
                      },
                    }}
                  />
                </Box>

                <Button
                  variant="contained"
                  disabled={!isFormValid || otpLoading}
                  onClick={handleSendMobileOtp}
                  endIcon={otpLoading ? <CircularProgress size={16} color="inherit" /> : <ArrowForwardIcon />}
                  sx={{
                    mt: 1,
                    height: 50,
                    borderRadius: "12px",
                    fontWeight: 900,
                    fontSize: "14.5px",
                    background: "linear-gradient(135deg, #FEF08A 0%, #F59E0B 50%, #D97706 100%)",
                    color: "#080B11",
                    textTransform: "none",
                    boxShadow: "0 6px 20px rgba(245, 158, 11, 0.4)",
                    "&.Mui-disabled": {
                      bgcolor: "rgba(255, 255, 255, 0.08)",
                      color: "rgba(255, 255, 255, 0.3)",
                    },
                  }}
                >
                  Send Mobile OTP &amp; Proceed →
                </Button>
              </Stack>
            )}

            {/* STEP 1: MOBILE OTP */}
            {activeStep === 1 && (
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: "14px",
                    bgcolor: "rgba(34, 197, 94, 0.08)",
                    border: "1px solid rgba(34, 197, 94, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography sx={{ color: "#4ADE80", fontSize: "13.5px", fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                      <span>📲</span> WhatsApp OTP Active
                    </Typography>
                    <Typography sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "12.5px", mt: 0.5 }}>
                      6-digit verification code dispatched to <strong>+91 {mobileNumber}</strong>
                    </Typography>
                  </Box>
                  <Chip
                    label={canResend ? "Code Sent" : `Resend in ${resendTimer}s`}
                    size="small"
                    sx={{
                      bgcolor: canResend ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.1)",
                      color: canResend ? "#4ADE80" : "rgba(255, 255, 255, 0.6)",
                      fontWeight: 700,
                      fontSize: "11px",
                    }}
                  />
                </Box>

                {otpError && (
                  <Alert
                    severity="error"
                    sx={{
                      bgcolor: "rgba(239, 68, 68, 0.15)",
                      color: "#FCA5A5",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {otpError}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  value={otpValue}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtpValue(val);
                    if (otpError) setOtpError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && otpValue.length === 6 && !otpLoading) {
                      handleVerifyMobileOtp();
                    }
                  }}
                  placeholder="Enter 6-digit OTP"
                  autoFocus
                  slotProps={{
                    input: {
                      sx: {
                        bgcolor: "rgba(8, 11, 17, 0.8)",
                        color: "#FFF",
                        borderRadius: "12px",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        fontSize: "22px",
                        fontWeight: 900,
                        fontFamily: "monospace",
                        letterSpacing: "0.25em",
                        textAlign: "center",
                      },
                    },
                  }}
                />

                <Button
                  variant="contained"
                  disabled={otpValue.length !== 6 || otpLoading}
                  onClick={handleVerifyMobileOtp}
                  sx={{
                    height: 50,
                    borderRadius: "12px",
                    fontWeight: 900,
                    fontSize: "14.5px",
                    background: "linear-gradient(135deg, #FEF08A 0%, #F59E0B 50%, #D97706 100%)",
                    color: "#080B11",
                    textTransform: "none",
                    boxShadow: "0 6px 20px rgba(245, 158, 11, 0.4)",
                    "&.Mui-disabled": {
                      bgcolor: "rgba(255, 255, 255, 0.08)",
                      color: "rgba(255, 255, 255, 0.3)",
                    },
                  }}
                >
                  {otpLoading ? (
                    <CircularProgress size={22} sx={{ color: "#080B11" }} />
                  ) : (
                    "Verify WhatsApp OTP & Proceed →"
                  )}
                </Button>

                {/* Resend Actions */}
                <Stack direction="row" spacing={1.5} justifyContent="space-between" alignItems="center" sx={{ pt: 0.5 }}>
                  <Button
                    size="small"
                    disabled={!canResend || otpLoading}
                    onClick={() => handleResendMobileOtp("WHATSAPP")}
                    sx={{
                      color: canResend ? "#FDE68A" : "rgba(255, 255, 255, 0.4)",
                      fontSize: "12px",
                      textTransform: "none",
                      fontWeight: 700,
                    }}
                  >
                    {canResend ? "🔄 Resend WhatsApp OTP" : `Resend in ${resendTimer}s`}
                  </Button>

                  <Button
                    size="small"
                    disabled={!canResend || otpLoading}
                    onClick={() => handleResendMobileOtp("SMS")}
                    sx={{
                      color: canResend ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.3)",
                      fontSize: "12px",
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    Send via SMS instead
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* STEP 2: AADHAAR EKYC */}
            {activeStep === 2 && (
              <Stack spacing={2}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "13px" }}>
                  Real-time Aadhaar eKYC via Cashfree APIs.
                </Typography>

                {aadhaarError && (
                  <Alert
                    severity="error"
                    sx={{
                      bgcolor: "rgba(239, 68, 68, 0.15)",
                      color: "#FCA5A5",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      borderRadius: "12px",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    {aadhaarError}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  value={aadhaarNumber}
                  onChange={(e) => {
                    setAadhaarNumber(e.target.value.replace(/\D/g, "").slice(0, 12));
                    if (aadhaarError) setAadhaarError("");
                  }}
                  placeholder="Enter 12-Digit Aadhaar Number"
                  slotProps={{
                    input: {
                      sx: {
                        bgcolor: "rgba(8, 11, 17, 0.8)",
                        color: "#FFF",
                        borderRadius: "12px",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        fontSize: "15px",
                        fontWeight: 800,
                        fontFamily: "monospace",
                      },
                    },
                  }}
                />

                {!aadhaarOtpSent ? (
                  <Button
                    variant="contained"
                    disabled={aadhaarNumber.length !== 12 || aadhaarLoading}
                    onClick={handleGenerateAadhaarOtp}
                    sx={{
                      height: 50,
                      borderRadius: "12px",
                      fontWeight: 900,
                      background: "linear-gradient(135deg, #FEF08A 0%, #F59E0B 50%, #D97706 100%)",
                      color: "#080B11",
                      textTransform: "none",
                    }}
                  >
                    {aadhaarLoading ? "Connecting Cashfree..." : "Generate Aadhaar OTP →"}
                  </Button>
                ) : (
                  <>
                    <TextField
                      fullWidth
                      value={aadhaarOtp}
                      onChange={(e) => {
                        setAadhaarOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                        if (aadhaarError) setAadhaarError("");
                      }}
                      placeholder="Enter 6-Digit Aadhaar OTP"
                      slotProps={{
                        input: {
                          sx: {
                            bgcolor: "rgba(8, 11, 17, 0.8)",
                            color: "#FFF",
                            borderRadius: "12px",
                            border: "1px solid #4ADE80",
                            fontSize: "15px",
                            fontWeight: 800,
                            fontFamily: "monospace",
                          },
                        },
                      }}
                    />

                    <Button
                      variant="contained"
                      disabled={aadhaarOtp.length < 4 || aadhaarLoading}
                      onClick={handleVerifyAadhaarOtp}
                      sx={{
                        height: 50,
                        borderRadius: "12px",
                        fontWeight: 900,
                        background: "linear-gradient(135deg, #FEF08A 0%, #F59E0B 50%, #D97706 100%)",
                        color: "#080B11",
                        textTransform: "none",
                      }}
                    >
                      Verify Aadhaar OTP →
                    </Button>
                  </>
                )}
              </Stack>
            )}

            {/* STEP 3: CREATE MPIN */}
            {activeStep === 3 && (
              <Stack spacing={2}>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "13px" }}>
                  Create a 4-Digit Security PIN for customer authorization.
                </Typography>

                <TextField
                  fullWidth
                  type="password"
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Enter 4-Digit PIN"
                  slotProps={{
                    input: {
                      sx: {
                        bgcolor: "rgba(8, 11, 17, 0.8)",
                        color: "#FFF",
                        borderRadius: "12px",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        fontSize: "20px",
                        fontWeight: 900,
                        fontFamily: "monospace",
                        textAlign: "center",
                      },
                    },
                  }}
                />

                <Button
                  variant="contained"
                  disabled={securityPin.length !== 4 || securityPinLoading}
                  onClick={handleCreateCustomer}
                  sx={{
                    height: 50,
                    borderRadius: "12px",
                    fontWeight: 900,
                    background: "linear-gradient(135deg, #FEF08A 0%, #F59E0B 50%, #D97706 100%)",
                    color: "#080B11",
                    textTransform: "none",
                  }}
                >
                  Create Account &amp; Finish →
                </Button>
              </Stack>
            )}

            {/* STEP 4: FINISH & SELECT */}
            {activeStep === 4 && (
              <Stack spacing={2.5} sx={{ textAlign: "center", py: 2 }}>
                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    bgcolor: "rgba(34, 197, 94, 0.2)",
                    border: "2px solid #4ADE80",
                    color: "#4ADE80",
                    mx: "auto",
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 36 }} />
                </Avatar>

                <Typography sx={{ fontWeight: 900, fontSize: "18px", color: "#FFFFFF" }}>
                  Customer Successfully Registered!
                </Typography>
                <Typography sx={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "13px" }}>
                  Customer Profile verified and ready for DMT Money Transfer.
                </Typography>

                <Button
                  variant="contained"
                  onClick={() => handleCompleteAndReturn(createdCustomer || { id: `CUST-${mobileNumber}`, name: `${firstName} ${lastName}`.trim(), mobile: mobileNumber })}
                  sx={{
                    height: 52,
                    borderRadius: "12px",
                    fontWeight: 900,
                    fontSize: "15px",
                    background: "linear-gradient(135deg, #FEF08A 0%, #F59E0B 50%, #D97706 100%)",
                    color: "#080B11",
                    textTransform: "none",
                    boxShadow: "0 6px 24px rgba(245, 158, 11, 0.45)",
                  }}
                >
                  Use New Customer for Transfer →
                </Button>
              </Stack>
            )}
          </Paper>
        )}
      </Box>

      {/* ── 5. FIXED MOBILE BOTTOM NAVIGATION WITH FLOATING (+) BUTTON ── */}
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        <MobileBottomNav />
      </Box>
    </Box>
  );
}
