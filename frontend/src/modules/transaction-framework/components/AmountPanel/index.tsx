import React from "react";
import { Box, Typography, Stack, TextField, Chip, Paper } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

export interface AmountPanelProps {
  amount: number;
  onAmountChange: (val: number) => void;
  charges: number;
  totalPayable: number;
}

export const AmountPanel: React.FC<AmountPanelProps> = ({ amount, onAmountChange, charges = 22, totalPayable = amount + 25 }) => {
  const effectiveCharges = charges || 22;
  const gst = 3.00;
  const effectiveTotal = totalPayable || (amount + effectiveCharges + gst);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3, // 24px padding
        borderRadius: "16px",
        bgcolor: "rgba(18, 27, 48, 0.75)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
        width: "100%",
      }}
    >
      <Typography
        sx={{
          color: "#60A5FA",
          fontWeight: 600,
          fontSize: "20px", // Section Heading 20px (Weight 600)
          letterSpacing: "-0.2px",
          mb: 2,
          display: "block",
        }}
      >
        Transfer & Charges Summary
      </Typography>

      {/* Row 1: Amount Input + Preset Chips */}
      <Stack direction={{ xs: "column", lg: "row" }} spacing={3} sx={{ alignItems: "center", mb: 3 }}>
        <TextField
          fullWidth
          type="number"
          value={amount}
          onChange={(e) => onAmountChange(Number(e.target.value))}
          slotProps={{
            input: {
              sx: {
                height: 56,
                borderRadius: "12px",
                bgcolor: "rgba(255, 255, 255, 0.05)",
                color: "#FFFFFF",
                fontSize: "24px",
                fontWeight: 700,
                border: "1px solid rgba(255, 255, 255, 0.2)",
                "&:hover": { borderColor: "#3B82F6" },
                "&.Mui-focused": { borderColor: "#60A5FA", boxShadow: "0 0 12px rgba(96, 165, 250, 0.3)" },
              },
            },
          }}
        />

        {/* Preset Chips */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
          {[1000, 2000, 5000, 10000, 25000].map((quickVal) => (
            <Chip
              key={quickVal}
              label={`₹${quickVal.toLocaleString()}`}
              onClick={() => onAmountChange(quickVal)}
              sx={{
                bgcolor: amount === quickVal ? "#2563EB" : "rgba(255, 255, 255, 0.08)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "14px",
                borderRadius: "8px",
                cursor: "pointer",
                "&:hover": { bgcolor: amount === quickVal ? "#1D4ED8" : "rgba(255, 255, 255, 0.15)", transform: "translateY(-2px)" },
                "&:active": { transform: "scale(0.98)" },
                transition: "all 150ms ease",
              }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Row 2: Aligned Charges Breakdown Bar */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 2,
          pt: 2.5,
          borderTop: "1px dashed rgba(255, 255, 255, 0.15)",
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(255, 255, 255, 0.04)" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", display: "block", fontSize: "12px", fontWeight: 700 }}>
            TRANSFER AMOUNT
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "18px" }}>
            ₹{amount.toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(255, 255, 255, 0.04)" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", display: "block", fontSize: "12px", fontWeight: 700 }}>
            PAYOUT SERVICE CHARGE
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "18px" }}>
            + ₹{effectiveCharges.toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(255, 255, 255, 0.04)" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", display: "block", fontSize: "12px", fontWeight: 700 }}>
            GST
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#93C5FD", fontSize: "18px" }}>
            + ₹{gst.toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(37, 99, 235, 0.2)", border: "1px solid rgba(37, 99, 235, 0.4)" }}>
          <Typography sx={{ color: "#60A5FA", display: "block", fontSize: "12px", fontWeight: 800 }}>
            TOTAL WALLET DEBIT
          </Typography>
          <Typography sx={{ fontWeight: 900, color: "#3B82F6", fontSize: "24px" }}>
            ₹{effectiveTotal.toLocaleString()}
          </Typography>
        </Box>
      </Box>

      {/* Row 3: AI Route Optimization Recommendation Box Inside The Single Card */}
      <Box
        sx={{
          p: 2,
          borderRadius: "12px",
          bgcolor: "rgba(37, 99, 235, 0.15)",
          border: "1px solid rgba(37, 99, 235, 0.3)",
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <AutoAwesomeIcon sx={{ color: "#60A5FA", fontSize: 20 }} />
          <Box>
            <Typography sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "16px" }}>
              AI Smart Route Engine
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontSize: "13px" }}>
              HDFC DirectSwitch route selected automatically. Estimated settlement: <strong>1.2s</strong> · Success Probability: <strong>99.9%</strong>.
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};
