import React from "react";
import { Box, Typography, Stack, Paper } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

export const OperatorIntelligence: React.FC = () => {
  const metrics = [
    { label: "TODAY'S TOTAL VOLUME", value: "₹1,24,500.00", sub: "38 Transactions Completed", color: "#FFFFFF" },
    { label: "TODAY'S NET COMMISSION", value: "+ ₹450.00", sub: "Avg ₹11.84 per Txn", color: "#4ADE80" },
    { label: "AVERAGE TICKET SIZE", value: "₹18,500.00", sub: "High Retailer Margin Range", color: "#60A5FA" },
    { label: "TOP PERFORMING BANK", value: "HDFC Bank (78%)", sub: "Zero Downtime Route", color: "#38BDF8" },
    { label: "FAVOURITE BENEFICIARY", value: "Sarah Chen (42 Txns)", sub: "99.9% Success History", color: "#FFD54F" },
    { label: "OPERATOR PEAK HOURS", value: "11:00 AM - 04:30 PM", sub: "Optimal Margin Window", color: "#93C5FD" },
    { label: "COMPLETION RATE", value: "100% Success", sub: "Zero Drops Today", color: "#4ADE80" },
  ];

  return (
    <Stack spacing={2} sx={{ p: 1 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)" }, gap: 1.5 }}>
        {metrics.map((m) => (
          <Paper key={m.label} elevation={0} sx={{ p: 1.75, borderRadius: "12px", bgcolor: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700, mb: 0.5 }}>
              {m.label}
            </Typography>
            <Typography sx={{ fontWeight: 900, color: m.color, fontSize: "16px" }}>
              {m.value}
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.60)", fontSize: "11px", mt: 0.25 }}>
              {m.sub}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
};
