import React from "react";
import { Box, Typography, Stack, TextField, Chip, Paper } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

export interface AmountPanelProps {
  amount: number;
  onAmountChange: (val: number) => void;
  charges: number;
  totalPayable: number;
}

export const AmountPanel: React.FC<AmountPanelProps> = ({ amount, onAmountChange, charges, totalPayable }) => {
  const gst = Math.round(charges * 0.18);

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
                height: 56, // 56px height
                fontSize: "24px", // 24px bold input text
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

        <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", gap: 1.5, flexShrink: 0 }}>
          {[1000, 2000, 5000, 10000, 25000].map((quickVal) => (
            <Chip
              key={quickVal}
              label={`+₹${quickVal.toLocaleString()}`}
              onClick={() => onAmountChange(quickVal)}
              sx={{
                height: 56,
                px: 2,
                borderRadius: "12px",
                fontWeight: 800,
                fontSize: "16px",
                bgcolor: amount === quickVal ? "#2563EB" : "rgba(255, 255, 255, 0.08)",
                color: amount === quickVal ? "#FFFFFF" : "rgba(255, 255, 255, 0.90)",
                border: amount === quickVal ? "1px solid #3B82F6" : "1px solid rgba(255, 255, 255, 0.12)",
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
            RETAILER SURCHARGE
          </Typography>
          <Typography sx={{ fontWeight: 800, color: "#60A5FA", fontSize: "18px" }}>
            + ₹{charges.toLocaleString()}
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(255, 255, 255, 0.04)" }}>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", display: "block", fontSize: "12px", fontWeight: 700 }}>
            GST (18%)
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
            ₹{totalPayable.toLocaleString()}
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
