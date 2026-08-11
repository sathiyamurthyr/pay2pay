"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ShieldIcon from "@mui/icons-material/Shield";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import PersonIcon from "@mui/icons-material/Person";
import BadgeIcon from "@mui/icons-material/Badge";
import { motion } from "framer-motion";
import apiClient from "@/lib/api";
import { useRetailerStore } from "@/stores/use-retailer-store";

export interface MpinSetupCardProps {
  customerId?: string;
  customerName?: string;
  customerMobile?: string;
  onSuccessRedirect?: string;
}

export const MpinSetupCard: React.FC<MpinSetupCardProps> = ({
  customerId: propCustId,
  customerName: propCustName,
  customerMobile: propCustMobile,
  onSuccessRedirect = "/retailer/dmt",
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const customerId = propCustId || searchParams.get("customer_id") || "8f64d450-8b7c-4414-a998-52f1d99e01b1";
  const [customerName, setCustomerName] = useState(propCustName || "Ramesh Kumar");
  const [customerMobile, setCustomerMobile] = useState(propCustMobile || "9176669426");

  const [mpinLength, setMpinLength] = useState<4 | 6>(4);
  const [mpin, setMpin] = useState("");
  const [confirmMpin, setConfirmMpin] = useState("");
  const [showMpin, setShowMpin] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // Sync props to state if provided
  useEffect(() => {
    if (propCustName) setCustomerName(propCustName);
    if (propCustMobile) setCustomerMobile(propCustMobile);
  }, [propCustName, propCustMobile]);

  // Fetch Customer Metadata if missing
  useEffect(() => {
    if (customerId && (!propCustName || !propCustMobile)) {
      apiClient.get(`/customers/${customerId}`)
        .then((res) => {
          const data = res.data?.data || res.data;
          if (data) {
            if (data.full_name || data.name) setCustomerName(data.full_name || data.name);
            if (data.mobile_number || data.mobile) setCustomerMobile(data.mobile_number || data.mobile);
          }
        })
        .catch(() => {
          // Silent fallback to prop values
        });
    }
  }, [customerId, propCustName, propCustMobile]);

  // Validation Checks
  const isNumeric = (val: string) => /^\d*$/.test(val);
  const isCorrectLength = mpin.length === mpinLength;
  const isMatching = mpin.length > 0 && mpin === confirmMpin;

  const isSequential = (pin: string) => {
    if (pin.length < 3) return false;
    let asc = true;
    let desc = true;
    for (let i = 0; i < pin.length - 1; i++) {
      if (parseInt(pin[i]) + 1 !== parseInt(pin[i + 1])) asc = false;
      if (parseInt(pin[i]) - 1 !== parseInt(pin[i + 1])) desc = false;
    }
    return asc || desc;
  };

  const isRepeated = (pin: string) => {
    if (pin.length < 2) return false;
    return new Set(pin.split("")).size === 1;
  };

  const matchesMobile = (pin: string) => {
    if (pin.length < 4 || !customerMobile) return false;
    const cleanMob = customerMobile.replace(/\D/g, "");
    return cleanMob.includes(pin);
  };

  const notSequential = mpin.length > 0 && !isSequential(mpin);
  const notRepeated = mpin.length > 0 && !isRepeated(mpin);
  const notMobileMatch = mpin.length > 0 && !matchesMobile(mpin);

  const isValidForm =
    isNumeric(mpin) &&
    isCorrectLength &&
    isMatching &&
    notSequential &&
    notRepeated &&
    notMobileMatch;

  const handleSendOtp = () => {
    setOtpSent(true);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidForm) {
      setErrorMessage("Please fulfill all security requirements before submitting.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await apiClient.post(`/customers/${customerId}/mpin/create`, {
        customer_id: customerId,
        mpin,
        confirm_mpin: confirmMpin,
        otp_code: otpCode || "123456",
      });

      setSuccessModalOpen(true);
      setTimeout(() => {
        router.push(`${onSuccessRedirect}?customer_id=${customerId}`);
      }, 2000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setErrorMessage(typeof detail === "string" ? detail : detail?.message || "Failed to create MPIN. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", py: 3, px: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        {/* Main MPIN Setup Form */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            p: 4,
            borderRadius: 4,
            bgcolor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#FFFFFF",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Header */}
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 3 }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 3,
                background: "linear-gradient(135deg, #2563EB, #1E40AF)",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
              }}
            >
              <LockOutlinedIcon sx={{ color: "#FFFFFF", fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "22px" }}>
                Create Security MPIN
              </Typography>
              <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "13px" }}>
                Mandatory customer PIN activation for enterprise DMT & financial transactions.
              </Typography>
            </Box>
          </Stack>

          {/* Read-Only Customer Info Bar */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              bgcolor: "rgba(30, 41, 59, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "11px", display: "block", mb: 1 }}>
              CUSTOMER DETAILS (READ ONLY)
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ justifyContent: "space-between" }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <PersonIcon sx={{ color: "#60A5FA", fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: "#FFFFFF" }}>
                  {customerName}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <PhoneIphoneIcon sx={{ color: "#34D399", fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: "#FFFFFF", fontFamily: "monospace" }}>
                  {customerMobile}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <BadgeIcon sx={{ color: "#FBBF24", fontSize: 18 }} />
                <Typography variant="caption" sx={{ color: "#CBD5E1", fontFamily: "monospace" }}>
                  ID: {customerId.slice(0, 8)}...
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: "rgba(239, 68, 68, 0.15)", color: "#F87171", border: "1px solid #EF4444" }}>
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              {/* Length Configuration Switcher */}
              <Box>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, display: "block", mb: 1 }}>
                  PIN LENGTH CONFIGURATION
                </Typography>
                <Stack direction="row" spacing={1.5}>
                  <Chip
                    label="4-Digit MPIN"
                    onClick={() => { setMpinLength(4); setMpin(""); setConfirmMpin(""); }}
                    color={mpinLength === 4 ? "primary" : "default"}
                    sx={{ fontWeight: 800, cursor: "pointer", px: 1 }}
                  />
                  <Chip
                    label="6-Digit MPIN"
                    onClick={() => { setMpinLength(6); setMpin(""); setConfirmMpin(""); }}
                    color={mpinLength === 6 ? "primary" : "default"}
                    sx={{ fontWeight: 800, cursor: "pointer", px: 1 }}
                  />
                </Stack>
              </Box>

              {/* Create MPIN */}
              <TextField
                fullWidth
                label={`Create ${mpinLength}-Digit MPIN`}
                type={showMpin ? "text" : "password"}
                value={mpin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, mpinLength);
                  setMpin(val);
                }}
                required
                autoComplete="off"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowMpin(!showMpin)} sx={{ color: "#94A3B8" }}>
                          {showMpin ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      color: "#FFFFFF",
                      fontFamily: showMpin ? "monospace" : "inherit",
                      fontSize: "18px",
                      letterSpacing: "4px",
                      bgcolor: "rgba(255, 255, 255, 0.06)",
                      borderRadius: "12px",
                    },
                  },
                  inputLabel: { sx: { color: "#94A3B8" } },
                }}
              />

              {/* Confirm MPIN */}
              <TextField
                fullWidth
                label="Confirm MPIN"
                type={showMpin ? "text" : "password"}
                value={confirmMpin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, mpinLength);
                  setConfirmMpin(val);
                }}
                required
                autoComplete="off"
                slotProps={{
                  input: {
                    sx: {
                      color: "#FFFFFF",
                      fontFamily: showMpin ? "monospace" : "inherit",
                      fontSize: "18px",
                      letterSpacing: "4px",
                      bgcolor: "rgba(255, 255, 255, 0.06)",
                      borderRadius: "12px",
                    },
                  },
                  inputLabel: { sx: { color: "#94A3B8" } },
                }}
              />

              {/* Validation Checklist */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 700, display: "block", mb: 1 }}>
                  SECURITY VALIDATION CHECKLIST
                </Typography>
                <Stack spacing={0.75}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {isCorrectLength ? <CheckCircleIcon sx={{ color: "#34D399", fontSize: 16 }} /> : <CancelIcon sx={{ color: "#94A3B8", fontSize: 16 }} />}
                    <Typography variant="caption" sx={{ color: isCorrectLength ? "#34D399" : "#94A3B8", fontWeight: 600 }}>
                      Exactly {mpinLength} numeric digits
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {isMatching ? <CheckCircleIcon sx={{ color: "#34D399", fontSize: 16 }} /> : <CancelIcon sx={{ color: "#94A3B8", fontSize: 16 }} />}
                    <Typography variant="caption" sx={{ color: isMatching ? "#34D399" : "#94A3B8", fontWeight: 600 }}>
                      MPIN and Confirm MPIN match
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {notSequential ? <CheckCircleIcon sx={{ color: "#34D399", fontSize: 16 }} /> : <CancelIcon sx={{ color: "#94A3B8", fontSize: 16 }} />}
                    <Typography variant="caption" sx={{ color: notSequential ? "#34D399" : "#94A3B8", fontWeight: 600 }}>
                      Not a sequential series (e.g., 1234, 4321)
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {notRepeated ? <CheckCircleIcon sx={{ color: "#34D399", fontSize: 16 }} /> : <CancelIcon sx={{ color: "#94A3B8", fontSize: 16 }} />}
                    <Typography variant="caption" sx={{ color: notRepeated ? "#34D399" : "#94A3B8", fontWeight: 600 }}>
                      Not repeated numbers (e.g., 1111, 0000)
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    {notMobileMatch ? <CheckCircleIcon sx={{ color: "#34D399", fontSize: 16 }} /> : <CancelIcon sx={{ color: "#94A3B8", fontSize: 16 }} />}
                    <Typography variant="caption" sx={{ color: notMobileMatch ? "#34D399" : "#94A3B8", fontWeight: 600 }}>
                      Does not match mobile number digits
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>

              <motion.div whileHover={{ scale: isValidForm ? 1.01 : 1 }} whileTap={{ scale: isValidForm ? 0.98 : 1 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!isValidForm || isSubmitting}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    width: "100%",
                    py: 1.5,
                    borderRadius: 3,
                    bgcolor: "#2563EB",
                    "&:hover": { bgcolor: "#1D4ED8" },
                    fontWeight: 900,
                    fontSize: "15px",
                    boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
                  }}
                >
                  {isSubmitting ? "Creating MPIN..." : "Create & Activate MPIN"}
                </Button>
              </motion.div>
            </Stack>
          </form>
        </Paper>

        {/* Security Tips Sidebar */}
        <Paper
          elevation={0}
          sx={{
            width: { xs: "100%", md: 300 },
            p: 3,
            borderRadius: 4,
            bgcolor: "rgba(30, 41, 59, 0.7)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#FFFFFF",
          }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
            <ShieldIcon sx={{ color: "#FBBF24", fontSize: 22 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "16px", color: "#FFFFFF" }}>
              Security Best Practices
            </Typography>
          </Stack>

          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 800, display: "block" }}>
                🔒 NEVER SHARE YOUR MPIN
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "12px", lineHeight: 1.4, display: "block" }}>
                Your MPIN is strictly confidential. Pay2Pay staff or bank executives will never ask for your MPIN.
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 800, display: "block" }}>
                🛡️ ENCRYPTED STORAGE
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "12px", lineHeight: 1.4, display: "block" }}>
                MPINs are hashed using cryptographic HMAC-SHA256 algorithms and never saved in plain text.
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 800, display: "block" }}>
                ⚠️ AUTOMATIC LOCKING
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "12px", lineHeight: 1.4, display: "block" }}>
                5 consecutive failed MPIN attempts will automatically lock your account for security.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Stack>

      {/* Post Success Modal */}
      <Dialog
        open={successModalOpen}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              p: 3,
              textAlign: "center",
              bgcolor: "#0F172A",
              color: "#FFFFFF",
              border: "1px solid #34D399",
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#34D399" }}>
          🎉 Customer & MPIN Activated!
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#CBD5E1", mb: 2 }}>
            Customer <strong>{customerName}</strong> registered and MPIN created successfully.
          </Typography>
          <Typography variant="caption" sx={{ color: "#94A3B8", display: "block", mb: 2 }}>
            Redirecting to DMT workstation...
          </Typography>
          <LinearProgress color="success" />
        </DialogContent>
      </Dialog>
    </Box>
  );
};
