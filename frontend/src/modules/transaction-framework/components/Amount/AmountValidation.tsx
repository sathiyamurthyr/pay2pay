import React, { useEffect } from "react";
import { Box, Typography, Paper, Stack, Chip } from "@mui/material";
import ErrorIcon from "@mui/icons-material/Error";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import { ComprehensiveValidationResult, RuleValidationError } from "../../services/RuleEngineAdapter";
import { bankingSounds } from "../../utils/bankingSounds";
import { useRetailerStore } from "@/stores/use-retailer-store";

export interface AmountValidationProps {
  validationResult: ComprehensiveValidationResult;
  soundEnabled?: boolean;
}

export const AmountValidation: React.FC<AmountValidationProps> = ({
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

  if (validationResult.amount <= 0) {
    return null;
  }

  return (
    <Stack spacing={1.25} sx={{ width: "100%", mt: 1.25, transition: "all 150ms ease" }}>
      {/* ── 1. SUCCESS CARD (WHEN ALL VALIDATIONS PASS) ── */}
      {validationResult.allowed && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: "12px",
            bgcolor: "#F0FDF4",
            border: "1px solid #86EFAC",
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
            <CheckCircleIcon sx={{ color: "#16A34A", fontSize: 22 }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 900, color: "#166534", fontSize: "13.5px", lineHeight: 1.2 }}>
                TRANSFER READY
              </Typography>
              <Typography sx={{ color: "#15803D", fontSize: "12px", mt: 0.25 }}>
                Wallet: <strong>₹{validationResult.walletBalance.toLocaleString()}</strong> · Wallet Debit: <strong>₹{validationResult.totalPayable.toLocaleString()}</strong> · Remaining: <strong style={{ color: "var(--brand-primary, #0F3B7D)" }}>₹{validationResult.walletBalanceAfter.toLocaleString()}</strong>
              </Typography>
            </Box>
            <Chip label="Ready to Proceed" size="small" sx={{ bgcolor: "#16A34A", color: "#FFFFFF", fontWeight: 800, height: 22, fontSize: "10px" }} />
          </Stack>
        </Paper>
      )}

      {/* ── 2. ERROR CARDS (MULTIPLE ERRORS GROUPED) ── */}
      {validationResult.validationErrors.map((err) => (
        <Paper
          key={err.code}
          elevation={0}
          sx={{
            p: 1.75,
            borderRadius: "12px",
            bgcolor: "#FEF2F2",
            border: "1px solid #FECACA",
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
            <ErrorIcon sx={{ color: "#DC2626", fontSize: 22, mt: 0.2 }} />
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
                <Typography sx={{ fontWeight: 900, color: "#991B1B", fontSize: "13.5px" }}>
                  ❌ {err.title}
                </Typography>
                <Chip label={`Rule ${err.ruleStep}`} size="small" sx={{ height: 18, fontSize: "9px", fontWeight: 800, bgcolor: "#FEE2E2", color: "#991B1B" }} />
              </Stack>

              <Typography sx={{ color: "#7F1D1D", fontSize: "12.5px", fontWeight: 600, lineHeight: 1.4 }}>
                {err.message}
              </Typography>

              {/* Special Metadata Callouts (e.g. Shortfall & Suggestions) */}
              {err.metadata?.shortfall && (
                <Box sx={{ mt: 1, p: 1, borderRadius: "8px", bgcolor: "#FFFFFF", border: "1px dashed #FECACA" }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "11px", color: "#475569" }}>Required: <strong>₹{err.metadata.requiredAmount?.toLocaleString()}</strong></Typography>
                    <Typography sx={{ fontSize: "11px", color: "#DC2626", fontWeight: 800 }}>Shortfall: ₹{err.metadata.shortfall.toLocaleString()}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: "11px", color: "var(--brand-primary, #0F3B7D)", fontWeight: 700, mt: 0.5, fontStyle: "italic" }}>
                    💡 Suggestion: Top-up wallet or reduce transfer amount.
                  </Typography>
                </Box>
              )}
            </Box>
          </Stack>
        </Paper>
      ))}

      {/* ── 3. WARNING CARDS (E.G. BANK DEGRADED / ROUTE RECOMMENDATIONS) ── */}
      {validationResult.validationWarnings.map((warn) => (
        <Paper
          key={warn.code}
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: "12px",
            bgcolor: "#FFFBEB",
            border: "1px solid #FDE68A",
          }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: "flex-start" }}>
            <WarningAmberIcon sx={{ color: "#D97706", fontSize: 20, mt: 0.2 }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 800, color: "#92400E", fontSize: "13px" }}>
                ⚠ {warn.title}
              </Typography>
              <Typography sx={{ color: "#78350F", fontSize: "12px", mt: 0.25 }}>
                {warn.message}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
};
