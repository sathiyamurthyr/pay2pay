"use client";

import React from "react";
import { Box, Container, Paper, Typography, Button, Stack } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "@/lib/auth";

export default function AccountRestrictedPage() {
  const { logout } = useAuth();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#060D19",
        backgroundImage: "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(245, 158, 11, 0.20), rgba(255, 255, 255, 0))",
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
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            boxShadow: "0 24px 48px -12px rgba(0,0,0,0.7), 0 0 40px rgba(245, 158, 11, 0.15)",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              border: "2px solid rgba(245, 158, 11, 0.4)",
              color: "#FBBF24",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2.5,
            }}
          >
            <LockIcon sx={{ fontSize: 38 }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 900, color: "#FFFFFF", mb: 1 }}>
            Account Restricted / Suspended
          </Typography>
          <Typography variant="body2" sx={{ color: "#94A3B8", lineHeight: 1.6, mb: 3 }}>
            Your retailer workstation account has been temporarily restricted or suspended by platform operations. Financial transactions and workstation tools are disabled.
          </Typography>

          <Stack spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<ContactPhoneIcon />}
              onClick={() => {
                window.location.href = "mailto:support@pay2pay.in";
              }}
              sx={{
                borderColor: "rgba(255,255,255,0.2)",
                color: "#FFFFFF",
                fontWeight: 700,
                borderRadius: "12px",
                height: 44,
                textTransform: "none",
                "&:hover": { borderColor: "#FFFFFF", bgcolor: "rgba(255,255,255,0.05)" },
              }}
            >
              Contact Support Desk (support@pay2pay.in)
            </Button>
            <Button
              variant="contained"
              startIcon={<LogoutIcon />}
              onClick={logout}
              sx={{
                bgcolor: "#D97706",
                color: "#FFFFFF",
                fontWeight: 800,
                borderRadius: "12px",
                height: 44,
                textTransform: "none",
                "&:hover": { bgcolor: "#B45309" },
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
