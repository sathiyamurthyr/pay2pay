import React from "react";
import { Box, Typography, Stack, Paper } from "@mui/material";

export interface ChargesPanelProps {
  amount: number;
  charges: number;
  totalPayable: number;
}

export const ChargesPanel: React.FC<ChargesPanelProps> = ({ amount, charges, totalPayable }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5,
      borderRadius: "16px",
      bgcolor: "#FFFFFF",
      border: "1px solid #E2E8F0",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
    }}
  >
    <Typography
      variant="caption"
      sx={{
        color: "#2563EB",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "1px",
        mb: 1.5,
        display: "block",
      }}
    >
      TRANSACTION CHARGES & PAYABLE BREAKDOWN
    </Typography>

    <Stack spacing={1}>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ color: "#475569", fontWeight: 600 }}>Transfer Amount</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#0F172A" }}>₹{amount.toLocaleString()}</Typography>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ color: "#475569", fontWeight: 600 }}>Convenience Fee & GST</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#2563EB" }}>+ ₹{charges.toLocaleString()}</Typography>
      </Stack>
      <Box sx={{ borderTop: "1px dashed #CBD5E1", pt: 1, mt: 0.5 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#0F172A" }}>Net Wallet Payable</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#2563EB" }}>₹{totalPayable.toLocaleString()}</Typography>
        </Stack>
      </Box>
    </Stack>
  </Paper>
);
