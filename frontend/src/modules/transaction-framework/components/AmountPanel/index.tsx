import React from "react";
import { Box, Typography, Stack, TextField, Chip } from "@mui/material";
import { GlassCard } from "@/design-system/components";
import { tokens } from "@/design-system/tokens/design-tokens";

export interface AmountPanelProps {
  amount: number;
  onAmountChange: (val: number) => void;
}

export const AmountPanel: React.FC<AmountPanelProps> = ({ amount, onAmountChange }) => (
  <GlassCard>
    <Typography variant="caption" sx={{ color: tokens.colors.brand.secondary, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px", mb: 1.5, display: "block" }}>
      ENTER TRANSFER AMOUNT (₹)
    </Typography>

    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: "center" }}>
      <TextField
        fullWidth
        type="number"
        value={amount}
        onChange={(e) => onAmountChange(Number(e.target.value))}
        slotProps={{
          input: {
            sx: {
              fontSize: "24px",
              fontWeight: 900,
              color: tokens.colors.brand.primary,
              borderRadius: tokens.radii.md,
              bgcolor: tokens.colors.neutral.dark.bg,
            },
          },
        }}
      />
      <Stack direction="row" spacing={1}>
        {[1000, 2000, 5000, 10000, 25000].map((quickVal) => (
          <Chip
            key={quickVal}
            label={`+₹${quickVal.toLocaleString()}`}
            onClick={() => onAmountChange(quickVal)}
            sx={{
              fontWeight: 800,
              bgcolor: amount === quickVal ? tokens.colors.brand.primary : tokens.colors.neutral.dark.surface,
              color: amount === quickVal ? "#FFFFFF" : tokens.colors.neutral.dark.textPrimary,
              border: `1px solid ${tokens.colors.neutral.dark.border}`,
              cursor: "pointer",
            }}
          />
        ))}
      </Stack>
    </Stack>
  </GlassCard>
);
