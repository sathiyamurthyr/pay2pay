import React from "react";
import { Box, Stack, Chip, Typography } from "@mui/material";

export interface QuickAmountSelectorProps {
  amount: number;
  onSelect: (val: number) => void;
}

export const QuickAmountSelector: React.FC<QuickAmountSelectorProps> = ({ amount, onSelect }) => {
  const quickAmounts = [500, 1000, 2000, 5000, 10000, 25000, 50000, 75000, 100000];

  return (
    <Box sx={{ width: "100%" }}>
      <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 700, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1 }}>
        QUICK PRESET SELECTION
      </Typography>

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
        {quickAmounts.map((preset) => {
          const isSelected = amount === preset;
          return (
            <Chip
              key={preset}
              label={`+ ₹${preset.toLocaleString()}`}
              onClick={() => onSelect(preset)}
              sx={{
                height: 40,
                px: 2,
                borderRadius: "10px",
                fontWeight: isSelected ? 900 : 700,
                fontSize: "14px",
                bgcolor: isSelected ? "#2563EB" : "rgba(255, 255, 255, 0.05)",
                color: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.85)",
                border: isSelected ? "1.5px solid #3B82F6" : "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: isSelected ? "0 4px 16px rgba(37, 99, 235, 0.45)" : "none",
                transform: isSelected ? "scale(1.02)" : "none",
                cursor: "pointer",
                "&:hover": {
                  bgcolor: isSelected ? "#1D4ED8" : "rgba(255, 255, 255, 0.12)",
                  transform: "translateY(-2px) scale(1.02)",
                  borderColor: "#60A5FA",
                },
                "&:active": { transform: "scale(0.98)" },
                transition: "all 150ms ease",
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
};
