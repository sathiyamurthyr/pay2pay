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
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: "linear-gradient(135deg, #FEF08A 0%, #FBBF24 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          TRANSFER AMOUNT
        </Typography>

        <Chip
          icon={<KeyboardIcon sx={{ "&&": { fontSize: 13, color: "#FBBF24" } }} />}
          label="Ctrl+Shift+A"
          size="small"
          sx={{
            bgcolor: "rgba(245, 158, 11, 0.12)",
            color: "#FDE68A",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            fontWeight: 800,
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
                <Typography sx={{ color: "#F59E0B", fontWeight: 900, fontSize: "32px", textShadow: "0 0 10px rgba(245, 158, 11, 0.4)" }}>
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
              bgcolor: "rgba(8, 11, 17, 0.92)",
              backdropFilter: "blur(12px)",
              px: 2,
              display: "flex",
              alignItems: "center",
              "& fieldset": { borderColor: "rgba(245, 158, 11, 0.3)", borderWidth: "1px" },
              "&:hover fieldset": { borderColor: "#F59E0B" },
              "&.Mui-focused": {
                boxShadow: "0 0 24px rgba(245, 158, 11, 0.4), inset 0 0 8px rgba(245, 158, 11, 0.1)",
                borderRadius: "14px",
              },
              "&.Mui-focused fieldset": { borderColor: "#F59E0B", borderWidth: "2px" },
              "& input": {
                textAlign: "left", // Left Aligned
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "36px",
                p: 0,
                "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
                  WebkitAppearance: "none",
                  margin: 0,
                },
                "&[type=number]": {
                  MozAppearance: "textfield",
                },
              },
            },
          },
        }}
      />

    </Box>
  );
};
