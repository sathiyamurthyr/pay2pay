"use client";

import React from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";
import { useRouter } from "next/navigation";

export default function RetailerApplicationRejectedPage() {
  const router = useRouter();
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#08111F", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Paper sx={{ maxWidth: 480, width: "100%", p: 4, borderRadius: 3, bgcolor: "#0F172A", border: "1px solid rgba(239, 68, 68, 0.4)", textAlign: "center" }}>
        <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "rgba(239, 68, 68, 0.15)", color: "#F87171", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
          <CancelIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#FFFFFF", mb: 1 }}>Application Rejected</Typography>
        <Typography variant="body2" sx={{ color: "#94A3B8", mb: 3 }}>Your retailer registration application could not be approved due to verification discrepancy. Please re-apply with valid identity documents.</Typography>
        <Button variant="contained" onClick={() => router.push("/register")} sx={{ bgcolor: "#2563EB", fontWeight: 700 }}>Start New Application</Button>
      </Paper>
    </Box>
  );
}
