import React from "react";
import { Box, Typography, Stack, Paper } from "@mui/material";
import { tokens } from "@/design-system/tokens/design-tokens";

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
      borderRadius: tokens.radii.lg,
      bgcolor: tokens.colors.neutral.dark.surface,
      border: `1px solid ${tokens.colors.neutral.dark.border}`,
    }}
  >
    <Typography variant="caption" sx={{ color: tokens.colors.brand.secondary, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", mb: 1.5, display: "block" }}>
      TRANSACTION CHARGES & PAYABLE BREAKDOWN
    </Typography>

    <Stack spacing={1}>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ color: tokens.colors.neutral.dark.textSecondary }}>Transfer Amount</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.neutral.dark.textPrimary }}>₹{amount.toLocaleString()}</Typography>
      </Stack>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="body2" sx={{ color: tokens.colors.neutral.dark.textSecondary }}>Convenience Fee & GST</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tokens.colors.brand.secondary }}>+ ₹{charges.toLocaleString()}</Typography>
      </Stack>
      <Box sx={{ borderTop: `1px dashed ${tokens.colors.neutral.dark.border}`, pt: 1, mt: 0.5 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: tokens.colors.neutral.dark.textPrimary }}>Net Wallet Payable</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: tokens.colors.brand.primary }}>₹{totalPayable.toLocaleString()}</Typography>
        </Stack>
      </Box>
    </Stack>
  </Paper>
);
