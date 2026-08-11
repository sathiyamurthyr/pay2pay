"use client";

import React from "react";
import Link from "next/link";
import { Box, Typography, Button, Paper, Stack } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function DashboardNotFound() {
  return (
    <Box sx={{ maxWidth: 600, mx: "auto", py: 8, px: 2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 5,
          borderRadius: "24px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
        }}
      >
        <WarningAmberIcon sx={{ fontSize: 72, color: "#60A5FA", mb: 2 }} />

        <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "32px", mb: 1 }}>
          404 — Screen Not Found
        </Typography>

        <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "14px", mb: 4, lineHeight: 1.6 }}>
          The requested module path does not exist. Use the links below to return to active enterprise modules.
        </Typography>

        <Stack direction="row" spacing={2} sx={{ justifyContent: "center" }}>
          <Button
            component={Link}
            href="/dmt"
            variant="contained"
            startIcon={<HomeIcon />}
            sx={{
              height: 48,
              px: 4,
              borderRadius: "12px",
              fontWeight: 900,
              fontSize: "15px",
              bgcolor: "#2563EB",
              color: "#FFFFFF",
              boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4)",
            }}
          >
            Open DMT Workstation
          </Button>

          <Button
            component={Link}
            href="/customers/new"
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            sx={{
              height: 48,
              px: 3,
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.8)",
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            Register Customer
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
