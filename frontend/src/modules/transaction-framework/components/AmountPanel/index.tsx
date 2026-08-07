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
        color: "#2563EB",
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
              color: "#0F172A",
              borderRadius: "12px",
              bgcolor: "#F8FAFC",
              "& fieldset": { borderColor: "#CBD5E1" },
              "&:hover fieldset": { borderColor: "#2563EB" },
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
              bgcolor: amount === quickVal ? "#2563EB" : "#F1F5F9",
              color: amount === quickVal ? "#FFFFFF" : "#1E293B",
              border: amount === quickVal ? "1px solid #2563EB" : "1px solid #CBD5E1",
              cursor: "pointer",
              "&:hover": { bgcolor: amount === quickVal ? "#1D4ED8" : "#E2E8F0" },
            }}
          />
        ))}
      </Stack>
    </Stack>
  </GlassCard>
);
