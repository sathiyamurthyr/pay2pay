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
}

export const AmountValidation: React.FC<AmountValidationProps> = ({
  amount,
  totalPayable,
  walletBalance = 124500,
  dailyRemaining = 25000,
  monthlyRemaining = 200000,
}) => {
  const isLowBalance = totalPayable > walletBalance;
  const isDailyLimitExceeded = amount > dailyRemaining;
  const isMonthlyLimitExceeded = amount > monthlyRemaining;
  const isHighAmount = amount >= 50000;

  if (!isLowBalance && !isDailyLimitExceeded && !isMonthlyLimitExceeded && !isHighAmount && amount <= 0) {
    return null;
  }

  return (
    <Stack spacing={1} sx={{ width: "100%" }}>
      {/* 1. Low Balance Alert */}
      {isLowBalance && (
        <Alert
          severity="error"
          icon={<ErrorIcon sx={{ color: "#EF4444" }} />}
          sx={{
            bgcolor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            color: "#FFFFFF",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Insufficient Operator Wallet Balance! Required: ₹{totalPayable.toLocaleString()} · Current Balance: ₹{walletBalance.toLocaleString()}.
        </Alert>
      )}

      {/* 2. Daily Limit Exceeded Alert */}
      {isDailyLimitExceeded && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon sx={{ color: "#F59E0B" }} />}
          sx={{
            bgcolor: "rgba(245, 158, 11, 0.15)",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            color: "#FFFFFF",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          Customer Daily Limit Exceeded! Transfer: ₹{amount.toLocaleString()} · Daily Remaining: ₹{dailyRemaining.toLocaleString()}.
        </Alert>
      )}

      {/* 3. High Volume 2FA Risk Alert */}
      {isHighAmount && !isDailyLimitExceeded && (
        <Alert
          severity="info"
          icon={<InfoIcon sx={{ color: "#3B82F6" }} />}
          sx={{
            bgcolor: "rgba(37, 99, 235, 0.15)",
            border: "1px solid rgba(37, 99, 235, 0.4)",
            color: "#FFFFFF",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          High-Value Transfer Safeguard Active: Transactions ≥ ₹50,000 require Secondary eKYC OTP Verification.
        </Alert>
      )}
    </Stack>
  );
};
