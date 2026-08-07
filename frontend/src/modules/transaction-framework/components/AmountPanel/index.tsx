import React from "react";
import { Box, Typography, Stack, TextField, Chip, Paper } from "@mui/material";

export interface AmountPanelProps {
  amount: number;
  onAmountChange: (val: number) => void;
  charges: number;
  totalPayable: number;
}

export const AmountPanel: React.FC<AmountPanelProps> = ({ amount, onAmountChange, charges, totalPayable }) => {
  const gst = Math.round(charges * 0.18);
  const fee = charges - gst;
  const commission = Math.round(amount * 0.0035);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: "16px",
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
        width: "100%",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: "#60A5FA",
          fontWeight: 800,
          fontSize: "14px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          mb: 1.5,
          display: "block",
        }}
      >
        ENTER TRANSFER AMOUNT & CHARGES BREAKDOWN
      </Typography>

      {/* Row 1: Amount Input + Preset Chips */}
      <Stack direction={{ xs: "column", lg: "row" }} spacing={2} sx={{ alignItems: "center", mb: 2 }}>
        <TextField
          fullWidth
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(Number(e.target.value))}
          slotProps={{
            input: {
              sx: {
                height: 48,
                fontSize: "22px",
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

        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, flexShrink: 0 }}>
          {[1000, 2000, 5000, 10000, 25000].map((quickVal) => (
            <Chip
              key={quickVal}
              label={`+₹${quickVal.toLocaleString()}`}
              onClick={() => onAmountChange(quickVal)}
              sx={{
                height: 48,
                px: 1.5,
                borderRadius: "12px",
                fontWeight: 800,
                fontSize: "14px",
                bgcolor: amount === quickVal ? "#2563EB" : "rgba(255, 255, 255, 0.08)",
                color: amount === quickVal ? "#FFFFFF" : "rgba(255, 255, 255, 0.90)",
                border: amount === quickVal ? "1px solid #3B82F6" : "1px solid rgba(255, 255, 255, 0.12)",
                cursor: "pointer",
                "&:hover": { bgcolor: amount === quickVal ? "#1D4ED8" : "rgba(255, 255, 255, 0.15)" },
                "&:active": { transform: "scale(0.98)" },
                transition: "all 150ms ease",
              }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Row 2: All Aligned Charges & Net Debit Breakdown Summary Bar */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(5, 1fr)" },
          gap: 1.5,
          pt: 2,
          borderTop: "1px dashed rgba(255, 255, 255, 0.15)",
        }}
      >
        <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.04)" }}>
          <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.65)", display: "block", fontSize: "11px", fontWeight: 700 }}>
            TRANSFER AMOUNT
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "16px" }}>
            ₹{amount.toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.04)" }}>
          <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.65)", display: "block", fontSize: "11px", fontWeight: 700 }}>
            CONVENIENCE FEE
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "16px" }}>
            + ₹{fee.toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "rgba(255, 255, 255, 0.04)" }}>
          <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.65)", display: "block", fontSize: "11px", fontWeight: 700 }}>
            GST (18%)
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "16px" }}>
            + ₹{gst.toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "rgba(34, 197, 94, 0.1)" }}>
          <Typography variant="caption" sx={{ color: "#4ADE80", display: "block", fontSize: "11px", fontWeight: 700 }}>
            EST. COMMISSION
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "16px" }}>
            + ₹{commission.toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ p: 1.5, borderRadius: "10px", bgcolor: "rgba(37, 99, 235, 0.18)", border: "1px solid rgba(37, 99, 235, 0.3)" }}>
          <Typography variant="caption" sx={{ color: "#60A5FA", display: "block", fontSize: "11px", fontWeight: 800 }}>
            NET WALLET DEBIT
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "18px" }}>
            ₹{totalPayable.toLocaleString()}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};
