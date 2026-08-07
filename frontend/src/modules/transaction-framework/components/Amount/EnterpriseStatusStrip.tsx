import React, { useEffect } from "react";
import { Box, Typography, Paper, Stack, Button, Tooltip } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { ComprehensiveValidationResult } from "../../services/RuleEngineAdapter";
import { bankingSounds } from "../../utils/bankingSounds";
import { useRetailerStore } from "@/stores/use-retailer-store";

export interface EnterpriseStatusStripProps {
  validationResult: ComprehensiveValidationResult;
  onAutoFixAmount?: (newAmount: number) => void;
  onOpenTopup?: () => void;
}

export const EnterpriseStatusStrip: React.FC<EnterpriseStatusStripProps> = ({
  validationResult,
  onAutoFixAmount,
  onOpenTopup,
}) => {
  const { soundboxEnabled } = useRetailerStore();

  useEffect(() => {
    bankingSounds.setMuted(!soundboxEnabled);
  }, [soundboxEnabled]);

  useEffect(() => {
    if (validationResult.amount <= 0) return;

    if (validationResult.allowed) {
      bankingSounds.playSuccess(`success-${validationResult.amount}`);
    } else if (validationResult.validationErrors.some((e) => e.severity === "CRITICAL")) {
      bankingSounds.playError(`critical-${validationResult.amount}`);
    } else if (validationResult.validationErrors.length > 0) {
      bankingSounds.playError(`error-${validationResult.amount}`);
    } else if (validationResult.validationWarnings.length > 0) {
      bankingSounds.playWarning(`warning-${validationResult.amount}`);
    }
  }, [validationResult]);

  const amount = validationResult.amount;
  const totalPayable = validationResult.totalPayable;
  const walletBalance = validationResult.walletBalance;
  const dailyRemaining = validationResult.dailyLimitRemaining;
  const monthlyRemaining = validationResult.monthlyLimitRemaining;
  const shortfall = Math.max(0, totalPayable - walletBalance);

  const hasErrors = amount > 0 && !validationResult.allowed;
  const hasWarnings = amount > 0 && validationResult.validationWarnings.length > 0;
  const firstError = validationResult.validationErrors[0];
  const firstWarning = validationResult.validationWarnings[0];

  return (
    <Paper
      elevation={0}
      sx={{
        height: 44, // Fixed 40px - 48px compact validation status height
        px: 1.5,
        borderRadius: "10px",
        bgcolor: hasErrors
          ? "rgba(239, 68, 68, 0.15)"
          : hasWarnings
          ? "rgba(245, 158, 11, 0.15)"
          : "rgba(34, 197, 94, 0.12)",
        backdropFilter: "blur(12px)",
        border: hasErrors
          ? "1px solid rgba(239, 68, 68, 0.4)"
          : hasWarnings
          ? "1px solid rgba(245, 158, 11, 0.4)"
          : "1px solid rgba(34, 197, 94, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        my: 1,
      }}
    >
      {/* ── 1. BLOCKED STATE ── */}
      {hasErrors && firstError ? (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", width: "100%", justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
            <ErrorIcon sx={{ color: "#EF4444", fontSize: 20, flexShrink: 0 }} />
            <Typography sx={{ fontWeight: 800, color: "#FF6B6B", fontSize: "13px", whiteSpace: "nowrap" }}>
              🔴 {firstError.title}:
            </Typography>
            <Typography sx={{ color: "#FFFFFF", fontSize: "12px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {firstError.code === "ERR_INSUFFICIENT_WALLET"
                ? `Required ₹${totalPayable.toLocaleString()} · Available ₹${walletBalance.toLocaleString()} (Shortfall ₹${shortfall.toLocaleString()})`
                : firstError.code === "ERR_CUSTOMER_DAILY_LIMIT"
                ? `Available ₹${dailyRemaining.toLocaleString()} · Required ₹${amount.toLocaleString()}`
                : firstError.message}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
            {firstError.code === "ERR_CUSTOMER_DAILY_LIMIT" && onAutoFixAmount && (
              <Button
                size="small"
                variant="contained"
                onClick={() => onAutoFixAmount(dailyRemaining)}
                startIcon={<AutoFixHighIcon sx={{ fontSize: 14 }} />}
                sx={{ height: 32, px: 1.25, fontSize: "11px", fontWeight: 800, bgcolor: "#2563EB" }}
              >
                Use Max (₹{dailyRemaining.toLocaleString()})
              </Button>
            )}

            {firstError.code === "ERR_INSUFFICIENT_WALLET" && (
              <Button
                size="small"
                variant="contained"
                color="error"
                onClick={onOpenTopup}
                startIcon={<AccountBalanceWalletIcon sx={{ fontSize: 14 }} />}
                sx={{ height: 32, px: 1.25, fontSize: "11px", fontWeight: 800 }}
              >
                Top-Up Wallet
              </Button>
            )}
          </Stack>
        </Stack>
      ) : hasWarnings && firstWarning ? (
        /* ── 2. WARNING STATE ── */
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <WarningAmberIcon sx={{ color: "#F59E0B", fontSize: 20 }} />
          <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "13px" }}>
            🟠 {firstWarning.title}:
          </Typography>
          <Typography sx={{ color: "rgba(255, 255, 255, 0.9)", fontSize: "12px" }}>
            {firstWarning.message}
          </Typography>
        </Stack>
      ) : (
        /* ── 3. READY STATE (ONLY SHOW BENE MONTHLY BALANCE) ── */
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", width: "100%", justifyContent: "space-between", overflow: "hidden" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", overflow: "hidden" }}>
            <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 18, flexShrink: 0 }} />
            <Typography sx={{ fontWeight: 900, color: "#4ADE80", fontSize: "12px", whiteSpace: "nowrap" }}>
              🟢 Ready
            </Typography>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "11px" }}>•</Typography>
            <Typography sx={{ color: "#FFFFFF", fontSize: "11.5px", fontWeight: 600, whiteSpace: "nowrap" }}>
              Bene Monthly Left <strong style={{ color: "#34D399" }}>₹{monthlyRemaining.toLocaleString()}</strong>
            </Typography>
          </Stack>

          <Typography sx={{ color: "#93C5FD", fontSize: "11px", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
            HDFC Direct (1.2s)
          </Typography>
        </Stack>
      )}
    </Paper>
  );
};
