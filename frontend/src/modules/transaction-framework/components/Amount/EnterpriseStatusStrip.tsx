import React, { useEffect } from "react";
import { Paper, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorIcon from "@mui/icons-material/Error";
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

  const monthlyRemaining = validationResult.monthlyLimitRemaining;
  const isExhausted = monthlyRemaining <= 0;
  const isLowLimit = monthlyRemaining < 20000;

  const bgColor = isExhausted
    ? "rgba(239, 68, 68, 0.15)"
    : isLowLimit
    ? "rgba(245, 158, 11, 0.15)"
    : "rgba(34, 197, 94, 0.12)";

  const borderColor = isExhausted
    ? "rgba(239, 68, 68, 0.4)"
    : isLowLimit
    ? "rgba(245, 158, 11, 0.4)"
    : "rgba(34, 197, 94, 0.35)";

  return (
    <Paper
      elevation={0}
      sx={{
        height: 40, // Fixed 40px maximum height
        px: 1.5,
        borderRadius: "8px",
        bgcolor: bgColor,
        backdropFilter: "blur(12px)",
        border: `1px solid ${borderColor}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        my: 1,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        {isExhausted ? (
          <>
            <ErrorIcon sx={{ color: "#EF4444", fontSize: 18 }} />
            <Typography sx={{ fontWeight: 800, color: "#FF6B6B", fontSize: "12.5px" }}>
              ❌ Beneficiary Limit Exhausted
            </Typography>
          </>
        ) : isLowLimit ? (
          <>
            <WarningAmberIcon sx={{ color: "#F59E0B", fontSize: 18 }} />
            <Typography sx={{ fontWeight: 800, color: "#FBBF24", fontSize: "12.5px" }}>
              ⚠ Beneficiary Monthly Left ₹{monthlyRemaining.toLocaleString()}
            </Typography>
          </>
        ) : (
          <>
            <CheckCircleIcon sx={{ color: "#4ADE80", fontSize: 18 }} />
            <Typography sx={{ fontWeight: 800, color: "#4ADE80", fontSize: "12.5px" }}>
              ✔ Beneficiary Monthly Left ₹{monthlyRemaining.toLocaleString()}
            </Typography>
          </>
        )}
      </Stack>
    </Paper>
  );
};
