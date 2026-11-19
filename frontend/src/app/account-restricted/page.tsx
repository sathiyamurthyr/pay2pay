"use client";

import React from "react";
import { Box, Container, Paper, Typography, Button, Stack } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "@/lib/auth";
import { useCompanyBranding } from "@/hooks/useCompanyBranding";

export default function AccountRestrictedPage() {
  const { logout } = useAuth();
  const branding = useCompanyBranding();
  const supportEmail = branding.company_code === "SMSPAY"
    ? "support@smspay.store"
    : branding.company_code === "NEAR4YOU"
    ? "support@near4you.store"
    : "support@pay2pay.in";
  const brandPrimary = branding.primary_colour || "#2563EB";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#FFFFFF",
        backgroundImage: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3.5, sm: 4.5 },
            borderRadius: "24px",
            backgroundColor: "#FFFFFF",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            boxShadow: "0 24px 48px -12px rgba(41, 35, 41, 0.08), 0 0 40px rgba(245, 158, 11, 0.15)",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              backgroundColor: "#FFF8DC",
              border: "2px solid #EDC11E",
              color: "#EDC11E",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2.5,
            }}
          >
            <LockIcon sx={{ fontSize: 38 }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 900, color: "#292329", mb: 1 }}>
            Account Restricted / Suspended
          </Typography>
          <Typography variant="body2" sx={{ color: "#625B60", lineHeight: 1.6, mb: 3 }}>
            Your retailer workstation account has been temporarily restricted or suspended by platform operations. Financial transactions and workstation tools are disabled.
          </Typography>

          <Stack spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<ContactPhoneIcon />}
              onClick={() => {
                window.location.href = `mailto:${supportEmail}`;
              }}
              sx={{
                borderColor: "#E2E8F0",
                color: "#0F172A",
                fontWeight: 700,
                borderRadius: "12px",
                height: 44,
                textTransform: "none",
                "&:hover": { borderColor: brandPrimary, bgcolor: `${brandPrimary}10` },
              }}
            >
              Contact Support Desk ({supportEmail})
            </Button>
            <Button
              variant="contained"
              startIcon={<LogoutIcon />}
              onClick={logout}
              sx={{
                bgcolor: brandPrimary,
                color: "#FFFFFF",
                fontWeight: 800,
                borderRadius: "12px",
                height: 44,
                textTransform: "none",
                "&:hover": { opacity: 0.9 },
              }}
            >
              Logout Session
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
