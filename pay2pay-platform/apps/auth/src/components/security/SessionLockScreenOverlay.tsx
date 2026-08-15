import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  Button,
  Avatar,
  IconButton,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import LogoutIcon from "@mui/icons-material/Logout";
import PeopleIcon from "@mui/icons-material/People";
import HelpIcon from "@mui/icons-material/Help";
import SecurityIcon from "@mui/icons-material/Security";
import { useSessionSecurity } from "@/context/SessionSecurityProvider";

export const SessionLockScreenOverlay: React.FC = () => {
  const { sessionState, unlockSession, securitySettings, isProcessingTx } = useSessionSecurity();

  const [mpin, setMpin] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  const isLocked = sessionState === "LOCKED";

  // Focus input automatically when locked
  useEffect(() => {
    if (isLocked) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setMpin("");
      setErrorMsg("");
    }
  }, [isLocked]);

  // Live Date & Time Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setCurrentDate(now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Screen Security & Copy Protection while locked
  useEffect(() => {
    if (!isLocked) return;

    const preventDefaultAction = (e: Event) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "p", "u", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", preventDefaultAction);
    document.addEventListener("copy", preventDefaultAction);
    document.addEventListener("cut", preventDefaultAction);
    document.addEventListener("paste", preventDefaultAction);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", preventDefaultAction);
      document.removeEventListener("copy", preventDefaultAction);
      document.removeEventListener("cut", preventDefaultAction);
      document.removeEventListener("paste", preventDefaultAction);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLocked]);

  if (!isLocked) return null;

  const handleMpinChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, "").slice(0, 4);
    setMpin(digitsOnly);
    setErrorMsg("");

    // Auto submit on 4th digit
    if (digitsOnly.length === 4) {
      triggerUnlock(digitsOnly);
    }
  };

  const triggerUnlock = async (pinToSubmit?: string) => {
    const pin = pinToSubmit || mpin;
    if (!pin || pin.length < 4) {
      setErrorMsg("Please enter your 4-digit MPIN.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    const result = await unlockSession(pin);
    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.message || "Incorrect MPIN. Please try again.");
      setMpin("");
      inputRef.current?.focus();
    }
  };

  const triggerBiometricUnlock = async () => {
    setIsLoading(true);
    setErrorMsg("");
    const result = await unlockSession(undefined, "WEBAUTHN_BIOMETRIC_OK");
    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.message || "Biometric authentication failed.");
    }
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        bgcolor: "rgba(8, 17, 31, 0.95)",
        backdropFilter: "blur(24px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        userSelect: "none",
        fontFamily: "'Inter', 'Source Sans 3', 'IBM Plex Sans', sans-serif",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 500,
          p: { xs: 3.5, md: 4.5 },
          borderRadius: 4.5,
          bgcolor: "rgba(15, 23, 42, 0.96)",
          border: "1.5px solid rgba(59, 130, 246, 0.40)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Brand Header */}
        <Stack direction="row" spacing={1.5} sx={{ justifyContent: "center", alignItems: "center", mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontWeight: 900,
              fontSize: "18px",
            }}
          >
            P2P
          </Box>
          <Box sx={{ textAlign: "left" }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "18px", lineHeight: 1.1 }}>
              Pay2Pay FinTech Solutions
            </Typography>
            <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 700, fontSize: "12px" }}>
              ENTERPRISE BANKING WORKSPACE
            </Typography>
          </Box>
        </Stack>

        {/* Retailer Profile Card */}
        <Box
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 3.5,
            bgcolor: "rgba(30, 41, 59, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            display: "flex",
            alignItems: "center",
            gap: 2.5,
            textAlign: "left",
          }}
        >
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: "#2563EB",
              fontSize: "20px",
              fontWeight: 800,
              boxShadow: "0 0 16px rgba(37, 99, 235, 0.5)",
            }}
          >
            {typeof window !== "undefined" && (localStorage.getItem("pay2pay_reg_name") || localStorage.getItem("pay2pay_user_name") || "Partner").split(" ").map(n => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px", lineHeight: 1.2 }}>
              {typeof window !== "undefined" && (localStorage.getItem("pay2pay_reg_name") || localStorage.getItem("pay2pay_user_name") || "Retailer Partner")}
            </Typography>
            <Typography variant="body1" sx={{ color: "#94A3B8", fontSize: "14px", mt: 0.2 }}>
              {typeof window !== "undefined" && (localStorage.getItem("pay2pay_reg_shop") || "Verified Business")}
            </Typography>
          </Box>
        </Box>

        {/* Live Date & Clock */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h2" sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "36px", letterSpacing: "-0.02em" }}>
            {currentTime}
          </Typography>
          <Typography variant="body1" sx={{ color: "#60A5FA", fontSize: "15px", fontWeight: 600, mt: 0.3 }}>
            {currentDate}
          </Typography>
        </Box>

        <Alert
          icon={<SecurityIcon sx={{ color: "#60A5FA" }} />}
          severity="info"
          sx={{
            mb: 3,
            bgcolor: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            color: "#F8FAFC",
            fontSize: "15px",
            textAlign: "left",
            borderRadius: 3,
          }}
        >
          <strong>Session Locked:</strong> For your security, this workspace was locked due to inactivity. Enter your 4-digit MPIN to resume.
        </Alert>

        {/* Background Transaction Alert */}
        {isProcessingTx && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              bgcolor: "rgba(245, 158, 11, 0.15)",
              border: "1px solid #F59E0B",
              color: "#FBBF24",
              fontSize: "15px",
              textAlign: "left",
              borderRadius: 3,
            }}
          >
            ⚙️ <strong>Payout Processing:</strong> Your money transfer is executing securely in the background. Unlock to view status.
          </Alert>
        )}

        {/* Error Message */}
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3, fontSize: "15px", fontWeight: 600 }}>
            {errorMsg}
          </Alert>
        )}

        {/* MPIN Input */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" sx={{ color: "#E2E8F0", fontSize: "16px", fontWeight: 700, mb: 1, textAlign: "left" }}>
            Enter 4-Digit Security MPIN
          </Typography>
          <TextField
            inputRef={inputRef}
            type="password"
            fullWidth
            value={mpin}
            onChange={(e) => handleMpinChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") triggerUnlock();
            }}
            placeholder="••••"
            disabled={isLoading}
            slotProps={{
              htmlInput: { maxLength: 4, style: { textAlign: "center", fontSize: "28px", letterSpacing: "14px", fontWeight: 900 } },
              input: {
                startAdornment: <VpnKeyIcon sx={{ color: "#60A5FA", mr: 1, fontSize: 24 }} />,
                sx: {
                  height: 58,
                  borderRadius: "12px",
                  bgcolor: "rgba(255, 255, 255, 0.08)",
                  color: "#FFFFFF",
                  "& fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
                  "&:hover fieldset": { borderColor: "#3B82F6" },
                  "&.Mui-focused fieldset": { borderColor: "#2563EB", borderWidth: "2px" },
                },
              },
            }}
          />
        </Box>

        {/* Action Buttons */}
        <Stack spacing={2}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => triggerUnlock()}
            disabled={isLoading || mpin.length < 4}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LockIcon />}
            sx={{
              height: 52,
              borderRadius: "12px",
              fontWeight: 800,
              fontSize: "17px",
              bgcolor: "#2563EB",
              boxShadow: "0 10px 24px rgba(37, 99, 235, 0.4)",
              "&:hover": { bgcolor: "#1D4ED8" },
            }}
          >
            {isLoading ? "Verifying MPIN..." : "Unlock Workspace"}
          </Button>

          {securitySettings.biometric_enabled && (
            <Button
              fullWidth
              variant="outlined"
              onClick={triggerBiometricUnlock}
              disabled={isLoading}
              startIcon={<FingerprintIcon sx={{ fontSize: 24 }} />}
              sx={{
                height: 52,
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "17px",
                color: "#60A5FA",
                borderColor: "rgba(59, 130, 246, 0.5)",
                bgcolor: "rgba(59, 130, 246, 0.08)",
                "&:hover": { borderColor: "#3B82F6", bgcolor: "rgba(59, 130, 246, 0.16)" },
              }}
            >
              Unlock with Touch ID / Windows Hello
            </Button>
          )}
        </Stack>

        <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.14)" }} />

        {/* Bottom Utility Links */}
        <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between" }}>
          <Button
            size="small"
            startIcon={<LogoutIcon />}
            onClick={() => (window.location.href = "/login")}
            sx={{ color: "#94A3B8", fontSize: "14px", fontWeight: 600 }}
          >
            Full Logout
          </Button>
          <Button
            size="small"
            startIcon={<PeopleIcon />}
            onClick={() => (window.location.href = "/login")}
            sx={{ color: "#94A3B8", fontSize: "14px", fontWeight: 600 }}
          >
            Switch User
          </Button>
          <Button
            size="small"
            startIcon={<HelpIcon />}
            onClick={() => alert("Please contact your Company Admin or Call Support to reset your MPIN.")}
            sx={{ color: "#94A3B8", fontSize: "14px", fontWeight: 600 }}
          >
            Forgot MPIN?
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};
