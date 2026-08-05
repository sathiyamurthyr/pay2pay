"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Paper, Typography, Button, Stack, Alert } from "@mui/material";
import ShieldIcon from "@mui/icons-material/Shield";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function StandaloneBeneficiaryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect to Customer Directory after 2 seconds
    const timer = setTimeout(() => {
      router.replace("/retailer/customers");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Box sx={{ p: 4, maxWidth: 640, mx: "auto", mt: 6 }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 4,
          border: "1px solid #FCA5A5",
          backgroundColor: "#FEF2F2",
          textAlign: "center",
          spaceY: 3,
        }}
      >
        <Stack spacing={2.5} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: "#FEE2E2",
              color: "#DC2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldIcon sx={{ fontSize: 32 }} />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 900, color: "#991B1B" }}>
            Standalone Beneficiary Access Disabled
          </Typography>

          <Alert severity="warning" sx={{ textAlign: "left", borderRadius: 3, fontWeight: 600, fontSize: "0.85rem" }}>
            <strong>Security Governance Rule:</strong> Beneficiaries are customer-owned entities. Standing beneficiary listings are restricted. Access beneficiaries strictly by selecting a customer from the Customer Directory.
          </Alert>

          <Typography variant="body2" sx={{ color: "#7F1D1D", fontWeight: 600 }}>
            Redirecting to <strong>Customer Directory</strong> in 2 seconds...
          </Typography>

          <Button
            variant="contained"
            onClick={() => router.replace("/retailer/customers")}
            endIcon={<ArrowForwardIcon />}
            sx={{
              borderRadius: 3,
              fontWeight: 800,
              px: 4,
              py: 1.2,
              backgroundColor: "#DC2626",
              "&:hover": { backgroundColor: "#B91C1C" },
            }}
          >
            Go to Customer Directory Now
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
