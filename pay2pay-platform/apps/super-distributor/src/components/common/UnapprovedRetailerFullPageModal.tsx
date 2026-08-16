"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Button,
  Chip,
  Container,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import LockIcon from "@mui/icons-material/Lock";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import LogoutIcon from "@mui/icons-material/Logout";
import StorefrontIcon from "@mui/icons-material/Storefront";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SecurityIcon from "@mui/icons-material/Security";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";
import {
  fetchAuthoritativeRetailerStatus,
  AuthoritativeAccountStatus,
} from "@/lib/retailer-destination-resolver";

export const UnapprovedRetailerFullPageModal: React.FC = () => {
  const router = useRouter();
  const { openContactSupportModal } = useContactSupportModal();

  const [statusData, setStatusData] = useState<AuthoritativeAccountStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "info" | "warning"; text: string } | null>(null);

  // Load status once on mount - always force-fresh to avoid stale cache issues
  useEffect(() => {
    let isMounted = true;
    fetchAuthoritativeRetailerStatus(true).then((data) => {
      if (!isMounted) return;
      setLoading(false);
      if (data) {
        setStatusData(data);
        if (data.is_approved || data.access === "ALLOWED") {
          router.replace("/retailer/dashboard");
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [router]);

  // Handle explicit manual refresh click
  const handleCheckStatus = async () => {
    setRefreshing(true);
    setFeedbackMsg(null);

    try {
      const data = await fetchAuthoritativeRetailerStatus(true);
      setRefreshing(false);

      if (data) {
        setStatusData(data);
        if (data.is_approved || data.access === "ALLOWED") {
          setFeedbackMsg({
            type: "success",
            text: "✓ Your account has been approved! Redirecting to dashboard...",
          });
          setTimeout(() => {
            router.replace("/retailer/dashboard");
          }, 1200);
        } else {
          setFeedbackMsg({
            type: "info",
            text: `Application Status: ${data.verification_status || data.approval_status || "UNDER REVIEW"}. Verification is in progress.`,
          });
        }
      } else {
        setFeedbackMsg({
          type: "warning",
          text: "Unable to refresh status. Please verify your connection.",
        });
      }
    } catch {
      setRefreshing(false);
      setFeedbackMsg({
        type: "warning",
        text: "Unable to reach verification service.",
      });
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pay2pay_access_token");
      localStorage.removeItem("p2p_access_token");
      localStorage.removeItem("pay2pay_auth_token");
      localStorage.removeItem("pay2pay_user_data");
      localStorage.removeItem("p2p_retailer_approval_status");
      localStorage.removeItem("pay2pay_onboarding_status");
      document.cookie = "p2p_destination=; path=/; max-age=0";
      document.cookie = "p2p_access_token=; path=/; max-age=0";
      document.cookie = "pay2pay_access_token=; path=/; max-age=0";
      window.location.href = "/retailer/login";
    }
  };

  const partnerName = statusData?.retailer_name || statusData?.store_name || statusData?.legal_name || "Retailer Partner";
  const mobile = statusData?.registered_mobile || "+91 --";
  const appRef = statusData?.application_reference || "APP-PENDING";
  const verificationStatus = statusData?.verification_status || statusData?.approval_status || "KYC_UNDER_REVIEW";
  const paymentPermission = statusData?.payment_permission || "PROHIBITED & LOCKED";

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
        p: { xs: 2, sm: 3 },
        userSelect: "none",
        overflowY: "auto",
      }}
    >
      <Container maxWidth="sm" sx={{ my: "auto" }}>
        <Paper
          elevation={24}
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(24px)",
            border: "1.5px solid rgba(59, 130, 246, 0.4)",
            boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(37, 99, 235, 0.15)",
            textAlign: "center",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Top Security Badge */}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <Chip
              icon={<ShieldIcon sx={{ "&&": { fontSize: 13, color: "#60A5FA" } }} />}
              label="PAY2PAY SECURE RETAILER WORKSTATION"
              sx={{
                bgcolor: "rgba(37, 99, 235, 0.15)",
                color: "#60A5FA",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                fontWeight: 900,
                fontSize: "10px",
                py: 0.5,
                px: 1.5,
                letterSpacing: "0.5px",
              }}
            />
          </Box>

          {/* Lock Icon */}
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "rgba(245, 158, 11, 0.15)",
              border: "2px solid #F59E0B",
              color: "#FBBF24",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
              boxShadow: "0 0 25px rgba(245, 158, 11, 0.25)",
            }}
          >
            <LockIcon sx={{ fontSize: 32 }} />
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 900,
              color: "#FFFFFF",
              fontSize: { xs: "20px", sm: "24px" },
              letterSpacing: "-0.5px",
              mb: 0.5,
            }}
          >
            Account Under Review
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "#94A3B8",
              fontSize: { xs: "12.5px", sm: "13.5px" },
              mb: 2.5,
              maxWidth: 420,
              mx: "auto",
            }}
          >
            Your retailer business account application is undergoing mandatory KYC compliance and verification before transaction access can be unlocked.
          </Typography>

          {/* Dynamic Information Grid */}
          <Box
            sx={{
              bgcolor: "rgba(30, 41, 59, 0.7)",
              borderRadius: 3,
              p: 2,
              mb: 2.5,
              border: "1px solid rgba(51, 65, 85, 0.8)",
              textAlign: "left",
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 3, gap: 1.5 }}>
                <CircularProgress size={20} sx={{ color: "#60A5FA" }} />
                <Typography sx={{ color: "#94A3B8", fontSize: "12px", fontWeight: 600 }}>
                  Retrieving your application profile...
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <StorefrontIcon sx={{ fontSize: 16, color: "#64748B" }} />
                    <Typography sx={{ color: "#94A3B8", fontSize: "11.5px", fontWeight: 600 }}>
                      Partner Name
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "#F8FAFC", fontSize: "12px", fontWeight: 700 }}>
                    {partnerName}
                  </Typography>
                </Box>

                <Divider sx={{ borderColor: "rgba(51, 65, 85, 0.5)" }} />

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PhoneIphoneIcon sx={{ fontSize: 16, color: "#64748B" }} />
                    <Typography sx={{ color: "#94A3B8", fontSize: "11.5px", fontWeight: 600 }}>
                      Registered Mobile
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "#F8FAFC", fontSize: "12px", fontWeight: 700, fontFamily: "monospace" }}>
                    {mobile}
                  </Typography>
                </Box>

                <Divider sx={{ borderColor: "rgba(51, 65, 85, 0.5)" }} />

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AssignmentIcon sx={{ fontSize: 16, color: "#64748B" }} />
                    <Typography sx={{ color: "#94A3B8", fontSize: "11.5px", fontWeight: 600 }}>
                      Application Reference
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "#60A5FA", fontSize: "11.5px", fontWeight: 800, fontFamily: "monospace" }}>
                    {appRef}
                  </Typography>
                </Box>

                <Divider sx={{ borderColor: "rgba(51, 65, 85, 0.5)" }} />

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <SecurityIcon sx={{ fontSize: 16, color: "#64748B" }} />
                    <Typography sx={{ color: "#94A3B8", fontSize: "11.5px", fontWeight: 600 }}>
                      Verification Status
                    </Typography>
                  </Box>
                  <Chip
                    label={verificationStatus}
                    size="small"
                    sx={{
                      bgcolor: "rgba(245, 158, 11, 0.15)",
                      color: "#FBBF24",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      fontWeight: 800,
                      fontSize: "10px",
                      height: 20,
                    }}
                  />
                </Box>

                <Divider sx={{ borderColor: "rgba(51, 65, 85, 0.5)" }} />

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LockIcon sx={{ fontSize: 16, color: "#EF4444" }} />
                    <Typography sx={{ color: "#94A3B8", fontSize: "11.5px", fontWeight: 600 }}>
                      Payment Permission
                    </Typography>
                  </Box>
                  <Chip
                    label={paymentPermission}
                    size="small"
                    sx={{
                      bgcolor: "rgba(239, 68, 68, 0.15)",
                      color: "#F87171",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      fontWeight: 800,
                      fontSize: "10px",
                      height: 20,
                    }}
                  />
                </Box>
              </Stack>
            )}
          </Box>

          {/* Feedback Message */}
          {feedbackMsg && (
            <Alert
              severity={feedbackMsg.type}
              sx={{
                mb: 2,
                borderRadius: 2,
                fontSize: "12px",
                fontWeight: 600,
                textAlign: "left",
                backgroundColor:
                  feedbackMsg.type === "success"
                    ? "rgba(16, 185, 129, 0.15)"
                    : feedbackMsg.type === "info"
                    ? "rgba(59, 130, 246, 0.15)"
                    : "rgba(245, 158, 11, 0.15)",
                color: "#FFFFFF",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              {feedbackMsg.text}
            </Alert>
          )}

          {/* Action Buttons */}
          <Stack spacing={1.5}>
            {/* Refresh Button */}
            <Button
              variant="contained"
              fullWidth
              disabled={refreshing || loading}
              onClick={handleCheckStatus}
              startIcon={
                refreshing ? (
                  <CircularProgress size={16} sx={{ color: "#FFFFFF" }} />
                ) : (
                  <RefreshIcon sx={{ fontSize: 18 }} />
                )
              }
              sx={{
                bgcolor: "#2563EB",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: "13px",
                height: 44,
                borderRadius: "12px",
                textTransform: "none",
                boxShadow: "0 4px 15px rgba(37, 99, 235, 0.3)",
                "&:hover": { bgcolor: "#1D4ED8" },
              }}
            >
              {refreshing ? "Checking Status..." : "Check Status (Refresh)"}
            </Button>

            {/* Secondary Action Row */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => openContactSupportModal()}
                startIcon={<ContactPhoneIcon sx={{ fontSize: 18 }} />}
                sx={{
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "12.5px",
                  height: 40,
                  borderRadius: "12px",
                  textTransform: "none",
                  "&:hover": {
                    borderColor: "#3B82F6",
                    bgcolor: "rgba(59, 130, 246, 0.1)",
                  },
                }}
              >
                Contact Support Desk
              </Button>

              <Button
                variant="outlined"
                fullWidth
                onClick={handleLogout}
                startIcon={<LogoutIcon sx={{ fontSize: 18 }} />}
                sx={{
                  borderColor: "rgba(239, 68, 68, 0.3)",
                  color: "#F87171",
                  fontWeight: 700,
                  fontSize: "12.5px",
                  height: 40,
                  borderRadius: "12px",
                  textTransform: "none",
                  "&:hover": {
                    borderColor: "#EF4444",
                    bgcolor: "rgba(239, 68, 68, 0.1)",
                  },
                }}
              >
                Sign Out
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};
