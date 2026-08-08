import React, { useRef, useEffect, useState } from "react";
import { Box, TextField, InputAdornment, Typography, Chip, Stack } from "@mui/material";
import KeyboardIcon from "@mui/icons-material/Keyboard";

export interface TransferAmountInputProps {
  amount: number;
  onAmountChange: (val: number) => void;
  minLimit?: number;
  maxLimit?: number;
  remainingDaily?: number;
  walletBalance?: number;
  showPresets?: boolean;
}

export const TransferAmountInput: React.FC<TransferAmountInputProps> = ({
  amount,
  onAmountChange,
  minLimit = 100,
  maxLimit = 50000,
  remainingDaily = 0,
  walletBalance = 0,
  showPresets = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState<string>(amount > 0 ? amount.toLocaleString("en-IN") : "");

  useEffect(() => {
    if (amount === 0) {
      setDisplayValue("");
    } else {
      setDisplayValue(amount.toLocaleString("en-IN"));
    }
  }, [amount]);

  // Auto cursor focus on mount & when component renders
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        if (amount > 0) inputRef.current.select();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, "");
    if (!rawVal) {
      setDisplayValue("");
      onAmountChange(0);
      return;
    }
    const numVal = parseInt(rawVal, 10);
    setDisplayValue(numVal.toLocaleString("en-IN"));
    onAmountChange(numVal);
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header Label + Shortcut Pill */}
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          TRANSFER AMOUNT
        </Typography>

        <Chip
          icon={<KeyboardIcon sx={{ "&&": { fontSize: 13, color: "#60A5FA" } }} />}
          label="Ctrl+Shift+A"
          size="small"
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.08)",
            color: "rgba(255, 255, 255, 0.8)",
            fontWeight: 700,
            fontSize: "10px",
            height: 22,
          }}
        />
      </Stack>

      {/* Premium Enterprise Banking Amount Field (No Spinners, Text Input, Formatted) */}
      <TextField
        fullWidth
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        inputRef={inputRef}
        placeholder="0"
        autoFocus
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start" sx={{ mr: 1 }}>
                <Typography sx={{ color: "#2563EB", fontWeight: 900, fontSize: "32px" }}>
                  ₹
                </Typography>
              </InputAdornment>
            ),
            sx: {
              height: 64, // Premium 64px height
              fontSize: "36px", // Large white amount 36px - 40px
              fontWeight: 700,
              color: "#FFFFFF",
              borderRadius: "14px",
              bgcolor: "rgba(8, 17, 31, 0.90)",
              px: 2,
              display: "flex",
              alignItems: "center",
              "& fieldset": { borderColor: "rgba(255, 255, 255, 0.15)", borderWidth: "1px" },
              "&:hover fieldset": { borderColor: "#3B82F6" },
              "&.Mui-focused": {
                boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.45)",
                borderRadius: "14px",
              },
              "&.Mui-focused fieldset": { borderColor: "#2563EB", borderWidth: "2px" },
              "& input": {
                textAlign: "left", // Left Aligned
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "36px",
                p: 0,
                "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
                  "-webkit-appearance": "none",
                  margin: 0,
                },
                "&[type=number]": {
                  "-moz-appearance": "textfield",
                },
              },
            },
          },
        }}
      />

    </Box>
  );
};
