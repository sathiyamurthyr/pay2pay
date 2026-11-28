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
  const gst = Math.round(charges * 0.18);
  const fee = charges - gst;
  const commission = Math.round(amount * 0.0035);
  const walletAfterTransfer = Math.max(0, currentWalletBalance - totalPayable);

  const kpis = [
    { label: "TRANSFER AMOUNT", value: `₹${amount.toLocaleString()}`, color: "#0F172A", highlight: false },
    { label: "CONVENIENCE FEE", value: `+ ₹${fee.toLocaleString()}`, color: "var(--brand-primary, #0F3B7D)", highlight: false },
    { label: "GST (18%)", value: `+ ₹${gst.toLocaleString()}`, color: "#334155", highlight: false },
    { label: "OPERATOR COMMISSION", value: `+ ₹${commission.toLocaleString()}`, color: "#15803D", highlight: true, bg: "#F0FDF4" },
    { label: "NET WALLET DEBIT", value: `₹${totalPayable.toLocaleString()}`, color: "var(--brand-primary, #0F3B7D)", highlight: true, bg: "var(--brand-surface, #EFF6FF)" },
    { label: "WALLET AFTER TXN", value: `₹${walletAfterTransfer.toLocaleString()}`, color: "var(--brand-primary, #0F3B7D)", highlight: false },
    { label: "SETTLEMENT ETA", value: "1.2 Seconds", color: "#15803D", highlight: false },
    { label: "DAILY REMAINING", value: `₹${dailyRemaining.toLocaleString()}`, color: "var(--brand-primary, #0F3B7D)", highlight: false },
    { label: "MONTHLY REMAINING", value: `₹${monthlyRemaining.toLocaleString()}`, color: "#15803D", highlight: false },
  ];

  return (
    <Box sx={{ width: "100%" }}>
      <Typography sx={{ color: "var(--text-muted, #64748B)", fontWeight: 700, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1.5 }}>
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
              bgcolor: kpi.bg || "#FFFFFF",
              border: kpi.highlight ? "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))" : "1px solid #E2E8F0",
              boxShadow: kpi.highlight ? "0 4px 12px rgba(15, 23, 42, 0.05)" : "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              transition: "all 150ms ease",
              "&:hover": { bgcolor: "var(--brand-surface, #EFF6FF)", transform: "translateY(-2px)" },
            }}
          >
            <Typography sx={{ color: "var(--text-muted, #64748B)", fontSize: "10px", fontWeight: 800, letterSpacing: "0.05em", mb: 0.5 }}>
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
