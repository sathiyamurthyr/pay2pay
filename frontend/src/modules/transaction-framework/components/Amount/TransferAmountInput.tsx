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
            color: "var(--brand-primary, #0F3B7D)",
          }}
        >
          TRANSFER AMOUNT
        </Typography>

        <Chip
          icon={<KeyboardIcon sx={{ "&&": { fontSize: 13, color: "var(--brand-primary, #0F3B7D)" } }} />}
          label="Ctrl+Shift+A"
          size="small"
          sx={{
            bgcolor: "var(--brand-surface, #EFF6FF)",
            color: "var(--brand-primary, #0F3B7D)",
            border: "1px solid var(--brand-border, rgba(15, 59, 125, 0.25))",
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
                <Typography sx={{ color: "var(--brand-primary, #0F3B7D)", fontWeight: 900, fontSize: "32px" }}>
                  ₹
                </Typography>
              </InputAdornment>
            ),
            sx: {
              height: 64,
              fontSize: "36px",
              fontWeight: 700,
              color: "var(--text-primary, #0F172A)",
              borderRadius: "14px",
              bgcolor: "#FFFFFF",
              px: 2,
              display: "flex",
              alignItems: "center",
              "& fieldset": { borderColor: "#CBD5E1", borderWidth: "1.5px" },
              "&:hover fieldset": { borderColor: "var(--brand-primary, #0F3B7D)" },
              "&.Mui-focused": {
                boxShadow: "0 0 0 3px var(--grid-search-focus-shadow, rgba(15, 59, 125, 0.14))",
                borderRadius: "14px",
              },
              "&.Mui-focused fieldset": { borderColor: "var(--brand-primary, #0F3B7D)", borderWidth: "2px" },
              "& input": {
                textAlign: "left",
                color: "var(--text-primary, #0F172A)",
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
