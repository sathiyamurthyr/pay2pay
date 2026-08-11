import React, { useEffect } from "react";
import { Paper, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorIcon from "@mui/icons-material/Error";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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

  // ── Determine status strip state ──────────────────────────────────────────
  // Priority 1: API failed to load limits
  const limitLoadFailed = validationResult.limitLoadFailed === true;

  // Priority 2: Beneficiary is inactive / blocked / frozen
  const isBeneficiaryBlocked =
    validationResult.isBeneficiaryActive === false;

  // Priority 3: Actual limits truly exhausted (must be explicitly 0 or less)
  const dailyRemaining = validationResult.dailyLimitRemaining;
  const monthlyRemaining = validationResult.monthlyLimitRemaining;
  // Only flag exhausted when BOTH limits are valid numbers that are <= 0
  const isDailyExhausted  = dailyRemaining  > -1 && dailyRemaining  <= 0;
  const isMonthlyExhausted = monthlyRemaining > -1 && monthlyRemaining <= 0;
  const isExhausted = isDailyExhausted || isMonthlyExhausted;

  // Priority 4: Low limit warning (< 20 000 remaining on monthly)
  const isLowLimit = !isExhausted && monthlyRemaining < 20000 && monthlyRemaining > 0;

  // ── Colour tokens ──────────────────────────────────────────────────────────
  const getBgColor = () => {
    if (limitLoadFailed || isBeneficiaryBlocked) return "rgba(245, 158, 11, 0.15)";
    if (isExhausted) return "rgba(239, 68, 68, 0.15)";
    if (isLowLimit)  return "rgba(245, 158, 11, 0.15)";
    return "rgba(34, 197, 94, 0.12)";
  };

  const getBorderColor = () => {
    if (limitLoadFailed || isBeneficiaryBlocked) return "rgba(245, 158, 11, 0.4)";
    if (isExhausted) return "rgba(239, 68, 68, 0.4)";
    if (isLowLimit)  return "rgba(245, 158, 11, 0.4)";
    return "rgba(34, 197, 94, 0.35)";
  };

  // ── Render label ───────────────────────────────────────────────────────────
  const renderContent = () => {
    if (limitLoadFailed) {
      return (
        <>
          <InfoOutlinedIcon sx={{ color: "#F59E0B", fontSize: 18 }} />
          <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "12.5px" }}>
            ⚠ Unable to load beneficiary limits
          </Typography>
        </>
      );
    }
    if (isBeneficiaryBlocked) {
      return (
        <>
          <ErrorIcon sx={{ color: "#EF4444", fontSize: 18 }} />
          <Typography sx={{ fontWeight: 800, color: "#FF6B6B", fontSize: "12.5px" }}>
            ❌ Beneficiary is Inactive / Blocked
          </Typography>
        </>
      );
    }
    if (isExhausted) {
      const label = isDailyExhausted
        ? `Daily Limit Exhausted (₹${dailyRemaining.toLocaleString()} left)`
        : `Monthly Limit Exhausted (₹${monthlyRemaining.toLocaleString()} left)`;
      return (
        <>
          <ErrorIcon sx={{ color: "#EF4444", fontSize: 18 }} />
          <Typography sx={{ fontWeight: 800, color: "#FF6B6B", fontSize: "12.5px" }}>
            ❌ {label}
          </Typography>
        </>
      );
    }
    if (isLowLimit) {
      return (
        <>
          <WarningAmberIcon sx={{ color: "#F59E0B", fontSize: 18 }} />
          <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "12.5px" }}>
            ⚠ Low Limit — ₹{monthlyRemaining.toLocaleString()} monthly remaining
          </Typography>
        </>
      );
    }
    return (
      <>
        <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 18 }} />
        <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "12.5px" }}>
          ✔ Beneficiary Monthly Left ₹{monthlyRemaining.toLocaleString()}
        </Typography>
      </>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: 40,
        px: 1.5,
        borderRadius: "8px",
        bgcolor: getBgColor(),
        backdropFilter: "blur(12px)",
        border: `1px solid ${getBorderColor()}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        my: 1,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        {renderContent()}
      </Stack>
    </Paper>
  );
};
