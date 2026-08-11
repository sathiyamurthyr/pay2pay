import React from "react";
import { Box, Typography, Stack, Paper, Chip, Stepper, Step, StepLabel } from "@mui/material";
import SpeedIcon from "@mui/icons-material/Speed";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import PersonIcon from "@mui/icons-material/Person";

export interface WizardHeaderProps {
  currentStep: number;
  walletBalance?: number;
  operatorName?: string;
}

export const WizardHeader: React.FC<WizardHeaderProps> = ({
  currentStep,
  walletBalance = 0,
  operatorName = "Sathyamoorthy (P2P-RET-0245)",
}) => {
  const steps = ["1. Customer Search", "2. Beneficiary & Amount", "3. Authorize", "4. Receipt & Share"];

  return (
    <Paper
      elevation={0}
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1100,
        height: 68,
        px: 3,
        bgcolor: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      {/* Left: Module Breadcrumb & System Indicator */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Typography sx={{ color: "rgba(255, 255, 255, 0.50)", fontWeight: 600, fontSize: "12px" }}>
          CBS PLATFORM / DMT
        </Typography>
        <Typography sx={{ color: "rgba(255, 255, 255, 0.30)", fontSize: "12px" }}>•</Typography>
        <Typography sx={{ color: "#60A5FA", fontWeight: 800, fontSize: "14px" }}>
          Enterprise Transaction Wizard
        </Typography>
      </Stack>

      {/* Center: 4-Step Stepper */}
      <Box sx={{ width: "45%", display: { xs: "none", md: "block" } }}>
        <Stepper activeStep={currentStep - 1} alternativeLabel sx={{ "& .MuiStepLabel-label": { color: "rgba(255, 255, 255, 0.6)", fontSize: "11px", fontWeight: 700 }, "& .Mui-active .MuiStepLabel-label": { color: "#60A5FA", fontWeight: 900 }, "& .Mui-completed .MuiStepLabel-label": { color: "#4ADE80" } }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Right: NPCI Status, Wallet Balance, Operator Telemetry */}
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Chip
          icon={<SpeedIcon sx={{ "&&": { color: "#4ADE80", fontSize: 14 } }} />}
          label="NPCI Switch: OPERATIONAL (18ms)"
          size="small"
          sx={{ bgcolor: "rgba(34, 197, 94, 0.15)", color: "#4ADE80", fontWeight: 800, fontSize: "11px", height: 26 }}
        />

        <Chip
          icon={<AccountBalanceWalletIcon sx={{ "&&": { color: "#FBBF24", fontSize: 14 } }} />}
          label={`₹${walletBalance.toLocaleString()}`}
          size="small"
          sx={{ bgcolor: "rgba(251, 191, 36, 0.15)", color: "#FBBF24", fontWeight: 900, fontSize: "12px", height: 26 }}
        />

        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", display: { xs: "none", lg: "flex" } }}>
          <PersonIcon sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: 16 }} />
          <Typography sx={{ color: "rgba(255, 255, 255, 0.8)", fontWeight: 700, fontSize: "11px" }}>
            {operatorName}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
};
