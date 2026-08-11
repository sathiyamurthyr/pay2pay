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
      bgcolor: "rgba(18, 27, 48, 0.75)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.12)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.37)",
      color: "#FFFFFF",
    }}
  >
    <Typography
      variant="caption"
      sx={{
        color: "#60A5FA",
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
        <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.88)", fontWeight: 600 }}>Transfer Amount</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#FFFFFF" }}>₹{amount.toLocaleString()}</Typography>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.88)", fontWeight: 600 }}>Convenience Fee & GST</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#60A5FA" }}>+ ₹{charges.toLocaleString()}</Typography>
      </Stack>
      <Box sx={{ borderTop: "1px dashed rgba(255, 255, 255, 0.15)", pt: 1, mt: 0.5 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "#FFFFFF" }}>Net Wallet Payable</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: "#3B82F6" }}>₹{totalPayable.toLocaleString()}</Typography>
        </Stack>
      </Box>
    </Stack>
  </Paper>
);
