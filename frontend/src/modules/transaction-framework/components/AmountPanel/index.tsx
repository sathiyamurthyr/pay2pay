import React from "react";
import { Box, Typography, Stack, TextField, Chip } from "@mui/material";
import { GlassCard } from "@/design-system/components";

export interface AmountPanelProps {
  amount: number;
  onAmountChange: (val: number) => void;
}

export const AmountPanel: React.FC<AmountPanelProps> = ({ amount, onAmountChange }) => (
  <GlassCard>
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
              color: "#FFFFFF",
              borderRadius: "12px",
              bgcolor: "rgba(8, 17, 31, 0.85)",
              "& fieldset": { borderColor: "rgba(255, 255, 255, 0.15)" },
              "&:hover fieldset": { borderColor: "#3B82F6" },
            },
          },
        }}
      />
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
        {[1000, 2000, 5000, 10000, 25000].map((quickVal) => (
          <Chip
            key={quickVal}
            label={`+₹${quickVal.toLocaleString()}`}
            onClick={() => onAmountChange(quickVal)}
            sx={{
              fontWeight: 800,
              bgcolor: amount === quickVal ? "#2563EB" : "rgba(255, 255, 255, 0.08)",
              color: amount === quickVal ? "#FFFFFF" : "rgba(255, 255, 255, 0.90)",
              border: amount === quickVal ? "1px solid #3B82F6" : "1px solid rgba(255, 255, 255, 0.12)",
              cursor: "pointer",
              "&:hover": { bgcolor: amount === quickVal ? "#1D4ED8" : "rgba(255, 255, 255, 0.15)" },
            }}
          />
        ))}
      </Stack>
    </Stack>
  </GlassCard>
);
