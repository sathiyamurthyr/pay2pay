"use client";

import React from "react";
import { Box, Paper, Typography, Stack } from "@mui/material";
import ShieldCheckIcon from "@mui/icons-material/VerifiedUser";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TargetIcon from "@mui/icons-material/Adjust";
import ClockIcon from "@mui/icons-material/AccessTime";
import SecurityIcon from "@mui/icons-material/Security";

export function TrustPanel() {
  const BENEFITS = [
    {
      icon: ShieldCheckIcon,
      title: "RBI Compliant Verification",
      subtitle: "Instant eKYC validation ensures full regulatory compliance for money transfer.",
    },
    {
      icon: TrendingUpIcon,
      title: "Higher Transfer Caps",
      subtitle: "Verified customers enjoy up to ₹2,00,000 monthly remittance limits.",
    },
    {
      icon: TargetIcon,
      title: "Zero Fraud Risk Routing",
      subtitle: "AI risk engine checks blacklists & suspicious patterns prior to payout.",
    },
    {
      icon: ClockIcon,
      title: "Instant Beneficiary Fetch",
      subtitle: "Pre-linked bank accounts auto-load instantly upon customer identification.",
    },
  ];

  return (
    <Box
      component="aside"
      aria-label="Trust and Security Information"
      sx={{
        width: 290,
        flexShrink: 0,
        display: { xs: "none", xl: "block" },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: "18px",
          bgcolor: "#FFFFFF",
          border: "1px solid #e7e2d4",
          boxShadow: "0 4px 20px rgba(11, 19, 48, 0.04)",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, color: "#1c2340", fontSize: "16px", mb: 0.5, fontFamily: "serif" }}>
          Why verify customer?
        </Typography>
        <Typography variant="caption" sx={{ color: "#6b7290", display: "block", mb: 2.5 }}>
          Essential benefits of identification
        </Typography>

        <Stack spacing={2.5}>
          {BENEFITS.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <Stack key={idx} direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: "8px",
                    bgcolor: "#faf7f0",
                    color: "#7a1329",
                    border: "1px solid #e7e2d4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconComp sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#1c2340", fontSize: "13px", lineHeight: 1.2 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#6b7290", fontSize: "11px", lineHeight: 1.3, display: "block", mt: 0.2 }}>
                    {item.subtitle}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
        </Stack>

        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: "12px",
            bgcolor: "#eaf6ef",
            border: "1px solid #1e8e5a",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <SecurityIcon sx={{ color: "#1e8e5a", fontSize: 24 }} />
          <Typography variant="caption" sx={{ color: "#1e8e5a", fontWeight: 700, fontSize: "11px", lineHeight: 1.2 }}>
            Protected by 256-bit Bank Grade Security Switch
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
