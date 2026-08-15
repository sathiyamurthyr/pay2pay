"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useRetailerStore } from "@/stores/use-retailer-store";
import { useContactSupportModal } from "@/context/ContactSupportModalContext";

export const UnapprovedRetailerFullPageModal: React.FC = () => {
  const { outlet, setApprovalStatus } = useRetailerStore();
  const { openContactSupportModal } = useContactSupportModal();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string>("");

  const [accountData, setAccountData] = useState<{
    retailer_name: string;
    registered_mobile: string;
    application_reference: string;
    verification_status: string;
    approval_status: string;
    payment_permission: string;
    is_approved: boolean;
    support_phone: string;
    support_email: string;
  }>({
    retailer_name: outlet.ownerName || outlet.name || "Retailer Partner",
    registered_mobile: outlet.mobile ? (outlet.mobile.startsWith("+91") ? outlet.mobile : `+91 ${outlet.mobile}`) : "+91 --",
    application_reference: outlet.code || "APP-PENDING",
    verification_status: outlet.approvalStatus || "UNDER_REVIEW",
    approval_status: "PENDING",
    payment_permission: "PROHIBITED & LOCKED",
    is_approved: false,
    support_phone: "+91 80000 00000",
    support_email: "support@pay2pay.in"
  });

  const fetchStatus = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    setRefreshMsg("");

    try {
      const token =
        (typeof window !== "undefined" && (
          localStorage.getItem("pay2pay_access_token") ||
          localStorage.getItem("p2p_access_token") ||
          localStorage.getItem("pay2pay_auth_token")
        )) || "";

      let mobile = "";
      if (typeof window !== "undefined") {
        try {
          const uStr = localStorage.getItem("pay2pay_user_data") || localStorage.getItem("user_info");
          if (uStr) {
            const u = JSON.parse(uStr);
            mobile = u.mobile_number || u.mobile || "";
          }
        } catch {}
        if (!mobile) {
          mobile = localStorage.getItem("pay2pay_reg_mobile") || localStorage.getItem("pay2pay_user_mobile") || "";
        }
      }

      const queryParams = new URLSearchParams();
      if (mobile) queryParams.set("mobile", mobile);

      const url = `/api/v1/auth/enterprise/account-status${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, { headers });
      const json = await res.json();
      if (isManual) setIsRefreshing(false);

      if (res.ok && json.status === "SUCCESS" && json.data) {
        const d = json.data;
        setAccountData({
          retailer_name: d.retailer_name || d.store_name || "Retailer Partner",
          registered_mobile: d.registered_mobile || (mobile ? `+91 ${mobile}` : "+91 --"),
          application_reference: d.application_reference || "APP-PENDING",
          verification_status: d.verification_status || "UNDER_REVIEW",
          approval_status: d.approval_status || "PENDING",
          payment_permission: d.payment_permission || "PROHIBITED & LOCKED",
          is_approved: d.is_approved || false,
          support_phone: d.support_contact?.phone || "+91 80000 00000",
          support_email: d.support_contact?.email || "support@pay2pay.in"
        });

        if (d.is_approved) {
          setApprovalStatus("APPROVED");
          if (typeof window !== "undefined") {
            localStorage.setItem("p2p_retailer_approval_status", "APPROVED");
            localStorage.setItem("pay2pay_onboarding_status", "APPROVED");
          }
          setRefreshMsg("🎉 Congratulations! Your account has been approved by Admin. Loading workstation...");
          setTimeout(() => {
            window.location.href = "/retailer/dashboard";
          }, 1000);
        } else if (isManual) {
          setRefreshMsg(`✓ Status checked: Verification status is currently ${d.verification_status}.`);
        }
      } else if (isManual) {
        setRefreshMsg("✓ Verification is currently under review by compliance.");
      }
    } catch {
      if (isManual) {
        setIsRefreshing(false);
        setRefreshMsg("✓ Verification is currently under review by compliance.");
      }
    }
  }, [setApprovalStatus]);

  // Initial load
  useEffect(() => {
    fetchStatus(false);
  }, [fetchStatus]);

  // Periodic polling every 15 seconds to detect live admin approvals
  useEffect(() => {
    const timer = setInterval(() => {
      fetchStatus(false);
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchStatus]);

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
                <Typography variant="caption" sx={{ color: "#FFFFFF", fontWeight: 800, fontSize: "11.5px" }}>{accountData.retailer_name}</Typography>
              </Box>
              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "11.5px" }}>Registered Mobile Number:</Typography>
                <Typography variant="caption" sx={{ color: "#FFFFFF", fontWeight: 800, fontFamily: "monospace", fontSize: "11.5px" }}>{accountData.registered_mobile}</Typography>
              </Box>
              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "11.5px" }}>Application Reference:</Typography>
                <Typography variant="caption" sx={{ color: "#60A5FA", fontWeight: 800, fontFamily: "monospace", fontSize: "11.5px" }}>{accountData.application_reference}</Typography>
              </Box>
              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "11.5px" }}>Verification Status:</Typography>
                <Chip
                  icon={accountData.is_approved ? <CheckCircleIcon sx={{ "&&": { fontSize: 11, color: "#22C55E" } }} /> : <HourglassTopIcon sx={{ "&&": { fontSize: 11, color: "#FBBF24" } }} />}
                  label={accountData.verification_status}
                  size="small"
                  sx={{
                    bgcolor: accountData.is_approved ? "rgba(34, 197, 94, 0.2)" : "rgba(245, 158, 11, 0.2)",
                    color: accountData.is_approved ? "#4ADE80" : "#FBBF24",
                    border: accountData.is_approved ? "1px solid #22C55E" : "1px solid #F59E0B",
                    fontWeight: 900,
                    fontSize: "9.5px",
                    height: 20
                  }}
                />
              </Box>
              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)" }} />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontWeight: 600, fontSize: "11.5px" }}>Financial Payment Permission:</Typography>
                <Chip
                  icon={<LockIcon sx={{ "&&": { fontSize: 11, color: accountData.is_approved ? "#22C55E" : "#EF4444" } }} />}
                  label={accountData.payment_permission}
                  size="small"
                  sx={{
                    bgcolor: accountData.is_approved ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                    color: accountData.is_approved ? "#4ADE80" : "#FCA5A5",
                    border: accountData.is_approved ? "1px solid #22C55E" : "1px solid #EF4444",
                    fontWeight: 900,
                    fontSize: "9.5px",
                    height: 20
                  }}
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
              onClick={() => fetchStatus(true)}
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
              {isRefreshing ? "Checking Status..." : "Check Status (Refresh)"}
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={openContactSupportModal}
              startIcon={<ContactPhoneIcon sx={{ fontSize: 18 }} />}
              sx={{
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: "12.5px",
                height: 42,
                borderRadius: "12px",
                textTransform: "none",
                "&:hover": {
                  borderColor: "#3B82F6",
                  bgcolor: "rgba(59, 130, 246, 0.1)",
                },
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
