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
        bgcolor: "#FFFFFF",
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
          bgcolor: "#FFFFFF",
          border: "1px solid #E8E2E5",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(41, 35, 41, 0.06)",
        }}
      >
        <WarningAmberIcon sx={{ fontSize: 80, color: "#EDC11E", mb: 2 }} />

        <Typography sx={{ fontWeight: 900, color: "#292329", fontSize: "36px", mb: 1 }}>
          404 — Page Not Found
        </Typography>

        <Typography sx={{ color: "#625B60", fontSize: "15px", mb: 4, lineHeight: 1.6 }}>
          The enterprise screen or resource you requested could not be located on the platform server. Please check the URL or return to the main workstation.
        </Typography>

        <Stack direction="row" spacing={2} sx={{ justifyContent: "center" }}>
          <Button
            component={Link}
            href="/retailer/dashboard"
            variant="contained"
            startIcon={<HomeIcon />}
            sx={{
              height: 48,
              px: 4,
              borderRadius: "12px",
              fontWeight: 900,
              fontSize: "15px",
              bgcolor: "#A20A3A",
              color: "#FFFFFF",
              boxShadow: "0 4px 20px rgba(162, 10, 58, 0.25)",
              textTransform: "none",
              "&:hover": {
                bgcolor: "#85072F",
              },
            }}
          >
            Go to Workstation
          </Button>

          <Button
            component={Link}
            href="/retailer/dashboard"
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            sx={{
              height: 48,
              px: 3,
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "14px",
              color: "#292329",
              borderColor: "#E8E2E5",
              textTransform: "none",
              "&:hover": {
                borderColor: "#A20A3A",
                bgcolor: "#FFF0F4",
              },
            }}
          >
            Dashboard
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
