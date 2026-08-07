import React from "react";
import { Box, Typography, Alert, Stack } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";

export interface AmountValidationProps {
  amount: number;
  totalPayable: number;
  walletBalance?: number;
  dailyRemaining?: number;
  monthlyRemaining?: number;
  minLimit?: number;
  maxLimit?: number;
}

export interface ValidationStatus {
  isValid: boolean;
  isInsufficientWallet: boolean;
  isBelowMin: boolean;
  isExceedsMax: boolean;
  isExceedsDaily: boolean;
  isExceedsMonthly: boolean;
  errorMessage: string | null;
}

export function validateTransactionAmount(
  amount: number,
  totalPayable: number,
  walletBalance: number = 124500,
  dailyRemaining: number = 25000,
  monthlyRemaining: number = 200000,
  minLimit: number = 100,
  maxLimit: number = 50000
): ValidationStatus {
  if (amount <= 0) {
    return {
      isValid: false,
      isInsufficientWallet: false,
      isBelowMin: false,
      isExceedsMax: false,
      isExceedsDaily: false,
      isExceedsMonthly: false,
      errorMessage: "Enter transfer amount to proceed",
    };
  }

  const isInsufficientWallet = totalPayable > walletBalance;
  const isBelowMin = amount < minLimit;
  const isExceedsMax = amount > maxLimit;
  const isExceedsDaily = amount > dailyRemaining;
  const isExceedsMonthly = amount > monthlyRemaining;

  let errorMessage: string | null = null;
  if (isInsufficientWallet) {
    errorMessage = `Insufficient Operator Wallet Balance! Required: ₹${totalPayable.toLocaleString()} · Available: ₹${walletBalance.toLocaleString()}`;
  } else if (isExceedsDaily) {
    errorMessage = `Exceeds Customer Daily Remaining Limit! Transfer: ₹${amount.toLocaleString()} · Daily Remaining: ₹${dailyRemaining.toLocaleString()}`;
  } else if (isExceedsMonthly) {
    errorMessage = `Exceeds Customer Monthly Remaining Limit! Transfer: ₹${amount.toLocaleString()} · Monthly Remaining: ₹${monthlyRemaining.toLocaleString()}`;
  } else if (isExceedsMax) {
    errorMessage = `Exceeds Maximum Single Transfer Limit! Transfer: ₹${amount.toLocaleString()} · Maximum Allowed: ₹${maxLimit.toLocaleString()}`;
  } else if (isBelowMin) {
    errorMessage = `Below Minimum Transaction Limit! Transfer: ₹${amount.toLocaleString()} · Minimum Allowed: ₹${minLimit.toLocaleString()}`;
  }

  const isValid = !isInsufficientWallet && !isBelowMin && !isExceedsMax && !isExceedsDaily && !isExceedsMonthly;

  return {
    isValid,
    isInsufficientWallet,
    isBelowMin,
    isExceedsMax,
    isExceedsDaily,
    isExceedsMonthly,
    errorMessage,
  };
}

export const AmountValidation: React.FC<AmountValidationProps> = ({
  amount,
  totalPayable,
  walletBalance = 124500,
  dailyRemaining = 25000,
  monthlyRemaining = 200000,
  minLimit = 100,
  maxLimit = 50000,
}) => {
  const status = validateTransactionAmount(
    amount,
    totalPayable,
    walletBalance,
    dailyRemaining,
    monthlyRemaining,
    minLimit,
    maxLimit
  );

  if (amount <= 0 || status.isValid) {
    return null;
  }

  return (
    <Stack spacing={1} sx={{ width: "100%", mt: 1 }}>
      {status.errorMessage && (
        <Alert
          severity="error"
          icon={<ErrorIcon sx={{ color: "#EF4444" }} />}
          sx={{
            bgcolor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            color: "#FFFFFF",
            borderRadius: "10px",
            fontSize: "12.5px",
            fontWeight: 700,
            py: 0.5,
          }}
        >
          {status.errorMessage}
        </Alert>
      )}
    </Stack>
  );
};
