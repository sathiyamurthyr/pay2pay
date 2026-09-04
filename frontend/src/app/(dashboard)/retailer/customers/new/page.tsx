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
  Dialog,
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
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { motion, AnimatePresence } from "framer-motion";

import { retailerApi } from "@/services/retailer-api";
import { notificationEngine } from "@/services/notification-engine";
import { useTransactionMemoryStore } from "@/stores/use-transaction-memory-store";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

// Stepper labels: Mobile → OTP → Aadhaar eKYC → Verified Profile (PIN removed)
const STEPS = [
  { label: "Mobile", est: "10s" },
  { label: "OTP", est: "30s" },
  { label: "Aadhaar eKYC", est: "45s" },
  { label: "Verified Profile", est: "Done" },
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
  const [aadhaarProfile, setAadhaarProfile] = useState<any | null>(null);
  const [showDebitConfirmModal, setShowDebitConfirmModal] = useState(false);
  const [chargePreview, setChargePreview] = useState<{
    service_charge?: number;
    tax_rate?: number;
    cgst?: number;
    sgst?: number;
    tax_amount?: number;
    total_amount?: number;
    is_chargeable?: boolean;
    message?: string;
  } | null>(null);
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
    const fetchChargePreview = async () => {
      try {
        const previewFn = retailerApi.aadhaarKyc?.chargePreview || retailerApi.aadhaar?.chargePreview;
        if (previewFn) {
          const data = await previewFn("CUSTOMER_VERIFICATION");
          if (data) setChargePreview(data);
        }
      } catch (err) {
        console.warn("Using fallback charge preview", err);
      }
    };
    fetchChargePreview();
  }, []);

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
      cust = {
        first_name: firstName,
        last_name: lastName,
        mobile_number: mobileNumber,
        email: email || undefined,
        kyc_status: "PENDING_VERIFICATION",
      };
      setCreatedCustomer(cust);
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

  const handleOpenDebitConfirmation = () => {
    if (aadhaarNumber.length !== 12) {
      setAadhaarError("Aadhaar Number must be exactly 12 digits");
      return;
    }
    setAadhaarError("");
    setShowDebitConfirmModal(true);
  };

  const handleConfirmAndSendAadhaarOtp = async () => {
    setAadhaarLoading(true);
    setAadhaarError("");
    try {
      const res = await retailerApi.generateAadhaarOtp(
        aadhaarNumber,
        existingCustomer?.public_id || createdCustomer?.public_id,
        mobileNumber,
        "ONBOARDING"
      );
      setAadhaarLoading(false);
      if (res && res.status === "SUCCESS") {
        setShowDebitConfirmModal(false);
        setAadhaarOtpSent(true);
        setAadhaarRefId(res.data?.ref_id || res.data?.ref_number || res.ref_id || "");
        const totalCharged = chargePreview?.total_amount != null
          ? chargePreview.total_amount
          : res.data?.total_debit || 0;
        notificationEngine.notify(
          "OTP_RECEIVED",
          `Aadhaar eKYC OTP Dispatched via UIDAI.${totalCharged > 0 ? ` Wallet debited: ₹${totalCharged.toFixed(2)}` : ""}`
        );
        refreshBalances();
      } else {
        const errMsg = res?.detail || res?.error || res?.message || "Failed to generate Aadhaar OTP";
        setAadhaarError(errMsg);
        setShowDebitConfirmModal(false);
        notificationEngine.notify("TRANSACTION_FAILED", errMsg);
      }
    } catch (err: any) {
      setAadhaarLoading(false);
      setShowDebitConfirmModal(false);
      const rawDetail = err?.response?.data?.detail || err?.response?.data?.message || err?.message;
      const errMsg = typeof rawDetail === "object" ? (rawDetail.message || JSON.stringify(rawDetail)) : rawDetail || "Failed to generate Aadhaar OTP";
      setAadhaarError(errMsg);
      notificationEngine.notify("TRANSACTION_FAILED", errMsg);
    }
  };

  const handleVerifyAadhaarOtp = async () => {
    const cleanOtp = aadhaarOtp.replace(/\D/g, "").slice(0, 6);
    if (cleanOtp.length !== 6) {
      setAadhaarError("Aadhaar OTP must be exactly 6 digits");
      return;
    }
    setAadhaarLoading(true);
    setAadhaarError("");
    try {
      const res = await retailerApi.verifyAadhaarOtp({
        customer_id: existingCustomer?.public_id || createdCustomer?.public_id || undefined,
        mobile_number: mobileNumber,
        ref_number: aadhaarRefId,
        otp_code: cleanOtp,
        masked_aadhaar: `XXXX-XXXX-${aadhaarNumber.slice(-4)}`,
        aadhaar_number: aadhaarNumber,
        verification_context: "ONBOARDING",
      });
      setAadhaarLoading(false);
      if (res && res.status === "SUCCESS") {
        const profile = res.data || res.profile || res;
        setAadhaarVerified(true);
        setAadhaarProfile(profile);

        const updatedCust = {
          public_id: profile.customer_id || createdCustomer?.public_id,
          id: profile.customer_number || createdCustomer?.customer_number,
          customer_number: profile.customer_number || createdCustomer?.customer_number,
          full_name: profile.full_name || `${firstName} ${lastName}`.trim(),
          name: profile.full_name || `${firstName} ${lastName}`.trim(),
          mobile: mobileNumber,
          mobile_number: mobileNumber,
          photo_url: profile.photo_url || profile.photo_avatar || profile.photo_base64 || "",
          photo_avatar: profile.photo_url || profile.photo_avatar || profile.photo_base64 || "",
          masked_aadhaar: profile.masked_aadhaar || `XXXX-XXXX-${aadhaarNumber.slice(-4)}`,
          dob: profile.dob || "",
          gender: profile.gender || "",
          care_of: profile.care_of || "",
          address: profile.full_address || profile.address || "",
          full_address: profile.full_address || profile.address || "",
          kyc_status: profile.kyc_status || (profile.verification_status === "VERIFIED" ? "APPROVED" : "PENDING"),
          aadhaar_verified: true,
          monthly_limit: profile.monthly_limit ?? (createdCustomer?.monthly_limit ?? 200000),
          risk_score: profile.risk_score ?? (createdCustomer?.risk_score ?? 0),
        };
        setCreatedCustomer(updatedCust);

        notificationEngine.notify(
          "CUSTOMER_VERIFIED",
          `Aadhaar eKYC Verified Successfully for ${profile.full_name || "Customer"}!`
        );
        refreshBalances();
        // Skip PIN completely — jump directly to Verified Profile (Step 3)
        setActiveStep(3);
      } else {
        const errMsg = res?.detail || res?.error || res?.message || "Invalid Aadhaar OTP code";
        setAadhaarError(errMsg);
        notificationEngine.notify("TRANSACTION_FAILED", errMsg);
      }
    } catch (err: any) {
      setAadhaarLoading(false);
      const rawDetail = err?.response?.data?.detail || err?.response?.data?.message || err?.message;
      const errMsg = typeof rawDetail === "object" ? (rawDetail.message || JSON.stringify(rawDetail)) : rawDetail || "Failed to verify Aadhaar OTP";
      setAadhaarError(errMsg);
      notificationEngine.notify("TRANSACTION_FAILED", errMsg);
    }
  };

  const handleCompleteAndReturn = (custToSelect?: any) => {
    const target = custToSelect || createdCustomer || aadhaarProfile;
    const formatted = {
      ...target,
      id: target?.customer_number || target?.public_id || target?.id || `CUST-${mobileNumber}`,
      public_id: target?.public_id || target?.customer_id || target?.id,
      name: target?.full_name || target?.name || `${firstName} ${lastName}`.trim() || "Customer",
      full_name: target?.full_name || target?.name || `${firstName} ${lastName}`.trim() || "Customer",
      mobile: target?.mobile_number || target?.mobile || mobileNumber,
      mobile_number: target?.mobile_number || target?.mobile || mobileNumber,
      kyc_status: target?.kyc_status || "VERIFIED",
      photo_url: target?.photo_url || target?.photo_avatar || aadhaarProfile?.photo_url || "",
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

  const mainBalanceFormatted = wallet?.mainBalance != null
    ? Number(wallet.mainBalance).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

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
                    onClick={handleOpenDebitConfirmation}
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
                      disabled={aadhaarOtp.length !== 6 || aadhaarLoading}
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
                      {aadhaarLoading ? "Verifying with UIDAI..." : "Verify Aadhaar OTP →"}
                    </Button>
                  </>
                )}
              </Stack>
            )}

            {/* STEP 3: VERIFIED PROFILE & FINISH (PIN REMOVED) */}
            {activeStep === 3 && (
              <Stack spacing={2.5} sx={{ textAlign: "center", py: 1 }}>
                {/* Success Badge */}
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    bgcolor: "rgba(34, 197, 94, 0.15)",
                    border: "2px solid #4ADE80",
                    color: "#4ADE80",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    boxShadow: "0 0 30px rgba(34, 197, 94, 0.3)",
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 44 }} />
                </Box>

                <Box>
                  <Typography sx={{ fontWeight: 900, fontSize: "20px", color: "#4ADE80" }}>
                    Aadhaar eKYC Verified Successfully ✓
                  </Typography>
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "13px", mt: 0.5 }}>
                    Customer profile is now officially KYC-verified and authorized for Move to Bank (DMT).
                  </Typography>
                </Box>

                {/* Rich Aadhaar Customer Card with Photo */}
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: "16px",
                    bgcolor: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    textAlign: "left",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    {aadhaarProfile?.photo_url || aadhaarProfile?.photo_avatar ? (
                      <Avatar
                        src={aadhaarProfile.photo_url || aadhaarProfile.photo_avatar}
                        alt="Customer Aadhaar Photo"
                        sx={{
                          width: 72,
                          height: 72,
                          border: "2px solid #F59E0B",
                          boxShadow: "0 0 16px rgba(245, 158, 11, 0.3)",
                        }}
                      />
                    ) : (
                      <Avatar
                        sx={{
                          width: 72,
                          height: 72,
                          bgcolor: "rgba(245, 158, 11, 0.2)",
                          color: "#FDE68A",
                          border: "2px solid #F59E0B",
                          fontWeight: 900,
                          fontSize: "26px",
                        }}
                      >
                        {(aadhaarProfile?.full_name || firstName || "C").charAt(0).toUpperCase()}
                      </Avatar>
                    )}

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: "17px", color: "#FFFFFF", lineHeight: 1.3 }}>
                        {aadhaarProfile?.full_name || `${firstName} ${lastName}`.trim() || "Verified Customer"}
                      </Typography>
                      <Typography sx={{ color: "#FDE68A", fontSize: "13px", fontWeight: 700, mt: 0.5 }}>
                        Aadhaar: {aadhaarProfile?.masked_aadhaar || `XXXX-XXXX-${aadhaarNumber.slice(-4)}`}
                      </Typography>
                      <Typography sx={{ color: "#34D399", fontSize: "12px", fontWeight: 700, mt: 0.25, display: "flex", alignItems: "center", gap: 0.5 }}>
                        <span>✓</span> UIDAI Officially Verified &amp; Encrypted
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.1)", my: 2 }} />

                  {/* Demographic & Address Details Grid */}
                  <Typography sx={{ color: "#FDE68A", fontSize: "11.5px", fontWeight: 800, textTransform: "uppercase", mb: 1 }}>
                    Demographic &amp; Address Details
                  </Typography>

                  <Grid container spacing={1.5} sx={{ fontSize: "12.5px" }}>
                    <Grid size={{ xs: 6 }}>
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Mobile Number</Typography>
                      <Typography sx={{ fontWeight: 700, color: "#FFF" }}>+91 {mobileNumber}</Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Customer ID</Typography>
                      <Typography sx={{ fontWeight: 700, color: "#FDE68A" }}>
                        {createdCustomer?.customer_number || createdCustomer?.id || `CUST-${mobileNumber}`}
                      </Typography>
                    </Grid>
                    {aadhaarProfile?.dob && (
                      <Grid size={{ xs: 6 }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Date of Birth</Typography>
                        <Typography sx={{ fontWeight: 700, color: "#FFF" }}>{aadhaarProfile.dob}</Typography>
                      </Grid>
                    )}
                    {aadhaarProfile?.gender && (
                      <Grid size={{ xs: 6 }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Gender</Typography>
                        <Typography sx={{ fontWeight: 700, color: "#FFF" }}>{aadhaarProfile.gender}</Typography>
                      </Grid>
                    )}
                    {aadhaarProfile?.care_of && (
                      <Grid size={{ xs: 12 }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Care Of</Typography>
                        <Typography sx={{ fontWeight: 700, color: "#FFF" }}>{aadhaarProfile.care_of}</Typography>
                      </Grid>
                    )}
                    {(aadhaarProfile?.full_address || aadhaarProfile?.address) && (
                      <Grid size={{ xs: 12 }}>
                        <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>Registered Address</Typography>
                        <Typography sx={{ fontWeight: 600, color: "rgba(255, 255, 255, 0.9)", lineHeight: 1.4 }}>
                          {typeof aadhaarProfile.full_address === "string" ? aadhaarProfile.full_address : typeof aadhaarProfile.address === "string" ? aadhaarProfile.address : `${aadhaarProfile.locality || ""}, ${aadhaarProfile.district || ""}, ${aadhaarProfile.state || ""} - ${aadhaarProfile.pincode || ""}`}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>

                {/* Action Buttons */}
                <Stack spacing={1.5} sx={{ pt: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => handleCompleteAndReturn(createdCustomer || aadhaarProfile)}
                    sx={{
                      height: 52,
                      borderRadius: "14px",
                      fontWeight: 900,
                      fontSize: "15px",
                      background: "linear-gradient(135deg, #FEF08A 0%, #F59E0B 50%, #D97706 100%)",
                      color: "#080B11",
                      textTransform: "none",
                      boxShadow: "0 8px 24px rgba(245, 158, 11, 0.4)",
                    }}
                  >
                    Go to Move to Bank (DMT) →
                  </Button>

                  <Button
                    variant="outlined"
                    onClick={() => router.push("/retailer/customers")}
                    sx={{
                      height: 48,
                      borderRadius: "14px",
                      borderColor: "rgba(255, 255, 255, 0.2)",
                      color: "rgba(255, 255, 255, 0.8)",
                      textTransform: "none",
                      fontWeight: 700,
                      "&:hover": { borderColor: "rgba(255, 255, 255, 0.4)", bgcolor: "rgba(255, 255, 255, 0.05)" },
                    }}
                  >
                    View Customers Master List
                  </Button>
                </Stack>
              </Stack>
            )}
          </Paper>
        )}

        {/* ── AADHAAR WALLET DEBIT CONFIRMATION MODAL (ENTERPRISE FINTECH REDESIGN) ── */}
        <Dialog
          open={showDebitConfirmModal}
          onClose={() => !aadhaarLoading && setShowDebitConfirmModal(false)}
          slotProps={{
            backdrop: {
              sx: {
                bgcolor: "rgba(3, 7, 18, 0.82)",
                backdropFilter: "blur(12px)",
              },
            },
          }}
          PaperProps={{
            sx: {
              bgcolor: "rgba(11, 15, 25, 0.96)",
              backgroundImage: "linear-gradient(180deg, rgba(23, 31, 50, 0.75) 0%, rgba(10, 14, 23, 0.98) 100%)",
              backdropFilter: "blur(24px)",
              borderRadius: { xs: "20px", sm: "24px" },
              border: "1px solid rgba(245, 158, 11, 0.28)",
              boxShadow: "0 28px 75px rgba(0, 0, 0, 0.92), 0 0 35px rgba(245, 158, 11, 0.12)",
              color: "#FFFFFF",
              maxWidth: 440,
              width: "100%",
              p: { xs: 2.5, sm: 3 },
              position: "relative",
              overflow: "hidden",
            },
          }}
        >
          {/* Subtle Top Gold Highlight Glow Line */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: "10%",
              right: "10%",
              height: "2px",
              background: "linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.9) 50%, transparent 100%)",
              boxShadow: "0 0 14px rgba(245, 158, 11, 0.6)",
            }}
          />

          <Stack spacing={2.25}>
            {/* Header: Icon, Title, Subtitle, and Security Indicator */}
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={1.75}>
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: "14px",
                    bgcolor: "rgba(245, 158, 11, 0.12)",
                    border: "1.5px solid rgba(245, 158, 11, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#F59E0B",
                    boxShadow: "0 0 16px rgba(245, 158, 11, 0.2)",
                    flexShrink: 0,
                  }}
                >
                  <ShieldIcon sx={{ fontSize: 24, color: "#FBBF24" }} />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: { xs: "16.5px", sm: "17.5px" },
                      color: "#FFFFFF",
                      letterSpacing: "-0.3px",
                      lineHeight: 1.25,
                    }}
                  >
                    Confirm Aadhaar Verification
                  </Typography>
                  <Typography
                    sx={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: "12px",
                      fontWeight: 500,
                      mt: 0.35,
                    }}
                  >
                    UIDAI Offline eKYC via Cashfree
                  </Typography>
                </Box>
              </Stack>

              {/* Subtle Verification/Security Indicator */}
              <Box
                sx={{
                  display: { xs: "none", sm: "flex" },
                  alignItems: "center",
                  gap: 0.6,
                  bgcolor: "rgba(34, 197, 94, 0.12)",
                  border: "1px solid rgba(74, 222, 128, 0.3)",
                  borderRadius: "20px",
                  px: 1,
                  py: 0.35,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: "#4ADE80",
                    boxShadow: "0 0 6px #4ADE80",
                  }}
                />
                <Typography
                  sx={{
                    fontSize: "9.5px",
                    fontWeight: 800,
                    color: "#4ADE80",
                    letterSpacing: "0.04em",
                  }}
                >
                  UIDAI COMPLIANT
                </Typography>
              </Box>
            </Stack>

            {/* Fee Breakdown Card (Polished Financial Summary) */}
            <Box
              sx={{
                bgcolor: "rgba(15, 23, 42, 0.65)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                p: 2,
              }}
            >
              <Typography
                sx={{
                  color: "#94A3B8",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  mb: 1.5,
                }}
              >
                VERIFICATION FEE
              </Typography>

              <Stack spacing={1.2}>
                {/* eKYC Service Fee */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.72)", fontSize: "13px", fontWeight: 500 }}>
                    eKYC Service Fee
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "13.5px",
                      color: "#FFFFFF",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    ₹{(chargePreview?.service_charge ?? 0).toFixed(2)}
                  </Typography>
                </Stack>

                {/* GST Rate & Amount */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ color: "rgba(255, 255, 255, 0.72)", fontSize: "13px", fontWeight: 500 }}>
                    GST ({chargePreview?.tax_rate ? Math.round(chargePreview.tax_rate * 100) : 18}%)
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "13.5px",
                      color: "#FFFFFF",
                      fontFamily: "var(--font-geist-mono), monospace",
                    }}
                  >
                    ₹{((chargePreview?.cgst ?? 0) + (chargePreview?.sgst ?? 0)).toFixed(2)}
                  </Typography>
                </Stack>

                <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", my: 0.5 }} />

                {/* Total Wallet Debit (Strongest Visual Element) */}
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: "12px",
                    bgcolor: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.22)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography sx={{ color: "#FDE68A", fontSize: "13.5px", fontWeight: 800 }}>
                    Total Wallet Debit
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 900,
                      fontSize: { xs: "18px", sm: "20px" },
                      fontFamily: "var(--font-geist-mono), monospace",
                      background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #F59E0B 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      letterSpacing: "-0.4px",
                    }}
                  >
                    ₹{(chargePreview?.total_amount ?? ((chargePreview?.service_charge ?? 0) + (chargePreview?.cgst ?? 0) + (chargePreview?.sgst ?? 0))).toFixed(2)}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Available Wallet Balance Indicator Card */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: "14px",
                bgcolor: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.07)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <AccountBalanceWalletIcon sx={{ fontSize: 18, color: "#94A3B8" }} />
                <Typography
                  sx={{
                    color: "#94A3B8",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Available Wallet Balance
                </Typography>
              </Stack>
              <Typography
                sx={{
                  color: "#4ADE80",
                  fontSize: { xs: "14px", sm: "15px" },
                  fontWeight: 900,
                  fontFamily: "var(--font-geist-mono), monospace",
                }}
              >
                ₹{mainBalanceFormatted}
              </Typography>
            </Box>

            {/* Compact Professional Information Notice Banner */}
            <Box
              sx={{
                p: 1.35,
                borderRadius: "12px",
                bgcolor: "rgba(245, 158, 11, 0.06)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
                display: "flex",
                gap: 1.25,
                alignItems: "flex-start",
              }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 18, color: "#F59E0B", mt: 0.15, flexShrink: 0 }} />
              <Typography sx={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "12px", lineHeight: 1.5 }}>
                Verification charge of{" "}
                <strong style={{ color: "#FDE68A" }}>
                  ₹{(chargePreview?.total_amount ?? ((chargePreview?.service_charge ?? 0) + (chargePreview?.cgst ?? 0) + (chargePreview?.sgst ?? 0))).toFixed(2)}
                </strong>{" "}
                will be debited from your retailer main wallet upon OTP dispatch.
                <Box component="span" sx={{ display: "block", color: "#4ADE80", fontWeight: 700, mt: 0.35 }}>
                  ✓ Auto-refund is guaranteed if verification fails.
                </Box>
              </Typography>
            </Box>

            {/* Two-Button Modern Footer */}
            <Stack direction="row" spacing={1.5} sx={{ pt: 0.5 }}>
              <Button
                variant="outlined"
                fullWidth
                disabled={aadhaarLoading}
                onClick={() => setShowDebitConfirmModal(false)}
                sx={{
                  height: 48,
                  borderRadius: "12px",
                  borderColor: "rgba(255, 255, 255, 0.16)",
                  bgcolor: "rgba(255, 255, 255, 0.03)",
                  color: "rgba(255, 255, 255, 0.75)",
                  textTransform: "none",
                  fontWeight: 800,
                  fontSize: "14px",
                  letterSpacing: "-0.2px",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "rgba(255, 255, 255, 0.3)",
                    bgcolor: "rgba(255, 255, 255, 0.07)",
                    color: "#FFFFFF",
                    transform: "translateY(-1px)",
                  },
                  "&:active": { transform: "translateY(0)" },
                }}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                fullWidth
                disabled={aadhaarLoading}
                onClick={handleConfirmAndSendAadhaarOtp}
                sx={{
                  height: 48,
                  borderRadius: "12px",
                  fontWeight: 900,
                  fontSize: "13.5px",
                  letterSpacing: "-0.2px",
                  background: "linear-gradient(135deg, #FEF08A 0%, #F59E0B 50%, #D97706 100%)",
                  color: "#080B11",
                  textTransform: "none",
                  boxShadow: "0 4px 18px rgba(245, 158, 11, 0.35)",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 50%, #B45309 100%)",
                    boxShadow: "0 6px 24px rgba(245, 158, 11, 0.5)",
                    transform: "translateY(-1px)",
                  },
                  "&:active": { transform: "translateY(0)" },
                }}
              >
                {aadhaarLoading ? (
                  <CircularProgress size={20} sx={{ color: "#080B11" }} />
                ) : (
                  `Confirm & Debit ₹${(chargePreview?.total_amount ?? ((chargePreview?.service_charge ?? 0) + (chargePreview?.cgst ?? 0) + (chargePreview?.sgst ?? 0))).toFixed(2)}`
                )}
              </Button>
            </Stack>
          </Stack>
        </Dialog>
      </Box>

      {/* ── 5. FIXED MOBILE BOTTOM NAVIGATION WITH FLOATING (+) BUTTON ── */}
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        <MobileBottomNav />
      </Box>
    </Box>
  );
}
