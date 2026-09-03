import React from "react";
import { Box, Typography, Stack, Paper } from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SpeedIcon from "@mui/icons-material/Speed";

export interface TransferSummaryProps {
  amount: number;
  charges: number;
  totalPayable: number;
  currentWalletBalance?: number;
  dailyRemaining?: number;
  monthlyRemaining?: number;
}

export const TransferSummary: React.FC<TransferSummaryProps> = ({
  amount,
  charges,
  totalPayable,
  currentWalletBalance = 0,
  dailyRemaining = 0,
  monthlyRemaining = 0,
}) => {
  const gst = 0;
  const fee = charges;
  const commission = Math.round(amount * 0.0035);
  const walletAfterTransfer = Math.max(0, currentWalletBalance - totalPayable);

  const kpis = [
    { label: "TRANSFER AMOUNT", value: `₹${amount.toLocaleString()}`, color: "#FFFFFF", highlight: false },
    { label: "CONVENIENCE FEE", value: `+ ₹${fee.toLocaleString()}`, color: "#60A5FA", highlight: false },
    { label: "GST (0%)", value: `+ ₹${gst.toLocaleString()}`, color: "#93C5FD", highlight: false },
    { label: "OPERATOR COMMISSION", value: `+ ₹${commission.toLocaleString()}`, color: "#4ADE80", highlight: true, bg: "rgba(34, 197, 94, 0.12)" },
    { label: "NET WALLET DEBIT", value: `₹${totalPayable.toLocaleString()}`, color: "#3B82F6", highlight: true, bg: "rgba(37, 99, 235, 0.25)" },
    { label: "WALLET AFTER TXN", value: `₹${walletAfterTransfer.toLocaleString()}`, color: "#FBBF24", highlight: false },
    { label: "SETTLEMENT ETA", value: "1.2 Seconds", color: "#4ADE80", highlight: false },
    { label: "DAILY REMAINING", value: `₹${dailyRemaining.toLocaleString()}`, color: "#60A5FA", highlight: false },
    { label: "MONTHLY REMAINING", value: `₹${monthlyRemaining.toLocaleString()}`, color: "#34D399", highlight: false },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 700, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
        TRANSFER SUMMARY & FINANCIAL KPIS
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(5, 1fr)",
            lg: "repeat(9, 1fr)",
          },
          gap: 1.5,
        }}
      >
        {kpis.map((kpi) => (
          <Paper
            key={kpi.label}
            elevation={0}
            sx={{
              p: 1.5,
              borderRadius: "12px",
              bgcolor: kpi.bg || "rgba(255, 255, 255, 0.04)",
              backdropFilter: "blur(12px)",
              border: kpi.highlight ? "1px solid rgba(37, 99, 235, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: kpi.highlight ? "0 4px 16px rgba(37, 99, 235, 0.25)" : "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              transition: "all 150ms ease",
              "&:hover": { bgcolor: "rgba(255, 255, 255, 0.08)", transform: "translateY(-2px)" },
            }}
          >
            <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "10px", fontWeight: 800, letterSpacing: "0.05em", mb: 0.5 }}>
              {kpi.label}
            </Typography>
            <Typography sx={{ fontWeight: 900, color: kpi.color, fontSize: "15px", lineHeight: 1.2 }}>
              {kpi.value}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};
