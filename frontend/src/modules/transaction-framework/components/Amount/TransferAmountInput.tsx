import React, { useRef, useEffect } from "react";
import { Box, TextField, InputAdornment, Typography, Chip } from "@mui/material";
import KeyboardIcon from "@mui/icons-material/Keyboard";

export interface TransferAmountInputProps {
  amount: number;
  onAmountChange: (val: number) => void;
}

export const TransferAmountInput: React.FC<TransferAmountInputProps> = ({ amount, onAmountChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener for Ctrl+Shift+A
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Box sx={{ width: "100%", position: "relative" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography sx={{ color: "rgba(255, 255, 255, 0.70)", fontWeight: 700, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          ENTER TRANSFER AMOUNT
        </Typography>

        <Chip
          icon={<KeyboardIcon sx={{ "&&": { fontSize: 14, color: "#60A5FA" } }} />}
          label="Ctrl+Shift+A"
          size="small"
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.08)",
            color: "rgba(255, 255, 255, 0.8)",
            fontWeight: 700,
            fontSize: "11px",
            height: 22,
          }}
        />
      </Box>

      <TextField
        fullWidth
        type="number"
        value={amount === 0 ? "" : amount}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          onAmountChange(isNaN(val) ? 0 : val);
        }}
        inputRef={inputRef}
        placeholder="0.00"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Typography sx={{ color: "#2563EB", fontWeight: 900, fontSize: "28px" }}>
                  ₹
                </Typography>
              </InputAdornment>
            ),
            sx: {
              height: 64, // Exact 64px Height
              fontSize: "32px",
              fontWeight: 900,
              color: "#FFFFFF",
              borderRadius: "16px",
              bgcolor: "rgba(8, 17, 31, 0.90)",
              textAlign: "right", // Right Aligned text
              px: 2,
              boxShadow: "inset 0 2px 8px rgba(0, 0, 0, 0.4)",
              "& fieldset": { borderColor: "rgba(255, 255, 255, 0.15)" },
              "&:hover fieldset": { borderColor: "#3B82F6" },
              "&.Mui-focused fieldset": { borderColor: "#2563EB", borderWidth: "2px" },
              "& input": { textAlign: "right", color: "#FFFFFF", fontWeight: 900 },
            },
          },
        }}
      />
    </Box>
  );
};
