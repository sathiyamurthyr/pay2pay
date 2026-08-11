import React from "react";
import { Paper, Stack, Button, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import LockIcon from "@mui/icons-material/Lock";
import AddIcon from "@mui/icons-material/Add";

export interface WizardFooterProps {
  currentStep: number;
  onBack: () => void;
  onContinue: () => void;
  canContinue?: boolean;
}

export const WizardFooter: React.FC<WizardFooterProps> = ({
  currentStep,
  onBack,
  onContinue,
  canContinue = true,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 1100,
        height: 64,
        px: 3,
        bgcolor: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontSize: "12px", fontWeight: 600 }}>
        Shortcuts: <strong style={{ color: "#60A5FA" }}>[ F2: Customer ] [ F3: Beneficiary ] [ F4: Amount ] [ Ctrl+Enter: Execute ]</strong>
      </Typography>

      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        {currentStep > 1 && currentStep < 4 && (
          <Button
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBackIcon />}
            sx={{
              height: 42,
              px: 3,
              borderRadius: "10px",
              fontWeight: 700,
              color: "rgba(255, 255, 255, 0.8)",
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            Previous Step
          </Button>
        )}

        {currentStep === 1 && (
          <Button
            variant="contained"
            disabled={!canContinue}
            onClick={onContinue}
            endIcon={<ArrowForwardIcon />}
            sx={{
              height: 44,
              px: 4,
              borderRadius: "10px",
              fontWeight: 900,
              fontSize: "14px",
              bgcolor: "#2563EB",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
            }}
          >
            Continue to Beneficiary Selection →
          </Button>
        )}

        {currentStep === 2 && (
          <Button
            variant="contained"
            disabled={!canContinue}
            onClick={onContinue}
            endIcon={<ArrowForwardIcon />}
            sx={{
              height: 44,
              px: 4,
              borderRadius: "10px",
              fontWeight: 900,
              fontSize: "14px",
              bgcolor: "#2563EB",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
            }}
          >
            Proceed to Authentication →
          </Button>
        )}

        {currentStep === 3 && (
          <Button
            variant="contained"
            onClick={onContinue}
            startIcon={<LockIcon />}
            sx={{
              height: 44,
              px: 4,
              borderRadius: "10px",
              fontWeight: 900,
              fontSize: "14px",
              bgcolor: "#2563EB",
              boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
            }}
          >
            Authorize & Execute Transfer (Ctrl+Enter)
          </Button>
        )}

        {currentStep === 4 && (
          <Button
            variant="contained"
            color="success"
            onClick={onContinue}
            startIcon={<AddIcon />}
            sx={{
              height: 44,
              px: 4,
              borderRadius: "10px",
              fontWeight: 900,
              fontSize: "14px",
            }}
          >
            + New Customer Transfer
          </Button>
        )}
      </Stack>
    </Paper>
  );
};
