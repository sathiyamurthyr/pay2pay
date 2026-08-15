"use client";

import React from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { useRouter } from "next/navigation";

export default function RetailerAccountRestrictedPage() {
  const router = useRouter();
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#08111F", display: "flex", alignItems: "center", justifyContent: "center", p: 3 }}>
      <Paper sx={{ maxWidth: 480, width: "100%", p: 4, borderRadius: 3, bgcolor: "#0F172A", border: "1px solid rgba(239, 68, 68, 0.4)", textAlign: "center" }}>
        <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "rgba(239, 68, 68, 0.15)", color: "#F87171", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
          <LockIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "#FFFFFF", mb: 1 }}>Account Restricted / Suspended</Typography>
        <Typography variant="body2" sx={{ color: "#94A3B8", mb: 3 }}>Your retailer account has been temporarily restricted. Please contact Pay2Pay compliance support to resolve compliance issues.</Typography>
        <Button variant="contained" onClick={() => router.push("/retailer/login")} sx={{ bgcolor: "#2563EB", fontWeight: 700 }}>Back to Login</Button>
      </Paper>
    </Box>
  );
}
