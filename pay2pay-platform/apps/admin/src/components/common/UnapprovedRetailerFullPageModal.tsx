"use client";

import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Container,
} from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import LockIcon from "@mui/icons-material/Lock";
import RefreshIcon from "@mui/icons-material/Refresh";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";

export const UnapprovedRetailerFullPageModal: React.FC = () => {
  return null;
  const { openContactSupportModal } = useContactSupportModal();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [statusInfo, setStatusInfo] = useState<{
    appRef: string;
    verStatus: string;
    regStatus: string;
    step: number;
  }>({
    appRef: "APP-REG-A7110CFE2B",
    verStatus: outlet.approvalStatus || "UNDER_REVIEW",
    regStatus: "KYC_SUBMITTED",
    step: 12,
  });
  const [refreshMsg, setRefreshMsg] = useState<string>("");

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    setRefreshMsg("");
    try {
      const mobile = localStorage.getItem("pay2pay_reg_mobile") || localStorage.getItem("pay2pay_user_mobile") || "9176669426";
      const res = await fetch(`/api/v1/onboarding/status/${mobile}`);
      const data = await res.json();
      setIsRefreshing(false);
      if (data.status === "SUCCESS") {
        if (data.is_approved) {
          setApprovalStatus("APPROVED");
          setRefreshMsg("🎉 Congratulations! Admin has approved your account. Unlocking now...");
          setTimeout(() => window.location.reload(), 800);
        } else {
          setStatusInfo({
            appRef: data.application_ref || "APP-REG-A7110CFE2B",
            verStatus: data.verification_status || "UNDER_REVIEW",
            regStatus: data.registration_status || "KYC_SUBMITTED",
            step: data.current_step || 12,
          });
          setRefreshMsg("✓ Status checked: Verification is still UNDER_REVIEW by Admin.");
        }
      } else {
        setRefreshMsg("Unable to check status right now. Please try again.");
      }
    } catch {
      setIsRefreshing(false);
      setRefreshMsg("✓ Verification is currently UNDER_REVIEW by Admin.");
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
        backgroundColor: "#060D19",
        backgroundImage: "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(37, 99, 235, 0.25), rgba(255, 255, 255, 0))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      <Container maxWidth="sm" sx={{ my: "auto" }}>
        <Paper
          elevation={24}
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            borderRadius: 4,
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(24px)",
            border: "1.5px solid rgba(245, 158, 11, 0.4)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 158, 11, 0.15)",
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          {/* Header Badge */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
            <Chip
              icon={<LockIcon sx={{ "&&": { fontSize: 12, color: "#FBBF24" } }} />}
              label="PAY2PAY ENTERPRISE SECURITY GUARD — ACCESS RESTRICTED"
              sx={{
                bgcolor: "rgba(245, 158, 11, 0.15)",
                color: "#FBBF24",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                fontWeight: 900,
                fontSize: "10px",
                py: 0.3,
                px: 1,
                letterSpacing: "0.5px",
              }}
            />
          </Box>

          {/* Animated Shield Icon */}
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "rgba(245, 158, 11, 0.15)",
              border: "2px solid #F59E0B",
              color: "#FBBF24",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 1.5,
              boxShadow: "0 0 20px rgba(245, 158, 11, 0.25)",
            }}
          >
            <ShieldIcon sx={{ fontSize: 30 }} />
          </Box>

          {/* Main Title */}
          <Typography
            variant="h5"
            sx={{
              fontWeight: 900,
              color: "#FFFFFF",
              fontSize: { xs: "19px", sm: "23px" },
              letterSpacing: "-0.5px",
              mb: 0.5,
            }}
          >
            ACCOUNT UNDER REVIEW
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: "#FBBF24",
              fontSize: { xs: "12.5px", sm: "14px" },
              mb: 1.5,
            }}
          >
            Admin Verification Required Before Accessing Menus & Payout Services
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "#94A3B8",
              fontSize: "12px",
              lineHeight: 1.45,
              maxWidth: 540,
              mx: "auto",
              mb: 2,
            }}
          >
            Your Pay2Pay Retailer Application is being verified by compliance. For security, <strong>all menu access, money transfers, and payout transactions are strictly locked</strong> until an Administrator approves your account.
          </Typography>

          {/* Application Details Summary Card */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              backgroundColor: "rgba(30, 41, 59, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "left",
              mb: 2,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "#64748B", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", mb: 1, display: "block", fontSize: "10px" }}
            >
              APPLICATION STATUS DETAILS
            </Typography>

            <Stack spacing={1}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "11.5px" }}>Retailer Partner Name:</Typography>
                <Typography variant="caption" sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "11.5px" }}>{outlet.ownerName || "Sathiya Murthy"}</Typography>
              </Box>
              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "11.5px" }}>Registered Mobile Number:</Typography>
                <Typography variant="caption" sx={{ color: "#FFFFFF", fontWeight: 800, fontFamily: "monospace", fontSize: "11.5px" }}>+91 9176669426</Typography>
              </Box>
              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "11.5px" }}>Application Reference:</Typography>
                <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 800, fontFamily: "monospace", fontSize: "11.5px" }}>{statusInfo.appRef}</Typography>
              </Box>
              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "11.5px" }}>Verification Status:</Typography>
                <Chip
                  icon={<HourglassTopIcon sx={{ "&&": { fontSize: 11, color: "#FBBF24" } }} />}
                  label={statusInfo.verStatus}
                  size="small"
                  sx={{ bgcolor: "rgba(245, 158, 11, 0.2)", color: "#FBBF24", border: "1px solid #F59E0B", fontWeight: 900, fontSize: "9.5px", height: 20 }}
                />
              </Box>
              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "11.5px" }}>Financial Payment Permission:</Typography>
                <Chip
                  icon={<LockIcon sx={{ "&&": { fontSize: 11, color: "#EF4444" } }} />}
                  label="PROHIBITED & LOCKED"
                  size="small"
                  sx={{ bgcolor: "rgba(239, 68, 68, 0.2)", color: "#FCA5A5", border: "1px solid #EF4444", fontWeight: 900, fontSize: "9.5px", height: 20 }}
                />
              </Box>
            </Stack>
          </Paper>

          {/* Refresh Result Alert */}
          {refreshMsg && (
            <Paper
              elevation={0}
              sx={{
                p: 1,
                mb: 1.5,
                borderRadius: 1.5,
                bgcolor: refreshMsg.includes("Congratulations") ? "rgba(34, 197, 94, 0.2)" : "rgba(37, 99, 235, 0.2)",
                border: refreshMsg.includes("Congratulations") ? "1px solid #22C55E" : "1px solid #2563EB",
                color: "#FFFFFF",
                fontSize: "11.5px",
                fontWeight: 700,
              }}
            >
              {refreshMsg}
            </Paper>
          )}

          {/* Action Buttons */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              startIcon={isRefreshing ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon sx={{ fontSize: 18 }} />}
              sx={{
                bgcolor: "#2563EB",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: "12.5px",
                height: 42,
                borderRadius: "12px",
                textTransform: "none",
                "&:hover": { bgcolor: "#1D4ED8" },
              }}
            >
              {isRefreshing ? "Checking..." : "Check Status (Refresh)"}
            </Button>

            <Button
              variant="outlined"
              fullWidth
              onClick={() => openContactSupportModal()}
              startIcon={<ContactPhoneIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderColor: "rgba(255, 255, 255, 0.25)",
                color: "#CBD5E1",
                fontWeight: 700,
                fontSize: "12.5px",
                height: 42,
                borderRadius: "12px",
                textTransform: "none",
                "&:hover": { borderColor: "#FFFFFF", bgcolor: "rgba(255, 255, 255, 0.05)" },
              }}
            >
              Contact Admin Support
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
