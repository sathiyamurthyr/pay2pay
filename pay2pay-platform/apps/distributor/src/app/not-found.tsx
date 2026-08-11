"use client";

import React from "react";
import Link from "next/link";
import { Box, Typography, Button, Paper, Stack } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import HomeIcon from "@mui/icons-material/Home";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function NotFound() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#08111F",
        p: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 550,
          width: "100%",
          p: 5,
          borderRadius: "24px",
          bgcolor: "rgba(18, 27, 48, 0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
        }}
      >
        <WarningAmberIcon sx={{ fontSize: 80, color: "#60A5FA", mb: 2 }} />

        <Typography sx={{ fontWeight: 900, color: "#FFFFFF", fontSize: "36px", mb: 1 }}>
          404 — Page Not Found
        </Typography>

        <Typography sx={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "15px", mb: 4, lineHeight: 1.6 }}>
          The enterprise screen or resource you requested could not be located on the platform server. Please check the URL or return to the main workstation.
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
            Go to DMT Workstation
          </Button>

          <Button
            component={Link}
            href="/dashboard"
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
            Dashboard
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
