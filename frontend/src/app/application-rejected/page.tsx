"use client";

import React from "react";
import { Box, Container, Paper, Typography, Button, Stack } from "@mui/material";
import BlockIcon from "@mui/icons-material/Block";
import ContactPhoneIcon from "@mui/icons-material/ContactPhone";
import LogoutIcon from "@mui/icons-material/Logout";
import { useAuth } from "@/lib/auth";

export default function ApplicationRejectedPage() {
  const { logout } = useAuth();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#FFFFFF",
        backgroundImage: "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(220, 38, 38, 0.20), rgba(255, 255, 255, 0))",
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
            border: "1px solid rgba(220, 38, 38, 0.35)",
            boxShadow: "0 24px 48px -12px rgba(41, 35, 41, 0.08), 0 0 40px rgba(220, 38, 38, 0.15)",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              backgroundColor: "#FFF0F4",
              border: "2px solid #A20A3A",
              color: "#A20A3A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2.5,
            }}
          >
            <BlockIcon sx={{ fontSize: 38 }} />
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 900, color: "#292329", mb: 1 }}>
            Application Rejected
          </Typography>
          <Typography variant="body2" sx={{ color: "#625B60", lineHeight: 1.6, mb: 3 }}>
            Your retailer onboarding application has been reviewed and rejected by our compliance department. If you believe this was an error, please contact compliance support.
          </Typography>

          <Stack spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<ContactPhoneIcon />}
              onClick={() => {
                window.location.href = "mailto:support@near4you.store";
              }}
              sx={{
                borderColor: "#E8E2E5",
                color: "#292329",
                fontWeight: 700,
                borderRadius: "12px",
                height: 44,
                textTransform: "none",
                "&:hover": { borderColor: "#A20A3A", bgcolor: "#FFF0F4" },
              }}
            >
              Contact Compliance Desk (support@near4you.store)
            </Button>
            <Button
              variant="contained"
              startIcon={<LogoutIcon />}
              onClick={logout}
              sx={{
                bgcolor: "#A20A3A",
                color: "#FFFFFF",
                fontWeight: 800,
                borderRadius: "12px",
                height: 44,
                textTransform: "none",
                "&:hover": { bgcolor: "#85072F" },
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
