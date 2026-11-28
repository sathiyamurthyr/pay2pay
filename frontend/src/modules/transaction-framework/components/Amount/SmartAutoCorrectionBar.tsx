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
        bgcolor: "#FEF2F2",
        border: "1px solid #FECACA",
        transition: "all 150ms ease",
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <ErrorIcon sx={{ color: "#DC2626", fontSize: 18 }} />
          <Typography sx={{ fontWeight: 800, color: "#991B1B", fontSize: "12.5px" }}>
            ❌ {firstError.title}
          </Typography>
        </Stack>

        <Typography sx={{ color: "#7F1D1D", fontSize: "11.5px", lineHeight: 1.3 }}>
          {isInsufficientWallet ? (
            <>
              Required: <strong>₹{validationResult.totalPayable.toLocaleString()}</strong> · Shortfall: <strong style={{ color: "#DC2626" }}>₹{shortfall.toLocaleString()}</strong>
            </>
          ) : isLimitViolation ? (
            <>
              Allowed: <strong>₹{maxAllowed.toLocaleString()}</strong> · Entered: <strong>₹{amount.toLocaleString()}</strong> · Difference: <strong style={{ color: "#DC2626" }}>₹{difference.toLocaleString()}</strong>
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
              sx={{ height: 30, px: 1.25, fontSize: "11px", fontWeight: 800, bgcolor: "var(--brand-primary, #0F3B7D)" }}
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
            sx={{ height: 30, px: 1, fontSize: "11px", fontWeight: 700, color: "var(--text-secondary, #334155)", borderColor: "#CBD5E1", bgcolor: "#FFFFFF" }}
          >
            Split Transaction
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<EventIcon sx={{ fontSize: 14 }} />}
            onClick={() => onAutoFixAmount(maxAllowed)}
            sx={{ height: 30, px: 1, fontSize: "11px", fontWeight: 700, color: "var(--text-secondary, #334155)", borderColor: "#CBD5E1", bgcolor: "#FFFFFF" }}
          >
            Schedule Tomorrow
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};
