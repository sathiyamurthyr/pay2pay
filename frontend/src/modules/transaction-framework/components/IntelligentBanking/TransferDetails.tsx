import React from "react";
import { Box, Typography, Stack, Paper } from "@mui/material";

export interface TransferDetailsProps {
  amount: number;
  charges: number;
  totalPayable: number;
  walletBalance?: number;
}

export const TransferDetails: React.FC<TransferDetailsProps> = ({
  amount,
  charges,
  totalPayable,
  walletBalance = 124500,
}) => {
  const gst = Math.round(charges * 0.18);
  const fee = charges - gst;
  const commission = Math.round(amount * 0.0035);
  const walletAfter = Math.max(0, walletBalance - totalPayable);

  const items = [
    { label: "TRANSFER AMOUNT", value: `₹${amount.toLocaleString()}`, color: "#FFFFFF" },
    { label: "CONVENIENCE FEE", value: `+ ₹${fee.toLocaleString()}`, color: "#60A5FA" },
    { label: "GST (18%)", value: `+ ₹${gst.toLocaleString()}`, color: "#93C5FD" },
    { label: "RETAILER COMMISSION", value: `+ ₹${commission.toLocaleString()}`, color: "#4ADE80" },
    { label: "NET WALLET DEBIT", value: `₹${totalPayable.toLocaleString()}`, color: "#3B82F6" },
    { label: "CURRENT WALLET BAL", value: `₹${walletBalance.toLocaleString()}`, color: "#FBBF24" },
    { label: "BAL AFTER TRANSFER", value: `₹${walletAfter.toLocaleString()}`, color: "#34D399" },
    { label: "TRANSFER TIMESTAMP", value: "Today, 14:20:15 UTC", color: "rgba(255, 255, 255, 0.85)" },
    { label: "PRIMARY GATEWAY", value: "HDFC DirectSwitch", color: "#60A5FA" },
    { label: "NPCI SWITCH STATUS", value: "OPERATIONAL 🟢", color: "#4ADE80" },
    { label: "ESTIMATED ETA", value: "1.2 Seconds (IMPS)", color: "#38BDF8" },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)" },
        gap: 2,
        p: 1,
      }}
    >
      {items.map((item) => (
        <Paper
          key={item.label}
          elevation={0}
          sx={{
            p: 1.75,
            borderRadius: "12px",
            bgcolor: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "11px", fontWeight: 700, mb: 0.5 }}>
            {item.label}
          </Typography>
          <Typography sx={{ fontWeight: 800, color: item.color, fontSize: "15px" }}>
            {item.value}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
};
