import React from "react";
import { Box, Typography, Paper, Stack, Button } from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import EventIcon from "@mui/icons-material/Event";
import ErrorIcon from "@mui/icons-material/Error";
import { ComprehensiveValidationResult } from "../../services/RuleEngineAdapter";

export interface SmartAutoCorrectionBarProps {
  validationResult: ComprehensiveValidationResult;
  onAutoFixAmount: (newAmount: number) => void;
  onOpenTopup?: () => void;
}

export const SmartAutoCorrectionBar: React.FC<SmartAutoCorrectionBarProps> = ({
  validationResult,
  onAutoFixAmount,
  onOpenTopup,
}) => {
  const amount = validationResult.amount;
  const maxAllowed = validationResult.maximumAllowed;
  const firstError = validationResult.validationErrors[0];

  if (amount <= 0 || validationResult.allowed || !firstError) {
    return null;
  }

  const isLimitViolation = amount > maxAllowed;
  const difference = isLimitViolation ? amount - maxAllowed : 0;
  const isInsufficientWallet = firstError.code === "ERR_INSUFFICIENT_WALLET";
  const shortfall = firstError.metadata?.shortfall || Math.max(0, validationResult.totalPayable - validationResult.walletBalance);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mt: 1,
        borderRadius: "10px",
        bgcolor: "rgba(239, 68, 68, 0.12)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(239, 68, 68, 0.4)",
        transition: "all 150ms ease",
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ErrorIcon sx={{ color: "#EF4444", fontSize: 18 }} />
          <Typography sx={{ fontWeight: 800, color: "#FF6B6B", fontSize: "12.5px" }}>
            ❌ {firstError.title}
          </Typography>
        </Stack>

        <Typography sx={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "11.5px", lineHeight: 1.3 }}>
          {isInsufficientWallet ? (
            <>
              Required: <strong>₹{validationResult.totalPayable.toLocaleString()}</strong> · Shortfall: <strong style={{ color: "#EF4444" }}>₹{shortfall.toLocaleString()}</strong>
            </>
          ) : isLimitViolation ? (
            <>
              Allowed: <strong>₹{maxAllowed.toLocaleString()}</strong> · Entered: <strong>₹{amount.toLocaleString()}</strong> · Difference: <strong style={{ color: "#EF4444" }}>₹{difference.toLocaleString()}</strong>
            </>
          ) : (
            firstError.message
          )}
        </Typography>

        {/* ONE-CLICK ENTERPRISE AUTO CORRECTION FIX BUTTONS */}
        <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 0.75, pt: 0.5 }}>
          {isLimitViolation && (
            <Button
              size="small"
              variant="contained"
              onClick={() => onAutoFixAmount(maxAllowed)}
              startIcon={<AutoFixHighIcon sx={{ fontSize: 14 }} />}
              sx={{ height: 30, px: 1.25, fontSize: "11px", fontWeight: 800, bgcolor: "#2563EB" }}
            >
              Use Maximum (₹{maxAllowed.toLocaleString()})
            </Button>
          )}

          {isInsufficientWallet && (
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={onOpenTopup}
              startIcon={<AccountBalanceWalletIcon sx={{ fontSize: 14 }} />}
              sx={{ height: 30, px: 1.25, fontSize: "11px", fontWeight: 800 }}
            >
              Top-Up Wallet (₹{shortfall.toLocaleString()})
            </Button>
          )}

          <Button
            size="small"
            variant="outlined"
            startIcon={<CallSplitIcon sx={{ fontSize: 14 }} />}
            onClick={() => onAutoFixAmount(Math.floor(amount / 2))}
            sx={{ height: 30, px: 1, fontSize: "11px", fontWeight: 700, color: "rgba(255, 255, 255, 0.8)", borderColor: "rgba(255, 255, 255, 0.2)" }}
          >
            Split Transaction
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<EventIcon sx={{ fontSize: 14 }} />}
            onClick={() => onAutoFixAmount(maxAllowed)}
            sx={{ height: 30, px: 1, fontSize: "11px", fontWeight: 700, color: "rgba(255, 255, 255, 0.8)", borderColor: "rgba(255, 255, 255, 0.2)" }}
          >
            Schedule Tomorrow
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};
